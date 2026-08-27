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

# Mailchimp's hosted signup landing page. Blank falls back to a mailto link.
MAILCHIMP_SIGNUP_URL = "https://mailchi.mp/bmelloag/subscribe-to-b-mello-newsletter"
CONTACT_ENDPOINT = ""     # Cloudflare Worker / Formspree endpoint for the contact form

SPREAD_AREA = "Bakersfield to Madera"
SALES_AREA = "all of California and into the western states"

# The two house themes. The soil line is the customer-facing promise and rides in
# the masthead on every page; the American line closes the footer.
THEME_SOIL = "Tailored for your soil &middot; Central Valley proven"
THEME_AMERICAN = ("Proudly American &mdash; "
                  "<span>Rooted in the American Dream</span>")

SERIES = {
    "field-report":    {"label": "Field Report",          "chip": "Field Report",    "cadence": "Monthly, on the 1st",
                        "banner": "field-report",
                        "blurb": "Crop stage, what should be going on the ground, and the market behind it."},
    "ag-crime":        {"label": "Ag Crime Report",       "chip": "Ag Crime",        "cadence": "Monthly",
                        "banner": "ag-crime",
                        "blurb": "County briefs, statewide trends and the hotspot map."},
    "economic-update": {"label": "Economic Update",       "chip": "Economic Update", "cadence": "Monthly, mid-month",
                        "banner": "economic-update",
                        "blurb": "Milk and dairy, grain futures, fuel, water and Valley weather."},
    "energy":          {"label": "Weekly Energy Update",  "chip": "Weekly Energy",   "cadence": "Every Monday",
                        "banner": "energy",
                        "blurb": "Fuel prices, energy markets and what they mean for your budget."},
    "fishing":         {"label": "Weekly Fishing Report", "chip": "Weekly Fishing",  "cadence": "Every Wednesday",
                        "banner": "fishing",
                        "blurb": "Lake conditions, best bites and where they're biting."},
    "special":         {"label": "Special Report",        "chip": "Special Report",  "cadence": "As conditions warrant",
                        "banner": "special",
                        "blurb": "One subject, in depth, when the market makes it urgent."},
    "holiday":         {"label": "Holiday",               "chip": "Holiday",         "cadence": "Per holiday",
                        "blurb": "Greetings from the B. Mello family."},
}
SERIES_ORDER = ["field-report", "ag-crime", "economic-update", "energy", "fishing", "special", "holiday"]

