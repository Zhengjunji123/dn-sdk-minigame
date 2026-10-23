/**
 * 主包图片资源按 key 加载与缓存。
 * 首页 / 加载页走原素材；对局填充块与界面为矢量绘制。
 * 侧边栏引导图仍走 sidebar-assets.js。
 */
import { getHost } from '../host/runtime-host.js';
import { BLANK_TILE_SKIN, TILE_SKIN_COUNT } from '../board/grid-rules.js';

export const ASSET_PATHS = Object.freeze({
  splashBg: 'images/bg.png',
  splashLogo: 'images/logo.png',
  musicOn: 'images/musicIcon.png',
  musicOff: 'images/no-musicIcon.png',
  voxOn: 'images/voxIcon.png',
  voxOff: 'images/no-voxIcon.png',
  startBtn: 'images/btn-start.png',
  popTitle: 'images/popTitle.png',
  homeIcon: 'images/homeIcon.png',
  arenaBg: 'images/homeBg.png',
  settingIcon: 'images/settingIcon.png',
  goalPop: 'images/mubiaoPop.png',
  toolRefresh: 'images/shuaxinIcon.png',
  toolRestart: 'images/congkaiIcon.png',
  toolSkip: 'images/passIcon.png',
  tileBlank: 'images/whiteIcon.png',
  tile1: 'images/icon01.png',
  tile2: 'images/icon02.png',
  tile3: 'images/icon03.png',
  tile4: 'images/icon04.png',
  tile5: 'images/icon05.png',
  tile6: 'images/icon06.png',
  tile7: 'images/icon07.png',
  tile8: 'images/icon08.png',
  tile9: 'images/icon09.png',
  tile10: 'images/icon10.png',
  chestLoot: 'images/Loot.png',
  chestLooted: 'images/Looted.png',
  hpBolt: 'images/icon-hp.png',
});

export function tileAssetKey(skin) {
  const raw = Math.floor(Number(skin) || 0);
  if (raw <= BLANK_TILE_SKIN) return 'tileBlank';
  const n = Math.max(1, Math.min(TILE_SKIN_COUNT, raw));
  return `tile${n}`;
}

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

/** 按 key 绘制；资源缺失返回 false，调用方可画兜底图形 */
export function drawImageAsset(ctx, key, x, y, w, h, mode = 'contain') {
  const img = getAsset(key);
  if (!img) return false;
  return mode === 'cover'
    ? drawImageCover(ctx, img, x, y, w, h)
    : drawImageContain(ctx, img, x, y, w, h);
}
