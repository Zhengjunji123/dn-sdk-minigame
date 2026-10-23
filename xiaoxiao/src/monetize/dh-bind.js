/**
 * 主包同步绑定 DH SDK（js/sdk/sdk.js 在主包，不走 loadSubpackage）。
 * UMD 包用 require，避免 ESM interop 丢 AD/Deploy/Track/DataNexus。
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

export function bindMainSdk() {
  if (GameGlobal.__DH_SDK && GameGlobal.__DH_SDK.AD && GameGlobal.__DH_SDK.Deploy) {
    return GameGlobal.__DH_SDK;
  }
  if (typeof require !== 'function') {
    throw new Error('[sdk] 主包无法 require sdk.js');
  }
  const hit = pickSdk(require('../../js/sdk/sdk.js'));
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
  return GameGlobal.__DH_SDK || null;
}
