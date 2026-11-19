// Admin pages, in Swedish (decision Q9). Design: D-002 "Admin" views.
import { escapeHtml as h, displayStatus, formatDateSv, MAX_FEATURED } from '../util.js';

const V = '1';
const STATUS_LABEL = { draft: 'Utkast', published: 'Publicerad', scheduled: 'Schemalagd' };

function nav(active) {
  const item = (href, key, label) => `<a href="${href}" class="nav-item${active === key ? ' is-active' : ''}"${active === key ? ' aria-current="page"' : ''}>${label}</a>`;
  return `<nav class="admin-nav" aria-label="Admin">
    <a href="/admin" class="admin-brand">Try this one blog</a>
    ${item('/admin', 'posts', 'Inlägg')}
    ${item('/admin?kind=page', 'pages', 'Sidor')}
    ${item('/admin/tags', 'tags', 'Taggar')}
    ${item('/admin/theme', 'theme', 'Tema')}
    ${item('/admin/export', 'export', 'Exportera')}
    <a href="/" class="nav-item nav-muted" target="_blank" rel="noopener">Visa sajten ↗</a>
  </nav>`;
}

export function layout({ title, active, body, scripts = '', bodyClass = '' }) {
  return `<!doctype html>
<html lang="sv">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<meta name="color-scheme" content="light dark">
<title>${h(title)} · Admin</title>
<link rel="stylesheet" href="/fonts/fonts.css?v=${V}">
<link rel="stylesheet" href="/css/admin.css?v=${V}">
</head>
<body class="${bodyClass}">
<div class="admin-shell">
${active === 'editor' ? '' : nav(active)}
${body}
</div>
${scripts}
</body>
</html>`;
}

function flash(msg, kind = 'ok') {
  return msg ? `<p class="flash flash-${kind}" role="status">${h(msg)}</p>` : '';
}

export function postsListPage({ kind, rows, filter, q, now, message }) {
  const isPage = kind === 'page';
  const counts = { all: rows.length, published: 0, draft: 0, scheduled: 0 };
  for (const r of rows) counts[displayStatus(r, now)]++;
  const shown = rows.filter((r) => filter === 'all' || displayStatus(r, now) === filter);
  const base = isPage ? '/admin?kind=page' : '/admin';
  const sep = isPage ? '&' : '?';
  const tabs = [['all', 'Alla'], ['published', 'Publicerade'], ['draft', 'Utkast'], ['scheduled', 'Schemalagda']]
    .map(([id, label]) => `<a href="${base}${id === 'all' ? '' : `${sep}status=${id}`}${q ? `${id === 'all' ? sep : '&'}q=${encodeURIComponent(q)}` : ''}" class="tab${filter === id ? ' is-active' : ''}"${filter === id ? ' aria-current="true"' : ''}>${label} <span class="muted">${counts[id]}</span></a>`).join('');

  const table = shown.length ? `
    <div class="table-box"><table class="post-table">
      <thead><tr><th scope="col">Titel</th><th scope="col">Status</th><th scope="col">Datum</th>${isPage ? '' : '<th scope="col">Taggar</th>'}</tr></thead>
      <tbody>${shown.map((r) => {
        const st = displayStatus(r, now);
        const date = st === 'draft' ? `Ändrad ${formatDateSv(r.updated_at)}` : formatDateSv(r.publish_at);
        return `<tr>
          <td><a href="/admin/edit/${r.id}" class="row-title">${h(r.title || '(utan titel)')}</a>${r.featured ? ' <span class="pill-featured" title="Framlyft på startsidan">Framlyft</span>' : ''}</td>
          <td><span class="badge badge-${st}"><span class="badge-dot" aria-hidden="true"></span>${STATUS_LABEL[st]}</span></td>
          <td class="muted">${h(date)}</td>
          ${isPage ? '' : `<td class="muted">${h(r.tags.map((t) => t.name).join(', '))}</td>`}
        </tr>`;
      }).join('')}</tbody>
    </table></div>` : `<p class="empty">${q ? 'Inget matchade sökningen.' : isPage ? 'Inga sidor än. Skapa till exempel en "Om mig"-sida.' : 'Inga inlägg här än.'}</p>`;

  const body = `<main class="admin-main">
    <div class="page-head">
      <h1>${isPage ? 'Sidor' : 'Inlägg'}</h1>
      <a href="/admin/new${isPage ? '?kind=page' : ''}" class="btn btn-primary"><svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14"><path d="M7 1v12M1 7h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg> ${isPage ? 'Ny sida' : 'Nytt inlägg'}</a>
    </div>
    ${flash(message)}
    <div class="toolbar-row">
      <div class="tabs" role="group" aria-label="Filtrera på status">${tabs}</div>
      <form class="search" role="search" method="get" action="/admin">
        ${isPage ? '<input type="hidden" name="kind" value="page">' : ''}
        ${filter !== 'all' ? `<input type="hidden" name="status" value="${h(filter)}">` : ''}
        <label class="search-box"><svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14"><circle cx="6" cy="6" r="4.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M9.5 9.5L13 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          <span class="sr-only">Sök</span><input type="search" name="q" value="${h(q)}" placeholder="Sök ${isPage ? 'sidor' : 'inlägg'}"></label>
      </form>
    </div>
    ${table}
    ${isPage ? '' : '<p class="hint">Schemalagda inlägg publiceras av sig själva vid vald tid.</p>'}
  </main>`;
  return layout({ title: isPage ? 'Sidor' : 'Inlägg', active: isPage ? 'pages' : 'posts', body });
}

