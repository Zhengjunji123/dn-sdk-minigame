/**
 * 广告本地默认（远程 Deploy.getAdvertConfigAsync() 优先，缺字段才回落到这里）。
 * 与 js/sdk/ext.js advertis[] 的 code 保持一致。
 */
const ENTRY_SCENE_IDS = [
  1045, 1046, 1067, 1084, 1095, 1069, 1189, 1200, 1201, 1228, 1230, 1232, 1238,
  1274,
];

const BLOCK_SCENE_IDS = [
  1011, 1012, 1013, 1024, 1025, 1031, 1032, 1036, 1042, 1047, 1048, 1049,
];

function mkSlot(title, type) {
  return { enabled: true, unitId: '', type, title };
}

function assemblePlacements() {
  const specs = [
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
  const bag = {};
  for (let i = 0; i < specs.length; i += 1) {
    const [code, title, type] = specs[i];
    bag[code] = mkSlot(title, type);
  }
  return bag;
}

function assembleRuntime() {
  const retryBase = { maxShowRetries: 0, retryDelayMs: 800 };
  return {
    grid: { ...retryBase },
    native: { ...retryBase },
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
  };
}

function assembleEntry() {
  return {
    sceneOverrides: {
      // 开发者工具 scene=8888：可覆盖全局 enabled=false，走混合宝箱+直拉
      '8888': { enabled: true, adStrategyType: 3, chest: {} },
    },
    rewardedTiming: {
      intervalRangeMs: { max: 0, min: 0 },
      firstDelayRangeMs: { max: 0, min: 0 },
    },
    delaysMs: [0],
    countMode: 0,
    pullLimit: 5,
    /** 1 强变现 / 2 宝箱 / 3 混合（先宝箱再直拉，对齐成语 / 001） */
    adStrategyType: 1,
    chest: {
      enabled: true,
      progressPercent: { min: 60, max: 90 },
      clickGainPercent: 5,
      idleMs: 300,
      decayIntervalMs: 200,
      decayPercent: 2,
      /**
       * 后台字段名沿用成语 / 001（rewardUndo / rewardShuffle / rewardHp）。
       * 002 玩法映射：rewardUndo → 复活次数，rewardShuffle → 刷新方块次数。
       */
      rewardUndo: 1,
      rewardShuffle: 1,
      rewardHp: 2,
      preload: true,
      feedIdleHideMs: 5000,
      directPullDelayMs: { min: 0, max: 0 },
    },
    blockScenes: BLOCK_SCENE_IDS.slice(),
    scenes: ENTRY_SCENE_IDS.slice(),
    enabled: true,
  };
}

const AdsConfig = (function forgeAdsBundle() {
  return {
    runtime: assembleRuntime(),
    entry: assembleEntry(),
    /** 放置方块累计激励；远程 getAdvertConfigAsync().clickReward 覆盖 */
    clickReward: {
      enabled: false,
      maxShows: 10,
      everyClicks: 2,
      sceneOverrides: {},
    },
    placements: assemblePlacements(),
    unitIds: { grid: '', native: '', interstitial: '', rewarded: '' },
    entryRewardPreload: { enabled: false },
  };
})();

export default AdsConfig;
