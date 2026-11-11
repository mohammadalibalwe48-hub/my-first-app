// Brand palette and the small family of materials every object is built from.
// Keeping the material vocabulary tiny is what makes the world feel designed.
import * as THREE from "three";

export const C = {
  // QR SYRIA logo colours
  blue: "#1561ff",
  blueDeep: "#0737ed",
  blueBright: "#0788ff",
  blueSoft: "#9cc4ff",
  orange: "#ff7a12",
  orangeDeep: "#ff4b18",
  amber: "#ff9b08",
  ink: "#111820",
  navy: "#0b1a44",
  // supporting neutrals and food tones
  cream: "#f4ebe0",
  paper: "#fffaf3",
  white: "#ffffff",
  sand: "#e8d9c4",
  wood: "#c98a52",
  woodDark: "#8d5a32",
  terracotta: "#d8693f",
  yellow: "#ffc93c",
  mint: "#35b37a",
  herb: "#3f9a45",
  blush: "#ff8f86",
  steel: "#c9ced6",
};

const cache = new Map();
const key = (...a) => JSON.stringify(a);

/** Soft vinyl-toy finish used for characters and most props. */
export function toy(color, { roughness = 0.42, clearcoat = 0.25, emissive = null } = {}) {
  const k = key("toy", color, roughness, clearcoat, emissive);
  if (!cache.has(k)) {
    cache.set(
      k,
      new THREE.MeshPhysicalMaterial({
        color,
        roughness,
        metalness: 0,
        clearcoat,
        clearcoatRoughness: 0.35,
        emissive: emissive ?? "#000000",
      }),
    );
  }
  return cache.get(k);
}

/** Matte surfaces (floors, paper, food bulk). Cheaper than physical. */
export function matte(color, { roughness = 0.8, map = null } = {}) {
  if (map) return new THREE.MeshStandardMaterial({ color, roughness, map });
  const k = key("matte", color, roughness);
  if (!cache.has(k)) cache.set(k, new THREE.MeshStandardMaterial({ color, roughness, metalness: 0 }));
  return cache.get(k);
}

/** Glossy glazed ceramic (plates, cups, tiles). */
export function ceramic(color, { roughness = 0.18 } = {}) {
  const k = key("ceramic", color, roughness);
  if (!cache.has(k)) {
    cache.set(k, new THREE.MeshPhysicalMaterial({ color, roughness, clearcoat: 1, clearcoatRoughness: 0.08 }));
  }
  return cache.get(k);
}

/** Brushed metal (pans, cutlery, phone frame). */
export function metal(color = C.steel, { roughness = 0.3 } = {}) {
  const k = key("metal", color, roughness);
  if (!cache.has(k)) cache.set(k, new THREE.MeshStandardMaterial({ color, roughness, metalness: 1 }));
  return cache.get(k);
}

/** Liquids / glossy food (oil, coffee, juice). */
export function glossy(color, { roughness = 0.08, opacity = 1 } = {}) {
  const k = key("glossy", color, roughness, opacity);
  if (!cache.has(k)) {
    cache.set(
      k,
      new THREE.MeshPhysicalMaterial({
        color,
        roughness,
        clearcoat: 1,
        clearcoatRoughness: 0.03,
        transparent: opacity < 1,
        opacity,
      }),
    );
  }
  return cache.get(k);
}

/** Fake glass without transmission (transmission doubles render cost). */
export function glass({ tint = "#ffffff", opacity = 0.28 } = {}) {
  const k = key("glass", tint, opacity);
  if (!cache.has(k)) {
    cache.set(
      k,
      new THREE.MeshPhysicalMaterial({
        color: tint,
        roughness: 0.04,
        metalness: 0,
        clearcoat: 1,
        transparent: true,
        opacity,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
  }
  return cache.get(k);
}

/** Self-lit material for screens, glows and the scan beam. */
export function unlit(color, { map = null, opacity = 1, toneMapped = true } = {}) {
  return new THREE.MeshBasicMaterial({ color, map, transparent: opacity < 1 || !!map, opacity, toneMapped });
}

/** Enable shadows on every mesh under `obj`. */
export function shadows(obj, cast = true, receive = true) {
  obj.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = cast;
      o.receiveShadow = receive;
    }
  });
  return obj;
}
