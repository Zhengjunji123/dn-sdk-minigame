/**
 * 广告本地默认配置工厂（远程 Deploy.getAdvertConfigAsync() 优先）。
 * 业务 code 必须与游戏 ext.js advertis[] 对齐。
 */

export const DEFAULT_ENTRY_SCENE_IDS = [
  1045, 1046, 1067, 1084, 1095, 1069, 1189, 1200, 1201, 1228, 1230, 1232, 1238,
  1274,
];

export const DEFAULT_BLOCK_SCENE_IDS = [
  1011, 1012, 1013, 1024, 1025, 1031, 1032, 1036, 1042, 1047, 1048, 1049,
];

export const DEFAULT_PLACEMENT_SPECS = [
  ['entry_reward', '直投入场激励', 'rewarded'],
  ['entry_interstitial', '直投入场插屏', 'interstitial'],
  ['chest_feed', '宝箱按钮位原生模板', 'native'],
  ['chest_grid', '宝箱弹窗右上格子', 'grid'],
  ['revive_reward', '看广告复活', 'rewarded'],
  ['refresh_reward', '看广告刷新方块', 'rewarded'],
  ['misun_reward', '放置方块累计激励', 'rewarded'],
  ['game_native_001', '玩法底部原生模板', 'native'],
  ['grid_001', '玩法格子', 'grid'],
  ['grid_002', '胶囊左侧格子', 'grid'],
];

function mkSlot(title, type, unitId) {
  return { enabled: true, unitId: unitId || '', type, title };
}

export function assemblePlacements(specs) {
  const list = Array.isArray(specs) && specs.length ? specs : DEFAULT_PLACEMENT_SPECS;
  const bag = {};
  for (let i = 0; i < list.length; i += 1) {
    const [code, title, type, unitId] = list[i];
    bag[code] = mkSlot(title, type, unitId);
  }
  return bag;
}

export function assembleRuntime(extra) {
  const retryBase = { maxShowRetries: 0, retryDelayMs: 800 };
  return Object.assign(
    {
      grid: { ...retryBase },
      native: { ...retryBase },
      banner: { ...retryBase },
      interstitial: {
        minGapMs: 30000,
        ...retryBase,
        showTimeoutMs: 2000,
        loadTimeoutMs: 5000,
      },
      rewarded: {
        ...retryBase,
        closeGraceMs: 20000,
        showTimeoutMs: 8000,
        loadTimeoutMs: 10000,
      },
    },
    extra || {}
  );
}

export function assembleEntry(over) {
  const patch = over && typeof over === 'object' ? over : {};
  return Object.assign(
    {
      sceneOverrides: {
        '8888': { enabled: true, adStrategyType: 3, chest: {} },
      },
      rewardedTiming: {
        intervalRangeMs: { max: 0, min: 0 },
        firstDelayRangeMs: { max: 0, min: 0 },
      },
      delaysMs: [0],
      countMode: 0,
      pullLimit: 5,
      adStrategyType: 1,
      chest: {
        enabled: true,
        progressPercent: { min: 60, max: 90 },
        clickGainPercent: 5,
        idleMs: 300,
        decayIntervalMs: 200,
        decayPercent: 2,
        rewardUndo: 1,
        rewardShuffle: 1,
        rewardHp: 2,
        preload: true,
        feedIdleHideMs: 5000,
        directPullDelayMs: { min: 0, max: 0 },
      },
      blockScenes: DEFAULT_BLOCK_SCENE_IDS.slice(),
      scenes: DEFAULT_ENTRY_SCENE_IDS.slice(),
      enabled: true,
    },
    patch,
    {
      chest: Object.assign(
        {
          enabled: true,
          progressPercent: { min: 60, max: 90 },
          clickGainPercent: 5,
          idleMs: 300,
          decayIntervalMs: 200,
          decayPercent: 2,
          rewardUndo: 1,
          rewardShuffle: 1,
          rewardHp: 2,
          preload: true,
          feedIdleHideMs: 5000,
          directPullDelayMs: { min: 0, max: 0 },
        },
        patch.chest || {}
      ),
    }
  );
}

/**
 * @param {object} [opts]
 * @param {Array} [opts.placements]
 * @param {object} [opts.entry]
 * @param {object} [opts.clickReward]
 * @param {object} [opts.runtime]
 * @param {object} [opts.ttModel]
 * @param {object} [opts.unitIds]
 */
export function createAdsConfig(opts) {
  const o = opts && typeof opts === 'object' ? opts : {};
  return {
    runtime: assembleRuntime(o.runtime),
    entry: assembleEntry(o.entry),
    clickReward: Object.assign(
      {
        enabled: false,
        maxShows: 10,
        everyClicks: 2,
        sceneOverrides: {},
      },
      o.clickReward || {}
    ),
    placements: assemblePlacements(o.placements),
    unitIds: Object.assign(
      { grid: '', native: '', interstitial: '', rewarded: '', banner: '' },
      o.unitIds || {}
    ),
    entryRewardPreload: Object.assign({ enabled: false }, o.entryRewardPreload || {}),
    ttModel: o.ttModel || null,
  };
}

export default createAdsConfig();
