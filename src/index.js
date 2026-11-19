// Bloggy: a slim personal CMS on Cloudflare Workers + D1.
// Public site in English, admin in Swedish. See HANDOFF.md and BACKLOG.md.
import {
  ensureSchema, getSettings, saveSettings, livePosts, countLivePosts, liveTimestamps, liveBySlug, livePages, liveTags, tagBySlug,
  neighbours, adminList, getPost, savePost, deletePost, featuredCount, allTags, renameTag, deleteTag, exportAll, ValidationError,
} from './db.js';
import { checkAdmin, sameOrigin } from './auth.js';
import { sanitizeHtml, singleReadMore } from './sanitize.js';
import { buildArchive, monthRange, displayStatus, MAX_FEATURED } from './util.js';
import * as site from './views/site.js';
import * as admin from './views/admin.js';

const PER_PAGE = 10;

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "default-src 'self'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline'; script-src 'self'; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
};

function html(body, status = 200, extra = {}) {
  return new Response(body, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', ...SECURITY_HEADERS, ...extra } });
}
function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...SECURITY_HEADERS } });
}
function redirect(location, status = 303) {
  return new Response(null, { status, headers: { Location: location, ...SECURITY_HEADERS } });
}

export default {
  async fetch(request, env, ctx) {
    try {
      return await handle(request, env, ctx);
    } catch (err) {
      console.error(err);
      return html('<!doctype html><meta charset="utf-8"><title>Error</title><p>Something went wrong. Please try again in a moment.</p>', 500);
    }
  },
};

async function handle(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const db = env.DB;
  await ensureSchema(db);

  if (path === '/admin' || path.startsWith('/admin/')) return handleAdmin(request, env, url, path);
  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });

  const now = Date.now();
  const settings = await getSettings(db);
  const pages = await livePages(db, now);
  const base = { settings, pages, active: '' };
  const canonical = `${url.origin}${path === '/' ? '/' : path}`;
  const cache = { 'Cache-Control': 'public, max-age=60' };

  if (path === '/') {
    const pageNo = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
    const [featured, posts, total, stamps, tags] = await Promise.all([
      livePosts(db, now, { featured: true, limit: MAX_FEATURED }),
      livePosts(db, now, { featured: false, limit: PER_PAGE, offset: (pageNo - 1) * PER_PAGE }),
      countLivePosts(db, now, { featured: false }),
      liveTimestamps(db, now),
      liveTags(db, now),
    ]);
    const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
    return html(site.homePage({ ...base, active: 'home' }, {
      featured: pageNo === 1 ? featured : [], posts, page: pageNo, totalPages, archive: buildArchive(stamps), tags, url: canonical,
    }), 200, cache);
  }

  if (path === '/tags') {
    return html(site.tagsPage({ ...base, active: 'tags' }, { tags: await liveTags(db, now), url: canonical }), 200, cache);
  }

  let m = path.match(/^\/tag\/([a-z0-9-]+)$/);
  if (m) {
    const tag = await tagBySlug(db, m[1]);
    if (!tag) return notFound(base, canonical);
    const pageNo = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1);
    const posts = await livePosts(db, now, { tagSlug: tag.slug, limit: PER_PAGE + 1, offset: (pageNo - 1) * PER_PAGE });
    const [stamps, tags] = await Promise.all([liveTimestamps(db, now), liveTags(db, now)]);
    return html(site.listPage({ ...base, active: 'tags' }, {
      heading: `#${tag.name}`, intro: 'Posts with this tag.', posts: posts.slice(0, PER_PAGE), page: pageNo,
      totalPages: posts.length > PER_PAGE ? pageNo + 1 : pageNo, base: `/tag/${tag.slug}`, url: canonical, archive: buildArchive(stamps), tags,
    }), 200, cache);
  }

  m = path.match(/^\/archive\/(\d{4})\/(\d{2})$/);
  if (m) {
    const year = Number(m[1]);
    const month = Number(m[2]);
    if (month < 1 || month > 12) return notFound(base, canonical);
    const { start, end } = monthRange(year, month);
    const posts = await livePosts(db, now, { from: start, to: end, limit: 200 });
    const [stamps, tags] = await Promise.all([liveTimestamps(db, now), liveTags(db, now)]);
    return html(site.listPage(base, {
      heading: site.archiveHeading(year, month), intro: `${posts.length} ${posts.length === 1 ? 'post' : 'posts'}`, posts, page: 1, totalPages: 1,
      base: path, url: canonical, archive: buildArchive(stamps), tags,
    }), 200, cache);
  }

  m = path.match(/^\/([a-z0-9]+(?:-[a-z0-9]+)*)$/);
  if (m) {
    const post = await liveBySlug(db, m[1], now);
    if (!post) return notFound(base, canonical);
    const { older, newer } = post.kind === 'post' ? await neighbours(db, post, now) : {};
    return html(site.postPage({ ...base, active: post.kind === 'page' ? post.slug : '' }, { post, older, newer, url: canonical }), 200, cache);
  }

  return notFound(base, canonical);
}

function notFound(base, url) {
  return html(site.notFoundPage(base, url), 404);
}

// ---------------- Admin (protected by Cloudflare Access + JWT check) ----------------

