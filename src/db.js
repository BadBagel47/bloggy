// Database access (Cloudflare D1). The schema is created by the Worker itself on first use,
// so deploys need no separate migration step (see HANDOFF.md).
import { MAX_FEATURED, slugify, isValidSlug } from './util.js';

const SCHEMA_VERSION = 1;

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL DEFAULT 'post' CHECK (kind IN ('post', 'page')),
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL DEFAULT '',
    content_html TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    publish_at INTEGER,
    featured INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS posts_live ON posts (kind, status, publish_at)`,
  `CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE,
    slug TEXT NOT NULL UNIQUE
  )`,
  `CREATE TABLE IF NOT EXISTS post_tags (
    post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (post_id, tag_id)
  )`,
  `CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)`,
];

export const DEFAULT_SETTINGS = {
  theme: 'clean',
  magazine_typography: 'classic',
  site_title: 'Try this one blog',
  tagline: 'Small experiments, notes and things worth trying.',
};

let schemaReady = false;

export async function ensureSchema(db) {
  if (schemaReady) return;
  const row = await db.prepare(`SELECT value FROM meta WHERE key = 'schema_version'`).first().catch(() => null);
  if (Number(row?.value) !== SCHEMA_VERSION) {
    await db.batch(SCHEMA.map((sql) => db.prepare(sql)));
    await db.prepare(`INSERT INTO meta (key, value) VALUES ('schema_version', ?1)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value`).bind(String(SCHEMA_VERSION)).run();
  }
  schemaReady = true;
}

// ---------- settings ----------

export async function getSettings(db) {
  const { results } = await db.prepare(`SELECT key, value FROM settings`).all();
  const out = { ...DEFAULT_SETTINGS };
  for (const r of results) out[r.key] = r.value;
  return out;
}

export async function saveSettings(db, values) {
  const allowed = Object.keys(DEFAULT_SETTINGS);
  const stmts = Object.entries(values)
    .filter(([k]) => allowed.includes(k))
    .map(([k, v]) => db.prepare(`INSERT INTO settings (key, value) VALUES (?1, ?2)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value`).bind(k, String(v)));
  if (stmts.length) await db.batch(stmts);
}

// ---------- reading posts (public) ----------

const LIVE = `status = 'published' AND publish_at <= ?1`;

export async function livePosts(db, now, { featured, limit = 10, offset = 0, from, to, tagSlug } = {}) {
  let sql = `SELECT p.* FROM posts p`;
  const where = [`p.kind = 'post'`, `p.status = 'published'`, `p.publish_at <= ?1`];
  const args = [now];
  if (tagSlug) {
    sql += ` JOIN post_tags pt ON pt.post_id = p.id JOIN tags t ON t.id = pt.tag_id`;
    args.push(tagSlug);
    where.push(`t.slug = ?${args.length}`);
  }
  if (featured === true) where.push(`p.featured = 1`);
  if (featured === false) where.push(`p.featured = 0`);
  if (from != null) { args.push(from); where.push(`p.publish_at >= ?${args.length}`); }
  if (to != null) { args.push(to); where.push(`p.publish_at < ?${args.length}`); }
  args.push(limit, offset);
  sql += ` WHERE ${where.join(' AND ')} ORDER BY p.publish_at DESC, p.id DESC LIMIT ?${args.length - 1} OFFSET ?${args.length}`;
  const { results } = await db.prepare(sql).bind(...args).all();
  return attachTags(db, results);
}

export async function countLivePosts(db, now, { featured } = {}) {
  let sql = `SELECT COUNT(*) AS n FROM posts WHERE kind = 'post' AND ${LIVE}`;
  if (featured === false) sql += ` AND featured = 0`;
  const row = await db.prepare(sql).bind(now).first();
  return row?.n ?? 0;
}

export async function liveTimestamps(db, now) {
  const { results } = await db.prepare(`SELECT publish_at FROM posts WHERE kind = 'post' AND ${LIVE}`).bind(now).all();
  return results.map((r) => r.publish_at);
}

export async function liveBySlug(db, slug, now) {
  const post = await db.prepare(`SELECT * FROM posts WHERE slug = ?2 AND ${LIVE}`).bind(now, slug).first();
  if (!post) return null;
  return (await attachTags(db, [post]))[0];
}

export async function livePages(db, now) {
  const { results } = await db.prepare(`SELECT id, slug, title FROM posts WHERE kind = 'page' AND ${LIVE} ORDER BY title COLLATE NOCASE`).bind(now).all();
  return results;
}

export async function liveTags(db, now) {
  const { results } = await db.prepare(`SELECT t.name, t.slug, COUNT(*) AS n FROM tags t
    JOIN post_tags pt ON pt.tag_id = t.id JOIN posts p ON p.id = pt.post_id
    WHERE p.kind = 'post' AND p.status = 'published' AND p.publish_at <= ?1
    GROUP BY t.id ORDER BY n DESC, t.name COLLATE NOCASE`).bind(now).all();
  return results;
}

export async function tagBySlug(db, slug) {
  return db.prepare(`SELECT * FROM tags WHERE slug = ?1`).bind(slug).first();
}

/** Older and newer neighbours of a post, for the links under a post. */
export async function neighbours(db, post, now) {
  const older = await db.prepare(`SELECT slug, title FROM posts WHERE kind = 'post' AND ${LIVE}
    AND (publish_at < ?2 OR (publish_at = ?2 AND id < ?3)) ORDER BY publish_at DESC, id DESC LIMIT 1`).bind(now, post.publish_at, post.id).first();
  const newer = await db.prepare(`SELECT slug, title FROM posts WHERE kind = 'post' AND ${LIVE}
    AND (publish_at > ?2 OR (publish_at = ?2 AND id > ?3)) ORDER BY publish_at ASC, id ASC LIMIT 1`).bind(now, post.publish_at, post.id).first();
  return { older, newer };
}

async function attachTags(db, posts) {
  if (!posts.length) return posts;
  const ids = posts.map((p) => p.id);
  const marks = ids.map((_, i) => `?${i + 1}`).join(',');
  const { results } = await db.prepare(`SELECT pt.post_id, t.name, t.slug FROM post_tags pt JOIN tags t ON t.id = pt.tag_id
    WHERE pt.post_id IN (${marks}) ORDER BY t.name COLLATE NOCASE`).bind(...ids).all();
  const byPost = new Map();
  for (const r of results) {
    if (!byPost.has(r.post_id)) byPost.set(r.post_id, []);
    byPost.get(r.post_id).push({ name: r.name, slug: r.slug });
  }
  return posts.map((p) => ({ ...p, tags: byPost.get(p.id) || [] }));
}

// ---------- admin ----------

export async function adminList(db, { kind = 'post', q = '' } = {}) {
  const args = [kind];
  let sql = `SELECT * FROM posts WHERE kind = ?1`;
  if (q) { args.push(`%${q}%`); sql += ` AND title LIKE ?2`; }
  sql += ` ORDER BY COALESCE(publish_at, updated_at) DESC, id DESC LIMIT 500`;
  const { results } = await db.prepare(sql).bind(...args).all();
  return attachTags(db, results);
}

export async function getPost(db, id) {
  const post = await db.prepare(`SELECT * FROM posts WHERE id = ?1`).bind(id).first();
  if (!post) return null;
  return (await attachTags(db, [post]))[0];
}

export async function featuredCount(db, exceptId = 0) {
  const row = await db.prepare(`SELECT COUNT(*) AS n FROM posts WHERE featured = 1 AND kind = 'post' AND id != ?1`).bind(exceptId).first();
  return row?.n ?? 0;
}

export class ValidationError extends Error {}

async function uniqueSlug(db, wanted, id) {
  let slug = wanted;
  for (let i = 2; i < 200; i++) {
    const clash = await db.prepare(`SELECT id FROM posts WHERE slug = ?1 AND id != ?2`).bind(slug, id || 0).first();
    if (!clash) return slug;
    slug = `${wanted}-${i}`;
  }
  throw new ValidationError('Kunde inte hitta en ledig webbadress.');
}

/**
 * Creates or updates a post or page. `input` comes from the admin editor, already sanitized.
 * Returns the saved post.
 */
export async function savePost(db, input, now = Date.now()) {
  const id = input.id ? Number(input.id) : null;
  const existing = id ? await getPost(db, id) : null;
  if (id && !existing) throw new ValidationError('Inlägget finns inte.');
  const kind = existing?.kind || (input.kind === 'page' ? 'page' : 'post');

  const title = String(input.title ?? '').trim().slice(0, 300);
  const status = input.status === 'published' ? 'published' : 'draft';
  let publishAt = input.publish_at != null && input.publish_at !== '' ? Number(input.publish_at) : null;
  if (status === 'published' && (!publishAt || Number.isNaN(publishAt))) publishAt = existing?.publish_at && existing.status === 'published' ? existing.publish_at : now;
  if (status === 'draft') publishAt = null;

  let slug = String(input.slug ?? '').trim().toLowerCase();
  if (!slug) slug = slugify(title);
  if (!isValidSlug(slug)) {
    slug = slugify(slug);
    if (!isValidSlug(slug)) throw new ValidationError('Webbadressen får bara innehålla a–z, 0–9 och bindestreck, och vissa ord är reserverade.');
  }
  slug = await uniqueSlug(db, slug, id);

  const featured = kind === 'post' && input.featured ? 1 : 0;
  if (featured && !existing?.featured && (await featuredCount(db, id || 0)) >= MAX_FEATURED) {
    throw new ValidationError(`Det finns redan ${MAX_FEATURED} framlyfta inlägg. Ta bort ett innan du lyfter fram ett nytt.`);
  }

  const content = String(input.content_html ?? '');
  const description = String(input.description ?? '').trim().slice(0, 300);

  let postId = id;
  if (existing) {
    await db.prepare(`UPDATE posts SET slug = ?1, title = ?2, content_html = ?3, description = ?4, status = ?5, publish_at = ?6,
      featured = ?7, updated_at = ?8 WHERE id = ?9`).bind(slug, title, content, description, status, publishAt, featured, now, id).run();
  } else {
    const res = await db.prepare(`INSERT INTO posts (kind, slug, title, content_html, description, status, publish_at, featured, created_at, updated_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?9)`).bind(kind, slug, title, content, description, status, publishAt, featured, now).run();
    postId = res.meta.last_row_id;
  }

  if (kind === 'post' && Array.isArray(input.tags)) await setPostTags(db, postId, input.tags);
  return getPost(db, postId);
}

async function setPostTags(db, postId, names) {
  const clean = [...new Map(names
    .map((n) => String(n ?? '').trim().replace(/^#/, '').slice(0, 40))
    .filter(Boolean)
    .map((n) => [n.toLowerCase(), n])).values()].slice(0, 20);
  await db.prepare(`DELETE FROM post_tags WHERE post_id = ?1`).bind(postId).run();
  for (const name of clean) {
    await db.prepare(`INSERT INTO tags (name, slug) VALUES (?1, ?2) ON CONFLICT DO NOTHING`).bind(name, await freeTagSlug(db, name)).run();
    await db.prepare(`INSERT OR IGNORE INTO post_tags (post_id, tag_id) SELECT ?1, id FROM tags WHERE name = ?2 COLLATE NOCASE`).bind(postId, name).run();
  }
}

async function freeTagSlug(db, name) {
  const existing = await db.prepare(`SELECT slug FROM tags WHERE name = ?1 COLLATE NOCASE`).bind(name).first();
  if (existing) return existing.slug;
  const base = slugify(name);
  let slug = base;
  for (let i = 2; await db.prepare(`SELECT 1 FROM tags WHERE slug = ?1`).bind(slug).first(); i++) slug = `${base}-${i}`;
  return slug;
}

export async function deletePost(db, id) {
  await db.batch([
    db.prepare(`DELETE FROM post_tags WHERE post_id = ?1`).bind(id),
    db.prepare(`DELETE FROM posts WHERE id = ?1`).bind(id),
  ]);
}

export async function allTags(db) {
  const { results } = await db.prepare(`SELECT t.id, t.name, t.slug, COUNT(pt.post_id) AS n FROM tags t
    LEFT JOIN post_tags pt ON pt.tag_id = t.id GROUP BY t.id ORDER BY t.name COLLATE NOCASE`).all();
  return results;
}

export async function renameTag(db, id, name) {
  const clean = String(name ?? '').trim().replace(/^#/, '').slice(0, 40);
  if (!clean) throw new ValidationError('Taggen måste ha ett namn.');
  const clash = await db.prepare(`SELECT id FROM tags WHERE name = ?1 COLLATE NOCASE AND id != ?2`).bind(clean, id).first();
  if (clash) throw new ValidationError('Det finns redan en tagg med det namnet.');
  await db.prepare(`UPDATE tags SET name = ?1 WHERE id = ?2`).bind(clean, id).run();
}

export async function deleteTag(db, id) {
  await db.batch([
    db.prepare(`DELETE FROM post_tags WHERE tag_id = ?1`).bind(id),
    db.prepare(`DELETE FROM tags WHERE id = ?1`).bind(id),
  ]);
}

/** Everything, for the export button (F-011). */
export async function exportAll(db) {
  const posts = (await db.prepare(`SELECT * FROM posts ORDER BY id`).all()).results;
  const tags = (await db.prepare(`SELECT * FROM tags ORDER BY id`).all()).results;
  const postTags = (await db.prepare(`SELECT * FROM post_tags`).all()).results;
  const settings = await getSettings(db);
  return { format: 'bloggy-export', version: 1, exported_at: new Date().toISOString(), settings, posts, tags, post_tags: postTags };
}
