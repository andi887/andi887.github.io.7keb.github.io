/**
 * feature2-favorit.js - FIXED VERSION
 * Fix untuk screenshot: autocomplete tim + liga + edit mode + normalisasi "liga italy"
 */
App.FeatureLoaders = App.FeatureLoaders || {};

App.FeatureLoaders.favorit = function(userRef) {
  const container = document.getElementById('favorit');
  let daftarTim = [];
  let sedangMengedit = null;
  let teamsData = {};
  let allTeams = [];
  let allLigas = [];

  async function loadTeams() {
    try {
      const res = await fetch('data/teams.json');
      if (!res.ok) throw new Error('HTTP '+res.status);
      teamsData = await res.json();
      allTeams = Object.values(teamsData).flat();
      allLigas = Object.keys(teamsData);
      console.log(`✅ Favorit: Loaded ${allTeams.length} teams, ${allLigas.length} liga`);
    } catch(e) {
      console.warn('⚠ Favorit: teams.json tidak ditemukan, pakai manual', e);
      teamsData = {}; allTeams=[]; allLigas=[];
    }
  }

  function normalizeLiga(input) {
    if (!input) return '';
    // mapping biar "liga italy" -> "Serie A" / "Italy"
    const lower = input.toLowerCase();
    // cari di allLigas yang cocok
    const found = allLigas.find(l => l.toLowerCase().includes(lower) || lower.includes(l.toLowerCase().split(' ')[0]));
    if (found) return found;
    // manual mapping
    if (lower.includes('italy') || lower.includes('italia')) return 'Serie A';
    if (lower.includes('premier') || lower.includes('inggris') || lower.includes('epl')) return 'Premier League';
    if (lower.includes('spanyol') || lower.includes('la liga')) return 'La Liga';
    if (lower.includes('jerman') || lower.includes('bundes')) return 'Bundesliga';
    if (lower.includes('prancis') || lower.includes('ligue')) return 'Ligue 1';
    // kapitalisasi tiap kata
    return input.split(' ').map(w=> w.charAt(0).toUpperCase()+w.slice(1).toLowerCase()).join(' ');
  }

  function normalizeNama(nama) {
    return nama.split(' ').map(w=> w.charAt(0).toUpperCase()+w.slice(1).toLowerCase()).join(' ').replace(/\b\w/g, l=>l.toUpperCase());
  }

  function renderHTML() {
    container.innerHTML = `
      <h2>2. Kumpulan Tim Favorit</h2>
      <div class="input-group" style="display:flex; gap:10px; flex-wrap:wrap; align-items:end; margin-bottom:15px;">
        <div style="flex:1; min-width:200px;">
          <label style="font-size:12px; color:#666;">Nama Tim</label><br>
          <input type="text" id="inputTim" list="favTeamDatalist" placeholder="Contoh: Manchester United" style="width:100%; padding:8px;">
        </div>
        <div style="flex:1; min-width:200px;">
          <label style="font-size:12px; color:#666;">Liga</label><br>
          <input type="text" id="inputLiga" list="favLigaDatalist" placeholder="Contoh: Premier League" style="width:100%; padding:8px;">
        </div>
        <div style="display:flex; gap:6px;">
          <button class="btn-primary" id="btnTambahTim">➕ Tambah Tim</button>
          <button class="btn-secondary" id="btnBatalEdit" style="display:none;">❌ Batal</button>
        </div>
      </div>
      <div id="editIndicator" style="display:none; background:#fff3cd; border:1px solid #ffc107; padding:8px 12px; border-radius:6px; margin-bottom:10px; font-size:13px;">🟡 Mode Edit: <span id="editNama"></span> <small>— ubah lalu klik Simpan</small></div>
      <datalist id="favTeamDatalist"></datalist>
      <datalist id="favLigaDatalist"></datalist>
      <ul id="daftarTim" class="tim-list" style="list-style:none; padding:0;"></ul>
      <p style="font-size:11px; color:#888; margin-top:15px;">💡 Tips: Pilih tim dari autocomplete, liga akan terisi otomatis.</p>
    `;
    bindEvents();
    renderDatalists();
  }

  function renderDatalists() {
    const teamDl = document.getElementById('favTeamDatalist');
    const ligaDl = document.getElementById('favLigaDatalist');
    if (teamDl) {
      const sortedTeams = [...new Set(allTeams)].sort((a,b)=>a.localeCompare(b));
      teamDl.innerHTML = sortedTeams.map(t=>`<option value="${t}">`).join('');
    }
    if (ligaDl) {
      const sortedLiga = [...new Set(allLigas)].sort();
      ligaDl.innerHTML = sortedLiga.map(l=>`<option value="${l}">`).join('');
    }
  }

  function autoFillLiga() {
    const inputTim = document.getElementById('inputTim');
    const inputLiga = document.getElementById('inputLiga');
    if (!inputTim || !inputLiga) return;
    const nama = inputTim.value.trim();
    if (!nama) return;
    // cari liga dari teamsData
    for (const [liga, teams] of Object.entries(teamsData)) {
      if (teams.some(t=> t.toLowerCase()===nama.toLowerCase())) {
        inputLiga.value = liga;
        console.log(`🔍 Auto-fill liga: ${nama} -> ${liga}`);
        return;
      }
    }
  }

  function renderDaftarTim() {
    const ul = document.getElementById('daftarTim');
    if (!ul) return;
    ul.innerHTML = '';
    if (daftarTim.length===0) { ul.innerHTML = '<li style="color:#999; padding:10px; text-align:center;">Belum ada tim favorit. Tambahkan di atas.</li>'; return; }
    daftarTim.forEach((tim, idx) => {
      const li = document.createElement('li');
      li.className = 'tim-item';
      li.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:10px 12px; border:1px solid #e5e7eb; border-radius:8px; margin-bottom:8px; background:white;';
      li.innerHTML = `
        <span class="tim-name" style="font-weight:500;">${tim.nama} <small style="color:#666; background:#f3f4f6; padding:2px 6px; border-radius:10px; font-size:11px;">${tim.liga}</small></span>
        <div class="tim-actions" style="display:flex; gap:6px;">
          <button class="btn-small" data-act="edit" data-idx="${idx}" style="padding:4px 8px; border-radius:4px; border:1px solid #ddd; background:#fff; cursor:pointer;">✏ Edit</button>
          <button class="btn-small btn-danger" data-act="hapus" data-idx="${idx}" style="padding:4px 8px; border-radius:4px; border:1px solid #fecaca; background:#fee2e2; color:#dc2626; cursor:pointer;">🗑 Hapus</button>
        </div>`;
      ul.appendChild(li);
    });

    ul.querySelectorAll('button[data-act="edit"]').forEach(b => {
      b.onclick = () => {
        const t = daftarTim[b.dataset.idx];
        document.getElementById('inputTim').value = t.nama;
        document.getElementById('inputLiga').value = t.liga;
        sedangMengedit = parseInt(b.dataset.idx);
        document.getElementById('btnTambahTim').textContent = '💾 Simpan Perubahan';
        document.getElementById('btnBatalEdit').style.display = 'inline-block';
        document.getElementById('editIndicator').style.display = 'block';
        document.getElementById('editNama').textContent = t.nama;
        document.getElementById('inputTim').focus();
        console.log('🟡 [DEBUG] Mode Edit diaktifkan untuk index:', sedangMengedit);
      };
    });
    ul.querySelectorAll('button[data-act="hapus"]').forEach(b => { b.onclick = () => hapusTim(parseInt(b.dataset.idx)); });
  }

  function resetForm() {
    document.getElementById('inputTim').value = '';
    document.getElementById('inputLiga').value = '';
    sedangMengedit = null;
    document.getElementById('btnTambahTim').textContent = '➕ Tambah Tim';
    document.getElementById('btnBatalEdit').style.display = 'none';
    document.getElementById('editIndicator').style.display = 'none';
  }

  function simpanKeFirebase() {
    const uid = App.Auth.currentUser.uid;
    const path = `users/${uid}/timFavorit`;
    console.log('🔵 [DEBUG] Mencoba menyimpan ke Firestore...', path, daftarTim);
    App.Service.saveData(path, daftarTim)
      .then(() => console.log('✅ [DEBUG] BERHASIL! Data tersimpan ke Firestore.'))
      .catch(error => { console.error('❌ [DEBUG] GAGAL!', error); alert('Gagal menyimpan: ' + error.message); });
  }

  function tambahTim() {
    const inputTim = document.getElementById('inputTim');
    const inputLiga = document.getElementById('inputLiga');
    let nama = inputTim.value.trim();
    let liga = inputLiga.value.trim();
    if (!nama) { alert("Nama tim tidak boleh kosong!"); return; }
    if (!liga) { liga = normalizeLiga(''); if (!liga) { alert("Nama liga tidak boleh kosong!"); return; } }
    nama = nama.split(' ').map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(' ');
    liga = normalizeLiga(liga);
    const sudahAda = daftarTim.findIndex(t => t.nama.toLowerCase() === nama.toLowerCase());
    if (sedangMengedit !== null) {
      daftarTim[sedangMengedit] = { nama, liga };
      console.log('🟡 [DEBUG] Data diperbarui (Edit)', sedangMengedit, nama, liga);
    } else {
      if (sudahAda !== -1) { alert('Tim sudah ada! Gunakan Edit jika ingin mengubah liga.'); return; }
      daftarTim.push({ nama, liga });
      console.log('🟢 [DEBUG] Data baru ditambahkan', nama, liga);
    }
    resetForm();
    renderDaftarTim();
    simpanKeFirebase();
  }

  function hapusTim(idx) {
    if (!confirm(`Hapus ${daftarTim[idx].nama}?`)) return;
    console.log('🔴 [DEBUG] Menghapus tim index:', idx);
    daftarTim.splice(idx, 1);
    if (sedangMengedit === idx) resetForm();
    renderDaftarTim();
    simpanKeFirebase();
  }

  function bindEvents() {
    document.getElementById('btnTambahTim').onclick = tambahTim;
    document.getElementById('btnBatalEdit').onclick = resetForm;
    const inputTim = document.getElementById('inputTim');
    if (inputTim) {
      inputTim.addEventListener('change', autoFillLiga);
      inputTim.addEventListener('input', autoFillLiga);
      inputTim.addEventListener('blur', () => setTimeout(autoFillLiga, 200));
    }
  }

  // INIT
  (async()=>{
    renderHTML();
    await loadTeams();
    renderDatalists();
    console.log('🟣 [DEBUG] Memulai proses memuat data dari Firestore...');
    App.Service.loadData('users/' + App.Auth.currentUser.uid + '/timFavorit', val => {
      console.log('🟣 [DEBUG] Data diterima dari Firestore:', val);
      if (Array.isArray(val)) {
        daftarTim = val.map(t => typeof t === 'string' ? { nama: t, liga: 'Belum ditentukan' } : { nama: t.nama || t.name || 'Unknown', liga: normalizeLiga(t.liga || t.league || 'Belum ditentukan') });
      } else { daftarTim = []; }
      renderDaftarTim();
    });
  })();
};
console.log("✅ Feature 2: Favorit loaded - FIXED");
