import getSafeArea from '../paint/inset.js';
import {
  contains,
  drawButton,
  drawText,
  touchPoint,
} from '../paint/ink.js';
import createAudio from '../host/sound-bus.js';
import { readSave, writeSave } from '../host/persist.js';
import { APP_NAME } from '../board/grid-rules.js';
import { createSidebarEntry } from '../paint/rail-panel.js';
import { DataNexus } from '../monetize/sdk-facade.js';
import {
  drawImageAsset,
  getAsset,
  loadAssetKeys,
} from '../paint/media.js';

const LOBBY_FALLBACK_BG = '#2b7dff';
const LOBBY_ICON_KEYS = [
  'splashBg',
  'splashLogo',
  'musicOn',
  'musicOff',
  'voxOn',
  'voxOff',
  'startBtn',
];

function createLobbyScreen() {
  const audio = createAudio();
  const giftBar = createSidebarEntry({ appName: APP_NAME });
  let startButton = null;
  let soundButton = null;
  let musicButton = null;

  function boxes(w, h) {
    const area = getSafeArea();
    const top = (area.menu && area.menu.top) || area.statusBarHeight || 24;
    const iconSize = Math.max(44, Math.round(w * 0.118));
    const gap = Math.max(10, Math.round(iconSize * 0.28));
    const labelH = 18;
    const left = Math.max(12, Math.round(w * 0.04));
    const y0 = top + Math.max(6, Math.round(w * 0.02));

    musicButton = { x: left, y: y0, w: iconSize, h: iconSize + labelH, icon: iconSize };
    soundButton = {
      x: left,
      y: y0 + iconSize + labelH + gap,
      w: iconSize,
      h: iconSize + labelH,
      icon: iconSize,
    };
    // 按 btn-start.png 真实比例铺主按钮
    const btnW = w * 0.68;
    const btnImg = getAsset('startBtn');
    const ratio = btnImg && btnImg.width ? btnImg.height / btnImg.width : 0.26;
    const btnH = Math.max(48, Math.round(btnW * ratio));
    startButton = {
      x: (w - btnW) / 2,
      y: h * 0.72,
      w: btnW,
      h: btnH,
    };
  }

  function layoutGift(w, h) {
    const area = getSafeArea();
    const menu = area.menu || {};
    const gw = Math.max(48, Math.round(w * (90 / 750)));
    const gh = Math.max(58, Math.round(w * (110 / 750)));
    // 左侧留给音乐/音效；礼包放在胶囊菜单左侧
    const gx = Math.max(8, (menu.left || w - 96) - gw - 8);
    const gy = Math.max(
      4,
      (menu.top || area.statusBarHeight || 24) + Math.max(0, ((menu.height || 32) - gh) / 2)
    );
    giftBar.layout(w, h, {
      x: gx,
      y: gy,
      w: gw,
      h: gh,
      size: gw,
      hideLabel: true,
    });
  }

  function paintToggle(ctx, box, on, onKey, offKey, label) {
    if (!box) return;
    const size = box.icon || box.w;
    drawImageAsset(ctx, on ? onKey : offKey, box.x, box.y, size, size, 'contain');
    drawText(
      ctx,
      `${label}:${on ? '开' : '关'}`,
      box.x + size / 2,
      box.y + size + 10,
      11,
      '#ffffff',
      'center',
      600,
      'rgba(20,60,140,0.35)',
      2
    );
  }

  return {
    mount() {
      const area = getSafeArea();
      boxes(area.width, area.height);
      layoutGift(area.width, area.height);
      giftBar.probe();
      loadAssetKeys(LOBBY_ICON_KEYS).catch((err) => console.warn('[首页素材]', err));
      audio.startMusic();
      DataNexus.reportIaaHomepageView();
    },

    unmount() {
      giftBar.close();
    },

    onTouchEnd(event) {
      const point = touchPoint(event, true);
      if (!point) return;
      if (giftBar.handleTouch(point.x, point.y)) return;
      if (contains(startButton, point.x, point.y)) {
        audio.playClick();
        this.manager.go('arena', { level: readSave('level', 1) });
        return;
      }
      if (contains(soundButton, point.x, point.y)) {
        writeSave('soundOn', !readSave('soundOn', true));
        audio.playClick();
        return;
      }
      if (contains(musicButton, point.x, point.y)) {
        const enabled = !readSave('musicOn', true);
        writeSave('musicOn', enabled);
        if (enabled) audio.startMusic();
        else audio.stopMusic();
      }
    },

    update(dt) {
      giftBar.update(Math.max(0, dt || 0));
    },

    render(ctx, width, height) {
      const area = getSafeArea();
      const w = width || area.width;
      const h = height || area.height;
      boxes(w, h);
      layoutGift(w, h);

      ctx.fillStyle = LOBBY_FALLBACK_BG;
      ctx.fillRect(0, 0, w, h);
      drawImageAsset(ctx, 'splashBg', 0, 0, w, h, 'cover');

      const logoMaxW = w * 0.78;
      const logoMaxH = h * 0.28;
      const logoTop = h * 0.16;
      drawImageAsset(ctx, 'splashLogo', (w - logoMaxW) / 2, logoTop, logoMaxW, logoMaxH, 'contain');

      const level = Number(readSave('level', 1)) || 1;
      const cleared = Math.max(0, (Number(readSave('bestLevel', 1)) || 1) - 1);
      const bestScore = readSave('bestScore', 0);
      const record = cleared > 0
        ? `已通关${cleared}关 · 最高分${bestScore}`
        : `最高分${bestScore}`;

      const musicOn = !!readSave('musicOn', true);
      const soundOn = !!readSave('soundOn', true);
      paintToggle(ctx, musicButton, musicOn, 'musicOn', 'musicOff', '音乐');
      paintToggle(ctx, soundButton, soundOn, 'voxOn', 'voxOff', '音效');

      // 已通关文案：白字 + 柔和投影，贴在主按钮上方（对齐参考稿）
      const recordSize = Math.max(14, Math.round(w * 0.038));
      const recordY = startButton.y - recordSize * 1.35;
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `700 ${recordSize}px sans-serif`;
      ctx.shadowColor = 'rgba(0,0,0,0.35)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(record, w / 2, recordY);
      ctx.restore();

      const startLabel = level > 1 ? `继续第${level}关` : '开始游戏';
      const btnImg = getAsset('startBtn');
      if (btnImg) {
        ctx.drawImage(btnImg, startButton.x, startButton.y, startButton.w, startButton.h);
        drawText(
          ctx,
          startLabel,
          startButton.x + startButton.w / 2,
          startButton.y + startButton.h / 2 - 4,
          22,
          '#ffffff',
          'center',
          800,
          'rgba(20,80,10,0.4)',
          2
        );
      } else {
        drawButton(ctx, startButton, startLabel, {
          variant: 'green',
          fontSize: 22,
          radius: startButton.h / 2,
        });
      }

      giftBar.drawEntry(ctx);
      giftBar.drawPopups(ctx, w, h);
    },
  };
}

export default class LobbyScreen {
  constructor() {
    const api = createLobbyScreen();
    Object.setPrototypeOf(api, LobbyScreen.prototype);
    return api;
  }
}
