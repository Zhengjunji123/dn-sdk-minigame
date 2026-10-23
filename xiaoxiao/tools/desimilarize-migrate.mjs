/**
 * One-shot: app/** → src/** with new topology + rewrite imports.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** old relative (from game root, posix) → new relative */
const MAP = {
  'app/boot.js': 'src/boot/launch.js',
  'app/shell/router.js': 'src/nav/flow.js',
  'app/shell/boot-stage.js': 'src/screens/splash.js',
  'app/shell/lobby-stage.js': 'src/screens/lobby.js',
  'app/shell/match-stage.js': 'src/screens/arena.js',
  'app/logic/rules.js': 'src/board/grid-rules.js',
  'app/logic/session.js': 'src/board/puzzle-core.js',
  'app/logic/stages.js': 'src/board/chapter-data.js',
  'app/logic/rng.js': 'src/board/chance.js',
  'app/view/board-draw.js': 'src/paint/grid-paint.js',
  'app/view/painter.js': 'src/paint/ink.js',
  'app/view/fx.js': 'src/paint/burst.js',
  'app/view/sidebar-assets.js': 'src/paint/rail-assets.js',
  'app/view/sidebar-entry.js': 'src/paint/rail-panel.js',
  'app/view/ad-style.js': 'src/paint/ad-layout.js',
  'app/view/assets.js': 'src/paint/media.js',
  'app/view/decor.js': 'src/paint/ornament.js',
  'app/view/widgets.js': 'src/paint/chips.js',
  'app/view/display.js': 'src/paint/surface.js',
  'app/view/easing.js': 'src/paint/ease.js',
  'app/view/safearea.js': 'src/paint/inset.js',
  'app/bridge/funnel.js': 'src/monetize/entry-pipe.js',
  'app/bridge/crate.js': 'src/monetize/treasure.js',
  'app/bridge/match-ads.js': 'src/monetize/arena-ads.js',
  'app/bridge/tray-reward.js': 'src/monetize/tip-reward.js',
  'app/bridge/sdk-bind.js': 'src/monetize/sdk-bind.js',
  'app/bridge/sdk-facade.js': 'src/monetize/sdk-facade.js',
  'app/bridge/ads-config.js': 'src/monetize/ads-conf.js',
  'app/bridge/level-quiz.js': 'src/monetize/level-quiz.js',
  'app/bridge/sidebar.js': 'src/monetize/rail.js',
  'app/runtime/host.js': 'src/host/platform.js',
  'app/runtime/canvas.js': 'src/host/canvas.js',
  'app/runtime/audio.js': 'src/host/audio.js',
  'app/runtime/persist.js': 'src/host/persist.js',
  'app/runtime/save.js': 'src/host/save.js',
  'app/config/app.js': 'src/conf/root.js',
  'app/config/datanexus.js': 'src/conf/datanexus.js',
};

function toPosix(p) {
  return p.split(path.sep).join('/');
}

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function relImport(fromFile, toFile) {
  let rel = path.relative(path.dirname(fromFile), toFile).split(path.sep).join('/');
  if (!rel.startsWith('.')) rel = `./${rel}`;
  return rel;
}

// 1) copy files
for (const [oldRel, newRel] of Object.entries(MAP)) {
  const src = path.join(root, oldRel);
  const dst = path.join(root, newRel);
  if (!fs.existsSync(src)) {
    console.warn('MISSING', oldRel);
    continue;
  }
  ensureDir(dst);
  fs.copyFileSync(src, dst);
  console.log('copy', oldRel, '→', newRel);
}

// 2) rewrite imports in all moved src files + game.js + tests
const rewriteTargets = [
  ...Object.values(MAP).map((r) => path.join(root, r)),
  path.join(root, 'game.js'),
  path.join(root, 'tests/engine-smoke.mjs'),
  path.join(root, 'tests/boot-smoke.mjs'),
];

const oldToNewAbs = {};
for (const [oldRel, newRel] of Object.entries(MAP)) {
  oldToNewAbs[path.join(root, oldRel)] = path.join(root, newRel);
  // also index by ending path segments for resolving relative imports
}

