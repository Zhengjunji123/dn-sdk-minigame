/**
 * 002 运行时总配置（对齐 xiaoxiaolei-001 gameconfig 的字段语义）。
 */
import { APP_NAME, RULES } from '../board/grid-rules.js';

function packAppTuning() {
  return {
    /** 抖音侧边栏每日奖励（与 play/config RULES 同源） */
    sidebarRewardRevive: RULES.SIDEBAR_REWARD_REVIVE,
    sidebarRewardRefresh: RULES.SIDEBAR_REWARD_REFRESH,
  };
}

function assembleRoot() {
  return {
    minLoadingMs: 1600,
    app: packAppTuning(),
    /** 广告总开关：false 时整包不拉任何广告、入场漏斗立即 skip */
    adEnabled: false,
    /** 加载完成后是否先进首页 */
    lobbyEnabled: true,
    rankKey: 'xxl002Level',
    productCode: 'rusia_block',
    version: '1.0.0',
    appName: APP_NAME,
  };
}

const GameConfig = assembleRoot();

export default GameConfig;
