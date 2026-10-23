/**
 * Wire extracted modules into arena / puzzle-core / entry-pipe.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ---- arena.js: strip chrome, import from arena-chrome ----
{
  const p = path.join(root, 'src/screens/arena.js');
  let t = fs.readFileSync(p, 'utf8');
  // remove unused buildClearBurst import if only used by buildFlash — keep for other uses
  const chromeImport = `import {
  GOAL_POPUP_SECONDS,
  RESULT_DELAY,
  PRAISE,
  cellKey,
  buildFlash,
  toast,
  bottomReserve,
  layoutArea,
  drawToolChip,
} from './arena-chrome.js';
`;
  // Drop local chrome block from const GOAL... through end of drawToolChip
  t = t.replace(
    /\nconst GOAL_POPUP_SECONDS[\s\S]*?^}\n\nfunction createArenaScreen/m,
    `\n${chromeImport}\nfunction createArenaScreen`
  );
  // If BOARD_SIZE only used by cellKey, may still be used elsewhere — keep import
  fs.writeFileSync(p, t);
  console.log('arena wired');
}

// ---- puzzle-core.js: import cell-ops ----
{
  const p = path.join(root, 'src/board/puzzle-core.js');
  let t = fs.readFileSync(p, 'utf8');
  t = t.replace(
    /import makeRandom, \{ pickIndex \} from '\.\/chance\.js';\n\n\nfunction normalizeCells[\s\S]*?^function createPuzzleCore/m,
    `import makeRandom, { pickIndex } from './chance.js';
import {
  normalizeCells,
  normalizeCell,
  emptyBoard,
  cloneBoard,
  validateBoard,
  normalizeGems,
} from './cell-ops.js';

function createPuzzleCore`
  );
  // re-export normalizeCells from cell-ops
  t = t.replace(
    /export \{\n  normalizeCells,\n\};/,
    `export { normalizeCells } from './cell-ops.js';`
  );
  fs.writeFileSync(p, t);
  console.log('puzzle-core wired');
}

// ---- entry-pipe.js: import helpers, remove local copies, re-export codes ----
{
  const p = path.join(root, 'src/monetize/entry-pipe.js');
  let t = fs.readFileSync(p, 'utf8');
  const helperImport = `import {
  ENTRY_REWARD_CODE,
  ENTRY_INTERSTITIAL_CODE,
  HARD_PULL_LIMIT,
  sleep,
  isPlainObject,
  normalizePullLimit,
  normalizeDelayRange,
  pickRandomDelayMs,
  pickDelayField,
  getLaunchScene,
  normalizeSceneList,
  isSceneBlocked,
  pickOverrideRow,
  isChestEnabled,
  timeoutsFor,
  interstitialMinGapMs,
  isPlacementEnabled,
} from './entry-helpers.js';

export { ENTRY_REWARD_CODE, ENTRY_INTERSTITIAL_CODE };
`;
  // Remove old export const codes and HARD_PULL and helper functions up to resolveEntryForScene
  t = t.replace(
    /export const ENTRY_REWARD_CODE = 'entry_reward';\nexport const ENTRY_INTERSTITIAL_CODE = 'entry_interstitial';\n\nconst HARD_PULL_LIMIT = 5;\n/,
    ''
  );
  // Insert helper import after AdsConfig import
  t = t.replace(
    /import AdsConfig from '\.\/ads-conf\.js';\n/,
    `import AdsConfig from './ads-conf.js';\n${helperImport}\n`
  );
  // Remove local function definitions that are now imported
  t = t.replace(
    /\nfunction sleep\(ms\) \{[\s\S]*?\nfunction isPlacementEnabled\(code\) \{[\s\S]*?return slot\.enabled !== false;\n\}\n/,
    '\n'
  );
  fs.writeFileSync(p, t);
  console.log('entry-pipe wired');
}

console.log('DONE split wire');
