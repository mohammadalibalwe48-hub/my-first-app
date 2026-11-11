// Original soundtrack + sound design, synthesised from scratch (no samples, no
// stock music). 120 BPM groove in D Hijaz: Karplus-Strong oud, darbuka (doum /
// tek), riq, bass, pads, and Foley-style effects placed on the film's exact frames.
//   node audio/build-audio.mjs  ->  out/audio/soundtrack.wav (48 kHz, 16-bit stereo)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SR = 48000;
const DUR = 30;
const N = SR * DUR;
const PAD = SR * 3;
const L = new Float32Array(N + PAD);
const R = new Float32Array(N + PAD);
const SL = new Float32Array(N + PAD); // reverb send
const SRr = new Float32Array(N + PAD);

const fr = (frame) => frame / 30; // video frame -> seconds
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function mix(mono, t0, { gain = 1, pan = 0, send = 0 } = {}) {
  const i0 = Math.round(t0 * SR);
  const a = ((Math.max(-1, Math.min(1, pan)) + 1) * Math.PI) / 4;
  const gl = gain * Math.cos(a) * Math.SQRT2;
  const gr = gain * Math.sin(a) * Math.SQRT2;
  for (let i = 0; i < mono.length; i++) {
    const j = i0 + i;
    if (j < 0 || j >= L.length) continue;
    const v = mono[i];
    L[j] += v * gl;
    R[j] += v * gr;
    if (send) {
      SL[j] += v * gl * send;
      SRr[j] += v * gr * send;
    }
  }
}

// ---------- DSP building blocks ----------
function biquad(type, f0, Q = 0.707, gainDb = 0) {
  const st = { x1: 0, x2: 0, y1: 0, y2: 0 };
  const set = (f, q = Q) => {
    const w = (2 * Math.PI * Math.min(f, SR * 0.45)) / SR;
    const cs = Math.cos(w);
    const sn = Math.sin(w);
    const al = sn / (2 * q);
    const A = Math.pow(10, gainDb / 40);
    let b0, b1, b2, a0, a1, a2;
    if (type === "lp") [b0, b1, b2, a0, a1, a2] = [(1 - cs) / 2, 1 - cs, (1 - cs) / 2, 1 + al, -2 * cs, 1 - al];
    else if (type === "hp") [b0, b1, b2, a0, a1, a2] = [(1 + cs) / 2, -(1 + cs), (1 + cs) / 2, 1 + al, -2 * cs, 1 - al];
    else if (type === "bp") [b0, b1, b2, a0, a1, a2] = [al, 0, -al, 1 + al, -2 * cs, 1 - al];
    else [b0, b1, b2, a0, a1, a2] = [1 + al * A, -2 * cs, 1 - al * A, 1 + al / A, -2 * cs, 1 - al / A];
    Object.assign(st, { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 });
  };
  set(f0);
  st.set = set;
  st.run = (x) => {
    const y = st.b0 * x + st.b1 * st.x1 + st.b2 * st.x2 - st.a1 * st.y1 - st.a2 * st.y2;
    st.x2 = st.x1;
    st.x1 = x;
    st.y2 = st.y1;
    st.y1 = y;
    return y;
  };
  return st;
}
const buf = (sec) => new Float32Array(Math.max(1, Math.floor(sec * SR)));
const noiseSrc = (seed) => {
  const r = rng(seed);
  return () => r() * 2 - 1;
};

// ---------- Instruments ----------
/** Oud-ish pluck: Karplus-Strong with fractional tuning, pick noise and body resonance. */
function oud(midi, dur = 1.6, { bright = 0.55, seed = 1, decay = null } = {}) {
  const f = mtof(midi);
  const out = buf(dur);
  const P = SR / f;
  let n = Math.floor(P - 0.5);
  let d = P - 0.5 - n;
  if (d < 0.1) {
    n -= 1;
    d += 1;
  }
  const C = (1 - d) / (1 + d);
  const line = new Float32Array(n);
  const r = rng(seed);
  let lp = 0;
  for (let i = 0; i < n; i++) {
    lp += (r() * 2 - 1 - lp) * (0.25 + bright * 0.6);
    line[i] = lp;
  }
  const g = decay ?? Math.min(0.9985, 0.9965 + (62 - midi) * 0.00006);
  let idx = 0;
  let prev = 0;
  let apx = 0;
  let apy = 0;
  const body1 = biquad("peak", 220, 1.2, 5);
  const body2 = biquad("peak", 1100, 1.5, 3);
  const tone = biquad("lp", 3800, 0.7);
  for (let i = 0; i < out.length; i++) {
    const y = line[idx];
    const avg = 0.5 * (y + prev) * g;
    prev = y;
    const ap = C * avg + apx - C * apy;
    apx = avg;
    apy = ap;
    line[idx] = ap;
    idx = (idx + 1) % n;
    let s = tone.run(body2.run(body1.run(y)));
    if (i < SR * 0.006) s += (r() * 2 - 1) * 0.35 * (1 - i / (SR * 0.006));
    out[i] = s * Math.min(1, (out.length - i) / (SR * 0.05));
  }
  return out;
}

