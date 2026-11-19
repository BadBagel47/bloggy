# BACKLOG

IDs: B- (bug), F- (feature), D- (planning/design). Priority: Hög, Medel, Låg.

## Proposed runs

Prioriterat för: kunna skriva och publicera så snabbt som möjligt.

- **A** – strong model, high level – Grund: sajt, databas, inloggning och automatisk publicering – väntar på svar
  - D-001 – Koppla repot till Cloudflare så att varje ändring publiceras automatiskt
  - F-001 – Grundsajt på Cloudflare med databas, på en subdomän till trythis.one
  - F-002 – Adminsidan skyddas av Cloudflares inloggning
  - Fråga: Subdomänen väntar (ägaren avvaktar). Rekommendation: börja på Cloudflares gratisadress och flytta till subdomänen senare.
- **B** – strong model, high level – Skriva och publicera inlägg – bygger på A
  - F-003 – Inlägg med utkast, publicerat och schemalagt, med automatisk sparning
  - F-004 – Editor med formatering, listor, justering, citat och kodblock
  - F-008 – Förhandsvisning innan publicering
  - F-022 – Du väljer själv i editorn var "Läs mer" ska klippa texten på startsidan
  - Fråga: Språk i adminsidan? Rekommendation: svenska.
- **C** – standard model, medium level – Sajtens visning: teman, arkiv, taggar och sidor – bygger på B
  - F-007 – Två–tre teman att välja mellan i admin, med mörkt läge
  - F-006 – Arkiv per månad och år enligt beskrivningen
  - F-005 – Egna taggar och taggsidor
  - F-009 – Fasta sidor, t.ex. "Om mig"
  - F-021 – Upp till fem framlyfta inlägg överst, som man bläddrar mellan i sidled
  - F-023 – Diskreta animationer på sajten
- **D** – standard model, medium level – Delning och säkerhetskopia – bygger på B
  - F-010 – Snygga länkar och delningsinfo för sociala medier
  - F-011 – Exportera allt innehåll med en knapp
- **E** – standard model, medium level – Småtillägg – bygger på C
  - F-015 – RSS-flöde
  - F-016 – Sök
  - F-017 – Lästid per inlägg
  - F-019 – Besöksstatistik utan kakor
- **F** – strong model, high level – Bilder via länk och bildram – bygger på B – väntar på svar
  - F-012 – Stor bild i text
  - F-013 – Bildram att dra i sidled
  - Fråga: Bilder via länk till bild som ligger någon annanstans, innan uppladdning finns? Rekommendation: ja.
  - Fråga: Effekten i bildramen: båge där yttre bilder lyfts upp, eller som skivomslag där yttre bilder också krymper/vrids? Ingen rekommendation.
- Parkerat: F-014 (bilduppladdning), F-020 (kommentarer)

## Open

| ID | Prio | Status | Description |
|----|------|--------|-------------|
| D-001 | Hög | | Automatic publishing: connect GitHub repo to Cloudflare Workers Builds (one-time action by the user), deploy on push to main. Include D1 migrations in the build. |
| D-002 | Hög | | Design proposal: two themes (Clean, Magazine) × two typographies, light + dark, public site + admin. First version published as a private page (https://claude.ai/artifact/EFsWzcVxS7LAxs4oko3b1h). Waiting for the owner's feedback; the chosen result becomes the themes in F-007. |
| F-001 | Hög | | Base site: Cloudflare Worker + D1, public site on a subdomain of trythis.one. Include WEB.md basics. |
| F-002 | Hög | | Admin login via Cloudflare Access on `/admin` (no own password handling). |
| F-003 | Hög | | Posts: create/edit/delete, statuses draft, published, scheduled (publish time). Autosave of drafts. |
| F-004 | Hög | | Editor (WYSIWYG + markdown shortcuts): bold, italic, headings, bullet/numbered lists, align left/centre/right, quotes, code blocks. |
| F-005 | Medel | | Custom tags: create freely on posts; tag pages listing all posts with a tag. |
| F-006 | Medel | | Archive: posts grouped per month with count, e.g. "January (5)", grouped per year. Hide empty months. Older years collapsed. The latest year that has posts is expanded by default (e.g. 2027 without posts → 2026 is expanded). |
| F-007 | Medel | | Themes: Clean and Magazine, built exactly as in the design proposal (D-002); the owner picks one in admin under Theme, plus Magazine's typography (classic/modern). Dark mode follows the visitor's setting. Fonts are self-hosted (not loaded from Google's servers) to avoid sending visitors' IP addresses to Google (GDPR). |
| F-008 | Medel | | Preview a post exactly as visitors will see it before publishing. |
| F-009 | Medel | | Static pages (e.g. "About me") alongside posts. |
| F-010 | Medel | | Clean URLs (slugs) and share info (title, description, image) for social media. |
| F-011 | Medel | | Export all content (posts, pages, tags) as a backup with one click. |
| F-012 | Medel | | Large image in post text. Initially via link to an externally hosted image (question open). |
| F-013 | Medel | | Image strip that can be dragged sideways; outer images are pushed up (arc), images keep their proportions. Exact effect: question open. |
| F-015 | Låg | | RSS feed. |
| F-016 | Låg | | Search. |
| F-017 | Låg | | Reading time per post. |
| F-019 | Låg | | Cookie-free visitor statistics (Cloudflare Web Analytics). No cookie banner needed. |
| F-021 | Medel | | Featured posts: up to 5 posts marked "Featured" in the editor are shown at the top of the home page as a large slider. Manual only: arrows, dots and swipe; never auto-advances. The first featured post is the most prominent element on the page. Featured posts are not repeated in the "Latest" list. Replaces F-018. |
| F-022 | Hög | | Read-more break: the author places a "Read more" break in the editor. Text above it is the intro shown with the title on the home page; the rest needs a click on "Read more". |
| F-023 | Medel | | Subtle animations where they fit: content rises in on load, slider slides, archive months fold out, underline and arrow on hover, toggles. Respect "reduce motion". |
| F-014 | Låg | Parkerad | Image upload to Cloudflare R2. Waiting: owner does not want to use account storage for media yet. |
| F-020 | Låg | Parkerad | Comments. Advised against for now: spam protection, moderation and GDPR. |

## Done

| ID | Description |
|----|-------------|
| F-018 | Pin posts to the top. Replaced by F-021 (featured posts), 2026-11-18. |
