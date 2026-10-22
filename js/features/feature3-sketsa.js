/**
 * feature3-sketsa.js
 * Fitur 3: Sketsa Bil (Catatan + Tabel + EV Calculator)
 * PERBAIKAN: Tampilkan NAMA TIM di tabel, bukan angka
 */

App.FeatureLoaders.sketsa = function(userRef) {
  const container = document.getElementById('sketsa');
  container.innerHTML = `
    <h2>3. Sketsa Bil</h2>
    <div class="sketsa-bil">
      <div class="sketsa-bil-section">
        <h3>📝 Catatan</h3>
        <p class="hint">Isi nama tim di setiap nomor. Nomor ini akan otomatis muncul di tabel sebagai nama tim.</p>
        <div id="notes">
          ${[1,2,3,4,5].map(i=>`
            <div class="note-row">
              <label class="note-label">${i}.</label>
              <input type="text" id="note${i}" placeholder="Nama tim ${i}" class="note-input">
            </div>
          `).join('')}
        </div>
        <button class="btn-primary" id="saveNotes">💾 Simpan Catatan</button>
        <span id="notesStatus" class="status-text"></span>
      </div>
      <div class="sketsa-bil-section">
        <h3>📊 Collection (9 Tabel)</h3>
        <p class="hint">Baris 2 & 3 otomatis menampilkan nama tim dari catatan di atas.</p>
        <div id="tablesContainer"></div>
        <button class="btn-primary" id="saveTables">Simpan Tabel</button>
        <button class="btn-danger" id="deleteAll">Hapus Semua Data</button>
        <span id="tablesStatus" class="status-text"></span>
      </div>
      <div class="sketsa-bil-section">
        <h3>🧮 Kalkulator BEP + EV</h3>
        <p class="hint">Odds: desimal (1.85) | Prob: % (60) atau desimal (0.6)</p>
        <div id="evInputs">
          <div class="input-row">
            <input type="text" class="odds" placeholder="Odds">
            <input type="text" class="prob" placeholder="Probabilitas">
          </div>
        </div>
        <button class="btn-primary" id="addLeg">+ Tambah Leg</button>
        <button class="btn-success" id="hitungEV">Hitung BEP & EV</button>
        <div id="hasil-ev"></div>
      </div>
      <div class="sketsa-bil-section">
        <h3>📁 Riwayat EV</h3>
        <div id="historyList"></div>
        <button class="btn-danger" id="clearHistory">Hapus Riwayat</button>
      </div>
    </div>
  `;

  // === CATATAN ===
  document.getElementById('saveNotes').onclick = () => {
    const notes = {};
    [1,2,3,4,5].forEach(i=>notes[i]=document.getElementById(`note${i}`).value.trim());
    App.Service.saveData('users/'+App.Auth.currentUser.uid+'/notes', notes)
      .then(()=>{
        document.getElementById('notesStatus').textContent = '✅ Tersimpan!';
        setTimeout(() => document.getElementById('notesStatus').textContent = '', 2000);
        renderTables();
      });
  };

  App.Service.loadData('users/'+App.Auth.currentUser.uid+'/notes', val=>{
    const notes = val||{};
    [1,2,3,4,5].forEach(i=>{
      const el = document.getElementById(`note${i}`);
      if(el) el.value = notes[i]||'';
    });
    // Setelah notes ter-load, render tabel
    renderTables();
  });

  // === TABEL ===
  function renderTables() {
    App.Service.loadDataOnce('users/'+App.Auth.currentUser.uid+'/notes').then(notes=>{
      const notesMap = notes||{};
      App.Service.loadDataOnce('users/'+App.Auth.currentUser.uid+'/tables').then(saved=>{
        const container = document.getElementById('tablesContainer');
        container.innerHTML = '';
        const label = notesMap[1]||'Catatan 1';
        const configs = [
          [[null,null],[3,'win'],[5,'win']],
          [[null,null],[3,'win'],[4,'win']],
          [[null,null],[3,'win'],[5,'remis']],
          [[null,null],[2,'win'],[4,'win']],
          [[null,null],[2,'win'],[5,'win']],
          [[null,null],[2,'win'],[4,'remis']],
          [[null,null],[3,'remis'],[4,'win']],
          [[null,null],[3,'remis'],[5,'win']],
          [[null,null],[2,'remis'],[5,'remis']],
        ];
        configs.forEach((cfg,i)=>{
          const base = cfg.map(r=>[...r]);
          if (saved?.[i]?.[0]) base[0]=[saved[i][0][0]||'',saved[i][0][1]||''];
          const div = document.createElement('div');
          div.className='table-container';
          div.innerHTML=`<div class="table-label">${label}</div><strong>Tabel ${i+1}</strong>`;
          const table = document.createElement('table');
          const tbody = document.createElement('tbody');
          for (let r=0;r<3;r++){
            const row = document.createElement('tr');
            for (let c=0;c<2;c++){
              const cell = document.createElement('td');
              if (r===0){
                // Baris 1: input manual (judul kolom)
                const inp = document.createElement('input');
                inp.type='text'; inp.value=base[r][c]||'';
                inp.dataset.table=i; inp.dataset.row=r; inp.dataset.col=c;
                inp.className = 'table-header-input';
                inp.placeholder = c===0 ? 'Kolom kiri' : 'Kolom kanan';
                cell.appendChild(inp);
              } else {
                // Baris 2 & 3
                if (c === 0) {
                  // === KOLOM KIRI: TAMPILKAN NAMA TIM ===
                  const noteNum = base[r][c]; // angka seperti 3, 5, 2, 4
                  const teamName = notesMap[noteNum];
                  
                  if (teamName && teamName.trim() !== '') {
                    // Catatan sudah diisi → tampilkan nama tim
                    cell.innerHTML = `<span class="team-name-display">${teamName}</span>`;
                    cell.title = `Referensi: Catatan #${noteNum}`;
                  } else {
                    // Catatan belum diisi → tampilkan placeholder
                    cell.innerHTML = `<span class="team-name-empty" title="Isi Catatan #${noteNum} di atas">️ Tim #${noteNum}</span>`;
                  }
                } else {
                  // === KOLOM KANAN: tampilkan status (win/remis) ===
                  cell.textContent = base[r][c];
                  cell.style.fontWeight = 'bold';
                  cell.className = `status-${base[r][c]}`;
                }
              }
              row.appendChild(cell);
            }
            tbody.appendChild(row);
          }
          table.appendChild(tbody);
          div.appendChild(table);
          container.appendChild(div);
        });
      });
    });
  }

  document.getElementById('saveTables').onclick = () => {
    const inputs = document.querySelectorAll('#tablesContainer input[data-row="0"]');
    const data = Array(9).fill().map(()=>[[null,null],[null,null],[null,null]]);
    inputs.forEach(inp=>{
      data[parseInt(inp.dataset.table)][0][parseInt(inp.dataset.col)] = inp.value.trim();
    });
    App.Service.saveData('users/'+App.Auth.currentUser.uid+'/tables', data)
      .then(()=>{
        document.getElementById('tablesStatus').textContent = '✅ Tersimpan!';
        setTimeout(() => document.getElementById('tablesStatus').textContent = '', 2000);
      });
  };

  document.getElementById('deleteAll').onclick = () => {
    if (confirm('Hapus semua data?')) {
      App.Service.removeData('users/'+App.Auth.currentUser.uid).then(()=>location.reload());
    }
  };

  // === EV CALCULATOR ===
  document.getElementById('addLeg').onclick = () => {
    const div = document.createElement('div');
    div.className='input-row';
    div.innerHTML=`<input type="text" class="odds" placeholder="Odds"><input type="text" class="prob" placeholder="Probabilitas">`;
    document.getElementById('evInputs').appendChild(div);
  };

  document.getElementById('hitungEV').onclick = () => {
    const oddsList = [...document.querySelectorAll('.odds')].map(i=>parseFloat(i.value)).filter(v=>!isNaN(v));
    const probList = [...document.querySelectorAll('.prob')].map(i=>{
      let v = parseFloat(i.value);
      if (!isNaN(v) && v>1) v = v/100;
      return v;
    }).filter(v=>!isNaN(v));
    if (oddsList.length!==probList.length||oddsList.length===0){
      alert("Jumlah odds dan probabilitas harus sama!"); return;
    }
    const oddsTotal = oddsList.reduce((a,b)=>a*b,1);
    const probTotal = probList.reduce((a,b)=>a*b,1);
    const bep = 1/oddsTotal;
    const fairProb = 1/oddsTotal;
    const ev = probTotal*oddsTotal - 1;
    const rek = ev>0?"✅ LAYAK":"❌ TIDAK LAYAK";
    document.getElementById('hasil-ev').innerHTML=`
      <p><strong>Odds Parlay:</strong> ${oddsTotal.toFixed(2)}</p>
      <p><strong>BEP:</strong> ${(bep*100).toFixed(2)}%</p>
      <p><strong>Fair Prob:</strong> ${(fairProb*100).toFixed(2)}%</p>
      <p><strong>EV:</strong> <span class="${ev>0?'ev-positive':'ev-negative'}">${(ev*100).toFixed(2)}%</span></p>
      <p><strong>Rekomendasi:</strong> ${rek}</p>
    `;
  };

  document.getElementById('clearHistory').onclick = () => {
    if (confirm('Hapus riwayat?')) {
      App.Service.removeData('users/'+App.Auth.currentUser.uid+'/evHistory');
      document.getElementById('historyList').innerHTML='<p><em>Riwayat dihapus.</em></p>';
    }
  };

  renderTables();
};

console.log("✅ Feature 3: Sketsa loaded");