function doum(seed = 1) {
  const out = buf(0.5);
  const nz = noiseSrc(seed);
  const lp = biquad("lp", 380, 0.8);
  let ph = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const f = 68 + 120 * Math.exp(-t * 38);
    ph += (2 * Math.PI * f) / SR;
    out[i] = Math.sin(ph) * Math.exp(-t * 7) + Math.sin(ph * 2.3) * Math.exp(-t * 26) * 0.22 + lp.run(nz()) * Math.exp(-t * 55) * 0.5;
  }
  return out;
}
function tek(seed = 1, bright = 1) {
  const out = buf(0.16);
  const nz = noiseSrc(seed);
  const bp = biquad("bp", 3600 * bright, 1.3);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    out[i] = bp.run(nz()) * Math.exp(-t * 60) * 1.6 + Math.sin(2 * Math.PI * 1650 * bright * t) * Math.exp(-t * 38) * 0.3 + Math.sin(2 * Math.PI * 2950 * bright * t) * Math.exp(-t * 55) * 0.18;
  }
  return out;
}
function kick() {
  const out = buf(0.45);
  const nz = noiseSrc(9);
  let ph = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    ph += (2 * Math.PI * (46 + 95 * Math.exp(-t * 32))) / SR;
    out[i] = Math.tanh(Math.sin(ph) * Math.exp(-t * 6.2) * 1.6) + nz() * Math.exp(-t * 420) * 0.25;
  }
  return out;
}
function clap(seed = 3) {
  const out = buf(0.32);
  const nz = noiseSrc(seed);
  const bp = biquad("bp", 1500, 0.9);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    let e = Math.exp(-t * 16) * 0.55;
    for (const o of [0, 0.011, 0.022]) if (t >= o) e += Math.exp(-(t - o) * 260);
    out[i] = bp.run(nz()) * e * 1.4;
  }
  return out;
}
function hat(seed = 5, open = false) {
  const out = buf(open ? 0.3 : 0.08);
  const nz = noiseSrc(seed);
  const hp = biquad("hp", 7800, 0.8);
  for (let i = 0; i < out.length; i++) out[i] = hp.run(nz()) * Math.exp(-(i / SR) * (open ? 14 : 75));
  return out;
}
function jingle(seed = 7, len = 0.22) {
  const out = buf(len);
  const r = rng(seed);
  const parts = [5200, 6800, 8300, 9700, 11300].map((f) => [f * (0.97 + r() * 0.06), r() * 6]);
  const nz = noiseSrc(seed + 1);
  const hp = biquad("hp", 6000, 0.7);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    let s = 0;
    for (const [f, p] of parts) s += Math.sin(2 * Math.PI * f * t + p);
    out[i] = (s * 0.12 + hp.run(nz()) * 0.5) * Math.exp(-t * 20) * (0.75 + 0.25 * Math.sin(t * 190));
  }
  return out;
}
function bassNote(midi, dur) {
  const out = buf(dur + 0.08);
  const f = mtof(midi);
  const lp = biquad("lp", 900, 0.8);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const ph = 2 * Math.PI * f * t;
    const env = Math.min(1, t / 0.006) * (t < dur ? 0.65 + 0.35 * Math.exp(-t * 6) : Math.exp(-(t - dur) * 40) * 0.65);
    out[i] = lp.run(Math.tanh((Math.sin(ph) + 0.3 * Math.sin(2 * ph) + 0.12 * Math.sin(3 * ph)) * 1.3)) * env;
  }
  return out;
}
function pad(midis, dur, { attack = 0.6, release = 1.4, cutoff = 1400, seed = 11 } = {}) {
  const out = buf(dur + release);
  const r = rng(seed);
  const voices = midis.flatMap((m) => [-7, 0, 7].map((c) => ({ f: mtof(m) * Math.pow(2, c / 1200), p: r() })));
  const lp = biquad("lp", cutoff, 0.6);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    let s = 0;
    for (const v of voices) {
      v.p += v.f / SR;
      s += (v.p % 1) * 2 - 1;
    }
    const env = Math.min(1, t / attack) * (t < dur ? 1 : Math.exp(-(t - dur) * (4 / release)));
    out[i] = lp.run(s / voices.length) * env;
  }
  return out;
}
function bell(freq, dur = 1.4, { ratio = 3.5, index = 2.2, decay = 3.2 } = {}) {
  const out = buf(dur);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const mod = Math.sin(2 * Math.PI * freq * ratio * t) * index * Math.exp(-t * decay * 1.6);
    out[i] = Math.sin(2 * Math.PI * freq * t + mod) * Math.exp(-t * decay) * Math.min(1, t / 0.002);
  }
  return out;
}
function pop(freq = 600, len = 0.14) {
  const out = buf(len);
  let ph = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    ph += (2 * Math.PI * freq * (1 + 1.6 * Math.exp(-t * 55))) / SR;
    out[i] = Math.sin(ph) * Math.exp(-t * 26) * Math.min(1, t / 0.001);
  }
  return out;
}
function wood(freq, len = 0.4) {
  const out = buf(len);
  const nz = noiseSrc(Math.round(freq));
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    out[i] = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 22) + Math.sin(2 * Math.PI * freq * 3.93 * t) * Math.exp(-t * 70) * 0.35 + nz() * Math.exp(-t * 700) * 0.3;
  }
  return out;
}
function click(freq = 2200) {
  const out = buf(0.05);
  const nz = noiseSrc(4);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    out[i] = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 260) + nz() * Math.exp(-t * 900) * 0.5;
  }
  return out;
}
function clink(seed = 1, base = 1) {
  const out = buf(0.6);
  const r = rng(seed);
  const parts = [2350, 3720, 5180, 6900].map((f, k) => [f * base * (0.97 + r() * 0.06), 22 + k * 14, 1 / (k + 1)]);
  const nz = noiseSrc(seed + 3);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    let s = nz() * Math.exp(-t * 900) * 0.4;
    for (const [f, d, a] of parts) s += Math.sin(2 * Math.PI * f * t) * Math.exp(-t * d) * a;
    out[i] = s * 0.6;
  }
  return out;
}
/** Band-passed noise with a moving centre; shape: "bell" | "rise" | "fall". */
function whoosh(len, { f0 = 300, f1 = 3000, q = 1.1, shape = "bell", seed = 2 } = {}) {
  const out = buf(len);
  const nz = noiseSrc(seed);
  const bp = biquad("bp", f0, q);
  for (let i = 0; i < out.length; i++) {
    const u = i / out.length;
    if (i % 32 === 0) bp.set(f0 * Math.pow(f1 / f0, u));
    const env = shape === "rise" ? Math.pow(u, 2.2) : shape === "fall" ? Math.pow(1 - u, 1.6) : Math.pow(Math.sin(Math.PI * u), 1.6);
    out[i] = bp.run(nz()) * env * 1.8 * Math.min(1, i / (SR * 0.012));
  }
  return out;
}
function riser(len, seed = 8) {
  const out = buf(len);
  const nz = noiseSrc(seed);
  const lp = biquad("lp", 400, 1.4);
  let ph = 0;
  for (let i = 0; i < out.length; i++) {
    const u = i / out.length;
    if (i % 32 === 0) lp.set(400 * Math.pow(30, u));
    ph += (2 * Math.PI * (110 * Math.pow(4, u))) / SR;
    out[i] = lp.run(nz() * 0.8 + ((ph / (2 * Math.PI)) % 1) * 0.6 - 0.3) * Math.pow(u, 1.8);
  }
  return out;
}
function impact(len = 2.2, seed = 12) {
  const out = buf(len);
  const nz = noiseSrc(seed);
  const lp = biquad("lp", 1600, 0.7);
  let ph = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    ph += (2 * Math.PI * (32 + 60 * Math.exp(-t * 5))) / SR;
    out[i] = Math.sin(ph) * Math.exp(-t * 3.4) * 0.9 + lp.run(nz()) * Math.exp(-t * 9) * 0.7;
  }
  return out;
}
function sizzle(len = 0.9, seed = 21) {
  const out = buf(len);
  const nz = noiseSrc(seed);
  const r = rng(seed + 1);
  const hp = biquad("hp", 2600, 0.7);
  let crack = 0;
  for (let i = 0; i < out.length; i++) {
    const u = i / out.length;
    if (r() < 0.0016) crack = 1;
    crack *= 0.993;
    out[i] = hp.run(nz()) * (0.25 + crack * 0.9) * Math.min(1, u * 12) * Math.pow(1 - u, 1.3);
  }
  return out;
}
function printer(len = 0.45) {
  const out = buf(len);
  const nz = noiseSrc(31);
  const bp = biquad("bp", 1900, 2.2);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const u = i / out.length;
    out[i] = bp.run(nz()) * (0.55 + 0.45 * Math.sign(Math.sin(2 * Math.PI * 38 * t))) * Math.min(1, u * 15) * Math.min(1, (1 - u) * 10) * 1.6;
  }
  return out;
}
function sparkle(len = 0.6, seed = 41, notes = [86, 90, 93, 98, 102]) {
  const out = buf(len);
  const r = rng(seed);
  for (let k = 0; k < 9; k++) {
    const f = mtof(notes[Math.floor(r() * notes.length)]);
    const t0 = r() * len * 0.7;
    const b = bell(f, 0.35, { ratio: 2.01, index: 0.8, decay: 9 });
    const i0 = Math.floor(t0 * SR);
    for (let i = 0; i < b.length && i0 + i < out.length; i++) out[i0 + i] += b[i] * 0.22;
  }
  return out;
}

