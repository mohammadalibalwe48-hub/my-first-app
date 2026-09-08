export type CafeThemeVars = Record<string, string>;

/**
 * Per-cafe brand accents. The storefront runs on one coherent editorial
 * identity (deep teal / bright red / warm yellow from :root in styles.css);
 * each venue keeps only a small signature accent used for the monogram seal,
 * table markers and a subtle underline echo — never for the full chrome.
 */
const ACCENTS: Record<string, string> = {
  sufra: "#e25b2b",
  cozy: "#4f7f9c",
  default: "#f0002f",
};

export function cafeThemeVars(slug?: string | null): CafeThemeVars {
  return { "--cafe-accent": ACCENTS[slug ?? ""] ?? ACCENTS.default };
}
