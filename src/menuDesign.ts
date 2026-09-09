/* ============================================================================
   Menu Design engine — owner-authored storefront theming.
   Persists as JSONB on restaurants.menu_design and is applied to the public
   storefront as scoped CSS custom-properties + data-* attributes on .cx root.
   ========================================================================== */
import type { MenuDesign } from "./domain";

export const DEFAULT_MENU_DESIGN: MenuDesign = {
  version: 1,
  name: "الكلاسيكية الداكنة",
  palette: {
    accent: "#e25b2b",
    brand: "#063239",
    brandDeep: "#04242A",
    action: "#F0002F",
    actionDeep: "#9E0015",
    glow: "#FFC400",
    canvas: "#F4F3F1",
    surface: "#FFFFFF",
    ink: "#080711",
    line: "#E2E2E2",
  },
  type: {
    display: "Changa",
    body: "Tajawal",
    weight: 700,
    scale: "regular",
  },
  layout: {
    hero: "editorial",
    cards: "photo",
    columns: "auto",
    ratio: "4:3",
    tabs: "pill",
    price: "action",
    add: "solid",
    radius: "soft",
    density: "cozy",
    shadow: "soft",
  },
  content: {
    subtitle: true,
    location: true,
    stats: true,
    heroCats: true,
    english: true,
    descriptions: true,
    tags: true,
    popularFlag: true,
    modifierHint: true,
    catalogueNote: true,
    liveBadge: true,
    bannerText: "",
    bannerOn: false,
    bannerTone: "brand",
    logoUrl: "",
    coverUrl: "",
  },
};

/* ---- curated palette presets (safe, art-directed combos) ---------------- */

export type PalettePreset = {
  id: string;
  label: string;
  labelEn: string;
  swatches: string[];
  palette: MenuDesign["palette"];
};

export const PALETTE_PRESETS: PalettePreset[] = [
  {
    id: "damascus-night",
    label: "دمشق ليلاً",
    labelEn: "Damascus Night",
    swatches: ["#063239", "#F0002F", "#FFC400", "#F4F3F1"],
    palette: {
      accent: "#F0002F",
      brand: "#063239",
      brandDeep: "#04242A",
      action: "#F0002F",
      actionDeep: "#9E0015",
      glow: "#FFC400",
      canvas: "#F4F3F1",
      surface: "#FFFFFF",
      ink: "#080711",
      line: "#E2E2E2",
    },
  },
  {
    id: "silk-bistro",
    label: "بسترو حريري",
    labelEn: "Silk Bistro",
    swatches: ["#12372A", "#436850", "#F2EAD3", "#ADBC9F"],
    palette: {
      accent: "#ADBC9F",
      brand: "#12372A",
      brandDeep: "#0B241C",
      action: "#436850",
      actionDeep: "#24462F",
      glow: "#F2EAD3",
      canvas: "#FBF8F1",
      surface: "#FFFFFF",
      ink: "#122019",
      line: "#E4DECD",
    },
  },
  {
    id: "terracotta-table",
    label: "مائدة تراكوتا",
    labelEn: "Terracotta Table",
    swatches: ["#4E1F12", "#E4572E", "#F6C445", "#FDF0E7"],
    palette: {
      accent: "#F6C445",
      brand: "#4E1F12",
      brandDeep: "#36130A",
      action: "#E4572E",
      actionDeep: "#A73314",
      glow: "#F6C445",
      canvas: "#FDF0E7",
      surface: "#FFFFFF",
      ink: "#2E140B",
      line: "#EFD6C4",
    },
  },
  {
    id: "coastal",
    label: "ساحلي هادئ",
    labelEn: "Coastal Calm",
    swatches: ["#1D5B66", "#0E3A46", "#F4C95D", "#EAF2F4"],
    palette: {
      accent: "#F4C95D",
      brand: "#1D5B66",
      brandDeep: "#0E3A46",
      action: "#D4554D",
      actionDeep: "#963C36",
      glow: "#F4C95D",
      canvas: "#EAF2F4",
      surface: "#FFFFFF",
      ink: "#102B30",
      line: "#D3E2E5",
    },
  },
  {
    id: "berry-suite",
    label: "جناح التوت",
    labelEn: "Berry Suite",
    swatches: ["#3D1A2B", "#6D2E46", "#E3B23C", "#F7EDF2"],
    palette: {
      accent: "#E3B23C",
      brand: "#3D1A2B",
      brandDeep: "#2A0F1C",
      action: "#8E2C48",
      actionDeep: "#5C1A2E",
      glow: "#E3B23C",
      canvas: "#F7EDF2",
      surface: "#FFFFFF",
      ink: "#2B1120",
      line: "#EBD9E1",
    },
  },
  {
    id: "ink-gold",
    label: "حبر وذهب",
    labelEn: "Ink & Gold",
    swatches: ["#101820", "#E6B31E", "#CF142B", "#F7F5F0"],
    palette: {
      accent: "#E6B31E",
      brand: "#101820",
      brandDeep: "#070B10",
      action: "#CF142B",
      actionDeep: "#93000E",
      glow: "#E6B31E",
      canvas: "#F7F5F0",
      surface: "#FFFFFF",
      ink: "#101820",
      line: "#E3DDD0",
    },
  },
  {
    id: "olive-garden",
    label: "حديقة الزيتون",
    labelEn: "Olive Garden",
    swatches: ["#3C4F2F", "#2E3D24", "#D5A021", "#F6F4EC"],
    palette: {
      accent: "#D5A021",
      brand: "#3C4F2F",
      brandDeep: "#26341D",
      action: "#A63D2F",
      actionDeep: "#7C2A20",
      glow: "#D5A021",
      canvas: "#F6F4EC",
      surface: "#FFFFFF",
      ink: "#22291B",
      line: "#E1DECF",
    },
  },
  {
    id: "monochrome",
    label: "أبيض وأسود",
    labelEn: "Studio Mono",
    swatches: ["#0A0A0A", "#E30613", "#FFC400", "#FFFFFF"],
    palette: {
      accent: "#E30613",
      brand: "#0A0A0A",
      brandDeep: "#000000",
      action: "#E30613",
      actionDeep: "#9E0015",
      glow: "#FFC400",
      canvas: "#FFFFFF",
      surface: "#FFFFFF",
      ink: "#0A0A0A",
      line: "#DDDDDD",
    },
  },
];

