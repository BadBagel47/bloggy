# HANDOFF

Rules version: 1.14
Inventory: 2026-11-18 – repo was empty (no commits, branches, issues or pull requests).
Project language: not decided yet (see Q5 in BACKLOG.md). Code, comments and commits in English.

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

## One-time actions

- D-001 Connect the GitHub repo to Cloudflare (Workers Builds) – pending, needed in run group A.
- Cloudflare Access for the admin – pending, part of F-002.

## Environment notes (2026-11-18)

- Cloud session; can push to `claude/` branches. Running third-party installers via npx was blocked by the session's safety check.
- No Cloudflare access from the session: deploys go through the Git integration.

## Latest

- 2026-11-18: Brainstorm done, rules set up, backlog and first run proposal written.
