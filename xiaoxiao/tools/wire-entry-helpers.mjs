import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const p = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/monetize/entry-pipe.js');
let t = fs.readFileSync(p, 'utf8');
const start = t.indexOf('export const ENTRY_REWARD_CODE');
const endMarker = t.includes('\r\n') ? '/**\r\n * 合并全局 entry' : '/**\n * 合并全局 entry';
const end = t.indexOf(endMarker);
if (start < 0 || end < 0) {
  console.error('markers', start, end);
  process.exit(1);
}
const insert = `import {
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

let _entryConfig = null;
let _started = false;
let _active = false;
let _running = null;
let _finished = null;
let _chestHandler = null;
/** 激励是否已 onShow 未关闭（并行插屏门闩） */
let _rewardShowing = false;
/** 插屏是否已 onShow 未关闭（激励 show 前必须等关，否则微信会顶掉插屏） */
let _interShowing = false;
/** 插屏 AD.show 已调用、尚未 settle（loading 或 showing） */
let _interInFlight = false;
/** 本轮/最近一次插屏 Promise（用于等占用结束再补激励） */
let _interPromise = null;
let _lastInterstitialAt = 0;
/** 首支全屏广告 onShow（Loading 用来压住进 play，体感更快） */
let _firstAdPromise = null;
let _firstAdResolve = null;

`;
t = t.slice(0, start) + insert + t.slice(end);
fs.writeFileSync(p, t);
console.log('entry-pipe wired, length=', t.length);
