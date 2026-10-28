# xiaoxiao · SDK + 变现模块壳

棋盘 / 关卡 / 大厅等玩法已去除。  
保留 DH SDK 初始化，以及以下变现相关模块与符号。

## 保留模块

| 文件 | 关键符号 |
| --- | --- |
| `src/monetize/treasure.js` | `_clearFeedIdleTimer`、`_displayProgress` |
| `src/paint/chips.js` | `makeVerticalGradient`、`drawWrappedLabel` |
| `src/monetize/arena-ads.js` | 玩法常驻广告 / 道具激励 |
| `src/monetize/chapter-quiz.js` | `LEVEL_QUIZ_TYPE` |
| `src/monetize/tip-reward.js` | `applyClickRewardConfig` |

配套依赖：`entry-pipe`、`entry-helpers`、`ads-conf`、`ad-layout`、`inset`、`media`、`canvas`、`runtime-host`、`conf/root`、`board/grid-rules`；宝箱图 `images/Loot.png`、`Looted.png`。

## 打开方式

用微信 / 抖音开发者工具打开本目录。

## 启动流程

1. `bindMainSdk()`
2. `Deploy.readyAsync(ext)`
3. `getAdvertConfigAsync` → `applyAdvertEntryConfig` / `applyClickRewardConfig`
4. `startEntryFlow()`
5. `onShow` / `onHide` → `AD.appShow` / `appHide`
