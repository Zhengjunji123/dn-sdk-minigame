const FALLBACK_WIDTH = 375;
const FALLBACK_HEIGHT = 667;
let cached = null;
let cacheKey = '';

function host() {
  if (typeof tt !== 'undefined' && tt) return tt;
  if (typeof wx !== 'undefined' && wx) return wx;
  return {};
}

function windowInfo() {
  const api = host();
  try {
    if (typeof api.getWindowInfo === 'function') return api.getWindowInfo() || {};
    if (typeof api.getSystemInfoSync === 'function') return api.getSystemInfoSync() || {};
  } catch (_error) {
    // Development tools may not expose all device APIs.
  }
  return {};
}

function menuRect(width, statusBarHeight) {
  const api = host();
  try {
    if (typeof api.getMenuButtonBoundingClientRect === 'function') {
      const rect = api.getMenuButtonBoundingClientRect();
      if (rect && rect.width > 0) return rect;
    }
  } catch (_error) {
    // Use a stable simulator fallback.
  }
  return {
    left: width - 96,
    right: width - 10,
    top: statusBarHeight + 6,
    bottom: statusBarHeight + 38,
    width: 86,
    height: 32,
  };
}

export function getSafeArea(force) {
  const info = windowInfo();
  const globalObject = typeof GameGlobal !== 'undefined' ? GameGlobal : {};
  const width = Number(globalObject.screenWidth || info.windowWidth || info.screenWidth) || FALLBACK_WIDTH;
  const height = Number(globalObject.screenHeight || info.windowHeight || info.screenHeight) || FALLBACK_HEIGHT;
  const dpr = Number(globalObject.pixelRatio || info.pixelRatio) || 1;
  const statusBarHeight = Number(info.statusBarHeight) || 20;
  const menu = menuRect(width, statusBarHeight);
  const safe = info.safeArea || {};
  const insetBottom = Math.max(
    Number(info.safeAreaInsets && info.safeAreaInsets.bottom) || 0,
    safe.bottom != null ? Math.max(0, height - safe.bottom) : 0
  );
  const key = [width, height, dpr, menu.left, menu.top, insetBottom].join('|');
  if (!force && cached && key === cacheKey) return cached;

  cached = {
    width,
    height,
    dpr,
    statusBarHeight,
    menu: {
      left: Number(menu.left) || width - 96,
      right: Number(menu.right) || width - 10,
      top: Number(menu.top) || statusBarHeight + 6,
      bottom: Number(menu.bottom) || statusBarHeight + 38,
      width: Number(menu.width) || 86,
      height: Number(menu.height) || 32,
    },
    top: Math.max(statusBarHeight, Number(menu.bottom) || statusBarHeight + 38) + 10,
    bottom: Math.max(10, insetBottom),
  };
  cacheKey = key;
  return cached;
}

/**
 * 与 xiaoxiaolei-001 `getTopSafeLayout()` 同形状的顶栏布局（宝箱 / 协议页 / 胶囊格子广告共用）。
 * barY/barH 与微信胶囊对齐；bottomInset 夹在 20~40。
 */
export function getTopSafeLayout() {
  const area = getSafeArea();
  const menu = area.menu;
  const barH = Math.max(30, menu.height);
  const bottomInset = Math.min(40, Math.max(20, area.bottom));
  return {
    width: area.width,
    height: area.height,
    statusBar: area.statusBarHeight,
    menu,
    barY: menu.top,
    barH,
    rightSafe: menu.left - 8,
    backSize: Math.min(42, barH + 8),
    bottomInset,
  };
}

export function setupCanvas(canvas) {
  if (!canvas) return getSafeArea();
  const area = getSafeArea(true);
  canvas.width = Math.max(1, Math.round(area.width * area.dpr));
  canvas.height = Math.max(1, Math.round(area.height * area.dpr));
  return area;
}

export default getSafeArea;
