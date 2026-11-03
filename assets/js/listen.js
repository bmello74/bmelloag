/*
 * B Mello Ag Services: "Listen to this issue" read-aloud player
 * Reads any newsletter issue page out loud using the voices built into the
 * reader's phone or computer. No account, no cost, no audio files.
 *
 * Install on bmelloag.com issue pages:
 *   a script tag pointing to /assets/js/listen.js (with defer)
 * Optional: mark the article with data-listen-root to limit what gets read,
 * and add data-listen-skip to anything that should never be read aloud.
 * Opening a page with #listen in the address opens the player right away.
 */
(function () {
  "use strict";
  if (window.__bmListen) return;
  window.__bmListen = true;

  var synth = window.speechSynthesis;
  var STORE_VOICE = "bmListenVoice";
  var STORE_RATE = "bmListenRate";

  function store(key, val) {
    try {
      if (val === undefined) return window.localStorage.getItem(key);
      window.localStorage.setItem(key, val);
    } catch (e) { return null; }
  }

  /* ---------- styles ---------- */
  var css = [
    ".bml-open{display:inline-flex;align-items:center;gap:10px;margin:14px 0 18px;padding:12px 20px 12px 14px;",
    "background:#1a1a1a;color:#f5c400;border:0;border-radius:999px;font:700 14px/1 Arial,Helvetica,sans-serif;",
    "letter-spacing:.08em;text-transform:uppercase;cursor:pointer;box-shadow:0 2px 0 #f5c400}",
    ".bml-open:hover{background:#000}",
    ".bml-open:focus-visible,.bml-bar button:focus-visible,.bml-bar select:focus-visible{outline:3px solid #f5c400;outline-offset:2px}",
    ".bml-open .bml-dot{width:30px;height:30px;border-radius:50%;background:#f5c400;color:#1a1a1a;display:grid;place-items:center;font-size:12px}",
    ".bml-bar{position:fixed;left:0;right:0;bottom:0;z-index:9999;background:#1a1a1a;color:#faf8f3;",
    "border-top:3px solid #f5c400;font:14px/1.3 Arial,Helvetica,sans-serif;",
    "padding:12px max(16px,env(safe-area-inset-right,0px)) calc(12px + env(safe-area-inset-bottom,0px)) max(16px,env(safe-area-inset-left,0px));",
    "box-shadow:0 -6px 24px rgba(0,0,0,.35)}",
    ".bml-bar[hidden]{display:none!important}",
    ".bml-in{max-width:760px;margin:0 auto;display:grid;gap:10px}",
    ".bml-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}",
    ".bml-now{flex:1 1 180px;min-width:0}",
    ".bml-label{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#f5c400;font-weight:700}",
    ".bml-line{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#d8d2c4;margin-top:3px}",
    ".bml-ctrl{display:flex;align-items:center;gap:6px}",
    ".bml-bar button{background:transparent;color:#faf8f3;border:1px solid #4a463d;border-radius:8px;min-width:44px;height:44px;",
    "font:700 15px Arial,Helvetica,sans-serif;cursor:pointer;display:grid;place-items:center}",
    ".bml-bar button:hover{border-color:#f5c400;color:#f5c400}",
    ".bml-bar .bml-play{background:#f5c400;color:#1a1a1a;border-color:#f5c400;width:52px;height:52px;border-radius:50%;font-size:18px}",
    ".bml-bar .bml-play:hover{background:#ffd633;color:#1a1a1a}",
    ".bml-bar .bml-x{border:0;min-width:36px;color:#9a9384}",
    ".bml-opts{display:flex;gap:10px;flex-wrap:wrap}",
    ".bml-opts label{display:flex;flex-direction:column;gap:4px;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#9a9384;flex:1 1 140px;min-width:0}",
    ".bml-bar select{background:#2a2824;color:#faf8f3;border:1px solid #4a463d;border-radius:8px;height:40px;padding:0 8px;font:14px Arial,Helvetica,sans-serif;width:100%;min-width:0}",
    ".bml-prog{height:4px;background:#3a372f;border-radius:2px;overflow:hidden}",
    ".bml-prog i{display:block;height:100%;width:0;background:#f5c400;transition:width .3s}",
    ".bml-note{font-size:12px;color:#9a9384}",
    ".bml-reading{background:rgba(245,196,0,.22)!important;box-shadow:0 0 0 4px rgba(245,196,0,.22);border-radius:3px;transition:background .2s}",
    "@media (prefers-reduced-motion:reduce){.bml-prog i,.bml-reading{transition:none}}"
  ].join("");

  /* ---------- find what to read ---------- */
  var SKIP = "script,style,noscript,nav,header,footer,form,button,select,svg,[data-listen-skip],.bml-bar,.bml-open,[aria-hidden='true']";

  function findRoot() {
    return document.querySelector("[data-listen-root]") ||
      document.querySelector("article") ||
      document.querySelector("main") ||
      document.querySelector(".email-container") ||
      document.body;
  }

  function visible(el) {
    if (!el.getClientRects().length) return false;
    var s = window.getComputedStyle(el);
    if (s.display === "none" || s.visibility === "hidden") return false;
    if (parseFloat(s.fontSize) < 2 || s.maxHeight === "0px" || parseFloat(s.opacity) === 0) return false;
    return true;
  }

  function clean(t) {
    return t.replace(/\s+/g, " ")
      .replace(/[·•|]/g, ", ")
      .replace(/–/g, " to ")
      .replace(/\s+,/g, ",")
      .trim();
  }

  function collectBlocks(root) {
    var sel = "h1,h2,h3,h4,h5,p,li,blockquote,figcaption,td";
    var all = Array.prototype.slice.call(root.querySelectorAll(sel));
    var blocks = [];
    all.forEach(function (el) {
      if (el.closest(SKIP)) return;
      // only leaf blocks: skip anything that contains another readable block
      if (el.querySelector(sel)) return;
      if (!visible(el)) return;
      var text = clean(el.innerText || el.textContent || "");
      if (text.length < 3) return;
      // skip button-like links and tiny link-only cells
      var a = el.querySelector("a");
      if (a && clean(a.innerText || "") === text && text.length < 40) return;
      if (/^(view this email|read in browser|unsubscribe|update your preferences|all .* reports|all past issues|subscribe)/i.test(text)) return;
      var prev = blocks[blocks.length - 1];
      if (prev && prev.text === text) return;
      blocks.push({ el: el, text: text });
    });
    return blocks;
  }

  // Long passages get cut off by some browsers, so speak in sentence-sized pieces.
  function splitChunks(text) {
    if (text.length <= 220) return [text];
    var parts = text.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) || [text];
    var out = [], buf = "";
    parts.forEach(function (p) {
      if ((buf + p).length > 220 && buf) { out.push(buf.trim()); buf = ""; }
      buf += p;
    });
    if (buf.trim()) out.push(buf.trim());
    return out;
  }

  /* ---------- voices ---------- */
  var QUALITY = /natural|neural|premium|enhanced|google|siri|online/i;

  function niceName(v) {
    var n = v.name
      .replace(/^Microsoft\s+/i, "")
      .replace(/\s*Online\s*\(Natural\)\s*/i, " (Natural)")
      .replace(/\s*-\s*English.*$/i, "")
      .replace(/^Google\s+/i, "Google ");
    var region = (v.lang || "").split(/[-_]/)[1];
    var map = { US: "US", GB: "UK", AU: "Australia", IE: "Ireland", IN: "India", CA: "Canada", NZ: "New Zealand", ZA: "South Africa" };
    if (region && map[region.toUpperCase()] && n.indexOf("(") === -1) n += " (" + map[region.toUpperCase()] + ")";
    return n.trim();
  }

  function englishVoices() {
    if (!synth) return [];
    var vs = synth.getVoices().filter(function (v) { return /^en([-_]|$)/i.test(v.lang); });
    vs.sort(function (a, b) {
      var ka = /^Karen\b/i.test(a.name) ? 0 : 1, kb = /^Karen\b/i.test(b.name) ? 0 : 1;
      if (ka !== kb) return ka - kb;
      var qa = QUALITY.test(a.name) ? 0 : 1, qb = QUALITY.test(b.name) ? 0 : 1;
      if (qa !== qb) return qa - qb;
      var ua = /en[-_]US/i.test(a.lang) ? 0 : 1, ub = /en[-_]US/i.test(b.lang) ? 0 : 1;
      if (ua !== ub) return ua - ub;
      return a.name.localeCompare(b.name);
    });
    // drop exact duplicate labels
    var seen = {};
    return vs.filter(function (v) {
      var k = niceName(v);
      if (seen[k]) return false;
      seen[k] = true;
      return true;
    });
  }

  /* ---------- player ---------- */
  var blocks = [], chunks = [], idx = 0, playing = false, voices = [], ui = {};

  function buildChunks() {
    chunks = [];
    blocks.forEach(function (b, bi) {
      splitChunks(b.text).forEach(function (c) { chunks.push({ text: c, block: bi }); });
    });
  }

  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (html != null) e.innerHTML = html;
    return e;
  }

  function buildUI() {
    var style = el("style", {});
    style.textContent = css;
    document.head.appendChild(style);

    var bar = el("div", { "class": "bml-bar", role: "region", "aria-label": "Listen to this issue", hidden: "" });
    bar.innerHTML =
      '<div class="bml-in">' +
        '<div class="bml-row">' +
          '<div class="bml-ctrl">' +
            '<button type="button" class="bml-back" aria-label="Back one paragraph">&#9664;&#9664;</button>' +
            '<button type="button" class="bml-play" aria-label="Play">&#9654;</button>' +
            '<button type="button" class="bml-fwd" aria-label="Skip ahead one paragraph">&#9654;&#9654;</button>' +
          '</div>' +
          '<div class="bml-now"><div class="bml-label">Listen to this issue</div><div class="bml-line">Press play to start reading.</div></div>' +
          '<button type="button" class="bml-x" aria-label="Close player">&#10005;</button>' +
        '</div>' +
        '<div class="bml-prog" aria-hidden="true"><i></i></div>' +
        '<div class="bml-opts">' +
          '<label for="bml-voice">Voice<select id="bml-voice"></select></label>' +
          '<label for="bml-rate" style="flex:0 1 120px">Speed<select id="bml-rate">' +
            '<option value="0.8">Slower</option><option value="1" selected>Normal</option>' +
            '<option value="1.15">A bit faster</option><option value="1.3">Faster</option><option value="1.5">Fastest</option>' +
          '</select></label>' +
        '</div>' +
        '<div class="bml-note" hidden></div>' +
      '</div>';
    document.body.appendChild(bar);

    ui.bar = bar;
    ui.play = bar.querySelector(".bml-play");
    ui.back = bar.querySelector(".bml-back");
    ui.fwd = bar.querySelector(".bml-fwd");
    ui.close = bar.querySelector(".bml-x");
    ui.line = bar.querySelector(".bml-line");
    ui.prog = bar.querySelector(".bml-prog i");
    ui.voice = bar.querySelector("#bml-voice");
    ui.rate = bar.querySelector("#bml-rate");
    ui.note = bar.querySelector(".bml-note");

    var savedRate = store(STORE_RATE);
    if (savedRate) ui.rate.value = savedRate;

    ui.play.addEventListener("click", function () { playing ? pause() : play(); });
    ui.back.addEventListener("click", function () { jumpBlock(-1); });
    ui.fwd.addEventListener("click", function () { jumpBlock(1); });
    ui.close.addEventListener("click", closeBar);
    ui.voice.addEventListener("change", function () {
      store(STORE_VOICE, ui.voice.value);
      if (playing) restart();
    });
    ui.rate.addEventListener("change", function () {
      store(STORE_RATE, ui.rate.value);
      if (playing) restart();
    });

    // The open button sits at the top of the article. Use one already on the page if there is one.
    var open = document.querySelector(".bml-open");
    if (open) {
      open.addEventListener("click", openBar);
      ui.open = open;
      return;
    }
    open = el("button", { type: "button", "class": "bml-open" },
      '<span class="bml-dot" aria-hidden="true">&#9654;</span>Listen to this issue');
    open.addEventListener("click", openBar);
    var root = findRoot();
    var anchor = root.querySelector("[data-listen-button]");
    if (anchor) anchor.appendChild(open);
    else {
      var h = root.querySelector("h1,h2");
      if (h && h.parentNode) h.parentNode.insertBefore(open, h.nextSibling);
      else root.insertBefore(open, root.firstChild);
    }
    ui.open = open;
  }

  function fillVoices() {
    voices = englishVoices();
    var saved = store(STORE_VOICE);
    ui.voice.innerHTML = "";
    if (!voices.length) {
      ui.voice.appendChild(el("option", { value: "" }, "Default voice"));
      return;
    }
    // A reader's own pick wins. Otherwise use the house default voice.
    var pick = null;
    if (saved) voices.forEach(function (v) { if (v.name === saved) pick = v.name; });
    if (!pick) pick = defaultVoiceName();
    voices.forEach(function (v) {
      var o = el("option", { value: v.name }, niceName(v));
      if (v.name === pick) o.selected = true;
      ui.voice.appendChild(o);
    });
  }

  // House default: Karen (Apple's Australian voice on iPhone, iPad and Mac).
  // Devices without Karen get the most natural Australian voice they have,
  // then the most natural voice of any accent.
  var DEFAULT_VOICE = [/^Karen\b/i, /en[-_]AU/i];
  function defaultVoiceName() {
    for (var p = 0; p < DEFAULT_VOICE.length; p++) {
      var rule = DEFAULT_VOICE[p];
      var best = null;
      voices.forEach(function (v) {
        var hit = rule.test(v.name) || (rule.source.indexOf("en") === 0 && rule.test(v.lang));
        if (hit && (!best || (QUALITY.test(v.name) && !QUALITY.test(best.name)))) best = v;
      });
      if (best) return best.name;
    }
    return voices[0].name;
  }

  function currentVoice() {
    var name = ui.voice.value;
    for (var i = 0; i < voices.length; i++) if (voices[i].name === name) return voices[i];
    return null;
  }

  function mark() {
    blocks.forEach(function (b) { b.el.classList.remove("bml-reading"); });
    var c = chunks[idx];
    if (!c) return;
    var b = blocks[c.block];
    b.el.classList.add("bml-reading");
    ui.line.textContent = b.text;
    ui.prog.style.width = Math.round((idx / chunks.length) * 100) + "%";
    var r = b.el.getBoundingClientRect();
    if (r.top < 60 || r.bottom > window.innerHeight - ui.bar.offsetHeight - 20) {
      var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      b.el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    }
  }

  var token = 0;
  function speakFrom(i) {
    var my = ++token;
    synth.cancel();
    idx = i;
    if (idx >= chunks.length) { finished(); return; }
    mark();
    var u = new SpeechSynthesisUtterance(chunks[idx].text);
    var v = currentVoice();
    if (v) { u.voice = v; u.lang = v.lang; } else { u.lang = "en-US"; }
    u.rate = parseFloat(ui.rate.value) || 1;
    u.onend = function () { if (my === token && playing) speakFrom(idx + 1); };
    u.onerror = function (e) {
      if (my !== token) return;
      if (e && (e.error === "interrupted" || e.error === "canceled")) return;
      if (playing) speakFrom(idx + 1);
    };
    synth.speak(u);
  }

  function play() {
    if (!synth) { showNote("This browser cannot read pages aloud. Try Chrome, Safari or Edge."); return; }
    if (!chunks.length) { blocks = collectBlocks(findRoot()); buildChunks(); }
    if (!chunks.length) { showNote("We could not find any text to read on this page."); return; }
    playing = true;
    ui.play.innerHTML = "&#10074;&#10074;";
    ui.play.setAttribute("aria-label", "Pause");
    if (idx >= chunks.length) idx = 0;
    speakFrom(idx);
  }

  function pause() {
    playing = false;
    token++;
    synth.cancel();
    ui.play.innerHTML = "&#9654;";
    ui.play.setAttribute("aria-label", "Play");
  }

  function restart() { speakFrom(idx); }

  function jumpBlock(dir) {
    if (!chunks.length) { blocks = collectBlocks(findRoot()); buildChunks(); }
    if (!chunks.length) return;
    var cur = chunks[Math.min(idx, chunks.length - 1)].block;
    var target = Math.max(0, Math.min(blocks.length - 1, cur + dir));
    for (var i = 0; i < chunks.length; i++) {
      if (chunks[i].block === target) { idx = i; break; }
    }
    if (playing) speakFrom(idx); else mark();
  }

  function finished() {
    pause();
    idx = 0;
    ui.prog.style.width = "100%";
    ui.line.textContent = "That is the end of this issue. Thanks for listening.";
    blocks.forEach(function (b) { b.el.classList.remove("bml-reading"); });
  }

  function showNote(t) { ui.note.textContent = t; ui.note.hidden = false; }

  function openBar() {
    ui.bar.hidden = false;
    document.body.style.paddingBottom = (ui.bar.offsetHeight + 10) + "px";
    if (!synth) showNote("This browser cannot read pages aloud. Try Chrome, Safari or Edge.");
    else if (!voices.length) fillVoices();
    ui.play.focus();
  }

  function closeBar() {
    pause();
    ui.bar.hidden = true;
    document.body.style.paddingBottom = "";
    blocks.forEach(function (b) { b.el.classList.remove("bml-reading"); });
  }

  function init() {
    try { realInit(); } catch (err) {
      var box = document.querySelector("[data-listen-error]");
      if (box) { box.hidden = false; box.textContent = "The player could not start: " + (err && err.message ? err.message : err); }
    }
  }

  function realInit() {
    buildUI();
    if (synth) {
      fillVoices();
      if (typeof synth.addEventListener === "function") synth.addEventListener("voiceschanged", fillVoices);
      else synth.onvoiceschanged = fillVoices;
    }
    window.addEventListener("pagehide", function () { if (synth) synth.cancel(); });
    if (location.hash === "#listen") openBar();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
