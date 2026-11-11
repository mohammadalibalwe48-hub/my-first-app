// Deterministic frame renderer: serves ./ over HTTP, drives headless Chrome
// (software WebGL via SwiftShader) one frame at a time, and writes PNG frames.
//
//   node render.mjs --still 0,120,450          -> out/stills/f0000.png ...
//   node render.mjs --from 0 --to 899          -> out/frames/f0000.png ...
//   node render.mjs --scale 0.5 ...            -> half resolution preview
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";
import { prebuild } from "./scripts/prebuild.mjs";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
prebuild();
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const has = (name) => args.includes(`--${name}`);

const WIDTH = 1920;
const HEIGHT = 1080;
const scale = Number(arg("scale", "1"));
const page_ = arg("page", "src/index.html");
const outDir = path.join(ROOT, arg("out", has("still") ? "out/stills" : "out/frames"));
const query = arg("query", "");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
};

function serve() {
  const server = http.createServer((req, res) => {
    const url = decodeURIComponent(new URL(req.url, "http://x").pathname);
    const file = path.normalize(path.join(ROOT, url));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] ?? "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

function frameList() {
  if (has("still")) return arg("still", "0").split(",").map(Number);
  const from = Number(arg("from", "0"));
  const to = Number(arg("to", "899"));
  const step = Number(arg("step", "1"));
  const list = [];
  for (let f = from; f <= to; f += step) list.push(f);
  // --missing: resume an interrupted render by skipping frames already on disk.
  if (has("missing")) return list.filter((f) => !fs.existsSync(path.join(outDir, `f${String(f).padStart(4, "0")}.png`)));
  return list;
}

// Mesa lavapipe (installed by scripts/setup-lavapipe.sh) is ~3-4x faster than
// Chrome's bundled SwiftShader on CPU-only machines; fall back to SwiftShader.
const lvpIcd = path.join(ROOT, ".cache/mesa/lvp_icd.json");
const backend = process.env.GL_BACKEND ?? (fs.existsSync(lvpIcd) ? "lavapipe" : "swiftshader");
if (backend === "lavapipe" && !process.env.VK_DRIVER_FILES) {
  process.env.VK_DRIVER_FILES = lvpIcd;
  process.env.VK_ICD_FILENAMES = lvpIcd;
}
const glArgs =
  backend === "lavapipe"
    ? ["--use-angle=vulkan", "--use-vulkan=native", "--enable-features=Vulkan", "--disable-vulkan-surface"]
    : ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"];

const server = await serve();
const { port } = server.address();
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME ?? "/usr/local/bin/google-chrome",
  headless: true,
  env: process.env,
  args: [
    "--no-sandbox",
    ...glArgs,
    "--ignore-gpu-blocklist",
    "--enable-webgl",
    "--hide-scrollbars",
    "--font-render-hinting=none",
    "--disable-lcd-text",
    "--force-color-profile=srgb",
    `--window-size=${Math.round(WIDTH * scale)},${Math.round(HEIGHT * scale)}`,
  ],
});

try {
  const page = await browser.newPage();
  page.on("console", (msg) => console.log(`[page] ${msg.text()}`));
  page.on("pageerror", (err) => console.error(`[page error] ${err.message}`));
  await page.setViewport({ width: Math.round(WIDTH * scale), height: Math.round(HEIGHT * scale), deviceScaleFactor: 1 });
  await page.goto(`http://127.0.0.1:${port}/${page_}?scale=${scale}${query ? `&${query}` : ""}`, { waitUntil: "load" });
  await page.waitForFunction("window.__promo && window.__promo.ready === true", { timeout: 180000, polling: 200 });
  const info = await page.evaluate(() => window.__promo.info?.());
  if (info) console.log("renderer:", JSON.stringify(info));

  fs.mkdirSync(outDir, { recursive: true });
  const cdp = await page.createCDPSession();
  const frames = frameList();
  const t0 = Date.now();
  for (const [i, f] of frames.entries()) {
    const a = Date.now();
    await page.evaluate((frame) => window.__promo.renderFrame(frame), f);
    const b = Date.now();
    const { data } = await cdp.send("Page.captureScreenshot", { format: "png", optimizeForSpeed: true });
    fs.writeFileSync(path.join(outDir, `f${String(f).padStart(4, "0")}.png`), Buffer.from(data, "base64"));
    const c = Date.now();
    if (i % 10 === 0 || frames.length < 30) {
      const eta = ((Date.now() - t0) / (i + 1)) * (frames.length - i - 1);
      console.log(`frame ${f}  render ${b - a}ms  capture ${c - b}ms  (${i + 1}/${frames.length}, eta ${Math.round(eta / 1000)}s)`);
    }
  }
  console.log(`done: ${frames.length} frames in ${Math.round((Date.now() - t0) / 1000)}s -> ${path.relative(ROOT, outDir)}`);
} finally {
  await browser.close();
  server.close();
}
