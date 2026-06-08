import { initializeApp } from 'firebase/app';
import { initializeAuth, indexedDBLocalPersistence } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "mock-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "smarthomemom-poc.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "smarthomemom-poc",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "smarthomemom-poc.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1234567890",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1234567890:web:abcdef123456"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// indexedDBLocalPersistence: OAuth state stored in IndexedDB, not sessionStorage.
// Fixes "missing initial state" error in PWA standalone mode (iOS/Android).
const auth = initializeAuth(app, {
  persistence: indexedDBLocalPersistence
});
const db = initializeFirestore(app, {
  localCache: persistentLocalCache()
});
const storage = getStorage(app);

export { app, auth, db, storage };
