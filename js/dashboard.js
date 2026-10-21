/**
 * dashboard.js
 * Hanya routing & navigasi.
 * Tidak ada inisialisasi App, tidak ada DOMContentLoaded.
 */

App.Dashboard = {
  currentFeature: 'parlay',
  initializedFeatures: new Set(),
  uid: null,
  userRef: null,

  init(uid) {
    this.uid = uid;
    this.userRef = App.Service.getUserRef(uid);
    this.setupNavigation();
    this.loadFeature('parlay');
  },

  setupNavigation() {
    document.querySelectorAll('#mainNav button').forEach(btn => {
      btn.addEventListener('click', () => {
        this.switchFeature(btn.dataset.feature);
      });
    });
  },

  switchFeature(featureName) {
    // Update tombol aktif
    document.querySelectorAll('#mainNav button').forEach(b => b.classList.remove('active'));
    const activeBtn = document.querySelector(`#mainNav button[data-feature="${featureName}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    // Update section aktif
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(featureName);
    if (target) target.classList.add('active');

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
      console.warn(`⚠️ Feature loader "${featureName}" tidak ditemukan. Pastikan file fitur sudah di-load.`);
    }
  }
};

console.log("✅ Dashboard loaded");
