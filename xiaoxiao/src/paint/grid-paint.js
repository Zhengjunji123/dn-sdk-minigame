import { BOARD_COLS, BOARD_ROWS, CELL, BLANK_TILE_SKIN } from '../board/grid-rules.js';
import { clamp, roundRect, roundedPath } from './ink.js';
import { drawImageAsset, tileAssetKey } from './media.js';
import { TONE, drawPlainBlock } from './tone.js';

function pieceCells(piece) {
  if (piece && Array.isArray(piece.cells) && piece.cells.length) return piece.cells;
  const cells = [];
  const shape = piece && piece.shape;
  if (Array.isArray(shape)) {
    for (let row = 0; row < shape.length; row += 1) {
      for (let col = 0; col < shape[row].length; col += 1) {
        if (shape[row][col]) cells.push([row, col]);
      }
    }
  }
  return cells;
}

export function getPieceBounds(piece) {
  const cells = pieceCells(piece);
  let minRow = Infinity;
  let minCol = Infinity;
  let maxRow = -Infinity;
  let maxCol = -Infinity;
  for (let i = 0; i < cells.length; i += 1) {
    minRow = Math.min(minRow, cells[i][0]);
    minCol = Math.min(minCol, cells[i][1]);
    maxRow = Math.max(maxRow, cells[i][0]);
    maxCol = Math.max(maxCol, cells[i][1]);
  }
  if (!cells.length) return { minRow: 0, minCol: 0, rows: 1, cols: 1, cells: [] };
  return {
    minRow,
    minCol,
    rows: maxRow - minRow + 1,
    cols: maxCol - minCol + 1,
    cells,
  };
}

function pieceHasGem(piece, index) {
  return !!(piece && Array.isArray(piece.gems) && piece.gems.includes(index));
}

/**
 * 对局版面（自上而下）：
 *   胶囊行：菜单按钮（左）
 *   信息行：关卡号 + 得分（左） · 两个目标进度环（右）
 *   棋盘卡片
 *   托盘：三组方块，无底板
 *   底部分段道具条：换一批 | 重来 | 跳过
 * 屏幕偏高时多余空间按比例分给各段间距，避免内容挤在顶部。
 */
