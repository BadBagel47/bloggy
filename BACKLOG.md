# BACKLOG

IDs: B- (bug), F- (feature), D- (planning/design). Priority: Hög, Medel, Låg.

## Proposed runs

Prioriterat för: kunna skriva och publicera så snabbt som möjligt.

- **A** – strong model, high level – Grund: sajt, databas, inloggning och automatisk publicering – väntar på svar
  - D-001 – Koppla repot till Cloudflare så att varje ändring publiceras automatiskt
  - F-001 – Grundsajt på Cloudflare med databas, på en subdomän till trythis.one
  - F-002 – Adminsidan skyddas av Cloudflares inloggning
  - Fråga: Vilken subdomän? Rekommendation: blog.trythis.one.
  - Fråga: Språk på sajten för besökare (menyer, datum, "Läs mer")? Ingen rekommendation, beror på vilka som ska läsa.
- **B** – strong model, high level – Skriva och publicera inlägg – bygger på A
  - F-003 – Inlägg med utkast, publicerat och schemalagt, med automatisk sparning
  - F-004 – Editor med formatering, listor, justering, citat och kodblock
  - F-008 – Förhandsvisning innan publicering
  - Fråga: Språk i adminsidan? Rekommendation: svenska.
- **C** – standard model, medium level – Sajtens visning: teman, arkiv, taggar och sidor – bygger på B
  - F-007 – Två–tre teman att välja mellan i admin, med mörkt läge
  - F-006 – Arkiv per månad och år enligt beskrivningen
  - F-005 – Egna taggar och taggsidor
  - F-009 – Fasta sidor, t.ex. "Om mig"
- **D** – standard model, medium level – Delning och säkerhetskopia – bygger på B
  - F-010 – Snygga länkar och delningsinfo för sociala medier
  - F-011 – Exportera allt innehåll med en knapp
- **E** – standard model, medium level – Småtillägg – bygger på C
  - F-015 – RSS-flöde
  - F-016 – Sök
  - F-017 – Lästid per inlägg
  - F-018 – Fästa inlägg överst
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
| D-002 | Hög | | Design proposal: 2–3 visual directions (public site + admin, desktop + mobile, light + dark) shown as a private page. The chosen directions become the themes in F-007. Waiting for the owner's answers on style, colours, fonts, layout and site name. |
| F-001 | Hög | | Base site: Cloudflare Worker + D1, public site on a subdomain of trythis.one. Include WEB.md basics. |
| F-002 | Hög | | Admin login via Cloudflare Access on `/admin` (no own password handling). |
| F-003 | Hög | | Posts: create/edit/delete, statuses draft, published, scheduled (publish time). Autosave of drafts. |
| F-004 | Hög | | Editor (WYSIWYG + markdown shortcuts): bold, italic, headings, bullet/numbered lists, align left/centre/right, quotes, code blocks. |
| F-005 | Medel | | Custom tags: create freely on posts; tag pages listing all posts with a tag. |
| F-006 | Medel | | Archive: posts grouped per month with count, e.g. "January (5)", grouped per year. Hide empty months. Older years collapsed. The latest year that has posts is expanded by default (e.g. 2027 without posts → 2026 is expanded). |
| F-007 | Medel | | Themes: 2–3 simple but good-looking themes; the owner picks one in admin. Dark mode follows the visitor's setting. |
| F-008 | Medel | | Preview a post exactly as visitors will see it before publishing. |
| F-009 | Medel | | Static pages (e.g. "About me") alongside posts. |
| F-010 | Medel | | Clean URLs (slugs) and share info (title, description, image) for social media. |
| F-011 | Medel | | Export all content (posts, pages, tags) as a backup with one click. |
| F-012 | Medel | | Large image in post text. Initially via link to an externally hosted image (question open). |
| F-013 | Medel | | Image strip that can be dragged sideways; outer images are pushed up (arc), images keep their proportions. Exact effect: question open. |
| F-015 | Låg | | RSS feed. |
| F-016 | Låg | | Search. |
| F-017 | Låg | | Reading time per post. |
| F-018 | Låg | | Pin posts to the top. |
| F-019 | Låg | | Cookie-free visitor statistics (Cloudflare Web Analytics). No cookie banner needed. |
| F-014 | Låg | Parkerad | Image upload to Cloudflare R2. Waiting: owner does not want to use account storage for media yet. |
| F-020 | Låg | Parkerad | Comments. Advised against for now: spam protection, moderation and GDPR. |

## Done

None yet.
