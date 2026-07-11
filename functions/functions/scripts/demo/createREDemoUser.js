// Create the re-demo@sociii.ai login (Scott Harrington / Merritt Capital Group persona).
// Idempotent — re-running won't duplicate. Prints UID for use in other seed scripts.
const path = require("path");
const admin = require(path.resolve(__dirname, "../../node_modules/firebase-admin"));
if (!admin.apps.length) admin.initializeApp({ projectId: "title-app-alpha" });
const db = admin.firestore();

const EMAIL    = "re-demo@sociii.ai";
const PASSWORD = "MerrittCapital!2026";

(async () => {
  let user;
  try {
    user = await admin.auth().getUserByEmail(EMAIL);
    console.log("• RE demo user exists:", user.uid);
    await admin.auth().updateUser(user.uid, {
      password: PASSWORD,
      displayName: "Scott Harrington",
      emailVerified: true,
    });
    console.log("  (password + displayName refreshed)");
  } catch {
    user = await admin.auth().createUser({
      email: EMAIL,
      password: PASSWORD,
      displayName: "Scott Harrington",
      emailVerified: true,
    });
    console.log("✓ Created RE demo user:", user.uid);
  }

  console.log("\n RE_DEMO_UID =", user.uid);
  console.log(" Update this in index.js demo:token handler and all seed scripts.");
  process.exit(0);
})().catch((e) => { console.error("FAILED:", e.message, e.stack); process.exit(1); });
