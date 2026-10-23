# 微信小游戏 SDK 接入文档

本文说明如何在 **微信小游戏** 中接入本 SDK：登录初始化、广告展示、预加载、全局定时广告位、埋点。

---

## 1. 接入前说明

| 项目 | 说明 |
|------|------|
| 环境 | 微信小游戏（`wx`） |
| 配置方式 | **必须**调用 `Deploy.readyAsync(config)` 传入运行时配置（小游戏没有 `ext.json` / `getExtConfigSync`） |
| 产物 | 使用打包后的 `sdk.js`（或项目约定的导出路径） |

### 广告 type 一览

| type | 名称 | 平台 API | 埋点 type |
|------|------|----------|-----------|
| 1 | 激励视频 | `createRewardedVideoAd` | `REWARDED_VIDEO` |
| 2 | 插屏 | `createInterstitialAd` | `INSERT_SCREEN` |
| 6 | 原生模板 | `wx.createCustomAd` | `FLOW` |
| 7 | 格子/矩阵模板 | `wx.createCustomAd` | `GRID` |

> type=6 / type=7 都走 `wx.createCustomAd`，按 **code** 隔离实例；style 仅需 `left` / `top` / `width`（及可选 `fixed`）。

---

## 2. 引入 SDK

按你项目实际路径调整：

```javascript
// 示例：游戏工程内
import sdk, { Deploy, AD, Track } from './sdk/sdk.js';
// 或 CommonJS
// const { Deploy, AD, Track } = require('./sdk/sdk.js');
```

也可用默认导出上的方法（若你使用 `sdk.init` 封装）：

```javascript
import sdk from './sdk/sdk.js';
```

---

## 3. Deploy / AD / Track 对外方法

以下为三个导出实例上，业务侧常用的**公开方法**（以下划线开头的内部方法未列出）。

### 3.1 `Deploy`（登录 / 配置）

| 方法 / 属性 | 说明 |
|-------------|------|
| `await Deploy.readyAsync(config?)` | **小游戏必调**。传入运行时配置（含 `appId`、`advertis` 等）完成登录与初始化；不传则尝试走小程序 ext |
| `Deploy.isReady()` | 是否已初始化完成 |
| `Deploy.isMinigame()` | 是否小游戏入口（是否通过 `readyAsync(config)` 注入过配置） |
| `Deploy.isInitialized()` | 配置管理器是否已初始化 |
| `Deploy.fbisdk` | 底层 fbi SDK 实例（可用于 `trackAsync` 等） |
| `Deploy.config` | 当前配置（getter） |
| `Deploy.getExtConfig()` | 获取静态/注入的 ext 配置（深拷贝） |
| `await Deploy.getAdvertConfigAsync()` | 获取远程功能支持配置（含 `adSlots`、`isRiskControl` 等） |
| `Deploy.getUserInfo()` | 同步取当前用户信息（需已 ready） |
| `await Deploy.getUserInfoAsync()` | 异步取用户信息（内部会 ready） |
| `Deploy.getAppId()` / `getAppName()` / `getAppVersion()` | 应用信息 |
| `Deploy.getPrivacyPolicy()` / `getUserPolicy()` | 协议链接 |
| `Deploy.getEnviroment()` | 环境：`production` / `develop` |
| `Deploy.getScene()` | 启动场景值 |
| `Deploy.getDramaSource()` | 短剧来源等扩展字段 |
| `Deploy.getAppConfig()` | `{ appId, appName, privacyPolicy, userPolicy, desc }` |
| `Deploy.getAdConfig()` | 本地广告相关配置片段 |
| `Deploy.getAdSlotConfig(code)` | 按 code 取本地广告位 |
| `Deploy.getPlatformConfig()` | 平台配置 |
| `Deploy.getAllConfig()` / `printAllConfig()` | 调试用，输出配置 |
| `Deploy.updateConfig(newConfig)` | 运行时更新配置 |
| `Deploy.validateConfig()` | 校验配置，返回 `{ valid, issues }` |
| `await Deploy.setLaunchOptions(params?)` | 手动写入启动参数并等待 ready |
| `Deploy.recordAddedShortcut()` | 记录已添加桌面 |
| `Deploy.disableUserScreenRecord()` | 禁用截屏/录屏（平台支持时） |
| `await Deploy.riskControlListen()` | 风控监听（主要抖音端） |
| `Deploy.getStorageInfo()` | 存储信息 |

**小游戏最小用法：**

```javascript
await Deploy.readyAsync({
  appId: 'wxe1d41b93e7d8c79d',
  appName: '你的小游戏',
  advertis: [ /* ... */ ],
});
```

### 3.2 `AD`（广告）

