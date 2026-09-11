/* Auto-extracted shared domain: types, seed data, helpers. */

export const readStored = <T,>(key: string, fallback: T): T => {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
};

export const writeStored = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Keep the in-memory UI usable when browser storage is unavailable or full.
  }
};

export type Mode = "dine-in" | "takeaway" | "delivery";
export type View = "menu" | "orders" | "manage";
export type Category = string;
export type Tag = "vegetarian" | "spicy" | "chef";
export type MenuCategory = {
  id: string;
  name: string;
  en: string;
  visible: boolean;
  archived: boolean;
};

export type Option = { id: string; name: string; price: number };
export type OptionGroup = {
  id: string;
  name: string;
  required?: boolean;
  options: Option[];
};
export type RestaurantTable = {
  id: string;
  code: string;
  name: string;
  area: string;
  active: boolean;
  qrToken?: string;
};
export type DeliveryZone = {
  id: string;
  name: string;
  fee: number;
  minimum: number;
  active: boolean;
};
export type BusinessHour = {
  day: string;
  enabled: boolean;
  open: string;
  close: string;
};
export type RestaurantSettings = {
  name: string;
  subtitle: string;
  city: string;
  neighborhood: string;
  phone: string;
  whatsapp: string;
  rate: number;
  syriatelCash: string;
  shamCash: string;
  mtnCash: string;
  taxPercent: number;
  servicePercent: number;
  dineIn: boolean;
  takeaway: boolean;
  delivery: boolean;
  currencyEstimate: boolean;
  latitude?: number | null;
  longitude?: number | null;
  geofenceMeters?: number;
  hours: BusinessHour[];
  zones: DeliveryZone[];
};
export type StaffMember = {
  id: string;
  name: string;
  role: "owner" | "manager" | "cashier" | "kitchen";
  active: boolean;
};
export type AuditEntry = {
  id: string;
  action: string;
  actor: string;
  createdAt: string;
};
export type OperationsState = {
  acceptingOrders: boolean;
  notifications: boolean;
  sound: boolean;
  staff: StaffMember[];
  audit: AuditEntry[];
};
export type Item = {
  id: string;
  name: string;
  en: string;
  desc: string;
  price: number;
  category: Category;
  tags: Tag[];
  image: string;
  popular?: boolean;
  available: boolean;
  options?: OptionGroup[];
};

/* ---- Menu design system (owner-authored storefront theme) ---- */
export type DesignRadius = "sharp" | "soft" | "round";
export type DesignDensity = "compact" | "cozy" | "roomy";
export type DesignShadow = "flat" | "soft" | "deep";
export type DesignHero = "editorial" | "cover" | "minimal";
export type DesignCards = "photo" | "list";
export type DesignColumns = "auto" | "two" | "three" | "four";
export type DesignImageRatio = "4:3" | "square" | "3:2" | "16:9";
export type DesignTabs = "pill" | "line";
export type DesignPrice = "action" | "ink";
export type DesignAdd = "solid" | "soft" | "outline";
export type DesignScale = "compact" | "regular" | "editorial";
export type DesignWeight = 600 | 700 | 800;
export type DisplayFont =
  | "Changa"
  | "Cairo"
  | "Oswald"
  | "Almarai"
  | "Readex Pro"
  | "Noto Kufi Arabic";
export type BodyFont =
  | "Tajawal"
  | "Inter"
  | "Cairo"
  | "Rubik"
  | "Almarai"
  | "IBM Plex Sans Arabic";
export type BannerTone = "ink" | "glow" | "action" | "brand";

