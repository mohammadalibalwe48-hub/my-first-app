// The four dishes from the seeded Sufra Damascus menu, as stylised miniatures.
// Every builder returns a group resting on y = 0 and centred on the origin.
import * as THREE from "three";
import { C, toy, ceramic, glossy, glass, metal, matte } from "../lib/materials.js";
import { lathe, merge, rng, lumpify, V3 } from "../lib/shapes.js";
import { orangeSliceTexture, stripeTexture } from "./textures.js";

const plateProfile = (r) => [
  [0, 0.004],
  [0.46 * r, 0.004],
  [0.5 * r, 0],
  [0.58 * r, 0],
  [0.63 * r, 0.012],
  [0.86 * r, 0.024],
  [0.99 * r, 0.042],
  [1.0 * r, 0.047],
  [0.97 * r, 0.05],
  [0.85 * r, 0.034],
  [0.62 * r, 0.021],
  [0.3 * r, 0.019],
  [0, 0.019],
];

/** Glazed plate with an optional coloured rim band. userData.top = inner surface height. */
export function plate(r = 0.2, { color = "#fbf6ee", rim = C.blue, band = 0.0075 } = {}) {
  const k = r / 0.2;
  const g = new THREE.Group();
  const geo = lathe(
    plateProfile(r).map(([x, y]) => [x, y * k]),
    { segments: 80, smooth: 70 },
  );
  g.add(new THREE.Mesh(geo, ceramic(color)));
  if (rim) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 0.905, band * k, 8, 120), ceramic(rim));
    ring.rotation.x = Math.PI / 2;
    ring.scale.z = 0.45;
    ring.position.y = 0.0412 * k;
    g.add(ring);
    g.userData.rim = ring;
  }
  g.userData.top = 0.02 * k;
  return g;
}

function scatter(count, seed, fn) {
  const r = rng(seed);
  const parts = [];
  for (let i = 0; i < count; i++) parts.push(fn(r, i));
  return merge(parts.filter(Boolean));
}

export function hummus() {
  const g = new THREE.Group();
  const p = plate(0.2, { rim: C.blue });
  g.add(p);
  const top = p.userData.top;
  const mound = lathe(
    [
      [0.172, 0],
      [0.168, 0.008],
      [0.156, 0.024],
      [0.132, 0.038],
      [0.105, 0.043],
      [0.078, 0.036],
      [0.055, 0.022],
      [0.03, 0.015],
      [0, 0.014],
    ],
    { segments: 96, smooth: 48 },
  );
  const pos = mound.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const rr = Math.hypot(x, z);
    if (rr > 0.04 && rr < 0.165) {
      const th = Math.atan2(z, x);
      pos.setY(i, pos.getY(i) + 0.0048 * Math.sin(th + rr * 80) * Math.sin((Math.PI * (rr - 0.04)) / 0.125));
    }
  }
  mound.computeVertexNormals();
  const hm = new THREE.Mesh(mound, toy("#ecd3a0", { roughness: 0.62, clearcoat: 0.18 }));
  hm.position.y = top;
  g.add(hm);
  const oil = new THREE.Mesh(new THREE.CircleGeometry(0.062, 48), glossy("#d19f1c", { roughness: 0.04 }));
  oil.rotation.x = -Math.PI / 2;
  oil.position.y = top + 0.0165;
  g.add(oil);
  const meat = scatter(15, 21, (r) => {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * 0.05;
    const rad = 0.011 + r() * 0.006;
    return { geo: lumpify(new THREE.SphereGeometry(rad, 10, 8), rad * 0.25, 160, r() * 9), pos: [Math.cos(a) * d, top + 0.022 + r() * 0.004, Math.sin(a) * d] };
  });
  g.add(new THREE.Mesh(meat, toy("#6d3719", { roughness: 0.55, clearcoat: 0.35 })));
  const nuts = scatter(12, 22, (r) => {
    const a = r() * Math.PI * 2;
    const d = 0.025 + r() * 0.05;
    return { geo: new THREE.CapsuleGeometry(0.0055, 0.01, 3, 8), pos: [Math.cos(a) * d, top + 0.027, Math.sin(a) * d], rot: [r() * 3, r() * 3, Math.PI / 2] };
  });
  g.add(new THREE.Mesh(nuts, toy("#f3dca6", { roughness: 0.45, clearcoat: 0.3 })));
  const herbs = scatter(16, 23, (r) => {
    const a = r() * Math.PI * 2;
    const d = 0.02 + r() * 0.12;
    const s = 0.007 + r() * 0.004;
    return { geo: new THREE.SphereGeometry(1, 8, 6), pos: [Math.cos(a) * d, top + 0.03 + (d > 0.08 ? 0.012 : 0), Math.sin(a) * d], scl: [s, s * 0.4, s] };
  });
  g.add(new THREE.Mesh(herbs, toy(C.herb, { roughness: 0.6, clearcoat: 0.1 })));
  const paprika = scatter(22, 24, (r) => {
    const a = r() * Math.PI * 2;
    const d = 0.09 + r() * 0.05;
    return { geo: new THREE.SphereGeometry(0.0042, 6, 4), pos: [Math.cos(a) * d, top + 0.042 - (d - 0.1) * 0.25, Math.sin(a) * d] };
  });
  g.add(new THREE.Mesh(paprika, toy("#c2410c", { roughness: 0.7, clearcoat: 0 })));
  g.userData.steam = V3(0, 0.08, 0);
  return g;
}

