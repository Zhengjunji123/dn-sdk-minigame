/**
 * 游戏层雷同能力（广告漏斗 / 侧边栏 / 玩法广告 / 棋盘工具）。
 * DataNexus 官方入口仍是上级 index.js 的 SDK。
 */

export { SDK } from '../index.js';

export {
  createAdsConfig,
  assemblePlacements,
  assembleRuntime,
  assembleEntry,
  DEFAULT_ENTRY_SCENE_IDS,
  DEFAULT_BLOCK_SCENE_IDS,
  DEFAULT_PLACEMENT_SPECS,
} from './ads-conf.js';
export { default as AdsConfig } from './ads-conf.js';

export {
  createSidebarRail,
  getLastShowOptions,
  isFromSidebar,
  checkSidebarAvailable,
  navigateToSidebar,
  hasClaimedSidebarToday,
  markSidebarClaimedToday,
} from './rail.js';

export { bindMainSdk, getSdk } from './dh-bind.js';
export {
  createSdkFacade,
  AD,
  Deploy,
  Track,
  DataNexus,
  IAA_ITEM,
  IAA_ITEM_SOURCE,
} from './sdk-facade.js';

export { reportIaaAdPlacementShow } from './datanexus-iaa.js';
export { createEntryFirstAdGate } from './entry-first-ad.js';
export {
  createPlayAds,
  hideGlobalTimedAds,
  isPlayAdsPausedForChest,
  setPlayAdsPausedForChest,
  DEFAULT_PLAY_AD_CODES,
} from './play-ads.js';

export { boardCellPosition, boardPad } from './board/cell-position.js';
export { createGridRules, CELL, DEFAULT_SHAPES } from './board/grid-rules.js';
export { default as GridRules } from './board/grid-rules.js';
export { drawGearButton } from './paint/gear-button.js';
