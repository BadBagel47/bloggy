// One-time helper: downloads the Latin subsets of the site's Google Fonts
// so they can be self-hosted (no visitor requests to Google, see F-007).
// Usage: node scripts/fetch-fonts.mjs  -> writes public/fonts/*.woff2 and public/fonts/fonts.css
import { mkdir, writeFile } from 'node:fs/promises';

const FAMILIES = [
  'Montserrat+Alternates:wght@400;500',
  'DM+Sans:ital,opsz,wght@0,9..40,400..700;1,9..40,400..700',
  'Fraunces:ital,opsz,wght@0,9..144,400..700;1,9..144,400..700',
  'Source+Serif+4:ital,opsz,wght@0,8..60,400..700;1,8..60,400..700',
  'Bricolage+Grotesque:opsz,wght@12..96,400..800',
  'Inter:ital,opsz,wght@0,14..32,400..700;1,14..32,400..700',
  'Inter+Tight:wght@500..700',
  'JetBrains+Mono:wght@400..500',
];
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const OUT = new URL('../public/fonts/', import.meta.url);
await mkdir(OUT, { recursive: true });

let css = '/* Self-hosted Latin subsets of Google Fonts (SIL Open Font License, see LICENSE.txt). */\n';
for (const fam of FAMILIES) {
  const res = await fetch(`https://fonts.googleapis.com/css2?family=${fam}&display=swap`, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${fam}: ${res.status}`);
  const text = await res.text();
  // Blocks look like: /* latin */ @font-face { ... }
  const blocks = text.split('/* ').slice(1).map((b) => ({ subset: b.slice(0, b.indexOf(' */')), body: b.slice(b.indexOf('@font-face')) }));
  for (const { subset, body } of blocks) {
    if (subset !== 'latin') continue;
    const family = body.match(/font-family: '([^']+)'/)[1];
    const style = body.match(/font-style: (\w+)/)[1];
    const weight = body.match(/font-weight: ([\d ]+)/)[1].trim();
    const url = body.match(/url\((https:[^)]+\.woff2)\)/)[1];
    const file = `${family.toLowerCase().replace(/\s+/g, '-')}-${style}-${weight.replace(' ', '-')}.woff2`;
    const bin = await (await fetch(url)).arrayBuffer();
    await writeFile(new URL(file, OUT), Buffer.from(bin));
    css += `@font-face{font-family:'${family}';font-style:${style};font-weight:${weight};font-display:swap;src:url(/fonts/${file}) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}\n`;
    console.log('saved', file, bin.byteLength);
  }
}
await writeFile(new URL('fonts.css', OUT), css);
