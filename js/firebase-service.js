/**
 * firebase-service.js
 * Semua operasi Firebase (Auth + Database) + Registry Fitur
 * Tidak ada logika bisnis fitur di sini.
 */

// Pastikan App namespace ada
const App = window.App || {};

App.Service = {
  // === AUTH ===
  auth: FirebaseApp.auth,
  db: FirebaseApp.db,

  signIn(email, password) {
    return this.auth.signInWithEmailAndPassword(email, password);
  },

  signUp(email, password) {
    return this.auth.createUserWithEmailAndPassword(email, password);
  },

  signOut() {
    return this.auth.signOut();
  },

  onAuthStateChanged(callback) {
    return this.auth.onAuthStateChanged(callback);
  },

  // === DATABASE ===
  getUserRef(uid) {
    return this.db.ref('users/' + uid);
  },

  saveData(path, data) {
    return this.db.ref(path).set(data);
  },

  loadData(path, callback) {
    return this.db.ref(path).on('value', snapshot => {
      callback(snapshot.val());
    });
  },

  loadDataOnce(path) {
    return this.db.ref(path).once('value').then(s => s.val());
  },

  removeData(path) {
    return this.db.ref(path).remove();
  },

  // === HELPER ERROR ===
  getAuthErrorMessage(code) {
    const messages = {
      'auth/user-not-found': 'Email tidak terdaftar.',
      'auth/wrong-password': 'Password salah.',
      'auth/invalid-email': 'Format email tidak valid.',
      'auth/email-already-in-use': 'Email ini sudah digunakan.',
      'auth/weak-password': 'Password minimal 6 karakter.',
      'auth/too-many-requests': 'Terlalu banyak percobaan. Coba nanti.'
    };
    return messages[code] || `Error: ${code}`;
  }
};

// === AUTH HANDLER ===
App.Auth = {
  isLoginMode: true,
  currentUser: null,

  toggleMode() {
    this.isLoginMode = !this.isLoginMode;
    document.getElementById('authTitle').textContent = 
      this.isLoginMode ? 'Login Email' : 'Daftar Akun Baru';
    document.getElementById('btnAuthAction').textContent = 
      this.isLoginMode ? 'Login' : 'Daftar';
    document.getElementById('authToggle').textContent = 
      this.isLoginMode 
        ? 'Belum punya akun? Klik di sini untuk Daftar' 
        : 'Sudah punya akun? Klik di sini untuk Login';
    document.getElementById('email').value = '';
    document.getElementById('password').value = '';
  },

  handleAuth() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();

    if (!email || !password) {
      alert("⚠️ Email dan password tidak boleh kosong!");
      return;
    }
    if (password.length < 6) {
      alert("️ Password minimal 6 karakter!");
      return;
    }

    const promise = this.isLoginMode
      ? App.Service.signIn(email, password)
      : App.Service.signUp(email, password);

    promise
      .then(() => {
        if (!this.isLoginMode) {
          alert("✅ Akun berhasil dibuat! Silakan login.");
          this.toggleMode();
        }
      })
      .catch(err => {
        alert("❌ " + App.Service.getAuthErrorMessage(err.code));
      });
  },

  updateUI() {
    const loginForm = document.getElementById('loginForm');
    const nav = document.getElementById('mainNav');
    const userEmail = document.getElementById('userEmail');
    const btnLogout = document.getElementById('btnLogout');
    const btnLogin = document.getElementById('btnLogin');

    if (this.currentUser) {
      userEmail.textContent = this.currentUser.email;
      btnLogout.style.display = 'inline';
      btnLogin.style.display = 'none';
      loginForm.style.display = 'none';
      nav.style.display = 'flex';
    } else {
      userEmail.textContent = '';
      btnLogout.style.display = 'none';
      btnLogin.style.display = 'inline';
      loginForm.style.display = 'block';
      nav.style.display = 'none';
    }
  },

  init() {
    document.getElementById('authToggle').addEventListener('click', () => this.toggleMode());

    document.getElementById('btnLogin').onclick = () => {
      document.getElementById('loginForm').style.display = 'block';
    };

    document.getElementById('btnLogout').onclick = () => {
      App.Service.signOut().then(() => {
        this.currentUser = null;
        this.updateUI();
        alert("✅ Anda telah logout.");
      });
    };

    App.Service.onAuthStateChanged(user => {
      this.currentUser = user;
      this.updateUI();
      if (user) {
        App.Dashboard.init(user.uid);
      }
    });
  }
};

// ✅ PENTING: Registry fitur didefinisikan di sini agar tersedia sebelum feature files di-load
App.FeatureLoaders = {};

// Expose ke global
window.App = App;

// Inisialisasi Auth saat DOM siap
document.addEventListener('DOMContentLoaded', () => {
  App.Auth.init();
});

console.log("✅ Firebase Service loaded");
