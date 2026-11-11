// Vinyl-toy characters: bean torso, big round head, rubber-hose arms, mitten hands.
// Every expression is driven by a plain pose object so scenes stay declarative.
import * as THREE from "three";
import { C, toy } from "../lib/materials.js";
import { lathe, Noodle, rng, V3, merge } from "../lib/shapes.js";
import { lerp } from "../lib/anim.js";

const dirOf = (lat, lon) => V3(Math.sin(lon) * Math.cos(lat), Math.sin(lat), Math.cos(lon) * Math.cos(lat));
function placeOn(obj, R, lat, lon, out = 0) {
  const n = dirOf(lat, lon);
  obj.position.copy(n).multiplyScalar(R + out);
  obj.quaternion.setFromUnitVectors(V3(0, 0, 1), n);
  return obj;
}
// Bend a flat XY shape so it hugs a sphere of radius R (local +z is the surface normal).
function hug(geo, R) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    p.setZ(i, p.getZ(i) + Math.sqrt(Math.max(0, R * R - x * x - y * y)) - R);
  }
  geo.computeVertexNormals();
  return geo;
}

const R = 0.31; // head radius
const TORSO = [
  [0, 0],
  [0.27, 0],
  [0.315, 0.05],
  [0.332, 0.16],
  [0.322, 0.3],
  [0.292, 0.42],
  [0.24, 0.52],
  [0.16, 0.59],
  [0.06, 0.622],
  [0, 0.626],
];
const SHOULDER = [0.236, 0.455, 0.03];

const DEFAULT_POSE = {
  y: 0,
  squash: 0,
  lean: 0,
  tilt: 0,
  turn: 0,
  headYaw: 0,
  headPitch: 0,
  headRoll: 0,
  blink: 0,
  lookX: 0,
  lookY: 0,
  wide: 0,
  brow: 0,
  browTilt: 0,
  open: 0,
  handL: [-0.36, 0.18, 0.36],
  handR: [0.36, 0.18, 0.36],
  bendL: [-0.12, -0.08, 0.02],
  bendR: [0.12, -0.08, 0.02],
  pointL: 0,
  pointR: 0,
};

function buildFace(face, Rf, { skin, browColor, lashes = false, browThick = 1 }) {
  const eyeMat = toy("#14161b", { roughness: 0.12, clearcoat: 1 });
  const hiMat = new THREE.MeshBasicMaterial({ color: "#ffffff" });
  const eyes = [-1, 1].map((s) => {
    const g = new THREE.Group();
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.043, 24, 16), eyeMat);
    ball.scale.set(0.82, 1.12, 0.5);
    const hi = new THREE.Mesh(new THREE.SphereGeometry(0.0115, 10, 8), hiMat);
    hi.position.set(0.011, 0.019, 0.019);
    const hi2 = new THREE.Mesh(new THREE.SphereGeometry(0.0055, 8, 6), hiMat);
    hi2.position.set(-0.009, -0.016, 0.018);
    g.add(ball, hi, hi2);
    if (lashes) {
      const lash = new THREE.Mesh(new THREE.CapsuleGeometry(0.006, 0.018, 4, 8), eyeMat);
      lash.position.set(s * 0.033, 0.03, 0.002);
      lash.rotation.z = s * 0.9;
      g.add(lash);
    }
    face.add(g);
    return { g, s };
  });
  const browMat = toy(browColor, { roughness: 0.7, clearcoat: 0 });
  const brows = [-1, 1].map((s) => {
    const g = new THREE.Group();
    const inner = new THREE.Mesh(new THREE.CapsuleGeometry(0.0125 * browThick, 0.058, 4, 10), browMat);
    inner.rotation.z = Math.PI / 2;
    const tilt = new THREE.Group();
    tilt.add(inner);
    g.add(tilt);
    face.add(g);
    return { g, tilt, s };
  });
  const cheekMat = toy("#ff8f86", { roughness: 0.75, clearcoat: 0 });
  for (const s of [-1, 1]) {
    const ch = new THREE.Mesh(new THREE.SphereGeometry(0.05, 20, 12), cheekMat);
    ch.scale.set(1, 0.62, 0.28);
    placeOn(ch, Rf, -0.11, s * 0.6, -0.006);
    face.add(ch);
  }
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.032, 20, 14), toy(new THREE.Color(skin).multiplyScalar(0.9).getStyle(), { roughness: 0.55, clearcoat: 0.1 }));
  placeOn(nose, Rf, -0.03, 0, -0.012);
  face.add(nose);

  // Mouth: a closed smile (torus arc) and an open "D" mouth that swaps in for big moments.
  const lipMat = toy("#5b2116", { roughness: 0.45, clearcoat: 0.3 });
  const smile = new THREE.Group();
  const arc = new THREE.Mesh(new THREE.TorusGeometry(0.048, 0.0115, 8, 24, Math.PI), lipMat);
  arc.rotation.z = Math.PI;
  smile.add(arc);
  placeOn(smile, Rf, -0.2, 0, -0.004);
  face.add(smile);

  const open = new THREE.Group();
  const mouthShape = new THREE.Shape();
  mouthShape.moveTo(-0.066, 0);
  mouthShape.lineTo(0.066, 0);
  mouthShape.absellipse(0, 0, 0.066, 0.072, 0, -Math.PI, true);
  const mouthGeo = hug(new THREE.ShapeGeometry(mouthShape, 16), Rf);
  const inner = new THREE.Mesh(mouthGeo, toy("#5a1717", { roughness: 0.5, clearcoat: 0 }));
  const tongue = new THREE.Mesh(hug(new THREE.CircleGeometry(0.036, 20), Rf), toy("#ff6f6a", { roughness: 0.5, clearcoat: 0 }));
  tongue.scale.set(1, 0.62, 1);
  tongue.position.set(0, -0.05, 0.002);
  const teeth = new THREE.Mesh(hug(new THREE.PlaneGeometry(0.1, 0.018, 8, 1), Rf), toy("#ffffff", { roughness: 0.3 }));
  teeth.position.set(0, -0.011, 0.002);
  open.add(inner, tongue, teeth);
  placeOn(open, Rf, -0.15, 0, 0.004);
  open.visible = false;
  face.add(open);
  return { eyes, brows, smile, open, Rf };
}

