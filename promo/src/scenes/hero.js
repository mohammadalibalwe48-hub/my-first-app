// S3: the phone floats on brand blue; dishes spring out of the menu, get added
// to the order, Karim taps "Send order" and a ticket shoots out towards camera.
import * as THREE from "three";
import { C, toy } from "../lib/materials.js";
import { ease, spring, drift, lerp, clamp, invLerp, hash } from "../lib/anim.js";
import { V3, Noodle, canvasTex, merge, rng } from "../lib/shapes.js";
import { Burst } from "../lib/fx.js";
import { phone } from "../world/props.js";
import { DISHES } from "../world/food.js";
import { ticketTexture } from "../world/ui.js";
import { ORDER_ITEMS, formatSYP } from "../config.js";
import { pillLabel, project } from "../lib/hud.js";
import { setCam, blendCam, impact } from "./common.js";

export const H = {
  start: 270,
  pops: [300, 315, 330, 345],
  adds: [360, 375, 390, 405],
  send: 410,
  press: 420,
  sent: 424,
  print: 440,
  fly: 454,
  cut: 480,
};

function starGeometry(r = 0.12, depth = 0.04) {
  const s = new THREE.Shape();
  for (let i = 0; i < 16; i++) {
    const a = Math.PI / 8 + (i / 16) * Math.PI * 2;
    const rr = i % 2 ? r * 0.72 : r;
    i ? s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.01, bevelSegments: 2 });
  g.center();
  return g;
}

