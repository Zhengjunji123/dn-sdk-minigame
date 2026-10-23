/**
 * 开宝箱弹窗（移植自 xiaoxiaolei-001，对齐成语填空 ChestFlow）
 * 广告走 AD.show：chest_feed(type6) / chest_grid(type7)
 *
 * 阶段机（勿改语义）：WAITING → TAPPING → AD_COVER → CLAIMABLE → DONE
 *
 * 002 融合：后台 chest.rewardUndo / rewardShuffle 字段名沿用，玩法映射为
 *   rewardUndo    → 复活次数（GameGlobal.chestBoost.revive）
 *   rewardShuffle → 刷新方块次数（GameGlobal.chestBoost.refresh）
 * 领取弹窗时即到账，play.js 使用道具时优先扣 chestBoost。
 */
import { AD, DataNexus, IAA_ITEM_SOURCE } from './sdk-facade.js';
import { SCREEN_HEIGHT, SCREEN_WIDTH } from '../host/canvas.js';
import {
  drawImageAsset,
  drawLabel,
  drawLightning,
  drawMenuButton,
  drawRoundRect,
  fillEllipse,
  HitArea,
  makeVerticalGradient,
  roundPath,
} from '../paint/chips.js';
import { getTopSafeLayout } from '../paint/inset.js';
import { capsuleGridAdStyle } from '../paint/ad-layout.js';
import { getEntryConfig } from './entry-pipe.js';
import GameConfig from '../conf/root.js';

export const CHEST_FEED_CODE = 'chest_feed';
export const CHEST_GRID_CODE = 'chest_grid';

const DESIGN_WIDTH = 750;
const PHASE = {
  IDLE: 'idle',
  WAITING: 'waiting',
  TAPPING: 'tapping',
  AD_COVER: 'ad_cover',
  CLAIMABLE: 'claimable',
  DONE: 'done',
};

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function pickInt(range) {
  const min = Math.floor(Number(range && range.min) || 0);
  const max = Math.floor(Number(range && range.max) || 0);
  if (max <= min) return min;
  return min + Math.floor(Math.random() * (max - min + 1));
}

