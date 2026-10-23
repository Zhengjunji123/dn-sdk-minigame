/**
 * Compare basename + relative-path fingerprint overlap with xiaoxiaolei-0021.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const aRoot = path.resolve(here, '..');
const bRoot = path.resolve(here, '../../xiaoxiaolei-0021');

function walkJs(dir, base, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    if (name === 'node_modules' || name === 'tools' || name === 'output') continue;
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) walkJs(full, base, out);
    else if (name.endsWith('.js') || name.endsWith('.mjs')) {
      out.push(path.relative(base, full).split(path.sep).join('/'));
    }
  }
  return out;
}

const aFiles = walkJs(aRoot, aRoot).filter((f) => !f.startsWith('tools/') && !f.startsWith('js/sdk/sdk'));
const bFiles = walkJs(bRoot, bRoot).filter((f) => !f.startsWith('tools/') && !f.startsWith('js/sdk/sdk'));

const aNames = new Set(aFiles.map((f) => path.posix.basename(f)));
const bNames = new Set(bFiles.map((f) => path.posix.basename(f)));
const nameOverlap = [...aNames].filter((n) => bNames.has(n));

const aPaths = new Set(aFiles);
const bPaths = new Set(bFiles);
const pathOverlap = [...aPaths].filter((p) => bPaths.has(p));

const nameRate = aNames.size ? nameOverlap.length / aNames.size : 0;
const pathRate = aPaths.size ? pathOverlap.length / aPaths.size : 0;

console.log('002 js count', aFiles.length);
console.log('0021 js count', bFiles.length);
console.log('basename overlap', nameOverlap.length, '/', aNames.size, `= ${(nameRate * 100).toFixed(1)}%`);
console.log('identical relative paths', pathOverlap.length, '/', aPaths.size, `= ${(pathRate * 100).toFixed(1)}%`);
console.log('overlapping basenames:', nameOverlap.sort().join(', ') || '(none)');
console.log('overlapping paths:', pathOverlap.sort().join(', ') || '(none)');
