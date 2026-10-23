/**
 * Pure helpers for entry funnel (no module state).
 */
import AdsConfig from './ads-conf.js';

export const ENTRY_REWARD_CODE = 'entry_reward';
export const ENTRY_INTERSTITIAL_CODE = 'entry_interstitial';
export const HARD_PULL_LIMIT = 5;

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, Number(ms) || 0)));
}

export function isPlainObject(v) {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

/**
 * pullLimit：0 表示不拉直投（有效配置）；仅 NaN / 负数 / 未传才回退。
 */
export function normalizePullLimit(raw, fallback) {
  const n = Number(raw);
  if (Number.isFinite(n) && n >= 0) return Math.floor(n);
  const fb = Number(fallback);
  if (Number.isFinite(fb) && fb >= 0) return Math.floor(fb);
  return HARD_PULL_LIMIT;
}

export function normalizeDelayRange(raw, fallback) {
  const base = isPlainObject(fallback) ? fallback : { min: 0, max: 0 };
  const source = isPlainObject(raw) ? raw : {};
  let min = Math.max(0, Math.floor(Number(source.min)));
  let max = Math.max(0, Math.floor(Number(source.max)));
  if (!Number.isFinite(min)) min = Math.max(0, Math.floor(Number(base.min) || 0));
  if (!Number.isFinite(max)) max = Math.max(0, Math.floor(Number(base.max) || 0));
  if (min > max) {
    const t = min;
    min = max;
    max = t;
  }
  return { min, max };
}

export function pickRandomDelayMs(range) {
  const normalized = normalizeDelayRange(range);
  if (normalized.min === normalized.max) return normalized.min;
  return normalized.min + Math.floor(Math.random() * (normalized.max - normalized.min + 1));
}

/** number 或 {min,max} */
export function pickDelayField(raw, fallbackRange) {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return Math.max(0, Math.floor(raw));
  }
  return pickRandomDelayMs(normalizeDelayRange(raw, fallbackRange || { min: 0, max: 0 }));
}

export function getLaunchScene() {
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

export function normalizeSceneList(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (let i = 0; i < list.length; i += 1) {
    const n = Number(list[i]);
    if (!Number.isFinite(n)) continue;
    if (out.indexOf(n) >= 0) continue;
    out.push(n);
  }
  return out;
}

export function isSceneBlocked(entry, scene) {
  const blocked = normalizeSceneList(entry && entry.blockScenes);
  return blocked.indexOf(Number(scene)) >= 0;
}

export function pickOverrideRow(map, scene) {
  if (!isPlainObject(map)) return {};
  if (scene != null && isPlainObject(map[scene])) return map[scene];
  const key = scene != null ? String(scene) : '0';
  return isPlainObject(map[key]) ? map[key] : {};
}

export function isChestEnabled(resolved) {
  const c = resolved && resolved.chest;
  if (c && c.enabled === false) return false;
  return true;
}

export function timeoutsFor(code) {
  const rewarded = code === ENTRY_REWARD_CODE;
  const rt =
    (AdsConfig.runtime && AdsConfig.runtime[rewarded ? 'rewarded' : 'interstitial']) || {};
  const loadMs = Number(rt.loadTimeoutMs);
  const closeMs = rewarded ? Number(rt.closeGraceMs) : Number(rt.showTimeoutMs);
  return {
    loadMs: loadMs > 0 ? loadMs : rewarded ? 10000 : 5000,
    closeMs: closeMs > 0 ? (rewarded ? closeMs : Math.max(closeMs, 60000)) : rewarded ? 20000 : 60000,
  };
}

export function interstitialMinGapMs() {
  const rt = (AdsConfig.runtime && AdsConfig.runtime.interstitial) || {};
  const gap = Number(rt.minGapMs);
  return gap > 0 ? gap : 30000;
}

/** placements[code].enabled；缺省视为开 */
export function isPlacementEnabled(code) {
  const bag = (AdsConfig && AdsConfig.placements) || {};
  const slot = bag[code];
  if (!slot || typeof slot !== 'object') return true;
  return slot.enabled !== false;
}
