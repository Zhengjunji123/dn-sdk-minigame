import {
  BOARD_COLS,
  BOARD_ROWS,
  CELL,
  RULES,
  SCORE_RULES,
  SHAPES,
  TILE_SKIN_COUNT,
  BLANK_TILE_SKIN,
  CELL_TARGET_CHANCE,
} from './grid-rules.js';
import buildLevel from './chapter-data.js';
import makeRandom, { pickIndex } from './chance.js';
import {
  normalizeCells,
  emptyBoard,
  cloneBoard,
  validateBoard,
  normalizeGems,
  hasIce,
  peelIce,
} from './cell-ops.js';

function emptySkins() {
  return Array.from({ length: BOARD_ROWS }, () => Array(BOARD_COLS).fill(BLANK_TILE_SKIN));
}

function createPuzzleCore(options = {}) {
  let level = 1;
  let goal = 0;
  let collected = 0;
  /** 本关两款目标猫脸 [skinA, skinB] */
  let targetSkins = [1, 2];
  /** 各自需收集数量 */
  let targetGoals = [1, 1];
  /** 各自已收集数量 */
  let targetCollected = [0, 0];
  let board = emptyBoard();
  let skins = emptySkins();
  let pieces = [];
  let score = 0;
  let combo = 0;
  let revivesLeft = RULES.REVIVES_PER_LEVEL;
  let gameOver = false;
  let won = false;
  let pieceSequence = 0;
  let random = makeRandom(options.seed);

  function resolvePiece(pieceOrIndex) {
    if (Number.isInteger(pieceOrIndex)) return pieces[pieceOrIndex] || null;
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

  function canPlace(pieceOrIndex, row, col) {
    const piece = resolvePiece(pieceOrIndex);
    if (
      !piece
      || piece.used
      || !Number.isInteger(row)
      || !Number.isInteger(col)
    ) {
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
        && board[targetRow][targetCol] === CELL.EMPTY
      );
    });
  }

  function findValidPlacement(pieceOrIndex) {
    const piece = resolvePiece(pieceOrIndex);
    if (!piece || piece.used) return null;
    for (let row = 0; row < BOARD_ROWS; row += 1) {
      for (let col = 0; col < BOARD_COLS; col += 1) {
        if (canPlace(piece, row, col)) return { row, col };
      }
    }
    return null;
  }

  function hasAnyMove() {
    return pieces.some((piece) => !piece.used && findValidPlacement(piece) !== null);
  }

  function isTargetSkin(skin) {
    return targetSkins.indexOf(skin) >= 0;
  }

  function targetIndex(skin) {
    return targetSkins.indexOf(skin);
  }

  function pieceHasTarget(piece) {
    if (!piece) return false;
    if (Array.isArray(piece.cellSkins)) {
      return piece.cellSkins.some((skin) => isTargetSkin(skin));
    }
    return isTargetSkin(piece.skin);
  }

  /**
   * 按格生成皮肤：
   * - 可以整块都是 whiteIcon
   * - 可以白块 + 小猫混搭（甚至两款目标混在同一组合里）
   * - 多格时禁止「清一色全是小猫」
   */
  function buildCellSkins(cellCount, forceTarget) {
    const force = forceTarget === true;
    const forbid = forceTarget === false;
    const list = [];
    for (let i = 0; i < cellCount; i += 1) {
      if (!forbid && random() < CELL_TARGET_CHANCE) {
        list.push(targetSkins[pickIndex(random, targetSkins.length)]);
      } else {
        list.push(BLANK_TILE_SKIN);
      }
    }
    if (force && !list.some((skin) => isTargetSkin(skin))) {
      list[pickIndex(random, list.length)] = targetSkins[pickIndex(random, targetSkins.length)];
    }
    // 多格组合不能全是小猫；至少留一格白块
    if (cellCount > 1 && list.every((skin) => isTargetSkin(skin))) {
      list[pickIndex(random, list.length)] = BLANK_TILE_SKIN;
    }
    return list;
  }

  function makePiece(definition = SHAPES[pickIndex(random, SHAPES.length)], forceTarget) {
    const cells = normalizeCells(definition.cells);
    const cellSkins = buildCellSkins(cells.length, forceTarget);
    const gems = [];
    cellSkins.forEach((skin, index) => {
      if (isTargetSkin(skin)) gems.push(index);
    });
    // skin 保留首个目标猫（兼容旧读取）；无目标则为白块
    const skin = gems.length ? cellSkins[gems[0]] : BLANK_TILE_SKIN;
    return {
      id: `piece-${pieceSequence += 1}`,
      shape: definition.id || 'custom',
      used: false,
      cells,
      gems,
      skin,
      cellSkins,
    };
  }

  function syncSkinsFromBoard() {
    let gemCursor = 0;
    for (let row = 0; row < BOARD_ROWS; row += 1) {
      for (let col = 0; col < BOARD_COLS; col += 1) {
        const value = board[row][col];
        if (value === CELL.EMPTY) {
          skins[row][col] = BLANK_TILE_SKIN;
        } else if (value === CELL.GEM || value === CELL.ICE_GEM) {
          // 棋盘预设宝石轮流映射到本关两款目标猫脸
          skins[row][col] = targetSkins[gemCursor % targetSkins.length];
          gemCursor += 1;
        } else {
          skins[row][col] = BLANK_TILE_SKIN;
        }
      }
    }
  }

  function recomputeWin() {
    won = targetGoals.every((need, index) => (targetCollected[index] || 0) >= need);
    collected = targetCollected.reduce((sum, n) => sum + n, 0);
    return won;
  }

  function gemsLeftTotal() {
    return targetGoals.reduce((sum, need, index) => (
      sum + Math.max(0, need - (targetCollected[index] || 0))
    ), 0);
  }

  function refreshPieces() {
    pieces = [makePiece(), makePiece(), makePiece()];
    // 保证托盘里至少有一格目标猫脸，避免长时间刷不出收集物
    if (!pieces.some((piece) => pieceHasTarget(piece))) {
      pieces[pickIndex(random, pieces.length)] = makePiece(
        SHAPES[pickIndex(random, SHAPES.length)],
        true
      );
    }
    if (!hasAnyMove()) {
      const single = SHAPES.find((candidate) => candidate.id === 'single');
      pieces[pickIndex(random, pieces.length)] = makePiece(single, true);
    }
  }

  /** 侧边栏奖励：增加本关剩余复活次数。 */
  function addRevives(count) {
    const n = Math.max(0, Math.floor(Number(count) || 0));
    if (!n) return revivesLeft;
    revivesLeft += n;
    return revivesLeft;
  }

  /** 侧边栏奖励：立刻刷新底部三组方块。失败态下也会刷新并重新判定。 */
  function refreshTray() {
    if (won) return { ok: false, refreshed: false };
    refreshPieces();
    if (!won) gameOver = !hasAnyMove();
    return { ok: true, refreshed: true, gameOver };
  }

  /**
   * 找出把方块放到 (row, col) 后会被填满的行列，以及本回合能收到的宝石数。
   * 冰下宝石本回合剥冰不计分，故不计入 preview.gems。
   */
  function previewLines(pieceOrIndex, row, col) {
    const empty = { rows: [], cols: [], gems: 0 };
    const piece = resolvePiece(pieceOrIndex);
    if (!piece || !canPlace(piece, row, col)) return empty;
    const cells = normalizeCells(pieceCells(piece));
    const gems = normalizeGems(piece.gems, cells.length);
    const cellSkins = Array.isArray(piece.cellSkins) ? piece.cellSkins : null;
    const filled = board.map((line) => line.map((value) => value !== CELL.EMPTY));
    // 仅无冰的 GEM 会在本回合被收走；放置格写入后也是无冰
    const gemAt = board.map((line) => line.map((value) => value === CELL.GEM));
    cells.forEach(([cellRow, cellCol], index) => {
      filled[row + cellRow][col + cellCol] = true;
      const skin = cellSkins && Number.isInteger(cellSkins[index])
        ? cellSkins[index]
        : (gems.includes(index) ? piece.skin : BLANK_TILE_SKIN);
      gemAt[row + cellRow][col + cellCol] = isTargetSkin(skin);
    });

    const rows = [];
    const cols = [];
    for (let index = 0; index < BOARD_ROWS; index += 1) {
      if (filled[index].every(Boolean)) rows.push(index);
    }
    for (let index = 0; index < BOARD_COLS; index += 1) {
      if (filled.every((line) => line[index])) cols.push(index);
    }
    const seen = new Set();
    let gemCount = 0;
    const visit = (r, c) => {
      const key = r * BOARD_COLS + c;
      if (seen.has(key)) return;
      seen.add(key);
      if (gemAt[r][c]) gemCount += 1;
    };
    rows.forEach((r) => {
      for (let c = 0; c < BOARD_COLS; c += 1) visit(r, c);
    });
    cols.forEach((c) => {
      for (let r = 0; r < BOARD_ROWS; r += 1) visit(r, c);
    });
    return { rows, cols, gems: gemCount };
  }

  function failedPlacement() {
    return {
      ok: false,
      placed: [],
      clearedRows: [],
      clearedCols: [],
      clearedCells: 0,
      gems: [],
      gemsCleared: 0,
      peeledCells: [],
      scoreGain: 0,
      refreshed: false,
      combo,
      gameOver,
      won,
    };
  }

  function place(pieceIndex, row, col) {
    if (gameOver || won || !Number.isInteger(pieceIndex) || !canPlace(pieceIndex, row, col)) {
      return failedPlacement();
    }

    const piece = pieces[pieceIndex];
    const cells = normalizeCells(piece.cells);
    const gems = normalizeGems(piece.gems, cells.length);
    const cellSkins = Array.isArray(piece.cellSkins) ? piece.cellSkins : null;
    const placed = cells.map(([cellRow, cellCol], index) => {
      const skin = cellSkins && Number.isInteger(cellSkins[index])
        ? cellSkins[index]
        : (gems.includes(index)
          ? (Number.isInteger(piece.skin) ? piece.skin : targetSkins[0])
          : BLANK_TILE_SKIN);
      return {
        row: row + cellRow,
        col: col + cellCol,
        gem: isTargetSkin(skin),
        skin,
      };
    });
    placed.forEach((cell) => {
      board[cell.row][cell.col] = cell.gem ? CELL.GEM : CELL.WOOD;
      skins[cell.row][cell.col] = cell.gem ? cell.skin : BLANK_TILE_SKIN;
    });
    piece.used = true;

    const clearedRows = [];
    const clearedCols = [];
    for (let index = 0; index < BOARD_ROWS; index += 1) {
      if (board[index].every((cell) => cell !== CELL.EMPTY)) clearedRows.push(index);
    }
    for (let index = 0; index < BOARD_COLS; index += 1) {
      if (board.every((boardRow) => boardRow[index] !== CELL.EMPTY)) clearedCols.push(index);
    }

    const cellsToClear = new Map();
    const remember = (clearRow, clearCol) => {
      cellsToClear.set(clearRow * BOARD_COLS + clearCol, { row: clearRow, col: clearCol });
    };
    clearedRows.forEach((clearRow) => {
      for (let clearCol = 0; clearCol < BOARD_COLS; clearCol += 1) remember(clearRow, clearCol);
    });
    clearedCols.forEach((clearCol) => {
      for (let clearRow = 0; clearRow < BOARD_ROWS; clearRow += 1) remember(clearRow, clearCol);
    });

    const clearedGems = [];
    const peeledCells = [];
    let emptiedCount = 0;
    cellsToClear.forEach((cell) => {
      const value = board[cell.row][cell.col];
      if (hasIce(value)) {
        board[cell.row][cell.col] = peelIce(value);
        peeledCells.push({ row: cell.row, col: cell.col });
        return;
      }
      if (value === CELL.GEM) {
        const skin = skins[cell.row][cell.col];
        clearedGems.push({ row: cell.row, col: cell.col, skin });
        const ti = targetIndex(skin);
        if (ti >= 0) targetCollected[ti] += 1;
      }
      board[cell.row][cell.col] = CELL.EMPTY;
      skins[cell.row][cell.col] = BLANK_TILE_SKIN;
      emptiedCount += 1;
    });

    const lineCount = clearedRows.length + clearedCols.length;
    if (lineCount > 0) combo += 1;
    else combo = 0;
    const scoreGain = (
      placed.length * SCORE_RULES.PLACED_CELL
      + lineCount * SCORE_RULES.CLEARED_LINE
      + emptiedCount * SCORE_RULES.CLEARED_CELL
      + peeledCells.length * SCORE_RULES.ICE_BREAK
      + clearedGems.length * SCORE_RULES.GEM
      + Math.max(0, combo - 1) * SCORE_RULES.COMBO_BONUS
    );
    score += scoreGain;
    recomputeWin();

    let refreshed = false;
    if (!won) {
      if (pieces.every((candidate) => candidate.used)) {
        refreshPieces();
        refreshed = true;
      }
      gameOver = !hasAnyMove();
    }

    return {
      ok: true,
      placed,
      clearedRows,
      clearedCols,
      clearedCells: emptiedCount,
      gems: clearedGems,
      gemsCleared: clearedGems.length,
      peeledCells,
      scoreGain,
      refreshed,
      combo,
      gameOver,
      won,
    };
  }

  function filledCount(row) {
    return board[row].reduce((sum, value) => sum + (value !== CELL.EMPTY ? 1 : 0), 0);
  }

  /**
   * 复活：清理若干最拥挤的相邻行直到有位置可放。
   * 被清掉的宝石不计入目标。返回 { ok, clearedRows, refreshed }。
   */
  function revive() {
    if (!gameOver || won || revivesLeft <= 0) {
      return { ok: false, clearedRows: [], refreshed: false, revivesLeft };
    }
    const clearedRows = [];
    while (!hasAnyMove() && clearedRows.length < RULES.REVIVE_MAX_LINES) {
      let candidates = [];
      if (!clearedRows.length) {
        for (let row = 0; row < BOARD_ROWS; row += 1) candidates.push(row);
      } else {
        clearedRows.forEach((row) => {
          [row - 1, row + 1].forEach((next) => {
            if (next >= 0 && next < BOARD_ROWS && !clearedRows.includes(next)) candidates.push(next);
          });
        });
      }
      candidates = candidates.filter((row, index, list) => list.indexOf(row) === index);
      if (!candidates.length) break;
      let target = candidates[0];
      candidates.forEach((row) => {
        if (filledCount(row) > filledCount(target)) target = row;
      });
      for (let col = 0; col < BOARD_COLS; col += 1) {
        board[target][col] = CELL.EMPTY;
        skins[target][col] = BLANK_TILE_SKIN;
      }
      clearedRows.push(target);
    }

    let refreshed = false;
    if (!hasAnyMove()) {
      const single = SHAPES.find((candidate) => candidate.id === 'single');
      pieces = pieces.map((piece) => (piece.used ? piece : makePiece(single, true)));
      refreshed = true;
    }
    revivesLeft -= 1;
    combo = 0;
    gameOver = !hasAnyMove();
    return { ok: !gameOver, clearedRows: clearedRows.sort((a, b) => a - b), refreshed, revivesLeft };
  }

  function normalizeTestPiece(piece, index) {
    const cells = normalizeCells(pieceCells(piece));
    let cellSkins = Array.isArray(piece.cellSkins)
      ? piece.cellSkins.slice(0, cells.length)
      : null;
    if (!cellSkins || cellSkins.length !== cells.length) {
      let skin = Number(piece.skin);
      if (!Number.isInteger(skin) || skin < BLANK_TILE_SKIN || skin > TILE_SKIN_COUNT) {
        skin = BLANK_TILE_SKIN;
      }
      cellSkins = cells.map(() => skin);
      if (cells.length > 1 && cellSkins.every((s) => isTargetSkin(s))) {
        cellSkins[0] = BLANK_TILE_SKIN;
      }
    }
    const gems = [];
    cellSkins.forEach((skin, i) => {
      if (isTargetSkin(skin)) gems.push(i);
    });
    return {
      id: piece.id == null ? `test-piece-${index}` : String(piece.id),
      shape: typeof piece.shape === 'string' ? piece.shape : 'custom',
      used: Boolean(piece.used),
      cells,
      gems,
      skin: gems.length ? cellSkins[gems[0]] : BLANK_TILE_SKIN,
      cellSkins,
    };
  }

  function setBoardForTest(nextBoard) {
    validateBoard(nextBoard);
    board = cloneBoard(nextBoard);
    skins = emptySkins();
    syncSkinsFromBoard();
    gameOver = !won && !hasAnyMove();
    return api;
  }

  function setPiecesForTest(nextPieces) {
    if (!Array.isArray(nextPieces) || nextPieces.length !== 3) {
      throw new TypeError('Pieces must contain exactly three slots');
    }
    pieces = nextPieces.map(normalizeTestPiece);
    gameOver = !won && !hasAnyMove();
    return api;
  }

  function setGoalForTest(nextGoal, nextCollected) {
    goal = Math.max(0, Math.floor(Number(nextGoal) || 0));
    const half = Math.ceil(goal / 2);
    targetGoals = [half, Math.max(1, goal - half)];
    const done = Math.max(0, Math.floor(Number(nextCollected) || 0));
    targetCollected = [
      Math.min(targetGoals[0], done),
      Math.min(targetGoals[1], Math.max(0, done - targetGoals[0])),
    ];
    recomputeWin();
    return api;
  }

  /**
   * 开始/重开指定关卡。
   * reset(3) 载入第 3 关；reset() 重开当前关；reset({ level, seed }) 精细控制。
   */
  function reset(input) {
    let nextLevel = level;
    let nextSeed;
    if (Number.isInteger(input)) nextLevel = input;
    else if (input && typeof input === 'object') {
      if (Number.isInteger(input.level)) nextLevel = input.level;
      nextSeed = input.seed;
    }
    const data = buildLevel(nextLevel);
    level = data.level;
    goal = data.goal;
    targetSkins = (data.targetSkins || [1, 2]).slice(0, 2);
    targetGoals = (data.targetGoals || [Math.ceil(goal / 2), Math.floor(goal / 2) || 1]).slice(0, 2);
    targetCollected = [0, 0];
    board = cloneBoard(data.board);
    skins = emptySkins();
    syncSkinsFromBoard();
    if (nextSeed !== undefined) random = makeRandom(nextSeed);
    else if (typeof options.random === 'function') random = options.random;
    else random = makeRandom(data.seed + Date.now());
    collected = 0;
    pieces = [];
    score = 0;
    combo = 0;
    revivesLeft = RULES.REVIVES_PER_LEVEL;
    gameOver = false;
    won = false;
    pieceSequence = 0;
    refreshPieces();
    gameOver = !hasAnyMove();
    return api;
  }

  const api = {
    get level() {
      return level;
    },
    get goal() {
      return goal;
    },
    get collected() {
      return collected;
    },
    get gemsLeft() {
      return gemsLeftTotal();
    },
    get targetSkins() {
      return targetSkins.slice();
    },
    get targetGoals() {
      return targetGoals.slice();
    },
    get targetCollected() {
      return targetCollected.slice();
    },
    /** 两款目标各自剩余数量 */
    get targetLeft() {
      return targetGoals.map((need, index) => Math.max(0, need - (targetCollected[index] || 0)));
    },
    get board() {
      return board;
    },
    get skins() {
      return skins;
    },
    get pieces() {
      return pieces;
    },
    get score() {
      return score;
    },
    setScore(value) {
      score = Math.max(0, Math.floor(Number(value) || 0));
      return score;
    },
    get combo() {
      return combo;
    },
    get revivesLeft() {
      return revivesLeft;
    },
    get gameOver() {
      return gameOver;
    },
    get won() {
      return won;
    },
    reset,
    canPlace,
    previewLines,
    place,
    revive,
    addRevives,
    refreshTray,
    hasAnyMove,
    findValidPlacement,
    setBoardForTest,
    setPiecesForTest,
    setGoalForTest,
  };

  const initialLevel = Number.isInteger(options.level) ? options.level : 1;
  return reset({ level: initialLevel, seed: options.seed });
}

export { normalizeCells } from './cell-ops.js';

export default class PuzzleCore {
  constructor(options = {}) {
    const api = createPuzzleCore(options);
    Object.setPrototypeOf(api, PuzzleCore.prototype);
    return api;
  }
}
