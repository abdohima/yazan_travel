// firebase.js - Initialize Firebase (ES modules via CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// Paste your config below (this is already set from earlier)
const firebaseConfig = {
  apiKey: "AIzaSyBUTjjZj8quI8clarAEz8awfQoY0KzUcZw",
  authDomain: "yazan-travel-9ada7.firebaseapp.com",
  projectId: "yazan-travel-9ada7",
  storageBucket: "yazan-travel-9ada7.firebasestorage.app",
  messagingSenderId: "126656258580",
  appId: "1:126656258580:web:bb12cf91735f2dfd30fd01",
  measurementId: "G-TM61VFXEE5"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);

console.log('firebase initialized');
