# Yatharth — Landing Page

Landing page for **Yatharth**, Bhumika Verma's child psychology and educational consulting practice in Bhopal.

**Live:** https://yatharth-bhopal.vercel.app

It is a static site: one HTML page built from the design export with Tailwind CSS and a small Node build script. There is no framework and no server code, and nothing runs at request time.

## Quick start

Requirements: **Node.js 20+** and npm. Python 3 is used only for the local preview server.

```bash
npm ci          # install exact dependency versions from package-lock.json
npm run build   # build the site into site/
npm run dev     # build, then serve site/ at http://localhost:4321
```

## Deploying

Deploys go through **GitHub → Vercel**. The Vercel project `yatharth` is connected to this repository.

| Push to | Result |
| --- | --- |
| `main` | Production deploy to https://yatharth-bhopal.vercel.app |
| any other branch | Preview deploy with its own URL, shown in the Vercel dashboard |

```bash
git add -A
git commit -m "Describe the change"
git push origin main
```

Vercel runs `npm ci` and then `npm run build`, and serves the `site/` folder. These settings live in `vercel.json`, so nothing needs to be configured in the dashboard. You can follow a build under **Vercel → yatharth → Deployments**.

> Run `npm run build` locally before pushing. The build fails loudly on missing contact fields, icons, images or download files, and it's better to see that before Vercel does.

## Common edits

| To change… | Edit |
| --- | --- |
| Phone, WhatsApp, email, address, hours | `src/contact.json`. It updates every link, label, copy button and the search-engine data |
| Page text and layout | `src/index.html` |
| The downloadable toolkit PDF | Replace the file in `pdf/` and keep the same filename so shared links keep working. If you rename it, update the button `href` in `src/index.html` |
| Photos, favicon, social preview | `public/assets/` |
| Colours, fonts, spacing | `tailwind.config.cjs` (design tokens from `DESIGN.md`) |
| Interactions (menu, copy buttons) | `src/main.js` |
| Security and cache headers | `vercel.json` |

When replacing a photo, keep the dimensions (square 600×600 for the hero, 520×650 for the portrait) and export it as WebP.

## Project structure

```
├── src/
│   ├── index.html      # page source (contact links are data attributes, filled at build)
│   ├── contact.json    # single source of truth for contact details
│   ├── main.js         # mobile menu, copy-to-clipboard, toast, animation pausing
│   ├── input.css       # Tailwind entry + custom CSS
│   ├── fonts.css       # self-hosted @font-face rules
│   ├── icons.svg       # SVG sprite (Material Symbols subset)
│   ├── 404.html        # branded not-found page
│   └── build.mjs       # build script (see below)
├── public/             # copied as-is into site/ (assets/ gets fingerprinted)
│   ├── assets/         # images, fonts, favicon, OG image
│   ├── .well-known/security.txt
│   ├── robots.txt, sitemap.xml, site.webmanifest
├── pdf/                # downloadable toolkit → served from /downloads/
├── tailwind.config.cjs
├── vercel.json         # build settings, cache + security headers
├── code.html, DESIGN.md, screen.png   # original design export (reference only)
└── site/               # build output (git-ignored)
```

### What the build does

`npm run build` compiles Tailwind into `.build/styles.css`, then `src/build.mjs` does the rest:

1. **Copies static files:** `public/` goes to `site/`, and `pdf/` goes to `site/downloads/`.
2. **Fingerprints assets:** every file in `assets/` is renamed with a content hash (e.g. `bhumika-square.706a149989.webp`). Browsers can then cache them for a year, and a changed file always gets a new URL.
3. **Fills in contact details:** they're written into the HTML from `contact.json`, so every link works even without JavaScript.
4. **Swaps the icons:** icon placeholders are replaced with inline SVGs from the sprite. Only the icons actually used are included.
5. **Inlines and adds structured data:** the CSS is inlined, the JSON-LD for search engines is added, and the whitespace is minified.
6. **Checks the result:** the build fails if an inline script, a missing asset or a broken download link would ship.

## Analytics

[Vercel Web Analytics](https://vercel.com/docs/analytics) and [Speed Insights](https://vercel.com/docs/speed-insights) are loaded with two script tags in `src/index.html`. They're served from the site's own domain under `/_vercel/…`. Both are switched on in the Vercel project. Results appear under the **Analytics** and **Speed Insights** tabs. Analytics uses no cookies and collects no personal data.

## Performance, accessibility and SEO

Lighthouse (mobile) scores 100 in Performance, Accessibility, Best Practices and SEO. This comes from:

- **Speed:** self-hosted, subset fonts with preload, an inline SVG icon sprite instead of an icon font, inlined CSS, responsive images, and animations that only use transform and opacity and pause when off screen.
- **Accessibility:** decorative icons are hidden from screen readers, contrast passes WCAG AA, focus outlines are visible, menu buttons expose their state to screen readers, and reduced-motion settings are respected.
- **SEO:** canonical URL, Open Graph and Twitter cards, JSON-LD (`ProfessionalService` and `Person`), `robots.txt` and `sitemap.xml`.

## Caching

| Path | Cache policy |
| --- | --- |
| `/` and other pages | `max-age=0, must-revalidate`: always checks for a new deploy |
| `/assets/*` (fingerprinted) | `max-age=31536000, immutable`: cached for a year |
| `/downloads/*.pdf` | 1 day, then revalidated; sent as an attachment so it downloads |
| `robots.txt`, `sitemap.xml`, manifest, `security.txt` | 1 hour |

## Security

The headers are set in `vercel.json`:

- **Content-Security-Policy:** only same-origin scripts, no inline scripts, `frame-ancestors 'none'`, `object-src 'none'`, `form-action 'none'`
- **Strict-Transport-Security**, **X-Content-Type-Options: nosniff**, **X-Frame-Options: DENY**, **Referrer-Policy**, **Cross-Origin-Opener-Policy**, **Permissions-Policy**
- **External links:** every link that opens in a new tab uses `rel="noopener"`
- **Security contact:** published at `/.well-known/security.txt` (RFC 9116). Update its `Expires` date before 2027-10-24.

If you add a third-party script, font or embed, add its origin to the CSP in `vercel.json`, or the browser will block it.

## Updating the sitemap

If you add pages, list them in `public/sitemap.xml` and update `<lastmod>`.
