// Generate 6 maintenance-ticket photos via fal.ai and upload to Firebase Storage.
// Writes directly to demo/re/maintenance/ — bypasses normal billing/worker flow.
// Run from: functions/functions/  with:  node scripts/demo/generateREMXPhotos.js
"use strict";

const path = require("path");
const https = require("https");
const fs = require("fs");

// Load FAL_API_KEY from local .env (not available in seed-script runtime by default)
const ENV_PATH = path.resolve(__dirname, "../../.env");
if (fs.existsSync(ENV_PATH)) {
  fs.readFileSync(ENV_PATH, "utf8").split(/\r?\n/).forEach((line) => {
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*["']?(.+?)["']?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  });
}

const admin = require(path.resolve(__dirname, "../../node_modules/firebase-admin"));
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "title-app-alpha",
    storageBucket: "title-app-alpha.firebasestorage.app",
  });
}
const db = admin.firestore();
const bucket = admin.storage().bucket();

const { fal } = require(path.resolve(__dirname, "../../node_modules/@fal-ai/client"));
fal.config({ credentials: process.env.FAL_API_KEY });

const RE_DEMO_TENANT = "ws_1783659066844_o7m1pm";
const STORAGE_BASE = "https://storage.googleapis.com/title-app-alpha.firebasestorage.app";

// Each entry maps to a Firestore ticket field and a Storage path.
// Prompts describe physical conditions — no real addresses, no map/satellite vocabulary.
const PHOTOS = [
  {
    ticket: "mx_creekwood_001",
    role: "issue",
    field: "photos_issue",
    index: 0,
    prompt:
      "Residential split-system HVAC air handler unit with severely frosted evaporator coils, " +
      "thick ice buildup covering coil fins, condensate pan overflowing water onto concrete floor, " +
      "mechanical closet interior, apartment complex HVAC failure, realistic close-up maintenance photo",
  },
  {
    ticket: "mx_creekwood_002",
    role: "issue",
    field: "photos_issue",
    index: 0,
    prompt:
      "Interior ceiling of apartment with large brown circular water stain ring, " +
      "paint bubbling at stain edges, slight drywall bulge from water damage originating above, " +
      "white popcorn ceiling texture, residential interior, realistic maintenance documentation photo",
  },
  {
    ticket: "mx_creekwood_003",
    role: "issue",
    field: "photos_issue",
    index: 0,
    prompt:
      "Apartment kitchen sink basin filled with standing water that is not draining, " +
      "slow drain blockage, dishes submerged in cloudy water, white porcelain sink, " +
      "kitchen counter visible, realistic close-up maintenance documentation photo",
  },
  {
    ticket: "mx_creekwood_004",
    role: "issue",
    field: "photos_issue",
    index: 0,
    prompt:
      "Close-up of refrigerator door bottom gasket with visible cracked and split rubber seal, " +
      "gap where door no longer seals flush, condensation forming on interior shelves, " +
      "appliance door seal failure, realistic maintenance documentation photo",
  },
  {
    ticket: "mx_creekwood_005",
    role: "before",
    field: "photos_issue",
    index: 0,
    prompt:
      "Vacant apartment hallway and living area showing worn carpet with heavy traffic wear pattern " +
      "at entryway, scuffed and dirty white baseboards along walls, faded paint on walls, " +
      "unit ready for turnover renovation, realistic move-out inspection photo",
  },
  {
    ticket: "mx_creekwood_005",
    role: "after",
    field: "photos_resolution",
    index: 0,
    prompt:
      "Freshly renovated vacant apartment hallway and living area with brand new plush beige carpet " +
      "freshly installed, bright white painted baseboards and freshly painted walls, " +
      "clean empty rooms, move-in ready condition, realistic renovation completion photo",
  },
];

// Download image bytes from a URL without writing to disk
const downloadBuffer = (url) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    const proto = url.startsWith("https") ? https : require("http");
    const req = proto.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadBuffer(res.headers.location).then(resolve).catch(reject);
      }
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    });
    req.on("error", reject);
  });

(async () => {
  if (!process.env.FAL_API_KEY) {
    throw new Error(
      "FAL_API_KEY not found. Check that functions/functions/.env exists and contains FAL_API_KEY."
    );
  }
  console.log(`✓ FAL_API_KEY loaded (${process.env.FAL_API_KEY.slice(0, 8)}…)`);

  for (const photo of PHOTOS) {
    const storagePath = `demo/re/maintenance/${photo.ticket}_${photo.role}.jpg`;
    const publicUrl = `${STORAGE_BASE}/${storagePath}`;
    console.log(`\n→ ${photo.ticket}_${photo.role}`);

    try {
      // 1. Generate via fal.ai flux/schnell
      console.log("  Generating…");
      const result = await fal.subscribe("fal-ai/flux/schnell", {
        input: {
          prompt: photo.prompt,
          num_images: 1,
          image_size: "landscape_4_3",
          num_inference_steps: 4,
          enable_safety_checker: true,
        },
        logs: false,
      });
      const falUrl = result.data?.images?.[0]?.url || result.images?.[0]?.url;
      if (!falUrl) throw new Error(`No image URL in fal.ai response: ${JSON.stringify(result).slice(0, 200)}`);
      console.log(`  ✓ fal.ai → ${falUrl.slice(0, 70)}…`);

      // 2. Download image bytes (fal.ai URLs are temporary)
      const buffer = await downloadBuffer(falUrl);
      console.log(`  ✓ Downloaded ${(buffer.length / 1024).toFixed(0)} KB`);

      // 3. Upload to Firebase Storage and make public
      const file = bucket.file(storagePath);
      await file.save(buffer, { metadata: { contentType: "image/jpeg" } });
      await file.makePublic();
      console.log(`  ✓ Storage: ${storagePath}`);

      // 4. Update Firestore maintenance ticket with real URL
      const ticketRef = db
        .collection("tenants")
        .doc(RE_DEMO_TENANT)
        .collection("maintenanceTickets")
        .doc(photo.ticket);
      const snap = await ticketRef.get();
      if (!snap.exists) {
        console.log(`  ⚠  Ticket ${photo.ticket} not found — run seedREMaintenanceTickets.js first`);
        continue;
      }
      const existing = snap.data()[photo.field] || [];
      const updated = [...existing];
      updated[photo.index] = publicUrl;
      await ticketRef.update({ [photo.field]: updated });
      console.log(`  ✓ Firestore: ${photo.ticket}.${photo.field}[${photo.index}] = ${publicUrl.slice(-40)}`);
    } catch (e) {
      console.error(`  ✗ FAILED: ${e.message}`);
    }
  }

  console.log("\n✓ Done. All maintenance photos generated and uploaded.");
  console.log("  Ticket photos are now live in the RE demo workspace.");
  process.exit(0);
})().catch((e) => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
