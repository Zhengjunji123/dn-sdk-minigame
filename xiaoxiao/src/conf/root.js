/**
 * 运行时配置（SDK / 变现开关），无玩法关卡配置。
 */
import { APP_NAME, RULES } from '../board/grid-rules.js';

const GameConfig = {
  appName: APP_NAME,
  version: '1.0.0',
  /** 广告总开关：false 时不拉广告、入场漏斗立即 skip */
  adEnabled: false,
  app: {
    sidebarRewardRevive: RULES.SIDEBAR_REWARD_REVIVE,
    sidebarRewardRefresh: RULES.SIDEBAR_REWARD_REFRESH,
  },
};

export default GameConfig;
