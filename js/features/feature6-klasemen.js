/**
 * feature6-klasemen.js
 * Fitur 6: Klasemen Live via football-data.org
 * Token API disimpan di Firestore user settings (Opsi B)
 */
App.FeatureLoaders = App.FeatureLoaders || {};

App.FeatureLoaders.klasemen = function(userRef) {
  const container = document.getElementById('klasemen');
  let apiToken = '';

  // === RENDER UI ===
  container.innerHTML = `
    <h2>6. Klasemen Live (football-data.org)</h2>
    
    <div class="sketsa-bil-section">
      <h3>⚙️ Pengaturan API Token</h3>
      <p class="hint">Masukkan token API football-data.org Anda. Token akan disimpan aman di akun Firebase Anda.</p>
      <div class="input-group">
        <input type="password" id="apiTokenInput" placeholder="Masukkan API Token (contoh: a1b2c3d4...)">
        <button class="btn-primary" id="btnSaveToken">💾 Simpan Token</button>
      </div>
    </div>

    <div class="sketsa-bil-section">
      <h3>🏆 Pilih Liga (Free Tier Supported)</h3>
      <div class="input-group">
        <select id="leagueSelect" class="team-input" style="flex:1; padding:10px; border:1px solid #ccc; border-radius:4px;">
          <option value="PL">🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League (Inggris)</option>
          <option value="PD">🇪🇸 La Liga (Spanyol)</option>
          <option value="SA">🇮🇹 Serie A (Italia)</option>
          <option value="BL1">🇩🇪 Bundesliga (Jerman)</option>
          <option value="FL1">🇫🇷 Ligue 1 (Prancis)</option>
          <option value="DED">🇳🇱 Eredivisie (Belanda)</option>
          <option value="PPL">🇵🇹 Primeira Liga (Portugal)</option>
          <option value="BSA">🇧🇷 Brasileirão Série A (Brasil)</option>
        </select>
        <button class="btn-success" id="btnLoadStandings">🔄 Tarik Data Klasemen</button>
      </div>
    </div>

    <div id="standingsResult" class="sketsa-bil-section" style="display:none;">
      <h3 id="leagueTitle">Klasemen</h3>
      <div style="overflow-x:auto;">
        <table id="standingsTable">
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
            </tr>
          </thead>
          <tbody id="standingsBody"></tbody>
        </table>
      </div>
      <p class="hint" id="lastUpdated" style="margin-top:10px;"></p>
    </div>
  `;

  // === BIND EVENTS ===
  document.getElementById('btnSaveToken').onclick = saveToken;
  document.getElementById('btnLoadStandings').onclick = loadStandings;

  // === LOAD TOKEN DARI FIRESTORE ===
  App.Service.loadDataOnce('users/' + App.Auth.currentUser.uid + '/settings').then(settings => {
    if (settings && settings.apiToken) {
      apiToken = settings.apiToken;
      document.getElementById('apiTokenInput').value = apiToken;
    }
  });

  // === FUNGSI SIMPAN TOKEN ===
  function saveToken() {
    const token = document.getElementById('apiTokenInput').value.trim();
    if (!token) {
      alert('⚠️ Token tidak boleh kosong!');
      return;
    }
    App.Service.saveData('users/' + App.Auth.currentUser.uid + '/settings', { apiToken: token })
      .then(() => {
        apiToken = token;
        alert('✅ Token berhasil disimpan dengan aman!');
      })
      .catch(err => alert('❌ Gagal menyimpan: ' + err.message));
  }

  // === FUNGSI TARIK DATA DARI API ===
  async function loadStandings() {
    if (!apiToken) {
      alert('⚠️ Harap simpan API Token terlebih dahulu!');
      return;
    }

    const leagueCode = document.getElementById('leagueSelect').value;
    const btn = document.getElementById('btnLoadStandings');
    const resultDiv = document.getElementById('standingsResult');
    
    // Loading state
    btn.disabled = true;
    btn.textContent = '⏳ Memuat data...';
    resultDiv.style.display = 'none';

    try {
      const response = await fetch(`https://api.football-data.org/v4/competitions/${leagueCode}/standings`, {
        headers: {
          'X-Auth-Token': apiToken
        }
      });

      if (!response.ok) {
        if (response.status === 403) throw new Error('Token tidak valid, kedaluwarsa, atau belum diaktifkan.');
        if (response.status === 429) throw new Error('Batas permintaan (10 req/menit) tercapai. Tunggu 1 menit.');
        throw new Error(`Gagal mengambil data: HTTP ${response.status}`);
      }

      const data = await response.json();
      renderTable(data);
      resultDiv.style.display = 'block';

    } catch (error) {
      alert('❌ Error: ' + error.message);
    } finally {
      btn.disabled = false;
      btn.textContent = '🔄 Tarik Data Klasemen';
    }
  }

  // === FUNGSI RENDER TABEL ===
  function renderTable(data) {
    const leagueName = data.competition.name;
    const season = data.season.startDate.split('-')[0];
    document.getElementById('leagueTitle').textContent = `🏆 Klasemen ${leagueName} ${season}/${season.slice(-2)}`;
    
    // Ambil klasemen total (bukan home/away)
    const totalStandings = data.standings.find(s => s.type === 'TOTAL');
    if (!totalStandings) {
      alert('Data klasemen tidak tersedia untuk liga ini saat ini.');
      return;
    }

    const standings = totalStandings.table;
    const tbody = document.getElementById('standingsBody');
    tbody.innerHTML = '';

    standings.forEach(row => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${row.position}</strong></td>
        <td style="text-align:left; font-weight:500;">${row.team.name}</td>
        <td>${row.playedGames}</td>
        <td>${row.won}</td>
        <td>${row.draw}</td>
        <td>${row.lost}</td>
        <td>${row.goalsFor}</td>
        <td>${row.goalsAgainst}</td>
        <td>${row.goalDifference > 0 ? '+' : ''}${row.goalDifference}</td>
        <td><strong>${row.points}</strong></td>
      `;
      tbody.appendChild(tr);
    });

    document.getElementById('lastUpdated').textContent = `🕒 Terakhir diperbarui: ${new Date().toLocaleString('id-ID')}`;
  }
};

console.log("✅ Feature 6: Klasemen loaded");
