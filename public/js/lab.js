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
(function () {
  var detail = {
    name: document.querySelector('[data-g-name]'),
    model: document.querySelector('[data-g-model]'),
    why: document.querySelector('[data-g-why]'),
  };
  if (!detail.name) return;

  function select(id) {
    var row = document.querySelector('[data-gear-row="' + id + '"]');
    if (!row) return;
    detail.name.textContent = row.querySelector('th').textContent.trim();
    detail.model.textContent = row.querySelector('.model').textContent.trim();
    detail.why.textContent = row.querySelectorAll('td')[1].textContent.trim();
    document.querySelectorAll('.gear').forEach(function (g) {
      g.classList.toggle('on', g.getAttribute('data-gear') === id);
    });
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
