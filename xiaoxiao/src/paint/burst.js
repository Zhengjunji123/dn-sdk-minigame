import { BOARD_COLS, BOARD_ROWS, CELL } from '../board/grid-rules.js';
import { BLANK_TILE_SKIN } from '../board/grid-rules.js';
import { boardCellPosition, drawWoodBlock } from './grid-paint.js';
import { roundRect } from './ink.js';

const CHIP_COLORS = ['#ECE7DD', '#D8B878', '#C9C1B2', '#F8F5EF'];
const SPARK_COLORS = ['#FFFFFF', '#F3E3BF', '#D8B878', '#ECE7DD'];
const GEM_SPARK_COLORS = ['#FFFFFF', '#F3E3BF', '#D8B878', '#FFF6E2'];

function cellKey(row, col) {
  return row * BOARD_COLS + col;
}

function pseudo(seed) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * 构建一次消行的“爆裂”动画数据：
 * - debris：整块木块被炸飞（带旋转、重力、淡出）
 * - chips：木屑碎片
 * - sparks：亮色火花
 * - lines：白闪 + 冲击波用的行列信息
 */
const ICE_SPARK_COLORS = ['#ffffff', '#d8f0ff', '#a8d8ff', '#eef8ff'];

export function buildClearBurst(boardBefore, result, layout, skinsBefore) {
  const rows = result.clearedRows || [];
  const cols = result.clearedCols || [];
  if (!rows.length && !cols.length) return null;

  const peeledKeys = new Set(
    (result.peeledCells || []).map((cell) => cellKey(cell.row, cell.col))
  );

  const cells = {};
  const skinMap = {};
  const remember = (row, col) => {
    // 剥冰格留在盘上，不进爆裂遮罩
    if (peeledKeys.has(cellKey(row, col))) return;
    let value = boardBefore[row][col];
    if (value === CELL.EMPTY) {
      const placed = (result.placed || []).find((cell) => cell.row === row && cell.col === col);
      value = placed && placed.gem ? CELL.GEM : CELL.WOOD;
    }
    const key = cellKey(row, col);
    cells[key] = value;
    const skin = skinsBefore && skinsBefore[row] ? skinsBefore[row][col] : BLANK_TILE_SKIN;
    skinMap[key] = skin == null ? BLANK_TILE_SKIN : skin;
  };
  rows.forEach((row) => {
    for (let col = 0; col < BOARD_COLS; col += 1) remember(row, col);
  });
  cols.forEach((col) => {
    for (let row = 0; row < BOARD_ROWS; row += 1) remember(row, col);
  });

  const lineCount = rows.length + cols.length;
  const power = Math.min(2.2, 1 + (lineCount - 1) * 0.45);
  const debris = [];
  const chips = [];
  const sparks = [];
  const iceSparks = [];
  const midRow = (BOARD_ROWS - 1) / 2;
  const midCol = (BOARD_COLS - 1) / 2;
  const centerRow = rows.length ? rows.reduce((a, b) => a + b, 0) / rows.length : midRow;
  const centerCol = cols.length ? cols.reduce((a, b) => a + b, 0) / cols.length : midCol;

  Object.keys(cells).forEach((key, index) => {
    const row = Math.floor(Number(key) / BOARD_COLS);
    const col = Number(key) % BOARD_COLS;
    const pos = boardCellPosition(layout, row, col);
    const cx = pos.x + layout.cell / 2;
    const cy = pos.y + layout.cell / 2;
    const inRow = rows.includes(row);
    const inCol = cols.includes(col);

    // 方向：所在行的块左右炸开、所在列的块上下炸开；交叉点随机斜向。
    let dirX = 0;
    let dirY = 0;
    if (inRow) dirX += Math.sign(col - midCol || 1) * (0.5 + Math.abs(col - midCol) / midCol);
    if (inCol) dirY += Math.sign(row - midRow || 1) * (0.5 + Math.abs(row - midRow) / midRow);
    if (inRow && inCol) {
      dirX += (pseudo(index * 3.1) - 0.5) * 2;
      dirY += (pseudo(index * 5.7) - 0.5) * 2;
    }
    const speed = (220 + pseudo(index * 1.7) * 160) * power;
    const value = cells[key];
    debris.push({
      x: cx,
      y: cy,
      vx: dirX * speed + (pseudo(index * 2.3) - 0.5) * 120,
      vy: dirY * speed - 260 * power - pseudo(index * 4.1) * 140,
      rot: 0,
      spin: (pseudo(index * 6.3) - 0.5) * 18,
      gem: value === CELL.GEM || value === CELL.ICE_GEM,
      skin: skinMap[cellKey(row, col)] == null ? BLANK_TILE_SKIN : skinMap[cellKey(row, col)],
      size: layout.cell,
      delay: Math.min(0.12, Math.abs(inRow ? col - centerCol : row - centerRow) * 0.014),
    });

    const chipCount = 4 + Math.round(power);
    for (let n = 0; n < chipCount; n += 1) {
      const angle = pseudo(index * 9.1 + n * 1.3) * Math.PI * 2;
      const chipSpeed = (120 + pseudo(index + n * 2.9) * 220) * power;
      chips.push({
        x: cx + (pseudo(n * 7.7 + index) - 0.5) * layout.cell * 0.6,
        y: cy + (pseudo(n * 3.3 + index) - 0.5) * layout.cell * 0.6,
        vx: Math.cos(angle) * chipSpeed,
        vy: Math.sin(angle) * chipSpeed - 160 * power,
        rotation: angle,
        spin: (pseudo(n + index * 0.7) - 0.5) * 16,
        life: 1,
        size: layout.cell * (0.12 + pseudo(index * 1.9 + n) * 0.16),
        color: CHIP_COLORS[(index + n) % CHIP_COLORS.length],
      });
    }

    const sparkCount = 3 + Math.round(power * 2);
    for (let n = 0; n < sparkCount; n += 1) {
      const angle = pseudo(index * 4.4 + n * 2.1) * Math.PI * 2;
      const sparkSpeed = (260 + pseudo(index * 0.3 + n) * 320) * power;
      sparks.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * sparkSpeed,
        vy: Math.sin(angle) * sparkSpeed,
        life: 1,
        decay: 1.6 + pseudo(index + n * 1.1) * 1.4,
        size: 1.6 + pseudo(index * 2.2 + n) * 2.6,
        color: SPARK_COLORS[(index * 3 + n) % SPARK_COLORS.length],
      });
    }
  });

  // 剥冰：短促白蓝碎屑，木块留在盘上
  (result.peeledCells || []).forEach((cell, index) => {
    const pos = boardCellPosition(layout, cell.row, cell.col);
    const cx = pos.x + layout.cell / 2;
    const cy = pos.y + layout.cell / 2;
    for (let n = 0; n < 6; n += 1) {
      const angle = pseudo(index * 7.1 + n * 1.9) * Math.PI * 2;
      const speed = 80 + pseudo(index + n * 2.2) * 160;
      iceSparks.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40,
        life: 1,
        decay: 2.4 + pseudo(index + n) * 1.2,
        size: 1.8 + pseudo(index * 3 + n) * 2.4,
        color: ICE_SPARK_COLORS[(index + n) % ICE_SPARK_COLORS.length],
      });
    }
  });

  return {
    cells,
    rows,
    cols,
    lineCount,
    power,
    age: 0,
    duration: 0.72,
    progress: 0,
    debris,
    chips,
    sparks,
    iceSparks,
    shake: Math.min(16, 4 + lineCount * 4),
  };
}

