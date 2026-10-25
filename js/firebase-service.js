/**
 * firebase-service.js
 * Versi Firestore - Handle semua path user data
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

  // Simpan data - Handle semua path users/uid/fieldName
  async saveData(path, data) {
    try {
      const parts = path.split('/');
      
      // Handle semua path format: users/uid/fieldName
      if (parts.length === 3 && parts[0] === 'users') {
        const uid = parts[1];
        const fieldName = parts[2];
        
        // Simpan sebagai field di document user
        const updateData = {};
        updateData[fieldName] = data;
        
        await this.db.collection('users').doc(uid).set(updateData, { merge: true });
        return;
      }
      
      // Untuk path lain (fallback)
      const docRef = this.db.doc(path);
      await docRef.set(data, { merge: true });
      
    } catch (error) {
      console.error('Error saving data:', path, error);
      throw error;
    }
  },

  // Load data - Handle semua path users/uid/fieldName
  loadData(path, callback) {
    try {
      const parts = path.split('/');
      
      // Handle semua path format: users/uid/fieldName
      if (parts.length === 3 && parts[0] === 'users') {
        const uid = parts[1];
        const fieldName = parts[2];
        
        // Listen ke document user
        return this.db.collection('users').doc(uid)
          .onSnapshot(doc => {
            const data = doc.data();
            const result = data ? data[fieldName] : null;
            
            // Handle default value berdasarkan fieldName
            if (result === undefined || result === null) {
              if (fieldName === 'timFavorit') {
                callback([]);
              } else if (fieldName === 'notes' || fieldName === 'diskusi') {
                callback([]);
              } else {
                callback(result);
              }
            } else {
              callback(result);
            }
          }, error => {
            console.error('Error loading data from path:', path, error);
            callback(null);
          });
      }
      
      // Untuk path lain (fallback)
      const docRef = this.db.doc(path);
      return docRef.onSnapshot(doc => {
        callback(doc.data());
      }, error => {
        console.error('Error loading data:', path, error);
      });
      
    } catch (error) {
      console.error('Error in loadData:', path, error);
      return null;
    }
  },

  // Load data sekali
  async loadDataOnce(path) {
    try {
      const parts = path.split('/');
      
      // Handle semua path format: users/uid/fieldName
      if (parts.length === 3 && parts[0] === 'users') {
        const uid = parts[1];
        const fieldName = parts[2];
        
        const doc = await this.db.collection('users').doc(uid).get();
        const data = doc.data();
        return data ? data[fieldName] : null;
      }
      
      // Untuk path lain
      const doc = await this.db.doc(path).get();
      return doc.data();
      
    } catch (error) {
      console.error('Error in loadDataOnce:', path, error);
      return null;
    }
  },

  // Hapus field dari document user
  async removeData(path) {
    try {
      const parts = path.split('/');
      
      // Handle path format: users/uid/fieldName
      if (parts.length === 3 && parts[0] === 'users') {
        const uid = parts[1];
        const fieldName = parts[2];
        
        const updateData = {};
        updateData[fieldName] = firebase.firestore.FieldValue.delete();
        
        await this.db.collection('users').doc(uid).update(updateData);
        return;
      }
      
      // Fallback
      await this.db.doc(path).delete();
      
    } catch (error) {
      console.error('Error removing data:', path, error);
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
