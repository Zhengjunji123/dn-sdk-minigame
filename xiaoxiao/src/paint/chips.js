/**
 * 与 xiaoxiaolei-001 ui/draw.js 同签名的通用控件绘制（宝箱 / 协议页复用）。
 * 002 原有 ui/draw.js 保持不动，这里只补 001 风格的 opts 版文字与按钮。
 */
import { drawImageAsset } from './media.js';

const TXT_SIZE = 16;
const TXT_COLOR = '#222';
const STROKE_W = 3;
const FONT_FACE = 'sans-serif';
const SHADOW_DY = 5;
const SHADOW_FILL = 'rgba(48,31,18,0.28)';
const CIRCLE_DY = 4;
const CIRCLE_SHADE = 'rgba(45,31,20,0.24)';

export function HitArea(x, y, w, h) {
  this.x = x;
  this.y = y;
  this.w = w;
  this.h = h;
}

HitArea.prototype.contains = function contains(px, py) {
  return !(px < this.x || px > this.x + this.w || py < this.y || py > this.y + this.h);
};

/** 只建路径，不填充（调用方自行 fill / clip） */
export function roundPath(ctx, x, y, w, h, r) {
  const rad = Math.max(0, Math.min(r || 0, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

export function drawRoundRect(ctx, x, y, w, h, r, fill, stroke, lineWidth = 2) {
  roundPath(ctx, x, y, w, h, r);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (!stroke) return;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

/** opts 版文字：{ size, color, align, baseline, bold, weight, stroke, strokeWidth, font } */
export function drawLabel(ctx, text, x, y, opts = {}) {
  const size = opts.size != null ? opts.size : TXT_SIZE;
  const color = opts.color != null ? opts.color : TXT_COLOR;
  const align = opts.align != null ? opts.align : 'center';
  const baseline = opts.baseline != null ? opts.baseline : 'middle';
  const weight = opts.weight != null ? opts.weight : opts.bold ? 'bold' : 'normal';
  const stroke = opts.stroke != null ? opts.stroke : null;
  const strokeWidth = opts.strokeWidth != null ? opts.strokeWidth : STROKE_W;
  const font = opts.font != null ? opts.font : FONT_FACE;
  const str = String(text == null ? '' : text);

  ctx.save();
  ctx.font = `${weight} ${Math.max(1, size)}px ${font}`;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  if (stroke) {
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = stroke;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.miterLimit = 2;
    ctx.strokeText(str, x, y);
  }
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
  ctx.restore();
}

export function drawWrappedLabel(ctx, text, x, y, maxW, lineH, opts = {}) {
  ctx.font = `${opts.bold ? 'bold ' : ''}${opts.size || TXT_SIZE}px ${opts.font || FONT_FACE}`;
  const glyphs = String(text).split('');
  const rows = [];
  let buf = '';
  glyphs.forEach((ch) => {
    const trial = buf + ch;
    if (ctx.measureText(trial).width > maxW && buf) {
      rows.push(buf);
      buf = ch;
      return;
    }
    buf = trial;
  });
  if (buf) rows.push(buf);
  rows.forEach((row, i) => drawLabel(ctx, row, x, y + i * lineH, opts));
  return rows.length;
}

export function makeVerticalGradient(ctx, y, h, top, bottom) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  return g;
}

/** 成语填空 / 001 同款主按钮：厚描边 + 顶部弧形高光（宝箱「快速点击 / 立即领取」） */
export function drawMenuButton(ctx, x, y, w, h, text, colors, opts = {}) {
  const radius = opts.radius != null ? opts.radius : Math.min(18, h * 0.28);
  const lineW = opts.lineWidth || 5;
  const top = (colors && colors.top) || '#ffd24a';
  const bottom = (colors && colors.bottom) || '#f08a1c';
  const stroke = (colors && colors.stroke) || '#5c2a12';

  const g = makeVerticalGradient(ctx, y, h, top, bottom);
  roundPath(ctx, x, y, w, h, radius);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineW;
  ctx.stroke();

  const inset = lineW + 3;
  const ix = x + inset;
  const iy = y + inset;
  const iw = w - inset * 2;
  const ir = Math.max(3, radius - inset * 0.55);

  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = Math.max(1.5, h * 0.04);
  ctx.beginPath();
  ctx.arc(ix + ir, iy + ir, ir, Math.PI * 1.05, Math.PI * 1.5);
  ctx.lineTo(ix + iw - ir, iy);
  ctx.arc(ix + iw - ir, iy + ir, ir, Math.PI * 1.5, Math.PI * 1.72);
  ctx.stroke();
  ctx.restore();

  drawLabel(ctx, text, x + w / 2, y + h / 2 + 1, {
    size: opts.size || 22,
    bold: true,
    color: opts.color || '#fff',
    stroke: opts.textStroke === undefined ? '#4a220e' : opts.textStroke,
    strokeWidth: opts.strokeWidth == null ? 4 : opts.strokeWidth,
  });
}

/** 001 风格渐变按钮（协议 / 隐私弹窗） */
export function drawGradientButton(ctx, x, y, w, h, text, colors, opts = {}) {
  const radius = opts.radius || h / 2;
  const top = (colors && colors.top) || '#ffdf5f';
  const bottom = (colors && colors.bottom) || '#f8a62e';
  const stroke = (colors && colors.stroke) || '#5b2c18';
  if (opts.shadow !== false) {
    drawRoundRect(ctx, x, y + SHADOW_DY, w, h, radius, SHADOW_FILL, null);
  }
  const g = makeVerticalGradient(ctx, y, h, top, bottom);
  drawRoundRect(ctx, x, y, w, h, radius, g, stroke, opts.lineWidth || 4);
  ctx.save();
  roundPath(ctx, x + 8, y + 6, w - 16, h * 0.42, radius * 0.55);
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.fill();
  ctx.restore();
  drawLabel(ctx, text, x + w / 2, y + h / 2 + 1, {
    size: opts.size || 22,
    bold: true,
    color: opts.color || '#fff',
    stroke: opts.textStroke || '#1b1b1b',
    strokeWidth: opts.strokeWidth || 5,
  });
}

export function drawCircleButton(ctx, cx, cy, r, fill, stroke) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy + CIRCLE_DY, r, 0, Math.PI * 2);
  ctx.fillStyle = CIRCLE_SHADE;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = Math.max(2, r * 0.08);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawLightning(ctx, x, y, scale = 1, color = '#22c7ef') {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.beginPath();
  ctx.moveTo(-12, -22);
  ctx.lineTo(10, -22);
  ctx.lineTo(2, -2);
  ctx.lineTo(18, -2);
  ctx.lineTo(-6, 26);
  ctx.lineTo(1, 6);
  ctx.lineTo(-16, 6);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = '#0d5472';
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';
  ctx.stroke();
  ctx.restore();
}

/** 真机部分 ctx 无 ellipse：用 scale + arc 画椭圆 */
export function fillEllipse(ctx, cx, cy, rx, ry) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(Math.max(0.001, rx), Math.max(0.001, ry));
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, Math.PI * 2);
  ctx.restore();
  ctx.fill();
}

export { drawImageAsset };
