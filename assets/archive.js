(function () {
  var items  = [].slice.call(document.querySelectorAll('.issue'));
  var breaks = [].slice.call(document.querySelectorAll('.monthbreak'));
  var chips  = [].slice.call(document.querySelectorAll('.chip'));
  var q = document.getElementById('q');
  var tally = document.getElementById('tally');
  var empty = document.getElementById('empty');
  var filter = 'all';

  chips.forEach(function (c) {
    var k = c.getAttribute('data-f');
    var n = k === 'all' ? items.length
          : items.filter(function (i) { return i.getAttribute('data-series') === k; }).length;
    var ct = c.querySelector('.ct'); if (ct) ct.textContent = n;
  });

  function apply() {
    var term = q.value.trim().toLowerCase();
    var shown = 0;
    items.forEach(function (i) {
      var okS = filter === 'all' || i.getAttribute('data-series') === filter;
      var okT = !term || i.getAttribute('data-hay').indexOf(term) !== -1;
      var on = okS && okT;
      i.classList.toggle('hide', !on);
      if (on) shown++;
    });
    breaks.forEach(function (b) {
      var el = b.nextElementSibling, any = false;
      while (el && !el.classList.contains('monthbreak')) {
        if (el.classList.contains('issue') && !el.classList.contains('hide')) { any = true; break; }
        el = el.nextElementSibling;
      }
      b.classList.toggle('hide', !any);
    });
    tally.textContent = shown + (shown === 1 ? ' issue' : ' issues');
    empty.classList.toggle('show', shown === 0);
  }

  chips.forEach(function (c) {
    c.addEventListener('click', function () {
      chips.forEach(function (x) { x.classList.remove('on'); });
      c.classList.add('on');
      filter = c.getAttribute('data-f');
      apply();
    });
  });
  q.addEventListener('input', apply);
  apply();
})();
