# Builder credit: standard on every site B. Mello builds

Every website B. Mello Ag Services builds carries a credit in its footer that
links back to our services page. Bryan's rule (2026-10-18): visitors should know
we built it, and be sent to bmelloag.com for more information.

## The snippet

Put it in the bottom line of the footer, next to the copyright. Change only
`utm_source` (use the client's domain, or a short name while it is a preview).

```html
<span class="credit">Website by <a href="https://bmelloag.com/web-and-marketing/?utm_source=CLIENTDOMAIN.com&amp;utm_medium=referral&amp;utm_campaign=site-credit" target="_blank" rel="noopener">B. Mello Ag Services</a></span>
```

## Rules

- Link text is always the business name, "B. Mello Ag Services". No keyword
  phrases like "Hanford web design" in the link: Google treats keyword-stuffed
  footer links across many sites as a link scheme.
- Opens in a new tab, so the client's visitor is not taken off their site.
- The `utm_` tags let Google Analytics on bmelloag.com show how many visitors each
  client site sends (Reports > Acquisition > Traffic acquisition, campaign
  "site-credit").
- Style it to match the client's footer: readable, but quieter than their own
  content. Never above the fold, never in their nav.
- Tell the client up front that the credit is part of the build.

## Where it is live

| Site | Where the credit lives | utm_source |
|---|---|---|
| melloacres.com | `C:\Mello Acres Website\tools\build.py` footer template; style in `docs/assets/site.css` (`.foot .credit`) | melloacres.com |
| LookatMe draft | `preview/lookatme/*.html` footers | lookatme (change to their domain at launch) |
