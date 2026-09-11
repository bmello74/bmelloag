(function () {
  'use strict';

  // ---- helpers -------------------------------------------------------
  var $ = function (id) { return document.getElementById(id); };
  function num(id) {
    var el = $(id); if (!el) return NaN;
    var v = parseFloat(String(el.value).replace(/,/g, '').trim());
    return isFinite(v) ? v : NaN;
  }
  function put(id, text) { var el = $(id); if (el) el.textContent = text; }
  function fmt(n, dp) {
    if (!isFinite(n)) return '\u2014';
    dp = (dp === undefined) ? 2 : dp;
    return n.toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp });
  }
  function on(ids, fn) {
    ids.forEach(function (id) {
      var el = $(id);
      if (el) { el.addEventListener('input', fn); el.addEventListener('change', fn); }
    });
  }

  // ---- 1. field point QR ---------------------------------------------
  // Accepts '36.3275, -119.6457', '36.3275 -119.6457', or with N/S/E/W.
  function parseCoords(raw) {
    if (!raw) return null;
    var t = raw.trim().replace(/[()]/g, ' ');
    var hemi = t.toUpperCase();
    var nums = t.match(/-?\d+(?:\.\d+)?/g);
    if (!nums || nums.length < 2) return null;
    var lat = parseFloat(nums[0]), lng = parseFloat(nums[1]);
    if (/S/.test(hemi) && lat > 0) lat = -lat;
    if (/W/.test(hemi) && lng > 0) lng = -lng;
    if (!isFinite(lat) || !isFinite(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    return { lat: lat, lng: lng };
  }

  var lastPng = null;

  function drawQR() {
    var box = $('qr-canvas-wrap'); if (!box) return;
    var c = parseCoords($('qr-coords') ? $('qr-coords').value : '');
    var note = $('qr-note'), link = $('qr-link'), dl = $('qr-download'), cp = $('qr-copy');
    if (!c) {
      box.innerHTML = '<span class="qrempty">Your code appears here</span>';
      put('qr-note', 'Paste a latitude and longitude, or tap Use my location.');
      if (link) { link.textContent = ''; link.removeAttribute('href'); }
      if (dl) dl.setAttribute('disabled', 'disabled');
      if (cp) cp.setAttribute('disabled', 'disabled');
      lastPng = null;
      return;
    }
    var lat = c.lat.toFixed(6), lng = c.lng.toFixed(6);
    var url = 'https://www.google.com/maps/search/?api=1&query=' + lat + ',' + lng;

    if (typeof qrcode !== 'function') {
      put('qr-note', 'The code generator did not load. Refresh the page and try again.');
      return;
    }
    var q = qrcode(0, 'M');
    if (qrcode.stringToBytesFuncs && qrcode.stringToBytesFuncs['UTF-8']) {
      qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
    }
    q.addData(url, 'Byte');
    q.make();

    var n = q.getModuleCount(), quiet = 4, scale = 8, size = (n + quiet * 2) * scale;
    var cv = document.createElement('canvas');
    cv.width = cv.height = size;
    cv.style.width = '100%';
    cv.style.maxWidth = '260px';
    cv.style.height = 'auto';
    cv.setAttribute('role', 'img');
    cv.setAttribute('aria-label', 'QR code for ' + lat + ', ' + lng);
    var g = cv.getContext('2d');
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, size, size);
    g.fillStyle = '#000000';
    for (var r = 0; r < n; r++) {
      for (var col = 0; col < n; col++) {
        if (q.isDark(r, col)) g.fillRect((col + quiet) * scale, (r + quiet) * scale, scale, scale);
      }
    }
    box.innerHTML = '';
    box.appendChild(cv);
    try { lastPng = cv.toDataURL('image/png'); } catch (e) { lastPng = null; }

    var label = $('qr-label') && $('qr-label').value.trim();
    put('qr-note', (label ? label + ' \u2014 ' : '') + lat + ', ' + lng +
        '  \u00b7  ' + n + '\u00d7' + n + ' modules');
    if (link) { link.textContent = url; link.setAttribute('href', url); }
    if (dl) dl.removeAttribute('disabled');
    if (cp) cp.removeAttribute('disabled');
  }

  function initQR() {
    if (!$('qr-coords')) return;
    on(['qr-coords', 'qr-label'], drawQR);

    var loc = $('qr-locate');
    if (loc) {
      if (!navigator.geolocation) { loc.style.display = 'none'; }
      loc.addEventListener('click', function () {
        put('qr-note', 'Getting your location\u2026');
        navigator.geolocation.getCurrentPosition(function (pos) {
          $('qr-coords').value = pos.coords.latitude.toFixed(6) + ', ' + pos.coords.longitude.toFixed(6);
          drawQR();
        }, function () {
          put('qr-note', 'Could not get your location. Type the coordinates instead.');
        }, { enableHighAccuracy: true, timeout: 10000 });
      });
    }

    var dl = $('qr-download');
    if (dl) dl.addEventListener('click', function () {
      if (!lastPng) return;
      var label = ($('qr-label') && $('qr-label').value.trim()) || 'field-point';
      var a = document.createElement('a');
      a.href = lastPng;
      a.download = label.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') + '-qr.png';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    });

    var cp = $('qr-copy');
    if (cp) cp.addEventListener('click', function () {
      var link = $('qr-link'); if (!link || !link.textContent) return;
      var done = function () { cp.textContent = 'Copied'; setTimeout(function () { cp.textContent = 'Copy link'; }, 1600); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(link.textContent).then(done, function () {});
      }
    });
    drawQR();
  }

  // ---- 2. rate and acreage -------------------------------------------
  function calcRate() {
    var acres = num('r-acres'), rate = num('r-rate');
    var lbs = acres * rate;
    put('r-lbs', fmt(lbs, 0) + ' lb');
    put('r-tons', fmt(lbs / 2000, 2) + ' tons');

    var n = num('r-n'), p2 = num('r-p'), k = num('r-k');
    put('r-un', isFinite(rate * n) ? fmt(rate * n / 100, 1) + ' lb N/ac' : '\u2014');
    put('r-up', isFinite(rate * p2) ? fmt(rate * p2 / 100, 1) + ' lb P\u2082O\u2085/ac' : '\u2014');
    put('r-uk', isFinite(rate * k) ? fmt(rate * k / 100, 1) + ' lb K\u2082O/ac' : '\u2014');

    var have = num('r-have');
    put('r-cover', isFinite(have * 2000 / rate) ? fmt(have * 2000 / rate, 1) + ' acres' : '\u2014');
  }

  // ---- 3. solution grade and tank mix ---------------------------------
  function calcSol() {
    var wpg = num('s-wpg'), pct = num('s-pct');
    var lbPerGal = wpg * pct / 100;
    put('s-lbgal', isFinite(lbPerGal) ? fmt(lbPerGal, 2) + ' lb nutrient/gal' : '\u2014');

    var gal = num('s-gal');
    put('s-galprod', isFinite(gal * wpg) ? fmt(gal * wpg, 0) + ' lb product' : '\u2014');
    put('s-galnut', isFinite(gal * lbPerGal) ? fmt(gal * lbPerGal, 1) + ' lb nutrient' : '\u2014');

    var target = num('s-target');
    var galPerAcre = target / lbPerGal;
    put('s-gpa', isFinite(galPerAcre) ? fmt(galPerAcre, 2) + ' gal/ac' : '\u2014');

    var tank = num('s-tank');
    put('s-acres', isFinite(tank / galPerAcre) ? fmt(tank / galPerAcre, 1) + ' acres per tank' : '\u2014');
  }

  function init() {
    initQR();
    on(['r-acres', 'r-rate', 'r-n', 'r-p', 'r-k', 'r-have'], calcRate);
    on(['s-wpg', 's-pct', 's-gal', 's-target', 's-tank'], calcSol);
    calcRate(); calcSol();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();
