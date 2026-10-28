/**
 * 资源加载（仅宝箱等变现 UI 所需，无玩法皮肤）。
 */
import { getHost } from '../host/runtime-host.js';

export const ASSET_PATHS = Object.freeze({
  chestLoot: 'images/Loot.png',
  chestLooted: 'images/Looted.png',
});

export const ASSET_KEYS = Object.freeze(Object.keys(ASSET_PATHS));

const TIMEOUT_MS = 5000;
const _store = Object.create(null);
let _batch = null;

export function getAsset(key) {
  const hit = _store[key];
  return hit && hit.width && hit.height ? hit : null;
}

function createImage() {
  const host = getHost();
  if (typeof host.createImage === 'function') return host.createImage();
  if (typeof Image !== 'undefined') return new Image();
  return null;
}

function loadOne(key, src) {
  return new Promise((resolve) => {
    if (getAsset(key)) {
      resolve({ key, ok: true, cached: true });
      return;
    }
    const img = createImage();
    if (!img || !src) {
      resolve({ key, ok: false });
      return;
    }
    let sealed = false;
    const finish = (ok, err) => {
      if (sealed) return;
      sealed = true;
      clearTimeout(timer);
      img.onload = null;
      img.onerror = null;
      if (!ok) {
        _store[key] = null;
        console.warn('[资源加载失败]', src, err || 'timeout');
      }
      resolve({ key, ok });
    };
    const timer = setTimeout(() => finish(false, 'timeout'), TIMEOUT_MS);
    img.onload = () => {
      _store[key] = img;
      finish(true);
    };
    img.onerror = (err) => finish(false, err);
    img.src = src;
  });
}

export function loadAssetKeys(keys, onProgress) {
  const list = (keys || []).filter((k) => !!ASSET_PATHS[k]);
  let done = 0;
  const ping = () => {
    if (typeof onProgress === 'function') onProgress(list.length ? done / list.length : 1);
  };
  ping();
  return Promise.all(
    list.map(async (key) => {
      const result = await loadOne(key, ASSET_PATHS[key]);
      done += 1;
      ping();
      return result;
    })
  );
}

export function loadAssets(onProgress) {
  if (_batch) return _batch;
  _batch = loadAssetKeys(ASSET_KEYS, onProgress);
  return _batch;
}

export function drawImageCover(ctx, img, x, y, w, h) {
  if (!img || !img.width || !img.height) return false;
  const scale = Math.max(w / img.width, h / img.height);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (img.width - sw) / 2;
  const sy = (img.height - sh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  return true;
}

export function drawImageContain(ctx, img, x, y, w, h) {
  if (!img || !img.width || !img.height) return false;
  const scale = Math.min(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  return true;
}

export function drawImageAsset(ctx, key, x, y, w, h, mode = 'contain') {
  const img = getAsset(key);
  if (!img) return false;
  return mode === 'cover'
    ? drawImageCover(ctx, img, x, y, w, h)
    : drawImageContain(ctx, img, x, y, w, h);
}
