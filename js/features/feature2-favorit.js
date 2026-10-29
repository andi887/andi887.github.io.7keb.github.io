/**
 * feature2-favorit.js - SIMPLEST VERSION
 * Direct Firestore write dengan verifikasi server
 */

App.FeatureLoaders = App.FeatureLoaders || {};

App.FeatureLoaders.favorit = function() {
  const container = document.getElementById('favorit');
  let daftarTim = [];
  
  // Dapatkan Firestore instance langsung
  const db = App.Service.db;
  const uid = App.Auth.currentUser.uid;
  
  console.log('=== [INIT] Feature Favorit ===');
  console.log('UID:', uid);
  console.log('DB instance:', db);
  console.log('DB type:', typeof db);

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
    
    if (!nama) { alert('Nama tim harus diisi!'); inputTim.focus(); return; }
    if (!liga) { alert('Liga harus diisi!'); inputLiga.focus(); return; }
    
    const sudahAda = daftarTim.find(t => t.nama.toLowerCase() === nama.toLowerCase());
    if (sudahAda) { alert('Tim sudah ada!'); return; }
    
    const timBaru = { nama: capitalize(nama), liga: capitalize(liga) };
    daftarTim.push(timBaru);
    
    statusDiv.innerHTML = '<span style="color:#007bff;">⏳ Menyimpan...</span>';
    
    // LANGSUNG WRITE KE FIRESTORE
    const userRef = db.collection('users').doc(uid);
    const dataToSave = { timFavorit: daftarTim };
    
    console.log('=== [WRITE] Mulai ===');
    console.log('Ref:', userRef.path);
    console.log('Data:', dataToSave);
    
    userRef.set(dataToSave, { merge: true })
      .then(() => {
        console.log('✅ [WRITE] Set berhasil!');
        
        // VERIFIKASI: Baca dari server
        return userRef.get({ source: 'server' });
      })
      .then((doc) => {
        console.log('✅ [VERIFY] Document exists:', doc.exists);
        console.log('✅ [VERIFY] Data:', doc.data());
        
        if (doc.exists && doc.data().timFavorit) {
          console.log('✅ [VERIFY] timFavorit field ada!');
          console.log('✅ [VERIFY] Jumlah tim:', doc.data().timFavorit.length);
          
          statusDiv.innerHTML = '<span style="color:#28a745;">✅ Tersimpan ke server!</span>';
          inputTim.value = '';
          inputLiga.value = '';
          setTimeout(() => statusDiv.innerHTML = '', 3000);
        } else {
          throw new Error('Field timFavorit tidak ada setelah write!');
        }
      })
      .catch((error) => {
        console.error('❌ [ERROR]', error);
        console.error(' Code:', error.code);
        console.error(' Message:', error.message);
        
        statusDiv.innerHTML = '<span style="color:#dc3545;">❌ Gagal: ' + error.message + '</span>';
        daftarTim.pop();
        renderList();
        alert('Gagal simpan:\n\nCode: ' + error.code + '\nMessage: ' + error.message);
      });
  }

  function hapusTim(index) {
    if (confirm('Hapus "' + daftarTim[index].nama + '"?')) {
      daftarTim.splice(index, 1);
      
      const userRef = db.collection('users').doc(uid);
      userRef.set({ timFavorit: daftarTim }, { merge: true })
        .then(() => console.log('✅ Hapus berhasil'))
        .catch(e => {
          console.error('❌ Hapus gagal:', e);
          alert('Gagal hapus: ' + e.message);
        });
    }
  }

  function loadDariFirestore() {
    console.log('=== [LOAD] Mulai listening ===');
    const userRef = db.collection('users').doc(uid);
    
    userRef.onSnapshot((doc) => {
      console.log('📥 [SNAPSHOT] exists:', doc.exists);
      console.log('📥 [SNAPSHOT] fromCache:', doc.metadata.fromCache);
      console.log('📥 [SNAPSHOT] data:', doc.data());
      
      if (doc.exists && doc.data().timFavorit) {
        daftarTim = doc.data().timFavorit;
        console.log('📥 [LOAD] Tim:', daftarTim.length);
      } else {
        daftarTim = [];
        console.log('📥 [LOAD] Belum ada data');
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
            <strong style="font-size:16px;">${tim.nama}</strong>
            <span style="margin-left:10px; padding:4px 10px; background:#e3f2fd; color:#1976d2; border-radius:12px; font-size:12px; font-weight:600;">${tim.liga}</span>
          </div>
          <button onclick="window.favHapusTim(${index})" style="padding:6px 12px; background:#ffebee; color:#c62828; border:none; border-radius:4px; cursor:pointer; font-size:13px;">
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
  console.log('🚀 [FAVORIT] SIMPLEST VERSION loaded');
  render();
  loadDariFirestore();
};

console.log('✅ feature2-favorit.js SIMPLEST VERSION');
