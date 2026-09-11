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
    tracking: "normal",
    leading: "normal",
    headingCase: "normal",
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
    mode: "light",
    header: "solid",
    imageFit: "cover",
    border: "hairline",
  },
  effects: {
    pattern: "none",
    gradientHero: false,
    glow: false,
    grain: true,
    motion: "normal",
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
    rating: false,
    hours: false,
    socials: false,
    footer: false,
    bannerText: "",
    bannerOn: false,
    bannerTone: "brand",
    logoUrl: "",
    coverUrl: "",
    ratingValue: 4.8,
    instagram: "",
    facebook: "",
    whatsappLabel: "",
    footerText: "",
    hoursText: "يومياً · ٩:٠٠ ص — ١١:٠٠ م",
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
  {
    id: "saffron-souk",
    label: "سوق الزعفران",
    labelEn: "Saffron Souk",
    swatches: ["#5B2A0B", "#D99A2B", "#B3271E", "#FBF3E4"],
    palette: {
      accent: "#B3271E",
      brand: "#5B2A0B",
      brandDeep: "#3B1A05",
      action: "#B3271E",
      actionDeep: "#7C160F",
      glow: "#D99A2B",
      canvas: "#FBF3E4",
      surface: "#FFFFFF",
      ink: "#2C1607",
      line: "#EBD9BC",
    },
  },
  {
    id: "mint-lab",
    label: "مختبر النعناع",
    labelEn: "Mint Lab",
    swatches: ["#0F3D3E", "#2EC4B6", "#FF9F1C", "#F6FBFB"],
    palette: {
      accent: "#FF9F1C",
      brand: "#0F3D3E",
      brandDeep: "#092A2B",
      action: "#2EC4B6",
      actionDeep: "#1E8C82",
      glow: "#FF9F1C",
      canvas: "#F6FBFB",
      surface: "#FFFFFF",
      ink: "#0B2B2C",
      line: "#CDE9E7",
    },
  },
  {
    id: "rose-eclair",
    label: "إكلير وردي",
    labelEn: "Rosé Éclair",
    swatches: ["#5A1F33", "#C96A8B", "#E8B23A", "#FFF3F6"],
    palette: {
      accent: "#E8B23A",
      brand: "#5A1F33",
      brandDeep: "#3E1224",
      action: "#C96A8B",
      actionDeep: "#963F5C",
      glow: "#E8B23A",
      canvas: "#FFF3F6",
      surface: "#FFFFFF",
      ink: "#37101F",
      line: "#F2D5DE",
    },
  },
  {
    id: "deep-ocean",
    label: "محيط عميق",
    labelEn: "Deep Ocean",
    swatches: ["#05263B", "#0B4F6C", "#01BAEF", "#F1FAFB"],
    palette: {
      accent: "#01BAEF",
      brand: "#05263B",
      brandDeep: "#021A2A",
      action: "#0B4F6C",
      actionDeep: "#063349",
      glow: "#01BAEF",
      canvas: "#F1FAFB",
      surface: "#FFFFFF",
      ink: "#041B29",
      line: "#CBE6EF",
    },
  },
];

/* ---- full design templates (palette + type + layout + effects) ------------ */

export type DesignTemplate = {
  id: string;
  label: string;
  labelEn: string;
  description: string;
  swatches: string[];
  build: () => MenuDesign;
};

function deepMerge<T>(base: T, patch: Record<string, unknown>): T {
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const key of Object.keys(patch)) {
    const pv = patch[key];
    const bv = out[key];
    out[key] =
      isRecord(pv) && isRecord(bv) ? deepMerge(bv, pv) : pv;
  }
  return out as T;
}

const template = (
  meta: Omit<DesignTemplate, "build">,
  patch: Record<string, unknown>,
): DesignTemplate => ({
  ...meta,
  build: () => deepMerge(DEFAULT_MENU_DESIGN, patch),
});

