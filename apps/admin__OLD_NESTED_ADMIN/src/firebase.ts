import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

// Firebase config for Title App Alpha (admin UI)
const firebaseConfig = {
  apiKey: "AIzaSyBY6fvHTTR4jVVEAlXua4Mwb1bwsksVeUY",
  authDomain: "title-app-alpha.firebaseapp.com",
  projectId: "title-app-alpha",
  storageBucket: "title-app-alpha.appspot.com",
  messagingSenderId: "496560182504",
  appId: "1:496560182504:web:d3c393bd7d4898a891e55d",
};

// Initialize Firebase exactly once
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

// Export Auth instance used by login.tsx
export const auth = getAuth(app);
