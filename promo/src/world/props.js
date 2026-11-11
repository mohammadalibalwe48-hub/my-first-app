// Set pieces: table, QR stand, phone, tablet, cutlery, Damascene backdrop, kitchen.
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { C, toy, matte, ceramic, metal, glossy, glass } from "../lib/materials.js";
import { lathe, merge, rng, V3, roundedRectShape, roundedRectGeometry, canvasTex } from "../lib/shapes.js";
import { ablaqTexture, tileTexture } from "./textures.js";

/** Extruded rounded slab (device bodies, boards) centred on the origin, front face +z. */
export function slab(w, h, d, r, bevel = 0.006) {
  const geo = new THREE.ExtrudeGeometry(roundedRectShape(w - bevel * 2, h - bevel * 2, Math.max(0.001, r - bevel)), {
    depth: d - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 4,
    curveSegments: 12,
  });
  geo.translate(0, 0, -(d - bevel * 2) / 2);
  return geo;
}

/** Round café table dressed with a cloth; top surface at y = 0.78. */
export function table({ radius = 0.95 } = {}) {
  const g = new THREE.Group();
  const top = 0.78;
  const { ctx, tex } = canvasTex(1024, 1024);
  ctx.fillStyle = "#fbf3e6";
  ctx.fillRect(0, 0, 1024, 1024);
  const c = 512;
  const band = (r0, r1, col) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(c, c, r1, 0, Math.PI * 2);
    ctx.arc(c, c, r0, 0, Math.PI * 2, true);
    ctx.fill();
  };
  band(470, 486, C.blue);
  band(452, 458, C.orange);
  // Woven diamond border, like a Syrian embroidered tablecloth.
  for (let k = 0; k < 72; k++) {
    const a = (k / 72) * Math.PI * 2;
    const P = (rad, ang) => [c + Math.cos(ang) * rad, c + Math.sin(ang) * rad];
    ctx.fillStyle = k % 2 ? "rgba(21,97,255,0.55)" : "rgba(255,122,18,0.55)";
    ctx.beginPath();
    ctx.moveTo(...P(420, a));
    ctx.lineTo(...P(436, a - 0.03));
    ctx.lineTo(...P(452, a) );
    ctx.lineTo(...P(436, a + 0.03));
    ctx.closePath();
    ctx.fill();
  }
  const r = rng(4);
  ctx.strokeStyle = "rgba(160,120,80,0.05)";
  for (let i = 0; i < 400; i++) {
    ctx.lineWidth = 1;
    ctx.beginPath();
    const y = r() * 1024;
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y + (r() - 0.5) * 4);
    ctx.stroke();
  }
  const clothTop = new THREE.Mesh(new THREE.CircleGeometry(radius, 96), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 }));
  clothTop.rotation.x = -Math.PI / 2;
  clothTop.position.y = top;
  g.add(clothTop);
  // Edge roll + a softly folded skirt to the floor (hides the characters' seats).
  const roll = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.018, 12, 128), matte("#f6ead8", { roughness: 0.85 }));
  roll.rotation.x = Math.PI / 2;
  roll.position.y = top - 0.012;
  g.add(roll);
  const skirt = new THREE.CylinderGeometry(radius + 0.01, radius + 0.1, top, 160, 12, true);
  const p = skirt.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const t = 0.5 - y / top; // 0 at top -> 1 at floor
    const a = Math.atan2(z, x);
    const k = 1 + Math.sin(a * 22) * 0.012 * t * t + Math.sin(a * 9 + 1) * 0.006 * t;
    p.setX(i, x * k);
    p.setZ(i, z * k);
  }
  skirt.computeVertexNormals();
  const sk = new THREE.Mesh(skirt, new THREE.MeshStandardMaterial({ color: "#f3e5d1", roughness: 0.9 }));
  sk.position.y = top / 2;
  g.add(sk);
  g.userData.top = top;
  return g;
}

