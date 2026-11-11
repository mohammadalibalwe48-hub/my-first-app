// S6: the plate has become the QR SYRIA mark; the wordmark builds, then the
// tagline, address and a real, scannable QR code.
import * as THREE from "three";
import { C } from "../lib/materials.js";
import { ease, spring, drift, lerp, clamp, invLerp } from "../lib/anim.js";
import { V3 } from "../lib/shapes.js";
import { Burst } from "../lib/fx.js";
import { createLogo } from "../world/logo.js";
import { setCam, blendCam, impact } from "./common.js";

export const E = { hit: 720, move: [726, 772], letters: [736, 742, 748, 754, 760, 766], glint: 830 };
const S_E = 0.004;
// A near-frontal key keeps the drop shadow tight behind the letters.
const LIGHT_DIR = new THREE.Vector3(-2.2, 3.4, 9).normalize();

export function buildEnd(ctx, { END_BG, S_D, markDistance }) {
  const world = new THREE.Group();
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(80, 50), new THREE.MeshBasicMaterial({ color: END_BG }));
  bg.position.z = -0.4;
  bg.userData.noShadow = true;
  world.add(bg);
  const shade = new THREE.Mesh(new THREE.PlaneGeometry(80, 50), new THREE.ShadowMaterial({ color: "#6b4524", opacity: 0 }));
  shade.position.z = -0.19;
  shade.userData.receiveOnly = true;
  world.add(shade);

  const logo = createLogo(ctx.wordmark);
  logo.root.scale.setScalar(S_E);
  world.add(logo.root);
  const burst = new Burst(world, { count: 22, seed: 101, colors: ["#ffffff", C.yellow, C.orange, C.blueSoft], size: 0.11, speed: 1.0, life: 24, up: 1, spread: 1 });
  const glint = new THREE.PointLight("#ffffff", 0, 2.2, 2);
  world.add(glint);

  // Framing that matches the dining top-down at the cut (ring radius per distance).
  const d0 = (86 * S_E * markDistance) / (86 * S_D);
  const start = { pos: V3(0, 0, d0), target: V3(0, 0, 0) };
  // Final layout: logo occupies x 200..1080 px, centred at y = 420 px.
  const W = (851 + 95) * S_E;
  const visW = (W * 1920) / 880;
  const visH = (visW * 9) / 16;
  const d1 = visH / (2 * Math.tan((15 * Math.PI) / 180));
  const cx = ((851 - 95) / 2) * S_E + ((960 - 640) / 1920) * visW;
  const cy = -5.5 * S_E - (84 / 1080) * visH;
  const final = { pos: V3(cx, cy, d1), target: V3(cx, cy, 0) };

  function update(f) {
    world.visible = f >= E.hit;
    if (!world.visible) return null;
    const pop = impact(f - E.hit, 2.4, 6);
    logo.mark.scale.setScalar(1 + pop * 0.08);
    logo.mark.rotation.y = Math.sin((f - E.hit) * 0.05) * 0.05 * (1 - clamp(invLerp(E.hit, E.move[1], f)));
    burst.update(f, E.hit, V3(0, 0, 0.1));
    logo.letters.forEach((g, i) => {
      const s = spring(f - E.letters[i], 2.3, 0.42);
      g.visible = f >= E.letters[i];
      g.scale.set(1, Math.max(0.001, s), 1);
      g.position.z = (1 - clamp(s)) * 40;
    });
    shade.material.opacity = 0.16 * clamp(invLerp(E.hit, E.hit + 18, f));
    // Glint: a light skims across the logo face.
    const gt = invLerp(E.glint, E.glint + 26, f);
    glint.intensity = gt > 0 && gt < 1 ? Math.sin(gt * Math.PI) * 3 : 0;
    glint.position.set(lerp(-0.8, 4.0, gt), 0.25, 0.35);

    const cam = ctx.stage.camera;
    const t = ease.inOutCubic(invLerp(E.move[0], E.move[1], f));
    blendCam(cam, start, final, t);
    // Slow settle-in for the hold.
    const hold = invLerp(E.move[1], 900, f);
    cam.position.z -= hold * 0.25;
    cam.rotateZ(drift(f, 0.02, 31) * 0.0015);
    return { bg: END_BG, shadow: [V3(1.5, 0, 0), 2.4, LIGHT_DIR], floor: false, light: { key: 1.7, fill: 0.5, env: 0.4 } };
  }
  return { world, update, logo };
}
