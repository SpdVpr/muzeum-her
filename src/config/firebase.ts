/**
 * Firebase Configuration
 * Konfigurace pro Firestore s offline persistence
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Firebase credentials z environment variables
// Vytvoř .env.local soubor a vyplň své Firebase credentials
// Viz .env.local.example
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "YOUR_MESSAGING_SENDER_ID",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "YOUR_APP_ID"
};

// Inicializace Firebase
export const app = initializeApp(firebaseConfig);

// Firestore s offline persistence (pro pomalé připojení)
export const db = getFirestore(app);

// Auth (pro admin)
export const auth = getAuth(app);

// Zapnutí offline persistence
// Toto umožní aplikaci fungovat i bez internetu
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    // Více tabů otevřených najednou
    console.warn('Offline persistence: Multiple tabs open, persistence enabled in first tab only.');
  } else if (err.code === 'unimplemented') {
    // Prohlížeč nepodporuje offline persistence
    console.warn('Offline persistence: Browser does not support all features.');
  }
});

// Pro development - připojení k Firebase Emulator (volitelné)
if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
  connectFirestoreEmulator(db, 'localhost', 8080);
  console.log('🔧 Connected to Firebase Emulator');
}

export default app;

