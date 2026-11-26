import react from '@vitejs/plugin-react';
import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';

/** Writes the offline file list and a content version into dist/sw.js. */
function precacheManifest(): Plugin {
  return {
    name: 'ekts-precache',
    apply: 'build',
    closeBundle() {
      const dist = path.resolve(__dirname, 'dist');
      const files: string[] = [];
      const walk = (dir: string) => {
        for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, f.name);
          if (f.isDirectory()) walk(full);
          else files.push(path.relative(dist, full).split(path.sep).join('/'));
        }
      };
      walk(dist);
      const list = files.filter((f) => f !== 'sw.js').sort();
      const hash = createHash('sha256');
      hash.update(fs.readFileSync(path.join(dist, 'sw.js')));
      for (const f of list) hash.update(f).update(fs.readFileSync(path.join(dist, f)));
      const version = hash.digest('hex').slice(0, 12);
      const urls = ['./', ...list.map((f) => './' + f.split('/').map(encodeURIComponent).join('/'))];
      const sw = path.join(dist, 'sw.js');
      const src = fs
        .readFileSync(sw, 'utf8')
        .replace(/const CACHE = '[^']*';/, `const CACHE = 'ekts-mobil-${version}';`)
        .replace(/const PRECACHE = \[[^\]]*\];/, `const PRECACHE = ${JSON.stringify(urls)};`);
      fs.writeFileSync(sw, src);
    },
  };
}

export default defineConfig({
  // Relative base so the build works both at the GitHub Pages sub-path
  // (/EKTS-mobil/) and at a custom domain root.
  base: './',
  plugins: [react(), precacheManifest()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
