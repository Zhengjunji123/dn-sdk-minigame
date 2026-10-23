/**
 * Node smoke: load startApp with a minimal wx/canvas stub.
 */
function stubCtx() {
  const grad = { addColorStop() {} };
  const base = {
    measureText() {
      return { width: 10 };
    },
    createLinearGradient() {
      return grad;
    },
    globalAlpha: 1,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    lineCap: 'butt',
    font: '',
    textAlign: 'left',
    textBaseline: 'alphabetic',
  };
  return new Proxy(base, {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (typeof prop === 'string') {
        const noop = () => {};
        target[prop] = noop;
        return noop;
      }
      return undefined;
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    },
  });
}

function makeCanvas() {
  return {
    width: 375,
    height: 667,
    style: {},
    getContext() {
      return stubCtx();
    },
  };
}

globalThis.GameGlobal = {
  screenWidth: 375,
  screenHeight: 667,
};

globalThis.wx = {
  createCanvas: makeCanvas,
  getSystemInfoSync() {
    return {
      windowWidth: 375,
      windowHeight: 667,
      statusBarHeight: 20,
      pixelRatio: 2,
      safeArea: { top: 20, bottom: 667, left: 0, right: 375 },
    };
  },
  onTouchStart() {},
  onTouchMove() {},
  onTouchEnd() {},
  onTouchCancel() {},
  requestAnimationFrame(cb) {
    return setTimeout(() => cb(Date.now()), 0);
  },
  cancelAnimationFrame: clearTimeout,
  createInnerAudioContext() {
    return {
      play() {},
      stop() {},
      destroy() {},
      onEnded() {},
      onError() {},
    };
  },
  getStorageSync() {
    return null;
  },
  setStorageSync() {},
  showToast() {},
};

const { default: startApp } = await import('../src/boot/launch.js');
const app = startApp();
if (GameGlobal.scene.currentName !== 'boot') {
  throw new Error(`expected boot stage, got ${GameGlobal.scene.currentName}`);
}
app.tick(Date.now());
GameGlobal.scene.go('arena', { level: 1 });
if (GameGlobal.scene.currentName !== 'arena') {
  throw new Error(`expected arena stage, got ${GameGlobal.scene.currentName}`);
}
app.tick(Date.now());
app.loop.stop();
console.log('boot-smoke: startApp ok');
