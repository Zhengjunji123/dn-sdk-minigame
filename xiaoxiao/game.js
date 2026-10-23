/**
 * 消消类002 · 微信/抖音原生 Canvas 入口
 *
 * 启动顺序：
 *   bindMainSdk()（主包同步挂 DH SDK）
 *   → startApp()（ScreenFlow + splash/lobby/arena）
 *   → GameGlobal.sdkReady = Deploy.readyAsync(ext) 登录
 *       → AD.appLaunch / preloadADAsync
 *       → Deploy.getAdvertConfigAsync → applyAdvertEntryConfig / applyClickRewardConfig
 *       → GameGlobal.entryFlowPromise = startEntryFlow()（入场强变现 / 宝箱，冷启动只跑一次）
 *       → registerAdSlot(global_time_1/2)
 *   wx.onShow / onHide → AD.appShow / appHide
 */
// 尽早挂 tt.onShow，供侧边栏复访判断
import './src/monetize/rail.js';
import startApp from './src/boot/launch.js';
import { bindMainSdk } from './src/monetize/dh-bind.js';
import { getHost } from './src/host/runtime-host.js';
import { applyAdvertEntryConfig, startEntryFlow } from './src/monetize/entry-pipe.js';
import { applyClickRewardConfig } from './src/monetize/tip-reward.js';
// ext 必须主包静态引入：动态 import 会得到空 Module，SDK 会当成没传配置
import extConfig from './js/sdk/ext.js';
import GameConfig from './src/conf/root.js';

function assertExtConfig(cfg) {
  if (!cfg || typeof cfg !== 'object' || !cfg.appId || !Array.isArray(cfg.advertis)) {
    throw new Error('[SDK] ext 配置无效，请检查 js/sdk/ext.js');
  }
  return cfg;
}

let sdkBag = null;
try {
  // SDK 在主包：同步挂上，强变现不必等玩法资源
  sdkBag = bindMainSdk();
} catch (err) {
  console.error('[SDK] 绑定失败，按无广告模式继续', err);
}

// 游戏主循环先跑（Loading 立即可见），SDK 登录 / 入场漏斗并行
startApp();

GameGlobal.sdkReady = (async function initSdk() {
  if (!sdkBag) {
    // 无 SDK：不跑入场漏斗（AD.show 全是 no-op，跑了只会空等超时）
    applyAdvertEntryConfig(null);
    applyClickRewardConfig(null);
    GameGlobal.entryFlowPromise = Promise.resolve({ ok: false, skipped: true, reason: 'sdk_unbound' });
    return { ok: false, error: new Error('sdk not bound') };
  }
  const { Deploy, AD } = sdkBag;
  try {
    const config = assertExtConfig(extConfig);
    console.log('[ext] ready', config.appId, 'advertis=', config.advertis.length);

    // 登录 + 注入配置 + 拉功能支持配置
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
    } else {
      console.log('[AD] adEnabled=false，跳过 appLaunch / preload');
    }

    try {
      const advertConfig = await Deploy.getAdvertConfigAsync();
      const { entry, clickReward } = advertConfig || {};
      console.log('[Deploy] advertConfig.entry', entry);
      console.log('[Deploy] advertConfig.clickReward', clickReward);
      applyAdvertEntryConfig(advertConfig);
      applyClickRewardConfig(advertConfig);
      GameGlobal.advertConfig = advertConfig || null;
    } catch (cfgErr) {
      console.warn('[Deploy] 拉取远程广告配置失败，使用本地默认', cfgErr);
      applyAdvertEntryConfig(null);
      applyClickRewardConfig(null);
    }

    // 配置到位即 kick（adEnabled=false 时 entry 会立刻 skip）
    GameGlobal.entryFlowPromise = startEntryFlow();
    console.log('[entry] kicked after getAdvertConfigAsync (preload in flight)');

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
    // 与业务约定一致：此处不 kick，match 进场时按本地配置自行 startEntryFlow
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
