import assert from 'node:assert/strict';

import {
  BOARD_COLS,
  BOARD_ROWS,
  CELL,
  RULES,
  SCORE_RULES,
  SHAPES,
} from '../src/board/grid-rules.js';
import PuzzleCore from '../src/board/puzzle-core.js';
import buildLevel, { goalForLevel, totalPresetLevels, countIce } from '../src/board/chapter-data.js';

const emptyBoard = () => (
  Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(CELL.EMPTY))
);

const piece = (cells, gems = [], skin = 0) => ({
  cells,
  gems,
  used: false,
  skin: gems.length ? skin || 1 : 0,
  cellSkins: cells.map((_, index) => (gems.includes(index) ? (skin || 1) : 0)),
});

const threePieces = (first, second = piece([[0, 0]]), third = piece([[0, 0]])) => (
  [first, second, third]
);

function testBoundariesAndCollision() {
  const engine = new PuzzleCore({ seed: 1 });
  engine.setBoardForTest(emptyBoard());
  engine.setPiecesForTest(threePieces(piece([[0, 0], [0, 1]])));

  assert.equal(engine.canPlace(0, 0, 0), true);
  assert.equal(engine.canPlace(0, -1, 0), false);
  assert.equal(engine.canPlace(0, 0, -1), false);
  assert.equal(engine.canPlace(0, 0, BOARD_COLS - 1), false);
  assert.equal(engine.canPlace(0, BOARD_ROWS, 0), false);

  const board = emptyBoard();
  board[0][1] = CELL.WOOD;
  engine.setBoardForTest(board);
  assert.equal(engine.canPlace(0, 0, 0), false);
  assert.equal(engine.place(0, 0, 0).ok, false);
}

function testFullRowCollectsGems() {
  const engine = new PuzzleCore({ seed: 2 });
  engine.setGoalForTest(10, 0);
  const board = emptyBoard();
  for (let col = 0; col < BOARD_COLS - 1; col += 1) board[0][col] = col % 2 ? CELL.GEM : CELL.WOOD;
  engine.setBoardForTest(board);
  engine.setPiecesForTest(threePieces(piece([[0, 0]], [0], engine.targetSkins[0])));

  const preview = engine.previewLines(0, 0, BOARD_COLS - 1);
  assert.deepEqual(preview.rows, [0]);
  assert.deepEqual(preview.cols, []);
  assert.equal(preview.gems, 4);

  const result = engine.place(0, 0, BOARD_COLS - 1);
  assert.deepEqual(result.clearedRows, [0]);
  assert.equal(result.clearedCells, BOARD_COLS);
  assert.equal(result.gemsCleared, 4);
  assert.equal(engine.collected, 4);
  assert.equal(engine.gemsLeft, 6);
  assert.ok(engine.board[0].every((cell) => cell === CELL.EMPTY));
  assert.ok(result.gems.every((cell) => cell.row === 0));
}

function testFullColumn() {
  const engine = new PuzzleCore({ seed: 3 });
  const board = emptyBoard();
  for (let row = 0; row < BOARD_ROWS - 1; row += 1) board[row][2] = CELL.WOOD;
  engine.setBoardForTest(board);
  engine.setPiecesForTest(threePieces(piece([[0, 0]])));

  const result = engine.place(0, BOARD_ROWS - 1, 2);
  assert.deepEqual(result.clearedRows, []);
  assert.deepEqual(result.clearedCols, [2]);
  assert.equal(result.clearedCells, BOARD_ROWS);
  assert.ok(engine.board.every((row) => row[2] === CELL.EMPTY));
}

