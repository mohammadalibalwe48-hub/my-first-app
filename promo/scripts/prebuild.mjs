// Generates data the browser cannot easily compute itself: the QR matrix for the
// site URL and the wordmark glyph outlines (Archivo Black stands in for the
// logo's Arial Black). Run automatically by render.mjs.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import QRCode from "qrcode";
import opentype from "opentype.js";
import { SITE_URL } from "../src/config.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function prebuild() {
  const outDir = path.join(ROOT, "src/generated");
  fs.mkdirSync(outDir, { recursive: true });

  const qr = QRCode.create(SITE_URL, { errorCorrectionLevel: "Q" });
  const n = qr.modules.size;
  const rows = [];
  for (let r = 0; r < n; r++) {
    let line = "";
    for (let c = 0; c < n; c++) line += qr.modules.get(r, c) ? "1" : "0";
    rows.push(line);
  }

  // "SYRI" laid out exactly like public/logo.svg: x=416, baseline 171, 150px,
  // letter-spacing -8, squeezed to textLength 342.
  const buf = fs.readFileSync(path.join(ROOT, "node_modules/@fontsource/archivo-black/files/archivo-black-latin-400-normal.woff"));
  const font = opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  const size = 150;
  const text = "SYRI";
  const glyphs = font.stringToGlyphs(text);
  const scale = size / font.unitsPerEm;
  let x = 0;
  const placed = glyphs.map((g, i) => {
    const at = x;
    x += g.advanceWidth * scale + (i < glyphs.length - 1 ? -8 : 0);
    return { g, at };
  });
  const k = 342 / x;
  const capH = (font.tables.os2.sCapHeight || 0.716 * font.unitsPerEm) * scale;
  // Match Arial Black's cap height (0.716em) so the letters sit where the logo has them.
  const ky = (0.716 * size) / capH;
  const letters = placed.map(({ g, at }, i) => {
    const p = g.getPath(0, 0, size);
    p.commands.forEach((cmd) => {
      for (const [kx, kyy] of [["x", "y"], ["x1", "y1"], ["x2", "y2"]]) {
        if (cmd[kx] !== undefined) {
          cmd[kx] = 416 + (at + cmd[kx]) * k;
          cmd[kyy] = 171 + cmd[kyy] * ky;
        }
      }
    });
    return { ch: text[i], d: p.toPathData(2) };
  });

  const data = { url: SITE_URL, qr: { size: n, version: qr.version, rows }, wordmark: letters };
  fs.writeFileSync(path.join(outDir, "assets.json"), JSON.stringify(data));
  return data;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const d = prebuild();
  console.log(`QR v${d.qr.version} ${d.qr.size}x${d.qr.size} for ${d.url}; glyphs: ${d.wordmark.map((l) => l.ch).join("")}`);
}
