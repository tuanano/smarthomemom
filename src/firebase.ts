import { initializeApp } from 'firebase/app';
import { initializeAuth, indexedDBLocalPersistence, browserPopupRedirectResolver } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase Auth's browserPopupRedirectResolver uses sessionStorage to store the OAuth
// nonce before opening the popup. iOS Safari blocks sessionStorage in certain contexts
// (ITP, Private Browse, "Block All Cookies"). Polyfill with memory-backed storage so
// signInWithPopup works even when sessionStorage is inaccessible.
// Memory storage is safe here because signInWithPopup keeps the main tab in place —
// the nonce only needs to survive for the duration of the popup, not across navigations.
;(function patchSessionStorage() {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem('__smm_test__', '1');
    window.sessionStorage.removeItem('__smm_test__');
  } catch {
    const s: Record<string, string> = {};
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      get: () => ({
        getItem:    (k: string)              => s[k] ?? null,
        setItem:    (k: string, v: string)   => { s[k] = v; },
        removeItem: (k: string)              => { delete s[k]; },
        clear:      ()                       => { Object.keys(s).forEach(k => { delete s[k]; }); },
        key:        (i: number)              => Object.keys(s)[i] ?? null,
        get length()                         { return Object.keys(s).length; },
      }),
    });
  }
}());

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
  persistence: indexedDBLocalPersistence,
  popupRedirectResolver: browserPopupRedirectResolver,
});
const db = initializeFirestore(app, {
  localCache: persistentLocalCache()
});
const storage = getStorage(app);

export { app, auth, db, storage };
