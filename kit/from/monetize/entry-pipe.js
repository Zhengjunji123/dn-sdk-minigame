/**
 * 入场直投漏斗（移植自 xiaoxiaolei-001，业务对齐 chengyu / shared EntryFlow，仍用 AD.show）
 * 002 不改任何语义：宝箱 handler 由 ArenaScreen 注册，GameGlobal.scene.currentName === 'arena' 时弹出。
 *
 * 配置：Deploy.getAdvertConfigAsync() 远程优先，缺字段才用本地 ads.js；
 *       blockScenes 兼容 entry 内或根级。
 * 广告：AD.show('entry_reward' | 'entry_interstitial')
 *
 * adStrategyType：
 *   1 强变现：delay → 并行插屏 + 激励（只 await 激励；被占则 waitSlot 重试）
 *   2 宝箱：firstDelay → 宝箱 → 不再直拉；结束后若插屏开着补一次（同「激励关」）
 *   3 混合：firstDelay → 宝箱 → directPullDelayMs → 直拉（不再叠 firstDelay）
 *           chest.enabled=false 时跳过宝箱，直接走直拉（含 firstDelay）
 *
 * 激励位关：只出一次插屏（await close）。
 * entry.enabled=false：完全跳过入场广告（不跑强变现、不补插屏）。
 * blockScenes：自然量，补一次插屏。
 *
 * 对齐成语的互斥恢复（业务层等价 RewardedUnit.waitSlot，不接入 DH/shared SDK）：
 * - 插屏：激励 loading 时可出；激励 showing 时不出（防 2003）
 * - 激励 show 被插屏占住（covered/2002/2003）：等插屏关后同轮重试，最多 2 次
 */
import { AD, DataNexus } from './sdk-facade.js';
import GameConfig from '../conf/root.js';
import AdsConfig from './ads-conf.js';