function easeOutBack(t) {
  const x = clamp(t, 0, 1);
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

function easeOutCubic(t) {
  const x = 1 - clamp(t, 0, 1);
  return 1 - x * x * x;
}

function defaultChestCfg() {
  return {
    enabled: true,
    progressPercent: { min: 60, max: 90 },
    clickGainPercent: 5,
    idleMs: 300,
    decayIntervalMs: 200,
    decayPercent: 2,
    rewardUndo: 1,
    rewardShuffle: 1,
    rewardHp: 2,
    preload: true,
    feedIdleHideMs: 5000,
    directPullDelayMs: { min: 0, max: 0 },
  };
}

/** 后台字段 → 002 道具 */
export function chestRewardsFromCfg(cfg) {
  const hp = Math.max(0, Math.floor(Number(cfg && cfg.rewardHp) || 0));
  const revive = Math.max(
    0,
    Math.floor(Number(cfg && cfg.rewardUndo != null ? cfg.rewardUndo : hp || 1) || 0)
  );
  const refresh = Math.max(
    0,
    Math.floor(Number(cfg && cfg.rewardShuffle != null ? cfg.rewardShuffle : hp || 1) || 0)
  );
  return { revive, refresh, hp };
}

export function readChestBoost() {
  const boost = GameGlobal.chestBoost || {};
  return {
    revive: Math.max(0, Number(boost.revive) || 0),
    refresh: Math.max(0, Number(boost.refresh) || 0),
  };
}

export default class ChestFlow {
  constructor() {
    this.phase = PHASE.IDLE;
    this.progress = 0;
    this.target = 80;
    this.hits = {};
    this._sessionShown = false;
    this._waitTimer = 0;
    this._lastTapAt = 0;
    this._decayAcc = 0;
    this._leftDuringAd = false;
    this._boundHide = null;
    this._boundShow = null;
    this._adShowToken = 0;
    this._feedIdleTimer = 0;
    this._btnPunch = 0;
    this._chestPunch = 0;
    this._enterT = 0;
    this._claimT = 0;
    this._displayProgress = 0;
    this._age = 0;
    this._sparks = [];
    this._feedShowing = false;
    this._gridShowing = false;
    this._doneResolve = null;
    this._runtimeCfg = null;
    this._skipFirstWait = false;
    this._onClaimed = null;
  }

  /** 领取回调：(rewards: {revive, refresh}) => void（play.js 用来加道具 / 刷新 UI） */
  setClaimListener(fn) {
    this._onClaimed = typeof fn === 'function' ? fn : null;
  }

  isOpen() {
    return (
      this.phase === PHASE.TAPPING ||
      this.phase === PHASE.AD_COVER ||
      this.phase === PHASE.CLAIMABLE
    );
  }

  isBlocking() {
    return this.isOpen() || this.phase === PHASE.WAITING;
  }

  /**
   * 供入场漏斗 await：弹出宝箱直到领取/关闭。
   * @param {object} [resolvedEntry] entry-flow 合并后的配置
   * @param {{ skipFirstWait?: boolean }} [opts]
   */
  runSession(resolvedEntry, opts) {
    return new Promise((resolve) => {
      this._doneResolve = resolve;
      this._runtimeCfg = (resolvedEntry && resolvedEntry.chest) || null;
      this._skipFirstWait = !!(opts && opts.skipFirstWait);
      this.startForPlay(resolvedEntry);
    });
  }

  startForPlay(resolvedEntry) {
    this._clearTimers();
    if (GameConfig && GameConfig.adEnabled === false) {
      this.phase = PHASE.IDLE;
      this._finishSession({ ok: true, skipped: true, reason: 'ad_disabled' });
      return;
    }
    if (this.phase === PHASE.DONE || this._sessionShown) {
      this._finishSession({ ok: true, skipped: true, reason: 'already_shown' });
      return;
    }
    if (resolvedEntry && resolvedEntry.chest) {
      this._runtimeCfg = resolvedEntry.chest;
    }
    const cfg = this._cfg();
    if (cfg.enabled === false) {
      this.phase = PHASE.IDLE;
      this._finishSession({ ok: true, skipped: true, reason: 'chest_disabled' });
      return;
    }
    this._beginAfterConfig(resolvedEntry);
  }

  stop() {
    this._unbindVisibility();
    this._clearTimers();
    this._hideAds(true);
    if (this.isOpen() || this.phase === PHASE.WAITING) {
      this._sessionShown = true;
      this.phase = PHASE.DONE;
      this._restorePlayAds();
      this._finishSession({ ok: true, reason: 'stopped' });
    }
  }

  update(dt) {
    const sec = Math.max(0, Number(dt) || 0);
    const dtMs = sec * 1000;
    this._age += sec;

    if (this._btnPunch > 0) {
      this._btnPunch = Math.max(0, this._btnPunch - dtMs / 130);
    }
    if (this._chestPunch > 0) {
      this._chestPunch = Math.max(0, this._chestPunch - dtMs / 180);
    }
    if (this.isOpen() && this._enterT < 1) {
      this._enterT = Math.min(1, this._enterT + sec / 0.38);
    }
    if (this.phase === PHASE.CLAIMABLE && this._claimT < 1) {
      this._claimT = Math.min(1, this._claimT + sec / 0.32);
    }

    const lerp = 1 - Math.pow(0.001, sec);
    this._displayProgress += (this.progress - this._displayProgress) * clamp(lerp * 14, 0, 1);

    if (this._sparks.length) {
      const next = [];
      for (let i = 0; i < this._sparks.length; i += 1) {
        const p = this._sparks[i];
        p.life -= sec;
        if (p.life <= 0) continue;
        p.x += p.vx * sec;
        p.y += p.vy * sec;
        p.vy += 420 * sec;
        p.rot += p.spin * sec;
        next.push(p);
      }
      this._sparks = next;
    }

    if (this.phase !== PHASE.TAPPING) return;
    const cfg = this._cfg();
    const now = Date.now();
    if (now - this._lastTapAt < cfg.idleMs) {
      this._decayAcc = 0;
      return;
    }
    this._decayAcc += dtMs;
    while (this._decayAcc >= cfg.decayIntervalMs && this.progress > 0) {
      this._decayAcc -= cfg.decayIntervalMs;
      this.progress = Math.max(0, this.progress - cfg.decayPercent);
    }
  }

  tap(x, y) {
    if (this.phase === PHASE.TAPPING && this.hits.fast && this.hits.fast.contains(x, y)) {
      this._onFastClick();
      return true;
    }
    if (this.phase === PHASE.CLAIMABLE && this.hits.claim && this.hits.claim.contains(x, y)) {
      this._onClaim();
      return true;
    }
    if (
      (this.phase === PHASE.TAPPING || this.phase === PHASE.CLAIMABLE) &&
      this._hitChestImage(x, y)
    ) {
      if (this.phase === PHASE.TAPPING) {
        this._chestPunch = Math.max(this._chestPunch, 0.55);
      }
      return true;
    }
    return this.isOpen();
  }

  shouldDeferTouchToNative() {
    return this.phase === PHASE.AD_COVER && this._feedShowing;
  }

  draw(ctx, w, h) {
    if (!this.isOpen()) return;
    this._layout(w, h);
    const enter = easeOutBack(this._enterT);
    ctx.fillStyle = `rgba(8,10,12,${0.72 * clamp(this._enterT, 0, 1)})`;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(w / 2, h * 0.52);
    ctx.scale(enter, enter);
    ctx.translate(-w / 2, -h * 0.52);
    if (this.phase === PHASE.CLAIMABLE) {
      this._drawClaimable(ctx, w);
    } else {
      this._drawTapping(ctx, w);
    }
    this._drawSparks(ctx);
    ctx.restore();
  }

  _finishSession(payload) {
    const resolve = this._doneResolve;
    this._doneResolve = null;
    if (typeof resolve === 'function') resolve(payload || { ok: true });
  }

  _cfg() {
    const entry = getEntryConfig();
    const fromEntry = (entry && entry.chest) || {};
    const runtime = this._runtimeCfg || {};
    return Object.assign({}, defaultChestCfg(), fromEntry, runtime);
  }

  _firstWaitMs(resolvedEntry) {
    if (this._skipFirstWait) return 0;
    const timing =
      (resolvedEntry && resolvedEntry.rewardedTiming) ||
      (getEntryConfig() && getEntryConfig().rewardedTiming) ||
      {};
    const range = timing.firstDelayRangeMs || { min: 0, max: 0 };
    return pickInt(range);
  }

  _beginAfterConfig(resolvedEntry) {
    // 一进宝箱流程就压掉玩法广告（含 WAITING），避免原生层盖住 Canvas 宝箱
    this._hidePlayAds();
    const waitMs = this._firstWaitMs(resolvedEntry);
    this.phase = PHASE.WAITING;
    this._waitTimer = setTimeout(() => this._openPopup(), Math.max(0, waitMs));
  }

  _openPopup() {
    if (this.phase !== PHASE.WAITING) return;
    this._sessionShown = true;
    const cfg = this._cfg();
    this.progress = 0;
    this._displayProgress = 0;
    this.target = pickInt(cfg.progressPercent);
    this._lastTapAt = Date.now();
    this._decayAcc = 0;
    this._btnPunch = 0;
    this._chestPunch = 0;
    this._enterT = 0;
    this._claimT = 0;
    this._sparks = [];
    this._age = 0;
    this.phase = PHASE.TAPPING;
    this._showGrid();
    this._hidePlayAds();
  }

  _onFastClick() {
    if (this.phase !== PHASE.TAPPING) return;
    const cfg = this._cfg();
    this.progress = clamp(this.progress + cfg.clickGainPercent, 0, 100);
    this._lastTapAt = Date.now();
    this._decayAcc = 0;
    this._btnPunch = 1;
    this._chestPunch = 1;
    this._spawnClickSparks();
    if (this.progress + 0.0001 >= this.target) {
      this.progress = Math.max(this.progress, this.target);
      this._spawnBurstSparks(18);
      this._enterAdCover();
    }
  }

  _enterAdCover() {
    this.phase = PHASE.AD_COVER;
    this._bindVisibility();
    this._showFeed();
  }

  _enterClaimable() {
    this._unbindVisibility();
    this._hideFeed();
    this._claimT = 0;
    this._spawnBurstSparks(28);
    this.phase = PHASE.CLAIMABLE;
  }

  _onClaim() {
    if (this.phase !== PHASE.CLAIMABLE) return;
    const rewards = chestRewardsFromCfg(this._cfg());
    const cur = readChestBoost();
    GameGlobal.chestBoost = {
      revive: cur.revive + rewards.revive,
      refresh: cur.refresh + rewards.refresh,
    };
    try {
      if (rewards.revive > 0 || rewards.refresh > 0) {
        DataNexus.reportIaaGetItem(IAA_ITEM_SOURCE.AD);
        DataNexus.reportIaaGiftGet();
      }
    } catch (_e) {
      /* ignore */
    }
    this._spawnBurstSparks(36);
    try {
      wx.showToast({
        title: `领取成功 复活+${rewards.revive} 刷新+${rewards.refresh}`,
        icon: 'none',
        duration: 2000,
      });
    } catch (_e) {
      /* ignore */
    }
    if (this._onClaimed) {
      try {
        this._onClaimed(rewards);
      } catch (err) {
        console.warn('[chest] claim listener', err);
      }
    }
    this._finish();
  }

  _finish() {
    this._unbindVisibility();
    this._hideAds(true);
    this.phase = PHASE.DONE;
    this._restorePlayAds();
    this._finishSession({ ok: true, reason: 'claimed' });
  }

  _layout(w = SCREEN_WIDTH, h = SCREEN_HEIGHT) {
    const s = w / DESIGN_WIDTH;
    const safe = getTopSafeLayout();
    const line1Size = Math.round(46 * s);
    const line2Size = Math.round(70 * s);
    const lineGap = Math.round(line1Size * 0.92 + line2Size * 0.42);
    const titleBlockH = lineGap + Math.round(8 * s);
    const gapTitleChest = Math.round(28 * s);
    const chestW = Math.round(368 * s);
    const chestH = chestW;
    const extra = this.phase === PHASE.CLAIMABLE ? Math.round(line1Size * 0.85) : 0;
    const barH = Math.round(32 * s);
    const gapChestBar = Math.round(20 * s);
    const btnH = Math.round(100 * s);
    const gapBarBtn = Math.round(36 * s);
    const btnW = Math.round(288 * s);
    const feedW = Math.min(w * 0.82, Math.max(btnW + Math.round(64 * s), Math.round(520 * s)));
    const barW = Math.min(w * 0.58, Math.round(432 * s));

    const stackH =
      titleBlockH +
      gapTitleChest +
      extra +
      chestH +
      (this.phase === PHASE.CLAIMABLE ? Math.round(16 * s) : gapChestBar + barH + gapBarBtn) +
      btnH;
    const minTop = (safe.barY || 0) + (safe.barH || 32) + Math.round(12 * s);
    const maxTop = Math.max(minTop, h - Math.round(48 * s) - stackH);
    const preferTop = h * 0.56 - stackH / 2;
    const titleY0 = Math.round(Math.min(maxTop, Math.max(minTop, preferTop)));

    this.title = {
      x: w / 2,
      y0: titleY0,
      y1: titleY0 + lineGap,
      line1Size,
      line2Size,
      shiftX: Math.round(28 * s),
    };
    const chestY = this.title.y1 + gapTitleChest + extra;
    this.chestRect = { x: (w - chestW) / 2, y: chestY, w: chestW, h: chestH };
    const barY = chestY + chestH + gapChestBar;
    this.bar = { x: (w - barW) / 2, y: barY, w: barW, h: barH };
    const btnX = (w - btnW) / 2;
    const btnY =
      this.phase === PHASE.CLAIMABLE
        ? chestY + chestH + Math.round(32 * s)
        : barY + barH + gapBarBtn;
    this.hits.fast = new HitArea(btnX, btnY, btnW, btnH);
    this.hits.claim = new HitArea(btnX, btnY, btnW, btnH);
    const feedPadY = Math.round(8 * s);
    this.feedRect = {
      x: (w - feedW) / 2,
      y: Math.max(0, btnY - feedPadY),
      w: feedW,
      h: btnH + feedPadY * 2,
    };
    this.hpY = this.title.y1;
    this.hpSize = Math.round(line2Size * 0.86);
  }

  _feedStyle() {
    this._layout();
    const rect = this.feedRect || this.hits.fast;
    return {
      left: Math.round(rect.x),
      top: Math.round(rect.y),
      width: Math.round(rect.w),
    };
  }

  _showFeed() {
    const token = ++this._adShowToken;
    const style = this._feedStyle();
    this._feedShowing = false;
    try {
      DataNexus.reportIaaAdPlacementShow(CHEST_FEED_CODE);
      AD.show(
        { code: CHEST_FEED_CODE, type: 6, style },
        {
          onShow: () => {
            if (token !== this._adShowToken || this.phase !== PHASE.AD_COVER) return;
            this._feedShowing = true;
            this._armFeedIdleHide();
          },
          onClose: () => {
            if (token !== this._adShowToken) return;
            this._feedShowing = false;
            if (this.phase === PHASE.AD_COVER) this._enterClaimable();
          },
          onHide: () => {
            if (token !== this._adShowToken) return;
            this._feedShowing = false;
          },
          onError: (err) => {
            console.warn('[chest] chest_feed error', err);
            if (token !== this._adShowToken || this.phase !== PHASE.AD_COVER) return;
            this._feedShowing = false;
            this._enterClaimable();
          },
        }
      );
    } catch (err) {
      console.warn('[chest] chest_feed throw', err);
      this._enterClaimable();
    }
  }

  _showGrid() {
    // 与 play grid_002 同一套 capsule 旁坐标
    const style = capsuleGridAdStyle();
    try {
      DataNexus.reportIaaAdPlacementShow(CHEST_GRID_CODE);
      AD.show(
        { code: CHEST_GRID_CODE, type: 7, style },
        {
          onShow: () => {
            this._gridShowing = true;
          },
          onError: (err) => {
            console.warn('[chest] chest_grid error', err);
            this._gridShowing = false;
          },
          onClose: () => {
            this._gridShowing = false;
          },
          onHide: () => {
            this._gridShowing = false;
          },
        }
      );
    } catch (err) {
      console.warn('[chest] chest_grid throw', err);
    }
  }

  _hideFeed() {
    this._adShowToken += 1;
    this._clearFeedIdleTimer();
    this._feedShowing = false;
    try {
      AD.hide(CHEST_FEED_CODE, { type: 6 });
    } catch (_e) {
      /* ignore */
    }
  }

  _hideAds(destroyGrid) {
    this._hideFeed();
    if (destroyGrid) {
      this._gridShowing = false;
      try {
        AD.hide(CHEST_GRID_CODE, { type: 7 });
      } catch (_e) {
        /* ignore */
      }
    }
  }

  _hidePlayAds() {
    if (typeof GameGlobal.hidePlayAdsForChest === 'function') {
      GameGlobal.hidePlayAdsForChest();
    }
  }

  _restorePlayAds() {
    if (typeof GameGlobal.restorePlayAdsAfterChest === 'function') {
      GameGlobal.restorePlayAdsAfterChest();
    }
  }

  _hitChestImage(x, y) {
    const box = this.chestRect;
    if (!box) return false;
    return x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h;
  }

  _bindVisibility() {
    if (this._boundHide || typeof wx === 'undefined') return;
    this._leftDuringAd = false;
    this._boundHide = () => {
      if (this.phase !== PHASE.AD_COVER) return;
      this._clearFeedIdleTimer();
      if (this._feedShowing) this._leftDuringAd = true;
    };
    this._boundShow = () => {
      if (!this._leftDuringAd) return;
      this._leftDuringAd = false;
      if (this.phase === PHASE.AD_COVER) this._enterClaimable();
    };
    if (typeof wx.onHide === 'function') wx.onHide(this._boundHide);
    if (typeof wx.onShow === 'function') wx.onShow(this._boundShow);
  }

  _unbindVisibility() {
    if (typeof wx === 'undefined') return;
    if (this._boundHide && typeof wx.offHide === 'function') wx.offHide(this._boundHide);
    if (this._boundShow && typeof wx.offShow === 'function') wx.offShow(this._boundShow);
    this._boundHide = null;
    this._boundShow = null;
    this._leftDuringAd = false;
  }

  _clearTimers() {
    if (this._waitTimer) {
      clearTimeout(this._waitTimer);
      this._waitTimer = 0;
    }
    this._clearFeedIdleTimer();
  }

  _clearFeedIdleTimer() {
    if (this._feedIdleTimer) {
      clearTimeout(this._feedIdleTimer);
      this._feedIdleTimer = 0;
    }
  }

  _armFeedIdleHide() {
    this._clearFeedIdleTimer();
    const ms = Math.max(0, Math.floor(Number(this._cfg().feedIdleHideMs) || 0));
    if (ms <= 0) return;
    this._feedIdleTimer = setTimeout(() => {
      this._feedIdleTimer = 0;
      if (this.phase === PHASE.AD_COVER) this._enterClaimable();
    }, ms);
  }

  _goldFill(ctx, y, size) {
    return makeVerticalGradient(ctx, y - size * 0.55, size * 1.2, '#ffe98a', '#ffb000');
  }

  _uiScale(w) {
    return Math.min((w || SCREEN_WIDTH) / (DESIGN_WIDTH / 2), 1.06);
  }

  _spawnClickSparks() {
    const box = this.chestRect;
    if (!box) return;
    const cx = box.x + box.w / 2;
    const cy = box.y + box.h * 0.55;
    for (let i = 0; i < 6; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const sp = 80 + Math.random() * 160;
      this._sparks.push({
        x: cx + (Math.random() - 0.5) * box.w * 0.2,
        y: cy + (Math.random() - 0.5) * box.h * 0.15,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 60,
        life: 0.35 + Math.random() * 0.25,
        max: 0.55,
        size: 2 + Math.random() * 3,
        rot: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 8,
        color: Math.random() > 0.5 ? '#ffe27a' : '#fff6c8',
      });
    }
  }

  _spawnBurstSparks(count) {
    const box = this.chestRect;
    if (!box) return;
    const cx = box.x + box.w / 2;
    const cy = box.y + box.h * 0.45;
    const n = count || 20;
    for (let i = 0; i < n; i += 1) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.4;
      const sp = 140 + Math.random() * 260;
      this._sparks.push({
        x: cx,
        y: cy,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 40,
        life: 0.55 + Math.random() * 0.45,
        max: 1,
        size: 3 + Math.random() * 4,
        rot: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 10,
        color: i % 3 === 0 ? '#ffffff' : i % 3 === 1 ? '#ffd75a' : '#7af0ff',
      });
    }
  }

  _drawSparks(ctx) {
    if (!this._sparks.length) return;
    for (let i = 0; i < this._sparks.length; i += 1) {
      const p = this._sparks[i];
      const a = clamp(p.life / (p.max || 0.6), 0, 1);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      ctx.restore();
    }
  }

  _drawTitleLine(ctx, text, x, y, opts) {
    const o = opts || {};
    const size = o.size || 24;
    const fill = o.fill || '#fff';
    const stroke = o.stroke || '#5a220c';
    const strokeWidth = o.strokeWidth == null ? 6 : o.strokeWidth;
    const align = o.align || 'center';
    ctx.save();
    ctx.font = `bold ${size}px sans-serif`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.fillStyle = 'rgba(40,16,6,0.35)';
    ctx.fillText(text, x, y + Math.max(2, size * 0.08));
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = stroke;
    ctx.strokeText(text, x, y);
    ctx.fillStyle = fill;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  _drawMixedLine(ctx, parts, cx, y, size) {
    ctx.save();
    ctx.font = `bold ${size}px sans-serif`;
    const widths = parts.map((part) => ctx.measureText(part.text).width);
    ctx.restore();
    let x = cx - widths.reduce((sum, n) => sum + n, 0) / 2;
    parts.forEach((part, i) => {
      this._drawTitleLine(ctx, part.text, x, y, {
        size,
        fill: part.fill,
        stroke: '#6a280c',
        strokeWidth: Math.max(5, Math.round(size * 0.16)),
        align: 'left',
      });
      x += widths[i];
    });
  }

  _drawTappingTitle(ctx, w) {
    const title = this.title || {
      x: w / 2,
      y0: 80,
      y1: 120,
      line1Size: 24,
      line2Size: 36,
      shiftX: 16,
    };
    const size1 = title.line1Size || 24;
    const size2 = title.line2Size || 36;
    const gold1 = this._goldFill(ctx, title.y0, size1);
    const gold2 = this._goldFill(ctx, title.y1, size2);
    ctx.save();
    ctx.font = `bold ${size1}px sans-serif`;
    const line1W = ctx.measureText('点击宝箱得').width;
    ctx.font = `bold ${size2}px sans-serif`;
    const line2W = ctx.measureText('多倍奖励!').width;
    ctx.restore();
    const indent = title.shiftX || Math.round(size1 * 0.7);
    const blockW = Math.max(line1W, indent + line2W);
    const left = title.x - blockW / 2 - Math.round(size1 * 0.35);
    this._drawMixedLine(
      ctx,
      [
        { text: '点击', fill: '#ffffff' },
        { text: '宝箱', fill: gold1 },
        { text: '得', fill: '#ffffff' },
      ],
      left + line1W / 2,
      title.y0,
      size1
    );
    this._drawTitleLine(ctx, '多倍奖励!', left + indent, title.y1, {
      size: size2,
      fill: gold2,
      stroke: '#6a280c',
      strokeWidth: Math.max(6, Math.round(size2 * 0.16)),
      align: 'left',
    });
  }

  _drawChestFallback(ctx, box, opened) {
    // 资源缺失兜底：画一只简笔宝箱
    const r = box.w * 0.08;
    drawRoundRect(ctx, box.x + box.w * 0.12, box.y + box.h * 0.38, box.w * 0.76, box.h * 0.46, r, '#b5651d', '#5a2a12', 4);
    drawRoundRect(
      ctx,
      box.x + box.w * 0.12,
      box.y + box.h * (opened ? 0.18 : 0.26),
      box.w * 0.76,
      box.h * 0.18,
      r,
      opened ? '#ffd75a' : '#d98a3a',
      '#5a2a12',
      4
    );
    drawRoundRect(ctx, box.x + box.w * 0.44, box.y + box.h * 0.5, box.w * 0.12, box.h * 0.14, r * 0.4, '#ffe27a', '#5a2a12', 3);
  }

  _drawChestImage(ctx, key) {
    const box = this.chestRect;
    if (!box) return;
    const bob = Math.sin(this._age * 3.2) * Math.max(2, box.h * 0.012);
    const punch = this._chestPunch;
    const scale = 1 + 0.1 * punch;
    const shakeX = punch > 0 ? Math.sin(punch * 28) * 5 * punch : 0;
    const cx = box.x + box.w / 2 + shakeX;
    const cy = box.y + box.h / 2 + bob - punch * 6;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.rotate(shakeX * 0.012);
    if (!drawImageAsset(ctx, key, -box.w / 2, -box.h / 2, box.w, box.h, 'contain')) {
      this._drawChestFallback(
        ctx,
        { x: -box.w / 2, y: -box.h / 2, w: box.w, h: box.h },
        key === 'chestLooted'
      );
    }
    // 顶部扫光
    if (this.phase === PHASE.TAPPING || this.phase === PHASE.AD_COVER) {
      const glow = 0.12 + 0.1 * Math.sin(this._age * 4);
      ctx.globalAlpha = glow;
      ctx.fillStyle = '#fff6c8';
      fillEllipse(ctx, 0, -box.h * 0.08, box.w * 0.28, box.h * 0.08);
    }
    ctx.restore();
  }

  _drawTapping(ctx, w) {
    const ui = this._uiScale(w);
    this._drawTappingTitle(ctx, w);
    this._drawChestImage(ctx, 'chestLoot');
    this._drawProgress(ctx);
    if (this.phase === PHASE.TAPPING || (this.phase === PHASE.AD_COVER && !this._feedShowing)) {
      const hit = this.hits.fast;
      const scale = 1 + 0.18 * this._btnPunch;
      ctx.save();
      ctx.translate(hit.x + hit.w / 2, hit.y + hit.h / 2);
      ctx.scale(scale, scale);
      ctx.translate(-(hit.x + hit.w / 2), -(hit.y + hit.h / 2));
      drawMenuButton(
        ctx,
        hit.x,
        hit.y,
        hit.w,
        hit.h,
        '快速点击',
        { top: '#fff4d2', bottom: '#f0b24a', stroke: '#8a4a18' },
        {
          size: Math.round(22 * ui),
          color: '#5c2a12',
          textStroke: null,
          radius: hit.h / 2,
          lineWidth: 3,
          strokeWidth: 0,
        }
      );
      ctx.restore();
    }
  }

  _drawClaimable(ctx, w) {
    const ui = this._uiScale(w);
    const claimPop = easeOutBack(this._claimT);
    const title = this.title || {
      x: w / 2,
      y0: 80,
      y1: 112,
      line1Size: Math.round(46 * (w / DESIGN_WIDTH)),
      line2Size: Math.round(70 * (w / DESIGN_WIDTH)),
    };
    const titleSize = title.line2Size || Math.round(70 * (w / DESIGN_WIDTH));
    const gold = this._goldFill(ctx, title.y0, titleSize);

    ctx.save();
    ctx.globalAlpha = easeOutCubic(this._claimT);
    this._drawMixedLine(
      ctx,
      [
        { text: '获得', fill: '#ffffff' },
        { text: '奖励', fill: gold },
      ],
      title.x,
      title.y0,
      titleSize
    );

    const rewards = chestRewardsFromCfg(this._cfg());
    const hpY = title.y1;
    const hpSize = this.hpSize || title.line1Size || Math.round(titleSize * 0.72);
    const icon = hpSize;
    const gap = Math.round(hpSize * 0.22);
    const label = `复活x${rewards.revive}`;
    ctx.save();
    ctx.font = `bold ${hpSize}px sans-serif`;
    const textW = ctx.measureText(label).width;
    ctx.restore();
    const totalW = icon + gap + textW;
    const startX = w / 2 - totalW / 2;
    if (!drawImageAsset(ctx, 'hpBolt', startX, hpY - icon / 2, icon, icon, 'contain')) {
      drawLightning(ctx, startX + icon / 2, hpY, icon / 40, '#22c7ef');
    }
    drawLabel(ctx, label, startX + icon + gap + textW / 2, hpY, {
      size: hpSize,
      bold: true,
      color: '#fff',
      stroke: '#1a1a1a',
      strokeWidth: Math.max(4, Math.round(hpSize * 0.14)),
    });
    drawLabel(ctx, `刷新方块+${rewards.refresh}`, w / 2, hpY + hpSize * 0.85, {
      size: Math.max(12, Math.round(hpSize * 0.42)),
      bold: true,
      color: 'rgba(255,241,214,0.92)',
      stroke: 'rgba(40,16,6,0.55)',
      strokeWidth: 3,
    });
    ctx.restore();

    ctx.save();
    ctx.translate(w / 2, this.chestRect.y + this.chestRect.h / 2);
    ctx.scale(claimPop, claimPop);
    ctx.translate(-w / 2, -(this.chestRect.y + this.chestRect.h / 2));
    this._drawChestImage(ctx, 'chestLooted');
    ctx.restore();

    const hit = this.hits.claim;
    ctx.save();
    ctx.translate(hit.x + hit.w / 2, hit.y + hit.h / 2);
    ctx.scale(claimPop, claimPop);
    ctx.translate(-(hit.x + hit.w / 2), -(hit.y + hit.h / 2));
    drawMenuButton(
      ctx,
      hit.x,
      hit.y,
      hit.w,
      hit.h,
      '立即领取',
      { top: '#fff4d2', bottom: '#f0b24a', stroke: '#8a4a18' },
      {
        size: Math.round(22 * ui),
        color: '#5c2a12',
        textStroke: null,
        radius: hit.h / 2,
        lineWidth: 3,
        strokeWidth: 0,
      }
    );
    ctx.restore();
  }

  _drawProgress(ctx) {
    const bar = this.bar;
    if (!bar) return;
    drawRoundRect(ctx, bar.x, bar.y, bar.w, bar.h, bar.h / 2, '#16324a', '#7ec8e8', 2);
    const ratio = clamp(this._displayProgress / 100, 0, 1);
    const fillW = Math.max(bar.h, bar.w * ratio);
    if (ratio <= 0.001) {
      drawRoundRect(ctx, bar.x, bar.y, bar.w, bar.h, bar.h / 2, null, '#9fe7ff', 1.5);
      return;
    }
    ctx.save();
    roundPath(ctx, bar.x, bar.y, fillW, bar.h, bar.h / 2);
    ctx.clip();
    ctx.fillStyle = makeVerticalGradient(ctx, bar.y, bar.h, '#7af0ff', '#1ea7e6');
    ctx.fillRect(bar.x, bar.y, fillW, bar.h);
    const shift = (this._age * 40) % 10;
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 4;
    for (let x = bar.x - bar.h - shift; x < bar.x + fillW + bar.h; x += 10) {
      ctx.beginPath();
      ctx.moveTo(x, bar.y + bar.h);
      ctx.lineTo(x + bar.h, bar.y);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillRect(bar.x + fillW - 4, bar.y + 2, 3, bar.h - 4);
    ctx.restore();
    drawRoundRect(ctx, bar.x, bar.y, bar.w, bar.h, bar.h / 2, null, '#9fe7ff', 1.5);

    const targetX = bar.x + bar.w * clamp(this.target / 100, 0, 1);
    ctx.save();
    ctx.strokeStyle = 'rgba(255,215,90,0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(targetX, bar.y - 3);
    ctx.lineTo(targetX, bar.y + bar.h + 3);
    ctx.stroke();
    ctx.restore();
  }
}
