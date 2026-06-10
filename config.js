// Firebase Configuration - Load from environment variables
export const firebaseConfig = {
  apiKey: import.meta.env?.VITE_FIREBASE_API_KEY || "AIzaSyDcOcGYXHgma9yFdUqNSKmeVi_Ew_Sbp3Q",
  authDomain: import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN || "texmorro-c6c76.firebaseapp.com",
  projectId: import.meta.env?.VITE_FIREBASE_PROJECT_ID || "texmorro-c6c76",
  storageBucket: import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET || "texmorro-c6c76.firebasestorage.app",
  messagingSenderId: import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID || "942262670790",
  appId: import.meta.env?.VITE_FIREBASE_APP_ID || "1:942262670790:web:aec64957c1078190018ec7",
  measurementId: import.meta.env?.VITE_FIREBASE_MEASUREMENT_ID || "G-3KXZMCXC6S",
};
