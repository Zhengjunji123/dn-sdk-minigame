/**
 * Arena chrome: tool bar, toasts, layout reserve helpers.
 */
import { BOARD_COLS } from '../board/grid-rules.js';
import { roundRect } from '../paint/ink.js';
import { buildClearBurst } from '../paint/burst.js';
import { drawImageAsset } from '../paint/media.js';
import { text } from '../paint/tone.js';

export const GOAL_POPUP_SECONDS = 1.8;
export const RESULT_DELAY = 0.55;
export const PRAISE = ['', '', 'Double', 'Triple', 'Perfect'];

export function cellKey(row, col) {
  return row * BOARD_COLS + col;
}

export function buildFlash(boardBefore, result, layout, skinsBefore) {
  return buildClearBurst(boardBefore, result, layout, skinsBefore);
}

export function toast(title) {
  try {
    wx.showToast({ title, icon: 'none', duration: 1500 });
  } catch (_e) {
    /* ignore */
  }
}

/** 底部原生广告占位：布局把托盘抬到广告之上 */
export function bottomReserve() {
  return Math.max(0, Number(GameGlobal.bottomAdReserve) || 0);
}

export function layoutArea(area) {
  const reserve = bottomReserve();
  if (!reserve) return area;
  return Object.assign({}, area, { bottom: Math.max(area.bottom || 0, reserve) });
}

const TOOL_ASSET = Object.freeze({
  refresh: 'toolRefresh',
  restart: 'toolRestart',
  skip: 'toolSkip',
});

/**
 * 底栏道具：刷新 / 重开 / 跳过（素材自带圆形图标与文案）。
 * items: [{ box, kind, badge }]
 */
export function drawToolBar(ctx, bar, items, enabled) {
  if (!items) return;
  items.forEach((item) => {
    const box = item.box;
    if (!box) return;
    ctx.save();
    ctx.globalAlpha = enabled ? 1 : 0.42;
    const painted = drawImageAsset(ctx, TOOL_ASSET[item.kind], box.x, box.y, box.w, box.h, 'contain');
    if (!painted) {
      roundRect(ctx, box.x, box.y, box.w, box.h, Math.min(18, box.h * 0.42), 'rgba(47,111,191,0.9)');
      text(ctx, item.label || '', box.x + box.w / 2, box.y + box.h / 2, 14, '#ffffff', 'center', 700);
    }
    ctx.restore();
    const badge = item.badge;
    if (!badge || !enabled) return;
    const badgeR = Math.max(8, Math.min(11, box.w * 0.14));
    const bx = box.x + box.w * 0.72;
    const by = box.y + box.h * 0.12;
    if (badge.kind === 'count') {
      ctx.beginPath();
      ctx.arc(bx, by, badgeR, 0, Math.PI * 2);
      ctx.fillStyle = '#7ec8ff';
      ctx.fill();
      text(ctx, badge.text, bx, by + 0.5, badgeR * 1.05, '#ffffff', 'center', 700);
    } else if (badge.kind === 'ad') {
      roundRect(ctx, bx - badgeR * 1.2, by - badgeR * 0.7, badgeR * 2.4, badgeR * 1.4, badgeR * 0.5, '#7ec8ff');
      text(ctx, 'AD', bx, by + 0.5, badgeR * 0.95, '#ffffff', 'center', 700);
    }
  });
}
