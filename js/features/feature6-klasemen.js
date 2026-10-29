/**
 * feature6-klasemen.js (Versi 4.0 - Auto-Save ke Firestore)
 * Fitur 6: Klasemen Manual dengan Pengurutan Otomatis & Auto-Save Cloud
 */
App.FeatureLoaders = App.FeatureLoaders || {};

App.FeatureLoaders.klasemen = function(userRef) {
  const container = document.getElementById('klasemen');
  let teamsData = {};
  let currentLeague = '';
  let currentTeams = [];
  const uid = App.Auth.currentUser.uid;
  const db = App.Service.db; // ⭐ Gunakan instance dari App.Service
  let unsubscribeKlasemen = null;
  let autoSaveTimeout = null; // ⭐ BARU: untuk debounce auto-save
  let isUpdatingFromCloud = false; // ⭐ BARU: flag untuk cegah loop

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
      <p class="hint">💡 <strong>Tips:</strong> Isi M, S, K, GM, GK. Kolom <strong>Main</strong>, <strong>SG</strong>, & <strong>Poin</strong> otomatis terhitung. Klasemen otomatis diurutkan setelah Anda selesai mengedit (klik di luar / tekan Enter).</p>
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
  document.getElementById('btnForceSave').onclick = () => saveToFirestore(true);
  document.getElementById('btnClearKlasemen').onclick = clearKlasemen;

  // === 4. LOAD TEMPLATE & INIT REAL-TIME LISTENER ===
  async function loadTemplate() {
    const league = document.getElementById('leagueSelect').value;
    if (!league) { alert('⚠️ Pilih liga terlebih dahulu!'); return; }

    if (unsubscribeKlasemen) { unsubscribeKlasemen(); unsubscribeKlasemen = null; }

    currentLeague = league;
    const safeKey = sanitizeKey(league);
    const teams = teamsData[league] || [];

    // Default: template kosong
    currentTeams = teams.map(name => createEmptyTeam(name));

    document.getElementById('editorTitle').textContent = `🏆 ${league}`;
    document.getElementById('klasemenEditor').style.display = 'block';
    
    // Render awal (template kosong)
    renderTable();
    
    // Setup listener real-time dari Firestore
    setupRealtimeListener(safeKey);
  }

  // === 5. REAL-TIME FIRESTORE LISTENER ===
  function setupRealtimeListener(safeKey) {
    const docRef = db.collection('users').doc(uid).collection('klasemen').doc(safeKey);

    updateSyncStatus('🔄', 'Sinkronisasi...', '#999');

    unsubscribeKlasemen = docRef.onSnapshot((doc) => {
      if (isUpdatingFromCloud) {
        // Skip jika update berasal dari diri sendiri (cegah loop)
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

  // === HELPER: Update Sync Status ===
  function updateSyncStatus(icon, text, color) {
    const el = document.getElementById('syncStatus');
    el.textContent = `${icon} ${text}`;
    el.style.color = color;
  }

  // === 6. CREATE EMPTY TEAM ===
  function createEmptyTeam(name) {
    return { name, played: 0, won: 0, draw: 0, lost: 0, gf: 0, ga: 0, points: 0 };
  }

  // === 7. RENDER TABEL ===
  function renderTable() {
    const tbody = document.getElementById('klasemenBody');
    
    // Sort: Poin (desc) -> Selisih Gol (desc) -> Gol Masuk (desc) -> Nama (asc)
    currentTeams.sort((a, b) => {
      const gdA = a.gf - a.ga;
      const gdB = b.gf - b.ga;
      if (b.points !== a.points) return b.points - a.points;
      if (gdB !== gdA) return gdB - gdA;
      if (b.gf !== a.gf) return b.gf - a.gf;
      return a.name.localeCompare(b.name);
    });

    // Re-calculate Main, Poin, SG untuk semua tim (memastikan konsisten)
    currentTeams.forEach(team => {
      team.played = (team.won || 0) + (team.draw || 0) + (team.lost || 0);
      team.points = ((team.won || 0) * 3) + ((team.draw || 0) * 1);
    });

    tbody.innerHTML = '';

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
      tbody.appendChild(tr);
    });

    // === BIND INPUT EVENTS ===
    tbody.querySelectorAll('.stat-input').forEach(input => {
      // 1. Update instan saat mengetik
      input.addEventListener('input', (e) => {
        updateTeamDataInstant(e.target);
      });

      // 2. Auto-sort + auto-save saat selesai mengedit (blur)
      input.addEventListener('blur', (e) => {
        sortAndReRender(e.target);
        triggerAutoSave(); // ⭐ BARU: auto-save setelah blur
      });
      
      // 3. Auto-sort + auto-save saat Enter
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          // Pindah ke input berikutnya di baris yang sama (lebih UX friendly)
          const allInputs = Array.from(tbody.querySelectorAll('.stat-input:not([readonly])'));
          const currentIdx = allInputs.indexOf(e.target);
          if (currentIdx < allInputs.length - 1) {
            allInputs[currentIdx + 1].focus();
            allInputs[currentIdx + 1].select();
          } else {
            e.target.blur();
          }
        }
      });
    });

    // Bind remove buttons
    tbody.querySelectorAll('button.btn-danger[data-team]').forEach(btn => {
      btn.onclick = () => {
        const teamName = btn.dataset.team;
        if (confirm(`Hapus ${teamName} dari klasemen?`)) {
          currentTeams = currentTeams.filter(t => t.name !== teamName);
          renderTable();
          triggerAutoSave(); // ⭐ Auto-save setelah hapus
        }
      };
    });

    applyZoneHighlighting();
  }

  // === 8. HELPER: UPDATE DATA SECARA INSTAN ===
  function updateTeamDataInstant(el) {
    const teamName = el.dataset.team;
    const field = el.dataset.field;
    const val = parseInt(el.value) || 0;

    const team = currentTeams.find(t => t.name === teamName);
    if (!team) return;

    team[field] = val;
    // Auto-calculate
    team.played = (team.won || 0) + (team.draw || 0) + (team.lost || 0);
    team.points = ((team.won || 0) * 3) + ((team.draw || 0) * 1);

    // Update tampilan baris ini saja
    const row = el.closest('tr');
    if (!row) return;
    
    const playedInput = row.querySelector('[data-field="played"]');
    const pointsInput = row.querySelector('[data-field="points"]');
    const gdCell = row.querySelector('.gd-cell');
    
    if (playedInput) playedInput.value = team.played;
    if (pointsInput) pointsInput.value = team.points;
    
    const gd = (team.gf || 0) - (team.ga || 0);
    if (gdCell) {
      gdCell.textContent = (gd > 0 ? '+' : '') + gd;
      gdCell.style.color = gd > 0 ? '#28a745' : gd < 0 ? '#dc3545' : '#666';
    }

    updateSyncStatus('🟡', 'Belum diurutkan...', '#ffc107');
  }

  // === 9. HELPER: SORT DAN RE-RENDER DENGAN FOCUS PRESERVATION ===
  function sortAndReRender(lastActiveElement) {
    const activeTeamName = lastActiveElement ? lastActiveElement.dataset.team : null;
    const activeField = lastActiveElement ? lastActiveElement.dataset.field : null;

    // Sort array data
    currentTeams.sort((a, b) => {
      const gdA = a.gf - a.ga;
      const gdB = b.gf - b.ga;
      if (b.points !== a.points) return b.points - a.points;
      if (gdB !== gdA) return gdB - gdA;
      if (b.gf !== a.gf) return b.gf - a.gf;
      return a.name.localeCompare(b.name);
    });

    renderTable();

    // Kembalikan fokus ke input yang sama
    if (activeTeamName && activeField) {
      const newInput = document.querySelector(`input[data-team="${activeTeamName}"][data-field="${activeField}"]`);
      if (newInput) {
        newInput.focus();
        newInput.setSelectionRange(newInput.value.length, newInput.value.length);
      }
    }
    
    updateSyncStatus('🟢', 'Terurut', '#28a745');
  }

  // === 10. HIGHLIGHT ZONA ===
  function applyZoneHighlighting() {
    const rows = document.querySelectorAll('#klasemenBody tr');
    rows.forEach((row, idx) => {
      row.classList.remove('zone-ucl', 'zone-uel', 'zone-conference', 'zone-relegation');
      row.style.background = ''; // reset
      
      const total = rows.length;
      if (total >= 4 && idx < 4) {
        row.style.background = 'rgba(46, 204, 113, 0.15)'; // UCL green
      } else if (total >= 5 && idx === 4) {
        row.style.background = 'rgba(241, 196, 15, 0.15)'; // UEL yellow
      } else if (total >= 6 && idx === 5) {
        row.style.background = 'rgba(230, 126, 34, 0.15)'; // Conference orange
      } else if (total >= 3 && idx >= total - 3) {
        row.style.background = 'rgba(231, 76, 60, 0.15)'; // Relegation red
      }
    });
  }

  // === 11. ⭐ BARU: AUTO-SAVE DENGAN DEBOUNCE ===
  function triggerAutoSave() {
    if (autoSaveTimeout) clearTimeout(autoSaveTimeout);
    
    updateSyncStatus('🟡', 'Menyimpan...', '#ffc107');
    
    // Debounce 1 detik (save hanya setelah user berhenti input selama 1 detik)
    autoSaveTimeout = setTimeout(() => {
      saveToFirestore(false);
    }, 1000);
  }

  // === 12. SIMPAN KE FIRESTORE ===
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

      // Set flag untuk cegah loop listener
      isUpdatingFromCloud = true;
      
      await docRef.set(data);

      const ts = new Date();
      document.getElementById('lastSaved').textContent = `✅ Tersimpan di Cloud: ${ts.toLocaleString('id-ID')}`;
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

  // === 13. RESET / HAPUS DATA ===
  async function clearKlasemen() {
    if (!currentLeague) return;
    if (!confirm(`⚠️ Reset klasemen ${currentLeague}?\n\nSemua data statistik akan dihapus dan kembali ke template kosong.`)) return;

    try {
      const safeKey = sanitizeKey(currentLeague);
      const docRef = db.collection('users').doc(uid).collection('klasemen').doc(safeKey);

      await docRef.delete();

      // Reset ke template kosong
      const teams = teamsData[currentLeague] || [];
      currentTeams = teams.map(name => createEmptyTeam(name));
      renderTable();
      
      updateSyncStatus('⚪', 'Data direset', '#999');
      document.getElementById('lastSaved').textContent = '🗑️ Data klasemen telah direset.';
      
      console.log(`🗑️ [KLASEMEN] Reset: ${currentLeague}`);
    } catch (err) {
      alert('❌ Gagal reset: ' + err.message);
    }
  }

  // === 14. SANITIZE KEY ===
  function sanitizeKey(str) {
    return str.replace(/[\.\#\$\[\]\/]/g, '_');
  }

  // === INIT ===
  loadTeams();

  // Cleanup saat pindah tab
  return {
    cleanup: () => {
      if (unsubscribeKlasemen) {
        unsubscribeKlasemen();
        unsubscribeKlasemen = null;
      }
      if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
      }
    }
  };
};

console.log("✅ Feature 6: Klasemen Manual (Auto-Save + Auto-Sort) loaded");
