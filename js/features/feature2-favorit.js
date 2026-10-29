/**
 * feature2-favorit.js - WRITE VERIFICATION VERSION
 * Dengan verifikasi write ke server
 */

App.FeatureLoaders = App.FeatureLoaders || {};

App.FeatureLoaders.favorit = function() {
  const container = document.getElementById('favorit');
  let daftarTim = [];
  let db;

  try {
    if (typeof firebase !== 'undefined' && firebase.firestore) {
      db = firebase.firestore();
      console.log('✅ Firestore tersedia');
    } else {
      console.error('❌ Firebase tidak tersedia');
      return;
    }
  } catch (e) {
    console.error('❌ Error:', e);
    return;
  }

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
      <div id="favListContainer">
        <p style="text-align:center; color:#999; padding:40px;">Belum ada tim favorit.</p>
      </div>
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
    
    if (!nama) { alert('Nama tim harus diisi!'); inputTim.focus(); return; }
    if (!liga) { alert('Liga harus diisi!'); inputLiga.focus(); return; }
    
    const sudahAda = daftarTim.find(t => t.nama.toLowerCase() === nama.toLowerCase());
    if (sudahAda) { alert('Tim sudah ada!'); return; }
    
    const timBaru = { nama: capitalize(nama), liga: capitalize(liga) };
    daftarTim.push(timBaru);
    
    statusDiv.innerHTML = '<span style="color:#007bff;">⏳ Menyimpan ke server...</span>';
    
    simpanKeFirestore()
      .then(() => {
        statusDiv.innerHTML = '<span style="color:#28a745;">✅ Tersimpan ke server!</span>';
        inputTim.value = '';
        inputLiga.value = '';
        inputTim.focus();
        setTimeout(() => statusDiv.innerHTML = '', 3000);
      })
      .catch((error) => {
        statusDiv.innerHTML = '<span style="color:#dc3545;">❌ Gagal: ' + error.message + '</span>';
        daftarTim.pop();
        renderList();
        alert('Gagal simpan: ' + error.message);
      });
  }

  function hapusTim(index) {
    const tim = daftarTim[index];
    if (confirm('Hapus "' + tim.nama + '"?')) {
      daftarTim.splice(index, 1);
      simpanKeFirestore().catch(e => alert('Gagal hapus: ' + e.message));
    }
  }

  async function simpanKeFirestore() {
    console.log('🔵 [WRITE] Mencoba menyimpan ke server...');
    console.log('📤 Data yang akan disimpan:', JSON.stringify(daftarTim, null, 2));
    
    const docRef = db.collection('tim_favorit').doc('1');
    
    try {
      // Gunakan set dengan merge untuk update
      await docRef.set({ 
        daftar_tim: daftarTim,
        updated_at: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      
      console.log('✅ [WRITE] Set berhasil, memverifikasi...');
      
      // VERIFIKASI: Baca langsung dari server (bukan cache)
      const snapshot = await docRef.get({ source: 'server' });
      
      if (snapshot.exists) {
        const data = snapshot.data();
        console.log('✅ [VERIFY] Data di server:', data);
        
        if (data.daftar_tim && data.daftar_tim.length === daftarTim.length) {
          console.log('✅ [VERIFY] Write berhasil! Data tersimpan di server.');
          renderList();
          return true;
        } else {
          throw new Error('Data tidak cocok! Expected: ' + daftarTim.length + ', Got: ' + (data.daftar_tim ? data.daftar_tim.length : 0));
        }
      } else {
        throw new Error('Document tidak ada setelah write!');
      }
      
    } catch (error) {
      console.error('❌ [WRITE] Error:', error);
      console.error('❌ [WRITE] Code:', error.code);
      console.error('❌ [WRITE] Message:', error.message);
      throw error;
    }
  }

  function loadDariFirestore() {
    console.log('👂 [LISTENER] Memulai listener untuk tim_favorit/1');
    const docRef = db.collection('tim_favorit').doc('1');
    
    docRef.onSnapshot({ includeMetadataChanges: true }, (doc) => {
      console.log('📥 [LISTENER] Snapshot:', {
        exists: doc.exists,
        fromCache: doc.metadata.fromCache,
        hasPendingWrites: doc.metadata.hasPendingWrites
      });
      
      if (doc.exists && doc.data().daftar_tim) {
        daftarTim = doc.data().daftar_tim;
        console.log('📥 [LISTENER] Load berhasil:', daftarTim.length, 'tim');
      } else {
        daftarTim = [];
        console.log('ℹ️ [LISTENER] Belum ada data');
      }
      renderList();
    }, (error) => {
      console.error('❌ [LISTENER] Error:', error);
      alert('Gagal load: ' + error.message);
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
  console.log('🚀 [FAVORIT] WRITE VERIFICATION VERSION loaded');
  render();
  loadDariFirestore();
};

console.log('✅ feature2-favorit.js WRITE VERIFICATION VERSION');
