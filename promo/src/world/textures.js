// Procedural textures with a Damascene accent: inlaid table tops, star tiles, ablaq stone.
import * as THREE from "three";
import { canvasTex, rng } from "../lib/shapes.js";

function starPath(ctx, cx, cy, r, rot = 0) {
  // Eight-pointed star built from two overlapping squares (khatam).
  ctx.beginPath();
  for (let i = 0; i < 16; i++) {
    const a = rot + (i / 16) * Math.PI * 2;
    const rr = i % 2 === 0 ? r : r * 0.76;
    const x = cx + Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr;
    i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  }
  ctx.closePath();
}

/** Walnut table top with mother-of-pearl inlay. Mapped onto a cylinder cap (UVs = disc). */
export function inlayTexture() {
  const S = 1024;
  const { ctx, tex } = canvasTex(S, S);
  const c = S / 2;
  ctx.fillStyle = "#5e3a22";
  ctx.fillRect(0, 0, S, S);
  const r = rng(7);
  for (let i = 0; i < 260; i++) {
    const y0 = r() * S;
    ctx.strokeStyle = r() < 0.5 ? `rgba(38,20,9,${0.06 + r() * 0.1})` : `rgba(140,92,56,${0.05 + r() * 0.1})`;
    ctx.lineWidth = 1 + r() * 3;
    ctx.beginPath();
    for (let x = 0; x <= S; x += 16) {
      const y = y0 + Math.sin(x * 0.011 + i) * 5 + Math.sin(x * 0.0031 + i * 1.7) * 15;
      x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
  }
  const pearl = "#f2e8d5";
  const light = "#a2703f";
  const ring = (r0, r1, col) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(c, c, r1 * c, 0, Math.PI * 2);
    ctx.arc(c, c, r0 * c, 0, Math.PI * 2, true);
    ctx.fill();
  };
  ring(0.955, 0.972, pearl);
  ring(0.918, 0.928, pearl);
  ring(0.8, 0.81, pearl);
  const N = 64;
  for (let k = 0; k < N; k++) {
    const a = (k / N) * Math.PI * 2;
    const h = (Math.PI / N) * 0.92;
    const P = (rad, ang) => [c + Math.cos(ang) * rad * c, c + Math.sin(ang) * rad * c];
    ctx.fillStyle = k % 2 ? light : pearl;
    ctx.beginPath();
    ctx.moveTo(...P(0.818, a));
    ctx.lineTo(...P(0.864, a - h));
    ctx.lineTo(...P(0.91, a));
    ctx.lineTo(...P(0.864, a + h));
    ctx.closePath();
    ctx.fill();
  }
  ctx.lineWidth = 7;
  ctx.strokeStyle = pearl;
  starPath(ctx, c, c, 0.36 * c, Math.PI / 8);
  ctx.stroke();
  ctx.fillStyle = light;
  starPath(ctx, c, c, 0.29 * c, Math.PI / 8);
  ctx.fill();
  ctx.fillStyle = pearl;
  starPath(ctx, c, c, 0.13 * c, Math.PI / 8);
  ctx.fill();
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(c + Math.cos(a) * 0.5 * c, c + Math.sin(a) * 0.5 * c, 9, 0, Math.PI * 2);
    ctx.fill();
  }
  return tex;
}

/** One Damascene wall tile; set tex.repeat to tile a surface. */
export function tileTexture() {
  const S = 512;
  const { ctx, tex } = canvasTex(S, S);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  ctx.fillStyle = "#f7f1e6";
  ctx.fillRect(0, 0, S, S);
  const blue = "#1d4fd0";
  const navy = "#0d2766";
  const sky = "#9cc4ff";
  const orange = "#ff7a12";
  // corner quarter-stars (they join into full stars across tiles)
  for (const [x, y] of [
    [0, 0],
    [S, 0],
    [0, S],
    [S, S],
  ]) {
    ctx.fillStyle = sky;
    starPath(ctx, x, y, S * 0.22, Math.PI / 8);
    ctx.fill();
  }
  ctx.fillStyle = blue;
  starPath(ctx, S / 2, S / 2, S * 0.34, Math.PI / 8);
  ctx.fill();
  ctx.fillStyle = "#f7f1e6";
  starPath(ctx, S / 2, S / 2, S * 0.24, Math.PI / 8);
  ctx.fill();
  ctx.fillStyle = navy;
  starPath(ctx, S / 2, S / 2, S * 0.15, 0);
  ctx.fill();
  ctx.fillStyle = orange;
  ctx.beginPath();
  ctx.arc(S / 2, S / 2, S * 0.05, 0, Math.PI * 2);
  ctx.fill();
  // four-petal crosses on the edges
  ctx.fillStyle = blue;
  for (const [x, y] of [
    [S / 2, 0],
    [S / 2, S],
    [0, S / 2],
    [S, S / 2],
  ]) {
    ctx.beginPath();
    ctx.ellipse(x, y, S * 0.05, S * 0.11, 0, 0, Math.PI * 2);
    ctx.ellipse(x, y, S * 0.11, S * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = "#d8c8b0";
  ctx.lineWidth = 8;
  ctx.strokeRect(0, 0, S, S);
  return tex;
}

/** Alternating pale limestone / basalt courses (ablaq), as on Damascene arches. */
export function ablaqTexture() {
  const S = 512;
  const { ctx, tex } = canvasTex(S, S);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  const r = rng(5);
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 ? "#4a4038" : "#efe2ca";
    ctx.fillRect(0, i * 64, S, 64);
  }
  for (let i = 0; i < 2600; i++) {
    const y = r() * S;
    const dark = Math.floor(y / 64) % 2 === 1;
    ctx.fillStyle = dark ? `rgba(255,240,220,${r() * 0.06})` : `rgba(90,60,30,${r() * 0.07})`;
    ctx.fillRect(r() * S, y, 2 + r() * 5, 2 + r() * 4);
  }
  ctx.fillStyle = "rgba(60,40,20,0.25)";
  for (let i = 0; i <= 8; i++) ctx.fillRect(0, i * 64 - 1, S, 2);
  return tex;
}

/** Orange wheel (peel, pith, segments) for the juice garnish. */
export function orangeSliceTexture() {
  const S = 256;
  const { ctx, tex } = canvasTex(S, S);
  const c = S / 2;
  ctx.fillStyle = "#ff8a1c";
  ctx.beginPath();
  ctx.arc(c, c, c, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff1d6";
  ctx.beginPath();
  ctx.arc(c, c, c * 0.86, 0, Math.PI * 2);
  ctx.fill();
  for (let k = 0; k < 9; k++) {
    const a0 = (k / 9) * Math.PI * 2 + 0.05;
    const a1 = ((k + 1) / 9) * Math.PI * 2 - 0.05;
    ctx.fillStyle = k % 2 ? "#ffad33" : "#ffa024";
    ctx.beginPath();
    ctx.moveTo(c + Math.cos((a0 + a1) / 2) * 6, c + Math.sin((a0 + a1) / 2) * 6);
    ctx.arc(c, c, c * 0.8, a0, a1);
    ctx.closePath();
    ctx.fill();
  }
  return tex;
}

/** Candy stripes for the straw. */
export function stripeTexture(a = "#ffffff", b = "#1561ff") {
  const { ctx, tex } = canvasTex(64, 64);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  ctx.fillStyle = a;
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = b;
  for (let i = -2; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 32, 0);
    ctx.lineTo(i * 32 + 16, 0);
    ctx.lineTo(i * 32 + 48, 64);
    ctx.lineTo(i * 32 + 32, 64);
    ctx.fill();
  }
  return tex;
}
