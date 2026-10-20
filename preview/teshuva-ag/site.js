/* ------------------------------------------------------------------
   FORM DELIVERY SETTINGS
   Leave endpoint empty and forms open the visitor's email app.
   To have requests land in Eddie's inbox automatically, paste the
   endpoint from a form service here:
     Formspree:  endpoint: "https://formspree.io/f/XXXXXXX"
     Web3Forms:  endpoint: "https://api.web3forms.com/submit", accessKey: "your-key"
   ------------------------------------------------------------------ */
window.TESHUVA_FORMS = {
  endpoint: "",
  accessKey: "",
  toEmail: "info@teshag.com",
  phone: "(559) 904-7689"
};

// Mobile menu and footer year
(function () {
  var btn = document.querySelector('.menu-toggle');
  var nav = document.getElementById('nav');
  if (btn && nav) {
    btn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }
  var yr = document.getElementById('yr');
  if (yr) yr.textContent = new Date().getFullYear();
})();

// Prefill a form from the page address (used by product buttons and calculators)
(function () {
  var form = document.querySelector('form[data-form]');
  if (!form) return;
  var q = new URLSearchParams(window.location.search);
  var products = (q.get('product') || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  form.querySelectorAll('input[name="product"], input[name="interest"]').forEach(function (box) {
    if (products.indexOf(box.value) !== -1) box.checked = true;
  });
  var set = function (name, val) {
    var el = form.querySelector('[name="' + name + '"]');
    if (el && val && !el.value) el.value = val;
  };
  set('acres', q.get('acres'));
  set('crop', q.get('crop'));
  set('message', q.get('note'));
})();

// Send any form marked data-form
(function () {
  var cfg = window.TESHUVA_FORMS;
  document.querySelectorAll('form[data-form]').forEach(function (form) {
    var hint = form.querySelector('.form-hint');
    var status = form.querySelector('.form-status');
    if (hint) {
      hint.textContent = cfg.endpoint
        ? 'Your message goes straight to Eddie. He usually replies within one business day.'
        : 'This opens your email app with everything filled in, addressed to ' + cfg.toEmail + '.';
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var fd = new FormData(form);
      var data = {};
      fd.forEach(function (val, key) {
        val = String(val).trim();
        if (!val) return;
        data[key] = data[key] ? data[key] + ', ' + val : val;
      });

      if (!data.name || (!data.phone && !data.email)) {
        status.className = 'form-status error';
        status.textContent = 'Add your name and a phone number or email so Eddie can reach you.';
        return;
      }

      var formName = form.getAttribute('data-form');
      var subject = formName + ': ' + data.name + (data.farm ? ' (' + data.farm + ')' : '');
      var labels = {
        name: 'Name', farm: 'Farm or company', phone: 'Phone', email: 'Email', location: 'Location',
        crop: 'Crop', acres: 'Acres', product: 'Products', interest: 'Interested in',
        contact_by: 'Best way to reach', heard_from: 'Heard about us from', message: 'Message'
      };

      if (!cfg.endpoint) {
        var lines = Object.keys(data).map(function (k) { return (labels[k] || k) + ': ' + data[k]; });
        window.location.href = 'mailto:' + cfg.toEmail + '?subject=' + encodeURIComponent(subject) +
          '&body=' + encodeURIComponent(lines.join('\n'));
        status.className = 'form-status';
        status.textContent = 'Your email app should open with the message ready to send.';
        return;
      }

      var payload = Object.assign({ form: formName, subject: subject, _subject: subject }, data);
      if (data.email) payload._replyto = data.email;
      if (cfg.accessKey) payload.access_key = cfg.accessKey;
      var button = form.querySelector('button[type="submit"]');
      button.disabled = true;
      status.className = 'form-status';
      status.textContent = 'Sending...';

      fetch(cfg.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      }).then(function (res) {
        if (!res.ok) throw new Error('status ' + res.status);
        form.reset();
        status.className = 'form-status ok';
        status.textContent = 'Sent. Thank you, ' + data.name.split(' ')[0] + '. Eddie will be in touch soon.';
      }).catch(function () {
        status.className = 'form-status error';
        status.innerHTML = 'That did not go through. Please call or text Eddie at <a href="tel:+15599047689">' +
          cfg.phone + '</a> or email <a href="mailto:' + cfg.toEmail + '">' + cfg.toEmail + '</a>.';
      }).then(function () { button.disabled = false; });
    });
  });
})();