export function updateClearBurst(burst, dt) {
  if (!burst) return null;
  burst.age += dt;
  burst.progress = Math.min(1, burst.age / burst.duration);
  burst.debris.forEach((block) => {
    if (burst.age < block.delay) return;
    block.x += block.vx * dt;
    block.y += block.vy * dt;
    block.vy += 1500 * dt;
    block.rot += block.spin * dt;
  });
  burst.chips.forEach((chip) => {
    chip.x += chip.vx * dt;
    chip.y += chip.vy * dt;
    chip.vy += 900 * dt;
    chip.vx *= 1 - Math.min(1, dt * 1.6);
    chip.rotation += chip.spin * dt;
    chip.life = 1 - burst.progress;
  });
  burst.sparks.forEach((spark) => {
    spark.x += spark.vx * dt;
    spark.y += spark.vy * dt;
    spark.vx *= 1 - Math.min(1, dt * 4);
    spark.vy *= 1 - Math.min(1, dt * 4);
    spark.life = Math.max(0, spark.life - spark.decay * dt);
  });
  (burst.iceSparks || []).forEach((spark) => {
    spark.x += spark.vx * dt;
    spark.y += spark.vy * dt;
    spark.vx *= 1 - Math.min(1, dt * 3);
    spark.vy *= 1 - Math.min(1, dt * 3);
    spark.life = Math.max(0, spark.life - spark.decay * dt);
  });
  return burst.progress >= 1 ? null : burst;
}

