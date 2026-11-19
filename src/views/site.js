// Public site pages for both themes (F-005, F-006, F-007, F-009, F-010, F-021, F-023).
import { escapeHtml as h, formatDate, introText, bodyWithoutMarker, monthName } from '../util.js';

const ASSET_VERSION = '1';

function themeClass(settings) {
  if (settings.theme === 'magazine') return `theme-magazine typo-${settings.magazine_typography === 'modern' ? 'modern' : 'classic'}`;
  return 'theme-clean';
}

function headTags({ settings, title, description, url, type = 'website', noindex = false }) {
  const theme = settings.theme === 'magazine' ? 'magazine' : 'clean';
  const fullTitle = title ? `${title} · ${settings.site_title}` : settings.site_title;
  const desc = description || settings.tagline;
  return `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${h(fullTitle)}</title>
<meta name="description" content="${h(desc)}">
<link rel="canonical" href="${h(url)}">
<meta property="og:site_name" content="${h(settings.site_title)}">
<meta property="og:title" content="${h(title || settings.site_title)}">
<meta property="og:description" content="${h(desc)}">
<meta property="og:type" content="${type}">
<meta property="og:url" content="${h(url)}">
<meta name="twitter:card" content="summary">
${noindex ? '<meta name="robots" content="noindex">' : ''}
<meta name="color-scheme" content="light dark">
<link rel="preload" href="/fonts/fonts.css?v=${ASSET_VERSION}" as="style">
<link rel="stylesheet" href="/fonts/fonts.css?v=${ASSET_VERSION}">
<link rel="stylesheet" href="/css/site.css?v=${ASSET_VERSION}">
<link rel="stylesheet" href="/css/${theme}.css?v=${ASSET_VERSION}">
<script src="/js/site.js?v=${ASSET_VERSION}" defer></script>`;
}

function header(ctx) {
  const { settings, pages, active } = ctx;
  const nav = [`<a href="/" class="ul${active === 'home' ? ' is-current' : ''}"${active === 'home' ? ' aria-current="page"' : ''}>Posts</a>`,
    `<a href="/tags" class="ul${active === 'tags' ? ' is-current' : ''}"${active === 'tags' ? ' aria-current="page"' : ''}>Tags</a>`,
    ...pages.map((p) => `<a href="/${h(p.slug)}" class="ul${active === p.slug ? ' is-current' : ''}"${active === p.slug ? ' aria-current="page"' : ''}>${h(p.title)}</a>`)].join('\n');

  if (settings.theme === 'magazine') {
    return `<header class="site-header">
  <div class="masthead-meta"><span>${h(new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Stockholm', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(new Date()))}</span><span>${h(settings.tagline)}</span></div>
  <div class="masthead"><a href="/" class="masthead-title">${h(settings.site_title)}</a></div>
  <nav aria-label="Main" class="site-nav">${nav}</nav>
</header>`;
  }
  return `<header class="site-header"><div class="wrap header-inner">
  <a href="/" class="site-title">${h(settings.site_title)}</a>
  <nav aria-label="Main" class="site-nav">${nav}</nav>
</div></header>`;
}

function footer(ctx) {
  return `<footer class="site-footer"><div class="wrap footer-inner">
  <span>© ${new Date().getFullYear()} ${h(ctx.settings.site_title)}</span>
  <a href="/tags" class="ul">All tags</a>
</div></footer>`;
}

export function page(ctx, { title, description, url, type, noindex, body, bodyClass = '' }) {
  return `<!doctype html>
<html lang="en">
<head>
${headTags({ settings: ctx.settings, title, description, url, type, noindex })}
</head>
<body class="${themeClass(ctx.settings)} ${bodyClass}">
<a href="#main" class="skip-link">Skip to content</a>
${header(ctx)}
${body}
${footer(ctx)}
</body>
</html>`;
}

function tagLinks(tags, cls = 'chip') {
  return tags.map((t) => `<a href="/tag/${h(t.slug)}" class="${cls}">#${h(t.name)}</a>`).join('');
}

