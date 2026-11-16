// Site-wide behavior: the lamp (light/dark switch) and a few small extras.
(function () {
  var root = document.documentElement;

  function currentTheme() {
    if (root.dataset.theme) return root.dataset.theme;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function syncLamps() {
    var on = currentTheme() === 'light';
    document.querySelectorAll('[data-lamp]').forEach(function (el) {
      el.setAttribute('aria-pressed', on ? 'true' : 'false');
      el.setAttribute('aria-label', on ? 'Turn the lamp off (dark mode)' : 'Turn the lamp on (light mode)');
      var tip = el.querySelector('[data-lamp-tip]');
      if (tip) tip.textContent = on ? 'click to turn it off' : 'click to turn it on';
    });
  }

  function toggle() {
    var next = currentTheme() === 'light' ? 'dark' : 'light';
    root.dataset.theme = next;
    try {
      localStorage.setItem('miketaps-theme', next);
    } catch (e) {}
    syncLamps();
  }

  document.querySelectorAll('[data-lamp]').forEach(function (el) {
    el.addEventListener('click', toggle);
    if (el.tagName !== 'BUTTON') {
      el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle();
        }
      });
    }
  });
  syncLamps();

  // Email links: the address is put together here so it isn't sitting in the page for
  // spam scrapers. Without JavaScript the link text still reads "hello [at] miketaps.com".
  document.querySelectorAll('a[data-mail][data-host]').forEach(function (el) {
    var addr = el.dataset.mail + '@' + el.dataset.host;
    el.href = 'mailto:' + addr;
    el.textContent = addr;
  });

  // The controller on the desk: a little wiggle, nothing more (yet).
  document.querySelectorAll('[data-wiggle]').forEach(function (el) {
    function go() {
      el.classList.remove('is-wiggling');
      void el.getBoundingClientRect();
      el.classList.add('is-wiggling');
    }
    el.addEventListener('click', go);
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        go();
      }
    });
  });

  // Konami code: the monogram goes 8-bit for a few seconds.
  var seq = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  var pos = 0;
  window.addEventListener('keydown', function (e) {
    var key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    pos = key === seq[pos] ? pos + 1 : key === seq[0] ? 1 : 0;
    if (pos === seq.length) {
      pos = 0;
      root.classList.add('eight-bit');
      setTimeout(function () {
        root.classList.remove('eight-bit');
      }, 6000);
    }
  });
})();