| 方法 | 说明 |
|------|------|
| `AD.init()` | 手动初始化 AdManager（通常 `readyAsync` 后由内部完成，一般无需业务调用） |
| `await AD.ensureInitialized()` | 确保已初始化（未就绪会 `await Deploy.readyAsync()`） |
| `await AD.getAdvertConfigAsync()` | 获取远程广告/功能支持配置 |
| `await AD.isClosedAsync()` | 广告总开关是否关闭 |
| `await AD.findAdSlotWithCodeAsync(code, isStrict?, customStyle?)` | 按 code 合并远程+本地广告位配置 |
| `AD.appLaunch()` | **启动后调用**：记录启动、激活广告调度 |
| `AD.appShow()` | 游戏回到前台：恢复定时广告任务 |
| `AD.appHide()` | 游戏进入后台：暂停定时广告任务 |
| `await AD.preloadADAsync()` | 预加载（激励默认预加载，见下文） |
| `await AD.show({ code, type, style, ... }, callbacks)` | **推荐**：传配置对象展示（可省略 adUnitId，走远程/本地合并） |
| `await AD.show(code, callbacks)` | 仅传 code 字符串，从远程/本地合并配置后展示 |
| `await AD.hide(code, { type, adUnitId? })` | 隐藏 type=6/7 等嵌入式广告 |
| `await AD.registerAdSlot(code, callbacks?, options?)` | 注册定时广告位（如 `global_time_1`） |
| `AD.unRegisterAdSlot(code)` | 注销定时广告位 |
| `AD.getPreRegisteredCallbacks(code)` | 获取预注册回调 |
| `AD.hasPreRegisteredCallbacks(code)` | 是否已有预注册回调 |

**`show` 推荐写法与回调：**

```javascript
AD.show(
  {
    code: 'game_native_001',
    type: 6,
    style: { top: 750, left: 0, width: 750 },
  },
  {
    onShow() {},
    onResize(res) {},
    onError(err) {},
    // 激励还可传 onClose(res)；type 6/7 还可传 onClose / onHide
  },
);
```

### 3.3 `Track`（埋点）

| 方法 | 说明 |
|------|------|
| `await Track.track(event_name, properties?, isLogin?)` | 上报事件。默认 `isLogin=true` 走登录后通道；SDK 未就绪时会先入队 |
| `await Track.trackAfterLogin(event_name, properties?)` | 登录前也可调用，就绪后补发（内部 `isLogin=false`） |
| `Track.safTrack(event_name, properties?)` | 静默上报，不向外抛错 |
| `await Track.flushPendingEvents()` | 手动刷出缓存队列 |
| `Track.getPendingCount()` | 当前缓存事件数量 |

**示例：**

```javascript
await Track.track('level_complete', { level: 3, score: 1200 });
await Track.trackAfterLogin('click_start', { from: 'home' });
Track.safTrack('ui_click', { id: 'shop' });
```

也可在 `readyAsync` 之后直接：

```javascript
await Deploy.fbisdk.trackAsync('custom_event', { foo: 'bar' });
```

---

## 4. 本地广告位配置（advertis）

小游戏在 `readyAsync(config)` 里传入 `advertis`，作为本地默认广告位（远程 `adSlots` 可覆盖 / 补全 `adUnitId` 等）。

```javascript
const sdkConfig = {
  appId: 'wxe1d41b93e7d8c79d',      // 必填：小游戏 appId
  appName: '你的小游戏名称',
  // 可选：privacyPolicy / userPolicy 等
  advertis: [
    // 激励
    {
      code: 'default_reward',
      type: 1,
      adUnitId: 'adunit-reward-xxx',
      adPlacementName: '默认激励视频广告位',
    },
    // 插屏（autoOffTime：不配默认 0；广告用户且 >0 时展示后秒自动关）
    {
      code: 'default_interstitial',
      type: 2,
      adUnitId: 'adunit-interstitial-xxx',
      autoOffTime: 0,
      adPlacementName: '默认插屏广告位',
    },
    // 原生模板 CustomAd
    {
      code: 'default_game_native',
      type: 6,
      adUnitId: 'adunit-custom-xxx',
      adIntervals: 30, // >= 30
      style: { left: 0, top: 120, width: 350 },
      adPlacementName: '默认原生模板广告位（小游戏）',
    },
    // 格子 / 矩阵模板（同样 createCustomAd）
    {
      code: 'default_grid',
      type: 7,
      adUnitId: 'adunit-grid-xxx',
      adIntervals: 30,
      style: { left: 0, top: 280, width: 300 },
      adPlacementName: '默认格子广告位',
    },
  ],
};
```

远程功能支持配置里的 `adSlots` 示例（`code` 与业务约定一致即可）：

