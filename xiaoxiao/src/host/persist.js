/**
 * 读写 GameGlobal.save 的薄封装，供各场景共用。
 */
function saveManager() {
  return typeof GameGlobal !== 'undefined' && GameGlobal.save ? GameGlobal.save : null;
}

export function readSave(key, fallback) {
  const save = saveManager();
  if (!save) return fallback;
  const value = typeof save.get === 'function'
    ? save.get(key)
    : save.data && save.data[key] != null
      ? save.data[key]
      : save[key];
  return value == null ? fallback : value;
}

export function writeSave(key, value) {
  const save = saveManager();
  if (!save) return;
  if (typeof save.set === 'function') save.set(key, value);
  else if (save.data) {
    save.data[key] = value;
    if (typeof save.persist === 'function') save.persist();
  } else save[key] = value;
}

export function patchSave(patch) {
  const save = saveManager();
  if (!save) return;
  if (typeof save.update === 'function') save.update(patch);
  else Object.keys(patch).forEach((key) => writeSave(key, patch[key]));
}
