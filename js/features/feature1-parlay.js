/**
 * feature1-parlay.js - DENGAN PENYIMPANAN HASIL PREDIKSI
 * Fitur 1: Analisis Parlay + Over/Under + Autocomplete Tim Favorit
 */
App.FeatureLoaders = App.FeatureLoaders || {};

App.FeatureLoaders.parlay = function(userRef) {
  const container = document.getElementById('parlay');
  const MAX_MATCHES = 10;
  let jumlahPertandingan = 1;
  let firebaseParlayData = [];
  let temporaryMatchData = null;
  let teamsData = {};
  let allTeams = [];
  let favoriteTeams = [];
  let lastPrediction = null; // ⭐ BARU: simpan prediksi terakhir

  // === LOAD TEAMS.JSON ===
  async function loadTeams() {
    try {
      const response = await fetch('data/teams.json');
      if (!response.ok) throw new Error('HTTP ' + response.status);
      teamsData = await response.json();
      allTeams = Object.values(teamsData).flat();
      console.log(`✅ Loaded ${allTeams.length} teams dari data/teams.json`);
    } catch (err) {
      console.error('❌ Gagal memuat teams.json:', err.message);
      teamsData = {};
      allTeams = [];
    }
  }

  // === LOAD TIM FAVORIT DARI FIRESTORE ===
  function loadTimFavorit() {
    const uid = App.Auth.currentUser?.uid;
    if (!uid) return;
    
    App.Service.loadData('users/' + uid + '/timFavorit', val => {
      if (Array.isArray(val)) {
        favoriteTeams = val.map(t => ({
          nama: t.nama || t.name || 'Unknown',
          liga: t.liga || t.league || 'Unknown'
        }));
      } else {
        favoriteTeams = [];
      }
      renderTeamDatalist();
    });
  }

  // === RENDER HTML ===
  function renderHTML() {
    container.innerHTML = `
      <h2>1. Analisis Parlay + Rekomendasi Over/Under</h2>
      <div id="matches"></div>
      <div class="match-controls">
        <button class="btn-secondary" id="btnTambah">➕ Tambah Pertandingan</button>
        <button class="btn-secondary" id="btnHapus">➖ Hapus Pertandingan</button>
      </div>
      <div class="parlay-input">
        <h3>Odds Parlay dari Bandar</h3>
        <input type="number" id="oddsBandarInput" step="0.01" min="1.01" value="30.00">
        <p class="hint">Masukkan odds akumulasi (opsional)</p>
        <button class="btn-secondary" id="btnLihatAdil">👁️ Lihat Odds Adil</button>
      </div>
      <div class="action-buttons">
        <button class="btn-primary" id="btnHitung">Hitung Analisis, Parlay & EV</button>
        <button class="btn-success" id="btnSimpan">💾 Simpan Data + Prediksi</button>
        <button class="btn-danger" id="btnHapusData">🗑️ Hapus Data</button>
      </div>
      <div id="fairOddsContainer" class="fair-odds-table" style="display:none;">
        <h3>⚖️ Odds Bandar vs Odds Adil</h3>
        <table>
          <thead>
            <tr>
              <th>Pertandingan</th><th>Outcome</th>
              <th class="odds-bandar">Bandar</th>
              <th class="odds-adil">Adil</th>
              <th class="margin-col">Margin</th>
            </tr>
          </thead>
          <tbody id="fairOddsTableBody"></tbody>
        </table>
      </div>
      <div id="hasil"></div>
      <datalist id="teamDatalist"></datalist>
    `;
    bindEvents();
    renderPertandingan();
  }

  // === RENDER DATALIST TIM ===
  function renderTeamDatalist() {
    const datalist = document.getElementById('teamDatalist');
    if (!datalist) return;
    
    let options = [];
    
    if (favoriteTeams.length > 0) {
      const favOptions = favoriteTeams
        .sort((a, b) => a.nama.localeCompare(b.nama))
        .map(t => `<option value="${t.nama}">⭐ ${t.nama} (${t.liga})</option>`);
      options = options.concat(favOptions);
    }
    
    const favNames = new Set(favoriteTeams.map(t => t.nama.toLowerCase()));
    const regularTeams = [...new Set(allTeams)]
      .filter(t => !favNames.has(t.toLowerCase()))
      .sort((a, b) => a.localeCompare(b))
      .map(t => `<option value="${t}">${t}</option>`);
    options = options.concat(regularTeams);
    
    datalist.innerHTML = options.join('');
  }

  function bindEvents() {
    document.getElementById('btnTambah').onclick = tambahPertandingan;
    document.getElementById('btnHapus').onclick = hapusPertandingan;
    document.getElementById('btnHitung').onclick = hitungParlay;
    document.getElementById('btnSimpan').onclick = simpanData;
    document.getElementById('btnHapusData').onclick = hapusData;
    document.getElementById('btnLihatAdil').onclick = tampilkanOddsAdil;
  }

  function simpanInputSementara() {
    temporaryMatchData = [];
    for (let i = 1; i <= jumlahPertandingan; i++) {
      temporaryMatchData.push({
        matchDate: i === 1 ? (document.getElementById("date1")?.value || "") : "",
        teamA: document.getElementById(`teamA${i}`)?.value.trim() || "Tim A",
        teamB: document.getElementById(`teamB${i}`)?.value.trim() || "Tim B",
        oddsA: document.getElementById(`A${i}`)?.value || "0",
        oddsD: document.getElementById(`D${i}`)?.value || "0",
        oddsB: document.getElementById(`B${i}`)?.value || "0",
        over: document.getElementById(`O${i}`)?.value || "0",
        under: document.getElementById(`U${i}`)?.value || "0",
      });
    }
  }

  function renderPertandingan() {
    const matchesDiv = document.getElementById("matches");
    if (!matchesDiv) return;
    let html = "";
    for (let i = 1; i <= jumlahPertandingan; i++) {
      let data = {};
      if (temporaryMatchData?.[i-1]) data = temporaryMatchData[i-1];
      else if (firebaseParlayData?.[i-1]) data = firebaseParlayData[i-1];

      let dateHtml = i === 1 
        ? `<div><label>Tanggal:<br><input type="date" id="date1" value="${data.matchDate||''}" style="width:120px;text-align:center;"></label></div>` 
        : "";

      html += `
        <div class="match">
          <h3>Pertandingan ${i}</h3>
          <div class="match-row">
            ${dateHtml}
            <div>
              <label>Tim A:<br>
                <input type="text" id="teamA${i}" 
                  value="${data.teamA||''}" 
                  list="teamDatalist" 
                  placeholder="Ketik atau pilih tim ▾" 
                  class="team-input"
                  style="width:160px;">
              </label>
            </div>
            <div><label>Odds A:<br><input type="number" id="A${i}" value="${data.oddsA||'0'}" step="0.01" min="0"></label></div>
            <div><label>Draw:<br><input type="number" id="D${i}" value="${data.oddsD||'0'}" step="0.01" min="0"></label></div>
            <div>
              <label>Tim B:<br>
                <input type="text" id="teamB${i}" 
                  value="${data.teamB||''}" 
                  list="teamDatalist" 
                  placeholder="Ketik atau pilih tim ▾" 
                  class="team-input"
                  style="width:160px;">
              </label>
            </div>
            <div><label>Odds B:<br><input type="number" id="B${i}" value="${data.oddsB||'0'}" step="0.01" min="0"></label></div>
            <div><label>Over:<br><input type="number" id="O${i}" value="${data.over||'0'}" step="0.01" min="0"></label></div>
            <div><label>Under:<br><input type="number" id="U${i}" value="${data.under||'0'}" step="0.01" min="0"></label></div>
          </div>
          <div id="recOU${i}" class="rec-container"></div>
        </div>`;
    }
    matchesDiv.innerHTML = html;

    for (let i = 1; i <= jumlahPertandingan; i++) {
      ["A","D","B"].forEach(t => {
        const el = document.getElementById(`${t}${i}`);
        if (el) {
          const handler = () => {
            updateOverUnder(i);
            const fc = document.getElementById("fairOddsContainer");
            if (fc) fc.style.display = "none";
            simpanInputSementara();
          };
          el.removeEventListener("input", handler);
          el.addEventListener("input", handler);
        }
      });
      updateOverUnder(i);
    }
  }

  function tambahPertandingan() {
    if (jumlahPertandingan < MAX_MATCHES) {
      simpanInputSementara();
      jumlahPertandingan++;
      renderPertandingan();
    } else alert(`Maksimal ${MAX_MATCHES} pertandingan.`);
  }

  function hapusPertandingan() {
    if (jumlahPertandingan > 1) {
      simpanInputSementara();
      jumlahPertandingan--;
      renderPertandingan();
    }
  }

  function updateOverUnder(idx) {
    const a = parseFloat(document.getElementById(`A${idx}`)?.value);
    const d = parseFloat(document.getElementById(`D${idx}`)?.value);
    const b = parseFloat(document.getElementById(`B${idx}`)?.value);
    const oEl = document.getElementById(`O${idx}`);
    const uEl = document.getElementById(`U${idx}`);
    const recEl = document.getElementById(`recOU${idx}`);

    if (isNaN(a)||isNaN(d)||isNaN(b)||a<=1||d<=1||b<=1) {
      if(oEl) oEl.value="0"; if(uEl) uEl.value="0";
      if(recEl) recEl.innerHTML="";
      return;
    }
    const pA=1/a, pD=1/d, pB=1/b, total=pA+pD+pB;
    const probA=pA/total, probD=pD/total, probB=pB/total;
    let avgGoals;
    if (probD>=0.35) avgGoals=1.8;
    else if (probD>=0.25) avgGoals=2.3;
    else if (Math.abs(probA-probB)>=0.3) avgGoals=3.1;
    else avgGoals=2.6;

    const th = {u15:2.0, u25:2.5, o25:2.7, o35:3.2};
    let goalLine, recType;
    if (avgGoals<th.u15){goalLine="1.5";recType="Under";}
    else if (avgGoals<th.u25){goalLine="2.5";recType="Under";}
    else if (avgGoals<th.o25){goalLine="2.5";recType="Over";}
    else if (avgGoals>=th.o35){goalLine="3.5";recType="Over";}
    else {goalLine="2.5";recType="Over";}

    let alt="";
    if (avgGoals>=2.9&&avgGoals<3.2) alt=" (atau Over 3/3.5)";
    else if (avgGoals>=2.4&&avgGoals<2.7) alt=" (atau Over 2/2.5)";
    else if (avgGoals>=2.0&&avgGoals<2.3) alt=" (atau Under 2/2.5)";

    let probUnder, probOver;
    if (recType==="Under") {
      probUnder = 0.52+(th.u25-avgGoals)*0.15;
      probUnder = Math.min(0.85,Math.max(0.45,probUnder));
      probOver = 1-probUnder;
    } else {
      probOver = goalLine==="3.5" 
        ? 0.55+(avgGoals-th.o35)*0.12 
        : 0.52+(avgGoals-th.u25)*0.12;
      probOver = Math.min(0.85,Math.max(0.45,probOver));
      probUnder = 1-probOver;
    }
    const margin = 1.05;
    if(oEl) oEl.value=(1/probOver*margin).toFixed(2);
    if(uEl) uEl.value=(1/probUnder*margin).toFixed(2);
    if(recEl) recEl.innerHTML=`<span class="recommendation">Rekomendasi: <strong>${recType} ${goalLine}${alt}</strong></span>`;
  }

  function hitungOddsAdil(a,d,b) {
    const pA=1/a, pD=1/d, pB=1/b, total=pA+pD+pB;
    return {
      oddsAdilA: total/pA, oddsAdilD: total/pD, oddsAdilB: total/pB,
      overround: total
    };
  }

  function analisisPertandingan(a,d,b) {
    if (a<=1||d<=1||b<=1) throw new Error("Odds harus > 1");
    const pA=1/a, pD=1/d, pB=1/b, total=pA+pD+pB;
    const probA=pA/total, probD=pD/total, probB=pB/total;
    const selisih = probA-probB;
    let label="";
    if (probD*100>=30) label="Berisiko Seri";
    else if (probA>=0.55&&selisih>=0.2) label="Tim A Favorit Kuat";
    else if (probB>=0.55&&selisih<=-0.2) label="Tim B Favorit Kuat";
    else if (probA>probB) label="Tim A Diunggulkan";
    else if (probB>probA) label="Tim B Diunggulkan";
    else label="Seimbang";
    let pilihan="Tim A", probPilihan=probA;
    if (probB>=probA&&probB>=probD){pilihan="Tim B";probPilihan=probB;}
    else if (probD>=probA&&probD>=probB){pilihan="Draw";probPilihan=probD;}
    return {
      persentase:{timA:(probA*100).toFixed(2)+"%",draw:(probD*100).toFixed(2)+"%",timB:(probB*100).toFixed(2)+"%"},
      label, pilihan, probPilihan,
      // ⭐ BARU: simpan angka mentah untuk storage
      raw: { probA, probD, probB }
    };
  }

  // ⭐ BARU: Generate semua prediksi (dipanggil saat simpan)
  function generateAllPredictions() {
    const matchPredictions = [];
    const hasilList = [];
    
    for (let i = 1; i <= jumlahPertandingan; i++) {
      const a = parseFloat(document.getElementById(`A${i}`).value);
      const d = parseFloat(document.getElementById(`D${i}`).value);
      const b = parseFloat(document.getElementById(`B${i}`).value);
      
      if (isNaN(a) || isNaN(d) || isNaN(b) || a<=1 || d<=1 || b<=1) {
        return null; // Tidak valid
      }
      
      const hasil = analisisPertandingan(a, d, b);
      hasilList.push(hasil);
      
      // Ambil rekomendasi O/U dari DOM
      const recEl = document.getElementById(`recOU${i}`);
      let recOU = '';
      if (recEl) {
        const match = recEl.textContent.match(/(Over|Under)\s+[\d.]+/);
        if (match) recOU = match[0];
      }
      
      const nA = document.getElementById(`teamA${i}`)?.value.trim() || 'Tim A';
      const nB = document.getElementById(`teamB${i}`)?.value.trim() || 'Tim B';
      
      matchPredictions.push({
        probA: hasil.persentase.timA,
        probDraw: hasil.persentase.draw,
        probB: hasil.persentase.timB,
        label: hasil.label.replace(/Tim A/g, nA).replace(/Tim B/g, nB),
        pilihan: hasil.pilihan === 'Tim A' ? nA : hasil.pilihan === 'Tim B' ? nB : 'Draw',
        probPilihan: hasil.probPilihan,
        recOU: recOU
      });
    }
    
    // Hitung prediksi parlay
    let parlaySummary = null;
    if (jumlahPertandingan > 1) {
      const probGab = hasilList.reduce((acc, h) => acc * h.probPilihan, 1);
      const oddsTeo = 1 / probGab;
      let risiko = "Rendah";
      if (probGab < 0.05) risiko = "Sangat Tinggi";
      else if (probGab < 0.1) risiko = "Tinggi";
      else if (probGab < 0.2) risiko = "Sedang";
      
      const oddsBandar = parseFloat(document.getElementById("oddsBandarInput").value);
      const ev = (!isNaN(oddsBandar) && oddsBandar > 1) ? probGab * oddsBandar - 1 : null;
      const rekomendasi = ev !== null ? (ev > 0 ? "✅ LAYAK (Positive EV)" : "❌ TIDAK LAYAK (Negative EV)") : "N/A";
      
      parlaySummary = {
        totalMatches: jumlahPertandingan,
        probMenang: (probGab * 100).toFixed(2) + "%",
        oddsTeoretis: oddsTeo.toFixed(2),
        oddsBandar: oddsBandar || null,
        risiko: risiko,
        ev: ev !== null ? (ev * 100).toFixed(2) + "%" : null,
        rekomendasi: rekomendasi,
        savedAt: new Date().toISOString()
      };
    }
    
    return { matchPredictions, parlaySummary };
  }

  function hitungParlay() {
    const pertandingan = [];
    try {
      for (let i=1;i<=jumlahPertandingan;i++) {
        const a=parseFloat(document.getElementById(`A${i}`).value);
        const d=parseFloat(document.getElementById(`D${i}`).value);
        const b=parseFloat(document.getElementById(`B${i}`).value);
        if (isNaN(a)||isNaN(d)||isNaN(b)) throw new Error(`Pertandingan ${i} tidak valid`);
        pertandingan.push({oddsA:a,oddsDraw:d,oddsB:b});
      }
      const hasilList = pertandingan.map(p=>analisisPertandingan(p.oddsA,p.oddsDraw,p.oddsB));
      let html="";
      hasilList.forEach((h,idx)=>{
        const nA=document.getElementById(`teamA${idx+1}`)?.value.trim()||"Tim A";
        const nB=document.getElementById(`teamB${idx+1}`)?.value.trim()||"Tim B";
        html+=`<div class="match"><h3>${nA} vs ${nB}</h3>
          <p><strong>Prob:</strong> ${nA}: ${h.persentase.timA} | Draw: ${h.persentase.draw} | ${nB}: ${h.persentase.timB}</p>
          <p><strong>Analisis:</strong> <span class="label">${h.label.replace(/Tim A/g,nA).replace(/Tim B/g,nB)}</span></p>
          <p><strong>Pilihan:</strong> ${h.pilihan==="Tim A"?nA:h.pilihan==="Tim B"?nB:"Draw"} (${(h.probPilihan*100).toFixed(2)}%)</p>
        </div>`;
      });
      if (jumlahPertandingan===1) {
        html+=`<div class="parlay-result"><h2>⚽ Analisis Tunggal</h2><p>Hanya 1 pertandingan.</p></div>`;
      } else {
        const probGab = hasilList.reduce((a,h)=>a*h.probPilihan,1);
        const oddsTeo = 1/probGab;
        let risiko="Rendah", rc="risk-low";
        if (probGab<0.05){risiko="Sangat Tinggi";rc="risk-high";}
        else if (probGab<0.1){risiko="Tinggi";rc="risk-high";}
        else if (probGab<0.2){risiko="Sedang";rc="risk-medium";}
        const oddsBandar = parseFloat(document.getElementById("oddsBandarInput").value);
        if (isNaN(oddsBandar)||oddsBandar<=1) {
          html+=`<div class="parlay-result"><p style="color:red;">⚠️ Odds bandar tidak valid.</p></div>`;
        } else {
          const ev = probGab*oddsBandar-1;
          const rek = ev>0?"✅ LAYAK (Positive EV)":"❌ TIDAK LAYAK (Negative EV)";
          html+=`<div class="parlay-result">
            <h2>🎯 Analisis Parlay & EV</h2>
            <p><strong>Odds Teoretis:</strong> ${oddsTeo.toFixed(2)} | <strong>Odds Bandar:</strong> ${oddsBandar.toFixed(2)}</p>
            <p><strong>Probabilitas Menang:</strong> ${(probGab*100).toFixed(2)}%</p>
            <p><strong>Risiko:</strong> <span class="${rc}">${risiko}</span></p>
            <p><strong>EV:</strong> <span class="${ev>0?'ev-positive':'ev-negative'}">${(ev*100).toFixed(2)}%</span></p>
            <p><strong>Rekomendasi:</strong> ${rek}</p>
          </div>`;
        }
      }
      document.getElementById("hasil").innerHTML = html;
    } catch(e) {
      document.getElementById("hasil").innerHTML=`<p style="color:red;">Error: ${e.message}</p>`;
    }
  }

  function tampilkanOddsAdil() {
    const inputs=[];
    try {
      for (let i=1;i<=jumlahPertandingan;i++) {
        const a=parseFloat(document.getElementById(`A${i}`).value);
        const d=parseFloat(document.getElementById(`D${i}`).value);
        const b=parseFloat(document.getElementById(`B${i}`).value);
        const o=parseFloat(document.getElementById(`O${i}`).value);
        const u=parseFloat(document.getElementById(`U${i}`).value);
        if (isNaN(a)||isNaN(d)||isNaN(b)||a<=1||d<=1||b<=1) throw new Error("Odds 1X2 harus > 1");
        if (isNaN(o)||isNaN(u)) throw new Error("Over/Under belum terisi");
        inputs.push({a,d,b,o,u});
      }
      let html="";
      inputs.forEach((inp,idx)=>{
        const adil=hitungOddsAdil(inp.a,inp.d,inp.b);
        [{name:"Tim A",b:inp.a,a:adil.oddsAdilA},{name:"Draw",b:inp.d,a:adil.oddsAdilD},{name:"Tim B",b:inp.b,a:adil.oddsAdilB}]
        .forEach(o=>{
          const m=(((o.a-o.b)/o.b)*100).toFixed(1);
          html+=`<tr><td>${idx+1}</td><td>${o.name}</td><td class="odds-bandar">${o.b.toFixed(2)}</td><td class="odds-adil">${o.a.toFixed(2)}</td><td class="margin-col">${m}%</td></tr>`;
        });
      });
      document.getElementById("fairOddsTableBody").innerHTML=html;
      document.getElementById("fairOddsContainer").style.display="block";
    } catch(e) { alert("Error: "+e.message); }
  }

  // ⭐ DIPERBARUI: Simpan input + hasil prediksi
  function simpanData() {
    // Validasi input dasar
    for (let i = 1; i <= jumlahPertandingan; i++) {
      const a = parseFloat(document.getElementById(`A${i}`)?.value);
      const d = parseFloat(document.getElementById(`D${i}`)?.value);
      const b = parseFloat(document.getElementById(`B${i}`)?.value);
      if (isNaN(a) || isNaN(d) || isNaN(b) || a <= 1 || d <= 1 || b <= 1) {
        alert(`❌ Pertandingan ${i}: Odds 1X2 harus > 1 dan valid.\n\nSilakan klik "Hitung Analisis" dulu sebelum menyimpan.`);
        return;
      }
    }
    
    // Generate semua prediksi
    const predictions = generateAllPredictions();
    if (!predictions) {
      alert('❌ Gagal generate prediksi. Pastikan semua odds valid.');
      return;
    }
    
    // Siapkan data untuk disimpan
    const data = [];
    for (let i = 1; i <= jumlahPertandingan; i++) {
      data.push({
        // Input
        matchDate: i === 1 ? (document.getElementById("date1")?.value || "") : "",
        teamA: document.getElementById(`teamA${i}`)?.value.trim() || "Tim A",
        teamB: document.getElementById(`teamB${i}`)?.value.trim() || "Tim B",
        oddsA: document.getElementById(`A${i}`)?.value || "0",
        oddsD: document.getElementById(`D${i}`)?.value || "0",
        oddsB: document.getElementById(`B${i}`)?.value || "0",
        over: document.getElementById(`O${i}`)?.value || "0",
        under: document.getElementById(`U${i}`)?.value || "0",
        // ⭐ Prediksi
        prediction: predictions.matchPredictions[i-1]
      });
    }
    
    // Simpan ke Firestore
    const uid = App.Auth.currentUser.uid;
    const path = 'users/' + uid + '/parlayData';
    
    // Simpan data pertandingan
    App.Service.saveData(path, data)
      .then(() => {
        // Simpan summary parlay terpisah
        if (predictions.parlaySummary) {
          return App.Service.saveData('users/' + uid + '/parlaySummary', predictions.parlaySummary);
        }
      })
      .then(() => {
        firebaseParlayData = data;
        temporaryMatchData = null;
        lastPrediction = predictions;
        alert(`✅ Data + Prediksi tersimpan!\n\n📊 ${jumlahPertandingan} pertandingan\n🎯 ${predictions.parlaySummary ? 'Parlay summary juga tersimpan' : '1 pertandingan (tunggal)'}`);
      })
      .catch(e => alert("❌ Gagal simpan: " + e.message));
  }

  function hapusData() {
    if (!confirm("Hapus semua data Fitur 1 (input + prediksi)?")) return;
    const uid = App.Auth.currentUser.uid;
    App.Service.removeData('users/' + uid + '/parlayData')
      .then(() => App.Service.removeData('users/' + uid + '/parlaySummary'))
      .then(() => {
        jumlahPertandingan = 1;
        firebaseParlayData = [];
        temporaryMatchData = null;
        lastPrediction = null;
        renderPertandingan();
        const h = document.getElementById("hasil"); if(h) h.innerHTML = "";
        const f = document.getElementById("fairOddsContainer"); if(f) f.style.display = "none";
        alert("✅ Semua data dihapus.");
      });
  }

  // Load data dari Firestore (input + prediksi)
  App.Service.loadData('users/' + App.Auth.currentUser.uid + '/parlayData', val => {
    firebaseParlayData = Array.isArray(val) ? val : [];
    jumlahPertandingan = Math.max(1, firebaseParlayData.length);
    renderPertandingan();
    console.log('📥 Loaded parlay data:', firebaseParlayData.length, 'matches');
  });

  // INIT
  loadTeams().then(() => {
    renderHTML();
    renderTeamDatalist();
    loadTimFavorit();
  });
};

console.log("✅ Feature 1: Parlay loaded - DENGAN PENYIMPANAN PREDIKSI");
