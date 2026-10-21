// === FIREBASE CONFIG ===
const firebaseConfig = {
  apiKey: "AIzaSyC5knp2eCkE4pzuNRodN5SgGhaq_H416vE",
  authDomain: "parlaypribadi.firebaseapp.com",
  databaseURL: "https://parlaypribadi-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "parlaypribadi",
  storageBucket: "parlaypribadi.firebasestorage.app",
  messagingSenderId: "42241144949",
  appId: "1:42241144949:web:1bbc9c022c717d4643203c"
};

// Inisialisasi Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
let currentUser = null;
window.firebaseParlayData = [];
window.temporaryMatchData = null; // 🔹 Cache sementara input

// === UI AUTH ===
function updateAuthUI() {
  const loginForm = document.getElementById('loginForm');
  const nav = document.getElementById('mainNav');
  const authPanel = document.getElementById('authPanel');
  const userEmail = document.getElementById('userEmail');
  const btnLogout = document.getElementById('btnLogout');
  const btnLogin = document.getElementById('btnLogin');
  
  if (currentUser) {
    userEmail.textContent = currentUser.email;
    btnLogout.style.display = 'inline';
    btnLogin.style.display = 'none';
    loginForm.style.display = 'none';
    nav.style.display = 'flex';
  } else {
    userEmail.textContent = '';
    btnLogout.style.display = 'none';
    btnLogin.style.display = 'inline';
    loginForm.style.display = 'block';
    nav.style.display = 'none';
  }
}

document.getElementById('btnLogin').onclick = () => {
  document.getElementById('loginForm').style.display = 'block';
};

document.getElementById('btnLogout').onclick = () => {
  auth.signOut().then(() => {
    currentUser = null;
    updateAuthUI();
  });
};

function login() {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  auth.signInWithEmailAndPassword(email, password)
    .catch(err => alert("Login gagal: " + err.message));
}

auth.onAuthStateChanged(user => {
  currentUser = user;
  updateAuthUI();
  if (user) {
    initApp(user.uid);
  }
});