export function createBoardLayout(width, height, safeArea) {
  const safe = safeArea || { top: 68, bottom: 12 };
  const side = clamp(width * 0.055, 14, 24);
  const menu = safe.menu || {};
  const barY = Number(menu.top) || (safe.statusBarHeight || 20) + 6;
  const barH = Math.max(30, Number(menu.height) || 32);
  const gearSize = 40;
  const headerH = 64;
  const headerGap = clamp(height * 0.016, 8, 16);
  const boardGap = 14;
  const trayGap = 26;
  const minTray = 92;
  const maxTray = 136;
  const toolBarH = Math.max(86, Math.round(width * 0.22));
  const toolGap = 16;
  const floorPad = Math.max(safe.bottom || 0, 6) + 4;

  let headerY = barY + barH + headerGap;
  const toolY0 = height - floorPad - toolBarH;
  const trayBottom = toolY0 - toolGap;
  let boardY = headerY + headerH + boardGap;
  const maxBoardW = width - side * 2;
  const maxBoardH = trayBottom - boardY - trayGap - minTray;
  const gap = clamp(maxBoardW * 0.016, 4, 7);
  const pad = clamp(maxBoardW * 0.028, 8, 14);
  const cellW = (maxBoardW - pad * 2 - gap * (BOARD_COLS - 1)) / BOARD_COLS;
  const cellH = (maxBoardH - pad * 2 - gap * (BOARD_ROWS - 1)) / BOARD_ROWS;
  const cell = Math.max(12, Math.min(cellW, cellH, 52));
  const boardW = pad * 2 + cell * BOARD_COLS + gap * (BOARD_COLS - 1);
  const boardH = pad * 2 + cell * BOARD_ROWS + gap * (BOARD_ROWS - 1);
  const boardSize = boardW;
  const boardX = (width - boardW) / 2;
  let trayTop = boardY + boardH + trayGap;
  const trayHeight = clamp(trayBottom - trayTop, minTray, maxTray);
  const extra = Math.max(0, trayBottom - (trayTop + trayHeight));
  headerY += extra * 0.3;
  boardY += extra * 0.5;
  trayTop += extra * 0.5;

  const slotGap = 8;
  const slotWidth = (boardW - slotGap * 2) / 3;
  const slots = [0, 1, 2].map((index) => ({
    x: boardX + index * (slotWidth + slotGap),
    y: trayTop,
    w: slotWidth,
    h: trayHeight,
  }));
  const trayUnit = clamp(Math.min(slotWidth / 4.2, trayHeight / 4.2), 14, cell * 0.72);

  const ringR = 22;
  const labelGap = 9;
  const labelW = 16;
  const goalW = ringR * 2 + labelGap + labelW;
  const goalGap = 8;
  const goalCy = headerY + headerH / 2;
  const boardRight = boardX + boardW;
  const goals = [
    { cx: boardRight - goalW - goalGap - goalW + ringR, cy: goalCy, r: ringR },
    { cx: boardRight - goalW + ringR, cy: goalCy, r: ringR },
  ];
  const hud = {
    y: headerY,
    h: headerH,
    gear: {
      x: side,
      y: barY + (barH - gearSize) / 2,
      w: gearSize,
      h: gearSize,
    },
    levelX: boardX,
    goals,
  };

  const chipW = Math.max(70, Math.round(width * 0.18));
  const toolGapX = 40;
  const span = chipW * 3 + toolGapX * 2;
  const toolX = (width - span) / 2;
  const toolY = toolY0;
  const tools = {
    x: toolX,
    y: toolY,
    w: span,
    h: toolBarH,
    refresh: { x: toolX, y: toolY, w: chipW, h: toolBarH },
    restart: { x: toolX + chipW + toolGapX, y: toolY, w: chipW, h: toolBarH },
    skip: { x: toolX + (chipW + toolGapX) * 2, y: toolY, w: chipW, h: toolBarH },
  };
  return {
    width,
    height,
    headerY,
    hud,
    boardX,
    boardY,
    boardW,
    boardH,
    boardSize,
    cell,
    gap,
    pad,
    trayTop,
    trayHeight,
    trayUnit,
    slots,
    tools,
    lift: clamp(cell * 0.3, 8, 14),
  };
}

/** 单个方块：目标猫脸 / 填充块 whiteIcon。 */
export function drawWoodBlock(ctx, x, y, size, gem, alpha, scale, sparkle, skin) {
  const actualScale = scale == null ? 1 : scale;
  const s = size * actualScale;
  const ox = x + (size - s) / 2;
  const oy = y + (size - s) / 2;
  const skinId = Number.isInteger(skin) ? skin : BLANK_TILE_SKIN;
  ctx.save();
  ctx.globalAlpha = alpha == null ? 1 : alpha;
  const painted = drawImageAsset(ctx, tileAssetKey(skinId), ox, oy, s, s, 'contain');
  if (!painted) drawPlainBlock(ctx, ox, oy, s);
  if (gem && sparkle) {
    ctx.globalAlpha = (alpha == null ? 1 : alpha) * Math.min(0.5, sparkle * 0.6);
    roundRect(ctx, ox, oy, s, s, s * 0.22, 'rgba(255,240,205,0.45)');
  }
  ctx.restore();
}

/** 冰层：半透明霜面 + 细亮边 + 一道斜高光。 */
function drawFrost(ctx, x, y, size) {
  const inset = size * 0.04;
  const s = size - inset * 2;
  const ox = x + inset;
  const oy = y + inset;
  const r = Math.max(3, s * 0.2);
  ctx.save();
  roundRect(ctx, ox, oy, s, s, r, 'rgba(176,208,236,0.42)', 'rgba(226,240,252,0.9)', Math.max(1.2, size * 0.035));
  ctx.beginPath();
  roundedPath(ctx, ox, oy, s, s, r);
  ctx.clip();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = Math.max(2, s * 0.09);
  ctx.beginPath();
  ctx.moveTo(ox + s * 0.1, oy + s * 0.55);
  ctx.lineTo(ox + s * 0.55, oy + s * 0.1);
  ctx.stroke();
  ctx.lineWidth = Math.max(1, s * 0.04);
  ctx.beginPath();
  ctx.moveTo(ox + s * 0.3, oy + s * 0.78);
  ctx.lineTo(ox + s * 0.78, oy + s * 0.3);
  ctx.stroke();
  ctx.restore();
}

