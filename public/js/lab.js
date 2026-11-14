// The Lab: click a part of the rig (or a row in the parts list) to see what it is and why it's there.
(function () {
  var detail = {
    name: document.querySelector('[data-p-name]'),
    model: document.querySelector('[data-p-model]'),
    why: document.querySelector('[data-p-why]'),
  };
  if (!detail.name) return;

  function select(id) {
    var row = document.querySelector('[data-row="' + id + '"]');
    if (!row) return;
    detail.name.textContent = row.querySelector('th').textContent.trim();
    detail.model.textContent = row.querySelector('.model').textContent.trim();
    detail.why.textContent = row.querySelectorAll('td')[1].textContent.trim();
    document.querySelectorAll('.part').forEach(function (p) {
      p.classList.toggle('on', p.getAttribute('data-part') === id);
    });
    document.querySelectorAll('[data-row]').forEach(function (r) {
      r.classList.toggle('on', r === row);
    });
    // Tell the 3D view (if it's open) which part is selected.
    document.dispatchEvent(new CustomEvent('rig:selected', { detail: id }));
  }

  // A click on a part in the 3D view selects it the same way.
  document.addEventListener('rig:pick', function (e) { select(e.detail); });

  document.querySelectorAll('[data-part]').forEach(function (el) {
    var id = el.getAttribute('data-part');
    el.addEventListener('click', function () { select(id); });
    if (el.tagName !== 'BUTTON') {
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          select(id);
        }
      });
    }
  });
})();

// The home server rack: click a device (or a row in the gear list) to see what it is.
// The "Play it out" stories step through a scenario on the same drawing.
(function () {
  var detail = {
    name: document.querySelector('[data-g-name]'),
    model: document.querySelector('[data-g-model]'),
    why: document.querySelector('[data-g-why]'),
  };
  var rack = document.querySelector('[data-rack]');
  if (!detail.name || !rack) return;
  var lcd = rack.querySelector('[data-lcd]');
  var nav = document.querySelector('[data-story-nav]');
  var bar = document.querySelector('[data-story-bar]');
  var count = document.querySelector('[data-story-count]');
  var prev = document.querySelector('[data-story-prev]');
  var next = document.querySelector('[data-story-next]');
  var STATES = ['batt', 'low', 'off', 'home'];
  var LCD = { batt: 'ON BATT', low: 'LOW', off: 'LOW' };

  function light(ids) {
    document.querySelectorAll('.gear').forEach(function (g) {
      g.classList.toggle('on', ids.indexOf(g.getAttribute('data-gear')) !== -1);
    });
  }

  function setState(st) {
    STATES.forEach(function (x) { rack.classList.toggle('st-' + x, x === st); });
    if (lcd) lcd.textContent = LCD[st] || '100%';
  }

  // ---- stories ----
  var stories = [];
  try { stories = JSON.parse(document.getElementById('rack-stories').textContent); } catch (e) { stories = []; }
  var story = null;
  var at = 0;

  function show() {
    var st = story.steps[at];
    detail.name.textContent = story.label;
    detail.model.textContent = st.title;
    detail.why.textContent = st.text;
    count.textContent = 'Step ' + (at + 1) + ' of ' + story.steps.length;
    prev.disabled = at === 0;
    next.textContent = at === story.steps.length - 1 ? 'Done' : 'Next';
    light(st.gear);
    setState(st.state);
    document.querySelectorAll('[data-gear-row]').forEach(function (r) { r.classList.remove('on'); });
  }

  function stop() {
    story = null;
    nav.hidden = true;
    setState('');
    bar.querySelectorAll('[data-story]').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
  }

  if (stories.length && nav && bar) {
    bar.hidden = false;
    document.querySelectorAll('[data-story-text]').forEach(function (d) { d.hidden = true; });
    bar.querySelectorAll('[data-story]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-story');
        story = stories.filter(function (x) { return x.id === id; })[0];
        if (!story) return;
        at = 0;
        bar.querySelectorAll('[data-story]').forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
        nav.hidden = false;
        show();
        next.focus();
      });
    });
    prev.addEventListener('click', function () {
      if (story && at > 0) { at--; show(); }
    });
    next.addEventListener('click', function () {
      if (!story) return;
      if (at < story.steps.length - 1) { at++; show(); return; }
      var done = story.label;
      stop();
      light([]);
      detail.name.textContent = done;
      detail.model.textContent = 'That’s the whole run';
      detail.why.textContent = 'Pick another one, or click anything in the rack.';
    });
  }

  // ---- picking a device ----
  function select(id) {
    var row = document.querySelector('[data-gear-row="' + id + '"]');
    if (!row) return;
    if (story) stop();
    detail.name.textContent = row.querySelector('th').textContent.trim();
    detail.model.textContent = row.querySelector('.model').textContent.trim();
    detail.why.textContent = row.querySelectorAll('td')[1].textContent.trim();
    light([id]);
    document.querySelectorAll('[data-gear-row]').forEach(function (r) {
      r.classList.toggle('on', r === row);
    });
  }

  document.querySelectorAll('[data-gear]').forEach(function (el) {
    var id = el.getAttribute('data-gear');
    el.addEventListener('click', function () { select(id); });
    if (el.tagName !== 'BUTTON') {
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          select(id);
        }
      });
    }
  });
})();

// Then and now: flip between the old server and the new one. Bars grow to match.
(function () {
  var box = document.querySelector('[data-cmp]');
  if (!box) return;
  var bar = box.querySelector('[data-cmp-bar]');
  var fills = box.querySelectorAll('.cmp-meter');
  box.classList.add('js');
  bar.hidden = false;

  function pick(which) {
    box.classList.toggle('show-now', which === 'now');
    box.classList.toggle('show-then', which === 'then');
    bar.querySelectorAll('[data-cmp-pick]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-cmp-pick') === which));
    });
    fills.forEach(function (m) {
      m.firstElementChild.style.width = m.getAttribute('data-' + which) + '%';
    });
  }

  bar.querySelectorAll('[data-cmp-pick]').forEach(function (b) {
    b.addEventListener('click', function () { pick(b.getAttribute('data-cmp-pick')); });
  });
  pick('now');
})();

