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
  }

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
