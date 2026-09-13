"""Walk the built site and report what a search engine would hold against it.

Run after every build: python tools/seo_audit.py
Exit code is 1 if anything FAILs, so it can gate a commit later if we want.

This checks the mechanical things only -- the ones that are either right or
wrong. Whether the words on the page are the words people search for is a
judgement call and stays a human job.
"""
import json, pathlib, re, sys, collections

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = "https://bmelloag.com"

fails, warns = [], []
def fail(p, m): fails.append((p, m))
def warn(p, m): warns.append((p, m))

pages = sorted(p for p in ROOT.rglob("*.html")
               if "_to_delete" not in p.parts and "assets" not in p.parts
               and not p.name.startswith("B Mello "))

titles, descs, canons = collections.defaultdict(list), collections.defaultdict(list), set()
rows = []

def tag(html, pattern):
    m = re.search(pattern, html, re.I | re.S)
    return m.group(1).strip() if m else None

skipped = 0
for p in pages:
    rel = "/" + str(p.relative_to(ROOT)).replace("\\", "/").replace("/index.html", "").lstrip("/")
    rel = "/" if rel in ("/index.html", "/") else rel
    h = p.read_text(encoding="utf-8", errors="replace")

    # A page that tells Google not to index it has nothing to optimise. The
    # old-URL redirect stubs are all of these.
    if re.search(r'<meta name="robots"[^>]*noindex', h, re.I):
        skipped += 1
        continue

    title = tag(h, r"<title>(.*?)</title>")
    desc  = tag(h, r'<meta name="description" content="(.*?)"')
    canon = tag(h, r'<link rel="canonical" href="(.*?)"')
    h1s   = re.findall(r"<h1[^>]*>(.*?)</h1>", h, re.I | re.S)
    og    = tag(h, r'<meta property="og:title" content="(.*?)"')
    ogimg = tag(h, r'<meta property="og:image" content="(.*?)"')
    tw    = tag(h, r'<meta name="twitter:card" content="(.*?)"')
    lds   = re.findall(r'<script type="application/ld\+json">(.*?)</script>', h, re.S)
    imgs  = re.findall(r"<img\b[^>]*>", h, re.I)
    noalt = [i for i in imgs if not re.search(r'\balt="', i)]

    if not title: fail(rel, "no <title>")
    else:
        titles[title].append(rel)
        n = len(re.sub(r"&[a-z]+;", "x", title))
        if n > 65: warn(rel, f"title is {n} chars, over ~60 and Google will cut it")
        if n < 20: warn(rel, f"title is only {n} chars")
    if not desc: fail(rel, "no meta description")
    else:
        descs[desc].append(rel)
        n = len(desc)
        if n > 165: warn(rel, f"description is {n} chars, over ~160 and it gets cut")
        if n < 70:  warn(rel, f"description is only {n} chars, room to say more")
    if not canon: fail(rel, "no canonical")
    elif canon in canons: warn(rel, f"canonical duplicated: {canon}")
    else: canons.add(canon)
    if len(h1s) == 0: fail(rel, "no <h1>")
    elif len(h1s) > 1: warn(rel, f"{len(h1s)} <h1> tags")
    if not og: warn(rel, "no og:title")
    if not ogimg: warn(rel, "no og:image")
    if not tw: warn(rel, "no twitter:card")
    if noalt: fail(rel, f"{len(noalt)} <img> with no alt")

    types = []
    for block in lds:
        try: obj = json.loads(block)
        except Exception: fail(rel, "unparseable JSON-LD"); continue
        t = obj.get("@type")
        types += t if isinstance(t, list) else [t]
    rows.append((rel, title, len(desc or ""), types))

for t, where in titles.items():
    if len(where) > 1: fail(where[1], f"duplicate <title> with {where[0]}: {t[:50]}")
for d, where in descs.items():
    if len(where) > 1: fail(where[1], f"duplicate description with {where[0]}")

# sitemap must list every real page, and list nothing that 404s
sm = (ROOT / "sitemap.xml")
if sm.exists():
    listed = set(re.findall(r"<loc>(.*?)</loc>", sm.read_text(encoding="utf-8")))
    have = {SITE + (r if r != "/" else "/") for r, *_ in rows}
    missing = sorted(have - listed - {SITE + "/404", SITE + "/404.html"})
    for m in missing[:20]: warn("sitemap", f"page not in sitemap: {m}")
    # `build.py site` does not regenerate the archive issues, so on a partial
    # build the sitemap legitimately lists pages that are not on disk here.
    orphan = [x for x in sorted(listed - have) if not re.match(r".*/reports/[a-z-]+/\d{4}", x)]
    for x in orphan[:20]: warn("sitemap", f"sitemap lists a page that was not built: {x}")
else:
    fail("/", "no sitemap.xml")

print(f"{len(rows)} pages checked, {skipped} noindex redirect stubs skipped\n")
print(f"{'PAGE':<34} {'DESC':>4}  SCHEMA")
for rel, title, dn, types in rows:
    print(f"{rel:<34} {dn:>4}  {','.join(sorted(set(t for t in types if t))) or '-'}")

print(f"\n--- {len(fails)} FAIL")
for p, m in fails: print(f"  FAIL {p}: {m}")
print(f"--- {len(warns)} WARN")
for p, m in warns: print(f"  WARN {p}: {m}")
sys.exit(1 if fails else 0)
