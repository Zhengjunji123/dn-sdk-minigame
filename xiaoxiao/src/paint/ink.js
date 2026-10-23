/**
 * 木质主题绘制。
 *
 * 真机（抖音 helium 引擎）对 CanvasGradient 填充的渲染与 IDE 不一致：
 * IDE 里橙色渐变木块在真机上几乎变成深褐色。为了让真机与 IDE 色调完全一致，
 * 这里所有大面积填充全部改为“硬编码纯色 + 分层叠色”，不再使用任何渐变对象，
 * 也不做运行时算色。IDE 和真机走同一套字面量色值。
 */

export const COLORS = Object.freeze({
  woodLight: '#c7823f',
  woodMid: '#a9652c',
  woodDark: '#7e4519',
  woodSeam: 'rgba(60,28,8,0.55)',
  board: '#241b16',
  boardEdge: '#5c3a1f',
  grid: 'rgba(255,255,255,0.06)',
  text: '#ffffff',
  textDark: '#4a2a12',
  cream: '#fff1d6',
  muted: 'rgba(255,241,214,0.72)',
  orange: '#ff9a2e',
  orangeDeep: '#e2641a',
  blue: '#4aa7ff',
  blueDeep: '#2d7fe0',
  gemLight: '#a5ff8a',
  gem: '#2fd14a',
  gemDark: '#137a2a',
  danger: '#ff4d5e',
  gold: '#ffd75a',
});

/** 绘制用到的零散硬编码色（全部纯色字面量） */
export const PAINT = Object.freeze({
  titleStroke: '#5a2a86',
  titleFill: '#ffc63a',
  titleShine: '#fff3a0',
  btnOrangeTop: '#ffb84d',
  btnBlueTop: '#7cc4ff',
  btnGreenTop: '#8dff6a',
  btnOrangeShade: '#a83f0f',
  btnBlueShade: '#1c5aa8',
  btnGreenShade: '#1f7a18',
  btnGreenMid: '#4fd63a',
  btnGreenDeep: '#2db028',
  bannerOuter: '#7a2a12',
  bannerTop: '#d8582a',
  bannerBottom: '#a63c19',
  bannerEdge: 'rgba(255,200,150,0.18)',
  bannerPill: '#4b1a0a',
  bannerPillStroke: 'rgba(255,190,120,0.35)',
  panelRim: '#9fd4ff',
  panelFace: '#e9f5ff',
  panelFaceTop: '#f6fbff',
  // 木块：外圈中间色 / 左上亮边 / 右下暗边 / 内面上半 / 内面下半
  woodRim: '#e08a42',
  woodRimLight: '#f7c08a',
  woodRimDark: '#b86a32',
  woodFaceTop: '#f5a86a',
  woodFaceBottom: '#e08440',
  woodSocket: '#e6d3a4',
  woodSocketEdge: '#a6844c',
  cellEmpty: '#19120e',
  chip0: '#f3a05f',
  chip1: '#d9782f',
  chip2: '#a8501c',
  chip3: '#ffc08a',
  spark0: '#fff6c8',
  spark1: '#ffd75a',
  spark2: '#ffb347',
  spark3: '#ffffff',
  gemSpark0: '#ffffff',
  gemSpark1: '#c9ffb0',
  gemSpark2: '#7dff7a',
  gemSpark3: '#e8ffd6',
  plankTintA: 'rgba(255,190,120,0.07)',
  plankTintB: 'rgba(40,15,0,0.08)',
  plankHighlight: 'rgba(255,220,170,0.12)',
  plankGrain: 'rgba(70,32,10,0.16)',
});

/** 背景纵向色带：从上到下 12 段（替代 woodLight→woodMid→woodDark 渐变），全部字面量。 */
const BACKGROUND_BANDS = Object.freeze([
  '#c4803d', '#c07b3a', '#ba7637', '#b67134', '#b06c31', '#ac672e',
  '#a5622a', '#9e5d27', '#975824', '#905221', '#894d1e', '#82481b',
]);

