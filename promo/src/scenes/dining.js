// Dining room at Sufra Damascus. Hosts shots S1 (QR builds itself), S2 (reveal +
// scan), S5 (food arrives) and the plate-to-logo transformation that opens S6.
import * as THREE from "three";
import { C, toy, metal } from "../lib/materials.js";
import { ease, track, spring, drift, lerp, clamp, invLerp, hash, smoothstep } from "../lib/anim.js";
import { V3, canvasTex, roundedRectGeometry } from "../lib/shapes.js";
import { Steam, Burst, Ripple } from "../lib/fx.js";
import { createCharacter } from "../world/characters.js";
import { table, chairBack, qrStand, phone, knife, arch, lantern, lemonTree } from "../world/props.js";
import { DISHES, plate } from "../world/food.js";
import { createLogo, RING_ARC } from "../world/logo.js";
import { qrDraw, drawLogo } from "../world/ui.js";
import { RESTAURANT, TABLE } from "../config.js";
import { aim, blinkAt, impact, setCam, blendCam, camQuat } from "./common.js";

export const TOP = 0.78;
export const END_BG = "#f3e8da";
const PHONE_SCALE = 0.55;
// Shot boundaries (frames)
export const D = {
  finders: [15, 30, 45],
  rain: [44, 90],
  shimmer: 92,
  standUp: 100,
  revealEnd: 150,
  phoneUp: 146,
  shotB: 165,
  found: 210,
  menuIn: 216,
  push: 240,
  cut: 270,
  serve: 600,
  lands: [615, 630, 645, 660],
  cheer: 662,
  crane: 688,
  forkMove: 700,
  hit: 720,
};

function backPrint(rows, wordmark) {
  const { ctx, tex } = canvasTex(740, 1000);
  ctx.fillStyle = "#fffcf6";
  ctx.fillRect(0, 0, 740, 1000);
  drawLogo(ctx, 50, 40, 70, wordmark);
  ctx.fillStyle = C.ink;
  ctx.font = '800 60px "DM Sans"';
  ctx.fillText("Scan to order", 50, 190);
  ctx.fillStyle = C.blueDeep;
  ctx.font = '700 32px "DM Sans"';
  ctx.fillText(`${RESTAURANT.name}  ·  ${TABLE.name}`, 52, 240);
  qrDraw(ctx, rows, 90, 330, 560, { dark: C.blueDeep, light: "#fffcf6", quiet: 1 });
  return tex;
}