/** 闲置时不闪；仅在 drag / 特效阶段打开 animateGems。 */
export function gemSparkle(time, row, col) {
  if (time == null) return 0;
  const phase = (((row * 7 + col * 13) % 17) / 17) * Math.PI * 2;
  const wave = Math.sin(time * 1.6 + phase);
  return Math.max(0, wave) ** 8;
}

function boardPad(layout) {
  return layout.pad == null ? layout.gap : layout.pad;
}

export function boardCellPosition(layout, row, col) {
  const pad = boardPad(layout);
  return {
    x: layout.boardX + pad + col * (layout.cell + layout.gap),
    y: layout.boardY + pad + row * (layout.cell + layout.gap),
  };
}

/** 即将被消除的行列：金色细描边 + 极淡底色，随 pulse 呼吸。 */
export function drawLineHighlight(ctx, layout, rows, cols, pulse) {
  const p = pulse == null ? 1 : pulse;
  const fill = `rgba(216,184,120,${0.1 + 0.08 * p})`;
  const stroke = `rgba(216,184,120,${0.6 + 0.3 * p})`;
  const inset = layout.gap * 0.5;
  const rowSpan = layout.cell * BOARD_COLS + layout.gap * (BOARD_COLS - 1);
  const colSpan = layout.cell * BOARD_ROWS + layout.gap * (BOARD_ROWS - 1);
  const r = layout.cell * 0.24;
  ctx.save();
  (rows || []).forEach((row) => {
    const pos = boardCellPosition(layout, row, 0);
    roundRect(ctx, pos.x - inset, pos.y - inset, rowSpan + inset * 2, layout.cell + inset * 2, r, fill, stroke, 1.5);
  });
  (cols || []).forEach((col) => {
    const pos = boardCellPosition(layout, 0, col);
    roundRect(ctx, pos.x - inset, pos.y - inset, layout.cell + inset * 2, colSpan + inset * 2, r, fill, stroke, 1.5);
  });
  ctx.restore();
}

function drawEmptyCell(ctx, x, y, size) {
  const r = Math.max(4, size * 0.24);
  roundRect(ctx, x, y + 1.5, size, size, r, '#0b2048');
  roundRect(ctx, x, y, size, size, r, '#1a4a80');
  roundRect(ctx, x + 1.5, y + 1.5, size - 3, size * 0.38, r * 0.65, 'rgba(255,255,255,0.12)');
}

export function drawBoard(ctx, layout, board, effects) {
  const skins = effects && effects.skins;
  const plateR = 16;
  const boardW = layout.boardW || layout.boardSize;
  const boardH = layout.boardH || layout.boardSize;
  roundRect(ctx, layout.boardX, layout.boardY, boardW, boardH, plateR, '#07101c', '#4eb8ff', 2.5);

  const flash = effects && effects.flash;
  const placed = effects && effects.placed;
  const time = (effects && effects.time) || 0;
  const animateGems = !!(effects && effects.animateGems);
  for (let row = 0; row < BOARD_ROWS; row += 1) {
    for (let col = 0; col < BOARD_COLS; col += 1) {
      const pos = boardCellPosition(layout, row, col);
      const value = board && board[row] && board[row][col];
      drawEmptyCell(ctx, pos.x, pos.y, layout.cell);
      const key = row * BOARD_COLS + col;
      // 正在爆裂的格子由 effects 模块画成飞出的木块，这里只留空格
      if (flash && flash.cells && flash.cells[key]) continue;
      if (
        value === CELL.WOOD
        || value === CELL.GEM
        || value === CELL.ICE_WOOD
        || value === CELL.ICE_GEM
      ) {
        let scale = 1;
        if (placed && placed[key] != null) {
          const t = clamp(placed[key], 0, 1);
          scale = 1 + (1 - t) * 0.22;
        }
        const isGem = value === CELL.GEM || value === CELL.ICE_GEM;
        const iced = value === CELL.ICE_WOOD || value === CELL.ICE_GEM;
        const skin = skins && skins[row] ? skins[row][col] : 0;
        drawWoodBlock(
          ctx,
          pos.x,
          pos.y,
          layout.cell,
          isGem,
          1,
          scale,
          isGem && animateGems ? gemSparkle(time, row, col) : 0,
          skin
        );
        if (iced) drawFrost(ctx, pos.x, pos.y, layout.cell);
      }
    }
  }

  const preview = effects && effects.preview;
  if (preview && (preview.rows.length || preview.cols.length)) {
    drawLineHighlight(ctx, layout, preview.rows, preview.cols, preview.pulse);
  }
}