// ---------- Reverb (Freeverb) ----------
function freeverb(inL, inR, { room = 0.84, damp = 0.32 } = {}) {
  const k = SR / 44100;
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
  const alls = [556, 441, 341, 225];
  const mk = (spread) => ({
    c: combs.map((d) => ({ b: new Float32Array(Math.round((d + spread) * k)), i: 0, f: 0 })),
    a: alls.map((d) => ({ b: new Float32Array(Math.round((d + spread) * k)), i: 0 })),
  });
  const chans = [mk(0), mk(23)];
  const outs = [new Float32Array(inL.length), new Float32Array(inR.length)];
  [inL, inR].forEach((inp, ch) => {
    const { c, a } = chans[ch];
    const o = outs[ch];
    for (let n = 0; n < inp.length; n++) {
      const x = inp[n] * 0.015;
      let s = 0;
      for (const cb of c) {
        const y = cb.b[cb.i];
        cb.f = y * (1 - damp) + cb.f * damp;
        cb.b[cb.i] = x + cb.f * room;
        cb.i = (cb.i + 1) % cb.b.length;
        s += y;
      }
      for (const ap of a) {
        const y = ap.b[ap.i];
        ap.b[ap.i] = s + y * 0.5;
        ap.i = (ap.i + 1) % ap.b.length;
        s = y - s;
      }
      o[n] = s;
    }
  });
  return outs;
}

