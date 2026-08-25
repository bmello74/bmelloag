#!/usr/bin/env python3
"""
B. Mello Ag Services — site builder.

  python3 tools/build.py site              rebuild every static page + reports index + feed
  python3 tools/build.py publish <file> --series <key> --date YYYY-MM-DD [--slug ...]
  python3 tools/build.py publish-all       (re)publish every issue listed in tools/catalog.json

The catalog (tools/catalog.json) is the source of truth for what appears in the
archive. `publish` converts a Mailchimp email into a site page and adds/updates
its catalog entry; `site` regenerates everything derived from the catalog.
"""

import argparse, base64, hashlib, html, json, os, re, sys, datetime, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
CATALOG = ROOT / "tools" / "catalog.json"

SITE = "https://bmelloag.com"
BIZ = "B. Mello Ag Services"
PHONE_TXT = "(559) 816-3889"
PHONE_TEL = "+15598163889"
EMAIL = "bryan@bmelloag.com"
ADDRESS = "5771 7th Avenue, Hanford, California 93230"

# Fill these in once the accounts are wired up; pages degrade gracefully when blank.
MAILCHIMP_ACTION = ""     # Mailchimp embedded-form action URL
CONTACT_ENDPOINT = ""     # Cloudflare Worker / Formspree endpoint for the contact form

SERIES = {
    "field-report":    {"label": "Field Report",         "chip": "Field Report",    "cadence": "Monthly, on the 1st"},
    "ag-crime":        {"label": "Ag Crime Report",      "chip": "Ag Crime",        "cadence": "Monthly"},
    "economic-update": {"label": "Economic Update",      "chip": "Economic Update", "cadence": "Monthly, mid-month"},
    "energy":          {"label": "Weekly Energy Update", "chip": "Weekly Energy",   "cadence": "Every Monday"},
    "fishing":         {"label": "Weekly Fishing Report","chip": "Weekly Fishing",  "cadence": "Every Wednesday"},
    "special":         {"label": "Special Report",       "chip": "Special Report",  "cadence": "As conditions warrant"},
    "holiday":         {"label": "Holiday",              "chip": "Holiday",         "cadence": "Per holiday"},
}
SERIES_ORDER = ["field-report", "ag-crime", "economic-update", "energy", "fishing", "special", "holiday"]

NAV = [("/", "Home"), ("/hay", "Hay"), ("/tractor-spreaders", "Tractor Spreaders"),
       ("/spreader-trucks", "Spreader Trucks"), ("/reports", "Reports"),
       ("/about", "About"), ("/contact", "Contact")]

e = html.escape
MONTH = ["", "January", "February", "March", "April", "May", "June",
         "July", "August", "September", "October", "November", "December"]


# ---------------------------------------------------------------- catalog

def load_catalog():
    if CATALOG.exists():
        return json.loads(CATALOG.read_text(encoding="utf-8"))
    return []