/** Wooden chair back visible behind a seated character. */
export function chairBack() {
  const wood = toy(C.woodDark, { roughness: 0.55, clearcoat: 0.3 });
  const g = new THREE.Group();
  const shape = new THREE.Shape();
  shape.moveTo(-0.3, 0);
  shape.lineTo(0.3, 0);
  shape.lineTo(0.3, 0.42);
  shape.absarc(0, 0.42, 0.3, 0, Math.PI, false);
  shape.lineTo(-0.3, 0);
  const hole = new THREE.Path();
  hole.moveTo(-0.22, 0.08);
  hole.lineTo(0.22, 0.08);
  hole.lineTo(0.22, 0.42);
  hole.absarc(0, 0.42, 0.22, 0, Math.PI, false);
  hole.lineTo(-0.22, 0.08);
  shape.holes.push(hole);
  const back = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 3, curveSegments: 24 }), wood);
  g.add(back);
  const weave = new THREE.Mesh(new THREE.CircleGeometry(0.2, 32), matte("#d9b98a", { roughness: 0.9 }));
  weave.position.set(0, 0.42, 0.02);
  g.add(weave);
  return g;
}

/**
 * Table-tent QR stand. Pivot is the bottom edge of the plaque, so rotating
 * group.rotation.x from -PI/2 (lying flat, face up) to ~-0.2 stands it up.
 */
export function qrStand(rows, { header } = {}) {
  const n = rows.length;
  const g = new THREE.Group();
  const W = 0.42;
  const H = 0.56;
  const T = 0.024;
  const board = new THREE.Mesh(slab(W, H, T, 0.04, 0.007), toy("#fffcf6", { roughness: 0.5, clearcoat: 0.15 }));
  board.position.set(0, H / 2, 0);
  g.add(board);
  const qrW = 0.32;
  const mod = qrW / n;
  const qrY = 0.03 + qrW / 2;
  // Header strip: a printed card above the code.
  if (header) {
    const hdr = new THREE.Mesh(roundedRectGeometry(W - 0.05, 0.15, 0.02), new THREE.MeshStandardMaterial({ map: header, roughness: 0.5 }));
    hdr.position.set(0, H - 0.1, T / 2 + 0.0012);
    g.add(hdr);
  }
  const cells = [];
  const isFinder = (r, c) => (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (rows[r][c] !== "1" || isFinder(r, c)) continue;
      cells.push({ r, c, x: -qrW / 2 + (c + 0.5) * mod, y: qrY + qrW / 2 - (r + 0.5) * mod });
    }
  }
  const cubeGeo = new RoundedBoxGeometry(mod * 0.94, mod * 0.94, mod * 0.9, 2, mod * 0.2);
  const cubeMat = toy(C.blueDeep, { roughness: 0.42, clearcoat: 0.3 });
  const inst = new THREE.InstancedMesh(cubeGeo, cubeMat, cells.length);
  inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  g.add(inst);
  // Finder patterns as single chunky pieces (ring + core) so they can land as hero beats.
  const finders = [
    [0, 0],
    [0, n - 7],
    [n - 7, 0],
  ].map(([r0, c0]) => {
    const fg = new THREE.Group();
    const outer = roundedRectShape(7 * mod * 0.98, 7 * mod * 0.98, mod * 1.1);
    outer.holes.push(roundedRectShape(5 * mod * 1.0, 5 * mod * 1.0, mod * 0.6));
    const ring = new THREE.Mesh(new THREE.ExtrudeGeometry(outer, { depth: mod * 0.6, bevelEnabled: true, bevelThickness: mod * 0.15, bevelSize: mod * 0.12, bevelSegments: 2, curveSegments: 6 }), cubeMat);
    ring.position.z = -mod * 0.3;
    const core = new THREE.Mesh(new RoundedBoxGeometry(3 * mod * 0.98, 3 * mod * 0.98, mod * 0.9, 2, mod * 0.3), cubeMat);
    fg.add(ring, core);
    fg.position.set(-qrW / 2 + (c0 + 3.5) * mod, qrY + qrW / 2 - (r0 + 3.5) * mod, T / 2 + mod * 0.45);
    g.add(fg);
    return fg;
  });
  // Wooden foot that slides in once the plaque stands up.
  const foot = new THREE.Mesh(new RoundedBoxGeometry(W * 0.9, 0.04, 0.16, 3, 0.015), toy(C.wood, { roughness: 0.5, clearcoat: 0.3 }));
  foot.position.set(0, 0.02, -0.03);
  return { group: g, board, inst, cells, finders, foot, mod, qrW, qrY, T, W, H };
}

