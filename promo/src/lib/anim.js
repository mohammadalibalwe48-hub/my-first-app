// Animation primitives. Everything is a pure function of the frame number so
// any frame can be rendered in isolation (required for deterministic renders).
import { FPS } from "../config.js";

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, x) => (a === b ? (x >= b ? 1 : 0) : clamp((x - a) / (b - a)));
export const smoothstep = (a, b, x) => {
  const t = invLerp(a, b, x);
  return t * t * (3 - 2 * t);
};
export const sec = (frames) => frames / FPS;

const c1 = 1.70158;
export const ease = {
  linear: (t) => t,
  inQuad: (t) => t * t,
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  inCubic: (t) => t * t * t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outQuart: (t) => 1 - Math.pow(1 - t, 4),
  inQuart: (t) => t * t * t * t,
  inOutQuart: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2),
  outQuint: (t) => 1 - Math.pow(1 - t, 5),
  inOutQuint: (t) => (t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2),
  outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inExpo: (t) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
  inOutExpo: (t) =>
    t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2,
  inSine: (t) => 1 - Math.cos((t * Math.PI) / 2),
  outSine: (t) => Math.sin((t * Math.PI) / 2),
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  outBack: (t) => 1 + (c1 + 1) * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2),
  outBackSoft: (t) => 1 + (0.9 + 1) * Math.pow(t - 1, 3) + 0.9 * Math.pow(t - 1, 2),
  inBack: (t) => (c1 + 1) * t * t * t - c1 * t * t,
  inOutBack: (t) => {
    const c2 = c1 * 1.525;
    return t < 0.5
      ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
      : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2;
  },
  outElastic: (t) =>
    t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1,
  outBounce: (t) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
};

/** CSS-style cubic-bezier easing. */
export function bezier(x1, y1, x2, y2) {
  const A = (a, b) => 1 - 3 * b + 3 * a;
  const B = (a, b) => 3 * b - 6 * a;
  const C = (a) => 3 * a;
  const calc = (t, a, b) => ((A(a, b) * t + B(a, b)) * t + C(a)) * t;
  const slope = (t, a, b) => 3 * A(a, b) * t * t + 2 * B(a, b) * t + C(a);
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const s = slope(t, x1, x2);
      if (Math.abs(s) < 1e-6) break;
      t -= (calc(t, x1, x2) - x) / s;
    }
    return calc(clamp(t), y1, y2);
  };
}
// Signature motion-design curves: fast-in/slow-settle and a gentle "pro" ease.
ease.snap = bezier(0.16, 1, 0.3, 1);
ease.swift = bezier(0.65, 0, 0.35, 1);
ease.anticipate = bezier(0.5, -0.4, 0.6, 1.4);

/** Progress 0..1 of a window that starts at `start` and lasts `dur` frames. */
export const win = (f, start, dur, e = ease.linear) => e(invLerp(start, start + dur, f));

/**
 * Damped spring step response (0 -> 1 with overshoot), `t` in frames since start.
 * freq in Hz, damping ratio 0..1.
 */
export function spring(tFrames, freq = 2.2, damping = 0.4) {
  if (tFrames <= 0) return 0;
  const t = tFrames / FPS;
  const w = 2 * Math.PI * freq;
  const wd = w * Math.sqrt(1 - damping * damping);
  return 1 - Math.exp(-damping * w * t) * (Math.cos(wd * t) + ((damping * w) / wd) * Math.sin(wd * t));
}

/** Decaying oscillation 0 -> ±1 -> 0, for wobbles and squash recoveries. */
export function wobble(tFrames, freq = 3, decay = 5) {
  if (tFrames <= 0) return 0;
  const t = tFrames / FPS;
  return Math.exp(-decay * t) * Math.sin(2 * Math.PI * freq * t);
}

/**
 * Keyframe track. keys: [[frame, value, easing?], ...] where easing applies to
 * the segment arriving at that key. Values may be numbers or arrays.
 */
export function track(keys) {
  const sorted = [...keys].sort((a, b) => a[0] - b[0]);
  return (f) => {
    if (f <= sorted[0][0]) return sorted[0][1];
    const last = sorted[sorted.length - 1];
    if (f >= last[0]) return last[1];
    let i = 1;
    while (sorted[i][0] < f) i++;
    const [f0, v0] = sorted[i - 1];
    const [f1, v1, e = ease.inOutCubic] = sorted[i];
    const t = e((f - f0) / (f1 - f0));
    if (Array.isArray(v0)) return v0.map((v, k) => lerp(v, v1[k], t));
    return lerp(v0, v1, t);
  };
}

/** Deterministic hash -> [0,1). */
export function hash(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

/** Smooth 1D value noise in [-1,1]. */
export function noise1(x, seed = 0) {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(hash(i + seed * 57.3) * 2 - 1, hash(i + 1 + seed * 57.3) * 2 - 1, u);
}

/** Gentle organic drift, frames -> [-1,1]. */
export const drift = (f, speed = 0.02, seed = 0) => noise1(f * speed, seed) * 0.7 + noise1(f * speed * 2.3, seed + 9) * 0.3;

/** Classic parabolic hop: returns height 0..1..0 over the window. */
export const hop = (t) => (t <= 0 || t >= 1 ? 0 : 4 * t * (1 - t));

/** Quadratic bezier point. */
export const qbez = (a, b, c, t) => (1 - t) * (1 - t) * a + 2 * (1 - t) * t * b + t * t * c;
