const APP_NAME = '消消类002';

const BOARD_COLS = 8;
const BOARD_ROWS = 10;
/** 兼容旧 cellKey：row * BOARD_SIZE + col，BOARD_SIZE 表示列数 */
const BOARD_SIZE = BOARD_COLS;

/** 棋盘格取值：0 空、1 木块、2 宝石、3 冰木块、4 冰宝石 */
const CELL = Object.freeze({
  EMPTY: 0,
  WOOD: 1,
  GEM: 2,
  ICE_WOOD: 3,
  ICE_GEM: 4,
});

function shape(id, cells) {
  return Object.freeze({
    id,
    cells: Object.freeze(cells.map((cell) => Object.freeze(cell.slice()))),
  });
}

const SHAPES = Object.freeze([
  shape('single', [[0, 0]]),
  shape('h2', [[0, 0], [0, 1]]),
  shape('v2', [[0, 0], [1, 0]]),
  shape('h3', [[0, 0], [0, 1], [0, 2]]),
  shape('v3', [[0, 0], [1, 0], [2, 0]]),
  shape('h4', [[0, 0], [0, 1], [0, 2], [0, 3]]),
  shape('v4', [[0, 0], [1, 0], [2, 0], [3, 0]]),
  shape('square2', [[0, 0], [0, 1], [1, 0], [1, 1]]),
  shape('corner-a', [[0, 0], [1, 0], [1, 1]]),
  shape('corner-b', [[0, 0], [0, 1], [1, 0]]),
  shape('corner-c', [[0, 0], [0, 1], [1, 1]]),
  shape('corner-d', [[0, 1], [1, 0], [1, 1]]),
  shape('l4', [[0, 0], [1, 0], [2, 0], [2, 1]]),
  shape('j4', [[0, 1], [1, 1], [2, 1], [2, 0]]),
  shape('l4-flat', [[0, 0], [0, 1], [0, 2], [1, 0]]),
  shape('t4', [[0, 0], [0, 1], [0, 2], [1, 1]]),
  shape('t4-up', [[0, 1], [1, 0], [1, 1], [1, 2]]),
  shape('z4', [[0, 0], [0, 1], [1, 1], [1, 2]]),
  shape('s4', [[0, 1], [0, 2], [1, 0], [1, 1]]),
  shape('l5', [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]]),
]);

const SCORE_RULES = Object.freeze({
  PLACED_CELL: 5,
  CLEARED_LINE: 50,
  CLEARED_CELL: 2,
  COMBO_BONUS: 25,
  GEM: 15,
  ICE_BREAK: 4,
});

const RULES = Object.freeze({
  /** 每关可用的复活次数（“本局剩余 N 次机会”） */
  REVIVES_PER_LEVEL: 3,
  /** 单个方块携带宝石的概率 */
  PIECE_GEM_CHANCE: 0.45,
  /** 程序生成关：非空格转冰的基础比例（随关卡略升，上限约 0.35） */
  BOARD_ICE_RATIO: 0.22,
  /** 复活时最多清理的行/列数 */
  REVIVE_MAX_LINES: 4,
  /** 侧边栏每日奖励：额外复活次数 */
  SIDEBAR_REWARD_REVIVE: 2,
  /** 侧边栏每日奖励：刷新底部三组方块次数（领取时立刻刷新一次） */
  SIDEBAR_REWARD_REFRESH: 1,
});

/** 棋子皮肤：0=whiteIcon 填充块；1–10=目标猫脸 icon01–10 */
const TILE_SKIN_COUNT = 10;
const BLANK_TILE_SKIN = 0;
/** 托盘组合里单格刷成目标猫脸的概率（可整块全白；多格禁止全是小猫） */
const CELL_TARGET_CHANCE = 0.38;

export {
  APP_NAME,
  BOARD_COLS,
  BOARD_ROWS,
  BOARD_SIZE,
  CELL,
  RULES,
  SCORE_RULES,
  SHAPES,
  TILE_SKIN_COUNT,
  BLANK_TILE_SKIN,
  CELL_TARGET_CHANCE,
};
