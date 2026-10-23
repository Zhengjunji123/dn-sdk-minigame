/**
 * 侧边栏引导图与礼包图标的轻量加载。
 */
import { getHost } from '../host/runtime-host.js';

const PATHS = Object.freeze({
  iconGift: 'images/icon_gift.png',
  sidebarGuide01: 'images/001.png',
  sidebarGuide02: 'images/002.png',
});

const cache = Object.create(null);
let loading = false;

function createImage() {
  const host = getHost();
  if (typeof host.createImage === 'function') return host.createImage();
  if (typeof Image !== 'undefined') return new Image();
  return null;
}

function loadOne(key, src) {
  return new Promise((resolve) => {
    const img = createImage();
    if (!img) {
      resolve(null);
      return;
    }
    const done = () => {
      cache[key] = img;
      resolve(img);
    };
    const fail = () => {
      cache[key] = null;
      resolve(null);
    };
    img.onload = done;
    img.onerror = fail;
    img.src = src;
  });
}

export function getSidebarAsset(key) {
  return cache[key] || null;
}

export function preloadSidebarAssets() {
  if (loading) return Promise.resolve(cache);
  loading = true;
  return Promise.all(
    Object.keys(PATHS).map((key) => loadOne(key, PATHS[key]))
  ).then(() => cache);
}

export function drawImageCover(ctx, img, x, y, w, h) {
  if (!img || !img.width || !img.height) return;
  const scale = Math.max(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  const dx = x + (w - dw) / 2;
  const dy = y + (h - dh) / 2;
  ctx.drawImage(img, dx, dy, dw, dh);
}

export function drawImageContain(ctx, img, x, y, w, h) {
  if (!img || !img.width || !img.height) return;
  const scale = Math.min(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  const dx = x + (w - dw) / 2;
  const dy = y + (h - dh) / 2;
  ctx.drawImage(img, dx, dy, dw, dh);
}