/** 暗角：用几层低透明度纯色条替代径向渐变。 */
const VIGNETTE_TOP = Object.freeze(['rgba(30,10,0,0.10)', 'rgba(30,10,0,0.06)']);
const VIGNETTE_BOTTOM = Object.freeze(['rgba(30,10,0,0.06)', 'rgba(30,10,0,0.10)', 'rgba(30,10,0,0.16)', 'rgba(30,10,0,0.22)']);
const VIGNETTE_SIDE = 'rgba(30,10,0,0.08)';

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function roundedPath(ctx, x, y, w, h, radius) {
  const r = Math.max(0, Math.min(radius || 0, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

export function roundRect(ctx, x, y, w, h, radius, fill, stroke, lineWidth) {
  roundedPath(ctx, x, y, w, h, radius);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.lineWidth = lineWidth || 1;
    ctx.strokeStyle = stroke;
    ctx.stroke();
  }
}

/**
 * 两段式立体圆角：整块用 bottom 色，上半贴一块 top 色圆角板。
 * 用纯色替代竖向渐变，IDE / 真机渲染结果一致。
 */
export function roundRectTwoTone(ctx, x, y, w, h, radius, top, bottom, split) {
  roundRect(ctx, x, y, w, h, radius, bottom);
  const ratio = split == null ? 0.5 : split;
  roundRect(ctx, x, y, w, Math.max(1, h * ratio), radius, top);
}

let _bgCache = null;
let _bgCacheKey = '';

function paintBackgroundRaw(ctx, w, h) {
  const bandH = h / BACKGROUND_BANDS.length;
  for (let i = 0; i < BACKGROUND_BANDS.length; i += 1) {
    ctx.fillStyle = BACKGROUND_BANDS[i];
    ctx.fillRect(0, Math.floor(i * bandH), w, Math.ceil(bandH) + 1);
  }

  const plankW = Math.max(72, w / 4.2);
  const count = Math.ceil(w / plankW) + 1;
  for (let i = 0; i < count; i += 1) {
    const x = i * plankW - plankW * 0.35;
    ctx.fillStyle = i % 2 === 0 ? PAINT.plankTintA : PAINT.plankTintB;
    ctx.fillRect(x, 0, plankW, h);
    ctx.fillStyle = COLORS.woodSeam;
    ctx.fillRect(x, 0, 2, h);
    ctx.fillStyle = PAINT.plankHighlight;
    ctx.fillRect(x + 2, 0, 1, h);
    // 木纹只画一条直线，避免每帧多条贝塞尔
    ctx.strokeStyle = PAINT.plankGrain;
    ctx.lineWidth = 1;
    const gx = x + plankW * 0.45;
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx + 6, h);
    ctx.stroke();
  }

  const topStep = h * 0.05;
  for (let i = 0; i < VIGNETTE_TOP.length; i += 1) {
    ctx.fillStyle = VIGNETTE_TOP[i];
    ctx.fillRect(0, i * topStep, w, topStep + 1);
  }
  const bottomStep = h * 0.07;
  for (let i = 0; i < VIGNETTE_BOTTOM.length; i += 1) {
    ctx.fillStyle = VIGNETTE_BOTTOM[i];
    const y = h - bottomStep * (VIGNETTE_BOTTOM.length - i);
    ctx.fillRect(0, y, w, bottomStep + 1);
  }
  ctx.fillStyle = VIGNETTE_SIDE;
  ctx.fillRect(0, 0, w * 0.06, h);
  ctx.fillRect(w - w * 0.06, 0, w * 0.06, h);
}

/** 木板背景：离屏缓存，避免每帧重画木纹。 */
export function drawBackground(ctx, w, h) {
  const dpr = (typeof GameGlobal !== 'undefined' && GameGlobal.pixelRatio) || 1;
  const key = `${Math.round(w)}x${Math.round(h)}@${dpr}`;
  if (!_bgCache || _bgCacheKey !== key) {
    const host =
      (typeof wx !== 'undefined' && wx) ||
      (typeof tt !== 'undefined' && tt) ||
      null;
    const surface =
      host && typeof host.createCanvas === 'function' ? host.createCanvas() : null;
    if (surface) {
      surface.width = Math.max(1, Math.round(w * dpr));
      surface.height = Math.max(1, Math.round(h * dpr));
      const sctx = surface.getContext('2d');
      sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paintBackgroundRaw(sctx, w, h);
      _bgCache = surface;
      _bgCacheKey = key;
    } else {
      paintBackgroundRaw(ctx, w, h);
      return;
    }
  }
  ctx.drawImage(_bgCache, 0, 0, w, h);
}

export function drawText(ctx, text, x, y, size, color, align, weight, stroke, strokeWidth) {
  ctx.save();
  ctx.textAlign = align || 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${weight || 500} ${size || 16}px sans-serif`;
  if (stroke) {
    ctx.lineJoin = 'round';
    ctx.lineWidth = strokeWidth || Math.max(2, (size || 16) * 0.16);
    ctx.strokeStyle = stroke;
    ctx.strokeText(String(text), x, y);
  }
  ctx.fillStyle = color || COLORS.text;
  ctx.fillText(String(text), x, y);
  ctx.restore();
}

/** 标题字：金黄纯色 + 深色描边 + 投影 + 上缘高光。 */
export function drawTitle(ctx, text, x, y, size, rotate) {
  ctx.save();
  ctx.translate(x, y);
  if (rotate) ctx.rotate(rotate);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${size}px sans-serif`;
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(40,10,0,0.45)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 4;
  ctx.lineWidth = size * 0.2;
  ctx.strokeStyle = PAINT.titleStroke;
  ctx.strokeText(String(text), 0, 0);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = PAINT.titleFill;
  ctx.fillText(String(text), 0, 0);
  // 上缘高光：用裁剪把浅金色只画在上半部分
  ctx.save();
  ctx.beginPath();
  ctx.rect(-size * 6, -size, size * 12, size * 0.68);
  ctx.clip();
  ctx.fillStyle = PAINT.titleShine;
  ctx.fillText(String(text), 0, 0);
  ctx.restore();
  ctx.restore();
}

/** 倾斜后的半宽 / 半高，含描边，用来保证两行标题不相交。 */
function titleHalfBox(size, chars, angle) {
  const textW = size * Math.max(1, chars);
  const a = Math.abs(angle || 0);
  const pad = size * 0.16;
  return {
    halfW: (textW / 2) * Math.cos(a) + (size / 2) * Math.sin(a) + pad,
    halfH: (textW / 2) * Math.sin(a) + (size / 2) * Math.cos(a) + pad,
  };
}

/**
 * 把名字拆成上下两行：上一行略大、向左倾，下一行略小、向右倾。
 * 两行按实际占位拉开，描边和倾斜后也不相交。
 * 名字不足 4 个字时保持一行，只给一点倾斜。
 */
export function drawPlayfulTitle(ctx, text, cx, cy, screenW) {
  const name = String(text || '');
  const w = Math.max(1, Number(screenW) || 375);
  const margin = 12;
  if (name.length < 4) {
    const size = Math.min(56, (w - margin * 2) / Math.max(1, name.length));
    drawTitle(ctx, name, cx, cy, size, -0.05);
    return;
  }
  const head = name.slice(0, 2);
  const tail = name.slice(2);
  const headRot = -0.07;
  const tailRot = 0.045;
  let headSize = Math.min(56, w * 0.14);
  let tailSize = Math.min(40, w * 0.1);
  const fit = (size, chars) => {
    const box = titleHalfBox(size, chars, 0);
    const limit = (w - margin * 2) / 2;
    return box.halfW > limit ? size * (limit / box.halfW) : size;
  };
  headSize = fit(headSize, head.length);
  tailSize = fit(tailSize, tail.length);
  const headBox = titleHalfBox(headSize, head.length, headRot);
  const tailBox = titleHalfBox(tailSize, tail.length, tailRot);
  const gap = 0;
  const headY = cy - (tailBox.halfH + gap) / 2;
  const tailY = headY + headBox.halfH + gap + tailBox.halfH;
  const headShift = Math.min(w * 0.035, Math.max(0, cx - margin - headBox.halfW));
  const tailShift = Math.min(w * 0.03, Math.max(0, w - margin - cx - tailBox.halfW));
  drawTitle(ctx, head, cx - headShift, headY, headSize, headRot);
  drawTitle(ctx, tail, cx + tailShift, tailY, tailSize, tailRot);
}

/**
 * 立体按钮：默认橙色；opts.variant = 'ghost' | 'blue' | 'orange' | 'green'。
 */
export function drawButton(ctx, box, label, options) {
  const opts = options || {};
  const variant = opts.variant || 'orange';
  const radius = opts.radius == null ? box.h / 2 : opts.radius;
  const depth = variant === 'ghost' ? 0 : Math.max(3, box.h * 0.09);
  ctx.save();
  if (variant === 'ghost') {
    roundRect(ctx, box.x, box.y, box.w, box.h, radius, opts.fill || 'rgba(0,0,0,0.22)', 'rgba(255,255,255,0.28)', 1.5);
  } else {
    const palette =
      variant === 'blue'
        ? { top: PAINT.btnBlueTop, mid: COLORS.blue, bottom: COLORS.blueDeep, shade: PAINT.btnBlueShade }
        : variant === 'green'
          ? { top: '#b6ff78', mid: '#7af03c', bottom: '#3ed028', shade: '#1f8a14' }
          : variant === 'coral'
            ? { top: '#ff9a62', mid: '#ff6a32', bottom: '#ef4a18', shade: '#c43a10' }
            : { top: PAINT.btnOrangeTop, mid: COLORS.orange, bottom: COLORS.orangeDeep, shade: PAINT.btnOrangeShade };
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 4;
    roundRect(ctx, box.x, box.y + depth, box.w, box.h, radius, palette.shade);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    // 三段纯色：底色 deep → 中段 mid → 顶部 top
    roundRect(ctx, box.x, box.y, box.w, box.h, radius, palette.bottom);
    roundRect(ctx, box.x, box.y, box.w, box.h * 0.72, radius, palette.mid);
    roundRect(ctx, box.x, box.y, box.w, box.h * 0.42, radius, palette.top);
    roundRect(ctx, box.x + box.w * 0.08, box.y + box.h * 0.12, box.w * 0.84, box.h * 0.26, box.h * 0.13, 'rgba(255,255,255,0.28)');
    // 绿色主按钮加白边，贴近首页参考稿
    if (variant === 'green' || variant === 'coral' || variant === 'orange' || opts.rim) {
      roundRect(ctx, box.x, box.y, box.w, box.h, radius, null, 'rgba(255,255,255,0.95)', 3);
    }
  }
  ctx.restore();
  drawText(
    ctx,
    label,
    box.x + box.w / 2,
    box.y + box.h / 2,
    opts.fontSize || 18,
    opts.color || COLORS.text,
    'center',
    opts.weight || 800,
    variant === 'ghost' ? null : variant === 'green' ? 'rgba(20,80,10,0.4)' : 'rgba(90,30,0,0.45)',
    2
  );
  return box;
}

/** 浅色弹窗面板（“没位置啦”风格）。 */
export function drawPanel(ctx, box) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 20;
  ctx.shadowOffsetY = 8;
  roundRect(ctx, box.x, box.y, box.w, box.h, box.radius || 24, PAINT.panelRim);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  const r = (box.radius || 24) - 4;
  roundRectTwoTone(ctx, box.x + 5, box.y + 5, box.w - 10, box.h - 10, r, PAINT.panelFaceTop, PAINT.panelFace, 0.45);
  ctx.restore();
}

