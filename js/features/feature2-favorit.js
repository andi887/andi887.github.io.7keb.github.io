/**
 * feature2-favorit.js - FINAL WORKING VERSION
 * Menggunakan App.Service yang sudah ada
 * Path: tim_favorit/1 (GLOBAL)
 */

App.FeatureLoaders = App.FeatureLoaders || {};

App.FeatureLoaders.favorit = function() {
  const container = document.getElementById('favorit');
  let daftarTim = [];
  
  // PATH YANG BENAR: tim_favorit/1 (global, bukan per user)
  const FIRESTORE_PATH = 'tim_favorit/1';
  const FIELD_NAME = 'daftar_tim';

  console.log('🎯 [FAVORIT] Menggunakan path:', FIRESTORE_PATH);

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
    
    if (!nama) { alert('️ Nama tim harus diisi!'); inputTim.focus(); return; }
    if (!liga) { alert('⚠️ Liga harus diisi!'); inputLiga.focus(); return; }
    
    const sudahAda = daftarTim.find(t => t.nama.toLowerCase() === nama.toLowerCase());
    if (sudahAda) { alert('⚠️ Tim sudah ada di daftar!'); return; }
    
    const timBaru = { nama: capitalize(nama), liga: capitalize(liga) };
    daftarTim.push(timBaru);
    
    statusDiv.innerHTML = '<span style="color:#007bff;"> Menyimpan...</span>';
    
    // SIMPAN MENGGUNAKAN App.Service
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
        daftarTim.pop(); // Hapus dari array lokal
        renderList();
        alert('Gagal menyimpan:\n\n' + error.message);
      });
  }

  function hapusTim(index) {
    const tim = daftarTim[index];
    if (confirm('Hapus "' + tim.nama + '" dari favorit?')) {
      daftarTim.splice(index, 1);
      simpanKeFirestore().catch(e => alert('Gagal hapus: ' + e.message));
    }
  }

  async function simpanKeFirestore() {
    console.log(' [SAVE] Menyimpan ke Firestore...');
    console.log('📤 Path:', FIRESTORE_PATH);
    console.log(' Field:', FIELD_NAME);
    console.log(' Data:', JSON.stringify(daftarTim, null, 2));
    
    // STRATEGI: Simpan object dengan field 'daftar_tim'
    const dataToSave = {};
    dataToSave[FIELD_NAME] = daftarTim;
    
    try {
      await App.Service.saveData(FIRESTORE_PATH, dataToSave);
      console.log('✅ [SAVE] Berhasil!');
      renderList();
    } catch (error) {
      console.error('❌ [SAVE] Gagal:', error);
      throw error;
    }
  }

  function loadDariFirestore() {
    console.log('👂 [LOAD] Listening ke Firestore...');
    console.log('👂 Path:', FIRESTORE_PATH);
    
    // LISTEN MENGGUNAKAN App.Service
    App.Service.loadData(FIRESTORE_PATH, (snapshot) => {
      console.log('📥 [LOAD] Data diterima:', snapshot);
      
      if (snapshot && snapshot[FIELD_NAME] && Array.isArray(snapshot[FIELD_NAME])) {
        daftarTim = snapshot[FIELD_NAME];
        console.log('📥 [LOAD] Berhasil load', daftarTim.length, 'tim');
      } else {
        console.log('ℹ️ [LOAD] Belum ada data');
        daftarTim = [];
      }
      
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
  console.log('🚀 [FAVORIT] FINAL VERSION loaded');
  console.log('📊 App.Service tersedia:', !!App.Service);
  console.log('📊 App.Service.db tersedia:', !!App.Service.db);
  
  render();
  loadDariFirestore();
};

console.log('✅ feature2-favorit.js FINAL WORKING VERSION');
