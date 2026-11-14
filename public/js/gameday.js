// Gameday: deal a random history card, flip it, and keep track of the collection.
(function () {
  var el = document.getElementById('gameday-data');
  if (!el) return;
  var data = JSON.parse(el.textContent);
  var facts = data.facts;
  var eraName = {};
  data.eras.forEach(function (e) { eraName[e.id] = e.name; });

  var KEY = 'miketaps-cards';
  var have = [];
  try { have = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { have = []; }

  var era = 'all';
  var current = null;
  var dealt = document.querySelector('[data-dealt]');
  var card = document.querySelector('[data-card]');
  var empty = document.querySelector('[data-empty]');
  var flipBtn = document.querySelector('[data-flip]');
  var counter = document.querySelector('[data-collected]');

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(have)); } catch (e) {}
  }

  function markBinder() {
    have.forEach(function (id) {
      var s = document.querySelector('[data-sleeve="' + id + '"]');
      if (s) s.classList.add('have');
    });
    counter.textContent = String(have.length);
  }

  function pick() {
    var pool = facts.filter(function (f) { return era === 'all' || f.era === era; });
    var fresh = pool.filter(function (f) { return have.indexOf(f.id) === -1; });
    var from = fresh.length ? fresh : pool;
    var next;
    do {
      next = from[Math.floor(Math.random() * from.length)];
    } while (from.length > 1 && current && next.id === current.id);
    return next;
  }

  function show(f) {
    current = f;
    card.classList.remove('flipped');
    card.querySelector('[data-no]').textContent = 'No. ' + f.id + ' / ' + facts.length;
    card.querySelector('[data-era-name]').textContent = eraName[f.era];
    card.querySelector('[data-year]').textContent = f.year;
    card.querySelector('[data-title]').textContent = f.title;
    card.querySelector('[data-fact]').textContent = f.fact;
    var src = data.sources[f.src];
    var a = card.querySelector('[data-src]');
    a.href = /^https:\/\//.test(src.url) ? src.url : '#';
    a.textContent = 'Source: ' + src.title;
    dealt.hidden = false;
    empty.hidden = true;
    dealt.classList.remove('enter');
    void dealt.offsetWidth;
    dealt.classList.add('enter');
    flipBtn.disabled = false;
    if (have.indexOf(f.id) === -1) {
      have.push(f.id);
      save();
    }
    markBinder();
  }

  function flip() {
    if (!current) return;
    card.classList.toggle('flipped');
    flipBtn.textContent = card.classList.contains('flipped') ? 'Flip back' : 'Flip it';
  }

  document.querySelectorAll('[data-deal]').forEach(function (b) {
    b.addEventListener('click', function () {
      show(pick());
      flipBtn.textContent = 'Flip it';
    });
  });
  flipBtn.addEventListener('click', flip);
  card.addEventListener('click', function (e) {
    if (e.target.closest('a')) return;
    flip();
  });

  document.querySelectorAll('[data-era]').forEach(function (b) {
    b.addEventListener('click', function () {
      era = b.getAttribute('data-era');
      document.querySelectorAll('[data-era]').forEach(function (o) {
        var on = o === b;
        o.classList.toggle('on', on);
        o.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    });
  });

  markBinder();
})();