export const DESIGN_TEMPLATES: DesignTemplate[] = [
  template(
    {
      id: "classic-dark",
      label: "الكلاسيكية الداكنة",
      labelEn: "Classic Dark",
      description: "الافتراضي — افتتاحية غنية وبطاقات مصوّرة",
      swatches: ["#063239", "#F0002F", "#FFC400", "#F4F3F1"],
    },
    {},
  ),
  template(
    {
      id: "modern-bistro",
      label: "بسترو حديث",
      labelEn: "Modern Bistro",
      description: "واجهة زجاجية، تبويبات ناعمة، وخطوط كيرو",
      swatches: ["#12372A", "#ADBC9F", "#FFFFFF", "#FBF8F1"],
    },
    {
      name: "بسترو حديث",
      palette: PALETTE_PRESETS.find((p) => p.id === "silk-bistro")!.palette,
      type: { display: "Cairo", body: "Inter", weight: 700, headingCase: "upper", tracking: "wide" },
      layout: { hero: "centered", header: "glass", radius: "soft", shadow: "soft", tabs: "soft", add: "pill", border: "none" },
      effects: { grain: false, gradientHero: true },
    },
  ),
  template(
    {
      id: "street-bold",
      label: "شارع جريء",
      labelEn: "Street Bold",
      description: "ألوان صاخبة، عناوين ضخمة، وبطاقات متراكبة",
      swatches: ["#4E1F12", "#E4572E", "#F6C445", "#FDF0E7"],
    },
    {
      name: "شارع جريء",
      palette: PALETTE_PRESETS.find((p) => p.id === "terracotta-table")!.palette,
      type: { display: "Noto Kufi Arabic", body: "Rubik", weight: 900, scale: "editorial", tracking: "tight", headingCase: "upper" },
      layout: { hero: "banner", cards: "overlay", radius: "sharp", shadow: "deep", density: "compact", add: "square", price: "brand" },
      effects: { glow: true, grain: true, motion: "lively", pattern: "glow" },
    },
  ),
  template(
    {
      id: "elegant-calm",
      label: "أنيق هادئ",
      labelEn: "Elegant Calm",
      description: "واجهة كاملة الصورة، مساحات واسعة، وهدوء راقٍ",
      swatches: ["#101820", "#E6B31E", "#F7F5F0", "#CF142B"],
    },
    {
      name: "أنيق هادئ",
      palette: PALETTE_PRESETS.find((p) => p.id === "ink-gold")!.palette,
      type: { display: "Cairo", body: "Tajawal", weight: 600, scale: "editorial", leading: "loose" },
      layout: { hero: "cover", cards: "photo", radius: "sharp", shadow: "flat", density: "roomy", tabs: "line", imageFit: "cover" },
      effects: { grain: false },
    },
  ),
  template(
    {
      id: "minimal-clean",
      label: "مينيمال",
      labelEn: "Minimal",
      description: "قائمة نقية بلا ضجيج — خطوط ومساحات فقط",
      swatches: ["#0A0A0A", "#E30613", "#FFFFFF", "#F4F4F4"],
    },
    {
      name: "مينيمال",
      palette: PALETTE_PRESETS.find((p) => p.id === "monochrome")!.palette,
      type: { display: "Inter", body: "Inter", weight: 600, scale: "compact", tracking: "wide", headingCase: "upper" },
      layout: { hero: "minimal", cards: "compact", columns: "three", radius: "sharp", shadow: "flat", density: "roomy", tabs: "line", add: "outline", border: "hairline" },
      effects: { grain: false, motion: "calm" },
    },
  ),
  template(
    {
      id: "midnight-lounge",
      label: "ليلي فاخر",
      labelEn: "Midnight Lounge",
      description: "وضع داكن كامل مع توهّج زجاجي",
      swatches: ["#021A2A", "#01BAEF", "#0B4F6C", "#F1FAFB"],
    },
    {
      name: "ليلي فاخر",
      palette: PALETTE_PRESETS.find((p) => p.id === "deep-ocean")!.palette,
      type: { display: "Readex Pro", body: "IBM Plex Sans Arabic", weight: 700, headingCase: "upper", tracking: "wide" },
      layout: { mode: "dark", hero: "split", cards: "overlay", radius: "round", shadow: "deep", header: "glass", add: "pill", border: "none" },
      effects: { pattern: "glow", glow: true, gradientHero: true, grain: false, motion: "lively" },
    },
  ),
  template(
    {
      id: "olive-table",
      label: "مائدة الزيتون",
      labelEn: "Olive Table",
      description: "طبيعي ودافئ مع تبويبات خطية وبطاقات مدمجة",
      swatches: ["#3C4F2F", "#D5A021", "#F6F4EC", "#A63D2F"],
    },
    {
      name: "مائدة الزيتون",
      palette: PALETTE_PRESETS.find((p) => p.id === "olive-garden")!.palette,
      type: { display: "Almarai", body: "Almarai", weight: 700 },
      layout: { hero: "split", cards: "compact", radius: "soft", density: "cozy", tabs: "soft", add: "soft", border: "hairline" },
      effects: { pattern: "dots", grain: false },
    },
  ),
  template(
    {
      id: "candy-shop",
      label: "متجر الحلوى",
      labelEn: "Candy Shop",
      description: "مرح ورديّ لطيف للمقاهي والحلويات",
      swatches: ["#5A1F33", "#C96A8B", "#E8B23A", "#FFF3F6"],
    },
    {
      name: "متجر الحلوى",
      palette: PALETTE_PRESETS.find((p) => p.id === "rose-eclair")!.palette,
      type: { display: "Readex Pro", body: "Cairo", weight: 700, scale: "editorial" },
      layout: { hero: "centered", cards: "photo", radius: "round", shadow: "soft", density: "roomy", add: "pill", tabs: "pill" },
      effects: { pattern: "dots", glow: true, grain: false },
    },
  ),
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
  const effects = isRecord(raw.effects) ? raw.effects : {};
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
      weight: ([500, 600, 700, 800, 900].includes(Number(type.weight)) ? Number(type.weight) : d.type.weight) as MenuDesign["type"]["weight"],
      scale: (["compact", "regular", "editorial"].includes(String(type.scale)) ? type.scale : d.type.scale) as MenuDesign["type"]["scale"],
      tracking: (["tight", "normal", "wide"].includes(String(type.tracking)) ? type.tracking : d.type.tracking) as MenuDesign["type"]["tracking"],
      leading: (["tight", "normal", "loose"].includes(String(type.leading)) ? type.leading : d.type.leading) as MenuDesign["type"]["leading"],
      headingCase: (["normal", "upper"].includes(String(type.headingCase)) ? type.headingCase : d.type.headingCase) as MenuDesign["type"]["headingCase"],
    },
    layout: {
      hero: (["editorial", "cover", "minimal", "split", "centered", "banner"].includes(String(layout.hero)) ? layout.hero : d.layout.hero) as MenuDesign["layout"]["hero"],
      cards: (["photo", "list", "overlay", "compact"].includes(String(layout.cards)) ? layout.cards : d.layout.cards) as MenuDesign["layout"]["cards"],
      columns: (["auto", "two", "three", "four"].includes(String(layout.columns)) ? layout.columns : d.layout.columns) as MenuDesign["layout"]["columns"],
      ratio: (["4:3", "square", "3:2", "16:9", "portrait"].includes(String(layout.ratio)) ? layout.ratio : d.layout.ratio) as MenuDesign["layout"]["ratio"],
      tabs: (["pill", "line", "soft"].includes(String(layout.tabs)) ? layout.tabs : d.layout.tabs) as MenuDesign["layout"]["tabs"],
      price: (["action", "ink", "brand"].includes(String(layout.price)) ? layout.price : d.layout.price) as MenuDesign["layout"]["price"],
      add: (["solid", "soft", "outline", "pill", "square"].includes(String(layout.add)) ? layout.add : d.layout.add) as MenuDesign["layout"]["add"],
      radius: (["sharp", "soft", "round"].includes(String(layout.radius)) ? layout.radius : d.layout.radius) as MenuDesign["layout"]["radius"],
      density: (["compact", "cozy", "roomy"].includes(String(layout.density)) ? layout.density : d.layout.density) as MenuDesign["layout"]["density"],
      shadow: (["flat", "soft", "deep"].includes(String(layout.shadow)) ? layout.shadow : d.layout.shadow) as MenuDesign["layout"]["shadow"],
      mode: (["light", "dark"].includes(String(layout.mode)) ? layout.mode : d.layout.mode) as MenuDesign["layout"]["mode"],
      header: (["solid", "glass", "minimal", "centered"].includes(String(layout.header)) ? layout.header : d.layout.header) as MenuDesign["layout"]["header"],
      imageFit: (["cover", "contain"].includes(String(layout.imageFit)) ? layout.imageFit : d.layout.imageFit) as MenuDesign["layout"]["imageFit"],
      border: (["none", "hairline", "bold"].includes(String(layout.border)) ? layout.border : d.layout.border) as MenuDesign["layout"]["border"],
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
      rating: bool(content.rating, d.content.rating),
      hours: bool(content.hours, d.content.hours),
      socials: bool(content.socials, d.content.socials),
      footer: bool(content.footer, d.content.footer),
      bannerText: typeof content.bannerText === "string" ? content.bannerText.slice(0, 160) : "",
      bannerOn: bool(content.bannerOn, d.content.bannerOn),
      bannerTone: (["ink", "glow", "action", "brand"].includes(String(content.bannerTone)) ? content.bannerTone : d.content.bannerTone) as MenuDesign["content"]["bannerTone"],
      logoUrl: str(content.logoUrl, ""),
      coverUrl: str(content.coverUrl, ""),
      ratingValue: clampNumber(content.ratingValue, 0, 5, d.content.ratingValue),
      instagram: str(content.instagram, ""),
      facebook: str(content.facebook, ""),
      whatsappLabel: str(content.whatsappLabel, ""),
      footerText:
        typeof content.footerText === "string"
          ? content.footerText.slice(0, 240)
          : "",
      hoursText:
        typeof content.hoursText === "string"
          ? content.hoursText.slice(0, 240)
          : d.content.hoursText,
    },
    effects: {
      pattern: (["none", "dots", "grid", "diagonal", "noise", "glow"].includes(String(effects.pattern)) ? effects.pattern : d.effects.pattern) as MenuDesign["effects"]["pattern"],
      gradientHero: bool(effects.gradientHero, d.effects.gradientHero),
      glow: bool(effects.glow, d.effects.glow),
      grain: bool(effects.grain, d.effects.grain),
      motion: (["calm", "normal", "lively"].includes(String(effects.motion)) ? effects.motion : d.effects.motion) as MenuDesign["effects"]["motion"],
    },
  };
  return normalized;
}

