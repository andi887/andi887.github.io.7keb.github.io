/**
 * feature2-favorit.js - VERSI FINAL YANG BENAR
 * Menggunakan path users/{uid}/timFavorit yang sudah didukung App.Service
 */

App.FeatureLoaders = App.FeatureLoaders || {};

App.FeatureLoaders.favorit = function() {
  const container = document.getElementById('favorit');
  let daftarTim = [];

  // PATH YANG DIDUKUNG OLEH firebase-service.js
  function getPath() {
    const uid = App.Auth.currentUser.uid;
    return 'users/' + uid + '/timFavorit';
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
    
    simpanKeFirestore()
      .then(() => {
        statusDiv.innerHTML = '<span style="color:#28a745;">✅ Tersimpan!</span>';
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

  // SIMPAN - menggunakan App.Service.saveData dengan path yang didukung
  async function simpanKeFirestore() {
    const path = getPath();
    console.log(' [SAVE] Path:', path);
    console.log('📤 Data:', daftarTim);
    
    // App.Service.saveData akan handle path "users/{uid}/timFavorit"
    // dan menyimpan sebagai field "timFavorit" di document user
    await App.Service.saveData(path, daftarTim);
    
    console.log('✅ [SAVE] Berhasil!');
    renderList();
  }

  // LOAD - menggunakan App.Service.loadData dengan path yang didukung
  function loadDariFirestore() {
    const path = getPath();
    console.log('👂 [LOAD] Listening:', path);
    
    // App.Service.loadData akan listen ke document user
    // dan return field "timFavorit"
    App.Service.loadData(path, (val) => {
      console.log('📥 [LOAD] Data diterima:', val);
      
      if (Array.isArray(val)) {
        daftarTim = val.map(t => ({
          nama: t.nama || t.name || 'Unknown',
          liga: t.liga || t.league || 'Belum ditentukan'
        }));
      } else {
        daftarTim = [];
      }
      
      console.log('📥 [LOAD] Total tim:', daftarTim.length);
      renderList();
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
  console.log('🚀 [FAVORIT] FINAL VERSION - Menggunakan App.Service');
  render();
  loadDariFirestore();
};

console.log('✅ feature2-favorit.js FINAL VERSION');
