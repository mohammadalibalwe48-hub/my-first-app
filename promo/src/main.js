// Film entry point: builds every world once, then renders any frame on demand.
import * as THREE from "three";
import { createStage } from "./lib/stage.js";
import { loadFonts } from "./lib/fonts.js";
import { createHud } from "./lib/hud.js";
import { shadows } from "./lib/materials.js";
import { createPhoneScreen, createTabletScreen, standHeaderTexture } from "./world/ui.js";
import { DISHES } from "./world/food.js";
import { buildDining } from "./scenes/dining.js";
import { buildHero } from "./scenes/hero.js";
import { buildKitchen } from "./scenes/kitchen.js";
import { buildEnd } from "./scenes/endcard.js";
import { script } from "./scenes/script.js";

const q = new URLSearchParams(location.search);
const scale = Number(q.get("scale") || 1);
const stage = createStage({ scale });
await loadFonts();
const assets = await (await fetch("./generated/assets.json")).json();
const hud = createHud(stage);

/** Render each dish once into a small canvas for the in-app menu thumbnails. */
function snapshotDishes() {
  const { renderer } = stage;
  const size = 256;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#f3ebdf");
  scene.environment = stage.scene.environment;
  scene.environmentIntensity = 0.6;
  const key = new THREE.DirectionalLight("#fff3e2", 2.6);
  key.position.set(-2, 4, 3);
  scene.add(key, new THREE.HemisphereLight("#ffffff", "#e8d6bf", 0.9));
  const cam = new THREE.PerspectiveCamera(30, 1, 0.01, 20);
  const out = {};
  for (const id of Object.keys(DISHES)) {
    const obj = DISHES[id]();
    scene.add(obj);
    const sph = new THREE.Box3().setFromObject(obj).getBoundingSphere(new THREE.Sphere());
    const d = (sph.radius / Math.sin(THREE.MathUtils.degToRad(15))) * 0.82;
    cam.position.set(sph.center.x, sph.center.y + d * Math.sin(0.95), sph.center.z + d * Math.cos(0.95));
    cam.lookAt(sph.center);
    renderer.setRenderTarget(null);
    renderer.setScissorTest(true);
    renderer.setViewport(0, 0, size, size);
    renderer.setScissor(0, 0, size, size);
    renderer.render(scene, cam);
    const c = document.createElement("canvas");
    c.width = c.height = size;
    c.getContext("2d").drawImage(renderer.domElement, 0, renderer.domElement.height - size, size, size, 0, 0, size, size);
    out[id] = c;
    scene.remove(obj);
  }
  renderer.setScissorTest(false);
  renderer.setViewport(0, 0, stage.W, stage.H);
  return out;
}

const thumbs = snapshotDishes();
const phoneScreen = createPhoneScreen({ qrRows: assets.qr.rows, thumbs });
const tabletScreen = createTabletScreen({ wordmark: assets.wordmark });
const ctx = { stage, hud, assets, wordmark: assets.wordmark, phoneScreen, tabletScreen, standHeaderTex: standHeaderTexture(assets.wordmark) };

const dining = buildDining(ctx);
const scenes = [
  dining,
  buildHero(ctx),
  buildKitchen(ctx),
  buildEnd(ctx, { END_BG: dining.END_BG, S_D: dining.S_D, markDistance: 1.6 }),
];
for (const s of scenes) {
  shadows(s.world, true, true);
  s.world.traverse((o) => {
    if (!o.isMesh) return;
    const m = o.material;
    // Unlit surfaces (screens, glows, backdrops, wipes) neither cast nor receive.
    if (o.userData.noShadow || m?.isMeshBasicMaterial || m?.isShadowMaterial) {
      o.castShadow = false;
      o.receiveShadow = !!m?.isShadowMaterial;
    }
  });
  s.world.visible = false;
  stage.scene.add(s.world);
}

const bg = new THREE.Color();
function draw(t, grainFrame) {
  hud.begin();
  let env = null;
  for (const s of scenes) {
    const r = s.update(t);
    if (r) env = r;
  }
  if (env) {
    stage.scene.background = bg.set(env.bg);
    stage.shadowFloor.visible = env.floor;
    stage.fitShadow(env.shadow[0], env.shadow[1], env.shadow[2]);
    const L = env.light ?? {};
    stage.lights.key.intensity = L.key ?? 2.6;
    stage.lights.fill.intensity = L.fill ?? 0.9;
    stage.scene.environmentIntensity = L.env ?? 0.55;
  }
  script(hud, t, ctx);
  hud.end();
  stage.render(grainFrame);
}

// Motion blur: average sub-frames across a 180-degree shutter (more samples in
// whip-pans and pushes). Sub-frames never straddle a cut, so cuts stay crisp.
const SHUTTER = 0.5;
const FAST = [
  [96, 152],
  [238, 300],
  [436, 500],
  [584, 618],
  [686, 728],
];
const CUTS = [165, 270, 480, 600, 720];
// The dive into the phone, the ticket pass-through and the whip-pan move so far per
// frame that fewer samples show as stepped copies.
const WHIP = [
  [262, 276],
  [472, 486],
  [588, 612],
];
const within = (f, list) => list.some(([a, b]) => f >= a && f <= b);
const samplesFor = (f) => (q.get("mb") === "0" ? 1 : within(f, WHIP) ? 16 : within(f, FAST) ? 5 : 3);
const accum = document.createElement("canvas");
accum.width = stage.W;
accum.height = stage.H;
Object.assign(accum.style, { position: "absolute", left: "0", top: "0", zIndex: "2" });
document.body.appendChild(accum);
const actx = accum.getContext("2d");

window.__promo = {
  ready: true,
  info: () => ({ gl: stage.renderer.getContext().getParameter(stage.renderer.getContext().VERSION) }),
  renderFrame(f) {
    const n = samplesFor(f);
    for (let i = 0; i < n; i++) {
      let t = n === 1 ? f : f + ((i + 0.5) / n - 0.5) * SHUTTER;
      for (const c of CUTS) {
        if (f >= c && t < c) t = c;
        if (f < c && t >= c) t = c - 0.001;
      }
      draw(Math.max(0, Math.min(899, t)), f);
      actx.globalAlpha = 1 / (i + 1);
      actx.drawImage(stage.renderer.domElement, 0, 0);
    }
  },
};
