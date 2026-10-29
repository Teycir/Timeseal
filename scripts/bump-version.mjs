// Bump package.json version once per deploy: <1.0 -> 1.0.0, then minor+1.
import { readFileSync, writeFileSync } from 'node:fs';

const path = new URL('../package.json', import.meta.url);
const src = readFileSync(path, 'utf8');
const [maj, min] = JSON.parse(src).version.split('.').map(Number);
const next = maj < 1 ? '1.0.0' : `${maj}.${min + 1}.0`;

writeFileSync(path, src.replace(/"version":\s*"[^"]+"/, `"version": "${next}"`));
console.log(`version -> ${next}`);