/** 当前屏幕震动偏移。 */
export function burstShake(burst) {
  if (!burst || burst.progress > 0.45) return { x: 0, y: 0 };
  const t = burst.progress / 0.45;
  const amp = burst.shake * (1 - t) * (1 - t);
  return {
    x: Math.sin(burst.age * 95) * amp,
    y: Math.cos(burst.age * 73) * amp * 0.7,
  };
}

/** 消行瞬间的白闪条 + 冲击波光环。 */
export function drawLineFlash(ctx, layout, burst) {
  if (!burst) return;
  const t = burst.progress;
  const flashT = Math.min(1, t / 0.22);
  const inset = layout.gap * 0.5;
  ctx.save();
  if (flashT < 1) {
    const alpha = (1 - flashT) * 0.95;
    ctx.fillStyle = `rgba(255,248,232,${alpha})`;
    ctx.shadowColor = 'rgba(216,184,120,0.8)';
    ctx.shadowBlur = 18;
    const boardW = layout.boardW || layout.boardSize;
    const boardH = layout.boardH || layout.boardSize;
    burst.rows.forEach((row) => {
      const pos = boardCellPosition(layout, row, 0);
      roundRect(ctx, pos.x - inset, pos.y - inset, boardW - layout.gap * 2 + inset * 2, layout.cell + inset * 2, 6, ctx.fillStyle);
    });
    burst.cols.forEach((col) => {
      const pos = boardCellPosition(layout, 0, col);
      roundRect(ctx, pos.x - inset, pos.y - inset, layout.cell + inset * 2, boardH - layout.gap * 2 + inset * 2, 6, ctx.fillStyle);
    });
  }
  ctx.shadowBlur = 0;

  // 冲击波：沿行/列拉长的光环，从线中心向外扩散
  const waveT = Math.min(1, t / 0.5);
  if (waveT < 1) {
    const alpha = (1 - waveT) * 0.7;
    ctx.lineWidth = Math.max(2, 10 * (1 - waveT));
    ctx.strokeStyle = `rgba(216,184,120,${alpha})`;
    const boardW = layout.boardW || layout.boardSize;
    const boardH = layout.boardH || layout.boardSize;
    const spread = Math.max(boardW, boardH) * 0.9 * waveT + layout.cell;
    burst.rows.forEach((row) => {
      const pos = boardCellPosition(layout, row, 0);
      const cy = pos.y + layout.cell / 2;
      const cx = layout.boardX + boardW / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, spread, layout.cell * (0.6 + waveT * 1.6), 0, 0, Math.PI * 2);
      ctx.stroke();
    });
    burst.cols.forEach((col) => {
      const pos = boardCellPosition(layout, 0, col);
      const cx = pos.x + layout.cell / 2;
      const cy = layout.boardY + boardH / 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, layout.cell * (0.6 + waveT * 1.6), spread, 0, 0, Math.PI * 2);
      ctx.stroke();
    });
  }
  ctx.restore();
}