function testRowColumnIntersection() {
  const engine = new PuzzleCore({ seed: 4 });
  const board = emptyBoard();
  for (let col = 0; col < BOARD_COLS; col += 1) {
    if (col !== 4) board[3][col] = CELL.WOOD;
  }
  for (let row = 0; row < BOARD_ROWS; row += 1) {
    if (row !== 3) board[row][4] = CELL.WOOD;
  }
  engine.setBoardForTest(board);
  engine.setPiecesForTest(threePieces(piece([[0, 0]], [0], engine.targetSkins[0])));

  const result = engine.place(0, 3, 4);
  assert.deepEqual(result.clearedRows, [3]);
  assert.deepEqual(result.clearedCols, [4]);
  assert.equal(result.clearedCells, BOARD_COLS + BOARD_ROWS - 1);
  assert.equal(result.gemsCleared, 1);
}

function testRefreshAfterThreePieces() {
  const engine = new PuzzleCore({ seed: 5 });
  engine.setBoardForTest(emptyBoard());
  engine.setPiecesForTest([
    piece([[0, 0]]),
    piece([[0, 0]]),
    piece([[0, 0]]),
  ]);

  assert.equal(engine.place(0, 0, 0).refreshed, false);
  assert.equal(engine.place(1, 0, 1).refreshed, false);
  const third = engine.place(2, 0, 2);
  assert.equal(third.refreshed, true);
  assert.equal(engine.pieces.length, 3);
  assert.ok(engine.pieces.every((candidate) => candidate.used === false));
}

function testGameOverAndRevive() {
  const engine = new PuzzleCore({ seed: 6 });
  engine.setGoalForTest(99, 0);
  const board = Array.from(
    { length: BOARD_ROWS },
    () => Array(BOARD_COLS).fill(CELL.WOOD),
  );
  board[BOARD_ROWS - 1][BOARD_COLS - 1] = CELL.EMPTY;
  engine.setBoardForTest(board);
  engine.setPiecesForTest([
    piece([[0, 0], [0, 1]]),
    piece([[0, 0], [1, 0]]),
    piece([[0, 0], [0, 1], [0, 2]]),
  ]);

  assert.equal(engine.hasAnyMove(), false);
  assert.equal(engine.gameOver, true);
  assert.equal(engine.place(0, 0, 0).gameOver, true);
  assert.equal(engine.revivesLeft, RULES.REVIVES_PER_LEVEL);

  const revived = engine.revive();
  assert.equal(revived.ok, true);
  assert.ok(revived.clearedRows.length >= 1);
  assert.equal(engine.revivesLeft, RULES.REVIVES_PER_LEVEL - 1);
  assert.equal(engine.gameOver, false);
  assert.equal(engine.hasAnyMove(), true);
  assert.equal(engine.collected, 0, '复活清掉的宝石不计入目标');

  assert.equal(engine.revive().ok, false, '未失败时不可复活');
}

function testSidebarRewards() {
  const engine = new PuzzleCore({ seed: 11 });
  const before = engine.revivesLeft;
  assert.equal(engine.addRevives(RULES.SIDEBAR_REWARD_REVIVE), before + RULES.SIDEBAR_REWARD_REVIVE);
  engine.setPiecesForTest([
    piece([[0, 0]], [0]),
    piece([[0, 0]]),
    piece([[0, 0]]),
  ]);
  const firstId = engine.pieces[0].id;
  const refreshed = engine.refreshTray();
  assert.equal(refreshed.ok, true);
  assert.equal(refreshed.refreshed, true);
  assert.equal(engine.pieces.length, 3);
  assert.notEqual(engine.pieces[0].id, firstId);
}

function testWinStopsPlay() {
  const engine = new PuzzleCore({ seed: 9 });
  engine.setGoalForTest(2, 0);
  const board = emptyBoard();
  for (let col = 0; col < BOARD_COLS - 1; col += 1) {
    board[5][col] = (col === 2 || col === 4) ? CELL.GEM : CELL.WOOD;
  }
  engine.setBoardForTest(board);
  engine.setPiecesForTest(threePieces(piece([[0, 0]])));

  const result = engine.place(0, 5, BOARD_COLS - 1);
  assert.equal(result.won, true);
  assert.equal(engine.won, true);
  assert.equal(engine.gameOver, false);
  assert.equal(engine.gemsLeft, 0);
  assert.equal(engine.place(1, 0, 0).ok, false, '过关后不再接受落子');
}

