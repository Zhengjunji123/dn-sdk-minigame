export { SDK } from '../index.js';

export function createAdsConfig(opts?: Record<string, unknown>): Record<string, unknown>;
export function assemblePlacements(specs?: Array<[string, string, string, string?]>): Record<string, unknown>;
export function assembleRuntime(extra?: Record<string, unknown>): Record<string, unknown>;
export function assembleEntry(over?: Record<string, unknown>): Record<string, unknown>;
export const DEFAULT_ENTRY_SCENE_IDS: number[];
export const DEFAULT_BLOCK_SCENE_IDS: number[];
export const DEFAULT_PLACEMENT_SPECS: Array<[string, string, string]>;
export const AdsConfig: Record<string, unknown>;

export function createSidebarRail(opts?: { claimKey?: string }): {
  getLastShowOptions(): object;
  isFromSidebar(res?: object): boolean;
  checkSidebarAvailable(): Promise<boolean>;
  navigateToSidebar(): Promise<unknown>;
  hasClaimedSidebarToday(): boolean;
  markSidebarClaimedToday(): void;
};
export function getLastShowOptions(): object;
export function isFromSidebar(res?: object): boolean;
export function checkSidebarAvailable(): Promise<boolean>;
export function navigateToSidebar(): Promise<unknown>;
export function hasClaimedSidebarToday(): boolean;
export function markSidebarClaimedToday(): void;

export function bindMainSdk(opts?: { requireSdk?: () => unknown }): unknown;
export function getSdk(): unknown;
export function createSdkFacade(): {
  AD: unknown;
  Deploy: unknown;
  Track: unknown;
  DataNexus: unknown;
  IAA_ITEM: Record<string, number>;
  IAA_ITEM_SOURCE: Record<string, number>;
};
export const AD: unknown;
export const Deploy: unknown;
export const Track: unknown;
export const DataNexus: unknown;
export const IAA_ITEM: Record<string, number>;
export const IAA_ITEM_SOURCE: Record<string, number>;

export function reportIaaAdPlacementShow(code: string, reporter?: { reportIaaAdPlacementShow?: Function }): unknown;
export function createEntryFirstAdGate(): {
  ensure(): Promise<{ code: string; at: number }>;
  mark(code: string): void;
  getPromise(): Promise<{ code: string; at: number }> | null;
  reset(): void;
};

export function createPlayAds(deps: Record<string, unknown>): Record<string, Function>;
export function hideGlobalTimedAds(AD: { hide: Function }, codes?: string[]): void;
export function isPlayAdsPausedForChest(): boolean;
export function setPlayAdsPausedForChest(paused: boolean): void;
export const DEFAULT_PLAY_AD_CODES: {
  native: string;
  grid: string;
  capsule: string;
  timed: string[];
};

export function boardCellPosition(
  layout: { boardX: number; boardY: number; cell: number; gap: number; pad?: number },
  row: number,
  col: number
): { x: number; y: number };
export function boardPad(layout: { pad?: number; gap?: number }): number;
export function createGridRules(opts?: Record<string, unknown>): Record<string, unknown>;
export const CELL: Record<string, number>;
export const DEFAULT_SHAPES: unknown[];
export const GridRules: Record<string, unknown>;
export function drawGearButton(
  ctx: CanvasRenderingContext2D,
  box: { x: number; y: number; w: number; h: number },
  colors?: { cream?: string }
): void;