/** Smartphone with a canvas-driven screen. */
export function phone(screenTex) {
  const g = new THREE.Group();
  const W = 0.4;
  const H = 0.82;
  const D = 0.042;
  const body = new THREE.Mesh(slab(W, H, D, 0.062, 0.01), toy("#1a2130", { roughness: 0.3, clearcoat: 0.9 }));
  g.add(body);
  const screenMat = new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false });
  const screen = new THREE.Mesh(roundedRectGeometry(W - 0.028, H - 0.028, 0.05), screenMat);
  screen.position.z = D / 2 + 0.0012;
  g.add(screen);
  const bump = new THREE.Mesh(slab(0.15, 0.15, 0.014, 0.04, 0.004), toy("#262f40", { roughness: 0.3, clearcoat: 0.8 }));
  bump.position.set(-0.095, H / 2 - 0.11, -D / 2 - 0.006);
  g.add(bump);
  const lensMat = glossy("#0b0e14", { roughness: 0.05 });
  for (const [x, y] of [
    [-0.13, H / 2 - 0.075],
    [-0.13, H / 2 - 0.145],
    [-0.06, H / 2 - 0.11],
  ]) {
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.01, 24), lensMat);
    l.rotation.x = Math.PI / 2;
    l.position.set(x, y, -D / 2 - 0.015);
    g.add(l);
  }
  for (const [y, h] of [
    [0.2, 0.09],
    [0.07, 0.06],
  ]) {
    const b = new THREE.Mesh(new RoundedBoxGeometry(0.012, h, 0.016, 2, 0.005), toy("#2a3346"));
    b.position.set(W / 2 + 0.002, y, 0);
    g.add(b);
  }
  return { group: g, screen, screenMat, W, H, D };
}

/** Restaurant tablet on a little easel. Screen faces +z. */
export function tablet(screenTex) {
  const g = new THREE.Group();
  const W = 0.78;
  const H = 0.54;
  const D = 0.03;
  const dev = new THREE.Group();
  dev.add(new THREE.Mesh(slab(W, H, D, 0.045, 0.008), toy("#1a2130", { roughness: 0.3, clearcoat: 0.9 })));
  const screen = new THREE.Mesh(roundedRectGeometry(W - 0.04, H - 0.04, 0.03), new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false }));
  screen.position.z = D / 2 + 0.001;
  dev.add(screen);
  dev.position.y = H / 2 + 0.04;
  dev.rotation.x = -0.22;
  g.add(dev);
  const stand = new THREE.Mesh(new RoundedBoxGeometry(0.28, 0.05, 0.22, 3, 0.02), metal("#c9ced6", { roughness: 0.35 }));
  stand.position.set(0, 0.025, -0.05);
  g.add(stand);
  return { group: g, device: dev, screen };
}

/** Steel knife for the place setting. */
export function knife() {
  const s = new THREE.Shape();
  s.moveTo(-0.012, -0.17);
  s.lineTo(0.012, -0.17);
  s.lineTo(0.013, 0.0);
  s.quadraticCurveTo(0.024, 0.1, 0.006, 0.17);
  s.lineTo(-0.012, 0.17);
  s.lineTo(-0.012, -0.17);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.006, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 2 });
  const m = new THREE.Mesh(geo, metal(C.steel, { roughness: 0.25 }));
  m.rotation.x = -Math.PI / 2;
  return m;
}

/** Freestanding Damascene arch (ablaq stone) with a warm doorway behind it. */
export function arch() {
  const g = new THREE.Group();
  const W = 2.6;
  const H = 3.1;
  const outer = new THREE.Shape();
  outer.moveTo(-W / 2, 0);
  outer.lineTo(W / 2, 0);
  outer.lineTo(W / 2, H);
  outer.lineTo(-W / 2, H);
  outer.lineTo(-W / 2, 0);
  const hole = new THREE.Path();
  const hw = 0.82;
  hole.moveTo(-hw, 0);
  hole.lineTo(hw, 0);
  hole.lineTo(hw, 1.7);
  hole.absarc(0, 1.7, hw, 0, Math.PI, false);
  hole.lineTo(-hw, 0);
  outer.holes.push(hole);
  const tex = ablaqTexture();
  tex.repeat.set(1 / 2.6, 1 / 2.4);
  const geo = new THREE.ExtrudeGeometry(outer, { depth: 0.3, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2, curveSegments: 48 });
  const wall = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 }));
  g.add(wall);
  // Doorway glow (an inner room lit warmly)
  const inner = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 2.6), new THREE.MeshBasicMaterial({ color: "#f6c98d" }));
  inner.position.set(0, 1.3, -0.4);
  g.add(inner);
  // Small keystone accent
  const key = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.26, 0.08, 2, 0.02), toy(C.orange, { roughness: 0.6 }));
  key.position.set(0, 2.6, 0.33);
  g.add(key);
  return g;
}

