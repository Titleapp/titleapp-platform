// seedMarketingImages.js — generate REAL ad creatives (Fal.ai) for the Meadow
// Creek marketing campaigns and attach stable image URLs to each campaign doc.
// Admin seed: bypasses the per-user billing/rate-limit gates in services/image.
//
//   node scripts/demo/seedMarketingImages.js
//
// Idempotent: re-running regenerates + overwrites the imageUrl on each campaign.

const fs = require("fs");
const path = require("path");
// Minimal .env loader (dotenv not installed locally).
try {
  const envPath = path.join(__dirname, "../../.env");
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch (_) {}
const admin = require("firebase-admin");
const crypto = require("crypto");
const { fal } = require("@fal-ai/client");

admin.initializeApp({ projectId: "title-app-alpha", storageBucket: "title-app-alpha.firebasestorage.app" });
const db = admin.firestore();
const bucket = admin.storage().bucket();
const T = "ws_1781920656122_tl9dhn";

fal.config({ credentials: process.env.FAL_API_KEY });
const MODEL = "fal-ai/flux/schnell";

// Photographic ad-creative prompts per campaign. Pet/vet themed — no real
// places, no addresses, no PHI. Matched to each campaign's headline.
const PROMPTS = {
  "New Puppy & Kitten Package": "a happy golden retriever puppy and a fluffy kitten sitting together on a clean exam table at a bright modern veterinary clinic, warm natural light, professional advertising photography, shallow depth of field",
  "Spring Wellness Reminders": "a healthy beagle getting a gentle checkup from a friendly veterinarian holding a stethoscope, bright cheerful clinic, spring tones, professional advertising photography",
  "Senior Pet Dental Month": "a calm senior labrador with bright healthy teeth, veterinary dental care theme, clean professional clinic background, soft warm lighting, advertising photography",
  "Exotic Pet Care Awareness": "a colorful parrot, a cute rabbit, and a small bearded dragon lizard together, exotic pet veterinary care theme, vibrant professional advertising photography, clean studio light",
  "Heartworm Prevention Push": "a joyful healthy dog running through a sunny green park in summer, heartworm prevention wellness theme, bright golden hour light, professional advertising photography",
  "Adopt-a-Thon Partnership": "an adorable hopeful shelter puppy with big eyes looking up, warm heartwarming pet adoption event theme, soft natural light, professional advertising photography",
};
const STYLE_SUFFIX = ", high quality, photorealistic, crisp focus, commercial advertisement, no text, no watermark";

async function genOne(prompt) {
  const r = await fal.subscribe(MODEL, {
    input: { prompt: prompt + STYLE_SUFFIX, image_size: "landscape_4_3", num_inference_steps: 8, num_images: 1 },
  });
  const url = r?.data?.images?.[0]?.url;
  if (!url) throw new Error("no image returned");
  const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
  const token = crypto.randomUUID();
  const filePath = `campaigns/${T}/${crypto.randomBytes(6).toString("hex")}.png`;
  await bucket.file(filePath).save(buf, {
    metadata: { contentType: "image/png", metadata: { firebaseStorageDownloadTokens: token } },
    resumable: false,
  });
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filePath)}?alt=media&token=${token}`;
}

(async () => {
  const snap = await db.collection("campaigns").where("tenantId", "==", T).get();
  console.log(`Found ${snap.size} campaigns. Generating ad creatives…\n`);
  let n = 0;
  for (const doc of snap.docs) {
    const c = doc.data();
    const prompt = PROMPTS[c.name];
    if (!prompt) { console.log(`⏭  ${c.name} — no prompt mapped, skipping`); continue; }
    try {
      process.stdout.write(`🎨 ${c.name} … `);
      const imageUrl = await genOne(prompt);
      await doc.ref.update({ imageUrl, imageGeneratedAt: admin.firestore.FieldValue.serverTimestamp() });
      console.log("✓");
      n++;
    } catch (e) {
      console.log(`✗ ${e.message}`);
    }
  }
  console.log(`\n🟢 Done — ${n}/${snap.size} campaigns now have real ad imagery.`);
  process.exit(0);
})().catch(e => { console.error("FAILED:", e.message); process.exit(1); });