// === FITUR 1 — DIPERBARUI ===
window.simpanInputSementara = function() {
  const sementara = [];
  for (let i = 1; i <= window.jumlahPertandingan; i++) {
    sementara.push({
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
  window.temporaryMatchData = sementara;
};

window.simpanDataPertandingan = function() {
  if (!currentUser) {
    alert("Harap login terlebih dahulu untuk menyimpan ke cloud.");
    return;
  }
  const matchDate = document.getElementById("date1")?.value || "";
  const data = [];
  for (let i = 1; i <= window.jumlahPertandingan; i++) {
    const teamA = document.getElementById(`teamA${i}`)?.value.trim() || `Tim A`;
    const teamB = document.getElementById(`teamB${i}`)?.value.trim() || `Tim B`;
    const oddsA = document.getElementById(`A${i}`)?.value || "0";
    const oddsD = document.getElementById(`D${i}`)?.value || "0";
    const oddsB = document.getElementById(`B${i}`)?.value || "0";
    const over = document.getElementById(`O${i}`)?.value || "0";
    const under = document.getElementById(`U${i}`)?.value || "0";
    data.push({ matchDate, teamA, teamB, oddsA, oddsD, oddsB, over, under });
  }
  firebase.database().ref('users/' + currentUser.uid + '/parlayData').set(data)
    .then(() => {
      window.firebaseParlayData = data;
      window.temporaryMatchData = null; // 🔹 Reset cache
      alert("✅ Data berhasil disimpan ke Firebase!");
    })
    .catch(err => alert("❌ Gagal menyimpan: " + err.message));
};

window.hapusDataParlay = function() {
  if (!confirm("Yakin ingin menghapus semua data pertandingan di Fitur 1?")) return;
  if (currentUser) {
    firebase.database().ref('users/' + currentUser.uid + '/parlayData').remove()
      .then(() => {
        window.jumlahPertandingan = 1;
        window.firebaseParlayData = [];
        window.temporaryMatchData = null;
        window.renderPertandingan();
        document.getElementById("hasil").innerHTML = "";
        document.getElementById("fairOddsContainer").style.display = "none";
        alert("✅ Data Fitur 1 telah dihapus dari Firebase.");
      });
  } else {
    localStorage.removeItem('lastMatchData');
    window.jumlahPertandingan = 1;
    window.temporaryMatchData = null;
    window.renderPertandingan();
    alert("✅ Data sementara dihapus.");
  }
};

const MAX_MATCHES = 10;
window.jumlahPertandingan = 1;

window.renderPertandingan = function() {
  let html = "";
  for (let i = 1; i <= window.jumlahPertandingan; i++) {
    let matchData = {};
    if (window.temporaryMatchData && window.temporaryMatchData[i - 1]) {
      matchData = window.temporaryMatchData[i - 1];
    } else if (window.firebaseParlayData && window.firebaseParlayData[i - 1]) {
      matchData = window.firebaseParlayData[i - 1];
    }
    const matchDate = matchData.matchDate || "";
    const teamA = matchData.teamA || "Tim A";
    const teamB = matchData.teamB || "Tim B";
    const oddsA = matchData.oddsA !== undefined ? matchData.oddsA : "0";
    const oddsD = matchData.oddsD !== undefined ? matchData.oddsD : "0";
    const oddsB = matchData.oddsB !== undefined ? matchData.oddsB : "0";
    const over = matchData.over !== undefined ? matchData.over : "0";
    const under = matchData.under !== undefined ? matchData.under : "0";

    let dateInputHtml = "";
    if (i === 1) {
      dateInputHtml = `<div><label>Tanggal:<br><input type="date" id="date1" value="${matchDate}" style="width:120px;text-align:center;"></label></div>`;
    }

    html += `
      <div class="match">
        <h3>Pertandingan ${i}</h3>
        <div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;align-items:end;">
          ${dateInputHtml}
          <div>
            <label>Nama Tim A:<br>
              <input type="text" id="teamA${i}" placeholder="Tim A" value="${teamA}" style="width:100px;text-align:center;">
            </label>
          </div>
          <div><label>Odds:<br><input type="number" id="A${i}" value="${oddsA}" step="0.01" min="0"></label></div>
          <div><label>Draw:<br><input type="number" id="D${i}" value="${oddsD}" step="0.01" min="0"></label></div>
          <div>
            <label>Nama Tim B:<br>
              <input type="text" id="teamB${i}" placeholder="Tim B" value="${teamB}" style="width:100px;text-align:center;">
            </label>
          </div>
          <div><label>Odds:<br><input type="number" id="B${i}" value="${oddsB}" step="0.01" min="0"></label></div>
          <div><label>Over:<br><input type="number" id="O${i}" value="${over}" step="0.01" min="0"></label></div>
          <div><label>Under:<br><input type="number" id="U${i}" value="${under}" step="0.01" min="0"></label></div>
        </div>
        <div id="recOU${i}" style="text-align:center;"></div>
      </div>`;
  }
  document.getElementById("matches").innerHTML = html;

  for (let i = 1; i <= window.jumlahPertandingan; i++) {
    ["A", "D", "B"].forEach(team => {
      const el = document.getElementById(`${team}${i}`);
      if (el) {
        const handler = () => {
          updateOverUnder(i);
          document.getElementById("fairOddsContainer").style.display = "none";
          window.simpanInputSementara();
        };
        el.removeEventListener("input", handler);
        el.addEventListener("input", handler);
      }
    });
    updateOverUnder(i);
  }
};

window.tambahPertandingan = function() {
  if (window.jumlahPertandingan < MAX_MATCHES) {
    window.simpanInputSementara();
    window.jumlahPertandingan++;
    window.renderPertandingan();
  } else {
    alert(`Maksimal ${MAX_MATCHES} pertandingan.`);
  }
};

window.hapusPertandingan = function() {
  if (window.jumlahPertandingan > 1) {
    window.simpanInputSementara();
    window.jumlahPertandingan--;
    window.renderPertandingan();
  }
};

window.hitungOddsAdil = function(oddsA, oddsDraw, oddsB) {
  const pA = 1 / oddsA;
  const pD = 1 / oddsDraw;
  const pB = 1 / oddsB;
  const total = pA + pD + pB;
  const probAdilA = pA / total;
  const probAdilD = pD / total;
  const probAdilB = pB / total;
  return {
    oddsAdilA: 1 / probAdilA,
    oddsAdilD: 1 / probAdilD,
    oddsAdilB: 1 / probAdilB,
    overround: total,
  };
};

window.updateOverUnder = function(idx) {
  const aEl = document.getElementById(`A${idx}`);
  const dEl = document.getElementById(`D${idx}`);
  const bEl = document.getElementById(`B${idx}`);
  const oEl = document.getElementById(`O${idx}`);
  const uEl = document.getElementById(`U${idx}`);
  const recEl = document.getElementById(`recOU${idx}`);

  const a = parseFloat(aEl.value);
  const d = parseFloat(dEl.value);
  const b = parseFloat(bEl.value);

  if (isNaN(a) || isNaN(d) || isNaN(b) || a <= 1 || d <= 1 || b <= 1) {
    oEl.value = "0"; uEl.value = "0";
    if (recEl) recEl.innerHTML = "";
    return;
  }

  const pA = 1 / a, pD = 1 / d, pB = 1 / b;
  const total = pA + pD + pB;
  const probA = pA / total, probD = pD / total, probB = pB / total;
  let avgGoals;
  if (probD >= 0.35) avgGoals = 1.8;
  else if (probD >= 0.25) avgGoals = 2.3;
  else if (Math.abs(probA - probB) >= 0.3) avgGoals = 3.1;
  else avgGoals = 2.6;

  const thresholds = { under15: 2.0, under25: 2.5, over25: 2.7, over35: 3.2 };
  let goalLine, recommendationType;
  if (avgGoals < thresholds.under15) { goalLine = "1.5"; recommendationType = "Under"; }
  else if (avgGoals < thresholds.under25) { goalLine = "2.5"; recommendationType = "Under"; }
  else if (avgGoals < thresholds.over25) { goalLine = "2.5"; recommendationType = "Over"; }
  else if (avgGoals >= thresholds.over35) { goalLine = "3.5"; recommendationType = "Over"; }
  else { goalLine = "2.5"; recommendationType = "Over"; }

  let altLine = "";
  if (avgGoals >= 2.9 && avgGoals < 3.2) altLine = " (atau Over 3/3.5)";
  else if (avgGoals >= 2.4 && avgGoals < 2.7) altLine = " (atau Over 2/2.5)";
  else if (avgGoals >= 2.0 && avgGoals < 2.3) altLine = " (atau Under 2/2.5)";

  let probUnder, probOver;
  if (recommendationType === "Under") {
    probUnder = 0.52 + (thresholds.under25 - avgGoals) * 0.15;
    probUnder = Math.min(0.85, Math.max(0.45, probUnder));
    probOver = 1 - probUnder;
  } else {
    if (goalLine === "3.5") probOver = 0.55 + (avgGoals - thresholds.over35) * 0.12;
    else probOver = 0.52 + (avgGoals - thresholds.under25) * 0.12;
    probOver = Math.min(0.85, Math.max(0.45, probOver));
    probUnder = 1 - probOver;
  }

  const margin = 1.05;
  oEl.value = (1 / probOver * margin).toFixed(2);
  uEl.value = (1 / probUnder * margin).toFixed(2);
  if (recEl) {
    const fullRec = `${recommendationType} ${goalLine}${altLine}`;
    recEl.innerHTML = `<span class="recommendation">Rekomendasi: <strong>${fullRec}</strong></span>`;
  }
};

// === FITUR 4 — FILTERED REKOMENDASI ===
window.tampilkanRekomendasiDiskusi = function() {
  let dataRaw = null;
  if (window.firebaseParlayData && window.firebaseParlayData.length > 0) {
    dataRaw = JSON.stringify(window.firebaseParlayData);
  } else if (window.temporaryMatchData && window.temporaryMatchData.length > 0) {
    dataRaw = JSON.stringify(window.temporaryMatchData);
  } else {
    dataRaw = localStorage.getItem('lastMatchData');
  }

  if (!dataRaw) {
    document.getElementById('list-win').innerHTML = '<li><em>Belum ada data dari Fitur 1</em></li>';
    document.getElementById('list-over').innerHTML = '<li><em>-</em></li>';
    document.getElementById('list-under').innerHTML = '<li><em>-</em></li>';
    return;
  }

  const matches = JSON.parse(dataRaw);
  const winList = [];
  const overList = [];
  const underList = [];

  matches.forEach((match, idx) => {
    const { teamA, teamB, oddsA, oddsD, oddsB, over, under } = match;

    // === ANALISIS WIN ===
    const pA = 1 / parseFloat(oddsA);
    const pD = 1 / parseFloat(oddsD);
    const pB = 1 / parseFloat(oddsB);
    const total = pA + pD + pB;
    const probA = pA / total;
    const probB = pB / total;
    const probD = pD / total;

    let timPilihan = "", probPilihan = 0;
    if (probA >= probB && probA >= probD) {
      timPilihan = teamA;
      probPilihan = probA;
    } else if (probB >= probA && probB >= probD) {
      timPilihan = teamB;
      probPilihan = probB;
    } else {
      timPilihan = "Draw";
      probPilihan = probD;
    }

    if (probPilihan >= 0.67) {
      winList.push(`${timPilihan} (${(probPilihan * 100).toFixed(1)}%)`);
    }

    // === ANALISIS OVER/UNDER ===
    const a = parseFloat(oddsA), d = parseFloat(oddsD), b = parseFloat(oddsB);
    if (isNaN(a) || isNaN(d) || isNaN(b) || a <= 1 || d <= 1 || b <= 1) return;

    const pA_raw = 1 / a, pD_raw = 1 / d, pB_raw = 1 / b;
    const total_raw = pA_raw + pD_raw + pB_raw;
    const probA_raw = pA_raw / total_raw;
    const probD_raw = pD_raw / total_raw;
    const probB_raw = pB_raw / total_raw;

    let avgGoals;
    if (probD_raw >= 0.35) avgGoals = 1.8;
    else if (probD_raw >= 0.25) avgGoals = 2.3;
    else if (Math.abs(probA_raw - probB_raw) >= 0.3) avgGoals = 3.1;
    else avgGoals = 2.6;

    const thresholds = { under15: 2.0, under25: 2.5, over25: 2.7, over35: 3.2 };
    let recommendationType, probOver, probUnder;

    if (avgGoals < thresholds.under15) {
      recommendationType = "Under";
      probUnder = 0.52 + (thresholds.under25 - avgGoals) * 0.15;
      probUnder = Math.min(0.85, Math.max(0.45, probUnder));
      probOver = 1 - probUnder;
    } else if (avgGoals < thresholds.under25) {
      recommendationType = "Under";
      probUnder = 0.52 + (thresholds.under25 - avgGoals) * 0.15;
      probUnder = Math.min(0.85, Math.max(0.45, probUnder));
      probOver = 1 - probUnder;
    } else if (avgGoals < thresholds.over25) {
      recommendationType = "Over";
      probOver = 0.52 + (avgGoals - thresholds.under25) * 0.12;
      probOver = Math.min(0.85, Math.max(0.45, probOver));
      probUnder = 1 - probOver;
    } else if (avgGoals >= thresholds.over35) {
      recommendationType = "Over";
      probOver = 0.55 + (avgGoals - thresholds.over35) * 0.12;
      probOver = Math.min(0.85, Math.max(0.45, probOver));
      probUnder = 1 - probOver;
    } else {
      recommendationType = "Over";
      probOver = 0.52 + (avgGoals - thresholds.under25) * 0.12;
      probOver = Math.min(0.85, Math.max(0.45, probOver));
      probUnder = 1 - probOver;
    }

    const pertandingan = `${teamA} vs ${teamB}`;
    if (recommendationType === "Over" && probOver >= 0.60) {
      overList.push(pertandingan + ` (${(probOver * 100).toFixed(1)}%)`);
    }
    if (recommendationType === "Under" && probUnder >= 0.60) {
      underList.push(pertandingan + ` (${(probUnder * 100).toFixed(1)}%)`);
    }
  });

  const winEl = document.getElementById('list-win');
  const overEl = document.getElementById('list-over');
  const underEl = document.getElementById('list-under');

  winEl.innerHTML = winList.length 
    ? winList.map(t => `<li>${t}</li>`).join('') 
    : '<li><em>Tidak ada rekomendasi Win ≥67%</em></li>';

  overEl.innerHTML = overList.length 
    ? overList.map(t => `<li>${t}</li>`).join('') 
    : '<li><em>Tidak ada rekomendasi Over ≥60%</em></li>';

  underEl.innerHTML = underList.length 
    ? underList.map(t => `<li>${t}</li>`).join('') 
    : '<li><em>Tidak ada rekomendasi Under ≥60%</em></li>';
};

// === FUNGSI LAINNYA ===
window.tampilkanOddsAdil = function() {
  const inputs = [];
  try {
    for (let i = 1; i <= window.jumlahPertandingan; i++) {
      const a = parseFloat(document.getElementById(`A${i}`).value);
      const d = parseFloat(document.getElementById(`D${i}`).value);
      const b = parseFloat(document.getElementById(`B${i}`).value);
      const o = parseFloat(document.getElementById(`O${i}`).value);
      const u = parseFloat(document.getElementById(`U${i}`).value);
      if (isNaN(a) || isNaN(d) || isNaN(b) || a <= 1 || d <= 1 || b <= 1)
        throw new Error("Semua odds 1X2 harus > 1");
      if (isNaN(o) || isNaN(u))
        throw new Error("Over/Under belum terisi");
      inputs.push({ a, d, b, o, u });
    }
    let tableHTML = "";
    inputs.forEach((inp, idx) => {
      const adil1X2 = hitungOddsAdil(inp.a, inp.d, inp.b);
      const outcomes1X2 = [
        { name: "Tim A", bandar: inp.a, adil: adil1X2.oddsAdilA },
        { name: "Draw", bandar: inp.d, adil: adil1X2.oddsAdilD },
        { name: "Tim B", bandar: inp.b, adil: adil1X2.oddsAdilB },
      ];
      outcomes1X2.forEach(out => {
        const margin = (((out.adil - out.bandar) / out.bandar) * 100).toFixed(1);
        tableHTML += `<tr><td>${idx + 1}</td><td>${out.name}</td><td class="odds-bandar">${out.bandar.toFixed(2)}</td><td class="odds-adil">${out.adil.toFixed(2)}</td><td class="margin-col">${margin}%</td></tr>`;
      });
      const pA = 1 / adil1X2.oddsAdilA;
      const pD = 1 / adil1X2.oddsAdilD;
      const pB = 1 / adil1X2.oddsAdilB;
      let probUnderFair = pD + Math.min(pA, pB);
      probUnderFair = Math.min(0.85, Math.max(0.3, probUnderFair));
      const probOverFair = 1 - probUnderFair;
      const oddsUnderFair = 1 / probUnderFair;
      const oddsOverFair = 1 / probOverFair;
      const marginOver = (((oddsOverFair - inp.o) / inp.o) * 100).toFixed(1);
      tableHTML += `<tr><td>${idx + 1}</td><td>Over</td><td class="odds-bandar">${inp.o.toFixed(2)}</td><td class="odds-adil">${oddsOverFair.toFixed(2)}</td><td class="margin-col">${marginOver}%</td></tr>`;
      const marginUnder = (((oddsUnderFair - inp.u) / inp.u) * 100).toFixed(1);
      tableHTML += `<tr><td>${idx + 1}</td><td>Under</td><td class="odds-bandar">${inp.u.toFixed(2)}</td><td class="odds-adil">${oddsUnderFair.toFixed(2)}</td><td class="margin-col">${marginUnder}%</td></tr>`;
    });
    document.getElementById("fairOddsTableBody").innerHTML = tableHTML;
    document.getElementById("fairOddsContainer").style.display = "block";
  } catch (e) {
    alert("Error: " + e.message);
  }
};

window.hitungParlay = function() {
  const pertandingan = [];
  try {
    for (let i = 1; i <= window.jumlahPertandingan; i++) {
      const a = parseFloat(document.getElementById(`A${i}`).value);
      const d = parseFloat(document.getElementById(`D${i}`).value);
      const b = parseFloat(document.getElementById(`B${i}`).value);
      if (isNaN(a) || isNaN(d) || isNaN(b))
        throw new Error(`Pertandingan ${i} tidak valid`);
      pertandingan.push({ oddsA: a, oddsDraw: d, oddsB: b });
    }
    const hasilList = pertandingan.map(p => analisisPertandingan(p.oddsA, p.oddsDraw, p.oddsB));
    let resultHTML = "";
    hasilList.forEach((h, idx) => {
      const namaA = document.getElementById(`teamA${idx + 1}`)?.value.trim() || "Tim A";
      const namaB = document.getElementById(`teamB${idx + 1}`)?.value.trim() || "Tim B";
      resultHTML += `
        <div class="match">
          <h3>Pertandingan ${idx + 1}: ${namaA} vs ${namaB}</h3>
          <p><strong>Probabilitas:</strong> ${namaA}: ${h.persentase.timA} | Draw: ${h.persentase.draw} | ${namaB}: ${h.persentase.timB}</p>
          <p><strong>Analisis:</strong> <span class="label">${h.label.replace("Tim A", namaA).replace("Tim B", namaB)}</span></p>
          <p><strong>Pilihan:</strong> ${h.pilihan === "Tim A" ? namaA : (h.pilihan === "Tim B" ? namaB : "Draw")} (${(h.probPilihan * 100).toFixed(2)}%)</p>
        </div>`;
    });
    if (window.jumlahPertandingan === 1) {
      resultHTML += `<div class="parlay-result"><h2>ℹ️ Analisis Tunggal</h2><p>Hanya 1 pertandingan → tidak ada parlay atau EV.</p></div>`;
    } else {
      const probGabungan = hasilList.reduce((acc, h) => acc * h.probPilihan, 1);
      const oddsTeoretis = 1 / probGabungan;
      let risiko = "Rendah", riskClass = "risk-low";
      if (probGabungan < 0.05) { risiko = "Sangat Tinggi"; riskClass = "risk-high"; }
      else if (probGabungan < 0.1) { risiko = "Tinggi"; riskClass = "risk-high"; }
      else if (probGabungan < 0.2) { risiko = "Sedang"; riskClass = "risk-medium"; }
      const oddsBandar = parseFloat(document.getElementById("oddsBandarInput").value);
      if (isNaN(oddsBandar) || oddsBandar <= 1) {
        resultHTML += `<div class="parlay-result"><p style="color:red;">⚠️ Odds parlay bandar tidak valid.</p></div>`;
      } else {
        const ev = probGabungan * oddsBandar - 1;
        const rekomendasi = ev > 0 ? "✅ LAYAK (Positive EV)" : "❌ TIDAK LAYAK (Negative EV)";
        resultHTML += `
          <div class="parlay-result">
            <h2>🎯 Analisis Parlay & EV</h2>
            <div style="background:#f5f5f5;padding:10px;border-radius:6px;margin:10px 0;">
              <p><strong>Odds Teoretis:</strong> ${oddsTeoretis.toFixed(2)}</p>
              <p><strong>Odds Bandar:</strong> ${oddsBandar.toFixed(2)}</p>
            </div>
            <p>Probabilitas Menang Semua: <strong>${(probGabungan * 100).toFixed(2)}%</strong></p>
            <p>Risiko: <strong class="${riskClass}">${risiko}</strong></p>
            <h3>📊 Expected Value (EV)</h3>
            <p>EV = (${(probGabungan * 100).toFixed(2)}% × ${oddsBandar}) - 1 = 
              <span class="${ev > 0 ? 'ev-positive' : 'ev-negative'}">${(ev * 100).toFixed(2)}%</span></p>
            <p><strong>Rekomendasi:</strong> ${rekomendasi}</p>
          </div>`;
      }
    }
    document.getElementById("hasil").innerHTML = resultHTML;
  } catch (e) {
    document.getElementById("hasil").innerHTML = `<p style="color:red;text-align:center;">Error: ${e.message}</p>`;
  }
};

window.analisisPertandingan = function(oddsA, oddsDraw, oddsB) {
  if (oddsA <= 1 || oddsDraw <= 1 || oddsB <= 1) throw new Error("Odds harus > 1");
  const pA = 1 / oddsA, pD = 1 / oddsDraw, pB = 1 / oddsB;
  const total = pA + pD + pB;
  const probA = pA / total, probDraw = pD / total, probB = pB / total;
  const pDrawPersen = probDraw * 100, selisihAB = probA - probB;
  let label = "";
  if (pDrawPersen >= 30) label = "Berisiko Seri";
  else if (probA >= 0.55 && selisihAB >= 0.2) label = "Tim A Favorit Kuat";
  else if (probB >= 0.55 && selisihAB <= -0.2) label = "Tim B Favorit Kuat";
  else if (probA > probB) label = "Tim A Diunggulkan";
  else if (probB > probA) label = "Tim B Diunggulkan";
  else label = "Pertandingan Seimbang";
  let pilihan = "", probPilihan = 0;
  if (probA >= probB && probA >= probDraw) { pilihan = "Tim A"; probPilihan = probA; }
  else if (probB >= probA && probB >= probDraw) { pilihan = "Tim B"; probPilihan = probB; }
  else { pilihan = "Draw"; probPilihan = probDraw; }
  return {
    input: { oddsA, oddsDraw, oddsB },
    probabilitas: { timA: probA, draw: probDraw, timB: probB },
    persentase: {
      timA: (probA * 100).toFixed(2) + "%",
      draw: (probDraw * 100).toFixed(2) + "%",
      timB: (probB * 100).toFixed(2) + "%"
    },
    label,
    pilihan,
    probPilihan,
  };
};

// === INISIALISASI APLIKASI ===
function initApp(uid) {
  const userRef = firebase.database().ref('users/' + uid);

  userRef.child('parlayData').on('value', (snapshot) => {
    window.firebaseParlayData = Array.isArray(snapshot.val()) ? snapshot.val() : [];
    if (currentUser) {
      window.jumlahPertandingan = Math.max(1, window.firebaseParlayData.length || 1);
      window.renderPertandingan();
    }
  });

  // === TIM FAVORIT ===
  let daftarTim = [];
  let sedangMengedit = null;
  window.renderDaftarTim = function() {
    const ul = document.getElementById('daftarTim');
    ul.innerHTML = '';
    daftarTim.forEach((tim, idx) => {
      const li = document.createElement('li');
      li.style.display = 'flex';
      li.style.alignItems = 'center';
      li.style.marginBottom = '8px';
      li.innerHTML = `<span style="flex:1;">${tim}</span>
        <button style="margin:0 5px; padding:4px 8px;" onclick="mulaiEdit(${idx})">✏️ Edit</button>
        <button class="delete" style="padding:4px 8px; background:#d32f2f; color:white; border:none; border-radius:4px; cursor:pointer;" onclick="hapusTim(${idx})">🗑️ Hapus</button>`;
      ul.appendChild(li);
    });
    const lastData = window.firebaseParlayData.length > 0 
      ? window.firebaseParlayData 
      : (window.temporaryMatchData || []);
    const allNames = new Set(daftarTim);
    const autoNames = [];
    lastData.forEach(match => {
      if (match.teamA && !allNames.has(match.teamA)) {
        autoNames.push(match.teamA);
        allNames.add(match.teamA);
      }
      if (match.teamB && !allNames.has(match.teamB)) {
        autoNames.push(match.teamB);
        allNames.add(match.teamB);
      }
    });
    autoNames.forEach(name => {
      const li = document.createElement('li');
      li.style.display = 'flex';
      li.style.alignItems = 'center';
      li.style.marginBottom = '8px';
      li.style.color = '#666';
      li.innerHTML = `<span style="flex:1;">${name} <em>(otomatis dari Fitur 1)</em></span>`;
      ul.appendChild(li);
    });
  };
  
  function simpanDaftarFavoritKeFirebase() {
    userRef.child('timFavorit').set(daftarTim);
  }
  
  window.tambahTimFavorit = function() {
    const input = document.getElementById('inputTim');
    const nama = input.value.trim();
    if (!nama) { alert("Nama tim tidak boleh kosong!"); return; }
    if (daftarTim.includes(nama) && sedangMengedit === null) { alert('Tim sudah ada!'); return; }
    if (sedangMengedit !== null) {
      daftarTim[sedangMengedit] = nama;
      sedangMengedit = null;
    } else {
      daftarTim.push(nama);
    }
    input.value = '';
    window.renderDaftarTim();
    simpanDaftarFavoritKeFirebase();
  };
  
  window.mulaiEdit = function(idx) {
    document.getElementById('inputTim').value = daftarTim[idx];
    sedangMengedit = idx;
  };
  
  window.hapusTim = function(idx) {
    daftarTim.splice(idx, 1);
    if (sedangMengedit === idx) sedangMengedit = null;
    window.renderDaftarTim();
    simpanDaftarFavoritKeFirebase();
  };
  
  userRef.child('timFavorit').on('value', (snapshot) => {
    daftarTim = Array.isArray(snapshot.val()) ? snapshot.val() : [];
    window.renderDaftarTim();
  });

  // === NOTES, TABEL, EV HISTORY ===
  document.getElementById('saveNotes').addEventListener('click', () => {
    const notes = {
      1: document.getElementById('note1').value.trim(),
      2: document.getElementById('note2').value.trim(),
      3: document.getElementById('note3').value.trim(),
      4: document.getElementById('note4').value.trim(),
      5: document.getElementById('note5').value.trim(),
    };
    userRef.child('notes').set(notes).then(() => renderTablesFirebase());
  });
  
  userRef.child('notes').on('value', (snapshot) => {
    const notes = snapshot.val() || {};
    ['1','2','3','4','5'].forEach(i => {
      document.getElementById(`note${i}`).value = notes[i] || '';
    });
  });

  window.renderTablesFirebase = function() {
    const notesMap = {};
    userRef.child('notes').once('value').then(snapshot => {
      const notes = snapshot.val() || {};
      [1,2,3,4,5].forEach(i => notesMap[i] = notes[i] || '');
      userRef.child('tables').once('value').then(snapshot => {
        const savedData = snapshot.val() || null;
        const container = document.getElementById('tablesContainer');
        container.innerHTML = '';
        const labelTopRight = notesMap[1] || 'Catatan 1';
        const tableConfigs = [
          [[null, null], [3, 'win'], [5, 'win']],
          [[null, null], [3, 'win'], [4, 'win']],
          [[null, null], [3, 'win'], [5, 'remis']],
          [[null, null], [2, 'win'], [4, 'win']],
          [[null, null], [2, 'win'], [5, 'win']],
          [[null, null], [2, 'win'], [4, 'remis']],
          [[null, null], [3, 'remis'], [4, 'win']],
          [[null, null], [3, 'remis'], [5, 'win']],
          [[null, null], [2, 'remis'], [5, 'remis']],
        ];
        for (let i = 0; i < 9; i++) {
          const baseData = tableConfigs[i].map(row => [...row]);
          if (savedData && savedData[i] && savedData[i][0]) {
            baseData[0] = [savedData[i][0][0] || '', savedData[i][0][1] || ''];
          }
          const tableContainer = document.createElement('div');
          tableContainer.className = 'table-container';
          const labelEl = document.createElement('div');
          labelEl.className = 'table-label';
          labelEl.textContent = labelTopRight;
          tableContainer.appendChild(labelEl);
          const tableDiv = document.createElement('div');
          tableDiv.innerHTML = `<strong>Tabel ${i + 1}</strong>`;
          const table = document.createElement('table');
          table.style.width = '100%';
          table.style.borderCollapse = 'collapse';
          const tbody = document.createElement('tbody');
          for (let r = 0; r < 3; r++) {
            const row = document.createElement('tr');
            const cell1 = document.createElement('td');
            cell1.style.border = '1px solid #ddd';
            cell1.style.padding = '8px';
            if (r === 0) {
              const input1 = document.createElement('input');
              input1.type = 'text';
              input1.value = baseData[r][0] || '';
              input1.dataset.table = i;
              input1.dataset.row = r;
              input1.dataset.col = 0;
              input1.style.width = '100%';
              input1.style.border = 'none';
              input1.style.outline = 'none';
              cell1.appendChild(input1);
            } else {
              const num = baseData[r][0];
              const displayText = notesMap[num] || num;
              cell1.textContent = displayText;
            }
            row.appendChild(cell1);
            const cell2 = document.createElement('td');
            cell2.style.border = '1px solid #ddd';
            cell2.style.padding = '8px';
            if (r === 0) {
              const input2 = document.createElement('input');
              input2.type = 'text';
              input2.value = baseData[r][1] || '';
              input2.dataset.table = i;
              input2.dataset.row = r;
              input2.dataset.col = 1;
              input2.style.width = '100%';
              input2.style.border = 'none';
              input2.style.outline = 'none';
              cell2.appendChild(input2);
            } else {
              cell2.textContent = baseData[r][1];
              cell2.style.backgroundColor = '#f9f9f9';
              cell2.style.fontWeight = 'bold';
              cell2.style.textAlign = 'center';
            }
            row.appendChild(cell2);
            tbody.appendChild(row);
          }
          table.appendChild(tbody);
          tableDiv.appendChild(table);
          tableContainer.appendChild(tableDiv);
          container.appendChild(tableContainer);
        }
      });
    });
  };

  document.getElementById('saveTables').addEventListener('click', () => {
    const inputs = document.querySelectorAll('#tablesContainer input[data-row="0"]');
    const tablesData = Array(9).fill().map(() => [[null, null], [null, null], [null, null]]);
    inputs.forEach(input => {
      const t = parseInt(input.dataset.table);
      const c = parseInt(input.dataset.col);
      tablesData[t][0][c] = input.value.trim();
    });
    userRef.child('tables').set(tablesData);
  });

  document.getElementById('deleteAll').addEventListener('click', () => {
    if (confirm('Hapus semua data permanen?')) {
      userRef.remove().then(() => location.reload());
    }
  });

  window.tampilkanRiwayatFirebase = function() {
    userRef.child('evHistory').once('value').then(snapshot => {
      const history = snapshot.val() || [];
      const container = document.getElementById('historyList');
      container.innerHTML = history.length === 0 ? '<p><em>Belum ada riwayat.</em></p>' : '';
      history.forEach((item, index) => {
        const evValue = parseFloat(item.ev);
        const evColor = evValue > 0 ? 'ev-positive' : evValue < 0 ? 'ev-negative' : '';
        const div = document.createElement('div');
        div.style.cssText = 'border:1px solid #eee;padding:12px;margin-bottom:10px;border-radius:6px;background:#fafafa;';
        div.innerHTML = `
          <strong>Odds:</strong> ${item.oddsTotal} | <strong>EV:</strong> <span class="${evColor}">${item.ev}</span><br>
          <small>Input: Odds [${item.oddsList.join(', ')}] | Prob [${item.probList.map(p => (p*100).toFixed(1)+'%').join(', ')}]</small>
          <div style="margin-top:8px;">
            <button onclick="editEntry(${index})" style="padding:6px 10px;font-size:12px; margin-right:5px;">✏️ Edit</button>
            <button onclick="hapusEntry(${index})" style="padding:6px 10px;font-size:12px; background:#d32f2f; color:white; border:none; border-radius:4px; cursor:pointer;">🗑️ Hapus</button>
          </div>
        `;
        container.appendChild(div);
      });
    });
  };

  window.renderTablesFirebase();
  window.tampilkanRiwayatFirebase();
}

// === NAVIGASI ===
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('#mainNav button').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('#mainNav button').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
      button.classList.add('active');
      const target = document.getElementById(button.dataset.section);
      target.classList.add('active');
      if (button.dataset.section === 'parlay') {
        window.renderPertandingan();
      }
      if (button.dataset.section === 'diskusi') {
        window.tampilkanRekomendasiDiskusi();
      }
      if (button.dataset.section === 'favorit') {
        window.renderDaftarTim();
      }
    });
  });
});

// Render awal
window.renderPertandingan();
