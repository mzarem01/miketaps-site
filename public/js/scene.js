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
