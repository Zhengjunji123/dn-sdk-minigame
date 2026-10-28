/**
 * 玩法常驻广告 + 道具激励（移植自 xiaoxiaolei-001 scenes/play.js 的广告部分）。
 *
 * - game_native_001：底部原生模板（贴底全宽；高度写入 GameGlobal.bottomAdReserve 供布局避让）
 * - grid_001：玩法格子（代码位，后台样式）
 * - grid_002：胶囊左侧格子（capsuleGridAdStyle，与 chest_grid 同坐标）
 * - revive_reward / refresh_reward：道具激励，看完只加次数，不自动使用
 *
 * 宝箱进行中（GameGlobal.playAdsPausedForChest）一律不出，避免原生层盖住 Canvas 宝箱。
 */
import { AD, DataNexus } from './sdk-facade.js';
import GameConfig from '../conf/root.js';
import { getPlatform } from '../host/runtime-host.js';
import { SCREEN_HEIGHT, SCREEN_WIDTH } from '../host/canvas.js';
import { capsuleGridAdStyle } from '../paint/ad-layout.js';
import { getTopSafeLayout } from '../paint/inset.js';

export const NATIVE_AD_CODE = 'game_native_001';
export const GRID_AD_CODE = 'grid_001';
export const GRID_CAPSULE_AD_CODE = 'grid_002';
export const REVIVE_REWARD_CODE = 'revive_reward';
export const REFRESH_REWARD_CODE = 'refresh_reward';

/** 原生模板 / 格子广告仅微信；adEnabled=false 时整包屏蔽 */
export function adsAllowed() {
  return getPlatform() === 'wechat' && GameConfig.adEnabled !== false;
}

function readViewportSize() {
  let w = GameGlobal.screenWidth || SCREEN_WIDTH;
  let h = GameGlobal.screenHeight || SCREEN_HEIGHT;
  try {
    const info =
      typeof wx.getWindowInfo === 'function' ? wx.getWindowInfo() : wx.getSystemInfoSync();
    w = info.windowWidth || info.screenWidth || w;
    h = info.windowHeight || info.screenHeight || h;
  } catch (_e) {
    /* ignore */
  }
  return {
    w: Math.max(1, Math.floor(Number(w) || 375)),
    h: Math.max(1, Math.floor(Number(h) || 667)),
  };
}

/** 贴底、全宽；横幅高度约按屏宽 1/4 估 */
function nativeAdStyle() {
  const { w, h } = readViewportSize();
  const adH = Math.max(60, Math.round(w * 0.25));
  GameGlobal.bottomAdReserve = adsAllowed() ? adH : 0;
  const style = { left: 0, top: Math.max(0, h - adH), width: w };
  console.log('[AD] game_native_001 style', { w, h, adH, top: style.top, width: style.width });
  return style;
}

export function showBottomNativeAd() {
  if (!adsAllowed()) return;
  if (GameGlobal.playAdsPausedForChest) return;
  DataNexus.reportIaaAdPlacementShow(NATIVE_AD_CODE);
  AD.show(
    { code: NATIVE_AD_CODE, type: 6, style: nativeAdStyle() },
    {
      onShow() {
        // 异步 onShow 晚于 hide 时，立刻再藏，避免盖住宝箱 Canvas
        if (GameGlobal.playAdsPausedForChest) hideBottomNativeAd();
      },
      onResize() {},
      onClose() {},
      onHide() {},
      onError(err) {
        console.warn('[AD] game_native_001', err);
        GameGlobal.bottomAdReserve = 0;
      },
    }
  );
}

export function hideBottomNativeAd() {
  GameGlobal.bottomAdReserve = 0;
  if (!adsAllowed()) return;
  try {
    AD.hide(NATIVE_AD_CODE, { type: 6 });
  } catch (err) {
    console.warn('[AD] hide game_native_001', err);
  }
}

export function showGridAd() {
  if (!adsAllowed()) return;
  if (GameGlobal.playAdsPausedForChest) return;
  DataNexus.reportIaaAdPlacementShow(GRID_AD_CODE);
  AD.show(GRID_AD_CODE, {
    onShow() {
      if (GameGlobal.playAdsPausedForChest) hideGridAd();
    },
    onResize() {},
    onClose() {},
    onHide() {},
    onError(err) {
      console.warn('[AD] grid_001', err);
    },
  });
}