```json
{
  "isRiskControl": false,
  "isClosed": false,
  "isAdTimmingClosed": false,
  "adSlots": [
    { "code": "reward_001", "type": 1 },
    { "code": "interstitial_001", "type": 2, "autoOffTime": 2 },
    { "code": "game_native_001", "type": 6, "interval": 10, "style": { "top": 120, "left": 0, "width": 350 } },
    { "code": "grid_001", "type": 7, "interval": 10, "style": { "top": 280, "left": 0, "width": 300 } },
    { "code": "global_time_1", "type": 2, "delay": 5, "interval": 60, "times": 10 },
    { "code": "global_time_2", "type": 1, "delay": 30, "interval": 120, "times": 5 }
  ]
}
```

---

## 5. 登录初始化（必做）

小游戏推荐启动流程：

```javascript
async function boot() {
  // 1) 登录 + 注入配置 + 拉功能支持配置
  //    小游戏必须传入 config；不传无法走 getExtConfigSync
  await Deploy.readyAsync(sdkConfig);

  // 等价写法（若使用统一封装）：
  // await sdk.init(sdkConfig);

  // 2) 记录启动，激活广告调度（含 $MPLaunch 等）
  AD.appLaunch();

  // 3) 预加载广告（激励默认会预加载，见下文）
  await AD.preloadADAsync();

  // 4) 注册两个全局定时广告位（固定这两个 code）
  await AD.registerAdSlot('global_time_1');
  await AD.registerAdSlot('global_time_2');
}

boot().catch((err) => {
  console.error('SDK 启动失败', err);
});
```

### 生命周期建议

在游戏显示 / 隐藏时调用，保证定时广告任务正确恢复与暂停：

```javascript
// 例如 wx.onShow / wx.onHide，或你自己的场景切换
wx.onShow(() => {
  AD.appShow();
});

wx.onHide(() => {
  AD.appHide();
});
```

---

## 6. 预加载广告

```javascript
await AD.preloadADAsync();
```

行为说明：

| 类型 | 预加载规则 |
|------|------------|
| type=1 激励 | 远程未配 `preload` 时 **默认 `true`** 并预加载；仅 `preload: false` 跳过。若远程没有任何可预加载激励，会兜底预加载本地 `default_reward` |
| type=2 插屏 | 需显式 `preload: true`（当前插屏预加载接口为空实现，展示时再 load） |
| type=4 原生（小程序） | 需显式 `preload: true` |
| type=6 / 7 | 当前 `preloadADAsync` 未单独处理 |

建议在 `readyAsync` + `appLaunch` 之后尽早调用。

---

## 7. 展示广告

小游戏推荐使用 **配置对象** 调用（可带 `code` / `type` / `style`；`adUnitId` 可省略，由远程+本地默认位合并）：

```javascript
// 小游戏原生模板 type=6
AD.show(
  {
    code: 'game_native_001',
    type: 6,
    style: {
      top: 750,
      left: 0,
      width: 750,
    },
  },
  {
    onShow() {},
    onResize(res) {},
    onError(err) {},
  },
);

// 格子 type=7
AD.show(
  {
    code: 'grid_001',
    type: 7,
    style: {
      top: 280,
      left: 0,
      width: 300,
    },
  },
  {
    onShow() {},
    onResize(res) {},
    onError(err) {},
  },
);

// 激励 type=1
AD.show(
  {
    code: 'reward_001',
    type: 1,
  },
  {
    onShow() {},
    onClose(res) {
      // res.isEnded === true 表示看完
    },
    onError(err) {},
  },
);

// 插屏 type=2
AD.show(
  {
    code: 'interstitial_001',
    type: 2,
  },
  {
    onShow() {},
    onClose() {},
    onError(err) {},
  },
);
```

可选字段说明：

| 字段 | 说明 |
|------|------|
| `code` | 广告位代码（必填） |
| `type` | 1 激励 / 2 插屏 / 6 原生模板 / 7 格子 |
| `adUnitId` | 可不传，走远程或本地默认位 |
| `style` | type 6/7：`left` / `top` / `width` |
| `adIntervals` | type 6/7 自动刷新间隔，默认 30（≥30） |
| `interval` | type 6/7 关闭后 N 秒再拉（>0 生效） |
| `autoOffTime` | 仅插屏：广告用户且 >0 时自动关闭秒数 |

也支持只传 code 字符串（从远程/本地合并配置）：

```javascript
AD.show('reward_001', {
  onShow() {},
  onClose(res) {},
  onError(err) {},
});
```

### 隐藏嵌入式广告（type 6/7）

```javascript
AD.hide('game_native_001', { type: 6 });
AD.hide('grid_001', { type: 7 });
```

> 不同 **code** 各自独立实例；即使共用同一 `adUnitId` 也不会互相覆盖。

---

## 8. 全局定时广告位（固定两个）

