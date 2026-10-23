/**
 * One-shot: wrap shell stages as classes, remap boot/lobby/match names,
 * switch match-stage to BoardSession.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function write(rel, text) {
  fs.writeFileSync(path.join(root, rel), text);
  console.log('wrote', rel);
}

function patch(rel, mutator) {
  const file = path.join(root, rel);
  let t = fs.readFileSync(file, 'utf8');
  const next = mutator(t);
  if (next === t) throw new Error(`no changes in ${rel}`);
  fs.writeFileSync(file, next);
  console.log('patched', rel);
}

function wrapFactory(source, {
  oldFnName,
  assembleName,
  className,
  remapEnterExit = true,
}) {
  let t = source;
  if (!t.includes(`export default function ${oldFnName}`)) {
    throw new Error(`missing export default function ${oldFnName}`);
  }
  t = t.replace(
    `export default function ${oldFnName}`,
    `function ${assembleName}`
  );
  if (remapEnterExit) {
    t = t.replace(/\bonEnter\(/g, 'mount(');
    t = t.replace(/\bonExit\(/g, 'unmount(');
  }
  if (!t.trimEnd().endsWith('}')) {
    // factory ends with `  };\n}` — keep as-is
  }
  t = `${t.trimEnd()}\n\nexport default class ${className} {\n  constructor() {\n    const api = ${assembleName}();\n    Object.setPrototypeOf(api, ${className}.prototype);\n    return api;\n  }\n}\n`;
  return t;
}

// --- boot-stage ---
patch('app/shell/boot-stage.js', (t) => {
  t = t.replace(/this\.manager\.switch\('home'\)/g, "this.manager.go('lobby')");
  t = t.replace(
    /this\.manager\.switch\('play', \{ level \}\)/g,
    "this.manager.go('match', { level })"
  );
  return wrapFactory(t, {
    oldFnName: 'LoadingScene',
    assembleName: 'assembleBootStage',
    className: 'BootStage',
  });
});

// --- lobby-stage ---
patch('app/shell/lobby-stage.js', (t) => {
  t = t.replace(
    /this\.manager\.switch\('play', \{ level: readSave\('level', 1\) \}\)/g,
    "this.manager.go('match', { level: readSave('level', 1) })"
  );
  return wrapFactory(t, {
    oldFnName: 'HomeScene',
    assembleName: 'assembleLobbyStage',
    className: 'LobbyStage',
  });
});

// --- match-stage ---
patch('app/shell/match-stage.js', (t) => {
  t = t.replace(
    "import createEngine from '../logic/session.js';",
    "import BoardSession from '../logic/session.js';"
  );
  t = t.replace(/engine = createEngine\(\{ level \}\);/g, 'engine = new BoardSession({ level });');
  t = t.replace(/scene\.manager\.switch\('home'\)/g, "scene.manager.go('lobby')");
  // do NOT remap phase === 'play' (gameplay phase string)
  return wrapFactory(t, {
    oldFnName: 'PlayScene',
    assembleName: 'assembleMatchStage',
    className: 'MatchStage',
    remapEnterExit: true,
  });
});

// --- funnel scene name ---
patch('app/bridge/funnel.js', (t) => {
  t = t.replace(
    "GameGlobal.scene.currentName === 'play'",
    "GameGlobal.scene.currentName === 'match'"
  );
  t = t.replace(
    "sc.currentName === 'play'",
    "sc.currentName === 'match'"
  );
  t = t.replace(
    '由 scenes/play.js 注册',
    '由 MatchStage 注册'
  );
  return t;
});

console.log('done');