/** Brass lantern with a glowing core (blooms). */
export function lantern() {
  const brass = metal("#c99a45", { roughness: 0.3 });
  const g = new THREE.Group();
  // Ribs
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    const curve = new THREE.CatmullRomCurve3([V3(0, 0.0, 0), V3(Math.cos(a) * 0.13, 0.08, Math.sin(a) * 0.13), V3(Math.cos(a) * 0.14, 0.17, Math.sin(a) * 0.14), V3(Math.cos(a) * 0.08, 0.3, Math.sin(a) * 0.08)]);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.008, 6), brass));
  }
  const cap = new THREE.Mesh(lathe([[0.1, 0.29], [0.11, 0.31], [0.06, 0.38], [0.02, 0.45], [0, 0.47]], { segments: 24, smooth: 16 }), brass);
  g.add(cap);
  const glowMat = new THREE.MeshBasicMaterial({ color: new THREE.Color("#ffb347").multiplyScalar(6), toneMapped: true });
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 16), glowMat);
  core.position.y = 0.16;
  core.scale.set(1, 1.15, 1);
  g.add(core);
  const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 2.0, 6), brass);
  chain.position.y = 1.47;
  g.add(chain);
  const light = new THREE.PointLight("#ffb35c", 1.6, 4, 2);
  light.position.y = 0.16;
  g.add(light);
  g.userData.light = light;
  g.userData.core = core;
  return g;
}

/** Potted lemon tree. */
export function lemonTree(seed = 2) {
  const g = new THREE.Group();
  const pot = new THREE.Mesh(lathe([[0, 0], [0.2, 0], [0.26, 0.38], [0.29, 0.42], [0.27, 0.44], [0, 0.44]], { segments: 40 }), toy(C.terracotta, { roughness: 0.75, clearcoat: 0 }));
  g.add(pot);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.245, 0.012, 8, 40), toy(C.blue, { roughness: 0.5 }));
  band.rotation.x = Math.PI / 2;
  band.position.y = 0.3;
  g.add(band);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 0.9, 10), toy(C.woodDark, { roughness: 0.8 }));
  trunk.position.y = 0.85;
  g.add(trunk);
  const r = rng(seed);
  const leaves = [];
  const fruit = [];
  for (let i = 0; i < 26; i++) {
    const a = r() * Math.PI * 2;
    const u = r() * 2 - 1;
    const s = Math.sqrt(1 - u * u);
    const rad = 0.18 + r() * 0.1;
    leaves.push({ geo: new THREE.IcosahedronGeometry(rad, 2), pos: [Math.cos(a) * s * 0.38, 1.5 + u * 0.3, Math.sin(a) * s * 0.38] });
  }
  for (let i = 0; i < 9; i++) {
    const a = r() * Math.PI * 2;
    const u = r() * 1.4 - 0.7;
    const s = Math.sqrt(1 - u * u);
    fruit.push({ geo: new THREE.SphereGeometry(0.055, 16, 12), pos: [Math.cos(a) * s * 0.56, 1.5 + u * 0.42, Math.sin(a) * s * 0.56], scl: [1, 0.85, 0.85] });
  }
  g.add(new THREE.Mesh(merge(leaves), toy("#2f8f4e", { roughness: 0.65, clearcoat: 0.1 })));
  g.add(new THREE.Mesh(merge(fruit), toy("#ffd23f", { roughness: 0.4, clearcoat: 0.5 })));
  return g;
}

