/**
 * 抖音侧边栏复访入口。
 * 弹窗 UI 按设计稿 341×517 坐标还原；奖励为本玩法的「复活 + 刷新方块」。
 */
import { getPlatform } from '../host/runtime-host.js';
import {
  checkSidebarAvailable,
  hasClaimedSidebarToday,
  isFromSidebar,
  markSidebarClaimedToday,
  navigateToSidebar,
} from '../monetize/rail.js';
import { RULES, APP_NAME } from '../board/grid-rules.js';
import {
  contains,
  drawText,
  roundRect,
  roundRectTwoTone,
  roundedPath,
} from './ink.js';
import {
  drawImageContain,
  drawImageCover,
  getSidebarAsset,
  preloadSidebarAssets,
} from './rail-assets.js';

const GIFT_SZ = 48;
const GIFT_HIT_PAD = 22;
const DW = 341;
const DH = 517;
const PANEL_SCREEN_W_RATIO = 0.9;
const PANEL_SCREEN_MARGIN_Y = 24;
const TOAST_LIFE = 2.2;
const PULSE_HZ = 4;
const PULSE_AMP = 0.08;
const GIFT_IMG_HF = 0.78;
const TOAST_WF = 0.78;
const TOAST_WCAP = 280;
const TOAST_HH = 40;
const TOAST_YF = 0.42;
const BODY_FONT =
  '"Source Han Sans", "Source Han Sans SC", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif';

export function sidebarRewardCounts() {
  return {
    revive: Math.max(1, Number(RULES.SIDEBAR_REWARD_REVIVE) || 2),
    refresh: Math.max(1, Number(RULES.SIDEBAR_REWARD_REFRESH) || 1),
  };
}

function hitBox(x, y, w, h) {
  return { x, y, w, h };
}

function scaleOf(box) {
  return box.w / DW;
}

function X(box, dx) {
  return box.x + dx * scaleOf(box);
}

function Y(box, dy) {
  return box.y + dy * scaleOf(box);
}

function paintLabel(ctx, text, x, y, size, color, align, weight, stroke, strokeWidth) {
  ctx.save();
  ctx.font = `${weight || 700} ${size}px ${BODY_FONT}`;
  drawText(ctx, text, x, y, size, color, align || 'center', weight || 700, stroke, strokeWidth);
  ctx.restore();
}

