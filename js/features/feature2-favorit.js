/**
 * feature2-favorit.js - WITH TIMEOUT & PERMISSION CHECK
 */

App.FeatureLoaders = App.FeatureLoaders || {};

App.FeatureLoaders.favorit = function() {
  const container = document.getElementById('favorit');
  let daftarTim = [];
  const db = App.Service.db;
  const FIRESTORE_PATH = 'tim_favorit/1';
  const FIELD_NAME = 'daftar_tim';

  console.log('🚀 [FAVORIT] TIMEOUT VERSION loaded');
  console.log(' Firestore:', db ? 'OK' : 'NULL');

  function render() {
    container.innerHTML = `
      <h2>2. Kumpulan Tim Favorit</h2>
      
      <div style="background:#fff3cd; border:2px solid #ffc107; padding:15px; border-radius:8px; margin-bottom:20px;">
        <strong style="color:#856404;">⚠️ PENTING: Firestore Rules</strong>
        <p style="margin:10px 0; font-size:13px;">
          Jika data tidak tersimpan, buka Firebase Console → Database → Rules<br>
          Ganti rules menjadi:<br>
          <code style="background:#f8f9fa; padding:5px; display:block; margin:5px 0;">
            allow read, write: if true;
          </code>
        </p>
      </div>
      
      <div style="background:#f8f9fa; padding:20px; border-radius:8px; margin-bottom:20px;">
        <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:end;">
          <div style="flex:1; min-width:200px;">
            <label style="display:block; margin-bottom:5px; font-weight:600;">Nama Tim *</label>
            <input type="text" id="favInputTim" placeholder="Contoh: Juventus" 
                   style="width:100%; padding:10px; border:1px solid #ddd; border-radius:4px;">
          </div>
          <div style="flex:1; min-width:200px;">
            <label style="display:block; margin-bottom:5px; font-weight:600;">Liga *</label>
            <input type="text" id="favInputLiga" placeholder="Contoh: Serie A" 
                   style="width:100%; padding:10px; border:1px solid #ddd; border-radius:4px;">
          </div>
          <button id="favBtnSimpan" style="padding:10px 20px; background:#007bff; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:600;">
            💾 Simpan
          </button>
        </div>
        <div id="favStatus" style="margin-top:10px; font-size:13px;"></div>
      </div>

      <div id="favListContainer"></div>
    `;
    bindEvents();
  }

  function bindEvents() {
    document.getElementById('favBtnSimpan').addEventListener('click', tambahTim);
    document.getElementById('favInputLiga').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') tambahTim();
    });
  }

  function tambahTim() {
    const inputTim = document.getElementById('favInputTim');
    const inputLiga = document.getElementById('favInputLiga');
    const statusDiv = document.getElementById('favStatus');
    
    const nama = inputTim.value.trim();
    const liga = inputLiga.value.trim();
    
    if (!nama) { alert('Nama tim harus diisi!'); return; }
    if (!liga) { alert('⚠️ Liga harus diisi!'); return; }
    
    const sudahAda = daftarTim.find(t => t.nama.toLowerCase() === nama.toLowerCase());
    if (sudahAda) { alert('Tim sudah ada!'); return; }
    
    const timBaru = { nama: capitalize(nama), liga: capitalize(liga) };
    daftarTim.push(timBaru);
    
    statusDiv.innerHTML = '<span style="color:#007bff;">⏳ Menyimpan (max 10 detik)...</span>';
    
    // Gunakan timeout
    const writePromise = simpanKeFirestore();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('TIMEOUT: Write operation > 10 detik. Cek Firestore Rules!')), 10000);
    });
    
    Promise.race([writePromise, timeoutPromise])
      .then(() => {
        statusDiv.innerHTML = '<span style="color:#28a745;">✅ Tersimpan ke server!</span>';
        inputTim.value = '';
        inputLiga.value = '';
        setTimeout(() => statusDiv.innerHTML = '', 3000);
      })
      .catch((error) => {
        statusDiv.innerHTML = '<span style="color:#dc3545;"> Gagal: ' + error.message + '</span>';
        daftarTim.pop();
        renderList();
        
        if (error.message.includes('TIMEOUT')) {
          alert(' TIMEOUT!\n\nWrite operation tidak selesai dalam 10 detik.\n\nPenyebab kemungkinan:\n1. Firestore Rules memblokir write\n2. Koneksi internet lambat/putus\n\nSolusi:\n- Buka Firebase Console → Database → Rules\n- Ganti rules: allow read, write: if true;\n- Publish rules');
        } else {
          alert('❌ Gagal:\n' + error.message);
        }
      });
  }

  function hapusTim(index) {
    if (confirm('Hapus "' + daftarTim[index].nama + '"?')) {
      daftarTim.splice(index, 1);
      simpanKeFirestore().catch(e => alert('Gagal: ' + e.message));
    }
  }

  async function simpanKeFirestore() {
    console.log(' [SAVE] Mulai simpan...');
    console.log('📍 Path:', FIRESTORE_PATH);
    console.log('📦 Data:', daftarTim);
    
    const docRef = db.collection('tim_favorit').doc('1');
    
    console.log('🔥 Menulis ke Firestore...');
    
    const result = await docRef.set({
      [FIELD_NAME]: daftarTim
    }, { merge: true });
    
    console.log('✅ [SAVE] Write berhasil!');
    console.log('🔍 Verifikasi...');
    
    // Verifikasi dari server
    const snapshot = await docRef.get({ source: 'server' });
    
    if (snapshot.exists) {
      const data = snapshot.data();
      console.log('✅ [VERIFY] Data di server:', data);
      
      if (data[FIELD_NAME] && data[FIELD_NAME].length === daftarTim.length) {
        console.log('✅ [VERIFY] Data cocok!');
        renderList();
        return result;
      } else {
        throw new Error('Data tidak cocok setelah write!');
      }
    } else {
      throw new Error('Document tidak ada setelah write!');
    }
  }

  function loadDariFirestore() {
    console.log('👂 [LOAD] Listening...');
    const docRef = db.collection('tim_favorit').doc('1');
    
    docRef.onSnapshot({ includeMetadataChanges: true }, (doc) => {
      console.log(' [SNAPSHOT]', {
        exists: doc.exists,
        fromCache: doc.metadata.fromCache,
        hasPendingWrites: doc.metadata.hasPendingWrites
      });
      
      if (doc.exists && doc.data()[FIELD_NAME]) {
        daftarTim = doc.data()[FIELD_NAME];
        console.log(' Load', daftarTim.length, 'tim');
      } else {
        daftarTim = [];
      }
      
      renderList();
    }, (error) => {
      console.error('❌ [LISTENER] Error:', error);
    });
  }

  function renderList() {
    const container = document.getElementById('favListContainer');
    if (!container) return;
    
    if (daftarTim.length === 0) {
      container.innerHTML = '<p style="text-align:center; color:#999; padding:40px;">Belum ada tim favorit.</p>';
      return;
    }
    
    let html = '<div style="display:grid; gap:10px;">';
    daftarTim.forEach((tim, index) => {
      html += `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:15px; background:white; border:1px solid #e0e0e0; border-radius:6px;">
          <div>
            <strong>${tim.nama}</strong>
            <span style="margin-left:10px; padding:4px 10px; background:#e3f2fd; color:#1976d2; border-radius:12px; font-size:12px;">${tim.liga}</span>
          </div>
          <button onclick="window.favHapusTim(${index})" style="padding:6px 12px; background:#ffebee; color:#c62828; border:none; border-radius:4px; cursor:pointer;">
            🗑 Hapus
          </button>
        </div>
      `;
    });
    html += '</div>';
    container.innerHTML = html;
    window.favHapusTim = hapusTim;
  }

  function capitalize(str) {
    return str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  }

  // INIT
  render();
  loadDariFirestore();
};

console.log('✅ feature2-favorit.js TIMEOUT VERSION loaded');
