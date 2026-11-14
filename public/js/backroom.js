// The back room door. The flag is checked against its SHA-256 fingerprint,
// so the answer is not written anywhere on this page. Nothing is sent anywhere.
(function () {
  var HASH = '6b050f82b1327e70cee86ad99340817372bf3f8d4e6fb4f0c6cf48e24b69f4e1';
  var form = document.querySelector('[data-flag-form]');
  var input = document.querySelector('[data-flag]');
  var reply = document.querySelector('[data-reply]');
  var locked = document.querySelector('[data-locked]');
  var opened = document.querySelector('[data-open]');
  if (!form || !input || !locked || !opened) return;
  var replies = [
    'Nope. The door does not budge.',
    'Still locked. Did you turn it back 13 places?',
    'The door is patient. The note on the rack is the key.',
    'Close is not a thing doors understand.'
  ];
  var tries = 0;

  function unlock(fresh) {
    locked.hidden = true;
    opened.hidden = false;
    if (!fresh) return;
    if (window.mtFound) window.mtFound('backroom');
    var h = opened.querySelector('h1');
    if (h) { h.setAttribute('tabindex', '-1'); h.focus(); }
  }

  try {
    if (window.mtPlaque && window.mtPlaque.have().indexOf('backroom') !== -1) unlock(false);
  } catch (e) {}

  function hex(buf) {
    return Array.prototype.map.call(new Uint8Array(buf), function (b) {
      return ('0' + b.toString(16)).slice(-2);
    }).join('');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var v = input.value.trim();
    if (!v) return;
    if (!window.crypto || !crypto.subtle) {
      reply.textContent = 'This lock only works over a secure connection.';
      return;
    }
    crypto.subtle.digest('SHA-256', new TextEncoder().encode(v)).then(function (buf) {
      if (hex(buf) === HASH) {
        unlock(true);
      } else {
        tries += 1;
        reply.textContent = replies[(tries - 1) % replies.length];
        input.value = '';
      }
    });
  });
})();
