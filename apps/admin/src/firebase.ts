import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

/**
 * Firebase config — Title App Alpha
 * Admin UI (read-only)
 */
const firebaseConfig = {
  apiKey: "REPLACE_ME",
  authDomain: "title-app-alpha.firebaseapp.com",
  projectId: "title-app-alpha",
  storageBucket: "title-app-alpha.appspot.com",
  messagingSenderId: "REPLACE_ME",
  appId: "REPLACE_ME",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

/**
 * Demo tenant — matches existing autoJobs
 */
export const DEMO_TENANT_ID = "demo";