function drawPieceAt(ctx, piece, originX, originY, unit, alpha, scale, blockSize) {
  const bounds = getPieceBounds(piece);
  const size = blockSize == null ? unit * 0.92 : blockSize;
  const cellSkins = piece && Array.isArray(piece.cellSkins) ? piece.cellSkins : null;
  for (let i = 0; i < bounds.cells.length; i += 1) {
    const cell = bounds.cells[i];
    // 按格取皮肤：支持白块与小猫混搭；缺省回退 piece.skin
    const skin = cellSkins && Number.isInteger(cellSkins[i])
      ? cellSkins[i]
      : (piece && piece.skin);
    drawWoodBlock(
      ctx,
      originX + (cell[1] - bounds.minCol) * unit,
      originY + (cell[0] - bounds.minRow) * unit,
      size,
      pieceHasGem(piece, i),
      alpha,
      scale,
      0,
      skin
    );
  }
}

/** 托盘中第 index 个方块的绘制矩形（左上角、单元尺寸、外形范围）。 */
export function candidateRect(layout, piece, index) {
  const slot = layout.slots[index];
  const bounds = getPieceBounds(piece);
  const unit = Math.min(layout.trayUnit, (slot.w - 12) / bounds.cols, (slot.h - 12) / bounds.rows);
  return {
    x: slot.x + (slot.w - bounds.cols * unit) / 2,
    y: slot.y + (slot.h - bounds.rows * unit) / 2,
    unit,
    bounds,
  };
}

/**
 * 托盘三组方块：无底板、无浮动；被点选的一组放大并在下方画金色短线，
 * 放不下的一组降透明度。
 */
export function drawCandidates(ctx, layout, pieces, hiddenIndex, appear, time, blocked, selectedIndex) {
  const list = pieces || [];
  const t = time || 0;
  for (let index = 0; index < 3; index += 1) {
    const piece = list[index];
    if (!piece || piece.used || hiddenIndex === index) continue;
    const rect = candidateRect(layout, piece, index);
    const selected = selectedIndex === index;
    const appearScale = appear == null ? 1 : 0.4 + 0.6 * appear;
    const dimmed = blocked && blocked[index];
    const pw = rect.bounds.cols * rect.unit;
    const ph = rect.bounds.rows * rect.unit;
    const grow = selected ? 1.12 + Math.sin(t * 4) * 0.02 : 1;
    ctx.save();
    ctx.translate(rect.x + pw / 2, rect.y + ph / 2);
    ctx.scale(grow, grow);
    drawPieceAt(ctx, piece, -pw / 2, -ph / 2, rect.unit, dimmed ? 0.3 : 1, appearScale);
    ctx.restore();
    if (selected) {
      const slot = layout.slots[index];
      roundRect(ctx, slot.x + slot.w / 2 - 12, slot.y + slot.h - 6, 24, 3, 1.5, TONE.gold);
    }
  }
}

export function hitCandidate(x, y, pieces, layout) {
  for (let index = 0; index < layout.slots.length; index += 1) {
    const slot = layout.slots[index];
    const piece = pieces && pieces[index];
    if (
      piece &&
      !piece.used &&
      x >= slot.x - 6 &&
      x <= slot.x + slot.w + 6 &&
      y >= slot.y - 10 &&
      y <= slot.y + slot.h + 10
    ) {
      return index;
    }
  }
  return -1;
}

