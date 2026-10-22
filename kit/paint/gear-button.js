/**
 * Canvas 设置齿轮按钮（对齐 xiaoxiaolei-002 drawGearButton）。
 */

const DEFAULT_CREAM = '#F6E7C8';

export function drawGearButton(ctx, box, colors) {
  if (!ctx || !box) return;
  const cream = (colors && colors.cream) || DEFAULT_CREAM;
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
  ctx.fillStyle = cream;
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
