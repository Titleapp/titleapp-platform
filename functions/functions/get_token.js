const { initializeApp } = require("firebase/app");
const { getAuth, signInWithEmailAndPassword } = require("firebase/auth");
const readline = require("readline");

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(q) {
  return new Promise((res) => rl.question(q, res));
}

(async () => {
  const email = await ask("Email: ");
  const password = await ask("Password: ");
  rl.close();

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);

  const cred = await signInWithEmailAndPassword(auth, email, password);
  const token = await cred.user.getIdToken();

  console.log("\n=== FIREBASE ID TOKEN ===\n");
  console.log(token);
})();