function curlyHair(R0, color, seed = 3) {
  const r = rng(seed);
  const parts = [];
  for (let i = 0; i < 400 && parts.length < 74; i++) {
    const u = r() * 2 - 1;
    const th = r() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    const n = V3(s * Math.cos(th), u, s * Math.sin(th));
    const face = n.z > 0.35 && n.y < 0.42;
    const ok = !face && (n.y > 0.3 || (n.z < 0.15 && n.y > -0.42) || (Math.abs(n.x) > 0.8 && n.y > -0.05 && n.z < 0.42));
    if (!ok) continue;
    const rad = 0.068 + r() * 0.03;
    parts.push({ geo: new THREE.SphereGeometry(rad, 14, 10), pos: n.multiplyScalar(R0 + 0.004).toArray() });
  }
  return new THREE.Mesh(merge(parts), toy(color, { roughness: 0.62, clearcoat: 0.15 }));
}

function glasses() {
  const mat = toy("#1b1f2a", { roughness: 0.25, clearcoat: 0.8 });
  const g = new THREE.Group();
  for (const s of [-1, 1]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.066, 0.0105, 10, 36), mat);
    ring.position.set(s * 0.104, 0.022, 0.318);
    g.add(ring);
    const temple = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.29, 8), mat);
    temple.position.set(s * 0.17, 0.028, 0.17);
    temple.rotation.x = Math.PI / 2;
    temple.rotation.z = s * 0.06;
    g.add(temple);
  }
  const bridge = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.008, 8, 16, Math.PI), mat);
  bridge.position.set(0, 0.03, 0.326);
  g.add(bridge);
  return g;
}

function toque() {
  const white = toy("#fbf8f3", { roughness: 0.62, clearcoat: 0.05 });
  const g = new THREE.Group();
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.205, 0.2, 0.11, 48), white);
  band.position.y = 0.255;
  const puff = lathe(
    [
      [0.19, 0],
      [0.25, 0.07],
      [0.272, 0.15],
      [0.25, 0.22],
      [0.17, 0.27],
      [0.06, 0.285],
      [0, 0.287],
    ],
    { segments: 72, smooth: 28 },
  );
  const p = puff.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const z = p.getZ(i);
    const y = p.getY(i);
    const k = 1 + 0.045 * Math.cos(Math.atan2(z, x) * 11) * Math.min(1, y / 0.08) * (1 - Math.max(0, (y - 0.2) / 0.09));
    p.setX(i, x * k);
    p.setZ(i, z * k);
  }
  puff.computeVertexNormals();
  const top = new THREE.Mesh(puff, white);
  top.position.y = 0.3;
  g.add(band, top);
  return g;
}