function testScoreAndCombo() {
  const engine = new PuzzleCore({ seed: 7 });
  engine.setGoalForTest(99, 0);
  const setupAlmostFullRow = (row) => {
    const board = emptyBoard();
    for (let col = 0; col < BOARD_COLS - 1; col += 1) board[row][col] = CELL.WOOD;
    engine.setBoardForTest(board);
    engine.setPiecesForTest(threePieces(piece([[0, 0]])));
  };

  setupAlmostFullRow(0);
  const first = engine.place(0, 0, BOARD_COLS - 1);
  assert.equal(engine.combo, 1);
  assert.equal(
    first.scoreGain,
    SCORE_RULES.PLACED_CELL
      + SCORE_RULES.CLEARED_LINE
      + BOARD_COLS * SCORE_RULES.CLEARED_CELL,
  );

  setupAlmostFullRow(1);
  const second = engine.place(0, 1, BOARD_COLS - 1);
  assert.equal(engine.combo, 2);
  assert.equal(second.scoreGain, first.scoreGain + SCORE_RULES.COMBO_BONUS);
  assert.equal(engine.score, first.scoreGain + second.scoreGain);

  engine.setBoardForTest(emptyBoard());
  engine.setPiecesForTest(threePieces(piece([[0, 0]])));
  const plain = engine.place(0, 0, 0);
  assert.equal(plain.scoreGain, SCORE_RULES.PLACED_CELL);
  assert.equal(engine.combo, 0);
}

function testGeneratedPiecesAndLevels() {
  assert.equal(BOARD_COLS, 8);
  assert.equal(BOARD_ROWS, 10);
  assert.ok(Array.isArray(SHAPES) && SHAPES.length > 0);
  assert.ok(totalPresetLevels() >= 3);

  const engine = new PuzzleCore({ level: 1, seed: 8 });
  for (let level = 1; level <= 30; level += 1) {
    const data = buildLevel(level);
    assert.equal(data.level, level);
    assert.equal(data.goal, goalForLevel(level));
    assert.ok(data.goal > 0);
    assert.equal(data.board.length, BOARD_ROWS);
    assert.equal(data.board[0].length, BOARD_COLS);
    for (let index = 0; index < BOARD_ROWS; index += 1) {
      assert.ok(data.board[index].some((cell) => cell === CELL.EMPTY), `第 ${level} 关第 ${index} 行开局不能已满`);
    }
    for (let index = 0; index < BOARD_COLS; index += 1) {
      assert.ok(data.board.some((row) => row[index] === CELL.EMPTY), `第 ${level} 关第 ${index} 列开局不能已满`);
    }

    engine.reset({ level, seed: level * 31 });
    assert.equal(engine.level, level);
    assert.equal(engine.goal, data.goal);
    assert.equal(engine.pieces.length, 3);
    assert.equal(engine.hasAnyMove(), true);
    for (const generated of engine.pieces) {
      assert.equal(typeof generated.id, 'string');
      assert.equal(typeof generated.shape, 'string');
      assert.equal(generated.used, false);
      assert.ok(generated.cells.length > 0);
      assert.ok(generated.gems.every((index) => index >= 0 && index < generated.cells.length));
      const unique = new Set();
      for (const [row, col] of generated.cells) {
        assert.ok(Number.isInteger(row) && row >= 0 && row < BOARD_ROWS);
        assert.ok(Number.isInteger(col) && col >= 0 && col < BOARD_COLS);
        unique.add(`${row},${col}`);
      }
      assert.equal(unique.size, generated.cells.length);
      assert.equal(Math.min(...generated.cells.map(([row]) => row)), 0);
      assert.equal(Math.min(...generated.cells.map(([, col]) => col)), 0);
    }
  }

  engine.setPiecesForTest(threePieces(piece([[4, 8], [4, 9]], [1])));
  assert.deepEqual(engine.pieces[0].cells, [[0, 0], [0, 1]]);
  assert.deepEqual(engine.pieces[0].gems, [1]);
}