function clampNumber(v: unknown, min: number, max: number, fb: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return fb;
  return Math.min(max, Math.max(min, Math.round(n * 10) / 10));
}

/* ---- map design to scoped CSS custom properties --------------------------- */

const mix = (a: string, b: string, aPct: number) =>
  `color-mix(in srgb, ${a} ${aPct}%, ${b})`;

/** Derive an effective palette for the chosen mode (dark inverts canvas/ink). */
export function resolvePalette(
  p: MenuDesign["palette"],
  mode: MenuDesign["layout"]["mode"],
): MenuDesign["palette"] {
  if (mode !== "dark") return p;
  const ink = onColor(p.brandDeep);
  return {
    ...p,
    canvas: p.brandDeep,
    surface: shade(p.brandDeep, 22),
    ink,
    line: shade(p.brandDeep, 40),
  };
}

const TRACKING: Record<MenuDesign["type"]["tracking"], string> = {
  tight: "-0.015em",
  normal: "0em",
  wide: "0.05em",
};
const LEADING: Record<MenuDesign["type"]["leading"], string> = {
  tight: "1.06",
  normal: "1.14",
  loose: "1.32",
};

export function menuDesignCssVars(
  d: MenuDesign,
  accentFallback?: string,
): Record<string, string> {
  const p = resolvePalette(d.palette, d.layout.mode);
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
    "--cd-tracking": TRACKING[d.type.tracking],
    "--cd-leading": LEADING[d.type.leading],
  };
}

