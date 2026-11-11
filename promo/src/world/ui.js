// Canvas-drawn product UI: the diner's phone, the kitchen tablet, the printed
// ticket and the stand header. Layouts follow the real QR SYRIA customer flow.
import { RESTAURANT, TABLE, ORDER_ITEMS, ORDER_TOTAL, ORDER_NO, formatSYP } from "../config.js";
import { C } from "../lib/materials.js";
import { canvasTex } from "../lib/shapes.js";
import { ease, invLerp, clamp, lerp } from "../lib/anim.js";

const F = (w, s) => `${w} ${s}px "DM Sans"`;
const INK = "#111820";
const MUTED = "#7b7368";

// --- Logo drawn from the exact paths in public/logo.svg -----------------------
const FORK = "M74 42v34M94 34v42M114 34v42M134 42v34M74 76c0 17 13 31 30 31s30-14 30-31M104 107v10";
const HANDLE = "M96 108h17l9 72c1 11-4 17-14 17s-16-6-15-17z";
export const R_PATH = "M218 28h96c51 0 77 27 77 67 0 29-14 49-41 61l48 53h-78l-39-45h-11v45h-52zm52 47v42h43q27 0 27-21t-27-21z";
export const A_PATH = "M831 28h52l72 181h-63l-14-39h-46l-14 39h-61z M858 111l-19 40h38z";
export const A_TRI = "m858 111-19 40h38z";

function grad(ctx, x0, y0, x1, y1, a, b) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, a);
  g.addColorStop(1, b);
  return g;
}

/** Draw the mark (ring + fork) with its centre at (x, y) and ring diameter `size`. */
export function drawMark(ctx, x, y, size, { mono = null } = {}) {
  ctx.save();
  const s = size / 190;
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.translate(-104, -103);
  const blue = mono ?? grad(ctx, 18, 17, 190, 189, C.blueBright, C.blueDeep);
  const orange = mono ?? grad(ctx, 96, 108, 123, 197, C.amber, C.orangeDeep);
  ctx.lineCap = "round";
  ctx.strokeStyle = blue;
  ctx.lineWidth = 18;
  ctx.beginPath();
  ctx.arc(104, 103, 86, Math.PI / 2, Math.PI / 2 + (488 / 86));
  ctx.stroke();
  ctx.save();
  ctx.translate(104, 103);
  ctx.rotate((-42 * Math.PI) / 180);
  ctx.translate(-104, -103);
  ctx.lineWidth = 10;
  ctx.stroke(new Path2D(FORK));
  ctx.fillStyle = orange;
  ctx.fill(new Path2D(HANDLE));
  ctx.restore();
  ctx.restore();
}

/** Full horizontal logo; `h` is the drawn height of the 220-unit viewBox. */
export function drawLogo(ctx, x, y, h, wordmark, { ink = INK } = {}) {
  ctx.save();
  const s = h / 220;
  ctx.translate(x, y);
  ctx.scale(s, s);
  drawMark(ctx, 104, 103, 190);
  ctx.fillStyle = grad(ctx, 218, 28, 439, 209, C.blueBright, C.blueDeep);
  ctx.fill(new Path2D(R_PATH), "evenodd");
  ctx.fillStyle = ink;
  for (const l of wordmark) ctx.fill(new Path2D(l.d));
  ctx.fill(new Path2D(A_PATH), "evenodd");
  ctx.fillStyle = grad(ctx, 839, 111, 877, 151, C.amber, C.orangeDeep);
  ctx.fill(new Path2D(A_TRI));
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r, fill) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
}

function qrDraw(ctx, rows, x, y, size, { dark = INK, light = "#ffffff", quiet = 2 } = {}) {
  const n = rows.length;
  const m = size / (n + quiet * 2);
  ctx.fillStyle = light;
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = dark;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (rows[r][c] === "1") ctx.fillRect(Math.floor(x + (c + quiet) * m), Math.floor(y + (r + quiet) * m), Math.ceil(m), Math.ceil(m));
    }
  }
}
export { qrDraw };

function damasceneStars(ctx, x, y, w, h, color, step = 46) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = color;
  for (let yy = y - step; yy < y + h + step; yy += step) {
    for (let xx = x - step; xx < x + w + step; xx += step) {
      const ox = (Math.round((yy - y) / step) % 2) * (step / 2);
      ctx.beginPath();
      for (let i = 0; i < 16; i++) {
        const a = Math.PI / 8 + (i / 16) * Math.PI * 2;
        const rr = i % 2 ? 7.5 : 11;
        ctx.lineTo(xx + ox + Math.cos(a) * rr, yy + Math.sin(a) * rr);
      }
      ctx.fill();
    }
  }
  ctx.restore();
}

