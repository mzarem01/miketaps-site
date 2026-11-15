// The wrist lock on The Mat: offer the hand a slap and bump, get wrist locked.
// Captions rotate on each click. Finding it adds a secret plaque entry (found.js).
(function () {
  var btn = document.querySelector('[data-wristlock]');
  var box = document.querySelector('[data-wl]');
  if (!btn || !box) return;
  var hint = box.querySelector('[data-wl-hint]');
  var line = box.querySelector('[data-wl-line]');
  var lines = [
    'Sorry. Old habit.',
    'Never offer a purple belt your wrist.',
    'Slap, bump, wrist lock. That’s how I say hi.',
    'You shook the wrong hand.',
    'Ask anyone at my gym.',
    'Couldn’t help it.'
  ];
  var i = Math.floor(Math.random() * lines.length);
  var timer;

  btn.addEventListener('click', function () {
    if (box.classList.contains('is-locked')) return;
    box.classList.add('is-locked');
    line.textContent = 'Tap, tap, tap. ' + lines[i];
    i = (i + 1) % lines.length;
    hint.hidden = true;
    line.hidden = false;
    if (window.mtFound) window.mtFound('wristlock');
    clearTimeout(timer);
    timer = setTimeout(function () {
      box.classList.remove('is-locked');
      line.hidden = true;
      hint.hidden = false;
    }, 3200);
  });
})();
