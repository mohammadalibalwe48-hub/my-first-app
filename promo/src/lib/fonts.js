// Fonts must be fully loaded before the first frame or canvas text renders in a fallback face.
export async function loadFonts() {
  const faces = [
    "500 20px 'DM Sans'",
    "700 20px 'DM Sans'",
    "800 20px 'DM Sans'",
    "900 20px 'DM Sans'",
    "500 20px 'Tajawal'",
    "700 20px 'Tajawal'",
    "800 20px 'Tajawal'",
    "400 20px 'Archivo Black'",
  ];
  await Promise.all(faces.map((f) => document.fonts.load(f, f.includes("Tajawal") ? "سفرة" : "Aa")));
  await document.fonts.ready;
}
