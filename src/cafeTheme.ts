export type CafeThemeVars = Record<string, string>;

/**
 * Per-cafe accent palettes applied as inline CSS custom properties on the
 * cafe app shell. The storefront adopts the SYRIAN QR brand ramp (red / deep
 * red accents on warm yellow highlights) so every venue shares one coherent
 * premium-restaurant identity. Unknown slugs fall back to the default ramp
 * (identical to the :root values in styles.css).
 */
const BRAND_RAMP: CafeThemeVars = {
  "--gold": "#f0002f",
  "--gold-2": "#f0002f",
  "--gold-light": "#ff3657",
  "--gold-deep": "#9e0015",
  "--gold-glow": "rgba(240, 0, 47, 0.2)",
  "--gold-dim": "rgba(240, 0, 47, 0.08)",
  "--star": "#ffc400",
  "--star-soft": "rgba(255, 196, 0, 0.18)",
  "--border": "rgba(240, 0, 47, 0.35)",
};

const PALETTES: Record<string, CafeThemeVars> = {
  sufra: BRAND_RAMP,
  cozy: BRAND_RAMP,
  default: BRAND_RAMP,
};

export function cafeThemeVars(slug?: string | null): CafeThemeVars {
  return PALETTES[slug ?? ""] ?? PALETTES.default;
}
