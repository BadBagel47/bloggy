// Fills a LOCAL dev database with sample posts (for trying the design). Never run against production.
// Usage: node scripts/seed-local.mjs [baseUrl]
const BASE = process.argv[2] || 'http://127.0.0.1:8787';
if (!/^http:\/\/(127\.0\.0\.1|localhost)/.test(BASE)) throw new Error('Only for local development.');
const day = 24 * 3600 * 1000;
const H = { 'Content-Type': 'application/json', Origin: BASE };
async function api(body) {
  const res = await fetch(`${BASE}/admin/api/posts`, { method: 'POST', headers: H, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()).post;
}
const body = (intro, rest = '') => `<p>${intro}</p><hr data-read-more><p>${rest || 'The rest of the post continues here, with the details and what I learned along the way.'}</p>`;
const at = (d) => Date.now() - d * day;

const posts = [
  { title: 'Why I built my own tiny CMS', featured: true, d: 7, tags: ['web', 'cloudflare'], html: body('Big platforms do everything. I wanted something that does five things well, runs for free and gets out of the way when I write.', 'Every few years I set up a blog, and every time I spend more time <strong>configuring</strong> it than writing in it. This time I tried the opposite: list the few things I <em>actually</em> use, and build only those.</p><h2>What it needs to do</h2><ul><li>Drafts, published and scheduled posts</li><li>Text styling, quotes and code blocks</li><li>Custom tags and a tidy archive</li></ul><h3>How I set it up</h3><ol><li>Create the database</li><li>Protect the admin with a login</li><li>Push to GitHub and let it publish itself</li></ol><blockquote><p>The best tool is the one that disappears while you work.</p></blockquote><p>Creating the database is a single command:</p><pre><code class="language-bash">npx wrangler d1 create bloggy</code></pre><p style="text-align: center">Centred text looks like this.') },
  { title: 'Better coffee with a cheap kitchen scale', featured: true, d: 16, tags: ['coffee', 'try-this'], html: body('Weighing beans and water instead of guessing changed my morning cup more than any new grinder did.') },
  { title: 'A week without notifications', featured: true, d: 29, tags: ['habits'], html: body('I turned off every notification for seven days. Here is what I missed, and what I did not miss at all.') },
  { title: 'The one-hour rule for side projects', featured: true, d: 50, tags: ['try-this'], html: body('If a project cannot move forward in one focused hour, it is too big. Cutting it down is the real work.') },
  { title: 'A warm desk lamp changed my evenings', featured: true, d: 66, tags: ['try-this'], html: body('One small change in light made it much easier to stop working, read a little and actually rest.') },
  { title: 'Five keyboard shortcuts I use every day', d: 41, tags: ['tools', 'try-this'], html: body('Small habits that save a surprising amount of time. Number three took me ten years to discover, and now I use it a hundred times a day.') },
  { title: 'What a month of journaling taught me', d: 58, tags: ['habits'], html: body('Three lines every evening, no rules. It turned out to be less about writing and more about noticing.') },
  { title: 'Sourdough, attempt number four', d: 75, tags: ['try-this'], html: body('The first three loaves were bricks. This time I changed one thing at a time and wrote everything down.') },
  { title: 'Notes from a rainy weekend', d: 400, tags: ['habits'], html: body('Two days indoors, a stack of books and a pot of coffee that never went cold.') },
  { title: 'My first post', d: 720, tags: ['web'], html: body('Hello. This is where I will collect small experiments and things worth trying.') },
];
for (const p of posts) {
  await api({ title: p.title, content_html: p.html, status: 'published', publish_at: at(p.d), featured: !!p.featured, tags: p.tags, description: '' });
}
await api({ title: 'Notes on slow mornings', content_html: body('Why I guard the first hour of the day.'), status: 'published', publish_at: Date.now() + 2 * day, tags: ['coffee', 'habits'] });
await api({ title: 'Ideas for the archive page', content_html: '<p>Half-finished thoughts.</p>', status: 'draft', tags: ['web'] });
await api({ kind: 'page', title: 'About', slug: 'about', content_html: '<p>This is a small personal blog about experiments, coffee and tools worth trying.</p>', status: 'published' });
console.log('Seeded local database.');
