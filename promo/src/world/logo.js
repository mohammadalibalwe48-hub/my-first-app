// The QR SYRIA logo in 3D, built from the same geometry as public/logo.svg:
// a 325-degree ring, a stroked fork rotated -42 degrees, an orange handle, and the
// R / SYRI / A wordmark. Units are SVG units (y flipped); scale the root to taste.
import * as THREE from "three";
import { SVGLoader } from "three/addons/loaders/SVGLoader.js";
import { C } from "../lib/materials.js";
import { R_PATH, A_PATH, A_TRI } from "./ui.js";

const CX = 104;
const CY = 103;

function shapesFrom(d, rule = "nonzero") {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg"><path d="${d}" fill-rule="${rule}"/></svg>`;
  const data = new SVGLoader().parse(svg);
  // createShapes honours fill-rule (evenodd counters in R and A); toShapes() relies on winding.
  return data.paths.flatMap((p) => SVGLoader.createShapes(p));
}

/** Diagonal two-stop gradient baked into vertex colours (matches the SVG gradients). */
function paint(geo, a, b) {
  geo.computeBoundingBox();
  const { min, max } = geo.boundingBox;
  const pos = geo.attributes.position;
  const ca = new THREE.Color(a);
  const cb = new THREE.Color(b);
  const col = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const u = (pos.getX(i) - min.x) / Math.max(1e-6, max.x - min.x);
    const v = (max.y - pos.getY(i)) / Math.max(1e-6, max.y - min.y);
    c.copy(ca).lerp(cb, Math.min(1, Math.max(0, (u + v) / 2)));
    col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  return geo;
}

function extrude(shapes, depth = 30, bevel = 4) {
  const geo = new THREE.ExtrudeGeometry(shapes, {
    depth,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel * 0.8,
    bevelSegments: 3,
    curveSegments: 18,
  });
  // SVG space is y-down: rotate 180 degrees about X (flips y and z, keeps winding).
  geo.scale(1, -1, -1);
  geo.translate(-CX, CY, 0);
  return geo;
}

const mat = (opts = {}) =>
  new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.32, clearcoat: 0.7, clearcoatRoughness: 0.18, ...opts });

export const RING_ARC = 488 / 86; // dash length / radius = 325 degrees

export function createLogo(wordmark, { markOnly = false } = {}) {
  const root = new THREE.Group();
  const mark = new THREE.Group();
  root.add(mark);

  const blue = mat();
  const orange = mat();
  const ink = new THREE.MeshPhysicalMaterial({ color: "#0d1219", roughness: 0.55, clearcoat: 0.35, clearcoatRoughness: 0.3 });

  // Ring: torus arc + round caps. Arc length 488 of 540 => 325 degrees, gap at lower right.
  const ring = new THREE.Group();
  mark.add(ring);
  const ringMesh = new THREE.Mesh(undefined, blue);
  ring.add(ringMesh);
  const capA = new THREE.Mesh(new THREE.SphereGeometry(9, 20, 14), blue);
  const capB = new THREE.Mesh(new THREE.SphereGeometry(9, 20, 14), blue);
  ring.add(capA, capB);
  const setArc = (arc, tube = 9) => {
    ringMesh.geometry?.dispose();
    // Start angle -90deg (6 o'clock) going clockwise on screen == negative direction.
    const g = new THREE.TorusGeometry(86, tube, 20, 160, arc);
    g.rotateZ(-Math.PI / 2 - arc);
    paint(g, C.blueBright, C.blueDeep);
    ringMesh.geometry = g;
    const a0 = -Math.PI / 2 - arc;
    const a1 = -Math.PI / 2;
    capA.position.set(Math.cos(a0) * 86, Math.sin(a0) * 86, 0);
    capB.position.set(Math.cos(a1) * 86, Math.sin(a1) * 86, 0);
    capA.scale.setScalar(tube / 9);
    capB.scale.setScalar(tube / 9);
  };
  setArc(RING_ARC);
  capA.geometry = paint(capA.geometry.clone(), C.blueBright, C.blueBright);
  capB.geometry = paint(capB.geometry.clone(), C.blueDeep, C.blueDeep);

  // Fork: stroked paths become tubes; rotated +42deg (SVG -42deg) about the mark centre.
  const fork = new THREE.Group();
  fork.rotation.z = (42 * Math.PI) / 180;
  mark.add(fork);
  const P = (x, y) => new THREE.Vector3(x - CX, -(y - CY), 0);
  const forkHead = new THREE.Group();
  fork.add(forkHead);
  const tube = (pts, closed = false) => {
    const curve = pts.length === 2 ? new THREE.LineCurve3(pts[0], pts[1]) : new THREE.CubicBezierCurve3(...pts);
    const g = new THREE.TubeGeometry(curve, pts.length === 2 ? 2 : 24, 5.4, 14, closed);
    return g;
  };
  const forkParts = [
    tube([P(74, 42), P(74, 76)]),
    tube([P(94, 34), P(94, 76)]),
    tube([P(114, 34), P(114, 76)]),
    tube([P(134, 42), P(134, 76)]),
    tube([P(74, 76), P(74, 93), P(87, 107), P(104, 107)]),
    tube([P(104, 107), P(121, 107), P(134, 93), P(134, 76)]),
    tube([P(104, 107), P(104, 117)]),
  ];
  const capPts = [P(74, 42), P(94, 34), P(114, 34), P(134, 42), P(104, 117)];
  const forkGeos = [...forkParts, ...capPts.map((p) => new THREE.SphereGeometry(5.4, 14, 10).translate(p.x, p.y, p.z))];
  for (const g of forkGeos) forkHead.add(new THREE.Mesh(paint(g, C.blueBright, C.blueDeep), blue));
  const handleGeo = paint(extrude(shapesFrom(HANDLE_PATH), 12, 3.5), C.amber, C.orangeDeep);
  handleGeo.translate(0, 0, 6);
  const handle = new THREE.Mesh(handleGeo, orange);
  fork.add(handle);

  // Wordmark letters, each pivoting at its own baseline centre for pop-in animation.
  const letters = [];
  const addLetter = (geo, material, extra = []) => {
    geo.computeBoundingBox();
    const bb = geo.boundingBox;
    const cx = (bb.min.x + bb.max.x) / 2;
    const by = bb.min.y;
    const g = new THREE.Group();
    g.position.set(cx, by, 0);
    geo.translate(-cx, -by, 0);
    g.add(new THREE.Mesh(geo, material));
    for (const [eg, em] of extra) {
      eg.translate(-cx, -by, 0);
      g.add(new THREE.Mesh(eg, em));
    }
    root.add(g);
    letters.push(g);
    return g;
  };
  if (!markOnly) {
    addLetter(paint(extrude(shapesFrom(R_PATH, "evenodd"), 34, 4), C.blueBright, C.blueDeep), blue);
    for (const l of wordmark) addLetter(extrude(shapesFrom(l.d), 34, 4), ink);
    const triGeo = paint(extrude(shapesFrom(A_TRI), 10, 2), C.amber, C.orangeDeep);
    triGeo.translate(0, 0, 4);
    addLetter(extrude(shapesFrom(A_PATH, "evenodd"), 34, 4), ink, [[triGeo, orange]]);
  }

  return { root, mark, ring, ringMesh, setArc, fork, forkHead, handle, letters, materials: { blue, orange, ink } };
}

const HANDLE_PATH = "M96 108h17l9 72c1 11-4 17-14 17s-16-6-15-17z";
