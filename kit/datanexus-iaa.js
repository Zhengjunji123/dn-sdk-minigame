/**
 * IAA 广告位曝光。优先走 DH SDK 内嵌 DataNexus，其次走业务注入的 reporter。
 */

export function reportIaaAdPlacementShow(code, reporter) {
  if (reporter && typeof reporter.reportIaaAdPlacementShow === 'function') {
    try {
      return reporter.reportIaaAdPlacementShow(code);
    } catch (err) {
      console.warn('[IAA] reportIaaAdPlacementShow', code, err);
      return undefined;
    }
  }
  try {
    const dn =
      typeof GameGlobal !== 'undefined' &&
      GameGlobal.__DH_SDK &&
      GameGlobal.__DH_SDK.DataNexus;
    if (dn && typeof dn.reportIaaAdPlacementShow === 'function') {
      return dn.reportIaaAdPlacementShow(code);
    }
  } catch (err) {
    console.warn('[IAA] reportIaaAdPlacementShow', code, err);
  }
  return undefined;
}
