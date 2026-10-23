import { getTopSafeLayout } from './inset.js';

/** 胶囊旁格子广告与胶囊的间距（grid_002 / chest_grid 共用） */
export const CAPSULE_AD_GAP = 8;

/**
 * 与 play `grid_002` 同一套坐标：整块贴在微信胶囊左侧。
 * @returns {{ left: number, top: number, width: number }}
 */
export function capsuleGridAdStyle() {
  const { menu } = getTopSafeLayout();
  const gap = CAPSULE_AD_GAP;
  const maxW = Math.max(32, Math.floor(menu.left - gap + menu.width));
  const width = Math.min(maxW, Math.max(32, Math.round(menu.height * 2.2)));
  const left = Math.max(0, Math.floor(menu.left - width - gap + menu.width));
  const top = Math.max(0, Math.floor(menu.top / 2));
  return { left, top, width };
}
