import PuzzleCore from '../board/puzzle-core.js';
import createAudio from '../host/sound-bus.js';
import getSafeArea from '../paint/inset.js';
import { APP_NAME, BOARD_COLS, CELL } from '../board/grid-rules.js';
import {
  boardCellPosition,
  candidateRect,
  createBoardLayout,
  drawBoard,
  drawCandidates,
  drawDraggedPiece,
  drawProjection,
  findSnapAnchor,
  hitCandidate,
} from '../paint/grid-paint.js';
import { contains, drawButton, drawText, roundRect, touchPoint } from '../paint/ink.js';
import {
  TONE,
  icon,
  iconButton,
  pill,
  ring,
  scrim,
  sheet,
  spacedText,
  text,
  toggle,
} from '../paint/tone.js';
import { drawImageAsset, getAsset, loadAssetKeys, tileAssetKey } from '../paint/media.js';
import { approach, easeOutBack, easeOutCubic } from '../paint/ease.js';
import { patchSave, readSave } from '../host/persist.js';
import {
  burstShake,
  createGemFlight,
  drawBurstParticles,
  drawGemFlights,
  drawLineFlash,
  drawPlacePulse,
  drawSparkles,
  spawnGemBurst,
  updateClearBurst,
  updateGemFlights,
  updateSparkles,
} from '../paint/burst.js';
import { createSidebarEntry } from '../paint/rail-panel.js';
import { preloadSidebarAssets } from '../paint/rail-assets.js';
import { DataNexus, IAA_ITEM, IAA_ITEM_SOURCE } from '../monetize/sdk-facade.js';
import { getEntryFlowPromise, registerChestHandler, startEntryFlow } from '../monetize/entry-pipe.js';
import ChestFlow, { readChestBoost } from '../monetize/treasure.js';
import { noteBlockClick, showMisunReward } from '../monetize/tip-reward.js';
import { LEVEL_QUIZ_TYPE, reportLevelQuiz } from '../monetize/chapter-quiz.js';
import {
  adsAllowed,
  hideAllPlayAds,
  hideGlobalTimedAds,
  REFRESH_REWARD_CODE,
  REVIVE_REWARD_CODE,
  showAllPlayAds,
  showPropRewardAd,
} from '../monetize/arena-ads.js';
import {
  GOAL_POPUP_SECONDS,
  RESULT_DELAY,
  PRAISE,
  cellKey,
  buildFlash,
  toast,
  bottomReserve,
  layoutArea,
  drawToolBar,
} from './arena-chrome.js';

/** 手指移动超过该距离才算拖拽，否则视为点选。 */
const TAP_SLOP = 8;

function pad2(n) {
  return n < 10 ? `0${n}` : String(n);
}

const START_BTN_TINT = {
  orange: { dark: [220, 48, 8], mid: [255, 76, 17], light: [255, 154, 96] },
  blue: { dark: [28, 92, 210], mid: [47, 141, 255], light: [130, 200, 255] },
};
const tintedStartBtn = {};

function makeOffscreen() {
  const host =
    (typeof wx !== 'undefined' && wx) ||
    (typeof tt !== 'undefined' && tt) ||
    null;
  return host && typeof host.createCanvas === 'function' ? host.createCanvas() : null;
}

/** 把首页绿按钮的光影映射到橙色 / 蓝色，白边保持原样。 */
function recolorStartBtn(img, tone) {
  const palette = START_BTN_TINT[tone];
  const key = `${tone}:${img.width}x${img.height}`;
  if (tintedStartBtn[key]) return tintedStartBtn[key];
  const surface = makeOffscreen();
  if (!surface || !palette) return null;
  surface.width = img.width;
  surface.height = img.height;
  const sctx = surface.getContext('2d');
  sctx.drawImage(img, 0, 0, img.width, img.height);
  let data;
  try {
    data = sctx.getImageData(0, 0, img.width, img.height);
  } catch (err) {
    return null;
  }
  const px = data.data;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] < 8) continue;
    const r = px[i];
    const g = px[i + 1];
    const b = px[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    if (lum > 232 && Math.max(r, g, b) - Math.min(r, g, b) < 28) continue;
    const t = Math.min(1, Math.max(0, (lum - 88) / 146));
    const from = t < 0.55 ? palette.dark : palette.mid;
    const to = t < 0.55 ? palette.mid : palette.light;
    const k = t < 0.55 ? t / 0.55 : (t - 0.55) / 0.45;
    px[i] = from[0] + (to[0] - from[0]) * k;
    px[i + 1] = from[1] + (to[1] - from[1]) * k;
    px[i + 2] = from[2] + (to[2] - from[2]) * k;
  }
  sctx.putImageData(data, 0, 0);
  tintedStartBtn[key] = surface;
  return surface;
}

function paintTintedStartBtn(ctx, box, tone) {
  const img = getAsset('startBtn');
  const tinted = img ? recolorStartBtn(img, tone) : null;
  if (tinted) {
    ctx.drawImage(tinted, box.x, box.y, box.w, box.h);
    return;
  }
  const radius = box.h / 2;
  const rim = Math.max(2.5, box.h * 0.08);
  const fallback = tone === 'blue'
    ? { deep: '#1c6fd4', mid: '#2f8dff', top: '#7ec4ff' }
    : { deep: '#ee3a0a', mid: '#ff4c11', top: '#ff7a42' };
  ctx.save();
  roundRect(ctx, box.x, box.y, box.w, box.h, radius, '#ffffff');
  const ix = box.x + rim;
  const iy = box.y + rim;
  const iw = box.w - rim * 2;
  const ih = box.h - rim * 2;
  const ir = Math.max(0, ih / 2);
  roundRect(ctx, ix, iy, iw, ih, ir, fallback.deep);
  roundRect(ctx, ix, iy, iw, ih * 0.74, ir, fallback.mid);
  roundRect(ctx, ix, iy, iw, ih * 0.38, ir, fallback.top);
  ctx.restore();
}

const POP_TOP_BLUE = 50;
const POP_EDGE = 8;

/** 弹外壳：现有高度不变，外宽顶部 50px 蓝底，其余白底。 */
function paintPopupShell(ctx, x, y, w, h, radius) {
  roundRect(ctx, x, y, w, h, radius, '#3aa0ff');
  const whiteY = y + POP_TOP_BLUE;
  const whiteH = Math.max(0, h - POP_TOP_BLUE - POP_EDGE);
  roundRect(ctx, x + POP_EDGE, whiteY, w - POP_EDGE * 2, whiteH, Math.max(0, radius - 6), '#ffffff');
}

/** 图钉标题落在顶部 50px 蓝条上：针在卡外，色带在蓝底里。 */
function paintPopupTitle(ctx, screenW, cardY, cardW, label) {
  const titleImg = getAsset('popTitle');
  const titleRatio = titleImg && titleImg.width ? titleImg.height / titleImg.width : 0.3;
  const titleW = cardW * 0.92;
  const titleH = titleW * titleRatio;
  const titleX = (screenW - titleW) / 2;
  const titleY = cardY + POP_TOP_BLUE * 0.5 - titleH * 0.58 - 20;
  if (!drawImageAsset(ctx, 'popTitle', titleX, titleY, titleW, titleH, 'contain')) {
    roundRect(ctx, titleX, titleY + titleH * 0.18, titleW, titleH * 0.62, 8, '#e8f4ff', '#3aa0ff', 2);
  }
  text(ctx, label, screenW / 2 + 8, titleY + titleH * 0.56, 22, '#2f8dff', 'center', 800);
  return titleH;
}

