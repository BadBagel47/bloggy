// Fails if the committed editor bundle does not match its source (run `npm run build` and commit).
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';

const result = await build({
  entryPoints: ['admin-src/editor.js'], bundle: true, format: 'esm', minify: true, target: ['es2020'],
  legalComments: 'eof', write: false, outfile: 'public/admin/editor.js',
});
const fresh = result.outputFiles[0].text;
const committed = await readFile('public/admin/editor.js', 'utf8');
if (fresh !== committed) {
  console.error('public/admin/editor.js is out of date. Run: npm run build');
  process.exit(1);
}
console.log('Editor bundle is up to date.');