function scorePlacement(engine, index, row, col) {
  const preview = engine.previewLines(index, row, col);
  let value = preview.rows.length + preview.cols.length + preview.gems * 3;
  // 剥冰（尤其冰宝）也计入，避免贪心只盯无冰行
  if (preview.rows.length || preview.cols.length) {
    const seen = new Set();
    const visit = (r, c) => {
      const key = r * BOARD_COLS + c;
      if (seen.has(key)) return;
      seen.add(key);
      const cell = engine.board[r][c];
      if (cell === CELL.ICE_GEM) value += 2;
      else if (cell === CELL.ICE_WOOD) value += 0.5;
    };
    preview.rows.forEach((r) => {
      for (let c = 0; c < BOARD_COLS; c += 1) visit(r, c);
    });
    preview.cols.forEach((c) => {
      for (let r = 0; r < BOARD_ROWS; r += 1) visit(r, c);
    });
  }
  return value;
}

function playGreedyUntilWin(engine, label) {
  let steps = 0;
  while (!engine.won && steps < 1200) {
    if (engine.gameOver) {
      if (engine.revivesLeft <= 0) engine.addRevives(RULES.REVIVES_PER_LEVEL);
      const revived = engine.revive();
      assert.equal(revived.ok, true, `${label} 卡死时应能复活继续`);
    }
    let best = null;
    for (let index = 0; index < 3; index += 1) {
      if (engine.pieces[index].used) continue;
      for (let row = 0; row < BOARD_ROWS; row += 1) {
        for (let col = 0; col < BOARD_COLS; col += 1) {
          if (!engine.canPlace(index, row, col)) continue;
          const value = scorePlacement(engine, index, row, col);
          if (!best || value > best.value) best = { index, row, col, value };
        }
      }
    }
    assert.ok(best, `${label} 未失败时必定存在合法落点`);
    engine.place(best.index, best.row, best.col);
    steps += 1;
  }
  assert.equal(engine.won, true, `${label} 应能通关`);
  assert.equal(engine.collected >= engine.goal, true, `${label} 收集数应达到目标`);
  return steps;
}

function assertBoardIs8x10(board, label) {
  assert.equal(board.length, BOARD_ROWS, `${label} 应为 ${BOARD_ROWS} 行`);
  for (let row = 0; row < BOARD_ROWS; row += 1) {
    assert.ok(Array.isArray(board[row]), `${label} 第 ${row} 行应是数组`);
    assert.equal(board[row].length, BOARD_COLS, `${label} 第 ${row} 行应为 ${BOARD_COLS} 列`);
    assert.ok(board[row].some((cell) => cell === CELL.EMPTY), `${label} 第 ${row} 行开局不能已满`);
  }
  for (let col = 0; col < BOARD_COLS; col += 1) {
    assert.ok(board.some((row) => row[col] === CELL.EMPTY), `${label} 第 ${col} 列开局不能已满`);
  }
}

function testGreedyPlaythroughCanWin() {
  const engine = new PuzzleCore({ level: 1, seed: 5 });
  playGreedyUntilWin(engine, '第 1 关');
}

/** 每一关：8×10 棋盘可载入、有空位、能落子，贪心可通关。 */
function testEveryLevelEightByTenSmoke() {
  assert.equal(BOARD_COLS, 8);
  assert.equal(BOARD_ROWS, 10);
  const lastLevel = Math.max(30, totalPresetLevels());
  for (let level = 1; level <= lastLevel; level += 1) {
    const label = `第 ${level} 关`;
    const data = buildLevel(level);
    assertBoardIs8x10(data.board, label);
    assert.ok(countIce(data.board) >= 1, `${label} 应含冰格`);

    const engine = new PuzzleCore({ level, seed: level * 31 });
    assert.equal(engine.level, level);
    assertBoardIs8x10(engine.board, `${label} 引擎`);
    assert.equal(engine.pieces.length, 3, `${label} 托盘应为 3 组`);
    assert.equal(engine.hasAnyMove(), true, `${label} 开局应有合法落点`);
    playGreedyUntilWin(engine, label);
  }
}