// --- Phone ------------------------------------------------------------------------
const PW = 390;
const PH = 830;

export function createPhoneScreen({ qrRows, thumbs }) {
  const k = 600 / PW;
  const { ctx, tex } = canvasTex(600, Math.round(PH * k));
  let last = "";

  function statusBar(dark) {
    ctx.fillStyle = dark ? "#ffffff" : INK;
    ctx.font = F(700, 15);
    ctx.fillText("9:41", 30, 33);
    for (let i = 0; i < 4; i++) roundRect(ctx, 300 + i * 5.5, 31 - (i + 1) * 2.6, 3.5, (i + 1) * 2.6, 1, dark ? "#ffffff" : INK);
    ctx.beginPath();
    ctx.arc(334, 31, 7, (-3 * Math.PI) / 4, -Math.PI / 4);
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = dark ? "#ffffff" : INK;
    ctx.stroke();
    roundRect(ctx, 346, 22, 24, 12, 3.5);
    ctx.lineWidth = 1.4;
    ctx.stroke();
    roundRect(ctx, 348, 24, 17, 8, 2, dark ? "#ffffff" : INK);
    roundRect(ctx, 145, 11, 100, 31, 15.5, "#000000");
  }

  function scanScreen(s) {
    const g = ctx.createRadialGradient(195, 470, 40, 195, 470, 520);
    g.addColorStop(0, "#5a4636");
    g.addColorStop(0.5, "#2e2620");
    g.addColorStop(1, "#121418");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, PW, PH);
    statusBar(true);
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.font = F(800, 22);
    ctx.fillText("Scan to order", 195, 118);
    ctx.font = F(500, 14.5);
    ctx.fillStyle = "rgba(255,255,255,0.72)";
    ctx.fillText("Point your camera at the table's QR", 195, 142);
    const qs = 214;
    const qx = 195 - qs / 2;
    const qy = 300;
    roundRect(ctx, qx - 10, qy - 10, qs + 20, qs + 20, 18, "#fffcf6");
    qrDraw(ctx, qrRows, qx, qy, qs, { dark: C.blueDeep, light: "#fffcf6", quiet: 1 });
    // Corner brackets pulse, then lock on.
    const lock = ease.snap(clamp(s.found));
    const pad = lerp(34, 18, lock) + Math.sin(s.t * 0.4) * 3 * (1 - lock);
    ctx.strokeStyle = lock > 0.5 ? C.mint : C.orange;
    ctx.lineWidth = 6;
    ctx.lineCap = "round";
    const x0 = qx - pad;
    const y0 = qy - pad;
    const x1 = qx + qs + pad;
    const y1 = qy + qs + pad;
    const L = 34;
    for (const [cx, cy, dx, dy] of [
      [x0, y0, 1, 1],
      [x1, y0, -1, 1],
      [x0, y1, 1, -1],
      [x1, y1, -1, -1],
    ]) {
      ctx.beginPath();
      ctx.moveTo(cx, cy + dy * L);
      ctx.lineTo(cx, cy + dy * 10);
      ctx.quadraticCurveTo(cx, cy, cx + dx * 10, cy);
      ctx.lineTo(cx + dx * L, cy);
      ctx.stroke();
    }
    if (s.found < 0.5) {
      const ly = qy + qs * (0.5 + 0.5 * Math.sin(s.t * 0.21 - 1.2));
      const lg = ctx.createLinearGradient(0, ly - 30, 0, ly + 2);
      lg.addColorStop(0, "rgba(255,122,18,0)");
      lg.addColorStop(1, "rgba(255,122,18,0.55)");
      ctx.fillStyle = lg;
      ctx.fillRect(qx - 6, ly - 30, qs + 12, 32);
      roundRect(ctx, qx - 8, ly - 2, qs + 16, 4, 2, C.orange);
    }
    if (s.found > 0) {
      const p = ease.outBack(clamp(s.found * 1.4));
      ctx.save();
      ctx.translate(195, qy + qs / 2);
      ctx.scale(p, p);
      ctx.fillStyle = C.mint;
      ctx.beginPath();
      ctx.arc(0, 0, 44, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 9;
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(-18, 1);
      ctx.lineTo(-5, 14);
      ctx.lineTo(19, -12);
      ctx.stroke();
      ctx.restore();
      const q = ease.snap(clamp((s.found - 0.25) * 1.6));
      ctx.globalAlpha = q;
      roundRect(ctx, 195 - 128, 622 + (1 - q) * 20, 256, 46, 23, "#ffffff");
      ctx.fillStyle = INK;
      ctx.font = F(700, 15);
      ctx.fillText(`${RESTAURANT.name}  ·  ${TABLE.name}`, 195, 651 + (1 - q) * 20);
      ctx.globalAlpha = 1;
    }
    ctx.textAlign = "left";
  }

  function menuScreen(s) {
    ctx.fillStyle = "#f7f2eb";
    ctx.fillRect(0, 0, PW, PH);
    statusBar(false);
    // Header card
    roundRect(ctx, 12, 52, 366, 172, 26, grad(ctx, 12, 52, 378, 224, C.blueBright, C.blueDeep));
    damasceneStars(ctx, 12, 52, 366, 172, "rgba(255,255,255,0.07)");
    ctx.save();
    ctx.beginPath();
    ctx.arc(54, 98, 24, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    drawMark(ctx, 54, 98, 32);
    ctx.restore();
    ctx.fillStyle = "#ffffff";
    ctx.font = F(800, 25);
    ctx.fillText(RESTAURANT.name, 30, 154);
    ctx.font = F(500, 14);
    ctx.fillStyle = "rgba(255,255,255,0.82)";
    ctx.fillText(RESTAURANT.kind, 30, 176);
    roundRect(ctx, 30, 189, 86, 25, 12.5, "#ffffff");
    ctx.fillStyle = C.blueDeep;
    ctx.font = F(800, 12.5);
    ctx.fillText(TABLE.name, 46, 206);
    roundRect(ctx, 124, 189, 96, 25, 12.5, "rgba(255,255,255,0.18)");
    ctx.fillStyle = "#7dffb8";
    ctx.beginPath();
    ctx.arc(138, 201.5, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = F(700, 12.5);
    ctx.fillText("Open now", 148, 206);
    // Tabs
    let tx = 16;
    ["Mezze", "Grills", "Drinks", "Sweets"].forEach((t, i) => {
      ctx.font = F(700, 14);
      const w = ctx.measureText(t).width + 30;
      roundRect(ctx, tx, 240, w, 36, 18, i === 0 ? INK : "#ffffff");
      ctx.fillStyle = i === 0 ? "#ffffff" : INK;
      ctx.fillText(t, tx + 15, 263);
      tx += w + 8;
    });
    ctx.fillStyle = INK;
    ctx.font = F(800, 19);
    ctx.fillText("Popular tonight", 18, 312);
    ORDER_ITEMS.forEach((it, i) => {
      const y = 326 + i * 102;
      const lift = s.pop?.[i] ?? 0;
      ctx.save();
      ctx.shadowColor = "rgba(60,40,20,0.10)";
      ctx.shadowBlur = 16;
      ctx.shadowOffsetY = 4;
      roundRect(ctx, 14, y, 362, 92, 20, "#ffffff");
      ctx.restore();
      if (s.highlight === i) {
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = C.orange;
        roundRect(ctx, 14, y, 362, 92, 20);
        ctx.stroke();
      }
      ctx.save();
      roundRect(ctx, 24, y + 10, 72, 72, 16, "#f3ebdf");
      ctx.clip();
      if (thumbs?.[it.id] && lift < 0.5) ctx.drawImage(thumbs[it.id], 24, y + 10, 72, 72);
      ctx.restore();
      ctx.fillStyle = INK;
      ctx.font = F(800, 16);
      ctx.fillText(it.name, 108, y + 31);
      ctx.fillStyle = MUTED;
      ctx.font = F(500, 12.5);
      ctx.fillText(it.note, 108, y + 51);
      ctx.fillStyle = C.blueDeep;
      ctx.font = F(800, 15);
      ctx.fillText(formatSYP(it.price), 108, y + 76);
      const added = s.added?.[i] ?? 0;
      const bx = 344;
      const by = y + 64;
      const bs = 1 + Math.sin(clamp(added) * Math.PI) * 0.3;
      ctx.save();
      ctx.translate(bx, by);
      ctx.scale(bs, bs);
      ctx.fillStyle = added > 0.5 ? C.orange : C.blue;
      ctx.beginPath();
      ctx.arc(0, 0, 17, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3.2;
      ctx.lineCap = "round";
      ctx.beginPath();
      if (added > 0.5) {
        ctx.moveTo(-7, 0);
        ctx.lineTo(-2, 5);
        ctx.lineTo(7, -5);
      } else {
        ctx.moveTo(-7, 0);
        ctx.lineTo(7, 0);
        ctx.moveTo(0, -7);
        ctx.lineTo(0, 7);
      }
      ctx.stroke();
      ctx.restore();
    });
    // Order bar
    const count = s.count ?? 0;
    if (count > 0) {
      const send = clamp(s.send ?? 0);
      const press = s.press ?? 0;
      const sc = 1 - Math.sin(clamp(press) * Math.PI) * 0.05;
      ctx.save();
      ctx.translate(195, 762);
      ctx.scale(sc, sc);
      const col = send > 0.5 ? C.blue : INK;
      ctx.shadowColor = "rgba(20,30,60,0.25)";
      ctx.shadowBlur = 18;
      ctx.shadowOffsetY = 6;
      roundRect(ctx, -181, -32, 362, 64, 24, col);
      ctx.shadowColor = "transparent";
      if (send > 0.5) {
        ctx.fillStyle = "#ffffff";
        ctx.font = F(800, 18);
        ctx.fillText("Send order", -150, 7);
        ctx.font = F(800, 16);
        ctx.textAlign = "right";
        ctx.fillText(formatSYP(ORDER_TOTAL), 158, 6);
        ctx.textAlign = "left";
      } else {
        const bump = 1 + Math.sin(clamp(s.countPop ?? 0) * Math.PI) * 0.35;
        ctx.save();
        ctx.translate(-146, 0);
        ctx.scale(bump, bump);
        ctx.fillStyle = C.orange;
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.font = F(800, 15);
        ctx.textAlign = "center";
        ctx.fillText(String(count), 0, 5.5);
        ctx.restore();
        ctx.textAlign = "left";
        ctx.fillStyle = "#ffffff";
        ctx.font = F(700, 16);
        ctx.fillText("View order", -120, 6);
        ctx.textAlign = "right";
        ctx.font = F(800, 16);
        const sub = ORDER_ITEMS.slice(0, count).reduce((a, b) => a + b.price, 0);
        ctx.fillText(formatSYP(sub), 158, 6);
        ctx.textAlign = "left";
      }
      ctx.restore();
    }
    if ((s.sent ?? 0) > 0) sentSheet(s.sent);
    roundRect(ctx, 130, 816, 130, 5, 2.5, "rgba(17,24,32,0.35)");
  }

  function sentSheet(p) {
    const a = ease.snap(clamp(p));
    ctx.fillStyle = `rgba(10,14,22,${0.35 * a})`;
    ctx.fillRect(0, 0, PW, PH);
    const y = lerp(PH, 300, a);
    roundRect(ctx, 0, y, PW, PH - y + 40, 30, "#ffffff");
    const c = ease.outBack(clamp(p * 1.4 - 0.2));
    ctx.save();
    ctx.translate(195, y + 90);
    ctx.scale(c, c);
    ctx.fillStyle = C.mint;
    ctx.beginPath();
    ctx.arc(0, 0, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 9;
    ctx.lineCap = ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(-18, 1);
    ctx.lineTo(-5, 14);
    ctx.lineTo(19, -12);
    ctx.stroke();
    ctx.restore();
    ctx.textAlign = "center";
    ctx.fillStyle = INK;
    ctx.font = F(800, 27);
    ctx.fillText("Order sent!", 195, y + 186);
    ctx.fillStyle = MUTED;
    ctx.font = F(500, 15);
    ctx.fillText("The kitchen is preparing your food.", 195, y + 214);
    roundRect(ctx, 195 - 108, y + 238, 216, 38, 19, "#eef3ff");
    ctx.fillStyle = C.blueDeep;
    ctx.font = F(800, 14);
    ctx.fillText(`Order #${ORDER_NO}  ·  ${TABLE.name}`, 195, y + 262);
    ctx.textAlign = "left";
  }

  function draw(state) {
    const key = JSON.stringify(state);
    if (key === last) return;
    last = key;
    ctx.save();
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.textBaseline = "alphabetic";
    if (state.mode === "scan") {
      scanScreen(state);
      // After a successful scan the menu opens as a circle growing from the code.
      if ((state.menuT ?? 0) > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(195, 407, ease.inOutCubic(state.menuT) * 900, 0, Math.PI * 2);
        ctx.clip();
        menuScreen({ count: 0 });
        ctx.restore();
      }
    } else menuScreen(state);
    ctx.restore();
    tex.needsUpdate = true;
  }
  return { tex, draw, aspect: PW / PH };
}

// --- Kitchen tablet ------------------------------------------------------------
export function createTabletScreen({ wordmark }) {
  const TW = 1024;
  const TH = 700;
  const { ctx, tex } = canvasTex(TW, TH);
  let last = "";
  function card(x, y, w, h, { no, table, items, ago, accent = null, glow = 0, accepted = 0 }) {
    ctx.save();
    if (glow > 0) {
      ctx.shadowColor = `rgba(255,122,18,${0.55 * glow})`;
      ctx.shadowBlur = 34;
    } else {
      ctx.shadowColor = "rgba(40,30,20,0.10)";
      ctx.shadowBlur = 14;
      ctx.shadowOffsetY = 4;
    }
    roundRect(ctx, x, y, w, h, 18, "#ffffff");
    ctx.restore();
    if (accent) {
      ctx.lineWidth = 3;
      ctx.strokeStyle = accent;
      roundRect(ctx, x, y, w, h, 18);
      ctx.stroke();
    }
    ctx.fillStyle = INK;
    ctx.font = F(800, 30);
    ctx.fillText(`#${no}`, x + 20, y + 44);
    ctx.font = F(700, 17);
    ctx.fillStyle = C.blueDeep;
    ctx.fillText(table, x + 20 + ctx.measureText(`#${no}`).width + 46, y + 42);
    ctx.fillStyle = MUTED;
    ctx.font = F(500, 15);
    ctx.textAlign = "right";
    ctx.fillText(ago, x + w - 18, y + 41);
    ctx.textAlign = "left";
    items.forEach((t, i) => {
      ctx.fillStyle = INK;
      ctx.font = F(700, 16);
      ctx.fillText("1×", x + 20, y + 80 + i * 28);
      ctx.font = F(500, 16);
      ctx.fillText(t, x + 50, y + 80 + i * 28);
    });
    if (accent) {
      const by = y + h - 58;
      const done = accepted > 0.5;
      roundRect(ctx, x + 18, by, w - 36, 42, 14, done ? C.mint : C.blue);
      ctx.fillStyle = "#ffffff";
      ctx.font = F(800, 17);
      ctx.textAlign = "center";
      ctx.fillText(done ? "Accepted ✓  ·  Preparing" : "Accept order", x + w / 2, by + 27);
      ctx.textAlign = "left";
    }
  }
  function draw(s) {
    const key = JSON.stringify(s);
    if (key === last) return;
    last = key;
    ctx.save();
    ctx.fillStyle = "#f5f1ea";
    ctx.fillRect(0, 0, TW, TH);
    // Sidebar
    ctx.fillStyle = "#0b1a44";
    ctx.fillRect(0, 0, 190, TH);
    ctx.save();
    roundRect(ctx, 18, 22, 154, 44, 12, "#ffffff");
    drawLogo(ctx, 26, 30, 28, wordmark);
    ctx.restore();
    ["Live orders", "Menu", "Tables", "Reports"].forEach((t, i) => {
      if (i === 0) roundRect(ctx, 14, 92 + i * 52, 162, 40, 12, "rgba(255,255,255,0.12)");
      ctx.fillStyle = i === 0 ? "#ffffff" : "rgba(255,255,255,0.6)";
      ctx.font = F(700, 16);
      ctx.fillText(t, 32, 118 + i * 52);
    });
    // Header
    ctx.fillStyle = INK;
    ctx.font = F(800, 30);
    ctx.fillText("Live orders", 220, 58);
    roundRect(ctx, 400, 34, 78, 30, 15, "#e3f6ec");
    ctx.fillStyle = C.mint;
    ctx.beginPath();
    ctx.arc(418, 49, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = F(800, 14);
    ctx.fillText("LIVE", 430, 54);
    ctx.fillStyle = MUTED;
    ctx.font = F(600, 16);
    ctx.textAlign = "right";
    ctx.fillText(`${RESTAURANT.name}  ·  8:42 PM`, TW - 28, 56);
    ctx.textAlign = "left";
    const cols = ["New", "Preparing", "Ready"];
    cols.forEach((t, i) => {
      ctx.fillStyle = MUTED;
      ctx.font = F(800, 14);
      ctx.fillText(t.toUpperCase(), 220 + i * 266, 100);
    });
    card(220 + 266, 116, 250, 170, { no: "22", table: "Table 07", items: ["Shish Tawook", "Fattoush"], ago: "4 min" });
    card(220 + 532, 116, 250, 142, { no: "21", table: "Table 02", items: ["Mutabbal"], ago: "9 min" });
    card(220 + 266, 300, 250, 142, { no: "23", table: "Table 11", items: ["Kunafa"], ago: "2 min" });
    const p = ease.snap(clamp(s.incoming ?? 0));
    if (p > 0) {
      ctx.save();
      ctx.globalAlpha = clamp(p * 2);
      ctx.translate(0, (1 - p) * -60);
      card(220, 116, 250, 300, {
        no: ORDER_NO,
        table: TABLE.name,
        items: ORDER_ITEMS.map((i) => i.name),
        ago: "just now",
        accent: C.orange,
        glow: s.glow ?? 0,
        accepted: s.accepted ?? 0,
      });
      ctx.restore();
      if ((s.badge ?? 0) > 0) {
        const b = ease.outBack(clamp(s.badge));
        ctx.save();
        ctx.translate(456, 118);
        ctx.scale(b, b);
        roundRect(ctx, -34, -15, 68, 30, 15, C.orange);
        ctx.fillStyle = "#ffffff";
        ctx.font = F(800, 14);
        ctx.textAlign = "center";
        ctx.fillText("NEW", 0, 5);
        ctx.restore();
      }
    }
    ctx.restore();
    tex.needsUpdate = true;
  }
  return { tex, draw };
}

// --- Paper ticket & stand header ----------------------------------------------
export function ticketTexture() {
  const { ctx, tex } = canvasTex(300, 470);
  ctx.fillStyle = "#fffdf7";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(300, 0);
  ctx.lineTo(300, 452);
  for (let x = 300; x >= 0; x -= 20) ctx.lineTo(x - 10, x % 40 === 0 ? 470 : 452);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.textAlign = "center";
  ctx.font = F(800, 22);
  ctx.fillText(RESTAURANT.name.toUpperCase(), 150, 52);
  ctx.font = F(700, 17);
  ctx.fillStyle = C.blueDeep;
  ctx.fillText(`ORDER #${ORDER_NO}  ·  ${TABLE.name.toUpperCase()}`, 150, 84);
  ctx.strokeStyle = "rgba(17,24,32,0.35)";
  ctx.setLineDash([6, 6]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(20, 104);
  ctx.lineTo(280, 104);
  ctx.stroke();
  ctx.textAlign = "left";
  ORDER_ITEMS.forEach((it, i) => {
    ctx.fillStyle = INK;
    ctx.font = F(700, 16);
    ctx.fillText(`1× ${it.name}`, 22, 140 + i * 40);
    ctx.fillStyle = MUTED;
    ctx.font = F(500, 13);
    ctx.fillText(formatSYP(it.price), 44, 158 + i * 40);
  });
  ctx.beginPath();
  ctx.moveTo(20, 312);
  ctx.lineTo(280, 312);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = INK;
  ctx.font = F(800, 18);
  ctx.fillText("TOTAL", 22, 346);
  ctx.textAlign = "right";
  ctx.fillText(formatSYP(ORDER_TOTAL), 278, 346);
  ctx.textAlign = "center";
  drawMark(ctx, 150, 398, 46);
  return tex;
}

export function standHeaderTexture(wordmark) {
  const { ctx, tex } = canvasTex(740, 300);
  ctx.fillStyle = "#fffcf6";
  ctx.fillRect(0, 0, 740, 300);
  drawLogo(ctx, 40, 40, 74, wordmark);
  ctx.fillStyle = INK;
  ctx.font = F(800, 64);
  ctx.fillText("Scan to order", 40, 196);
  ctx.fillStyle = C.blueDeep;
  ctx.font = F(700, 34);
  ctx.fillText(`${RESTAURANT.name}  ·  ${TABLE.name}`, 42, 254);
  return tex;
}
