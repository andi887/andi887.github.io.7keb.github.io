/**
 * firebase-service.js
 * Semua operasi Firebase (Auth + Firestore) + Registry Fitur
 */

const App = window.App || {};

App.Service = {
  // === AUTH ===
  auth: FirebaseApp.auth,
  db: FirebaseApp.db, // Firestore

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

  // === FIRESTORE DATABASE ===
  
  getUserRef(uid) {
    return this.db.collection('users').doc(uid);
  },

  async saveData(path, data) {
    // Handle path format: 'users/uid/timFavorit'
    const parts = path.split('/');
    
    if (parts.length === 3 && parts[0] === 'users' && parts[2] === 'timFavorit') {
      // Simpan sebagai field di document user
      await this.db.collection('users').doc(parts[1]).set({
        timFavorit: data
      }, { merge: true });
      return;
    }
    
    // Untuk path lain, simpan sebagai document
    const docRef = this.db.doc(path);
    await docRef.set(data, { merge: true });
  },

  loadData(path, callback) {
    const parts = path.split('/');
    
    if (parts.length === 3 && parts[0] === 'users' && parts[2] === 'timFavorit') {
      // Listen ke document user, ambil field timFavorit
      return this.db.collection('users').doc(parts[1])
        .onSnapshot(doc => {
          const data = doc.data();
          callback(data && data.timFavorit ? data.timFavorit : []);
        }, error => {
          console.error('Error loading data:', error);
          callback([]);
        });
    }
    
    // Untuk path lain
    const docRef = this.db.doc(path);
    return docRef.onSnapshot(doc => {
      callback(doc.data());
    }, error => {
      console.error('Error loading data:', error);
    });
  },

  async loadDataOnce(path) {
    const parts = path.split('/');
    
    if (parts.length === 3 && parts[0] === 'users' && parts[2] === 'timFavorit') {
      const doc = await this.db.collection('users').doc(parts[1]).get();
      const data = doc.data();
      return data && data.timFavorit ? data.timFavorit : [];
    }
    
    const doc = await this.db.doc(path).get();
    return doc.data();
  },

  async removeData(path) {
    await this.db.doc(path).delete();
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

// === AUTH HANDLER (tetap sama) ===
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
      alert("⚠️ Password minimal 6 karakter!");
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

// Registry fitur
App.FeatureLoaders = {};

window.App = App;

document.addEventListener('DOMContentLoaded', () => {
  App.Auth.init();
});

console.log("✅ Firebase Service (Firestore) loaded");