function testIceWoodPeelsOnce() {
  const engine = new PuzzleCore({ seed: 31 });
  engine.setGoalForTest(10, 0);
  const board = emptyBoard();
  for (let col = 0; col < BOARD_COLS - 1; col += 1) {
    board[0][col] = col === 2 ? CELL.ICE_WOOD : CELL.WOOD;
  }
  engine.setBoardForTest(board);
  engine.setPiecesForTest(threePieces(piece([[0, 0]])));

  const first = engine.place(0, 0, BOARD_COLS - 1);
  assert.deepEqual(first.clearedRows, [0]);
  assert.ok(first.peeledCells.some((cell) => cell.row === 0 && cell.col === 2));
  assert.equal(engine.board[0][2], CELL.WOOD, '冰木块第一次只剥冰');
  assert.equal(first.gemsCleared, 0);
  assert.equal(engine.collected, 0);
  assert.ok(first.scoreGain >= SCORE_RULES.ICE_BREAK);
  assert.equal(first.clearedCells, BOARD_COLS - 1, '其余无冰格清空');
}

function testIceGemNeedsTwoClears() {
  const engine = new PuzzleCore({ seed: 32 });
  engine.setGoalForTest(10, 0);
  const board = emptyBoard();
  for (let col = 0; col < BOARD_COLS - 1; col += 1) {
    board[1][col] = col === 3 ? CELL.ICE_GEM : CELL.WOOD;
  }
  engine.setBoardForTest(board);
  engine.setPiecesForTest(threePieces(piece([[0, 0]])));

  const preview = engine.previewLines(0, 1, BOARD_COLS - 1);
  assert.equal(preview.gems, 0, '冰下宝石本回合预览不计');

  const first = engine.place(0, 1, BOARD_COLS - 1);
  assert.equal(engine.board[1][3], CELL.GEM);
  assert.equal(first.gemsCleared, 0);
  assert.equal(engine.collected, 0);

  // 第二次：几乎满行，只留缺口，宝石已无冰
  const board2 = emptyBoard();
  for (let col = 0; col < BOARD_COLS - 1; col += 1) {
    board2[1][col] = col === 3 ? CELL.GEM : CELL.WOOD;
  }
  engine.setBoardForTest(board2);
  engine.setPiecesForTest(threePieces(piece([[0, 0]])));

  const second = engine.place(0, 1, BOARD_COLS - 1);
  assert.equal(second.gemsCleared, 1);
  assert.equal(engine.collected, 1);
  assert.equal(engine.board[1][3], CELL.EMPTY);
  assert.equal(second.peeledCells.length, 0);
}

function testEveryLevelHasIce() {
  assert.ok(totalPresetLevels() >= 8, '至少 8 关手摆冰层预设');
  for (let level = 1; level <= 30; level += 1) {
    const data = buildLevel(level);
    const ice = countIce(data.board);
    assert.ok(ice >= 1, `第 ${level} 关应含冰格，实际 ${ice}`);
  }
}

testBoundariesAndCollision();
testFullRowCollectsGems();
testFullColumn();
testRowColumnIntersection();
testRefreshAfterThreePieces();
testGameOverAndRevive();
testSidebarRewards();
testWinStopsPlay();
testScoreAndCombo();
testGeneratedPiecesAndLevels();
testGreedyPlaythroughCanWin();
testEveryLevelEightByTenSmoke();
testIceWoodPeelsOnce();
testIceGemNeedsTwoClears();
testEveryLevelHasIce();

console.log('puzzle-smoke: all tests passed');
