/**
 * 玩法累计激励（Deploy.getAdvertConfigAsync().clickReward），移植自 xiaoxiaolei-001。
 * code: misun_reward
 *
 * 002 融合：001 以「点击可消方块」计数；002 以「成功放置一块方块」计数（noteBlockClick 在 place 成功后调用）。
 * - everyClicks：每放置几块拉一次
 * - maxShows：冷启动内展示成功上限；0=不限制；达上限后功能关闭
 * - sceneOverrides：按启动 scene 覆盖 enabled / everyClicks / maxShows
 */
import { AD, DataNexus } from './sdk-facade.js';
import AdsConfig from './ads-conf.js';
import GameConfig from '../conf/root.js';
import { isEntryActive } from './entry-pipe.js';

export const MISUN_REWARD_CODE = 'misun_reward';

let _config = null;
let _clickCount = 0;
/** 冷启动内展示成功次数（shown），不落盘 */
let _showCount = 0;

function isPlainObject(v) {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function positiveInt(v, fallback) {
  const n = Math.floor(Number(v));
  if (Number.isFinite(n) && n > 0) return n;
  return fallback;
}

function nonNegInt(v, fallback) {
  const n = Math.floor(Number(v));
  if (Number.isFinite(n) && n >= 0) return n;
  return fallback;
}

function getLaunchScene() {
  try {
    const opts =
      typeof wx.getLaunchOptionsSync === 'function'
        ? wx.getLaunchOptionsSync()
        : typeof wx.getEnterOptionsSync === 'function'
          ? wx.getEnterOptionsSync()
          : null;
    const scene = opts && opts.scene != null ? Number(opts.scene) : 0;
    return Number.isFinite(scene) ? scene : 0;
  } catch (_e) {
    return 0;
  }
}

function defaultClickReward() {
  const local = (AdsConfig && AdsConfig.clickReward) || {};
  return {
    enabled: local.enabled === true,
    maxShows: nonNegInt(local.maxShows, 0),
    everyClicks: positiveInt(local.everyClicks, 2),
    sceneOverrides: isPlainObject(local.sceneOverrides) ? local.sceneOverrides : {},
  };
}

function pickOverride(map, scene) {
  if (!isPlainObject(map)) return {};
  if (scene != null && isPlainObject(map[scene])) return map[scene];
  const key = scene != null ? String(scene) : '';
  return key && isPlainObject(map[key]) ? map[key] : {};
}

/**
 * @returns {{ enabled: boolean, everyClicks: number, maxShows: number }}
 */
export function resolveClickRewardForScene(clickReward, scene) {
  const base = isPlainObject(clickReward) ? clickReward : defaultClickReward();
  const over = pickOverride(base.sceneOverrides, scene);
  return {
    enabled: typeof over.enabled === 'boolean' ? over.enabled : !!base.enabled,
    everyClicks: positiveInt(over.everyClicks, positiveInt(base.everyClicks, 2)),
    maxShows: nonNegInt(over.maxShows, nonNegInt(base.maxShows, 0)),
  };
}

/** 写入远程/本地 clickReward；可反复调用 */
export function applyClickRewardConfig(advertConfig) {
  const remote =
    advertConfig && isPlainObject(advertConfig.clickReward) ? advertConfig.clickReward : null;
  const base = defaultClickReward();
  if (!remote) {
    _config = base;
  } else {
    _config = {
      enabled: remote.enabled === true,
      maxShows: nonNegInt(remote.maxShows, base.maxShows),
      everyClicks: positiveInt(remote.everyClicks, base.everyClicks),
      sceneOverrides: isPlainObject(remote.sceneOverrides)
        ? remote.sceneOverrides
        : base.sceneOverrides,
    };
  }
  console.log('[clickReward] apply', {
    enabled: _config.enabled,
    everyClicks: _config.everyClicks,
    maxShows: _config.maxShows,
  });
  return _config;
}

export function getClickRewardConfig() {
  return _config || defaultClickReward();
}

export function getActiveClickRewardRule() {
  return resolveClickRewardForScene(getClickRewardConfig(), getLaunchScene());
}

function isShowCapped(rule) {
  const max = rule && rule.maxShows;
  if (!max || max <= 0) return false;
  return _showCount >= max;
}

/**
 * 记录一次可点方块点击。达 everyClicks 返回 shouldShow。
 * @returns {{ shouldShow: boolean, rule: object }}
 */
export function noteBlockClick() {
  if (GameConfig && GameConfig.adEnabled === false) {
    return { shouldShow: false, rule: getActiveClickRewardRule() };
  }
  const rule = getActiveClickRewardRule();
  if (!rule.enabled || isShowCapped(rule)) {
    return { shouldShow: false, rule };
  }
  if (isEntryActive()) {
    return { shouldShow: false, rule };
  }
  if (GameGlobal.chest && typeof GameGlobal.chest.isBlocking === 'function' && GameGlobal.chest.isBlocking()) {
    return { shouldShow: false, rule };
  }

  _clickCount += 1;
  if (_clickCount < rule.everyClicks) {
    return { shouldShow: false, rule };
  }
  _clickCount = 0;
  return { shouldShow: true, rule };
}

/** 拉起 misun_reward；shown 成功才计入 maxShows */
export function showMisunReward() {
  if (GameConfig && GameConfig.adEnabled === false) {
    return Promise.resolve({ ok: false, skipped: true, reason: 'ad_disabled' });
  }
  const rule = getActiveClickRewardRule();
  if (!rule.enabled) {
    return Promise.resolve({ ok: false, skipped: true, reason: 'disabled' });
  }
  if (isShowCapped(rule)) {
    return Promise.resolve({ ok: false, skipped: true, reason: 'max_shows' });
  }
  if (isEntryActive()) {
    return Promise.resolve({ ok: false, skipped: true, reason: 'entry_active' });
  }

  return new Promise((resolve) => {
    let settled = false;
    let shown = false;
    const finish = (payload) => {
      if (settled) return;
      settled = true;
      if (shown) {
        _showCount += 1;
        console.log(`[clickReward] shown count=${_showCount}/${rule.maxShows || '∞'}`);
      }
      resolve(payload);
    };
    try {
      DataNexus.reportIaaAdPlacementShow(MISUN_REWARD_CODE);
      AD.show(MISUN_REWARD_CODE, {
        onShow() {
          shown = true;
          console.log('[clickReward] misun_reward onShow');
        },
        onClose(res) {
          console.log('[clickReward] misun_reward onClose', res);
          finish({
            ok: true,
            closed: true,
            shown: true,
            isEnded: !!(res && res.isEnded),
            res,
          });
        },
        onError(err) {
          console.warn('[clickReward] misun_reward onError', err);
          finish({ ok: false, error: err, shown });
        },
      });
    } catch (err) {
      console.warn('[clickReward] misun_reward throw', err);
      finish({ ok: false, error: err, shown: false });
    }
  });
}

export default {
  MISUN_REWARD_CODE,
  applyClickRewardConfig,
  getClickRewardConfig,
  getActiveClickRewardRule,
  noteBlockClick,
  showMisunReward,
  resolveClickRewardForScene,
};