/* ---- luminance helpers --------------------------------------------------- */

const clamp255 = (n: number) => Math.max(0, Math.min(255, n));
const channel = (hex: string, i: number) => {
  const h = hex.replace("#", "");
  if (h.length === 3) {
    const c = h[i];
    return parseInt(c + c, 16);
  }
  return parseInt(h.slice(i * 2, i * 2 + 2), 16);
};

export function hexLuminance(hex: string): number {
  try {
    const r = channel(hex, 0) / 255;
    const g = channel(hex, 1) / 255;
    const b = channel(hex, 2) / 255;
    const lin = (v: number) =>
      v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  } catch {
    return 0;
  }
}

export const isLight = (hex: string) => hexLuminance(hex) > 0.5;
export const onColor = (hex: string) => (isLight(hex) ? "#080711" : "#FFFFFF");

export const shade = (hex: string, amount: number): string => {
  try {
    const r = clamp255(channel(hex, 0) + amount);
    const g = clamp255(channel(hex, 1) + amount);
    const b = clamp255(channel(hex, 2) + amount);
    return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
  } catch {
    return hex;
  }
};

/* ---- deep-merge a raw persisted design over defaults --------------------- */

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

const pick = <T,>(obj: Record<string, unknown>, key: string, fallback: T): T => {
  const value = obj[key];
  return value === undefined || value === null ? fallback : (value as T);
};

