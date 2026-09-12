# suyashdubey.com — portfolio & consulting site

A hand-built static site. No framework, no build step, no tracking. Five HTML pages,
one stylesheet, two scripts, one webfont request. Drop the folder on any static host.

## Run it locally

```bash
python3 -m http.server 8899 --directory .
```

Then open http://localhost:8899. A server is required (the pages use absolute
`/assets/...` paths, so opening `index.html` from the filesystem won't load them).

## Structure

```
index.html                     home — hero, services, process, work, experience, about, FAQ, contact
work/*.html                    three case studies (Asha Health, EMB Global, ABHA)
404.html                       not-found page
assets/css/styles.css          the whole design system
assets/js/prism.js             WebGL "neural prism" + animated SVG fallback
assets/js/main.js              reveals, counters, tilt, cursor, nav, FAQ, contact form
assets/img/og.png              social preview card (1200×630)
og.html                        source for og.png — noindexed, safe to delete
resume/…-Resume.pdf            the downloadable résumé
robots.txt · sitemap.xml · llms.txt · _headers
```

## Before you publish

**1. Set your real domain.** Everything canonical points at `suyashdubey.com`.
Replace it everywhere in one go:

```bash
grep -rl "suyashdubey.com" . --include="*.html" --include="*.xml" --include="*.txt" | xargs sed -i '' 's|suyashdubey\.com|YOURDOMAIN.com|g'
```

**2. Update `<lastmod>` in `sitemap.xml`** when you change page content.

**3. Regenerate the social card** if you edit `og.html`:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --disable-gpu --hide-scrollbars --force-device-scale-factor=1 --window-size=1200,630 --virtual-time-budget=6000 --screenshot=assets/img/og.png http://localhost:8899/og.html
```

## Deploying

Live on **GitHub Pages** from `main` (root), repo `suyashdube/suyashdubey.com`.
Pushing to `main` redeploys — no build step, no CI.

The `CNAME` file pins the custom domain. Until `suyashdubey.com` has DNS, GitHub
redirects the `github.io` URL to it, so the site is unreachable by design.

### DNS records to add at the registrar

Apex (`suyashdubey.com`) — four A records and four AAAA:

```
A     @    185.199.108.153
A     @    185.199.109.153
A     @    185.199.110.153
A     @    185.199.111.153
AAAA  @    2606:50c0:8000::153
AAAA  @    2606:50c0:8001::153
AAAA  @    2606:50c0:8002::153
AAAA  @    2606:50c0:8003::153
CNAME www  suyashdube.github.io.
```

**If the DNS is on Cloudflare, set every record to "DNS only" (grey cloud).** With
the orange proxy on, GitHub cannot complete its ACME challenge and the certificate
never issues — the single most common way this setup stalls.

Once the records resolve, turn on **Enforce HTTPS** in the repo's Pages settings
(it is greyed out until the certificate is issued, usually well under an hour).

Also verify the domain under GitHub → Settings → Pages → *Verified domains*. That
stops anyone else pointing a GitHub Pages site at this domain if it ever lapses.

### Moving to Cloudflare Pages later

Connect the same repo, framework preset "None", build command empty, output
directory `/`. `_headers` starts working the moment you do.

## Notes on the build

- **The contact form needs no backend.** It validates client-side, then composes the
  brief and offers three routes to you: the visitor's default mail app (attempted
  automatically), a one-click Gmail compose window, and a *Copy the brief* button with
  your address shown in plain text. Every route ends in an email to
  `dsuyash57@gmail.com` that the visitor sends themselves — nothing leaves the page on
  its own, and no analytics or third-party scripts load. To collect submissions
  server-side instead, add `data-netlify="true"` and a `name` attribute to the `<form>`
  in `index.html` and remove the `submit` handler in `assets/js/main.js`.
- **The experience rail is an interactive widget**, not dates — a deterministic node
  constellation per role that drifts on its own and leans toward your pointer.
- **Your phone number is deliberately not on the site.** The résumé PDF in `/resume`
  still contains it — replace that file with a phone-free version if you'd rather not
  publish it.
- **Metrics are marked approximate** (`≈40%`, `≈20%`, `≈60%`) with a footnote saying
  they're from previous roles and internally measured. Keep that framing.
- **The hero renders in WebGL** — seven nested super-elliptic ribbons with an
  iridescent thin-film shader. Devices without WebGL get an animated SVG version of
  the same form; `prefers-reduced-motion` freezes both on a still pose.
- **Reveal animations are fail-safe.** They're gated on a `js` class and force
  themselves visible after four seconds, so content can never be stuck invisible.

## SEO / AEO

Per-page canonical, description, Open Graph and Twitter cards. JSON-LD on every page:
`Person`, `WebSite`, `ProfilePage`, `ProfessionalService` with an `OfferCatalog` of the
four services, `FAQPage` on the home page, and `Article` + `BreadcrumbList` on each case
study. `robots.txt` explicitly welcomes GPTBot, ClaudeBot, PerplexityBot and
Google-Extended, and `llms.txt` gives answer engines a clean plain-text summary.
