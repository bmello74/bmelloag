(function () {
  "use strict";
  if (typeof window.gtag !== "function") return;
  function send(name, params) {
    params = params || {};
    params.page_path = location.pathname;
    params.transport_type = "beacon";
    try { window.gtag("event", name, params); } catch (e) {}
  }
  function label(el) {
    return (el.textContent || el.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim().slice(0, 100);
  }
  document.addEventListener("click", function (ev) {
    var a = ev.target && ev.target.closest ? ev.target.closest("a[href]") : null;
    if (!a) return;
    var href = a.getAttribute("href") || "";
    var low = href.toLowerCase();
    if (low.indexOf("tel:") === 0) {
      send("phone_click", { phone_number: href.slice(4), link_text: label(a) });
    } else if (low.indexOf("mailto:") === 0) {
      send("email_click", { email_address: href.slice(7).split("?")[0], link_text: label(a) });
    } else if (/\.pdf($|[?#])/.test(low)) {
      var name = href;
      try { name = decodeURIComponent(new URL(a.href, location.href).pathname.split("/").pop()); } catch (e) {}
      send("guide_download", { file_name: name, link_url: a.href, link_text: label(a) });
    } else if (/mailchi\.mp|list-manage\.com/.test(low)) {
      send("newsletter_signup_click", { link_url: a.href, link_text: label(a) });
    }
  }, true);
  function formName(f) {
    return f.getAttribute("data-ga-name") || f.getAttribute("name") || f.id ||
      f.getAttribute("aria-label") || f.className || "form";
  }
  function isLeadForm(f) {
    if (f.getAttribute("role") === "search" || f.hasAttribute("data-ga-ignore")) return false;
    return (f.getAttribute("method") || "get").toLowerCase() === "post" || f.hasAttribute("data-ga-name");
  }
  document.addEventListener("submit", function (ev) {
    var f = ev.target;
    if (!f || !isLeadForm(f) || f.hasAttribute("data-ga-ajax")) return;
    setTimeout(function () {
      if (!ev.defaultPrevented) send("generate_lead", { form_name: formName(f) });
    }, 0);
  });
  document.addEventListener("bm:lead", function (ev) {
    var d = (ev && ev.detail) || {};
    send("generate_lead", { form_name: d.form || "form" });
  });
})();
