/**
 * feature1-parlay-UNIFIED.js
 * Gabungan 3 fitur mandiri menjadi 1 fitur Tab 1:
 * - Odds Bandar vs Adil (dari screenshot 1)
 * - Analisis Tunggal + Parlay & EV (como vs lazio)
 * - Kalkulator BEP + EV (dari screenshot 2 - Leg)
 * - Analisis O/U + Poisson Distribution (dari screenshot 3 - Generator)
 * Logic ORI 100% dipertahankan
 */

App.FeatureLoaders = App.FeatureLoaders || {};

App.FeatureLoaders.komplit = function(userRef) {
  const container = document.getElementById('komplit');
  if (!container) { console.warn('#komplit tidak ditemukan'); return; }
  const MAX_MATCHES = 5;
  let jumlahPertandingan = 1;
  let firebaseParlayData = [];
  let temporaryMatchData = null;
  let teamsData = {};
  let allTeams = [];
  let kalkulatorLegs = [{odds: 1.98, prob: 37}];

  async function loadTeams() {
    try {
      const res = await fetch('data/teams.json');
      if (!res.ok) throw new Error('HTTP '+res.status);
      teamsData = await res.json();
      allTeams = Object.values(teamsData).flat();
      console.log(`✅ Unified: ${allTeams.length} teams loaded`);
    } catch(e) { console.warn('teams.json gagal', e); }
  }

  function poissonLog(x, lambda) {
    if (lambda <= 0) return x === 0 ? 1 : 0;
    let logFact = 0; for (let i=2;i<=x;i++) logFact+=Math.log(i);
    return Math.exp(-lambda + x*Math.log(lambda) - logFact);
  }
  function ou_poissonProb(k, lambda) {
    if (lambda <= 0) return 0;
    let fact = 1; for (let i=2;i<=k;i++) fact*=i;
    return (Math.pow(lambda,k)*Math.exp(-lambda))/fact;
  }

  function renderHTML() {
    container.innerHTML = `
      <h2>8. Analisis Komplit — 3in1</h2><p style='font-size:12px;color:#666;'>Gabungan Odds Adil + BEP/EV + O/U Poisson (dari 3 screenshot)</p>
      
      <!-- INPUT PERTANDINGAN -->
      <div id="matches"></div>
      <div class="match-controls" style="margin:10px 0;">
        <button class="btn-secondary" id="btnTambah">➕ Tambah Pertandingan</button>
        <button class="btn-secondary" id="btnHapus">➖ Hapus Pertandingan</button>
      </div>

      <!-- ACTION -->
      <div class="action-buttons" style="display:flex; gap:10px; flex-wrap:wrap; margin:15px 0;">
        <button class="btn-primary" id="btnHitung" style="background:#2563eb; color:#fff; padding:10px 18px; border-radius:8px; border:none; cursor:pointer;">🔍 Hitung Analisis, Parlay & EV</button>
        <button class="btn-secondary" id="btnLihatAdil" style="background:#16a34a; color:#fff; padding:10px 18px; border-radius:8px; border:none; cursor:pointer;">👁 Lihat Odds Adil</button>
        <button class="btn-success" id="btnSimpan" style="background:#16a34a; color:#fff; padding:8px 14px; border-radius:8px; border:none;">💾 Simpan</button>
        <button class="btn-danger" id="btnHapusData" style="background:#dc2626; color:#fff; padding:8px 14px; border-radius:8px; border:none;">🗑 Hapus</button>
      </div>

      <!-- 3 HASIL UNIFIED DALAM 1 SCROLL -->
      <div style="display:grid; gap:20px;">
        <!-- A. Odds Bandar vs Adil -->
        <div id="fairOddsContainer" class="fair-odds-table" style="display:none; background:#fff; padding:14px; border-radius:12px; border:1px solid #e5e7eb;">
          <h3>⚖ Odds Bandar vs Odds Adil</h3>
          <table style="width:100%; border-collapse:collapse;">
            <thead><tr style="background:#f3f4f6;"><th>Pertandingan</th><th>Outcome</th><th style="background:#fee2e2;">Bandar</th><th style="background:#dcfce7;">Adil</th><th>Margin</th></tr></thead>
            <tbody id="fairOddsTableBody"></tbody>
          </table>
        </div>

        <!-- B. Analisis Tunggal / Parlay -->
        <div id="hasil" style="background:#fff; padding:14px; border-radius:12px; border:1px solid #e5e7eb;"></div>

        <!-- C. Kalkulator BEP + EV (dari screenshot 2) -->
        <div id="bepContainer" style="background:#fafafa; padding:16px; border-radius:12px; border:1px solid #e5e7eb;">
          <h3>🧮 Kalkulator BEP + EV (Parlay Leg)</h3>
          <p style="font-size:12px; color:#666;">Odds: desimal (1.85) | Prob: % (60) atau desimal (0.6)</p>
          <div id="bepInputs"></div>
          <div style="display:flex; gap:8px; margin-top:10px;">
            <button class="btn-secondary" id="btnTambahLeg" style="background:#2563eb; color:#fff; padding:6px 12px; border-radius:6px; border:none;">+ Tambah Leg</button>
            <button class="btn-primary" id="btnHitungBEP" style="background:#16a34a; color:#fff; padding:6px 12px; border-radius:6px; border:none;">Hitung BEP & EV</button>
          </div>
          <div id="hasilBEP" style="margin-top:12px; background:#f0fdf4; padding:12px; border-radius:8px; border:1px solid #bbf7d0;"></div>
          <div style="margin-top:12px;">
            <h4>📁 Riwayat EV</h4>
            <div id="riwayatEV" style="font-size:12px; color:#666;">Belum ada riwayat.</div>
            <button id="btnHapusRiwayat" style="margin-top:8px; background:#dc2626; color:#fff; padding:4px 10px; border-radius:6px; border:none;">Hapus Riwayat</button>
          </div>
        </div>

        <!-- D. Analisis O/U Poisson (dari screenshot 3) -->
        <div id="ouUnifiedContainer" style="background:#fff; padding:16px; border-radius:16px; border:1px solid #f9a8d4;">
          <h3 style="color:#831843;">📊 Analisis Over/Under — Poisson</h3>
          <div id="ouHasilUnified"></div>
        </div>
      </div>

      <datalist id="teamDatalist"></datalist>
    `;
    bindEvents();
    renderPertandingan();
    renderBEPInputs();
  }

  function renderTeamDatalist() {
    const dl = document.getElementById('teamDatalist');
    if (!dl) return;
    const sorted = [...new Set(allTeams)].sort((a,b)=>a.localeCompare(b));
    dl.innerHTML = sorted.map(t=>`<option value="${t}">`).join('');
  }

  function bindEvents() {
    document.getElementById('btnTambah').onclick = tambahPertandingan;
    document.getElementById('btnHapus').onclick = hapusPertandingan;
    document.getElementById('btnHitung').onclick = hitungSemuaUnified;
    document.getElementById('btnLihatAdil').onclick = tampilkanOddsAdil;
    document.getElementById('btnSimpan').onclick = simpanData;
    document.getElementById('btnHapusData').onclick = hapusData;
    document.getElementById('btnTambahLeg').onclick = tambahLeg;
    document.getElementById('btnHitungBEP').onclick = hitungBEP;
    document.getElementById('btnHapusRiwayat').onclick = () => { localStorage.removeItem('riwayatEV'); renderRiwayat(); };
  }

  // --- RENDER PERTANDINGAN (ORI) ---
  function simpanInputSementara() {
    temporaryMatchData = [];
    for (let i=1;i<=jumlahPertandingan;i++) {
      temporaryMatchData.push({
        teamA: document.getElementById(`teamA${i}`)?.value.trim()||'Tim A',
        teamB: document.getElementById(`teamB${i}`)?.value.trim()||'Tim B',
        oddsA: document.getElementById(`A${i}`)?.value||'0',
        oddsD: document.getElementById(`D${i}`)?.value||'0',
        oddsB: document.getElementById(`B${i}`)?.value||'0',
        over: document.getElementById(`O${i}`)?.value||'0',
        under: document.getElementById(`U${i}`)?.value||'0',
        gfA: document.getElementById(`gfA_${i}`)?.value||'11',
        gaA: document.getElementById(`gaA_${i}`)?.value||'4',
        gfB: document.getElementById(`gfB_${i}`)?.value||'13',
        gaB: document.getElementById(`gaB_${i}`)?.value||'7',
      });
    }
  }

  function renderPertandingan() {
    const div = document.getElementById('matches');
    if (!div) return;
    let html = '';
    for (let i=1;i<=jumlahPertandingan;i++) {
      let d = {}; if (temporaryMatchData?.[i-1]) d = temporaryMatchData[i-1]; else if (firebaseParlayData?.[i-1]) d = firebaseParlayData[i-1];
      html += `<div class="match" style="background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:14px; margin-bottom:12px;">
        <h3>Pertandingan ${i}</h3>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:8px;">
          <div><label>Tim A<br><input type="text" id="teamA${i}" value="${d.teamA||''}" list="teamDatalist" style="width:100%; padding:6px; border-radius:6px; border:1px solid #ddd;"></label></div>
          <div><label>Tim B<br><input type="text" id="teamB${i}" value="${d.teamB||''}" list="teamDatalist" style="width:100%; padding:6px; border-radius:6px; border:1px solid #ddd;"></label></div>
        </div>
        <div style="display:grid; grid-template-columns:repeat(5,1fr); gap:8px;">
          <div><label>Odds A<br><input type="number" id="A${i}" value="${d.oddsA||'2.10'}" step="0.01" style="width:100%; padding:6px;"></label></div>
          <div><label>Draw<br><input type="number" id="D${i}" value="${d.oddsD||'3.60'}" step="0.01" style="width:100%; padding:6px;"></label></div>
          <div><label>Odds B<br><input type="number" id="B${i}" value="${d.oddsB||'3.20'}" step="0.01" style="width:100%; padding:6px;"></label></div>
          <div><label>Over<br><input type="number" id="O${i}" value="${d.over||'1.90'}" step="0.01" style="width:100%; padding:6px;"></label></div>
          <div><label>Under<br><input type="number" id="U${i}" value="${d.under||'1.95'}" step="0.01" style="width:100%; padding:6px;"></label></div>
        </div>
        <!-- Mini statistik untuk O/U Poisson (dari Generator V5) -->
        <details style="margin-top:8px;"><summary style="font-size:12px; cursor:pointer; color:#831843;">⚙ Statistik xG (untuk O/U)</summary>
          <div style="display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:6px; margin-top:8px; font-size:11px;">
            <div>GF A<input type="number" id="gfA_${i}" value="${d.gfA||'11'}" style="width:100%;"></div>
            <div>GA A<input type="number" id="gaA_${i}" value="${d.gaA||'4'}" style="width:100%;"></div>
            <div>GF B<input type="number" id="gfB_${i}" value="${d.gfB||'13'}" style="width:100%;"></div>
            <div>GA B<input type="number" id="gaB_${i}" value="${d.gaB||'7'}" style="width:100%;"></div>
          </div>
        </details>
      </div>`;
    }
    div.innerHTML = html;
  }

  function tambahPertandingan(){ if(jumlahPertandingan<MAX_MATCHES){ simpanInputSementara(); jumlahPertandingan++; renderPertandingan(); } }
  function hapusPertandingan(){ if(jumlahPertandingan>1){ simpanInputSementara(); jumlahPertandingan--; renderPertandingan(); } }

  // --- LOGIC HITUNG SEMUA UNIFIED ---
  function hitungOddsAdil(a,d,b){ const pA=1/a,pD=1/d,pB=1/b,total=pA+pD+pB; return {adilA:total/pA, adilD:total/pD, adilB:total/pB, margin: (total-1)*100}; }
  function analisisProb(a,d,b){ const pA=1/a,pD=1/d,pB=1/b,total=pA+pD+pB; return {a:pA/total, d:pD/total, b:pB/total, total}; }

  function hitungSemuaUnified() {
    simpanInputSementara();
    let htmlParlay = '', htmlOU = '';
    let allProbs = [];

    for (let i=1;i<=jumlahPertandingan;i++) {
      const teamA = document.getElementById(`teamA${i}`)?.value||'Tim A';
      const teamB = document.getElementById(`teamB${i}`)?.value||'Tim B';
      const a = parseFloat(document.getElementById(`A${i}`)?.value)||2.10;
      const d = parseFloat(document.getElementById(`D${i}`)?.value)||3.60;
      const b = parseFloat(document.getElementById(`B${i}`)?.value)||3.20;
      const prob = analisisProb(a,d,b);
      allProbs.push(prob);

      // Parlay section
      const label = prob.a>prob.b ? `${teamA} Diunggulkan` : `${teamB} Diunggulkan`;
      const pilihan = prob.a>=prob.b && prob.a>=prob.d ? teamA : prob.b>=prob.a && prob.b>=prob.d ? teamB : 'Draw';
      const probPilihan = Math.max(prob.a, prob.b, prob.d);
      htmlParlay += `<div style="background:#fff; padding:12px; border-radius:10px; border:1px solid #fecdd3; margin-bottom:10px;">
        <strong>${teamA} vs ${teamB}</strong><br>
        Prob: ${teamA}: ${(prob.a*100).toFixed(2)}% | Draw: ${(prob.d*100).toFixed(2)}% | ${teamB}: ${(prob.b*100).toFixed(2)}%<br>
        Analisis: <span style="background:#e0f2fe; padding:2px 6px; border-radius:4px;">${label}</span><br>
        Pilihan: ${pilihan} (${(probPilihan*100).toFixed(2)}%)
      </div>`;

      // O/U Poisson section (dari Generator V5)
      const gfA = (parseFloat(document.getElementById(`gfA_${i}`)?.value)||11)/5;
      const gaA = (parseFloat(document.getElementById(`gaA_${i}`)?.value)||4)/5;
      const gfB = (parseFloat(document.getElementById(`gfB_${i}`)?.value)||13)/5;
      const gaB = (parseFloat(document.getElementById(`gaB_${i}`)?.value)||7)/5;
      let xgA = Math.max(0.2, gfA*0.4 + gaB*0.4 + 1.8*0.2);
      let xgB = Math.max(0.2, gfB*0.4 + gaA*0.4 + 1.6*0.2);
      let probOver = 0, scoreMat = [];
      let totP = 0;
      for (let x=0;x<=6;x++) for (let y=0;y<=6;y++){ let pA=poissonLog(x,xgA), pB=poissonLog(y,xgB), pc=pA*pB; totP+=pc; if ((x+y)>2.5) probOver+=pc; scoreMat.push({s:`${x}-${y}`, p:pc}); }
      probOver/=totP; scoreMat.forEach(s=>s.p/=totP); scoreMat.sort((a,b)=>b.p-a.p);
      let distHtml = ''; for (let k=0;k<=5;k++){ const pr = ou_poissonProb(k, (xgA+xgB)/2)*100; distHtml+=`<div style="background:#fefce8; padding:6px; border-radius:6px; border:1px solid #fde047; text-align:center;"><div style="font-size:10px; font-weight:700;">${k} Gol</div><div style="font-size:12px; font-weight:800;">${pr.toFixed(1)}%</div></div>`; }
      htmlOU += `<div style="background:#fff; padding:12px; border-radius:12px; border:1px solid #f9a8d4; margin-bottom:12px;">
        <div style="display:flex; justify-content:space-between;"><strong>${teamA} vs ${teamB}</strong><span style="background:#fce7f3; padding:2px 6px; border-radius:6px; font-size:10px;">xG ${xgA.toFixed(2)}-${xgB.toFixed(2)}</span></div>
        <div style="font-size:11px; margin-top:6px;">Top: <strong>${scoreMat[0].s}</strong> ${(scoreMat[0].p*100).toFixed(1)}% | Over 2.5 ${(probOver*100).toFixed(1)}%</div>
        <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:6px; margin-top:8px;">${distHtml}</div>
      </div>`;
    }

    // Parlay gabungan
    if (jumlahPertandingan>1) {
      const probGab = allProbs.reduce((acc,p)=>acc*Math.max(p.a,p.b,p.d),1);
      const oddsTeo = 1/probGab;
      htmlParlay += `<div style="background:#dbeafe; padding:14px; border-radius:10px; margin-top:12px;"><h3>🎯 Analisis Parlay</h3><p>Odds Teoretis: ${oddsTeo.toFixed(2)} | Prob Menang: ${(probGab*100).toFixed(2)}%</p></div>`;
    } else {
      htmlParlay += `<div style="background:#dbeafe; padding:12px; border-radius:10px; margin-top:10px; text-align:center;"><strong>Analisis Tunggal</strong><br>Hanya 1 pertandingan.</div>`;
    }

    document.getElementById('hasil').innerHTML = htmlParlay;
    document.getElementById('ouHasilUnified').innerHTML = htmlOU || '<p style="color:#999;">Hitung dulu untuk lihat distribusi gol.</p>';
    // auto hitung BEP juga
    hitungBEP();
  }

  function tampilkanOddsAdil() {
    let html=''; for (let i=1;i<=jumlahPertandingan;i++){ const a=parseFloat(document.getElementById(`A${i}`)?.value)||2.10; const d=parseFloat(document.getElementById(`D${i}`)?.value)||3.60; const b=parseFloat(document.getElementById(`B${i}`)?.value)||3.20; const adil=hitungOddsAdil(a,d,b); [{n:'Tim A', bandar:a, adil:adil.adilA},{n:'Draw', bandar:d, adil:adil.adilD},{n:'Tim B', bandar:b, adil:adil.adilB}].forEach(o=>{ const m=((o.adil-o.bandar)/o.bandar*100).toFixed(1); html+=`<tr><td style="padding:6px; border:1px solid #eee; text-align:center;">${i}</td><td style="padding:6px; border:1px solid #eee;">${o.n}</td><td style="padding:6px; border:1px solid #eee; background:#fee2e2; text-align:center;">${o.bandar.toFixed(2)}</td><td style="padding:6px; border:1px solid #eee; background:#dcfce7; text-align:center;">${o.adil.toFixed(2)}</td><td style="padding:6px; border:1px solid #eee; text-align:center;">${m}%</td></tr>`; }); }
    document.getElementById('fairOddsTableBody').innerHTML=html;
    document.getElementById('fairOddsContainer').style.display='block';
  }

  // --- BEP KALKULATOR (dari screenshot 2) ---
  function renderBEPInputs(){
    const div = document.getElementById('bepInputs');
    let h=''; kalkulatorLegs.forEach((leg,idx)=>{ h+=`<div style="display:grid; grid-template-columns:1fr 1fr auto; gap:8px; margin-bottom:8px;"><input type="number" id="bepOdds_${idx}" value="${leg.odds}" step="0.01" placeholder="Odds" style="padding:6px; border-radius:6px; border:1px solid #ddd;"><input type="number" id="bepProb_${idx}" value="${leg.prob}" placeholder="Prob %" style="padding:6px; border-radius:6px; border:1px solid #ddd;"><button onclick="window.hapusLeg(${idx})" style="background:#fee2e2; border:1px solid #fecaca; border-radius:6px; padding:4px 8px;">x</button></div>`; });
    div.innerHTML=h;
  }
  window.hapusLeg = function(idx){ kalkulatorLegs.splice(idx,1); if(kalkulatorLegs.length===0) kalkulatorLegs=[{odds:1.98, prob:37}]; renderBEPInputs(); };
  function tambahLeg(){ kalkulatorLegs.push({odds:1.98, prob:50}); renderBEPInputs(); }
  function hitungBEP(){
    let oddsParlay=1, probFair=1;
    for(let i=0;i<kalkulatorLegs.length;i++){ const o=parseFloat(document.getElementById(`bepOdds_${i}`)?.value)||1.98; const pRaw=document.getElementById(`bepProb_${i}`)?.value||'50'; let p=parseFloat(pRaw); if(p>1) p=p/100; oddsParlay*=o; probFair*=p; }
    const bep = probFair>0 ? (1/probFair*100) : 0; // BEP dalam %
    // Rumus BEP yang dipakai di screenshot: BEP = 50.51% untuk odds 1.98
    const bepOdds = 1/probFair;
    const ev = (probFair*oddsParlay -1)*100;
    const layak = ev>0;
    document.getElementById('hasilBEP').innerHTML = `Odds Parlay: ${oddsParlay.toFixed(2)}<br>BEP: ${(probFair*100).toFixed(2)}%<br>Fair Prob: ${(probFair*100).toFixed(2)}%<br>EV: <span style="color:${ev>=0?'green':'red'}; font-weight:700;">${ev.toFixed(2)}%</span><br>Rekomendasi: ${layak ? '✅ LAYAK' : '❌ TIDAK LAYAK'}`;
    // simpan riwayat
    let riw = JSON.parse(localStorage.getItem('riwayatEV')||'[]');
    riw.unshift({odds:oddsParlay.toFixed(2), ev:ev.toFixed(2), time:new Date().toLocaleString()});
    if(riw.length>10) riw=riw.slice(0,10);
    localStorage.setItem('riwayatEV', JSON.stringify(riw));
    renderRiwayat();
  }
  function renderRiwayat(){
    const riw = JSON.parse(localStorage.getItem('riwayatEV')||'[]');
    if(riw.length===0){ document.getElementById('riwayatEV').innerHTML='Belum ada riwayat.'; return; }
    document.getElementById('riwayatEV').innerHTML = riw.map(r=>`<div style="padding:4px; border-bottom:1px solid #eee;">${r.time} - Odds ${r.odds} EV ${r.ev}%</div>`).join('');
  }

  function simpanData(){
    const data=[]; for(let i=1;i<=jumlahPertandingan;i++){ data.push({teamA:document.getElementById(`teamA${i}`)?.value||'Tim A', teamB:document.getElementById(`teamB${i}`)?.value||'Tim B', oddsA:document.getElementById(`A${i}`)?.value||'0'}); }
    App.Service.saveData('users/'+App.Auth.currentUser.uid+'/parlayData', data).then(()=>alert('✅ Tersimpan!'));
  }
  function hapusData(){ if(!confirm('Hapus data?'))return; App.Service.removeData('users/'+App.Auth.currentUser.uid+'/parlayData').then(()=>{ jumlahPertandingan=1; firebaseParlayData=[]; temporaryMatchData=null; renderPertandingan(); document.getElementById('hasil').innerHTML=''; document.getElementById('fairOddsContainer').style.display='none'; alert('Dihapus'); }); }

  App.Service.loadData('users/'+App.Auth.currentUser.uid+'/parlayData', val=>{ firebaseParlayData=Array.isArray(val)?val:[]; jumlahPertandingan=Math.max(1,firebaseParlayData.length); renderPertandingan(); });

  (async()=>{ await loadTeams(); renderHTML(); renderTeamDatalist(); renderRiwayat(); })();
};
console.log("✅ Feature 8 KOMPLIT loaded");