export type MenuDesign = {
  version: 1;
  name: string;
  palette: {
    accent: string;
    brand: string;
    brandDeep: string;
    action: string;
    actionDeep: string;
    glow: string;
    canvas: string;
    surface: string;
    ink: string;
    line: string;
  };
  type: {
    display: DisplayFont;
    body: BodyFont;
    weight: DesignWeight;
    scale: DesignScale;
  };
  layout: {
    hero: DesignHero;
    cards: DesignCards;
    columns: DesignColumns;
    ratio: DesignImageRatio;
    tabs: DesignTabs;
    price: DesignPrice;
    add: DesignAdd;
    radius: DesignRadius;
    density: DesignDensity;
    shadow: DesignShadow;
  };
  content: {
    subtitle: boolean;
    location: boolean;
    stats: boolean;
    heroCats: boolean;
    english: boolean;
    descriptions: boolean;
    tags: boolean;
    popularFlag: boolean;
    modifierHint: boolean;
    catalogueNote: boolean;
    liveBadge: boolean;
    bannerText: string;
    bannerOn: boolean;
    bannerTone: BannerTone;
    logoUrl: string;
    coverUrl: string;
  };
};

export type Restaurant = {
  id: string;
  name: string;
  subtitle: string;
  city: string;
  neighborhood: string;
  logo: string;
  accent: string;
  rate: number;
  phone: string;
  whatsapp: string;
  items: Item[];
  design?: MenuDesign;
  designVersion?: number;
};
export type CartLine = {
  key: string;
  item: Item;
  qty: number;
  options: Option[];
  note: string;
};
export type Order = {
  id: string;
  databaseId?: string;
  restaurantId: string;
  publicToken?: string;
  mode: Mode;
  status:
  | "received"
  | "confirmed"
  | "preparing"
  | "ready"
  | "out-for-delivery"
  | "completed"
  | "cancelled";
  lines: CartLine[];
  customer: string;
  phone: string;
  address: string;
  table: string;
  total: number;
  payment: string;
  paymentStatus: "pending" | "verified" | "rejected" | "refunded";
  paymentReference: string;
  internalNote: string;
  cancellationReason: string;
  createdAt: string;
  updatedAt: string;
};

export type StaffRole = "owner" | "manager" | "cashier" | "kitchen" | "viewer";
export type RestaurantMembership = {
  restaurantId: string;
  restaurantSlug: string;
  restaurantName: string;
  displayName: string;
  role: StaffRole;
};

export type AdminOrderRow = {
  id: string;
  restaurant_id: string;
  order_number: number | string;
  public_token: string;
  mode: Mode;
  status: Order["status"];
  customer_name: string | null;
  customer_phone: string | null;
  delivery_address: string | null;
  payment_method: string;
  payment_status: Order["paymentStatus"];
  payment_reference: string | null;
  total_syp: number | string;
  internal_note: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
  restaurant_tables: { label_ar: string; table_code: string } | null;
  order_lines: Array<{
    id: string;
    menu_item_id: string | null;
    item_name_ar: string;
    item_name_en: string;
    unit_price_syp: number | string;
    quantity: number;
    note: string | null;
    order_line_options: Array<{
      id: string;
      option_id: string | null;
      option_name_ar: string;
      price_delta_syp: number | string;
    }>;
  }>;
};

