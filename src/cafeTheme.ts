export type CafeThemeVars = Record<string, string>;

/**
 * Per-cafe accent palettes applied as inline CSS custom properties on the
 * cafe app shell. Each entry overrides the shared amber ramp from styles.css
 * so a storefront takes on its owner's colour. Unknown slugs fall back to the
 * default gold ramp (identical to the :root values in styles.css).
 */
const PALETTES: Record<string, CafeThemeVars> = {
  sufra: {
    "--gold": "#a3451f",
    "--gold-2": "#d06a3a",
    "--gold-light": "#b8562a",
    "--gold-deep": "#7a2e10",
    "--gold-glow": "rgba(208, 106, 58, 0.22)",
    "--gold-dim": "rgba(208, 106, 58, 0.1)",
    "--star": "#e8a26b",
    "--star-soft": "rgba(232, 162, 107, 0.16)",
    "--border": "rgba(163, 69, 31, 0.35)",
  },
  cozy: {
    "--gold": "#3d6883",
    "--gold-2": "#5b8ca6",
    "--gold-light": "#4b7a94",
    "--gold-deep": "#27495f",
    "--gold-glow": "rgba(91, 140, 166, 0.22)",
    "--gold-dim": "rgba(91, 140, 166, 0.1)",
    "--star": "#8fb7c9",
    "--star-soft": "rgba(143, 183, 201, 0.16)",
    "--border": "rgba(61, 104, 131, 0.35)",
  },
  default: {
    "--gold": "#9a6413",
    "--gold-2": "#c98b2c",
    "--gold-light": "#b57a1c",
    "--gold-deep": "#7a4c0d",
    "--gold-glow": "rgba(201, 139, 44, 0.22)",
    "--gold-dim": "rgba(201, 139, 44, 0.1)",
    "--star": "#e2b35c",
    "--star-soft": "rgba(226, 179, 92, 0.16)",
    "--border": "rgba(154, 100, 19, 0.35)",
  },
};

export function cafeThemeVars(slug?: string | null): CafeThemeVars {
  return PALETTES[slug ?? ""] ?? PALETTES.default;
}
