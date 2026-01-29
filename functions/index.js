const { onRequest } = require("firebase-functions/v2/https");

const admin = require("firebase-admin");
const { parse } = require("csv-parse/sync");

if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

async function requireAuth(req) {
  const auth = req.headers.authorization || "";
  const m = auth.match(/^Bearer (.+)$/);
  if (!m) {
    const err = new Error("Missing Authorization: Bearer <token>");
    err.status = 401;
    throw err;
  }
  const decoded = await admin.auth().verifyIdToken(m[1]);
  return { userId: decoded.uid };
}

async function requireTenant(userId) {
  const snap = await db
    .collection("memberships")
    .where("userId", "==", userId)
    .limit(1)
    .get();

  if (snap.empty) {
    const err = new Error("No membership found for user");
    err.status = 403;
    throw err;
  }

  const membership = snap.docs[0].data();
  if (!membership.tenantId) {
    const err = new Error("Membership missing tenantId");
    err.status = 403;
    throw err;
  }

  return { tenantId: membership.tenantId, role: membership.role || "unknown" };
}

exports.api = onRequest(async (req, res) => {
  const { path, method } = req;

  // Health check (UNCHANGED)
  if (path === "/" && method === "GET") {
    return res.json({
      ok: true,
      service: "title-app-core",
      version: "alpha",
      message: "API executor is live",
    });
  }

  // Admin: list import history
  // GET /admin/imports?limit=50
  if (path === "/admin/imports" && method === "GET") {
    try {
      const { userId } = await requireAuth(req);
      const { tenantId } = await requireTenant(userId);

      const limit = Math.min(parseInt(req.query.limit || "50", 10) || 50, 200);

      const snap = await db
        .collection("imports")
        .where("tenantId", "==", tenantId)
        .orderBy("createdAt", "desc")
        .limit(limit)
        .get();

      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      return res.json({ ok: true, items });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ ok: false, error: err.message });
    }
  }

  // Admin: import CSV (sent as text in JSON body)
  // POST /admin/import
  // {
  //   "type": "customers|appointments|inventory|serviceProducts|financialProducts",
  //   "filename": "customers.csv",
  //   "isDemo": true,
  //   "csvText": "colA,colB\\n..."
  // }
  if (path === "/admin/import" && method === "POST") {
    try {
      const { userId } = await requireAuth(req);
      const { tenantId } = await requireTenant(userId);

      const { type, filename, isDemo = true, csvText } = req.body || {};
      if (!type || !csvText) {
        return res.status(400).json({ ok: false, error: "Missing type or csvText" });
      }

      const allowed = new Set([
        "customers",
        "appointments",
        "inventory",
        "serviceProducts",
        "financialProducts",
      ]);
      if (!allowed.has(type)) {
        return res.status(400).json({
          ok: false,
          error: `Invalid type. Must be one of: ${Array.from(allowed).join(", ")}`,
        });
      }

      const importRef = db.collection("imports").doc();
      await importRef.set({
        tenantId,
        isDemo: !!isDemo,
        type,
        filename: filename || `${type}.csv`,
        fileFormat: "csv",
        status: "processing",
        counts: { receivedRows: 0, inserted: 0, updated: 0, errors: 0 },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdByUserId: userId,
      });

      let records;
      try {
        records = parse(csvText, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
        });
      } catch (e) {
        await importRef.set(
          {
            status: "failed",
            counts: { receivedRows: 0, inserted: 0, updated: 0, errors: 1 },
            errorSample: [`CSV parse error: ${e.message}`],
            finishedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        return res.status(400).json({ ok: false, error: `CSV parse error: ${e.message}` });
      }

      // Demo-grade importer (single batch). Keep imports under ~400 rows for now.
      const batch = db.batch();
      let ops = 0;

      const errors = [];
      let inserted = 0;

      const normalizeExternalId = (s) =>
        String(s || "")
          .trim()
          .toLowerCase()
          .replace(/\s+/g, "")
          .replace(/[^\w@.+-]/g, "");

      for (let i = 0; i < records.length; i++) {
        const r = records[i];

        try {
          if (ops >= 400) {
            throw new Error("Demo importer limit reached (max ~400 rows). Split into smaller files.");
          }

          if (type === "customers") {
            const externalId = normalizeExternalId(r.email || r.mobile);
            if (!externalId) throw new Error("customers row requires email or mobile");

            const ref = db.collection("customers").doc(externalId);
            batch.set(
              ref,
              {
                ...r,
                tenantId,
                isDemo: !!isDemo,
                externalId,
              },
              { merge: true }
            );
          }

          if (type === "appointments") {
            const ref = db.collection("appointments").doc();
            batch.set(
              ref,
              {
                ...r,
                tenantId,
                isDemo: !!isDemo,
              },
              { merge: true }
            );
          }

          if (type === "inventory") {
            const externalId = String(r.vin || r.stockNumber || "")
              .trim()
              .toUpperCase()
              .replace(/\s+/g, "");
            if (!externalId) throw new Error("inventory row requires vin or stockNumber");

            const ref = db.collection("inventory").doc(externalId);
            batch.set(
              ref,
              {
                ...r,
                tenantId,
                isDemo: !!isDemo,
                externalId,
              },
              { merge: true }
            );
          }

          if (type === "serviceProducts") {
            const externalId = normalizeExternalId(r.sku || r.name).replace(/@/g, "");
            if (!externalId) throw new Error("serviceProducts row requires sku or name");

            const ref = db.collection("serviceProducts").doc(externalId);
            batch.set(
              ref,
              {
                ...r,
                tenantId,
                isDemo: !!isDemo,
                externalId,
              },
              { merge: true }
            );
          }

          if (type === "financialProducts") {
            const externalId = normalizeExternalId(r.sku || r.name).replace(/@/g, "");
            if (!externalId) throw new Error("financialProducts row requires sku or name");

            const ref = db.collection("financialProducts").doc(externalId);
            batch.set(
              ref,
              {
                ...r,
                tenantId,
                isDemo: !!isDemo,
                externalId,
              },
              { merge: true }
            );
          }

          inserted++;
          ops++;
        } catch (e) {
          errors.push(`Row ${i + 1}: ${e.message}`);
        }
      }

      if (ops > 0) {
        await batch.commit();
      }

      await importRef.set(
        {
          status: "completed",
          counts: {
            receivedRows: records.length,
            inserted,
            updated: 0,
            errors: errors.length,
          },
          errorSample: errors.slice(0, 25),
          finishedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      return res.json({
        ok: true,
        importId: importRef.id,
        counts: {
          receivedRows: records.length,
          inserted,
          updated: 0,
          errors: errors.length,
        },
        errorSample: errors.slice(0, 25),
      });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({ ok: false, error: err.message });
    }
  }

  // Title App: preview report (stub) (UNCHANGED)
  if (path === "/report/preview" && method === "POST") {
    const { address, userIntent } = req.body || {};

    return res.json({
      ok: true,
      previewId: "preview_" + Date.now(),
      address,
      userIntent,
      message: "Preview generated (stub)",
    });
  }

  // Fallback (UNCHANGED)
  res.status(404).json({
    ok: false,
    error: "Unknown endpoint",
    path,
    method,
  });
});
