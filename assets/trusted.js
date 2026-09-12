(function () {
  'use strict';
  var links = [].slice.call(document.querySelectorAll('a.flyer'));
  if (!links.length) return;

  var box = null, img = null, lastFocus = null;

  function build() {
    box = document.createElement('div');
    box.className = 'lbox';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', 'Enlarged flyer');
    box.hidden = true;
    img = document.createElement('img');
    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'lclose';
    close.setAttribute('aria-label', 'Close');
    close.innerHTML = '&times;';
    box.appendChild(img);
    box.appendChild(close);
    document.body.appendChild(box);

    // Click the backdrop or the button to leave. Clicking the picture itself
    // does nothing, because that is where a thumb lands while pinching.
    box.addEventListener('click', function (ev) {
      if (ev.target === box || ev.target === close) hide();
    });
    document.addEventListener('keydown', function (ev) {
      if (!box.hidden && (ev.key === 'Escape' || ev.key === 'Esc')) hide();
    });
  }

  function show(href, alt) {
    if (!box) build();
    lastFocus = document.activeElement;
    img.src = href;
    img.alt = alt || '';
    box.hidden = false;
    document.body.style.overflow = 'hidden';
    box.querySelector('.lclose').focus();
  }

  function hide() {
    box.hidden = true;
    img.removeAttribute('src');
    document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  links.forEach(function (a) {
    a.addEventListener('click', function (ev) {
      // Leave the modified clicks alone -- somebody asking for a new tab
      // should get one.
      if (ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button !== 0) return;
      ev.preventDefault();
      var thumb = a.querySelector('img');
      show(a.getAttribute('href'), thumb ? thumb.getAttribute('alt') : '');
    });
  });
})();
