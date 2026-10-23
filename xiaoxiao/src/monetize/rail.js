/**
 * 抖音侧边栏复访：
 * - 模块加载时监听 tt.onShow（须尽早 import）
 * - 源码须直接出现 tt.navigateToScene（审核静态扫描）
 */
const CLAIM_KEY = 'xxl002_sidebar_claim_date';
const SIDEBAR_SCENES = new Set(['021036', '021012', '101036', '181036', '261036']);

let lastShow = null;

function captureShow(res) {
  lastShow = res || {};
}

function seedLaunchOptions() {
  try {
    if (typeof tt !== 'undefined' && typeof tt.getLaunchOptionsSync === 'function') {
      lastShow = tt.getLaunchOptionsSync() || lastShow;
    }
  } catch (_e) {
    /* ignore */
  }
}

function todayStr() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function storageHost() {
  if (typeof tt !== 'undefined' && tt) return tt;
  if (typeof wx !== 'undefined' && wx) return wx;
  return {};
}

if (typeof tt !== 'undefined' && typeof tt.onShow === 'function') {
  tt.onShow(captureShow);
}
seedLaunchOptions();

export function getLastShowOptions() {
  return lastShow || {};
}

export function isFromSidebar(res) {
  const op = res || lastShow || {};
  if (op.launch_from === 'homepage' && op.location === 'sidebar_card') return true;
  const scene = op.scene != null ? String(op.scene) : '';
  return SIDEBAR_SCENES.has(scene);
}

export function checkSidebarAvailable() {
  return new Promise((resolve) => {
    if (typeof tt === 'undefined' || typeof tt.checkScene !== 'function') {
      resolve(false);
      return;
    }
    tt.checkScene({
      scene: 'sidebar',
      success(res) {
        resolve(!!(res && res.isExist));
      },
      fail() {
        resolve(false);
      },
    });
  });
}

/** 审核扫描依赖此字面量调用，不要改成动态宿主调用 */
export function navigateToSidebar() {
  return new Promise((resolve, reject) => {
    if (typeof tt === 'undefined' || typeof tt.navigateToScene !== 'function') {
      reject(new Error('navigateToScene not supported'));
      return;
    }
    tt.navigateToScene({
      scene: 'sidebar',
      success: resolve,
      fail: reject,
    });
  });
}

export function hasClaimedSidebarToday() {
  try {
    const host = storageHost();
    if (typeof host.getStorageSync !== 'function') return false;
    return host.getStorageSync(CLAIM_KEY) === todayStr();
  } catch (_e) {
    return false;
  }
}

export function markSidebarClaimedToday() {
  try {
    const host = storageHost();
    if (typeof host.setStorageSync !== 'function') return;
    host.setStorageSync(CLAIM_KEY, todayStr());
  } catch (_e) {
    /* ignore */
  }
}
