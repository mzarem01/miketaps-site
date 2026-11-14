// Workshop scene: the "Show labels" toggle (helps on touch screens and for first-time visitors).
(function () {
  var btn = document.querySelector('[data-show-labels]');
  var scene = document.querySelector('.scene');
  if (!btn || !scene) return;
  btn.addEventListener('click', function () {
    var on = !scene.classList.contains('show-tags');
    scene.classList.toggle('show-tags', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.textContent = on ? 'Hide labels' : 'Show labels';
  });
})();

// Easter egg: the belt on the hook earns a stripe each time you come back (max 4).
// Counted once per browser session, stored only in this browser.
(function () {
  var scene = document.querySelector('.scene');
  if (!scene) return;
  var visits = 1;
  try {
    visits = parseInt(localStorage.getItem('miketaps-visits') || '0', 10) || 0;
    if (!sessionStorage.getItem('miketaps-counted')) {
      visits += 1;
      localStorage.setItem('miketaps-visits', String(visits));
      sessionStorage.setItem('miketaps-counted', '1');
    }
  } catch (e) {
    return;
  }
  var stripes = Math.min(Math.max(visits - 1, 0), 4);
  // Let the page settle, then award the stripe so the animation is visible.
  setTimeout(function () {
    scene.setAttribute('data-stripes', String(stripes));
  }, 500);
  var tip = scene.querySelector('[data-stripe-tip]');
  if (tip) {
    tip.textContent = stripes === 0 ? 'come back for a stripe'
      : stripes < 4 ? stripes + (stripes > 1 ? ' stripes' : ' stripe') + '. Come back'
      : '4 stripes. Next belt?';
  }
})();

// On narrow screens the room scrolls sideways: start centered on the desk.
(function () {
  var sc = document.querySelector('[data-scene-scroll]');
  if (sc && sc.scrollWidth > sc.clientWidth) {
    sc.scrollLeft = (sc.scrollWidth - sc.clientWidth) * 0.42;
  }
})();
