import { getHost } from './runtime-host.js';

const STORAGE_KEY = 'rusia_block_offline_save_v2';

function createDefaults() {
  return {
    level: 1,
    bestLevel: 1,
    bestScore: 0,
    lastScore: 0,
    levelStartScore: 0,
    totalGems: 0,
    gamesPlayed: 0,
    musicOn: true,
    soundOn: true,
    /** 第 1 关是否已通关过：决定是否补报 TUTORIAL_START / FINISH */
    hasSeenGuide: false,
  };
}

function asCount(value, minimum) {
  const number = Number(value);
  const floor = minimum == null ? 0 : minimum;
  return Number.isFinite(number) && number >= floor ? Math.floor(number) : floor;
}

function normalize(value) {
  const source = value && typeof value === 'object' ? value : {};
  const level = asCount(source.level, 1);
  return {
    level,
    bestLevel: Math.max(level, asCount(source.bestLevel, 1)),
    bestScore: asCount(source.bestScore),
    lastScore: asCount(source.lastScore),
    levelStartScore: asCount(source.levelStartScore),
    totalGems: asCount(source.totalGems),
    gamesPlayed: asCount(source.gamesPlayed),
    musicOn: typeof source.musicOn === 'boolean' ? source.musicOn : true,
    soundOn: typeof source.soundOn === 'boolean' ? source.soundOn : true,
    hasSeenGuide: source.hasSeenGuide === true,
  };
}

export default function createSaveManager() {
  const host = getHost();
  let snapshot = createDefaults();

  function persist() {
    try {
      if (typeof host.setStorageSync === 'function') {
        host.setStorageSync(STORAGE_KEY, snapshot);
      }
    } catch (err) {
      console.warn('[存档写入失败]', err);
    }
  }

  function load() {
    try {
      if (typeof host.getStorageSync !== 'function') {
        snapshot = createDefaults();
        return snapshot;
      }
      let stored = host.getStorageSync(STORAGE_KEY);
      if (typeof stored === 'string' && stored) {
        stored = JSON.parse(stored);
      }
      snapshot = normalize(stored);
    } catch (err) {
      console.warn('[存档读取失败]', err);
      snapshot = createDefaults();
    }
    return snapshot;
  }

  load();

  return {
    get data() {
      return snapshot;
    },
    load,
    persist,
    get(key) {
      return snapshot[key];
    },
    set(key, value) {
      if (!Object.prototype.hasOwnProperty.call(snapshot, key)) return;
      const next = Object.assign({}, snapshot, { [key]: value });
      snapshot = normalize(next);
      persist();
    },
    update(patch) {
      snapshot = normalize(Object.assign({}, snapshot, patch));
      persist();
      return snapshot;
    },
    reset() {
      snapshot = createDefaults();
      persist();
      return snapshot;
    },
  };
}
