# dn-sdk-minigame / kit

官方根目录 `index.js` 仍是腾讯 **DataNexus**（`@dn-sdk/minigame`）。  
本目录是从 `xiaoxiaolei-002` 抽出来的**游戏层雷同能力**，给下一款小游戏复用。

**不改 `xiaoxiaolei-002`。** 002 继续用自己的 `src/` 副本；新游戏从这里 import 或复制。

002 原文件另存一份在 [`from-xiaoxiaolei-002/`](./from-xiaoxiaolei-002/README.md)（含 `sdk.js`、`ads-conf.js`、`rail.js`、`grid-rules.js` 以及带 `reportIaaAdPlacementShow` / `boardCellPosition` / `showCapsuleGridAd` 等符号的源文件）。

## 不要塞进这里的东西

| 文件 | 原因 |
| --- | --- |
| 游戏内 `js/sdk/sdk.js` | 那是 **DH Mini SDK**（广告 Deploy/AD），不是 DataNexus。继续放各游戏 `js/sdk/sdk.js`，用 `dh-bind.js` 挂载。 |
| 002 专属关卡皮肤 / APP_NAME | `grid-rules` 只提供可配置工厂，默认值可对齐 002，但业务名要各游戏自己传。 |

## 模块

| 模块 | 对应 002 | 做什么 |
| --- | --- | --- |
| `ads-conf.js` | `src/monetize/ads-conf.js` | 组装 entry / placements / clickReward / runtime |
| `rail.js` | `src/monetize/rail.js` | 抖音侧边栏复访（含 `tt.navigateToScene` 字面量） |
| `dh-bind.js` / `sdk-facade.js` | `dh-bind.js` / `sdk-facade.js` | require DH `sdk.js`，Proxy 出 AD/Deploy/DataNexus |
| `datanexus-iaa.js` | `DataNexus.reportIaaAdPlacementShow` | IAA 广告位曝光 + 道具枚举 |
| `entry-first-ad.js` | `getEntryFirstAdPromise` | Loading 等首支入场全屏广告 |
| `play-ads.js` | `playAdsPausedForChest` / `showCapsuleGridAd` / `hideGlobalTimedAds` | 玩法常驻广告 + 宝箱门闩 |
| `board/cell-position.js` | `boardCellPosition` | 棋盘格像素坐标 |
| `board/grid-rules.js` | `src/board/grid-rules.js` | 方块棋盘常量工厂 |
| `paint/gear-button.js` | `drawGearButton` | Canvas 设置齿轮 |

新游戏入口示例：

```js
import { SDK } from '../dn-sdk-minigame/index.js'; // DataNexus 上报
import { bindMainSdk, createSdkFacade, createPlayAds, createSidebarRail } from '../dn-sdk-minigame/kit/index.js';

bindMainSdk({ requireSdk: () => require('./js/sdk/sdk.js') });
const { AD, DataNexus } = createSdkFacade();
```
