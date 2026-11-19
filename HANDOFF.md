# HANDOFF

Rules version: 1.14
Inventory: 2026-11-18 – repo was empty (no commits, branches, issues or pull requests).
Project language: English (site text, decided 2026-11-18). Code, comments and commits in English.

## Goal

Bloggy: a slim personal CMS/blog running entirely on Cloudflare, public from the start, on a subdomain of trythis.one. The owner writes in a browser-based admin; visitors see a fast, simple, good-looking site.

## Current state

Planning only. Nothing is built. The plan and proposed runs are in [BACKLOG.md](BACKLOG.md).

## Planned architecture (not built)

- Cloudflare Worker serves both the public site and the admin (`/admin`).
- Cloudflare D1 (SQLite) stores posts, pages, tags and settings.
- Cloudflare Access protects `/admin` (login handled by Cloudflare, no passwords stored by us).
- Scheduled posts: a post is visible when status is published and its publish time has passed (no cron needed).
- Images: none stored for now. Later R2 (F-014, parked).
- WEB.md basics are included from the start.

## Publishing method

Not set up yet. Planned: Cloudflare's Git integration (Workers Builds) deploys automatically on every push to main (D-001). This is a one-time action for the user in the Cloudflare dashboard.

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

- Set the repo's default branch to main (GitHub settings) – pending. The work branch became default because it was pushed first to the empty repo.
- D-001 Connect the GitHub repo to Cloudflare (Workers Builds) – pending, needed in run group A.
- Cloudflare Access for the admin – pending, part of F-002.

## Environment notes (2026-11-18)

- Cloud session; can push to `claude/` branches. Running third-party installers via npx was blocked by the session's safety check.
- No Cloudflare access from the session: deploys go through the Git integration.

## Latest

- 2026-11-19: Design proposal D-002 approved by the owner ("Ser bra ut"). Next: run proposal, waiting for go-ahead.
- 2026-11-18: Design proposal D-002 published as a private page: https://claude.ai/artifact/EFsWzcVxS7LAxs4oko3b1h – waiting for feedback.
- 2026-11-18: Brainstorm done, rules set up, backlog and first run proposal written.
