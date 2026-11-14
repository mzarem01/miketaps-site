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

// The window: the sky follows the visitor's own clock. Dawn 5 to 8, day 8 to 5,
// dusk 5 to 9, night 9 to 5, plus a little snow from December to February.
// No location and no weather service: just the browser's clock and date.
(function () {
  var scene = document.querySelector('.scene');
  if (!scene) return;
  function phase(h) {
    if (h >= 5 && h < 8) return 'dawn';
    if (h >= 8 && h < 17) return 'day';
    if (h >= 17 && h < 21) return 'dusk';
    return 'night';
  }
  function update() {
    var d = new Date();
    var p = phase(d.getHours());
    scene.setAttribute('data-sky', p);
    var m = d.getMonth();
    if (m === 11 || m <= 1) scene.setAttribute('data-snow', '');
    else scene.removeAttribute('data-snow');
    // Seeing the window at dawn or at night counts toward the plaque (found.js).
    if ((p === 'dawn' || p === 'night') && window.mtFound) {
      setTimeout(function () { window.mtFound(p); }, 1500);
    }
  }
  update();
  // Fade only on later changes, so the first paint never shows night melting into day.
  requestAnimationFrame(function () {
    requestAnimationFrame(function () { scene.classList.add('sky-ready'); });
  });
  setInterval(update, 60000);
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
    if (stripes > 0 && window.mtFound) window.mtFound('stripe');
  }, 500);
  var tip = scene.querySelector('[data-stripe-tip]');
  if (tip) {
    tip.textContent = stripes === 0 ? 'come back for a stripe'
      : stripes < 4 ? stripes + (stripes > 1 ? ' stripes' : ' stripe') + '. Come back'
      : '4 stripes. Next belt?';
  }
})();

// The plaque on the wall: shows what you have found (found.js keeps the list).
(function () {
  var plaque = document.querySelector('[data-plaque]');
  var dialog = document.querySelector('[data-plaque-dialog]');
  var P = window.mtPlaque;
  if (!plaque || !dialog || !P || !dialog.showModal) return;
  var count = plaque.querySelector('[data-plaque-count]');
  var studs = plaque.querySelectorAll('[data-stud]');
  var list = dialog.querySelector('[data-plaque-list]');
  var n = dialog.querySelector('[data-plaque-n]');
  var bar = dialog.querySelector('[data-plaque-bar]');
  var reset = dialog.querySelector('[data-plaque-reset]');
  var armed = false;

  function span(cls, text) {
    var s = document.createElement('span');
    s.className = cls;
    if (text) s.textContent = text;
    return s;
  }

  function render() {
    var have = P.have();
    var main = P.list.filter(function (a) { return !a.secret; });
    var total = main.length;
    var got = main.filter(function (a) { return have.indexOf(a.id) !== -1; }).length;
    count.textContent = got + '/' + total;
    n.textContent = got;
    bar.style.width = Math.round((got / total) * 100) + '%';
    plaque.setAttribute('aria-label', 'The plaque: ' + got + ' of ' + total + ' found. Open the list');
    list.textContent = '';
    P.list.forEach(function (a, i) {
      var done = have.indexOf(a.id) !== -1;
      if (studs[i] && !a.secret) studs[i].classList.toggle('on', done);
      var li = document.createElement('li');
      if (done) li.className = 'is-done';
      if (a.secret) li.className += ' is-secret';
      var mark = span('plaque-mark');
      mark.setAttribute('aria-hidden', 'true');
      if (done) mark.appendChild(P.icon('M3 8.5l3.2 3L13 4.5', 16, 13, 2.4));
      var text = span('');
      text.appendChild(span('sr-only', done ? 'Found: ' : 'Not found yet: '));
      text.appendChild(span('plaque-name', a.secret && !done ? '????' : a.title));
      text.appendChild(span('plaque-how', done ? a.done : a.hint));
      li.appendChild(mark);
      li.appendChild(text);
      list.appendChild(li);
    });
  }

  function open() {
    render();
    armed = false;
    reset.textContent = 'Start over';
    dialog.showModal();
  }

  plaque.addEventListener('click', open);
  plaque.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      open();
    }
  });
  // Click outside the panel to close it.
  dialog.addEventListener('click', function (e) {
    if (e.target === dialog) dialog.close();
  });
  // Two clicks to start over, so one slip does not wipe the list.
  reset.addEventListener('click', function () {
    if (!armed) {
      armed = true;
      reset.textContent = 'Sure? Click again';
      return;
    }
    armed = false;
    reset.textContent = 'Start over';
    P.reset();
  });
  document.addEventListener('miketaps:found', render);
  render();
})();

// On narrow screens the room scrolls sideways: start centered on the desk.
(function () {
  var sc = document.querySelector('[data-scene-scroll]');
  if (sc && sc.scrollWidth > sc.clientWidth) {
    sc.scrollLeft = (sc.scrollWidth - sc.clientWidth) * 0.42;
  }
})();