export function normalizeMenuDesign(raw: unknown): MenuDesign {
  const d = DEFAULT_MENU_DESIGN;
  if (!isRecord(raw)) return d;
  const palette = isRecord(raw.palette) ? raw.palette : {};
  const type = isRecord(raw.type) ? raw.type : {};
  const layout = isRecord(raw.layout) ? raw.layout : {};
  const content = isRecord(raw.content) ? raw.content : {};
  const str = (v: unknown, fb: string) =>
    typeof v === "string" && v.trim() ? v.trim() : fb;
  const bool = (v: unknown, fb: boolean) =>
    typeof v === "boolean" ? v : fb;

  const normalized: MenuDesign = {
    version: 1,
    name: str(raw.name, d.name),
    palette: {
      accent: str(palette.accent, d.palette.accent),
      brand: str(palette.brand, d.palette.brand),
      brandDeep: str(palette.brandDeep, d.palette.brandDeep),
      action: str(palette.action, d.palette.action),
      actionDeep: str(palette.actionDeep, d.palette.actionDeep),
      glow: str(palette.glow, d.palette.glow),
      canvas: str(palette.canvas, d.palette.canvas),
      surface: str(palette.surface, d.palette.surface),
      ink: str(palette.ink, d.palette.ink),
      line: str(palette.line, d.palette.line),
    },
    type: {
      display: (["Changa", "Cairo", "Oswald", "Almarai", "Readex Pro", "Noto Kufi Arabic"].includes(String(type.display)) ? type.display : d.type.display) as MenuDesign["type"]["display"],
      body: (["Tajawal", "Inter", "Cairo", "Rubik", "Almarai", "IBM Plex Sans Arabic"].includes(String(type.body)) ? type.body : d.type.body) as MenuDesign["type"]["body"],
      weight: ([600, 700, 800].includes(Number(type.weight)) ? Number(type.weight) : d.type.weight) as MenuDesign["type"]["weight"],
      scale: (["compact", "regular", "editorial"].includes(String(type.scale)) ? type.scale : d.type.scale) as MenuDesign["type"]["scale"],
    },
    layout: {
      hero: (["editorial", "cover", "minimal"].includes(String(layout.hero)) ? layout.hero : d.layout.hero) as MenuDesign["layout"]["hero"],
      cards: (["photo", "list"].includes(String(layout.cards)) ? layout.cards : d.layout.cards) as MenuDesign["layout"]["cards"],
      columns: (["auto", "two", "three", "four"].includes(String(layout.columns)) ? layout.columns : d.layout.columns) as MenuDesign["layout"]["columns"],
      ratio: (["4:3", "square", "3:2", "16:9"].includes(String(layout.ratio)) ? layout.ratio : d.layout.ratio) as MenuDesign["layout"]["ratio"],
      tabs: (["pill", "line"].includes(String(layout.tabs)) ? layout.tabs : d.layout.tabs) as MenuDesign["layout"]["tabs"],
      price: (["action", "ink"].includes(String(layout.price)) ? layout.price : d.layout.price) as MenuDesign["layout"]["price"],
      add: (["solid", "soft", "outline"].includes(String(layout.add)) ? layout.add : d.layout.add) as MenuDesign["layout"]["add"],
      radius: (["sharp", "soft", "round"].includes(String(layout.radius)) ? layout.radius : d.layout.radius) as MenuDesign["layout"]["radius"],
      density: (["compact", "cozy", "roomy"].includes(String(layout.density)) ? layout.density : d.layout.density) as MenuDesign["layout"]["density"],
      shadow: (["flat", "soft", "deep"].includes(String(layout.shadow)) ? layout.shadow : d.layout.shadow) as MenuDesign["layout"]["shadow"],
    },
    content: {
      subtitle: bool(content.subtitle, d.content.subtitle),
      location: bool(content.location, d.content.location),
      stats: bool(content.stats, d.content.stats),
      heroCats: bool(content.heroCats, d.content.heroCats),
      english: bool(content.english, d.content.english),
      descriptions: bool(content.descriptions, d.content.descriptions),
      tags: bool(content.tags, d.content.tags),
      popularFlag: bool(content.popularFlag, d.content.popularFlag),
      modifierHint: bool(content.modifierHint, d.content.modifierHint),
      catalogueNote: bool(content.catalogueNote, d.content.catalogueNote),
      liveBadge: bool(content.liveBadge, d.content.liveBadge),
      bannerText: typeof content.bannerText === "string" ? content.bannerText.slice(0, 160) : "",
      bannerOn: bool(content.bannerOn, d.content.bannerOn),
      bannerTone: (["ink", "glow", "action", "brand"].includes(String(content.bannerTone)) ? content.bannerTone : d.content.bannerTone) as MenuDesign["content"]["bannerTone"],
      logoUrl: str(content.logoUrl, ""),
      coverUrl: str(content.coverUrl, ""),
    },
  };
  return normalized;
}

/* ---- map design to scoped CSS custom properties --------------------------- */

const mix = (a: string, b: string, aPct: number) =>
  `color-mix(in srgb, ${a} ${aPct}%, ${b})`;

