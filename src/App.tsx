import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { supabase } from "./supabase";

const readStored = <T,>(key: string, fallback: T): T => {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
};

const writeStored = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Keep the in-memory UI usable when browser storage is unavailable or full.
  }
};

type Mode = "dine-in" | "takeaway" | "delivery";
type View = "menu" | "orders" | "manage";
type Category = string;
type Tag = "vegetarian" | "spicy" | "chef";
type MenuCategory = {
  id: string;
  name: string;
  en: string;
  visible: boolean;
  archived: boolean;
};

type Option = { id: string; name: string; price: number };
type OptionGroup = {
  id: string;
  name: string;
  required?: boolean;
  options: Option[];
};
type RestaurantTable = {
  id: string;
  name: string;
  area: string;
  active: boolean;
};
type DeliveryZone = {
  id: string;
  name: string;
  fee: number;
  minimum: number;
  active: boolean;
};
type BusinessHour = {
  day: string;
  enabled: boolean;
  open: string;
  close: string;
};
type RestaurantSettings = {
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
  hours: BusinessHour[];
  zones: DeliveryZone[];
};
type StaffMember = {
  id: string;
  name: string;
  role: "owner" | "manager" | "cashier" | "kitchen";
  active: boolean;
};
type AuditEntry = {
  id: string;
  action: string;
  actor: string;
  createdAt: string;
};
type OperationsState = {
  acceptingOrders: boolean;
  notifications: boolean;
  sound: boolean;
  staff: StaffMember[];
  audit: AuditEntry[];
};
type Item = {
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
type Restaurant = {
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
};
type CartLine = {
  key: string;
  item: Item;
  qty: number;
  options: Option[];
  note: string;
};
type Order = {
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

type StaffRole = "owner" | "manager" | "cashier" | "kitchen" | "viewer";
type RestaurantMembership = {
  restaurantId: string;
  restaurantSlug: string;
  restaurantName: string;
  displayName: string;
  role: StaffRole;
};

type AdminOrderRow = {
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

const mapAdminOrder = (row: AdminOrderRow, restaurantSlug: string): Order => ({
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

type PublicMenuPayload = {
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

const images = {
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

const makeItems = (isCozy = false): Item[] => [
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

const restaurants: Restaurant[] = [
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

const defaultCategories: MenuCategory[] = [
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
const tagLabels: Record<Tag, string> = {
  vegetarian: "نباتي",
  spicy: "حار",
  chef: "اختيار الشيف",
};
const formatSyp = (amount: number) =>
  `${new Intl.NumberFormat("ar-SY").format(amount)} ل.س`;
const formatUsd = (amount: number, rate: number) =>
  `$${(amount / rate).toFixed(2)}`;
const modeLabels: Record<Mode, string> = {
  "dine-in": "في المطعم",
  takeaway: "سفري",
  delivery: "توصيل",
};
const statusLabels: Record<Order["status"], string> = {
  received: "تم الاستلام",
  confirmed: "تم التأكيد",
  preparing: "قيد التحضير",
  ready: "جاهز",
  "out-for-delivery": "في الطريق",
  completed: "مكتمل",
  cancelled: "ملغى",
};

function App() {
  const [restaurantId, setRestaurantId] = useState("sufra");
  const [menuByRestaurant, setMenuByRestaurant] = useState<
    Record<string, Item[]>
  >(() => {
    return readStored(
      "sufra-menus",
      Object.fromEntries(restaurants.map((entry) => [entry.id, entry.items])),
    );
  });
  const [settingsByRestaurant, setSettingsByRestaurant] = useState<
    Record<string, RestaurantSettings>
  >(() => readStored("sufra-settings", {}));
  const [categoriesByRestaurant, setCategoriesByRestaurant] = useState<
    Record<string, MenuCategory[]>
  >(() => {
    return readStored(
      "sufra-categories",
      Object.fromEntries(
        restaurants.map((entry) => [entry.id, defaultCategories]),
      ),
    );
  });
  const baseRestaurant =
    restaurants.find((r) => r.id === restaurantId) ?? restaurants[0];
  const defaultSettings: RestaurantSettings = {
    name: baseRestaurant.name,
    subtitle: baseRestaurant.subtitle,
    city: baseRestaurant.city,
    neighborhood: baseRestaurant.neighborhood,
    phone: baseRestaurant.phone,
    whatsapp: baseRestaurant.whatsapp,
    rate: baseRestaurant.rate,
    syriatelCash: "0944 572 727",
    shamCash: "SUFRA-DAMASCUS",
    mtnCash: "",
    taxPercent: 0,
    servicePercent: 0,
    dineIn: true,
    takeaway: true,
    delivery: true,
    currencyEstimate: true,
    hours: [
      "الأحد",
      "الاثنين",
      "الثلاثاء",
      "الأربعاء",
      "الخميس",
      "الجمعة",
      "السبت",
    ].map((day) => ({ day, enabled: true, open: "09:00", close: "23:00" })),
    zones: [
      {
        id: "damascus",
        name: "دمشق",
        fee: 15000,
        minimum: 100000,
        active: true,
      },
    ],
  };
  const restaurantSettings =
    settingsByRestaurant[restaurantId] ?? defaultSettings;
  const restaurant = {
    ...baseRestaurant,
    ...restaurantSettings,
    items: menuByRestaurant[restaurantId] ?? baseRestaurant.items,
  };
  const [view, setView] = useState<View>("menu");
  const [language, setLanguage] = useState<"ar" | "en">("ar");
  const [currency, setCurrency] = useState<"syp" | "usd">("syp");
  const [category, setCategory] = useState<Category>("كل الأصناف");
  const [tag, setTag] = useState<Tag | "all">("all");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>(() =>
    readStored(`sufra-cart-${restaurantId}`, []),
  );
  const [orders, setOrders] = useState<Order[]>(() =>
    readStored("sufra-orders", []),
  );
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [trackingOrder, setTrackingOrder] = useState<Order | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [adminTab, setAdminTab] = useState<
    | "overview"
    | "orders"
    | "menu"
    | "tables"
    | "reports"
    | "operations"
    | "settings"
  >("overview");
  const [mode, setMode] = useState<Mode>("dine-in");
  const [notice, setNotice] = useState("");
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [backendReady, setBackendReady] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [staffEmail, setStaffEmail] = useState("");
  const [memberships, setMemberships] = useState<RestaurantMembership[]>([]);
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    let active = true;

    const loadIdentity = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!active) return;

      setStaffEmail(user?.email ?? "");
      if (!user) {
        setMemberships([]);
        setAuthReady(true);
        return;
      }

      const { data, error } = await supabase
        .from("restaurant_members")
        .select(
          "restaurant_id, role, display_name, restaurants!inner(slug, name_ar)",
        )
        .eq("user_id", user.id)
        .eq("active", true);

      if (!active) return;
      if (error) {
        setMemberships([]);
        setNotice("تعذر تحميل صلاحيات حساب الموظف");
      } else {
        const rows = (data ?? []) as unknown as Array<{
          restaurant_id: string;
          role: StaffRole;
          display_name: string;
          restaurants: { slug: string; name_ar: string };
        }>;
        const nextMemberships = rows.map((row) => ({
          restaurantId: row.restaurant_id,
          restaurantSlug: row.restaurants.slug,
          restaurantName: row.restaurants.name_ar,
          displayName: row.display_name,
          role: row.role,
        }));
        setMemberships(nextMemberships);
        if (
          nextMemberships.length > 0 &&
          !nextMemberships.some((entry) => entry.restaurantSlug === restaurantId)
        ) {
          setRestaurantId(nextMemberships[0].restaurantSlug);
        }
      }
      setAuthReady(true);
    };

    void loadIdentity();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      setAuthReady(false);
      window.setTimeout(() => void loadIdentity(), 0);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const membership = memberships.find(
      (entry) => entry.restaurantSlug === restaurantId,
    );
    if (!staffEmail || !membership) return;

    let active = true;
    const loadAdminOrders = async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, restaurant_id, order_number, public_token, mode, status, customer_name, customer_phone, delivery_address, payment_method, payment_status, payment_reference, total_syp, internal_note, cancellation_reason, created_at, updated_at, restaurant_tables(label_ar, table_code), order_lines(id, menu_item_id, item_name_ar, item_name_en, unit_price_syp, quantity, note, order_line_options(id, option_id, option_name_ar, price_delta_syp))",
        )
        .eq("restaurant_id", membership.restaurantId)
        .order("created_at", { ascending: false })
        .limit(250);

      if (!active) return;
      if (error) {
        setNotice(`تعذر تحميل طلبات المطعم: ${error.message}`);
        return;
      }

      const remoteOrders = ((data ?? []) as unknown as AdminOrderRow[]).map(
        (row) => mapAdminOrder(row, restaurantId),
      );
      setOrders((current) => [
        ...remoteOrders,
        ...current.filter(
          (order) => order.restaurantId !== restaurantId && !order.databaseId,
        ),
      ]);
    };

    void loadAdminOrders();
    const channel = supabase
      .channel(`admin-orders-${membership.restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${membership.restaurantId}`,
        },
        () => void loadAdminOrders(),
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [memberships, restaurantId, staffEmail]);

  useEffect(() => {
    let active = true;
    const loadMenu = async () => {
      const { data, error } = await supabase.rpc("get_public_menu", {
        p_slug: restaurantId,
        p_table_token: new URLSearchParams(location.search).get("tableToken"),
      });
      if (!active || error || !data) return;
      const payload = data as PublicMenuPayload;
      const categoryNames = new Map(
        payload.categories.map((entry) => [entry.id, entry.nameAr]),
      );
      const categories = payload.categories.map((entry) => ({
        id: entry.id,
        name: entry.nameAr,
        en: entry.nameEn,
        visible: true,
        archived: false,
      }));
      const items: Item[] = payload.items.map((entry) => ({
        id: entry.id,
        name: entry.nameAr,
        en: entry.nameEn,
        desc: entry.descriptionAr,
        price: Number(entry.price),
        category: categoryNames.get(entry.categoryId) ?? "رئيسية",
        tags: entry.tags.filter((tag): tag is Tag =>
          ["vegetarian", "spicy", "chef"].includes(tag),
        ),
        image: entry.imageUrl || images.mezze,
        popular: entry.popular,
        available: entry.available,
        options: entry.optionGroups.map((group) => ({
          id: group.id,
          name: group.nameAr,
          required: group.required,
          options: group.options.map((option) => ({
            id: option.id,
            name: option.nameAr,
            price: Number(option.price),
          })),
        })),
      }));
      const days = [
        "الأحد",
        "الاثنين",
        "الثلاثاء",
        "الأربعاء",
        "الخميس",
        "الجمعة",
        "السبت",
      ];
      setMenuByRestaurant((current) => ({ ...current, [restaurantId]: items }));
      setCategoriesByRestaurant((current) => ({
        ...current,
        [restaurantId]: categories,
      }));
      setSettingsByRestaurant((current) => ({
        ...current,
        [restaurantId]: {
          name: payload.restaurant.nameAr,
          subtitle: payload.restaurant.subtitleAr,
          city: payload.restaurant.city,
          neighborhood: payload.restaurant.neighborhood,
          phone: payload.restaurant.phone,
          whatsapp: payload.restaurant.whatsapp,
          rate: Number(payload.restaurant.exchangeRate),
          syriatelCash:
            payload.wallets.find((wallet) => wallet.provider === "Syriatel Cash")
              ?.merchantIdentifier ?? "",
          shamCash:
            payload.wallets.find((wallet) => wallet.provider.includes("Sham"))
              ?.merchantIdentifier ?? "",
          mtnCash:
            payload.wallets.find((wallet) => wallet.provider === "MTN Cash")
              ?.merchantIdentifier ?? "",
          taxPercent: Number(payload.restaurant.taxPercent),
          servicePercent: Number(payload.restaurant.servicePercent),
          dineIn: payload.restaurant.dineIn,
          takeaway: payload.restaurant.takeaway,
          delivery: payload.restaurant.delivery,
          currencyEstimate: payload.restaurant.usdEstimateEnabled,
          hours: payload.hours.map((hour) => ({
            day: days[hour.weekday],
            enabled: hour.enabled,
            open: hour.open.slice(0, 5),
            close: hour.close.slice(0, 5),
          })),
          zones: payload.zones.map((zone) => ({
            id: zone.id,
            name: zone.nameAr,
            fee: Number(zone.fee),
            minimum: Number(zone.minimum),
            active: true,
          })),
        },
      }));
      setBackendReady(true);
    };
    void loadMenu();
    return () => {
      active = false;
    };
  }, [restaurantId]);

  useEffect(
    () => writeStored(`sufra-cart-${restaurantId}`, cart),
    [cart, restaurantId],
  );
  useEffect(() => writeStored("sufra-orders", orders), [orders]);
  useEffect(
    () => writeStored("sufra-menus", menuByRestaurant),
    [menuByRestaurant],
  );
  useEffect(
    () => writeStored("sufra-categories", categoriesByRestaurant),
    [categoriesByRestaurant],
  );
  useEffect(
    () => writeStored("sufra-settings", settingsByRestaurant),
    [settingsByRestaurant],
  );
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);
  useEffect(() => {
    setCart(readStored(`sufra-cart-${restaurantId}`, []));
    setCategory("كل الأصناف");
    setQuery("");
    setNotice("");
  }, [restaurantId]);

  const restaurantCategories =
    categoriesByRestaurant[restaurantId] ?? defaultCategories;
  const customerCategories = restaurantCategories.filter(
    (entry) => entry.visible && !entry.archived,
  );
  const availableItems = useMemo(
    () =>
      restaurant.items.filter(
        (item) =>
          item.available &&
          customerCategories.some((entry) => entry.name === item.category) &&
          (category === "كل الأصناف" ||
            (category === "الأكثر طلباً"
              ? item.popular
              : item.category === category)) &&
          (tag === "all" || item.tags.includes(tag)) &&
          (!query ||
            `${item.name} ${item.en} ${item.desc}`
              .toLowerCase()
              .includes(query.toLowerCase())),
      ),
    [restaurant, customerCategories, category, tag, query],
  );
  const total = cart.reduce(
    (sum, line) =>
      sum +
      (line.item.price + line.options.reduce((a, o) => a + o.price, 0)) *
      line.qty,
    0,
  );
  const cartCount = cart.reduce((sum, line) => sum + line.qty, 0);

  const addToCart = (item: Item, options: Option[] = [], note = "") => {
    const key = `${item.id}-${options
      .map((o) => o.id)
      .sort()
      .join("-")}-${note}`;
    setCart((current) => {
      const existing = current.find((line) => line.key === key);
      return existing
        ? current.map((line) =>
          line.key === key ? { ...line, qty: line.qty + 1 } : line,
        )
        : [...current, { key, item, qty: 1, options, note }];
    });
    setSelectedItem(null);
    setNotice("تمت الإضافة إلى الطلب");
    window.setTimeout(() => setNotice(""), 1800);
  };
  const updateQty = (key: string, delta: number) =>
    setCart((current) =>
      current
        .map((line) =>
          line.key === key ? { ...line, qty: line.qty + delta } : line,
        )
        .filter((line) => line.qty > 0),
    );
  const placeOrder = async (form: HTMLFormElement) => {
    const operationState = readStored<OperationsState | null>(
      `sufra-operations-${restaurantId}`,
      null,
    );
    if (operationState?.acceptingOrders === false) {
      setNotice("المطعم متوقف عن استقبال الطلبات حالياً");
      window.setTimeout(() => setNotice(""), 2600);
      return;
    }
    const data = new FormData(form);
    const selectedZone = restaurantSettings.zones.find(
      (zone) => zone.id === data.get("zone"),
    );
    if (mode === "delivery" && selectedZone && total < selectedZone.minimum) {
      setNotice(
        `الحد الأدنى للطلب في ${selectedZone.name} هو ${formatSyp(selectedZone.minimum)}`,
      );
      window.setTimeout(() => setNotice(""), 3200);
      return;
    }
    const deliveryFee = mode === "delivery" ? (selectedZone?.fee ?? 0) : 0;
    type OrderReceipt = {
      orderNumber: string;
      publicToken: string;
      total: number;
    };
    let receipt: OrderReceipt | undefined;
    if (backendReady) {
      const { data: submitted, error } = await supabase.rpc(
        "submit_public_order",
        {
          p_payload: {
            restaurantSlug: restaurantId,
            idempotencyKey: crypto.randomUUID(),
            mode,
            tableToken: new URLSearchParams(location.search).get("tableToken"),
            deliveryZoneId: selectedZone?.id ?? null,
            customerName: String(data.get("customer") || "زبون المطعم"),
            phone: String(data.get("phone") || ""),
            address: String(data.get("address") || ""),
            pickupTime: String(data.get("pickup") || ""),
            paymentMethod: String(data.get("payment") || "الدفع نقداً"),
            paymentReference: String(data.get("paymentReference") || ""),
            lines: cart.map((line) => ({
              itemId: line.item.id,
              quantity: line.qty,
              note: line.note,
              optionIds: line.options.map((option) => option.id),
            })),
          },
        },
      );
      if (error || !submitted) {
        setNotice(`تعذر إرسال الطلب: ${error?.message ?? "خطأ غير معروف"}`);
        window.setTimeout(() => setNotice(""), 4200);
        return;
      }
      receipt = submitted as unknown as OrderReceipt;
    }
    const order: Order = {
      id:
        receipt?.orderNumber ??
        `SF-${Math.floor(1000 + Math.random() * 8999)}`,
      restaurantId,
      publicToken: receipt?.publicToken,
      mode,
      status: "received",
      lines: cart,
      customer: String(data.get("customer") || "زبون المطعم"),
      phone: String(data.get("phone") || ""),
      address: String(data.get("address") || ""),
      table: String(
        data.get("table") ||
        new URLSearchParams(location.search).get("table") ||
        "T-12",
      ),
      total: receipt?.total ?? total + deliveryFee,
      payment: String(data.get("payment") || "الدفع نقداً"),
      paymentStatus: "pending",
      paymentReference: String(data.get("paymentReference") || ""),
      internalNote: "",
      cancellationReason: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setOrders((current) => [order, ...current]);
    setCart([]);
    setCheckoutOpen(false);
    setCartOpen(false);
    setTrackingOrder(order);
    setView("orders");
  };
  const persistOrderPatch = async (id: string, patch: Partial<Order>) => {
    const existing = orders.find((order) => order.id === id);
    const updatedAt = new Date().toISOString();
    setOrders((current) =>
      current.map((order) =>
        order.id === id ? { ...order, ...patch, updatedAt } : order,
      ),
    );
    setTrackingOrder((current) =>
      current?.id === id ? { ...current, ...patch, updatedAt } : current,
    );

    if (!existing?.databaseId) return;
    const databasePatch: Record<string, string> = {};
    if (patch.status) databasePatch.status = patch.status;
    if (patch.paymentStatus) databasePatch.payment_status = patch.paymentStatus;
    if (patch.internalNote !== undefined)
      databasePatch.internal_note = patch.internalNote;
    if (patch.cancellationReason !== undefined)
      databasePatch.cancellation_reason = patch.cancellationReason;
    if (Object.keys(databasePatch).length === 0) return;

    const { error } = await supabase
      .from("orders")
      .update(databasePatch)
      .eq("id", existing.databaseId);
    if (error) {
      setOrders((current) =>
        current.map((order) => (order.id === id ? existing : order)),
      );
      setNotice(`تعذر حفظ تحديث الطلب: ${error.message}`);
      window.setTimeout(() => setNotice(""), 4200);
    }
  };

  const updateOrderStatus = (
    id: string,
    status: Order["status"],
    patch: Partial<Order> = {},
  ) => void persistOrderPatch(id, { ...patch, status });
  const openWhatsApp = async (order: Order) => {
    let dispatchId = "";
    if (order.databaseId) {
      const { data, error } = await supabase.rpc("create_whatsapp_dispatch", {
        p_order_id: order.databaseId,
      });
      if (error) {
        setNotice(`تعذر تسجيل محاولة واتساب: ${error.message}`);
        window.setTimeout(() => setNotice(""), 4200);
      } else {
        dispatchId = String((data as { id?: string } | null)?.id || "");
      }
    }
    const message = [
      `*${restaurant.name} — طلب جديد*`,
      `رقم الطلب: ${order.id}`,
      `النوع: ${modeLabels[order.mode]}`,
      order.table ? `الطاولة: ${order.table}` : "",
      ...order.lines.map(
        (l) =>
          `• ${l.qty}× ${l.item.name}${l.options.length ? ` (${l.options.map((o) => o.name).join(", ")})` : ""}`,
      ),
      `الإجمالي: ${formatSyp(order.total)}`,
      order.paymentReference ? `مرجع الدفع: ${order.paymentReference}` : "",
      `الدفع: ${order.payment}`,
    ]
      .filter(Boolean)
      .join("\n");
    const opened = window.open(
      `https://wa.me/${restaurant.whatsapp}?text=${encodeURIComponent(message)}`,
      "_blank",
    );
    if (dispatchId) {
      void supabase.rpc("update_whatsapp_dispatch", {
        p_dispatch_id: dispatchId,
        p_state: opened ? "sent" : "failed",
        p_provider_message_id: null,
        p_error_code: opened ? null : "popup_blocked",
      });
    }
  };

  return (
    <div className="app-shell" dir={language === "ar" ? "rtl" : "ltr"}>
      <header className="topbar">
        <div
          className="brand"
          onClick={() => {
            setView("menu");
            setTrackingOrder(null);
          }}
        >
          <span className="brand-mark">س</span>
          <div>
            <strong>سُفرة</strong>
            <small>QR MENU</small>
          </div>
        </div>
        <div className="top-actions">
          <span
            className={
              isOnline
                ? "connection-status online"
                : "connection-status offline"
            }
          >
            {isOnline ? "● متصل" : "○ دون اتصال — محفوظ محلياً"}
          </span>
          {staffEmail && (
            <button
              className="staff-chip"
              onClick={() => {
                setView("manage");
                setAdminTab("overview");
              }}
              title={staffEmail}
            >
              <span>◈</span>
              {memberships[0]?.displayName || staffEmail.split("@")[0]}
            </button>
          )}
          <button
            className="icon-button"
            onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
          >
            {language === "ar" ? "EN" : "عربي"}
          </button>
          <button className="cart-button" onClick={() => setCartOpen(true)}>
            <span>طلبك</span>
            <b>{cartCount}</b>
          </button>
        </div>
      </header>
      <div className="app-body">
        <aside className="sidebar">
          <div className="location-card">
            <span className="eyebrow">أنت تتصفح الآن</span>
            <strong>{restaurant.name}</strong>
            <span>
              {restaurant.neighborhood}، {restaurant.city}
            </span>
            <small className="table-context">
              ⌂ الطاولة{" "}
              {new URLSearchParams(location.search).get("table") || "12"}
            </small>
            <button onClick={() => setView("menu")} className="link-button">
              تغيير المطعم ↔
            </button>
          </div>
          <nav className="side-nav">
            <button
              className={view === "menu" ? "active" : ""}
              onClick={() => setView("menu")}
            >
              <span>▦</span> القائمة الرقمية
            </button>
            <button
              className={view === "orders" ? "active" : ""}
              onClick={() => setView("orders")}
            >
              <span>◷</span> طلباتي{" "}
              {orders.length > 0 && (
                <b className="nav-badge">{orders.length}</b>
              )}
            </button>
            <button
              className={view === "manage" ? "active" : ""}
              onClick={() => {
                if (!staffEmail || memberships.length === 0) {
                  setAuthOpen(true);
                  return;
                }
                setView("manage");
                setAdminTab("overview");
              }}
            >
              <span>◈</span> لوحة المطعم
            </button>
          </nav>
          <div className="sidebar-footer">
            <div className="help-icon">?</div>
            <div>
              <strong>تحتاج مساعدة؟</strong>
              <span>تواصل معنا</span>
            </div>
          </div>
        </aside>
        <main className="main-content">
          {view === "menu" && (
            <MenuView
              restaurant={restaurant}
              categories={customerCategories}
              currency={currency}
              setCurrency={setCurrency}
              category={category}
              setCategory={setCategory}
              tag={tag}
              setTag={setTag}
              query={query}
              setQuery={setQuery}
              items={availableItems}
              onSelect={setSelectedItem}
            />
          )}
          {view === "orders" && (
            <OrdersView
              orders={orders.filter((o) => o.restaurantId === restaurantId)}
              onTrack={setTrackingOrder}
              onMenu={() => setView("menu")}
            />
          )}
          {view === "manage" && memberships.length > 0 && (
            <AdminView
              restaurant={restaurant}
              settings={restaurantSettings}
              categories={restaurantCategories}
              tab={adminTab}
              setTab={setAdminTab}
              orders={orders.filter((o) => o.restaurantId === restaurantId)}
              restaurantDatabaseId={
                memberships.find(
                  (entry) => entry.restaurantSlug === restaurantId,
                )?.restaurantId ?? ""
              }
              onStatus={updateOrderStatus}
              onOrderChange={(id, patch) => void persistOrderPatch(id, patch)}
              onWhatsApp={openWhatsApp}
              memberships={memberships}
              staffEmail={staffEmail}
              onSignOut={async () => {
                await supabase.auth.signOut();
                setView("menu");
                setNotice("تم تسجيل الخروج بأمان");
              }}
              onSwitch={setRestaurantId}
              onItemsChange={(items) =>
                setMenuByRestaurant((current) => ({
                  ...current,
                  [restaurantId]: items,
                }))
              }
              onCategoriesChange={(entries) =>
                setCategoriesByRestaurant((current) => ({
                  ...current,
                  [restaurantId]: entries,
                }))
              }
              onSettingsChange={async (settings) => {
                const previous = restaurantSettings;
                setSettingsByRestaurant((current) => ({
                  ...current,
                  [restaurantId]: settings,
                }));
                const restaurantDatabaseId = memberships.find(
                  (entry) => entry.restaurantSlug === restaurantId,
                )?.restaurantId;
                if (!restaurantDatabaseId) return;
                const days = [
                  "الأحد",
                  "الاثنين",
                  "الثلاثاء",
                  "الأربعاء",
                  "الخميس",
                  "الجمعة",
                  "السبت",
                ];
                const { error } = await supabase.rpc("sync_admin_settings", {
                  p_restaurant_id: restaurantDatabaseId,
                  p_payload: {
                    ...settings,
                    hours: settings.hours.map((hour) => ({
                      ...hour,
                      weekday: days.indexOf(hour.day),
                    })),
                    wallets: [
                      {
                        provider: "Syriatel Cash",
                        merchantIdentifier: settings.syriatelCash,
                      },
                      {
                        provider: "Sham Cash / BEMO",
                        merchantIdentifier: settings.shamCash,
                      },
                      {
                        provider: "MTN Cash",
                        merchantIdentifier: settings.mtnCash,
                      },
                    ],
                  },
                });
                if (error) {
                  setSettingsByRestaurant((current) => ({
                    ...current,
                    [restaurantId]: previous,
                  }));
                  setNotice(`تعذر حفظ الإعدادات: ${error.message}`);
                }
              }}
            />
          )}
          {view === "manage" && memberships.length === 0 && (
            <div className="admin-auth-gate">
              <span className="auth-shield">◈</span>
              <span className="eyebrow">منطقة محمية</span>
              <h1>{authReady ? "لوحة المطعم للموظفين" : "جارٍ التحقق من الجلسة…"}</h1>
              <p>
                {staffEmail
                  ? "الحساب مسجل، لكنه لا يملك عضوية فعّالة في أي مطعم. اطلب من المالك إضافتك إلى فريق العمل."
                  : "سجّل الدخول بحساب موظف مرتبط بالمطعم للوصول إلى الطلبات والإعدادات والتقارير."}
              </p>
              {authReady && !staffEmail && (
                <button className="primary" onClick={() => setAuthOpen(true)}>
                  تسجيل دخول الموظفين
                </button>
              )}
              {staffEmail && (
                <button
                  className="secondary"
                  onClick={async () => {
                    await supabase.auth.signOut();
                    setView("menu");
                  }}
                >
                  تسجيل الخروج
                </button>
              )}
            </div>
          )}
        </main>
      </div>
      {notice && <div className="toast">✓ {notice}</div>}
      {authOpen && (
        <StaffAuthModal
          onClose={() => setAuthOpen(false)}
          onSuccess={() => {
            setAuthOpen(false);
            setView("manage");
            setNotice("تم تسجيل الدخول بنجاح");
            window.setTimeout(() => setNotice(""), 2200);
          }}
        />
      )}
      {selectedItem && (
        <ItemModal
          item={selectedItem}
          currency={currency}
          rate={restaurant.rate}
          onClose={() => setSelectedItem(null)}
          onAdd={addToCart}
        />
      )}
      {cartOpen && (
        <CartDrawer
          cart={cart}
          total={total}
          currency={currency}
          rate={restaurant.rate}
          onClose={() => setCartOpen(false)}
          onQty={updateQty}
          onCheckout={() => {
            setCartOpen(false);
            setCheckoutOpen(true);
          }}
        />
      )}
      {checkoutOpen && (
        <CheckoutModal
          total={total}
          mode={mode}
          setMode={setMode}
          onClose={() => setCheckoutOpen(false)}
          onSubmit={placeOrder}
          settings={restaurantSettings}
        />
      )}
      {trackingOrder && (
        <TrackingModal
          order={trackingOrder}
          onClose={() => setTrackingOrder(null)}
          onWhatsApp={openWhatsApp}
        />
      )}
      <div className="mobile-nav">
        <button
          className={view === "menu" ? "active" : ""}
          onClick={() => setView("menu")}
        >
          ▦<span>القائمة</span>
        </button>
        <button
          className={view === "orders" ? "active" : ""}
          onClick={() => setView("orders")}
        >
          ◷<span>طلباتي</span>
        </button>
        <button onClick={() => setCartOpen(true)}>
          🛒<span>السلة</span>
          <b>{cartCount}</b>
        </button>
        <button
          className={view === "manage" ? "active" : ""}
          onClick={() => {
            if (!staffEmail || memberships.length === 0) {
              setAuthOpen(true);
              return;
            }
            setView("manage");
          }}
        >
          ◈<span>الإدارة</span>
        </button>
      </div>
    </div>
  );
}

function MenuView({
  restaurant,
  categories,
  currency,
  setCurrency,
  category,
  setCategory,
  tag,
  setTag,
  query,
  setQuery,
  items,
  onSelect,
}: {
  restaurant: Restaurant;
  categories: MenuCategory[];
  currency: "syp" | "usd";
  setCurrency: (c: "syp" | "usd") => void;
  category: Category;
  setCategory: (c: Category) => void;
  tag: Tag | "all";
  setTag: (t: Tag | "all") => void;
  query: string;
  setQuery: (q: string) => void;
  items: Item[];
  onSelect: (i: Item) => void;
}) {
  return (
    <>
      <div className="hero">
        <div>
          <span className="live-dot">● مفتوح الآن</span>
          <h1>{restaurant.name}</h1>
          <p>{restaurant.subtitle}</p>
          <span className="rating">
            ★ 4.8 <em>•</em> {restaurant.neighborhood}، {restaurant.city}
          </span>
        </div>
        <div className="hero-logo">{restaurant.logo}</div>
      </div>
      <div className="menu-tools">
        <div className="search">
          <span>⌕</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث في القائمة..."
          />
          <kbd>⌘ K</kbd>
        </div>
        <div className="toggle-row">
          <div className="segmented">
            <button
              className={currency === "syp" ? "active" : ""}
              onClick={() => setCurrency("syp")}
            >
              ل.س
            </button>
            <button
              className={currency === "usd" ? "active" : ""}
              onClick={() => setCurrency("usd")}
            >
              $
            </button>
          </div>
          <span className="rate-note">1$ = {restaurant.rate} ألف ل.س</span>
        </div>
      </div>
      <div className="category-row">
        {[
          "كل الأصناف",
          "الأكثر طلباً",
          ...categories.map((entry) => entry.name),
        ].map((entry) => (
          <button
            key={entry}
            className={category === entry ? "active" : ""}
            onClick={() => setCategory(entry)}
          >
            {entry}
          </button>
        ))}
      </div>
      <div className="filter-row">
        <span>تصفية سريعة:</span>
        <button
          className={tag === "all" ? "active" : ""}
          onClick={() => setTag("all")}
        >
          الكل
        </button>
        <button
          className={tag === "vegetarian" ? "active" : ""}
          onClick={() => setTag("vegetarian")}
        >
          ♧ نباتي
        </button>
        <button
          className={tag === "chef" ? "active" : ""}
          onClick={() => setTag("chef")}
        >
          ✦ اختيار الشيف
        </button>
        <span className="results-count">{items.length} أصناف</span>
      </div>
      <div className="section-heading">
        <div>
          <span className="eyebrow">مختاراتنا لك</span>
          <h2>{category === "كل الأصناف" ? "الأكثر طلباً اليوم" : category}</h2>
        </div>
        <span className="section-line" />
      </div>
      <div className="menu-grid">
        {items.map((item) => (
          <button
            className="menu-card"
            key={item.id}
            onClick={() => onSelect(item)}
          >
            <div className="card-image">
              <img src={item.image} alt="" loading="lazy" />
              {item.popular && (
                <span className="popular-chip">الأكثر طلباً</span>
              )}
              <span className="plus">+</span>
            </div>
            <div className="card-body">
              <div className="card-title">
                <h3>{item.name}</h3>
                <span>{formatSyp(item.price)}</span>
              </div>
              <p>{item.desc}</p>
              <div className="card-meta">
                {item.tags.map((t) => (
                  <small key={t}>
                    {t === "chef" ? "✦ " : ""}
                    {t === "vegetarian" ? "♧ " : ""}
                    {tagLabels[t]}
                  </small>
                ))}
                <em>{item.en}</em>
              </div>
            </div>
          </button>
        ))}
      </div>
      {items.length === 0 && (
        <div className="empty-state">لا توجد أصناف مطابقة للبحث</div>
      )}
    </>
  );
}

function ItemModal({
  item,
  currency,
  rate,
  onClose,
  onAdd,
}: {
  item: Item;
  currency: "syp" | "usd";
  rate: number;
  onClose: () => void;
  onAdd: (i: Item, o: Option[], n: string) => void;
}) {
  const [selected, setSelected] = useState<Record<string, Option[]>>({});
  const [note, setNote] = useState("");
  const valid = !item.options?.some(
    (group) => group.required && !selected[group.id]?.length,
  );
  const extra = Object.values(selected)
    .flat()
    .reduce((sum, option) => sum + option.price, 0);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="item-modal">
        <button className="close" onClick={onClose}>
          ×
        </button>
        <img src={item.image} alt="" />
        <div className="modal-content">
          <span className="eyebrow">{item.category}</span>
          <h2>{item.name}</h2>
          <p className="modal-desc">{item.desc}</p>
          <div className="modal-price">
            {formatSyp(item.price + extra)}{" "}
            <small>
              {currency === "usd" && `≈ ${formatUsd(item.price + extra, rate)}`}
            </small>
          </div>
          {item.options?.map((group) => (
            <div className="option-group" key={group.id}>
              <div className="option-label">
                <strong>{group.name}</strong>
                {group.required && <span>مطلوب · اختر خياراً</span>}
              </div>
              {group.options.map((option) => (
                <label
                  className={
                    selected[group.id]?.some((entry) => entry.id === option.id)
                      ? "option selected"
                      : "option"
                  }
                  key={option.id}
                >
                  <input
                    type={group.required ? "radio" : "checkbox"}
                    name={group.id}
                    checked={selected[group.id]?.some(
                      (entry) => entry.id === option.id,
                    )}
                    onChange={() =>
                      setSelected((current) => {
                        const existing = current[group.id] ?? [];
                        const next = group.required
                          ? [option]
                          : existing.some((entry) => entry.id === option.id)
                            ? existing.filter((entry) => entry.id !== option.id)
                            : [...existing, option];
                        return { ...current, [group.id]: next };
                      })
                    }
                  />
                  <span>{option.name}</span>
                  <b>
                    {option.price
                      ? `+${formatSyp(option.price)}`
                      : "بدون إضافات"}
                  </b>
                </label>
              ))}
            </div>
          ))}
          <label className="note-field">
            <span>
              ملاحظات خاصة <small>(اختياري)</small>
            </span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="مثلاً: بدون بصل، الصوص جانباً..."
            />
          </label>
          <button
            disabled={!valid}
            className="primary wide"
            onClick={() => onAdd(item, Object.values(selected).flat(), note)}
          >
            أضف إلى الطلب <span>{formatSyp(item.price + extra)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function CartDrawer({
  cart,
  total,
  currency,
  rate,
  onClose,
  onQty,
  onCheckout,
}: {
  cart: CartLine[];
  total: number;
  currency: "syp" | "usd";
  rate: number;
  onClose: () => void;
  onQty: (key: string, d: number) => void;
  onCheckout: () => void;
}) {
  return (
    <div
      className="modal-backdrop drawer-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <aside className="cart-drawer">
        <div className="drawer-head">
          <div>
            <span className="eyebrow">طلبك الحالي</span>
            <h2>
              سلة الطلب <b>{cart.reduce((a, l) => a + l.qty, 0)}</b>
            </h2>
          </div>
          <button className="close" onClick={onClose}>
            ×
          </button>
        </div>
        {cart.length === 0 ? (
          <div className="empty-state">
            السلة فارغة
            <br />
            <button className="link-button" onClick={onClose}>
              تصفح القائمة
            </button>
          </div>
        ) : (
          <>
            <div className="cart-lines">
              {cart.map((line) => (
                <div className="cart-line" key={line.key}>
                  <img src={line.item.image} alt="" />
                  <div className="line-info">
                    <strong>{line.item.name}</strong>
                    <small>
                      {line.options.map((o) => o.name).join("، ") ||
                        "بدون إضافات"}
                    </small>
                    <b>
                      {formatSyp(
                        (line.item.price +
                          line.options.reduce((a, o) => a + o.price, 0)) *
                        line.qty,
                      )}
                    </b>
                  </div>
                  <div className="qty">
                    <button onClick={() => onQty(line.key, -1)}>−</button>
                    <b>{line.qty}</b>
                    <button onClick={() => onQty(line.key, 1)}>+</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="cart-summary">
              <div>
                <span>المجموع الفرعي</span>
                <b>{formatSyp(total)}</b>
              </div>
              {currency === "usd" && (
                <small>≈ {formatUsd(total, rate)} USD بسعر صرف تقريبي</small>
              )}
              <button className="primary wide" onClick={onCheckout}>
                متابعة الطلب <span>←</span>
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

function CheckoutModal({
  total,
  mode,
  setMode,
  onClose,
  onSubmit,
  settings,
}: {
  total: number;
  mode: Mode;
  setMode: (m: Mode) => void;
  onClose: () => void;
  onSubmit: (form: HTMLFormElement) => void | Promise<void>;
  settings?: RestaurantSettings;
}) {
  return (
    <div className="modal-backdrop">
      <div className="checkout-modal">
        <button className="close" onClick={onClose}>
          ×
        </button>
        <span className="eyebrow">الخطوة الأخيرة</span>
        <h2>تفاصيل الطلب</h2>
        <div className="mode-tabs">
          {(["dine-in", "takeaway", "delivery"] as Mode[]).map((m) => (
            <button
              className={mode === m ? "active" : ""}
              key={m}
              onClick={() => setMode(m)}
            >
              {m === "dine-in"
                ? "⌂ في المطعم"
                : m === "takeaway"
                  ? "▣ سفري"
                  : "⌁ توصيل"}
            </button>
          ))}
        </div>
        {settings &&
          !settings[
          mode === "dine-in"
            ? "dineIn"
            : mode === "takeaway"
              ? "takeaway"
              : "delivery"
          ] && (
            <div className="checkout-warning">
              هذا النوع من الطلبات غير متاح حالياً.
            </div>
          )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void onSubmit(e.currentTarget);
          }}
        >
          <label>
            الاسم <input name="customer" required placeholder="اسمك الكريم" />
          </label>
          <label>
            رقم الهاتف{" "}
            <input
              name="phone"
              required={mode !== "dine-in"}
              placeholder="09XXXXXXXX"
            />
          </label>
          {mode === "dine-in" && (
            <label>
              رقم الطاولة <input name="table" defaultValue="T-12" />
            </label>
          )}
          {mode === "delivery" && (
            <label>
              العنوان بالتفصيل{" "}
              <textarea
                name="address"
                required
                placeholder="الحي، الشارع، البناء، أقرب نقطة دالة"
              />
            </label>
          )}
          {mode === "takeaway" && (
            <label>
              وقت الاستلام{" "}
              <select name="pickup">
                <option>الآن (25 - 35 دقيقة)</option>
                <option>بعد ساعة</option>
                <option>غداً الساعة 1:00 م</option>
              </select>
            </label>
          )}
          <label>
            طريقة الدفع{" "}
            <select name="payment">
              <option>
                {mode === "delivery"
                  ? "الدفع نقداً عند الاستلام"
                  : "الدفع نقداً"}
              </option>
              <option>Syriatel Cash</option>
              <option>Sham Cash / BEMO</option>
              <option>MTN Cash</option>
            </select>
          </label>
          <label>
            مرجع الحوالة <small>(اختياري للمحافظ الإلكترونية)</small>
            <input
              name="paymentReference"
              placeholder="رقم العملية أو اسم المرسل"
            />
          </label>
          {mode === "delivery" && settings?.zones.length ? (
            <label>
              منطقة التوصيل
              <select name="zone">
                {settings.zones
                  .filter((zone) => zone.active)
                  .map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.name} — {formatSyp(zone.fee)} · حد أدنى{" "}
                      {formatSyp(zone.minimum)}
                    </option>
                  ))}
              </select>
            </label>
          ) : null}
          <div className="checkout-total">
            <span>الإجمالي</span>
            <strong>{formatSyp(total)}</strong>
          </div>
          {mode === "delivery" && settings?.zones.length ? (
            <small className="checkout-hint">
              تطبق أجرة التوصيل والحد الأدنى حسب المنطقة التي يحددها المطعم.
            </small>
          ) : null}
          <button
            className="primary wide"
            type="submit"
            disabled={Boolean(
              settings &&
              !settings[
              mode === "dine-in"
                ? "dineIn"
                : mode === "takeaway"
                  ? "takeaway"
                  : "delivery"
              ],
            )}
          >
            تأكيد الطلب <span>←</span>
          </button>
        </form>
      </div>
    </div>
  );
}

function OrdersView({
  orders,
  onTrack,
  onMenu,
}: {
  orders: Order[];
  onTrack: (o: Order) => void;
  onMenu: () => void;
}) {
  return (
    <div className="orders-page">
      <div className="page-header">
        <div>
          <span className="eyebrow">متابعة مباشرة</span>
          <h1>طلباتي</h1>
          <p>تابع حالة طلباتك الحالية والسابقة.</p>
        </div>
        <button className="primary" onClick={onMenu}>
          + طلب جديد
        </button>
      </div>
      {orders.length === 0 ? (
        <div className="empty-panel">
          <div className="empty-icon">◷</div>
          <h2>لا توجد طلبات بعد</h2>
          <p>ابدأ بتصفح القائمة وأضف وجبتك المفضلة.</p>
          <button className="secondary" onClick={onMenu}>
            تصفح القائمة
          </button>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map((order) => (
            <button
              className="order-row"
              key={order.id}
              onClick={() => onTrack(order)}
            >
              <div className="order-number">
                <strong>{order.id}</strong>
                <small>
                  {new Date(order.createdAt).toLocaleTimeString("ar-SY", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </small>
              </div>
              <div>
                <strong>{modeLabels[order.mode]}</strong>
                <small>
                  {order.lines.reduce((a, l) => a + l.qty, 0)} أصناف ·{" "}
                  {formatSyp(order.total)}
                </small>
              </div>
              <span className={`status ${order.status}`}>
                {statusLabels[order.status]}
              </span>
              <span>←</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StaffAuthModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const ownerEmail = "admin@qrcode-syria.com";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const finishInitialOwnerOnboarding = async (signedInEmail: string) => {
    if (signedInEmail.toLowerCase() !== ownerEmail) return true;
    const { error } = await supabase.rpc("bootstrap_initial_owner");
    if (!error) return true;
    if (error.message.includes("already been completed")) return true;
    setMessage(`تم تسجيل الدخول، لكن تعذر تفعيل عضوية المالك: ${error.message}`);
    return false;
  };

  const signIn = async () => {
    setLoading(true);
    setMessage("");
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      setLoading(false);
      setMessage(
        error.message.toLowerCase().includes("invalid login")
          ? "البريد الإلكتروني أو كلمة المرور غير صحيحة."
          : `تعذر تسجيل الدخول: ${error.message}`,
      );
      return;
    }
    const ready = await finishInitialOwnerOnboarding(data.user.email ?? email);
    setLoading(false);
    if (ready) onSuccess();
  };

  const signUpInitialOwner = async () => {
    if (email.trim().toLowerCase() !== ownerEmail) {
      setMessage(`التسجيل الأولي متاح فقط للبريد ${ownerEmail}.`);
      return;
    }
    setLoading(true);
    setMessage("");
    const { data, error } = await supabase.auth.signUp({
      email: ownerEmail,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { display_name: "مالك سُفرة" },
      },
    });
    if (error) {
      setLoading(false);
      setMessage(`تعذر إنشاء حساب المالك: ${error.message}`);
      return;
    }
    if (!data.session) {
      setLoading(false);
      setMessage(
        "تم إنشاء الحساب. افتح رسالة التأكيد في البريد الإلكتروني، ثم عد وسجّل الدخول لإكمال تفعيل عضوية المالك.",
      );
      return;
    }
    const ready = await finishInitialOwnerOnboarding(ownerEmail);
    setLoading(false);
    if (ready) onSuccess();
  };

  const resetPassword = async () => {
    if (!email.trim()) {
      setMessage("أدخل البريد الإلكتروني أولاً لإرسال رابط الاستعادة.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin,
    });
    setLoading(false);
    setMessage(
      error
        ? `تعذر إرسال الرابط: ${error.message}`
        : "أُرسل رابط استعادة كلمة المرور إلى بريدك إن كان الحساب موجوداً.",
    );
  };

  return (
    <div className="modal-backdrop auth-backdrop" onMouseDown={onClose}>
      <div
        className="staff-auth-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="close" onClick={onClose} aria-label="إغلاق">
          ×
        </button>
        <span className="auth-shield">◈</span>
        <span className="eyebrow">دخول آمن</span>
        <h2>لوحة المطعم</h2>
        <p>
          استخدم حساب الموظف الذي أضافه مالك المطعم. لا يحتاج الزبائن إلى حساب.
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void signIn();
          }}
        >
          <label>
            البريد الإلكتروني
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={ownerEmail}
            />
          </label>
          <label>
            كلمة المرور
            <input
              type="password"
              autoComplete="current-password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
            />
          </label>
          {message && (
            <div className="auth-message" role="status">
              {message}
            </div>
          )}
          <button className="primary wide" type="submit" disabled={loading}>
            {loading ? "جارٍ تسجيل الدخول…" : "تسجيل الدخول"}
          </button>
          {email.trim().toLowerCase() === ownerEmail && (
            <button
              className="secondary wide"
              type="button"
              disabled={loading || password.length < 6}
              onClick={() => void signUpInitialOwner()}
            >
              إنشاء حساب المالك لأول مرة
            </button>
          )}
          <button
            className="auth-reset"
            type="button"
            disabled={loading}
            onClick={() => void resetPassword()}
          >
            نسيت كلمة المرور؟
          </button>
        </form>
        <small className="auth-security-note">
          الصلاحيات مرتبطة بعضوية المطعم وتُطبق في قاعدة البيانات.
        </small>
      </div>
    </div>
  );
}

function TrackingModal({
  order,
  onClose,
  onWhatsApp,
}: {
  order: Order;
  onClose: () => void;
  onWhatsApp: (o: Order) => void;
}) {
  const [trackedOrder, setTrackedOrder] = useState(order);
  const [trackingMessage, setTrackingMessage] = useState("");

  useEffect(() => {
    setTrackedOrder(order);
    if (!order.publicToken) return;
    let active = true;

    const refresh = async () => {
      const { data, error } = await supabase.rpc("track_public_order", {
        p_token: order.publicToken,
      });
      if (!active) return;
      if (error || !data) {
        setTrackingMessage("تعذر تحديث الحالة الآن — سنحاول مجدداً تلقائياً.");
        return;
      }
      const payload = data as {
        status: Order["status"];
        total: number;
        table?: string;
        address?: string;
        createdAt?: string;
      };
      setTrackedOrder((current) => ({
        ...current,
        status: payload.status,
        total: Number(payload.total),
        table: payload.table ?? current.table,
        address: payload.address ?? current.address,
        createdAt: payload.createdAt ?? current.createdAt,
        updatedAt: new Date().toISOString(),
      }));
      setTrackingMessage("تم تحديث الحالة مباشرة من المطعم.");
    };

    void refresh();
    const timer = window.setInterval(() => void refresh(), 15000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [order]);
  const displayOrder = trackedOrder;
  const steps: Order["status"][] = [
    "received",
    "preparing",
    "ready",
    displayOrder.mode === "delivery" ? "out-for-delivery" : "completed",
  ];
  const current = steps.indexOf(displayOrder.status);
  return (
    <div className="modal-backdrop">
      <div className="tracking-modal">
        <button className="close" onClick={onClose}>
          ×
        </button>
        <div className="tracking-top">
          <span className="success-check">✓</span>
          <div>
            <span className="eyebrow">طلبك لدى سُفرة</span>
            <h2>{displayOrder.id}</h2>
            <p>
              {modeLabels[displayOrder.mode]} · {formatSyp(displayOrder.total)}
            </p>
          </div>
        </div>
        <div className="tracker">
          {steps.map((step, i) => (
            <div
              className={i <= current ? "track-step done" : "track-step"}
              key={step}
            >
              <span>{i <= current ? "✓" : i + 1}</span>
              <small>{statusLabels[step]}</small>
            </div>
          ))}
        </div>
        <div className="tracking-note">
          <strong>{statusLabels[displayOrder.status]}</strong>
          <span>
            {displayOrder.status === "received"
              ? "تم إرسال طلبك إلى المطعم، سيتم تأكيده قريباً."
              : displayOrder.status === "completed"
                ? "صحة وعافية! نتمنى أن تكون التجربة نالت إعجابك."
                : "فريقنا يعمل على تجهيز طلبك الآن."}
          </span>
          {trackingMessage && <small>{trackingMessage}</small>}
        </div>
        <button
          className="secondary wide"
          onClick={() => onWhatsApp(displayOrder)}
        >
          تواصل مع المطعم عبر واتساب
        </button>
      </div>
    </div>
  );
}

function AdminView({
  restaurant,
  settings,
  categories,
  tab,
  setTab,
  orders,
  restaurantDatabaseId,
  onStatus,
  onWhatsApp,
  onOrderChange,
  onSwitch,
  memberships,
  staffEmail,
  onSignOut,
  onItemsChange,
  onCategoriesChange,
  onSettingsChange,
}: {
  restaurant: Restaurant;
  settings: RestaurantSettings;
  categories: MenuCategory[];
  tab:
  | "overview"
  | "orders"
  | "menu"
  | "tables"
  | "reports"
  | "operations"
  | "settings";
  setTab: (
    t:
      | "overview"
      | "orders"
      | "menu"
      | "tables"
      | "reports"
      | "operations"
      | "settings",
  ) => void;
  orders: Order[];
  restaurantDatabaseId: string;
  onStatus: (id: string, s: Order["status"], patch?: Partial<Order>) => void;
  onOrderChange: (id: string, patch: Partial<Order>) => void;
  onWhatsApp: (o: Order) => void;
  onSwitch: (id: string) => void;
  memberships: RestaurantMembership[];
  staffEmail: string;
  onSignOut: () => void | Promise<void>;
  onItemsChange: (items: Item[]) => void;
  onCategoriesChange: (categories: MenuCategory[]) => void;
  onSettingsChange: (settings: RestaurantSettings) => void | Promise<void>;
}) {
  const [adminFilter, setAdminFilter] = useState<"all" | Mode>("all");
  const previousOrderCount = useRef(orders.length);
  const [operationState, setOperationState] = useState<OperationsState | null>(
    null,
  );
  const [statusFilter, setStatusFilter] = useState<"all" | Order["status"]>(
    "all",
  );
  const [orderQuery, setOrderQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(
    () => localStorage.getItem("sufra-order-sound") !== "off",
  );
  useEffect(
    () =>
      localStorage.setItem("sufra-order-sound", soundEnabled ? "on" : "off"),
    [soundEnabled],
  );
  useEffect(() => {
    setOperationState(
      readStored<OperationsState | null>(
        `sufra-operations-${restaurant.id}`,
        null,
      ),
    );
  }, [restaurant.id]);
  useEffect(() => {
    if (orders.length > previousOrderCount.current) {
      const newest = orders[0];
      if (newest && operationState?.notifications && "Notification" in window) {
        if (Notification.permission === "granted") {
          new Notification("طلب جديد", {
            body: `${newest.id} · ${formatSyp(newest.total)}`,
          });
        }
      }
      if (newest && operationState?.sound) {
        const AudioContextClass =
          window.AudioContext ||
          (
            window as typeof window & {
              webkitAudioContext?: typeof AudioContext;
            }
          ).webkitAudioContext;
        if (AudioContextClass) {
          const context = new AudioContextClass();
          const oscillator = context.createOscillator();
          const gain = context.createGain();
          oscillator.frequency.value = 760;
          gain.gain.setValueAtTime(0.08, context.currentTime);
          gain.gain.exponentialRampToValueAtTime(
            0.001,
            context.currentTime + 0.35,
          );
          oscillator.connect(gain);
          gain.connect(context.destination);
          oscillator.start();
          oscillator.stop(context.currentTime + 0.35);
        }
      }
    }
    previousOrderCount.current = orders.length;
  }, [orders, operationState]);
  const visible = orders.filter(
    (o) =>
      (adminFilter === "all" || o.mode === adminFilter) &&
      (statusFilter === "all" || o.status === statusFilter) &&
      (!orderQuery ||
        `${o.id} ${o.customer} ${o.phone} ${o.table} ${o.address}`
          .toLowerCase()
          .includes(orderQuery.toLowerCase())),
  );
  const revenue = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((sum, order) => sum + order.total, 0);
  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <span className="eyebrow">مساحة العمل</span>
          <h1>لوحة المطعم</h1>
          <p>
            إدارة عمليات اليوم — <strong>{restaurant.name}</strong>
          </p>
        </div>
        <div className="admin-account-actions">
          <div className="staff-identity">
            <span>
              {memberships.find(
                (entry) => entry.restaurantSlug === restaurant.id,
              )?.displayName || staffEmail}
            </span>
            <small>
              {memberships.find(
                (entry) => entry.restaurantSlug === restaurant.id,
              )?.role || "staff"}
            </small>
          </div>
          <div className="restaurant-switch">
            <span>المطعم الحالي</span>
            <select
              value={restaurant.id}
              onChange={(e) => onSwitch(e.target.value)}
            >
              {memberships.map((entry) => (
                <option key={entry.restaurantId} value={entry.restaurantSlug}>
                  {entry.restaurantName}
                </option>
              ))}
            </select>
          </div>
          <button
            className="secondary sign-out-button"
            onClick={() => void onSignOut()}
          >
            خروج
          </button>
        </div>
      </div>
      <div className="admin-tabs">
        <button
          className={tab === "overview" ? "active" : ""}
          onClick={() => setTab("overview")}
        >
          نظرة عامة
        </button>
        <button
          className={tab === "orders" ? "active" : ""}
          onClick={() => setTab("orders")}
        >
          الطلبات{" "}
          <b>
            {
              orders.filter(
                (o) => !["completed", "cancelled"].includes(o.status),
              ).length
            }
          </b>
        </button>
        <button
          className={tab === "menu" ? "active" : ""}
          onClick={() => setTab("menu")}
        >
          القائمة <b>{restaurant.items.length}</b>
        </button>
        <button
          className={tab === "tables" ? "active" : ""}
          onClick={() => setTab("tables")}
        >
          الطاولات و QR
        </button>
        <button
          className={tab === "reports" ? "active" : ""}
          onClick={() => setTab("reports")}
        >
          التقارير
        </button>
        <button
          className={tab === "operations" ? "active" : ""}
          onClick={() => setTab("operations")}
        >
          الفريق والتشغيل
        </button>
        <button
          className={tab === "settings" ? "active" : ""}
          onClick={() => setTab("settings")}
        >
          الإعدادات
        </button>
      </div>
      {tab === "overview" && (
        <AdminOverview
          orders={orders}
          revenue={revenue}
          onOpenOrders={() => setTab("orders")}
        />
      )}
      {tab === "orders" && (
        <>
          <div className="admin-toolbar order-desk-toolbar">
            <div className="order-search">
              <span>⌕</span>
              <input
                value={orderQuery}
                onChange={(event) => setOrderQuery(event.target.value)}
                placeholder="رقم الطلب، العميل، الهاتف..."
              />
            </div>
            <div className="filter-pills">
              <button
                className={adminFilter === "all" ? "active" : ""}
                onClick={() => setAdminFilter("all")}
              >
                الكل
              </button>
              <button
                className={adminFilter === "dine-in" ? "active" : ""}
                onClick={() => setAdminFilter("dine-in")}
              >
                في المطعم
              </button>
              <button
                className={adminFilter === "takeaway" ? "active" : ""}
                onClick={() => setAdminFilter("takeaway")}
              >
                سفري
              </button>
              <button
                className={adminFilter === "delivery" ? "active" : ""}
                onClick={() => setAdminFilter("delivery")}
              >
                توصيل
              </button>
            </div>
            <select
              aria-label="تصفية حسب الحالة"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as typeof statusFilter)
              }
            >
              <option value="all">كل الحالات</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <button
              className={soundEnabled ? "sound-toggle on" : "sound-toggle"}
              onClick={() => setSoundEnabled((value) => !value)}
            >
              {soundEnabled ? "🔔 التنبيهات مفعلة" : "🔕 التنبيهات متوقفة"}
            </button>
            <span className="sync">● متصل الآن · آخر تحديث الآن</span>
          </div>
          <div className="kanban">
            {(
              [
                "received",
                "confirmed",
                "preparing",
                "ready",
                "out-for-delivery",
                "completed",
                "cancelled",
              ] as Order["status"][]
            ).map((status) => (
              <section className="kanban-column" key={status}>
                <div className="column-heading">
                  <span className={`dot ${status}`} />
                  <h3>
                    {status === "received"
                      ? "طلبات جديدة"
                      : statusLabels[status]}
                  </h3>
                  <b>{visible.filter((o) => o.status === status).length}</b>
                </div>
                {visible
                  .filter((o) => o.status === status)
                  .map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      onStatus={onStatus}
                      onWhatsApp={onWhatsApp}
                      onOpen={() => setSelectedOrder(order)}
                    />
                  ))}
                {visible.filter((o) => o.status === status).length === 0 && (
                  <div className="column-empty">لا توجد طلبات</div>
                )}
              </section>
            ))}
          </div>
          {selectedOrder && (
            <OrderDetails
              order={
                orders.find((entry) => entry.id === selectedOrder.id) ??
                selectedOrder
              }
              onClose={() => setSelectedOrder(null)}
              onStatus={onStatus}
              onChange={onOrderChange}
              onWhatsApp={onWhatsApp}
            />
          )}
        </>
      )}
      {tab === "menu" && (
        <MenuManager
          restaurant={restaurant}
          restaurantDatabaseId={restaurantDatabaseId}
          categories={categories}
          onChange={onItemsChange}
          onCategoriesChange={onCategoriesChange}
        />
      )}
      {tab === "tables" && (
        <TablesManager
          restaurant={restaurant}
          restaurantDatabaseId={restaurantDatabaseId}
        />
      )}
      {tab === "reports" && (
        <ReportsPanel
          orders={orders}
          restaurantDatabaseId={restaurantDatabaseId}
        />
      )}
      {tab === "operations" && (
        <OperationsPanel
          restaurantId={restaurant.id}
          restaurantDatabaseId={restaurantDatabaseId}
        />
      )}
      {tab === "settings" && (
        <SettingsPanel settings={settings} onChange={onSettingsChange} />
      )}
    </div>
  );
}

function OperationsPanel({
  restaurantId,
  restaurantDatabaseId,
}: {
  restaurantId: string;
  restaurantDatabaseId: string;
}) {
  const key = `sufra-operations-${restaurantId}`;
  const initial: OperationsState = {
    acceptingOrders: true,
    notifications: true,
    sound: true,
    staff: [{ id: "owner", name: "مدير المطعم", role: "owner", active: true }],
    audit: [],
  };
  const [state, setState] = useState<OperationsState>(() =>
    readStored(key, initial),
  );
  const [operationError, setOperationError] = useState("");
  const [staffBusy, setStaffBusy] = useState(false);
  const loadOperations = async () => {
    if (!restaurantDatabaseId) return;
    const { data, error } = await supabase.rpc("get_admin_operations", {
      p_restaurant_id: restaurantDatabaseId,
    });
    if (error || !data) {
      setOperationError(error?.message || "تعذر تحميل بيانات التشغيل");
      return;
    }
    const remote = data as {
      acceptingOrders: boolean;
      notifications: boolean;
      sound: boolean;
      staff: StaffMember[];
      audit: AuditEntry[];
    };
    setState((current) => ({
      ...current,
      acceptingOrders: remote.acceptingOrders,
      notifications: remote.notifications,
      sound: remote.sound,
      staff: remote.staff,
      audit: remote.audit,
    }));
    setOperationError("");
  };
  useEffect(() => {
    setState(readStored(key, initial));
    void loadOperations();
    // The restaurant UUID is the remote state boundary.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, restaurantDatabaseId]);
  useEffect(() => writeStored(key, state), [key, state]);
  const update = async (patch: Partial<OperationsState>, action: string) => {
    const previous = state;
    setState((current) => ({ ...current, ...patch }));
    const hasRemotePatch =
      patch.acceptingOrders !== undefined ||
      patch.notifications !== undefined ||
      patch.sound !== undefined;
    if (!hasRemotePatch || !restaurantDatabaseId) return;
    const { error } = await supabase.rpc("update_admin_operations", {
      p_restaurant_id: restaurantDatabaseId,
      p_accepting_orders: patch.acceptingOrders ?? null,
      p_action: action,
      p_notifications: patch.notifications ?? null,
      p_sound: patch.sound ?? null,
    });
    if (error) {
      setState(previous);
      setOperationError(error.message);
      return;
    }
    await loadOperations();
  };
  const manageStaff = async (
    action: "add" | "update" | "toggle" | "remove",
    member?: StaffMember,
    patch?: Partial<StaffMember>,
    email?: string,
  ) => {
    if (!restaurantDatabaseId || staffBusy) return;
    setStaffBusy(true);
    setOperationError("");
    const { error } = await supabase.rpc("manage_admin_staff", {
      p_restaurant_id: restaurantDatabaseId,
      p_action: action,
      p_user_id: member?.id || null,
      p_email: email || null,
      p_display_name: patch?.name || member?.name || null,
      p_role: patch?.role || member?.role || "cashier",
      p_active: patch?.active ?? member?.active ?? true,
    });
    if (error) setOperationError(error.message);
    else await loadOperations();
    setStaffBusy(false);
  };
  const addStaff = async () => {
    const email = window.prompt("البريد الإلكتروني لحساب الموظف")?.trim();
    if (!email) return;
    const name = window.prompt("اسم الموظف")?.trim();
    if (!name) return;
    const role = (window.prompt(
      "الدور: manager / cashier / kitchen",
      "cashier",
    ) || "cashier") as StaffMember["role"];
    const safeRole = ["manager", "cashier", "kitchen"].includes(role)
      ? role
      : "cashier";
    await manageStaff("add", undefined, { name, role: safeRole }, email);
  };
  const roleLabels: Record<StaffMember["role"], string> = {
    owner: "المالك",
    manager: "مدير",
    cashier: "كاشير",
    kitchen: "المطبخ",
  };
  return (
    <div className="operations-panel">
      <div className="manager-intro">
        <div>
          <span className="eyebrow">التحكم والصلاحيات</span>
          <h2>الفريق وحالة التشغيل</h2>
          <p>تحكم باستقبال الطلبات والتنبيهات ووصول الموظفين.</p>
        </div>
        <span
          className={
            state.acceptingOrders
              ? "operation-state open"
              : "operation-state paused"
          }
        >
          {state.acceptingOrders ? "● يستقبل الطلبات" : "Ⅱ الطلبات متوقفة"}
        </span>
      </div>
      <div className="operations-grid">
        <section>
          <h3>تشغيل المطعم</h3>
          <div className="setting-toggles">
            <label>
              <span>
                استقبال الطلبات<small>إيقافه يبقي القائمة متاحة للتصفح</small>
              </span>
              <input
                type="checkbox"
                checked={state.acceptingOrders}
                onChange={(event) =>
                  void update(
                    { acceptingOrders: event.target.checked },
                    event.target.checked
                      ? "استئناف استقبال الطلبات"
                      : "إيقاف استقبال الطلبات",
                  )
                }
              />
            </label>
            <label>
              <span>
                إشعارات المتصفح<small>إظهار إشعار عند وصول طلب</small>
              </span>
              <input
                type="checkbox"
                checked={state.notifications}
                onChange={async (event) => {
                  const enabled = event.target.checked;
                  if (enabled && "Notification" in window) {
                    const permission = await Notification.requestPermission();
                    if (permission !== "granted") {
                      void update(
                        { notifications: false },
                        "رفض إذن إشعارات المتصفح",
                      );
                      return;
                    }
                  }
                  await update(
                    { notifications: enabled },
                    "تغيير إعداد إشعارات المتصفح",
                  );
                }}
              />
            </label>
            <label>
              <span>
                التنبيه الصوتي<small>صوت عند وصول طلب جديد</small>
              </span>
              <input
                type="checkbox"
                checked={state.sound}
                onChange={(event) =>
                  void update(
                    { sound: event.target.checked },
                    "تغيير إعداد صوت الطلبات",
                  )
                }
              />
            </label>
          </div>
        </section>
        <section>
          <div className="settings-section-head">
            <h3>أعضاء الفريق</h3>
            <button disabled={staffBusy} onClick={() => void addStaff()}>
              {staffBusy ? "جارٍ الحفظ..." : "+ إضافة موظف"}
            </button>
          </div>
          {operationError && <p className="form-error">{operationError}</p>}
          <div className="staff-list">
            {state.staff.map((member) => (
              <div key={member.id}>
                <div>
                  <strong>{member.name}</strong>
                  <small>{roleLabels[member.role]}</small>
                </div>
                <select
                  value={member.role}
                  disabled={member.role === "owner"}
                  onChange={(event) =>
                    void manageStaff("update", member, {
                      role: event.target.value as StaffMember["role"],
                    })
                  }
                >
                  <option value="manager">مدير</option>
                  <option value="cashier">كاشير</option>
                  <option value="kitchen">المطبخ</option>
                  {member.role === "owner" && (
                    <option value="owner">المالك</option>
                  )}
                </select>
                <button
                  disabled={member.role === "owner" || staffBusy}
                  onClick={() =>
                    void manageStaff("toggle", member, {
                      active: !member.active,
                    })
                  }
                >
                  {member.active ? "تعطيل" : "تفعيل"}
                </button>
                <button
                  className="danger-text"
                  disabled={member.role === "owner" || staffBusy}
                  onClick={() => {
                    if (window.confirm(`حذف وصول ${member.name} نهائياً؟`)) {
                      void manageStaff("remove", member);
                    }
                  }}
                >
                  حذف
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className="audit-panel">
        <div className="settings-section-head">
          <h3>سجل النشاط</h3>
          <small>سجل دائم للعمليات الإدارية</small>
        </div>
        <div className="audit-list">
          {state.audit.map((entry) => (
            <div key={entry.id}>
              <span>✓</span>
              <div>
                <strong>{entry.action}</strong>
                <small>
                  {entry.actor} ·{" "}
                  {new Date(entry.createdAt).toLocaleString("ar-SY")}
                </small>
              </div>
            </div>
          ))}
          {!state.audit.length && (
            <div className="column-empty">لا توجد أنشطة مسجلة بعد</div>
          )}
        </div>
      </section>
    </div>
  );
}

type RemoteReport = {
  orderCount: number;
  paidOrderCount: number;
  cancelledOrderCount: number;
  revenue: number;
  byMode: { mode: Mode; count: number; revenue: number }[];
  topItems: { name: string; qty: number; revenue: number }[];
};

function ReportsPanel({
  orders,
  restaurantDatabaseId,
}: {
  orders: Order[];
  restaurantDatabaseId: string;
}) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [remoteReport, setRemoteReport] = useState<RemoteReport | null>(null);
  const [reportError, setReportError] = useState("");
  const filtered = orders.filter((order) => {
    const date = order.createdAt.slice(0, 10);
    return (!from || date >= from) && (!to || date <= to);
  });
  const paid = filtered.filter((order) => order.status !== "cancelled");
  const revenue = paid.reduce((sum, order) => sum + order.total, 0);
  const byMode = (["dine-in", "takeaway", "delivery"] as Mode[]).map(
    (mode) => ({
      mode,
      count: filtered.filter((order) => order.mode === mode).length,
      revenue: paid
        .filter((order) => order.mode === mode)
        .reduce((sum, order) => sum + order.total, 0),
    }),
  );
  const itemSales = new Map<
    string,
    { name: string; qty: number; revenue: number }
  >();
  paid.forEach((order) =>
    order.lines.forEach((line) => {
      const current = itemSales.get(line.item.id) ?? {
        name: line.item.name,
        qty: 0,
        revenue: 0,
      };
      current.qty += line.qty;
      current.revenue +=
        (line.item.price +
          line.options.reduce((sum, option) => sum + option.price, 0)) *
        line.qty;
      itemSales.set(line.item.id, current);
    }),
  );
  const localTopItems = [...itemSales.values()]
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 8);
  useEffect(() => {
    let active = true;
    const loadReport = async () => {
      if (!restaurantDatabaseId) return;
      const { data, error } = await supabase.rpc("get_admin_reports", {
        p_restaurant_id: restaurantDatabaseId,
        p_from: from || null,
        p_to: to || null,
      });
      if (!active) return;
      if (error || !data) {
        setReportError(error?.message || "تعذر تحميل التقرير");
        return;
      }
      setRemoteReport(data as RemoteReport);
      setReportError("");
    };
    void loadReport();
    return () => {
      active = false;
    };
  }, [from, to, restaurantDatabaseId]);
  const reportRevenue = remoteReport?.revenue ?? revenue;
  const reportOrderCount = remoteReport?.orderCount ?? filtered.length;
  const reportPaidCount = remoteReport?.paidOrderCount ?? paid.length;
  const reportCancelledCount =
    remoteReport?.cancelledOrderCount ??
    filtered.filter((order) => order.status === "cancelled").length;
  const reportByMode = remoteReport?.byMode ?? byMode;
  const topItems = remoteReport?.topItems ?? localTopItems;
  const exportCsv = () => {
    const rows = [
      [
        "Order ID",
        "Date",
        "Customer",
        "Mode",
        "Status",
        "Payment",
        "Payment status",
        "Total SYP",
      ],
      ...filtered.map((order) => [
        order.id,
        order.createdAt,
        order.customer,
        order.mode,
        order.status,
        order.payment,
        order.paymentStatus || "pending",
        String(order.total),
      ]),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n")}`;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    link.download = `orders-${from || "all"}-${to || "today"}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };
  return (
    <div className="reports-panel">
      <div className="manager-intro">
        <div>
          <span className="eyebrow">التحليلات والتصدير</span>
          <h2>تقارير المبيعات والطلبات</h2>
          <p>نتائج فعلية محسوبة من الطلبات المحفوظة في هذا المطعم.</p>
        </div>
        <button className="primary" onClick={exportCsv}>
          تنزيل CSV
        </button>
      </div>
      {reportError && <p className="form-error">{reportError}</p>}
      <div className="report-filters">
        <label>
          من
          <input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </label>
        <label>
          إلى
          <input
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </label>
        <button
          onClick={() => {
            setFrom("");
            setTo("");
          }}
        >
          كل الفترة
        </button>
      </div>
      <div className="metric-grid report-metrics">
        <article>
          <div>
            <small>صافي المبيعات</small>
            <strong>{formatSyp(reportRevenue)}</strong>
            <em>دون الطلبات الملغاة</em>
          </div>
        </article>
        <article>
          <div>
            <small>عدد الطلبات</small>
            <strong>{reportOrderCount}</strong>
            <em>{reportPaidCount} طلب محتسب</em>
          </div>
        </article>
        <article>
          <div>
            <small>متوسط الطلب</small>
            <strong>
              {formatSyp(
                reportPaidCount ? reportRevenue / reportPaidCount : 0,
              )}
            </strong>
            <em>لكل طلب محتسب</em>
          </div>
        </article>
        <article>
          <div>
            <small>الطلبات الملغاة</small>
            <strong>{reportCancelledCount}</strong>
            <em>خلال الفترة المحددة</em>
          </div>
        </article>
      </div>
      <div className="report-grid">
        <section>
          <div className="panel-title">
            <div>
              <span className="eyebrow">حسب القناة</span>
              <h2>أنواع الطلبات</h2>
            </div>
          </div>
          <div className="breakdown-list">
            {reportByMode.map((entry) => (
              <div key={entry.mode}>
                <span>
                  {modeLabels[entry.mode]} <small>{entry.count} طلب</small>
                </span>
                <strong>{formatSyp(entry.revenue)}</strong>
              </div>
            ))}
          </div>
        </section>
        <section>
          <div className="panel-title">
            <div>
              <span className="eyebrow">الأداء</span>
              <h2>الأصناف الأكثر مبيعاً</h2>
            </div>
          </div>
          <div className="breakdown-list">
            {topItems.map((item, index) => (
              <div key={item.name}>
                <span>
                  <b>{index + 1}</b> {item.name} <small>{item.qty} وحدة</small>
                </span>
                <strong>{formatSyp(item.revenue)}</strong>
              </div>
            ))}
            {!topItems.length && (
              <div className="column-empty">لا توجد مبيعات ضمن الفترة</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function AdminOverview({
  orders,
  revenue,
  onOpenOrders,
}: {
  orders: Order[];
  revenue: number;
  onOpenOrders: () => void;
}) {
  const active = orders.filter(
    (o) => !["completed", "cancelled"].includes(o.status),
  ).length;
  return (
    <div className="overview">
      <div className="metric-grid">
        <article>
          <span className="metric-icon coral">↗</span>
          <div>
            <small>مبيعات اليوم</small>
            <strong>{formatSyp(revenue)}</strong>
            <em>+12% عن أمس</em>
          </div>
        </article>
        <article>
          <span className="metric-icon green">▤</span>
          <div>
            <small>طلبات اليوم</small>
            <strong>{orders.length || 0}</strong>
            <em>{active} قيد التنفيذ</em>
          </div>
        </article>
        <article>
          <span className="metric-icon blue">◷</span>
          <div>
            <small>متوسط التجهيز</small>
            <strong>18 دقيقة</strong>
            <em>أسرع بـ 3 دقائق</em>
          </div>
        </article>
        <article>
          <span className="metric-icon gold">★</span>
          <div>
            <small>رضا العملاء</small>
            <strong>4.8 / 5</strong>
            <em>من 124 تقييماً</em>
          </div>
        </article>
      </div>
      <div className="overview-grid">
        <section className="activity-panel">
          <div className="panel-title">
            <div>
              <span className="eyebrow">نشاط اليوم</span>
              <h2>المبيعات حسب الساعة</h2>
            </div>
            <span className="legend">● المبيعات</span>
          </div>
          <div className="chart-bars">
            {[28, 42, 34, 66, 53, 84, 71, 92, 63, 48, 78, 57].map((h, i) => (
              <div key={i}>
                <span style={{ height: `${h}%` }} />
                <small>{i + 10}</small>
              </div>
            ))}
          </div>
        </section>
        <section className="quick-panel">
          <div className="panel-title">
            <div>
              <span className="eyebrow">إجراءات سريعة</span>
              <h2>إدارة الوردية</h2>
            </div>
          </div>
          <button onClick={onOpenOrders}>
            <span>▤</span>
            <div>
              <strong>فتح مكتب الطلبات</strong>
              <small>{active} طلبات تحتاج المتابعة</small>
            </div>
            ←
          </button>
          <button>
            <span>⊘</span>
            <div>
              <strong>إيقاف استقبال الطلبات</strong>
              <small>القائمة تبقى متاحة للتصفح</small>
            </div>
            <i className="mini-switch on" />
          </button>
          <button>
            <span>⌁</span>
            <div>
              <strong>نسخ رابط القائمة</strong>
              <small>شارك الرابط على وسائل التواصل</small>
            </div>
            ←
          </button>
        </section>
      </div>
    </div>
  );
}

function TablesManager({
  restaurant,
  restaurantDatabaseId,
}: {
  restaurant: Restaurant;
  restaurantDatabaseId: string;
}) {
  const storageKey = `sufra-tables-${restaurant.id}`;
  const [copied, setCopied] = useState("");
  const [editing, setEditing] = useState<RestaurantTable | "new" | null>(null);
  const defaultTables = () =>
    Array.from({ length: 12 }, (_, index) => ({
      id: `table-${index + 1}`,
      name: `الطاولة ${String(index + 1).padStart(2, "0")}`,
      area: index < 8 ? "الصالة الرئيسية" : "التراس",
      active: true,
    }));
  const [tables, setTables] = useState<RestaurantTable[]>(() =>
    readStored<RestaurantTable[]>(storageKey, defaultTables()),
  );
  useEffect(() => {
    setTables(readStored<RestaurantTable[]>(storageKey, defaultTables()));
  }, [storageKey]);
  useEffect(
    () => writeStored(storageKey, tables),
    [storageKey, tables],
  );
  const tableUrl = (table: RestaurantTable) =>
    `${location.origin}${location.pathname}?restaurant=${restaurant.id}&table=${encodeURIComponent(table.id)}`;
  const persistTables = async (nextTables: RestaurantTable[]) => {
    if (!restaurantDatabaseId) return;
    const { error } = await supabase.rpc("sync_admin_tables", {
      p_restaurant_id: restaurantDatabaseId,
      p_payload: nextTables,
    });
    if (error) window.alert(`تعذر حفظ الطاولات: ${error.message}`);
  };
  const updateTables = (nextTables: RestaurantTable[]) => {
    setTables(nextTables);
    void persistTables(nextTables);
  };
  const save = (form: HTMLFormElement) => {
    const data = new FormData(form);
    const previous = editing === "new" ? null : editing;
    const table: RestaurantTable = {
      id: previous?.id ?? `table-${String(data.get("id")).trim()}`,
      name: String(data.get("name")).trim(),
      area: String(data.get("area")).trim(),
      active: previous?.active ?? true,
    };
    if (!previous && tables.some((entry) => entry.id === table.id))
      return window.alert("رقم الطاولة مستخدم بالفعل.");
    updateTables(
      previous
        ? tables.map((entry) => (entry.id === previous.id ? table : entry))
        : [...tables, table],
    );
    setEditing(null);
  };
  const download = async (table: RestaurantTable) => {
    const url = await QRCode.toDataURL(tableUrl(table), {
      width: 1000,
      margin: 2,
      color: { dark: "#153a2f", light: "#ffffff" },
    });
    const link = document.createElement("a");
    link.href = url;
    link.download = `${restaurant.id}-table-${table.id}-qr.png`;
    link.click();
  };
  const print = async (table: RestaurantTable) => {
    const qr = await QRCode.toDataURL(tableUrl(table), {
      width: 700,
      margin: 2,
    });
    const popup = window.open("", "_blank", "width=600,height=760");
    popup?.document.write(
      `<html dir="rtl"><head><title>${table.name}</title><style>body{font-family:Arial;text-align:center;padding:40px;color:#153a2f}img{width:360px;max-width:90%}h1{font-size:36px;margin-bottom:4px}p{font-size:18px}small{display:block;margin-top:22px;color:#667}</style></head><body><h1>${restaurant.name}</h1><p>${table.name} — ${table.area}</p><img src="${qr}" onload="window.print()"><small>امسح الرمز لفتح القائمة وبدء الطلب</small></body></html>`,
    );
    popup?.document.close();
  };
  return (
    <div className="tables-manager">
      <div className="manager-intro">
        <div>
          <span className="eyebrow">رموز ذكية لكل طاولة</span>
          <h2>الطاولات ورموز QR</h2>
          <p>
            أضف الطاولات وعدّلها واطبع رمزاً حقيقياً يفتح قائمة{" "}
            {restaurant.name}.
          </p>
        </div>
        <button className="primary" onClick={() => setEditing("new")}>
          + إضافة طاولة
        </button>
      </div>
      <div className="table-grid">
        {tables.map((table) => (
          <TableCard
            key={table.id}
            table={table}
            url={tableUrl(table)}
            copied={copied === table.id}
            onCopy={() => {
              navigator.clipboard?.writeText(tableUrl(table));
              setCopied(table.id);
            }}
            onDownload={() => download(table)}
            onPrint={() => print(table)}
            onEdit={() => setEditing(table)}
            onToggle={() =>
              updateTables(
                tables.map((entry) =>
                  entry.id === table.id
                    ? { ...entry, active: !entry.active }
                    : entry,
                ),
              )
            }
            onDelete={() =>
              window.confirm(`حذف ${table.name}؟`) &&
              updateTables(tables.filter((entry) => entry.id !== table.id))
            }
          />
        ))}
      </div>
      {editing && (
        <div className="modal-backdrop">
          <div className="editor-modal table-editor">
            <button className="close" onClick={() => setEditing(null)}>
              ×
            </button>
            <span className="eyebrow">إدارة الطاولات</span>
            <h2>
              {editing === "new" ? "إضافة طاولة" : `تعديل ${editing.name}`}
            </h2>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                save(event.currentTarget);
              }}
            >
              <div className="editor-grid">
                <label>
                  رقم / رمز الطاولة
                  <input
                    name="id"
                    required
                    disabled={editing !== "new"}
                    defaultValue={editing === "new" ? "" : editing.id}
                  />
                </label>
                <label>
                  اسم العرض
                  <input
                    name="name"
                    required
                    defaultValue={editing === "new" ? "" : editing.name}
                  />
                </label>
                <label className="full">
                  المنطقة
                  <input
                    name="area"
                    required
                    placeholder="الصالة الرئيسية"
                    defaultValue={editing === "new" ? "" : editing.area}
                  />
                </label>
              </div>
              <button className="primary wide" type="submit">
                حفظ الطاولة
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function TableCard({
  table,
  url,
  copied,
  onCopy,
  onDownload,
  onPrint,
  onEdit,
  onToggle,
  onDelete,
}: {
  table: RestaurantTable;
  url: string;
  copied: boolean;
  onCopy: () => void;
  onDownload: () => void;
  onPrint: () => void;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const [svg, setSvg] = useState("");
  useEffect(() => {
    QRCode.toString(url, { type: "svg", margin: 1, width: 220 }).then(setSvg);
  }, [url]);
  return (
    <article className={!table.active ? "table-inactive" : ""}>
      <div
        className="real-qr"
        aria-label={`QR ${table.name}`}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <div>
        <span>{table.active ? "نشطة" : "متوقفة"}</span>
        <strong>{table.name}</strong>
        <small>{table.area}</small>
      </div>
      <button onClick={onCopy}>{copied ? "✓ تم النسخ" : "نسخ الرابط"}</button>
      <button className="download" onClick={onDownload}>
        ↓ PNG
      </button>
      <button className="download" onClick={onPrint}>
        طباعة
      </button>
      <div className="table-actions">
        <button onClick={onEdit}>تعديل</button>
        <button onClick={onToggle}>{table.active ? "تعطيل" : "تفعيل"}</button>
        <button className="danger-text" onClick={onDelete}>
          حذف
        </button>
      </div>
    </article>
  );
}

function SettingsPanel({
  settings,
  onChange,
}: {
  settings: RestaurantSettings;
  onChange: (settings: RestaurantSettings) => void | Promise<void>;
}) {
  const [draft, setDraft] = useState(settings);
  const [saved, setSaved] = useState(false);
  useEffect(() => setDraft(settings), [settings]);
  const field = <K extends keyof RestaurantSettings>(
    key: K,
    value: RestaurantSettings[K],
  ) => setDraft((current) => ({ ...current, [key]: value }));
  const save = async () => {
    await onChange(draft);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };
  const addZone = () =>
    setDraft((current) => ({
      ...current,
      zones: [
        ...current.zones,
        {
          id: `zone-${Date.now()}`,
          name: "منطقة جديدة",
          fee: 0,
          minimum: 0,
          active: true,
        },
      ],
    }));
  return (
    <div className="settings-panel">
      <div className="manager-intro">
        <div>
          <span className="eyebrow">إعداد المطعم</span>
          <h2>الهوية والتشغيل والدفع والتوصيل</h2>
          <p>
            جميع التغييرات محفوظة محلياً وجاهزة للربط بقاعدة البيانات لاحقاً.
          </p>
        </div>
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <section>
          <h3>معلومات وهوية المطعم</h3>
          <div className="settings-fields">
            <label>
              اسم المطعم
              <input
                value={draft.name}
                onChange={(event) => field("name", event.target.value)}
              />
            </label>
            <label>
              الوصف المختصر
              <input
                value={draft.subtitle}
                onChange={(event) => field("subtitle", event.target.value)}
              />
            </label>
            <label>
              رقم التواصل
              <input
                value={draft.phone}
                onChange={(event) => field("phone", event.target.value)}
              />
            </label>
            <label>
              رقم واتساب
              <input
                value={draft.whatsapp}
                onChange={(event) =>
                  field("whatsapp", event.target.value.replace(/\D/g, ""))
                }
              />
            </label>
            <label>
              المدينة
              <input
                value={draft.city}
                onChange={(event) => field("city", event.target.value)}
              />
            </label>
            <label>
              الحي
              <input
                value={draft.neighborhood}
                onChange={(event) => field("neighborhood", event.target.value)}
              />
            </label>
          </div>
        </section>
        <section>
          <h3>العملة والرسوم</h3>
          <div className="settings-fields">
            <label>
              سعر الدولار (ألف ل.س)
              <input
                type="number"
                min="1"
                value={draft.rate}
                onChange={(event) => field("rate", Number(event.target.value))}
              />
            </label>
            <label>
              الضريبة %
              <input
                type="number"
                min="0"
                value={draft.taxPercent}
                onChange={(event) =>
                  field("taxPercent", Number(event.target.value))
                }
              />
            </label>
            <label>
              رسم الخدمة %
              <input
                type="number"
                min="0"
                value={draft.servicePercent}
                onChange={(event) =>
                  field("servicePercent", Number(event.target.value))
                }
              />
            </label>
          </div>
          <div className="setting-toggles compact">
            <label>
              <span>
                إظهار تقدير الدولار
                <small>سعر تقريبي، والفوترة بالليرة السورية</small>
              </span>
              <input
                type="checkbox"
                checked={draft.currencyEstimate}
                onChange={(event) =>
                  field("currencyEstimate", event.target.checked)
                }
              />
            </label>
          </div>
        </section>
        <section>
          <h3>المحافظ وطرق الدفع</h3>
          <div className="settings-fields">
            <label>
              Syriatel Cash
              <input
                value={draft.syriatelCash}
                onChange={(event) => field("syriatelCash", event.target.value)}
              />
            </label>
            <label>
              Sham Cash / BEMO
              <input
                value={draft.shamCash}
                onChange={(event) => field("shamCash", event.target.value)}
              />
            </label>
            <label>
              MTN Cash
              <input
                value={draft.mtnCash}
                onChange={(event) => field("mtnCash", event.target.value)}
              />
            </label>
          </div>
        </section>
        <section>
          <h3>طرق الطلب المتاحة</h3>
          <div className="setting-toggles">
            <label>
              <span>
                الطلب داخل المطعم<small>عبر رمز QR الخاص بالطاولة</small>
              </span>
              <input
                type="checkbox"
                checked={draft.dineIn}
                onChange={(event) => field("dineIn", event.target.checked)}
              />
            </label>
            <label>
              <span>
                الطلبات الخارجية<small>استلام من المطعم</small>
              </span>
              <input
                type="checkbox"
                checked={draft.takeaway}
                onChange={(event) => field("takeaway", event.target.checked)}
              />
            </label>
            <label>
              <span>
                خدمة التوصيل<small>حسب المناطق والحد الأدنى</small>
              </span>
              <input
                type="checkbox"
                checked={draft.delivery}
                onChange={(event) => field("delivery", event.target.checked)}
              />
            </label>
          </div>
        </section>
        <section>
          <h3>ساعات العمل</h3>
          <div className="hours-list">
            {draft.hours.map((hour, index) => (
              <div className="hour-row" key={hour.day}>
                <label>
                  <input
                    type="checkbox"
                    checked={hour.enabled}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        hours: current.hours.map((entry, i) =>
                          i === index
                            ? { ...entry, enabled: event.target.checked }
                            : entry,
                        ),
                      }))
                    }
                  />{" "}
                  {hour.day}
                </label>
                <input
                  type="time"
                  disabled={!hour.enabled}
                  value={hour.open}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      hours: current.hours.map((entry, i) =>
                        i === index
                          ? { ...entry, open: event.target.value }
                          : entry,
                      ),
                    }))
                  }
                />
                <span>حتى</span>
                <input
                  type="time"
                  disabled={!hour.enabled}
                  value={hour.close}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      hours: current.hours.map((entry, i) =>
                        i === index
                          ? { ...entry, close: event.target.value }
                          : entry,
                      ),
                    }))
                  }
                />
              </div>
            ))}
          </div>
        </section>
        <section>
          <div className="settings-section-head">
            <h3>مناطق التوصيل</h3>
            <button type="button" onClick={addZone}>
              + إضافة منطقة
            </button>
          </div>
          <div className="zones-list">
            {draft.zones.map((zone, index) => (
              <div className="zone-row" key={zone.id}>
                <input
                  aria-label="اسم المنطقة"
                  value={zone.name}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      zones: current.zones.map((entry, i) =>
                        i === index
                          ? { ...entry, name: event.target.value }
                          : entry,
                      ),
                    }))
                  }
                />
                <label>
                  رسوم التوصيل
                  <input
                    type="number"
                    min="0"
                    value={zone.fee}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        zones: current.zones.map((entry, i) =>
                          i === index
                            ? { ...entry, fee: Number(event.target.value) }
                            : entry,
                        ),
                      }))
                    }
                  />
                </label>
                <label>
                  الحد الأدنى
                  <input
                    type="number"
                    min="0"
                    value={zone.minimum}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        zones: current.zones.map((entry, i) =>
                          i === index
                            ? { ...entry, minimum: Number(event.target.value) }
                            : entry,
                        ),
                      }))
                    }
                  />
                </label>
                <label className="zone-active">
                  <input
                    type="checkbox"
                    checked={zone.active}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        zones: current.zones.map((entry, i) =>
                          i === index
                            ? { ...entry, active: event.target.checked }
                            : entry,
                        ),
                      }))
                    }
                  />{" "}
                  نشطة
                </label>
                <button
                  type="button"
                  className="danger-text"
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      zones: current.zones.filter((_, i) => i !== index),
                    }))
                  }
                >
                  حذف
                </button>
              </div>
            ))}
          </div>
        </section>
        <button className="primary save-settings" type="submit">
          {saved ? "✓ تم حفظ التغييرات" : "حفظ جميع التغييرات"}
        </button>
      </form>
    </div>
  );
}

