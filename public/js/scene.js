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
