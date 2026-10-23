/**
 * 极简深色主题：色板 + 绘制原语（按钮 / 图标 / 抽屉 / 开关 / 进度环）。
 * 仍遵守真机约束：只用纯色字面量，不用 CanvasGradient。
 */
import { roundRect, roundedPath } from './ink.js';

export const TONE = Object.freeze({
  bg: '#101217',
  card: '#191C23',
  cardHi: '#20242C',
  cell: '#22262E',
  line: 'rgba(255,255,255,0.08)',
  lineStrong: 'rgba(255,255,255,0.16)',
  text: '#F3F0EA',
  sub: '#8C919C',
  faint: '#555A66',
  gold: '#D8B878',
  goldDeep: '#B8975A',
  goldSoft: 'rgba(216,184,120,0.16)',
  danger: '#E0786B',
  dangerSoft: 'rgba(224,120,107,0.18)',
  block: '#ECE7DD',
  blockTop: '#F8F5EF',
  blockEdge: '#C9C1B2',
  scrim: 'rgba(8,9,12,',
});

export const FONT = '"PingFang SC","Helvetica Neue","Microsoft YaHei",sans-serif';

export function fillScreen(ctx, w, h) {
  ctx.fillStyle = TONE.bg;
  ctx.fillRect(0, 0, w, h);
}

export function scrim(ctx, w, h, alpha) {
  ctx.fillStyle = `${TONE.scrim}${alpha == null ? 0.72 : alpha})`;
  ctx.fillRect(0, 0, w, h);
}

