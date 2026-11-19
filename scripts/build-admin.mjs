// Bundles the admin editor (TipTap) into public/admin/editor.js.
// The bundle is committed, so Cloudflare's default deploy command needs no build step.
import { build } from 'esbuild';

await build({
  entryPoints: ['admin-src/editor.js'],
  bundle: true,
  format: 'esm',
  minify: true,
  target: ['es2020'],
  outfile: 'public/admin/editor.js',
  legalComments: 'eof',
  logLevel: 'info',
});
