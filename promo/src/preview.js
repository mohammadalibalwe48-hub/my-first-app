// Turntable preview for any builder function, used while modelling props.
//   node render.mjs --page src/preview.html --still 0,30 --scale 0.5 \
//     --query "module=world/food.js&fn=createHummus,createKibbeh&elev=28&turn=1"
// A builder returns a THREE.Object3D; if it sets obj.userData.update(frame) the
// harness calls it every frame (so animated props can be previewed too).
import * as THREE from "three";
import { createStage } from "./lib/stage.js";
import { shadows } from "./lib/materials.js";
import { loadFonts } from "./lib/fonts.js";

const q = new URLSearchParams(location.search);
const scale = Number(q.get("scale") || 1);
const stage = createStage({ scale });
if (q.get("bg")) stage.scene.background = new THREE.Color(q.get("bg"));

await loadFonts();
const mod = await import(`./${q.get("module")}`);
const fns = (q.get("fn") || "default").split(",");
const args = q.get("args") ? JSON.parse(q.get("args")) : undefined;
const objects = [];
for (const name of fns) {
  const obj = await mod[name](args);
  shadows(obj, true, true);
  stage.scene.add(obj);
  objects.push(obj);
}

// Lay objects out in a row, resting on the floor.
const gap = Number(q.get("gap") || 0.25);
const boxes = objects.map((o) => new THREE.Box3().setFromObject(o));
const total = boxes.reduce((s, b) => s + (b.max.x - b.min.x), 0) + gap * (objects.length - 1);
let x = -total / 2;
objects.forEach((o, i) => {
  const b = boxes[i];
  const w = b.max.x - b.min.x;
  o.position.x += x - b.min.x;
  if (q.get("float") !== "1") o.position.y -= b.min.y;
  x += w + gap;
});
const all = new THREE.Box3();
objects.forEach((o) => all.expandByObject(o));
const sphere = all.getBoundingSphere(new THREE.Sphere());
stage.fitShadow(sphere.center, sphere.radius * 2.2);

const elev = THREE.MathUtils.degToRad(Number(q.get("elev") || 22));
const fov = THREE.MathUtils.degToRad(stage.camera.fov);
const dist = Number(q.get("dist") || (sphere.radius / Math.sin(fov / 2)) * 1.08);
const turn = q.get("turn") === "1";
const azim0 = THREE.MathUtils.degToRad(Number(q.get("azim") || 0));

window.__promo = {
  ready: true,
  renderFrame(f) {
    objects.forEach((o) => o.userData.update?.(f));
    const az = azim0 + (turn ? f * THREE.MathUtils.degToRad(3) : 0);
    stage.camera.position.set(
      sphere.center.x + Math.sin(az) * Math.cos(elev) * dist,
      sphere.center.y + Math.sin(elev) * dist,
      sphere.center.z + Math.cos(az) * Math.cos(elev) * dist,
    );
    stage.camera.lookAt(sphere.center);
    stage.render(f);
  },
};
