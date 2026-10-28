/**
 * feature6-klasemen.js (Versi 3.0 - Auto Sort & Focus Preserving)
 * Fitur 6: Klasemen Manual dengan Pengurutan Otomatis yang Halus
 */
App.FeatureLoaders = App.FeatureLoaders || {};

App.FeatureLoaders.klasemen = function(userRef) {
  const container = document.getElementById('klasemen');
  let teamsData = {};
  let currentLeague = '';
  let currentTeams = [];
  const uid = App.Auth.currentUser.uid;
  let unsubscribeKlasemen = null; 

  // === RENDER UI ===
  container.innerHTML = `
    <h2>6. Klasemen Manual (Live)</h2>
    
    <div class="sketsa-bil-section">
      <h3>🏆 Pilih Liga</h3>
      <p class="hint">Pilih liga. Data akan dimuat dari Firestore & LocalStorage (fallback).</p>
      <div class="input-group">
        <select id="leagueSelect" class="team-input" style="flex:1; padding:10px; border:1px solid #ccc; border-radius:4px;">
          <option value="">-- Pilih Liga --</option>
        </select>
        <button class="btn-primary" id="btnLoadTemplate">📋 Muat / Reset Template</button>
      </div>
    </div>

    <div id="klasemenEditor" class="sketsa-bil-section" style="display:none;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; flex-wrap: wrap; gap: 10px;">
        <h3 id="editorTitle" style="margin:0;">Edit Klasemen</h3>
        <div style="display:flex; gap:10px;">
          <span id="syncStatus" style="font-size:0.85em; color:#666; align-self:center;">🟡 Belum disimpan</span>
          <button class="btn-success" id="btnSaveKlasemen">💾 Simpan ke Cloud</button>
          <button class="btn-danger" id="btnClearKlasemen">🗑️ Hapus Data</button>
        </div>
      </div>
      <p class="hint">💡 <strong>Tips:</strong> Isi M, S, K, GM, GK. Kolom <strong>Main</strong> & <strong>Poin</strong> otomatis terhitung. Tekan <strong>Enter</strong> atau klik di luar kotak untuk mengurutkan ulang klasemen.</p>
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
      <p class="hint" id="lastSaved" style="margin-top:10px; font-style:italic;"></p>
    </div>
  `;

  // === 1. LOAD TEAMS.JSON ===
  async function loadTeams() {
    try {
      const response = await fetch('data/teams.json');
      if (!response.ok) throw new Error('HTTP ' + response.status);
      teamsData = await response.json();
      populateLeagueDropdown();
    } catch (err) {
      console.error('❌ Gagal memuat teams.json:', err.message);
      container.innerHTML += `<p style="color:red;">⚠️ Gagal memuat data/teams.json.</p>`;
    }
  }

  // === 2. POPULATE DROPDOWN ===
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

  // === 3. BIND EVENTS ===
  document.getElementById('btnLoadTemplate').onclick = loadTemplate;
  document.getElementById('btnSaveKlasemen').onclick = saveKlasemen;
  document.getElementById('btnClearKlasemen').onclick = clearKlasemen;

  // === 4. LOAD TEMPLATE & INIT REAL-TIME LISTENER ===
  async function loadTemplate() {
    const league = document.getElementById('leagueSelect').value;
    if (!league) { alert('⚠️ Pilih liga terlebih dahulu!'); return; }

    if (unsubscribeKlasemen) { unsubscribeKlasemen(); unsubscribeKlasemen = null; }

    currentLeague = league;
    const safeKey = sanitizeKey(league);
    const storageKey = `klasemen_${uid}_${safeKey}`;
    const teams = teamsData[league] || [];

    const localData = localStorage.getItem(storageKey);
    let hasLocalData = false;

    if (localData) {
      try {
        const parsed = JSON.parse(localData);
        if (parsed.teams && parsed.teams.length > 0) {
          currentTeams = parsed.teams;
          hasLocalData = true;
          document.getElementById('lastSaved').textContent = `📱 Dimuat dari cache lokal`;
        }
      } catch (e) { console.warn('Gagal parse localStorage', e); }
    }

    if (!hasLocalData) {
      currentTeams = teams.map(name => createEmptyTeam(name));
    }

    document.getElementById('editorTitle').textContent = `🏆 ${league}`;
    document.getElementById('klasemenEditor').style.display = 'block';
    
    // Render awal
    renderTable();
    setupRealtimeListener(safeKey, storageKey);
  }

  // === 5. REAL-TIME FIRESTORE LISTENER ===
  function setupRealtimeListener(safeKey, storageKey) {
    const db = firebase.firestore();
    const docRef = db.collection('users').doc(uid).collection('klasemen').doc(safeKey);

    document.getElementById('syncStatus').textContent = '🔄 Sinkronisasi...';

    unsubscribeKlasemen = docRef.onSnapshot((doc) => {
      if (doc.exists) {
        const data = doc.data();
        currentTeams = data.teams;
        localStorage.setItem(storageKey, JSON.stringify(data));
        renderTable(); // Re-render saat ada update dari device lain
        document.getElementById('syncStatus').textContent = '🟢 Live (Tersinkron)';
        document.getElementById('lastSaved').textContent = `☁️ Update dari Cloud: ${new Date(data.lastUpdated).toLocaleString('id-ID')}`;
      } else {
        document.getElementById('syncStatus').textContent = '⚪ Belum ada data di Cloud';
      }
    }, (error) => {
      console.error("Firestore listener error:", error);
      document.getElementById('syncStatus').textContent = '🔴 Offline (LocalStorage)';
    });
  }

  // === 6. CREATE EMPTY TEAM ===
  function createEmptyTeam(name) {
    return { name, played: 0, won: 0, draw: 0, lost: 0, gf: 0, ga: 0, points: 0 };
  }

  // === 7. RENDER TABEL (DENGAN DATA-TEAM BUKAN DATA-IDX) ===
  function renderTable() {
    const tbody = document.getElementById('klasemenBody');
    
    // Sort: Poin (desc) -> Selisih Gol (desc) -> Gol Masuk (desc)
    currentTeams.sort((a, b) => {
      const gdA = a.gf - a.ga;
      const gdB = b.gf - b.ga;
      if (b.points !== a.points) return b.points - a.points;
      if (gdB !== gdA) return gdB - gdA;
      return b.gf - a.gf;
    });

    tbody.innerHTML = '';

    currentTeams.forEach((team, idx) => {
      const gd = team.gf - team.ga;
      const tr = document.createElement('tr');
      // PERUBAHAN PENTING: Gunakan data-team="${team.name}" sebagai pengganti data-idx
      tr.innerHTML = `
        <td><strong class="rank-display">${idx + 1}</strong></td>
        <td style="text-align:left; font-weight:500;">${team.name}</td>
        <td><input type="number" min="0" value="${team.played}" data-team="${team.name}" data-field="played" class="stat-input" readonly style="background:#f0f0f0;"></td>
        <td><input type="number" min="0" value="${team.won}" data-team="${team.name}" data-field="won" class="stat-input"></td>
        <td><input type="number" min="0" value="${team.draw}" data-team="${team.name}" data-field="draw" class="stat-input"></td>
        <td><input type="number" min="0" value="${team.lost}" data-team="${team.name}" data-field="lost" class="stat-input"></td>
        <td><input type="number" min="0" value="${team.gf}" data-team="${team.name}" data-field="gf" class="stat-input"></td>
        <td><input type="number" min="0" value="${team.ga}" data-team="${team.name}" data-field="ga" class="stat-input"></td>
        <td class="gd-cell" style="font-weight:bold;">${gd > 0 ? '+' : ''}${gd}</td>
        <td><input type="number" min="0" value="${team.points}" data-team="${team.name}" data-field="points" class="stat-input points-input" readonly style="background:#f0f0f0; font-weight:bold;"></td>
        <td><button class="btn-small btn-danger" data-team="${team.name}" title="Hapus Tim">✕</button></td>
      `;
      tbody.appendChild(tr);
    });

    // === BIND INPUT EVENTS (AUTO-CALCULATE + AUTO-SORT ON BLUR) ===
    tbody.querySelectorAll('.stat-input').forEach(input => {
      // 1. Update instan saat mengetik (tanpa re-render agar tidak kehilangan fokus)
      input.addEventListener('input', (e) => {
        updateTeamDataInstant(e.target);
      });

      // 2. Auto-sort saat user selesai mengedit (klik di luar atau tekan Tab)
      input.addEventListener('blur', (e) => {
        sortAndReRender(e.target);
      });
      
      // 3. Auto-sort saat user menekan Enter
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.target.blur(); // Memicu event 'blur' di atas
        }
      });
    });

    // Bind remove buttons
    tbody.querySelectorAll('[data-team]').forEach(btn => {
      // Pastikan hanya tombol hapus yang dipicu
      if (btn.tagName === 'BUTTON') {
        btn.onclick = () => {
          const teamName = btn.dataset.team;
          if (confirm(`Hapus ${teamName} dari klasemen?`)) {
            currentTeams = currentTeams.filter(t => t.name !== teamName);
            renderTable(); // Re-render penuh aman karena tidak ada input yang difokuskan
            document.getElementById('syncStatus').textContent = '🟡 Ada perubahan belum disimpan';
          }
        };
      }
    });

    applyZoneHighlighting();
  }

  // === 8. HELPER: UPDATE DATA SECARA INSTAN (TANPA RE-RENDER) ===
  function updateTeamDataInstant(el) {
    const teamName = el.dataset.team;
    const field = el.dataset.field;
    const val = parseInt(el.value) || 0;

    const team = currentTeams.find(t => t.name === teamName);
    if (!team) return;

    team[field] = val;
    // Auto-calculate
    team.played = team.won + team.draw + team.lost;
    team.points = (team.won * 3) + (team.draw * 1);

    // Update tampilan baris ini saja secara langsung
    const row = el.closest('tr');
    row.querySelector('[data-field="played"]').value = team.played;
    row.querySelector('[data-field="points"]').value = team.points;
    
    const gd = team.gf - team.ga;
    row.querySelector('.gd-cell').textContent = (gd > 0 ? '+' : '') + gd;

    document.getElementById('syncStatus').textContent = '🟡 Belum diurutkan (Tekan Enter atau klik di luar)';
  }

  // === 9. HELPER: SORT DAN RE-RENDER DENGAN FOCUS PRESERVATION ===
  function sortAndReRender(lastActiveElement) {
    // 1. Ingat elemen mana yang sedang diedit
    const activeTeamName = lastActiveElement ? lastActiveElement.dataset.team : null;
    const activeField = lastActiveElement ? lastActiveElement.dataset.field : null;

    // 2. Sort array data
    currentTeams.sort((a, b) => {
      const gdA = a.gf - a.ga;
      const gdB = b.gf - b.ga;
      if (b.points !== a.points) return b.points - a.points;
      if (gdB !== gdA) return gdB - gdA;
      return b.gf - a.gf;
    });

    // 3. Render ulang tabel (ini akan mengubah urutan baris / idx)
    renderTable();

    // 4. Kembalikan fokus ke input yang sama berdasarkan nama tim, BUKAN idx
    if (activeTeamName && activeField) {
      const newInput = document.querySelector(`input[data-team="${activeTeamName}"][data-field="${activeField}"]`);
      if (newInput) {
        newInput.focus();
        // Opsional: letakkan kursor di akhir angka
        newInput.setSelectionRange(newInput.value.length, newInput.value.length);
      }
    }
    
    document.getElementById('syncStatus').textContent = '🟢 Terurut & Siap Simpan';
  }

  // === 10. HIGHLIGHT ZONA ===
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

  // === 11. SIMPAN KE FIRESTORE & LOCALSTORAGE ===
  async function saveKlasemen() {
    if (!currentLeague || currentTeams.length === 0) {
      alert('⚠️ Tidak ada data untuk disimpan!');
      return;
    }

    const btn = document.getElementById('btnSaveKlasemen');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = '⏳ Menyimpan...';

    try {
      const data = {
        league: currentLeague,
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
        teams: currentTeams
      };

      const safeKey = sanitizeKey(currentLeague);
      const storageKey = `klasemen_${uid}_${safeKey}`;

      const db = firebase.firestore();
      await db.collection('users').doc(uid).collection('klasemen').doc(safeKey).set(data);

      const localData = { ...data, lastUpdated: Date.now() };
      localStorage.setItem(storageKey, JSON.stringify(localData));

      document.getElementById('syncStatus').textContent = '🟢 Tersimpan';
      document.getElementById('lastSaved').textContent = `✅ Tersimpan di Cloud & Lokal: ${new Date().toLocaleString('id-ID')}`;
    } catch (err) {
      console.error('Save error:', err);
      alert('❌ Gagal menyimpan ke Cloud: ' + err.message);
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }

  // === 12. RESET / HAPUS DATA ===
  async function clearKlasemen() {
    if (!currentLeague) return;
    if (!confirm(`⚠️ PERINGATAN: Hapus semua data klasemen untuk ${currentLeague} secara permanen?`)) return;

    try {
      const safeKey = sanitizeKey(currentLeague);
      const storageKey = `klasemen_${uid}_${safeKey}`;

      const db = firebase.firestore();
      await db.collection('users').doc(uid).collection('klasemen').doc(safeKey).delete();
      localStorage.removeItem(storageKey);

      currentTeams = [];
      document.getElementById('klasemenEditor').style.display = 'none';
      document.getElementById('lastSaved').textContent = '';
      document.getElementById('syncStatus').textContent = '⚪ Data dihapus';
      
      if (unsubscribeKlasemen) {
        unsubscribeKlasemen();
        unsubscribeKlasemen = null;
      }
    } catch (err) {
      alert('❌ Gagal menghapus: ' + err.message);
    }
  }

  // === 13. SANITIZE KEY ===
  function sanitizeKey(str) {
    return str.replace(/[\.\#\$\[\]\/]/g, '_');
  }

  // === INIT ===
  loadTeams();

  return {
    cleanup: () => {
      if (unsubscribeKlasemen) {
        unsubscribeKlasemen();
        unsubscribeKlasemen = null;
      }
    }
  };
};

console.log("✅ Feature 6: Klasemen Manual (Auto-Sort & Focus Preserving) loaded");