// When it broke: one incident at a time, revealed a step at a time.
(function () {
  var tabs = document.querySelector('[data-inc-tabs]');
  var incs = document.querySelectorAll('[data-inc]');
  if (!tabs || !incs.length) return;
  document.querySelector('.incs').classList.add('js');
  tabs.hidden = false;

  incs.forEach(function (inc) {
    var steps = inc.querySelectorAll('.inc-steps li');
    var navEl = inc.querySelector('[data-inc-nav]');
    var cnt = inc.querySelector('[data-inc-count]');
    var back = inc.querySelector('[data-inc-prev]');
    var fwd = inc.querySelector('[data-inc-next]');
    var at = 0;
    navEl.hidden = false;

    function show() {
      steps.forEach(function (li, i) {
        li.classList.toggle('later', i > at);
        li.classList.toggle('now', i === at);
      });
      cnt.textContent = 'Step ' + (at + 1) + ' of ' + steps.length;
      back.disabled = at === 0;
      fwd.disabled = at === steps.length - 1;
    }
    inc.resetSteps = function () { at = 0; show(); };
    back.addEventListener('click', function () { if (at > 0) { at--; show(); } });
    fwd.addEventListener('click', function () { if (at < steps.length - 1) { at++; show(); } });
    show();
  });

  function pick(id) {
    incs.forEach(function (inc) {
      var on = inc.getAttribute('data-inc') === id;
      inc.hidden = !on;
      if (on) inc.resetSteps();
    });
    tabs.querySelectorAll('[data-inc-pick]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-inc-pick') === id));
    });
  }
  tabs.querySelectorAll('[data-inc-pick]').forEach(function (b) {
    b.addEventListener('click', function () { pick(b.getAttribute('data-inc-pick')); });
  });
  pick(incs[0].getAttribute('data-inc'));
})();

// "How a request gets in": a dot follows the route through the network diagram and
// ends in a check (allowed) or a cross (blocked). With reduced motion, the route just appears.
(function () {
  var bar = document.querySelector('[data-trace-bar]');
  var svg = document.querySelector('[data-zones]');
  var note = document.querySelector('[data-trace-note]');
  if (!bar || !svg || !note) return;
  bar.hidden = false;

  var NS = 'http://www.w3.org/2000/svg';
  var still = window.matchMedia('(prefers-reduced-motion: reduce)');
  var layer = null;
  var frame = 0;

  function el(name, attrs) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  function finish(end, ok) {
    var g = el('g', {});
    g.appendChild(el('circle', { cx: end.x, cy: end.y, r: 13, class: 'trace-end ' + (ok ? 'ok' : 'no') }));
    var d = ok
      ? 'M' + (end.x - 6) + ' ' + end.y + 'l4 5l8 -10'
      : 'M' + (end.x - 5) + ' ' + (end.y - 5) + 'l10 10m0 -10l-10 10';
    g.appendChild(el('path', { d: d, class: 'trace-mark' }));
    layer.appendChild(g);
  }

  function run(btn) {
    cancelAnimationFrame(frame);
    if (layer) layer.remove();
    var wrap = svg.parentElement;
    var narrow = wrap && wrap.scrollWidth > wrap.clientWidth;
    if (narrow) {
      wrap.scrollIntoView({ block: 'nearest', behavior: still.matches ? 'auto' : 'smooth' });
    }
    layer = el('g', { 'aria-hidden': 'true' });
    svg.appendChild(layer);

    bar.querySelectorAll('[data-trace]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b === btn));
    });
    var ok = btn.getAttribute('data-ok') === 'true';
    note.className = 'trace-note';
    note.textContent = '';

    var path = el('path', { d: btn.getAttribute('data-path'), class: 'trace-line' });
    layer.appendChild(path);
    var len = path.getTotalLength();
    var end = path.getPointAtLength(len);
    if (narrow) {
      var start = path.getPointAtLength(0);
      var mid = ((start.x + end.x) / 2 / 900) * svg.getBoundingClientRect().width;
      wrap.scrollTo({ left: mid - wrap.clientWidth / 2, behavior: still.matches ? 'auto' : 'smooth' });
    }

    function done() {
      finish(end, ok);
      note.className = 'trace-note ' + (ok ? 'ok' : 'no');
      note.textContent = btn.getAttribute('data-note');
    }

    if (still.matches) {
      done();
      return;
    }

    path.setAttribute('stroke-dasharray', len + ' ' + len);
    path.setAttribute('stroke-dashoffset', String(len));
    var dot = el('circle', { r: 8, class: 'trace-dot' });
    layer.appendChild(dot);
    var ms = Math.max(700, len * 3.2);
    var t0 = 0;

    function step(now) {
      if (!t0) t0 = now;
      var k = Math.min(1, (now - t0) / ms);
      var e = 1 - Math.pow(1 - k, 2);
      var p = path.getPointAtLength(len * e);
      dot.setAttribute('cx', String(p.x));
      dot.setAttribute('cy', String(p.y));
      path.setAttribute('stroke-dashoffset', String(len * (1 - e)));
      if (k < 1) {
        frame = requestAnimationFrame(step);
      } else {
        dot.remove();
        done();
      }
    }
    frame = requestAnimationFrame(step);
  }

  bar.querySelectorAll('[data-trace]').forEach(function (b) {
    b.addEventListener('click', function () { run(b); });
  });
})();
