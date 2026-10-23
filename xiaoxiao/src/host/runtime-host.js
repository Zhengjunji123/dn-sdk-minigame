/**
 * 微信/抖音小游戏运行时薄封装（纯单机）。
 */
export function getHost() {
  if (typeof wx !== 'undefined' && wx) return wx;
  if (typeof tt !== 'undefined' && tt) return tt;
  return {};
}

export function getPlatform() {
  if (typeof tt !== 'undefined' && tt) return 'douyin';
  if (typeof wx !== 'undefined' && wx) return 'wechat';
  return 'unknown';
}

export function createGameLoop(tick) {
  const host = getHost();
  const requestFrame =
    (typeof host.requestAnimationFrame === 'function' &&
      host.requestAnimationFrame.bind(host)) ||
    (typeof requestAnimationFrame === 'function' && requestAnimationFrame) ||
    ((callback) => setTimeout(() => callback(Date.now()), 16));
  const cancelFrame =
    (typeof host.cancelAnimationFrame === 'function' &&
      host.cancelAnimationFrame.bind(host)) ||
    (typeof cancelAnimationFrame === 'function' && cancelAnimationFrame) ||
    clearTimeout;

  let frameId = 0;
  let running = false;

  function frame(timestamp) {
    if (!running) return;
    tick(timestamp);
    frameId = requestFrame(frame);
  }

  return {
    get running() {
      return running;
    },
    start() {
      if (running) return;
      running = true;
      try {
        if (typeof host.setPreferredFramesPerSecond === 'function') {
          host.setPreferredFramesPerSecond(30);
        }
      } catch (_e) {
        /* ignore */
      }
      frameId = requestFrame(frame);
    },
    stop() {
      if (!running) return;
      running = false;
      if (frameId) cancelFrame(frameId);
      frameId = 0;
    },
  };
}
