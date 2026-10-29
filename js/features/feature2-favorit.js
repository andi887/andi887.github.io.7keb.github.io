/**
 * feature2-favorit.js - WITH DIRECT FIRESTORE ACCESS
 * Fallback ke Firestore langsung jika App.Service gagal
 */

App.FeatureLoaders = App.FeatureLoaders || {};

App.FeatureLoaders.favorit = function() {
  const container = document.getElementById('favorit');
  let daftarTim = [];
  
  const FIRESTORE_PATH = 'tim_favorit/1';
  const FIELD_NAME = 'daftar_tim';
  
  // Dapatkan Firestore instance
  const db = App.Service.db;

  console.log(' [FAVORIT] Path:', FIRESTORE_PATH);
  console.log('🔥 Firestore instance:', db ? 'OK' : 'NULL');

  function render() {
    container.innerHTML = `
      <h2>2. Kumpulan Tim Favorit</h2>
      
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
    if (sudahAda) { alert('️ Tim sudah ada!'); return; }
    
    const timBaru = { nama: capitalize(nama), liga: capitalize(liga) };
    daftarTim.push(timBaru);
    
    statusDiv.innerHTML = '<span style="color:#007bff;">⏳ Menyimpan...</span>';
    
    simpanKeFirestore()
      .then(() => {
        statusDiv.innerHTML = '<span style="color:#28a745;">✅ Tersimpan!</span>';
        inputTim.value = '';
        inputLiga.value = '';
        setTimeout(() => statusDiv.innerHTML = '', 3000);
      })
      .catch((error) => {
        statusDiv.innerHTML = '<span style="color:#dc3545;">❌ Gagal</span>';
        daftarTim.pop();
        renderList();
        alert('Gagal:\n' + error.message);
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
    
    try {
      // LANGSUNG KE FIRESTORE (bypass App.Service)
      console.log('🔥 Menulis ke Firestore...');
      
      await docRef.set({
        [FIELD_NAME]: daftarTim
      }, { merge: true });
      
      console.log('✅ [SAVE] Write berhasil!');
      
      // Verifikasi
      console.log('🔍 Verifikasi...');
      const snapshot = await docRef.get({ source: 'server' });
      
      if (snapshot.exists) {
        const data = snapshot.data();
        console.log('✅ [VERIFY] Data di server:', data);
        renderList();
        return true;
      } else {
        throw new Error('Document tidak ada setelah write!');
      }
      
    } catch (error) {
      console.error('❌ [SAVE] Error:', error);
      console.error('❌ Code:', error.code);
      console.error('❌ Message:', error.message);
      throw error;
    }
  }

  function loadDariFirestore() {
    console.log('👂 [LOAD] Listening...');
    const docRef = db.collection('tim_favorit').doc('1');
    
    docRef.onSnapshot({ includeMetadataChanges: true }, (doc) => {
      console.log(' [SNAPSHOT]', {
        exists: doc.exists,
        fromCache: doc.metadata.fromCache,
        hasPendingWrites: doc.metadata.hasPendingWrites,
        data: doc.data()
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
  console.log('🚀 [FAVORIT] DIRECT FIRESTORE VERSION loaded');
  render();
  loadDariFirestore();
};

console.log('✅ feature2-favorit.js DIRECT FIRESTORE VERSION');
