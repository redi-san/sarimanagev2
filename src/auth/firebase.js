// src/firebase.js
import { initializeApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCqH2G2M19Wqcn8Yzy-Q8eaGP6AaWa9eYA",
  authDomain: "sarimanage-e034e.firebaseapp.com",
  projectId: "sarimanage-e034e",
  storageBucket: "sarimanage-e034e.appspot.com",
  messagingSenderId: "562536586359",
  appId: "1:562536586359:web:a779c3a152512468e4fa72",
  measurementId: "G-22R3R4Z3F5",
};

// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);

// ✅ Auth instance
const auth = getAuth(app);

// ✅ FORCE Firebase to keep user logged in (localStorage persistence)
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log("🔥 Firebase Auth Persistence: LOCAL (PWA safe)");
  })
  .catch((error) => {
    console.error("Firebase persistence error:", error);
  });

export { app, auth };
