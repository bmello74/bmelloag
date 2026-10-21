/* Superior Soil Supplements: site behavior.
   Everything here is plain JavaScript with no build step. */

/* ---------- Settings: change these before going live ---------- */
window.SS_CONFIG = {
  // Form service URL (for example a Formspree, Basin or Netlify Forms endpoint).
  // Leave blank and every form opens a pre-filled email to inboxEmail instead.
  formEndpoint: "",
  inboxEmail: "bryan@bmelloag.com",
  officePhone: "(559) 584-7695",
  officeTel: "+15595847695"
};

(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var fmt = function (n, d) { if (!isFinite(n)) return "0"; return n.toLocaleString("en-US", { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); };
  var num = function (el) { var v = parseFloat(el && el.value); return isFinite(v) ? v : 0; };
  var PRODUCTS = window.SS_PRODUCTS || [];
  var CATS = window.SS_CATEGORIES || {};
  var byId = {}; PRODUCTS.forEach(function (p) { byId[p.id] = p; });

  /* ---------- Mobile nav ---------- */
  var menuBtn = $(".menu-btn"), nav = $("#site-nav");
  if (menuBtn && nav) menuBtn.addEventListener("click", function () {
    var open = nav.classList.toggle("open");
    menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
  });

  /* ---------- Quote list (kept in this browser only) ---------- */
  var KEY = "ss-quote-v1";
  function readQuote() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return memQuote; } }
  var memQuote = [];
  function writeQuote(list) { memQuote = list; try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {} updateCount(); }
  function updateCount() { var n = readQuote().length; $$(".quote-count").forEach(function (b) { b.textContent = n; b.setAttribute("data-n", n); }); }
  function addToQuote(id, qty) {
    var p = byId[id]; if (!p) return;
    var list = readQuote(), found = list.filter(function (i) { return i.id === id; })[0];
    if (found) { if (qty) found.qty = qty; } else list.push({ id: id, qty: qty || "", unit: p.unit || "tons" });
    writeQuote(list);
    toast("Added " + p.name + " to your quote.", true);
    $$('[data-add="' + id + '"]').forEach(function (b) { b.classList.add("added"); b.textContent = "In quote"; });
  }
  window.SSaddToQuote = addToQuote;
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-add]"); if (!b) return;
    e.preventDefault();
    var qtyFrom = b.getAttribute("data-qty-from");
    var qty = qtyFrom ? ($(qtyFrom) || {}).textContent : "";
    var id = b.getAttribute("data-add");
    if (id === "@select") { var sel = $(b.getAttribute("data-select")); id = sel && sel.value; }
    if (id) addToQuote(id, qty ? qty.replace(/[^0-9.]/g, "") : "");
  });
  function markAdded() { var ids = readQuote().map(function (i) { return i.id; }); $$("[data-add]").forEach(function (b) { if (ids.indexOf(b.getAttribute("data-add")) > -1) { b.classList.add("added"); b.textContent = "In quote"; } }); }
  updateCount();

  var toastEl;
  function toast(msg, withLink) {
    if (!toastEl) { toastEl = document.createElement("div"); toastEl.className = "toast"; toastEl.setAttribute("role", "status"); document.body.appendChild(toastEl); }
    toastEl.innerHTML = esc(msg) + (withLink && !/quote\.html$/.test(location.pathname) ? ' <a href="quote.html">View quote</a>' : "");
    toastEl.classList.add("show");
    clearTimeout(toastEl._t); toastEl._t = setTimeout(function () { toastEl.classList.remove("show"); }, 3800);
  }

  /* ---------- Catalog tables ---------- */
  function flagHtml(p) {
    var h = "";
    if (p.flags.indexOf("omri") > -1) h += '<span class="flag flag-org">OMRI listed</span>';
    if (p.flags.indexOf("organic") > -1) h += '<span class="flag flag-org">CDFA organic input</span>';
    if (p.flags.indexOf("solution") > -1) h += '<span class="flag flag-sol">Runs through water</span>';
    return h;
  }
  function addBtn(p) { return '<button type="button" class="add-btn" data-add="' + p.id + '">Add to quote</button>'; }
  function renderCatalog(box) {
    var cats = box.getAttribute("data-catalog").split(",");
    var withFilters = box.hasAttribute("data-filters");
    var state = { cat: "all", organic: false, q: "" };
    var html = "";
    if (withFilters) {
      html += '<div class="filters" role="group" aria-label="Filter products"><button type="button" class="chip" data-cat="all" aria-pressed="true">All</button>';
      cats.forEach(function (c) { html += '<button type="button" class="chip" data-cat="' + c + '" aria-pressed="false">' + esc(CATS[c].label) + "</button>"; });
      html += '<button type="button" class="chip" data-org aria-pressed="false">Organic approved only</button>';
      html += '<label class="sr-only" for="cat-search">Search products</label><input type="search" id="cat-search" placeholder="Search products or nutrients"></div>';
    }
    html += '<div class="table-scroll"><table class="spec-table"><thead><tr><th scope="col">Product</th><th scope="col">Analysis</th><th scope="col">Available as</th><th scope="col">Details</th><th scope="col"><span class="sr-only">Quote</span></th></tr></thead><tbody></tbody></table></div><p class="small" data-empty hidden>No products match. Clear the search or call ' + esc(SS_CONFIG.officePhone) + ".</p>";
    box.innerHTML = html;
    var tbody = $("tbody", box);
    function draw() {
      var rows = "", shown = 0;
      cats.forEach(function (c) {
        if (state.cat !== "all" && state.cat !== c) return;
        var items = PRODUCTS.filter(function (p) {
          if (p.cat !== c) return false;
          if (state.organic && p.flags.indexOf("omri") < 0 && p.flags.indexOf("organic") < 0) return false;
          if (state.q) { var t = (p.name + " " + p.sub + " " + p.analysis).toLowerCase(); if (t.indexOf(state.q) < 0) return false; }
          return true;
        });
        if (!items.length) return;
        if (cats.length > 1) rows += '<tr class="cat-row"><td colspan="5">' + esc(CATS[c].label) + "</td></tr>";
        items.forEach(function (p) {
          shown++;
          rows += '<tr><td class="name">' + esc(p.name) + (p.sub ? "<small>" + esc(p.sub) + "</small>" : "") + "</td>" +
            '<td data-label="Analysis" class="an">' + esc(p.analysis) + "</td>" +
            '<td data-label="Available as">' + p.forms.map(function (f) { return '<span class="flag flag-form">' + esc(f) + "</span>"; }).join("") + "</td>" +
            '<td data-label="Details">' + flagHtml(p) + (p.doc ? '<div><a href="' + p.doc + '" target="_blank" rel="noopener">Product sheet (PDF)</a></div>' : "") + "</td>" +
            "<td>" + addBtn(p) + "</td></tr>";
        });
      });
      tbody.innerHTML = rows;
      var empty = $("[data-empty]", box); if (empty) empty.hidden = shown > 0;
      markAdded();
    }
    box.addEventListener("click", function (e) {
      var c = e.target.closest(".chip"); if (!c) return;
      if (c.hasAttribute("data-org")) { state.organic = !state.organic; c.setAttribute("aria-pressed", state.organic); }
      else { state.cat = c.getAttribute("data-cat"); $$(".chip[data-cat]", box).forEach(function (x) { x.setAttribute("aria-pressed", x === c); }); }
      draw();
    });
    var s = $("input[type=search]", box); if (s) s.addEventListener("input", function () { state.q = s.value.trim().toLowerCase(); draw(); });
    draw();
  }
  $$("[data-catalog]").forEach(renderCatalog);

  /* ---------- Wood product list ---------- */
  $$("[data-woodlist]").forEach(function (box) {
    var groups = {}; PRODUCTS.filter(function (p) { return p.cat === "wood"; }).forEach(function (p) { (groups[p.group] = groups[p.group] || []).push(p); });
    var notes = { Fir: "Bark, chips, fines and walk-on", Redwood: "Sawdust, shavings and grinds", Cedar: "Aromatic chips and bark", Orchard: "From peach, plum, nectarine and almond wood" };
    var h = "";
    Object.keys(groups).forEach(function (g) {
      h += '<div class="wood-group"><h3>' + esc(g) + '</h3><p class="small">' + esc(notes[g] || "") + '</p><ul class="plain wood-items">';
      groups[g].forEach(function (p) { h += "<li><span>" + esc(p.name) + (p.sub ? ' <span class="small">' + esc(p.sub) + "</span>" : "") + "</span>" + addBtn(p) + "</li>"; });
      h += "</ul></div>";
    });
    box.innerHTML = h; markAdded();
  });

  /* ---------- Product selects (calculators, quote quick add) ---------- */
  $$("select[data-products]").forEach(function (sel) {
    var cats = sel.getAttribute("data-products").split(",");
    var h = sel.innerHTML;
    cats.forEach(function (c) {
      if (!CATS[c]) return;
      h += '<optgroup label="' + esc(CATS[c].label) + '">';
      PRODUCTS.filter(function (p) { return p.cat === c; }).forEach(function (p) { h += '<option value="' + p.id + '">' + esc(p.name) + "</option>"; });
      h += "</optgroup>";
    });
    sel.innerHTML = h;
    var pre = sel.getAttribute("data-default"); if (pre) sel.value = pre;
  });

  /* ---------- Rail map ---------- */
  var map = $(".railmap");
  if (map) {
    var panel = $("#map-panel");
    var nodes = $$(".node", map);
    function show(n) {
      nodes.forEach(function (x) { x.classList.toggle("active", x === n); });
      if (panel) panel.innerHTML = "<h4>" + esc(n.getAttribute("data-title")) + "</h4><p>" + esc(n.getAttribute("data-info")) + "</p>";
    }
    nodes.forEach(function (n) {
      n.addEventListener("click", function () { show(n); });
      n.addEventListener("focus", function () { show(n); });
      n.addEventListener("mouseenter", function () { show(n); });
      n.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); show(n); } });
    });
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      $$("animateMotion", map).forEach(function (a) { a.parentNode.removeChild(a); });
      $$(".train", map).forEach(function (t) { t.style.display = "none"; });
    }
  }

  /* ---------- Gypsum value calculator ---------- */
  $$("[data-calc=gypsum-value]").forEach(function (c) {
    var pBase = $("[name=base_price]", c), grade = $("[name=other_grade]", c), pOther = $("[name=other_price]", c), custom = $("[name=custom_grade]", c), customWrap = $("[data-custom]", c);
    function run() {
      var g = grade.value === "custom" ? num(custom) : parseFloat(grade.value);
      if (customWrap) customWrap.hidden = grade.value !== "custom";
      g = Math.max(1, Math.min(100, g || 1));
      var base = num(pBase), other = num(pOther);
      var tonsEq = 100 / g, fair = base * g / 100;
      var costBase = base, costOther = other * 100 / g;
      $("[data-out=tons]", c).textContent = fmt(tonsEq, 2);
      $("[data-out=fair]", c).textContent = "$" + fmt(fair, 2);
      $("[data-out=loads]", c).textContent = fmt(4 * tonsEq, 1);
      var max = Math.max(costBase, costOther, 1);
      $("[data-bar=base]", c).style.width = (costBase / max * 100) + "%";
      $("[data-bar=other]", c).style.width = (costOther / max * 100) + "%";
      $("[data-val=base]", c).textContent = "$" + fmt(costBase, 2);
      $("[data-val=other]", c).textContent = "$" + fmt(costOther, 2);
      $("[data-label=other]", c).textContent = g + "% gypsum";
      var v = $("[data-out=verdict]", c);
      if (!other) v.textContent = "Enter the delivered price you were quoted for the other gypsum to compare.";
      else if (costOther > costBase + 0.005) v.textContent = "At these prices the " + g + "% product costs $" + fmt(costOther - costBase, 2) + " more for every ton of gypsum you actually put on the ground. It would need to be $" + fmt(fair, 2) + " delivered or less to match TR-100.";
      else if (costOther < costBase - 0.005) v.textContent = "At these prices the " + g + "% product is cheaper per ton of gypsum delivered by $" + fmt(costBase - costOther, 2) + ". Remember it also takes " + fmt(tonsEq, 2) + " times the tons and trucks to spread.";
      else v.textContent = "The two products cost the same per ton of gypsum delivered.";
    }
    $$("input,select", c).forEach(function (i) { i.addEventListener("input", run); });
    run();
  });

  /* ---------- Application planner ---------- */
  $$("[data-calc=planner]").forEach(function (c) {
    function run() {
      var tons = num($("[name=acres]", c)) * num($("[name=rate]", c));
      var load = num($("[name=load]", c)) || 25;
      $("[data-out=tons]", c).textContent = fmt(tons, 1);
      $("[data-out=loads]", c).textContent = fmt(Math.ceil(tons / load - 1e-9), 0);
      $("[data-out=perload]", c).textContent = fmt(load / Math.max(num($("[name=rate]", c)), 0.0001), 1);
    }
    $$("input,select", c).forEach(function (i) { i.addEventListener("input", run); }); run();
  });

  /* ---------- Water-run gypsum ---------- */
  $$("[data-calc=waterrun]").forEach(function (c) {
    function run() {
      var meq = num($("[name=meq]", c)), inches = num($("[name=inches]", c)), acres = num($("[name=acres]", c)), pur = num($("[name=purity]", c)) || 97;
      // 234 lb of 100% gypsum per acre-foot raises calcium by 1 meq/L (19.5 lb per acre-inch).
      var lbs = 19.5 * meq * inches * acres / (pur / 100);
      $("[data-out=lbs]", c).textContent = fmt(lbs, 0);
      $("[data-out=tons]", c).textContent = fmt(lbs / 2000, 2);
      $("[data-out=ppm]", c).textContent = fmt(meq * 20.04, 0);
      $("[data-out=peracre]", c).textContent = fmt(acres ? lbs / acres : 0, 0);
    }
    $$("input,select", c).forEach(function (i) { i.addEventListener("input", run); }); run();
  });

  /* ---------- Landscape coverage ---------- */
  $$("[data-calc=coverage]").forEach(function (c) {
    function run() {
      var shape = $("[name=mode]:checked", c).value;
      var area = shape === "dims" ? num($("[name=len]", c)) * num($("[name=wid]", c)) : num($("[name=sqft]", c));
      $$("[data-mode]", c).forEach(function (el) { el.hidden = el.getAttribute("data-mode") !== shape; });
      var yd = area * num($("[name=depth]", c)) / 12 / 27;
      $("[data-out=area]", c).textContent = fmt(area, 0);
      $("[data-out=yards]", c).textContent = fmt(yd, 1);
      $("[data-out=order]", c).textContent = fmt(Math.ceil(yd * 1.1), 0);
    }
    $$("input,select", c).forEach(function (i) { i.addEventListener("input", run); i.addEventListener("change", run); }); run();
  });

  /* ---------- Soil problem finder ---------- */
  var FINDER = {
    water: { t: "Water sits on top or runs off", why: "Sealed, sodic or compacted surfaces keep water from moving in. Calcium from gypsum flocculates clay and pushes sodium off the exchange sites.", p: ["tr100", "e90", "p97", "aqua"], test: "Water analysis plus a saturated paste test" },
    salt: { t: "Salt burn, high sodium or poor stands", why: "Sodium and salts build up when irrigation water is high in SAR or bicarbonate. Gypsum supplies the calcium needed to leach sodium below the root zone.", p: ["tr100", "p97", "p95ha", "e90"], test: "Saturated paste test and water analysis" },
    acid: { t: "Low pH (acidic ground)", why: "Liming raises pH and supplies calcium. Choose dolomite when magnesium is also low, limestone when it is not.", p: ["bml", "ag90", "smi", "flower"], test: "Standard soil test with base saturation" },
    alkaline: { t: "High pH, yellowing, micronutrient tie-up", why: "At high pH, iron, zinc and manganese become less available. Elemental sulfur oxidizes in the soil to lower pH over time.", p: ["sfines", "sr90", "dispersul", "microsul"], test: "Standard soil test" },
    om: { t: "Low organic matter or crusting", why: "Compost feeds soil biology, builds aggregate structure and adds slow nutrients. Blending with gypsum or zeolite gets two jobs done in one pass.", p: ["allgreen", "dairy", "cblend", "biochar"], test: "Standard soil test" },
    sandy: { t: "Sandy ground that will not hold water or nitrogen", why: "Zeolite and biochar add exchange capacity and pore space so water and ammonium stay in the root zone longer.", p: ["zeolite", "biochar", "allgreen", "cblend"], test: "Standard soil test" },
    roots: { t: "Weak roots or tired soil biology", why: "Biological inoculants rebuild microbial populations that cycle nutrients and support root growth, especially after fumigation or heavy salt years.", p: ["zeltec", "armory", "megaphos", "nitryx"], test: "Standard soil test" },
    potash: { t: "Needs potassium or magnesium in season", why: "Sulfate forms are available right away and carry less chloride. KMS runs through the water; SOP goes on dry.", p: ["kms", "sop", "fert"], test: "Standard soil test and leaf tissue" }
  };
  $$("[data-finder]").forEach(function (f) {
    var out = $(".finder-result", f);
    f.addEventListener("change", function (e) {
      if (e.target.name !== "symptom") return;
      var d = FINDER[e.target.value]; if (!d) return;
      var list = d.p.map(function (id) { var p = byId[id]; return p ? '<li><a href="' + CATS[p.cat].page + '">' + esc(p.name) + "</a>: " + esc(p.sub) + "</li>" : ""; }).join("");
      out.innerHTML = "<h4>" + esc(d.t) + "</h4><p>" + esc(d.why) + "</p><p><strong>Products to ask about</strong></p><ul>" + list + '</ul><p><strong>Start with:</strong> ' + esc(d.test) + '. Our agronomist reads the results and tells you which of these you actually need.</p><div class="btn-row"><a class="btn btn-green btn-sm" href="sample-submission.html">Send in samples</a><a class="btn btn-ghost btn-sm" href="agronomy.html">Book GPS sampling</a></div>';
    });
  });

  /* ---------- Quote page ---------- */
  var qBox = $("#quote-items");
  function drawQuote() {
    if (!qBox) return;
    var list = readQuote();
    if (!list.length) { qBox.innerHTML = '<div class="quote-empty">Your quote is empty. Add products from the list below, or browse <a href="gypsum.html">gypsum</a>, <a href="amendments.html">soil amendments</a>, <a href="solution.html">solution grade products</a> and <a href="landscape.html">landscape products</a>.</div>'; return; }
    var h = '<ul class="quote-items">';
    list.forEach(function (i, idx) {
      var p = byId[i.id]; if (!p) return;
      h += '<li><div class="qi-name">' + esc(p.name) + "<small>" + esc(CATS[p.cat].label) + '</small></div><label class="sr-only" for="qq' + idx + '">Quantity for ' + esc(p.name) + '</label><input id="qq' + idx + '" type="number" min="0" step="any" placeholder="Qty" value="' + esc(i.qty) + '" data-i="' + idx + '" data-k="qty">' +
        '<label class="sr-only" for="qu' + idx + '">Unit</label><select id="qu' + idx + '" data-i="' + idx + '" data-k="unit">' + ["tons", "yards", "loads", "super sacks", "50 lb bags", "lbs", "gallons", "acres"].map(function (u) { return "<option" + (u === i.unit ? " selected" : "") + ">" + u + "</option>"; }).join("") + "</select>" +
        '<button type="button" class="rm" data-rm="' + idx + '" aria-label="Remove ' + esc(p.name) + '">&times;</button></li>';
    });
    qBox.innerHTML = h + "</ul>";
  }
  if (qBox) {
    drawQuote();
    qBox.addEventListener("input", function (e) { var i = e.target.getAttribute("data-i"); if (i == null) return; var l = readQuote(); l[i][e.target.getAttribute("data-k")] = e.target.value; writeQuote(l); });
    qBox.addEventListener("change", function (e) { var i = e.target.getAttribute("data-i"); if (i == null) return; var l = readQuote(); l[i][e.target.getAttribute("data-k")] = e.target.value; writeQuote(l); });
    qBox.addEventListener("click", function (e) { var b = e.target.closest("[data-rm]"); if (!b) return; var l = readQuote(); l.splice(+b.getAttribute("data-rm"), 1); writeQuote(l); drawQuote(); });
    var origAdd = addToQuote;
    window.SSaddToQuote = addToQuote = function (id, q) { origAdd(id, q); drawQuote(); };
    document.addEventListener("click", function (e) { if (e.target.closest("[data-add]")) setTimeout(drawQuote, 0); });
  }

  /* ---------- Sample rows ---------- */
  var sBody = $("#sample-rows");
  function sampleRow(n) {
    return '<tr><td><label class="sr-only" for="sid' + n + '">Sample ID</label><input id="sid' + n + '" name="s_id" type="text" value="S' + n + '"></td>' +
      '<td><label class="sr-only" for="stype' + n + '">Type</label><select id="stype' + n + '" name="s_type"><option>Soil</option><option>Soil (paste)</option><option>Water</option></select></td>' +
      '<td><label class="sr-only" for="sfield' + n + '">Field or block</label><input id="sfield' + n + '" name="s_field" type="text" placeholder="Field / block / well"></td>' +
      '<td><label class="sr-only" for="scrop' + n + '">Crop</label><input id="scrop' + n + '" name="s_crop" type="text" placeholder="Crop"></td>' +
      '<td><label class="sr-only" for="sdepth' + n + '">Depth</label><input id="sdepth' + n + '" name="s_depth" type="text" placeholder="0-12 in"></td></tr>';
  }
  if (sBody) {
    var count = 0;
    var addRow = function () { count++; sBody.insertAdjacentHTML("beforeend", sampleRow(count)); };
    addRow(); addRow();
    $("#add-sample").addEventListener("click", function () { addRow(); $("#sid" + count).focus(); });
  }
  function samplesFromForm(form) {
    var rows = []; $$("#sample-rows tr", form).forEach(function (tr) {
      var g = function (n) { var e = $("[name=" + n + "]", tr); return e ? e.value.trim() : ""; };
      if (g("s_field") || g("s_crop") || g("s_id")) rows.push({ id: g("s_id"), type: g("s_type"), field: g("s_field"), crop: g("s_crop"), depth: g("s_depth") });
    });
    return rows;
  }
  var printBtn = $("#print-sheet");
  if (printBtn) printBtn.addEventListener("click", function () {
    var form = printBtn.closest("form"); var fd = new FormData(form); var g = function (k) { return esc(fd.getAll(k).join(", ")); };
    var rows = samplesFromForm(form);
    var sheet = $(".print-sheet");
    var logo = $(".brand img") ? $(".brand img").outerHTML : "";
    sheet.innerHTML = '<div class="ps-head">' + logo + '<div style="text-align:right"><h1>Sample submission</h1><div>Superior Soil Supplements, 10367 Houston Ave, Hanford, CA 93230</div><div>Office ' + esc(SS_CONFIG.officePhone) + "</div></div></div>" +
      "<table><tr><th>Name</th><td>" + g("name") + "</td><th>Company / ranch</th><td>" + g("company") + "</td></tr><tr><th>Phone</th><td>" + g("phone") + "</td><th>Email</th><td>" + g("email") + "</td></tr><tr><th>Ranch location</th><td colspan=3>" + g("location") + "</td></tr><tr><th>Tests requested</th><td colspan=3>" + g("tests") + "</td></tr><tr><th>I want</th><td colspan=3>" + g("wants") + "</td></tr><tr><th>Date sampled</th><td>" + g("sampled") + "</td><th>Organic ground</th><td>" + g("organic") + "</td></tr></table>" +
      "<table><tr><th>Sample ID</th><th>Type</th><th>Field / block / well</th><th>Crop</th><th>Depth</th></tr>" + rows.map(function (r) { return "<tr><td>" + esc(r.id) + "</td><td>" + esc(r.type) + "</td><td>" + esc(r.field) + "</td><td>" + esc(r.crop) + "</td><td>" + esc(r.depth) + "</td></tr>"; }).join("") + "</table>" +
      "<p><strong>Notes:</strong> " + g("notes") + '</p><p style="margin-top:18pt">Received by Superior Soil: ____________________ Date: __________</p>';
    document.body.classList.add("printing-sheet");
    window.print();
    setTimeout(function () { document.body.classList.remove("printing-sheet"); }, 500);
  });

  /* ---------- Form submission ---------- */
  $$("form[data-form]").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var status = $(".form-status", form);
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var kind = form.getAttribute("data-form");
      var fd = new FormData(form), lines = [], data = { form: kind };
      var seen = {};
      $$("[name]", form).forEach(function (el) {
        var n = el.name; if (seen[n] || /^s_/.test(n) || el.type === "button") return; seen[n] = 1;
        var v = fd.getAll(n).filter(Boolean).join(", "); if (!v) return;
        var lab = el.getAttribute("data-label") || n; data[n] = v; lines.push(lab + ": " + v);
      });
      if (kind === "quote") {
        var items = readQuote().map(function (i) { var p = byId[i.id]; return p ? "- " + p.name + ": " + (i.qty || "qty TBD") + " " + i.unit : ""; }).filter(Boolean);
        data.items = items; lines.unshift("PRODUCTS", items.length ? items.join("\n") : "- (none added; see notes)", "");
      }
      if (kind === "samples") {
        var rows = samplesFromForm(form);
        data.samples = rows; lines.push("", "SAMPLES"); rows.forEach(function (r) { lines.push("- " + [r.id, r.type, r.field, r.crop, r.depth].filter(Boolean).join(" | ")); });
      }
      var subject = { quote: "Quote request", samples: "Sample submission", contact: "Website inquiry", sampling: "GPS sampling request", equipment: "Equipment and service request" }[kind] || "Website form";
      subject += (data.company ? " from " + data.company : data.name ? " from " + data.name : "");
      var done = function () {
        if (status) { status.className = "form-status ok"; status.textContent = form.getAttribute("data-success") || "Sent. We will call or email you within one business day."; status.focus && status.setAttribute("tabindex", "-1"); status.focus(); }
        if (kind === "quote") { writeQuote([]); drawQuote(); }
      };
      if (SS_CONFIG.formEndpoint) {
        fetch(SS_CONFIG.formEndpoint, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(Object.assign({ _subject: subject }, data, { message: lines.join("\n") })) })
          .then(function (r) { if (!r.ok) throw new Error(r.status); done(); })
          .catch(function () { if (status) { status.className = "form-status err"; status.innerHTML = 'The form did not send. Call the office at <a href="tel:' + SS_CONFIG.officeTel + '">' + esc(SS_CONFIG.officePhone) + "</a> or try again."; } });
      } else {
        location.href = "mailto:" + SS_CONFIG.inboxEmail + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(lines.join("\n"));
        if (status) { status.className = "form-status ok"; status.textContent = "Your email app opened with the request filled in. Press send there to finish."; }
      }
    });
  });
})();
