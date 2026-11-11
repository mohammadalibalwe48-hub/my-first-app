// Geometry and texture helpers shared by every prop and character.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

/** Mulberry32: deterministic PRNG so every render scatters props identically. */
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Lathe from [radius, height] pairs listed bottom-to-top, optionally spline-smoothed. */
export function lathe(points, { segments = 48, smooth = 0, phiStart = 0, phiLength = Math.PI * 2 } = {}) {
  let pts = points.map(([r, y]) => new THREE.Vector2(Math.max(0, r), y));
  if (smooth) pts = new THREE.SplineCurve(pts).getPoints(smooth).map((p) => new THREE.Vector2(Math.max(0, p.x), p.y));
  return new THREE.LatheGeometry(pts, segments, phiStart, phiLength);
}

/** Merge geometries after baking each one's transform (all must share attributes). */
export function merge(parts) {
  return mergeGeometries(
    parts.map(({ geo, pos = [0, 0, 0], rot = [0, 0, 0], scl = [1, 1, 1] }) => {
      const m = new THREE.Matrix4().compose(
        new THREE.Vector3(...pos),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)),
        new THREE.Vector3(...(Array.isArray(scl) ? scl : [scl, scl, scl])),
      );
      const g = geo.index ? geo.clone() : geo.clone();
      return g.applyMatrix4(m);
    }),
  );
}

/**
 * Rubber-hose limb: a tube along a quadratic bezier, rebuilt in place each frame.
 * Radius tapers from r0 at the start to r1 at the end.
 */
export class Noodle {
  constructor(r0, r1, material, segments = 22, radial = 12) {
    this.r0 = r0;
    this.r1 = r1;
    this.seg = segments;
    this.rad = radial;
    this.geo = new THREE.TubeGeometry(new THREE.LineCurve3(V3(0, 0, 0), V3(0, 1, 0)), segments, r0, radial, false);
    this.mesh = new THREE.Mesh(this.geo, material);
    this.mesh.frustumCulled = false;
    this.curve = new THREE.QuadraticBezierCurve3(V3(), V3(), V3());
    this._p = V3();
    this._n = V3();
  }
  set(a, b, c) {
    this.curve.v0.copy(a);
    this.curve.v1.copy(b);
    this.curve.v2.copy(c);
    const frames = this.curve.computeFrenetFrames(this.seg, false);
    const pos = this.geo.attributes.position;
    const nor = this.geo.attributes.normal;
    let k = 0;
    for (let i = 0; i <= this.seg; i++) {
      const t = i / this.seg;
      this.curve.getPointAt(t, this._p);
      const r = this.r0 + (this.r1 - this.r0) * t;
      const N = frames.normals[i];
      const B = frames.binormals[i];
      for (let j = 0; j <= this.rad; j++) {
        const v = (j / this.rad) * Math.PI * 2;
        const s = Math.sin(v);
        const c2 = -Math.cos(v);
        this._n.set(c2 * N.x + s * B.x, c2 * N.y + s * B.y, c2 * N.z + s * B.z).normalize();
        nor.setXYZ(k, this._n.x, this._n.y, this._n.z);
        pos.setXYZ(k, this._p.x + r * this._n.x, this._p.y + r * this._n.y, this._p.z + r * this._n.z);
        k++;
      }
    }
    pos.needsUpdate = true;
    nor.needsUpdate = true;
    this.geo.computeBoundingSphere();
  }
  tangentAtEnd(out = V3()) {
    return this.curve.getTangentAt(1, out);
  }
}

/** Rounded-rectangle outline centred on the origin. */
export function roundedRectShape(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r);
  s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + h);
  s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r);
  s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}

/** Flat rounded rectangle whose UVs span 0..1 (for screens and labels). */
export function roundedRectGeometry(w, h, r, curveSegments = 10) {
  const g = new THREE.ShapeGeometry(roundedRectShape(w, h, r), curveSegments);
  const uv = g.attributes.uv;
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) + w / 2) / w, (pos.getY(i) + h / 2) / h);
  return g;
}

/** Canvas-backed texture. */
export function canvasTex(w, h, { srgb = true, anisotropy = 8 } = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  const tex = new THREE.CanvasTexture(canvas);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return { canvas, ctx, tex };
}

let blobTexture = null;
/** Soft contact shadow that grounds objects better than the shadow map alone. */
export function blobShadow(rx, rz = rx, opacity = 0.32, color = "#3b220f") {
  if (!blobTexture) {
    const { ctx, tex } = canvasTex(128, 128, { srgb: false });
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      g.addColorStop(t, `rgba(255,255,255,${Math.pow(1 - t, 2.2).toFixed(3)})`);
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    blobTexture = tex;
  }
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(rx * 2, rz * 2),
    new THREE.MeshBasicMaterial({ color, alphaMap: blobTexture, transparent: true, opacity, depthWrite: false }),
  );
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = 2;
  m.userData.noShadow = true;
  return m;
}

/** Push every vertex along its normal by a deterministic noise amount (crusty food, lumpy dough). */
export function lumpify(geo, amount = 0.01, freq = 18, seed = 1) {
  const pos = geo.attributes.position;
  geo.computeVertexNormals();
  const nor = geo.attributes.normal;
  const p = V3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    const n =
      Math.sin(p.x * freq + seed) * Math.sin(p.y * freq * 1.3 + seed * 2.1) * Math.sin(p.z * freq * 0.9 + seed * 0.7) +
      0.5 * Math.sin(p.x * freq * 2.7 - seed) * Math.sin(p.z * freq * 2.3 + seed);
    pos.setXYZ(i, p.x + nor.getX(i) * n * amount, p.y + nor.getY(i) * n * amount, p.z + nor.getZ(i) * n * amount);
  }
  geo.computeVertexNormals();
  return geo;
}

/** Paint a vertical/diagonal gradient into vertex colours (material must set vertexColors). */
export function gradientColors(geo, from, to, axis = [1, 1, 0]) {
  geo.computeBoundingBox();
  const pos = geo.attributes.position;
  const a = new THREE.Color(from);
  const b = new THREE.Color(to);
  const ax = V3(...axis).normalize();
  const bb = geo.boundingBox;
  const corners = [bb.min, bb.max].flatMap((u) => [bb.min, bb.max].map((v) => V3(u.x, v.y, 0)));
  const proj = corners.map((c) => c.dot(ax));
  const lo = Math.min(...proj);
  const hi = Math.max(...proj);
  const col = new Float32Array(pos.count * 3);
  const p = V3();
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    // Logo gradients run top-left -> bottom-right in SVG space (y down), so flip y here.
    const t = (V3(p.x, -p.y, 0).dot(ax) - lo) / Math.max(1e-6, hi - lo);
    c.copy(a).lerp(b, Math.min(1, Math.max(0, t)));
    col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  return geo;
}
