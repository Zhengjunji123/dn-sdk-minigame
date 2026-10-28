/**
 * SDK 演示壳（保留 monetize 能力模块，无棋盘玩法）
 *
 * 启动顺序：
 *   bindMainSdk()
 *   → Deploy.readyAsync(ext)
 *   → getAdvertConfigAsync → applyAdvertEntryConfig / applyClickRewardConfig
 *   → startEntryFlow()
 *   → AD.appLaunch / preloadADAsync
 *   → onShow / onHide → AD.appShow / appHide
 */
import { bindMainSdk } from './src/monetize/dh-bind.js';
import { applyAdvertEntryConfig, startEntryFlow } from './src/monetize/entry-pipe.js';
import { applyClickRewardConfig } from './src/monetize/tip-reward.js';
import extConfig from './js/sdk/ext.js';
import GameConfig from './src/conf/root.js';

function getHost() {
  if (typeof wx !== 'undefined' && wx) return wx;
  if (typeof tt !== 'undefined' && tt) return tt;
  return {};
}

function assertExtConfig(cfg) {
  if (!cfg || typeof cfg !== 'object' || !cfg.appId || !Array.isArray(cfg.advertis)) {
    throw new Error('[SDK] ext 配置无效，请检查 js/sdk/ext.js');
  }
  return cfg;
}

let sdkBag = null;
try {
  sdkBag = bindMainSdk();
} catch (err) {
  console.error('[SDK] 绑定失败', err);
}

GameGlobal.sdkReady = (async function initSdk() {
  if (!sdkBag) {
    applyAdvertEntryConfig(null);
    applyClickRewardConfig(null);
    GameGlobal.entryFlowPromise = Promise.resolve({ ok: false, skipped: true, reason: 'sdk_unbound' });
    return { ok: false, error: new Error('sdk not bound') };
  }
  const { Deploy, AD } = sdkBag;
  try {
    const config = assertExtConfig(extConfig);
    console.log('[ext] ready', config.appId, 'advertis=', config.advertis.length);

    await Deploy.readyAsync(config);
    console.log('[Deploy] readyAsync done');

    const adsOn = GameConfig.adEnabled !== false;

    let preloadP = Promise.resolve();
    if (adsOn) {
      AD.appLaunch();
      preloadP = Promise.resolve()
        .then(() => AD.preloadADAsync())
        .then(() => console.log('[AD] preloadADAsync done'))
        .catch((err) => console.warn('[AD] preloadADAsync', err));
    }

    try {
      const advertConfig = await Deploy.getAdvertConfigAsync();
      applyAdvertEntryConfig(advertConfig);
      applyClickRewardConfig(advertConfig);
      GameGlobal.advertConfig = advertConfig || null;
    } catch (cfgErr) {
      console.warn('[Deploy] 拉取远程广告配置失败，使用本地默认', cfgErr);
      applyAdvertEntryConfig(null);
      applyClickRewardConfig(null);
    }

    GameGlobal.entryFlowPromise = startEntryFlow();

    if (adsOn) {
      preloadP
        .then(() =>
          Promise.all([AD.registerAdSlot('global_time_1'), AD.registerAdSlot('global_time_2')])
        )
        .then(() => console.log('[AD] background init done (global_time)'))
        .catch((err) => console.warn('[AD] background init', err));
    }

    return { Deploy, AD, ok: true };
  } catch (err) {
    console.error('[SDK] 启动失败', err);
    applyAdvertEntryConfig(null);
    applyClickRewardConfig(null);
    return { ok: false, error: err };
  }
})();

const host = getHost();
if (typeof host.onShow === 'function') {
  host.onShow(() => {
    if (GameConfig.adEnabled === false) return;
    const ad = GameGlobal.__DH_SDK && GameGlobal.__DH_SDK.AD;
    if (ad && typeof ad.appShow === 'function') ad.appShow();
  });
}
if (typeof host.onHide === 'function') {
  host.onHide(() => {
    if (GameConfig.adEnabled === false) return;
    const ad = GameGlobal.__DH_SDK && GameGlobal.__DH_SDK.AD;
    if (ad && typeof ad.appHide === 'function') ad.appHide();
  });
}