export function text(ctx, value, x, y, size, color, align, weight) {
  ctx.save();
  ctx.textAlign = align || 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${weight || 400} ${size}px ${FONT}`;
  ctx.fillStyle = color || TONE.text;
  ctx.fillText(String(value), x, y);
  ctx.restore();
}

/** 逐字绘制的字距文本（小程序 Canvas 不支持 letterSpacing）。 */
export function spacedText(ctx, value, x, y, size, color, spacing, align, weight) {
  const str = String(value);
  ctx.save();
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.font = `${weight || 500} ${size}px ${FONT}`;
  ctx.fillStyle = color || TONE.sub;
  const widths = [];
  let total = 0;
  for (let i = 0; i < str.length; i += 1) {
    const cw = ctx.measureText(str[i]).width;
    widths.push(cw);
    total += cw + (i < str.length - 1 ? spacing : 0);
  }
  let cx = x;
  if (align === 'center' || align == null) cx = x - total / 2;
  else if (align === 'right') cx = x - total;
  for (let i = 0; i < str.length; i += 1) {
    ctx.fillText(str[i], cx, y);
    cx += widths[i] + spacing;
  }
  ctx.restore();
  return total;
}

/**
 * 胶囊按钮：variant = 'gold'（主操作）| 'ghost'（次要）| 'line'（描边）| 'link'（纯文字）。
 */
export function pill(ctx, box, label, options) {
  if (!box) return;
  const opts = options || {};
  const variant = opts.variant || 'gold';
  const r = opts.radius == null ? box.h / 2 : opts.radius;
  ctx.save();
  if (opts.disabled) ctx.globalAlpha = 0.4;
  let color = TONE.text;
  if (variant === 'gold') {
    roundRect(ctx, box.x, box.y, box.w, box.h, r, TONE.gold);
    color = '#17181C';
  } else if (variant === 'sky') {
    roundRect(ctx, box.x, box.y, box.w, box.h, r, '#2f8dff');
    color = '#ffffff';
  } else if (variant === 'ghost') {
    roundRect(ctx, box.x, box.y, box.w, box.h, r, 'rgba(255,255,255,0.06)');
  } else if (variant === 'skyGhost') {
    roundRect(ctx, box.x, box.y, box.w, box.h, r, 'rgba(47,143,255,0.12)');
    color = '#2f6fbf';
  } else if (variant === 'line') {
    roundRect(ctx, box.x + 0.5, box.y + 0.5, box.w - 1, box.h - 1, r, null, TONE.lineStrong, 1);
  } else {
    color = TONE.sub;
  }
  text(
    ctx,
    label,
    box.x + box.w / 2,
    box.y + box.h / 2 + 0.5,
    opts.fontSize || 16,
    opts.color || color,
    'center',
    opts.weight || (variant === 'gold' || variant === 'sky' ? 600 : 500)
  );
  ctx.restore();
}

function strokeSetup(ctx, color, width) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

function arcArrow(ctx, cx, cy, r, start, end, ccw, head) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, start, end, !!ccw);
  ctx.stroke();
  const ex = cx + Math.cos(end) * r;
  const ey = cy + Math.sin(end) * r;
  const tangent = end + (ccw ? -Math.PI / 2 : Math.PI / 2);
  const back = tangent + Math.PI;
  ctx.beginPath();
  ctx.moveTo(ex + Math.cos(back + 0.55) * head, ey + Math.sin(back + 0.55) * head);
  ctx.lineTo(ex, ey);
  ctx.lineTo(ex + Math.cos(back - 0.55) * head, ey + Math.sin(back - 0.55) * head);
  ctx.stroke();
}

/** 线性图标：menu / refresh / restart / skip / close / check / home。 */
export function icon(ctx, kind, cx, cy, size, color) {
  const s = size;
  ctx.save();
  strokeSetup(ctx, color || TONE.text, Math.max(1.5, s * 0.085));
  if (kind === 'menu') {
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.32, cy - s * 0.14);
    ctx.lineTo(cx + s * 0.32, cy - s * 0.14);
    ctx.moveTo(cx - s * 0.32, cy + s * 0.14);
    ctx.lineTo(cx + s * 0.12, cy + s * 0.14);
    ctx.stroke();
  } else if (kind === 'refresh') {
    arcArrow(ctx, cx, cy, s * 0.3, -Math.PI * 0.35, Math.PI * 1.25, false, s * 0.16);
  } else if (kind === 'restart') {
    arcArrow(ctx, cx, cy, s * 0.3, -Math.PI * 0.65, -Math.PI * 2.25, true, s * 0.16);
  } else if (kind === 'skip') {
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.26, cy - s * 0.24);
    ctx.lineTo(cx + s * 0.1, cy);
    ctx.lineTo(cx - s * 0.26, cy + s * 0.24);
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + s * 0.26, cy - s * 0.24);
    ctx.lineTo(cx + s * 0.26, cy + s * 0.24);
    ctx.stroke();
  } else if (kind === 'close') {
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.22, cy - s * 0.22);
    ctx.lineTo(cx + s * 0.22, cy + s * 0.22);
    ctx.moveTo(cx + s * 0.22, cy - s * 0.22);
    ctx.lineTo(cx - s * 0.22, cy + s * 0.22);
    ctx.stroke();
  } else if (kind === 'check') {
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.26, cy + s * 0.02);
    ctx.lineTo(cx - s * 0.06, cy + s * 0.22);
    ctx.lineTo(cx + s * 0.28, cy - s * 0.2);
    ctx.stroke();
  } else if (kind === 'home') {
    ctx.beginPath();
    ctx.moveTo(cx - s * 0.3, cy - s * 0.02);
    ctx.lineTo(cx, cy - s * 0.3);
    ctx.lineTo(cx + s * 0.3, cy - s * 0.02);
    ctx.moveTo(cx - s * 0.2, cy - s * 0.1);
    ctx.lineTo(cx - s * 0.2, cy + s * 0.28);
    ctx.lineTo(cx + s * 0.2, cy + s * 0.28);
    ctx.lineTo(cx + s * 0.2, cy - s * 0.1);
    ctx.stroke();
  }
  ctx.restore();
}

/** 圆形描边图标按钮。 */
export function iconButton(ctx, box, kind, options) {
  if (!box) return;
  const opts = options || {};
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const r = Math.min(box.w, box.h) / 2;
  ctx.save();
  if (opts.disabled) ctx.globalAlpha = 0.4;
  ctx.beginPath();
  ctx.arc(cx, cy, r - 0.5, 0, Math.PI * 2);
  ctx.fillStyle = opts.fill || 'rgba(255,255,255,0.05)';
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = TONE.line;
  ctx.stroke();
  icon(ctx, kind, cx, cy, r * 1.05, opts.color || TONE.text);
  ctx.restore();
}

/** 进度环：track 底环 + 金色进度弧。 */
export function ring(ctx, cx, cy, r, ratio, width, color, track) {
  const lw = width || 3;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineWidth = lw;
  ctx.strokeStyle = track || TONE.line;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  const p = Math.max(0, Math.min(1, ratio || 0));
  if (p > 0) {
    ctx.strokeStyle = color || TONE.gold;
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p);
    ctx.stroke();
  }
  ctx.restore();
}

/** 开关：on 时金色底 + 右侧圆点。 */
export function toggle(ctx, box, on, theme) {
  const r = box.h / 2;
  const sky = theme === 'sky';
  roundRect(
    ctx,
    box.x,
    box.y,
    box.w,
    box.h,
    r,
    on ? (sky ? '#2f8dff' : TONE.gold) : (sky ? 'rgba(47,111,191,0.16)' : 'rgba(255,255,255,0.12)')
  );
  const knobR = r - 3;
  const kx = on ? box.x + box.w - r : box.x + r;
  ctx.beginPath();
  ctx.arc(kx, box.y + r, knobR, 0, Math.PI * 2);
  ctx.fillStyle = on ? (sky ? '#ffffff' : '#17181C') : (sky ? '#8fb4e0' : TONE.sub);
  ctx.fill();
}

/**
 * 底部抽屉：返回面板矩形。t ∈ [0,1] 为滑入进度。
 */
export function sheet(ctx, w, h, sheetH, t, bottomInset, theme) {
  const p = Math.max(0, Math.min(1, t));
  const sky = theme === 'sky';
  if (sky) {
    ctx.fillStyle = `rgba(30,80,150,${0.42 * p})`;
    ctx.fillRect(0, 0, w, h);
  } else {
    scrim(ctx, w, h, 0.62 * p);
  }
  const fullH = sheetH + (bottomInset || 0);
  const y = h - fullH * p;
  const r = 24;
  ctx.save();
  roundedPath(ctx, 0, y, w, fullH + r, r);
  ctx.fillStyle = sky ? '#ffffff' : TONE.card;
  ctx.fill();
  if (sky) {
    ctx.fillStyle = '#e8f4ff';
    ctx.fillRect(0, y, w, 36);
  }
  roundRect(
    ctx,
    w / 2 - 18,
    y + 10,
    36,
    4,
    2,
    sky ? 'rgba(47,111,191,0.22)' : 'rgba(255,255,255,0.14)'
  );
  ctx.restore();
  return { x: 0, y, w, h: sheetH };
}

/** 极简方块：象牙白圆角块 + 底边一道浅影，营造轻微厚度。 */
export function drawPlainBlock(ctx, x, y, s) {
  const r = Math.max(3, s * 0.2);
  roundRect(ctx, x, y, s, s, r, TONE.blockEdge);
  roundRect(ctx, x, y, s, s - Math.max(1.5, s * 0.07), r, TONE.block);
  roundRect(ctx, x + s * 0.16, y + s * 0.12, s * 0.68, Math.max(1, s * 0.06), s * 0.03, TONE.blockTop);
}

export default {
  TONE,
  FONT,
  fillScreen,
  scrim,
  text,
  spacedText,
  pill,
  icon,
  iconButton,
  ring,
  toggle,
  sheet,
  drawPlainBlock,
};
