// Kinetic typography layer. Text is drawn with Canvas2D (proper kerning, real
// fonts) into a texture that is composited after tone mapping but before film
// grain, so type stays colour-exact yet sits inside the same "film" as the 3D.
import * as THREE from "three";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { ease, invLerp, clamp, lerp } from "./anim.js";

const HudShader = {
  uniforms: { tDiffuse: { value: null }, tHud: { value: null } },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse, tHud;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      vec4 h = texture2D(tHud, vUv);
      gl_FragColor = vec4(mix(c.rgb, h.rgb, h.a), c.a);
    }`,
};

export const INK = "#111820";

export function createHud(stage) {
  const { W, H, scale } = stage;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.NoColorSpace; // canvas pixels are already display sRGB
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  const pass = new ShaderPass(HudShader);
  pass.uniforms.tHud.value = tex;
  stage.composer.insertPass(pass, stage.composer.passes.indexOf(stage.finish));
  let used = false;
  return {
    ctx,
    begin() {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      used = false;
    },
    touch() {
      used = true;
    },
    end() {
      pass.enabled = used;
      if (used) tex.needsUpdate = true;
    },
  };
}

const fontStr = (weight, size, family = "DM Sans") => `${weight} ${size}px "${family}"`;

/**
 * Headline whose words rise out of an invisible edge, staggered, then exit upward.
 * lines: [[word | {t, color, pill}], ...]
 */
export function kinetic(hud, f, spec) {
  const {
    at,
    out = Infinity,
    x,
    y,
    align = "left",
    size = 96,
    weight = 800,
    family = "DM Sans",
    color = INK,
    tracking = -0.035,
    lineHeight = 1.06,
    stagger = 3,
    dur = 18,
    outStagger = 2,
    outDur = 12,
    lines,
  } = spec;
  if (f < at || f > out + outDur + outStagger * 24) return;
  const ctx = hud.ctx;
  ctx.save();
  ctx.font = fontStr(weight, size, family);
  ctx.letterSpacing = `${(tracking * size).toFixed(2)}px`;
  ctx.textBaseline = "alphabetic";
  const space = size * 0.24;
  const lh = size * lineHeight;
  const padX = size * 0.2;
  let idx = 0;
  lines.forEach((line, li) => {
    const words = line.map((w) => (typeof w === "string" ? { t: w } : w));
    const widths = words.map((w) => ctx.measureText(w.t).width + (w.pill ? padX * 2 : 0));
    const total = widths.reduce((a, b) => a + b, 0) + space * (words.length - 1);
    let cx = align === "left" ? x : align === "center" ? x - total / 2 : x - total;
    const base = y + li * lh;
    words.forEach((w, wi) => {
      const ww = widths[wi];
      const i0 = at + idx * stagger;
      const pin = ease.snap(invLerp(i0, i0 + dur, f));
      const o0 = out + idx * outStagger;
      const pout = ease.inCubic(invLerp(o0, o0 + outDur, f));
      if (w.pill) {
        // Pill wipes in from the left, then exits to the right.
        const a = ease.snap(invLerp(i0 - 3, i0 + dur - 3, f));
        const b = ease.inOutCubic(invLerp(o0, o0 + outDur, f));
        const x0 = cx + ww * b;
        const x1 = cx + ww * a;
        if (x1 - x0 > 1) {
          ctx.fillStyle = w.pill;
          ctx.beginPath();
          ctx.roundRect(x0, base - size * 0.86, x1 - x0, size * 1.12, size * 0.2);
          ctx.fill();
        }
      }
      // Travel far enough that entering/exited glyphs sit fully outside the mask.
      const dy = (1 - pin) * lh * 1.3 - pout * lh * 1.35;
      ctx.save();
      ctx.beginPath();
      ctx.rect(cx - size * 0.1, base - size * 0.98, ww + size * 0.2, size * 1.3);
      ctx.clip();
      ctx.fillStyle = w.color ?? color;
      ctx.fillText(w.t, cx + (w.pill ? padX : 0), base + dy);
      ctx.restore();
      cx += ww + space;
      idx++;
    });
  });
  ctx.restore();
  hud.touch();
}

/** Small supporting line: slides up a little and fades. */
export function fadeText(hud, f, spec) {
  const { at, out = Infinity, x, y, text, size = 34, weight = 500, family = "DM Sans", color = INK, align = "left", tracking = 0, dur = 16, alpha: maxA = 1 } = spec;
  const a = ease.snap(invLerp(at, at + dur, f)) * (1 - ease.inCubic(invLerp(out, out + 10, f)));
  if (a <= 0.001) return;
  const ctx = hud.ctx;
  ctx.save();
  ctx.globalAlpha = a * maxA;
  ctx.font = fontStr(weight, size, family);
  ctx.letterSpacing = `${(tracking * size).toFixed(2)}px`;
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = color;
  ctx.fillText(text, x, y + (1 - ease.snap(invLerp(at, at + dur, f))) * 18);
  ctx.restore();
  hud.touch();
}

/** Rounded label with optional leading dot; `p` is 0..1 appearance progress. */
export function pillLabel(hud, { x, y, text, sub = null, p = 1, size = 26, bg = "#ffffff", fg = INK, subFg = "#1561ff", dot = null, anchor = "center", radius = null, padX = 22, padY = 14, shadow = true }) {
  if (p <= 0.001) return;
  const ctx = hud.ctx;
  ctx.save();
  ctx.font = fontStr(700, size);
  const tw = ctx.measureText(text).width;
  ctx.font = fontStr(800, size * 0.92);
  const sw = sub ? ctx.measureText(sub).width : 0;
  const dotW = dot ? size * 0.75 : 0;
  const w = padX * 2 + dotW + tw + (sub ? size * 0.55 + sw : 0);
  const h = size + padY * 2;
  const s = lerp(0.6, 1, ease.outBack(clamp(p)));
  const ox = anchor === "center" ? -w / 2 : anchor === "right" ? -w : 0;
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.globalAlpha = clamp(p * 1.6);
  if (shadow) {
    ctx.shadowColor = "rgba(40,24,10,0.18)";
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
  }
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(ox, -h / 2, w, h, radius ?? h / 2);
  ctx.fill();
  ctx.shadowColor = "transparent";
  let cx = ox + padX;
  if (dot) {
    ctx.fillStyle = dot;
    ctx.beginPath();
    ctx.arc(cx + size * 0.22, 0, size * 0.2, 0, Math.PI * 2);
    ctx.fill();
    cx += dotW;
  }
  ctx.textBaseline = "middle";
  ctx.font = fontStr(700, size);
  ctx.fillStyle = fg;
  ctx.fillText(text, cx, size * 0.04);
  if (sub) {
    ctx.font = fontStr(800, size * 0.92);
    ctx.fillStyle = subFg;
    ctx.fillText(sub, cx + tw + size * 0.55, size * 0.04);
  }
  ctx.restore();
  hud.touch();
}

/** World position -> HUD design-space pixels (1920x1080). */
export function project(v, camera) {
  const p = v.clone().project(camera);
  return { x: (p.x + 1) * 960, y: (1 - p.y) * 540, behind: p.z > 1 };
}