/** 炸飞的木块、木屑与火花。 */
export function drawBurstParticles(ctx, burst) {
  if (!burst) return;
  const fade = 1 - Math.max(0, (burst.progress - 0.45) / 0.55);

  burst.debris.forEach((block) => {
    if (burst.age < block.delay) return;
    const scale = Math.max(0.15, 1 - burst.progress * 0.7);
    ctx.save();
    ctx.translate(block.x, block.y);
    ctx.rotate(block.rot);
    drawWoodBlock(
      ctx,
      -block.size / 2,
      -block.size / 2,
      block.size,
      block.gem,
      Math.max(0, fade),
      scale,
      0,
      block.skin == null ? BLANK_TILE_SKIN : block.skin
    );
    ctx.restore();
  });

  burst.chips.forEach((chip) => {
    if (chip.life <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, chip.life * 1.3));
    ctx.translate(chip.x, chip.y);
    ctx.rotate(chip.rotation);
    ctx.fillStyle = chip.color;
    ctx.fillRect(-chip.size / 2, -chip.size / 2, chip.size, chip.size * 0.7);
    ctx.restore();
  });

  burst.sparks.forEach((spark) => {
    if (spark.life <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, spark.life));
    ctx.fillStyle = spark.color;
    ctx.shadowColor = spark.color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(spark.x, spark.y, spark.size * (0.5 + spark.life * 0.7), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  (burst.iceSparks || []).forEach((spark) => {
    if (spark.life <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, spark.life));
    ctx.fillStyle = spark.color;
    ctx.beginPath();
    ctx.arc(spark.x, spark.y, spark.size * (0.6 + spark.life * 0.5), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

/** 四角星形闪光。 */
export function drawSparkStar(ctx, x, y, size, alpha, color, rotation) {
  if (alpha <= 0 || size <= 0) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.translate(x, y);
  ctx.rotate(rotation || 0);
  ctx.fillStyle = color || '#ffffff';
  const inner = size * 0.18;
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.lineTo(inner, -inner);
  ctx.lineTo(size, 0);
  ctx.lineTo(inner, inner);
  ctx.lineTo(0, size);
  ctx.lineTo(-inner, inner);
  ctx.lineTo(-size, 0);
  ctx.lineTo(-inner, -inner);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * 宝石飞行：二次贝塞尔弧线 + 自旋 + 缩放脉冲 + 拖尾闪光。
 */
export function createGemFlight(fromX, fromY, toX, toY, index, seed, skin) {
  const side = (index % 2 === 0 ? 1 : -1) * (0.6 + pseudo(seed + index) * 0.8);
  const midX = (fromX + toX) / 2 + side * Math.abs(toY - fromY) * 0.35;
  const midY = Math.min(fromY, toY) - 60 - pseudo(seed * 1.3 + index) * 60;
  return {
    fromX,
    fromY,
    toX,
    toY,
    midX,
    midY,
    x: fromX,
    y: fromY,
    age: -0.16 - index * 0.055,
    duration: 0.62,
    spin: (pseudo(seed + index * 2.2) - 0.5) * 10,
    rotation: 0,
    scale: 1,
    trailTimer: 0,
    done: false,
    skin: skin == null ? BLANK_TILE_SKIN : skin,
  };
}

function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/**
 * 推进所有宝石飞行；到达时调用 onArrive(flight)，拖尾粒子写入 sparkles。
 */
export function updateGemFlights(flights, dt, sparkles, onArrive) {
  const alive = [];
  flights.forEach((flight) => {
    flight.age += dt;
    if (flight.age < 0) {
      alive.push(flight);
      return;
    }
    const raw = Math.min(1, flight.age / flight.duration);
    const t = easeInOutQuad(raw);
    const inv = 1 - t;
    flight.x = inv * inv * flight.fromX + 2 * inv * t * flight.midX + t * t * flight.toX;
    flight.y = inv * inv * flight.fromY + 2 * inv * t * flight.midY + t * t * flight.toY;
    flight.rotation += flight.spin * dt;
    flight.scale = 1 + Math.sin(raw * Math.PI) * 0.55;

    flight.trailTimer += dt;
    if (flight.trailTimer >= 0.028) {
      flight.trailTimer = 0;
      sparkles.push({
        x: flight.x + (pseudo(flight.age * 91) - 0.5) * 10,
        y: flight.y + (pseudo(flight.age * 37) - 0.5) * 10,
        vx: (pseudo(flight.age * 13) - 0.5) * 40,
        vy: 20 + pseudo(flight.age * 71) * 40,
        life: 1,
        decay: 2.6,
        size: 3 + pseudo(flight.age * 17) * 4,
        rotation: pseudo(flight.age * 5) * Math.PI,
        color: GEM_SPARK_COLORS[Math.floor(pseudo(flight.age * 29) * GEM_SPARK_COLORS.length)],
      });
    }

    if (raw >= 1) {
      flight.done = true;
      if (onArrive) onArrive(flight);
      return;
    }
    alive.push(flight);
  });
  return alive;
}

/** 到达 HUD 时的爆闪。 */
export function spawnGemBurst(sparkles, x, y, count) {
  const total = count || 10;
  for (let i = 0; i < total; i += 1) {
    const angle = (i / total) * Math.PI * 2 + pseudo(i * 3.3) * 0.5;
    const speed = 90 + pseudo(i * 1.7) * 140;
    sparkles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      decay: 2.2,
      size: 4 + pseudo(i * 2.9) * 5,
      rotation: angle,
      color: GEM_SPARK_COLORS[i % GEM_SPARK_COLORS.length],
    });
  }
}

export function updateSparkles(sparkles, dt) {
  const alive = [];
  sparkles.forEach((spark) => {
    spark.x += spark.vx * dt;
    spark.y += spark.vy * dt;
    spark.vx *= 1 - Math.min(1, dt * 3);
    spark.vy *= 1 - Math.min(1, dt * 3);
    spark.rotation += dt * 4;
    spark.life -= spark.decay * dt;
    if (spark.life > 0) alive.push(spark);
  });
  return alive;
}

export function drawSparkles(ctx, sparkles) {
  sparkles.forEach((spark) => {
    drawSparkStar(ctx, spark.x, spark.y, spark.size * spark.life, spark.life, spark.color, spark.rotation);
  });
}

export function drawGemFlights(ctx, flights, size) {
  flights.forEach((flight) => {
    if (flight.age < 0) return;
    const s = size * flight.scale;
    ctx.save();
    ctx.translate(flight.x, flight.y);
    ctx.rotate(flight.rotation);
    drawWoodBlock(ctx, -s / 2, -s / 2, s, true, 1, 1, 0, flight.skin);
    ctx.restore();
  });
}

/** 落子时“砰”的一圈尘土光环。 */
export function drawPlacePulse(ctx, layout, placed) {
  const keys = Object.keys(placed || {});
  if (!keys.length) return;
  ctx.save();
  keys.forEach((key) => {
    const t = Math.min(1, placed[key]);
    const row = Math.floor(Number(key) / BOARD_COLS);
    const col = Number(key) % BOARD_COLS;
    const pos = boardCellPosition(layout, row, col);
    const cx = pos.x + layout.cell / 2;
    const cy = pos.y + layout.cell / 2;
    ctx.globalAlpha = (1 - t) * 0.45;
    ctx.strokeStyle = '#F3E3BF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, layout.cell * (0.4 + t * 0.6), 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.restore();
}

export default {
  buildClearBurst,
  updateClearBurst,
  burstShake,
  drawLineFlash,
  drawBurstParticles,
  drawSparkStar,
  createGemFlight,
  updateGemFlights,
  spawnGemBurst,
  updateSparkles,
  drawSparkles,
  drawGemFlights,
  drawPlacePulse,
};
