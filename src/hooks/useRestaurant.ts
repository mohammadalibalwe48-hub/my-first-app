import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";
import { normalizeMenuDesign } from "../menuDesign";
import {
  defaultCategories,
  images,
  makeItems,
  restaurants,
  type Item,
  type MenuCategory,
  type PublicMenuPayload,
  type Restaurant,
  type RestaurantSettings,
  type Tag,
} from "../domain";

const DAYS = [
  "الأحد",
  "الاثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];

export function buildDefaultSettings(base: Restaurant): RestaurantSettings {
  return {
    name: base.name,
    subtitle: base.subtitle,
    city: base.city,
    neighborhood: base.neighborhood,
    phone: base.phone,
    whatsapp: base.whatsapp,
    rate: base.rate,
    syriatelCash: "0944 572 727",
    shamCash: "SUFRA-DAMASCUS",
    mtnCash: "",
    taxPercent: 0,
    servicePercent: 0,
    dineIn: true,
    takeaway: true,
    delivery: true,
    currencyEstimate: true,
    hours: DAYS.map((day) => ({ day, enabled: true, open: "09:00", close: "23:00" })),
    zones: [{ id: "damascus", name: "دمشق", fee: 15000, minimum: 100000, active: true }],
  };
}

function findBase(slug: string): Restaurant {
  return restaurants.find((r) => r.id === slug) ?? restaurants[0];
}

// Module-level cache so revisiting a cafe within a session doesn't refetch.
const menuCache: Record<string, Item[]> = {};
const categoryCache: Record<string, MenuCategory[]> = {};
const settingsCache: Record<string, RestaurantSettings> = {};
const accentCache: Record<string, string> = {};
const designCache: Record<string, unknown> = {};

const savedKey = (slug: string) => `sqr-design-saved-${slug}`;
const storeKey = (slug: string) => `sqr-design-store-${slug}`;

function seedFromStorage(slug: string): void {
  if (slug in designCache) return;
  try {
    const raw = window.localStorage.getItem(storeKey(slug));
    if (!raw) return;
    const parsed = JSON.parse(raw) as {
      design?: unknown;
      accent?: string | null;
    };
    if (parsed && typeof parsed === "object") {
      designCache[slug] = parsed.design ?? null;
      accentCache[slug] = parsed.accent ?? "";
    }
  } catch {
    /* corrupted cache — ignored, refetch will overwrite */
  }
}

function persistToStorage(slug: string, design: unknown, accent: string | null): void {
  try {
    window.localStorage.setItem(
      storeKey(slug),
      JSON.stringify({ design: design ?? null, accent: accent ?? null }),
    );
  } catch {
    /* storage full/unavailable — non-fatal */
  }
}

export function invalidateRestaurantCache(slug: string): void {
  delete menuCache[slug];
  delete categoryCache[slug];
  delete settingsCache[slug];
  delete accentCache[slug];
  delete designCache[slug];
}

/** Call after a successful design save so storefront tabs pick up the new design. */
export function markMenuDesignSaved(slug: string, design: unknown): void {
  const cachedAccent = accentCache[slug] || null;
  invalidateRestaurantCache(slug);
  try {
    // Seed the fresh design first so the next paint uses it (no stale flash).
    window.localStorage.setItem(
      storeKey(slug),
      JSON.stringify({ design: design ?? null, accent: cachedAccent }),
    );
    window.localStorage.setItem(savedKey(slug), String(Date.now()));
  } catch {
    /* storage unavailable — same-tab invalidation still applies */
  }
}

export type RestaurantData = {
  slug: string;
  restaurant: Restaurant;
  settings: RestaurantSettings;
  categories: MenuCategory[];
  menuItems: Item[];
  customerCategories: MenuCategory[];
  ready: boolean;
  tableContext: PublicMenuPayload["table"];
};

export function useRestaurant(slug: string): RestaurantData {
  seedFromStorage(slug);
  const [menuItems, setMenuItems] = useState<Item[]>(
    () => menuCache[slug] ?? findBase(slug).items,
  );
  const [categories, setCategories] = useState<MenuCategory[]>(
    () => categoryCache[slug] ?? defaultCategories,
  );
  const [settings, setSettings] = useState<RestaurantSettings | null>(
    () => settingsCache[slug] ?? null,
  );
  const [extra, setExtra] = useState<{
    accent: string | null;
    design: unknown;
  }>(() => ({
      accent: accentCache[slug] || null,
      design: designCache[slug] ?? null,
    }));
  const [ready, setReady] = useState<boolean>(() => !!menuCache[slug]);
  const [tableContext, setTableContext] =
    useState<PublicMenuPayload["table"]>(null);
  const [reloadNonce, setReloadNonce] = useState(0);

  // Cross-tab invalidation: refetch when the design is saved from the studio.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === savedKey(slug) || event.key === storeKey(slug)) {
        invalidateRestaurantCache(slug);
        setReloadNonce((n) => n + 1);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [slug]);

  useEffect(() => {
    let active = true;
    seedFromStorage(slug);
    if (menuCache[slug]) {
      setMenuItems(menuCache[slug]);
      setCategories(categoryCache[slug]);
      setSettings(settingsCache[slug]);
      setExtra({
        accent: accentCache[slug] ?? null,
        design: designCache[slug] ?? null,
      });
      setReady(true);
      return;
    }
    setReady(false);
    setTableContext(null);

    const load = async () => {
      const tableToken = new URLSearchParams(window.location.search).get(
        "tableToken",
      );
      const { data, error } = await supabase.rpc("get_public_menu", {
        p_slug: slug,
        p_table_token: tableToken,
      });
      if (!active) return;
      if (error || !data) {
        setReady(false);
        return;
      }
      const payload = data as PublicMenuPayload;
      setTableContext(payload.table);
      const fetchedAccent = payload.restaurant.accent ?? null;
      const fetchedDesign =
        payload.restaurant.design &&
        typeof payload.restaurant.design === "object"
          ? payload.restaurant.design
          : null;
      accentCache[slug] = fetchedAccent || "";
      designCache[slug] = fetchedDesign;
      persistToStorage(slug, fetchedDesign, fetchedAccent);
      setExtra({ accent: fetchedAccent, design: fetchedDesign });

      const nameByCategory = new Map(
        payload.categories.map((c) => [c.id, c.nameAr]),
      );
      const items: Item[] = payload.items.map((entry) => ({
        id: entry.id,
        name: entry.nameAr,
        en: entry.nameEn,
        desc: entry.descriptionAr,
        price: Number(entry.price),
        category: nameByCategory.get(entry.categoryId) ?? "رئيسية",
        tags: entry.tags.filter((t): t is Tag =>
          ["vegetarian", "spicy", "chef"].includes(t),
        ),
        image: entry.imageUrl || images.mezze,
        popular: entry.popular,
        available: entry.available,
        options: entry.optionGroups.map((group) => ({
          id: group.id,
          name: group.nameAr,
          required: group.required,
          options: group.options.map((o) => ({
            id: o.id,
            name: o.nameAr,
            price: Number(o.price),
          })),
        })),
      }));
      const cats: MenuCategory[] = payload.categories.map((c) => ({
        id: c.id,
        name: c.nameAr,
        en: c.nameEn,
        visible: true,
        archived: false,
      }));
      const wallets = payload.wallets;
      const s: RestaurantSettings = {
        name: payload.restaurant.nameAr,
        subtitle: payload.restaurant.subtitleAr,
        city: payload.restaurant.city,
        neighborhood: payload.restaurant.neighborhood,
        phone: payload.restaurant.phone,
        whatsapp: payload.restaurant.whatsapp,
        rate: Number(payload.restaurant.exchangeRate),
        syriatelCash:
          wallets.find((w) => w.provider === "Syriatel Cash")
            ?.merchantIdentifier ?? "",
        shamCash:
          wallets.find((w) => w.provider.includes("Sham"))?.merchantIdentifier ??
          "",
        mtnCash:
          wallets.find((w) => w.provider === "MTN Cash")?.merchantIdentifier ??
          "",
        taxPercent: Number(payload.restaurant.taxPercent),
        servicePercent: Number(payload.restaurant.servicePercent),
        dineIn: payload.restaurant.dineIn,
        takeaway: payload.restaurant.takeaway,
        delivery: payload.restaurant.delivery,
        currencyEstimate: payload.restaurant.usdEstimateEnabled,
        hours: payload.hours.map((h) => ({
          day: DAYS[h.weekday],
          enabled: h.enabled,
          open: h.open.slice(0, 5),
          close: h.close.slice(0, 5),
        })),
        zones: payload.zones.map((z) => ({
          id: z.id,
          name: z.nameAr,
          fee: Number(z.fee),
          minimum: Number(z.minimum),
          active: true,
        })),
      };

      menuCache[slug] = items;
      categoryCache[slug] = cats;
      settingsCache[slug] = s;
      if (active) {
        setMenuItems(items);
        setCategories(cats);
        setSettings(s);
        setReady(true);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [slug, reloadNonce]);

  const base = useMemo(() => findBase(slug), [slug]);
  const resolvedSettings = settings ?? buildDefaultSettings(base);
  const restaurant = useMemo<Restaurant>(
    () => ({
      ...base,
      ...resolvedSettings,
      items: menuItems ?? base.items,
      accent: extra.accent || base.accent,
      design: extra.design ? normalizeMenuDesign(extra.design) : undefined,
    }),
    [base, resolvedSettings, menuItems, extra],
  );
  const customerCategories = useMemo(
    () => categories.filter((c) => c.visible && !c.archived),
    [categories],
  );

  return {
    slug,
    restaurant,
    settings: resolvedSettings,
    categories,
    menuItems,
    customerCategories,
    ready,
    tableContext,
  };
}
