# 消消类002

原生 Canvas 木块放置益智小游戏（8×8 / 宝石目标）。已接入 DH 小游戏 SDK（`js/sdk/` + `src/monetize/*`）：入场强变现 / 开宝箱、玩法内 native/grid、复活/刷新激励。

## 打开方式

用微信 / 抖音开发者工具打开本目录。`project.config.json` / `js/sdk/ext.js` 的 appId 以仓库 `GAMES.md` 为准。

## 玩法

1. Loading 结束后直进对局（`lobbyEnabled: false`）。
2. 开局弹出「关卡目标」：收集指定数量绿宝石即可过关。
3. 底部 3 个木质多格方块，部分格子自带宝石；拖到 8×8 棋盘放置。
4. 填满整行或整列消除；消掉的宝石计入「剩余」目标。
5. 无合法落点弹出「没位置啦」：立即复活 / 刷新方块 / 重开本关。
6. 底栏「刷新 / 重开 / 跳过」。

## 代码结构

```text
game.js                 入口：bindMainSdk + startApp + sdkReady
src/boot/launch.js      ScreenFlow + 主循环
src/nav/flow.js         屏幕路由
src/screens/            splash / lobby / arena
src/board/              grid-rules / puzzle-core / chapter-data
src/paint/              绘制与 HUD
src/monetize/           入场漏斗 / 宝箱 / 局内广告
src/host/               平台、画布、存档、音频
src/conf/               运行时配置
js/sdk/                 DH SDK + ext.js
tests/puzzle-smoke.mjs
```