function featuredSlider(ctx, featured) {
  if (!featured.length) return '';
  const magazine = ctx.settings.theme === 'magazine';
  const slides = featured.map((p, i) => `
      <article class="slide" aria-roledescription="slide" aria-label="${i + 1} of ${featured.length}" id="slide-${i + 1}">
        <div class="slide-text">
          <span class="kicker">Featured${p.tags[0] ? ` · ${h(p.tags[0].name)}` : ''}</span>
          <h2 class="slide-title"><a href="/${h(p.slug)}" class="ul">${h(p.title)}</a></h2>
          <p class="slide-intro">${h(introText(p.content_html))}</p>
          <div class="slide-meta">
            <a href="/${h(p.slug)}" class="btn-read">${magazine ? 'Continue reading' : 'Read more'} <span class="arrow" aria-hidden="true">→</span></a>
            <span class="muted">${h(formatDate(p.publish_at, magazine ? 'long' : 'short'))}</span>
          </div>
        </div>
      </article>`).join('');
  const many = featured.length > 1;
  const controls = many ? `
    <div class="slider-controls">
      ${magazine ? `<span class="slider-counter" data-counter aria-live="polite">01 / ${String(featured.length).padStart(2, '0')}</span>` : ''}
      <div class="slider-dots">${featured.map((_, i) => `<button type="button" class="dot" data-go="${i}" aria-label="Show featured post ${i + 1}"${i === 0 ? ' aria-current="true"' : ''}><span></span></button>`).join('')}</div>
      <div class="slider-arrows">
        ${magazine ? '' : `<span class="slider-counter muted" data-counter aria-live="polite">1 / ${featured.length}</span>`}
        <button type="button" class="arrow-btn" data-prev aria-label="Previous featured post"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16"><path d="M10 3L5 8l5 5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
        <button type="button" class="arrow-btn arrow-next" data-next aria-label="Next featured post"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16"><path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
      </div>
    </div>` : '';
  return `
  <section class="featured rise" aria-roledescription="carousel" aria-label="Featured posts" data-slider>
    <div class="featured-box">
      <div class="slider-track" tabindex="0" aria-label="Featured posts, scroll sideways">${slides}
      </div>${controls}
    </div>
  </section>`;
}

function postList(ctx, posts) {
  const magazine = ctx.settings.theme === 'magazine';
  return posts.map((p, i) => `
      <article class="post-card rise${magazine ? ' lift' : ''}" style="animation-delay:${(0.15 + i * 0.08).toFixed(2)}s">
        ${magazine && p.tags[0] ? `<span class="kicker">${h(p.tags.map((t) => t.name).join(' · '))}</span>` : ''}
        ${magazine ? '' : `<div class="card-meta">${h(formatDate(p.publish_at))}</div>`}
        <h3 class="card-title"><a href="/${h(p.slug)}" class="ul">${h(p.title)}</a></h3>
        <p class="card-intro">${h(introText(p.content_html))}</p>
        ${magazine ? `<p class="card-meta">${h(formatDate(p.publish_at))}</p>` : ''}
        <div class="card-foot">
          <a href="/${h(p.slug)}" class="read-more">Read more <span class="arrow" aria-hidden="true">→</span></a>
          ${magazine ? '' : tagLinks(p.tags, 'chip chip-outline')}
        </div>
      </article>`).join('');
}

function archiveBlock(ctx, archive) {
  if (!archive.length) return '';
  const magazine = ctx.settings.theme === 'magazine';
  const years = archive.map((y) => `
        <details class="archive-year"${y.open ? ' open' : ''}>
          <summary><span class="chev" aria-hidden="true"></span><span class="year">${y.year}</span> <span class="count">(${y.total})</span></summary>
          <ul class="archive-months">${y.months.map((m) => `<li><a href="/archive/${y.year}/${String(m.month).padStart(2, '0')}"><span class="ul">${m.name}</span><span class="count">(${m.count})</span></a></li>`).join('')}</ul>
        </details>`).join('');
  if (magazine) {
    return `
    <section class="archive" aria-labelledby="archive-h">
      <div class="archive-head"><h2 id="archive-h">The archive</h2><a href="/tags" class="read-more">All tags →</a></div>
      <div class="archive-grid">${years}</div>
    </section>`;
  }
  return `
      <section class="archive" aria-labelledby="archive-h">
        <h2 id="archive-h" class="eyebrow">Archive</h2>${years}
      </section>`;
}

function tagCloud(tags) {
  if (!tags.length) return '';
  return `
      <section class="tag-cloud" aria-labelledby="tags-h">
        <h2 id="tags-h" class="eyebrow">Tags</h2>
        <div class="chips">${tags.map((t) => `<a href="/tag/${h(t.slug)}" class="chip">${h(t.name)}</a>`).join('')}</div>
      </section>`;
}

function pager({ page, totalPages, base }) {
  if (totalPages <= 1) return '';
  const link = (p) => (p === 1 ? base : `${base}${base.includes('?') ? '&' : '?'}page=${p}`);
  return `<nav class="pager" aria-label="Pages">
        ${page > 1 ? `<a href="${h(link(page - 1))}" class="read-more">← Newer posts</a>` : '<span></span>'}
        <span class="muted">Page ${page} of ${totalPages}</span>
        ${page < totalPages ? `<a href="${h(link(page + 1))}" class="read-more">Older posts <span class="arrow" aria-hidden="true">→</span></a>` : '<span></span>'}
      </nav>`;
}

function emptyState(text) {
  return `<p class="empty muted">${h(text)}</p>`;
}

export function homePage(ctx, { featured, posts, page: pageNo, totalPages, archive, tags, url }) {
  const magazine = ctx.settings.theme === 'magazine';
  let body;
  if (magazine) {
    body = `<main id="main" class="wrap">
  ${featuredSlider(ctx, featured)}
  ${posts.length ? `<section class="card-grid" aria-label="Latest posts">${postList(ctx, posts)}</section>` : featured.length ? '' : emptyState('No posts yet. Check back soon.')}
  ${pager({ page: pageNo, totalPages, base: '/' })}
  ${archiveBlock(ctx, archive)}
</main>`;
  } else {
    body = `${featuredSlider(ctx, featured)}
<div class="wrap columns">
  <main id="main" class="col-main">
    ${posts.length ? `<h2 class="eyebrow">Latest</h2>${postList(ctx, posts)}` : featured.length ? '' : emptyState('No posts yet. Check back soon.')}
    ${pager({ page: pageNo, totalPages, base: '/' })}
  </main>
  <aside class="col-side">${archiveBlock(ctx, archive)}${tagCloud(tags)}
  </aside>
</div>`;
  }
  return page(ctx, { url, body, bodyClass: 'is-home' });
}

