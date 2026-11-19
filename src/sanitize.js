// Cleans post HTML from the editor before it is stored, using the Workers HTMLRewriter.
// Only the formatting the editor can produce is kept (F-004); everything else is removed.

const KEEP = new Set(['p', 'h2', 'h3', 'h4', 'strong', 'b', 'em', 'i', 'u', 's', 'a', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'br', 'hr']);
const DROP_WITH_CONTENT = new Set(['script', 'style', 'iframe', 'object', 'embed', 'svg', 'math', 'template', 'noscript', 'form', 'input', 'button', 'select', 'textarea', 'link', 'meta', 'base', 'title', 'head']);
const ALIGNABLE = new Set(['p', 'h2', 'h3', 'h4']);

function safeHref(href) {
  const v = String(href || '').trim();
  if (/^(https?:|mailto:)/i.test(v)) return v;
  if (/^(\/(?!\/)|#)/.test(v)) return v;
  return null;
}

function alignFrom(style) {
  const m = /text-align\s*:\s*(left|center|right|justify)/i.exec(style || '');
  return m ? m[1].toLowerCase() : null;
}

export async function sanitizeHtml(html) {
  const input = `<body>${String(html ?? '')}</body>`;
  const rewriter = new HTMLRewriter().on('*', {
    element(el) {
      const tag = el.tagName.toLowerCase();
      if (tag === 'body') return;
      if (DROP_WITH_CONTENT.has(tag)) { el.remove(); return; }
      if (!KEEP.has(tag)) { el.removeAndKeepContent(); return; }

      const attrs = [...el.attributes].map(([name, value]) => [name.toLowerCase(), value]);
      for (const [name] of attrs) el.removeAttribute(name);
      const get = (n) => attrs.find(([k]) => k === n)?.[1];

      if (ALIGNABLE.has(tag)) {
        const align = alignFrom(get('style'));
        if (align && align !== 'left') el.setAttribute('style', `text-align: ${align}`);
      }
      if (tag === 'a') {
        const href = safeHref(get('href'));
        if (!href) { el.removeAndKeepContent(); return; }
        el.setAttribute('href', href);
        if (/^https?:/i.test(href)) el.setAttribute('rel', 'noopener');
      }
      if (tag === 'code') {
        const lang = /language-([a-z0-9+#-]{1,20})/i.exec(get('class') || '');
        if (lang) el.setAttribute('class', `language-${lang[1].toLowerCase()}`);
      }
      if (tag === 'hr' && get('data-read-more') != null) el.setAttribute('data-read-more', '');
    },
    comments(c) { c.remove(); },
  });
  const out = await rewriter.transform(new Response(input, { headers: { 'Content-Type': 'text/html' } })).text();
  return out.replace(/^<body>/, '').replace(/<\/body>$/, '');
}

/** Keeps only one read-more marker (the first) in a post. */
export function singleReadMore(html) {
  let seen = false;
  return String(html).replace(/<hr[^>]*data-read-more[^>]*>/gi, (m) => {
    if (seen) return '';
    seen = true;
    return '<hr data-read-more="">';
  });
}