export function kibbeh() {
  const g = new THREE.Group();
  const p = plate(0.2, { rim: C.orange });
  g.add(p);
  const top = p.userData.top;
  const base = lathe(
    [
      [0, -0.088],
      [0.02, -0.079],
      [0.038, -0.054],
      [0.048, -0.02],
      [0.05, 0],
      [0.048, 0.02],
      [0.038, 0.054],
      [0.02, 0.079],
      [0, 0.088],
    ],
    { segments: 36, smooth: 36 },
  );
  const crust = toy("#a9561f", { roughness: 0.58, clearcoat: 0.25 });
  const spots = [
    [-0.05, 0.03, 0.5],
    [0.055, 0.02, -0.45],
    [0.0, -0.06, 1.55],
  ];
  const pieces = spots.map(([x, z, ry], i) => {
    const m = new THREE.Mesh(lumpify(base.clone(), 0.0032, 70, i + 2), crust);
    m.rotation.set(0, ry, Math.PI / 2);
    m.position.set(x, top + 0.046, z);
    g.add(m);
    return m;
  });
  g.userData.pieces = pieces;
  // Small bowl of laban on the side.
  const bowl = new THREE.Mesh(
    lathe(
      [
        [0, 0],
        [0.03, 0],
        [0.045, 0.012],
        [0.052, 0.034],
        [0.049, 0.035],
        [0.04, 0.016],
        [0, 0.012],
      ],
      { segments: 48, smooth: 30 },
    ),
    ceramic(C.blue),
  );
  bowl.position.set(0.095, top + 0.002, 0.075);
  g.add(bowl);
  const laban = new THREE.Mesh(new THREE.SphereGeometry(0.044, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), glossy("#fbf8f1", { roughness: 0.2 }));
  laban.scale.y = 0.35;
  laban.position.set(0.095, top + 0.026, 0.075);
  g.add(laban);
  const mint = scatter(3, 31, (r, i) => ({
    geo: new THREE.SphereGeometry(1, 12, 8),
    pos: [0.1 + i * 0.012, top + 0.04, 0.05 + i * 0.016],
    rot: [0.3, i * 1.2, 0.2],
    scl: [0.018, 0.004, 0.009],
  }));
  g.add(new THREE.Mesh(mint, toy(C.herb, { roughness: 0.5, clearcoat: 0.3 })));
  // Lemon wedge.
  const lemon = new THREE.Mesh(new THREE.SphereGeometry(0.04, 24, 16, 0, Math.PI, 0, Math.PI), toy("#ffd23f", { roughness: 0.4, clearcoat: 0.4 }));
  lemon.scale.set(1, 0.7, 0.62);
  lemon.rotation.set(-Math.PI / 2, 0, 0.4);
  lemon.position.set(-0.11, top + 0.002, 0.08);
  g.add(lemon);
  return g;
}

function dallah() {
  const brass = metal("#d0a04a", { roughness: 0.28 });
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    lathe(
      [
        [0, 0],
        [0.055, 0],
        [0.066, 0.02],
        [0.068, 0.05],
        [0.058, 0.08],
        [0.04, 0.1],
        [0.032, 0.125],
        [0.036, 0.135],
        [0.05, 0.15],
        [0.052, 0.158],
        [0.03, 0.17],
        [0.012, 0.18],
        [0.016, 0.195],
        [0.006, 0.212],
        [0, 0.215],
      ],
      { segments: 48, smooth: 60 },
    ),
    brass,
  );
  g.add(body);
  const spout = new THREE.Mesh(
    new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(V3(0.05, 0.06, 0), V3(0.11, 0.07, 0), V3(0.125, 0.165, 0)), 20, 0.011, 10),
    brass,
  );
  g.add(spout);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.04, 12), brass);
  beak.position.set(0.13, 0.18, 0);
  beak.rotation.z = -0.5;
  g.add(beak);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.008, 8, 24, Math.PI * 1.1), brass);
  handle.position.set(-0.05, 0.1, 0);
  handle.rotation.z = Math.PI / 2 - 0.1;
  g.add(handle);
  return g;
}

