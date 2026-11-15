// The plaque: ten things to find around the site. Kept only in this browser
// (localStorage), never sent anywhere. Other scripts call window.mtFound(id);
// this file also listens for the simple ones itself (lamp, Mia, controller,
// dealing a Gameday card, picking a verse, opening Work or the Lab).
(function () {
  var KEY = 'miketaps-found';
  var LIST = [
    { id: 'lamp', title: 'Lights on', done: 'Flipped the desk lamp.', hint: 'Something on the desk clicks.' },
    { id: 'mia', title: 'Good girl', done: 'Gave Mia a treat.', hint: 'Someone by the lamp is waiting.' },
    { id: 'pennant', title: 'Gameday', done: 'Dealt a history card.', hint: 'Hail to the wall.' },
    { id: 'word', title: 'Read slowly', done: 'Picked a verse.', hint: 'One book on the shelf is different.' },
    { id: 'work', title: 'whoami', done: 'Opened the work.', hint: 'The screen is still on.' },
    { id: 'lab', title: 'Under the hood', done: 'Looked around the lab.', hint: 'Lights blink by the desk.' },
    { id: 'clip', title: 'Player 2', done: 'Played a clip on the monitor.', hint: 'The controller is not just for show.' },
    { id: 'stripe', title: 'Stripe earned', done: 'Came back and earned a belt stripe.', hint: 'Visit again another day.' },
    { id: 'dawn', title: 'Early riser', done: 'Caught the sunrise in the window.', hint: 'Come by early.' },
    { id: 'night', title: 'Night owl', done: 'Saw the stars in the window.', hint: 'Come by late.' },
    { id: 'backroom', secret: true, title: 'Tapped in', done: 'Found the back room.', hint: 'Some pages have more to say than they show.', where: 'the back room' },
    { id: 'wristlock', secret: true, title: 'Slap and bump', done: 'Offered the wrong guy a handshake.', hint: 'Someone on The Mat wants to shake hands.', where: 'The Mat' }
  ];
  var known = {};
  LIST.forEach(function (a) { known[a.id] = a; });
  var MAIN = LIST.filter(function (a) { return !a.secret; }).length;

  function load() {
    try {
      var v = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(v) ? v.filter(function (id) { return known[id]; }) : [];
    } catch (e) {
      return [];
    }
  }
  function save(have) {
    try { localStorage.setItem(KEY, JSON.stringify(have)); return true; } catch (e) { return false; }
  }

  // The "found" message, bottom left. One at a time; extras wait their turn.
  var queue = [];
  var box = null;
  var showing = false;
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }
  // Small stroke icons built as DOM nodes (no HTML strings anywhere in the site's scripts).
  function icon(d, box, size, width) {
    var NS = 'http://www.w3.org/2000/svg';
    var s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 ' + box + ' ' + box);
    s.setAttribute('width', size);
    s.setAttribute('height', size);
    s.setAttribute('aria-hidden', 'true');
    var p = document.createElementNS(NS, 'path');
    p.setAttribute('d', d);
    p.setAttribute('fill', 'none');
    p.setAttribute('stroke', 'currentColor');
    p.setAttribute('stroke-width', width);
    p.setAttribute('stroke-linecap', 'round');
    p.setAttribute('stroke-linejoin', 'round');
    s.appendChild(p);
    return s;
  }

  function next() {
    if (showing || !queue.length) return;
    showing = true;
    var a = queue.shift();
    if (!box) {
      box = el('div', 'found-toast');
      box.setAttribute('role', 'status');
      box.setAttribute('aria-live', 'polite');
      document.body.appendChild(box);
    }
    box.textContent = '';
    var badge = el('span', 'found-badge');
    badge.setAttribute('aria-hidden', 'true');
    badge.appendChild(icon('M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3', 24, 18, 2));
    var text = el('span', 'found-text');
    text.appendChild(el('span', 'found-eyebrow', a.secret ? 'Secret found \u00b7 ' + a.where : 'Found on the plaque · ' + a.count + '/' + MAIN));
    text.appendChild(el('span', 'found-title', a.title));
    text.appendChild(el('span', 'found-line', a.done));
    box.appendChild(badge);
    box.appendChild(text);
    box.classList.remove('is-out');
    void box.offsetWidth;
    box.classList.add('is-in');
    setTimeout(function () {
      box.classList.remove('is-in');
      box.classList.add('is-out');
      setTimeout(function () { showing = false; next(); }, 400);
    }, 4200);
  }

  function found(id) {
    if (!known[id]) return;
    var have = load();
    if (have.indexOf(id) !== -1) return;
    have.push(id);
    if (!save(have)) return;
    var count = have.filter(function (h) { return !known[h].secret; }).length;
    queue.push({ title: known[id].title, done: known[id].done, count: count, secret: !!known[id].secret, where: known[id].where });
    document.dispatchEvent(new CustomEvent('miketaps:found', { detail: id }));
    if (document.body) next();
    else document.addEventListener('DOMContentLoaded', next);
  }

  window.mtFound = found;
  window.mtPlaque = {
    list: LIST,
    have: load,
    icon: icon,
    reset: function () {
      try { localStorage.removeItem(KEY); } catch (e) {}
      document.dispatchEvent(new CustomEvent('miketaps:found', { detail: null }));
    }
  };

  // The simple ones: clicks (or Enter/Space on the room's button-like objects).
  var hooks = [
    ['[data-lamp]', 'lamp'],
    ['[data-mia]', 'mia'],
    ['[data-tv-remote]', 'clip'],
    ['[data-deal]', 'pennant'],
    ['[data-mood], [data-another]', 'word']
  ];
  function check(target) {
    if (!target || !target.closest) return;
    hooks.forEach(function (h) { if (target.closest(h[0])) found(h[1]); });
  }
  document.addEventListener('click', function (e) { check(e.target); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' || e.key === ' ') check(e.target);
  });

  // Opening Work or the Lab counts on arrival.
  var path = location.pathname;
  if (path.indexOf('/work/') === 0) found('work');
  if (path.indexOf('/lab/') === 0) found('lab');
})();
