// Fetch the pinned Fraunces Latin variable font used by the Maths Prompt Studio wordmark.
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT = resolve(ROOT, 'assets/fraunces-latin.woff2');
const URL = 'https://fonts.gstatic.com/s/fraunces/v38/6NU78FyLNQOQZAnv9bYEvDiIdE9Ea92uemAk_WBq8U_9v0c2Wa0KxC9TeP2Xz5c.woff2';
const EXPECTED_SHA256 = '48282a415ec22e31beaf0a0666e6fae0c8cbddcd0b1f6e729f27c3ade8a64e43';

const response = await fetch(URL);
if (!response.ok) throw new Error(`font request failed: ${response.status}`);
const bytes = Buffer.from(await response.arrayBuffer());
const digest = createHash('sha256').update(bytes).digest('hex');
if (digest !== EXPECTED_SHA256) throw new Error(`font checksum mismatch: ${digest}`);
await mkdir(dirname(OUTPUT), { recursive: true });
await writeFile(OUTPUT, bytes);
console.log(`Wrote ${OUTPUT} (${bytes.length} bytes, sha256 ${digest})`);