function resolveImport(fromFile, spec) {
  if (!spec.startsWith('.')) return null;
  const resolved = path.resolve(path.dirname(fromFile), spec);
  const candidates = [resolved, `${resolved}.js`];
  for (const c of candidates) {
    const posix = toPosix(path.relative(root, c));
    if (MAP[posix]) return path.join(root, MAP[posix]);
    // already under src after copy — map via old path if file was app/*
    for (const [oldRel, newRel] of Object.entries(MAP)) {
      if (path.join(root, oldRel) === c || path.join(root, oldRel) === resolved) {
        return path.join(root, newRel);
      }
    }
  }
  // If fromFile is already in src/, resolve against current tree
  if (fs.existsSync(resolved) || fs.existsSync(`${resolved}.js`)) {
    const hit = fs.existsSync(`${resolved}.js`) ? `${resolved}.js` : resolved;
    return hit;
  }
  return null;
}

/** Map an import that still points at app/ paths (from game.js / tests / leftover) */
function mapSpec(fromFile, spec) {
  if (spec.startsWith('./app/') || spec.startsWith('../app/') || spec.includes('/app/')) {
    // normalize to root-relative
    const abs = path.resolve(path.dirname(fromFile), spec);
    const rel = toPosix(path.relative(root, abs.endsWith('.js') ? abs : `${abs}.js`));
    const key = rel.replace(/\.js$/, '') + '.js';
    const alt = rel.endsWith('.js') ? rel : `${rel}.js`;
    const newRel = MAP[alt] || MAP[key];
    if (newRel) return relImport(fromFile, path.join(root, newRel));
  }
  if (!spec.startsWith('.')) return null;

  // Resolve relative import as if still reading from OLD location of fromFile
  // Find old path of fromFile
  let oldFrom = null;
  for (const [oldRel, newRel] of Object.entries(MAP)) {
    if (path.join(root, newRel) === fromFile) {
      oldFrom = path.join(root, oldRel);
      break;
    }
  }
  if (!oldFrom) {
    // game.js / tests: resolve against new tree after naive rewrite of ./app/
    const abs = path.resolve(path.dirname(fromFile), spec);
    const withJs = abs.endsWith('.js') ? abs : `${abs}.js`;
    const rel = toPosix(path.relative(root, withJs));
    if (MAP[rel]) return relImport(fromFile, path.join(root, MAP[rel]));
    return null;
  }

  const oldTarget = path.resolve(path.dirname(oldFrom), spec);
  const oldTargetJs = oldTarget.endsWith('.js') ? oldTarget : `${oldTarget}.js`;
  const oldRel = toPosix(path.relative(root, oldTargetJs));
  const newRel = MAP[oldRel];
  if (!newRel) {
    // maybe points to js/sdk
    if (oldRel.includes('js/sdk/')) {
      return relImport(fromFile, path.join(root, oldRel));
    }
    return null;
  }
  return relImport(fromFile, path.join(root, newRel));
}

const importRe = /from\s+['"]([^'"]+)['"]/g;
const dynImportRe = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

for (const file of rewriteTargets) {
  if (!fs.existsSync(file)) {
    console.warn('skip missing', file);
    continue;
  }
  let text = fs.readFileSync(file, 'utf8');
  const rewrite = (spec) => {
    const next = mapSpec(file, spec);
    return next || spec;
  };
  text = text.replace(importRe, (full, spec) => {
    const n = rewrite(spec);
    return full.replace(spec, n);
  });
  text = text.replace(dynImportRe, (full, spec) => {
    const n = rewrite(spec);
    return full.replace(spec, n);
  });
  // bare side-effect imports: import './app/bridge/sidebar.js'
  text = text.replace(/import\s+['"]([^'"]+)['"]\s*;/g, (full, spec) => {
    const n = rewrite(spec);
    return `import '${n}';`;
  });
  fs.writeFileSync(file, text);
  console.log('rewrite', toPosix(path.relative(root, file)));
}

// 3) remove old app tree
const appDir = path.join(root, 'app');
if (fs.existsSync(appDir)) {
  fs.rmSync(appDir, { recursive: true, force: true });
  console.log('removed app/');
}

console.log('DONE migrate');