function paintStepBadge(ctx, box, num, cy) {
  const s = scaleOf(box);
  const x = X(box, 34);
  const r = 11 * s;
  ctx.beginPath();
  ctx.arc(x, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = '#C2251A';
  ctx.fill();
  paintLabel(ctx, String(num).padStart(2, '0'), x, cy + 0.4 * s, 12 * s, '#FFFFFF', 'center', 700);
  return x + r + 7 * s;
}

function paintStepTitle(ctx, box, num, prefix, cy, highlight) {
  const s = scaleOf(box);
  const tx = paintStepBadge(ctx, box, num, cy);
  const size = 15.5 * s;
  paintLabel(ctx, prefix, tx, cy, size, '#5C1A0C', 'left', 600);
  if (!highlight) return;
  ctx.save();
  ctx.font = `600 ${size}px ${BODY_FONT}`;
  const pw = ctx.measureText(prefix).width;
  ctx.restore();
  paintLabel(ctx, highlight, tx + pw, cy, size, '#E53935', 'left', 700);
}

function paintPlaceholder(ctx, box, dy, dh, assetKey) {
  const s = scaleOf(box);
  const x = X(box, 27);
  const y = Y(box, dy);
  const w = 290 * s;
  const h = dh * s;
  const r = 10 * s;
  roundRect(ctx, x, y, w, h, r, '#535353');
  const img = assetKey ? getSidebarAsset(assetKey) : null;
  if (!img) return;
  ctx.save();
  roundedPath(ctx, x, y, w, h, r);
  ctx.clip();
  drawImageCover(ctx, img, x, y, w, h);
  ctx.restore();
}

function paintCta(ctx, x, y, w, h) {
  const s = Math.max(0.55, h / 53);
  const r = Math.min(h * 0.36, w * 0.16);
  roundRect(ctx, x, y + 4 * s, w, h, r, '#A31E15');
  // 纯色三段替代渐变（真机 helium 渐变失真）
  roundRect(ctx, x, y, w, h, r, '#F05518');
  roundRect(ctx, x, y, w, h * 0.7, r, '#FA6A29');
  roundRect(ctx, x, y, w, h * 0.36, r, '#FF8A4A');
  roundRect(ctx, x, y, w, h, r, null, '#8D2B12', 1.5 * s);
  roundRect(
    ctx,
    x + 4 * s,
    y + 3 * s,
    w - 8 * s,
    h * 0.34,
    r * 0.65,
    'rgba(255,255,255,0.3)'
  );
  paintLabel(
    ctx,
    '去侧边栏',
    x + w / 2,
    y + h / 2 + 1 * s,
    Math.max(18, 25 * s),
    '#FFFFFF',
    'center',
    900,
    '#7B1E0C',
    Math.max(2.5, 3.2 * s)
  );
}

function paintReviveIcon(ctx, cx, cy, size) {
  const s = size;
  ctx.save();
  ctx.translate(cx, cy);
  roundRect(ctx, -s * 0.42, -s * 0.42, s * 0.84, s * 0.84, s * 0.18, '#FFE7B8', '#C47A28', 2);
  // 居中绿宝石（不再标「复」字）
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.24, 0, Math.PI * 2);
  ctx.fillStyle = '#2fb84a';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#0d5c22';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(-s * 0.07, -s * 0.08, s * 0.1, 0, Math.PI * 2);
  ctx.fillStyle = '#9dff8a';
  ctx.fill();
  ctx.restore();
}

function paintRefreshIcon(ctx, cx, cy, size) {
  const s = size;
  ctx.save();
  ctx.translate(cx, cy);
  roundRect(ctx, -s * 0.42, -s * 0.42, s * 0.84, s * 0.84, s * 0.18, '#FFE7B8', '#C47A28', 2);
  // 三个小木块示意刷新
  const unit = s * 0.22;
  const blocks = [
    [-unit * 0.9, -unit * 0.55],
    [unit * 0.15, -unit * 0.55],
    [-unit * 0.9, unit * 0.5],
  ];
  blocks.forEach((pos, i) => {
    roundRectTwoTone(ctx, pos[0], pos[1], unit, unit, unit * 0.18, '#ffc08a', '#d6702c', 0.5);
    roundRect(ctx, pos[0], pos[1], unit, unit, unit * 0.18, null, '#7f3a12', 1);
    if (i === 1) {
      ctx.beginPath();
      ctx.arc(pos[0] + unit / 2, pos[1] + unit / 2, unit * 0.22, 0, Math.PI * 2);
      ctx.fillStyle = '#2fd14a';
      ctx.fill();
    }
  });
  ctx.restore();
}