import {
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

/**
 * 合并全局 entry + sceneOverrides
 * 可盖：enabled / pullLimit / adStrategyType / rewardedTiming / chest
 * 仍受 blockScenes 约束：命中则不走直投（覆盖无效）
 */
export function resolveEntryForScene(entry, scene) {
  const base = isPlainObject(entry) ? entry : {};
  const over = pickOverrideRow(base.sceneOverrides, scene);
  const pullLimitRaw = Number(over.pullLimit != null ? over.pullLimit : base.pullLimit);
  const strategyRaw = Number(
    over.adStrategyType != null ? over.adStrategyType : base.adStrategyType
  );
  const timingSrc = isPlainObject(over.rewardedTiming)
    ? over.rewardedTiming
    : base.rewardedTiming;
  const localTiming =
    (AdsConfig.entry && AdsConfig.entry.rewardedTiming) || {
      firstDelayRangeMs: { min: 0, max: 0 },
      intervalRangeMs: { min: 0, max: 0 },
    };
  const enabled =
    typeof over.enabled === 'boolean' ? over.enabled : base.enabled !== false;
  return {
    enabled,
    blockScenes: normalizeSceneList(base.blockScenes),
    pullLimit: normalizePullLimit(pullLimitRaw, HARD_PULL_LIMIT),
    adStrategyType: strategyRaw === 2 || strategyRaw === 3 ? strategyRaw : 1,
    rewardedTiming: {
      firstDelayRangeMs: normalizeDelayRange(
        timingSrc && timingSrc.firstDelayRangeMs,
        localTiming.firstDelayRangeMs
      ),
      intervalRangeMs: normalizeDelayRange(
        timingSrc && timingSrc.intervalRangeMs,
        localTiming.intervalRangeMs
      ),
    },
    chest: isPlainObject(over.chest)
      ? Object.assign({}, base.chest || {}, over.chest)
      : base.chest || null,
    _overrideKeys: Object.keys(over || {}),
  };
}

function defaultEntry() {
  const local = (AdsConfig && AdsConfig.entry) || {};
  return {
    enabled: local.enabled !== false,
    pullLimit: normalizePullLimit(local.pullLimit, HARD_PULL_LIMIT),
    adStrategyType: (() => {
      const n = Number(local.adStrategyType);
      return n === 2 || n === 3 ? n : 1;
    })(),
    blockScenes: normalizeSceneList(local.blockScenes),
    rewardedTiming: local.rewardedTiming || {
      firstDelayRangeMs: { min: 0, max: 0 },
      intervalRangeMs: { min: 0, max: 0 },
    },
    sceneOverrides: isPlainObject(local.sceneOverrides) ? local.sceneOverrides : {},
    chest: local.chest || null,
  };
}

/**
 * 远程优先：字段在远程有有效值就用远程，否则用本地默认。
 * blockScenes：entry.blockScenes → 根级 advertConfig.blockScenes → 本地（空数组也算远程有效）。
 */
export function applyAdvertEntryConfig(advertConfig) {
  const base = defaultEntry();
  const remote = advertConfig && isPlainObject(advertConfig.entry) ? advertConfig.entry : null;

  if (!remote) {
    if (advertConfig && Array.isArray(advertConfig.blockScenes)) {
      _entryConfig = Object.assign({}, base, {
        blockScenes: normalizeSceneList(advertConfig.blockScenes),
      });
      console.log('[entry] applyAdvertEntryConfig', {
        source: 'local+root.blockScenes',
        enabled: _entryConfig.enabled,
        blockScenes: _entryConfig.blockScenes,
      });
      return _entryConfig;
    }
    _entryConfig = base;
    console.log('[entry] applyAdvertEntryConfig', { source: 'local', enabled: _entryConfig.enabled });
    return _entryConfig;
  }

  let blockScenesFrom = 'local';
  let blockSrc = null;
  if (Array.isArray(remote.blockScenes)) {
    blockSrc = remote.blockScenes;
    blockScenesFrom = 'remote.entry';
  } else if (advertConfig && Array.isArray(advertConfig.blockScenes)) {
    blockSrc = advertConfig.blockScenes;
    blockScenesFrom = 'remote.root';
  }

  const strategyRaw =
    remote.adStrategyType != null ? Number(remote.adStrategyType) : Number(base.adStrategyType);
  const pullRaw = remote.pullLimit != null ? remote.pullLimit : base.pullLimit;

  _entryConfig = {
    enabled: typeof remote.enabled === 'boolean' ? remote.enabled : base.enabled,
    pullLimit: normalizePullLimit(pullRaw, base.pullLimit),
    adStrategyType: strategyRaw === 2 || strategyRaw === 3 ? strategyRaw : 1,
    blockScenes: blockSrc != null ? normalizeSceneList(blockSrc) : base.blockScenes,
    rewardedTiming: {
      firstDelayRangeMs: normalizeDelayRange(
        remote.rewardedTiming && remote.rewardedTiming.firstDelayRangeMs,
        base.rewardedTiming.firstDelayRangeMs
      ),
      intervalRangeMs: normalizeDelayRange(
        remote.rewardedTiming && remote.rewardedTiming.intervalRangeMs,
        base.rewardedTiming.intervalRangeMs
      ),
    },
    sceneOverrides: isPlainObject(remote.sceneOverrides)
      ? remote.sceneOverrides
      : base.sceneOverrides,
    chest: isPlainObject(remote.chest) ? remote.chest : base.chest,
  };

  console.log('[entry] applyAdvertEntryConfig', {
    source: 'remote+localFallback',
    enabled: _entryConfig.enabled,
    pullLimit: _entryConfig.pullLimit,
    adStrategyType: _entryConfig.adStrategyType,
    blockScenes: _entryConfig.blockScenes,
    blockScenesFrom,
  });
  return _entryConfig;
}

export function getEntryConfig() {
  return _entryConfig || defaultEntry();
}

export function isEntryActive() {
  return !!_active;
}

function ensureFirstAdPromise() {
  if (_firstAdPromise) return _firstAdPromise;
  _firstAdPromise = new Promise((resolve) => {
    _firstAdResolve = resolve;
  });
  return _firstAdPromise;
}

function markFirstAdShown(code) {
  if (typeof _firstAdResolve === 'function') {
    console.log(`[entry] firstAdShown code=${code}`);
    _firstAdResolve({ code, at: Date.now() });
    _firstAdResolve = null;
  }
}

/** Loading：等首支入场全屏广告 onShow（或漏斗已结束/跳过） */
export function getEntryFirstAdPromise() {
  return _firstAdPromise;
}

/** 注册宝箱流程：() => Promise；type=2/3 时调用。未注册则跳过宝箱。 */
export function registerChestHandler(handler) {
  _chestHandler = typeof handler === 'function' ? handler : null;
}

function showAd(code) {
  const { loadMs, closeMs } = timeoutsFor(code);
  const isReward = code === ENTRY_REWARD_CODE;
  const isInter = code === ENTRY_INTERSTITIAL_CODE;
  return new Promise((resolve) => {
    let settled = false;
    let shown = false;
    let timer = null;
    const finish = (payload) => {
      if (settled) return;
      settled = true;
      if (isReward) _rewardShowing = false;
      if (isInter) {
        _interShowing = false;
        _interInFlight = false;
      }
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      resolve(payload);
    };
    const armTimer = (ms, reason) => {
      if (timer) clearTimeout(timer);
      const wait = Math.max(1000, Number(ms) || loadMs);
      timer = setTimeout(() => {
        console.warn(`[entry] ${code} timeout ${wait}ms (${reason})`);
        finish({ ok: false, timeout: true, shown, reason });
      }, wait);
    };
    if (isInter) _interInFlight = true;
    armTimer(loadMs, 'load');
    try {
      DataNexus.reportIaaAdPlacementShow(code);
      AD.show(code, {
        onShow() {
          shown = true;
          if (isReward) {
            _rewardShowing = true;
            // 激励已出屏：插屏若仍标占用，多半被顶掉且未回调 onClose（开发者工具常见）
            if (_interShowing || _interInFlight) {
              console.warn('[entry] 激励出屏，清除插屏占用态（避免卡死后续轮次）');
              _interShowing = false;
              _interInFlight = false;
            }
          }
          if (isInter) {
            _interShowing = true;
            _lastInterstitialAt = Date.now();
          }
          markFirstAdShown(code);
          console.log(`[entry] ${code} onShow`);
          armTimer(closeMs, 'close');
        },
        onClose(res) {
          console.log(`[entry] ${code} onClose`, res);
          finish({
            ok: true,
            closed: true,
            isEnded: !!(res && res.isEnded),
            shown: true,
            res,
          });
        },
        onError(err) {
          console.warn(`[entry] ${code} onError`, err);
          finish({ ok: false, error: err, shown });
        },
      });
    } catch (err) {
      console.warn(`[entry] ${code} throw`, err);
      finish({ ok: false, error: err, shown });
    }
  });
}

/** 对齐成语 isCoveredErr：插屏占住导致激励 show 失败 */
function isCoveredLikeErr(err) {
  if (!err) return false;
  const code = err.errCode != null ? err.errCode : err.code;
  if (code === 2002 || code === 2003 || code === '2002' || code === '2003') {
    return true;
  }
  const text = String(err.errMsg || err.message || err.reason || err || '');
  return /cover|other ad|another ad|already showing|当前有广告|正在展示|2002|2003/i.test(
    text
  );
}

function rewardNeedsWaitSlot(res) {
  if (!res || res.shown) return false;
  if (isCoveredLikeErr(res.error)) return true;
  // 无明确 error 但插屏仍占用：真机常见静默失败 / 超时未出屏
  return !!(_interShowing || _interInFlight);
}

/**
 * 对齐成语 _waitInterstitialSlot：等插屏关闭后再 show 激励。
 * race 30s 兜底（成语 waitWxOnShow(30000)），避免插屏回调丢失卡死。
 */
async function waitInterstitialSlot() {
  if (!_interShowing && !_interInFlight) return;
  console.log('[entry] 激励被占：插屏占用中，等关闭后再 show');
  const closer = _interPromise
    ? _interPromise.then(() => {})
    : waitUntil(() => !_interShowing && !_interInFlight, 60000, 40);
  await Promise.race([closer, sleep(30000)]);
  await waitUntil(() => !_interShowing && !_interInFlight, 2000, 40);
}

/**
 * 对齐成语 RewardedUnit：show 被占 → waitSlot → 重试，最多 2 次（共最多 3 次 show）。
 * 仍走 AD.show，不接 shared AdService。
 */
async function showEntryRewardWithWaitSlot() {
  let slotTry = 0;
  let last = null;
  for (;;) {
    last = await showAd(ENTRY_REWARD_CODE);
    if (last && last.shown) return last;
    if (!rewardNeedsWaitSlot(last) || slotTry >= 2) {
      return last;
    }
    slotTry += 1;
    console.warn(
      `[entry] 激励 show 被占用，等插屏关闭后重试(${slotTry}/2)`,
      (last && last.error) || last
    );
    await waitInterstitialSlot();
    if (!_active) return last;
  }
}

/**
 * 并行插屏：对齐成语 _fireRoundInterstitial(allowOnRewarded:false)
 * 激励 loading 时可出；激励 showing / 冷却 / 关位则跳过。
 */
function fireRoundInterstitial() {
  if (!isPlacementEnabled(ENTRY_INTERSTITIAL_CODE)) {
    console.log('[entry] 跳过插屏：代码位已关闭');
    return;
  }
  if (_rewardShowing) {
    console.log('[entry] 跳过插屏：激励已在展示');
    return;
  }
  const gap = interstitialMinGapMs();
  if (_lastInterstitialAt > 0 && Date.now() - _lastInterstitialAt < gap) {
    console.log(`[entry] 跳过插屏：未满 minGap ${gap}ms`);
    return;
  }
  console.log('[entry] 本轮插屏：并行点火（激励 loading 时可出，showing 则跳过）');
  _interPromise = showAd(ENTRY_INTERSTITIAL_CODE).catch((err) => {
    console.warn('[entry] entry_interstitial catch', err);
    return { ok: false, error: err };
  });
}

/**
 * 激励关 / 自然量 / type2 宝箱后：只出一次插屏，并 await close（对齐成语 waitClose:true）
 */
async function showOnceInterstitial(reason) {
  if (!isPlacementEnabled(ENTRY_INTERSTITIAL_CODE)) {
    console.log(`[entry] ${reason}：插屏位关闭，跳过`);
    return { ok: true, skipped: true, reason: 'inter_off' };
  }
  console.log(`[entry] ${reason}：只出插屏一次并等待关闭`);
  try {
    const res = await showAd(ENTRY_INTERSTITIAL_CODE);
    return res || { ok: true, reason };
  } catch (err) {
    console.warn(`[entry] ${reason} 插屏异常`, err);
    return { ok: false, reason, error: err };
  }
}

/**
 * 强变现一轮调度：对齐成语 _showRound
 * - 先并行点插屏（fire-and-forget）
 * - 再 await 激励（内含 waitSlot 重试）
 * 首轮 delay=firstDelay（可 skip）；后续 delay=interval。
 * @param {{ skipFirstWait?: boolean }} [opts]
 */
async function runStrongPull(resolved, opts) {
  const pullLimit = resolved.pullLimit;
  const timing = resolved.rewardedTiming;
  const interOn = isPlacementEnabled(ENTRY_INTERSTITIAL_CODE);
  const rewardOn = isPlacementEnabled(ENTRY_REWARD_CODE);

  if (!interOn && !rewardOn) {
    console.log('[entry] 跳过循环：直投插屏与激励代码位均关闭');
    markFirstAdShown('skip:entry_placements_off');
    return { ok: true, skipped: true, reason: 'entry_placements_off', count: 0 };
  }

  // 激励关：不能跑多轮空循环叠插屏（成语同款）
  if (!rewardOn) {
    const once = await showOnceInterstitial('激励位关闭');
    markFirstAdShown(
      once && once.shown ? ENTRY_INTERSTITIAL_CODE : 'skip:reward_off'
    );
    return { ok: true, count: 0, reason: 'reward_off', interstitial: once };
  }

  let rewardDelayMs =
    opts && opts.skipFirstWait ? 0 : pickRandomDelayMs(timing.firstDelayRangeMs);
  console.log(
    `[entry] 强变现开始 pullLimit=${pullLimit} 首轮delay=${rewardDelayMs}ms interval=${timing.intervalRangeMs.min}~${timing.intervalRangeMs.max}ms 插屏=${interOn ? '开' : '关'} parallel=成语waitSlot`
  );

  for (let round = 1; round <= pullLimit; round += 1) {
    if (!_active) {
      return { ok: false, reason: 'stopped', count: round - 1 };
    }
    console.log(`[entry] 第 ${round}/${pullLimit} 轮`);

    if (rewardDelayMs > 0) {
      console.log(`[entry] 本轮等待=${rewardDelayMs}ms 后并行插屏+激励`);
      await sleep(rewardDelayMs);
    }

    // 与成语 _showRound 同序：先 fire 插屏，再 await 激励（waitSlot 在激励侧）
    fireRoundInterstitial();
    const rewardRes = await showEntryRewardWithWaitSlot();
    console.log(`[entry] 第 ${round}/${pullLimit} 轮激励结果`, {
      ok: !!(rewardRes && rewardRes.ok),
      timeout: !!(rewardRes && rewardRes.timeout),
      shown: !!(rewardRes && rewardRes.shown),
      isEnded: !!(rewardRes && rewardRes.isEnded),
      covered: !!(rewardRes && isCoveredLikeErr(rewardRes.error)),
    });

    if (round >= pullLimit) break;

    rewardDelayMs = pickRandomDelayMs(timing.intervalRangeMs);
    console.log(`[entry] 下一轮间隔=${rewardDelayMs}ms`);
  }

  return { ok: true, reason: 'completed', count: pullLimit };
}

async function waitUntil(pred, timeoutMs, stepMs) {
  const limit = Math.max(0, Number(timeoutMs) || 0);
  const step = Math.max(16, Number(stepMs) || 50);
  const t0 = Date.now();
  for (;;) {
    if (pred()) return true;
    if (limit > 0 && Date.now() - t0 >= limit) return false;
    await sleep(step);
  }
}

async function runChest(resolved) {
  if (!isChestEnabled(resolved)) {
    console.log('[entry] 跳过宝箱：chest.enabled=false');
    return { ok: true, skipped: true, reason: 'chest_disabled' };
  }
  // 宝箱画在 play；强变现可在 Loading 上叠全屏，宝箱需等进 play
  const ready = await waitUntil(() => {
    const sc = GameGlobal.scene;
    return !!(sc && sc.currentName === 'arena' && typeof _chestHandler === 'function');
  }, 60000);
  if (!ready || typeof _chestHandler !== 'function') {
    console.warn('[entry] 等待 play/chest handler 超时，跳过宝箱');
    return { ok: true, skipped: true, reason: 'no_play_or_handler' };
  }
  try {
    const res = await _chestHandler(resolved);
    return res || { ok: true, reason: 'chest_done' };
  } catch (err) {
    console.warn('[entry] chest handler error', err);
    return { ok: false, reason: 'chest_error', error: err };
  }
}

async function _startInner() {
  if (GameConfig && GameConfig.adEnabled === false) {
    markFirstAdShown('skip:ad_disabled');
    return { ok: true, skipped: true, reason: 'ad_disabled' };
  }

  const scene = getLaunchScene();
  const raw = getEntryConfig();
  const resolved = resolveEntryForScene(raw, scene);

  // entry 关（含 sceneOverrides 未对该 scene 打开）：不跑强变现、不补插屏
  if (!resolved.enabled) {
    console.log(
      `[entry] 跳过强变现：scene=${scene} enabled=false（全局或未命中 sceneOverrides.enabled）`
    );
    markFirstAdShown('skip:entry_disabled');
    return { ok: true, skipped: true, reason: 'entry_disabled', scene };
  }
  // blockScenes：自然量，只出一次插屏（对齐成语 ensureOrganicHomeAds）
  if (isSceneBlocked(resolved, scene)) {
    console.log(`[entry] 自然量：scene=${scene} 在 blockScenes，只出一次插屏`);
    const once = await showOnceInterstitial('自然量(blockScenes)');
    markFirstAdShown(
      once && once.shown ? ENTRY_INTERSTITIAL_CODE : 'skip:scene_blocked'
    );
    return { ok: true, skipped: true, reason: 'scene_blocked', scene, interstitial: once };
  }

  const type = resolved.adStrategyType;
  const firstDelayMs = pickRandomDelayMs(resolved.rewardedTiming.firstDelayRangeMs);
  console.log(
    `[entry] start scene=${scene} enabled=true strategy=${type} firstDelay=${firstDelayMs}ms override=${(resolved._overrideKeys || []).join(',') || '-'}`
  );

  // type 2：firstDelay → 宝箱 → 不再直拉；结束后若插屏开着补一次（同激励关）
  if (type === 2) {
    if (firstDelayMs > 0) {
      console.log(`[entry] type2 宝箱前等待 ${firstDelayMs}ms`);
      await sleep(firstDelayMs);
    }
    markFirstAdShown('chest:wait_play');
    const chest = await runChest(resolved);
    const once = await showOnceInterstitial('type2宝箱后补插屏');
    return {
      ok: true,
      reason: 'chest_only',
      chest,
      interstitial: once,
      count: 0,
    };
  }

  // type 3：先宝箱 → directPullDelayMs → 直拉（不再叠 firstDelay）
  // chest.enabled=false：跳过宝箱，直接走直拉（含 firstDelay）
  if (type === 3) {
    if (!isChestEnabled(resolved)) {
      console.log('[entry] type3 跳过宝箱：chest.enabled=false，直拉含 firstDelay');
      return runStrongPull(resolved, { skipFirstWait: false });
    }
    if (firstDelayMs > 0) {
      console.log(`[entry] type3 宝箱前等待 ${firstDelayMs}ms`);
      await sleep(firstDelayMs);
    }
    markFirstAdShown('chest:wait_play');
    const chest = await runChest(resolved);
    const pullDelay = pickDelayField(
      resolved.chest && resolved.chest.directPullDelayMs,
      { min: 0, max: 0 }
    );
    if (pullDelay > 0) {
      console.log(`[entry] type3 宝箱后等待直拉 ${pullDelay}ms`);
      await sleep(pullDelay);
    }
    const strong = await runStrongPull(resolved, { skipFirstWait: true });
    return {
      ok: !!(strong && strong.ok),
      reason: 'mixed_done',
      strong,
      chest,
      count: strong && strong.count,
    };
  }

  // type 1：强变现（firstDelay 在首轮插屏点火之后、激励之前）
  return runStrongPull(resolved, { skipFirstWait: false });
}

/**
 * 冷启动只跑一轮；重复调用会返回同一 Promise（仍在跑则继续等）。
 * @returns {Promise<{ok:boolean, reason?:string, count?:number}>}
 */
export function startEntryFlow() {
  if (_started) {
    console.log('[entry] 跳过：本冷启动已启动过（复用 Promise）');
    return (
      _running ||
      _finished ||
      Promise.resolve({ ok: false, skipped: true, reason: 'already_started' })
    );
  }
  _started = true;
  _active = true;
  ensureFirstAdPromise();
  _running = _startInner()
    .catch((err) => {
      console.error('[entry] 异常', err);
      markFirstAdShown('skip:error');
      return { ok: false, reason: 'error', error: err };
    })
    .then((res) => {
      _active = false;
      markFirstAdShown(res && res.skipped ? `skip:${res.reason || 'done'}` : 'done');
      _finished = Promise.resolve(res);
      _running = null;
      console.log('[entry] 结束', res);
      return res;
    });
  return _running;
}

/** @returns {Promise|null} 当前或已结束的入场 Promise */
export function getEntryFlowPromise() {
  return _running || _finished || null;
}

export function stopEntryFlow() {
  _active = false;
}

export default {
  ENTRY_REWARD_CODE,
  ENTRY_INTERSTITIAL_CODE,
  applyAdvertEntryConfig,
  getEntryConfig,
  resolveEntryForScene,
  registerChestHandler,
  startEntryFlow,
  getEntryFlowPromise,
  getEntryFirstAdPromise,
  stopEntryFlow,
  isEntryActive,
};