// =================== ARRANGEMENT ===================
const D2 = 38, A1 = 33, C2 = 36, Eb2 = 39;
const scale = [62, 63, 66, 67, 69, 70, 72, 74, 75, 78, 79, 81, 82, 84, 86]; // D Hijaz
const bars = (b) => b * 2; // seconds

// Oud riffs: [beat, midi, beats]
const RIFF_A = [[0, 74, 0.75], [0.75, 72, 0.25], [1, 70, 0.5], [1.5, 69, 0.5], [2, 70, 0.75], [2.75, 69, 0.25], [3, 67, 0.5], [3.5, 66, 0.5], [4, 67, 0.5], [4.5, 66, 0.5], [5, 63, 0.5], [5.5, 62, 1.5], [7, 66, 0.5], [7.5, 69, 0.5]];
const RIFF_B = [[0, 74, 0.5], [0.5, 75, 0.5], [1, 74, 0.5], [1.5, 72, 0.5], [2, 70, 1], [3, 69, 0.5], [3.5, 70, 0.5], [4, 69, 0.75], [4.75, 67, 0.25], [5, 66, 0.5], [5.5, 67, 0.5], [6, 69, 2]];
function playRiff(riff, t0, { gain = 0.5, oct = 0, pan = 0.15, seed = 1 } = {}) {
  riff.forEach(([b, m, d], i) => {
    const t = t0 + b * 0.5;
    mix(oud(m + oct, Math.max(0.5, d * 0.5 + 0.6), { seed: seed * 31 + i, bright: 0.6 }), t, { gain, pan, send: 0.18 });
    // Light double an octave down for body.
    mix(oud(m + oct - 12, Math.max(0.5, d * 0.5 + 0.4), { seed: seed * 47 + i, bright: 0.35 }), t + 0.004, { gain: gain * 0.35, pan: -pan, send: 0.1 });
  });
}

const kickS = kick();
const doumS = doum(2);
const clapS = clap(4);
const teks = [tek(3), tek(5, 1.08), tek(8, 0.94)];
const hatS = hat(6);
const ohat = hat(7, true);
const jingles = [jingle(11), jingle(13), jingle(17, 0.4)];

