/**
 * feature6-klasemen.js (Versi 4.2 - Input Stabil + Auto-Save)
 * Fix: input tidak responsif karena re-render penuh saat blur
 * Solusi: sort dengan DOM-move (baris tidak dihancurkan) + event delegation
 */
App.FeatureLoaders = App.FeatureLoaders || {};

App.FeatureLoaders.klasemen = function(userRef) {
  const container = document.getElementById('klasemen');
  let teamsData = {};
  let currentLeague = '';
  let currentTeams = [];
  const uid = App.Auth.currentUser.uid;
  const db = App.Service.db;
  let unsubscribeKlasemen = null;
  let autoSaveTimeout = null;
  let isUpdatingFromCloud = false;
  let rowMap = new Map(); // ⭐ nama tim -> elemen <tr> (tidak dihancurkan saat sort)

  // === RENDER UI ===
  container.innerHTML = `
    <h2>6. Klasemen Manual (Live)</h2>
    
    <div class="sketsa-bil-section">
      <h3>🏆 Pilih Liga</h3>
      <p class="hint">Pilih liga. Data otomatis disinkronkan dengan Cloud Firestore.</p>
      <div class="input-group">
        <select id="leagueSelect" class="team-input" style="flex:1; padding:10px; border:1px solid #ccc; border-radius:4px;">
          <option value="">-- Pilih Liga --</option>
        </select>
        <button class="btn-primary" id="btnLoadTemplate">📋 Muat Template Liga</button>
      </div>
    </div>

    <div id="klasemenEditor" class="sketsa-bil-section" style="display:none;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; flex-wrap: wrap; gap: 10px;">
        <h3 id="editorTitle" style="margin:0;">Edit Klasemen</h3>
        <div style="display:flex; gap:10px; align-items:center;">
          <span id="syncStatus" style="font-size:0.85em; color:#666; padding:4px 8px; background:#f0f0f0; border-radius:4px;">⚪ Belum aktif</span>
          <button class="btn-success" id="btnForceSave">💾 Force Save</button>
          <button class="btn-danger" id="btnClearKlasemen">🗑️ Reset Liga</button>
        </div>
      </div>
      <p class="hint">💡 <strong>Tips:</strong> Isi M, S, K, GM, GK. Kolom <strong>Main</strong>, <strong>SG</strong>, & <strong>Poin</strong> otomatis terhitung. Klasemen otomatis diurutkan & disimpan setelah Anda selesai mengedit.</p>
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
      <p class="hint" id="lastSaved" style="margin-top:10px; font-style:italic; color:#666;"></p>
    </div>
  `;

  // === BIND EVENT DELEGATION (sekali saja, tidak hilang saat render) ===
  const tbodyEl = document.getElementById('klasemenBody');

  tbodyEl.addEventListener('input', (e) => {
    if (e.target.classList.contains('stat-input')) {
      updateTeamDataInstant(e.target);
    }
  });

  // blur tidak bubble -> pakai capture
  tbodyEl.addEventListener('blur', (e) => {
    if (e.target.classList.contains('stat-input')) {
      handleBlur(e.target);
    }
  }, true);

  tbodyEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.classList.contains('stat-input')) {
      e.preventDefault();
      sortPreservingFocus(e.target, true);
      triggerAutoSave();
    }
  });

  tbodyEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button.btn-danger[data-team]');
    if (btn) removeTeam(btn.dataset.team);
  });

  document.getElementById('btnLoadTemplate').onclick = loadTemplate;
  document.getElementById('btnForceSave').onclick = () => saveToFirestore(true);
  document.getElementById('btnClearKlasemen').onclick = clearKlasemen;

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

  // === 3. LOAD TEMPLATE & LISTENER ===
  async function loadTemplate() {
    const league = document.getElementById('leagueSelect').value;
    if (!league) { alert('⚠️ Pilih liga terlebih dahulu!'); return; }

    if (unsubscribeKlasemen) { unsubscribeKlasemen(); unsubscribeKlasemen = null; }

    currentLeague = league;
    const safeKey = sanitizeKey(league);
    const teams = teamsData[league] || [];

    currentTeams = teams.map(name => createEmptyTeam(name));

    document.getElementById('editorTitle').textContent = `🏆 ${league}`;
    document.getElementById('klasemenEditor').style.display = 'block';
    
    renderTable();
    setupRealtimeListener(safeKey);
  }

  // === 4. REAL-TIME LISTENER ===
  function setupRealtimeListener(safeKey) {
    const docRef = db.collection('users').doc(uid).collection('klasemen').doc(safeKey);

    updateSyncStatus('🔄', 'Sinkronisasi...', '#999');

    unsubscribeKlasemen = docRef.onSnapshot((doc) => {
      if (isUpdatingFromCloud) {
        isUpdatingFromCloud = false;
        return;
      }

      if (doc.exists) {
        const data = doc.data();
        currentTeams = data.teams || [];
        renderTable();
        updateSyncStatus('🟢', 'Live (Tersinkron)', '#28a745');
        
        if (data.lastUpdated) {
          const ts = data.lastUpdated.toDate ? data.lastUpdated.toDate() : new Date(data.lastUpdated);
          document.getElementById('lastSaved').textContent = `☁️ Update terakhir: ${ts.toLocaleString('id-ID')}`;
        }
      } else {
        updateSyncStatus('⚪', 'Belum ada data di Cloud', '#999');
        document.getElementById('lastSaved').textContent = 'ℹ️ Belum ada data tersimpan untuk liga ini.';
      }
    }, (error) => {
      console.error("Firestore listener error:", error);
      updateSyncStatus('🔴', 'Error: ' + error.message, '#dc3545');
    });
  }

  function updateSyncStatus(icon, text, color) {
    const el = document.getElementById('syncStatus');
    el.textContent = `${icon} ${text}`;
    el.style.color = color;
  }

  // === 5. CREATE EMPTY TEAM ===
  function createEmptyTeam(name) {
    return { name, played: 0, won: 0, draw: 0, lost: 0, gf: 0, ga: 0, points: 0 };
  }

  // === 6. SORT HELPERS ===
  function sortTeams() {
    currentTeams.sort((a, b) => {
      const gdA = a.gf - a.ga;
      const gdB = b.gf - b.ga;
      if (b.points !== a.points) return b.points - a.points;
      if (gdB !== gdA) return gdB - gdA;
      if (b.gf !== a.gf) return b.gf - a.gf;
      return a.name.localeCompare(b.name);
    });
  }

  function recalcAll() {
    currentTeams.forEach(team => {
      team.played = (team.won || 0) + (team.draw || 0) + (team.lost || 0);
      team.points = ((team.won || 0) * 3) + ((team.draw || 0) * 1);
    });
  }

  // === 7. RENDER TABEL (hanya saat load/reset/snapshot cloud) ===
  function renderTable() {
    recalcAll();
    sortTeams();

    tbodyEl.innerHTML = '';
    rowMap = new Map();

    currentTeams.forEach((team, idx) => {
      const gd = (team.gf || 0) - (team.ga || 0);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong class="rank-display">${idx + 1}</strong></td>
        <td style="text-align:left; font-weight:500;">${team.name}</td>
        <td><input type="number" min="0" value="${team.played}" data-team="${team.name}" data-field="played" class="stat-input" readonly style="background:#f0f0f0;"></td>
        <td><input type="number" min="0" value="${team.won}" data-team="${team.name}" data-field="won" class="stat-input"></td>
        <td><input type="number" min="0" value="${team.draw}" data-team="${team.name}" data-field="draw" class="stat-input"></td>
        <td><input type="number" min="0" value="${team.lost}" data-team="${team.name}" data-field="lost" class="stat-input"></td>
        <td><input type="number" min="0" value="${team.gf}" data-team="${team.name}" data-field="gf" class="stat-input"></td>
        <td><input type="number" min="0" value="${team.ga}" data-team="${team.name}" data-field="ga" class="stat-input"></td>
        <td class="gd-cell" style="font-weight:bold; color:${gd > 0 ? '#28a745' : gd < 0 ? '#dc3545' : '#666'}">${gd > 0 ? '+' : ''}${gd}</td>
        <td><input type="number" min="0" value="${team.points}" data-team="${team.name}" data-field="points" class="stat-input points-input" readonly style="background:#f0f0f0; font-weight:bold;"></td>
        <td><button class="btn-small btn-danger" data-team="${team.name}" title="Hapus Tim">✕</button></td>
      `;
      rowMap.set(team.name, tr);
      tbodyEl.appendChild(tr);
    });

    applyZoneHighlighting();
  }

  // === 8. UPDATE INSTAN (per baris, tanpa render ulang) ===
  function updateTeamDataInstant(el) {
    const teamName = el.dataset.team;
    const field = el.dataset.field;
    const val = parseInt(el.value) || 0;

    const team = currentTeams.find(t => t.name === teamName);
    if (!team) return;

    team[field] = val;
    team.played = (team.won || 0) + (team.draw || 0) + (team.lost || 0);
    team.points = ((team.won || 0) * 3) + ((team.draw || 0) * 1);

    console.log(`✏️ [KLASEMEN] input: ${teamName} | ${field} = ${val} | Main=${team.played} Poin=${team.points}`);

    const row = rowMap.get(teamName);
    if (!row) return;

    row.querySelector('[data-field="played"]').value = team.played;
    row.querySelector('[data-field="points"]').value = team.points;
    
    const gd = (team.gf || 0) - (team.ga || 0);
    const gdCell = row.querySelector('.gd-cell');
    gdCell.textContent = (gd > 0 ? '+' : '') + gd;
    gdCell.style.color = gd > 0 ? '#28a745' : gd < 0 ? '#dc3545' : '#666';

    updateSyncStatus('🟡', 'Perubahan belum diurutkan', '#ffc107');
  }

  // === 9. ⭐ SORT TANPA MENGHANCURKAN BARIS (DOM-move) ===
  function sortPreservingFocus(originEl, moveNext) {
    const namesBefore = Array.from(tbodyEl.children)
      .map(r => r.querySelector('.stat-input')?.dataset.team).join('|');
    
    recalcAll();
    sortTeams();
    
    const namesAfter = currentTeams.map(t => t.name).join('|');
    const changed = namesBefore !== namesAfter;

    if (changed) {
      // Pindahkan baris yang SAMA (tidak dihancurkan) sesuai urutan baru
      currentTeams.forEach(team => {
        const row = rowMap.get(team.name);
        if (row) tbodyEl.appendChild(row);
      });
      console.log('🔀 [KLASEMEN] Urutan berubah, baris dipindah (fokus dipertahankan)');
    }

    refreshRowDisplays();

    if (moveNext && originEl) {
      const editables = Array.from(tbodyEl.querySelectorAll('.stat-input:not([readonly])'));
      const i = editables.indexOf(originEl);
      if (i > -1 && i < editables.length - 1) {
        editables[i + 1].focus();
        editables[i + 1].select();
      }
    }
  }

  // === 10. HANDLE BLUR: sort + jaga fokus elemen yang baru diklik ===
  function handleBlur(originEl) {
    const act = document.activeElement;
    const keep = (act && act.classList && act.classList.contains('stat-input') && act !== originEl) ? act : null;

    sortPreservingFocus(null, false);

    if (keep && keep.isConnected && document.activeElement !== keep) {
      keep.focus(); // kembalikan fokus ke input yang baru diklik user
    }

    triggerAutoSave();
  }

  // === 11. UPDATE ANGKA PER BARIS SETELAH SORT ===
  function refreshRowDisplays() {
    Array.from(tbodyEl.children).forEach((row, idx) => {
      const name = row.querySelector('.stat-input')?.dataset.team;
      const team = currentTeams.find(t => t.name === name);
      if (!team) return;

      row.querySelector('.rank-display').textContent = idx + 1;
      row.querySelector('[data-field="played"]').value = team.played;
      row.querySelector('[data-field="points"]').value = team.points;

      const gd = (team.gf || 0) - (team.ga || 0);
      const gdCell = row.querySelector('.gd-cell');
      gdCell.textContent = (gd > 0 ? '+' : '') + gd;
      gdCell.style.color = gd > 0 ? '#28a745' : gd < 0 ? '#dc3545' : '#666';
    });
    applyZoneHighlighting();
  }

  // === 12. HAPUS TIM ===
  function removeTeam(teamName) {
    if (!confirm(`Hapus ${teamName} dari klasemen?`)) return;
    currentTeams = currentTeams.filter(t => t.name !== teamName);
    const row = rowMap.get(teamName);
    if (row) row.remove();
    rowMap.delete(teamName);
    refreshRowDisplays();
    triggerAutoSave();
  }

  // === 13. HIGHLIGHT ZONA ===
  function applyZoneHighlighting() {
    const rows = tbodyEl.children;
    const total = rows.length;
    Array.from(rows).forEach((row, idx) => {
      row.style.background = '';
      if (total >= 4 && idx < 4) row.style.background = 'rgba(46, 204, 113, 0.15)';
      else if (total >= 5 && idx === 4) row.style.background = 'rgba(241, 196, 15, 0.15)';
      else if (total >= 6 && idx === 5) row.style.background = 'rgba(230, 126, 34, 0.15)';
      else if (total >= 3 && idx >= total - 3) row.style.background = 'rgba(231, 76, 60, 0.15)';
    });
  }

  // === 14. AUTO-SAVE DEBOUNCE ===
  function triggerAutoSave() {
    if (autoSaveTimeout) clearTimeout(autoSaveTimeout);
    updateSyncStatus('🟡', 'Menyimpan...', '#ffc107');
    autoSaveTimeout = setTimeout(() => saveToFirestore(false), 1000);
  }

  // === 15. SIMPAN KE FIRESTORE ===
  async function saveToFirestore(isForce = false) {
    if (!currentLeague || currentTeams.length === 0) {
      if (isForce) alert('⚠️ Tidak ada data untuk disimpan!');
      return;
    }

    const btn = document.getElementById('btnForceSave');
    if (isForce && btn) {
      btn.disabled = true;
      btn.textContent = '⏳ Menyimpan...';
    }

    try {
      const safeKey = sanitizeKey(currentLeague);
      const docRef = db.collection('users').doc(uid).collection('klasemen').doc(safeKey);

      const data = {
        league: currentLeague,
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
        teams: currentTeams
      };

      isUpdatingFromCloud = true;
      await docRef.set(data);

      document.getElementById('lastSaved').textContent = `✅ Tersimpan di Cloud: ${new Date().toLocaleString('id-ID')}`;
      updateSyncStatus('🟢', 'Live (Tersinkron)', '#28a745');
      console.log(`✅ [KLASEMEN] Saved: ${currentLeague} (${currentTeams.length} teams)`);
    } catch (err) {
      console.error('Save error:', err);
      updateSyncStatus('🔴', 'Error: ' + err.message, '#dc3545');
      if (isForce) alert('❌ Gagal menyimpan: ' + err.message);
      isUpdatingFromCloud = false;
    } finally {
      if (isForce && btn) {
        btn.disabled = false;
        btn.textContent = '💾 Force Save';
      }
    }
  }

  // === 16. RESET LIGA ===
  async function clearKlasemen() {
    if (!currentLeague) return;
    if (!confirm(`⚠️ Reset klasemen ${currentLeague}?\n\nSemua data statistik akan kembali ke template kosong.`)) return;

    try {
      const safeKey = sanitizeKey(currentLeague);
      await db.collection('users').doc(uid).collection('klasemen').doc(safeKey).delete();

      const teams = teamsData[currentLeague] || [];
      currentTeams = teams.map(name => createEmptyTeam(name));
      renderTable();
      
      updateSyncStatus('⚪', 'Data direset', '#999');
      document.getElementById('lastSaved').textContent = '🗑️ Data klasemen telah direset.';
    } catch (err) {
      alert('❌ Gagal reset: ' + err.message);
    }
  }

  // === 17. SANITIZE KEY ===
  function sanitizeKey(str) {
    return str.replace(/[\.\#\$\[\]\/]/g, '_');
  }

  // === INIT ===
  loadTeams();

  return {
    cleanup: () => {
      if (unsubscribeKlasemen) { unsubscribeKlasemen(); unsubscribeKlasemen = null; }
      if (autoSaveTimeout) clearTimeout(autoSaveTimeout);
    }
  };
};

console.log("✅ Feature 6: Klasemen Manual v4.2 (Input Stabil + Auto-Save) loaded");