export function buildDining(ctx) {
  const { assets, wordmark, phoneScreen, standHeaderTex } = ctx;
  const world = new THREE.Group();

  // --- Set ------------------------------------------------------------------
  const bgArch = arch();
  bgArch.position.set(0.25, 0, -2.7);
  world.add(bgArch);
  const tree = lemonTree(3);
  tree.position.set(1.9, 0, -1.8);
  world.add(tree);
  const tree2 = lemonTree(8);
  tree2.position.set(-2.3, 0, -2.0);
  tree2.scale.setScalar(0.9);
  world.add(tree2);
  const lamp = lantern();
  lamp.position.set(-1.15, 2.1, -1.2);
  world.add(lamp);
  const tbl = table();
  world.add(tbl);

  const karim = createCharacter("karim");
  karim.root.position.set(0.1, 0.5, -0.74);
  world.add(karim.root);
  const lina = createCharacter("lina");
  lina.root.position.set(-0.86, 0.5, -0.24);
  lina.root.rotation.y = 1.0;
  world.add(lina.root);
  const ch1 = chairBack();
  ch1.position.set(0.1, 0.6, -1.13);
  world.add(ch1);
  const ch2 = chairBack();
  ch2.position.set(-1.2, 0.6, -0.44);
  ch2.rotation.y = 1.0;
  world.add(ch2);

  // --- QR stand -----------------------------------------------------------------
  const stand = qrStand(assets.qr.rows, { header: standHeaderTex });
  const standHolder = new THREE.Group();
  standHolder.position.set(0, TOP, 0.34);
  standHolder.add(stand.group);
  world.add(standHolder);
  const back = new THREE.Mesh(roundedRectGeometry(stand.W - 0.04, stand.H - 0.04, 0.03), new THREE.MeshStandardMaterial({ map: backPrint(assets.qr.rows, wordmark), roughness: 0.5 }));
  back.rotation.y = Math.PI;
  back.position.set(0, stand.H / 2, -stand.T / 2 - 0.0012);
  stand.group.add(back);
  stand.foot.position.set(0, 0.02, -0.05);
  standHolder.add(stand.foot);
  const dummy = new THREE.Object3D();
  const instColor = new THREE.Color();
  const blueDeep = new THREE.Color(C.blueDeep);
  const glowCol = new THREE.Color("#7fb2ff");
  // Landing schedule: a diagonal wave across the code with a little jitter.
  const n = assets.qr.size;
  const order = stand.cells.map((c, i) => ({ i, k: (c.r + c.c) / (2 * n) + hash(i * 3.7) * 0.18 })).sort((a, b) => a.k - b.k);
  const landAt = new Float32Array(stand.cells.length);
  order.forEach((o, rank) => (landAt[o.i] = D.rain[0] + (D.rain[1] - D.rain[0]) * Math.pow(rank / order.length, 0.85)));

  // --- Phone in Karim's hand ------------------------------------------------------
  const ph = phone(phoneScreen.tex);
  ph.group.scale.setScalar(PHONE_SCALE);
  world.add(ph.group);

  // --- Place setting for "you" + dishes --------------------------------------------
  const myPlate = plate(0.2, { rim: C.blue });
  myPlate.position.set(0, TOP, 0.5);
  world.add(myPlate);
  const myKnife = knife();
  myKnife.position.set(0.31, TOP + 0.006, 0.5);
  world.add(myKnife);
  const karimPlate = plate(0.17, { rim: C.orange });
  karimPlate.position.set(0.12, TOP, -0.36);
  world.add(karimPlate);
  const linaPlate = plate(0.17, { rim: C.orange });
  linaPlate.position.set(-0.47, TOP, -0.12);
  world.add(linaPlate);

  const spots = {
    hummus: V3(-0.3, TOP, 0.1),
    kibbeh: V3(0.33, TOP, 0.08),
    coffee: V3(0.6, TOP, -0.3),
    juice: V3(-0.5, TOP, -0.36),
  };
  const dishes = ["hummus", "kibbeh", "coffee", "juice"].map((id, i) => {
    const d = DISHES[id]();
    d.scale.setScalar(1.25);
    world.add(d);
    const ripple = new Ripple(world, { color: "#ffffff", opacity: 0.7, size: 0.42 });
    ripple.mesh.rotation.x = -Math.PI / 2;
    ripple.mesh.position.copy(spots[id]).add(V3(0, 0.004, 0));
    const burst = new Burst(world, { count: 9, seed: 30 + i, colors: ["#ffffff", C.yellow, C.orange], size: 0.05, speed: 0.32, life: 18, up: 0.9 });
    return { id, d, land: D.lands[i], ripple, burst, from: spots[id].clone().add(V3(-1.5, 1.3, 0.5)) };
  });
  const steamH = new Steam(world, spots.hummus.clone().add(V3(0, 0.1, 0)), { seed: 3, size: 0.1, rise: 0.36 });
  const steamC = new Steam(world, spots.coffee.clone().add(V3(0, 0.12, 0)), { seed: 5, size: 0.08, rise: 0.3, count: 7 });

  // --- Finale: the logo mark lives on "your" plate ------------------------------------
  const logo = createLogo(wordmark, { markOnly: true });
  const S_D = (0.2 * 0.905) / 86; // plate rim radius -> logo ring radius
  const markHolder = new THREE.Group();
  markHolder.position.set(0, TOP + 0.041, 0.5);
  markHolder.rotation.x = -Math.PI / 2;
  markHolder.scale.setScalar(S_D);
  markHolder.add(logo.mark);
  world.add(markHolder);
  const steel = metal(C.steel, { roughness: 0.22 });
  const forkMeshes = [];
  logo.fork.traverse((o) => o.isMesh && forkMeshes.push({ o, m: o.material }));
  const sparkle = new Burst(world, { count: 16, seed: 77, colors: ["#ffffff", C.yellow, C.blueSoft], size: 0.06, speed: 0.4, life: 20, up: 1.2 });
  const wipe = new THREE.Mesh(new THREE.CircleGeometry(1, 96), new THREE.MeshBasicMaterial({ color: END_BG }));
  wipe.rotation.x = -Math.PI / 2;
  wipe.position.set(0, 0.935, 0.5);
  world.add(wipe);

  const tmp = V3();
  const camA = { pos: V3(0.32, 1.5, 2.85), target: V3(-0.06, 1.02, -0.2) };

  function phonePose(f) {
    // Held up in front of Karim's face, screen towards him (and a little towards camera B).
    const up = ease.snap(invLerp(D.phoneUp, D.phoneUp + 18, f));
    const hold = V3(0.4, 1.26, -0.1);
    const low = V3(0.36, 0.86, -0.4);
    ph.group.position.copy(low).lerp(hold, up);
    ph.group.position.x += drift(f, 0.05, 3) * 0.006;
    ph.group.position.y += drift(f, 0.05, 4) * 0.006 + Math.sin(clamp(invLerp(D.found, D.found + 10, f)) * Math.PI) * 0.02;
    ph.group.rotation.set(lerp(-1.3, 0.1, up), Math.PI + lerp(0.4, -0.25, up), lerp(0.3, 0.0, up));
    ph.group.visible = f >= D.phoneUp - 1 && f < D.serve;
  }

  function karimHandsOnPhone(p) {
    karim.pose(p);
    karim.root.updateMatrixWorld(true);
    ph.group.updateMatrixWorld(true);
    const grip = V3(-0.13, -0.3, -0.06).applyMatrix4(ph.group.matrixWorld);
    const g2 = karim.body.worldToLocal(grip.clone());
    karim.pose({ ...p, handR: g2.toArray(), bendR: [0.16, -0.12, -0.05] });
  }

  function update(f) {
    world.visible = f < D.cut || (f >= D.serve && f < D.hit);
    if (!world.visible) return null;
    const S5 = f >= D.serve;
    phonePose(f);
    // The table is bare until the food arrives.
    for (const o of [myPlate, myKnife, karimPlate, linaPlate, markHolder]) o.visible = S5;

    // ---- Stand: lies flat while the QR builds, then swings upright ----
    const standing = spring(f - D.standUp, 1.35, 0.42);
    stand.group.rotation.x = lerp(-Math.PI / 2, -0.2, standing);
    stand.foot.scale.setScalar(Math.max(0.001, ease.outBack(invLerp(D.standUp + 14, D.standUp + 24, f))));
    if (S5) {
      standHolder.position.set(0.5, TOP, -0.62);
      standHolder.rotation.y = -0.45;
      stand.group.rotation.x = -0.2;
      stand.foot.scale.setScalar(1);
    } else {
      standHolder.position.set(0, TOP, 0.34);
      standHolder.rotation.y = 0;
    }
    // Finder patterns drop on the first three beats.
    stand.finders.forEach((fg, i) => {
      const t = D.finders[i];
      const fall = ease.inQuad(invLerp(t - 11, t, f));
      const imp = f >= t ? impact(f - t) : 0;
      fg.visible = f >= t - 11;
      fg.position.z = stand.T / 2 + stand.mod * 0.45 + (1 - fall) * 0.42;
      fg.scale.set(1 + imp * 0.12, 1 + imp * 0.12, Math.max(0.3, 1 - imp * 0.45));
      fg.rotation.z = (1 - fall) * (i - 1) * 0.6;
    });
    // Data modules rain in as a wave, then a shimmer sweeps across.
    for (let i = 0; i < stand.cells.length; i++) {
      const c = stand.cells[i];
      const t = landAt[i];
      const fall = ease.inQuad(invLerp(t - 9, t, f));
      const imp = f >= t ? impact(f - t, 3.6, 9) : 0;
      const vis = f >= t - 9;
      dummy.position.set(c.x, c.y, stand.T / 2 + stand.mod * 0.45 + (1 - fall) * (0.22 + hash(i) * 0.12));
      dummy.rotation.set((1 - fall) * (hash(i + 7) - 0.5) * 3, (1 - fall) * (hash(i + 9) - 0.5) * 3, 0);
      const s = vis ? 1 : 0;
      dummy.scale.set(s * (1 + imp * 0.2), s * (1 + imp * 0.2), s * Math.max(0.3, 1 - imp * 0.5));
      dummy.updateMatrix();
      stand.inst.setMatrixAt(i, dummy.matrix);
      const wave = Math.exp(-Math.pow((f - D.shimmer - ((c.r + c.c) / (2 * n)) * 16) / 3.2, 2));
      instColor.copy(blueDeep).lerp(glowCol, wave * 0.9);
      stand.inst.setColorAt(i, instColor);
    }
    stand.inst.instanceMatrix.needsUpdate = true;
    if (stand.inst.instanceColor) stand.inst.instanceColor.needsUpdate = true;

    // ---- Dishes (S5): updated before the characters so their gaze tracks this frame ----
    for (const d of dishes) {
      d.d.visible = S5 && f >= d.land - 14;
      if (!d.d.visible) {
        d.d.position.copy(d.from);
        d.ripple.update(f, 1e9);
        d.burst.update(f, 1e9, d.from);
        continue;
      }
      const t = ease.inQuad(invLerp(d.land - 14, d.land, f));
      const to = spots[d.id];
      d.d.position.set(lerp(d.from.x, to.x, t), lerp(d.from.y, to.y, t) + Math.sin(t * Math.PI) * 0.35, lerp(d.from.z, to.z, t));
      const imp = f >= d.land ? impact(f - d.land, 3, 8) : 0;
      d.d.scale.set(1.25 * (1 + imp * 0.12), 1.25 * Math.max(0.5, 1 - imp * 0.25), 1.25 * (1 + imp * 0.12));
      d.d.rotation.y = (1 - t) * 2.2;
      d.d.rotation.z = (1 - t) * 0.5;
      d.ripple.update(f, d.land);
      d.burst.update(f, d.land, to.clone().add(V3(0, 0.08, 0)));
    }

    // ---- Characters ----
    // Karim and Lina spring up into their seats as the stand lands.
    const popK = S5 ? 1 : spring(f - 108, 1.8, 0.45);
    const popL = S5 ? 1 : spring(f - 116, 1.8, 0.45);
    karim.root.visible = popK > 0.001;
    lina.root.visible = popL > 0.001;
    karim.root.position.y = 0.5 - (1 - popK) * 0.8;
    lina.root.position.y = 0.5 - (1 - popL) * 0.8;
    const breathe = Math.sin((f / 30) * Math.PI * 2 * 0.35) * 0.012;
    if (!S5) {
      const standTop = V3(0, TOP + 0.35 * standing, 0.34 - 0.3 * (1 - standing));
      const toPhone = smoothstep(D.phoneUp - 4, D.phoneUp + 12, f);
      const k = aim(karim, standTop.clone().lerp(ph.group.position, toPhone));
      const surprise = Math.exp(-Math.pow((f - 124) / 8, 2));
      const joy = Math.exp(-Math.pow((f - (D.found + 6)) / 9, 2));
      const p = {
        squash: breathe - joy * 0.08 + surprise * 0.04,
        y: joy * 0.03,
        headYaw: k.yaw * 0.7,
        headPitch: k.pitch * 0.6 + 0.12 * toPhone,
        lookX: clamp(k.yaw * 1.4, -1, 1),
        lookY: clamp(-k.pitch * 1.2, -1, 1),
        blink: blinkAt(f, 1),
        wide: surprise * 0.9 + joy * 0.4,
        brow: surprise * 0.8 + joy * 0.4,
        open: surprise * 0.5 + joy * 0.6,
        lean: 0.12 * toPhone,
        handL: [-0.36, 0.2, 0.42],
      };
      if (f >= D.phoneUp - 1) karimHandsOnPhone(p);
      else karim.pose({ ...p, handR: [0.34, 0.2, 0.42] });
      // Lina: notices the stand, then waves at us.
      const l = aim(lina, standTop.clone().lerp(V3(0.2, 1.2, 0), smoothstep(150, 166, f)));
      const wave = clamp(invLerp(126, 134, f)) * (1 - clamp(invLerp(158, 166, f)));
      const wig = Math.sin(f * 0.9) * 0.06 * wave;
      lina.pose({
        squash: breathe * 0.8 + Math.sin(f * 0.9) * 0.01 * wave,
        headYaw: l.yaw * 0.6 + wave * -0.35,
        headPitch: l.pitch * 0.5,
        headRoll: wave * 0.12,
        lookX: clamp(l.yaw * 1.2 - wave * 0.8, -1, 1),
        lookY: clamp(-l.pitch, -1, 1),
        blink: blinkAt(f, 7),
        open: 0.18 + wave * 0.45,
        brow: 0.3 + wave * 0.3,
        wide: wave * 0.3,
        handL: [lerp(-0.36, -0.4 + wig, wave), lerp(0.2, 0.78, wave), lerp(0.4, 0.2, wave)],
        bendL: [lerp(-0.12, -0.2, wave), lerp(-0.08, -0.02, wave), 0.02],
        handR: [0.34, 0.2, 0.42],
      });
    } else {
      // S5: watch each dish land, then celebrate.
      // Glide the gaze from dish to dish as each one lands.
      const tgt = dishes[0].d.position.clone();
      for (let i = 0; i < 3; i++) tgt.lerp(dishes[i + 1].d.position, smoothstep(dishes[i].land + 2, dishes[i].land + 12, f));
      const cheer = clamp(invLerp(D.cheer, D.cheer + 6, f)) * (1 - clamp(invLerp(D.crane + 4, D.crane + 16, f)));
      const bounce = Math.abs(Math.sin(((f - D.cheer) / 30) * Math.PI * 2.0)) * cheer;
      const k = aim(karim, tgt);
      karim.pose({
        y: bounce * 0.06,
        squash: breathe + (bounce > 0 ? (0.5 - bounce) * 0.05 : 0),
        headYaw: k.yaw * 0.6 * (1 - cheer),
        headPitch: k.pitch * 0.5 * (1 - cheer) - cheer * 0.15,
        lookX: clamp(k.yaw * 1.4 * (1 - cheer), -1, 1),
        lookY: clamp(-k.pitch * (1 - cheer) + cheer * 0.4, -1, 1),
        blink: blinkAt(f, 2),
        open: 0.15 + cheer * 0.85,
        wide: 0.2 + cheer * 0.4,
        brow: 0.3 + cheer * 0.5,
        handL: [lerp(-0.36, -0.46, cheer), lerp(0.2, 0.95 + Math.sin(f * 0.6) * 0.04, cheer), lerp(0.42, 0.12, cheer)],
        handR: [lerp(0.36, 0.46, cheer), lerp(0.2, 0.95 + Math.cos(f * 0.6) * 0.04, cheer), lerp(0.42, 0.12, cheer)],
        bendL: [-0.18, lerp(-0.08, 0.02, cheer), 0],
        bendR: [0.18, lerp(-0.08, 0.02, cheer), 0],
      });
      const l = aim(lina, tgt);
      const clap = cheer > 0 ? Math.abs(Math.sin(((f - D.cheer) / 30) * Math.PI * 3.2)) : 1;
      lina.pose({
        y: bounce * 0.035,
        squash: breathe,
        headYaw: l.yaw * 0.6 * (1 - cheer) - cheer * 0.25,
        headPitch: l.pitch * 0.5 * (1 - cheer),
        headRoll: cheer * 0.1 * Math.sin(f * 0.4),
        lookX: clamp(l.yaw * 1.2 * (1 - cheer) - cheer * 0.6, -1, 1),
        lookY: clamp(-l.pitch * (1 - cheer), -1, 1),
        blink: blinkAt(f, 8),
        open: cheer * 0.7,
        wide: cheer * 0.3,
        handL: [lerp(-0.36, -0.05 - clap * 0.12, cheer), lerp(0.2, 0.6, cheer), lerp(0.4, 0.38, cheer)],
        handR: [lerp(0.34, 0.05 + clap * 0.12, cheer), lerp(0.2, 0.6, cheer), lerp(0.42, 0.38, cheer)],
        bendL: [-0.15, -0.1, 0.05],
        bendR: [0.15, -0.1, 0.05],
      });
    }

    // ---- Phone screen ----
    if (!S5 && f >= D.phoneUp - 1) {
      if (f < D.menuIn) phoneScreen.draw({ mode: "scan", t: f, found: clamp(invLerp(D.found, D.found + 12, f)) });
      else phoneScreen.draw({ mode: "scan", t: f, found: 1, menuT: clamp(invLerp(D.menuIn, D.menuIn + 16, f)) });
    }

    steamH.update(f, S5 ? clamp(invLerp(D.lands[0], D.lands[0] + 20, f)) : 0);
    steamC.update(f, S5 ? clamp(invLerp(D.lands[2], D.lands[2] + 20, f)) : 0);

    // ---- Finale: fork flies onto the plate, ring opens into the logo ----
    const fm = ease.inOutCubic(invLerp(D.forkMove, D.forkMove + 14, f));
    const lift = ease.inOutCubic(invLerp(D.hit - 8, D.hit, f));
    logo.fork.position.set(lerp(-142, 0, fm), lerp(-20, 0, fm), lerp(-19, 0, fm) + Math.sin(fm * Math.PI) * 60);
    logo.fork.rotation.z = lerp(0, (42 * Math.PI) / 180, fm) + Math.sin(fm * Math.PI) * 0.6;
    const branded = f >= D.forkMove + 9;
    for (const { o, m } of forkMeshes) o.material = branded ? m : steel;
    const ringOpen = ease.snap(invLerp(D.forkMove + 6, D.hit - 2, f));
    logo.setArc(lerp(Math.PI * 2 - 0.001, RING_ARC, ringOpen), lerp(3.6, 9, ringOpen));
    logo.ring.visible = f >= D.forkMove;
    if (myPlate.userData.rim) myPlate.userData.rim.visible = f < D.forkMove;
    markHolder.position.y = TOP + 0.041 + lift * 0.18;
    const plateGone = ease.inBack(invLerp(D.hit - 9, D.hit - 1, f));
    myPlate.scale.setScalar(Math.max(0.001, 1 - plateGone));
    myKnife.position.x = 0.31 + ease.inCubic(invLerp(D.forkMove, D.forkMove + 10, f)) * 1.2;
    sparkle.update(f, D.forkMove + 9, markHolder.position.clone());
    const w = ease.inCubic(invLerp(D.hit - 9, D.hit - 1, f));
    wipe.visible = w > 0;
    wipe.scale.setScalar(Math.max(0.001, w * 3.2));

    // ---- Camera ----
    const cam = ctx.stage.camera;
    if (f < D.standUp) {
      // S1: overhead macro on the plaque, slowly orbiting; type sits on the clean cloth at left.
      const t = f / D.standUp;
      const az = lerp(-0.3, -0.08, ease.inOutSine(t));
      const el = lerp(1.36, 1.24, t);
      const dist = lerp(1.32, 1.56, ease.inOutSine(t));
      const c = V3(0.0, TOP + 0.02, 0.12);
      const pos = V3(c.x + Math.sin(az) * Math.cos(el) * dist, c.y + Math.sin(el) * dist, c.z + Math.cos(az) * Math.cos(el) * dist);
      setCam(cam, pos, c.clone().add(V3(-0.3, 0, 0)), { fov: 30 });
    } else if (f < D.shotB) {
      const t = ease.inOutCubic(invLerp(D.standUp, D.revealEnd, f));
      const az = -0.08;
      const el = 1.24;
      const c = V3(0.0, TOP + 0.02, 0.12);
      const p0 = V3(c.x + Math.sin(az) * Math.cos(el) * 1.56, c.y + Math.sin(el) * 1.56, c.z + Math.cos(az) * Math.cos(el) * 1.56);
      const t0 = c.clone().add(V3(-0.3, 0, 0));
      const push = ease.inOutSine(invLerp(D.revealEnd, D.shotB, f));
      const p1 = camA.pos.clone().lerp(V3(0.28, 1.45, 2.62), push);
      blendCam(cam, { pos: p0, target: t0 }, { pos: p1, target: camA.target }, t);
    } else if (f < D.push) {
      // Over Karim's right shoulder: his phone, the stand and Lina beyond.
      const t = ease.inOutSine(invLerp(D.shotB, D.push, f));
      const pos = V3(0.98, 1.66, -1.22).lerp(V3(0.92, 1.62, -1.1), t);
      const tgt = ph.group.position.clone().add(V3(-0.16, -0.02, 0.15));
      setCam(cam, pos, tgt, { fov: 30 });
    } else if (!S5) {
      // Dive into the phone screen.
      ph.group.updateMatrixWorld(true);
      const header = V3(0, 0.27, 0.03).applyMatrix4(ph.group.matrixWorld);
      const normal = V3(0, 0, 1).transformDirection(ph.group.matrixWorld);
      const t = ease.inQuart(invLerp(D.push, D.cut, f));
      const p0 = V3(0.92, 1.62, -1.1);
      const t0 = ph.group.position.clone().add(V3(-0.16, -0.02, 0.15));
      const p1 = header.clone().addScaledVector(normal, 0.2);
      blendCam(cam, { pos: p0, target: t0 }, { pos: p1, target: header }, t);
    } else if (f < D.crane) {
      // S5: arrive from a whip-pan, settle on a high frontal.
      const t = ease.outCubic(invLerp(D.serve, D.serve + 14, f));
      const yaw = (1 - t) * 0.55 - Math.sin(t * Math.PI) * 0.03;
      const pos = V3(0.12, 1.86, 2.72);
      const tgt = V3(0.0, 0.92, -0.05);
      setCam(cam, pos, tgt, { fov: 30 });
      cam.rotateY(yaw);
    } else {
      // Crane up into a top-down on "your" plate (matches the logo framing in S6).
      const t = ease.inOutCubic(invLerp(D.crane, D.hit - 2, f));
      const end = V3(0, TOP + 0.041 + 0.18 + 1.6, 0.5);
      blendCam(cam, { pos: V3(0.12, 1.86, 2.72), target: V3(0.0, 0.92, -0.05) }, { pos: end, target: V3(0, TOP, 0.5), up: V3(0, 0, -1) }, t);
    }
    // Gentle handheld life on top of every move.
    cam.rotateX(drift(f, 0.03, 11) * 0.004);
    cam.rotateY(drift(f, 0.03, 12) * 0.004);

    const shadowCenter = f < D.standUp ? V3(0, TOP, 0.1) : V3(0, 0.9, -0.3);
    return { bg: "#efe1cd", shadow: [shadowCenter, f < D.standUp ? 0.9 : 2.6], floor: true };
  }

  return { world, update, karim, lina, phone: ph, S_D, END_BG };
}
