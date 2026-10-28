/**
 * 棋盘常量（供 findValidPlacement / 配置引用），无关卡生成与计分玩法。
 */
const APP_NAME = 'xiaoxiao-sdk-shell';

const BOARD_COLS = 8;
const BOARD_ROWS = 10;
const BOARD_SIZE = BOARD_COLS;

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

/** findValidPlacement 解析 piece.shape 字符串时需要 */
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

const RULES = Object.freeze({
  SIDEBAR_REWARD_REVIVE: 2,
  SIDEBAR_REWARD_REFRESH: 1,
});

export {
  APP_NAME,
  BOARD_COLS,
  BOARD_ROWS,
  BOARD_SIZE,
  CELL,
  RULES,
  SHAPES,
};
