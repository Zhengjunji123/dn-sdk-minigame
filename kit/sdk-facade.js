/**
 * 主包侧 DH SDK 代理：bindMainSdk 后挂到 GameGlobal.__DH_SDK。
 * 未绑定 / 方法缺失时返回 no-op。
 */

function bag() {
  return (typeof GameGlobal !== 'undefined' && GameGlobal.__DH_SDK) || null;
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

export const IAA_ITEM = Object.freeze({
  UNDO: 15,
  SHUFFLE: 20,
  HINT: 27,
  OTHER: 46,
  REFRESH: 20,
  REVIVE: 46,
});

export const IAA_ITEM_SOURCE = Object.freeze({
  GIFT: 1,
  AD: 2,
});

export function createSdkFacade() {
  return {
    AD: wrap('AD'),
    Deploy: wrap('Deploy'),
    Track: wrap('Track'),
    DataNexus: wrap('DataNexus'),
    IAA_ITEM,
    IAA_ITEM_SOURCE,
  };
}

const facade = createSdkFacade();
export const AD = facade.AD;
export const Deploy = facade.Deploy;
export const Track = facade.Track;
export const DataNexus = facade.DataNexus;
