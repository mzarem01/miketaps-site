// The back room puzzle, homepage half: the desk terminal and the knock on the rack.
// It is all a game. The "files" are strings in this script and nothing here talks to the server.
// The trail: page source comment -> terminal -> Base64 note -> knock on the UPS -> ROT13 flag -> /backroom/
(function () {
  var scene = document.querySelector('.scene');
  var term = document.querySelector('[data-term]');
  if (!scene || !term) return;
  var out = term.querySelector('[data-term-out]');
  var form = term.querySelector('[data-term-form]');
  var input = term.querySelector('[data-term-in]');
  var NOTE = 'dGhlIHJhY2sgaGFzIGEgYmFjayBkb29yLiBrbm9jayB0aHJlZSB0aW1lcy4=';
  var lastArrow = 0;
  var tv = document.querySelector('[data-tv]');
  // On phones (or narrow windows) the terminal opens as a full-width panel at the top of the screen.
  var narrow = window.matchMedia('(max-width: 700px), (pointer: coarse)');
  var home = term.parentNode;
  var homeNext = term.nextSibling;

  function print(text, cls) {
    var d = document.createElement('div');
    if (cls) d.className = cls;
    d.textContent = text;
    out.appendChild(d);
    while (out.children.length > 40) out.removeChild(out.firstChild);
  }

  function open() {
    if (term.hidden) {
      if (narrow.matches) {
        document.body.appendChild(term);
        term.classList.add('term-sheet');
      }
      term.hidden = false;
      // The terminal and the TV share the monitor: tell the TV to switch off (scene.js).
      document.dispatchEvent(new CustomEvent('miketaps:terminal'));
      if (!out.children.length) {
        print('workshop terminal v0.1');
        print('the lights are on but mike is out.');
        print('type help to look around.');
      }
    }
    input.focus({ preventScroll: true });
  }

  function close() {
    term.hidden = true;
    input.blur();
    if (term.classList.contains('term-sheet')) {
      term.classList.remove('term-sheet');
      home.insertBefore(term, homeNext);
    }
  }

  var closeBtn = term.querySelector('[data-term-close]');
  if (closeBtn) closeBtn.addEventListener('click', close);

  function run(raw) {
    var cmd = raw.trim();
    if (!cmd) return;
    var c = cmd.toLowerCase().replace(/\s+/g, ' ');
    print('guest@workshop:~$ ' + cmd, 'cmd');
    if (c === 'clear') { out.textContent = ''; return; }
    if (c === 'exit' || c === 'logout') { print('bye.'); setTimeout(close, 400); return; }
    if (c === 'help') { print('commands: ls, cat <file>, whoami, hint, clear, exit'); return; }
    if (c === 'ls' || c === 'ls -la' || c === 'ls -a') { print('note.txt  readme.md'); return; }
    if (c === 'cat note.txt') { print(NOTE); return; }
    if (c === 'cat readme.md') { print('nothing to see here. probably.'); return; }
    if (c === 'whoami') { print('guest. mike is out on the mat.'); return; }
    if (c === 'hint') {
      print('the note ends in =. that usually means base64.');
      print('if something tells you to knock, you can knock from here too: knock rack');
      return;
    }
    if (c === 'knock rack' || c === 'knock ups') { knock(); print(knocks >= 3 ? 'something slid out of the rack.' : 'knock.'); return; }
    if (c.indexOf('sudo') === 0) { print('nice try. this incident will be reported. (it will not.)'); return; }
    if (c.indexOf('cat ') === 0) { print('cat: ' + cmd.slice(4) + ': no such file'); return; }
    print('command not found: ' + cmd + '. try help');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    run(input.value);
    input.value = '';
  });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') close();
  });

  // "start typing": a letter key anywhere on the homepage wakes the terminal,
  // unless someone is mid Konami code (arrows) or typing in a real field.
  function sceneVisible() {
    var r = scene.getBoundingClientRect();
    return r.bottom > 0 && r.top < window.innerHeight;
  }
  window.addEventListener('keydown', function (e) {
    if (e.key && e.key.indexOf('Arrow') === 0) { lastArrow = Date.now(); return; }
    if (!term.hidden || e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
    var t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    if (!/^[a-z]$/i.test(e.key) || Date.now() - lastArrow < 2500 || !sceneVisible()) return;
    // Typing while a clip is playing leaves the TV alone; the keyboard on the desk still switches over.
    if (tv && !tv.hidden) return;
    open();
  });

  // Pressing the controller hands the monitor back to the TV.
  var remote = document.querySelector('[data-tv-remote]');
  if (remote) {
    remote.addEventListener('click', close);
    remote.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') close();
    });
  }

  // The keyboard on the desk does the same (phones have no keys to press).
  // So does the sticky note by the monitor.
  document.querySelectorAll('[data-term-key]').forEach(function (key) {
    key.addEventListener('click', open);
    key.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
    });
  });

  // The rack's back door: knock on the UPS three times.
  var ups = document.querySelector('[data-ups]');
  var note = document.querySelector('[data-rack-note]');
  var knocks = 0;
  function knock() {
    knocks += 1;
    if (ups) {
      ups.classList.remove('knock');
      void ups.getBoundingClientRect();
      ups.classList.add('knock');
    }
    if (knocks >= 3 && note && note.hidden) {
      scene.setAttribute('data-knocked', '');
      note.hidden = false;
    }
  }
  if (ups) {
    // The UPS sits inside the rack's link, so stop the click from opening the Lab.
    ups.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      knock();
    });
  }
  var shut = document.querySelector('[data-rack-note-close]');
  if (shut && note) {
    shut.addEventListener('click', function () {
      note.hidden = true;
      knocks = 0;
      scene.removeAttribute('data-knocked');
    });
  }
})();
