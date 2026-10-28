# xiaoxiao · SDK + 变现壳（无玩法）

已去除棋盘对局、关卡、大厅、音效等玩法逻辑。  
仅保留 SDK 初始化，以及约定保留的变现 / 工具符号。

## 保留文件与符号

| 文件 | 符号 |
| --- | --- |
| `src/monetize/treasure.js` | `_clearFeedIdleTimer`、`_displayProgress`、`chestRewardsFromCfg` |
| `src/paint/chips.js` | `makeVerticalGradient`、`drawWrappedLabel`、`drawGradientButton` |
| `src/monetize/arena-ads.js` | `restorePlayAdsAfterChest`、`hidePlayAdsForChest` |
| `src/monetize/chapter-quiz.js` | `LEVEL_QUIZ_TYPE` |
| `src/monetize/tip-reward.js` | `applyClickRewardConfig`、`getClickRewardConfig`、`MISUN_REWARD_CODE` |
| `src/board/puzzle-core.js` | `findValidPlacement`（已剥离开关卡/消除） |

配套：`entry-pipe`、`entry-helpers`、`ads-conf`、`ad-layout`、`inset`、`media`（仅宝箱图）、`canvas`、`runtime-host`、`conf/root`、`grid-rules`；`images/Loot.png`、`Looted.png`。

## 启动

1. `bindMainSdk()`
2. `Deploy.readyAsync(ext)`
3. `applyAdvertEntryConfig` / `applyClickRewardConfig`
4. `startEntryFlow()`
5. `onShow` / `onHide` → `AD.appShow` / `appHide`