export function createSidebarEntry(opts = {}) {
  const st = {
    on: false,
    busy: false,
    modal: false,
    animT: 0,
    toast: '',
    toastT: 0,
    hits: {},
    box: null,
    onReward: typeof opts.onReward === 'function' ? opts.onReward : null,
    appName: opts.appName || APP_NAME,
    giftHideLabel: false,
  };

  function probe() {
    preloadSidebarAssets();
    if (getPlatform() !== 'douyin') {
      st.on = false;
      return;
    }
    checkSidebarAvailable().then((ok) => {
      st.on = !!ok;
    });
  }

  function layout(w, h, gift) {
    st.giftHideLabel = !!(gift && gift.hideLabel);
    const gw = gift && gift.w != null ? gift.w : gift && gift.size ? gift.size : GIFT_SZ;
    const gh = gift && gift.h != null ? gift.h : gift && gift.size ? gift.size : GIFT_SZ;
    const gx = gift && gift.x != null ? gift.x : 12;
    const gy = gift && gift.y != null ? gift.y : 80;
    const labelPad = st.giftHideLabel ? 0 : gw >= 44 ? GIFT_HIT_PAD : 4;
    st.hits.gift = st.on ? hitBox(gx, gy, gw, gh + labelPad) : null;

    let sideW = Math.min(w * PANEL_SCREEN_W_RATIO, w - 24);
    let sideH = sideW * (DH / DW);
    if (sideH > h - PANEL_SCREEN_MARGIN_Y * 2) {
      sideH = h - PANEL_SCREEN_MARGIN_Y * 2;
      sideW = sideH * (DW / DH);
    }
    const sideX = (w - sideW) / 2;
    const sideY = (h - sideH) / 2;
    st.box = { x: sideX, y: sideY, w: sideW, h: sideH };

    const s = sideW / DW;
    st.hits.close = null;
    st.hits.action = hitBox(sideX + 70 * s, sideY + 441 * s, 208 * s, 56 * s);
  }

  function update(dt) {
    st.animT += dt;
    if (st.toastT <= 0) return;
    st.toastT -= dt;
    if (st.toastT <= 0) st.toast = '';
  }

  function showToast(msg) {
    st.toast = msg;
    st.toastT = TOAST_LIFE;
  }

  function open() {
    if (st.modal || !st.on) return false;
    st.modal = true;
    return true;
  }

  function close() {
    st.modal = false;
  }

  function onAction() {
    if (st.busy) return;
    if (hasClaimedSidebarToday()) {
      showToast('今日已领取');
      return;
    }
    const rewards = sidebarRewardCounts();
    if (isFromSidebar()) {
      st.busy = true;
      markSidebarClaimedToday();
      if (st.onReward) st.onReward(rewards);
      st.busy = false;
      showToast(`已领取复活+${rewards.revive}、刷新×${rewards.refresh}`);
      close();
      return;
    }
    close();
    navigateToSidebar().catch((err) => {
      console.warn('[sidebar] navigateToScene fail', err);
      showToast('请从抖音首页侧边栏进入游戏');
    });
  }

  function handleTouch(x, y) {
    if (st.modal) {
      if (st.hits.close && contains(st.hits.close, x, y)) {
        close();
        return true;
      }
      if (st.hits.action && contains(st.hits.action, x, y)) {
        onAction();
        return true;
      }
      const box = st.box;
      if (box && (x < box.x || x > box.x + box.w || y < box.y || y > box.y + box.h)) {
        close();
      }
      return true;
    }
    if (st.hits.gift && contains(st.hits.gift, x, y)) {
      open();
      return true;
    }
    return false;
  }

  function drawGift(ctx) {
    const hit = st.hits.gift;
    if (!hit) return;
    const pulse = 1 + Math.sin(st.animT * PULSE_HZ) * PULSE_AMP;
    const iconH = st.giftHideLabel ? hit.h : hit.w;
    const dw = hit.w * pulse;
    const dh = iconH * pulse;
    const x = hit.x + (hit.w - dw) / 2;
    const y = hit.y + (iconH - dh) / 2;
    const giftImage = getSidebarAsset('iconGift');
    if (giftImage) {
      drawImageContain(ctx, giftImage, x, y, dw, dh * (st.giftHideLabel ? 1 : GIFT_IMG_HF));
    } else {
      roundRect(ctx, x, y, dw, dh, 14, '#E85D3A', '#fff', 2);
      paintLabel(ctx, '奖', x + dw / 2, y + dh / 2 - 2, 22, '#FFE066', 'center', 900);
    }
    if (!st.giftHideLabel) {
      paintLabel(ctx, '入口有奖', hit.x + hit.w / 2, hit.y + hit.w + 10, 11, '#5A2E12', 'center', 800, '#fff7d1', 3);
    }
  }

  function drawModal(ctx, w, h) {
    if (!st.modal || !st.box) return;
    const box = st.box;
    const rewards = sidebarRewardCounts();
    const s = scaleOf(box);

    ctx.fillStyle = 'rgba(24, 38, 60, 0.55)';
    ctx.fillRect(0, 0, w, h);

    const rOuter = 26 * s;
    roundRect(ctx, box.x, box.y + 4 * s, box.w, box.h, rOuter, 'rgba(180,80,0,0.22)');
    // 外框：纯色 + 顶部亮条替代渐变
    roundRect(ctx, box.x, box.y, box.w, box.h, rOuter, '#FF9800');
    roundRect(ctx, box.x, box.y, box.w, 90 * s, rOuter, '#FEB72A');
    roundRect(ctx, box.x, box.y, box.w, 48 * s, rOuter, '#FFC53D');
    roundRect(ctx, box.x, box.y, box.w, box.h, rOuter, null, '#FFB300', 1.2 * s);

    const inset = 8 * s;
    const headH = 45 * s;
    roundRect(
      ctx,
      box.x + inset,
      box.y + headH,
      box.w - inset * 2,
      box.h - headH - inset,
      18 * s,
      '#FFF7E0'
    );

    paintLabel(ctx, '侧边栏进入领奖励', box.x + box.w / 2, box.y + 22 * s, 21 * s, '#6B1C0C', 'center', 900);

    paintStepTitle(ctx, box, 1, '点击侧边栏图标', Y(box, 72));
    paintPlaceholder(ctx, box, 87, 82, 'sidebarGuide01');

    paintStepTitle(ctx, box, 2, '点击 ', Y(box, 196), st.appName);
    paintPlaceholder(ctx, box, 210, 106, 'sidebarGuide02');

    paintStepTitle(ctx, box, 3, '领取奖励', Y(box, 341));

    const iconSize = 64 * s;
    const iconY = Y(box, 352);
    const leftCx = X(box, 110);
    const rightCx = X(box, 232);
    paintReviveIcon(ctx, leftCx, iconY + iconSize / 2, iconSize);
    paintRefreshIcon(ctx, rightCx, iconY + iconSize / 2, iconSize);

    const labelY = iconY + iconSize + 2 * s;
    paintLabel(
      ctx,
      `复活×${rewards.revive}`,
      leftCx,
      labelY,
      16.5 * s,
      '#FFFFFF',
      'center',
      900,
      '#7B1E0C',
      3.5 * s
    );
    paintLabel(
      ctx,
      `刷新×${rewards.refresh}`,
      rightCx,
      labelY,
      16.5 * s,
      '#FFFFFF',
      'center',
      900,
      '#7B1E0C',
      3.5 * s
    );

    const btn = st.hits.action;
    if (btn) paintCta(ctx, btn.x, btn.y, btn.w, 53 * s);
  }

  function drawToast(ctx, w, h) {
    if (!st.toast || st.toastT <= 0) return;
    const tw = Math.min(w * TOAST_WF, TOAST_WCAP);
    const th = TOAST_HH;
    roundRect(ctx, (w - tw) / 2, h * TOAST_YF, tw, th, 12, 'rgba(44,58,82,0.88)');
    paintLabel(ctx, st.toast, w / 2, h * TOAST_YF + th / 2, 14, '#fff', 'center', 800);
  }

  function drawEntry(ctx) {
    drawGift(ctx);
  }

  function drawPopups(ctx, w, h) {
    drawModal(ctx, w, h);
    drawToast(ctx, w, h);
  }

  return {
    get on() {
      return st.on;
    },
    set on(v) {
      st.on = !!v;
    },
    get modal() {
      return st.modal;
    },
    probe,
    layout,
    update,
    showToast,
    open,
    close,
    handleTouch,
    hitsGift(x, y) {
      return !!(st.hits.gift && contains(st.hits.gift, x, y));
    },
    drawEntry,
    drawPopups,
  };
}

export default createSidebarEntry;
