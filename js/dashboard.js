/**
 * dashboard.js
 * Mengatur navigasi, card grid, dan memuat fitur yang aktif.
 * Tidak ada logika fitur di sini — hanya routing.
 */

App.Dashboard = {
  currentFeature: 'parlay',
  initializedFeatures: new Set(),

  init(uid) {
    this.uid = uid;
    this.userRef = App.Service.getUserRef(uid);
    this.setupNavigation();
    // Load fitur default
    this.loadFeature('parlay');
  },

  setupNavigation() {
    document.querySelectorAll('#mainNav button').forEach(btn => {
      btn.addEventListener('click', () => {
        const feature = btn.dataset.feature;
        this.switchFeature(feature);
      });
    });
  },

  switchFeature(featureName) {
    // Update tombol aktif
    document.querySelectorAll('#mainNav button').forEach(b => b.classList.remove('active'));
    document.querySelector(`#mainNav button[data-feature="${featureName}"]`)?.classList.add('active');

    // Update section aktif
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(featureName)?.classList.add('active');

    this.currentFeature = featureName;
    this.loadFeature(featureName);
  },

  loadFeature(featureName) {
    // Cegah inisialisasi ganda
    if (this.initializedFeatures.has(featureName)) return;

    const loader = App.FeatureLoaders[featureName];
    if (loader) {
      loader(this.userRef);
      this.initializedFeatures.add(featureName);
      console.log(`✅ Feature "${featureName}" loaded`);
    } else {
      console.warn(`⚠️ Feature loader "${featureName}" tidak ditemukan`);
    }
  }
};

// Registry fitur — setiap fitur mendaftarkan dirinya sendiri
App.FeatureLoaders = {};

// Inisialisasi Auth saat DOM siap
document.addEventListener('DOMContentLoaded', () => {
  App.Auth.init();
});

console.log("✅ Dashboard loaded");
