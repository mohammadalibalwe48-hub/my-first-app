// Single source of truth for timing, copy and the demo order shown in the video.
export const FPS = 30;
export const DURATION_FRAMES = 900; // 30 s
export const BPM = 120; // 1 beat = 15 frames, 1 bar = 60 frames
export const BEAT = (FPS * 60) / BPM;
export const beat = (n) => Math.round(n * BEAT);
export const bar = (n) => Math.round(n * 4 * BEAT);

export const WIDTH = 1920;
export const HEIGHT = 1080;

// The website the QR codes and the end card point to.
export const SITE_URL = "https://qr-syriaa.vercel.app/";
export const SITE_LABEL = "qr-syriaa.vercel.app";

// Demo content mirrors the seeded "Sufra Damascus" restaurant in supabase/migrations.
export const RESTAURANT = { name: "Sufra Damascus", kind: "Authentic Damascene kitchen" };
export const TABLE = { name: "Table 04", number: "04" };
export const ORDER_NO = "24";
export const ORDER_ITEMS = [
  { id: "hummus", name: "Hummus bil Lahme", note: "Creamy hummus, spiced lamb, pine nuts", price: 45000, cat: "Mezze" },
  { id: "kibbeh", name: "Fried Kibbeh", note: "Walnut & onion filling, with laban", price: 55000, cat: "Mezze" },
  { id: "coffee", name: "Arabic Coffee", note: "Brewed with cardamom", price: 25000, cat: "Drinks" },
  { id: "juice", name: "Fresh Orange Juice", note: "Squeezed to order", price: 30000, cat: "Drinks" },
];
export const ORDER_TOTAL = ORDER_ITEMS.reduce((s, i) => s + i.price, 0);
export const formatSYP = (v) => `${new Intl.NumberFormat("en").format(v)} SYP`;
