/**
 * DH 统一 SDK 运行时配置（小游戏没有 ext.json，必须由 Deploy.readyAsync(ext) 注入）。
 *
 * 规则（与 xiaoxiaolei-001 一致）：
 * - appId / adUnitId 以 js/sdk/projectList.json 中同 appId 条目为准，禁止编造；
 * - 业务 code ↔ ext.advertis[] ↔ js/config/ads.js placements 三处对齐；
 * - 远程后台同名 code 会覆盖 / 补全本地 advertis（adUnitId、style 等）。
 *
 * 002 当前复用 wxe1d41b93e7d8c79d（见仓库 GAMES.md），独立 appId 下发后只需改本文件。
 */
const REWARD_UNIT = 'adunit-5a0723301f5b5f4b';
const INTERSTITIAL_UNIT = 'adunit-191f4d2d13bd6cea';
const NATIVE_UNIT = 'adunit-1a7bdaa16c78f1c3';
const GRID_UNIT = 'adunit-fa3bb70f3d655030';

const extConfig = {
  appId: 'wxa227cb92175cfbe7',
  appName: '妙玩不停歇',
  privacyPolicy: '',
  userPolicy: '',
  requestHTTPS: 'https://dy.szhcyg.cn/',
  trackHTTPS: 'https://md.szhcyg.cn/',
  cdnHTTPS: 'https://cdn.szhcyg.cn/',
  wxGameCode: '1224952014',
  wxGameSecretKey: '0cc656b6fdaa27762d5c231827fd0495',
  advertis: [
    // ---- 兜底四件套（业务 code 远程/本地都缺时按 type 回退到这里） ----
    { code: 'default_reward', type: 1, adUnitId: REWARD_UNIT, adPlacementName: '默认激励视频广告位' },
    {
      code: 'default_interstitial',
      type: 2,
      adUnitId: '广告id',
      autoOffTime: 0,
      adPlacementName: '默认插屏广告位',
    },
    {
      code: 'default_game_native',
      type: 6,
      adUnitId:'广告id',
      adIntervals: 30,
      style: { top: 120, left: 0, width: 350 },
      adPlacementName: '默认原生模板广告位（小游戏）',
    },
    {
      code: 'default_grid',
      type: 7,
      adUnitId: '广告id',
      adIntervals: 30,
      style: { top: 280, left: 0, width: 300 },
      adPlacementName: '默认格子广告位',
    },
    {
      code: 'chest_grid',
      type: 7,
      adUnitId:'广告id',
      style: { top: 80, left: 0, width: 60 },
      adPlacementName: '宝箱弹窗右上格子',
    }
  ],
  desc: '俄罗斯方块 消消类',
};

export default extConfig;
