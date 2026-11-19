# HANDOFF

Rules version: 1.14
Inventory: 2026-11-18 – repo was empty (no commits, branches, issues or pull requests).
Project language: English (site text, decided 2026-11-18). Code, comments and commits in English.

## Goal

Bloggy: a slim personal CMS/blog running entirely on Cloudflare, public from the start, on a subdomain of trythis.one. The owner writes in a browser-based admin; visitors see a fast, simple, good-looking site.

## Current state

Run groups A–D are built and tested locally (unit tests, end-to-end smoke test, browser checks of both themes, admin, editor, phone width and dark mode). **Not published yet**: the site goes live when the owner connects the repo to Cloudflare (one-time actions below). Code overview: [README.md](README.md).

## Architecture

- Cloudflare Worker (`src/index.js`) serves the public site and the admin (`/admin`). Static files from `public/` via the assets binding.
- Cloudflare D1 binding `DB` (database `bloggy-db`, created by automatic provisioning on the first deploy). The Worker creates its tables itself (`ensureSchema` in `src/db.js`), so deploys need no migration step and the build token needs no D1 migration rights.
- Admin protection: Cloudflare Access self-hosted application on the `/admin` path, plus the Worker verifies the Access JWT (`src/auth.js`). Without `ACCESS_TEAM_DOMAIN` and `ACCESS_AUD` the admin is locked for everyone (fail closed). `keep_vars: true` keeps these dashboard variables on deploy.
- Scheduled posts: visible when `status = 'published'` and `publish_at <= now`; no cron needed.
- Post HTML is cleaned with HTMLRewriter (allowlist) before it is stored. CSP and other security headers on all pages; admin writes require same origin.
- Fonts are self-hosted (`public/fonts`, SIL OFL licences in `LICENSE.txt`) – no visitor requests to Google.
- Editor: TipTap, bundled to `public/admin/editor.js` (committed). Run `npm run build` after editing `admin-src/editor.js`; `npm run check` fails if the bundle is stale.
- Images: none stored yet (F-012–F-014).

## Publishing method

Cloudflare Git integration (Workers Builds): every push to `main` deploys the Worker with the default command `npx wrangler deploy`. Not connected yet – see one-time actions. Site address after connecting: `https://bloggy.<account-subdomain>.workers.dev` (later a trythis.one subdomain, Q8).

## Decisions

- 2026-11-18: Build a slim custom CMS on Cloudflare. EmDash (Cloudflare's full CMS) was evaluated and rejected as overkill.
- 2026-11-18: Site is public from the start (Q1).
- 2026-11-18: Site runs on a subdomain of trythis.one (exact name: Q8).
- 2026-11-18: The owner picks the theme for the whole site in the admin; visitors cannot switch (Q6).
- 2026-11-18: Editor shows formatting directly (WYSIWYG) with markdown-style shortcuts: bold/italic, headings, bullet and numbered lists, alignment (left/centre/right), quotes, code blocks (Q7).
- 2026-11-18: No image storage for now; image upload waits.
- 2026-11-18: Archive spec, see F-006.
- 2026-11-18: Site text in English ("Vi provar engelska").
- 2026-11-18: Site name: "Try this one blog".
- 2026-11-18: No personal name or photo of the owner on the site.
- 2026-11-18: Design direction: two themes, "Clean" (stylish, modern typography) and "Magazine". Light mode with discreet coffee-brown tones; dark mode leaning brown; text with a very faint yellow-brown tint. Each theme has two typography options: modern (sans) and classic (serif).

- 2026-11-18: Home page: up to 5 featured posts in a manual slider (never auto-advancing), the first one most prominent (F-021). Posts show title + intro text; the author decides the intro with a "Read more" break in the editor (F-022). Animate where it fits (F-023).

- 2026-11-19: Clean theme typography chosen: headings Montserrat Alternates weight 400, body DM Sans, larger body text (about 19–20 px). Second typography option for the Clean theme not chosen yet.
- 2026-11-19: Both themes (Clean and Magazine) are kept exactly as designed, including the owner's own size adjustments in the Clean home list (headings 35 px, intro 16 px). The owner switches between them in admin under Theme (design: Admin · Theme). Magazine keeps its two typographies (classic/modern), chosen in the same view.
- 2026-11-19: Featured posts are not repeated in the "Latest" list below the slider (Q12).

- 2026-11-19: Start on Cloudflare's free workers.dev address; move to a trythis.one subdomain later (Q8).
- 2026-11-19: Admin UI in Swedish (Q9). Public site text in English.
- 2026-11-19: Go-ahead for run groups A–D (D-001, F-001–F-011, F-021–F-023).

## One-time actions

1. **Default branch to main** (GitHub → Settings → Default branch) – pending. The work branch became default because it was pushed first to the empty repo.
2. **D-001 Connect the repo to Cloudflare** – pending. Cloudflare dashboard → Workers & Pages → Create application → Import a repository (GitHub) → `BadBagel47/bloggy` → project name `bloggy` (must match `name` in `wrangler.jsonc`), branch `main`, no build command, default deploy command → Save and Deploy.
   - If the first build fails on creating the database: create a D1 database named `bloggy-db` in the dashboard (Storage & Databases → D1) and give its database ID (not secret) to the agent, who adds it to `wrangler.jsonc`.
3. **F-002 Admin login with Cloudflare Access** – pending, after step 2.
   - Zero Trust (free plan) → Access → Applications → Add an application → Self-hosted. Domain: the Worker's workers.dev hostname, path `admin`. Policy: Allow, include Emails = the owner's email. Save.
   - Copy the application's "Application Audience (AUD) Tag", and the team domain (`https://<team>.cloudflareaccess.com`, Zero Trust → Settings).
   - Workers & Pages → bloggy → Settings → Variables and Secrets: add text variables `ACCESS_TEAM_DOMAIN` and `ACCESS_AUD` → Deploy.
   - Check: `/admin` asks for a Cloudflare login and then shows "Inlägg". If deeper admin pages say "Adminsidan är låst", add a second path `admin/*` to the Access application.

## Environment notes

- 2026-11-18: Cloud session; can push to `claude/` branches and to `main`. Running third-party installers via npx was blocked by the session's safety check (npm install of the project's own dependencies works).
- 2026-11-19: No Cloudflare account access from the session: deploys go through the Git integration. developers.cloudflare.com is blocked by the session network; Cloudflare docs were read from the cloudflare-docs GitHub repo instead.
- 2026-11-19: Local testing works: `npx wrangler dev` (with `.dev.vars` `DEV_ADMIN_BYPASS=1`), Playwright/Chromium for browser checks.

## Latest

- 2026-11-19: Run groups A–D built and tested locally (D-001 config, F-001–F-011, F-021–F-023). Waiting for the owner's one-time Cloudflare steps before publishing. Remaining: groups E (RSS, search, reading time, statistics) and F (images, waiting for Q10/Q11).
- 2026-11-19: Design proposal D-002 approved by the owner ("Ser bra ut"). Next: run proposal, waiting for go-ahead.
- 2026-11-18: Design proposal D-002 published as a private page: https://claude.ai/artifact/EFsWzcVxS7LAxs4oko3b1h – waiting for feedback.
