// Pure helpers shared by the Worker. No Cloudflare APIs here, so they can be unit-tested in Node.

export const SITE_TZ = 'Europe/Stockholm';

/** Words that cannot be used as a post or page address, because routes use them. */
export const RESERVED_SLUGS = new Set([
  'admin', 'api', 'tag', 'tags', 'archive', 'fonts', 'css', 'js', 'feed', 'rss', 'search',
  'page', 'cdn-cgi', 'favicon.ico', 'robots.txt', 'sitemap.xml',
]);

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Turns a title into a URL-friendly address, e.g. "Kaffe på morgonen!" -> "kaffe-pa-morgonen". */
export function slugify(text) {
  const map = { å: 'a', ä: 'a', ö: 'o', æ: 'ae', ø: 'o', ß: 'ss' };
  const base = String(text ?? '')
    .toLowerCase()
    .replace(/[åäöæøß]/g, (ch) => map[ch])
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
  return base || 'untitled';
}

export function isValidSlug(slug) {
  return typeof slug === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= 80 && !RESERVED_SLUGS.has(slug);
}

/** A post is visible to visitors when it is published and its publish time has passed. */
export function isLive(post, now = Date.now()) {
  return post.status === 'published' && Number(post.publish_at) <= now;
}

/** "draft" | "scheduled" | "published", as shown in admin. */
export function displayStatus(post, now = Date.now()) {
  if (post.status !== 'published') return 'draft';
  return Number(post.publish_at) > now ? 'scheduled' : 'published';
}

export function stripTags(html) {
  return String(html ?? '')
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|h[1-6]|li|blockquote|pre)>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

const READ_MORE = /<hr[^>]*data-read-more[^>]*>/i;

export function hasReadMore(html) {
  return READ_MORE.test(String(html ?? ''));
}

/**
 * The intro shown on the home page (F-022): the text above the "Read more" break.
 * Without a break, the first paragraph is used.
 */
export function introText(html) {
  const s = String(html ?? '');
  const m = s.match(READ_MORE);
  if (m) return stripTags(s.slice(0, m.index));
  const p = s.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  return stripTags(p ? p[1] : s).slice(0, 400);
}

/** The full post body as shown on the post page: the read-more marker is removed. */
export function bodyWithoutMarker(html) {
  return String(html ?? '').replace(new RegExp(READ_MORE.source, 'gi'), '');
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Year and month (1-12) of a timestamp in the site's time zone. */
export function yearMonth(ts, tz = SITE_TZ) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: 'numeric' }).formatToParts(new Date(Number(ts)));
  return { year: Number(parts.find((p) => p.type === 'year').value), month: Number(parts.find((p) => p.type === 'month').value) };
}

/**
 * Archive (F-006): posts grouped per year and month with counts, newest first.
 * Empty months are not included. The newest year with posts is marked open.
 */
export function buildArchive(timestamps, tz = SITE_TZ) {
  const byYear = new Map();
  for (const ts of timestamps) {
    const { year, month } = yearMonth(ts, tz);
    if (!byYear.has(year)) byYear.set(year, new Map());
    const months = byYear.get(year);
    months.set(month, (months.get(month) || 0) + 1);
  }
  const years = [...byYear.keys()].sort((a, b) => b - a);
  return years.map((year, i) => {
    const months = [...byYear.get(year).entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([month, count]) => ({ month, name: MONTHS[month - 1], count }));
    return { year, total: months.reduce((n, m) => n + m.count, 0), open: i === 0, months };
  });
}

export function monthName(month) {
  return MONTHS[month - 1];
}

/** Start and end (exclusive) timestamps of a month in the site's time zone. */
export function monthRange(year, month, tz = SITE_TZ) {
  const start = zonedTime(year, month, 1, tz);
  const end = month === 12 ? zonedTime(year + 1, 1, 1, tz) : zonedTime(year, month + 1, 1, tz);
  return { start, end };
}

/** Timestamp for local midnight on a date in a time zone. */
function zonedTime(year, month, day, tz) {
  const guess = Date.UTC(year, month - 1, day);
  const offset = tzOffsetMs(guess, tz);
  const ts = guess - offset;
  // Correct once more in case the offset differs at the result (DST change).
  return guess - tzOffsetMs(ts, tz);
}

function tzOffsetMs(ts, tz) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric',
  }).formatToParts(new Date(ts));
  const get = (t) => Number(parts.find((p) => p.type === t).value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return asUtc - Math.floor(ts / 1000) * 1000;
}

export function formatDate(ts, style = 'short', tz = SITE_TZ) {
  const opts = style === 'long'
    ? { timeZone: tz, year: 'numeric', month: 'long', day: 'numeric' }
    : { timeZone: tz, year: 'numeric', month: 'short', day: 'numeric' };
  return new Intl.DateTimeFormat('en-US', opts).format(new Date(Number(ts)));
}

export function formatDateSv(ts, tz = SITE_TZ) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: tz, year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(Number(ts)));
}

export const MAX_FEATURED = 5;
