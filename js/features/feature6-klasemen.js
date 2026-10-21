/**
 * feature6-klasemen.js
 * Fitur 6: Klasemen Manual
 * Data tim dibaca dari data/teams.json, input klasemen dilakukan manual oleh user
 * Data disimpan per-user di Firebase Realtime Database
 */
App.FeatureLoaders = App.FeatureLoaders || {};

App.FeatureLoaders.klasemen = function(userRef) {
  const container = document.getElementById('klasemen');
  let teamsData = {};
  let currentLeague = '';
  let currentTeams = [];
  const uid = App.Auth.currentUser.uid;

  // === RENDER UI ===
  container.innerHTML = `
    <h2>6. Klasemen Manual</h2>
    
    <div class="sketsa-bil-section">
      <h3>🏆 Pilih Liga</h3>
      <p class="hint">Pilih liga untuk membuat/edit klasemen. Data tim akan dimuat dari database.</p>
      <div class="input-group">
        <select id="leagueSelect" class="team-input" style="flex:1; padding:10px; border:1px solid #ccc; border-radius:4px;">
          <option value="">-- Pilih Liga --</option>
        </select>
        <button class="btn-primary" id="btnLoadTemplate">📋 Muat Template Tim</button>
      </div>
    </div>

    <div id="klasemenEditor" class="sketsa-bil-section" style="display:none;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
        <h3 id="editorTitle">Edit Klasemen</h3>
        <div>
          <button class="btn-success" id="btnSaveKlasemen">💾 Simpan Klasemen</button>
          <button class="btn-danger" id="btnClearKlasemen">🗑️ Reset</button>
        </div>
      </div>
      <p class="hint">Isi data pertandingan. Kolom <strong>SG</strong> (Selisih Gol) dihitung otomatis. Klik header <strong>Poin</strong> untuk sort.</p>
      <div style="overflow-x:auto;">
        <table id="klasemenTable">
          <thead>
            <tr>
              <th>#</th>
              <th style="text-align:left;">Tim</th>
              <th>Main</th>
              <th>M</th>
              <th>S</th>
              <th>K</th>
              <th>GM</th>
              <th>GK</th>
              <th>SG</th>
              <th>Poin</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody id="klasemenBody"></tbody>
        </table>
      </div>
      <p class="hint" id="lastSaved" style="margin-top:10px;"></p>
    </div>
  `;

  // === LOAD TEAMS.JSON ===
  async function loadTeams() {
    try {
      const response = await fetch('data/teams.json');
      if (!response.ok) throw new Error('HTTP ' + response.status);
      teamsData = await response.json();
      populateLeagueDropdown();
      console.log(`✅ Loaded ${Object.keys(teamsData).length} liga dari teams.json`);
    } catch (err) {
      console.error('❌ Gagal memuat teams.json:', err.message);
      alert('Gagal memuat data liga. Periksa file data/teams.json');
    }
  }

  // === POPULATE DROPDOWN LIGA ===
  function populateLeagueDropdown() {
    const select = document.getElementById('leagueSelect');
    const leagues = Object.keys(teamsData).sort();
    leagues.forEach(league => {
      const option = document.createElement('option');
      option.value = league;
      option.textContent = `${league} (${teamsData[league].length} tim)`;
      select.appendChild(option);
    });
  }

  // === BIND EVENTS ===
  document.getElementById('btnLoadTemplate').onclick = loadTemplate;
  document.getElementById('btnSaveKlasemen').onclick = saveKlasemen;
  document.getElementById('btnClearKlasemen').onclick = clearKlasemen;

  // === LOAD TEMPLATE (Generate baris kosong untuk semua tim di liga) ===
  async function loadTemplate() {
    const league = document.getElementById('leagueSelect').value;
    if (!league) {
      alert('⚠️ Pilih liga terlebih dahulu!');
      return;
    }

    currentLeague = league;
    const teams = teamsData[league] || [];
    
    // Tanya user: mulai baru atau load data tersimpan?
    const savedData = await App.Service.loadDataOnce(`users/${uid}/klasemen/${sanitizeKey(league)}`);
    
    if (savedData && savedData.teams && savedData.teams.length > 0) {
      const useSaved = confirm(`Ada data klasemen tersimpan untuk ${league}.\n\nOK = Gunakan data tersimpan\nCancel = Mulai template baru (kosong)`);
      if (useSaved) {
        currentTeams = savedData.teams;
        document.getElementById('lastSaved').textContent = `📅 Terakhir disimpan: ${new Date(savedData.lastUpdated).toLocaleString('id-ID')}`;
      } else {
        currentTeams = teams.map(name => createEmptyTeam(name));
      }
    } else {
      currentTeams = teams.map(name => createEmptyTeam(name));
    }

    document.getElementById('editorTitle').textContent = `🏆 Edit Klasemen: ${league}`;
    document.getElementById('klasemenEditor').style.display = 'block';
    renderTable();
  }

  // === CREATE EMPTY TEAM OBJECT ===
  function createEmptyTeam(name) {
    return {
      name: name,
      played: 0,
      won: 0,
      draw: 0,
      lost: 0,
      gf: 0,
      ga: 0,
      points: 0
    };
  }

  // === RENDER TABEL ===
  function renderTable() {
    const tbody = document.getElementById('klasemenBody');
    tbody.innerHTML = '';

    // Sort berdasarkan poin (desc), lalu selisih gol (desc)
    currentTeams.sort((a, b) => {
      const gdA = a.gf - a.ga;
      const gdB = b.gf - b.ga;
      if (b.points !== a.points) return b.points - a.points;
      return gdB - gdA;
    });

    currentTeams.forEach((team, idx) => {
      const gd = team.gf - team.ga;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${idx + 1}</strong></td>
        <td style="text-align:left; font-weight:500;">${team.name}</td>
        <td><input type="number" min="0" value="${team.played}" data-idx="${idx}" data-field="played" class="stat-input"></td>
        <td><input type="number" min="0" value="${team.won}" data-idx="${idx}" data-field="won" class="stat-input"></td>
        <td><input type="number" min="0" value="${team.draw}" data-idx="${idx}" data-field="draw" class="stat-input"></td>
        <td><input type="number" min="0" value="${team.lost}" data-idx="${idx}" data-field="lost" class="stat-input"></td>
        <td><input type="number" min="0" value="${team.gf}" data-idx="${idx}" data-field="gf" class="stat-input"></td>
        <td><input type="number" min="0" value="${team.ga}" data-idx="${idx}" data-field="ga" class="stat-input"></td>
        <td class="gd-cell">${gd > 0 ? '+' : ''}${gd}</td>
        <td><input type="number" min="0" value="${team.points}" data-idx="${idx}" data-field="points" class="stat-input points-input"></td>
        <td><button class="btn-small btn-danger" data-remove="${idx}"></button></td>
      `;
      tbody.appendChild(tr);
    });

    // Bind input events
    tbody.querySelectorAll('.stat-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.idx);
        const field = e.target.dataset.field;
        currentTeams[idx][field] = parseInt(e.target.value) || 0;
        // Auto-update SG display
        const gd = currentTeams[idx].gf - currentTeams[idx].ga;
        const gdCell = e.target.closest('tr').querySelector('.gd-cell');
        if (gdCell) gdCell.textContent = (gd > 0 ? '+' : '') + gd;
      });
    });

    // Bind remove buttons
    tbody.querySelectorAll('[data-remove]').forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.dataset.remove);
        if (confirm(`Hapus ${currentTeams[idx].name} dari klasemen?`)) {
          currentTeams.splice(idx, 1);
          renderTable();
        }
      };
    });

    applyZoneHighlighting();
  }

  // === HIGHLIGHT ZONA ===
  function applyZoneHighlighting() {
    const rows = document.querySelectorAll('#klasemenBody tr');
    rows.forEach((row, idx) => {
      row.classList.remove('zone-ucl', 'zone-uel', 'zone-conference', 'zone-relegation');
      const total = rows.length;
      if (total >= 4 && idx < 4) row.classList.add('zone-ucl');
      else if (total >= 5 && idx === 4) row.classList.add('zone-uel');
      else if (total >= 6 && idx === 5) row.classList.add('zone-conference');
      else if (total >= 3 && idx >= total - 3) row.classList.add('zone-relegation');
    });
  }

  // === SIMPAN KE FIREBASE ===
  async function saveKlasemen() {
    if (!currentLeague || currentTeams.length === 0) {
      alert('⚠️ Tidak ada data untuk disimpan!');
      return;
    }

    const btn = document.getElementById('btnSaveKlasemen');
    btn.disabled = true;
    btn.textContent = '⏳ Menyimpan...';

    try {
      const data = {
        league: currentLeague,
        lastUpdated: Date.now(),
        teams: currentTeams
      };
      await App.Service.saveData(`users/${uid}/klasemen/${sanitizeKey(currentLeague)}`, data);
      document.getElementById('lastSaved').textContent = `✅ Tersimpan: ${new Date().toLocaleString('id-ID')}`;
      alert('✅ Klasemen berhasil disimpan!');
    } catch (err) {
      alert('❌ Gagal menyimpan: ' + err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = ' Simpan Klasemen';
    }
  }

  // === RESET/HAPUS ===
  async function clearKlasemen() {
    if (!currentLeague) return;
    if (!confirm(`Hapus semua data klasemen untuk ${currentLeague}?`)) return;

    try {
      await App.Service.removeData(`users/${uid}/klasemen/${sanitizeKey(currentLeague)}`);
      currentTeams = [];
      document.getElementById('klasemenEditor').style.display = 'none';
      document.getElementById('lastSaved').textContent = '';
      alert('✅ Klasemen dihapus.');
    } catch (err) {
      alert('❌ Gagal menghapus: ' + err.message);
    }
  }

  // === SANITIZE KEY (untuk Firebase path) ===
  function sanitizeKey(str) {
    return str.replace(/[\.\#\$\[\]\/]/g, '_');
  }

  // === INIT ===
  loadTeams();
};

console.log("✅ Feature 6: Klasemen Manual loaded");