// Bass pattern per 2-bar phrase (8ths): D D . D' | Eb . Eb . | C C . C' | D . A, D
const BASS = [[0, D2, 0.4], [0.5, D2, 0.2], [1.5, D2 + 12, 0.2], [2, Eb2, 0.6], [3, Eb2, 0.4], [4, C2, 0.4], [4.5, C2, 0.2], [5.5, C2 + 12, 0.2], [6, D2, 0.6], [7, A1, 0.2], [7.5, D2, 0.4]];

function groove(t0, nBars, { kickOn = true, clapOn = true, riq = 0.12, bass = 0.42, darb = 1, fillLast = false } = {}) {
  for (let b = 0; b < nBars; b++) {
    const tb = t0 + b * 2;
    // Maqsum on darbuka: D T . T D . T .
    ["D", "T", "-", "T", "D", "-", "T", "-"].forEach((p, i) => {
      const t = tb + i * 0.25;
      if (p === "D") mix(doumS, t, { gain: 0.55 * darb, pan: -0.12, send: 0.05 });
      if (p === "T") mix(teks[i % 3], t, { gain: 0.3 * darb, pan: 0.18, send: 0.08 });
    });
    // Ghost "ka"s on 16ths
    for (let s = 0; s < 16; s++) if (s % 4 === 3 || s % 8 === 5) mix(teks[(s + 1) % 3], tb + s * 0.125, { gain: 0.08 * darb, pan: 0.3, send: 0.05 });
    if (kickOn) for (const k of [0, 1.5, 2, 3.5]) mix(kickS, tb + k * 0.5, { gain: k % 1 ? 0.35 : 0.62 });
    if (clapOn) for (const c of [1, 3]) mix(clapS, tb + c * 0.5, { gain: 0.26, pan: 0.05, send: 0.15 });
    for (let s = 0; s < 8; s++) mix(hatS, tb + s * 0.25 + 0.125, { gain: 0.06, pan: 0.35 });
    for (let s = 0; s < 16; s++) mix(jingles[s % 2], tb + s * 0.125, { gain: riq * (s % 4 === 2 ? 1 : 0.45), pan: -0.35, send: 0.06 });
    if (bass) {
      const phrase = BASS.filter(([beat]) => Math.floor(beat / 4) === b % 2);
      for (const [beat, m, d] of phrase) mix(bassNote(m, d), tb + (beat % 4) * 0.5, { gain: bass });
    }
    if (fillLast && b === nBars - 1) for (let s = 0; s < 6; s++) mix(teks[s % 3], tb + 1.25 + s * 0.125, { gain: 0.22 + s * 0.03, pan: 0.2 - s * 0.08, send: 0.1 });
  }
}

