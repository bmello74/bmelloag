# bmelloag.com

The B. Mello Ag Services website. Plain HTML — no CMS, no database, no build
step beyond one Python script. Hosted free on Cloudflare Pages, which redeploys
automatically on every push to `main`.

## Layout

```
index.html                     home
hay.html · tractor-spreaders.html · spreader-trucks.html · about.html · contact.html
reports/index.html             the archive (search + filter by title)
reports/<title>/index.html     one landing page per report title
reports/<title>/<slug>.html    one page per issue
assets/site.css                every style on the site
assets/img/                    site photography
assets/reports/                images extracted out of newsletter emails
feed.xml · sitemap.xml · robots.txt · _redirects
tools/build.py                 the generator
tools/catalog.json             the list of published issues — source of truth
```

## Publishing a newsletter

Newsletters are written and sent exactly as before. To put one on the site,
add its entry to `tools/catalog.json` and run:

```
python3 tools/build.py publish-all --source "C:\Customer Monthly Newletter"
```

That converts the Mailchimp email into a site page — stripping merge tags and
the "view in browser" line, pulling any base64-embedded images out into real
files, scoping the email's CSS so it cannot leak into the site chrome — then
regenerates the archive index, the per-title pages, the homepage strip, the RSS
feed and the sitemap.

To rebuild only the static pages (after a copy edit, say):

```
python3 tools/build.py site
```

## Catalog entries

```json
{
  "id": "field-report/2026-09",
  "series": "field-report",
  "slug": "2026-09",
  "date": "2026-09-01",
  "date_display": "Sep 1",
  "title": "September 2026 Field Report",
  "headline": "Short, specific — this is the archive headline",
  "summary": "One or two sentences. The email's preheader usually works as-is.",
  "meta": "Crop status · Fertilizer · Market brief",
  "source": "26 Field Report Newsletter/B Mello September 2026 Field Report.html",
  "path": "reports/field-report/2026-09.html"
}
```

Valid `series` values: `field-report`, `ag-crime`, `economic-update`, `energy`,
`fishing`, `special`, `holiday`.

## Still to wire up

- `MAILCHIMP_ACTION` in `tools/build.py` — the audience's embedded-form URL.
  Until it is set, the signup band falls back to a mailto link.
- `CONTACT_ENDPOINT` in `tools/build.py` — a form handler. Until it is set, the
  contact page shows call/email buttons instead of a form.
