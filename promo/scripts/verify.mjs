// QA for the deliverable: container/stream facts, loudness, and a real decode of
// the end-card QR code from the compressed video (not from the source frames).
//   node scripts/verify.mjs [video]
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import jsQR from "jsqr";
import { PNG } from "pngjs";
import { SITE_URL } from "../src/config.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const video = process.argv[2] ?? path.join(ROOT, "out/qr-syria-promo-30s.mp4");

function decodeAt(file, t, isVideo = true) {
  const png = path.join(ROOT, `out/verify-${t}.png`);
  if (isVideo) execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-ss", String(t), "-i", file, "-frames:v", "1", png]);
  const img = PNG.sync.read(fs.readFileSync(isVideo ? png : file));
  const res = jsQR(new Uint8ClampedArray(img.data), img.width, img.height);
  return res?.data ?? null;
}

if (process.argv[2]?.endsWith(".png")) {
  const got = decodeAt(process.argv[2], "still", false);
  console.log(`QR in ${path.basename(process.argv[2])}: ${got ?? "NOT DECODED"} ${got === SITE_URL ? "(matches SITE_URL)" : ""}`);
  process.exit(got === SITE_URL ? 0 : 1);
}

const probe = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-count_frames", "-show_entries", "format=duration,size:stream=codec_name,width,height,r_frame_rate,nb_read_frames,sample_rate,channels,pix_fmt,color_space", "-of", "json", video], { encoding: "utf8" }));
console.log(JSON.stringify(probe, null, 1));
const loud = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", video, "-af", "ebur128=peak=true", "-f", "null", "-"], { encoding: "utf8" }).stderr;
console.log(loud.split("Summary:")[1]?.trim().replace(/\n\s*\n/g, "\n"));
let ok = true;
for (const t of [27.5, 29.5]) {
  const got = decodeAt(video, t);
  console.log(`QR at ${t}s: ${got ?? "NOT DECODED"}`);
  ok &&= got === SITE_URL;
}
console.log(ok ? `PASS: end-card QR decodes to ${SITE_URL}` : "FAIL: QR did not decode to SITE_URL");
process.exit(ok ? 0 : 1);
