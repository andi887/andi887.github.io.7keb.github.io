/**
 * feature6-klasemen.js (Versi 2.0 - Improved)
 * Fitur 6: Klasemen Manual dengan Sinkronisasi Live (Firestore + LocalStorage)
 */
App.FeatureLoaders = App.FeatureLoaders || {};

App.FeatureLoaders.klasemen = function(userRef) {
  const container = document.getElementById('klasemen');
  let teamsData = {};
  let currentLeague = '';
  let currentTeams = [];
  const uid = App.Auth.currentUser.uid;
  
  // Variabel untuk listener real-time (agar bisa di-cleanup saat pindah fitur)
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
      <p class="hint">💡 <strong>Tips:</strong> Kolom <strong>Main</strong> dan <strong>Poin</strong> akan dihitung otomatis saat Anda mengisi M, S, atau K. Klik header <strong>Poin</strong> untuk sort.</p>
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
      console.log(`✅ Loaded ${Object.keys(teamsData).length} liga dari teams.json`);
    } catch (err) {
      console.error('❌ Gagal memuat teams.json:', err.message);
      container.innerHTML += `<p style="color:red;">⚠️ Gagal memuat data/teams.json. Pastikan file ada.</p>`;
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
    if (!league) {
      alert('⚠️ Pilih liga terlebih dahulu!');
      return;
    }

    // Cleanup listener lama jika ada
    if (unsubscribeKlasemen) {
      unsubscribeKlasemen();
      unsubscribeKlasemen = null;
    }

    currentLeague = league;
    const safeKey = sanitizeKey(league);
    const storageKey = `klasemen_${uid}_${safeKey}`;
    const teams = teamsData[league] || [];

    // Coba ambil dari LocalStorage dulu sebagai fallback cepat
    const localData = localStorage.getItem(storageKey);
    let hasLocalData = false;

    if (localData) {
      try {
        const parsed = JSON.parse(localData);
        if (parsed.teams && parsed.teams.length > 0) {
          currentTeams = parsed.teams;
          hasLocalData = true;
          document.getElementById('lastSaved').textContent = `📱 Dimuat dari cache lokal (Offline)`;
        }
      } catch (e) {
        console.warn('Gagal parse localStorage', e);
      }
    }

    // Jika tidak ada data lokal, buat template baru
    if (!hasLocalData) {
      currentTeams = teams.map(name => createEmptyTeam(name));
    }

    document.getElementById('editorTitle').textContent = `🏆 ${league}`;
    document.getElementById('klasemenEditor').style.display = 'block';
    renderTable();

    // === MULAI LISTEN FIRESTORE SECARA REAL-TIME ===
    setupRealtimeListener(safeKey, storageKey);
  }

  // === 5. REAL-TIME FIRESTORE LISTENER (Live Update) ===
  function setupRealtimeListener(safeKey, storageKey) {
    const db = firebase.firestore(); // Pastikan firebase sudah diinisialisasi di App
    const docRef = db.collection('users').doc(uid).collection('klasemen').doc(safeKey);

    document.getElementById('syncStatus').textContent = '🔄 Sinkronisasi...';

    unsubscribeKlasemen = docRef.onSnapshot((doc) => {
      if (doc.exists) {
        const data = doc.data();
        // Update state hanya jika data dari server lebih baru atau berbeda
        // (Sederhana: timpa saja agar selalu sinkron antar device)
        currentTeams = data.teams;
        
        // Simpan ke localStorage sebagai backup/cache
        localStorage.setItem(storageKey, JSON.stringify(data));
        
        renderTable();
        document.getElementById('syncStatus').textContent = '🟢 Live (Tersinkron)';
        document.getElementById('lastSaved').textContent = `☁️ Terakhir diupdate dari Cloud: ${new Date(data.lastUpdated).toLocaleString('id-ID')}`;
      } else {
        document.getElementById('syncStatus').textContent = '⚪ Belum ada data di Cloud';
      }
    }, (error) => {
      console.error("Firestore listener error:", error);
      document.getElementById('syncStatus').textContent = '🔴 Offline (Menggunakan LocalStorage)';
    });
  }

  // === 6. CREATE EMPTY TEAM ===
  function createEmptyTeam(name) {
    return { name, played: 0, won: 0, draw: 0, lost: 0, gf: 0, ga: 0, points: 0 };
  }

  // === 7. RENDER TABEL DENGAN AUTO-CALCULATION ===
  function renderTable() {
    const tbody = document.getElementById('klasemenBody');
    tbody.innerHTML = '';

    // Sort: Poin (desc) -> Selisih Gol (desc) -> Gol Masuk (desc)
    currentTeams.sort((a, b) => {
      const gdA = a.gf - a.ga;
      const gdB = b.gf - b.ga;
      if (b.points !== a.points) return b.points - a.points;
      if (gdB !== gdA) return gdB - gdA;
      return b.gf - a.gf;
    });

    currentTeams.forEach((team, idx) => {
      const gd = team.gf - team.ga;
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${idx + 1}</strong></td>
        <td style="text-align:left; font-weight:500;">${team.name}</td>
        <td><input type="number" min="0" value="${team.played}" data-idx="${idx}" data-field="played" class="stat-input" readonly style="background:#f0f0f0;"></td>
        <td><input type="number" min="0" value="${team.won}" data-idx="${idx}" data-field="won" class="stat-input"></td>
        <td><input type="number" min="0" value="${team.draw}" data-idx="${idx}" data-field="draw" class="stat-input"></td>
        <td><input type="number" min="0" value="${team.lost}" data-idx="${idx}" data-field="lost" class="stat-input"></td>
        <td><input type="number" min="0" value="${team.gf}" data-idx="${idx}" data-field="gf" class="stat-input"></td>
        <td><input type="number" min="0" value="${team.ga}" data-idx="${idx}" data-field="ga" class="stat-input"></td>
        <td class="gd-cell" style="font-weight:bold;">${gd > 0 ? '+' : ''}${gd}</td>
        <td><input type="number" min="0" value="${team.points}" data-idx="${idx}" data-field="points" class="stat-input points-input" readonly style="background:#f0f0f0; font-weight:bold;"></td>
        <td><button class="btn-small btn-danger" data-remove="${idx}" title="Hapus Tim">✕</button></td>
      `;
      tbody.appendChild(tr);
    });

    // Bind input events dengan AUTO-CALCULATION
    tbody.querySelectorAll('.stat-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const idx = parseInt(e.target.dataset.idx);
        const field = e.target.dataset.field;
        const val = parseInt(e.target.value) || 0;
        
        currentTeams[idx][field] = val;

        // AUTO-CALCULATE: Main = M + S + K
        const t = currentTeams[idx];
        t.played = t.won + t.draw + t.lost;
        
        // AUTO-CALCULATE: Poin = (M * 3) + (S * 1)
        t.points = (t.won * 3) + (t.draw * 1);

        // Update UI secara langsung tanpa re-render penuh (agar kursor tidak hilang)
        const row = e.target.closest('tr');
        row.querySelector('[data-field="played"]').value = t.played;
        row.querySelector('[data-field="points"]').value = t.points;
        
        const gd = t.gf - t.ga;
        row.querySelector('.gd-cell').textContent = (gd > 0 ? '+' : '') + gd;

        document.getElementById('syncStatus').textContent = '🟡 Ada perubahan belum disimpan';
      });
    });

    // Bind remove buttons
    tbody.querySelectorAll('[data-remove]').forEach(btn => {
      btn.onclick = () => {
        const idx = parseInt(btn.dataset.remove);
        if (confirm(`Hapus ${currentTeams[idx].name} dari klasemen?`)) {
          currentTeams.splice(idx, 1);
          renderTable(); // Re-render untuk update urutan
          document.getElementById('syncStatus').textContent = '🟡 Ada perubahan belum disimpan';
        }
      };
    });

    applyZoneHighlighting();
  }

  // === 8. HIGHLIGHT ZONA (UCL, UEL, Degradasi) ===
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

  // === 9. SIMPAN KE FIRESTORE & LOCALSTORAGE ===
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
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp(), // Gunakan server timestamp
        teams: currentTeams
      };

      const safeKey = sanitizeKey(currentLeague);
      const storageKey = `klasemen_${uid}_${safeKey}`;

      // 1. Simpan ke Firestore
      const db = firebase.firestore();
      await db.collection('users').doc(uid).collection('klasemen').doc(safeKey).set(data);

      // 2. Simpan ke LocalStorage (sebagai cache/backup)
      // Kita perlu mengonversi serverTimestamp ke Date biasa untuk JSON.stringify
      const localData = { ...data, lastUpdated: Date.now() };
      localStorage.setItem(storageKey, JSON.stringify(localData));

      document.getElementById('syncStatus').textContent = '🟢 Tersimpan';
      document.getElementById('lastSaved').textContent = `✅ Tersimpan di Cloud & Lokal: ${new Date().toLocaleString('id-ID')}`;
      
      // Opsional: Toast notification kecil alih-alih alert yang mengganggu
      console.log('✅ Klasemen berhasil disimpan!');
    } catch (err) {
      console.error('Save error:', err);
      alert('❌ Gagal menyimpan ke Cloud: ' + err.message + '\n(Data tetap aman di LocalStorage browser Anda)');
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  }

  // === 10. RESET / HAPUS DATA ===
  async function clearKlasemen() {
    if (!currentLeague) return;
    if (!confirm(`⚠️ PERINGATAN: Hapus semua data klasemen untuk ${currentLeague} secara permanen?`)) return;

    try {
      const safeKey = sanitizeKey(currentLeague);
      const storageKey = `klasemen_${uid}_${safeKey}`;

      // Hapus dari Firestore
      const db = firebase.firestore();
      await db.collection('users').doc(uid).collection('klasemen').doc(safeKey).delete();

      // Hapus dari LocalStorage
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

  // === 11. SANITIZE KEY ===
  function sanitizeKey(str) {
    return str.replace(/[\.\#\$\[\]\/]/g, '_');
  }

  // === INIT ===
  loadTeams();

  // === CLEANUP SAAT FITUR DIGANTI (PENTING UNTUK MENCEGAH MEMORY LEAK) ===
  // Pastikan App Anda memiliki mekanisme untuk memanggil ini saat user pindah menu
  return {
    cleanup: () => {
      if (unsubscribeKlasemen) {
        unsubscribeKlasemen();
        unsubscribeKlasemen = null;
        console.log('🧹 Klasemen listener cleaned up');
      }
    }
  };
};

console.log("✅ Feature 6: Klasemen Manual (Live + Dual Storage) loaded");
