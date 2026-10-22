/**
 * 主包同步绑定 DH Mini SDK（各游戏 js/sdk/sdk.js）。
 * UMD 包用 require；混淆包 module.exports 可能是空对象，再读全局 AD/Deploy。
 */

function pickSdk(mod) {
  if (!mod || typeof mod !== 'object') return null;
  const bag = mod.default && typeof mod.default === 'object' ? mod.default : mod;
  const AD = bag.AD || bag.ad || mod.AD || mod.ad;
  const Deploy = bag.Deploy || bag.deploy || mod.Deploy || mod.deploy;
  const Track = bag.Track || bag.track || mod.Track || mod.track;
  const DataNexus = bag.DataNexus || mod.DataNexus;
  const IAA_ITEM = bag.IAA_ITEM || mod.IAA_ITEM;
  const IAA_ITEM_SOURCE = bag.IAA_ITEM_SOURCE || mod.IAA_ITEM_SOURCE;
  if (AD && Deploy) {
    return {
      AD,
      Deploy,
      Track: Track || null,
      DataNexus: DataNexus || null,
      IAA_ITEM: IAA_ITEM || null,
      IAA_ITEM_SOURCE: IAA_ITEM_SOURCE || null,
    };
  }
  return null;
}

function pickGlobalSdk() {
  const roots = [];
  if (typeof GameGlobal !== 'undefined') roots.push(GameGlobal);
  if (typeof globalThis !== 'undefined') roots.push(globalThis);
  for (let i = 0; i < roots.length; i += 1) {
    const hit = pickSdk(roots[i]);
    if (hit) return hit;
  }
  return null;
}

/**
 * @param {{ requireSdk?: () => any }} [opts]
 */
export function bindMainSdk(opts) {
  if (typeof GameGlobal !== 'undefined' && GameGlobal.__DH_SDK && GameGlobal.__DH_SDK.AD && GameGlobal.__DH_SDK.Deploy) {
    return GameGlobal.__DH_SDK;
  }
  if (typeof require !== 'function' && !(opts && typeof opts.requireSdk === 'function')) {
    throw new Error('[sdk] 主包无法 require sdk.js');
  }
  let mod = null;
  if (opts && typeof opts.requireSdk === 'function') {
    mod = opts.requireSdk();
  } else {
    try {
      mod = require('../js/sdk/sdk.js');
    } catch (_e) {
      mod = null;
    }
  }
  const hit = pickSdk(mod) || pickGlobalSdk();
  if (!hit) {
    throw new Error('[sdk] sdk.js 未导出 AD/Deploy');
  }
  GameGlobal.__DH_SDK = hit;
  console.log(
    '[sdk] main package ready',
    hit.Track ? '(Track ok)' : '(Track missing)',
    hit.DataNexus ? '(DataNexus ok)' : '(DataNexus missing)'
  );
  return hit;
}

export function getSdk() {
  return (typeof GameGlobal !== 'undefined' && GameGlobal.__DH_SDK) || null;
}
