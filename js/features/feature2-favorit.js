/**
 * feature2-favorit.js - VERSI DEBUG & ROBUST
 * Dengan logging detail untuk troubleshoot
 */

App.FeatureLoaders = App.FeatureLoaders || {};

App.FeatureLoaders.favorit = function() {
  const container = document.getElementById('favorit');
  let daftarTim = [];
  
  // Cek Firebase SDK
  let db;
  try {
    if (typeof firebase !== 'undefined' && firebase.firestore) {
      db = firebase.firestore();
      console.log('✅ Firebase Firestore tersedia');
    } else {
      console.error('❌ Firebase SDK tidak tersedia!');
      alert('Firebase SDK tidak ter-load. Periksa konfigurasi Firebase.');
      return;
    }
  } catch (e) {
    console.error('❌ Error inisialisasi Firestore:', e);
    alert('Gagal inisialisasi Firestore: ' + e.message);
    return;
  }

  // Render HTML
  function render() {
    container.innerHTML = `
      <h2>2. Kumpulan Tim Favorit</h2>
      
      <div style="background:#f8f9fa; padding:20px; border-radius:8px; margin-bottom:20px;">
        <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:end;">
          <div style="flex:1; min-width:200px;">
            <label style="display:block; margin-bottom:5px; font-weight:600; color:#333;">Nama Tim *</label>
            <input type="text" id="favInputTim" placeholder="Contoh: Juventus" 
                   style="width:100%; padding:10px; border:1px solid #ddd; border-radius:4px; font-size:14px;">
          </div>
          
          <div style="flex:1; min-width:200px;">
            <label style="display:block; margin-bottom:5px; font-weight:600; color:#333;">Liga *</label>
            <input type="text" id="favInputLiga" placeholder="Contoh: Serie A" 
                   style="width:100%; padding:10px; border:1px solid #ddd; border-radius:4px; font-size:14px;">
          </div>
          
          <button id="favBtnSimpan" style="padding:10px 20px; background:#007bff; color:white; border:none; border-radius:4px; cursor:pointer; font-weight:600;">
            💾 Simpan
          </button>
        </div>
        <div id="favStatus" style="margin-top:10px; font-size:13px; color:#666;"></div>
      </div>

      <div id="favListContainer">
        <p style="text-align:center; color:#999; padding:40px;">Belum ada tim favorit. Tambahkan tim di atas.</p>
      </div>
    `;

    bindEvents();
  }

  // Bind events
  function bindEvents() {
    document.getElementById('favBtnSimpan').addEventListener('click', tambahTim);
    
    document.getElementById('favInputLiga').addEventListener('keypress', function(e) {
      if (e.key === 'Enter') tambahTim();
    });
  }

  // Tambah tim
  function tambahTim() {
    const inputTim = document.getElementById('favInputTim');
    const inputLiga = document.getElementById('favInputLiga');
    const statusDiv = document.getElementById('favStatus');
    
    const nama = inputTim.value.trim();
    const liga = inputLiga.value.trim();
    
    if (!nama) {
      alert('⚠️ Nama tim harus diisi!');
      inputTim.focus();
      return;
    }
    
    if (!liga) {
      alert('⚠️ Liga harus diisi!');
      inputLiga.focus();
      return;
    }
    
    // Cek duplikat
    const sudahAda = daftarTim.find(t => t.nama.toLowerCase() === nama.toLowerCase());
    if (sudahAda) {
      alert('⚠️ Tim "' + nama + '" sudah ada di daftar favorit!');
      return;
    }
    
    const timBaru = {
      nama: capitalizeWords(nama),
      liga: capitalizeWords(liga)
    };
    
    daftarTim.push(timBaru);
    
    statusDiv.innerHTML = '<span style="color:#007bff;">⏳ Menyimpan ke Firestore...</span>';
    
    // Simpan ke Firestore dengan error handling detail
    simpanKeFirestore()
      .then(() => {
        statusDiv.innerHTML = '<span style="color:#28a745;">✅ Berhasil tersimpan ke Firestore!</span>';
        console.log('✅ [SUKSES] Tim tersimpan:', timBaru);
        
        // Reset form
        inputTim.value = '';
        inputLiga.value = '';
        inputTim.focus();
        
        setTimeout(() => {
          statusDiv.innerHTML = '';
        }, 3000);
      })
      .catch((error) => {
        statusDiv.innerHTML = '<span style="color:#dc3545;">❌ Gagal simpan: ' + error.message + '</span>';
        console.error(' [GAGAL] Error detail:', error);
        
        // Hapus dari array lokal karena gagal simpan
        daftarTim.pop();
        renderList();
        
        alert('Gagal menyimpan ke Firestore:\n\n' + error.message + '\n\nCek console untuk detail.');
      });
  }

  // Hapus tim
  function hapusTim(index) {
    const tim = daftarTim[index];
    if (confirm('Hapus "' + tim.nama + '" dari favorit?')) {
      daftarTim.splice(index, 1);
      
      const statusDiv = document.getElementById('favStatus');
      if (statusDiv) {
        statusDiv.innerHTML = '<span style="color:#007bff;">⏳ Menghapus dari Firestore...</span>';
      }
      
      simpanKeFirestore()
        .then(() => {
          console.log('️ [SUKSES] Tim dihapus:', tim.nama);
          if (statusDiv) {
            statusDiv.innerHTML = '<span style="color:#28a745;">✅ Berhasil dihapus dari Firestore!</span>';
            setTimeout(() => {
              statusDiv.innerHTML = '';
            }, 3000);
          }
        })
        .catch((error) => {
          console.error('❌ [GAGAL] Hapus error:', error);
          if (statusDiv) {
            statusDiv.innerHTML = '<span style="color:#dc3545;">❌ Gagal hapus: ' + error.message + '</span>';
          }
          alert('Gagal menghapus dari Firestore:\n\n' + error.message);
        });
    }
  }

  // Simpan ke Firestore - DENGAN ERROR HANDLING DETAIL
  async function simpanKeFirestore() {
    try {
      console.log(' [FIRESTORE] Mencoba menyimpan...');
      console.log(' [FIRESTORE] Path: tim_favorit/1');
      console.log('📤 [FIRESTORE] Data:', JSON.stringify(daftarTim, null, 2));
      
      const docRef = db.collection('tim_favorit').doc('1');
      
      // Coba set dengan merge
      const result = await docRef.set({
        daftar_tim: daftarTim
      }, { merge: true });
      
      console.log('✅ [FIRESTORE] Berhasil simpan! Result:', result);
      console.log('✅ [FIRESTORE] Timestamp:', new Date().toISOString());
      
      renderList();
      return result;
      
    } catch (error) {
      console.error('❌ [FIRESTORE] Error saat simpan:', error);
      console.error('❌ [FIRESTORE] Error code:', error.code);
      console.error('❌ [FIRESTORE] Error message:', error.message);
      console.error(' [FIRESTORE] Error stack:', error.stack);
      throw error;
    }
  }

  // Load dari Firestore (real-time)
  function loadDariFirestore() {
    console.log('👂 [FIRESTORE] Memulai listener...');
    const docRef = db.collection('tim_favorit').doc('1');
    
    docRef.onSnapshot((doc) => {
      console.log('📥 [FIRESTORE] Snapshot diterima');
      console.log(' [FIRESTORE] exists:', doc.exists);
      console.log('📥 [FIRESTORE] metadata:', doc.metadata);
      
      if (doc.exists) {
        const data = doc.data();
        console.log('📥 [FIRESTORE] Data:', data);
        
        if (data && data.daftar_tim && Array.isArray(data.daftar_tim)) {
          daftarTim = data.daftar_tim;
          console.log('📥 [FIRESTORE] Load berhasil:', daftarTim.length, 'tim');
        } else {
          console.warn('⚠️ [FIRESTORE] Field daftar_tim tidak ada atau bukan array');
          daftarTim = [];
        }
      } else {
        console.log('ℹ️ [FIRESTORE] Document belum ada');
        daftarTim = [];
      }
      
      renderList();
    }, (error) => {
      console.error('❌ [FIRESTORE] Error listener:', error);
      console.error('❌ [FIRESTORE] Error code:', error.code);
      console.error('❌ [FIRESTORE] Error message:', error.message);
      
      alert('Gagal load data dari Firestore:\n\n' + error.message + '\n\nCek console untuk detail.');
    });
  }

  // Render list tim
  function renderList() {
    const container = document.getElementById('favListContainer');
    
    if (!container) return;
    
    if (daftarTim.length === 0) {
      container.innerHTML = '<p style="text-align:center; color:#999; padding:40px;">Belum ada tim favorit. Tambahkan tim di atas.</p>';
      return;
    }
    
    let html = '<div style="display:grid; gap:10px;">';
    
    daftarTim.forEach((tim, index) => {
      html += `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:15px; background:white; border:1px solid #e0e0e0; border-radius:6px; box-shadow:0 2px 4px rgba(0,0,0,0.05);">
          <div>
            <strong style="font-size:16px; color:#333;">${tim.nama}</strong>
            <span style="margin-left:10px; padding:4px 10px; background:#e3f2fd; color:#1976d2; border-radius:12px; font-size:12px; font-weight:600;">${tim.liga}</span>
          </div>
          <button onclick="window.favHapusTim(${index})" 
                  style="padding:6px 12px; background:#ffebee; color:#c62828; border:none; border-radius:4px; cursor:pointer; font-size:13px;">
            🗑 Hapus
          </button>
        </div>
      `;
    });
    
    html += '</div>';
    container.innerHTML = html;
    
    window.favHapusTim = hapusTim;
  }

  // Helper: Capitalize words
  function capitalizeWords(str) {
    return str.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  }

  // INIT
  console.log('🚀 [FAVORIT] Feature loaded');
  render();
  loadDariFirestore();
};

console.log('✅ feature2-favorit.js loaded - DEBUG VERSION');
