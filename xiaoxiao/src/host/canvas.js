import { getHost } from './runtime-host.js';

function readWindowInfo(host) {
  try {
    if (typeof host.getWindowInfo === 'function') return host.getWindowInfo();
    if (typeof host.getSystemInfoSync === 'function') return host.getSystemInfoSync();
  } catch (err) {
    console.warn('[窗口信息读取失败]', err);
  }
  return {};
}

function readViewport(info) {
  const width = Number(info.windowWidth || info.screenWidth) || 375;
  const height = Number(info.windowHeight || info.screenHeight) || 667;
  const rawRatio = Number(info.pixelRatio || info.devicePixelRatio) || 1;
  // 封顶 2：3x 屏每帧像素量翻倍，木块分层绘制时更容易卡
  return {
    width,
    height,
    pixelRatio: Math.min(2, Math.max(1, rawRatio)),
  };
}

function createSurface(host) {
  if (typeof host.createCanvas !== 'function') {
    throw new Error('当前环境不支持 createCanvas');
  }
  return host.createCanvas();
}

const host = getHost();
const canvas = createSurface(host);
const viewport = readViewport(readWindowInfo(host));

export const SCREEN_WIDTH = viewport.width;
export const SCREEN_HEIGHT = viewport.height;
export const PIXEL_RATIO = viewport.pixelRatio;

canvas.width = Math.max(1, Math.round(SCREEN_WIDTH * PIXEL_RATIO));
canvas.height = Math.max(1, Math.round(SCREEN_HEIGHT * PIXEL_RATIO));
if (canvas.style) {
  canvas.style.width = `${SCREEN_WIDTH}px`;
  canvas.style.height = `${SCREEN_HEIGHT}px`;
}

GameGlobal.canvas = canvas;
GameGlobal.screenWidth = SCREEN_WIDTH;
GameGlobal.screenHeight = SCREEN_HEIGHT;
GameGlobal.pixelRatio = PIXEL_RATIO;

if (typeof globalThis !== 'undefined') globalThis.canvas = canvas;

export function snapPx(value) {
  return Math.round(Number(value) * PIXEL_RATIO) / PIXEL_RATIO;
}

export function snapRect(x, y, width, height) {
  const left = snapPx(x);
  const top = snapPx(y);
  const right = snapPx(x + width);
  const bottom = snapPx(y + height);
  const minimum = 1 / PIXEL_RATIO;
  return {
    x: left,
    y: top,
    w: Math.max(minimum, right - left),
    h: Math.max(minimum, bottom - top),
  };
}
