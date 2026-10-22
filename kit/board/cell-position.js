/**
 * 棋盘格像素坐标。layout 需含 boardX / boardY / cell / gap，可选 pad。
 */
export function boardPad(layout) {
  if (!layout) return 0;
  return layout.pad == null ? layout.gap || 0 : layout.pad;
}

export function boardCellPosition(layout, row, col) {
  const pad = boardPad(layout);
  return {
    x: layout.boardX + pad + col * (layout.cell + layout.gap),
    y: layout.boardY + pad + row * (layout.cell + layout.gap),
  };
}
