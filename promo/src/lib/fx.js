// Stateless particle effects: every particle's position is a closed-form
// function of the frame, so any frame renders identically in isolation.
import * as THREE from "three";
import { canvasTex, rng } from "./shapes.js";
import { clamp, ease, invLerp, lerp } from "./anim.js";

let SOFT;
let SPARK;
function softTex() {
  if (SOFT) return SOFT;
  const { ctx, tex } = canvasTex(128, 128);
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.45, "rgba(255,255,255,0.45)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return (SOFT = tex);
}
function sparkTex() {
  if (SPARK) return SPARK;
  const { ctx, tex } = canvasTex(128, 128);
  ctx.translate(64, 64);
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 ? 13 : 60;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
  return (SPARK = tex);
}

/** Looping wisps of steam rising from `origin` (local to parent). */
export class Steam {
  constructor(parent, origin, { count = 9, seed = 1, size = 0.09, rise = 0.42, life = 54, opacity = 0.32 } = {}) {
    this.origin = origin;
    this.opts = { size, rise, life, opacity };
    const r = rng(seed);
    this.items = Array.from({ length: count }, (_, i) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTex(), color: "#ffffff", transparent: true, depthWrite: false, opacity: 0 }));
      s.renderOrder = 5;
      parent.add(s);
      return { s, phase: i / count + r() * 0.05, sway: r() * 6, dx: (r() - 0.5) * 0.05 };
    });
  }
  update(f, amount = 1) {
    const { size, rise, life, opacity } = this.opts;
    for (const it of this.items) {
      const age = (((f / life + it.phase) % 1) + 1) % 1;
      it.s.position.set(
        this.origin.x + it.dx + Math.sin(age * 5 + it.sway) * 0.03 * age,
        this.origin.y + age * rise,
        this.origin.z + Math.cos(age * 4 + it.sway) * 0.02 * age,
      );
      it.s.scale.setScalar(size * (0.5 + age * 1.5));
      it.s.material.opacity = Math.sin(age * Math.PI) * opacity * amount;
      it.s.visible = amount > 0.001;
    }
  }
}

/** One-shot burst of sparkles/confetti fired at frame t0 from origin. */
export class Burst {
  constructor(parent, { count = 12, seed = 1, colors = ["#ffffff"], size = 0.06, speed = 0.5, life = 22, up = 0.6, spread = 1, star = true } = {}) {
    const r = rng(seed);
    this.opts = { size, speed, life };
    this.items = Array.from({ length: count }, () => {
      const s = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: star ? sparkTex() : softTex(), color: colors[Math.floor(r() * colors.length)], transparent: true, depthWrite: false, opacity: 0, toneMapped: false }),
      );
      s.renderOrder = 6;
      parent.add(s);
      const a = r() * Math.PI * 2;
      const el = (r() * 0.9 + 0.1) * up;
      const dir = new THREE.Vector3(Math.cos(a) * spread, el, Math.sin(a) * spread).normalize();
      return { s, dir, k: 0.6 + r() * 0.6, rot: r() * 6, spin: (r() - 0.5) * 0.3 };
    });
  }
  update(f, t0, origin) {
    const { size, speed, life } = this.opts;
    for (const it of this.items) {
      const t = (f - t0) / (life * it.k);
      const on = t > 0 && t < 1;
      it.s.visible = on;
      if (!on) continue;
      const d = ease.outCubic(t) * speed * it.k;
      it.s.position.copy(origin).addScaledVector(it.dir, d);
      it.s.position.y -= t * t * 0.08;
      it.s.material.rotation = it.rot + t * it.spin * 10;
      it.s.material.opacity = 1 - ease.inQuad(t);
      it.s.scale.setScalar(size * (1 - t * 0.6));
    }
  }
}

/** Expanding ring on a surface (landing dust / tap ripple). */
export class Ripple {
  constructor(parent, { color = "#ffffff", opacity = 0.6, life = 16, size = 0.4 } = {}) {
    this.mesh = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 48), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
    this.mesh.renderOrder = 4;
    this.opts = { opacity, life, size };
    parent.add(this.mesh);
  }
  update(f, t0) {
    const t = (f - t0) / this.opts.life;
    this.mesh.visible = t > 0 && t < 1;
    if (!this.mesh.visible) return;
    this.mesh.scale.setScalar(this.opts.size * ease.outCubic(t));
    this.mesh.material.opacity = this.opts.opacity * (1 - t);
  }
}
