/**
 * 方块棋盘常量工厂。默认对齐 xiaoxiaolei-002，业务用 createGridRules({ appName, cols, rows }) 覆盖。
 */

function shape(id, cells) {
  return Object.freeze({
    id,
    cells: Object.freeze(cells.map((cell) => Object.freeze(cell.slice()))),
  });
}

export const DEFAULT_SHAPES = Object.freeze([
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

export const CELL = Object.freeze({
  EMPTY: 0,
  WOOD: 1,
  GEM: 2,
  ICE_WOOD: 3,
  ICE_GEM: 4,
});

export function createGridRules(opts) {
  const o = opts && typeof opts === 'object' ? opts : {};
  const cols = Number(o.cols) > 0 ? Math.floor(o.cols) : 8;
  const rows = Number(o.rows) > 0 ? Math.floor(o.rows) : 10;
  return Object.freeze({
    APP_NAME: o.appName || 'block-puzzle',
    BOARD_COLS: cols,
    BOARD_ROWS: rows,
    BOARD_SIZE: cols,
    CELL: o.cell || CELL,
    SHAPES: o.shapes || DEFAULT_SHAPES,
    SCORE_RULES: Object.freeze(
      Object.assign(
        {
          PLACED_CELL: 5,
          CLEARED_LINE: 50,
          CLEARED_CELL: 2,
          COMBO_BONUS: 25,
          GEM: 15,
          ICE_BREAK: 4,
        },
        o.scoreRules || {}
      )
    ),
    RULES: Object.freeze(
      Object.assign(
        {
          REVIVES_PER_LEVEL: 3,
          PIECE_GEM_CHANCE: 0.45,
          BOARD_ICE_RATIO: 0.22,
          REVIVE_MAX_LINES: 4,
          SIDEBAR_REWARD_REVIVE: 2,
          SIDEBAR_REWARD_REFRESH: 1,
        },
        o.rules || {}
      )
    ),
    TILE_SKIN_COUNT: o.tileSkinCount == null ? 10 : o.tileSkinCount,
    BLANK_TILE_SKIN: o.blankTileSkin == null ? 0 : o.blankTileSkin,
    CELL_TARGET_CHANCE: o.cellTargetChance == null ? 0.38 : o.cellTargetChance,
  });
}

export default createGridRules();
