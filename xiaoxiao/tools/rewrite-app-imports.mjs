/**
 * One-shot: rewrite import paths inside app/ after structural move.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../app');

const modules = {
  rng: 'logic/rng.js',
  rules: 'logic/rules.js',
  stages: 'logic/stages.js',
  session: 'logic/session.js',
  router: 'shell/router.js',
  bootStage: 'shell/boot-stage.js',
  lobbyStage: 'shell/lobby-stage.js',
  matchStage: 'shell/match-stage.js',
  painter: 'view/painter.js',
  decor: 'view/decor.js',
  boardDraw: 'view/board-draw.js',
  fx: 'view/fx.js',
  display: 'view/display.js',
  easing: 'view/easing.js',
  safearea: 'view/safearea.js',
  assets: 'view/assets.js',
  widgets: 'view/widgets.js',
  adStyle: 'view/ad-style.js',
  sidebarEntry: 'view/sidebar-entry.js',
  sidebarAssets: 'view/sidebar-assets.js',
  audio: 'runtime/audio.js',
  host: 'runtime/host.js',
  canvas: 'runtime/canvas.js',
  save: 'runtime/save.js',
  persist: 'runtime/persist.js',
  funnel: 'bridge/funnel.js',
  trayReward: 'bridge/tray-reward.js',
  crate: 'bridge/crate.js',
  matchAds: 'bridge/match-ads.js',
  sdkFacade: 'bridge/sdk-facade.js',
  sdkBind: 'bridge/sdk-bind.js',
  adsConfig: 'bridge/ads-config.js',
  levelQuiz: 'bridge/level-quiz.js',
  sidebar: 'bridge/sidebar.js',
  appConfig: 'config/app.js',
  datanexus: 'config/datanexus.js',
};

function rel(fromFile, toMod) {
  const fromDir = path.dirname(fromFile);
  const target = path.join(root, modules[toMod]);
  let r = path.relative(fromDir, target).replace(/\\/g, '/');
  if (!r.startsWith('.')) r = `./${r}`;
  return r;
}

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (name.endsWith('.js')) out.push(p);
  }
  return out;
}

const patterns = [
  ['../play/config.js', 'rules'],
  ['../play/config', 'rules'],
  ['../play/levels.js', 'stages'],
  ['../play/levels', 'stages'],
  ['../play/engine', 'session'],
  ['../play/audio', 'audio'],
  ['../play/board-view', 'boardDraw'],
  ['../play/effects', 'fx'],
  ['../play/entry-flow.js', 'funnel'],
  ['../play/entry-flow', 'funnel'],
  ['./entry-flow.js', 'funnel'],
  ['./entry-flow', 'funnel'],
  ['../play/click-reward', 'trayReward'],
  ['../play/chest', 'crate'],
  ['../play/play-ads', 'matchAds'],
  ['../play/level-quiz', 'levelQuiz'],
  ['../core/store', 'persist'],
  ['../core/random.js', 'rng'],
  ['../core/random', 'rng'],
  ['../core/save', 'save'],
  ['../core/scene', 'router'],
  ['../ui/draw', 'painter'],
  ['../ui/decor', 'decor'],
  ['../ui/easing', 'easing'],
  ['../ui/safearea', 'safearea'],
  ['../ui/assets', 'assets'],
  ['../ui/widgets', 'widgets'],
  ['../ui/ad-style', 'adStyle'],
  ['../ui/sidebar-entry', 'sidebarEntry'],
  ['../ui/sidebar-assets', 'sidebarAssets'],
  ['../ui/display', 'display'],
  ['../sdk-shim.js', 'sdkFacade'],
  ['../sdk-shim', 'sdkFacade'],
  ['../config/gameconfig', 'appConfig'],
  ['../config/ads.js', 'adsConfig'],
  ['../config/ads', 'adsConfig'],
  ['../render', 'canvas'],
  ['./render', 'canvas'],
  ['./platform', 'host'],
  ['../platform', 'host'],
  ['./scenes/loading', 'bootStage'],
  ['./scenes/home', 'lobbyStage'],
  ['./scenes/play', 'matchStage'],
  ['./config/gameconfig', 'appConfig'],
  ['./ui/display', 'display'],
  ['./core/save', 'save'],
  ['./core/scene', 'router'],
];

const files = walk(root);
let changed = 0;

for (const file of files) {
  let text = fs.readFileSync(file, 'utf8');
  const original = text;

  if (file.includes(`${path.sep}logic${path.sep}`)) {
    text = text.replace(/from\s+['"]\.\/config\.js['"]/g, `from '${rel(file, 'rules')}'`);
    text = text.replace(/from\s+['"]\.\/levels\.js['"]/g, `from '${rel(file, 'stages')}'`);
  }
  if (file.endsWith(`${path.sep}fx.js`) || file.endsWith(`${path.sep}board-draw.js`) || file.endsWith(`${path.sep}stages.js`)) {
    text = text.replace(/from\s+['"]\.\/config\.js['"]/g, `from '${rel(file, 'rules')}'`);
    text = text.replace(/from\s+['"]\.\/board-view\.js['"]/g, `from '${rel(file, 'boardDraw')}'`);
  }
  if (file.endsWith(`${path.sep}sdk-bind.js`)) {
    text = text.replace(/require\(['"]\.\.\/sdk\/sdk\.js['"]\)/, "require('../../js/sdk/sdk.js')");
  }
  if (file.endsWith(`${path.sep}app.js`) && file.includes(`${path.sep}config${path.sep}`)) {
    text = text.replace(/from\s+['"]\.\.\/play\/config['"]/g, `from '${rel(file, 'rules')}'`);
  }

  for (const [oldSpec, id] of patterns) {
    const escaped = oldSpec.replace(/\./g, '\\.');
    const re = new RegExp(`from\\s+['"]${escaped}['"]`, 'g');
    text = text.replace(re, `from '${rel(file, id)}'`);
  }

  text = text.replace(/from\s+['"]\.\.\/sdk\/ext\.js['"]/g, "from '../../js/sdk/ext.js'");
  text = text.replace(/from\s+['"]\.\.\/\.\.\/sdk\/ext\.js['"]/g, "from '../../js/sdk/ext.js'");

  if (text !== original) {
    fs.writeFileSync(file, text);
    changed += 1;
    console.log('rewrote', path.relative(root, file));
  }
}

console.log(`done, files changed: ${changed}`);
