import { BOARD_COLS, BOARD_ROWS, CELL, RULES, TILE_SKIN_COUNT } from './grid-rules.js';
import makeRandom, { pickIndex } from './chance.js';

/**
 * 关卡定义。
 * 字符含义：`.` 空、`#` 木块、`*` 宝石、`I` 冰木块、`@` 冰宝石。
 * 冰层按关递进：教学 → 混搭 → 护宝 → 团块 → 高密度。
 * goal 是本关两款目标猫脸合计需收集数；棋盘 * / @ 会映射到本关两款目标皮肤。
 */
const PRESETS = [
  // 1：初见冰壳——两处冰木，不挡宝石
  {
    goal: 8,
    rows: [
      '........',
      '........',
      '..#*#...',
      '.##I##..',
      '..#*##*.',
      '...*#...',
      '....I...',
      '........',
    ],
  },
  // 2：冰木 + 冰宝混搭，学会剥冰再收宝
  {
    goal: 12,
    rows: [
      '.....##.',
      '...##.#.',
      '..*#I**#',
      '.##*###.',
      '.##@##.*',
      '..*##*.#',
      '...##...',
      '........',
    ],
  },
  // 3：中心双冰宝，两侧冰木护栏
  {
    goal: 15,
    rows: [
      '.#....#.',
      '.*#..#*.',
      '..##I#..',
      '..#@@#..',
      '.#*II*#.',
      '#*.##.*#',
      '.#....#.',
      '........',
    ],
  },
  // 4：斜线冰带，打断直消节奏
  {
    goal: 17,
    rows: [
      '.......#',
      '.....*I#',
      '...#*#I.',
      '..#@##I.',
      '.#*##I*.',
      '#I##*#..',
      '.##*....',
      '........',
    ],
  },
  // 5：冰宝成对，夹在木块团里
  {
    goal: 19,
    rows: [
      '..##....',
      '.#**#...',
      '#I@@I#..',
      '.##*##..',
      '..#I#*#.',
      '...#*##.',
      '....##..',
      '........',
    ],
  },
  // 6：双边冰墙 + 内嵌冰宝（行列均留空）
  {
    goal: 21,
    rows: [
      'I#....#.',
      '#*#..#*#',
      '.#@##@#.',
      '..####..',
      '.#*II*#.',
      '#*#..#*#',
      '.#....#I',
      '........',
    ],
  },
  // 7：十字冰核，宝石多在核周
  {
    goal: 23,
    rows: [
      '...##...',
      '..#**#..',
      '.#I@@I#.',
      '.*IIII*.',
      '.#I@@I#.',
      '..#**#..',
      '...##...',
      '........',
    ],
  },
  // 8：高密度冰壳，开局几乎处处要剥（每行/列至少一空）
  {
    goal: 25,
    rows: [
      '.I#**#I.',
      'I#@@.@#I',
      '#I##.##I',
      '*#I.II#*',
      'I##.##I#',
      'I#@.@@#I',
      '.I#**#I.',
      '........',
    ],
  },
];

function parseCellChar(ch) {
  if (ch === '@') return CELL.ICE_GEM;
  if (ch === 'I') return CELL.ICE_WOOD;
  if (ch === '*') return CELL.GEM;
  if (ch === '#') return CELL.WOOD;
  return CELL.EMPTY;
}

function parseRows(rows) {
  const src = rows || [];
  const padTop = Math.max(0, BOARD_ROWS - src.length);
  const board = [];
  for (let row = 0; row < BOARD_ROWS; row += 1) {
    const line = src[row - padTop] || '';
    board[row] = [];
    for (let col = 0; col < BOARD_COLS; col += 1) {
      board[row][col] = parseCellChar(line[col] || '.');
    }
  }
  return board;
}

function countGems(board) {
  let total = 0;
  for (let row = 0; row < BOARD_ROWS; row += 1) {
    for (let col = 0; col < BOARD_COLS; col += 1) {
      const value = board[row][col];
      if (value === CELL.GEM || value === CELL.ICE_GEM) total += 1;
    }
  }
  return total;
}

function countIce(board) {
  let total = 0;
  for (let row = 0; row < BOARD_ROWS; row += 1) {
    for (let col = 0; col < BOARD_COLS; col += 1) {
      const value = board[row][col];
      if (value === CELL.ICE_WOOD || value === CELL.ICE_GEM) total += 1;
    }
  }
  return total;
}

function lineIsFull(board, index, isRow) {
  const len = isRow ? BOARD_COLS : BOARD_ROWS;
  for (let i = 0; i < len; i += 1) {
    const value = isRow ? board[index][i] : board[i][index];
    if (value === CELL.EMPTY) return false;
  }
  return true;
}

/** 关卡越高冰越密；后期提高「冰盖宝石」比例。 */
function icePlanForLevel(level) {
  const ratio = Math.min(0.42, RULES.BOARD_ICE_RATIO + Math.max(0, level - PRESETS.length) * 0.015);
  const gemIceShare = Math.min(0.55, 0.2 + Math.max(0, level - PRESETS.length) * 0.025);
  const minIce = Math.min(12, 2 + Math.floor((level - PRESETS.length) / 2));
  return { ratio, gemIceShare, minIce };
}

/**
 * 按计划给盘面洒冰：优先给一部分宝石罩冰，再补冰木块；保证不少于 minIce。
 */
