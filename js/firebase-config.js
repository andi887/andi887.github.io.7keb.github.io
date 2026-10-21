/**
 * firebase-config.js
 * Hanya berisi konfigurasi & inisialisasi Firebase.
 * Tidak ada logika bisnis di sini.
 */

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyC5knp2eCkE4pzuNRodN5SgGhaq_H416vE",
  authDomain: "parlaypribadi.firebaseapp.com",
  databaseURL: "https://parlaypribadi-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "parlaypribadi",
  storageBucket: "parlaypribadi.firebasestorage.app",
  messagingSenderId: "42241144949",
  appId: "1:42241144949:web:1bbc9c022c717d4643203c"
};

// Inisialisasi Firebase
firebase.initializeApp(FIREBASE_CONFIG);

// Expose ke global scope agar bisa diakses modul lain
window.FirebaseApp = {
  app: firebase.app(),
  auth: firebase.auth(),
  db: firebase.database()
};

console.log("✅ Firebase Config loaded");
