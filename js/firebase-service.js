/**
 * firebase-service.js - FIXED VERSION
 * Fix: error handling beneran + log permission-denied
 */

const App = window.App || {};

App.Service = {
  auth: FirebaseApp.auth,
  db: FirebaseApp.db,

  signIn(email, password) { return this.auth.signInWithEmailAndPassword(email, password); },
  signUp(email, password) { return this.auth.createUserWithEmailAndPassword(email, password); },
  signOut() { return this.auth.signOut(); },
  onAuthStateChanged(cb) { return this.auth.onAuthStateChanged(cb); },

  getUserRef(uid) { return this.db.collection('users').doc(uid); },

  async saveData(path, data) {
    try {
      const parts = path.split('/');
      if (parts.length === 3 && parts[0] === 'users') {
        const uid = parts[1];
        const fieldName = parts[2];
        const updateData = {};
        updateData[fieldName] = data;
        console.log('💾 Firestore SET:', `users/${uid}`, updateData);
        await this.db.collection('users').doc(uid).set(updateData, { merge: true });
        console.log('✅ Firestore SET BERHASIL');
        return;
      }
      const docRef = this.db.doc(path);
      await docRef.set(data, { merge: true });
    } catch (error) {
      console.error('❌ FIRESTORE SAVE GAGAL:', path);
      console.error('Code:', error.code, 'Message:', error.message);
      if (error.code === 'permission-denied') {
        console.error('🔒 RULES DENY! Buka Firebase Console > Firestore > Rules > ganti allow read, write: if request.auth != null');
        alert('❌ Gagal simpan: Permission Denied. Cek Firestore Rules! \n\nBuka Firebase Console > Firestore > Rules > Publish rules yang mengizinkan user sendiri.');
      }
      throw error;
    }
  },

  loadData(path, callback) {
    try {
      const parts = path.split('/');
      if (parts.length === 3 && parts[0] === 'users') {
        const uid = parts[1];
        const fieldName = parts[2];
        console.log('👂 Firestore LISTEN:', `users/${uid} -> ${fieldName}`);
        return this.db.collection('users').doc(uid).onSnapshot(doc => {
          console.log('📥 Snapshot diterima. exists:', doc.exists, 'hasPendingWrites:', doc.metadata.hasPendingWrites, 'fromCache:', doc.metadata.fromCache);
          const data = doc.data();
          const result = data ? data[fieldName] : null;
          if (result === undefined || result === null) {
            if (fieldName === 'timFavorit') callback([]);
            else callback(result);
          } else {
            callback(result);
          }
        }, error => {
          console.error('❌ LISTEN GAGAL:', path, error.code, error.message);
          callback(null);
        });
      }
      const docRef = this.db.doc(path);
      return docRef.onSnapshot(doc => { callback(doc.data()); }, error => { console.error('Error loading:', error); });
    } catch (error) {
      console.error('Error in loadData:', error);
      return null;
    }
  },

  async loadDataOnce(path) {
    const parts = path.split('/');
    if (parts.length === 3 && parts[0] === 'users') {
      const uid = parts[1];
      const fieldName = parts[2];
      const doc = await this.db.collection('users').doc(uid).get();
      const data = doc.data();
      return data ? data[fieldName] : null;
    }
    const doc = await this.db.doc(path).get();
    return doc.data();
  },

  async removeData(path) {
    try {
      const parts = path.split('/');
      if (parts.length === 3 && parts[0] === 'users') {
        const uid = parts[1];
        const fieldName = parts[2];
        const updateData = {};
        updateData[fieldName] = firebase.firestore.FieldValue.delete();
        await this.db.collection('users').doc(uid).update(updateData);
        return;
      }
      await this.db.doc(path).delete();
    } catch (error) {
      console.error('Error removing:', error);
      throw error;
    }
  },

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

App.Auth = {
  isLoginMode: true,
  currentUser: null,
  toggleMode() {
    this.isLoginMode = !this.isLoginMode;
    document.getElementById('authTitle').textContent = this.isLoginMode ? 'Login Email' : 'Daftar Akun Baru';
    document.getElementById('btnAuthAction').textContent = this.isLoginMode ? 'Login' : 'Daftar';
    document.getElementById('authToggle').textContent = this.isLoginMode ? 'Belum punya akun? Klik di sini untuk Daftar' : 'Sudah punya akun? Klik di sini untuk Login';
    document.getElementById('email').value = '';
    document.getElementById('password').value = '';
  },
  handleAuth() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    if (!email || !password) { alert("⚠ Email dan password tidak boleh kosong!"); return; }
    if (password.length < 6) { alert("⚠ Password minimal 6 karakter!"); return; }
    const promise = this.isLoginMode ? App.Service.signIn(email, password) : App.Service.signUp(email, password);
    promise.then(() => {
      if (!this.isLoginMode) { alert("✅ Akun berhasil dibuat! Silakan login."); this.toggleMode(); }
    }).catch(err => { alert("❌ " + App.Service.getAuthErrorMessage(err.code)); });
  },
  updateUI() {
    const loginForm = document.getElementById('loginForm');
    const nav = document.getElementById('mainNav');
    const userEmail = document.getElementById('userEmail');
    const btnLogout = document.getElementById('btnLogout');
    const btnLogin = document.getElementById('btnLogin');
    if (this.currentUser) {
      userEmail.textContent = this.currentUser.email;
      btnLogout.style.display = 'inline'; btnLogin.style.display = 'none'; loginForm.style.display = 'none'; nav.style.display = 'flex';
    } else {
      userEmail.textContent = ''; btnLogout.style.display = 'none'; btnLogin.style.display = 'inline'; loginForm.style.display = 'block'; nav.style.display = 'none';
    }
  },
  init() {
    document.getElementById('authToggle').addEventListener('click', () => this.toggleMode());
    document.getElementById('btnLogin').onclick = () => { document.getElementById('loginForm').style.display = 'block'; };
    document.getElementById('btnLogout').onclick = () => { App.Service.signOut().then(() => { this.currentUser = null; this.updateUI(); alert("✅ Anda telah logout."); }); };
    App.Service.onAuthStateChanged(user => {
      this.currentUser = user;
      this.updateUI();
      if (user) { console.log('🔐 Login sebagai:', user.uid, user.email); App.Dashboard.init(user.uid); }
    });
  }
};

App.FeatureLoaders = {};
window.App = App;
document.addEventListener('DOMContentLoaded', () => { App.Auth.init(); });
console.log("✅ Firebase Service (Firestore) loaded - FIXED");
