/**
 * Loading 等首支入场全屏广告 onShow（或漏斗已结束/跳过）。
 * 游戏自己的 entry-flow 里调用 mark / get，不要另起一套状态。
 */

export function createEntryFirstAdGate() {
  let promise = null;
  let resolveFn = null;

  function ensure() {
    if (promise) return promise;
    promise = new Promise((resolve) => {
      resolveFn = resolve;
    });
    return promise;
  }

  function mark(code) {
    if (typeof resolveFn === 'function') {
      console.log(`[entry] firstAdShown code=${code}`);
      resolveFn({ code, at: Date.now() });
      resolveFn = null;
    }
  }

  /** Loading：漏斗还没 kick 时可能为 null */
  function getPromise() {
    return promise;
  }

  function reset() {
    promise = null;
    resolveFn = null;
  }

  return { ensure, mark, getPromise, reset };
}
