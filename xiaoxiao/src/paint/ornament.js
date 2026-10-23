import { drawWoodBlock } from './grid-paint.js';

/** 启动页/首页四周散落的装饰方块（相对屏幕比例定位）。 */
const DECOR = [
  { x: 0.08, y: 0.1, cells: [[0, 0], [0, 1], [1, 1]], rot: -0.35, unit: 0.075, gem: 1 },
  { x: 0.7, y: 0.07, cells: [[0, 0], [1, 0], [2, 0]], rot: 0.5, unit: 0.06, gem: -1 },
  { x: 0.82, y: 0.3, cells: [[0, 0], [0, 1], [1, 0], [1, 1]], rot: 0.25, unit: 0.07, gem: 3 },
  { x: 0.05, y: 0.36, cells: [[0, 0], [1, 0], [1, 1], [1, 2]], rot: 0.15, unit: 0.058, gem: 0 },
  { x: 0.28, y: 0.47, cells: [[0, 0], [0, 1], [1, 1], [1, 2]], rot: -0.2, unit: 0.082, gem: 2 },
  { x: 0.78, y: 0.55, cells: [[0, 0], [0, 1]], rot: -0.6, unit: 0.07, gem: -1 },
];

export default function drawDecorBlocks(ctx, w, h, time) {
  const t = time || 0;
  for (let i = 0; i < DECOR.length; i += 1) {
    const item = DECOR[i];
    const unit = w * item.unit;
    const bob = Math.sin(t * 1.4 + i) * 4;
    ctx.save();
    ctx.translate(w * item.x, h * item.y + bob);
    ctx.rotate(item.rot + Math.sin(t * 0.8 + i) * 0.03);
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 6;
    for (let c = 0; c < item.cells.length; c += 1) {
      drawWoodBlock(ctx, item.cells[c][1] * unit, item.cells[c][0] * unit, unit * 0.94, c === item.gem);
    }
    ctx.restore();
  }
}
