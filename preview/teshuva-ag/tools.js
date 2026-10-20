// Teshuva Ag product calculators
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var num = function (id) { var v = parseFloat($(id).value); return isFinite(v) && v > 0 ? v : 0; };
  var fmt = function (n, d) {
    return n.toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
  };
  var out = function (key, text) {
    var el = document.querySelector('[data-out="' + key + '"]');
    if (el) el.textContent = text;
  };
  var quoteLink = function (key, params) {
    var a = document.querySelector('[data-quote="' + key + '"]');
    if (a) a.href = 'quote.html?' + new URLSearchParams(params).toString();
  };

  // FPE+ program planner
  function fpe() {
    var acres = num('fpe-acres'), rate = parseFloat($('fpe-rate').value), apps = Math.round(num('fpe-apps'));
    var per = acres * rate, total = per * apps;
    out('fpe-total', fmt(total, total < 10 ? 1 : 0));
    out('fpe-per', fmt(per, 1) + ' gal');
    out('fpe-buckets', fmt(Math.ceil(total / 5)));
    out('fpe-jugs', fmt(Math.ceil(total / 2.5)));
    out('fpe-note', total >= 100
      ? 'At this volume, tote pricing gives the lowest cost per gallon. Ask Eddie about tote delivery.'
      : 'Smaller programs fit in 5 gal buckets or 2.5 gal jugs. Tote pricing is lower per gallon for bigger programs.');
    var picks = Array.prototype.map.call(document.querySelectorAll('input[name="fpe"]:checked'), function (b) { return b.value; });
    var rateTxt = $('fpe-rate').options[$('fpe-rate').selectedIndex].text;
    quoteLink('fpe', {
      product: 'FPE+',
      acres: fmt(acres, acres % 1 ? 1 : 0),
      note: 'FPE+ program planner: ' + rateTxt + ' per acre, ' + apps + ' applications (' + $('fpe-method').value +
        '), about ' + fmt(total, total < 10 ? 1 : 0) + ' gallons for the season.' + (picks.length ? ' Products: ' + picks.join(', ') + '.' : '')
    });
  }

  // Biochar rate planner
  var soilNotes = {
    coarse: 'Sandy ground is where biochar pays best. Published research shows about 45% more plant-available water in coarse soils.',
    medium: 'Published research shows about 21% more plant-available water in medium-textured soils.',
    fine: 'Gains are smallest in clay ground, about 14% more plant-available water in published research. Talk with Eddie before committing; he will tell you straight if your ground is a good fit.'
  };
  function biochar() {
    var acres = num('bc-acres'), yd = parseFloat($('bc-rate').value), years = parseInt($('bc-years').value, 10);
    var tonsPerAcre = yd * 330 / 2000;
    var ydApp = acres * yd, tonsApp = acres * tonsPerAcre;
    var build = tonsPerAcre * years;
    out('bc-yards', fmt(ydApp));
    out('bc-tons', fmt(tonsApp, 1) + ' tons (' + fmt(tonsPerAcre, 2) + ' per acre)');
    out('bc-total', fmt(ydApp * years) + ' yd, about ' + fmt(tonsApp * years, 1) + ' tons');
    out('bc-build', fmt(build, 1) + ' tons per acre' + (build >= 1 && build <= 6 ? ', inside the Healthy Soils range of 1 to 6' : ''));
    out('bc-note', soilNotes[$('bc-soil').value]);
    quoteLink('biochar', {
      product: 'Biochar',
      acres: fmt(acres, acres % 1 ? 1 : 0),
      note: 'Biochar rate planner: ' + yd + ' yd per acre for ' + years + ' year' + (years > 1 ? 's' : '') + ' (' +
        fmt(ydApp) + ' yd per application). Soil: ' + $('bc-soil').options[$('bc-soil').selectedIndex].text +
        '. Applied as: ' + $('bc-mode').value + '.'
    });
  }

  // RSTC 17 nitrogen trim
  var LB_PER_GAL = 11.06, N_SHARE = 0.32;
  function rstc() {
    var acres = num('rs-acres'), uan = num('rs-uan'), price = num('rs-price');
    var trim = $('rs-plan').value === 'trim';
    var appliedPerAcre = uan * (trim ? 0.75 : 1);
    var applied = appliedPerAcre * acres;
    var saved = trim ? uan * 0.25 * acres : 0;
    var pricePerGal = price / 2000 * LB_PER_GAL;
    var rstcGal = applied / 128;
    out('rs-gal', fmt(rstcGal, 1));
    out('rs-applied', fmt(applied) + ' gal (' + fmt(appliedPerAcre, 1) + ' per acre)');
    out('rs-saved', trim ? fmt(saved) + ' gal, ' + fmt(saved * LB_PER_GAL * N_SHARE) + ' lb N' : 'None, full rate');
    out('rs-dollars', '$' + fmt(saved * pricePerGal));
    out('rs-note', trim
      ? 'In the trial, the 75% N plus RSTC 17 plots were statistically equal in yield to full-rate N. Cutting N without RSTC 17 gave the lowest yield.'
      : 'In the trial, 100% N plus RSTC 17 gave the highest kernel yield, 294 lb per acre more than 100% N alone.');
    quoteLink('rstc', {
      product: 'RSTC 17',
      acres: fmt(acres, acres % 1 ? 1 : 0),
      crop: $('rs-crop').value,
      note: 'RSTC 17 nitrogen trim: ' + fmt(uan, 1) + ' gal UAN-32 per acre, plan: ' +
        (trim ? 'trim 25% and add RSTC 17' : 'full UAN-32 plus RSTC 17') + '. About ' + fmt(rstcGal, 1) + ' gal RSTC 17 needed.'
    });
  }

  var calcs = { fpe: fpe, biochar: biochar, rstc: rstc };
  document.querySelectorAll('form[data-calc]').forEach(function (f) {
    var run = calcs[f.getAttribute('data-calc')];
    f.addEventListener('input', run);
    f.addEventListener('change', run);
    f.addEventListener('submit', function (e) { e.preventDefault(); });
    run();
  });
})();