NAV = [("/", "Home"), ("/plant-nutrition", "Plant Nutrition"),
       ("/tractor-spreaders", "Tractor Spreaders"), ("/spreader-trucks", "Spreader Trucks"),
       ("/hay", "Hay"), ("/reports", "Reports"),
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
    <a class="brand" href="/">
      <img src="/assets/logo.png" alt="{e(BIZ)}" width="475" height="243">
    </a>
    <div class="mast-right">
      <span class="mast-tag">{THEME_SOIL}</span>
      <a class="callbtn" href="tel:{PHONE_TEL}">{e(PHONE_TXT)}</a>
    </div>
  </div>
</header>
<nav class="navbar" aria-label="Main">
  <div class="wrap">
    {links}
  </div>
</nav>
"""


def signup_band():
    if MAILCHIMP_SIGNUP_URL:
        cta = (f'<a class="btn btn-gold" href="{e(MAILCHIMP_SIGNUP_URL)}" '
               f'target="_blank" rel="noopener">Subscribe free</a>')
    else:
        cta = (f'<a class="btn btn-gold" href="mailto:{EMAIL}'
               f'?subject=Add%20me%20to%20the%20B%20Mello%20report%20list">Email to subscribe</a>')
    return f"""<section class="band signup">
  <div class="wrap">
    <div class="txt">
      <div class="h">Get these in your inbox</div>
      <div class="p">Field conditions, ag crime, fuel and commodity markets. One list, every
        title, unsubscribe anytime.</div>
    </div>
    {cta}
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
    <p class="theme">{THEME_AMERICAN}</p>
    <p class="fine">Copyright &copy; {year} {e(BIZ)} &mdash; All rights reserved.
      Fertilizer and soil amendment sales, custom tractor spreading and spreader trucks,
      and hay &mdash; out of Hanford, California.</p>
  </div>
</footer>
</body>
</html>
"""


# Public URLs are extensionless (/hay, /reports/energy/2026-08-24). Cloudflare
# resolved those from hay.html by itself; most hosts don't. Writing every page as
# <path>/index.html makes the same URLs work on GitHub Pages, plain Apache/nginx,
# cPanel — anywhere. The URLs themselves do not change.
ROOT_FILES = {"index.html", "404.html"}


def out_path(path):
    if path in ROOT_FILES or path.endswith("/index.html") or not path.endswith(".html"):
        return path
    return path[:-len(".html")] + "/index.html"


def write(path, content):
    p = ROOT / out_path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")
    return p


def redirect_page(to, note):
    """A real page that forwards — _redirects files are Cloudflare-only."""
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Moved &mdash; {e(BIZ)}</title>
<link rel="canonical" href="{SITE}{to}">
<meta http-equiv="refresh" content="0; url={to}">
<meta name="robots" content="noindex">
<style>body{{font-family:system-ui,sans-serif;margin:16vh auto;max-width:34em;padding:0 24px;
line-height:1.6;color:#16150F;background:#FBF9F3}}a{{color:#A8860A}}</style>
</head>
<body>
<p>{e(note)} This page has moved to <a href="{to}">{SITE}{to}</a>.</p>
<script>location.replace("{to}");</script>
</body>
</html>
"""


# ---------------------------------------------------------------- static pages

def latest_cards(items, n=None):
    # One card per report title, in business order (Field Report first), each
    # showing that title's newest issue. Holiday greetings are not a report.
    picked = []
    for k in SERIES_ORDER:
        if k == "holiday":
            continue
        sub = [i for i in items if i["series"] == k]
        if sub:
            picked.append(sub[0])
    cards = "".join(
        f'''<a class="rcard" href="/{i["path"].removesuffix(".html")}">
      <div class="t">{e(SERIES[i["series"]]["label"])}</div>
      <div class="h">{e(i["headline"])}</div>
      <div class="d">{e(i["date_display"])} {i["date"][:4]}</div>
    </a>''' for i in picked)
    return f'''<section class="band">
  <div class="wrap">
    <div class="sechead">
      <span class="eyebrow">Latest reports</span>
      <a class="more" href="/reports" style="color:var(--gold-lit)">All issues &rarr;</a>
    </div>
    <div class="rcards">{cards}</div>
  </div>
</section>
'''


def page_home(items):
    h = head("B. Mello Ag Services — Plant Nutrition, Soil Amendments & Custom Spreading",
             "Fertilizer and soil amendment sales across California and the western states, with "
             "tractor spreaders for trees, vines and kiwis and spreader trucks for open ground from "
             "Bakersfield to Madera.",
             "/")
    return h + masthead("/") + f"""
<section class="hero">
  <img class="hero-img" src="/assets/img/spreaders.jpg" alt="" aria-hidden="true">
  <div class="wrap">
    <div class="eyebrow">Hanford, California &middot; Since 2005</div>
    <h1>Targeted plant nutrition, sold and spread.</h1>
    <p>It starts with GPS-guided soil sampling and ends with material on the ground at the rate your
       blocks actually call for. Fertilizer sales across California and into the western states;
       spreading from Bakersfield to Madera.</p>
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
      <a href="/plant-nutrition">
        <h3>Targeted Plant Nutrition</h3>
        <p>GPS-guided soil sampling, a customized plan for your blocks, and the fertilizer and
           amendments to carry it out.</p>
        <span class="more">See the program &rarr;</span>
      </a>
      <a href="/tractor-spreaders">
        <h3>Tractor Spreaders</h3>
        <p>Almonds, pistachios, citrus, walnuts, fruit trees, pomegranates, vines and kiwis
           &mdash; including rows others can't drive through.</p>
        <span class="more">See tractor spreading &rarr;</span>
      </a>
      <a href="/spreader-trucks">
        <h3>Spreader Trucks</h3>
        <p>Open ground broadcast, pre-plant rows and woodchip spreading &mdash; at volume,
           without losing the placement.</p>
        <span class="more">See spreader trucks &rarr;</span>
      </a>
      <a href="/hay">
        <h3>Hay</h3>
        <p>Where we started. We still buy and sell hay, and stack and haul it with our own
           equipment.</p>
        <span class="more">See hay services &rarr;</span>
      </a>
    </div>
  </div>
</section>

<img class="strip" src="/assets/img/sunset.jpg" alt="Central Valley field at sunset">

{latest_cards(items)}

<section>
  <div class="wrap">
    <div class="sechead"><h2>How the program works</h2></div>
    <p style="color:var(--ink-soft);max-width:66ch;margin:0">Blanket-rating a whole ranch treats good
       ground and short ground the same way. Ours doesn't.</p>
    <ol class="program">
      <li><div class="body"><h3>GPS-guided soil sampling</h3>
        <p>Sampled on a grid and mapped, so the variability inside a block shows up instead of being
           averaged away.</p></div></li>
      <li><div class="body"><h3>A customized plan</h3>
        <p>Targeted plant nutrition and soil health, written against what your ground came back
           short of &mdash; block by block, not ranch-wide.</p></div></li>
      <li><div class="body"><h3>Application</h3>
        <p>Tractor spreaders in permanent crops, spreader trucks on open ground, at the rate the
           plan calls for.</p></div></li>
    </ol>

    <div class="prose" style="margin-top:52px">
    <div class="sechead"><h2>One call covers the material and the application</h2></div>
    <p>Most growers have to buy the product from one company and find somebody else to put it out.
       We do both. That means the rate you specify is the rate that actually reaches the ground, and
       there's one person to call when something needs adjusting.</p>
    <p>We started in hay in 2005. Tractor spreaders came in 2009 and opened up orchards and vineyards;
       spreader trucks followed in 2014 and took on the open ground. Along the way the center of the
       business moved to where it is now &mdash; plant nutrition and soil health.</p>
    <p><a href="/about">More about the company and Bryan Mello &rarr;</a></p>
    </div>
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


def page_nutrition():
    body = f"""    <p>Targeted plant nutrition is the core of what we do. Not a blanket rate across a whole ranch
       &mdash; a program built from what your ground actually came back short of, block by block, and
       then carried out with our own equipment.</p>

    <h2>The program</h2>
    <ol class="program">
      <li><div class="body"><h3>GPS-guided soil sampling</h3>
        <p>Samples pulled on a mapped grid rather than a handful of spots. Good ground and short
           ground stop cancelling each other out in the average.</p></div></li>
      <li><div class="body"><h3>A customized plan</h3>
        <p>A written program for targeted plant nutrition and soil health, matched to the crop, the
           stage and what the sampling found.</p></div></li>
      <li><div class="body"><h3>Application</h3>
        <p><a href="/tractor-spreaders">Tractor spreaders</a> in permanent crops,
           <a href="/spreader-trucks">spreader trucks</a> on open ground, at the rate the plan
           calls for.</p></div></li>
    </ol>

    <h2>What we sell</h2>
    <p><strong>Blends are the centerpiece.</strong> Because the program starts with sampling your own
       ground instead of a catalog, the blend gets mixed for what your soil is actually short of. You
       are not paying for nutrients that are already there, and you are not guessing.</p>
    <p>The products we move the most:</p>
    <ul>
      <li>Custom dry blends</li>
      <li>Gypsum</li>
      <li>Limestone</li>
      <li>Sulfur</li>
      <li>Compost</li>
      <li>Biological and humic products</li>
    </ul>
    <p>That is a short list. We carry a full range of <strong>dry soil amendments</strong> and
       <strong>solution grade</strong> products besides. If you need it, we probably sell it &mdash;
       and at a better price than our closest competitor. <a href="/contact">Call and ask</a>.</p>

    <h2>Where we sell</h2>
    <p>Fertilizer and amendment sales cover {SALES_AREA}. Custom application runs through the Central
       Valley, {SPREAD_AREA}.</p>

    <h2>Start with the soil, not the invoice</h2>
    <p>The most expensive ton of material is the one you did not need. Soil and water testing shows
       what the ground gave up last season and what it is short of now &mdash; the difference between
       a program and a guess.</p>
    <p>The same thinking runs through our <a href="/reports">Field Report</a> every month: crop stage,
       what should be going on the ground, and what materials are doing in the market.</p>
    <p><a href="/contact">Call for a quote today</a>.</p>"""
    return simple_page("/plant-nutrition", "Targeted Plant Nutrition",
                       "GPS-guided soil sampling, a plan built for your blocks, and the material to "
                       "carry it out.",
                       body,
                       "Targeted plant nutrition and soil health from B. Mello Ag Services: GPS-guided "
                       "soil sampling, a customized program, and fertilizer and soil amendment sales "
                       "across California and into the western states.",
                       "/assets/img/spreaders.jpg")


def page_hay():
    body = """    <p>Hay is where the company started in 2005, and we are still in it &mdash; buying, selling,
       stacking and hauling. It sits behind the nutrition side of the business these days, but the
       equipment and the crews are ours and the work gets the same attention it always did.</p>

    <h2>What we buy and sell</h2>
    <ul>
      <li>Alfalfa</li>
      <li>Wheat straw</li>
      <li>Rice straw</li>
      <li>Sudan</li>
    </ul>
    <p>Big bales and small bales alike.</p>

    <h2>Stacking and hauling</h2>
    <p>We run our own balewagons and retriever trucks, so roadsiding, retrieving, stacking and trucking
       are handled in house rather than subcontracted out. Big-bale stacks go up several high; small
       bales are stacked tall and tight for the haul.</p>
    <p>We move on hay quickly after baling &mdash; leaving a crop sitting in the field is how quality
       gets lost. <a href="/contact">Call for a quote</a>.</p>"""
    return simple_page("/hay", "Hay",
                       "Where we started, and still part of what we do.",
                       body,
                       "B. Mello Ag Services buys and sells alfalfa, wheat straw, rice straw and sudan, "
                       "and handles roadsiding, retrieving, stacking and trucking in house.",
                       "/assets/img/hay-fleet.jpg")


def page_tractor():
    body = f"""    <p>Tractor spreaders are how we get dry material into permanent crops. Trees, vines and kiwis
       &mdash; the compact profile is the point. We can work trellis and overhead rows that other
       spreaders have to drive around.</p>

    <h2>Crops</h2>
    <p>Including but not limited to:</p>
    <ul class="taglist">
      <li>Almonds</li><li>Pistachios</li><li>Citrus</li><li>Walnuts</li>
      <li>Fruit trees</li><li>Pomegranates</li><li>Vines</li><li>Kiwis</li>
    </ul>

    <h2>Application</h2>
    <p>Banding, side discharge and broadcast of any dry material. Your material goes out at the rate
       you specify, placed the way you want it &mdash; and our crews leave a clean drop site behind
       them.</p>

    <h2>Where we work</h2>
    <p>{SPREAD_AREA}, throughout the Central Valley.</p>

    <h2>Material too, if you want it</h2>
    <p>We sell the <a href="/plant-nutrition">gypsum, limestone, sulfur, compost and dry blends</a> as well
       as spreading them, so one quote can cover both. <a href="/contact">Call for your quote
       today</a>.</p>"""
    return simple_page("/tractor-spreaders", "Tractor Spreaders",
                       "Trees, vines and kiwis &mdash; including the rows nothing else fits down.",
                       body,
                       "Custom tractor spreading for almonds, walnuts, pistachios, citrus, grapes and "
                       "kiwis from Bakersfield to Madera. Banding, side discharge and broadcast of any "
                       "dry material.",
                       "/assets/img/spreaders-fleet.jpg")


def page_trucks():
    body = f"""    <p>Spreader trucks are for open ground. They carry far more material per load than a tractor rig,
       which is what makes large acreage practical &mdash; and they place it accurately enough that
       volume does not cost you precision.</p>

    <h2>What they do</h2>
    <ul class="taglist">
      <li>Open ground broadcast</li><li>Pre-plant rows</li><li>Woodchip spreading</li>
    </ul>
    <p style="margin-top:16px">Any job where the acreage or the tonnage would have a tractor spreader
       running all week. They are not limited to wide-open ground either &mdash; they can work tighter
       areas when the job calls for it.</p>

    <h2>Where we work</h2>
    <p>{SPREAD_AREA}, throughout the Central Valley.</p>

    <h2>Material too, if you want it</h2>
    <p>Gypsum, limestone, sulfur, compost and dry blends &mdash; we can
       <a href="/plant-nutrition">quote the material</a> alongside the application.
       <a href="/contact">Call for your quote today</a>.</p>"""
    return simple_page("/spreader-trucks", "Spreader Trucks",
                       "Open ground, at volume, without losing the placement.",
                       body,
                       "High-capacity spreader trucks for open fields and large blocks from Bakersfield "
                       "to Madera, placing gypsum, limestone, sulfur, compost and dry blends accurately.",
                       "/assets/img/trucks-fleet.jpg")


def page_about():
    body = f"""    <h2>How we got here</h2>
    <p>The company was established on January 1, 2005 near Hanford, in California's Central Valley, on
       hay. In September 2009 we added tractor spreaders, which opened up vineyards and orchards. In
       December 2014 spreader trucks followed and took on the open ground.</p>
    <p>Each of those steps moved us further toward what the business is now: <strong>plant nutrition and
       soil health</strong>. Today fertilizer and soil amendment sales are the core of what we do, the
       spreading work is how that material gets into the ground, and hay &mdash; still bought, sold,
       stacked and hauled &mdash; sits behind them.</p>

    <h2>Where we work</h2>
    <p>Fertilizer and amendment sales reach {SALES_AREA}. Custom spreading covers the Central Valley,
       {SPREAD_AREA}.</p>

    <h2>Bryan Mello, founder</h2>
    <p><img src="/assets/img/bryan.jpg" alt="Bryan Mello with his children in a tractor cab"
       style="float:right;width:270px;margin:4px 0 16px 22px;border:1px solid var(--hairline)">
       Bryan Mello is a Hanford native who grew up in agriculture, surrounded by all aspects of farming.
       He established the business in 2005 and continues to develop company services, while also
       conducting outside sales for Superior Soil Company.</p>

    <h2>What we publish</h2>
    <p style="clear:both">We put out regular reports on Central Valley field conditions, rural crime,
       commodity and fuel markets, and the water and weather that move them. They are free, they go out
       by email, and every issue is <a href="/reports">on this site</a>. They exist because the same
       information we use to advise a nutrition program is worth having whether or not you buy a ton
       from us.</p>
    <p>Over twenty years in ag sales and service. Our crews do the job to your specifications, in a
       clean and timely manner &mdash; <a href="/contact">call us for a quote</a>.</p>"""
    return simple_page("/about", "About Us",
                       "Plant nutrition and soil health, out of Hanford since 2005.",
                       body,
                       "B. Mello Ag Services was established in 2005 near Hanford, California, and today "
                       "focuses on plant nutrition and soil health — fertilizer sales, custom spreading "
                       "and hay.")


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
    <p class="tag">Material pricing, custom spreading, hay &mdash; call us for a quote today.</p>
  </div>
</header>
<section>
  <div class="wrap">
    <div class="contactgrid">
      <ul class="factlist">
        <li><span class="k">Phone</span><span class="v"><a href="tel:{PHONE_TEL}">{e(PHONE_TXT)}</a></span></li>
        <li><span class="k">Email</span><span class="v"><a href="mailto:{EMAIL}">{e(EMAIL)}</a></span></li>
        <li><span class="k">Address</span><span class="v">{e(ADDRESS)}</span></li>
        <li><span class="k">Spreading</span><span class="v">Central Valley, Bakersfield to Madera</span></li>
        <li><span class="k">Fertilizer sales</span><span class="v">All of California, into the western states</span></li>
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

    titlecards = []
    for k in SERIES_ORDER:
        sub = [i for i in items if i["series"] == k]
        if not sub or not SERIES[k].get("banner"):
            continue
        titlecards.append(
            f'<a class="titlecard" href="/reports/{k}">'
            f'<img src="/assets/img/reports/{SERIES[k]["banner"]}.jpg" alt="" '
            f'width="1200" loading="lazy">'
            f'<div class="tc-body">'
            f'<div class="tc-name">{e(SERIES[k]["label"])}</div>'
            f'<div class="tc-blurb">{e(SERIES[k].get("blurb", ""))}</div>'
            f'<div class="tc-meta">{e(SERIES[k]["cadence"])} &middot; '
            f'{len(sub)} issue{"s" if len(sub) != 1 else ""}</div>'
            f'</div></a>')
    titlegrid = "".join(titlecards)

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
<section class="tight">
  <div class="wrap">
    <div class="sechead"><h2>What we publish</h2></div>
    <div class="titlegrid">{titlegrid}</div>
  </div>
</section>
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
        banner = SERIES[k].get("banner")
        banner_html = (f'<div class="wrap"><img class="series-banner" '
                       f'src="/assets/img/reports/{banner}.jpg" alt="{e(label)}" '
                       f'width="1200" loading="lazy"></div>') if banner else ""
        page = h + masthead("/reports") + f"""
<header class="pagehead">
  <div class="wrap">
    <div class="eyebrow"><a href="/reports" style="color:var(--gold)">Reports</a></div>
    <h1>{e(label)}</h1>
    <p class="tag">{e(SERIES[k].get('blurb', ''))}</p>
    <p class="meta-line">{e(SERIES[k]['cadence'])} &middot; {len(subset)} issue{"s" if len(subset) != 1 else ""} published</p>
  </div>
</header>
{banner_html}
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


def page_404(items):
    latest = items[0] if items else None
    tip = ""
    if latest:
        url = "/" + latest["path"].removesuffix(".html")
        tip = (f'<p>The newest thing we published is '
               f'<a href="{url}">{e(latest["headline"])}</a>.</p>')
    h = head(f"Page not found — {BIZ}",
             "That page doesn't exist. Try the reports archive or the home page.",
             "/404")
    return h + masthead("") + f"""
<header class="pagehead">
  <div class="wrap">
    <div class="eyebrow">404</div>
    <h1>That page isn't here</h1>
    <p class="tag">The link may be old, or we may have moved it. Everything we publish lives in
       the reports archive.</p>
  </div>
</header>
<section>
  <div class="wrap prose">
    {tip}
    <p style="display:flex;gap:11px;flex-wrap:wrap;margin-top:22px">
      <a class="btn btn-gold" href="/reports">Browse all reports</a>
      <a class="btn" style="border-color:var(--hairline);color:var(--ink)" href="/">Home</a>
      <a class="btn" style="border-color:var(--hairline);color:var(--ink)" href="tel:{PHONE_TEL}">Call {e(PHONE_TXT)}</a>
    </p>
  </div>
</section>
""" + footer()


def build_site():
    items = load_catalog()
    write("index.html", page_home(items))
    write("404.html", page_404(items))
    write("plant-nutrition.html", page_nutrition())
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
    for old, new, note in [
        ("monthly-newsletter", "/reports",         "The newsletter page is now the full report archive."),
        ("newsletter",         "/reports",         "The newsletter page is now the full report archive."),
        ("about-us",           "/about",           "About Us moved."),
        ("contact-us",         "/contact",         "Contact moved."),
        ("fertilizer",         "/plant-nutrition", "Fertilizer is now Targeted Plant Nutrition."),
    ]:
        write(f"{old}/index.html", redirect_page(new, note))
    # Cloudflare honours this; other hosts ignore it. Harmless either way.
    write("_redirects",
          "/monthly-newsletter  /reports           301\n"
          "/newsletter          /reports           301\n"
          "/about-us            /about             301\n"
          "/contact-us          /contact           301\n"
          "/fertilizer          /plant-nutrition   301\n")
    # GitHub Pages: skip Jekyll (it drops files beginning with _), and claim the domain.
    write(".nojekyll", "")
    write("CNAME", "bmelloag.com\n")
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