export function hideGridAd() {
  if (!adsAllowed()) return;
  try {
    AD.hide(GRID_AD_CODE, { type: 7 });
  } catch (err) {
    console.warn('[AD] hide grid_001', err);
  }
}

function logCapsuleGridStyle() {
  const style = capsuleGridAdStyle();
  const { menu } = getTopSafeLayout();
  console.log('[AD] grid_002 style', {
    menu: { left: menu.left, top: menu.top, width: menu.width, height: menu.height },
    ...style,
  });
  return style;
}

export function showCapsuleGridAd() {
  if (!adsAllowed()) return;
  if (GameGlobal.playAdsPausedForChest) return;
  DataNexus.reportIaaAdPlacementShow(GRID_CAPSULE_AD_CODE);
  AD.show(
    { code: GRID_CAPSULE_AD_CODE, type: 7, style: logCapsuleGridStyle() },
    {
      onShow() {
        if (GameGlobal.playAdsPausedForChest) hideCapsuleGridAd();
      },
      onResize() {},
      onClose() {},
      onHide() {},
      onError(err) {
        console.warn('[AD] grid_002', err);
      },
    }
  );
}

export function hideCapsuleGridAd() {
  if (!adsAllowed()) return;
  try {
    AD.hide(GRID_CAPSULE_AD_CODE, { type: 7 });
  } catch (err) {
    console.warn('[AD] hide grid_002', err);
  }
}

export function showAllPlayAds() {
  showBottomNativeAd();
  showGridAd();
  showCapsuleGridAd();
}

export function hideAllPlayAds() {
  hideBottomNativeAd();
  hideGridAd();
  hideCapsuleGridAd();
}

/** 开宝箱前：暂停玩法常驻广告，避免原生层盖住 Canvas 宝箱 */
export function hidePlayAdsForChest() {
  GameGlobal.playAdsPausedForChest = true;
  hideAllPlayAds();
  hideGlobalTimedAds();
}

/** 宝箱结束后：恢复玩法常驻广告（treasure.js 通过 GameGlobal.restorePlayAdsAfterChest 回调） */
export function restorePlayAdsAfterChest() {
  GameGlobal.playAdsPausedForChest = false;
  showAllPlayAds();
}

/** 宝箱期间连全局定时位也压掉（可能盖住宝箱） */
export function hideGlobalTimedAds() {
  try {
    AD.hide('global_time_1');
    AD.hide('global_time_2');
  } catch (_e) {
    /* ignore */
  }
}

/**
 * 道具激励：看完只加免费次数，不自动使用；onError 按看完处理（与 001 一致）。
 * @param {string} code
 * @param {() => void} onGranted
 * @param {(busy: boolean) => void} [onBusyChange]
 */
export function showPropRewardAd(code, onGranted, onBusyChange) {
  let settled = false;
  const finish = (granted) => {
    if (settled) return;
    settled = true;
    if (typeof onBusyChange === 'function') onBusyChange(false);
    if (granted && typeof onGranted === 'function') onGranted();
  };

  if (GameConfig.adEnabled === false) {
    finish(true);
    return;
  }

  if (typeof onBusyChange === 'function') onBusyChange(true);
  DataNexus.reportIaaAdPlacementShow(code);
  try {
    AD.show(
      { code, popPath: 'CLICK_PULL' },
      {
        onShow() {
          console.log(`[${code}] onShow`);
        },
        onClose(res) {
          const isEnded = !!(res && res.isEnded);
          console.log(`[${code}] onClose`, isEnded, res);
          if (!isEnded) {
            try {
              wx.showToast({ title: '请看完完整广告', icon: 'none', duration: 2000 });
            } catch (_e) {
              /* ignore */
            }
          }
          finish(isEnded);
        },
        onError(err) {
          console.error(`[${code}] onError`, err);
          finish(true);
        },
      }
    );
  } catch (err) {
    console.error(`[${code}] throw`, err);
    finish(true);
  }
}