export function listPage(ctx, { heading, intro, posts, page: pageNo, totalPages, base, url, archive, tags }) {
  const magazine = ctx.settings.theme === 'magazine';
  const list = posts.length ? postList(ctx, posts) : emptyState('Nothing here yet.');
  const body = magazine
    ? `<main id="main" class="wrap">
  <div class="list-head"><h1>${h(heading)}</h1>${intro ? `<p class="muted">${h(intro)}</p>` : ''}</div>
  <section class="card-grid">${list}</section>
  ${pager({ page: pageNo, totalPages, base })}
  ${archiveBlock(ctx, archive)}
</main>`
    : `<div class="wrap columns">
  <main id="main" class="col-main">
    <div class="list-head"><h1>${h(heading)}</h1>${intro ? `<p class="muted">${h(intro)}</p>` : ''}</div>
    ${list}
    ${pager({ page: pageNo, totalPages, base })}
  </main>
  <aside class="col-side">${archiveBlock(ctx, archive)}${tagCloud(tags)}</aside>
</div>`;
  return page(ctx, { title: heading, url, body });
}

export function tagsPage(ctx, { tags, url }) {
  const body = `<main id="main" class="wrap narrow">
  <div class="list-head"><h1>Tags</h1></div>
  ${tags.length ? `<div class="chips chips-large">${tags.map((t) => `<a href="/tag/${h(t.slug)}" class="chip">${h(t.name)} <span class="count">(${t.n})</span></a>`).join('')}</div>` : emptyState('No tags yet.')}
</main>`;
  return page(ctx, { title: 'Tags', url, body });
}

export function postPage(ctx, { post, older, newer, url, preview = false }) {
  const magazine = ctx.settings.theme === 'magazine';
  const isPage = post.kind === 'page';
  const html = bodyWithoutMarker(post.content_html);
  const intro = introText(post.content_html);
  const date = post.publish_at ? formatDate(post.publish_at, 'long') : 'Not published';
  const banner = preview ? `<div class="preview-banner" role="status">Preview – this is how the ${isPage ? 'page' : 'post'} will look. ${post.status !== 'published' ? 'It is not published yet.' : ''}</div>` : '';
  const tags = isPage ? '' : (magazine
    ? `<div class="post-tags">${post.tags.map((t) => `<a href="/tag/${h(t.slug)}" class="chip chip-box">${h(t.name)}</a>`).join('')}</div>`
    : `<div class="post-tags">${tagLinks(post.tags, 'chip chip-outline')}</div>`);
  const nav = isPage || (!older && !newer) ? '' : `
    <nav class="post-nav" aria-label="More posts">
      ${older ? `<a href="/${h(older.slug)}"><span class="muted small">← Older</span><span>${h(older.title)}</span></a>` : '<span></span>'}
      ${newer ? `<a href="/${h(newer.slug)}" class="right"><span class="muted small">Newer →</span><span>${h(newer.title)}</span></a>` : '<span></span>'}
    </nav>`;

  const headerBlock = magazine
    ? `<header class="post-header">
      ${!isPage && post.tags.length ? `<span class="kicker">${h(post.tags.map((t) => t.name).join(' · '))}</span>` : ''}
      <h1 class="post-title">${h(post.title)}</h1>
      ${post.description ? `<p class="standfirst">${h(post.description)}</p>` : ''}
      ${isPage ? '' : `<p class="post-meta">${h(date)}</p>`}
    </header>`
    : `<header class="post-header">
      ${tags}
      <h1 class="post-title">${h(post.title)}</h1>
      ${isPage ? '' : `<p class="post-meta">${h(date)}</p>`}
    </header>`;

  const body = `${banner}<main id="main">
  <article class="post${magazine ? ' dropcap' : ''}">
    ${headerBlock}
    <div class="prose">${html}</div>
    ${magazine ? tags : ''}
    ${nav}
  </article>
</main>`;
  return page(ctx, {
    title: post.title, description: post.description || intro, url, type: isPage ? 'website' : 'article', noindex: preview, body, bodyClass: 'is-post',
  });
}

export function notFoundPage(ctx, url) {
  const body = `<main id="main" class="wrap narrow center">
  <div class="list-head"><h1>Page not found</h1><p class="muted">The page you were looking for does not exist or has moved.</p></div>
  <p><a href="/" class="read-more">Go to the front page <span class="arrow" aria-hidden="true">→</span></a></p>
</main>`;
  return page(ctx, { title: 'Not found', url, body, noindex: true });
}

export function archiveHeading(year, month) {
  return `${monthName(month)} ${year}`;
}