/* ---- contrast checking (accessibility guardrails) -------------------------- */

export function contrastRatio(a: string, b: string): number {
  const la = hexLuminance(a);
  const lb = hexLuminance(b);
  const light = Math.max(la, lb);
  const dark = Math.min(la, lb);
  return (light + 0.05) / (dark + 0.05);
}

export type ContrastIssue = {
  id: string;
  label: string;
  ratio: number;
  level: "fail" | "warn";
  detail: string;
};

export function designContrastIssues(d: MenuDesign): ContrastIssue[] {
  const p = resolvePalette(d.palette, d.layout.mode);
  const checks: {
    id: string;
    label: string;
    fg: string;
    bg: string;
    min: number;
  }[] = [
    { id: "ink-canvas", label: "النص على الخلفية", fg: p.ink, bg: p.canvas, min: 4.5 },
    { id: "ink-surface", label: "النص على البطاقات", fg: p.ink, bg: p.surface, min: 4.5 },
    { id: "on-brand", label: "نص الهوية", fg: onColor(p.brand), bg: p.brand, min: 4.5 },
    { id: "on-action", label: "نص زر الطلب", fg: onColor(p.action), bg: p.action, min: 4.5 },
    { id: "price", label: "لون السعر", fg: d.layout.price === "ink" ? p.ink : d.layout.price === "brand" ? p.brand : p.action, bg: p.surface, min: 3 },
  ];
  const issues: ContrastIssue[] = [];
  for (const c of checks) {
    const ratio = contrastRatio(c.fg, c.bg);
    if (ratio < c.min) {
      issues.push({
        id: c.id,
        label: c.label,
        ratio: Math.round(ratio * 100) / 100,
        level: ratio < c.min - 0.5 ? "fail" : "warn",
        detail: `${c.fg} على ${c.bg}`,
      });
    }
  }
  return issues;
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
    "data-cd-mode": d.layout.mode,
    "data-cd-header": d.layout.header,
    "data-cd-imgfit": d.layout.imageFit,
    "data-cd-border": d.layout.border,
    "data-cd-scale": d.type.scale,
    "data-cd-weight": String(d.type.weight),
    "data-cd-tracking": d.type.tracking,
    "data-cd-leading": d.type.leading,
    "data-cd-case": d.type.headingCase,
    "data-cd-pattern": d.effects.pattern,
    "data-cd-gradient": b(d.effects.gradientHero),
    "data-cd-glow": b(d.effects.glow),
    "data-cd-grain": b(d.effects.grain),
    "data-cd-motion": d.effects.motion,
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
    "data-cd-show-rating": b(c.rating),
    "data-cd-show-hours": b(c.hours),
    "data-cd-show-socials": b(c.socials),
    "data-cd-show-footer": b(c.footer),
  };
}
