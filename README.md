# Bloggy

A slim personal CMS and blog that runs entirely on Cloudflare: a Worker serves the public site and the admin, D1 stores the content, and Cloudflare Access protects the admin.

- **Public site** (English): two themes, *Clean* and *Magazine*, with up to five featured posts in a sideways slider, a latest-posts list, a month/year archive, tags, static pages and share info for social media. Light and dark mode follow the visitor's device.
- **Admin** (Swedish) at `/admin`: posts and pages with draft, published and scheduled states, a formatting editor (headings, bold/italic/underline/strike, links, lists, alignment, quotes, inline code, code blocks), a "Läs mer" break that decides the intro shown on the home page, tags, featured posts, preview, theme choice and a one-click export of all content.

## How it is built

| Part | Where |
| --- | --- |
| Worker entry and routes | `src/index.js` |
| Database (D1) and schema | `src/db.js` – tables are created by the Worker on first use |
| Admin login check (Cloudflare Access JWT) | `src/auth.js` |
| HTML cleaning of post content | `src/sanitize.js` |
| Public pages | `src/views/site.js`, `public/css/*.css`, `public/js/site.js` |
| Admin pages | `src/views/admin.js`, `public/css/admin.css` |
| Editor (TipTap) | `admin-src/editor.js`, bundled to `public/admin/editor.js` |
| Self-hosted fonts (Google Fonts, SIL OFL) | `public/fonts/` |

The editor bundle is committed, so Cloudflare's default deploy command (`npx wrangler deploy`) needs no build step. After changing `admin-src/editor.js`, run `npm run build` and commit the result.

## Develop locally

```bash
npm install
echo "DEV_ADMIN_BYPASS=1" > .dev.vars   # lets you open /admin on localhost without Cloudflare Access
npx wrangler dev
node scripts/seed-local.mjs              # optional sample content
```

## Tests

```bash
npm run check                 # editor bundle up to date + unit tests
node scripts/smoke.mjs        # end-to-end test against a running `wrangler dev`
```

## Deploy

Deploys happen automatically from the `main` branch through Cloudflare's Git integration (Workers Builds). The D1 database is created automatically on the first deploy. The admin stays locked until `ACCESS_TEAM_DOMAIN` and `ACCESS_AUD` are set as Worker variables. Setup steps are in [HANDOFF.md](HANDOFF.md).
