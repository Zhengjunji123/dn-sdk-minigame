import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = [
  'src/board/puzzle-core.js',
  'src/screens/arena.js',
  'src/screens/lobby.js',
  'src/screens/splash.js',
  'src/nav/flow.js',
  'src/boot/launch.js',
  'src/monetize/entry-pipe.js',
  'game.js',
  'tests/engine-smoke.mjs',
  'tests/boot-smoke.mjs',
];

const reps = [
  [/assembleSession/g, 'createPuzzleCore'],
  [/BoardSession/g, 'PuzzleCore'],
  [/assembleMatchStage/g, 'createArenaScreen'],
  [/MatchStage/g, 'ArenaScreen'],
  [/assembleLobbyStage/g, 'createLobbyScreen'],
  [/LobbyStage/g, 'LobbyScreen'],
  [/assembleBootStage/g, 'createSplashScreen'],
  [/BootStage/g, 'SplashScreen'],
  [/StageRouter/g, 'ScreenFlow'],
  [/go\('match'/g, "go('arena'"],
  [/register\('match'/g, "register('arena'"],
  [/currentName === 'match'/g, "currentName === 'arena'"],
  [/currentName !== 'match'/g, "currentName !== 'arena'"],
  [/boot\/lobby\/match/g, 'splash/lobby/arena'],
  [/由 ArenaScreen 注册|由 MatchStage 注册/g, '由 ArenaScreen 注册'],
];

for (const f of files) {
  const p = path.join(root, f);
  let t = fs.readFileSync(p, 'utf8');
  for (const [re, to] of reps) t = t.replace(re, to);
  fs.writeFileSync(p, t);
  console.log('ok', f);
}