export function coffee() {
  const g = new THREE.Group();
  const saucer = plate(0.095, { rim: C.blue, band: 0.009 });
  g.add(saucer);
  const top = saucer.userData.top;
  const cup = new THREE.Mesh(
    lathe(
      [
        [0, 0],
        [0.028, 0],
        [0.032, 0.006],
        [0.04, 0.03],
        [0.048, 0.058],
        [0.05, 0.064],
        [0.046, 0.064],
        [0.042, 0.04],
        [0.034, 0.012],
        [0, 0.01],
      ],
      { segments: 56, smooth: 50 },
    ),
    ceramic("#fffdf8"),
  );
  cup.position.y = top;
  g.add(cup);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.0445, 0.0055, 8, 48), ceramic(C.blue));
  band.rotation.x = Math.PI / 2;
  band.position.y = top + 0.044;
  g.add(band);
  const gold = new THREE.Mesh(new THREE.TorusGeometry(0.048, 0.0028, 6, 48), metal("#d6a84a", { roughness: 0.2 }));
  gold.rotation.x = Math.PI / 2;
  gold.position.y = top + 0.064;
  g.add(gold);
  const brew = new THREE.Mesh(new THREE.CircleGeometry(0.044, 40), glossy("#3a1f10", { roughness: 0.06 }));
  brew.rotation.x = -Math.PI / 2;
  brew.position.y = top + 0.052;
  g.add(brew);
  const crema = new THREE.Mesh(new THREE.RingGeometry(0.03, 0.044, 40), glossy("#8a5a2b", { roughness: 0.1 }));
  crema.rotation.x = -Math.PI / 2;
  crema.position.y = top + 0.0525;
  g.add(crema);
  const pot = dallah();
  pot.position.set(-0.13, 0, -0.05);
  pot.rotation.y = 0.5;
  g.add(pot);
  // Two dates on the saucer.
  const dates = scatter(2, 41, (r, i) => ({
    geo: new THREE.SphereGeometry(1, 16, 10),
    pos: [0.07, top + 0.012, -0.025 + i * 0.03],
    rot: [0, 0.4 + i * 0.5, 0],
    scl: [0.02, 0.012, 0.012],
  }));
  g.add(new THREE.Mesh(dates, toy("#5a2a12", { roughness: 0.35, clearcoat: 0.6 })));
  g.userData.steam = V3(0, 0.1, 0);
  return g;
}

export function juice() {
  const g = new THREE.Group();
  const coaster = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.008, 40), matte("#e3cfae", { roughness: 0.9 }));
  coaster.position.y = 0.004;
  g.add(coaster);
  const y0 = 0.008;
  const juiceMesh = new THREE.Mesh(
    lathe(
      [
        [0, 0.012],
        [0.046, 0.012],
        [0.052, 0.15],
        [0, 0.15],
      ],
      { segments: 48 },
    ),
    new THREE.MeshPhysicalMaterial({ color: "#ff8b17", roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.05, emissive: "#ff5a00", emissiveIntensity: 0.12 }),
  );
  juiceMesh.position.y = y0;
  g.add(juiceMesh);
  const cup = new THREE.Mesh(
    lathe(
      [
        [0, 0],
        [0.044, 0],
        [0.048, 0.006],
        [0.057, 0.18],
        [0.0585, 0.184],
        [0.054, 0.184],
        [0.051, 0.014],
        [0, 0.012],
      ],
      { segments: 56 },
    ),
    glass({ tint: "#fff7ec", opacity: 0.16 }),
  );
  cup.position.y = y0;
  cup.renderOrder = 3;
  g.add(cup);
  const sliceTex = orangeSliceTexture();
  const slice = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.01, 40), [
    toy("#ff8a1c", { roughness: 0.4 }),
    new THREE.MeshPhysicalMaterial({ map: sliceTex, roughness: 0.3, clearcoat: 0.6 }),
    new THREE.MeshPhysicalMaterial({ map: sliceTex, roughness: 0.3, clearcoat: 0.6 }),
  ]);
  slice.rotation.set(Math.PI / 2, 0, 0.25);
  slice.position.set(0.05, y0 + 0.18, 0.0);
  g.add(slice);
  const straw = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([V3(-0.012, y0 + 0.03, 0), V3(-0.02, y0 + 0.2, 0.0), V3(-0.03, y0 + 0.235, 0), V3(-0.07, y0 + 0.25, 0)]),
      40,
      0.0075,
      10,
    ),
    new THREE.MeshPhysicalMaterial({ map: (() => {
      const t = stripeTexture("#ffffff", C.blue);
      t.repeat.set(10, 1);
      return t;
    })(), roughness: 0.3, clearcoat: 0.6 }),
  );
  g.add(straw);
  return g;
}

export const DISHES = { hummus, kibbeh, coffee, juice };
