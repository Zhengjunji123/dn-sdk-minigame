/**
 * 仅保留 findValidPlacement（及落子合法性判断），无关卡 / 得分 / 消除等玩法。
 */
import { BOARD_COLS, BOARD_ROWS, CELL, SHAPES } from './grid-rules.js';

function normalizeCells(cells) {
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

function resolvePiece(pieces, pieceOrIndex) {
  if (Number.isInteger(pieceOrIndex)) {
    return Array.isArray(pieces) ? pieces[pieceOrIndex] || null : null;
  }
  return pieceOrIndex && typeof pieceOrIndex === 'object' ? pieceOrIndex : null;
}

function pieceCells(piece) {
  if (!piece) return null;
  if (Array.isArray(piece.cells)) return piece.cells;
  if (Array.isArray(piece.shape)) return piece.shape;
  if (typeof piece.shape === 'string') {
    const definition = SHAPES.find((candidate) => candidate.id === piece.shape);
    return definition ? definition.cells : null;
  }
  if (piece.shape && Array.isArray(piece.shape.cells)) return piece.shape.cells;
  return null;
}

function canPlace(board, pieceOrIndex, row, col, pieces) {
  const piece = resolvePiece(pieces, pieceOrIndex);
  if (!piece || piece.used || !Number.isInteger(row) || !Number.isInteger(col) || !board) {
    return false;
  }
  let cells;
  try {
    cells = normalizeCells(pieceCells(piece));
  } catch (_err) {
    return false;
  }
  return cells.every(([cellRow, cellCol]) => {
    const targetRow = row + cellRow;
    const targetCol = col + cellCol;
    return (
      targetRow >= 0
      && targetRow < BOARD_ROWS
      && targetCol >= 0
      && targetCol < BOARD_COLS
      && board[targetRow]
      && board[targetRow][targetCol] === CELL.EMPTY
    );
  });
}

/**
 * 在 board 上为棋子找一个可落点。
 * @param {number[][]} board
 * @param {object|number} pieceOrIndex 棋子对象或 pieces 下标
 * @param {object[]} [pieces] pieceOrIndex 为下标时必传
 * @returns {{row:number,col:number}|null}
 */
export function findValidPlacement(board, pieceOrIndex, pieces) {
  const piece = resolvePiece(pieces, pieceOrIndex);
  if (!piece || piece.used) return null;
  for (let row = 0; row < BOARD_ROWS; row += 1) {
    for (let col = 0; col < BOARD_COLS; col += 1) {
      if (canPlace(board, piece, row, col, pieces)) return { row, col };
    }
  }
  return null;
}

export default {
  findValidPlacement,
};
