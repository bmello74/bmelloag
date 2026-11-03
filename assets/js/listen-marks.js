/*
 * B Mello Ag Services: marks the parts of a newsletter issue page that the
 * "Listen to this issue" player (/assets/js/listen.js) should never read aloud.
 *
 * Every title's email template is built differently, so instead of hand-marking
 * each one, this tags them by what they are:
 *   - button and link rows (Read in Browser, Past Issues, Subscribe, social links,
 *     phone and email lines)
 *   - the website promo grid (the six newsletter artwork tiles)
 *   - the standing "Every issue we have ever published" archive line
 *   - the hidden preheader
 *   - the unsubscribe, preferences and copyright lines
 * It only adds data-listen-skip attributes. Nothing on the page changes visually.
 * Load it before listen.js, both with defer.
 */
(function () {
  "use strict";
  var root = document.querySelector("[data-listen-root]");
  if (!root) return;

  function skip(el) { if (el && el !== root) el.setAttribute("data-listen-skip", ""); }
  function txt(el) { return (el.textContent || "").replace(/\s+/g, " ").trim(); }
  function bare(t) { return t.replace(/[\s·•|,&;: •·-]+/g, ""); }

  // Links that belong to the newsletter's frame, not its content.
  var FRAME_HREF = /^(mailto:|tel:|sms:)|mailchi\.mp|list-manage\.com|campaign-archive|facebook\.com|instagram\.com|twitter\.com|x\.com\/|linkedin\.com|youtube\.com|tiktok\.com|maps\.google|google\.com\/maps|bmelloag\.com\/?(reports\/?[a-z-]*\/?|subscribe\/?|contact\/?)?(#.*)?$|^\/(reports\/?[a-z-]*\/?|subscribe\/?|contact\/?)?$/i;

  function buttonLike(a) {
    var st = (a.getAttribute("style") || "").toLowerCase();
    return /background(-color)?\s*:/.test(st) || /display\s*:\s*(block|inline-block)/.test(st);
  }

  // 1. Hidden preheader text.
  Array.prototype.forEach.call(root.querySelectorAll("[style]"), function (el) {
    var st = el.getAttribute("style").toLowerCase().replace(/\s+/g, "");
    if (/display:none|max-height:0(px)?(;|$)/.test(st)) skip(el);
  });

  // 2. The website promo grid: the row that holds the newsletter artwork tiles.
  var tiles = root.querySelectorAll("img[src*='/img/email/reports/']");
  if (tiles.length >= 2) {
    var box = tiles[0].parentNode;
    while (box && box !== root) {
      var all = true;
      for (var i = 0; i < tiles.length; i++) if (!box.contains(tiles[i])) { all = false; break; }
      if (all) break;
      box = box.parentNode;
    }
    if (box && box !== root) skip(box.closest("tr") && root.contains(box.closest("tr")) ? box.closest("tr") : box);
  }

  // 3. Footer lines that are never content.
  var FRAME_TEXT = /unsubscribe|update (your )?preferences|you are receiving this|you're receiving this|having trouble viewing|view (this email )?in (your )?browser|read in browser|copyright\s*©|all rights reserved|every issue we have ever published/i;
  var leaves = root.querySelectorAll("p,td,div,li,span,center");
  Array.prototype.forEach.call(leaves, function (el) {
    var t = txt(el);
    if (!t || t.length > 600 || !FRAME_TEXT.test(t)) return;
    // mark the smallest element that carries the line
    var kids = el.querySelectorAll("p,td,div,li,span,center");
    for (var k = 0; k < kids.length; k++) if (FRAME_TEXT.test(txt(kids[k]))) return;
    skip(el);
  });

  // 4. Rows made of nothing but buttons or frame links.
  Array.prototype.forEach.call(root.querySelectorAll("td,p,div,center,li"), function (el) {
    var links = el.querySelectorAll("a");
    if (!links.length) return;
    var t = txt(el);
    if (!t || t.length > 200) return;
    var linkText = "", buttons = 0, frame = 0;
    for (var j = 0; j < links.length; j++) {
      linkText += txt(links[j]);
      if (buttonLike(links[j])) buttons++;
      if (FRAME_HREF.test(links[j].getAttribute("href") || "")) frame++;
    }
    var rest = bare(t).length - bare(linkText).length;
    if (rest <= 0 && (buttons || frame === links.length)) { skip(el); return; }
    // "Cell: (559) 816-3889" style lines: a short label in front of contact links
    if (frame === links.length && rest > 0 && rest <= 8 && /^(cell|phone|call|text|email|e-mail|fax|office|web|website)\b/i.test(t)) skip(el);
  });
})();
