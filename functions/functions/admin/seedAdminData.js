/**
 * seedAdminData.js — Seeds the admins/ collection with initial admin users.
 *
 * Run once via HTTP: POST /seedAdminData with { secret: "titleapp-seed-2026" }
 * Looks up actual UIDs from Firebase Auth. Creates auth accounts if needed.
 */

const admin = require("firebase-admin");

const ADMIN_USERS = [
  {
    email: "seanlcombs@gmail.com",
    role: "owner",
    permissions: ["all"],
    displayName: "Sean Combs",
  },
  {
    email: "sean@titleapp.ai",
    role: "owner",
    permissions: ["all"],
    displayName: "Sean Combs",
  },
  {
    email: "kent@titleapp.ai",
    role: "admin",
    permissions: [
      "dashboard",
      "campaigns",
      "monitoring",
      "pipeline",
      "communications",
    ],
    displayName: "Kent Redwine",
  },
];

async function seedAdmins(req, res) {
  // Simple secret check to prevent unauthorized seeding
  const body = req.body || {};
  if (body.secret !== "titleapp-seed-2026") {
    return res.status(403).json({ ok: false, error: "Unauthorized" });
  }

  // Optional: set password for a specific admin
  if (body.action === "setPassword" && body.email && body.password) {
    try {
      const userRecord = await admin.auth().getUserByEmail(body.email);
      await admin.auth().updateUser(userRecord.uid, { password: body.password });
      return res.json({ ok: true, email: body.email, message: "Password set" });
    } catch (err) {
      return res.status(400).json({ ok: false, error: err.message });
    }
  }

  const db = admin.firestore();
  const results = [];

  for (const adminUser of ADMIN_USERS) {
    let uid;
    try {
      // Try to look up existing Firebase Auth user
      const userRecord = await admin.auth().getUserByEmail(adminUser.email);
      uid = userRecord.uid;
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        // Create the user
        const newUser = await admin.auth().createUser({
          email: adminUser.email,
          displayName: adminUser.displayName,
          // No password set — will need to use password reset flow
        });
        uid = newUser.uid;
      } else {
        results.push({
          email: adminUser.email,
          error: err.message,
        });
        continue;
      }
    }

    // Write to admins/ collection
    await db
      .collection("admins")
      .doc(uid)
      .set(
        {
          uid,
          email: adminUser.email,
          role: adminUser.role,
          permissions: adminUser.permissions,
          displayName: adminUser.displayName,
          createdAt: new Date().toISOString(),
        },
        { merge: true }
      );

    results.push({ email: adminUser.email, uid, role: adminUser.role });
  }

  return res.json({ ok: true, admins: results });
}

module.exports = { seedAdmins };
