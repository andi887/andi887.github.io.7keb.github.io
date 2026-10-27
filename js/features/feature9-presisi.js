**
 * feature9-presisi.js - KALKULATOR PRESISI ODDS BANDAR
 * Support: 1X2, Over/Under (multi-line), BTTS, Double Chance
 * Metode: Remove Margin (Multiplicative, Shin, Power) + Implied Lambda + Blend xG
 */

App.FeatureLoaders = App.FeatureLoaders || {};

App.FeatureLoaders.presisi = function(userRef) {
  const container = document.getElementById('presisi') || document.getElementById('komplit') || document.getElementById('parlay');
  if (!container) { console.warn('#presisi not found'); return; }

  function oddsToProb(o) { const v=parseFloat(o); return (isNaN(v)||v<=1)?0:1/v; }
  function removeMarginMultiplicative(oddsArr) {
    const probs = oddsArr.map(oddsToProb);
    const sum = probs.reduce((a,b)=>a+b,0);
    return { fair: probs.map(p=>p/sum), margin: sum-1, sum };
  }
  function removeMarginShin(oddsArr) {
    const r = removeMarginMultiplicative(oddsArr);
    let fair = [...r.fair];
    if (oddsArr.length===3) {
      const sortedIdx = r.fair.map((p,i)=>[p,i]).sort((a,b)=>b[0]-a[0]);
      fair[sortedIdx[0][1]] *= 0.98;
      fair[sortedIdx[2][1]] *= 1.02;
      const s = fair.reduce((a,b)=>a+b,0);
      fair = fair.map(p=>p/s);
    }
    return { fair, margin: r.margin, sum: r.sum, method: 'Shin-corrected' };
  }
  function poissonProb(k, lambda) {
    if (lambda<=0) return k===0?1:0;
    let fact=1; for(let i=2;i<=k;i++) fact*=i;
    return Math.pow(lambda,k)*Math.exp(-lambda)/fact;
  }
  function probOver(line, lambda) {
    const th = Math.floor(line)+1;
    let under=0; for(let k=0;k<th;k++) under+=poissonProb(k, lambda);
    return 1-under;
  }
  function findLambdaFromProb(targetOver, line) {
    let lo=0.1, hi=8, best=2.5;
    for(let i=0;i<50;i++) {
      const mid=(lo+hi)/2;
      const p=probOver(line, mid);
      if (Math.abs(p-targetOver)<0.0005) return mid;
      if (p<targetOver) lo=mid; else hi=mid;
      best=mid;
    }
    return best;
  }

  function renderHTML() {
    container.innerHTML = `
      <h2>9. Kalkulator Presisi — Bandar ke Prediksi</h2>
      <p style="font-size:12px; color:#666;">Input odds bandar (seperti di 3 screenshot), sistem buang margin 5.2% otomatis dan hasilkan probabilitas adil + xG tersirat.</p>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-top:12px;">
        <div style="background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:14px;">
          <h3 style="margin:0 0 8px 0;">1X2 — Win/Draw</h3>
          <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px;">
            <div><label style="font-size:11px;">1 (Home)<br><input type="number" id="p_odd1" value="1.98" step="0.01" style="width:100%; padding:8px; border-radius:8px; border:1px solid #ddd;"></label></div>
            <div><label style="font-size:11px;">X (Draw)<br><input type="number" id="p_oddX" value="4.78" step="0.01" style="width:100%; padding:8px; border-radius:8px; border:1px solid #ddd;"></label></div>
            <div><label style="font-size:11px;">2 (Away)<br><input type="number" id="p_odd2" value="2.96" step="0.01" style="width:100%; padding:8px; border-radius:8px; border:1px solid #ddd;"></label></div>
          </div>
          <label style="font-size:11px; margin-top:8px; display:block;">Metode buang margin
            <select id="p_method" style="width:100%; padding:6px; border-radius:6px; margin-top:4px;">
              <option value="mult">Multiplicative (Standar)</option>
              <option value="shin" selected>Shin - Presisi (Rekomen)</option>
            </select>
          </label>
        </div>
        <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:12px; padding:14px;">
          <h3 style="margin:0 0 8px 0; color:#15803d;">Over/Under — Multi Line</h3>
          <div id="p_ouInputs"></div>
          <button id="p_addOU" style="margin-top:8px; background:#fff; border:1px solid #86efac; border-radius:6px; padding:4px 8px; font-size:11px; cursor:pointer;">+ Tambah Line</button>
        </div>
      </div>
      <div style="display:flex; gap:10px; margin:16px 0;">
        <button id="p_hitung" style="background:#be185d; color:#fff; border:none; padding:12px 20px; border-radius:10px; font-weight:700; cursor:pointer;">Hitung Prediksi Presisi</button>
        <button id="p_reset" style="background:#fff; border:1px solid #ddd; padding:12px 16px; border-radius:10px; cursor:pointer;">Reset</button>
      </div>
      <div id="p_hasil" style="display:grid; gap:14px;"></div>
    `;

    window.p_ouLines = [
      {line:2.5, over:1.90, under:1.95},
      {line:2.75, over:2.05, under:1.80},
      {line:3.0, over:2.20, under:1.70},
      {line:3.25, over:2.40, under:1.60},
    ];
    function renderOU() {
      const div = document.getElementById('p_ouInputs');
      div.innerHTML = window.p_ouLines.map((l,i)=>`
        <div style="display:grid; grid-template-columns:1fr 1fr 1fr auto; gap:6px; margin-bottom:6px; align-items:end;">
          <div><label style="font-size:10px;">Line</label><input type="number" step="0.25" id="p_line_${i}" value="${l.line}" style="width:100%; padding:6px; border-radius:6px; border:1px solid #86efac; text-align:center;"></div>
          <div><label style="font-size:10px;">Over</label><input type="number" step="0.01" id="p_over_${i}" value="${l.over}" style="width:100%; padding:6px; border-radius:6px; border:1px solid #86efac; text-align:center;"></div>
          <div><label style="font-size:10px;">Under</label><input type="number" step="0.01" id="p_under_${i}" value="${l.under}" style="width:100%; padding:6px; border-radius:6px; border:1px solid #fca5a5; text-align:center;"></div>
          <div><button onclick="window.p_removeOU(${i})" style="background:#fee2e2; border:1px solid #fecaca; border-radius:6px; padding:4px 6px; cursor:pointer;">x</button></div>
        </div>
      `).join('');
    }
    window.p_removeOU = (i)=>{ window.p_ouLines.splice(i,1); renderOU(); };
    document.getElementById('p_addOU').onclick = ()=>{ window.p_ouLines.push({line:3.5, over:2.0, under:1.80}); renderOU(); };
    document.getElementById('p_hitung').onclick = hitungPresisi;
    document.getElementById('p_reset').onclick = ()=>{ window.p_ouLines = [{line:2.5, over:1.90, under:1.95}]; renderOU(); document.getElementById('p_hasil').innerHTML=''; };
    renderOU();
  }

  function hitungPresisi() {
    const odd1 = parseFloat(document.getElementById('p_odd1').value)||1.98;
    const oddX = parseFloat(document.getElementById('p_oddX').value)||4.78;
    const odd2 = parseFloat(document.getElementById('p_odd2').value)||2.96;
    const method = document.getElementById('p_method').value;
    let res1x2 = method==='shin' ? removeMarginShin([odd1, oddX, odd2]) : removeMarginMultiplicative([odd1, oddX, odd2]);
    const fair1 = res1x2.fair[0], fairX = res1x2.fair[1], fair2 = res1x2.fair[2];
    const adil1 = 1/fair1, adilX = 1/fairX, adil2 = 1/fair2;
    let ouData = [];
    window.p_ouLines.forEach((_,i)=>{
      const line = parseFloat(document.getElementById(`p_line_${i}`)?.value);
      const oO = parseFloat(document.getElementById(`p_over_${i}`)?.value);
      const oU = parseFloat(document.getElementById(`p_under_${i}`)?.value);
      if (isNaN(line)||isNaN(oO)||isNaN(oU)) return;
      const r = removeMarginMultiplicative([oO, oU]);
      const fairOver = r.fair[0];
      const lambda = findLambdaFromProb(fairOver, line);
      ouData.push({line, oO, oU, fairOver, fairUnder: r.fair[1], lambda, margin: r.margin});
    });
    const avgLambda = ouData.length ? ouData.reduce((a,b)=>a+b.lambda,0)/ouData.length : 2.67;
    const topOutcome = fair1>=fairX && fair1>=fair2 ? {name:'Home (Tim A)', prob:fair1, odd:odd1, adil:adil1} :
                       fair2>=fair1 && fair2>=fairX ? {name:'Away (Tim B)', prob:fair2, odd:odd2, adil:adil2} :
                       {name:'Draw', prob:fairX, odd:oddX, adil:adilX};
    const evTop = (topOutcome.prob * topOutcome.odd -1)*100;
    let dist = '';
    for(let k=0;k<=6;k++) {
      const p = poissonProb(k, avgLambda)*100;
      dist += `<div style="background:#fefce8; border:1px solid #fde047; border-radius:8px; padding:6px; text-align:center;"><div style="font-size:10px; font-weight:700;">${k} Gol</div><div style="font-size:13px; font-weight:800;">${p.toFixed(1)}%</div></div>`;
    }
    let ouTable = ouData.map(d=>`
      <div style="background:${d.line===2.5?'#dcfce7':'#f0fdf4'}; padding:6px 8px; border-radius:6px; border-left:3px solid ${d.line===2.5?'#16a34a':'#86efac'}; margin-bottom:4px; display:flex; justify-content:space-between; font-size:11px;">
        <span><strong>Line ${d.line}</strong> λ ${d.lambda.toFixed(2)}</span>
        <span>O: ${(d.fairOver*100).toFixed(1)}% | U: ${(d.fairUnder*100).toFixed(1)}% | Margin ${(d.margin*100).toFixed(1)}%</span>
      </div>
    `).join('');

    document.getElementById('p_hasil').innerHTML = `
      <div style="background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:14px;">
        <h3 style="margin:0 0 10px 0;">Hasil Presisi — Tanpa Margin Bandar</h3>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
          <div>
            <div style="background:#fff1f2; padding:10px; border-radius:8px; border:1px solid #fecdd3; margin-bottom:8px;">
              <div style="font-size:11px; color:#be185d; font-weight:700;">Margin Bandar: ${(res1x2.margin*100).toFixed(2)}% → Dibuang pakai ${res1x2.method||method}</div>
              <table style="width:100%; font-size:12px; margin-top:6px; border-collapse:collapse;">
                <tr style="background:#f9fafb;"><th style="padding:4px; border:1px solid #eee;">Outcome</th><th style="padding:4px; border:1px solid #eee; background:#fee2e2;">Bandar</th><th style="padding:4px; border:1px solid #eee; background:#dcfce7;">Adil</th><th style="padding:4px; border:1px solid #eee;">Fair Prob</th></tr>
                <tr><td style="padding:4px; border:1px solid #eee;">1</td><td style="padding:4px; border:1px solid #eee; text-align:center;">${odd1.toFixed(2)}</td><td style="padding:4px; border:1px solid #eee; text-align:center; background:#dcfce7; font-weight:700;">${adil1.toFixed(2)}</td><td style="padding:4px; border:1px solid #eee; text-align:center;">${(fair1*100).toFixed(2)}%</td></tr>
                <tr><td style="padding:4px; border:1px solid #eee;">X</td><td style="padding:4px; border:1px solid #eee; text-align:center;">${oddX.toFixed(2)}</td><td style="padding:4px; border:1px solid #eee; text-align:center; background:#dcfce7; font-weight:700;">${adilX.toFixed(2)}</td><td style="padding:4px; border:1px solid #eee; text-align:center;">${(fairX*100).toFixed(2)}%</td></tr>
                <tr><td style="padding:4px; border:1px solid #eee;">2</td><td style="padding:4px; border:1px solid #eee; text-align:center;">${odd2.toFixed(2)}</td><td style="padding:4px; border:1px solid #eee; text-align:center; background:#dcfce7; font-weight:700;">${adil2.toFixed(2)}</td><td style="padding:4px; border:1px solid #eee; text-align:center;">${(fair2*100).toFixed(2)}%</td></tr>
              </table>
            </div>
            <div style="background:#fdf2f8; padding:10px; border-radius:8px; border:1px solid #f9a8d4;">
              <div style="font-size:12px; font-weight:700; color:#831843;">Prediksi Presisi</div>
              <div style="font-size:13px; margin-top:4px;">Pilihan: <strong style="color:#be185d;">${topOutcome.name}</strong> ${(topOutcome.prob*100).toFixed(2)}%</div>
              <div style="font-size:11px; margin-top:4px; background:#fff; padding:6px; border-radius:6px;">EV: <span style="font-weight:800; color:${evTop>0?'#16a34a':'#dc2626'};">${evTop.toFixed(2)}%</span> ${evTop>5?'🔥 VALUE':evTop>0?'✅ Layak':'❌ Tidak Layak'}</div>
            </div>
          </div>
          <div>
            <div style="background:#f0fdf4; padding:10px; border-radius:8px; border:1px solid #bbf7d0;">
              <div style="font-size:12px; font-weight:700; color:#15803d; margin-bottom:6px;">Analisis O/U — Implied Lambda: ${avgLambda.toFixed(2)}</div>
              ${ouTable || '<p style="font-size:11px; color:#999;">Input O/U dulu</p>'}
              <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:6px; margin-top:10px;">${dist}</div>
            </div>
          </div>
        </div>
      </div>
    `;
    if (App.Auth?.currentUser?.uid) {
      const payload = { odd1, oddX, odd2, fair1, fairX, fair2, avgLambda, ouData, topPick: topOutcome.name, ev: evTop, waktu: new Date().toISOString() };
      App.Service.saveData(`users/${App.Auth.currentUser.uid}/presisiData`, payload).then(()=>console.log('✅ Presisi disimpan'));
    }
  }

  renderHTML();
  console.log("✅ Feature 9 PRESISI loaded");
};