function mustache(Rf) {
  const parts = [];
  for (const s of [-1, 1]) {
    for (let i = 0; i < 8; i++) {
      const t = i / 7;
      const lon = s * (0.05 + t * 0.5);
      const lat = -0.12 - Math.sin(t * Math.PI) * 0.06 + Math.pow(t, 3) * 0.16;
      const n = dirOf(lat, lon);
      const rad = 0.046 * (1 - t * 0.62);
      parts.push({ geo: new THREE.SphereGeometry(rad, 14, 10), pos: n.multiplyScalar(Rf + rad * 0.35).toArray() });
    }
  }
  return new THREE.Mesh(merge(parts), toy("#2b1a12", { roughness: 0.6, clearcoat: 0.2 }));
}

function hand(skin) {
  const mat = toy(skin, { roughness: 0.5, clearcoat: 0.15 });
  const g = new THREE.Group();
  const palm = new THREE.Mesh(new THREE.SphereGeometry(0.072, 24, 16), mat);
  palm.scale.set(1, 0.9, 1.08);
  const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.024, 0.04, 4, 10), mat);
  thumb.position.set(0.06, 0.02, 0.02);
  thumb.rotation.set(0.4, 0, -0.9);
  const finger = new THREE.Mesh(new THREE.CapsuleGeometry(0.023, 0.07, 4, 10), mat);
  finger.rotation.x = Math.PI / 2;
  finger.position.set(0, 0.012, 0.085);
  g.add(palm, thumb, finger);
  return { g, finger };
}

/**
 * kind: "karim" (curly hair + glasses), "lina" (hijab), "chef" (toque + moustache)
 */
