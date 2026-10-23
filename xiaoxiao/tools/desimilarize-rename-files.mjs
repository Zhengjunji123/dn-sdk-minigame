import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const renames = [
  ['src/host/audio.js', 'src/host/sound-bus.js'],
  ['src/host/platform.js', 'src/host/runtime-host.js'],
  ['src/host/save.js', 'src/host/vault.js'],
  ['src/conf/datanexus.js', 'src/conf/iaa-ids.js'],
  ['src/monetize/sdk-bind.js', 'src/monetize/dh-bind.js'],
  ['src/monetize/level-quiz.js', 'src/monetize/chapter-quiz.js'],
  ['tests/engine-smoke.mjs', 'tests/puzzle-smoke.mjs'],
];

for (const [a, b] of renames) {
  const from = path.join(root, a);
  const to = path.join(root, b);
  if (!fs.existsSync(from)) {
    console.warn('skip missing', a);
    continue;
  }
  fs.renameSync(from, to);
  console.log('mv', a, '->', b);
}

function walk(d, acc = []) {
  for (const n of fs.readdirSync(d)) {
    const f = path.join(d, n);
    if (fs.statSync(f).isDirectory()) {
      if (n === 'tools' || n === 'node_modules' || n === 'js') continue;
      walk(f, acc);
    } else if (/\.(js|mjs)$/.test(n)) acc.push(f);
  }
  return acc;
}

const files = walk(path.join(root, 'src')).concat([
  path.join(root, 'game.js'),
  path.join(root, 'tests/puzzle-smoke.mjs'),
  path.join(root, 'tests/boot-smoke.mjs'),
  path.join(root, 'code.fortify.config.json'),
  path.join(root, 'README.md'),
]);

const pairs = [
  ['../host/audio.js', '../host/sound-bus.js'],
  ['./audio.js', './sound-bus.js'],
  ['../host/platform.js', '../host/runtime-host.js'],
  ['./platform.js', './runtime-host.js'],
  ['./src/host/platform.js', './src/host/runtime-host.js'],
  ['../host/save.js', '../host/vault.js'],
  ['./save.js', './vault.js'],
  ['./datanexus.js', './iaa-ids.js'],
  ['../conf/datanexus.js', '../conf/iaa-ids.js'],
  ['./src/monetize/sdk-bind.js', './src/monetize/dh-bind.js'],
  ['./sdk-bind.js', './dh-bind.js'],
  ['../monetize/sdk-bind.js', '../monetize/dh-bind.js'],
  ['./level-quiz.js', './chapter-quiz.js'],
  ['../monetize/level-quiz.js', '../monetize/chapter-quiz.js'],
  ['src/host/audio.js', 'src/host/sound-bus.js'],
  ['src/host/platform.js', 'src/host/runtime-host.js'],
  ['src/host/save.js', 'src/host/vault.js'],
  ['src/conf/datanexus.js', 'src/conf/iaa-ids.js'],
  ['src/monetize/sdk-bind.js', 'src/monetize/dh-bind.js'],
  ['src/monetize/level-quiz.js', 'src/monetize/chapter-quiz.js'],
  ['tests/engine-smoke.mjs', 'tests/puzzle-smoke.mjs'],
  ['engine-smoke.mjs', 'puzzle-smoke.mjs'],
];

for (const f of files) {
  if (!fs.existsSync(f)) continue;
  let t = fs.readFileSync(f, 'utf8');
  const orig = t;
  for (const [a, b] of pairs) t = t.split(a).join(b);
  if (t !== orig) {
    fs.writeFileSync(f, t);
    console.log('rewrote', path.relative(root, f));
  }
}
