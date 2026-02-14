import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// NOTE: Web config for Firebase project: title-app-alpha
// Values come from Firebase Console → Project settings → Your apps → SDK setup & configuration
const firebaseConfig = {
  apiKey: "AIzaSyBY6fvHTTR4jVVEAlXua4Mwb1bwsksVeUY",
  authDomain: "title-app-alpha.firebaseapp.com",
  projectId: "title-app-alpha",
  storageBucket: "title-app-alpha.firebasestorage.app",
  messagingSenderId: "496560182504",
  appId: "1:496560182504:web:d3c393bd7d4898a891e55d",
  measurementId: "G-REDNYLES89",
};

// Initialize Firebase exactly once
export const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
