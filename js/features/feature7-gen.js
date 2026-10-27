/**
 * feature7-gen.js - FIXED untuk Sistem Analisis Olahraga — Realtime
 * Convert dari GENERATOR V5 CLEAN (module) ke App.FeatureLoaders pattern
 * Logic Poisson, xG, O/U ORI 100% dipertahankan
 */

App.FeatureLoaders = App.FeatureLoaders || {};

App.FeatureLoaders.gen = function(userRef) {
  const container = document.getElementById('gen');
  let matchCount = 1;
  const MAX_MATCHES = 5;
  let teamsDataCache = null;
  let isFirestoreReady = !!App.Auth.currentUser;

  // --- POISSON ORI ---
  function poissonLog(x, lambda) {
    if (lambda <= 0) return x === 0 ? 1 : 0;
    let logFact = 0; for (let i = 2; i <= x; i++) logFact += Math.log(i);
    return Math.exp(-lambda + x * Math.log(lambda) - logFact);
  }

  window.syncStats = function(idx, team, type) {
    const gfTotal = document.getElementById(`gf_${idx}_${team}_total`);
    const gfAvg = document.getElementById(`gf_${idx}_${team}_avg`);
    const gaTotal = document.getElementById(`ga_${idx}_${team}_total`);
    const gaAvg = document.getElementById(`ga_${idx}_${team}_avg`);
    if (type === 'GF' && gfTotal && gfAvg) {
      if (document.activeElement === gfTotal) { const v = parseFloat(gfTotal.value); if (!isNaN(v)) gfAvg.value = (v / 5).toFixed(2); }
      else if (document.activeElement === gfAvg) { const v = parseFloat(gfAvg.value); if (!isNaN(v)) gfTotal.value = (v * 5).toFixed(1); }
    }
    if (type === 'GA' && gaTotal && gaAvg) {
      if (document.activeElement === gaTotal) { const v = parseFloat(gaTotal.value); if (!isNaN(v)) gaAvg.value = (v / 5).toFixed(2); }
      else if (document.activeElement === gaAvg) { const v = parseFloat(gaAvg.value); if (!isNaN(v)) gaTotal.value = (v * 5).toFixed(1); }
    }
    updateXgPreview(idx);
  }

  window.updateXgPreview = function(idx) {
    const gfATotal = parseFloat(document.getElementById(`gf_${idx}_A_total`)?.value) || 0;
    const gaATotal = parseFloat(document.getElementById(`ga_${idx}_A_total`)?.value) || 0;
    const gfBTotal = parseFloat(document.getElementById(`gf_${idx}_B_total`)?.value) || 0;
    const gaBTotal = parseFloat(document.getElementById(`ga_${idx}_B_total`)?.value) || 0;
    const h2hA = parseFloat(document.getElementById(`h2hA_${idx}`)?.value) || 1.8;
    const h2hB = parseFloat(document.getElementById(`h2hB_${idx}`)?.value) || 1.6;
    const homeAdv = document.getElementById(`homeAdv_${idx}`)?.checked;
    let gfA = gfATotal / 5, gaA = gaATotal / 5, gfB = gfBTotal / 5, gaB = gaBTotal / 5;
    let xgA = Math.max(0.2, (gfA * 0.4) + (gaB * 0.4) + (h2hA * 0.2));
    let xgB = Math.max(0.2, (gfB * 0.4) + (gaA * 0.4) + (h2hB * 0.2));
    if (homeAdv) xgA *= 1.15;
    const preview = document.getElementById(`xgPreview_${idx}`);
    if (preview) preview.innerHTML = `xG: <span style="color:#db2777;">${xgA.toFixed(2)}</span> - <span style="color:#7c3aed;">${xgB.toFixed(2)}</span>`;
  }

  function createMatchCard(idx) {
    let ouInputsHtml = '';
    const defaultLines = [2.5, 2.75, 3.0, 3.25];
    for (let i = 1; i <= 4; i++) {
      ouInputsHtml += `<div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px; align-items:end; background:#fff; padding:8px; border-radius:8px; border:1px solid #bbf7d0;">
        <div><label style="font-size:10px; font-weight:700; color:#15803d; display:block;">Line ${i}</label>
        <input type="number" step="0.25" id="ou_line_${i}_${idx}" value="${defaultLines[i-1]}" style="width:100%; background:#f0fdf4; border:1px solid #86efac; border-radius:4px; padding:6px; font-size:12px; font-weight:700; color:#15803d; text-align:center;"></div>
        <div><label style="font-size:10px; font-weight:700; color:#15803d; display:block;">Odds Over</label>
        <input type="number" step="0.01" id="ou_o_${i}_${idx}" placeholder="1.90" style="width:100%; background:#f0fdf4; border:1px solid #86efac; border-radius:4px; padding:6px; font-size:12px; font-weight:700; text-align:center;"></div>
        <div><label style="font-size:10px; font-weight:700; color:#b91c1c; display:block;">Odds Under</label>
        <input type="number" step="0.01" id="ou_u_${i}_${idx}" placeholder="1.95" style="width:100%; background:#fef2f2; border:1px solid #fca5a5; border-radius:4px; padding:6px; font-size:12px; font-weight:700; text-align:center;"></div>
      </div>`;
    }
    return `<div id="matchCard_${idx}" class="match-card" data-idx="${idx}" style="margin-bottom:20px; padding:16px; border:1px solid #f9a8d4; border-radius:16px; background:#fff; box-shadow:0 4px 12px rgba(236,72,153,0.15);">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <h3 style="margin:0; font-size:14px; font-weight:800; color:#831843;">⚽ Pertandingan ${idx} <span id="xgPreview_${idx}" style="font-size:11px; font-weight:400; margin-left:8px;">xG: 1.84 - 1.72</span></h3>
        <div style="display:flex; gap:6px;">${idx > 1 ? `<button type="button" onclick="App.FeatureLoaders.genHapus(${idx})" style="background:#ffe4e6; color:#be123c; border:1px solid #fecdd3; padding:4px 10px; border-radius:8px; font-size:11px; cursor:pointer;">Hapus</button>` : ''}<span style="background:#fce7f3; border:1px solid #f9a8d4; padding:4px 8px; border-radius:8px; font-size:11px;">#${idx}/5</span></div>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px;">
        <div><label style="font-size:11px; color:#9d174d; font-weight:600;">Tuan Rumah</label><select id="tim1_${idx}" style="width:100%; margin-top:4px; background:#fff1f2; border:1px solid #f9a8d4; border-radius:8px; padding:8px; color:#831843; font-weight:600;"></select></div>
        <div><label style="font-size:11px; color:#9d174d; font-weight:600;">Tamu</label><select id="tim2_${idx}" style="width:100%; margin-top:4px; background:#fff1f2; border:1px solid #f9a8d4; border-radius:8px; padding:8px; color:#831843; font-weight:600;"></select></div>
      </div>
      <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; margin-bottom:14px;">
        <div><label style="font-size:11px;">Odds 1</label><input type="number" step="0.01" id="oddA_${idx}" value="2.10" style="width:100%; margin-top:4px; background:#fff7f8; border:1px solid #f9a8d4; border-radius:8px; padding:8px; font-weight:700; text-align:center;"></div>
        <div><label style="font-size:11px;">Odds X</label><input type="number" step="0.01" id="oddDraw_${idx}" value="3.60" style="width:100%; margin-top:4px; background:#fff7f8; border:1px solid #f9a8d4; border-radius:8px; padding:8px; font-weight:700; text-align:center;"></div>
        <div><label style="font-size:11px;">Odds 2</label><input type="number" step="0.01" id="oddB_${idx}" value="3.20" style="width:100%; margin-top:4px; background:#fff7f8; border:1px solid #f9a8d4; border-radius:8px; padding:8px; font-weight:700; text-align:center;"></div>
      </div>
      <div style="background:#f0fdf4; padding:12px; border-radius:12px; border:1px solid #bbf7d0; margin-bottom:14px;">
        <div style="font-size:12px; font-weight:700; color:#15803d; margin-bottom:8px;">Input Odds Over/Under (4 Line)</div>
        <div style="display:grid; gap:8px;">${ouInputsHtml}</div>
      </div>
      <div style="background:#fdf2f8; padding:12px; border-radius:12px; border:1px solid #fbcfe8;">
        <div style="display:flex; justify-content:space-between; margin-bottom:12px;"><span style="font-size:12px; font-weight:700;">Statistik Manual</span><label style="font-size:11px; display:flex; gap:4px; align-items:center;"><input type="checkbox" id="homeAdv_${idx}" checked onchange="updateXgPreview(${idx})"> Home +15%</label></div>
        <div style="background:#fff; padding:12px; border-radius:10px; border:1px solid #f9a8d4; margin-bottom:10px;">
          <div style="font-size:11px; font-weight:700; color:#db2777; margin-bottom:10px;">Tim A - 5 Laga</div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:10px; padding:8px; background:#fff1f2; border-radius:8px; border:1px solid #fecdd3;">
            <div><label style="font-size:10px; font-weight:700;">GF Total</label><input type="number" step="0.1" id="gf_${idx}_A_total" value="11" oninput="syncStats(${idx},'A','GF')" style="width:100%; margin-top:4px; padding:8px; border-radius:6px;"></div>
            <div><label style="font-size:10px; font-weight:700;">GF Rata-rata</label><input type="number" step="0.01" id="gf_${idx}_A_avg" value="2.20" oninput="syncStats(${idx},'A','GF')" style="width:100%; margin-top:4px; padding:8px; border-radius:6px;"></div>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; padding:8px; background:#fff1f2; border-radius:8px; border:1px solid #fecdd3;">
            <div><label style="font-size:10px; font-weight:700;">GA Total</label><input type="number" step="0.1" id="ga_${idx}_A_total" value="4" oninput="syncStats(${idx},'A','GA')" style="width:100%; margin-top:4px; padding:8px; border-radius:6px;"></div>
            <div><label style="font-size:10px; font-weight:700;">GA Rata-rata</label><input type="number" step="0.01" id="ga_${idx}_A_avg" value="0.80" oninput="syncStats(${idx},'A','GA')" style="width:100%; margin-top:4px; padding:8px; border-radius:6px;"></div>
          </div>
        </div>
        <div style="background:#fff; padding:12px; border-radius:10px; border:1px solid #f9a8d4; margin-bottom:10px;">
          <div style="font-size:11px; font-weight:700; color:#7c3aed; margin-bottom:10px;">Tim B - 5 Laga</div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:10px; padding:8px; background:#faf5ff; border-radius:8px; border:1px solid #e9d5ff;">
            <div><label style="font-size:10px; font-weight:700;">GF Total</label><input type="number" step="0.1" id="gf_${idx}_B_total" value="13" oninput="syncStats(${idx},'B','GF')" style="width:100%; margin-top:4px; padding:8px; border-radius:6px;"></div>
            <div><label style="font-size:10px; font-weight:700;">GF Rata-rata</label><input type="number" step="0.01" id="gf_${idx}_B_avg" value="2.60" oninput="syncStats(${idx},'B','GF')" style="width:100%; margin-top:4px; padding:8px; border-radius:6px;"></div>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; padding:8px; background:#faf5ff; border-radius:8px; border:1px solid #e9d5ff;">
            <div><label style="font-size:10px; font-weight:700;">GA Total</label><input type="number" step="0.1" id="ga_${idx}_B_total" value="7" oninput="syncStats(${idx},'B','GA')" style="width:100%; margin-top:4px; padding:8px; border-radius:6px;"></div>
            <div><label style="font-size:10px; font-weight:700;">GA Rata-rata</label><input type="number" step="0.01" id="ga_${idx}_B_avg" value="1.40" oninput="syncStats(${idx},'B','GA')" style="width:100%; margin-top:4px; padding:8px; border-radius:6px;"></div>
          </div>
        </div>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; background:#fff; padding:10px; border-radius:8px; border:1px solid #f9a8d4;">
          <div><label style="font-size:10px; font-weight:700;">H2H Gol A</label><input type="number" step="0.1" id="h2hA_${idx}" value="1.8" oninput="updateXgPreview(${idx})" style="width:100%; margin-top:4px; padding:8px; border-radius:6px;"></div>
          <div><label style="font-size:10px; font-weight:700;">H2H Gol B</label><input type="number" step="0.1" id="h2hB_${idx}" value="1.6" oninput="updateXgPreview(${idx})" style="width:100%; margin-top:4px; padding:8px; border-radius:6px;"></div>
        </div>
      </div>
      <div id="hasilPrediksi_${idx}" style="margin-top:12px;"></div>
    </div>`;
  }

  async function loadTeams() {
    try {
      if (!teamsDataCache) {
        const res = await fetch('data/teams.json');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        teamsDataCache = await res.json();
      }
      const data = teamsDataCache;
      for (let i = 1; i <= MAX_MATCHES; i++) {
        const s1 = document.getElementById(`tim1_${i}`);
        const s2 = document.getElementById(`tim2_${i}`);
        if (!s1 || !s2) continue;
        const old1 = s1.value, old2 = s2.value;
        s1.innerHTML = ''; s2.innerHTML = '';
        for (const [liga, daftar] of Object.entries(data)) {
          const g1 = document.createElement('optgroup'); g1.label = liga;
          const g2 = document.createElement('optgroup'); g2.label = liga;
          daftar.forEach(nm => {
            const o1 = document.createElement('option'); o1.value = nm; o1.textContent = nm; g1.appendChild(o1);
            const o2 = document.createElement('option'); o2.value = nm; o2.textContent = nm; g2.appendChild(o2);
          });
          s1.appendChild(g1); s2.appendChild(g2);
        }
        if (old1) s1.value = old1; else if (s1.options.length > 0) s1.selectedIndex = 0;
        if (old2) s2.value = old2; else if (s2.options.length > 1) s2.selectedIndex = 1;
      }
      const statusEl = document.getElementById('statusTeamsGen');
      if (statusEl) statusEl.textContent = `✅ ${Object.values(data).flat().length} tim dimuat`;
    } catch (err) { console.error('Gagal load teams:', err); }
  }

  // --- O/U helpers ORI ---
  function ou_oddsToProb(odds) { const v = parseFloat(odds); if (isNaN(v) || v <= 1) return 0; return 1 / v; }
  function ou_poissonProb(k, lambda) { if (lambda <= 0) return 0; let fact = 1; for (let i = 2; i <= k; i++) fact *= i; return (Math.pow(lambda, k) * Math.exp(-lambda)) / fact; }
  function ou_probOver(line, lambda) { const th = Math.floor(line) + 1; let pu = 0; for (let k = 0; k < th; k++) pu += ou_poissonProb(k, lambda); return 1 - pu; }
  function ou_getFairProbsPerLine(oO, oU) { const pO = ou_oddsToProb(oO), pU = ou_oddsToProb(oU); if (pO === 0 || pU === 0) return { pOverFair: 0.5, pUnderFair: 0.5, margin: 0 }; const s = pO + pU; return { pOverFair: pO / s, pUnderFair: pU / s, margin: s - 1 }; }
  function ou_findLambdaFromProb(target, line) { let best = 2.5, min = 999; if (isNaN(target) || target <= 0 || target >= 1) return best; for (let l = 0.5; l <= 6; l += 0.01) { const p = ou_probOver(line, l); const e = Math.abs(p - target); if (e < min) { min = e; best = l; } } return best; }
  function ou_buildDistribution(lines, oddsOver, oddsUnder) { if (!Array.isArray(lines) || lines.length === 0) return { fairData: [], main: null, lambda: 2.5 }; const fairData = lines.map((line, i) => ({ line: parseFloat(line), ...ou_getFairProbsPerLine(oddsOver[i], oddsUnder[i]) })); const main = fairData.find(d => d.line === 2.5) || fairData[0]; const lambda = main ? ou_findLambdaFromProb(main.pOverFair, main.line) : 2.5; return { fairData, main, lambda }; }

  function hitungSingle(idx) {
    const tim1 = document.getElementById(`tim1_${idx}`)?.value;
    const tim2 = document.getElementById(`tim2_${idx}`)?.value;
    const odds1 = parseFloat(document.getElementById(`oddA_${idx}`)?.value);
    const oddsDraw = parseFloat(document.getElementById(`oddDraw_${idx}`)?.value);
    const odds2 = parseFloat(document.getElementById(`oddB_${idx}`)?.value);
    if (!tim1 || !tim2 || isNaN(odds1)) return null;
    const lines = [], oddsOver = [], oddsUnder = [];
    for (let i = 1; i <= 4; i++) {
      const lv = parseFloat(document.getElementById(`ou_line_${i}_${idx}`)?.value);
      const oV = parseFloat(document.getElementById(`ou_o_${i}_${idx}`)?.value);
      const uV = parseFloat(document.getElementById(`ou_u_${i}_${idx}`)?.value);
      if (!isNaN(lv) && lv > 0) { lines.push(lv); oddsOver.push(isNaN(oV) ? 0 : oV); oddsUnder.push(isNaN(uV) ? 0 : uV); }
    }
    const p1 = 1 / odds1, pD = 1 / oddsDraw, p2 = 1 / odds2;
    const totalM = p1 + pD + p2;
    const prob1M = p1 / totalM, probDM = pD / totalM, prob2M = p2 / totalM;
    let gfATotal = parseFloat(document.getElementById(`gf_${idx}_A_total`)?.value) || 11;
    let gaATotal = parseFloat(document.getElementById(`ga_${idx}_A_total`)?.value) || 4;
    let gfBTotal = parseFloat(document.getElementById(`gf_${idx}_B_total`)?.value) || 13;
    let gaBTotal = parseFloat(document.getElementById(`ga_${idx}_B_total`)?.value) || 7;
    let gfA = gfATotal / 5, gaA = gaATotal / 5, gfB = gfBTotal / 5, gaB = gaBTotal / 5;
    let h2hA = parseFloat(document.getElementById(`h2hA_${idx}`)?.value) || 1.8;
    let h2hB = parseFloat(document.getElementById(`h2hB_${idx}`)?.value) || 1.6;
    const homeAdv = document.getElementById(`homeAdv_${idx}`)?.checked;
    let xgA = Math.max(0.2, (gfA * 0.4) + (gaB * 0.4) + (h2hA * 0.2));
    let xgB = Math.max(0.2, (gfB * 0.4) + (gaA * 0.4) + (h2hB * 0.2));
    if (homeAdv) xgA *= 1.15;
    let probAWin = 0, probDraw = 0, probBWin = 0, probOver25 = 0;
    const scoreMatrix = []; let totalProb = 0; const rho = 0.13;
    for (let i = 0; i <= 6; i++) {
      for (let j = 0; j <= 6; j++) {
        let pA = poissonLog(i, xgA), pB = poissonLog(j, xgB), pC = pA * pB;
        if (i <= 1 && j <= 1) {
          if (i == 0 && j == 0) pC *= 1 - (xgB * rho);
          else if (i == 0 && j == 1) pC *= 1 + (xgA * rho);
          else if (i == 1 && j == 0) pC *= 1 + (xgB * rho);
          else if (i == 1 && j == 1) pC *= 1 - rho;
        }
        totalProb += pC;
        if (i > j) probAWin += pC; else if (i === j) probDraw += pC; else probBWin += pC;
        if ((i + j) > 2.5) probOver25 += pC;
        scoreMatrix.push({ score: `${i}-${j}`, i, j, prob: pC });
      }
    }
    probAWin /= totalProb; probDraw /= totalProb; probBWin /= totalProb; probOver25 /= totalProb;
    scoreMatrix.forEach(s => s.prob /= totalProb); scoreMatrix.sort((a, b) => b.prob - a.prob);
    return { idx, tim1, tim2, odds1, oddsDraw, odds2, lines, oddsOver, oddsUnder, prob1M, probDM, prob2M, xgA, xgB, probAWin, probDraw, probBWin, probOver25, scoreMatrix, evA: (probAWin * odds1 - 1) * 100, evD: (probDraw * oddsDraw - 1) * 100, evB: (probBWin * odds2 - 1) * 100, gfATotal, gaATotal, gfBTotal, gaBTotal };
  }

  function renderSingle(data) {
    const el = document.getElementById(`hasilPrediksi_${data.idx}`);
    if (!el) return;
    el.innerHTML = `<div style="padding:12px; background:#fff; border:1px solid #f9a8d4; border-radius:12px; font-size:12px;">
      <div style="display:flex; justify-content:space-between;"><strong>${data.tim1} vs ${data.tim2}</strong><span style="background:#fce7f3; border:1px solid #f9a8d4; padding:2px 6px; border-radius:6px; font-size:10px;">xG ${data.xgA.toFixed(2)}-${data.xgB.toFixed(2)}</span></div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:8px;">
        <div style="background:#fff1f2; padding:8px; border-radius:8px; border:1px solid #fecdd3;"><small>Pasar</small><br>${data.tim1} ${(data.prob1M * 100).toFixed(1)}%<br>Seri ${(data.probDM * 100).toFixed(1)}%<br>${data.tim2} ${(data.prob2M * 100).toFixed(1)}%</div>
        <div style="background:#fdf2f8; padding:8px; border-radius:8px; border:1px solid #f9a8d4;"><small>Model + EV</small><br>${data.tim1} ${(data.probAWin * 100).toFixed(1)}% EV ${data.evA.toFixed(1)}%${data.evA > 5 ? ' 🔥' : ''}<br>Seri ${(data.probDraw * 100).toFixed(1)}% EV ${data.evD.toFixed(1)}%<br>${data.tim2} ${(data.probBWin * 100).toFixed(1)}% EV ${data.evB.toFixed(1)}%${data.evB > 5 ? ' 🔥' : ''}</div>
      </div>
      <div style="margin-top:8px; display:flex; justify-content:space-between;"><span>Top: <strong>${data.scoreMatrix[0].score}</strong> ${(data.scoreMatrix[0].prob * 100).toFixed(1)}%</span><span>Over 2.5 ${(data.probOver25 * 100).toFixed(1)}%</span></div>
    </div>`;
    // O/U
    const result = ou_buildDistribution(data.lines, data.oddsOver, data.oddsUnder);
    if (result && result.main) {
      const lambda = result.lambda.toFixed(2); const margin = (result.main.margin * 100).toFixed(2);
      let linesHtml = ''; result.fairData.forEach(d => { linesHtml += `<div style="background:${d.line === 2.5 ? '#dcfce7' : '#f0fdf4'}; padding:6px 8px; border-radius:6px; border-left:3px solid ${d.line === 2.5 ? '#16a34a' : '#86efac'}; margin-bottom:4px;"><div style="display:flex; justify-content:space-between; font-size:11px; font-weight:700;"><span>Line ${d.line}</span><span>O: ${(d.pOverFair * 100).toFixed(1)}% | U: ${(d.pUnderFair * 100).toFixed(1)}%</span></div></div>`; });
      let distHtml = ''; for (let k = 0; k <= 5; k++) { const prob = (ou_poissonProb(k, result.lambda) * 100).toFixed(1); distHtml += `<div style="background:#fefce8; padding:6px; border-radius:6px; border:1px solid #fde047; text-align:center;"><div style="font-size:10px; font-weight:700;">${k} Gol</div><div style="font-size:12px; font-weight:800;">${prob}%</div></div>`; }
      el.insertAdjacentHTML('beforeend', `<div style="margin-top:12px; padding:12px; background:#fff; border:1px solid #bbf7d0; border-radius:12px;"><div style="display:flex; justify-content:space-between; margin-bottom:10px; border-bottom:1px solid #dcfce7; padding-bottom:8px;"><strong style="color:#15803d;">Analisis O/U</strong><span style="background:#dcfce7; padding:3px 10px; border-radius:6px; font-size:11px;">λ: ${lambda} | Margin: ${margin}%</span></div><div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;"><div>${linesHtml}</div><div style="display:grid; grid-template-columns:repeat(3,1fr); gap:6px;">${distHtml}</div></div></div>`);
    }
  }

  async function hasilkanPrediksi() {
    const cards = container.querySelectorAll('.match-card');
    const all = [];
    for (const card of cards) {
      const idx = card.dataset.idx;
      const data = hitungSingle(idx);
      if (!data) continue;
      renderSingle(data);
      all.push(data);
      const payload = {
        tim1: data.tim1, tim2: data.tim2,
        odds1: data.odds1, oddsDraw: data.oddsDraw, odds2: data.odds2,
        xgA: data.xgA, xgB: data.xgB,
        topScore: data.scoreMatrix[0]?.score,
        probAWin: data.probAWin, probDraw: data.probDraw, probBWin: data.probBWin,
        overUnder: data.lines.map((line, i) => ({ line, over: data.oddsOver[i] || 0, under: data.oddsUnder[i] || 0 })),
        matchLabel: `${data.tim1} vs ${data.tim2}`,
        waktu: new Date().toLocaleString('id-ID'),
        uid: App.Auth.currentUser?.uid
      };
      try {
        // Simpan pakai service kamu yang sudah fixed (Firestore)
        await App.Service.saveData(`users/${App.Auth.currentUser.uid}/generatorData`, [...all]);
        console.log('✅ Generator disimpan ke Firestore:', payload.matchLabel);
      } catch (e) {
        console.warn('Gagal simpan generator:', e);
      }
    }
    const globalEl = document.getElementById('hasilSemuaPrediksiGen');
    if (globalEl && all.length > 0) {
      let html = `<div style="margin-top:16px; padding:16px; background:#fff; border:1px solid #f9a8d4; border-radius:16px;"><h3 style="margin:0 0 12px 0; color:#831843;">📋 Rekap ${all.length} Prediksi</h3><div style="display:grid; gap:8px;">`;
      all.forEach(r => { html += `<div style="display:flex; justify-content:space-between; background:#fff1f2; padding:10px; border-radius:10px; border:1px solid #fecdd3;"><div><strong>${r.tim1} vs ${r.tim2}</strong><br><small>Top ${r.scoreMatrix[0].score}</small></div><div><span style="background:#ec4899; color:#fff; padding:4px 8px; border-radius:6px; font-size:11px;">${r.probAWin > r.probBWin ? r.tim1 : r.tim2}</span></div></div>`; });
      html += `</div></div>`;
      globalEl.innerHTML = html;
    }
  }

  function tambahPrediksi() {
    if (matchCount >= MAX_MATCHES) { alert(`Maksimal ${MAX_MATCHES}!`); return; }
    matchCount++;
    const matchesContainer = document.getElementById('matchesContainerGen');
    matchesContainer.insertAdjacentHTML('beforeend', createMatchCard(matchCount));
    loadTeams(); updateTambahButton(); updateXgPreview(matchCount);
    document.getElementById(`matchCard_${matchCount}`)?.scrollIntoView({ behavior: 'smooth' });
  }

  function hapusPrediksi(idx) {
    if (container.querySelectorAll('.match-card').length <= 1) { alert('Minimal 1!'); return; }
    document.getElementById(`matchCard_${idx}`)?.remove();
    matchCount = container.querySelectorAll('.match-card').length;
    updateTambahButton();
  }

  function updateTambahButton() {
    const btn = document.getElementById('btnTambahPrediksiGen');
    if (!btn) return;
    const cur = container.querySelectorAll('.match-card').length || 1;
    const counter = document.getElementById('matchCounterGen');
    if (counter) counter.textContent = `${cur} pertandingan`;
    if (cur >= MAX_MATCHES) { btn.disabled = true; btn.style.opacity = '0.5'; btn.innerHTML = `Maksimal ${MAX_MATCHES}`; }
    else { btn.disabled = false; btn.style.opacity = '1'; btn.innerHTML = `+ Tambah (${cur}/${MAX_MATCHES})`; }
  }

  // Expose hapus ke global untuk onclick
  App.FeatureLoaders.genHapus = hapusPrediksi;

  function renderBase() {
    container.innerHTML = `
      <h2>7. Generator Prediksi</h2>
      <div style="display:flex; justify-content:space-between; align-items:center; margin:12px 0; flex-wrap:wrap; gap:8px;">
        <div style="display:flex; gap:8px; align-items:center;">
          <span id="matchCounterGen" style="background:#fff; border:1px solid #f9a8d4; padding:8px 12px; border-radius:10px; font-size:12px; color:#be185d;">1 pertandingan</span>
          <span id="firebaseStatusGen" style="background:#fff; border:1px solid #f9a8d4; padding:8px 12px; border-radius:10px; font-size:11px; color:#be185d;">🟢 Siap - ${App.Auth.currentUser?.email || ''}</span>
          <span id="statusTeamsGen" style="font-size:11px; color:#be185d;"></span>
        </div>
        <div style="display:flex; gap:8px;">
          <button type="button" id="btnTambahPrediksiGen" style="background:#ec4899; color:#fff; border:none; padding:8px 16px; border-radius:10px; font-size:12px; font-weight:700; cursor:pointer;">+ Tambah</button>
          <button type="button" id="btnHitungGen" style="background:#be185d; color:#fff; border:none; padding:8px 16px; border-radius:10px; font-size:12px; font-weight:700; cursor:pointer;">Hitung Semua</button>
        </div>
      </div>
      <div id="matchesContainerGen"></div>
      <div id="hasilSemuaPrediksiGen"></div>
    `;
    document.getElementById('btnTambahPrediksiGen').onclick = tambahPrediksi;
    document.getElementById('btnHitungGen').onclick = hasilkanPrediksi;
    document.getElementById('matchesContainerGen').innerHTML = createMatchCard(1);
    loadTeams();
    updateTambahButton();
    updateXgPreview(1);
  }

  renderBase();
  console.log('✅ Feature 7 Gen loaded - FIXED compat version');
};

console.log("✅ feature7-gen FIXED loaded");
