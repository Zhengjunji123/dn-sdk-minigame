/**
 * 可复现的伪随机（mulberry32 变体）。
 * 传入相同 seed 得到相同序列，方便关卡生成与测试。
 */
export default function makeRandom(seed) {
  let value = Number.isFinite(Number(seed)) ? Number(seed) >>> 0 : Date.now() >>> 0;
  if (value === 0) value = 0x6d2b79f5;
  return () => {
    value += 0x6d2b79f5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickIndex(random, length) {
  const value = Number(random());
  const safe = Number.isFinite(value) ? Math.max(0, Math.min(value, 0.999999999999)) : 0;
  return Math.floor(safe * length);
}
