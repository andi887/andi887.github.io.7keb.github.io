/**
 * feature2-favorit.js - VERSI BARU (SIMPLE & CLEAN)
 * Fitur: Tambah tim favorit dengan liga, auto-save ke Firestore
 */

App.FeatureLoaders = App.FeatureLoaders || {};

App.FeatureLoaders.favorit = function() {
  const container = document.getElementById('favorit');
  let daftarTim = [];
  const db = firebase.firestore();

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
    
    // Enter key untuk submit
    document.getElementById('favInputLiga').addEventListener('keypress', function(e) {
      if (e.key === 'Enter') tambahTim();
    });
  }

  // Tambah tim
  function tambahTim() {
    const inputTim = document.getElementById('favInputTim');
    const inputLiga = document.getElementById('favInputLiga');
    
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
    
    // Cek apakah tim sudah ada
    const sudahAda = daftarTim.find(t => t.nama.toLowerCase() === nama.toLowerCase());
    if (sudahAda) {
      alert('️ Tim "' + nama + '" sudah ada di daftar favorit!');
      return;
    }
    
    // Tambah ke array
    const timBaru = {
      nama: capitalizeWords(nama),
      liga: capitalizeWords(liga)
    };
    
    daftarTim.push(timBaru);
    
    // Simpan ke Firestore
    simpanKeFirestore();
    
    // Reset form
    inputTim.value = '';
    inputLiga.value = '';
    inputTim.focus();
    
    console.log('✅ Tim ditambahkan:', timBaru);
  }

  // Hapus tim
  function hapusTim(index) {
    const tim = daftarTim[index];
    if (confirm('Hapus "' + tim.nama + '" dari favorit?')) {
      daftarTim.splice(index, 1);
      simpanKeFirestore();
      console.log('🗑️ Tim dihapus:', tim.nama);
    }
  }

  // Simpan ke Firestore
  async function simpanKeFirestore() {
    try {
      const docRef = db.collection('tim_favorit').doc('1');
      await docRef.set({
        daftar_tim: daftarTim
      }, { merge: true });
      console.log(' Tersimpan ke Firestore:', daftarTim.length, 'tim');
      renderList();
    } catch (error) {
      console.error('❌ Gagal simpan ke Firestore:', error);
      alert('Gagal menyimpan: ' + error.message);
    }
  }

  // Load dari Firestore (real-time)
  function loadDariFirestore() {
    const docRef = db.collection('tim_favorit').doc('1');
    
    docRef.onSnapshot((doc) => {
      if (doc.exists) {
        const data = doc.data();
        if (data && data.daftar_tim && Array.isArray(data.daftar_tim)) {
          daftarTim = data.daftar_tim;
          console.log('📥 Load dari Firestore:', daftarTim.length, 'tim');
        } else {
          daftarTim = [];
        }
      } else {
        daftarTim = [];
        console.log('ℹ️ Document belum ada di Firestore');
      }
      renderList();
    }, (error) => {
      console.error('❌ Error listening Firestore:', error);
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
    
    // Expose function ke window untuk onclick
    window.favHapusTim = hapusTim;
  }

  // Helper: Capitalize words
  function capitalizeWords(str) {
    return str.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  }

  // INIT
  console.log('🚀 Feature Favorit loaded');
  render();
  loadDariFirestore();
};

console.log('✅ feature2-favorit.js loaded');