export function buildHero(ctx) {
  const { phoneScreen, hud } = ctx;
  const world = new THREE.Group();

  // Backdrop: radial brand-blue gradient on a far plane.
  const { ctx: bctx, tex: btex } = canvasTex(1024, 1024);
  const grd = bctx.createRadialGradient(512, 470, 40, 512, 512, 720);
  grd.addColorStop(0, "#3a8bff");
  grd.addColorStop(0.55, C.blue);
  grd.addColorStop(1, "#0632c4");
  bctx.fillStyle = grd;
  bctx.fillRect(0, 0, 1024, 1024);
  const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(26, 16), new THREE.MeshBasicMaterial({ map: btex, toneMapped: false }));
  backdrop.position.z = -6;
  world.add(backdrop);

  // Floating Damascene stars at several depths for parallax.
  const r = rng(91);
  const starGeo = starGeometry();
  const starMats = [toy("#ffffff", { roughness: 0.35, clearcoat: 0.6 }), toy(C.orange, { roughness: 0.4, clearcoat: 0.5 }), toy(C.blueSoft, { roughness: 0.4, clearcoat: 0.5 })];
  const stars = Array.from({ length: 16 }, (_, i) => {
    const m = new THREE.Mesh(starGeo, starMats[i % 3]);
    const z = -0.6 - r() * 3.5;
    const spread = 1.6 + -z * 0.9;
    let x = (r() * 2 - 1) * spread * 1.5;
    if (Math.abs(x) < 0.7) x += Math.sign(x || 1) * 0.9;
    m.position.set(x, (r() * 2 - 1) * spread * 0.75, z);
    m.scale.setScalar(0.6 + r() * 0.9);
    m.userData = { rx: r() * 6, ry: r() * 6, sp: 0.4 + r() * 0.8, base: m.position.clone() };
    world.add(m);
    return m;
  });

  const ph = phone(phoneScreen.tex);
  world.add(ph.group);

  // Screen-space anchors of each menu card's thumbnail, in phone-local units.
  const cardLocal = (i) => {
    const yPts = 326 + i * 102 + 46;
    return V3(-0.372 / 2 + (60 / 390) * 0.372, 0.792 / 2 - (yPts / 830) * 0.792, 0.03);
  };
  const cartLocal = V3(-0.13, -0.33, 0.03);
  const ids = ["hummus", "kibbeh", "coffee", "juice"];
  const slots = [V3(-0.86, 0.16, 0.15), V3(-0.55, -0.3, 0.2), V3(0.86, 0.16, 0.15), V3(0.58, -0.3, 0.2)];
  const dishes = ids.map((id, i) => {
    const d = DISHES[id]();
    const holder = new THREE.Group();
    holder.add(d);
    world.add(holder);
    const burst = new Burst(world, { count: 10, seed: 50 + i, colors: ["#ffffff", C.yellow, C.orange], size: 0.07, speed: 0.35, life: 16, up: 1, spread: 1 });
    const pop = new Burst(world, { count: 10, seed: 60 + i, colors: ["#ffffff", C.blueSoft], size: 0.06, speed: 0.3, life: 14, up: 1, spread: 1 });
    return { id, d, holder, slot: slots[i], burst, pop, item: ORDER_ITEMS[i] };
  });

  // Karim's hand reaching in from the bottom-right to tap "Send order".
  const sleeve = toy(C.orange, { roughness: 0.6, clearcoat: 0.08 });
  const arm = new Noodle(0.085, 0.075, sleeve, 24, 12);
  world.add(arm.mesh);
  const handG = new THREE.Group();
  const skin = toy("#e5ab84", { roughness: 0.5, clearcoat: 0.15 });
  const palm = new THREE.Mesh(new THREE.SphereGeometry(0.09, 24, 16), skin);
  palm.scale.set(1, 0.85, 1.1);
  const finger = new THREE.Mesh(new THREE.CapsuleGeometry(0.028, 0.09, 4, 10), skin);
  finger.rotation.x = Math.PI / 2;
  finger.position.set(0, 0.015, 0.11);
  const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.028, 0.05, 4, 10), skin);
  thumb.position.set(0.07, 0.03, 0.03);
  thumb.rotation.set(0.4, 0, -0.9);
  handG.add(palm, finger, thumb);
  world.add(handG);
  const tapRipple = new Burst(world, { count: 12, seed: 71, colors: ["#ffffff", C.blueSoft], size: 0.06, speed: 0.28, life: 14, up: 0.2, spread: 1 });

  // The printed ticket.
  const ticketGeo = new THREE.PlaneGeometry(0.3, 0.47, 12, 18);
  const ticketMat = new THREE.MeshStandardMaterial({ map: ticketTexture(), roughness: 0.75, side: THREE.DoubleSide, transparent: true, alphaTest: 0.5 });
  const ticket = new THREE.Mesh(ticketGeo, ticketMat);
  world.add(ticket);
  const tpos = ticketGeo.attributes.position;
  const tbase = Float32Array.from(tpos.array);

  const tmp = V3();
  const q = new THREE.Quaternion();

  function update(f) {
    world.visible = f >= H.start && f < H.cut;
    if (!world.visible) return null;
    const lf = f - H.start;

    // Phone: floats, turns to a gentle three-quarter and bobs on the beat.
    const settle = ease.snap(invLerp(H.start, H.start + 30, f));
    const sentPulse = impact(f - H.press, 2.6, 8) * (f >= H.press ? 1 : 0);
    ph.group.position.set(0, Math.sin(lf * 0.07) * 0.025, 0);
    ph.group.rotation.set(0.04 + drift(f, 0.02, 2) * 0.05, lerp(0, -0.2, settle) + Math.sin(lf * 0.035) * 0.08, drift(f, 0.02, 5) * 0.03);
    const bump = dishes.reduce((s, d, i) => s + (f >= H.adds[i] + 10 ? impact(f - H.adds[i] - 10, 3, 9) : 0), 0);
    ph.group.scale.setScalar(1 + bump * 0.035 - sentPulse * 0.04);
    ph.group.updateMatrixWorld(true);

    // Camera first, so price tags project with this sub-frame's camera.
    const cam = ctx.stage.camera;
    const header = V3(0, 0.27, 0.03).applyMatrix4(ph.group.matrixWorld);
    const pull = ease.snap(invLerp(H.start, H.start + 28, f));
    const near = { pos: header.clone().add(V3(0, 0, 0.36)), target: header };
    const far = { pos: V3(0.04, 0.02, 2.7 - lf * 0.0012), target: V3(0, -0.04, 0) };
    blendCam(cam, near, far, pull);
    cam.rotateZ(drift(f, 0.02, 3) * 0.01);
    cam.updateMatrixWorld(true);

    // Dishes: spring out of their cards, orbit, then dive back into the order.
    let count = 0;
    let countPop = 0;
    const added = [];
    const popState = [];
    let highlight = -1;
    dishes.forEach((d, i) => {
      const tp = H.pops[i];
      const ta = H.adds[i];
      const from = cardLocal(i).applyMatrix4(ph.group.matrixWorld);
      const cart = cartLocal.clone().applyMatrix4(ph.group.matrixWorld);
      const out = ease.snap(invLerp(tp, tp + 16, f));
      const back = ease.inBack(invLerp(ta, ta + 11, f));
      const sc = spring(f - tp, 2.2, 0.45);
      const bob = V3(0, Math.sin(lf * 0.09 + i * 1.7) * 0.03, 0);
      const pos = from.clone().lerp(d.slot, out).add(bob.multiplyScalar(out));
      pos.y += Math.sin(out * Math.PI) * 0.15;
      pos.lerp(cart, back);
      d.holder.position.copy(pos);
      d.holder.visible = f >= tp && back < 0.999;
      d.holder.scale.setScalar(Math.max(0.001, lerp(0.12, 1.2, sc) * (1 - back * 0.92)));
      d.holder.rotation.set(0.62 - back * 0.4, Math.sin(lf * 0.03 + i) * 0.35 + (1 - out) * 1.5 + (d.slot.x > 0 ? -0.3 : 0.3), 0);
      d.pop.update(f, tp + 2, from);
      d.burst.update(f, ta + 11, cart);
      if (f >= ta + 10) {
        count = i + 1;
        countPop = clamp((f - ta - 10) / 8);
      }
      added.push(f >= ta + 9 ? 1 : 0);
      popState.push(f >= tp && f < ta + 10 ? 1 : 0);
      if (f >= tp - 4 && f < tp + 6) highlight = i;
      // Price tag follows the dish on screen.
      const tagP = clamp(invLerp(tp + 8, tp + 18, f)) * (1 - clamp(invLerp(ta - 2, ta + 4, f)));
      if (tagP > 0) {
        const s = project(d.holder.position.clone().add(V3(0, -0.3, 0.1)), ctx.stage.camera);
        pillLabel(hud, { x: s.x, y: s.y, text: d.item.name, sub: formatSYP(d.item.price), p: tagP, size: 25 });
      }
    });

    const send = f >= H.send ? 1 : 0;
    phoneScreen.draw({
      mode: "menu",
      added,
      pop: popState,
      highlight,
      count,
      countPop,
      send,
      press: clamp(invLerp(H.press - 1, H.press + 6, f)),
      sent: clamp(invLerp(H.sent, H.sent + 18, f)),
    });

    // Hand: in, tap, out.
    const handIn = ease.snap(invLerp(H.send - 2, H.press - 2, f)) * (1 - ease.inCubic(invLerp(H.press + 8, H.press + 22, f)));
    const btn = V3(0.03, -0.33, 0.04).applyMatrix4(ph.group.matrixWorld);
    const poke = Math.exp(-Math.pow((f - H.press) / 2.2, 2));
    const handPos = V3(1.7, -1.5, 1.2).lerp(btn.clone().add(V3(0.05, -0.03, 0.17 - poke * 0.07)), handIn);
    const shoulder = V3(2.6, -2.2, 1.6);
    arm.set(shoulder, shoulder.clone().lerp(handPos, 0.5).add(V3(0.25, -0.15, 0)), handPos);
    handG.position.copy(handPos);
    q.setFromUnitVectors(V3(0, 0, 1), arm.tangentAtEnd(tmp).normalize());
    handG.quaternion.copy(q);
    arm.mesh.visible = handG.visible = handIn > 0.001;
    tapRipple.update(f, H.press, btn);

    // Ticket: prints out of the top edge, then flies past the camera.
    const printT = ease.outCubic(invLerp(H.print, H.fly, f));
    const flyT = ease.inCubic(invLerp(H.fly, H.cut, f));
    ticket.visible = f >= H.print;
    const top = V3(0, 0.41 + printT * 0.25, -0.01).applyMatrix4(ph.group.matrixWorld);
    const camP = ctx.stage.camera.position.clone();
    ticket.position.copy(top).lerp(camP.clone().add(V3(0.05, -0.02, -0.25)), flyT);
    ticket.rotation.set(-0.2 * flyT, ph.group.rotation.y * (1 - flyT) + flyT * 0.6, flyT * 1.4);
    ticket.scale.setScalar(lerp(0.5, 1, printT));
    // Paper curl while flying.
    for (let i = 0; i < tpos.count; i++) {
      const x = tbase[i * 3];
      const y = tbase[i * 3 + 1];
      tpos.setZ(i, Math.sin(y * 4 + f * 0.4) * 0.02 * flyT + x * x * 0.6 * (0.3 + flyT));
    }
    tpos.needsUpdate = true;
    ticketGeo.computeVertexNormals();

    // Stars drift.
    for (const s of stars) {
      const u = s.userData;
      s.rotation.set(Math.sin(lf * 0.02 + u.rx) * 0.35, Math.cos(lf * 0.017 + u.ry) * 0.35, u.rx + lf * 0.01 * u.sp);
      s.position.y = u.base.y + Math.sin(lf * 0.03 * u.sp + u.rx) * 0.06;
    }

    return { bg: C.blue, shadow: [V3(0, 0, 0), 2], floor: false };
  }

  return { world, update };
}
