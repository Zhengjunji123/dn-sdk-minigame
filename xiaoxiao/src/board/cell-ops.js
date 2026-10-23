/**
 * Board cell geometry helpers (shared by PuzzleCore).
 */
import { BOARD_COLS, BOARD_ROWS, CELL } from './grid-rules.js';

export function normalizeCells(cells) {
  if (!Array.isArray(cells) || cells.length === 0) {
    throw new TypeError('A piece must contain at least one cell');
  }

  const parsed = cells.map((cell) => {
    if (
      !Array.isArray(cell)
      || cell.length !== 2
      || !Number.isInteger(cell[0])
      || !Number.isInteger(cell[1])
    ) {
      throw new TypeError('Piece cells must be [row, col] integer pairs');
    }
    return [cell[0], cell[1]];
  });

  const minRow = Math.min(...parsed.map((cell) => cell[0]));
  const minCol = Math.min(...parsed.map((cell) => cell[1]));
  const normalized = parsed
    .map(([row, col]) => [row - minRow, col - minCol])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);

  for (let i = 1; i < normalized.length; i += 1) {
    if (
      normalized[i][0] === normalized[i - 1][0]
      && normalized[i][1] === normalized[i - 1][1]
    ) {
      throw new TypeError('A piece cannot contain duplicate cells');
    }
  }
  return normalized;
}

export function normalizeCell(value) {
  if (value === CELL.ICE_GEM || value === '@') return CELL.ICE_GEM;
  if (value === CELL.ICE_WOOD || value === 'I') return CELL.ICE_WOOD;
  if (value === CELL.GEM || value === '*') return CELL.GEM;
  if (value === CELL.EMPTY || value == null || value === false || value === '.') return CELL.EMPTY;
  if (value === CELL.WOOD || value === '#' || value === true) return CELL.WOOD;
  return CELL.WOOD;
}

export function isOccupied(value) {
  return normalizeCell(value) !== CELL.EMPTY;
}

export function hasIce(value) {
  const cell = normalizeCell(value);
  return cell === CELL.ICE_WOOD || cell === CELL.ICE_GEM;
}

/** 冰层下的本体：ICE_GEM→GEM，ICE_WOOD→WOOD，其余原样 */
export function baseCell(value) {
  const cell = normalizeCell(value);
  if (cell === CELL.ICE_GEM) return CELL.GEM;
  if (cell === CELL.ICE_WOOD) return CELL.WOOD;
  return cell;
}

/** 剥一层冰；无冰则原样返回 */
export function peelIce(value) {
  return hasIce(value) ? baseCell(value) : normalizeCell(value);
}

export function emptyBoard() {
  return Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(CELL.EMPTY));
}

export function cloneBoard(board) {
  return board.map((row) => row.map((value) => normalizeCell(value)));
}

export function validateBoard(board) {
  if (
    !Array.isArray(board)
    || board.length !== BOARD_ROWS
    || board.some((row) => !Array.isArray(row) || row.length !== BOARD_COLS)
  ) {
    throw new TypeError(`Board must be a ${BOARD_COLS}x${BOARD_ROWS} array`);
  }
}

export function normalizeGems(gems, cellCount) {
  if (!Array.isArray(gems)) return [];
  const unique = new Set();
  gems.forEach((index) => {
    if (Number.isInteger(index) && index >= 0 && index < cellCount) unique.add(index);
  });
  return Array.from(unique).sort((a, b) => a - b);
}
