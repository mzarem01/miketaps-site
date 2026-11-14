// The Word: mood tabs, one verse at a time, copy, and direct verse lookup.
// Without JavaScript, every mood and verse is simply listed on the page.
(function () {
  var root = document.documentElement;
  root.classList.add('js');

  var tabsWrap = document.querySelector('[data-moods]');
  var tabs = Array.prototype.slice.call(document.querySelectorAll('[data-mood]'));
  var panels = {};
  document.querySelectorAll('[data-panel]').forEach(function (p) {
    panels[p.getAttribute('data-panel')] = p;
    var actions = p.querySelector('[data-actions]');
    if (actions) actions.hidden = false;
  });
  if (tabsWrap) tabsWrap.hidden = false;

  var idx = {};

  function showVerse(panel, i) {
    var verses = panel.querySelectorAll('[data-verse]');
    verses.forEach(function (v, j) { v.classList.toggle('active', j === i); });
  }

  function select(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      var p = panels[t.getAttribute('data-mood')];
      p.classList.toggle('active', on);
    });
    var id = tab.getAttribute('data-mood');
    if (idx[id] === undefined) {
      var count = panels[id].querySelectorAll('[data-verse]').length;
      idx[id] = Math.floor(Math.random() * count);
    }
    showVerse(panels[id], idx[id]);
    if (focus) tab.focus();
  }

  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { select(t); });
    t.addEventListener('keydown', function (e) {
      var n = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') n = tabs[(i + 1) % tabs.length];
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') n = tabs[(i - 1 + tabs.length) % tabs.length];
      if (e.key === 'Home') n = tabs[0];
      if (e.key === 'End') n = tabs[tabs.length - 1];
      if (n) { e.preventDefault(); select(n, true); }
    });
  });

  Object.keys(panels).forEach(function (id) {
    var p = panels[id];
    var another = p.querySelector('[data-another]');
    var copy = p.querySelector('[data-copy]');
    var note = p.querySelector('[data-copied]');
    another.addEventListener('click', function () {
      var count = p.querySelectorAll('[data-verse]').length;
      idx[id] = (idx[id] + 1) % count;
      showVerse(p, idx[id]);
    });
    copy.addEventListener('click', function () {
      var v = p.querySelectorAll('[data-verse]')[idx[id]];
      var text = Array.prototype.map.call(v.querySelectorAll('.vtext'), function (s) {
        return s.lastChild.textContent.trim();
      }).join(' ');
      var ref = v.querySelector('.ref').textContent;
      var out = '"' + text + '" ' + ref + ' (WEB)';
      if (navigator.clipboard) {
        navigator.clipboard.writeText(out).then(function () {
          note.textContent = 'Copied';
          setTimeout(function () { note.textContent = ''; }, 1800);
        }, function () { note.textContent = 'Copy blocked'; });
      }
    });
  });

  if (tabs.length) select(tabs[0]);

  // Direct lookup, loading one book at a time from /bible/.
  var form = document.querySelector('[data-lookup]');
  var out = document.querySelector('[data-lookup-out]');
  var err = document.querySelector('[data-lookup-error]');
  var books = null;
  var cache = {};

  function loadBooks() {
    if (books) return Promise.resolve(books);
    return fetch('/bible/books.json').then(function (r) { return r.json(); }).then(function (b) { books = b; return b; });
  }

  function findBook(name) {
    var key = name.toLowerCase().replace(/\s+/g, ' ').trim();
    for (var i = 0; i < books.length; i++) {
      var b = books[i];
      var names = [b.slug, b.name.toLowerCase()].concat(b.aliases);
      if (names.indexOf(key) !== -1) return b;
    }
    return null;
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    err.textContent = '';
    var q = form.ref.value.trim();
    var m = q.match(/^(.+?)\s+(\d+)(?::(\d+)(?:\s*-\s*(\d+))?)?$/);
    if (!m) {
      err.textContent = 'Try a reference like John 3:16, Psalm 23 or Romans 8:28-39.';
      return;
    }
    loadBooks().then(function () {
      var book = findBook(m[1]);
      if (!book) throw new Error("I couldn't find a book called " + m[1] + '.');
      var load = cache[book.slug] ? Promise.resolve(cache[book.slug]) : fetch('/bible/' + book.slug + '.json').then(function (r) { return r.json(); });
      return load.then(function (data) {
        cache[book.slug] = data;
        var ch = data[m[2]];
        if (!ch) throw new Error(book.name + ' has ' + book.chapters + ' chapters.');
        var nums = Object.keys(ch).map(Number).sort(function (a, b) { return a - b; });
        var from = m[3] ? +m[3] : nums[0];
        var to = m[4] ? +m[4] : m[3] ? from : nums[nums.length - 1];
        if (to < from) { var t = from; from = to; to = t; }
        var picked = nums.filter(function (n) { return n >= from && n <= to; });
        if (!picked.length) throw new Error(book.name + ' ' + m[2] + ' has ' + nums.length + ' verses.');
        if (picked.length > 60) picked = picked.slice(0, 60);
        out.textContent = '';
        var label = (book.slug === 'psalms' ? 'Psalm' : book.name) + ' ' + m[2] + (m[3] ? ':' + from + (to !== from ? '-' + to : '') : '');
        out.appendChild(el('p', 'lk-ref', label + ' (WEB)'));
        var p = el('p', 'lk-text');
        picked.forEach(function (n) {
          if (picked.length > 1) p.appendChild(el('sup', null, String(n)));
          p.appendChild(document.createTextNode(ch[n] + ' '));
        });
        out.appendChild(p);
      });
    }).catch(function (x) {
      out.textContent = '';
      err.textContent = x && x.message ? x.message : 'Something went wrong loading that passage.';
    });
  });
})();
