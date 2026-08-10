import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

/**
 * Firebase initialization for Title App Alpha Admin UI
 * This MUST run once to create the DEFAULT Firebase App
 */

const firebaseConfig = {
  apiKey: "AIzaSyBY6fvHTTR4jVVEAlXua4Mwb1bwsksVeUY",
  authDomain: "title-app-alpha.firebaseapp.com",
  projectId: "title-app-alpha",
  storageBucket: "title-app-alpha.firebasestorage.app",
  messagingSenderId: "496560182504",
  appId: "1:496560182504:web:d3c393bd7d4898a891e55d",
  measurementId: "G-REDNYLES89",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
