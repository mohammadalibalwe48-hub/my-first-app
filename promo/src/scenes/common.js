// Small helpers shared by the scene modules: camera blocking, gaze, blinks, impacts.
import * as THREE from "three";
import { clamp } from "../lib/anim.js";

const _m = new THREE.Matrix4();
const Y = new THREE.Vector3(0, 1, 0);

export function camQuat(pos, target, up = Y, out = new THREE.Quaternion()) {
  _m.lookAt(pos, target, up);
  return out.setFromRotationMatrix(_m);
}

export function setCam(cam, pos, target, { up = Y, fov = null } = {}) {
  cam.position.copy(pos);
  cam.quaternion.copy(camQuat(pos, target, up));
  if (fov && cam.fov !== fov) {
    cam.fov = fov;
    cam.updateProjectionMatrix();
  }
}

/** Interpolate between two camera setups: position lerp (+ optional lift), orientation slerp. */
export function blendCam(cam, a, b, t, { arc = 0 } = {}) {
  const qa = camQuat(a.pos, a.target, a.up ?? Y);
  const qb = camQuat(b.pos, b.target, b.up ?? Y);
  cam.position.copy(a.pos).lerp(b.pos, t);
  cam.position.y += Math.sin(t * Math.PI) * arc;
  cam.quaternion.copy(qa).slerp(qb, t);
}

const _hp = new THREE.Vector3();
/** Head yaw/pitch (radians, character space) needed to look at a world point. */
export function aim(ch, target) {
  ch.root.updateMatrixWorld(true);
  ch.root.localToWorld(_hp.set(0, 0.84, 0));
  const dx = target.x - _hp.x;
  const dy = target.y - _hp.y;
  const dz = target.z - _hp.z;
  let yaw = Math.atan2(dx, dz) - ch.root.rotation.y;
  yaw = Math.atan2(Math.sin(yaw), Math.cos(yaw));
  const pitch = -Math.atan2(dy, Math.hypot(dx, dz));
  return { yaw: clamp(yaw, -1.1, 1.1), pitch: clamp(pitch, -0.7, 0.7) };
}

/** Natural blink pattern: a quick close/open every few seconds, staggered per seed. */
export function blinkAt(f, seed = 0) {
  const period = 83 + ((seed * 17) % 40);
  const ph = (((f + seed * 29) % period) + period) % period;
  return ph < 5 ? clamp(1 - Math.abs(ph - 2) / 2.5) : 0;
}

/** Contact squash: 1 at impact, then a decaying wobble (t in frames). */
export const impact = (t, freq = 3.2, decay = 7) => (t < 0 ? 0 : Math.exp((-decay * t) / 30) * Math.cos((2 * Math.PI * freq * t) / 30));