// ---- Bars 1-2 (0-4 s): intro over the QR building itself ----
mix(pad([38, 45, 50], 4.2, { attack: 1.8, release: 1.0, cutoff: 700 }), 0, { gain: 0.32, send: 0.2 });
[[0, 62], [0.5, 69], [1, 74], [2, 66], [2.5, 69], [3, 72]].forEach(([b, m], i) => mix(oud(m, 1.4, { seed: 100 + i, bright: 0.45 }), b * 0.5 + 0.02, { gain: 0.34, pan: 0.2, send: 0.25 }));
for (let s = 0; s < 32; s++) mix(jingles[s % 2], s * 0.125, { gain: 0.05 * (s / 32), pan: -0.4, send: 0.1 });
[[15, 86], [30, 90], [45, 93]].forEach(([f, m], i) => mix(wood(mtof(m) / 2), fr(f), { gain: 0.55, pan: [-0.3, 0.3, 0][i], send: 0.15 }));
{
  // Cube rain: replicate the landing schedule used by the picture (scenes/dining.js).
  const assets = JSON.parse(fs.readFileSync(path.join(ROOT, "src/generated/assets.json"), "utf8"));
  const rows = assets.qr.rows;
  const n = rows.length;
  const finder = (r, c) => (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
  const cells = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (rows[r][c] === "1" && !finder(r, c)) cells.push({ r, c });
  const hash = (k) => {
    const s = Math.sin(k * 127.1 + 311.7) * 43758.5453123;
    return s - Math.floor(s);
  };
  const order = cells.map((c, i) => ({ i, k: (c.r + c.c) / (2 * n) + hash(i * 3.7) * 0.18 })).sort((a, b) => a.k - b.k);
  const rr = rng(5);
  order.forEach((o, rank) => {
    if (rank % 6) return;
    const f = 44 + 46 * Math.pow(rank / order.length, 0.85);
    const m = scale[Math.min(scale.length - 1, Math.floor(4 + (rank / order.length) * 10 + rr() * 2))];
    mix(wood(mtof(m + 12), 0.12), fr(f), { gain: 0.07 + 0.06 * (rank / order.length), pan: rr() * 1.4 - 0.7, send: 0.2 });
  });
}
mix(sparkle(0.8, 51), fr(90), { gain: 0.5, pan: 0, send: 0.4 });
mix(riser(fr(120) - fr(98)), fr(98), { gain: 0.35, send: 0.2 });
mix(whoosh(0.6, { f0: 500, f1: 2400, seed: 3 }), fr(100), { gain: 0.25, pan: -0.2 });
mix(wood(mtof(74) / 2, 0.3), fr(118), { gain: 0.35, pan: 0.1 });
mix(pop(520), fr(108), { gain: 0.32, pan: 0.25, send: 0.15 });
mix(pop(700), fr(116), { gain: 0.3, pan: -0.35, send: 0.15 });

// ---- Bars 3-8 (4-16 s): the groove drops as the stand lands ----
mix(impact(1.2, 13), fr(120), { gain: 0.45, send: 0.2 });
mix(ohat, fr(120), { gain: 0.2, pan: 0.2, send: 0.2 });
groove(bars(2), 6, { fillLast: false });
playRiff(RIFF_A, bars(2), { gain: 0.42, seed: 2 });
playRiff(RIFF_B, bars(6), { gain: 0.3, seed: 3 });
mix(whoosh(0.5, { f0: 300, f1: 1500, seed: 5 }), fr(146), { gain: 0.18, pan: 0.3 });
// Scan: a soft electronic warble, then success chime.
{
  const w = buf(fr(210) - fr(172));
  for (let i = 0; i < w.length; i++) {
    const t = i / SR;
    w[i] = Math.sin(2 * Math.PI * (900 + 120 * Math.sin(t * 2 * Math.PI * 6)) * t) * 0.18 * Math.min(1, t * 8) * Math.min(1, (w.length - i) / (SR * 0.05));
  }
  mix(w, fr(172), { gain: 0.09, pan: 0.25, send: 0.15 });
}
mix(bell(mtof(81), 1.2, { ratio: 2.0, index: 1.2, decay: 4 }), fr(210), { gain: 0.32, pan: 0.2, send: 0.3 });
mix(bell(mtof(86), 1.4, { ratio: 2.0, index: 1.2, decay: 3.5 }), fr(210) + 0.09, { gain: 0.32, pan: 0.25, send: 0.3 });
mix(whoosh(0.5, { f0: 600, f1: 4000, seed: 6 }), fr(216), { gain: 0.2, pan: 0.1 });
mix(riser(fr(270) - fr(238), 9), fr(238), { gain: 0.38, send: 0.15 });
mix(whoosh(1.0, { f0: 200, f1: 5000, shape: "rise", seed: 7 }), fr(270) - 1.0, { gain: 0.3 });
mix(impact(1.0, 14), fr(270), { gain: 0.4, send: 0.2 });
// Dishes spring out of the menu, one per beat.
[300, 315, 330, 345].forEach((f, i) => {
  mix(pop(mtof([74, 78, 81, 86][i]) * 0.5, 0.16), fr(f), { gain: 0.42, pan: i < 2 ? -0.45 : 0.45, send: 0.2 });
  mix(whoosh(0.35, { f0: 800, f1: 3000, seed: 20 + i }), fr(f) - 0.05, { gain: 0.14, pan: i < 2 ? -0.5 : 0.5 });
});
// ...and dive into the order, with a rising "add" chime.
[369, 384, 399, 414].forEach((f, i) => {
  mix(whoosh(0.3, { f0: 3000, f1: 700, seed: 30 + i }), fr(f) - 0.25, { gain: 0.14, pan: i < 2 ? -0.3 : 0.3 });
  mix(bell(mtof([86, 88, 91, 93][i]), 0.6, { ratio: 3.0, index: 0.7, decay: 7 }), fr(f), { gain: 0.24, pan: 0, send: 0.25 });
  mix(click(2600), fr(f), { gain: 0.18 });
});
mix(click(1900), fr(420), { gain: 0.45, pan: 0.2 });
[86, 90, 93, 98].forEach((m, i) => mix(bell(mtof(m), 1.0, { ratio: 2.0, index: 1.0, decay: 4.5 }), fr(424) + i * 0.07, { gain: 0.24, pan: -0.2 + i * 0.13, send: 0.3 }));
mix(printer(fr(454) - fr(440)), fr(440), { gain: 0.16, pan: 0.05 });
mix(whoosh(fr(480) - fr(452), { f0: 300, f1: 4200, shape: "rise", seed: 9 }), fr(452), { gain: 0.42, pan: 0.0 });

// ---- Bars 9-10 (16-20 s): kitchen ----
groove(bars(8), 2, { fillLast: true, riq: 0.1 });
playRiff(RIFF_A, bars(8), { gain: 0.34, oct: 12, seed: 5, pan: -0.15 });
mix(whoosh(0.45, { f0: 4000, f1: 600, shape: "fall", seed: 10 }), fr(480), { gain: 0.3 });
mix(click(1300), fr(493), { gain: 0.3, pan: -0.3 });
mix(whoosh(0.12, { f0: 2500, f1: 1800, seed: 11 }), fr(492), { gain: 0.2, pan: -0.3 });
mix(bell(mtof(90), 1.4, { ratio: 3.5, index: 1.8, decay: 3 }), fr(495), { gain: 0.3, pan: -0.45, send: 0.3 });
mix(bell(mtof(86), 1.6, { ratio: 3.5, index: 1.8, decay: 2.6 }), fr(495) + 0.16, { gain: 0.3, pan: -0.45, send: 0.3 });
mix(click(2100), fr(526), { gain: 0.32, pan: -0.4 });
mix(whoosh(0.4, { f0: 400, f1: 2000, seed: 12 }), fr(538), { gain: 0.25, pan: 0.35 });
mix(sizzle(1.4, 22), fr(540), { gain: 0.3, pan: 0.4, send: 0.05 });
mix(wood(140, 0.3), fr(557), { gain: 0.35, pan: 0.4 });
mix(sizzle(1.0, 23), fr(557), { gain: 0.32, pan: 0.4 });
mix(clink(5, 0.9), fr(566), { gain: 0.32, pan: 0.0, send: 0.1 });
mix(whoosh(fr(600) - fr(576), { f0: 250, f1: 1800, seed: 13 }), fr(576), { gain: 0.16, pan: 0.3 });
mix(whoosh(0.55, { f0: 300, f1: 5000, seed: 14 }), fr(585), { gain: 0.5, pan: 0.6 });

// ---- Bars 11-12 (20-24 s): the food arrives ----
mix(whoosh(0.4, { f0: 3000, f1: 400, shape: "fall", seed: 15 }), fr(600), { gain: 0.35, pan: -0.5 });
groove(bars(10), 2, { riq: 0.16, fillLast: true });
playRiff(RIFF_B, bars(10), { gain: 0.4, seed: 6 });
[615, 630, 645, 660].forEach((f, i) => {
  mix(whoosh(0.4, { f0: 600, f1: 2500, seed: 40 + i }), fr(f) - 0.4, { gain: 0.12, pan: -0.4 });
  mix(clink(60 + i, 1 + i * 0.06), fr(f), { gain: 0.36, pan: [-0.3, 0.3, 0.5, -0.5][i], send: 0.12 });
  mix(wood(110 + i * 8, 0.25), fr(f), { gain: 0.25 });
});
// Celebration: qanun-style tremolo up the scale + riq roll.
for (let k = 0; k < 24; k++) {
  const m = scale[4 + Math.floor(k / 3)];
  mix(oud(m + 12, 0.4, { seed: 300 + k, bright: 0.7 }), fr(662) + k * 0.0625, { gain: 0.16, pan: 0.3 * Math.sin(k), send: 0.25 });
}
for (let s = 0; s < 16; s++) mix(jingles[2], fr(662) + s * 0.0625, { gain: 0.12, pan: -0.2, send: 0.1 });
mix(riser(fr(718) - fr(690), 16), fr(690), { gain: 0.22, send: 0.2 });
mix(sparkle(0.7, 61), fr(704), { gain: 0.4, send: 0.4 });

// ---- Bars 13-15 (24-30 s): the logo ----
function crash(len = 2.4, seed = 91) {
  const out = buf(len);
  const nz = noiseSrc(seed);
  const hp = biquad("hp", 3800, 0.6);
  const r = rng(seed);
  const parts = [3150, 4420, 5870, 7330].map((f) => [f * (0.98 + r() * 0.04), r() * 6]);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    let s = hp.run(nz()) * 0.8;
    for (const [f, p] of parts) s += Math.sin(2 * Math.PI * f * t + p) * 0.06;
    out[i] = s * (Math.exp(-t * 2.2) * 0.8 + Math.exp(-t * 20) * 0.6);
  }
  return out;
}
mix(crash(), fr(720), { gain: 0.34, pan: 0.15, send: 0.3 });
mix(kickS, fr(720), { gain: 0.75 });
mix(doumS, fr(720), { gain: 0.6 });
for (const b of [2, 4, 6]) mix(kickS, fr(720) + b * 0.5, { gain: 0.42 });
for (let s = 0; s < 16; s++) mix(jingles[s % 2], fr(720) + 0.5 + s * 0.125, { gain: 0.05 + s * 0.004, pan: -0.3 });
mix(impact(2.6, 17), fr(720), { gain: 0.42, send: 0.25 });
mix(pad([50, 54, 57, 62, 66], 5.6, { attack: 0.02, release: 2.4, cutoff: 2600, seed: 19 }), fr(720), { gain: 0.4, send: 0.35 });
[50, 57, 62, 66, 69].forEach((m, i) => mix(oud(m, 2.4, { seed: 500 + i, bright: 0.7 }), fr(720) + i * 0.018, { gain: 0.32, pan: -0.3 + i * 0.15, send: 0.3 }));
mix(sparkle(1.0, 71, [86, 90, 93, 98, 102, 105]), fr(720), { gain: 0.45, send: 0.45 });
[736, 742, 748, 754, 760, 766].forEach((f, i) => mix(oud([62, 66, 67, 69, 72, 74][i] + 12, 1.0, { seed: 600 + i, bright: 0.7 }), fr(f), { gain: 0.3, pan: -0.3 + i * 0.12, send: 0.3 }));
groove(bars(13), 2, { kickOn: true, clapOn: false, riq: 0.08, bass: 0.3, darb: 0.6 });
mix(whoosh(0.5, { f0: 600, f1: 2600, seed: 70 }), fr(784), { gain: 0.2, pan: 0.5 });
mix(pop(900, 0.1), fr(794), { gain: 0.25, pan: -0.4, send: 0.15 });
mix(sparkle(0.9, 81, [93, 98, 102, 105]), fr(830), { gain: 0.3, pan: 0.2, send: 0.5 });
// Final phrase and resolution.
playRiff([[0, 74, 0.5], [0.5, 72, 0.5], [1, 70, 0.5], [1.5, 69, 0.5], [2, 66, 0.5], [2.5, 63, 0.5], [3, 62, 2]], bars(14), { gain: 0.36, seed: 9 });
mix(pad([38, 50, 54, 57, 62], 1.8, { attack: 0.3, release: 2.2, cutoff: 1800, seed: 23 }), bars(14) + 1.5, { gain: 0.3, send: 0.4 });
mix(kickS, bars(14) + 1.5, { gain: 0.55 });
mix(doumS, bars(14) + 1.5, { gain: 0.5 });