/** 深红木横幅（“关卡目标”风格）。 */
export function drawBanner(ctx, box, title) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = PAINT.bannerOuter;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  const innerH = box.h - 12;
  ctx.fillStyle = PAINT.bannerBottom;
  ctx.fillRect(box.x, box.y + 6, box.w, innerH);
  ctx.fillStyle = PAINT.bannerTop;
  ctx.fillRect(box.x, box.y + 6, box.w, innerH * 0.5);
  ctx.fillStyle = PAINT.bannerEdge;
  ctx.fillRect(box.x, box.y + 6, box.w, 3);
  ctx.restore();
  if (title) {
    const pill = { x: box.x + box.w / 2 - 74, y: box.y + 18, w: 148, h: 34 };
    roundRect(ctx, pill.x, pill.y, pill.w, pill.h, 17, PAINT.bannerPill, PAINT.bannerPillStroke, 1.5);
    drawText(ctx, title, pill.x + pill.w / 2, pill.y + pill.h / 2, 16, COLORS.cream, 'center', 800);
  }
}

/** 绿宝石：菱形纯色 + 左上亮面 / 右下暗面 + 高光（无渐变）。 */
export function drawGem(ctx, cx, cy, size, alpha) {
  const half = size / 2;
  ctx.save();
  ctx.globalAlpha = alpha == null ? 1 : alpha;
  // 主体
  ctx.beginPath();
  ctx.moveTo(cx, cy - half);
  ctx.lineTo(cx + half, cy);
  ctx.lineTo(cx, cy + half);
  ctx.lineTo(cx - half, cy);
  ctx.closePath();
  ctx.fillStyle = COLORS.gem;
  ctx.fill();
  // 左上亮面（上顶点-左顶点-中心）
  ctx.beginPath();
  ctx.moveTo(cx, cy - half);
  ctx.lineTo(cx - half, cy);
  ctx.lineTo(cx, cy);
  ctx.closePath();
  ctx.fillStyle = COLORS.gemLight;
  ctx.fill();
  // 右下暗面（右顶点-下顶点-中心）
  ctx.beginPath();
  ctx.moveTo(cx + half, cy);
  ctx.lineTo(cx, cy + half);
  ctx.lineTo(cx, cy);
  ctx.closePath();
  ctx.fillStyle = COLORS.gemDark;
  ctx.fill();
  // 外描边
  ctx.beginPath();
  ctx.moveTo(cx, cy - half);
  ctx.lineTo(cx + half, cy);
  ctx.lineTo(cx, cy + half);
  ctx.lineTo(cx - half, cy);
  ctx.closePath();
  ctx.lineWidth = Math.max(1, size * 0.07);
  ctx.strokeStyle = 'rgba(10,60,20,0.8)';
  ctx.stroke();
  // 内菱形
  ctx.beginPath();
  ctx.moveTo(cx, cy - half * 0.5);
  ctx.lineTo(cx + half * 0.5, cy);
  ctx.lineTo(cx, cy + half * 0.5);
  ctx.lineTo(cx - half * 0.5, cy);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fill();
  // 高光点
  ctx.beginPath();
  ctx.arc(cx - half * 0.32, cy - half * 0.32, Math.max(1, size * 0.09), 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fill();
  ctx.restore();
}

/**
 * 方块上的立体冰壳：厚边框 + 霜面 + 高光/暗边 + 裂纹。
 * 纯色叠层，避免真机 CanvasGradient 色差。
 */
export function drawIceOverlay(ctx, x, y, size, alpha) {
  const pad = size * 0.02;
  const s = size - pad * 2;
  const ox = x + pad;
  const oy = y + pad;
  const r = Math.max(4, s * 0.2);
  const rim = Math.max(2.5, size * 0.08);
  ctx.save();
  ctx.globalAlpha = alpha == null ? 1 : alpha;

  // 外圈投影，垫出厚度
  roundRect(ctx, ox + 1, oy + 2, s, s, r, 'rgba(40,90,160,0.28)');

  // 外框：深蓝立体边
  roundRect(ctx, ox, oy, s, s, r, '#7ec8ff', '#eaf7ff', rim);

  // 内霜面：半透蓝白，仍能透出底下猫脸/白块
  const inset = rim * 0.85;
  const ix = ox + inset;
  const iy = oy + inset;
  const isz = s - inset * 2;
  const ir = Math.max(2, r - inset * 0.6);
  roundRect(ctx, ix, iy, isz, isz, ir, 'rgba(190,235,255,0.55)');
  // 下半偏冷蓝，增强体积感
  roundRect(ctx, ix, iy + isz * 0.45, isz, isz * 0.55, ir, 'rgba(110,190,245,0.32)');

  // 左上高光斜面
  roundRect(ctx, ix + isz * 0.06, iy + isz * 0.06, isz * 0.55, isz * 0.2, ir * 0.45, 'rgba(255,255,255,0.55)');
  roundRect(ctx, ix + isz * 0.08, iy + isz * 0.1, isz * 0.28, isz * 0.1, ir * 0.35, 'rgba(255,255,255,0.7)');

  // 右下内阴影
  roundRect(
    ctx,
    ix + isz * 0.35,
    iy + isz * 0.72,
    isz * 0.58,
    isz * 0.2,
    ir * 0.4,
    'rgba(40,120,190,0.22)'
  );

  // 亮描边再描一圈，轮廓更清楚
  roundRect(ctx, ox, oy, s, s, r, null, 'rgba(255,255,255,0.95)', Math.max(1.5, size * 0.04));
  roundRect(ctx, ix, iy, isz, isz, ir, null, 'rgba(120,190,240,0.65)', Math.max(1, size * 0.025));

  // 裂纹：白亮线 + 浅蓝暗线叠出立体缝
  const crack = (drawFn) => {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(60,130,190,0.55)';
    ctx.lineWidth = Math.max(1.6, size * 0.045);
    ctx.beginPath();
    drawFn();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.92)';
    ctx.lineWidth = Math.max(1, size * 0.028);
    ctx.beginPath();
    drawFn();
    ctx.stroke();
  };
  crack(() => {
    ctx.moveTo(ix + isz * 0.18, iy + isz * 0.32);
    ctx.lineTo(ix + isz * 0.42, iy + isz * 0.5);
    ctx.lineTo(ix + isz * 0.78, iy + isz * 0.36);
  });
  crack(() => {
    ctx.moveTo(ix + isz * 0.38, iy + isz * 0.5);
    ctx.lineTo(ix + isz * 0.5, iy + isz * 0.78);
  });
  crack(() => {
    ctx.moveTo(ix + isz * 0.55, iy + isz * 0.22);
    ctx.lineTo(ix + isz * 0.68, iy + isz * 0.58);
  });

  // 角上冰晶小点
  const spark = (sx, sy, rad) => {
    ctx.beginPath();
    ctx.arc(sx, sy, rad, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fill();
  };
  spark(ix + isz * 0.16, iy + isz * 0.18, Math.max(1.2, size * 0.04));
  spark(ix + isz * 0.82, iy + isz * 0.24, Math.max(1, size * 0.03));
  spark(ix + isz * 0.28, iy + isz * 0.78, Math.max(1, size * 0.028));

  ctx.restore();
}

export function drawCloseButton(ctx, box) {
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const r = Math.min(box.w, box.h) / 2;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.danger;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
  ctx.lineWidth = Math.max(3, r * 0.22);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.38, cy - r * 0.38);
  ctx.lineTo(cx + r * 0.38, cy + r * 0.38);
  ctx.moveTo(cx + r * 0.38, cy - r * 0.38);
  ctx.lineTo(cx - r * 0.38, cy + r * 0.38);
  ctx.stroke();
  ctx.restore();
}

