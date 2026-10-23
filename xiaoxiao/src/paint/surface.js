/**
 * Canvas 上下文创建。
 * 色值全部在 draw.js / board-view.js / effects.js 里硬编码，这里不做任何算色，
 * 也不给 getContext 传 alpha / colorSpace 之类可能在真机（helium）上表现不一致的选项。
 */
export function createGameContext(canvas) {
  if (!canvas || typeof canvas.getContext !== 'function') {
    throw new Error('canvas.getContext unavailable');
  }
  const context = canvas.getContext('2d');
  if (!context) throw new Error('无法创建 2d 上下文');

  try {
    // 关闭平滑：木块是矢量几何，开平滑会加重每帧填充成本
    context.imageSmoothingEnabled = false;
  } catch (_err) {
    /* ignore */
  }
  return context;
}
