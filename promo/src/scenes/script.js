// On-screen typography timeline (English). Kept apart from the scenes so the
// copy, its timing and its placement can be tuned in one place.
import { C } from "../lib/materials.js";
import { kinetic, fadeText, pillLabel, INK } from "../lib/hud.js";
import { qrDraw } from "../world/ui.js";
import { ease, invLerp, clamp } from "../lib/anim.js";
import { SITE_LABEL } from "../config.js";

const w = (t, color, pill) => ({ t, color, pill });

function qrCard(hud, rows, p) {
  if (p <= 0.001) return;
  const ctx = hud.ctx;
  ctx.save();
  const x = 1330 + (1 - p) * 140;
  const y = 288;
  const W = 380;
  const H = 480;
  ctx.globalAlpha = clamp(p * 1.4);
  ctx.shadowColor = "rgba(70,40,14,0.16)";
  ctx.shadowBlur = 44;
  ctx.shadowOffsetY = 16;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.roundRect(x, y, W, H, 34);
  ctx.fill();
  ctx.shadowColor = "transparent";
  qrDraw(ctx, rows, x + 26, y + 26, 328, { dark: INK, light: "#ffffff", quiet: 2 });
  ctx.textAlign = "center";
  ctx.fillStyle = INK;
  ctx.font = '800 32px "DM Sans"';
  ctx.fillText("Scan to visit", x + W / 2, y + 404);
  ctx.fillStyle = "#7b7368";
  ctx.font = '500 21px "DM Sans"';
  ctx.fillText("Point your phone camera here", x + W / 2, y + 440);
  ctx.restore();
  hud.touch();
}

export function script(hud, f, ctx) {
  const B = C.blueDeep;
  const O = C.orange;
  // S1 - over the QR code building itself
  kinetic(hud, f, { at: 8, out: 90, x: 128, y: 230, size: 100, lines: [["Discover", "Damascus,"], [w("one", B), w("table", B), w("at", B), w("a", B), w("time.", B)]] });
  // S2 - the scan
  kinetic(hud, f, { at: 170, out: 232, x: 128, y: 214, size: 108, lines: [["Scan", "the", w("table.", "#ffffff", O)]] });
  fadeText(hud, f, { at: 184, out: 230, x: 134, y: 282, text: "No app to download.", size: 40, weight: 600 });
  // S3 - menu in hand (white on blue)
  kinetic(hud, f, { at: 292, out: 352, x: 960, y: 168, align: "center", size: 92, color: "#ffffff", lines: [["The", "whole", "menu,", "in", "your", "hand."]] });
  kinetic(hud, f, { at: 362, out: 438, x: 960, y: 168, align: "center", size: 100, color: "#ffffff", lines: [["Order", "in", w("one tap.", "#ffffff", O)]] });
  // S4 - kitchen
  kinetic(hud, f, { at: 498, out: 584, x: 128, y: 196, size: 92, lines: [["Straight", "to", "the", w("kitchen.", B)]] });
  fadeText(hud, f, { at: 514, out: 582, x: 132, y: 258, text: "Live orders for staff. No lost tickets.", size: 38, weight: 600 });
  // S5 - food arrives
  kinetic(hud, f, { at: 617, out: 688, x: 960, y: 936, align: "center", size: 140, weight: 900, lines: [[w("Sahtein!", O)]] });
  fadeText(hud, f, { at: 630, out: 686, x: 960, y: 1000, align: "center", text: "That's “enjoy your meal” in Syria.", size: 40, weight: 600 });
  // S6 - end card
  kinetic(hud, f, { at: 776, x: 204, y: 684, size: 60, weight: 700, stagger: 2, tracking: -0.02, lines: [["Local", "flavors,", "one", "scan", "away."]] });
  pillLabel(hud, { x: 204, y: 770, text: SITE_LABEL, p: ease.snap(invLerp(794, 810, f)), size: 30, bg: INK, fg: "#ffffff", anchor: "left", dot: O, padX: 26, padY: 16 });
  qrCard(hud, ctx.assets.qr.rows, ease.snap(invLerp(784, 808, f)));
}