/** Kitchen set: tiled wall, counter, stove and pan, shelf, hanging pans, ticket rail. */
export function kitchenSet() {
  const g = new THREE.Group();
  const tiles = tileTexture();
  tiles.repeat.set(30, 2);
  // Plain plaster wall (room for type) with a Damascene tile backsplash band.
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 4.8), matte("#efe1cb", { roughness: 0.95 }));
  wall.position.set(0, 2.4, -1.1);
  g.add(wall);
  const splash = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 0.64), new THREE.MeshStandardMaterial({ map: tiles, roughness: 0.35 }));
  splash.position.set(0, 0.98 + 0.32, -1.09);
  g.add(splash);
  const trim = new THREE.Mesh(new RoundedBoxGeometry(9.6, 0.05, 0.05, 2, 0.015), toy(C.woodDark, { roughness: 0.55 }));
  trim.position.set(0, 1.64, -1.07);
  g.add(trim);
  const counterFront = new THREE.Mesh(new RoundedBoxGeometry(4.2, 0.92, 0.8, 4, 0.03), toy(C.wood, { roughness: 0.55, clearcoat: 0.25 }));
  counterFront.position.set(0, 0.46, 0.25);
  g.add(counterFront);
  for (let i = -4; i <= 4; i++) {
    const strip = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.6, 0.02, 2, 0.008), toy(C.woodDark, { roughness: 0.55, clearcoat: 0.25 }));
    strip.position.set(i * 0.47, 0.44, 0.66);
    g.add(strip);
  }
  const top = new THREE.Mesh(new RoundedBoxGeometry(4.3, 0.06, 0.9, 3, 0.02), ceramic("#f4eee6", { roughness: 0.3 }));
  top.position.set(0, 0.95, 0.25);
  g.add(top);
  // Stove block + burner + pan
  const stove = new THREE.Mesh(new RoundedBoxGeometry(0.75, 0.1, 0.55, 3, 0.02), toy("#2a2f3a", { roughness: 0.4, clearcoat: 0.5 }));
  stove.position.set(0.72, 1.03, 0.12);
  g.add(stove);
  const flame = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.014, 8, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color("#ff8a2b").multiplyScalar(5) }));
  flame.rotation.x = Math.PI / 2;
  flame.position.set(0.72, 1.085, 0.12);
  g.add(flame);
  const pan = new THREE.Group();
  const panBody = new THREE.Mesh(lathe([[0, 0], [0.17, 0], [0.2, 0.02], [0.215, 0.07], [0.205, 0.072], [0.19, 0.025], [0.165, 0.008], [0, 0.008]], { segments: 48, smooth: 30 }), metal("#3a3f4a", { roughness: 0.35 }));
  pan.add(panBody);
  const handle = new THREE.Mesh(new THREE.CapsuleGeometry(0.02, 0.26, 4, 10), toy(C.woodDark, { roughness: 0.5 }));
  handle.rotation.z = Math.PI / 2 + 0.12;
  handle.position.set(0.34, 0.06, 0);
  pan.add(handle);
  pan.position.set(0.95, 1.1, 0.2);
  g.add(pan);
  // Shelf with spice jars (sumac, za'atar, turmeric, chilli)
  const shelf = new THREE.Mesh(new RoundedBoxGeometry(1.5, 0.05, 0.28, 2, 0.012), toy(C.woodDark, { roughness: 0.55 }));
  shelf.position.set(1.45, 2.12, -0.95);
  g.add(shelf);
  ["#b3261e", "#6f8f2f", "#f2b705", "#e2581b", "#7a4b2a"].forEach((col, i) => {
    const jar = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.18, 24), glass({ tint: "#ffffff", opacity: 0.25 }));
    const fill = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.13, 24), toy(col, { roughness: 0.8, clearcoat: 0 }));
    fill.position.y = -0.02;
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.078, 0.035, 24), metal("#c99a45", { roughness: 0.3 }));
    lid.position.y = 0.105;
    jar.add(fill, body, lid);
    jar.position.set(0.9 + i * 0.27, 2.235, -0.95);
    g.add(jar);
  });
  // Hanging copper pans
  [0, 1, 2].forEach((i) => {
    const hp = new THREE.Group();
    const b = new THREE.Mesh(lathe([[0, 0], [0.13 - i * 0.02, 0], [0.15 - i * 0.02, 0.06], [0, 0.06]], { segments: 32 }), metal("#c87a4a", { roughness: 0.28 }));
    b.rotation.x = Math.PI / 2;
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 8), metal("#c87a4a", { roughness: 0.28 }));
    h.position.set(0, 0.22 - i * 0.02, 0);
    hp.add(b, h);
    hp.position.set(1.05 + i * 0.33, 1.86 + i * 0.03, -1.0);
    g.add(hp);
  });
  const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 1.5, 10), metal(C.steel, { roughness: 0.3 }));
  rail.rotation.z = Math.PI / 2;
  rail.position.set(-0.35, 1.78, -1.02);
  g.add(rail);
  return { group: g, pan, flame, railY: 1.78 };
}