/** 以方块当前绘制左上角 (left, top) 推算最接近的棋盘锚点。 */
export function dragToBoardAnchor(left, top, layout) {
  const unit = layout.cell + layout.gap;
  const pad = boardPad(layout);
  const col = Math.round((left - layout.boardX - pad) / unit);
  const row = Math.round((top - layout.boardY - pad) / unit);
  return { row, col };
}

/** 方块中心是否落在棋盘附近（留一格余量）。 */
export function isOverBoard(centerX, centerY, layout) {
  const pad = layout.cell * 1.1;
  const boardW = layout.boardW || layout.boardSize;
  const boardH = layout.boardH || layout.boardSize;
  return (
    centerX >= layout.boardX - pad
    && centerX <= layout.boardX + boardW + pad
    && centerY >= layout.boardY - pad
    && centerY <= layout.boardY + boardH + pad
  );
}

/**
 * 根据方块当前绘制位置找吸附锚点：
 * 方块中心在棋盘附近时，在最接近的格子及其相邻一格内找可放位置。
 */
export function findSnapAnchor(piece, left, top, layout, canPlace) {
  const bounds = getPieceBounds(piece);
  const unit = layout.cell + layout.gap;
  const raw = dragToBoardAnchor(left, top, layout);
  const centerX = left + (bounds.cols * unit) / 2;
  const centerY = top + (bounds.rows * unit) / 2;
  if (!isOverBoard(centerX, centerY, layout)) {
    return { row: raw.row, col: raw.col, valid: false, near: false };
  }
  let best = null;
  let bestDist = Infinity;
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      const row = raw.row + dr;
      const col = raw.col + dc;
      if (!canPlace(row, col)) continue;
      const dist = dr * dr + dc * dc;
      if (dist < bestDist) {
        bestDist = dist;
        best = { row, col, valid: true, near: true };
      }
    }
  }
  return best || { row: raw.row, col: raw.col, valid: false, near: true };
}

export function drawProjection(ctx, layout, piece, anchor, valid) {
  if (!piece || !anchor) return;
  const bounds = getPieceBounds(piece);
  const fill = valid ? 'rgba(216,184,120,0.26)' : TONE.dangerSoft;
  const stroke = valid ? 'rgba(216,184,120,0.75)' : 'rgba(224,120,107,0.5)';
  const r = Math.max(3, layout.cell * 0.2);
  for (let i = 0; i < bounds.cells.length; i += 1) {
    const cell = bounds.cells[i];
    const row = anchor.row + cell[0] - bounds.minRow;
    const col = anchor.col + cell[1] - bounds.minCol;
    if (row < 0 || row >= BOARD_ROWS || col < 0 || col >= BOARD_COLS) continue;
    const pos = boardCellPosition(layout, row, col);
    roundRect(ctx, pos.x + 0.75, pos.y + 0.75, layout.cell - 1.5, layout.cell - 1.5, r, fill, stroke, 1.5);
  }
}

/**
 * 拖拽中的方块：以左上角 (x, y) 和当前单元尺寸 unit 绘制。
 * 单元尺寸等于 cell + gap 时，块尺寸正好等于棋盘格，可与格子严丝合缝。
 */
export function drawDraggedPiece(ctx, layout, piece, x, y, unit, alpha, lifted) {
  if (!piece) return;
  const boardUnit = layout.cell + layout.gap;
  const blockSize = unit * (layout.cell / boardUnit);
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = lifted ? 12 : 5;
  ctx.shadowOffsetY = lifted ? 8 : 3;
  drawPieceAt(ctx, piece, x, y, unit, alpha == null ? 0.98 : alpha, 1, blockSize);
  ctx.restore();
}

export default {
  createBoardLayout,
  candidateRect,
  drawBoard,
  drawCandidates,
  hitCandidate,
  dragToBoardAnchor,
  findSnapAnchor,
  isOverBoard,
  drawProjection,
  drawDraggedPiece,
  drawLineHighlight,
  drawWoodBlock,
  gemSparkle,
  boardCellPosition,
  getPieceBounds,
};
