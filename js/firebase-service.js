/**
 * firebase-service.js
 * Versi Firestore - Semua operasi Firebase (Auth + Database)
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

  // Simpan data dengan path yang benar untuk Firestore
  async saveData(path, data) {
    try {
      // Handle path khusus untuk timFavorit
      if (path.includes('/timFavorit')) {
        const uid = path.split('/')[1];
        await this.db.collection('users').doc(uid).set({
          timFavorit: data
        }, { merge: true });
        return;
      }
      
      // Handle path untuk parlayData dan data lainnya
      if (path.includes('/parlayData')) {
        const uid = path.split('/')[1];
        await this.db.collection('users').doc(uid).set({
          parlayData: data
        }, { merge: true });
        return;
      }
      
      // Untuk path umum lainnya, simpan sebagai field di document user
      const parts = path.split('/');
      if (parts.length === 2 && parts[0] === 'users') {
        const uid = parts[1];
        const fieldName = path.split('/').pop();
        await this.db.collection('users').doc(uid).set({
          [fieldName]: data
        }, { merge: true });
        return;
      }
      
      // Fallback: simpan sebagai document di collection
      console.warn('Path tidak standar, menggunakan fallback:', path);
      const docRef = this.db.doc(path);
      await docRef.set(data, { merge: true });
      
    } catch (error) {
      console.error('Error saving data:', error);
      throw error;
    }
  },

  // Load data dari Firestore
  loadData(path, callback) {
    try {
      // Handle path khusus untuk timFavorit
      if (path.includes('/timFavorit')) {
        const uid = path.split('/')[1];
        return this.db.collection('users').doc(uid)
          .onSnapshot(doc => {
            const data = doc.data();
            callback(data && data.timFavorit ? data.timFavorit : []);
          }, error => {
            console.error('Error loading timFavorit:', error);
            callback([]);
          });
      }
      
      // Handle path untuk parlayData
      if (path.includes('/parlayData')) {
        const uid = path.split('/')[1];
        return this.db.collection('users').doc(uid)
          .onSnapshot(doc => {
            const data = doc.data();
            callback(data && data.parlayData ? data.parlayData : null);
          }, error => {
            console.error('Error loading parlayData:', error);
            callback(null);
          });
      }
      
      // Untuk path umum lainnya
      const parts = path.split('/');
      if (parts.length === 2 && parts[0] === 'users') {
        const uid = parts[1];
        const fieldName = path.split('/').pop();
        return this.db.collection('users').doc(uid)
          .onSnapshot(doc => {
            const data = doc.data();
            callback(data ? data[fieldName] : null);
          }, error => {
            console.error('Error loading data:', error);
            callback(null);
          });
      }
      
      // Fallback untuk path lain
      const docRef = this.db.doc(path);
      return docRef.onSnapshot(doc => {
        callback(doc.data());
      }, error => {
        console.error('Error loading data:', error);
      });
      
    } catch (error) {
      console.error('Error in loadData:', error);
      return null;
    }
  },

  // Load data sekali (tanpa listener)
  async loadDataOnce(path) {
    try {
      // Handle path khusus untuk timFavorit
      if (path.includes('/timFavorit')) {
        const uid = path.split('/')[1];
        const doc = await this.db.collection('users').doc(uid).get();
        const data = doc.data();
        return data && data.timFavorit ? data.timFavorit : [];
      }
      
      // Handle path untuk parlayData
      if (path.includes('/parlayData')) {
        const uid = path.split('/')[1];
        const doc = await this.db.collection('users').doc(uid).get();
        const data = doc.data();
        return data && data.parlayData ? data.parlayData : null;
      }
      
      // Untuk path umum
      const parts = path.split('/');
      if (parts.length === 2 && parts[0] === 'users') {
        const uid = parts[1];
        const fieldName = path.split('/').pop();
        const doc = await this.db.collection('users').doc(uid).get();
        const data = doc.data();
        return data ? data[fieldName] : null;
      }
      
      // Fallback
      const doc = await this.db.doc(path).get();
      return doc.data();
      
    } catch (error) {
      console.error('Error in loadDataOnce:', error);
      return null;
    }
  },

  // Hapus data
  async removeData(path) {
    try {
      // Untuk Firestore, kita hapus field dari document user
      const parts = path.split('/');
      if (parts.length >= 2 && parts[0] === 'users') {
        const uid = parts[1];
        const fieldName = parts.pop();
        
        const updateData = {};
        updateData[fieldName] = firebase.firestore.FieldValue.delete();
        
        await this.db.collection('users').doc(uid).update(updateData);
        return;
      }
      
      // Fallback
      await this.db.doc(path).delete();
      
    } catch (error) {
      console.error('Error removing data:', error);
      throw error;
    }
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

console.log("✅ Firebase Service (Firestore) loaded");
