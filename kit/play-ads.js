/**
 * 玩法常驻广告 + 宝箱门闩。
 * 宝箱进行中（GameGlobal.playAdsPausedForChest）一律不出，避免原生层盖住 Canvas。
 */

export const DEFAULT_PLAY_AD_CODES = {
  native: 'game_native_001',
  grid: 'grid_001',
  capsule: 'grid_002',
  timed: ['global_time_1', 'global_time_2'],
};

export function isPlayAdsPausedForChest() {
  return !!(typeof GameGlobal !== 'undefined' && GameGlobal.playAdsPausedForChest);
}

export function setPlayAdsPausedForChest(paused) {
  if (typeof GameGlobal === 'undefined') return;
  GameGlobal.playAdsPausedForChest = !!paused;
}

export function hideGlobalTimedAds(AD, codes) {
  const list = Array.isArray(codes) && codes.length ? codes : DEFAULT_PLAY_AD_CODES.timed;
  if (!AD || typeof AD.hide !== 'function') return;
  try {
    for (let i = 0; i < list.length; i += 1) AD.hide(list[i]);
  } catch (_e) {
    /* ignore */
  }
}

/**
 * @param {object} deps
 * @param {*} deps.AD
 * @param {*} [deps.DataNexus]
 * @param {() => boolean} [deps.adsAllowed]
 * @param {() => {left:number,top:number,width:number}} [deps.capsuleStyle]
 * @param {() => {left:number,top:number,width:number}} [deps.nativeStyle]
 * @param {{ native?: string, grid?: string, capsule?: string, timed?: string[] }} [deps.codes]
 * @param {(code: string) => void} [deps.report]
 */
export function createPlayAds(deps) {
  const AD = deps && deps.AD;
  const DataNexus = deps && deps.DataNexus;
  const codes = Object.assign({}, DEFAULT_PLAY_AD_CODES, (deps && deps.codes) || {});
  const adsAllowed =
    (deps && deps.adsAllowed) ||
    (() => true);
  const report =
    (deps && deps.report) ||
    ((code) => {
      try {
        if (DataNexus && typeof DataNexus.reportIaaAdPlacementShow === 'function') {
          DataNexus.reportIaaAdPlacementShow(code);
        }
      } catch (_e) {
        /* ignore */
      }
    });

  function paused() {
    return isPlayAdsPausedForChest();
  }

  function showBottomNativeAd() {
    if (!adsAllowed() || paused() || !AD) return;
    const style = deps && typeof deps.nativeStyle === 'function' ? deps.nativeStyle() : null;
    report(codes.native);
    AD.show(
      style ? { code: codes.native, type: 6, style } : { code: codes.native, type: 6 },
      {
        onShow() {
          if (paused()) hideBottomNativeAd();
        },
        onError(err) {
          console.warn(`[AD] ${codes.native}`, err);
        },
      }
    );
  }

  function hideBottomNativeAd() {
    if (typeof GameGlobal !== 'undefined') GameGlobal.bottomAdReserve = 0;
    if (!AD) return;
    try {
      AD.hide(codes.native, { type: 6 });
    } catch (err) {
      console.warn(`[AD] hide ${codes.native}`, err);
    }
  }

  function showGridAd() {
    if (!adsAllowed() || paused() || !AD) return;
    report(codes.grid);
    AD.show(codes.grid, {
      onShow() {
        if (paused()) hideGridAd();
      },
      onError(err) {
        console.warn(`[AD] ${codes.grid}`, err);
      },
    });
  }

  function hideGridAd() {
    if (!AD) return;
    try {
      AD.hide(codes.grid, { type: 7 });
    } catch (err) {
      console.warn(`[AD] hide ${codes.grid}`, err);
    }
  }

  function showCapsuleGridAd() {
    if (!adsAllowed() || paused() || !AD) return;
    const style = deps && typeof deps.capsuleStyle === 'function' ? deps.capsuleStyle() : null;
    report(codes.capsule);
    AD.show(style ? { code: codes.capsule, type: 7, style } : codes.capsule, {
      onShow() {
        if (paused()) hideCapsuleGridAd();
      },
      onError(err) {
        console.warn(`[AD] ${codes.capsule}`, err);
      },
    });
  }

  function hideCapsuleGridAd() {
    if (!AD) return;
    try {
      AD.hide(codes.capsule, { type: 7 });
    } catch (err) {
      console.warn(`[AD] hide ${codes.capsule}`, err);
    }
  }

  function showAllPlayAds() {
    showBottomNativeAd();
    showGridAd();
    showCapsuleGridAd();
  }

  function hideAllPlayAds() {
    hideBottomNativeAd();
    hideGridAd();
    hideCapsuleGridAd();
  }

  function pauseForChest() {
    setPlayAdsPausedForChest(true);
    hideAllPlayAds();
    hideGlobalTimedAds(AD, codes.timed);
  }

  function resumeAfterChest() {
    setPlayAdsPausedForChest(false);
    showAllPlayAds();
  }

  return {
    showBottomNativeAd,
    hideBottomNativeAd,
    showGridAd,
    hideGridAd,
    showCapsuleGridAd,
    hideCapsuleGridAd,
    showAllPlayAds,
    hideAllPlayAds,
    hideGlobalTimedAds: () => hideGlobalTimedAds(AD, codes.timed),
    pauseForChest,
    resumeAfterChest,
  };
}