// =================== MIX & MASTER ===================
const [rvL, rvR] = freeverb(SL, SRr, { room: 0.86, damp: 0.3 });
const outL = new Float32Array(N);
const outR = new Float32Array(N);
let env = 0;
for (let i = 0; i < N; i++) {
  let l = L[i] + rvL[i] * 0.9;
  let r = R[i] + rvR[i] * 0.9;
  // Gentle bus compression (peak-follower, ~3:1 above -12 dBFS).
  const p = Math.max(Math.abs(l), Math.abs(r));
  env = p > env ? env + (p - env) * 0.02 : env + (p - env) * 0.0004;
  const th = 0.32;
  const g = env > th ? Math.pow(th / env, 0.55) : 1;
  l *= g;
  r *= g;
  // Fade the tail into silence at 30 s.
  const fade = Math.min(1, (N - i) / (SR * 0.9));
  outL[i] = Math.tanh(l * 1.2) * fade;
  outR[i] = Math.tanh(r * 1.2) * fade;
}
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(outL[i]), Math.abs(outR[i]));
const norm = 0.89 / peak;

const outDir = path.join(ROOT, "out/audio");
fs.mkdirSync(outDir, { recursive: true });
const data = Buffer.alloc(N * 4);
for (let i = 0; i < N; i++) {
  data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, outL[i] * norm)) * 32767), i * 4);
  data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, outR[i] * norm)) * 32767), i * 4 + 2);
}
const hdr = Buffer.alloc(44);
hdr.write("RIFF", 0);
hdr.writeUInt32LE(36 + data.length, 4);
hdr.write("WAVE", 8);
hdr.write("fmt ", 12);
hdr.writeUInt32LE(16, 16);
hdr.writeUInt16LE(1, 20);
hdr.writeUInt16LE(2, 22);
hdr.writeUInt32LE(SR, 24);
hdr.writeUInt32LE(SR * 4, 28);
hdr.writeUInt16LE(4, 32);
hdr.writeUInt16LE(16, 34);
hdr.write("data", 36);
hdr.writeUInt32LE(data.length, 40);
fs.writeFileSync(path.join(outDir, "soundtrack.wav"), Buffer.concat([hdr, data]));
console.log(`soundtrack.wav: ${DUR}s @ ${SR} Hz, peak normalised from ${peak.toFixed(3)}`);