function jsonForScript(data) {
  return JSON.stringify(data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

export function editorPage({ post, kind, featuredUsed, now }) {
  const isPage = kind === 'page';
  const st = post ? displayStatus(post, now) : 'draft';
  const data = {
    id: post?.id ?? null,
    kind,
    title: post?.title ?? '',
    content_html: post?.content_html ?? '',
    description: post?.description ?? '',
    slug: post?.slug ?? '',
    status: st,
    publish_at: post?.publish_at ?? null,
    featured: !!post?.featured,
    tags: post?.tags?.map((t) => t.name) ?? [],
    featuredUsed,
    maxFeatured: MAX_FEATURED,
    updated_at: post?.updated_at ?? null,
  };
  const tool = (cmd, label, icon, extra = '') => `<button type="button" class="tb" data-cmd="${cmd}" aria-label="${label}" title="${label}"${extra}>${icon}</button>`;
  const I = {
    bold: '<b>B</b>', italic: '<i class="serif">I</i>', underline: '<u>U</u>', strike: '<s>S</s>',
    link: '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16"><path d="M6.5 9.5l3-3M7 4.5l1-1a2.8 2.8 0 014 4l-1 1M9 11.5l-1 1a2.8 2.8 0 01-4-4l1-1" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    bullet: '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16"><circle cx="3" cy="4" r="1.2" fill="currentColor"/><circle cx="3" cy="8" r="1.2" fill="currentColor"/><circle cx="3" cy="12" r="1.2" fill="currentColor"/><path d="M6.5 4h7M6.5 8h7M6.5 12h7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    ordered: '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16"><path d="M2.5 3h1v3M2 10.2c.3-.5 1.8-.7 1.8.3 0 .8-1.8 1.4-1.8 2.3h2" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/><path d="M6.5 4.5h7M6.5 11.5h7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    left: '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16"><path d="M2 3.5h12M2 6.5h8M2 9.5h12M2 12.5h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    center: '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16"><path d="M2 3.5h12M4 6.5h8M2 9.5h12M4 12.5h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    right: '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16"><path d="M2 3.5h12M6 6.5h8M2 9.5h12M6 12.5h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
    quote: '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16"><path d="M3 11c0-3 1-5 3-6M9 11c0-3 1-5 3-6M3 11h2.5v-2.5H3M9 11h2.5v-2.5H9" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    code: '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16"><path d="M5.5 4.5L2 8l3.5 3.5M10.5 4.5L14 8l-3.5 3.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    inlineCode: '<span class="mono">`a`</span>',
    readMore: '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16"><path d="M1.5 8h2.5M6 8h4M12 8h2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M5.5 4.5L8 2l2.5 2.5M5.5 11.5L8 14l2.5-2.5" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Läs mer</span>',
  };
  const sepr = '<span class="tb-sep" aria-hidden="true"></span>';

  const statusOption = (id, label, hint) => `<label class="status-opt"><input type="radio" name="status" value="${id}"${st === id ? ' checked' : ''}><span class="status-text"><span class="status-label">${label}</span><span class="muted small">${hint}</span></span></label>`;

  const body = `<div class="editor-shell">
  <header class="editor-top">
    <div class="editor-top-left">
      <a href="/admin${isPage ? '?kind=page' : ''}" class="back"><svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14"><path d="M9 2L4 7l5 5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg> ${isPage ? 'Sidor' : 'Inlägg'}</a>
      <span class="save-state muted small" id="save-state" aria-live="polite"></span>
    </div>
    <div class="editor-top-right">
      <button type="button" class="btn" id="btn-preview">Förhandsgranska</button>
      <button type="button" class="btn btn-primary" id="btn-save">Spara</button>
    </div>
  </header>
  <p class="flash flash-error" id="error" role="alert" hidden></p>
  <div class="editor-cols">
    <main class="editor-main">
      <label class="sr-only" for="title">Titel</label>
      <input id="title" class="title-input" type="text" placeholder="Titel" autocomplete="off" maxlength="300">
      <div class="toolbar" role="toolbar" aria-label="Formatering">
        <label class="sr-only" for="block-type">Stycketyp</label>
        <select id="block-type" class="tb-select">
          <option value="p">Brödtext</option><option value="h2">Rubrik 2</option><option value="h3">Rubrik 3</option><option value="h4">Rubrik 4</option>
        </select>
        ${sepr}
        ${tool('bold', 'Fet (Ctrl+B)', I.bold)}${tool('italic', 'Kursiv (Ctrl+I)', I.italic)}${tool('underline', 'Understruken (Ctrl+U)', I.underline)}${tool('strike', 'Genomstruken', I.strike)}${tool('link', 'Länk', I.link)}
        ${sepr}
        ${tool('bulletList', 'Punktlista', I.bullet)}${tool('orderedList', 'Numrerad lista', I.ordered)}
        ${sepr}
        ${tool('alignLeft', 'Vänsterjustera', I.left)}${tool('alignCenter', 'Centrera', I.center)}${tool('alignRight', 'Högerjustera', I.right)}
        ${sepr}
        ${tool('blockquote', 'Citat', I.quote)}${tool('code', 'Kod i text', I.inlineCode)}${tool('codeBlock', 'Kodblock', I.code)}
        ${isPage ? '' : `${sepr}<button type="button" class="tb tb-wide" data-cmd="readMore" title="Lägg in en Läs mer-brytning: texten ovanför visas på startsidan">${I.readMore}</button>`}
      </div>
      <div id="editor" class="editor-area prose-admin"></div>
      <p class="hint">${isPage ? 'Tips: skriv ** för fet, * för kursiv, - för lista och > för citat.' : 'Tips: skriv ** för fet, * för kursiv, - för lista och > för citat. Knappen "Läs mer" bestämmer hur mycket av texten som visas på startsidan.'}</p>
    </main>

    <aside class="editor-side" aria-label="Inställningar">
      <fieldset class="side-block">
        <legend class="side-label">Status</legend>
        ${statusOption('draft', 'Utkast', 'Syns bara för dig')}
        ${statusOption('published', 'Publicerad', 'Syns för alla')}
        ${statusOption('scheduled', 'Schemalagd', 'Publiceras vid vald tid')}
        <div class="schedule" id="schedule" hidden>
          <label for="publish-at" class="small muted">Datum och tid</label>
          <input type="datetime-local" id="publish-at" class="field">
        </div>
      </fieldset>
      ${isPage ? '' : `
      <div class="side-block">
        <span class="side-label" id="tags-label">Taggar</span>
        <div class="tag-chips" id="tag-chips"></div>
        <label class="sr-only" for="tag-input">Lägg till tagg</label>
        <input type="text" id="tag-input" class="field" placeholder="Skriv en tagg och tryck Enter" autocomplete="off" aria-describedby="tags-label">
      </div>
      <div class="side-block">
        <span class="side-label">Startsidan</span>
        <button type="button" role="switch" id="featured" class="switch-row" aria-checked="false">
          <span class="switch-text"><span>Framlyft</span><span class="muted small" id="featured-hint"></span></span>
          <span class="switch" aria-hidden="true"><span class="knob"></span></span>
        </button>
      </div>`}
      <div class="side-block">
        <label class="side-label" for="slug">Webbadress</label>
        <div class="slug-row"><span class="muted">/</span><input type="text" id="slug" class="field" placeholder="skapas från titeln" autocomplete="off"></div>
      </div>
      <div class="side-block">
        <label class="side-label" for="description">Delningstext</label>
        <textarea id="description" class="field" rows="3" maxlength="300" placeholder="Kort text som visas när inlägget delas. Lämnas den tom används ingressen."></textarea>
      </div>
      ${post ? `<div class="side-block danger"><button type="button" class="btn btn-danger" id="btn-delete">Ta bort ${isPage ? 'sidan' : 'inlägget'}</button></div>` : ''}
    </aside>
  </div>
</div>
<script type="application/json" id="post-data">${jsonForScript(data)}</script>`;

  return layout({
    title: post ? (post.title || 'Redigera') : (isPage ? 'Ny sida' : 'Nytt inlägg'),
    active: 'editor',
    bodyClass: 'is-editor',
    body,
    scripts: `<script src="/admin/editor.js?v=${V}" type="module"></script>`,
  });
}

export function tagsAdminPage({ tags, message, error }) {
  const body = `<main class="admin-main">
    <div class="page-head"><h1>Taggar</h1></div>
    ${flash(message)}${flash(error, 'error')}
    ${tags.length ? `<div class="table-box"><table class="post-table">
      <thead><tr><th scope="col">Namn</th><th scope="col">Inlägg</th><th scope="col"><span class="sr-only">Åtgärder</span></th></tr></thead>
      <tbody>${tags.map((t) => `<tr>
        <td><form method="post" action="/admin/tags/${t.id}/rename" class="inline-form">
          <label class="sr-only" for="tag-${t.id}">Namn på taggen</label>
          <input id="tag-${t.id}" name="name" value="${h(t.name)}" class="field" maxlength="40">
          <button class="btn btn-small">Byt namn</button></form></td>
        <td class="muted">${t.n}</td>
        <td><form method="post" action="/admin/tags/${t.id}/delete" class="inline-form" data-confirm="${h(`Ta bort taggen ${t.name}? Inläggen finns kvar.`)}"><button class="btn btn-small btn-danger-link">Ta bort</button></form></td>
      </tr>`).join('')}</tbody></table></div>` : '<p class="empty">Inga taggar än. Du skapar taggar direkt när du skriver ett inlägg.</p>'}
  </main>`;
  return layout({ title: 'Taggar', active: 'tags', body, scripts: `<script src="/admin/admin.js?v=${V}" defer></script>` });
}

export function themeAdminPage({ settings, message }) {
  const theme = settings.theme === 'magazine' ? 'magazine' : 'clean';
  const typo = settings.magazine_typography === 'modern' ? 'modern' : 'classic';
  const card = (id, name, desc, preview) => `<label class="theme-card">
      <input type="radio" name="theme" value="${id}"${theme === id ? ' checked' : ''} class="sr-only">
      <span class="theme-preview ${id}" aria-hidden="true">${preview}</span>
      <span class="theme-info"><span><span class="theme-name">${name}</span><span class="muted small">${desc}</span></span><span class="active-pill">Aktivt</span></span>
    </label>`;
  const cleanPrev = `<span class="tp-bar"><span class="tp-name tp-clean">Try this one blog</span><span class="tp-dots"><i></i><i></i><i></i></span></span>
    <span class="tp-feature"><span class="tp-kicker">FEATURED · WEB</span><span class="tp-h tp-clean">Why I built my own tiny CMS</span><span class="tp-line w70"></span><span class="tp-pill"></span></span>
    <span class="tp-cols"><span class="tp-col3"><span class="tp-s tp-clean">Five keyboard shortcuts</span><span class="tp-line w90"></span><span class="tp-line w70"></span></span><span class="tp-col1"><span class="tp-line w60"></span><span class="tp-line w80"></span><span class="tp-line w70"></span></span></span>`;
  const magPrev = `<span class="tp-mast">Try this one blog</span>
    <span class="tp-navline"><i class="on"></i><i></i><i></i><i></i></span>
    <span class="tp-lead">Why I built my own tiny CMS</span><span class="tp-line w85"></span><span class="tp-line w65"></span>
    <span class="tp-grid"><span><b>Better coffee</b><i></i></span><span><b>Journaling</b><i></i></span><span><b>Sourdough</b><i></i></span></span>`;
  const body = `<main class="admin-main">
    <form method="post" action="/admin/theme" class="theme-form">
      <div class="page-head">
        <div><h1>Tema</h1><p class="muted">Välj hur den publika sajten ser ut. Dina inlägg påverkas inte.</p></div>
        <div class="head-actions"><a href="/" class="btn" target="_blank" rel="noopener">Visa sajten ↗</a><button class="btn btn-primary">Spara</button></div>
      </div>
      ${flash(message)}
      <fieldset class="theme-grid"><legend class="sr-only">Tema</legend>
        ${card('clean', 'Stilren', 'Luftig och lugn. Bildspel med framlyfta inlägg och arkiv i en sidokolumn.', cleanPrev)}
        ${card('magazine', 'Magasin', 'Stora rubriker och tydliga linjer. Arkivet som ett eget avsnitt.', magPrev)}
      </fieldset>
      <fieldset class="side-block options">
        <legend class="side-label">Typsnitt för Magasin</legend>
        <div class="typo-grid">
          <label class="typo-opt"><input type="radio" name="magazine_typography" value="classic"${typo === 'classic' ? ' checked' : ''}><span><span class="typo-sample fraunces">Fraunces</span><span class="muted small">Klassisk · Fraunces + Source Serif</span></span></label>
          <label class="typo-opt"><input type="radio" name="magazine_typography" value="modern"${typo === 'modern' ? ' checked' : ''}><span><span class="typo-sample bricolage">Bricolage</span><span class="muted small">Modern · Bricolage Grotesque + Inter</span></span></label>
        </div>
        <p class="muted small">Stilren använder Montserrat Alternates och DM Sans. Ljust och mörkt läge följer varje besökares egen inställning.</p>
      </fieldset>
      <fieldset class="side-block options">
        <legend class="side-label">Sajtens namn och beskrivning</legend>
        <label class="small muted" for="site_title">Namn</label>
        <input id="site_title" name="site_title" class="field" value="${h(settings.site_title)}" maxlength="80" required>
        <label class="small muted" for="tagline">Kort beskrivning (visas i sökresultat och i magasinets sidhuvud)</label>
        <input id="tagline" name="tagline" class="field" value="${h(settings.tagline)}" maxlength="160">
      </fieldset>
    </form>
  </main>`;
  return layout({ title: 'Tema', active: 'theme', body });
}

export function accessProblemPage(reason) {
  const notConfigured = reason === 'not-configured';
  return `<!doctype html><html lang="sv"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>Admin är låst</title><link rel="stylesheet" href="/fonts/fonts.css?v=${V}"><link rel="stylesheet" href="/css/admin.css?v=${V}"></head>
<body><main class="locked"><h1>Adminsidan är låst</h1>
<p>${notConfigured
    ? 'Inloggningen via Cloudflare Access är inte inställd än, så adminsidan är stängd för alla. Följ stegen i HANDOFF.md i projektet för att slå på den.'
    : 'Du är inte inloggad, eller så gick inloggningen inte att kontrollera. Ladda om sidan och logga in via Cloudflare igen.'}</p>
<p><a href="/" class="btn">Till sajten</a></p></main></body></html>`;
}