export function createCharacter(kind) {
  const look = {
    karim: { skin: "#e5ab84", shirt: C.orange, hair: "#2a1a12" },
    lina: { skin: "#f0c09d", shirt: "#20356e", hair: "#3a2416", scarf: "#d8693f" },
    chef: { skin: "#d39669", shirt: "#fbf8f3", hair: "#2b1a12" },
  }[kind];
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const torso = new THREE.Mesh(lathe(TORSO, { segments: 48, smooth: 40 }), toy(look.shirt, { roughness: 0.6, clearcoat: 0.08 }));
  body.add(torso);

  // Neck pivot drives nods and turns; the head sits on it.
  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.56, 0.0);
  body.add(headPivot);
  const head = new THREE.Group();
  head.position.set(0, R * 0.9, 0);
  head.scale.set(1.03, 0.97, 1);
  headPivot.add(head);
  const skinMat = toy(look.skin, { roughness: 0.5, clearcoat: 0.18 });

  let face = head;
  let Rf = R;
  if (kind === "lina") {
    const scarfMat = toy(look.scarf, { roughness: 0.72, clearcoat: 0.04 });
    const scarf = new THREE.Mesh(new THREE.SphereGeometry(R * 1.08, 48, 32), scarfMat);
    scarf.position.set(0, 0.04, -0.06);
    head.add(scarf);
    face = new THREE.Group();
    face.position.set(0, -0.02, 0.07);
    head.add(face);
    Rf = R * 0.9;
    face.add(new THREE.Mesh(new THREE.SphereGeometry(Rf, 48, 32), skinMat));
    const drapeMat = new THREE.MeshPhysicalMaterial({ color: look.scarf, roughness: 0.72, clearcoat: 0.04, side: THREE.DoubleSide });
    const drape = new THREE.Mesh(
      lathe(
        [
          [0.35, 0.3],
          [0.346, 0.4],
          [0.315, 0.49],
          [0.26, 0.57],
          [0.19, 0.64],
          [0.15, 0.7],
        ],
        { segments: 48, smooth: 24 },
      ),
      drapeMat,
    );
    body.add(drape);
    const pin = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 8), toy(C.yellow, { roughness: 0.25, clearcoat: 1 }));
    pin.position.set(0.15, -0.2, 0.25);
    head.add(pin);
  } else {
    head.add(new THREE.Mesh(new THREE.SphereGeometry(R, 56, 40), skinMat));
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.062, 20, 14), skinMat);
      ear.scale.set(0.55, 1, 0.8);
      ear.position.set(s * 0.302, -0.01, -0.01);
      head.add(ear);
    }
  }

  const faceRig = buildFace(face, Rf, {
    skin: look.skin,
    browColor: look.hair,
    lashes: kind === "lina",
    browThick: kind === "chef" ? 1.7 : 1,
  });

  if (kind === "karim") {
    head.add(curlyHair(R, look.hair, 11));
    head.add(glasses());
    // Hoodie: a soft hood roll around the neck and two drawstrings.
    const hood = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.065, 14, 40), toy(look.shirt, { roughness: 0.62, clearcoat: 0.05 }));
    hood.rotation.x = Math.PI / 2 - 0.25;
    hood.position.set(0, 0.6, -0.03);
    hood.scale.set(1, 1.12, 1);
    body.add(hood);
    for (const s of [-1, 1]) {
      const str = new THREE.Mesh(new THREE.CapsuleGeometry(0.011, 0.12, 4, 8), toy(C.paper, { roughness: 0.5 }));
      str.position.set(s * 0.06, 0.48, 0.27);
      str.rotation.x = -0.3;
      body.add(str);
    }
  }
  if (kind === "chef") {
    head.add(toque());
    head.add(mustache(Rf));
    const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.042, 12, 36), toy(C.blue, { roughness: 0.5, clearcoat: 0.2 }));
    scarf.rotation.x = Math.PI / 2 - 0.2;
    scarf.position.set(0, 0.585, 0.0);
    body.add(scarf);
    const knot = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.11, 16), toy(C.blue, { roughness: 0.5, clearcoat: 0.2 }));
    knot.position.set(0.0, 0.5, 0.235);
    knot.rotation.set(Math.PI + 0.35, 0, 0);
    body.add(knot);
    const btnMat = toy("#d9c9ad", { roughness: 0.35, clearcoat: 0.6 });
    for (const sx of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 8), btnMat);
        const y = 0.17 + i * 0.1;
        const rr = 0.33 - i * 0.012;
        const lon = sx * 0.3;
        b.position.set(Math.sin(lon) * rr, y, Math.cos(lon) * rr);
        body.add(b);
      }
    }
  }

  // Arms + hands.
  const sleeveMat = toy(look.shirt, { roughness: 0.6, clearcoat: 0.08 });
  const arms = [-1, 1].map((s) => {
    const noodle = new Noodle(0.068, 0.058, sleeveMat, 22, 12);
    body.add(noodle.mesh);
    const h = hand(look.skin);
    body.add(h.g);
    return { s, noodle, hand: h.g, finger: h.finger, shoulder: V3(s * SHOULDER[0], SHOULDER[1], SHOULDER[2]) };
  });

  const tmpA = V3();
  const tmpB = V3();
  const tmpC = V3();
  const zAxis = V3(0, 0, 1);

  function pose(p = {}) {
    const q = { ...DEFAULT_POSE, ...p };
    body.position.y = q.y;
    body.rotation.set(q.lean, q.turn, q.tilt);
    const s = q.squash;
    body.scale.set(1 + s * 0.45, 1 - s, 1 + s * 0.45);
    headPivot.rotation.set(q.headPitch, q.headYaw, q.headRoll);

    const wide = 1 + q.wide * 0.28;
    for (const e of faceRig.eyes) {
      placeOn(e.g, Rf, 0.06 + q.lookY * 0.09, e.s * 0.34 + q.lookX * 0.12, -0.012);
      e.g.scale.set(wide, wide * Math.max(0.07, 1 - q.blink), 1);
    }
    for (const b of faceRig.brows) {
      placeOn(b.g, Rf, 0.3 + q.brow * 0.075 + q.wide * 0.02, b.s * 0.34, 0.002);
      b.tilt.rotation.z = -b.s * q.browTilt;
    }
    const open = Math.max(0, Math.min(1, q.open));
    faceRig.smile.visible = open < 0.06;
    faceRig.open.visible = !faceRig.smile.visible;
    faceRig.open.scale.set(0.72 + 0.28 * open, Math.max(0.05, open), 1);

    for (const a of arms) {
      const H = a.s < 0 ? q.handL : q.handR;
      const B = a.s < 0 ? q.bendL : q.bendR;
      tmpA.set(...H);
      tmpB.copy(a.shoulder).add(tmpA).multiplyScalar(0.5).add(tmpC.set(...B));
      a.noodle.set(a.shoulder, tmpB, tmpA);
      a.hand.position.copy(tmpA);
      const t = a.noodle.tangentAtEnd(tmpC).normalize();
      a.hand.quaternion.setFromUnitVectors(zAxis, t);
      const pt = a.s < 0 ? q.pointL : q.pointR;
      a.finger.visible = pt > 0.02;
      a.finger.scale.set(1, 1, 1).multiplyScalar(Math.max(0.02, pt));
    }
  }
  pose();
  return { root, body, head, headPivot, torso, arms, pose, kind };
}
