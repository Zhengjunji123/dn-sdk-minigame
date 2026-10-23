import getSafeArea from '../paint/inset.js';
import {
  drawText,
  roundRect,
  roundRectTwoTone,
} from '../paint/ink.js';
import { easeOutCubic } from '../paint/ease.js';
import { preloadSidebarAssets } from '../paint/rail-assets.js';
import {
  drawImageAsset,
  loadAssetKeys,
  loadAssets,
} from '../paint/media.js';
import { readSave } from '../host/persist.js';
import GameConfig from '../conf/root.js';
import { getEntryFirstAdPromise, getEntryFlowPromise } from '../monetize/entry-pipe.js';
import { DataNexus } from '../monetize/sdk-facade.js';

const MIN_LOADING_MS = Math.max(0, Number(GameConfig.minLoadingMs) || 1600);
const VERSION = `V${GameConfig.version || '1.0.0'}`;
/** 等首支入场广告盖在 Loading 上再进对局（体感更快，对齐 001） */
const ENTRY_FIRST_AD_WAIT_MS = 4500;

const SPLASH_FALLBACK_BG = '#2b7dff';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, Number(ms) || 0)));
}

async function waitEntryFirstAdForFeel() {
  const ready = GameGlobal.sdkReady;
  if (ready && typeof ready.then === 'function') {
    await ready.catch(() => {});
  }
  const t0 = Date.now();
  while (!getEntryFirstAdPromise() && !getEntryFlowPromise() && Date.now() - t0 < 2000) {
    await sleep(40);
  }
  const first = getEntryFirstAdPromise();
  if (!first) return;
  await Promise.race([first, sleep(ENTRY_FIRST_AD_WAIT_MS)]);
}

const ADVICE_HEAD = '《健康游戏忠告》';
const ADVICE_BODY = [
  '抵制不良游戏，拒绝盗版游戏。注意自我保护，谨防受骗上当。',
  '适度游戏益脑，沉迷游戏伤身。合理安排时间，享受健康生活。',
];

/** 对齐参考图：深灰描边胶囊轨 + 奶油底 + 橙黄斜纹填充 + 顶部高光 */
function paintBar(ctx, x, y, w, h, ratio, drift) {
  const radius = h / 2;
  // 外轨：浅奶油底 + 深灰描边
  roundRect(ctx, x, y, w, h, radius, '#f5f0e6', '#4a4a4a', 2);
  // 内轨再压一层更亮的未填色，贴近参考稿右侧留白
  roundRect(ctx, x + 1.5, y + 1.5, w - 3, h - 3, Math.max(1, radius - 1.5), '#fffaf2');

  const pad = 2.5;
  const innerX = x + pad;
  const innerY = y + pad;
  const innerH = Math.max(2, h - pad * 2);
  const innerW = Math.max(0, w - pad * 2);
  const filled = Math.max(0, innerW * Math.min(1, Math.max(0, ratio)));
  if (filled <= 0) return;

  const r = Math.max(1, radius - pad);
  ctx.save();
  // 填充区圆角裁剪（右端也保持胶囊弧）
  ctx.beginPath();
  ctx.moveTo(innerX + r, innerY);
  ctx.arcTo(innerX + filled, innerY, innerX + filled, innerY + innerH, r);
  ctx.arcTo(innerX + filled, innerY + innerH, innerX, innerY + innerH, r);
  ctx.arcTo(innerX, innerY + innerH, innerX, innerY, r);
  ctx.arcTo(innerX, innerY, innerX + filled, innerY, r);
  ctx.closePath();
  ctx.clip();

  // 底色：上半偏黄、下半偏橙（纯色叠层，避免真机渐变色差）
  roundRectTwoTone(ctx, innerX, innerY, Math.max(filled, innerH), innerH, r, '#ffcc3a', '#ff8c1a', 0.48);

  // 斜纹：亮黄 / 深橙交替，轻微漂移形成加载动感
  const step = Math.max(7, Math.round(innerH * 0.72));
  const skew = innerH * 0.95;
  const offset = ((drift || 0) * 28) % (step * 2);
  for (let sx = innerX - skew - step * 2 + offset; sx < innerX + filled + skew; sx += step) {
    const even = Math.floor((sx - innerX - offset) / step) % 2 === 0;
    ctx.fillStyle = even ? 'rgba(255, 236, 140, 0.55)' : 'rgba(230, 90, 10, 0.28)';
    ctx.beginPath();
    ctx.moveTo(sx, innerY);
    ctx.lineTo(sx + step * 0.62, innerY);
    ctx.lineTo(sx + step * 0.62 + skew, innerY + innerH);
    ctx.lineTo(sx + skew, innerY + innerH);
    ctx.closePath();
    ctx.fill();
  }

  // 顶部高光条：塑料质感
  roundRect(ctx, innerX + 1, innerY + 1, Math.max(0, filled - 2), Math.max(2, innerH * 0.38), r * 0.6, 'rgba(255,255,255,0.32)');
  // 顶边轻微内阴影
  ctx.fillStyle = 'rgba(160, 60, 0, 0.18)';
  ctx.fillRect(innerX, innerY, filled, 1.5);
  ctx.restore();
}

