// Increment every first-party cache version that must move with prompt data.
// Usage: node tools/bump-cache.mjs
import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const files = ['index.html', 'app.js'];
const sources = Object.fromEntries(files.map(file => [file, readFileSync(resolve(ROOT, file), 'utf8')]));
const versions = files.flatMap(file => [...sources[file].matchAll(/\?v=(\d+)/g)].map(match => match[1]));
const unique = [...new Set(versions)];
if (!versions.length || unique.length !== 1) {
  throw new Error(`cache versions must exist and match before bumping: ${unique.join(', ') || '(none)'}`);
}
if ((sources['index.html'].match(/\?v=/g) || []).length !== 4 || (sources['app.js'].match(/\?v=/g) || []).length !== 2) {
  throw new Error('unexpected cache-reference inventory; inspect before bumping');
}
const previous = Number(unique[0]);
const next = previous + 1;
for (const file of files) {
  const target = resolve(ROOT, file);
  const temporary = `${target}.cache-bump-${process.pid}.tmp`;
  const output = sources[file].replaceAll(`?v=${previous}`, `?v=${next}`);
  writeFileSync(temporary, output);
  renameSync(temporary, target);
}
console.log(`cache version: ${previous} -> ${next}`);
