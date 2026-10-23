export function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

export function lerp(from, to, amount) {
  return from + (to - from) * amount;
}

export function easeOutCubic(value) {
  const t = 1 - clamp01(value);
  return 1 - t * t * t;
}

export function easeInOutCubic(value) {
  const t = clamp01(value);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function easeOutBack(value) {
  const t = clamp01(value) - 1;
  const c1 = 1.70158;
  return 1 + (c1 + 1) * t * t * t + c1 * t * t;
}

export function approach(current, target, speed, dt) {
  return lerp(current, target, 1 - Math.exp(-Math.max(0, speed) * Math.max(0, dt)));
}

export function timedEffect(duration) {
  return {
    age: 0,
    duration,
    get progress() {
      return clamp01(this.age / Math.max(0.001, this.duration));
    },
    update(dt) {
      this.age += Math.max(0, dt || 0);
      return this.age < this.duration;
    },
  };
}
