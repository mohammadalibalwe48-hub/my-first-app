// Preview builders for the turntable harness, e.g.
//   node render.mjs --page src/preview.html --still 10 --scale 0.5 --query "module=world/previews.js&fn=karim,lina,chef&elev=8"
import { createCharacter } from "./characters.js";

function make(kind, p) {
  const c = createCharacter(kind);
  c.pose(p);
  c.root.userData.update = (f) => {
    const t = f / 30;
    c.pose({ ...p, blink: (f % 50) < 3 ? 1 : 0, headYaw: Math.sin(t * 1.3) * 0.2 });
  };
  return c.root;
}
export const karim = () => make("karim", { open: 0 });
export const lina = () => make("lina", { open: 0.8, wide: 0.5, brow: 0.6, handL: [-0.3, 0.8, 0.25], handR: [0.3, 0.8, 0.25], bendL: [-0.2, 0, 0], bendR: [0.2, 0, 0] });
export const chef = () => make("chef", { browTilt: 0.2, handR: [0.3, 0.35, 0.42], pointR: 1 });
export { hummus, kibbeh, coffee, juice } from "./food.js";