async function handleAdmin(request, env, url, path) {
  const auth = await checkAdmin(request, env);
  if (!auth.ok) {
    if (path.startsWith('/admin/api/')) return json({ error: 'Inte inloggad.' }, 401);
    return html(admin.accessProblemPage(auth.reason), auth.reason === 'not-configured' ? 503 : 401);
  }
  const noStore = { 'Cache-Control': 'no-store' };
  const db = env.DB;
  const method = request.method;
  if (method !== 'GET' && method !== 'HEAD' && !sameOrigin(request)) return json({ error: 'Förfrågan nekades (fel ursprung).' }, 403);

  // Static admin assets are served from /public/admin by the assets binding before this runs;
  // anything else under /admin is handled here.
  if (path === '/admin' && method === 'GET') {
    const kind = url.searchParams.get('kind') === 'page' ? 'page' : 'post';
    const filter = ['published', 'draft', 'scheduled'].includes(url.searchParams.get('status')) ? url.searchParams.get('status') : 'all';
    const q = (url.searchParams.get('q') || '').trim().slice(0, 100);
    const rows = await adminList(db, { kind, q });
    const message = url.searchParams.get('deleted') ? (kind === 'page' ? 'Sidan är borttagen.' : 'Inlägget är borttaget.') : '';
    return html(admin.postsListPage({ kind, rows, filter, q, now: Date.now(), message }), 200, noStore);
  }

  if (path === '/admin/new' && method === 'GET') {
    const kind = url.searchParams.get('kind') === 'page' ? 'page' : 'post';
    return html(admin.editorPage({ post: null, kind, featuredUsed: await featuredCount(db, 0), now: Date.now() }), 200, noStore);
  }

  let m = path.match(/^\/admin\/edit\/(\d+)$/);
  if (m && method === 'GET') {
    const post = await getPost(db, Number(m[1]));
    if (!post) return redirect('/admin');
    return html(admin.editorPage({ post, kind: post.kind, featuredUsed: await featuredCount(db, post.id), now: Date.now() }), 200, noStore);
  }

  if (path === '/admin/api/posts' && method === 'POST') {
    let input;
    try { input = await request.json(); } catch { return json({ error: 'Ogiltig data.' }, 400); }
    try {
      input.content_html = singleReadMore(await sanitizeHtml(input.content_html));
      const post = await savePost(db, input);
      return json({ post: { ...post, display_status: displayStatus(post) } });
    } catch (err) {
      if (err instanceof ValidationError) return json({ error: err.message }, 400);
      throw err;
    }
  }

  m = path.match(/^\/admin\/api\/posts\/(\d+)$/);
  if (m && method === 'DELETE') {
    await deletePost(db, Number(m[1]));
    return json({ ok: true });
  }

  if (path === '/admin/preview' && method === 'POST') {
    const form = await request.formData();
    const settings = await getSettings(db);
    const pages = await livePages(db, Date.now());
    let tags = [];
    try { tags = JSON.parse(form.get('tags') || '[]').map((n) => ({ name: String(n), slug: '' })); } catch { /* ignore */ }
    const kind = form.get('kind') === 'page' ? 'page' : 'post';
    const status = form.get('status');
    const publishAt = Number(form.get('publish_at')) || Date.now();
    const post = {
      id: 0, kind, title: String(form.get('title') || 'Untitled'), description: String(form.get('description') || ''),
      content_html: singleReadMore(await sanitizeHtml(String(form.get('content_html') || ''))),
      status: status === 'draft' ? 'draft' : 'published', publish_at: publishAt, tags,
    };
    return html(site.postPage({ settings, pages, active: '' }, { post, url: url.origin + '/preview', preview: true }), 200, noStore);
  }

  if (path === '/admin/tags' && method === 'GET') {
    return html(admin.tagsAdminPage({ tags: await allTags(db), message: url.searchParams.get('ok') || '', error: url.searchParams.get('error') || '' }), 200, noStore);
  }
  m = path.match(/^\/admin\/tags\/(\d+)\/(rename|delete)$/);
  if (m && method === 'POST') {
    const id = Number(m[1]);
    try {
      if (m[2] === 'rename') {
        const form = await request.formData();
        await renameTag(db, id, form.get('name'));
        return redirect('/admin/tags?ok=' + encodeURIComponent('Taggen har bytt namn.'));
      }
      await deleteTag(db, id);
      return redirect('/admin/tags?ok=' + encodeURIComponent('Taggen är borttagen.'));
    } catch (err) {
      if (err instanceof ValidationError) return redirect('/admin/tags?error=' + encodeURIComponent(err.message));
      throw err;
    }
  }

  if (path === '/admin/theme' && method === 'GET') {
    return html(admin.themeAdminPage({ settings: await getSettings(db), message: url.searchParams.get('saved') ? 'Temat är sparat.' : '' }), 200, noStore);
  }
  if (path === '/admin/theme' && method === 'POST') {
    const form = await request.formData();
    const theme = form.get('theme') === 'magazine' ? 'magazine' : 'clean';
    const typo = form.get('magazine_typography') === 'modern' ? 'modern' : 'classic';
    const title = String(form.get('site_title') || '').trim().slice(0, 80) || 'Try this one blog';
    const tagline = String(form.get('tagline') || '').trim().slice(0, 160);
    await saveSettings(db, { theme, magazine_typography: typo, site_title: title, tagline });
    return redirect('/admin/theme?saved=1');
  }

  if (path === '/admin/export' && method === 'GET') {
    const data = await exportAll(db);
    const day = new Date().toISOString().slice(0, 10);
    return new Response(JSON.stringify(data, null, 2), {
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': `attachment; filename="bloggy-export-${day}.json"`, ...noStore, ...SECURITY_HEADERS },
    });
  }

  return html(admin.layout({ title: 'Hittades inte', active: '', body: '<main class="admin-main"><h1>Sidan finns inte</h1><p><a href="/admin" class="btn">Till inläggen</a></p></main>' }), 404, noStore);
}