function createSplashScreen() {
  let elapsed = 0;
  let loadPct = 0;
  let finished = false;
  let navigated = false;
  let bootMark = 0;

  function goPlay() {
    if (!finished || navigated) return;
    navigated = true;
    if (GameConfig.lobbyEnabled) {
      this.manager.go('lobby');
      return;
    }
    const level = Number(readSave('level', 1)) || 1;
    this.manager.go('arena', { level });
  }

  async function runBootstrap() {
    const t0 = Date.now();
    loadPct = 0.04;
    // 优先拉加载页素材，首帧就能铺上背景与 Logo
    await loadAssetKeys(['splashBg', 'splashLogo'], (v) => {
      loadPct = Math.max(loadPct, 0.04 + v * 0.16);
    }).catch((err) => console.warn('[加载页素材]', err));
    loadPct = Math.max(loadPct, 0.22);
    await Promise.all([
      preloadSidebarAssets().catch(() => null),
      loadAssets((v) => {
        loadPct = Math.max(loadPct, 0.22 + v * 0.5);
      }).catch((err) => console.warn('[加载宝箱资源]', err)),
    ]);
    loadPct = Math.max(loadPct, 0.72);
    const floorWait = new Promise((done) => {
      const pulse = () => {
        const spent = Date.now() - t0;
        loadPct = Math.min(0.96, Math.max(loadPct, 0.72 + (spent / Math.max(1, MIN_LOADING_MS)) * 0.24));
        if (spent >= MIN_LOADING_MS) done();
        else setTimeout(pulse, 30);
      };
      pulse();
    });
    // 资源 + 最低展示时长 + 首支入场广告（最多 4.5s）三者齐了再进对局
    await Promise.all([floorWait, waitEntryFirstAdForFeel()]);
    loadPct = 1;
    finished = true;
    await sleep(120);
    // 真正的 LOAD_FINISH：资源、最低时长与首支入场广告等待均完成
    DataNexus.reportIaaLoadFinish();
    goPlay.call(this);
  }

  return {
    mount() {
      elapsed = 0;
      loadPct = 0;
      finished = false;
      navigated = false;
      bootMark = Date.now();
      runBootstrap.call(this);
    },

    update(dt) {
      elapsed += Math.max(0, dt || 0);
    },

    render(ctx, width, height) {
      const area = getSafeArea();
      const w = width || area.width;
      const h = height || area.height;
      const motion = Math.min(1, (Date.now() - (bootMark || Date.now())) / MIN_LOADING_MS);
      const progress = easeOutCubic(Math.min(1, Math.max(motion, loadPct)));

      ctx.fillStyle = SPLASH_FALLBACK_BG;
      ctx.fillRect(0, 0, w, h);
      drawImageAsset(ctx, 'splashBg', 0, 0, w, h, 'cover');

      const logoMaxW = w * 0.78;
      const logoMaxH = h * 0.28;
      const logoTop = h * 0.14;
      drawImageAsset(ctx, 'splashLogo', (w - logoMaxW) / 2, logoTop, logoMaxW, logoMaxH, 'contain');

      const bar = { x: w * 0.14, y: h * 0.68, w: w * 0.72, h: 22 };
      paintBar(ctx, bar.x, bar.y, bar.w, bar.h, progress, elapsed);

      const pad = (area.bottom || 16) + 10;
      const adviceY = h - pad - 52;
      drawText(ctx, ADVICE_HEAD, w / 2, adviceY, 13, '#ffffff', 'center', 700, 'rgba(20,60,140,0.35)', 2);
      ADVICE_BODY.forEach((line, index) => {
        drawText(ctx, line, w / 2, adviceY + 18 + index * 16, 10, 'rgba(255,255,255,0.92)', 'center', 400, 'rgba(20,60,140,0.28)', 2);
      });
      drawText(ctx, VERSION, w / 2, adviceY + 54, 10, 'rgba(255,255,255,0.55)');
    },
  };
}

export default class SplashScreen {
  constructor() {
    const api = createSplashScreen();
    Object.setPrototypeOf(api, SplashScreen.prototype);
    return api;
  }
}
