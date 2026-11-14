// Runs before the page paints so the saved lamp setting never flashes.
(function () {
  try {
    var saved = localStorage.getItem('miketaps-theme');
    if (saved === 'light' || saved === 'dark') {
      document.documentElement.dataset.theme = saved;
    }
  } catch (e) {
    /* storage blocked: fall back to the system setting */
  }
})();
