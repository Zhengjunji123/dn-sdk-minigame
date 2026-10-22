# xiaoxiaolei-002 原文件快照

从 `games/xiaoxiaolei-002` **原样拷贝**，002 本身未改。  
相对 import 仍指向 002 工程内的兄弟模块，这里只归档，不单独跑。

| 快照 | 002 源 | 雷同点 |
| --- | --- | --- |
| `sdk/sdk.js` | `js/sdk/sdk.js` | DH Mini SDK |
| `monetize/ads-conf.js` | `src/monetize/ads-conf.js` | 广告本地默认 |
| `monetize/rail.js` | `src/monetize/rail.js` | 抖音侧边栏 |
| `board/grid-rules.js` | `src/board/grid-rules.js` | 棋盘规则 |
| `monetize/sdk-facade.js` | `src/monetize/sdk-facade.js` | `DataNexus.reportIaaAdPlacementShow` |
| `monetize/entry-pipe.js` | `src/monetize/entry-pipe.js` | `getEntryFirstAdPromise` |
| `monetize/arena-ads.js` | `src/monetize/arena-ads.js` | `showCapsuleGridAd` / `hideGlobalTimedAds` / `playAdsPausedForChest` |
| `paint/grid-paint.js` | `src/paint/grid-paint.js` | `boardCellPosition` |
| `paint/ink.js` | `src/paint/ink.js` | `drawGearButton` |

可复用、已解耦的版本在上级 `kit/`（`ads-conf.js`、`rail.js`、`play-ads.js` 等）。
