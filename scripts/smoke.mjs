// End-to-end smoke test against a running local server (`npx wrangler dev` with DEV_ADMIN_BYPASS=1 in .dev.vars).
// Usage: node scripts/smoke.mjs [baseUrl]
import assert from 'node:assert/strict';

const BASE = process.argv[2] || 'http://127.0.0.1:8787';
const H = { 'Content-Type': 'application/json', Origin: BASE };
const day = 24 * 3600 * 1000;

async function api(body) {
  const res = await fetch(`${BASE}/admin/api/posts`, { method: 'POST', headers: H, body: JSON.stringify(body) });
  const json = await res.json();
  if (!res.ok) throw new Error(`${res.status} ${json.error}`);
  return json.post;
}
async function get(path) {
  const res = await fetch(BASE + path, { redirect: 'manual' });
  return { status: res.status, text: await res.text(), headers: res.headers };
}

const stamp = Date.now();
const p = (i) => `<p>Intro ${i} with <strong>bold</strong>.</p><hr data-read-more><p>Hidden part ${i}.</p>`;

// Posts
const featured = [];
for (let i = 1; i <= 3; i++) {
  featured.push(await api({ title: `Featured ${i} ${stamp}`, content_html: p(i), status: 'published', publish_at: Date.now() - i * day, featured: true, tags: ['coffee', 'Try this'] }));
}
const normal = await api({ title: `Normal ${stamp}`, content_html: '<p style="text-align: center">Centred</p><ul><li>a</li></ul><blockquote><p>Quote</p></blockquote><pre><code class="language-bash">echo hi</code></pre>', status: 'published', publish_at: Date.now() - 400 * day, tags: ['tools'] });
const scheduled = await api({ title: `Scheduled ${stamp}`, content_html: '<p>Later</p>', status: 'published', publish_at: Date.now() + 2 * day });
const draft = await api({ title: `Draft ${stamp}`, content_html: '<p>Secret draft</p>', status: 'draft' });
const xss = await api({ title: `XSS ${stamp}`, content_html: '<p onclick="alert(1)">x<script>alert(1)</script><a href="javascript:alert(1)">bad</a><a href="https://example.com">good</a><img src=x onerror=alert(1)></p><hr data-read-more><hr data-read-more>', status: 'draft' });
const about = await api({ kind: 'page', title: 'About', slug: `about-${stamp}`, content_html: '<p>About me</p>', status: 'published' });

// Sanitizer
assert.ok(!/script|onclick|onerror|javascript:|<img/i.test(xss.content_html), 'unsafe markup removed: ' + xss.content_html);
assert.ok(xss.content_html.includes('href="https://example.com"'), 'safe link kept');
assert.equal((xss.content_html.match(/data-read-more/g) || []).length, 1, 'only one read-more marker');
assert.ok(normal.content_html.includes('style="text-align: center"'), 'alignment kept');
assert.ok(normal.content_html.includes('class="language-bash"'), 'code language kept');

// Statuses
assert.equal(scheduled.display_status, 'scheduled');
assert.equal(draft.display_status, 'draft');
assert.equal(featured[0].display_status, 'published');

// Home page
const home = await get('/');
assert.equal(home.status, 200);
assert.ok(home.text.includes(`Featured 1 ${stamp}`), 'featured on home');
assert.ok(home.text.includes('Intro 1 with bold.'), 'intro from read-more break');
assert.ok(!home.text.includes('Hidden part 1'), 'text after break not on home');
assert.ok(!home.text.includes(`Scheduled ${stamp}`), 'scheduled post hidden');
assert.ok(!home.text.includes(`Draft ${stamp}`), 'draft hidden');
const latestPart = home.text.split('class="col-main"')[1] || '';
assert.ok(!latestPart.includes(`Featured 1 ${stamp}`), 'featured not repeated in latest list (Q12)');
assert.ok(home.text.includes('<details class="archive-year" open>'), 'newest archive year open');
assert.ok(home.headers.get('content-security-policy'), 'CSP header');

// Post pages
const post = await get(`/${featured[0].slug}`);
assert.equal(post.status, 200);
assert.ok(post.text.includes('Hidden part 1'), 'full text on post page');
assert.ok(!post.text.includes('data-read-more'), 'marker removed on post page');
assert.ok(post.text.includes('og:title'), 'share info');
assert.equal((await get(`/${scheduled.slug}`)).status, 404, 'scheduled not reachable');
assert.equal((await get(`/${draft.slug}`)).status, 404, 'draft not reachable');
const page = await get(`/${about.slug}`);
assert.equal(page.status, 200);
assert.ok(home.text.includes(`href="/${about.slug}"`), 'page in navigation');

// Tags and archive
const tagPage = await get('/tag/try-this');
assert.equal(tagPage.status, 200);
assert.ok(tagPage.text.includes(`Featured 2 ${stamp}`));
assert.equal((await get('/tags')).status, 200);
const d = new Date(featured[0].publish_at);
const ym = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Stockholm', year: 'numeric', month: '2-digit' }).format(d).split('-');
const arch = await get(`/archive/${ym[0]}/${ym[1]}`);
assert.equal(arch.status, 200);
assert.ok(arch.text.includes(`Featured 1 ${stamp}`));
assert.equal((await get('/nope-not-here')).status, 404);

// Featured limit
const extra = [];
for (let i = 0; i < 6; i++) {
  try { extra.push(await api({ title: `Extra ${i} ${stamp}`, content_html: '<p>x</p>', status: 'published', featured: true })); } catch (e) { extra.push(e.message); }
}
assert.ok(extra.some((e) => typeof e === 'string' && e.includes('framlyfta')), 'max 5 featured enforced');

// Admin pages
for (const path of ['/admin', '/admin?kind=page', '/admin/new', `/admin/edit/${normal.id}`, '/admin/tags', '/admin/theme', '/admin?status=scheduled']) {
  const r = await get(path);
  assert.equal(r.status, 200, path);
}
const exp = await get('/admin/export');
assert.equal(exp.status, 200);
assert.ok(JSON.parse(exp.text).posts.length >= 7, 'export contains posts');

// Theme switch
let res = await fetch(`${BASE}/admin/theme`, { method: 'POST', headers: { Origin: BASE, 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'theme=magazine&magazine_typography=modern&site_title=Try+this+one+blog&tagline=Notes', redirect: 'manual' });
assert.equal(res.status, 303);
let mag = await get('/');
assert.ok(mag.text.includes('theme-magazine typo-modern'), 'magazine theme active');
res = await fetch(`${BASE}/admin/theme`, { method: 'POST', headers: { Origin: BASE, 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'theme=clean&magazine_typography=classic&site_title=Try+this+one+blog&tagline=Small+experiments%2C+notes+and+things+worth+trying.', redirect: 'manual' });
assert.equal(res.status, 303);

// Cross-site writes are refused
res = await fetch(`${BASE}/admin/api/posts`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example' }, body: '{}' });
assert.equal(res.status, 403, 'cross-origin write blocked');

// Clean up the extra posts so repeated runs stay tidy
for (const e of extra) if (e && e.id) await fetch(`${BASE}/admin/api/posts/${e.id}`, { method: 'DELETE', headers: { Origin: BASE } });

console.log('Smoke test passed.');
