/**
 * feature2-favorit.js
 * Fitur 2: Kumpulan Tim Favorit (dengan nama liga)
 */

App.FeatureLoaders.favorit = function(userRef) {
  const container = document.getElementById('favorit');
  let daftarTim = [];
  let sedangMengedit = null;

  container.innerHTML = `
    <h2>2. Kumpulan Tim Favorit</h2>
    <div class="input-group">
      <input type="text" id="inputTim" placeholder="Contoh: Manchester United">
      <input type="text" id="inputLiga" placeholder="Contoh: Premier League">
      <button class="btn-primary" id="btnTambahTim">➕ Tambah Tim</button>
    </div>
    <ul id="daftarTim" class="tim-list"></ul>
  `;

  function renderDaftarTim() {
    const ul = document.getElementById('daftarTim');
    ul.innerHTML = '';
    daftarTim.forEach((tim, idx) => {
      const li = document.createElement('li');
      li.className = 'tim-item';
      li.innerHTML = `
        <span class="tim-name">${tim.nama} <small style="color:#666">(${tim.liga})</small></span>
        <div class="tim-actions">
          <button class="btn-small" data-act="edit" data-idx="${idx}">✏️ Edit</button>
          <button class="btn-small btn-danger" data-act="hapus" data-idx="${idx}">🗑️ Hapus</button>
        </div>`;
      ul.appendChild(li);
    });

    ul.querySelectorAll('button[data-act="edit"]').forEach(b => {
      b.onclick = () => {
        const t = daftarTim[b.dataset.idx];
        document.getElementById('inputTim').value = t.nama;
        document.getElementById('inputLiga').value = t.liga;
        sedangMengedit = parseInt(b.dataset.idx);
      };
    });
    ul.querySelectorAll('button[data-act="hapus"]').forEach(b => {
      b.onclick = () => hapusTim(parseInt(b.dataset.idx));
    });
  }

  function simpanKeFirebase() {
    App.Service.saveData('users/' + App.Auth.currentUser.uid + '/timFavorit', daftarTim);
  }

  function tambahTim() {
    const inputTim = document.getElementById('inputTim');
    const inputLiga = document.getElementById('inputLiga');
    const nama = inputTim.value.trim();
    const liga = inputLiga.value.trim();

    if (!nama) { alert("Nama tim tidak boleh kosong!"); return; }
    if (!liga) { alert("Nama liga tidak boleh kosong!"); return; }

    const sudahAda = daftarTim.findIndex(t => t.nama.toLowerCase() === nama.toLowerCase());

    if (sedangMengedit !== null) {
      // Mode edit: update data
      daftarTim[sedangMengedit] = { nama, liga };
      sedangMengedit = null;
    } else {
      // Mode tambah baru
      if (sudahAda !== -1) { alert('Tim sudah ada!'); return; }
      daftarTim.push({ nama, liga });
    }

    inputTim.value = '';
    inputLiga.value = '';
    renderDaftarTim();
    simpanKeFirebase();
  }

  function hapusTim(idx) {
    daftarTim.splice(idx, 1);
    if (sedangMengedit === idx) sedangMengedit = null;
    renderDaftarTim();
    simpanKeFirebase();
  }

  document.getElementById('btnTambahTim').onclick = tambahTim;

  // Load data dari Firestore dengan backward compatibility
  App.Service.loadData('users/' + App.Auth.currentUser.uid + '/timFavorit', val => {
    if (Array.isArray(val)) {
      // Handle data lama (array string) -> konversi ke format baru
      daftarTim = val.map(t =>
        typeof t === 'string' ? { nama: t, liga: 'Belum ditentukan' } : t
      );
    } else {
      daftarTim = [];
    }
    renderDaftarTim();
  });
};

console.log("✅ Feature 2: Favorit loaded (dengan nama liga)");
