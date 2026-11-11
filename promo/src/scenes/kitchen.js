// S4: the order lands in the kitchen. Ticket clips onto the rail, the tablet
// pings, the chef accepts, flips the kibbeh and slides a plate out of frame.
import * as THREE from "three";
import { C, toy } from "../lib/materials.js";
import { ease, spring, drift, lerp, clamp, invLerp, hop, smoothstep } from "../lib/anim.js";
import { V3, lathe, lumpify } from "../lib/shapes.js";
import { Steam, Burst } from "../lib/fx.js";
import { createCharacter } from "../world/characters.js";
import { kitchenSet, tablet } from "../world/props.js";
import { DISHES } from "../world/food.js";
import { ticketTexture } from "../world/ui.js";
import { setCam, aim, blinkAt, impact } from "./common.js";

export const K = { start: 480, land: 493, ding: 495, tap: 526, flip: 540, catch: 557, plate: 566, push: 578, whip: 588, cut: 600 };
const COUNTER = 0.98;

export function buildKitchen(ctx) {
  const world = new THREE.Group();
  const set = kitchenSet();
  world.add(set.group);

  const chef = createCharacter("chef");
  chef.root.position.set(0.05, 0.62, -0.32);
  world.add(chef.root);

  const tab = tablet(ctx.tabletScreen.tex);
  tab.group.position.set(-0.78, COUNTER, 0.28);
  tab.group.rotation.y = 0.3;
  tab.group.scale.setScalar(1.15);
  world.add(tab.group);
  const ping = new Burst(world, { count: 14, seed: 81, colors: ["#ffffff", C.orange, C.yellow], size: 0.07, speed: 0.45, life: 18, up: 1, spread: 1 });

  // Pan contents: three kibbeh that get flipped.
  const base = lathe(
    [
      [0, -0.07],
      [0.02, -0.062],
      [0.034, -0.04],
      [0.04, 0],
      [0.034, 0.04],
      [0.02, 0.062],
      [0, 0.07],
    ],
    { segments: 28, smooth: 28 },
  );
  const crust = toy("#a9561f", { roughness: 0.58, clearcoat: 0.25 });
  const pieces = [0, 1, 2].map((i) => {
    const m = new THREE.Mesh(lumpify(base.clone(), 0.003, 70, i + 5), crust);
    set.pan.add(m);
    return m;
  });
  set.pan.rotation.y = Math.PI;
  set.pan.position.set(0.72, 1.1, 0.12);
  const steam = new Steam(world, V3(0.72, 1.2, 0.12), { seed: 9, size: 0.14, rise: 0.55, count: 10, opacity: 0.38 });
  const sizzle = new Burst(world, { count: 12, seed: 83, colors: [C.yellow, C.orange, "#ffffff"], size: 0.05, speed: 0.4, life: 16, up: 1.4, spread: 0.6 });

  // Plate the chef sends out.
  const out = DISHES.kibbeh();
  out.scale.setScalar(1.35);
  world.add(out);

  // Ticket flying in from camera and clipping onto the rail.
  const tGeo = new THREE.PlaneGeometry(0.3, 0.47, 8, 12);
  const ticket = new THREE.Mesh(tGeo, new THREE.MeshStandardMaterial({ map: ticketTexture(), roughness: 0.75, side: THREE.DoubleSide, transparent: true, alphaTest: 0.5 }));
  world.add(ticket);
  const clip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.03), toy(C.orange, { roughness: 0.4, clearcoat: 0.6 }));
  clip.position.set(-0.45, set.railY - 0.01, -1.0);
  world.add(clip);

  const camPos = V3(-0.1, 1.66, 3.05);
  const camTgt = V3(-0.06, 1.38, -0.4);

  function update(f) {
    world.visible = f >= K.start && f < K.cut;
    if (!world.visible) return null;

    // Ticket path.
    const tt = ease.outCubic(invLerp(K.start, K.land, f));
    const from = camPos.clone().add(V3(0.05, -0.1, -0.5));
    const to = V3(-0.45, set.railY - 0.25, -0.98);
    ticket.position.copy(from).lerp(to, tt);
    ticket.position.y += Math.sin(tt * Math.PI) * 0.25;
    const swing = f >= K.land ? impact(f - K.land, 1.4, 4) * 0.25 : 0;
    ticket.rotation.set(lerp(-0.9, 0, tt), lerp(0.8, 0, tt), lerp(1.2, 0, tt) + swing);
    ticket.scale.setScalar(1);

    // Tablet: the new order slides in with a glow, then gets accepted.
    ctx.tabletScreen.draw({
      incoming: clamp(invLerp(K.ding, K.ding + 10, f)),
      glow: Math.max(0, Math.sin(clamp(invLerp(K.ding, K.ding + 30, f)) * Math.PI)),
      badge: clamp(invLerp(K.ding + 4, K.ding + 12, f)),
      accepted: f >= K.tap + 2 ? 1 : 0,
    });
    tab.group.updateMatrixWorld(true);
    const screenPt = V3(0, 0.0, 0.03).applyMatrix4(tab.device.matrixWorld);
    ping.update(f, K.ding, screenPt);

    // Chef performance. Pan moves first so the hand can grip it this frame.
    const ft = invLerp(K.flip, K.catch, f);
    set.pan.position.y = 1.1 + Math.exp(-Math.pow((f - K.flip) / 3, 2)) * 0.06;
    set.pan.rotation.z = Math.exp(-Math.pow((f - K.flip) / 3, 2)) * 0.25 - (f >= K.catch ? impact(f - K.catch, 3, 10) * 0.05 : 0);
    world.updateMatrixWorld(true);
    const surprise = Math.exp(-Math.pow((f - (K.ding + 6)) / 7, 2));
    const toTablet = clamp(invLerp(K.ding + 1, K.ding + 8, f)) * (1 - clamp(invLerp(K.tap + 6, K.tap + 14, f)));
    const reach = ease.inOutCubic(clamp(invLerp(K.tap - 12, K.tap - 2, f))) * (1 - ease.inOutCubic(clamp(invLerp(K.tap + 4, K.tap + 14, f))));
    const flip = f >= K.flip && f < K.catch + 10;
    const proud = clamp(invLerp(K.plate - 4, K.plate + 4, f));
    const target = set.pan.position.clone().lerp(screenPt, smoothstep(0, 1, toTablet)).lerp(ctx.stage.camera.position, smoothstep(0, 1, proud));
    const a = aim(chef, target);
    const flipUp = Math.exp(-Math.pow((f - K.flip - 2) / 3, 2));
    const base = {
      squash: Math.sin((f / 30) * Math.PI * 0.7) * 0.012 - flipUp * 0.06 + surprise * 0.05,
      y: flipUp * 0.03,
      tilt: reach * 0.12,
      headYaw: a.yaw * 0.75,
      headPitch: a.pitch * 0.5,
      lookX: clamp(a.yaw * 1.3, -1, 1),
      lookY: clamp(-a.pitch * 1.2, -1, 1),
      blink: blinkAt(f, 4),
      wide: surprise,
      brow: surprise * 1.1 + proud * 0.4,
      browTilt: -surprise * 0.2,
      open: surprise * 0.7 + proud * 0.6,
      pointL: reach,
      bendL: [-0.18, -0.08, 0.05],
      bendR: [0.15, -0.1, 0.05],
    };
    chef.pose(base);
    chef.root.updateMatrixWorld(true);
    const handR = chef.body.worldToLocal(set.pan.localToWorld(V3(-0.34, 0.06, 0)));
    const tapPt = chef.body.worldToLocal(V3(-0.12, -0.02, 0.03).applyMatrix4(tab.device.matrixWorld));
    const handL = V3(-0.34, 0.38, 0.45).lerp(tapPt, reach);
    handL.z -= Math.exp(-Math.pow((f - K.tap) / 2, 2)) * 0.04;
    if (proud > 0) handL.lerp(V3(-0.5, 0.62, 0.35), proud * (1 - clamp(invLerp(K.whip, K.cut, f))));
    chef.pose({ ...base, handR: handR.toArray(), handL: handL.toArray() });

    // Pan flip: kibbeh arc up, spin, land.
    pieces.forEach((m, i) => {
      const h = flip ? hop(clamp(ft + i * 0.04 - 0.04)) * (0.42 + i * 0.05) : 0;
      m.position.set(-0.06 + i * 0.06, 0.045 + h, (i - 1) * 0.04);
      m.rotation.set(0, i * 0.7, Math.PI / 2 + (flip ? clamp(ft) * Math.PI * 2 * (i % 2 ? 1 : -1) : 0));
    });
    set.flame.scale.setScalar(1 + Math.exp(-Math.pow((f - K.flip) / 5, 2)) * 0.25 + Math.sin(f * 0.8) * 0.02);
    steam.update(f, 0.7 + Math.exp(-Math.pow((f - K.catch) / 8, 2)) * 0.6);
    sizzle.update(f, K.catch, set.pan.position.clone().add(V3(0, 0.08, 0)));

    // Plate appears, then slides out to the right.
    const pin = spring(f - K.plate, 2.4, 0.45);
    const slide = ease.inCubic(invLerp(K.push, K.cut, f));
    out.visible = f >= K.plate;
    out.position.set(-0.05 + slide * 3.2, COUNTER + 0.03, 0.52);
    out.scale.setScalar(Math.max(0.001, 1.35 * pin));
    out.rotation.y = slide * -0.6;

    // Camera: slow push, then a whip-pan right into the dining room.
    const cam = ctx.stage.camera;
    const push = ease.inOutSine(invLerp(K.start, K.whip, f));
    setCam(cam, camPos.clone().lerp(V3(-0.05, 1.6, 2.78), push), camTgt, { fov: 30 });
    cam.rotateY(-ease.inCubic(invLerp(K.whip, K.cut, f)) * 0.7);
    cam.rotateX(drift(f, 0.03, 21) * 0.004);
    return { bg: "#efe0c9", shadow: [V3(0, 1, -0.2), 2.6], floor: true };
  }

  return { world, update };
}
