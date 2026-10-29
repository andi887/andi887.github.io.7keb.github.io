/**
 * firebase-config.js
 * Hanya berisi konfigurasi & inisialisasi Firebase.
 * Tidak ada logika bisnis di sini.
 */

const FIREBASE_CONFIG = {
 const firebaseConfig = {
  apiKey: "AIzaSyAOf4bjjOQPCgp3kdioCSwEmNq2GNksv04",
  authDomain: "ber3lebihbaik.firebaseapp.com",
  databaseURL: "https://ber3lebihbaik-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "ber3lebihbaik",
  storageBucket: "ber3lebihbaik.firebasestorage.app",
  messagingSenderId: "819172531554",
  appId: "1:819172531554:web:6d3aa2bd5244481271a03b"
};
// Inisialisasi Firebase
firebase.initializeApp(FIREBASE_CONFIG);

// Expose ke global scope agar bisa diakses modul lain
window.FirebaseApp = {
  app: firebase.app(),
  auth: firebase.auth(),
  db: firebase.firestore()
};

console.log("✅ Firebase Config loaded (dengan Firestore)");