// The controller is a TV remote: each press changes the channel on the desk monitor.
// 0 = terminal, 1 = Epona, 2 and 3 = Madden plays, 4 = Volvagia, 5 = test pattern.
(function () {
  var remote = document.querySelector('[data-tv-remote]');
  var tv = document.querySelector('[data-tv]');
  if (!remote || !tv) return;
  var tip = document.querySelector('[data-tv-tip]');
  var chLabel = tv.querySelector('[data-tv-ch]');
  var soundBtn = tv.querySelector('[data-tv-sound]');
  var playBtn = tv.querySelector('[data-tv-play]');
  var now = document.querySelector('[data-tv-now]');
  var videos = tv.querySelectorAll('video');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var channel = 0;
  var sound = false;
  var YT = 'https://www.youtube.com/channel/UCVr4Sy6tnK-_dN8chyJnc8w';
  var info = {
    1: 'Ocarina of Time: riding Epona across Hyrule Field',
    2: 'Madden 27: scoop and score in the Super Bowl',
    3: 'Madden 27: a perfectly timed pick, taken back for six',
    4: 'Ocarina of Time: the last hits on Volvagia',
    5: 'Test pattern. Nothing on but burgundy and gold',
  };
  var links = {
    1: [YT, 'More on YouTube'],
    4: [YT, 'More on YouTube'],
  };
  var next = { 0: 'press to play a clip', 1: 'next channel', 2: 'next channel', 3: 'next channel', 4: 'next channel', 5: 'back to the terminal' };

  function current() {
    return tv.querySelector('video[data-ch="' + channel + '"]');
  }

  function stopAll() {
    videos.forEach(function (v) { v.pause(); });
  }

  function start(v) {
    v.muted = !sound;
    var p = v.play();
    tv.classList.remove('needs-play');
    if (p && p.catch) p.catch(function () { tv.classList.add('needs-play'); });
  }

  function setNow() {
    if (!now) return;
    if (!channel) { now.hidden = true; now.textContent = ''; return; }
    now.hidden = false;
    now.textContent = 'Now playing: ' + info[channel] + '.';
    if (links[channel]) {
      now.appendChild(document.createTextNode(' '));
      var a = document.createElement('a');
      a.href = links[channel][0];
      a.textContent = links[channel][1];
      a.rel = 'noopener';
      now.appendChild(a);
    }
  }

  function tune() {
    channel = (channel + 1) % 6;
    stopAll();
    if (tip) tip.textContent = next[channel];
    if (!channel) {
      tv.hidden = true;
      tv.removeAttribute('data-on');
      setNow();
      return;
    }
    tv.hidden = false;
    tv.setAttribute('data-on', String(channel));
    chLabel.textContent = 'CH ' + channel;
    tv.classList.remove('switching');
    void tv.offsetWidth;
    tv.classList.add('switching');
    var v = current();
    if (v) {
      if (reduce) {
        tv.classList.add('needs-play');
      } else {
        start(v);
      }
    } else {
      tv.classList.remove('needs-play');
    }
    setNow();
  }

  // The desk terminal (puzzle.js) shares the monitor: opening it switches the TV off.
  document.addEventListener('miketaps:terminal', function () {
    if (!channel) return;
    channel = 0;
    stopAll();
    tv.hidden = true;
    tv.removeAttribute('data-on');
    tv.classList.remove('needs-play');
    if (tip) tip.textContent = next[0];
    setNow();
  });

  remote.addEventListener('click', tune);
  remote.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      tune();
    }
  });

  soundBtn.addEventListener('click', function () {
    sound = !sound;
    soundBtn.setAttribute('aria-pressed', sound ? 'true' : 'false');
    soundBtn.setAttribute('aria-label', sound ? 'Turn sound off' : 'Turn sound on');
    var v = current();
    if (v) v.muted = !sound;
  });

  playBtn.addEventListener('click', function () {
    var v = current();
    if (v) start(v);
  });
})();

// Mia, on the floor by the desk: each click gives her a treat.
// The count is kept only in this browser.
(function () {
  var mia = document.querySelector('[data-mia]');
  if (!mia) return;
  var tip = mia.querySelector('[data-mia-tip]');
  var live = document.querySelector('[data-mia-live]');
  var treats = 0;
  var timer;
  try { treats = parseInt(localStorage.getItem('miketaps-mia-treats') || '0', 10) || 0; } catch (e) {}

  function line(n) {
    if (n === 0) return 'give her a treat';
    if (n === 1) return '1 treat. Good girl';
    if (n < 10) return n + ' treats. Still hungry';
    if (n < 25) return n + ' treats. She has you trained';
    return n + ' treats. Spoiled rotten';
  }
  if (tip) tip.textContent = line(treats);

  function give() {
    treats += 1;
    try { localStorage.setItem('miketaps-mia-treats', String(treats)); } catch (e) {}
    if (tip) tip.textContent = line(treats);
    if (live) live.textContent = 'Mia got a treat. ' + line(treats) + '.';
    mia.classList.remove('is-treating');
    void mia.getBoundingClientRect();
    mia.classList.add('is-treating');
    clearTimeout(timer);
    timer = setTimeout(function () { mia.classList.remove('is-treating'); }, 1700);
  }

  mia.addEventListener('click', give);
  mia.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      give();
    }
  });
})();