def save_catalog(items):
    items.sort(key=lambda i: (i["date"], i["series"]), reverse=True)
    CATALOG.write_text(json.dumps(items, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


# ---------------------------------------------------------------- chrome

def head(title, desc, path, extra_css="", extra_head=""):
    canon = SITE + path
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<link rel="canonical" href="{e(canon)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="{e(BIZ)}">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:url" content="{e(canon)}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/assets/logo.png">
<link rel="alternate" type="application/rss+xml" title="{e(BIZ)} Reports" href="/feed.xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700;800&family=Source+Serif+4:opsz,wght@8..60,400;8..60,600&family=IBM+Plex+Mono:wght@400;500;600&display=swap">
<link rel="stylesheet" href="/assets/site.css">
{extra_css}{extra_head}</head>
<body>
"""


def masthead(current):
    cur = ' aria-current="page"'
    links = "".join(
        f'<a href="{h}"{cur if h == current else ""}>{e(t)}</a>'
        for h, t in NAV)
    return f"""<header class="masthead">
  <div class="wrap">
    <a class="brand" href="/"><img src="/assets/logo.png" alt="{e(BIZ)}" width="148"></a>
    <nav class="mainnav" aria-label="Main">
      {links}
      <a class="callbtn" href="tel:{PHONE_TEL}">{e(PHONE_TXT)}</a>
    </nav>
  </div>
</header>
"""


def signup_band():
    if MAILCHIMP_ACTION:
        form = (f'<form class="signupform" action="{e(MAILCHIMP_ACTION)}" method="post" '
                f'target="_blank" novalidate>'
                f'<input type="email" name="EMAIL" required placeholder="you@yourfarm.com" '
                f'aria-label="Email address">'
                f'<button type="submit">Subscribe</button></form>')
    else:
        form = (f'<a class="btn btn-gold" href="mailto:{EMAIL}'
                f'?subject=Add%20me%20to%20the%20B%20Mello%20report%20list">Email to subscribe</a>')
    return f"""<section class="band signup">
  <div class="wrap">
    <div class="txt">
      <div class="h">Get these in your inbox</div>
      <div class="p">One list, every title. Unsubscribe anytime.</div>
    </div>
    {form}
  </div>
</section>
"""


def footer():
    cols = "".join(
        f'<a href="{h}">{e(t)}</a>' for h, t in NAV if h != "/")
    year = 2026
    return f"""<footer class="sitefoot">
  <div class="wrap">
    <div>
      <h4>{e(BIZ)}</h4>
      <a href="tel:{PHONE_TEL}">{e(PHONE_TXT)}</a>
      <a href="mailto:{EMAIL}">{e(EMAIL)}</a>
      <a href="https://maps.google.com/?q={e(ADDRESS.replace(' ', '+'))}" rel="noopener">{e(ADDRESS)}</a>
    </div>
    <div>
      <h4>Pages</h4>
      {cols}
    </div>
    <div>
      <h4>Reports</h4>
      <a href="/reports">All issues</a>
      <a href="/feed.xml">RSS feed</a>
    </div>
    <p class="fine">Copyright &copy; {year} {e(BIZ)} &mdash; All rights reserved.
      Hay sales, roadsiding, retrieving, squeeze work, tractor spreading and spreader trucks
      across California's Central Valley.</p>
  </div>
</footer>
</body>
</html>
"""


def write(path, content):
    p = ROOT / path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")
    return p


# ---------------------------------------------------------------- static pages

def latest_cards(items, n=4):
    seen, picked = set(), []
    for i in items:
        if i["series"] in seen:
            continue
        seen.add(i["series"])
        picked.append(i)
        if len(picked) == n:
            break
    cards = "".join(
        f'''<a class="rcard" href="/{i["path"].replace("reports/", "reports/").removesuffix(".html")}">
      <div class="t">{e(SERIES[i["series"]]["label"])}</div>
      <div class="h">{e(i["headline"])}</div>
      <div class="d">{e(i["date_display"])} {i["date"][:4]}</div>
    </a>''' for i in picked)
    return f"""<section class="band">
  <div class="wrap">
    <div class="sechead">
      <span class="eyebrow">Latest reports</span>
      <a class="more" href="/reports" style="color:var(--gold-lit)">All issues &rarr;</a>
    </div>
    <div class="rcards">{cards}</div>
  </div>
</section>
"""


def page_home(items):
    h = head("B. Mello Ag Services — Hay & Custom Spreading, Hanford CA",
             "Hay sales, roadsiding, retrieving and squeeze work, plus tractor spreaders and "
             "spreader trucks for vines, orchards and open ground across California's Central Valley.",
             "/")
    return h + masthead("/") + f"""
<section class="hero">
  <img class="hero-img" src="/assets/img/spreaders.jpg" alt="" aria-hidden="true">
  <div class="wrap">
    <div class="eyebrow">Hanford, California &middot; Since 2005</div>
    <h1>Hay hauled. Ground fed. On your schedule.</h1>
    <p>Balewagons in the field within 24 hours of baling, and four spreaders built for the rows
       everyone else has to drive around.</p>
    <div class="actions">
      <a class="btn btn-gold" href="/contact">Get a quote</a>
      <a class="btn btn-ghost" href="/reports">Read the reports</a>
    </div>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="sechead"><h2>What we do</h2></div>
    <div class="svc">
      <a href="/hay">
        <h3>Hay</h3>
        <p>Sales, roadsiding, retrieving, trucking and squeeze work &mdash; where we got our start,
           and where we are continuing to thrive.</p>
        <span class="more">See hay services &rarr;</span>
      </a>
      <a href="/tractor-spreaders">
        <h3>Tractor Spreaders</h3>
        <p>Dry soil amendments on everything from tight trellis rows to open fields. You name it,
           we spread it.</p>
        <span class="more">See tractor spreading &rarr;</span>
      </a>
      <a href="/spreader-trucks">
        <h3>Spreader Trucks</h3>
        <p>The largest jobs, with pinpoint accuracy at increased load capacity &mdash; and still able
           to work compact ground.</p>
        <span class="more">See spreader trucks &rarr;</span>
      </a>
    </div>
  </div>
</section>

<img class="strip" src="/assets/img/balewagon.jpg" alt="A B. Mello Freeman balewagon on the road">

{latest_cards(items)}

<section>
  <div class="wrap prose">
    <div class="sechead"><h2>Twenty years in the Valley</h2></div>
    <p>B. Mello Ag Services was established on January 1, 2005 near Hanford, built first on hay sales.
       Tractor spreaders came in September 2009, opening up vineyards, orchards and fields. Spreader
       trucks followed in December 2014 and greatly increased both load capacity and time efficiency.</p>
    <p><a href="/about">More about the company and Bryan Mello &rarr;</a></p>
  </div>
</section>

{signup_band()}
""" + footer()


def simple_page(slug, title, tag, body_html, desc, strip=None):
    h = head(f"{title} — {BIZ}", desc, slug)
    strip_html = f'<img class="strip" src="{strip}" alt="">' if strip else ""
    return h + masthead(slug) + f"""
<header class="pagehead">
  <div class="wrap">
    <div class="eyebrow">{e(BIZ)}</div>
    <h1>{e(title)}</h1>
    <p class="tag">{tag}</p>
  </div>
</header>
{strip_html}
<section>
  <div class="wrap prose">
{body_html}
  </div>
</section>
""" + footer()


def page_hay():
    body = """    <p>Integrated into many aspects of the hay business &mdash; hay sales, roadsiding, retrieving,
       trucking and squeeze work &mdash; we offer services backed by years of experience.</p>

    <h2>Equipment</h2>
    <p>We run four Freeman big balewagons. The 5500 wagons stack 3x3, 3x4 and 4x4 bales, and can
       stack big bales up to six high. Our Freeman small balewagons haul eleven-high stacks, up to
       ninety-two bales per stack.</p>

    <h2>Coverage and turnaround</h2>
    <p>Our balewagons cover over 10,000 acres per cutting, and we will be in the field within 24 hours
       of hay baling. Retriever trucks handle deliveries as small as 60 bales, or as many as you need.</p>

    <h2>What we buy and sell</h2>
    <ul>
      <li>Alfalfa</li>
      <li>Wheat straw</li>
      <li>Rice straw</li>
      <li>Sudan</li>
    </ul>
    <p>Both big and small bales. <a href="/contact">Call for a quote</a>.</p>"""
    return simple_page("/hay", "Hay",
                       "Where we got our start, and where we are continuing to thrive.",
                       body,
                       "Hay sales, roadsiding, retrieving, trucking and squeeze work from B. Mello Ag "
                       "Services in Hanford, CA. Four Freeman balewagons, 10,000+ acres per cutting.",
                       "/assets/img/sunset.jpg")


def page_tractor():
    body = """    <p>Our tractor spreaders allow us to spread dry soil amendments on everything from tight rows to
       open fields. Vines, citrus, nuts &mdash; the compact size of these spreaders gives us great
       versatility on where we can take them.</p>

    <h2>The fleet</h2>
    <p>Two Termite spreaders and two spreaders we built ourselves. We designed the custom units for
       trellis and overhead vines: their small profile has let us spread where others could not drive
       through.</p>

    <h2>Application</h2>
    <p>Banding, side discharge and broadcast of any dry material, which lets us take care of any
       permanent crop. We specialize in walnuts, almonds, pistachios and vines.</p>
    <p>Our experienced crews leave a clean drop site and make sure your material goes out at the
       application rate you specify, applied the way you want it.</p>

    <h2>Material</h2>
    <p>We can also get prices on material &mdash; gypsum, limestone, sulfur and compost.
       <a href="/contact">Call for your quote today</a>.</p>"""
    return simple_page("/tractor-spreaders", "Tractor Spreaders",
                       "You name it, we spread it.",
                       body,
                       "Custom tractor spreading for vines, citrus and nuts across the Central Valley. "
                       "Banding, side discharge and broadcast of any dry material.",
                       "/assets/img/spreaders.jpg")


def page_trucks():
    body = """    <p>Our spreader trucks allow us to tackle the largest jobs with ease. Specifically designed to
       spread with pinpoint accuracy even with increased load capacity, these trucks are not limited to
       open fields &mdash; they can also spread in compact areas.</p>

    <h2>Why we added them</h2>
    <p>Spreader trucks joined the operation in December 2014 and greatly increased our load capacity as
       well as our time efficiency. It is the segment of our business taking us into the future.</p>

    <h2>Material</h2>
    <p>Gypsum, limestone, sulfur, compost and other dry amendments. We can quote material as well as
       application. <a href="/contact">Call for your quote today</a>.</p>"""
    return simple_page("/spreader-trucks", "Spreader Trucks",
                       "The segment of our business taking us into the future.",
                       body,
                       "High-capacity spreader trucks for the largest jobs, with pinpoint accuracy in "
                       "open fields and compact ground alike.")


def page_about():
    body = """    <h2>Our background</h2>
    <p>The company was established on January 1, 2005, near Hanford in California's Central Valley.
       Initially focused on hay sales, we built the operation into a competitive enterprise. In
       September 2009 we added tractor spreaders, enabling application of materials to vineyards,
       orchards and fields. The business expanded again in December 2014 with the addition of spreader
       trucks, which greatly increased our load capacity as well as time efficiency.</p>

    <h2>Bryan Mello, founder</h2>
    <p><img src="/assets/img/bryan.jpg" alt="Bryan Mello with his children in a tractor cab"
       style="float:right;width:270px;margin:4px 0 16px 22px;border:1px solid var(--hairline)">
       Bryan Mello is a Hanford native who grew up in agriculture, surrounded by all aspects of farming.
       He established the business in 2005 and continues to develop company services, while also
       conducting outside sales for Superior Soil Company.</p>

    <h2>What we publish</h2>
    <p>Alongside the hay and spreading work, we put out regular reports on Central Valley field
       conditions, rural crime, commodity and fuel markets, and the water and weather that move them.
       They are free, and every issue is <a href="/reports">on the site</a>.</p>
    <p style="clear:both">With over twenty years of experience in ag sales and service, we provide
       products and services that meet or beat your expectations. Our experienced crews do the job to
       your specifications, in a clean and timely manner.</p>"""
    return simple_page("/about", "About Us",
                       "Hay and custom spreading out of Hanford since 2005.",
                       body,
                       "B. Mello Ag Services was established in 2005 near Hanford, California. "
                       "Founder Bryan Mello grew up in Central Valley agriculture.")


def page_contact():
    if CONTACT_ENDPOINT:
        right = f"""      <form class="cform" action="{e(CONTACT_ENDPOINT)}" method="post">
        <div><label for="cn">Name</label><input id="cn" name="name" required></div>
        <div><label for="ce">Email</label><input id="ce" type="email" name="email" required></div>
        <div><label for="cp">Phone</label><input id="cp" type="tel" name="phone"></div>
        <div><label for="cm">What do you need?</label><textarea id="cm" name="message" required></textarea></div>
        <button class="btn btn-gold" type="submit">Send</button>
      </form>"""
    else:
        right = f"""      <div class="prose">
        <h2>Fastest way to reach us</h2>
        <p>Call or text Bryan directly &mdash; the quickest route to a quote.</p>
        <p style="display:flex;gap:11px;flex-wrap:wrap;margin-top:18px">
          <a class="btn btn-gold" href="tel:{PHONE_TEL}">Call {e(PHONE_TXT)}</a>
          <a class="btn" style="border-color:var(--hairline);color:var(--ink)"
             href="mailto:{EMAIL}">Email us</a>
        </p>
      </div>"""

    h = head(f"Contact — {BIZ}",
             f"Call {PHONE_TXT} or email {EMAIL}. B. Mello Ag Services, {ADDRESS}.",
             "/contact")
    return h + masthead("/contact") + f"""
<header class="pagehead">
  <div class="wrap">
    <div class="eyebrow">{e(BIZ)}</div>
    <h1>Contact</h1>
    <p class="tag">Hay, spreading, material pricing &mdash; call us for a quote today.</p>
  </div>
</header>
<section>
  <div class="wrap">
    <div class="contactgrid">
      <ul class="factlist">
        <li><span class="k">Phone</span><span class="v"><a href="tel:{PHONE_TEL}">{e(PHONE_TXT)}</a></span></li>
        <li><span class="k">Email</span><span class="v"><a href="mailto:{EMAIL}">{e(EMAIL)}</a></span></li>
        <li><span class="k">Address</span><span class="v">{e(ADDRESS)}</span></li>
        <li><span class="k">Service area</span><span class="v">California's Central Valley</span></li>
      </ul>
{right}
    </div>
  </div>
</section>
{signup_band()}
""" + footer()


# ---------------------------------------------------------------- reports index

def reports_index(items):
    chips = ['<button class="chip on" data-f="all" type="button">All reports'
             '<span class="ct" data-ctfor="all"></span></button>']
    for k in SERIES_ORDER:
        if any(i["series"] == k for i in items):
            chips.append(f'<button class="chip" data-f="{k}" type="button">'
                         f'{e(SERIES[k]["chip"])}<span class="ct" data-ctfor="{k}"></span></button>')
    rows, current = [], None
    for i in items:
        mk = i["date"][:7]
        if mk != current:
            current = mk
            y, m = int(mk[:4]), int(mk[5:7])
            rows.append(f'<div class="monthbreak"><span>{MONTH[m]} {y}</span><i></i></div>')
        url = "/" + i["path"].removesuffix(".html")
        hay = e(" ".join([SERIES[i["series"]]["label"], i["headline"], i["summary"],
                          i.get("meta", ""), i["date_display"]]).lower())
        rows.append(f'''<article class="issue" data-series="{i["series"]}" data-hay="{hay}">
  <div class="idate"><span class="d">{e(i["date_display"])}</span><span class="y">{i["date"][:4]}</span></div>
  <div class="ibody">
    <div class="ilabel">{e(SERIES[i["series"]]["label"])}</div>
    <h3><a href="{url}">{e(i["headline"])}</a></h3>
    <p>{e(i["summary"])}</p>
    <div class="imeta">{e(i.get("meta", ""))}</div>
  </div>
  <a class="iact" href="{url}">Read</a>
</article>''')

    h = head(f"Reports — {BIZ}",
             "Field conditions, ag crime, commodity and fuel markets, water and weather — every "
             "issue B. Mello Ag Services publishes, free and searchable.",
             "/reports")
    return h + masthead("/reports") + f"""
<header class="pagehead">
  <div class="wrap">
    <div class="eyebrow">bmelloag.com / reports</div>
    <h1>Reports</h1>
    <p class="tag">Everything we publish &mdash; field conditions, ag crime, commodity and fuel
       markets, and the water and weather that move them. Free, and on the web the day it goes out.</p>
  </div>
</header>
{signup_band()}
<div class="controls">
  <div class="wrap">
    <div class="searchrow">
      <input id="q" type="search" placeholder="Search issues &mdash; try &ldquo;diesel&rdquo;, &ldquo;almond&rdquo;, &ldquo;copper&rdquo;" aria-label="Search reports">
      <span class="tally" id="tally"></span>
    </div>
    <div class="chips" role="group" aria-label="Filter by report">
      {"".join(chips)}
    </div>
  </div>
</div>
<main class="wrap" style="padding-top:8px">
{chr(10).join(rows)}
  <div class="empty" id="empty">No issues match that search.</div>
</main>
<script src="/assets/archive.js" defer></script>
""" + footer()


ARCHIVE_JS = """(function () {
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
"""


def series_pages(items):
    """One landing page per title, e.g. /reports/field-report."""
    out = []
    for k in SERIES_ORDER:
        subset = [i for i in items if i["series"] == k]
        if not subset:
            continue
        label = SERIES[k]["label"]
        rows = []
        for i in subset:
            url = "/" + i["path"].removesuffix(".html")
            rows.append(f'''<article class="issue">
  <div class="idate"><span class="d">{e(i["date_display"])}</span><span class="y">{i["date"][:4]}</span></div>
  <div class="ibody">
    <h3><a href="{url}">{e(i["headline"])}</a></h3>
    <p>{e(i["summary"])}</p>
    <div class="imeta">{e(i.get("meta", ""))}</div>
  </div>
  <a class="iact" href="{url}">Read</a>
</article>''')
        h = head(f"{label} — {BIZ}",
                 f"Every issue of the {label} from B. Mello Ag Services. {SERIES[k]['cadence']}.",
                 f"/reports/{k}")
        page = h + masthead("/reports") + f"""
<header class="pagehead">
  <div class="wrap">
    <div class="eyebrow"><a href="/reports" style="color:var(--gold)">Reports</a></div>
    <h1>{e(label)}</h1>
    <p class="tag">{e(SERIES[k]['cadence'])} &middot; {len(subset)} issue{"s" if len(subset) != 1 else ""} published.</p>
  </div>
</header>
{signup_band()}
<main class="wrap" style="padding:22px 26px 10px">
{chr(10).join(rows)}
</main>
""" + footer()
        out.append((f"reports/{k}/index.html", page))
    return out


def feed(items):
    def rfc(d):
        y, m, dd = (int(x) for x in d.split("-"))
        return datetime.datetime(y, m, dd, 12, 0, 0).strftime("%a, %d %b %Y %H:%M:%S +0000")
    entries = "".join(f"""  <item>
    <title>{e(SERIES[i["series"]]["label"])}: {e(i["headline"])}</title>
    <link>{SITE}/{i["path"].removesuffix(".html")}</link>
    <guid isPermaLink="true">{SITE}/{i["path"].removesuffix(".html")}</guid>
    <pubDate>{rfc(i["date"])}</pubDate>
    <description>{e(i["summary"])}</description>
  </item>
""" for i in items[:60])
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>{e(BIZ)} — Reports</title>
  <link>{SITE}/reports</link>
  <description>Central Valley field conditions, ag crime, commodity and fuel markets.</description>
  <language>en-us</language>
{entries}</channel></rss>
"""


def sitemap(items):
    urls = [n[0] for n in NAV] + [f"/reports/{k}" for k in SERIES_ORDER
                                  if any(i["series"] == k for i in items)]
    urls += ["/" + i["path"].removesuffix(".html") for i in items]
    body = "".join(f"  <url><loc>{SITE}{u}</loc></url>\n" for u in urls)
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + body + '</urlset>\n')


def build_site():
    items = load_catalog()
    write("index.html", page_home(items))
    write("hay.html", page_hay())
    write("tractor-spreaders.html", page_tractor())
    write("spreader-trucks.html", page_trucks())
    write("about.html", page_about())
    write("contact.html", page_contact())
    write("reports/index.html", reports_index(items))
    write("assets/archive.js", ARCHIVE_JS)
    for path, content in series_pages(items):
        write(path, content)
    write("feed.xml", feed(items))
    write("sitemap.xml", sitemap(items))
    write("_redirects", "/monthly-newsletter  /reports  301\n/newsletter  /reports  301\n")
    write("robots.txt", f"User-agent: *\nAllow: /\nSitemap: {SITE}/sitemap.xml\n")
    print(f"site: {len(items)} issues in catalog, static pages rebuilt")


# ---------------------------------------------------------------- email -> page

MERGE_TAG = re.compile(r"\*\|[^|]*\|\*")
VIEW_IN_BROWSER = re.compile(
    r"<(\w+)[^>]*>[^<]*(?:(?:view|read)\s+(?:this|it)?[^<]{0,40}?in (?:your )?browser|"
    r"having trouble viewing this email)[^<]*</\1>", re.I)


def _split_rules(css):
    """Top-level CSS rules, brace-balanced."""
    rules, depth, buf = [], 0, ""
    for ch in css:
        buf += ch
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                rules.append(buf)
                buf = ""
    if buf.strip():
        rules.append(buf)
    return rules


def scope_css(css, scope):
    """Prefix every selector so an imported stylesheet cannot restyle the site
    chrome. `body`/`html`/`:root` collapse onto the scope element itself."""
    css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
    out = []
    for rule in _split_rules(css):
        rule = rule.strip()
        if not rule:
            continue
        m = re.match(r"^(@[\w-]+[^{]*)\{(.*)\}$", rule, re.S)
        if m:
            at, inner = m.group(1).strip(), m.group(2)
            if at.split()[0].lower() in ("@media", "@supports", "@layer", "@container"):
                out.append(f"{at}{{{scope_css(inner, scope)}}}")
            else:                      # @font-face, @keyframes, @import — leave alone
                out.append(rule)
            continue
        m = re.match(r"^([^{]+)\{(.*)\}$", rule, re.S)
        if not m:
            out.append(rule)
            continue
        sels, body = m.group(1), m.group(2)
        new = []
        for s in sels.split(","):
            s = s.strip()
            if not s:
                continue
            if re.match(r"^(html|body|:root)\b", s):
                rest = re.sub(r"^(html|body|:root)\b", "", s).strip()
                new.append(f"{scope} {rest}".strip() if rest else scope)
            else:
                new.append(f"{scope} {s}")
        if new:
            out.append(f"{', '.join(new)}{{{body}}}")
    return "\n".join(out)


def clean_email(src_html, asset_dir, url_prefix):
    """Strip Mailchimp scaffolding, pull base64 images out to files.
    Returns (styles, body_html, images_written)."""
    doc = src_html

    # 1. pull <style> blocks out of the head and scope them to .emailbody, so a
    #    standalone page's stylesheet can't take over the site's own chrome
    raw_css = "\n".join(m.group(1) for m in
                        re.finditer(r"<style[^>]*>(.*?)</style>", doc, re.S | re.I))
    styles = f"<style>\n{scope_css(raw_css, '.emailbody')}\n</style>\n" if raw_css.strip() else ""

    # 2. body only
    m = re.search(r"<body[^>]*>(.*)</body>", doc, re.S | re.I)
    body = m.group(1) if m else doc

    # 3. HTML comments — Outlook conditionals, and the production notes some
    #    issues carry (one of which hides a full base64 image). Scripts are
    #    masked first so a "<!--" inside JS is never touched.
    scripts = []

    def stash(m):
        scripts.append(m.group(0))
        return f"\x00SCRIPT{len(scripts) - 1}\x00"

    body = re.sub(r"<script\b.*?</script>", stash, body, flags=re.S | re.I)
    body = re.sub(r"<!--.*?-->", "", body, flags=re.S)
    for n, s in enumerate(scripts):
        body = body.replace(f"\x00SCRIPT{n}\x00", s)

    # 4. Mailchimp conditional/merge tags and the browser-view line
    body = MERGE_TAG.sub("", body)
    body = VIEW_IN_BROWSER.sub("", body)

    # 5. hidden preheader divs (they duplicate the summary we already show)
    body = re.sub(r'<div[^>]*(?:display\s*:\s*none|max-height\s*:\s*0)[^>]*>.*?</div>',
                  "", body, flags=re.S | re.I, count=2)

    # 6. base64 images -> real files
    written = []
    os.makedirs(asset_dir, exist_ok=True)

    def swap(match):
        mime, data = match.group(1), match.group(2)
        ext = {"jpeg": "jpg", "jpg": "jpg", "png": "png", "gif": "gif",
               "webp": "webp", "svg+xml": "svg"}.get(mime.lower())
        if not ext:
            return match.group(0)
        try:
            raw = base64.b64decode(data + "=" * (-len(data) % 4))
        except Exception:
            return match.group(0)
        name = hashlib.sha1(raw).hexdigest()[:14] + "." + ext
        dest = os.path.join(asset_dir, name)
        if not os.path.exists(dest):
            with open(dest, "wb") as fh:
                fh.write(raw)
        written.append(name)
        return f'src="{url_prefix}/{name}"'

    body = re.sub(r'src="data:image/([A-Za-z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+?)"',
                  swap, body, flags=re.S)
    return styles, body.strip(), written


def prev_next(items, entry):
    same = [i for i in items if i["series"] == entry["series"]]
    same.sort(key=lambda i: i["date"], reverse=True)
    ids = [i["id"] for i in same]
    if entry["id"] not in ids:
        return None, None
    k = ids.index(entry["id"])
    newer = same[k - 1] if k > 0 else None
    older = same[k + 1] if k + 1 < len(same) else None
    return newer, older


def render_issue(entry, styles, body, items):
    label = SERIES[entry["series"]]["label"]
    y, m, d = (int(x) for x in entry["date"].split("-"))
    pretty = f"{MONTH[m]} {d}, {y}"
    newer, older = prev_next(items, entry)
    nav = []
    if newer:
        nav.append(f'<a href="/{newer["path"].removesuffix(".html")}">&larr; Newer issue</a>')
    else:
        nav.append("<span></span>")
    nav.append(f'<a href="/reports/{entry["series"]}">All {e(label)} issues</a>')
    if older:
        nav.append(f'<a href="/{older["path"].removesuffix(".html")}">Older issue &rarr;</a>')
    else:
        nav.append("<span></span>")

    ld = json.dumps({
        "@context": "https://schema.org", "@type": "NewsArticle",
        "headline": entry["headline"], "datePublished": entry["date"],
        "description": entry["summary"],
        "author": {"@type": "Organization", "name": BIZ},
        "publisher": {"@type": "Organization", "name": BIZ},
        "mainEntityOfPage": f'{SITE}/{entry["path"].removesuffix(".html")}',
    }, ensure_ascii=False)

    h = head(f'{entry["title"]} — {BIZ}', entry["summary"],
             "/" + entry["path"].removesuffix(".html"),
             extra_css=styles + "\n",
             extra_head=f'<script type="application/ld+json">{ld}</script>\n')
    return h + masthead("/reports") + f"""
<header class="pagehead issuehead">
  <div class="wrap">
    <div class="eyebrow"><a href="/reports/{entry["series"]}" style="color:var(--gold)">{e(label)}</a></div>
    <h1>{e(entry["headline"])}</h1>
    <p class="dek">{e(entry["summary"])}</p>
    <p class="meta">Published {e(pretty)}{" &middot; " + e(entry["meta"]) if entry.get("meta") else ""}</p>
  </div>
</header>
<div class="emailbody">
  <div class="inner">
{body}
  </div>
</div>
<div class="wrap">
  <nav class="issuenav" aria-label="Issue navigation">{"".join(nav)}</nav>
</div>
{signup_band()}
""" + footer()


def publish_one(entry, items, source_root):
    src = pathlib.Path(source_root) / entry["source"]
    if not src.exists():
        print(f"  MISSING  {entry['source']}")
        return False
    raw = src.read_text(encoding="utf-8", errors="replace")
    slug = entry["id"].split("/")[-1]
    asset_dir = ROOT / "assets" / "reports" / entry["series"] / slug
    styles, body, imgs = clean_email(raw, str(asset_dir),
                                     f"/assets/reports/{entry['series']}/{slug}")
    write(entry["path"], render_issue(entry, styles, body, items))
    print(f"  ok  {entry['path']}  ({len(body)//1024}K html, {len(imgs)} image(s) extracted)")
    return True


def publish_all(source_root):
    items = load_catalog()
    ok = 0
    for entry in items:
        if publish_one(entry, items, source_root):
            ok += 1
    build_site()
    print(f"published {ok}/{len(items)} issues")


# ---------------------------------------------------------------- cli

def main():
    ap = argparse.ArgumentParser(description="B. Mello site builder")
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("site")
    pa = sub.add_parser("publish-all")
    pa.add_argument("--source", required=True, help="root of the newsletter folder")
    args = ap.parse_args()

    if args.cmd == "site":
        build_site()
    elif args.cmd == "publish-all":
        publish_all(args.source)


if __name__ == "__main__":
    main()