业务侧固定注册：

```javascript
await AD.registerAdSlot('global_time_1');
await AD.registerAdSlot('global_time_2');
```

要求：

1. 远程 `adSlots`（或本地 `advertis`）里配置同名 `code`
2. 全局开关 `isClosed !== true`，定时开关 `isAdTimmingClosed !== true`
3. 配置 `delay` / `interval` / `times`（及对应 `type`、`adUnitId`）

带回调示例：

```javascript
await AD.registerAdSlot('global_time_1', {
  onShow() {},
  onClose() {},
  onError(err) {},
});

await AD.registerAdSlot('global_time_2', {
  onShow() {},
  onClose(res) {},
  onError(err) {},
});
```

> 若后端未下发该 `code` 且本地也没有，注册会无效（视为关闭）。

---

## 9. 埋点调用

### 9.1 推荐：`Track`

```javascript
import { Track } from './sdk/sdk.js';

// 登录完成后立即上报（默认）
await Track.track('level_complete', {
  level: 3,
  score: 1200,
});

// 登录前也可调用：会先入队，就绪后补发；或使用 trackAfterLogin
await Track.trackAfterLogin('click_btn', { btn: 'start' });

// 静默：不抛错
Track.safTrack('ui_click', { id: 'shop' });
```

### 9.2 直接走 fbisdk（ready 之后）

```javascript
await Deploy.readyAsync(sdkConfig);

if (Deploy.fbisdk) {
  await Deploy.fbisdk.trackAsync('custom_event', {
    foo: 'bar',
  });
}
```

### 9.3 广告相关自动埋点（无需业务手写）

展示广告时 SDK 会自动上报，例如：

- `$AdRequest`（请求，含 `ad_code` / `adSpaceId` / `type`）
- `$AdShow`
- `$WatchVideo`（关闭）
- `$MPLaunch` / `$MPHide`（生命周期）

其中小游戏：

- type=6 → 埋点 `type: "FLOW"`
- type=7 → 埋点 `type: "GRID"`

---

## 10. 推荐完整示例（game.js）

```javascript
import { Deploy, AD, Track } from './sdk/sdk.js';

const sdkConfig = {
  appId: 'wxe1d41b93e7d8c79d',
  appName: '弹射超解压',
  advertis: [
    { code: 'default_reward', type: 1, adUnitId: 'adunit-reward-xxx' },
    { code: 'default_interstitial', type: 2, adUnitId: 'adunit-interstitial-xxx', autoOffTime: 0 },
    {
      code: 'default_game_native',
      type: 6,
      adUnitId: 'adunit-custom-xxx',
      adIntervals: 30,
      style: { left: 0, top: 120, width: 350 },
    },
    {
      code: 'default_grid',
      type: 7,
      adUnitId: 'adunit-grid-xxx',
      adIntervals: 30,
      style: { left: 0, top: 280, width: 300 },
    },
  ],
};

async function boot() {
  await Deploy.readyAsync(sdkConfig);
  AD.appLaunch();
  await AD.preloadADAsync();
  await AD.registerAdSlot('global_time_1');
  await AD.registerAdSlot('global_time_2');

  Track.track('game_boot', { ver: '1.0.0' });
}

wx.onShow(() => AD.appShow());
wx.onHide(() => AD.appHide());

boot();

// 业务中按需调广告
export function showGameNative() {
  AD.show(
    {
      code: 'game_native_001',
      type: 6,
      style: {
        top: 750,
        left: 0,
        width: 750,
      },
    },
    {
      onShow() {},
      onResize(res) {},
      onError(err) {
        console.warn(err);
      },
    },
  );
}

export function showReward() {
  AD.show(
    { code: 'reward_001', type: 1 },
    {
      onClose(res) {
        if (res && res.isEnded) {
          Track.track('reward_finished', {});
        }
      },
      onError(err) {
        console.warn(err);
      },
    },
  );
}
```

---

## 11. 常见注意点

1. **小游戏必须 `readyAsync(config)`**，否则拿不到 `appId` / `advertis`。
2. **先 `readyAsync`，再 `appLaunch` / `preloadADAsync` / `registerAdSlot` / `show`**。
3. 远程 `type` 建议用数字；SDK 侧已做 `Number(type)` 兼容。
4. 激励看完判断：`onClose` 里看 `res.isEnded`。
5. type=6/7：`interval > 0` 表示用户关闭后间隔秒数再拉起；`AD.hide(code, { type })` 会取消待重拉定时器。
6. 插屏 `autoOffTime`：不配默认 `0`；仅广告用户（`!isRiskControl`）且 `>0` 时自动关闭。
7. `global_time_1` / `global_time_2` 需在远程或本地配置中真实存在，且定时总开关打开。