export function menuDesignCssVars(
  d: MenuDesign,
  accentFallback?: string,
): Record<string, string> {
  const p = d.palette;
  const onBrand = onColor(p.brand);
  const onBrandDeep = onColor(p.brandDeep);
  const onAction = onColor(p.action);
  const onInk = onColor(p.ink);
  const accent = accentFallback || p.accent;
  return {
    "--cafe-accent": accent,
    "--paper": p.canvas,
    "--paper-2": mix(p.canvas, p.surface, 72),
    "--bg": p.canvas,
    "--bg-soft": mix(p.canvas, p.surface, 82),
    "--surface": p.surface,
    "--surface-2": mix(p.surface, p.canvas, 46),
    "--surface-3": mix(p.surface, p.canvas, 72),
    "--ink": p.ink,
    "--text": p.ink,
    "--text-2": mix(p.ink, "transparent", 72),
    "--text-3": mix(p.ink, "transparent", 56),
    "--text-faint": mix(p.ink, "transparent", 55),
    "--line": p.line,
    "--border": p.line,
    "--line-2": mix(p.ink, "transparent", 14),
    "--line-strong": p.ink,
    "--border-soft": mix(p.ink, "transparent", 12),
    "--teal": p.brand,
    "--teal-2": mix(p.brand, p.surface, 78),
    "--teal-3": mix(p.brand, p.surface, 56),
    "--teal-deep": p.brandDeep,
    "--navy": p.brand,
    "--navy-2": mix(p.brand, p.surface, 78),
    "--red": p.action,
    "--red-2": mix(p.action, p.surface, 74),
    "--red-deep": p.actionDeep,
    "--danger": p.actionDeep,
    "--gold": p.action,
    "--gold-light": mix(p.action, p.surface, 74),
    "--gold-deep": p.actionDeep,
    "--gold-dim": mix(p.action, "transparent", 10),
    "--yellow": p.glow,
    "--yellow-2": mix(p.glow, p.surface, 70),
    "--star": p.glow,
    "--star-soft": mix(p.glow, "transparent", 20),
    "--on-brand": onBrand,
    "--on-brand-deep": onBrandDeep,
    "--on-action": onAction,
    "--on-ink": onInk,
    "--muted-brand": mix(onBrand, "transparent", 74),
    "--faint-brand": mix(onBrand, "transparent", 56),
    "--muted-action": mix(onAction, "transparent", 76),
    "--font-display": cssFontStack(d.type.display),
    "--font-body": cssFontStack(d.type.body),
  };
}

/* ---- fonts ---------------------------------------------------------------- */

export function cssFontStack(family: string): string {
  const latinOnly = family === "Oswald" || family === "Inter" || family === "Rubik";
  if (latinOnly) {
    return `"${family}", "Tajawal", system-ui, sans-serif`;
  }
  return `"${family}", "Tajawal", "Inter", system-ui, sans-serif`;
}

const GOOGLE_FONTS: Record<string, string> = {
  Changa: "Changa:wght@500;600;700;800",
  Cairo: "Cairo:wght@500;600;700;800;900",
  Oswald: "Oswald:wght@500;600;700",
  Almarai: "Almarai:wght@400;700;800",
  "Readex Pro": "Readex+Pro:wght@400;500;600;700",
  "Noto Kufi Arabic": "Noto+Kufi+Arabic:wght@400;500;600;700;800",
  Tajawal: "Tajawal:wght@400;500;700;800",
  Inter: "Inter:wght@400;500;600;700",
  Rubik: "Rubik:wght@400;500;600;700;800",
  "IBM Plex Sans Arabic": "IBM+Plex+Sans+Arabic:wght@400;500;600;700",
};

let injected = new Set<string>();

export function ensureGoogleFonts(design: MenuDesign): void {
  if (typeof document === "undefined") return;
  const needed = [design.type.display, design.type.body];
  for (const family of needed) {
    const spec = GOOGLE_FONTS[family];
    if (!spec || injected.has(family)) continue;
    injected.add(family);
    const href = `https://fonts.googleapis.com/css2?family=${spec}&display=swap`;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }
}

/* ---- data-* flags driven by design ---------------------------------------- */

type AttrMap = Record<string, string>;

export function menuDesignAttrs(d: MenuDesign): AttrMap {
  const c = d.content;
  const b = (v: boolean) => (v ? "1" : "0");
  return {
    "data-cd": "1",
    "data-cd-hero": d.layout.hero,
    "data-cd-cards": d.layout.cards,
    "data-cd-columns": d.layout.columns,
    "data-cd-ratio": d.layout.ratio,
    "data-cd-tabs": d.layout.tabs,
    "data-cd-price": d.layout.price,
    "data-cd-add": d.layout.add,
    "data-cd-radius": d.layout.radius,
    "data-cd-density": d.layout.density,
    "data-cd-shadow": d.layout.shadow,
    "data-cd-scale": d.type.scale,
    "data-cd-weight": String(d.type.weight),
    "data-cd-show-subtitle": b(c.subtitle),
    "data-cd-show-location": b(c.location),
    "data-cd-show-stats": b(c.stats),
    "data-cd-show-cats": b(c.heroCats),
    "data-cd-show-en": b(c.english),
    "data-cd-show-desc": b(c.descriptions),
    "data-cd-show-tags": b(c.tags),
    "data-cd-show-flag": b(c.popularFlag),
    "data-cd-show-gear": b(c.modifierHint),
    "data-cd-show-foot": b(c.catalogueNote),
    "data-cd-show-live": b(c.liveBadge),
  };
}