/** 设置齿轮按钮。 */
export function drawGearButton(ctx, box) {
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  const r = Math.min(box.w, box.h) / 2;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(70,35,12,0.55)';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,220,170,0.5)';
  ctx.stroke();
  ctx.translate(cx, cy);
  ctx.fillStyle = COLORS.cream;
  const teeth = 8;
  for (let i = 0; i < teeth; i += 1) {
    ctx.save();
    ctx.rotate((i / teeth) * Math.PI * 2);
    ctx.fillRect(-r * 0.13, -r * 0.62, r * 0.26, r * 0.28);
    ctx.restore();
  }
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.42, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.18, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(70,35,12,0.9)';
  ctx.fill();
  ctx.restore();
}

export function contains(box, x, y) {
  return !!box && x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h;
}

export function touchPoint(event, changed) {
  const list = changed ? event && event.changedTouches : event && event.touches;
  const touch = (list && list[0]) ||
    (event && event.changedTouches && event.changedTouches[0]) ||
    (event && event.touches && event.touches[0]);
  if (!touch) return null;
  return {
    x: touch.clientX != null ? touch.clientX : touch.pageX != null ? touch.pageX : touch.x || 0,
    y: touch.clientY != null ? touch.clientY : touch.pageY != null ? touch.pageY : touch.y || 0,
  };
}

export function drawOverlay(ctx, w, h, alpha) {
  ctx.fillStyle = `rgba(20,8,0,${alpha == null ? 0.7 : alpha})`;
  ctx.fillRect(0, 0, w, h);
}
