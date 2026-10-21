/**
 * feature4-diskusi.js
 * Fitur 4: Room Diskusi — Ringkasan Rekomendasi
 */

App.FeatureLoaders.diskusi = function(userRef) {
  const container = document.getElementById('diskusi');
  container.innerHTML = `
    <h2>4. Room Diskusi — Ringkasan Rekomendasi</h2>
    <div class="rekom-box">
      <h3>✅ Tim untuk Dipilih (Win ≥67%)</h3>
      <ul id="list-win"><li><em>Memuat...</em></li></ul>
    </div>
    <div class="rekom-box">
      <h3>📈 Pertandingan Over (≥60%)</h3>
      <ul id="list-over"><li><em>Memuat...</em></li></ul>
    </div>
    <div class="rekom-box">
      <h3>📉 Pertandingan Under (≥60%)</h3>
      <ul id="list-under"><li><em>Memuat...</em></li></ul>
    </div>
    <p class="hint">Rekomendasi berdasarkan probabilitas dari Fitur 1.</p>
  `;

  function analisis() {
    const data = window.firebaseParlayData || [];
    const winList=[], overList=[], underList=[];
    data.forEach(m=>{
      const a=parseFloat(m.oddsA), d=parseFloat(m.oddsD), b=parseFloat(m.oddsB);
      if (isNaN(a)||isNaN(d)||isNaN(b)||a<=1) return;
      const pA=1/a, pD=1/d, pB=1/b, total=pA+pD+pB;
      const probA=pA/total, probB=pB/total, probD=pD/total;
      let tim="", prob=0;
      if (probA>=probB&&probA>=probD){tim=m.teamA;prob=probA;}
      else if (probB>=probA&&probB>=probD){tim=m.teamB;prob=probB;}
      else {tim="Draw";prob=probD;}
      if (prob>=0.67) winList.push(`${tim} (${(prob*100).toFixed(1)}%)`);

      let avgGoals;
      if (probD>=0.35) avgGoals=1.8;
      else if (probD>=0.25) avgGoals=2.3;
      else if (Math.abs(probA-probB)>=0.3) avgGoals=3.1;
      else avgGoals=2.6;
      const th={u15:2.0,u25:2.5,o25:2.7,o35:3.2};
      let recType, probO, probU;
      if (avgGoals<th.u25){recType="Under";probU=0.52+(th.u25-avgGoals)*0.15;probU=Math.min(0.85,Math.max(0.45,probU));probO=1-probU;}
      else {recType="Over";probO=avgGoals>=th.o35?0.55+(avgGoals-th.o35)*0.12:0.52+(avgGoals-th.u25)*0.12;probO=Math.min(0.85,Math.max(0.45,probO));probU=1-probO;}
      const nama=`${m.teamA} vs ${m.teamB}`;
      if (recType==="Over"&&probO>=0.60) overList.push(`${nama} (${(probO*100).toFixed(1)}%)`);
      if (recType==="Under"&&probU>=0.60) underList.push(`${nama} (${(probU*100).toFixed(1)}%)`);
    });
    document.getElementById('list-win').innerHTML = winList.length?winList.map(t=>`<li>${t}</li>`).join(''):'<li><em>Tidak ada rekomendasi Win ≥67%</em></li>';
    document.getElementById('list-over').innerHTML = overList.length?overList.map(t=>`<li>${t}</li>`).join(''):'<li><em>Tidak ada Over ≥60%</em></li>';
    document.getElementById('list-under').innerHTML = underList.length?underList.map(t=>`<li>${t}</li>`).join(''):'<li><em>Tidak ada Under ≥60%</em></li>';
  }

  analisis();
};

console.log("✅ Feature 4: Diskusi loaded");
