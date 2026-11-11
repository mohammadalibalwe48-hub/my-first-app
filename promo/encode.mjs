// Encode rendered frames + soundtrack into the deliverable MP4.
//   node encode.mjs        ->  out/qr-syria-promo-30s.mp4      (CRF 16 master)
//   node encode.mjs --web  ->  out/qr-syria-promo-30s-web.mp4  (two-pass 6 Mbps)
// Video: H.264 High, BT.709 tagged, CRF 16. Audio: AAC 256k, loudness-normalised
// to -14 LUFS / -1 dBTP (two-pass loudnorm) so it plays at web/social levels.
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const frames = path.join(ROOT, "out/frames/f%04d.png");
const wav = path.join(ROOT, "out/audio/soundtrack.wav");
// --web: two-pass 6 Mbps for embedding on the site (~23 MB) instead of the CRF 16 master.
const web = process.argv.includes("--web");
const out = path.join(ROOT, web ? "out/qr-syria-promo-30s-web.mp4" : "out/qr-syria-promo-30s.mp4");

const missing = [];
for (let f = 0; f < 900; f++) if (!fs.existsSync(path.join(ROOT, `out/frames/f${String(f).padStart(4, "0")}.png`))) missing.push(f);
if (missing.length) {
  console.error(`missing ${missing.length} frames, e.g. ${missing.slice(0, 10).join(",")}`);
  process.exit(1);
}

const ff = (args) => execFileSync("ffmpeg", ["-hide_banner", "-y", ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

// Pass 1: measure loudness (loudnorm prints its JSON report on stderr).
const { stderr } = spawnSync("ffmpeg", ["-hide_banner", "-i", wav, "-af", "loudnorm=I=-14:TP=-1:LRA=11:print_format=json", "-f", "null", "-"], { encoding: "utf8" });
const json = JSON.parse(stderr.slice(stderr.lastIndexOf("{"), stderr.lastIndexOf("}") + 1));
const ln = `loudnorm=I=-14:TP=-1:LRA=11:measured_I=${json.input_i}:measured_TP=${json.input_tp}:measured_LRA=${json.input_lra}:measured_thresh=${json.input_thresh}:offset=${json.target_offset}:linear=true`;

const color = ["-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709", "-color_range", "tv"];
const vf = ["-vf", "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p"];
const rate = web
  ? ["-c:v", "libx264", "-preset", "slow", "-b:v", "6M", "-maxrate", "8M", "-bufsize", "12M", "-profile:v", "high", "-level", "4.1"]
  : ["-c:v", "libx264", "-preset", "slow", "-crf", "16", "-tune", "film", "-profile:v", "high", "-level", "4.1"];
const passlog = path.join(ROOT, "out/x264-pass");
if (web) ff(["-framerate", "30", "-i", frames, ...vf, ...rate, ...color, "-pass", "1", "-passlogfile", passlog, "-an", "-f", "null", "-"]);
ff([
  "-framerate", "30",
  "-i", frames,
  "-i", wav,
  "-map", "0:v", "-map", "1:a",
  ...vf,
  ...rate,
  ...(web ? ["-pass", "2", "-passlogfile", passlog] : []),
  ...color,
  "-af", `${ln},aresample=48000`,
  "-c:a", "aac", "-b:a", web ? "192k" : "256k", "-ar", "48000",
  "-t", "30",
  "-movflags", "+faststart",
  out,
]);
console.log(`wrote ${path.relative(ROOT, out)} (${(fs.statSync(out).size / 1e6).toFixed(1)} MB)`);