function applyIcePlan(board, plan, random) {
  const gems = [];
  const woods = [];
  for (let row = 0; row < BOARD_ROWS; row += 1) {
    for (let col = 0; col < BOARD_COLS; col += 1) {
      const value = board[row][col];
      if (value === CELL.GEM) gems.push([row, col]);
      else if (value === CELL.WOOD) woods.push([row, col]);
    }
  }
  const occupied = gems.length + woods.length;
  if (!occupied) return;

  let iceWanted = Math.max(plan.minIce, Math.round(occupied * plan.ratio));
  iceWanted = Math.min(occupied, iceWanted);

  const gemIceWanted = Math.min(gems.length, Math.round(iceWanted * plan.gemIceShare));
  for (let i = 0; i < gemIceWanted && gems.length; i += 1) {
    const [cell] = gems.splice(pickIndex(random, gems.length), 1);
    board[cell[0]][cell[1]] = CELL.ICE_GEM;
    iceWanted -= 1;
  }
  while (iceWanted > 0 && woods.length) {
    const [cell] = woods.splice(pickIndex(random, woods.length), 1);
    board[cell[0]][cell[1]] = CELL.ICE_WOOD;
    iceWanted -= 1;
  }
  // 木块不够时继续罩剩余宝石
  while (iceWanted > 0 && gems.length) {
    const [cell] = gems.splice(pickIndex(random, gems.length), 1);
    board[cell[0]][cell[1]] = CELL.ICE_GEM;
    iceWanted -= 1;
  }
}

/** 程序生成：关卡越高木块越密、目标越多，但保证没有开局即满的行列。 */
function generateBoard(level, goal, random) {
  const board = parseRows([]);
  const density = Math.min(0.5, 0.3 + level * 0.012);
  const rowsUsed = Math.min(BOARD_ROWS - 2, 5 + Math.floor(level / 6));
  const top = Math.max(0, BOARD_ROWS - 1 - rowsUsed);

  for (let row = top; row < BOARD_ROWS - 1; row += 1) {
    const chance = density * (0.8 + ((row - top) / rowsUsed) * 0.4);
    for (let col = 0; col < BOARD_COLS; col += 1) {
      if (random() < chance) board[row][col] = CELL.WOOD;
    }
  }
  for (let index = 0; index < BOARD_ROWS; index += 1) {
    if (lineIsFull(board, index, true)) board[index][pickIndex(random, BOARD_COLS)] = CELL.EMPTY;
  }
  for (let index = 0; index < BOARD_COLS; index += 1) {
    if (lineIsFull(board, index, false)) board[pickIndex(random, BOARD_ROWS)][index] = CELL.EMPTY;
  }

  const woodCells = [];
  for (let row = 0; row < BOARD_ROWS; row += 1) {
    for (let col = 0; col < BOARD_COLS; col += 1) {
      if (board[row][col] === CELL.WOOD) woodCells.push([row, col]);
    }
  }
  let gemsWanted = Math.min(woodCells.length, Math.round(goal * 0.65));
  while (gemsWanted > 0 && woodCells.length) {
    const [cell] = woodCells.splice(pickIndex(random, woodCells.length), 1);
    board[cell[0]][cell[1]] = CELL.GEM;
    gemsWanted -= 1;
  }

  applyIcePlan(board, icePlanForLevel(level), random);
  return board;
}

export function totalPresetLevels() {
  return PRESETS.length;
}

export function goalForLevel(level) {
  const safeLevel = Math.max(1, Math.floor(Number(level) || 1));
  const preset = PRESETS[safeLevel - 1];
  if (preset) return preset.goal;
  return Math.min(45, 15 + (safeLevel - PRESETS.length) * 2);
}

/** 每关固定抽两款不同猫脸作为收集目标 */
export function targetSkinsForLevel(level, seed) {
  const random = makeRandom((seed == null ? 0x51ed + level * 7919 : seed) ^ 0xca7);
  const pool = [];
  for (let i = 1; i <= TILE_SKIN_COUNT; i += 1) pool.push(i);
  const a = pool.splice(pickIndex(random, pool.length), 1)[0];
  const b = pool.splice(pickIndex(random, pool.length), 1)[0];
  return [a, b];
}

/** 总目标拆成两款猫脸各自份额（尽量均分） */
export function splitGoalForTargets(totalGoal) {
  const total = Math.max(2, Math.floor(Number(totalGoal) || 2));
  const first = Math.ceil(total / 2);
  return [first, Math.max(1, total - first)];
}

/**
 * 构建关卡数据：{ level, goal, targetSkins, targetGoals, board, boardGems, seed }
 * seed 固定为关卡号，保证同一关每次开局棋盘一致（重玩体验稳定）。
 */
export default function buildLevel(level) {
  const safeLevel = Math.max(1, Math.floor(Number(level) || 1));
  const goal = goalForLevel(safeLevel);
  const preset = PRESETS[safeLevel - 1];
  const seed = 0x51ed + safeLevel * 7919;
  const board = preset
    ? parseRows(preset.rows)
    : generateBoard(safeLevel, goal, makeRandom(seed));
  const targetSkins = targetSkinsForLevel(safeLevel, seed);
  const targetGoals = splitGoalForTargets(goal);
  return {
    level: safeLevel,
    goal,
    targetSkins,
    targetGoals,
    board,
    boardGems: countGems(board),
    seed,
  };
}

export { parseRows, countGems, countIce };