function OrderCard({
  order,
  onStatus,
  onWhatsApp,
  onOpen,
}: {
  order: Order;
  onStatus: (id: string, s: Order["status"]) => void;
  onWhatsApp: (o: Order) => void;
  onOpen: () => void;
}) {
  const next: Record<string, Order["status"]> = {
    received: "confirmed",
    confirmed: "preparing",
    preparing: "ready",
    ready: order.mode === "delivery" ? "out-for-delivery" : "completed",
  };
  return (
    <article className="admin-order">
      <div className="order-card-top">
        <strong>{order.id}</strong>
        <span>{modeLabels[order.mode]}</span>
      </div>
      <button className="order-card-open" onClick={onOpen}>
        عرض التفاصيل
      </button>
      <small>
        {order.table || order.address || "طلب مباشر"} · {order.customer}
      </small>
      <div className="order-card-lines">
        {order.lines.map((l) => (
          <div key={l.key}>
            <span>
              <b>{l.qty}×</b> {l.item.name}
            </span>
            <strong>
              {formatSyp(
                (l.item.price + l.options.reduce((a, o) => a + o.price, 0)) *
                l.qty,
              )}
            </strong>
          </div>
        ))}
      </div>
      <div className="order-card-foot">
        <strong>{formatSyp(order.total)}</strong>
        <div>
          <button className="mini-action" onClick={() => onWhatsApp(order)}>
            WA
          </button>
          {next[order.status] && (
            <button
              className="advance"
              onClick={() => onStatus(order.id, next[order.status])}
            >
              {next[order.status] === "confirmed"
                ? "تأكيد الطلب →"
                : next[order.status] === "preparing"
                  ? "بدء التحضير →"
                  : next[order.status] === "ready"
                    ? "جاهز →"
                    : "إتمام الطلب ✓"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function OrderDetails({
  order,
  onClose,
  onStatus,
  onChange,
  onWhatsApp,
}: {
  order: Order;
  onClose: () => void;
  onStatus: (
    id: string,
    status: Order["status"],
    patch?: Partial<Order>,
  ) => void;
  onChange: (id: string, patch: Partial<Order>) => void;
  onWhatsApp: (order: Order) => void;
}) {
  const [note, setNote] = useState(order.internalNote || "");
  const cancel = () => {
    const reason = window.prompt("سبب إلغاء الطلب")?.trim();
    if (reason) onStatus(order.id, "cancelled", { cancellationReason: reason });
  };
  return (
    <div className="modal-backdrop">
      <div className="order-details-modal">
        <button className="close" onClick={onClose}>
          ×
        </button>
        <div className="order-details-head">
          <div>
            <span className="eyebrow">تفاصيل الطلب</span>
            <h2>{order.id}</h2>
            <p>
              {new Date(order.createdAt).toLocaleString("ar-SY")} ·{" "}
              {modeLabels[order.mode]}
            </p>
          </div>
          <span className={`status ${order.status}`}>
            {statusLabels[order.status]}
          </span>
        </div>
        <div className="order-customer-grid">
          <div>
            <small>العميل</small>
            <strong>{order.customer}</strong>
            <span>{order.phone || "لا يوجد هاتف"}</span>
          </div>
          <div>
            <small>الموقع</small>
            <strong>{order.table || order.address || "طلب مباشر"}</strong>
            <span>
              {order.mode === "delivery" ? "توصيل" : "استلام من المطعم"}
            </span>
          </div>
          <div>
            <small>الدفع</small>
            <strong>{order.payment}</strong>
            <span>{order.paymentReference || "لا يوجد مرجع دفع"}</span>
          </div>
        </div>
        <div className="detail-lines">
          {order.lines.map((line) => (
            <div key={line.key}>
              <div>
                <strong>
                  {line.qty}× {line.item.name}
                </strong>
                <small>
                  {line.options.map((option) => option.name).join("، ") ||
                    "بدون إضافات"}
                  {line.note ? ` · ${line.note}` : ""}
                </small>
              </div>
              <b>
                {formatSyp(
                  (line.item.price +
                    line.options.reduce(
                      (sum, option) => sum + option.price,
                      0,
                    )) *
                  line.qty,
                )}
              </b>
            </div>
          ))}
        </div>
        <div className="detail-total">
          <span>الإجمالي</span>
          <strong>{formatSyp(order.total)}</strong>
        </div>
        <section className="payment-review">
          <h3>التحقق من الدفع</h3>
          <div className="payment-actions">
            <button
              className={order.paymentStatus === "pending" ? "active" : ""}
              onClick={() => onChange(order.id, { paymentStatus: "pending" })}
            >
              بانتظار التحقق
            </button>
            <button
              className={
                order.paymentStatus === "verified"
                  ? "verified active"
                  : "verified"
              }
              onClick={() => onChange(order.id, { paymentStatus: "verified" })}
            >
              ✓ تم التحقق
            </button>
            <button
              className={
                order.paymentStatus === "rejected"
                  ? "rejected active"
                  : "rejected"
              }
              onClick={() => onChange(order.id, { paymentStatus: "rejected" })}
            >
              مرفوض
            </button>
            <button
              className={
                order.paymentStatus === "refunded"
                  ? "rejected active"
                  : "rejected"
              }
              onClick={() => onChange(order.id, { paymentStatus: "refunded" })}
            >
              مسترد
            </button>
          </div>
        </section>
        <label className="internal-note">
          ملاحظة داخلية
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="ملاحظة للمطبخ أو فريق الخدمة..."
          />
          <button onClick={() => onChange(order.id, { internalNote: note })}>
            حفظ الملاحظة
          </button>
        </label>
        <div className="order-status-actions">
          {(
            [
              "received",
              "confirmed",
              "preparing",
              "ready",
              "out-for-delivery",
              "completed",
            ] as Order["status"][]
          )
            .filter(
              (status) =>
                status !== "out-for-delivery" || order.mode === "delivery",
            )
            .map((status) => (
              <button
                key={status}
                className={order.status === status ? "active" : ""}
                onClick={() => onStatus(order.id, status)}
              >
                {statusLabels[status]}
              </button>
            ))}
        </div>
        <div className="detail-footer">
          <button className="secondary" onClick={() => onWhatsApp(order)}>
            WhatsApp
          </button>
          {order.status !== "cancelled" && order.status !== "completed" && (
            <button className="danger-button" onClick={cancel}>
              إلغاء الطلب
            </button>
          )}
        </div>
        {order.cancellationReason && (
          <p className="cancel-reason">
            سبب الإلغاء: {order.cancellationReason}
          </p>
        )}
      </div>
    </div>
  );
}

function MenuManager({
  restaurant,
  restaurantDatabaseId,
  categories,
  onChange,
  onCategoriesChange,
}: {
  restaurant: Restaurant;
  restaurantDatabaseId: string;
  categories: MenuCategory[];
  onChange: (items: Item[]) => void;
  onCategoriesChange: (categories: MenuCategory[]) => void;
}) {
  const [editing, setEditing] = useState<Item | "new" | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("الكل");
  const syncTimer = useRef<number | null>(null);
  const persistMenu = (items: Item[], nextCategories = categories) => {
    if (!restaurantDatabaseId) return;
    if (syncTimer.current) window.clearTimeout(syncTimer.current);
    syncTimer.current = window.setTimeout(async () => {
      const { error } = await supabase.rpc("sync_admin_menu", {
        p_restaurant_id: restaurantDatabaseId,
        p_payload: {
          categories: nextCategories.map((entry, sortOrder) => ({
            ...entry,
            sortOrder,
          })),
          items,
        },
      });
      if (error) window.alert(`تعذر حفظ القائمة: ${error.message}`);
    }, 250);
  };
  useEffect(
    () => () => {
      if (syncTimer.current) window.clearTimeout(syncTimer.current);
    },
    [],
  );
  const update = (items: Item[]) => {
    onChange(items);
    persistMenu(items);
  };
  const updateCategories = (nextCategories: MenuCategory[]) => {
    onCategoriesChange(nextCategories);
    persistMenu(restaurant.items, nextCategories);
  };
  const toggle = (id: string) =>
    update(
      restaurant.items.map((item) =>
        item.id === id ? { ...item, available: !item.available } : item,
      ),
    );
  const remove = (id: string) => {
    if (window.confirm("هل تريد حذف هذا الصنف؟"))
      update(restaurant.items.filter((item) => item.id !== id));
  };
  const addCategory = () => {
    const name = window.prompt("اسم التصنيف بالعربية")?.trim();
    if (
      !name ||
      categories.some((entry) => entry.name === name && !entry.archived)
    )
      return;
    const en = window.prompt("اسم التصنيف بالإنجليزية")?.trim() || name;
    updateCategories([
      ...categories,
      {
        id: `category-${Date.now()}`,
        name,
        en,
        visible: true,
        archived: false,
      },
    ]);
  };
  const updateCategory = (id: string, patch: Partial<MenuCategory>) => {
    if (id === "__reorder__" && patch.id) {
      let order: string[];
      try {
        const parsed: unknown = JSON.parse(patch.id);
        if (!Array.isArray(parsed) || !parsed.every((entry) => typeof entry === "string"))
          return;
        order = parsed;
      } catch {
        return;
      }
      const active = order
        .map((categoryId) =>
          categories.find((entry) => entry.id === categoryId),
        )
        .filter(Boolean) as MenuCategory[];
      return updateCategories([
        ...active,
        ...categories.filter((entry) => entry.archived),
      ]);
    }
    const current = categories.find((entry) => entry.id === id);
    const nextItems =
      current && patch.name && patch.name !== current.name
        ? restaurant.items.map((item) =>
          item.category === current.name
            ? { ...item, category: patch.name as string }
            : item,
        )
        : restaurant.items;
    const nextCategories = categories.map((entry) =>
      entry.id === id ? { ...entry, ...patch } : entry,
    );
    if (nextItems !== restaurant.items) onChange(nextItems);
    onCategoriesChange(nextCategories);
    persistMenu(nextItems, nextCategories);
  };
  const archiveCategory = (entry: MenuCategory) => {
    if (restaurant.items.some((item) => item.category === entry.name))
      return window.alert("انقل الأصناف إلى تصنيف آخر قبل الأرشفة.");
    if (window.confirm(`أرشفة تصنيف ${entry.name}؟`))
      updateCategory(entry.id, { archived: true, visible: false });
  };
  const save = (form: HTMLFormElement) => {
    const data = new FormData(form);
    const previous = editing !== "new" ? editing : null;
    const item: Item = {
      id: previous?.id ?? `item-${Date.now()}`,
      name: String(data.get("name")),
      en: String(data.get("en")),
      desc: String(data.get("desc")),
      price: Number(data.get("price")),
      category: String(data.get("category")) as Item["category"],
      tags: data.getAll("tags") as Tag[],
      image: String(data.get("image")) || images.mezze,
      popular: data.get("popular") === "on",
      available: previous?.available ?? true,
      options: previous?.options ?? [],
    };
    update(
      previous
        ? restaurant.items.map((entry) => (entry.id === item.id ? item : entry))
        : [...restaurant.items, item],
    );
    setEditing(null);
  };
  const activeCategories = categories.filter((entry) => !entry.archived);
  const filtered =
    categoryFilter === "الكل"
      ? restaurant.items
      : restaurant.items.filter((item) => item.category === categoryFilter);
  return (
    <div className="menu-manager">
      <div className="manager-intro">
        <div>
          <span className="eyebrow">محتوى المطعم</span>
          <h2>عناصر القائمة</h2>
          <p>أضف الأصناف وعدّل الأسعار والتصنيفات والإضافات والتوفر.</p>
        </div>
        <button className="primary" onClick={() => setEditing("new")}>
          + إضافة صنف جديد
        </button>
      </div>
      <div className="menu-admin-tools">
        <div className="filter-pills">
          {["الكل", ...activeCategories.map((category) => category.name)].map(
            (entry) => (
              <button
                key={entry}
                className={categoryFilter === entry ? "active" : ""}
                onClick={() => setCategoryFilter(entry)}
              >
                {entry}
              </button>
            ),
          )}
        </div>
        <span>{filtered.length} أصناف</span>
      </div>
      <CategoryManager
        categories={categories}
        onAdd={addCategory}
        onUpdate={updateCategory}
        onArchive={archiveCategory}
      />
      <div className="inventory-list">
        {filtered.map((item) => (
          <div className="inventory-row" key={item.id}>
            <img src={item.image} alt="" />
            <div className="inventory-name">
              <strong>{item.name}</strong>
              <span>
                {item.category} · {formatSyp(item.price)} ·{" "}
                {item.options?.length ?? 0} مجموعات خيارات
              </span>
            </div>
            <span className={item.available ? "available" : "unavailable"}>
              {item.available ? "متوفر" : "نفد المخزون"}
            </span>
            <button
              className={`stock-toggle ${item.available ? "on" : ""}`}
              onClick={() => toggle(item.id)}
            >
              <i />
            </button>
            <div className="row-actions">
              <button onClick={() => setEditing(item)}>تعديل</button>
              <button className="danger-text" onClick={() => remove(item.id)}>
                حذف
              </button>
            </div>
          </div>
        ))}
      </div>
      {editing && (
        <div className="modal-backdrop">
          <div className="editor-modal">
            <button className="close" onClick={() => setEditing(null)}>
              ×
            </button>
            <span className="eyebrow">
              {editing === "new" ? "صنف جديد" : "تعديل الصنف"}
            </span>
            <h2>
              {editing === "new" ? "إضافة صنف إلى القائمة" : editing.name}
            </h2>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                save(event.currentTarget);
              }}
            >
              <div className="editor-grid">
                <label>
                  الاسم بالعربية
                  <input
                    name="name"
                    required
                    defaultValue={editing === "new" ? "" : editing.name}
                  />
                </label>
                <label>
                  الاسم بالإنجليزية
                  <input
                    name="en"
                    required
                    defaultValue={editing === "new" ? "" : editing.en}
                  />
                </label>
                <label className="full">
                  الوصف
                  <textarea
                    name="desc"
                    required
                    defaultValue={editing === "new" ? "" : editing.desc}
                  />
                </label>
                <label>
                  السعر بالليرة
                  <input
                    name="price"
                    type="number"
                    min="0"
                    required
                    defaultValue={editing === "new" ? 0 : editing.price}
                  />
                </label>
                <label>
                  التصنيف
                  <select
                    name="category"
                    defaultValue={
                      editing === "new" ? "رئيسية" : editing.category
                    }
                  >
                    <option>مقبلات</option>
                    <option>رئيسية</option>
                    <option>مشروبات</option>
                    <option>حلويات</option>
                  </select>
                </label>
                <label className="full">
                  رابط الصورة
                  <input
                    name="image"
                    defaultValue={editing === "new" ? "" : editing.image}
                    placeholder="https://..."
                  />
                </label>
              </div>
              <div className="editor-checks">
                <label>
                  <input
                    type="checkbox"
                    name="tags"
                    value="vegetarian"
                    defaultChecked={
                      editing !== "new" && editing.tags.includes("vegetarian")
                    }
                  />{" "}
                  نباتي
                </label>
                <label>
                  <input
                    type="checkbox"
                    name="tags"
                    value="spicy"
                    defaultChecked={
                      editing !== "new" && editing.tags.includes("spicy")
                    }
                  />{" "}
                  حار
                </label>
                <label>
                  <input
                    type="checkbox"
                    name="tags"
                    value="chef"
                    defaultChecked={
                      editing !== "new" && editing.tags.includes("chef")
                    }
                  />{" "}
                  اختيار الشيف
                </label>
                <label>
                  <input
                    type="checkbox"
                    name="popular"
                    defaultChecked={editing !== "new" && editing.popular}
                  />{" "}
                  الأكثر طلباً
                </label>
              </div>
              {editing !== "new" && (
                <OptionEditor
                  item={editing}
                  onUpdate={(options) => setEditing({ ...editing, options })}
                />
              )}
              <button className="primary wide" type="submit">
                حفظ الصنف <span>✓</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryManager({
  categories,
  onAdd,
  onUpdate,
  onArchive,
}: {
  categories: MenuCategory[];
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<MenuCategory>) => void;
  onArchive: (category: MenuCategory) => void;
}) {
  const active = categories.filter((entry) => !entry.archived);
  return (
    <section className="category-manager">
      <div className="option-editor-title">
        <div>
          <strong>تصنيفات القائمة</strong>
          <small>رتّب التصنيفات وعدّل ظهورها للزبائن.</small>
        </div>
        <button type="button" onClick={onAdd}>
          + إضافة تصنيف
        </button>
      </div>
      <div className="category-admin-list">
        {active.map((entry, index) => (
          <div className="category-admin-row" key={entry.id}>
            <span className="drag-handle">⋮⋮</span>
            <div>
              <input
                aria-label="اسم التصنيف بالعربية"
                value={entry.name}
                onChange={(event) =>
                  onUpdate(entry.id, { name: event.target.value })
                }
              />
              <input
                aria-label="اسم التصنيف بالإنجليزية"
                value={entry.en}
                onChange={(event) =>
                  onUpdate(entry.id, { en: event.target.value })
                }
              />
            </div>
            <label>
              <input
                type="checkbox"
                checked={entry.visible}
                onChange={(event) =>
                  onUpdate(entry.id, { visible: event.target.checked })
                }
              />{" "}
              ظاهر
            </label>
            <div className="category-actions">
              <button
                type="button"
                disabled={index === 0}
                onClick={() => {
                  const next = [...active];
                  [next[index - 1], next[index]] = [
                    next[index],
                    next[index - 1],
                  ];
                  onUpdate("__reorder__", {
                    id: JSON.stringify(next.map((item) => item.id)),
                  } as Partial<MenuCategory>);
                }}
              >
                ↑
              </button>
              <button
                type="button"
                disabled={index === active.length - 1}
                onClick={() => {
                  const next = [...active];
                  [next[index + 1], next[index]] = [
                    next[index],
                    next[index + 1],
                  ];
                  onUpdate("__reorder__", {
                    id: JSON.stringify(next.map((item) => item.id)),
                  } as Partial<MenuCategory>);
                }}
              >
                ↓
              </button>
              <button
                type="button"
                className="danger-text"
                onClick={() => onArchive(entry)}
              >
                أرشفة
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function OptionEditor({
  item,
  onUpdate,
}: {
  item: Item;
  onUpdate: (options: OptionGroup[]) => void;
}) {
  const groups = item.options ?? [];
  const addGroup = () =>
    onUpdate([
      ...groups,
      {
        id: `group-${Date.now()}`,
        name: "مجموعة جديدة",
        required: false,
        options: [{ id: `option-${Date.now()}`, name: "خيار جديد", price: 0 }],
      },
    ]);
  return (
    <div className="option-editor">
      <div className="option-editor-title">
        <strong>مجموعات الخيارات والإضافات</strong>
        <button type="button" onClick={addGroup}>
          + مجموعة خيارات
        </button>
      </div>
      {groups.map((group, groupIndex) => (
        <section key={group.id}>
          <div className="group-head">
            <input
              value={group.name}
              onChange={(e) =>
                onUpdate(
                  groups.map((entry, i) =>
                    i === groupIndex
                      ? { ...entry, name: e.target.value }
                      : entry,
                  ),
                )
              }
            />
            <label>
              <input
                type="checkbox"
                checked={group.required}
                onChange={(e) =>
                  onUpdate(
                    groups.map((entry, i) =>
                      i === groupIndex
                        ? { ...entry, required: e.target.checked }
                        : entry,
                    ),
                  )
                }
              />{" "}
              مطلوب
            </label>
            <button
              type="button"
              onClick={() =>
                onUpdate(groups.filter((_, i) => i !== groupIndex))
              }
            >
              حذف
            </button>
          </div>
          {group.options.map((option, optionIndex) => (
            <div className="editable-option" key={option.id}>
              <input
                value={option.name}
                onChange={(e) =>
                  onUpdate(
                    groups.map((entry, i) =>
                      i === groupIndex
                        ? {
                          ...entry,
                          options: entry.options.map((choice, j) =>
                            j === optionIndex
                              ? { ...choice, name: e.target.value }
                              : choice,
                          ),
                        }
                        : entry,
                    ),
                  )
                }
              />
              <input
                type="number"
                value={option.price}
                onChange={(e) =>
                  onUpdate(
                    groups.map((entry, i) =>
                      i === groupIndex
                        ? {
                          ...entry,
                          options: entry.options.map((choice, j) =>
                            j === optionIndex
                              ? { ...choice, price: Number(e.target.value) }
                              : choice,
                          ),
                        }
                        : entry,
                    ),
                  )
                }
              />
              <button
                type="button"
                onClick={() =>
                  onUpdate(
                    groups.map((entry, i) =>
                      i === groupIndex
                        ? {
                          ...entry,
                          options: entry.options.filter(
                            (_, j) => j !== optionIndex,
                          ),
                        }
                        : entry,
                    ),
                  )
                }
              >
                ×
              </button>
            </div>
          ))}
          <button
            className="add-option"
            type="button"
            onClick={() =>
              onUpdate(
                groups.map((entry, i) =>
                  i === groupIndex
                    ? {
                      ...entry,
                      options: [
                        ...entry.options,
                        {
                          id: `option-${Date.now()}`,
                          name: "خيار جديد",
                          price: 0,
                        },
                      ],
                    }
                    : entry,
                ),
              )
            }
          >
            + إضافة خيار
          </button>
        </section>
      ))}
    </div>
  );
}

export default App;