/** 继续游戏用首页绿按钮图；重开本关按橙色 UI 稿绘制。 */
function paintHomeButton(ctx, box, label, tone) {
  const img = getAsset('startBtn');
  const fontSize = tone === 'green'
    ? Math.max(16, Math.round(box.h * 0.36))
    : Math.max(15, Math.round(box.h * 0.38));
  const stroke = tone === 'orange'
    ? 'rgba(120,24,0,0.35)'
    : tone === 'blue'
      ? 'rgba(12,48,120,0.4)'
      : 'rgba(20,80,10,0.4)';
  if (tone === 'orange' || tone === 'blue') paintTintedStartBtn(ctx, box, tone);
  else if (img) ctx.drawImage(img, box.x, box.y, box.w, box.h);
  else {
    drawButton(ctx, box, label, {
      variant: 'green',
      fontSize,
      radius: box.h / 2,
      rim: true,
    });
    return;
  }
  drawText(
    ctx,
    label,
    box.x + box.w / 2,
    box.y + box.h / 2 - 2,
    fontSize,
    '#ffffff',
    'center',
    800,
    stroke,
    2
  );
}

function createArenaScreen() {
  const audio = createAudio();
  let engine = null;
  let layout = null;
  let layoutReserve = 0;
  let hits = {};
  let phase = 'goal';
  let phaseTimer = 0;
  let drag = null;
  let flash = null;
  let gemFlights = [];
  let comboPop = null;
  let trayAppear = 1;
  let pendingResult = null;
  let resultTimer = 0;
  let time = 0;
  let saved = false;
  let scorePops = [];
  let placedPulse = {};
  let sparkles = [];
  let hudPulse = 0;
  let praisePop = null;
  /** 激励广告进行中（道具 / 累计激励互斥） */
  let rewardBusy = false;
  /** 本次进程内「看广告 / 侧边栏」攒下的免费刷新次数（宝箱奖励在 GameGlobal.chestBoost） */
  let freeRefresh = 0;
  /** 当前关卡已上报 LEVEL_ENTER 且尚未 PASS（用于补 LEVEL_EXIT） */
  let levelOpen = false;
  let loseReported = false;
  /** 托盘「放不下」灰显：盘面/托盘变化时才重算，避免每帧暴力搜落点 */
  let blockedDirty = true;
  let blockedSlots = {};
  /** 点选中的托盘方块序号；选中后轻触棋盘即可瞄准放置 */
  let selected = null;
  /** 当前 phase 已持续的时长，驱动面板入场动画 */
  let phaseAge = 0;
  let lastPhase = '';
  /** 按下设置打开弹窗后，吞掉同一次抬手，避免全屏蒙版立刻关掉 */
  let skipPanelEnd = false;
  /** 进入本关时的累计分，重开本关回到这个值 */
  let scoreAtLevelStart = 0;

  function markBlockedDirty() {
    blockedDirty = true;
  }

  function resolveBlockedSlots() {
    if (!blockedDirty) return blockedSlots;
    blockedDirty = false;
    blockedSlots = {};
    if (!engine) return blockedSlots;
    engine.pieces.forEach((piece, index) => {
      if (piece && !piece.used && !engine.findValidPlacement(index)) {
        blockedSlots[index] = true;
      }
    });
    return blockedSlots;
  }

  // ---- 入场宝箱（entry-flow type 2/3 时由漏斗 await）----
  const chest = new ChestFlow();
  GameGlobal.chest = chest;
  registerChestHandler((resolved) => chest.runSession(resolved, { skipFirstWait: false }));
  GameGlobal.hidePlayAdsForChest = () => {
    GameGlobal.playAdsPausedForChest = true;
    hideAllPlayAds();
    hideGlobalTimedAds();
  };
  GameGlobal.restorePlayAdsAfterChest = () => {
    GameGlobal.playAdsPausedForChest = false;
    showAllPlayAds();
  };

  /** 刷新底部三组方块并处理失败 / 复活态切换（侧边栏、宝箱、激励共用） */
  function applyRefreshTray() {
    if (!engine) return false;
    const outcome = engine.refreshTray();
    if (!outcome.ok) return false;
    markBlockedDirty();
    trayAppear = 0;
    selected = null;
    if (outcome.gameOver && phase === 'play') {
      pendingResult = 'lost';
      resultTimer = 0;
    } else if (!outcome.gameOver && phase === 'lost') {
      // 刷新后若又能放下，关掉失败面板继续玩
      phase = 'play';
      pendingResult = null;
      saved = false;
    }
    DataNexus.reportIaaItemUsed(IAA_ITEM.REFRESH, 1);
    DataNexus.reportIaaUseItem(IAA_ITEM_SOURCE.GIFT);
    return true;
  }

  const giftBar = createSidebarEntry({
    appName: APP_NAME,
    onReward(rewards) {
      if (!engine) return;
      if (rewards && rewards.revive) {
        engine.addRevives(rewards.revive);
        DataNexus.reportIaaGetItem(IAA_ITEM_SOURCE.GIFT);
      }
      if (rewards && rewards.refresh) {
        DataNexus.reportIaaGetItem(IAA_ITEM_SOURCE.GIFT);
        applyRefreshTray();
      }
      audio.playClick();
    },
  });

  // ---- 道具：复活 / 刷新（免费次数优先：本关复活次数 → 宝箱 chestBoost → 看广告加次数）----
  function freeReviveCount() {
    if (!engine) return 0;
    return Math.max(0, engine.revivesLeft) + readChestBoost().revive;
  }

  function freeRefreshCount() {
    return freeRefresh + readChestBoost().refresh;
  }

  function consumeChestBoost(key) {
    const boost = readChestBoost();
    if (boost[key] <= 0) return false;
    boost[key] -= 1;
    GameGlobal.chestBoost = boost;
    return true;
  }

  function grantPropOnce(key) {
    if (key === 'revive') {
      if (engine) engine.addRevives(1);
      toast('已获得1次复活');
    } else {
      freeRefresh += 1;
      toast('已获得1次刷新');
    }
    DataNexus.reportIaaGetItem(IAA_ITEM_SOURCE.AD);
  }

  function useRefreshTool() {
    if (!engine || rewardBusy) return;
    if (phase !== 'play' && phase !== 'lost' && phase !== 'goal') return;
    if (chest.isBlocking()) return;
    if (!adsAllowed()) {
      audio.playClick();
      applyRefreshTray();
      return;
    }
    if (freeRefresh > 0) {
      freeRefresh -= 1;
      audio.playClick();
      applyRefreshTray();
      return;
    }
    if (consumeChestBoost('refresh')) {
      audio.playClick();
      applyRefreshTray();
      return;
    }
    // 无免费次数：看完激励只加次数，不自动使用（对齐 001）
    showPropRewardAd(REFRESH_REWARD_CODE, () => grantPropOnce('refresh'), (busy) => {
      rewardBusy = busy;
    });
  }

  function maybeShowClickReward() {
    if (rewardBusy) return;
    if (chest.isBlocking()) return;
    const { shouldShow } = noteBlockClick();
    if (!shouldShow) return;
    rewardBusy = true;
    showMisunReward()
      .catch((err) => console.warn('[clickReward]', err))
      .then(() => {
        rewardBusy = false;
      });
  }

  function reportLevelExitIfOpen() {
    if (!levelOpen) return;
    levelOpen = false;
    DataNexus.reportIaaLevelExit();
  }

  function gemTarget(skin) {
    const skins = (engine && engine.targetSkins) || [1, 2];
    const idx = Math.max(0, skins.indexOf(skin));
    const goal = layout.hud.goals[idx] || layout.hud.goals[0];
    return { x: goal.cx, y: goal.cy, slot: idx };
  }

  function displayGemsLeft() {
    if (!engine) return 0;
    return Math.max(0, engine.gemsLeft + gemFlights.length);
  }

  function levelScore() {
    if (!engine) return 0;
    return Math.max(0, engine.score - (scoreAtLevelStart || 0));
  }

  function persistRunScore() {
    if (!engine) return;
    const current = engine.score;
    const best = Number(readSave('bestScore', 0)) || 0;
    patchSave({
      lastScore: current,
      bestScore: Math.max(best, current),
    });
  }

  function startLevel(level, opts) {
    const options = opts || {};
    let carried = 0;
    if (options.keepScore && engine) carried = engine.score;
    else if (options.fromStart) {
      carried = Math.max(0, Number(readSave('levelStartScore', scoreAtLevelStart)) || 0);
    } else {
      carried = Math.max(0, Number(readSave('lastScore', 0)) || 0);
    }
    // 上一关未通关就重开 / 跳关：先补 LEVEL_EXIT
    reportLevelExitIfOpen();
    engine = new PuzzleCore({ level });
    if (carried > 0) engine.setScore(carried);
    scoreAtLevelStart = engine.score;
    patchSave({ lastScore: engine.score, levelStartScore: scoreAtLevelStart });
    markBlockedDirty();
    // DataNexus IAA：进入关卡（通关时 ad_cnt / duration 由 SDK 会话累计）
    DataNexus.reportIaaLevelEnter(engine.level, {
      enter_level_name: `第${engine.level}关`,
      game_mode: '闯关',
    });
    levelOpen = true;
    loseReported = false;
    // 新手引导开始：第 1 关且尚未通关过（对齐 001 / 成语）
    if (engine.level === 1 && readSave('hasSeenGuide', false) !== true) {
      DataNexus.reportIaaTutorialStart();
    }
    drag = null;
    flash = null;
    gemFlights = [];
    comboPop = null;
    pendingResult = null;
    resultTimer = 0;
    trayAppear = 1;
    saved = false;
    scorePops = [];
    placedPulse = {};
    sparkles = [];
    hudPulse = 0;
    praisePop = null;
    selected = null;
    phase = 'goal';
    phaseTimer = 0;
  }

  function finishLevel() {
    if (saved || !engine) return;
    saved = true;
    const level = engine.level;
    const nextLevel = level + 1;
    persistRunScore();
    const patch = {
      gamesPlayed: (Number(readSave('gamesPlayed', 0)) || 0) + 1,
      totalGems: (Number(readSave('totalGems', 0)) || 0) + engine.collected,
    };
    if (engine.won) {
      patch.level = Math.max(Number(readSave('level', 1)) || 1, nextLevel);
      patch.bestLevel = Math.max(Number(readSave('bestLevel', 1)) || 1, nextLevel);
    }
    patchSave(patch);
  }

  function hudBoxes() {
    hits.gear = layout.hud.gear;
    const tools = layout.tools || {};
    hits.refresh = tools.refresh || null;
    hits.toolRestart = tools.restart || null;
    hits.toolSkip = tools.skip || null;
  }

  function toolsEnabled() {
    return !!engine
      && !rewardBusy
      && !chest.isBlocking()
      && (phase === 'play' || phase === 'goal');
  }

  function refreshBadge() {
    const free = freeRefreshCount();
    if (free > 0) {
      return { kind: 'count', text: free > 99 ? '99+' : String(free) };
    }
    if (adsAllowed()) return { kind: 'ad' };
    return null;
  }

  function skipLevel() {
    if (!engine || !toolsEnabled()) return;
    const nextLevel = engine.level + 1;
    audio.playClick();
    patchSave({
      level: Math.max(Number(readSave('level', 1)) || 1, nextLevel),
      bestLevel: Math.max(Number(readSave('bestLevel', 1)) || 1, nextLevel),
    });
    toast('已跳过本关');
    startLevel(nextLevel, { keepScore: true });
  }

  function restartLevelFromTool() {
    if (!engine || !toolsEnabled()) return;
    audio.playClick();
    startLevel(engine.level, { fromStart: true });
  }

  function renderToolBar(ctx) {
    if (!layout || !layout.tools) return;
    drawToolBar(ctx, layout.tools, [
      { box: hits.refresh, kind: 'refresh', label: '刷新', badge: refreshBadge() },
      { box: hits.toolRestart, kind: 'restart', label: '重开', badge: null },
      { box: hits.toolSkip, kind: 'skip', label: '跳过', badge: null },
    ], toolsEnabled());
  }

  /** 礼包入口放在设置按钮右侧，避开左上角齿轮。 */
  function layoutGift(w) {
    if (!layout) return;
    const area = getSafeArea();
    const menu = area.menu || {};
    const gw = Math.max(48, Math.round(w * (90 / 750)));
    const gh = Math.max(58, Math.round(w * (110 / 750)));
    const gear = layout.hud && layout.hud.gear;
    const gx = gear
      ? gear.x + gear.w + Math.round(w * (8 / 750))
      : Math.max(8, Math.round(w * (8 / 750)));
    const gy = Math.max(
      4,
      (menu.top || area.statusBarHeight || 24) + Math.max(0, ((menu.height || 32) - gh) / 2)
    );
    giftBar.layout(w, layout.height, {
      x: gx,
      y: gy,
      w: gw,
      h: gh,
      size: gw,
      hideLabel: true,
    });
  }

  /** 底部抽屉内的整宽按钮 / 并排按钮。 */
  function sheetRow(panel, offsetY, height, part, parts) {
    const sidePad = 24;
    const gap = 10;
    const count = parts || 1;
    const bw = (panel.w - sidePad * 2 - gap * (count - 1)) / count;
    return {
      x: panel.x + sidePad + (part || 0) * (bw + gap),
      y: panel.y + offsetY,
      w: bw,
      h: height,
    };
  }

  function panelProgress() {
    return easeOutCubic(Math.min(1, phaseAge / 0.28));
  }

  /**
   * 拖拽方块此刻应在的位置。
   * 托盘拖拽：按下时抓住的那一点保持在指尖下方并整体上抬，方块放大到棋盘格尺寸。
   * 瞄准放置（先点选再按棋盘）：方块中心对准指尖，轻触哪里就放在哪里。
   */
  function dragTarget() {
    const unit = layout.cell + layout.gap;
    if (drag.aim) {
      return {
        x: drag.fingerX - (drag.bounds.cols * unit) / 2,
        y: drag.fingerY - (drag.bounds.rows * unit) / 2,
        unit,
      };
    }
    return {
      x: drag.fingerX - drag.grabX * drag.bounds.cols * unit,
      y: drag.fingerY - layout.lift - drag.grabY * drag.bounds.rows * unit,
      unit,
    };
  }

  function overBoard(point) {
    const boardW = layout.boardW || layout.boardSize;
    const boardH = layout.boardH || layout.boardSize;
    return point.x >= layout.boardX
      && point.x <= layout.boardX + boardW
      && point.y >= layout.boardY
      && point.y <= layout.boardY + boardH;
  }

  function beginDrag(index, point, aim) {
    const piece = engine.pieces[index];
    if (!piece || piece.used) {
      selected = null;
      return;
    }
    const rect = candidateRect(layout, piece, index);
    const pieceW = rect.bounds.cols * rect.unit;
    const pieceH = rect.bounds.rows * rect.unit;
    drag = {
      index,
      piece,
      bounds: rect.bounds,
      fingerX: point.x,
      fingerY: point.y,
      startX: point.x,
      startY: point.y,
      aim: !!aim,
      moved: !!aim,
      grabX: Math.max(0.1, Math.min(0.9, (point.x - rect.x) / pieceW)),
      grabY: Math.max(0.1, Math.min(0.9, (point.y - rect.y) / pieceH)),
      x: rect.x,
      y: rect.y,
      unit: rect.unit,
      anchor: null,
      valid: false,
      preview: null,
      returning: false,
      snapKey: '',
    };
    if (!aim) audio.playClick();
    updateDrag(point);
  }

  function startDrag(point) {
    if (!engine || phase !== 'play' || engine.gameOver || engine.won || pendingResult) return;
    const index = hitCandidate(point.x, point.y, engine.pieces, layout);
    if (index >= 0) {
      beginDrag(index, point, false);
      return;
    }
    if (selected != null && overBoard(point)) {
      beginDrag(selected, point, true);
      return;
    }
    selected = null;
  }

  function updateDrag(point) {
    if (!drag || drag.returning) return;
    drag.fingerX = point.x;
    drag.fingerY = point.y;
    if (!drag.moved) {
      const dx = point.x - drag.startX;
      const dy = point.y - drag.startY;
      if (dx * dx + dy * dy < TAP_SLOP * TAP_SLOP) return;
      drag.moved = true;
      selected = null;
    }
    const target = dragTarget();
    drag.anchor = findSnapAnchor(
      drag.piece,
      target.x,
      target.y,
      layout,
      (row, col) => engine.canPlace(drag.piece, row, col)
    );
    drag.valid = !!drag.anchor.valid;
    drag.preview = drag.valid ? engine.previewLines(drag.piece, drag.anchor.row, drag.anchor.col) : null;
    const key = drag.valid ? `${drag.anchor.row},${drag.anchor.col}` : '';
    if (key && key !== drag.snapKey) audio.tick();
    drag.snapKey = key;
  }

  function launchGemFlights(result) {
    result.gems.forEach((cell, index) => {
      const pos = boardCellPosition(layout, cell.row, cell.col);
      const target = gemTarget(cell.skin);
      gemFlights.push(createGemFlight(
        pos.x + layout.cell / 2,
        pos.y + layout.cell / 2,
        target.x,
        target.y,
        index,
        time,
        cell.skin
      ));
    });
  }

  function spawnScorePop(result) {
    if (!result || result.scoreGain <= 0) return;
    const lines = (result.clearedRows || []).length + (result.clearedCols || []).length;
    scorePops.push({
      value: result.scoreGain,
      x: layout.boardX + (layout.boardW || layout.boardSize) / 2,
      y: layout.boardY + (layout.boardH || layout.boardSize) * (lines ? 0.3 : 0.36),
      age: 0,
      duration: lines ? 1.05 : 0.85,
      size: lines ? 30 + Math.min(4, lines) * 5 : 24,
    });
    if (lines >= 2) {
      praisePop = { text: PRAISE[Math.min(lines, PRAISE.length - 1)], age: 0, duration: 1.0 };
    }
  }

  function markPlacedPulse(result) {
    placedPulse = {};
    (result.placed || []).forEach((cell) => {
      placedPulse[cellKey(cell.row, cell.col)] = 0;
    });
  }

  function finishDrag() {
    if (!drag || drag.returning) return;
    if (!drag.moved) {
      const index = drag.index;
      drag = null;
      selected = selected === index ? null : index;
      return;
    }
    if (drag.valid) {
      const boardBefore = engine.board.map((row) => row.slice());
      const skinsBefore = engine.skins.map((row) => row.slice());
      const placedIndex = drag.index;
      const result = engine.place(drag.index, drag.anchor.row, drag.anchor.col);
      drag = null;
      if (!result.ok) return;
      if (selected === placedIndex || result.refreshed) selected = null;
      markBlockedDirty();
      audio.playPlace();
      markPlacedPulse(result);
      spawnScorePop(result);
      persistRunScore();
      flash = buildFlash(boardBefore, result, layout, skinsBefore);
      if (flash) {
        audio.playClear();
        launchGemFlights(result);
        if (result.combo >= 2) comboPop = { value: result.combo, age: 0, duration: 0.9 };
        // 答题统计：一次放置触发整行 / 整列消除
        reportLevelQuiz(LEVEL_QUIZ_TYPE.ANSWER, engine.level);
      }
      if (result.refreshed) trayAppear = 0;
      if (result.won || result.gameOver) {
        pendingResult = result.won ? 'won' : 'lost';
        resultTimer = 0;
      } else {
        // 放置方块累计 → misun_reward（关卡结算中不打断）
        maybeShowClickReward();
      }
      return;
    }
    drag.returning = true;
    drag.valid = false;
    drag.preview = null;
    drag.home = candidateRect(layout, drag.piece, drag.index);
  }

  function cancelDrag() {
    if (!drag || drag.returning) return;
    if (!drag.moved) {
      drag = null;
      return;
    }
    drag.valid = false;
    finishDrag();
  }

  function goHome(scene) {
    finishLevel();
    scene.manager.go('lobby');
  }

  function handleRevive() {
    // 本关次数用完时先用宝箱攒下的复活
    if (engine.revivesLeft <= 0 && readChestBoost().revive > 0) {
      if (!consumeChestBoost('revive')) return;
      engine.addRevives(1);
    }
    const outcome = engine.revive();
    audio.playClick();
    if (outcome.ok) {
      markBlockedDirty();
      DataNexus.reportIaaItemUsed(IAA_ITEM.REVIVE, 1);
      DataNexus.reportIaaUseItem(IAA_ITEM_SOURCE.GIFT);
      saved = false;
      phase = 'play';
      pendingResult = null;
      trayAppear = outcome.refreshed ? 0 : 1;
      if (outcome.refreshed) selected = null;
      if (outcome.clearedRows && outcome.clearedRows.length) {
        const boardBefore = engine.board.map((row) => row.slice());
        outcome.clearedRows.forEach((row) => {
          for (let col = 0; col < BOARD_COLS; col += 1) boardBefore[row][col] = CELL.WOOD;
        });
        flash = buildFlash(boardBefore, {
          clearedRows: outcome.clearedRows,
          clearedCols: [],
          placed: [],
        }, layout);
      }
    }
  }

  function tryReviveOrAd() {
    if (rewardBusy) return;
    if (freeReviveCount() > 0) {
      handleRevive();
      return;
    }
    if (!adsAllowed()) {
      audio.playClick();
      startLevel(engine.level, { fromStart: true });
      return;
    }
    // 无免费复活：看完激励 +1 次，再点「立即复活」使用（对齐 001「看完只加次数」）
    showPropRewardAd(REVIVE_REWARD_CODE, () => grantPropOnce('revive'), (busy) => {
      rewardBusy = busy;
    });
  }

  function onPanelTouch(scene, point) {
    if (phase === 'paused') {
      if (contains(hits.restart, point.x, point.y)) {
        audio.playClick();
        startLevel(engine.level, { fromStart: true });
      } else if (contains(hits.soundToggle, point.x, point.y)) {
        patchSave({ soundOn: !readSave('soundOn', true) });
        audio.playClick();
      } else if (contains(hits.musicToggle, point.x, point.y)) {
        const enabled = !readSave('musicOn', true);
        patchSave({ musicOn: enabled });
        if (enabled) audio.startMusic();
        else audio.stopMusic();
      } else if (contains(hits.home, point.x, point.y)) {
        goHome(scene);
      } else if (contains(hits.primary, point.x, point.y)) {
        phase = 'play';
        audio.playClick();
      }
      return;
    }
    if (phase === 'won') {
      if (contains(hits.primary, point.x, point.y)) {
        audio.playClick();
        startLevel(engine.level + 1, { keepScore: true });
      } else if (contains(hits.secondary, point.x, point.y)) {
        goHome(scene);
      }
      return;
    }
    if (phase === 'lost') {
      if (contains(hits.close, point.x, point.y)) {
        goHome(scene);
      } else if (contains(hits.primary, point.x, point.y)) {
        tryReviveOrAd();
      } else if (contains(hits.refreshLost, point.x, point.y)) {
        useRefreshTool();
      } else if (contains(hits.restart, point.x, point.y) || contains(hits.secondary, point.x, point.y)) {
        audio.playClick();
        startLevel(engine.level, { fromStart: true });
      }
    }
  }

  /** 进场：等 SDK 登录 → 等入场漏斗（强变现 / 宝箱）结束 → 再挂玩法常驻广告 */
  function bootAdsAndEntry() {
    const afterEntry = () => {
      if (chest.isBlocking()) return;
      GameGlobal.playAdsPausedForChest = false;
      showAllPlayAds();
    };
    GameGlobal.playAdsPausedForChest = true;
    hideAllPlayAds();
    const entryP = GameGlobal.entryFlowPromise || getEntryFlowPromise() || startEntryFlow();
    Promise.resolve(entryP)
      .then(afterEntry)
      .catch((err) => {
        console.warn('[entry] wait entryFlow', err);
        afterEntry();
      });
  }

  const scene = {
    mount(payload) {
      const area = getSafeArea();
      layoutReserve = bottomReserve();
      layout = createBoardLayout(area.width, area.height, layoutArea(area));
      hudBoxes();
      layoutGift(area.width);
      preloadSidebarAssets();
      loadAssetKeys([
        'arenaBg',
        'settingIcon',
        'goalPop',
        'popTitle',
        'homeIcon',
        'musicOn',
        'musicOff',
        'voxOn',
        'voxOff',
        'startBtn',
        'toolRefresh',
        'toolRestart',
        'toolSkip',
        'tileBlank',
        'tile1', 'tile2', 'tile3', 'tile4', 'tile5',
        'tile6', 'tile7', 'tile8', 'tile9', 'tile10',
      ]).catch((err) => console.warn('[对局素材]', err));
      giftBar.probe();
      const level = payload && Number.isInteger(payload.level) ? payload.level : Number(readSave('level', 1)) || 1;
      if (payload && payload.resume && engine && engine.level === level) {
        // 从协议页返回：保留对局，回到暂停面板；重新开一段 SDK 关卡会话
        phase = 'paused';
        drag = null;
        DataNexus.reportIaaLevelEnter(engine.level, {
          enter_level_name: `第${engine.level}关`,
          game_mode: '闯关',
        });
        levelOpen = true;
      } else {
        startLevel(level);
      }
      audio.startMusic();

      // 等 Deploy.readyAsync 完成再挂玩法广告（入场漏斗可能已在跑）
      const ready = GameGlobal.sdkReady;
      if (ready && typeof ready.then === 'function') {
        ready.then(bootAdsAndEntry).catch(bootAdsAndEntry);
      } else {
        bootAdsAndEntry();
      }
    },

    unmount() {
      reportLevelExitIfOpen();
      chest.stop();
      hideAllPlayAds();
      giftBar.close();
    },

    onTouchStart(event) {
      const point = touchPoint(event);
      if (!point) return;
      // 宝箱弹窗期间吞掉按下（点击在 touchEnd 交给 chest.tap）
      if (chest.isBlocking()) {
        drag = null;
        return;
      }
      // 弹窗打开时吞掉按下，真正点击在 touchEnd 处理
      if (giftBar.modal) return;
      if (phase === 'goal') {
        phase = 'play';
        return;
      }
      if (phase !== 'play') return;
      if (contains(hits.gear, point.x, point.y)) {
        phase = 'paused';
        skipPanelEnd = true;
        drag = null;
        audio.playClick();
        return;
      }
      if (hits.refresh && contains(hits.refresh, point.x, point.y)) {
        useRefreshTool();
        return;
      }
      if (hits.toolRestart && contains(hits.toolRestart, point.x, point.y)) {
        restartLevelFromTool();
        return;
      }
      if (hits.toolSkip && contains(hits.toolSkip, point.x, point.y)) {
        skipLevel();
        return;
      }
      // 点在礼包上时不要开始拖方块；弹窗改到抬手时再开
      if (giftBar.hitsGift(point.x, point.y)) return;
      startDrag(point);
    },

    onTouchMove(event) {
      if (chest.isBlocking() || giftBar.modal) return;
      const point = touchPoint(event);
      if (point && phase === 'play') updateDrag(point);
    },

    onTouchEnd(event) {
      const point = touchPoint(event, true);
      if (chest.isBlocking()) {
        if (!point) return;
        // 宝箱 AD_COVER 且原生模板已出屏：点击交给原生层
        if (chest.shouldDeferTouchToNative()) return;
        chest.tap(point.x, point.y);
        return;
      }
      if (!point) {
        if (!giftBar.modal) cancelDrag();
        return;
      }
      // 礼包入口与弹窗统一在抬手时响应，避免按下打开、抬手因落在面板外被立刻关掉
      if (giftBar.modal || giftBar.hitsGift(point.x, point.y)) {
        giftBar.handleTouch(point.x, point.y);
        return;
      }
      if (phase === 'paused' || phase === 'won' || phase === 'lost') {
        if (skipPanelEnd) {
          skipPanelEnd = false;
          return;
        }
        onPanelTouch(scene, point);
        return;
      }
      if (phase !== 'play') return;
      updateDrag(point);
      finishDrag();
    },

    onTouchCancel() {
      if (chest.isBlocking() || giftBar.modal) return;
      cancelDrag();
    },

    update(dt) {
      const delta = Math.max(0, dt || 0);
      time += delta;
      if (phase !== lastPhase) {
        lastPhase = phase;
        phaseAge = 0;
      }
      phaseAge += delta;
      giftBar.update(delta);
      chest.update(delta);
      // 宝箱弹窗期间冻结对局（目标弹窗倒计时、拖拽、结算都暂停）
      if (chest.isBlocking()) return;

      if (phase === 'goal') {
        phaseTimer += delta;
        if (phaseTimer >= GOAL_POPUP_SECONDS) phase = 'play';
      }

      if (drag) {
        const target = drag.returning ? drag.home : dragTarget();
        if (drag.returning) {
          drag.x = approach(drag.x, target.x, 18, delta);
          drag.y = approach(drag.y, target.y, 18, delta);
          drag.unit = approach(drag.unit, target.unit, 18, delta);
        } else {
          // 位置直接跟手，不加延迟；只对尺寸放大做短暂缓动
          drag.x = target.x;
          drag.y = target.y;
          drag.unit = approach(drag.unit, target.unit, 26, delta);
        }
        if (drag.returning) {
          const settled = Math.abs(drag.x - target.x) < 0.6
            && Math.abs(drag.y - target.y) < 0.6
            && Math.abs(drag.unit - target.unit) < 0.3;
          if (settled) drag = null;
        }
      }

      if (flash) flash = updateClearBurst(flash, delta);

      if (gemFlights.length) {
        gemFlights = updateGemFlights(gemFlights, delta, sparkles, (flight) => {
          hudPulse = 1;
          spawnGemBurst(sparkles, flight.toX, flight.toY, 10);
        });
      }
      if (sparkles.length) sparkles = updateSparkles(sparkles, delta);
      if (hudPulse > 0) hudPulse = Math.max(0, hudPulse - delta / 0.38);

      if (comboPop) {
        comboPop.age += delta;
        if (comboPop.age >= comboPop.duration) comboPop = null;
      }
      if (praisePop) {
        praisePop.age += delta;
        if (praisePop.age >= praisePop.duration) praisePop = null;
      }

      if (scorePops.length) {
        scorePops.forEach((pop) => {
          pop.age += delta;
        });
        scorePops = scorePops.filter((pop) => pop.age < pop.duration);
      }

      Object.keys(placedPulse).forEach((key) => {
        placedPulse[key] += delta / 0.22;
        if (placedPulse[key] >= 1) delete placedPulse[key];
      });

      if (trayAppear < 1) trayAppear = Math.min(1, trayAppear + delta / 0.28);

      if (pendingResult && phase === 'play') {
        resultTimer += delta;
        const waitFlights = pendingResult === 'won' && gemFlights.length;
        if (resultTimer >= RESULT_DELAY && !flash && !waitFlights) {
          phase = pendingResult;
          pendingResult = null;
          if (phase === 'won' || (phase === 'lost' && engine.revivesLeft <= 0)) {
            finishLevel();
          }
          if (phase === 'lost') {
            audio.playGameOver();
            if (!loseReported) {
              loseReported = true;
              DataNexus.reportIaaLevelLose();
            }
          } else {
            audio.playClear();
            onLevelWon();
          }
        }
      }
    },

    render(ctx, width, height) {
      const area = getSafeArea();
      const w = width || area.width;
      const h = height || area.height;
      const reserve = bottomReserve();
      if (!layout || layout.width !== w || layout.height !== h || layoutReserve !== reserve) {
        layoutReserve = reserve;
        layout = createBoardLayout(w, h, layoutArea(area));
      }
      hudBoxes();
      layoutGift(w);
      ctx.fillStyle = '#8ecfff';
      ctx.fillRect(0, 0, w, h);
      drawImageAsset(ctx, 'arenaBg', 0, 0, w, h, 'cover');
      drawBottomHill(ctx, w, h);
      renderHud(ctx, w);
      giftBar.drawEntry(ctx);
      const blocked = resolveBlockedSlots();
      const shake = burstShake(flash);
      const animateGems = !!(drag || flash || gemFlights.length || sparkles.length);
      ctx.save();
      ctx.translate(shake.x, shake.y);
      drawBoard(ctx, layout, engine && engine.board, {
        flash,
        placed: placedPulse,
        time,
        animateGems,
        skins: engine && engine.skins,
        preview: drag && drag.valid && drag.preview
          ? { rows: drag.preview.rows, cols: drag.preview.cols, pulse: 0.5 + Math.sin(time * 9) * 0.5 }
          : null,
      });
      drawPlacePulse(ctx, layout, placedPulse);
      drawLineFlash(ctx, layout, flash);
      const lifted = drag && (drag.moved || drag.returning);
      drawCandidates(
        ctx,
        layout,
        engine && engine.pieces,
        lifted ? drag.index : null,
        easeOutBack(trayAppear),
        time,
        blocked,
        lifted ? null : selected
      );
      renderTrayHint(ctx, w);
      if (lifted) {
        if (!drag.returning && drag.anchor && drag.anchor.near) {
          drawProjection(ctx, layout, drag.piece, drag.anchor, drag.valid);
        }
        drawDraggedPiece(
          ctx,
          layout,
          drag.piece,
          drag.x,
          drag.y,
          drag.unit,
          drag.returning ? 0.9 : 0.96,
          !drag.returning
        );
      }
      drawBurstParticles(ctx, flash);
      ctx.restore();
      drawGemFlights(ctx, gemFlights, layout.cell * 0.72);
      drawSparkles(ctx, sparkles);
      renderGoals(ctx);
      renderComboPop(ctx, w);
      renderPraisePop(ctx, w);
      renderScorePops(ctx);

      if (phase === 'goal') renderGoalPopup(ctx, w, h);
      else if (phase === 'paused') renderPausePanel(ctx, w, h);
      else if (phase === 'won') renderWinPanel(ctx, w, h);
      else if (phase === 'lost') renderLostPanel(ctx, w, h);
      giftBar.drawPopups(ctx, w, h);
      // 宝箱盖在最上层
      chest.draw(ctx, w, h);
    },
  };

  /** 通关：TUTORIAL_FINISH（第 1 关）→ LEVEL_PASS → $LevelQuiz CLEAR */
  function onLevelWon() {
    if (!engine) return;
    if (engine.level === 1 && readSave('hasSeenGuide', false) !== true) {
      DataNexus.reportIaaTutorialFinish();
    }
    patchSave({ hasSeenGuide: true });
    DataNexus.reportIaaLevelPass();
    levelOpen = false;
    reportLevelQuiz(LEVEL_QUIZ_TYPE.CLEAR, engine.level);
  }

  /** 底部通栏蓝色弧面：左右贴边、中间略高，道具坐在弧线上。 */
  function drawBottomHill(ctx, w, h) {
    const tools = layout && layout.tools;
    const peakY = tools ? tools.y + tools.h * 0.3 : h * 0.8;
    const edgeY = tools ? tools.y + tools.h * 0.52 : h * 0.86;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, edgeY);
    ctx.quadraticCurveTo(w / 2, peakY * 2 - edgeY, w, edgeY);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fillStyle = '#3d9eff';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, edgeY);
    ctx.quadraticCurveTo(w / 2, peakY * 2 - edgeY, w, edgeY);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.lineCap = 'butt';
    ctx.stroke();
    ctx.restore();
  }

  function renderHud(ctx) {
    const hud = layout.hud;
    if (!drawImageAsset(ctx, 'settingIcon', hud.gear.x, hud.gear.y, hud.gear.w, hud.gear.h, 'contain')) {
      iconButton(ctx, hud.gear, 'menu', {
        fill: 'rgba(255,255,255,0.78)',
        color: '#2f6fbf',
      });
    }
    const x = hud.levelX;
    const labelY = hud.y + 14;
    const valueY = hud.y + 42;
    spacedText(ctx, '关卡', x, labelY, 10, '#5a8ec8', 2.5, 'left', 500);
    text(ctx, pad2(engine ? engine.level : 1), x - 1, valueY, 30, '#173f8a', 'left', 300);
    const scoreX = x + 76;
    ctx.fillStyle = 'rgba(23,63,138,0.18)';
    ctx.fillRect(scoreX - 16, hud.y + 12, 1, hud.h - 24);
    spacedText(ctx, '分数', scoreX, labelY, 10, '#5a8ec8', 2.5, 'left', 500);
    text(ctx, engine ? engine.score : 0, scoreX - 1, valueY, 30, '#173f8a', 'left', 300);
    renderToolBar(ctx);
  }

  /** 右上两个目标进度环：猫脸居中，右侧「已收集 / 目标」；集齐后换成深蓝对勾。 */
  function renderGoals(ctx) {
    const skins = (engine && engine.targetSkins) || [1, 2];
    const lefts = (engine && engine.targetLeft) || [0, 0];
    const goals = (engine && engine.targetGoals) || [1, 1];
    const pulse = hudPulse > 0 ? 1 + hudPulse * 0.14 : 1;
    layout.hud.goals.forEach((slot, i) => {
      const goal = Math.max(1, goals[i] || 1);
      const left = Math.max(0, lefts[i] || 0);
      ring(ctx, slot.cx, slot.cy, slot.r, (goal - left) / goal, 2.5, '#173f8a', 'rgba(23,63,138,0.18)');
      const iconSize = slot.r * 1.2 * pulse;
      if (!drawImageAsset(ctx, tileAssetKey(skins[i]), slot.cx - iconSize / 2, slot.cy - iconSize / 2, iconSize, iconSize, 'contain')) {
        roundRect(ctx, slot.cx - iconSize / 2, slot.cy - iconSize / 2, iconSize, iconSize, iconSize * 0.2, TONE.block);
      }
      const tx = slot.cx + slot.r + 9;
      if (left <= 0) {
        icon(ctx, 'check', tx + 9, slot.cy, 20, '#173f8a');
      } else {
        text(ctx, goal - left, tx, slot.cy - 5, 18, '#173f8a', 'left', 400);
        text(ctx, `/ ${goal}`, tx, slot.cy + 12, 10, '#5a8ec8', 'left', 400);
      }
    });
  }

  /** 棋盘与托盘之间的一行提示：选中方块时提示轻触棋盘放置。 */
  function renderTrayHint(ctx, w) {
    if (!engine || phase !== 'play' || (drag && drag.moved)) return;
    const y = layout.trayTop - 12;
    if (selected != null) {
      text(ctx, '轻触棋盘放置', w / 2, y, 12, TONE.gold, 'center', 500);
    } else if (engine.level === 1 && !drag) {
      text(ctx, '拖动方块，或点选后轻触棋盘', w / 2, y, 12, '#5a8ec8', 'center', 400);
    }
  }

  function renderScorePops(ctx) {
    scorePops.forEach((pop) => {
      const t = pop.age / pop.duration;
      const alpha = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
      ctx.save();
      ctx.globalAlpha = Math.max(0, alpha);
      ctx.shadowColor = 'rgba(0,0,0,0.6)';
      ctx.shadowBlur = 8;
      text(ctx, `+${pop.value}`, pop.x, pop.y - easeOutCubic(t) * 36, Math.round((pop.size || 24) * 0.8), TONE.gold, 'center', 500);
      ctx.restore();
    });
  }

  function renderPraisePop(ctx, w) {
    if (!praisePop) return;
    const t = praisePop.age / praisePop.duration;
    const alpha = t < 0.15 ? t / 0.15 : t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1;
    const y = layout.boardY + (layout.boardH || layout.boardSize) * 0.62 - easeOutCubic(t) * 14;
    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 12;
    spacedText(ctx, praisePop.text.toUpperCase(), w / 2, y, 26, TONE.text, 8, 'center', 300);
    ctx.restore();
  }

  function renderComboPop(ctx, w) {
    if (!comboPop) return;
    const t = comboPop.age / comboPop.duration;
    const alpha = t < 0.12 ? t / 0.12 : t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1;
    const cy = layout.boardY + (layout.boardH || layout.boardSize) * 0.42 - easeOutCubic(t) * 18;
    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 12;
    spacedText(ctx, 'COMBO', w / 2, cy - 22, 11, TONE.gold, 4, 'center', 600);
    text(ctx, `×${comboPop.value}`, w / 2, cy + 6, 40, TONE.text, 'center', 200);
    ctx.restore();
  }

  /** 开局：mubiaoPop 底图 + 两款目标猫与数量。 */
  function renderGoalPopup(ctx, w, h) {
    const t = Math.min(1, phaseTimer / 0.3);
    const ease = easeOutBack(Math.min(1, t));
    const cx = w / 2;
    const cy = h / 2;
    const img = getAsset('goalPop');

    ctx.save();
    ctx.fillStyle = `rgba(0,0,0,${0.8 * easeOutCubic(t)})`;
    ctx.fillRect(0, 0, w, h);
    ctx.translate(cx, cy);
    ctx.scale(ease, ease);
    ctx.translate(-cx, -cy);

    let panelX;
    let panelY;
    let panelW;
    let panelH;

    if (img && img.width && img.height) {
      const scale = Math.min(w / img.width, h / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      const dx = (w - dw) / 2;
      const dy = (h - dh) / 2;
      ctx.drawImage(img, dx, dy, dw, dh);
      // 白底内容区相对整图的矩形（对齐关卡目标卡）
      panelX = dx + dw * 0.16;
      panelY = dy + dh * 0.42;
      panelW = dw * 0.68;
      panelH = dh * 0.28;
    } else {
      scrim(ctx, w, h, 0.45 * easeOutCubic(t));
      panelW = Math.min(w * 0.78, 300);
      panelH = panelW * 0.5;
      panelX = (w - panelW) / 2;
      panelY = h * 0.36;
      roundRect(ctx, panelX, panelY, panelW, panelH, 18, '#ffffff', '#3aa0ff', 6);
      text(ctx, '关卡目标', cx, panelY - 18, 22, '#2f8dff', 'center', 800);
    }

    drawGoalCats(ctx, { x: panelX, y: panelY, w: panelW, h: panelH });

    ctx.restore();
  }

  /** 设置：蓝框白底卡片 + 图钉标题 + 音乐/音效/首页 + 继续/重开。 */
  function renderPausePanel(ctx, w, h) {
    const p = panelProgress();
    ctx.fillStyle = `rgba(0,0,0,${0.8 * p})`;
    ctx.fillRect(0, 0, w, h);

    const cardW = Math.min(w * 0.82, 328);
    const cardH = Math.max(200, Math.round(cardW * 0.62));
    const cardX = (w - cardW) / 2;
    const cardY = h * 0.26 + (1 - p) * 18;
    const radius = 22;

    ctx.save();
    ctx.globalAlpha = p;
    paintPopupShell(ctx, cardX, cardY, cardW, cardH, radius);
    paintPopupTitle(ctx, w, cardY, cardW, '设置');

    const musicOn = !!readSave('musicOn', true);
    const soundOn = !!readSave('soundOn', true);
    const iconSize = Math.min(58, cardW * 0.2);
    const iconY = cardY + POP_TOP_BLUE + 31;
    const cols = [
      { key: 'musicToggle', asset: musicOn ? 'musicOn' : 'musicOff', label: `音乐:${musicOn ? '开' : '关'}` },
      { key: 'soundToggle', asset: soundOn ? 'voxOn' : 'voxOff', label: `音效:${soundOn ? '开' : '关'}` },
      { key: 'home', asset: 'homeIcon', label: '返回首页' },
    ];
    cols.forEach((col, i) => {
      const cx = cardX + cardW * (0.22 + i * 0.28);
      hits[col.key] = {
        x: cx - iconSize / 2,
        y: iconY,
        w: iconSize,
        h: iconSize + 26,
      };
      drawImageAsset(ctx, col.asset, cx - iconSize / 2, iconY, iconSize, iconSize, 'contain');
      text(ctx, col.label, cx, iconY + iconSize + 14, 13, '#5a8ec8', 'center', 600);
    });

    const btnImg = getAsset('startBtn');
    const ratio = btnImg && btnImg.width ? btnImg.height / btnImg.width : 0.26;
    const btnW = Math.min(cardW * 0.86, 268);
    const btnH = Math.max(48, Math.round(btnW * ratio));
    const btnX = (w - btnW) / 2;
    hits.primary = { x: btnX, y: cardY + cardH + 14, w: btnW, h: btnH };
    const restartW = Math.round(btnW * 0.62);
    const restartH = Math.max(40, Math.round(btnH * 0.82));
    hits.restart = {
      x: (w - restartW) / 2,
      y: hits.primary.y + btnH + 14,
      w: restartW,
      h: restartH,
    };
    hits.close = null;
    hits.secondary = null;
    paintHomeButton(ctx, hits.primary, '继续游戏', 'green');
    paintHomeButton(ctx, hits.restart, '重开本关', 'orange');
    ctx.restore();
  }

  /** 两只目标猫 +「N只」，与开局关卡目标一致。 */
  function drawGoalCats(ctx, box) {
    const skins = (engine && engine.targetSkins) || [1, 2];
    const goals = (engine && engine.targetGoals) || [0, 0];
    const cx = box.x + box.w / 2;
    const iconSize = Math.max(48, Math.min(72, box.w * 0.28));
    const midY = box.y + box.h * 0.42;
    const leftX = box.x + box.w * 0.28;
    const rightX = box.x + box.w * 0.72;
    const labelY = midY + iconSize * 0.58 + 18;
    const labelSize = Math.max(18, Math.round(box.w * 0.09));
    text(ctx, '+', cx, midY + 2, Math.max(28, Math.round(iconSize * 0.56)), '#2f8dff', 'center', 700);
    [
      { x: leftX, skin: skins[0], goal: goals[0] },
      { x: rightX, skin: skins[1], goal: goals[1] },
    ].forEach((item) => {
      const key = tileAssetKey(item.skin);
      if (!drawImageAsset(ctx, key, item.x - iconSize / 2, midY - iconSize / 2, iconSize, iconSize, 'contain')) {
        roundRect(ctx, item.x - iconSize / 2, midY - iconSize / 2, iconSize, iconSize, iconSize * 0.2, TONE.block);
      }
      text(ctx, `${item.goal}只`, item.x, labelY, labelSize, '#2f7fe0', 'center', 700);
    });
  }

  /** 过关：设置同款蓝框卡片 + 图钉标题 + 目标猫 + 得分 + 下一关。 */
  function renderWinPanel(ctx, w, h) {
    const p = panelProgress();
    ctx.fillStyle = `rgba(0,0,0,${0.8 * p})`;
    ctx.fillRect(0, 0, w, h);

    const cardW = Math.min(w * 0.82, 328);
    const cardH = Math.max(220, Math.round(cardW * 0.68));
    const cardX = (w - cardW) / 2;
    const cardY = h * 0.24 + (1 - p) * 18;
    const radius = 22;

    ctx.save();
    ctx.globalAlpha = p;
    paintPopupShell(ctx, cardX, cardY, cardW, cardH, radius);
    paintPopupTitle(ctx, w, cardY, cardW, '过关啦');

    drawGoalCats(ctx, {
      x: cardX + 16,
      y: cardY + POP_TOP_BLUE - 2,
      w: cardW - 32,
      h: cardH - POP_TOP_BLUE - 48,
    });
    text(ctx, `得分：${levelScore()}`, w / 2, cardY + cardH - 32, 20, '#BC1212', 'center', 700);

    const btnImg = getAsset('startBtn');
    const ratio = btnImg && btnImg.width ? btnImg.height / btnImg.width : 0.26;
    const btnW = Math.min(cardW * 0.86, 268);
    const btnH = Math.max(48, Math.round(btnW * ratio));
    hits.primary = { x: (w - btnW) / 2, y: cardY + cardH + 14, w: btnW, h: btnH };
    hits.secondary = { x: (w - 160) / 2, y: hits.primary.y + btnH + 6, w: 160, h: 36 };
    hits.home = null;
    hits.restart = null;
    hits.close = null;
    const nextLevel = ((engine && engine.level) || 1) + 1;
    paintHomeButton(ctx, hits.primary, `下一关（第${nextLevel}关）`, 'green');
    drawText(ctx, '返回首页', w / 2, hits.secondary.y + 18, 16, '#ffffff', 'center', 700, '#173f8a', 4);
    ctx.restore();
  }

  /** 无处可放：设置同款蓝框卡片 + 图钉标题 + 复活 / 刷新 / 重开。 */
  function renderLostPanel(ctx, w, h) {
    const p = panelProgress();
    ctx.fillStyle = `rgba(0,0,0,${0.8 * p})`;
    ctx.fillRect(0, 0, w, h);

    const boostRevive = readChestBoost().revive;
    const canRevive = engine.revivesLeft > 0;
    const adRevive = !canRevive && boostRevive <= 0 && adsAllowed();
    let hint;
    if (canRevive) hint = `本局还可复活${engine.revivesLeft}次`;
    else if (boostRevive > 0) hint = `可使用宝箱复活×${boostRevive}`;
    else hint = adRevive ? '看完广告可再复活1次' : '复活次数已用完';

    const cardW = Math.min(w * 0.84, 336);
    const btnImg = getAsset('startBtn');
    const ratio = btnImg && btnImg.width ? btnImg.height / btnImg.width : 0.26;
    const btnW = cardW - 48;
    const btnH = Math.max(52, Math.round(btnW * ratio));
    const hintSize = 26;
    const cardH = Math.round(btnH + hintSize + 118);
    const cardX = (w - cardW) / 2;
    const cardY = h * 0.3 + (1 - p) * 18;
    const radius = 24;

    ctx.save();
    ctx.globalAlpha = p;
    paintPopupShell(ctx, cardX, cardY, cardW, cardH, radius);
    paintPopupTitle(ctx, w, cardY, cardW, '没位置啦');

    hits.primary = {
      x: (w - btnW) / 2,
      y: cardY + cardH - 8 - 20 - btnH,
      w: btnW,
      h: btnH,
    };
    const contentTop = cardY + POP_TOP_BLUE;
    const hintY = (contentTop + hits.primary.y) / 2;
    text(ctx, hint, w / 2, hintY, hintSize, '#333333', 'center', 800);
    let primaryLabel = '重新开始';
    if (canRevive || boostRevive > 0) primaryLabel = '立即复活';
    else if (adRevive) primaryLabel = rewardBusy ? '广告加载中…' : '看广告复活';
    paintHomeButton(ctx, hits.primary, primaryLabel, 'green');

    const smallW = Math.round(cardW * 0.4);
    const smallH = Math.max(48, Math.round(btnH * 0.9));
    const gap = 22;
    const pairW = smallW * 2 + gap;
    const pairX = (w - pairW) / 2;
    const pairY = cardY + cardH + 18;
    hits.refreshLost = { x: pairX, y: pairY, w: smallW, h: smallH };
    hits.restart = { x: pairX + smallW + gap, y: pairY, w: smallW, h: smallH };
    hits.close = null;
    hits.secondary = null;
    hits.home = null;
    paintHomeButton(ctx, hits.refreshLost, '刷新方块', 'blue');
    paintHomeButton(ctx, hits.restart, '重开本关', 'orange');
    ctx.restore();
  }

  return scene;
}

export default class ArenaScreen {
  constructor() {
    const api = createArenaScreen();
    Object.setPrototypeOf(api, ArenaScreen.prototype);
    return api;
  }
}
