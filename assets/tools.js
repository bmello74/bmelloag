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

  // ---- 2. field acreage ------------------------------------------------
  // Length x width and the pivot circle are plain geometry. The GPS corners
  // project each point onto a flat xy grid centred on the first corner, then
  // run the shoelace formula. Over anything field-sized that is good to about
  // a hundredth of a percent: a surveyed one-mile section comes out 639.94
  // against a true 640, which is tighter than anyone walks a boundary.
  var SQFT_PER_ACRE = 43560;
  var pts = [], mode = 'dim', lastAcres = NaN;

  function acreOut(sqft, perimFt) {
    var use = $('a-use');
    if (!isFinite(sqft) || sqft <= 0) {
      put('a-acres', '\u2014'); put('a-sqft', '\u2014');
      put('a-ha', '\u2014');    put('a-per', '\u2014');
      if (use) use.setAttribute('disabled', 'disabled');
      lastAcres = NaN;
      return;
    }
    var acres = sqft / SQFT_PER_ACRE;
    lastAcres = acres;
    put('a-acres', fmt(acres, acres < 10 ? 3 : 2) + ' ac');
    put('a-sqft', fmt(sqft, 0) + ' sq ft');
    put('a-ha', fmt(acres * 0.40468564224, 2) + ' ha');
    put('a-per', isFinite(perimFt)
        ? fmt(perimFt, 0) + ' ft  \u00b7  ' + fmt(perimFt / 5280, 2) + ' mi'
        : '\u2014');
    if (use) use.removeAttribute('disabled');
  }

  function gpsArea() {
    if (pts.length < 3) return null;
    var lat0 = pts[0].lat * Math.PI / 180;
    var kx = Math.cos(lat0) * 111320, ky = 110540;   // metres per degree
    var xy = pts.map(function (p) {
      return { x: (p.lng - pts[0].lng) * kx, y: (p.lat - pts[0].lat) * ky };
    });
    var a = 0, per = 0, i, j, dx, dy;
    for (i = 0; i < xy.length; i++) {
      j = (i + 1) % xy.length;
      a += xy[i].x * xy[j].y - xy[j].x * xy[i].y;
      dx = xy[j].x - xy[i].x; dy = xy[j].y - xy[i].y;
      per += Math.sqrt(dx * dx + dy * dy);
    }
    return { m2: Math.abs(a) / 2, perM: per };
  }

  function renderPts() {
    var list = $('a-list');
    if (list) {
      list.innerHTML = '';
      pts.forEach(function (p) {
        var li = document.createElement('li');
        li.textContent = p.lat.toFixed(6) + ', ' + p.lng.toFixed(6);
        list.appendChild(li);
      });
    }
    ['a-undo', 'a-clear'].forEach(function (id) {
      var b = $(id); if (!b) return;
      if (pts.length) b.removeAttribute('disabled');
      else b.setAttribute('disabled', 'disabled');
    });
    put('a-gpsnote', pts.length >= 3
      ? pts.length + ' corners \u2014 the shape closes back to the first one on its own.'
      : 'Add at least three corners. Drive or walk the boundary and tap Add my location at every turn.');
  }

  function calcAcres() {
    if (mode === 'dim') {
      var L = num('a-len'), W = num('a-wid');
      acreOut(L * W, 2 * (L + W));
    } else if (mode === 'pivot') {
      var r = num('a-rad'), sweep = num('a-sweep');
      if (!isFinite(sweep) || sweep <= 0) sweep = 360;
      if (sweep > 360) sweep = 360;
      var frac = sweep / 360;
      acreOut(Math.PI * r * r * frac,
              2 * Math.PI * r * frac + (sweep < 360 ? 2 * r : 0));
    } else {
      renderPts();
      var g = gpsArea();
      if (!g) { acreOut(NaN); return; }
      acreOut(g.m2 * 10.7639104167, g.perM * 3.280839895);
    }
  }

  function setMode(m) {
    mode = m;
    ['dim', 'pivot', 'gps'].forEach(function (k) {
      var pane = $('a-pane-' + k); if (pane) pane.hidden = (k !== m);
    });
    [].slice.call(document.querySelectorAll('.modebtn')).forEach(function (b) {
      var isOn = b.getAttribute('data-mode') === m;
      b.className = 'modebtn' + (isOn ? ' is-on' : '');
      b.setAttribute('aria-pressed', isOn ? 'true' : 'false');
    });
    calcAcres();
  }

  function initAcres() {
    if (!$('tool-acres')) return;
    on(['a-len', 'a-wid', 'a-rad', 'a-sweep'], calcAcres);

    [].slice.call(document.querySelectorAll('.modebtn')).forEach(function (b) {
      b.addEventListener('click', function () { setMode(b.getAttribute('data-mode')); });
    });

    var add = $('a-add'), field = $('a-pt');
    if (add) add.addEventListener('click', function () {
      var c = parseCoords(field ? field.value : '');
      if (!c) {
        put('a-gpsnote', 'That did not read as a latitude and longitude. Try 36.327500, -119.645700.');
        return;
      }
      pts.push(c);
      if (field) field.value = '';
      calcAcres();
    });
    if (field && add) field.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); add.click(); }
    });

    var here = $('a-here');
    if (here) {
      if (!navigator.geolocation) { here.style.display = 'none'; }
      here.addEventListener('click', function () {
        put('a-gpsnote', 'Getting your location\u2026');
        navigator.geolocation.getCurrentPosition(function (pos) {
          pts.push({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          calcAcres();
        }, function () {
          put('a-gpsnote', 'Could not get your location. Type the corner in instead.');
        }, { enableHighAccuracy: true, timeout: 10000 });
      });
    }

    var undo = $('a-undo');
    if (undo) undo.addEventListener('click', function () { pts.pop(); calcAcres(); });
    var clr = $('a-clear');
    if (clr) clr.addEventListener('click', function () { pts = []; calcAcres(); });

    // The acres you just worked out are almost always the acres the next
    // calculator wants, so hand them down instead of making anyone retype.
    var use = $('a-use');
    if (use) use.addEventListener('click', function () {
      if (!isFinite(lastAcres)) return;
      var f = $('r-acres'); if (!f) return;
      f.value = lastAcres.toFixed(2);
      calcRate();
      var card = $('tool-rate');
      if (card && card.scrollIntoView) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
      use.textContent = 'Sent down \u2193';
      setTimeout(function () { use.textContent = 'Use these acres below'; }, 1800);
    });

    setMode('dim');
  }

  // ---- 3. rate and acreage -------------------------------------------
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

  // ---- 4. solution grade and tank mix ---------------------------------
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
    initAcres();
    on(['r-acres', 'r-rate', 'r-n', 'r-p', 'r-k', 'r-have'], calcRate);
    on(['s-wpg', 's-pct', 's-gal', 's-target', 's-tank'], calcSol);
    calcRate(); calcSol();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();