export const mapAdminOrder = (row: AdminOrderRow, restaurantSlug: string): Order => ({
  id: String(row.order_number),
  databaseId: row.id,
  restaurantId: restaurantSlug,
  publicToken: row.public_token,
  mode: row.mode,
  status: row.status,
  lines: (row.order_lines ?? []).map((line) => ({
    key: line.id,
    qty: line.quantity,
    note: line.note ?? "",
    item: {
      id: line.menu_item_id ?? line.id,
      name: line.item_name_ar,
      en: line.item_name_en,
      desc: "",
      price: Number(line.unit_price_syp),
      category: "",
      tags: [],
      image: images.mezze,
      popular: false,
      available: true,
    },
    options: (line.order_line_options ?? []).map((option) => ({
      id: option.option_id ?? option.id,
      name: option.option_name_ar,
      price: Number(option.price_delta_syp),
    })),
  })),
  customer: row.customer_name ?? "زبون المطعم",
  phone: row.customer_phone ?? "",
  address: row.delivery_address ?? "",
  table: row.restaurant_tables?.label_ar ?? row.restaurant_tables?.table_code ?? "",
  total: Number(row.total_syp),
  payment: row.payment_method,
  paymentStatus: row.payment_status,
  paymentReference: row.payment_reference ?? "",
  internalNote: row.internal_note ?? "",
  cancellationReason: row.cancellation_reason ?? "",
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export type PublicMenuPayload = {
  table: {
    id: string;
    code: string;
    labelAr: string;
    labelEn: string;
    area: string;
  } | null;
  restaurant: {
    slug: string;
    nameAr: string;
    subtitleAr: string;
    accent: string;
    phone: string;
    whatsapp: string;
    city: string;
    neighborhood: string;
    exchangeRate: number;
    dineIn: boolean;
    takeaway: boolean;
    delivery: boolean;
    taxPercent: number;
    servicePercent: number;
    usdEstimateEnabled: boolean;
    latitude?: number | null;
    longitude?: number | null;
    geofenceMeters?: number | null;
    design?: Record<string, unknown>;
  };
  categories: Array<{
    id: string;
    nameAr: string;
    nameEn: string;
  }>;
  items: Array<{
    id: string;
    categoryId: string;
    nameAr: string;
    nameEn: string;
    descriptionAr: string;
    imageUrl: string;
    price: number;
    tags: string[];
    popular: boolean;
    available: boolean;
    optionGroups: Array<{
      id: string;
      nameAr: string;
      required: boolean;
      options: Array<{ id: string; nameAr: string; price: number }>;
    }>;
  }>;
  zones: Array<{
    id: string;
    nameAr: string;
    fee: number;
    minimum: number;
  }>;
  wallets: Array<{ provider: string; merchantIdentifier: string }>;
  hours: Array<{
    weekday: number;
    enabled: boolean;
    open: string;
    close: string;
  }>;
};

export const images = {
  mezze:
    "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=72",
  kibbeh:
    "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=900&q=72",
  shawarma:
    "https://images.unsplash.com/photo-1529006557810-274b9b2fc783?auto=format&fit=crop&w=900&q=72",
  burger:
    "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=72",
  salad:
    "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=900&q=72",
  juice:
    "https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=900&q=72",
  coffee:
    "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=72",
  cake: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=900&q=72",
};

export const makeItems = (isCozy = false): Item[] => [
  {
    id: "hummus",
    name: "حمص باللحمة",
    en: "Hummus bil Lahme",
    desc: "حمص كريمي، لحمة مفرومة وصنوبر محمص",
    price: 45000,
    category: "مقبلات",
    tags: ["chef"],
    image: images.mezze,
    popular: true,
    available: true,
  },
  {
    id: "kibbeh",
    name: "كبة مقلية",
    en: "Fried Kibbeh",
    desc: "حشوة لحم مع البصل والجوز، تقدم مع اللبن",
    price: 55000,
    category: "مقبلات",
    tags: [],
    image: images.kibbeh,
    popular: true,
    available: true,
    options: [
      {
        id: "count",
        name: "الكمية",
        required: true,
        options: [
          { id: "3", name: "3 حبات", price: 0 },
          { id: "6", name: "6 حبات", price: 27000 },
        ],
      },
    ],
  },
  {
    id: "chicken",
    name: "شاورما دجاج",
    en: "Chicken Shawarma Plate",
    desc: "شاورما دجاج، بطاطا، ثوم ومخلل",
    price: 75000,
    category: "رئيسية",
    tags: ["chef"],
    image: images.shawarma,
    popular: true,
    available: true,
    options: [
      {
        id: "size",
        name: "الحجم",
        required: true,
        options: [
          { id: "regular", name: "عادي", price: 0 },
          { id: "large", name: "كبير", price: 20000 },
        ],
      },
      {
        id: "sauce",
        name: "إضافات",
        options: [
          { id: "extra-garlic", name: "ثوم إضافي", price: 5000 },
          { id: "pickles", name: "مخلل إضافي", price: 3000 },
        ],
      },
    ],
  },
  {
    id: "burger",
    name: isCozy ? "برغر ستيك" : "برغر لحم سوري",
    en: "Syrian Beef Burger",
    desc: "لحم مشوي، جبنة، صوص خاص وخضار طازجة",
    price: 95000,
    category: "رئيسية",
    tags: [],
    image: images.burger,
    available: true,
    options: [
      {
        id: "cooking",
        name: "درجة الاستواء",
        required: true,
        options: [
          { id: "medium", name: "متوسط", price: 0 },
          { id: "well", name: "مستوي جيداً", price: 0 },
        ],
      },
    ],
  },
  {
    id: "salad",
    name: "فتوش الشام",
    en: "Shami Fattoush",
    desc: "خضار موسمية، خبز محمص ودبس رمان",
    price: 40000,
    category: "مقبلات",
    tags: ["vegetarian"],
    image: images.salad,
    available: !isCozy,
  },
  {
    id: "juice",
    name: "ليمون ونعنع",
    en: "Lemon Mint",
    desc: "ليمون طازج، نعنع وسكر حسب الطلب",
    price: 28000,
    category: "مشروبات",
    tags: ["vegetarian"],
    image: images.juice,
    available: true,
    options: [
      {
        id: "sweet",
        name: "السكر",
        options: [
          { id: "less", name: "قليل السكر", price: 0 },
          { id: "none", name: "بدون سكر", price: 0 },
        ],
      },
    ],
  },
  {
    id: "coffee",
    name: "قهوة عربية",
    en: "Arabic Coffee",
    desc: "قهوة عربية بالهيل تقدم ساخنة",
    price: 22000,
    category: "مشروبات",
    tags: [],
    image: images.coffee,
    available: true,
  },
  {
    id: "cake",
    name: "كيكة الشوكولا",
    en: "Chocolate Cake",
    desc: "كيكة شوكولا غنية مع صوص الشوكولا",
    price: 42000,
    category: "حلويات",
    tags: ["vegetarian"],
    image: images.cake,
    available: true,
  },
];

export const restaurants: Restaurant[] = [
  {
    id: "sufra",
    name: "سُفرة الشام",
    subtitle: "مذاق البيت الشامي الأصيل",
    city: "دمشق",
    neighborhood: "المزة",
    logo: "س",
    accent: "#df7658",
    rate: 525,
    phone: "+963 11 445 7272",
    whatsapp: "963944572727",
    items: makeItems(),
  },
  {
    id: "cozy",
    name: "Cozy Corner",
    subtitle: "قهوة. أكل. مزاج.",
    city: "دمشق",
    neighborhood: "أبو رمانة",
    logo: "C",
    accent: "#5b7c92",
    rate: 530,
    phone: "+963 11 332 1515",
    whatsapp: "963933215151",
    items: makeItems(true),
  },
];

export const defaultCategories: MenuCategory[] = [
  {
    id: "starters",
    name: "مقبلات",
    en: "Starters",
    visible: true,
    archived: false,
  },
  {
    id: "mains",
    name: "رئيسية",
    en: "Main dishes",
    visible: true,
    archived: false,
  },
  {
    id: "drinks",
    name: "مشروبات",
    en: "Drinks",
    visible: true,
    archived: false,
  },
  {
    id: "desserts",
    name: "حلويات",
    en: "Desserts",
    visible: true,
    archived: false,
  },
];
export const tagLabels: Record<Tag, string> = {
  vegetarian: "نباتي",
  spicy: "حار",
  chef: "اختيار الشيف",
};
export const formatSyp = (amount: number) =>
  `${new Intl.NumberFormat("ar-SY").format(amount)} ل.س`;
export const formatUsd = (amount: number, rate: number) =>
  `$${(amount / rate).toFixed(2)}`;
export const modeLabels: Record<Mode, string> = {
  "dine-in": "في المطعم",
  takeaway: "سفري",
  delivery: "توصيل",
};
export const statusLabels: Record<Order["status"], string> = {
  received: "تم الاستلام",
  confirmed: "تم التأكيد",
  preparing: "قيد التحضير",
  ready: "جاهز",
  "out-for-delivery": "في الطريق",
  completed: "مكتمل",
  cancelled: "ملغى",
};

export const cafePath = (slug: string) => `/c/${encodeURIComponent(slug)}`;
