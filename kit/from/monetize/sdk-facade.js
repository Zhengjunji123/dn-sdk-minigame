/**
 * 主包侧 SDK 代理：真实模块在主包 js/sdk/sdk.js，启动时由 bindMainSdk 挂到 GameGlobal.__DH_SDK。
 * SDK 未绑定 / 方法缺失时返回 no-op，业务无需判空。
 */

function bag() {
  return GameGlobal.__DH_SDK || null;
}

function wrap(apiName) {
  return new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === 'then') return undefined;
        const api = bag() && bag()[apiName];
        if (!api) {
          return (..._args) => {
            console.warn(`[sdk-shim] ${apiName}.${String(prop)} 跳过（SDK 未绑定）`);
            return Promise.resolve();
          };
        }
        const val = api[prop];
        if (typeof val === 'function') return val.bind(api);
        if (val === undefined) {
          return (..._args) => {
            console.warn(`[sdk-shim] ${apiName}.${String(prop)} 不存在，跳过`);
            return Promise.resolve();
          };
        }
        return val;
      },
    }
  );
}

export const AD = wrap('AD');
export const Deploy = wrap('Deploy');
export const Track = wrap('Track');
export const DataNexus = wrap('DataNexus');

/**
 * 与统一 SDK / shared SDK 一致的 DataNexus 道具枚举。
 * 002 玩法映射：刷新方块 → SHUFFLE(20)，复活 → OTHER(46)。
 */
export const IAA_ITEM = Object.freeze({
  UNDO: 15,
  SHUFFLE: 20,
  HINT: 27,
  OTHER: 46,
  REFRESH: 20,
  REVIVE: 46,
});

/** GET_ITEM / USE_ITEM 的 item_source */
export const IAA_ITEM_SOURCE = Object.freeze({
  GIFT: 1,
  AD: 2,
});
