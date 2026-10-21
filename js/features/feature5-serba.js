/**
 * feature5-serba.js
 * Fitur 5: Serba Serbi (placeholder untuk pengembangan)
 */

App.FeatureLoaders.serba = function(userRef) {
  const container = document.getElementById('serba');
  container.innerHTML = `
    <h2>5. Serba Serbi</h2>
    <p>▶️ Koleksi alat bantu: konversi odds, kalkulator ROI, panduan threshold, dll.</p>
    <div class="tools-grid">
      <div class="tool-card">
        <h3>🔄 Konversi Odds</h3>
        <p>Desimal ↔ Fractional ↔ American</p>
        <button class="btn-primary" disabled>Segera Hadir</button>
      </div>
      <div class="tool-card">
        <h3>📈 Kalkulator ROI</h3>
        <p>Hitung Return on Investment taruhan</p>
        <button class="btn-primary" disabled>Segera Hadir</button>
      </div>
      <div class="tool-card">
        <h3>📊 Panduan Threshold</h3>
        <p>Referensi probabilitas & margin</p>
        <button class="btn-primary" disabled>Segera Hadir</button>
      </div>
    </div>
  `;
};

console.log("✅ Feature 5: Serba loaded");
