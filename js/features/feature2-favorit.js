/**
 * feature2-favorit.js
 * Fitur 2: Kumpulan Tim Favorit
 */

App.FeatureLoaders.favorit = function(userRef) {
  const container = document.getElementById('favorit');
  let daftarTim = [];
  let sedangMengedit = null;

  container.innerHTML = `
    <h2>2. Kumpulan Tim Favorit</h2>
    <div class="input-group">
      <input type="text" id="inputTim" placeholder="Contoh: Manchester United">
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
        <span class="tim-name">${tim}</span>
        <div class="tim-actions">
          <button class="btn-small" data-act="edit" data-idx="${idx}">✏️ Edit</button>
          <button class="btn-small btn-danger" data-act="hapus" data-idx="${idx}">🗑️ Hapus</button>
        </div>`;
      ul.appendChild(li);
    });

    ul.querySelectorAll('button[data-act="edit"]').forEach(b=>{
      b.onclick = ()=>{
        document.getElementById('inputTim').value = daftarTim[b.dataset.idx];
        sedangMengedit = parseInt(b.dataset.idx);
      };
    });
    ul.querySelectorAll('button[data-act="hapus"]').forEach(b=>{
      b.onclick = ()=>hapusTim(parseInt(b.dataset.idx));
    });
  }

  function simpanKeFirebase() {
    App.Service.saveData('users/'+App.Auth.currentUser.uid+'/timFavorit', daftarTim);
  }

  function tambahTim() {
    const input = document.getElementById('inputTim');
    const nama = input.value.trim();
    if (!nama) { alert("Nama tim tidak boleh kosong!"); return; }
    if (daftarTim.includes(nama) && sedangMengedit===null) { alert('Tim sudah ada!'); return; }
    if (sedangMengedit !== null) {
      daftarTim[sedangMengedit] = nama;
      sedangMengedit = null;
    } else {
      daftarTim.push(nama);
    }
    input.value = '';
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

  App.Service.loadData('users/'+App.Auth.currentUser.uid+'/timFavorit', val=>{
    daftarTim = Array.isArray(val)?val:[];
    renderDaftarTim();
  });
};

console.log("✅ Feature 2: Favorit loaded");
