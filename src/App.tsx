import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  ClipboardList,
  Globe2,
  LayoutDashboard,
  ShoppingBag,
  Utensils,
} from "lucide-react";
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

/**
 * The eight-pointed Damascene star (نجمة ثمانية) used across Syrian tilework
 * and ajami woodwork. It carries the section rhythm and marks the table badge.
 */
const StarMark = ({ className = "" }: { className?: string }) => (
  <svg
    className={`star-mark ${className}`.trim()}
    viewBox="0 0 24 24"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M12 0.6 14.9 6.4 21.2 3.5 18.4 9.8 24 12l-5.6 2.2 2.8 6.3-6.3-2.9L12 23.4 9.1 17.6 2.8 20.5l2.8-6.3L0 12l5.6-2.2L2.8 3.5l6.3 2.9Z" />
  </svg>
);

/**
 * Reveals every `[data-reveal]` descendant of the returned ref as it scrolls
 * into view, and re-scans whenever `deps` change so that filtered lists reveal
 * their new rows too. Motion is opt-out: under `prefers-reduced-motion` every
 * element is marked revealed immediately and no observer is created.
 */
const useScrollReveal = <T extends HTMLElement>(deps: unknown[] = []) => {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;

    const targets = Array.from(
      root.querySelectorAll<HTMLElement>("[data-reveal]:not([data-revealed])"),
    );
    if (targets.length === 0) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduced.matches || !("IntersectionObserver" in window)) {
      targets.forEach((node) => {
        node.dataset.revealed = "true";
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          (entry.target as HTMLElement).dataset.revealed = "true";
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 },
    );

    targets.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return ref;
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
  code: string;
  name: string;
  area: string;
  active: boolean;
  qrToken?: string;
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
  const [restaurantId, setRestaurantId] = useState(() => {
    const requested = new URLSearchParams(window.location.search).get(
      "restaurant",
    );
    return requested && restaurants.some((r) => r.id === requested)
      ? requested
      : "sufra";
  });
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
  const [tableContext, setTableContext] = useState<
    PublicMenuPayload["table"]
  >(null);
  const [authReady, setAuthReady] = useState(false);
  const [staffEmail, setStaffEmail] = useState("");
  const [memberships, setMemberships] = useState<RestaurantMembership[]>([]);
  const [authOpen, setAuthOpen] = useState(false);

  // Direction and language belong on the document root so that assistive
  // technology, font fallback, and page-level layout all agree with the UI.
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [language]);

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
    setBackendReady(false);
    setTableContext(null);
    const loadMenu = async () => {
      const { data, error } = await supabase.rpc("get_public_menu", {
        p_slug: restaurantId,
        p_table_token: new URLSearchParams(location.search).get("tableToken"),
      });
      if (!active) return;
      if (error || !data) {
        setBackendReady(false);
        setTableContext(null);
        return;
      }
      const payload = data as PublicMenuPayload;
      setTableContext(payload.table);
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
    if (!isOnline || !backendReady) {
      setNotice("لا يمكن إرسال الطلب حالياً. تحقق من الاتصال وحاول مجدداً.");
      window.setTimeout(() => setNotice(""), 4200);
      return;
    }
    const tableToken = new URLSearchParams(location.search).get("tableToken");
    if (mode === "dine-in" && (!tableToken || !tableContext)) {
      setNotice("لطلب داخل المطعم، امسح رمز QR الصحيح الموجود على الطاولة.");
      window.setTimeout(() => setNotice(""), 4200);
      return;
    }
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
    type OrderReceipt = {
      orderNumber: string;
      publicToken: string;
      total: number;
    };
    const { data: submitted, error } = await supabase.rpc(
      "submit_public_order",
      {
        p_payload: {
          restaurantSlug: restaurantId,
          idempotencyKey: crypto.randomUUID(),
          mode,
          tableToken,
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
    const receipt = submitted as unknown as OrderReceipt;
    const order: Order = {
      id: receipt.orderNumber,
      restaurantId,
      publicToken: receipt.publicToken,
      mode,
      status: "received",
      lines: cart,
      customer: String(data.get("customer") || "زبون المطعم"),
      phone: String(data.get("phone") || ""),
      address: String(data.get("address") || ""),
      table: tableContext?.labelAr ?? tableContext?.code ?? "",
      total: receipt.total,
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
          `- ${l.qty}× ${l.item.name}${l.options.length ? ` (${l.options.map((o) => o.name).join(", ")})` : ""}`,
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
    <div
      className={`app-shell ${view === "manage" ? "management-shell" : "storefront-shell"}`}
      dir={language === "ar" ? "rtl" : "ltr"}
    >
      <header className="topbar editorial-masthead">
        <button
          className="brand masthead-brand"
          onClick={() => {
            setView("menu");
            setTrackingOrder(null);
          }}
        >
           <span className="brand-mark"><span>س</span><Utensils size={18} strokeWidth={2.4} /></span>
          <span className="brand-copy">
            <small>مائدة دمشقية معاصرة</small>
            <strong>{restaurant.name}</strong>
            <span>{restaurant.neighborhood}، {restaurant.city}</span>
          </span>
        </button>

        <div className="masthead-centre">
          <span className="masthead-edition">القائمة اليومية / {new Date().toLocaleDateString("ar-SY", { weekday: "long" })}</span>
          <nav className="desktop-nav editorial-nav" aria-label="التنقل الرئيسي">
             <button className={view === "menu" ? "active" : ""} onClick={() => setView("menu")}>
               <Utensils className="nav-icon" size={16} strokeWidth={2.2} />
               <span className="nav-index">01</span>
               القائمة
             </button>
             <button className={view === "orders" ? "active" : ""} onClick={() => setView("orders")}>
               <ClipboardList className="nav-icon" size={16} strokeWidth={2.2} />
               <span className="nav-index">02</span>
               طلباتي
               {orders.length > 0 && <b>{orders.length}</b>}
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
               <LayoutDashboard className="nav-icon" size={16} strokeWidth={2.2} />
               <span className="nav-index">03</span>
               الإدارة
             </button>
          </nav>
        </div>

        <div className="top-actions masthead-actions">
          <div className="service-context">
            {tableContext && view !== "manage" && <span className="table-context">{tableContext.labelAr}</span>}
            <span className={isOnline ? "connection-status online" : "connection-status offline"}>
              {isOnline ? "متصل" : "دون اتصال"}
           </span>
           </div>
           <button className="icon-button language-button" onClick={() => setLanguage(language === "ar" ? "en" : "ar")} aria-label="تغيير اللغة">
             <Globe2 size={15} strokeWidth={2.2} />
             {language === "ar" ? "EN" : "عربي"}
           </button>
           <button className="cart-button masthead-cart" onClick={() => setCartOpen(true)}>
             <ShoppingBag size={17} strokeWidth={2.3} />
             <span>كشف الطلب</span>
             <b>{cartCount}</b>
          </button>
        </div>
      </header>
      <div className="app-body">
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
              onQuickAdd={(item) => addToCart(item)}
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
              <span className="eyebrow">دخول الموظفين</span>
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
      {notice && <div className="toast">{notice}</div>}
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
          tableContext={tableContext}
          backendReady={backendReady && isOnline}
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
           <Utensils size={17} strokeWidth={2.2} />
           <span>القائمة</span>
         </button>
        <button
          className={view === "orders" ? "active" : ""}
         onClick={() => setView("orders")}
         >
           <ClipboardList size={17} strokeWidth={2.2} />
           <span>طلباتي</span>
         </button>
         <button onClick={() => setCartOpen(true)}>
           <ShoppingBag size={17} strokeWidth={2.2} />
           <span>السلة</span>
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
           <LayoutDashboard size={17} strokeWidth={2.2} />
           <span>الإدارة</span>
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
  onQuickAdd,
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
  onQuickAdd: (i: Item) => void;
}) {
  const featured = items[0] ?? restaurant.items[0];
  const secondary = items.slice(1, 3);
  const revealRef = useScrollReveal<HTMLDivElement>([items, category, tag]);

  return (
    <div className="menu-view editorial-menu" ref={revealRef}>
      <section className="opening-spread">
        <div className="opening-copy">
          <div className="opening-line"><span className="eyebrow">سُفرة / {restaurant.city}</span><span className="live-dot">يستقبل الطلبات الآن</span></div>
          <p className="hero-kicker">مائدة الشام، كما نحبها</p>
          <h1>{restaurant.name}</h1>
          <p className="hero-subtitle">{restaurant.subtitle}</p>
          <div className="opening-note">
            <StarMark />
            <p>أطباق يومية تُبنى على النار الهادئة، والخبز الطازج، وذاكرة البيت.</p>
          </div>
          <div className="hero-facts">
            <span><strong>{restaurant.items.length}</strong> صنفاً في القائمة</span>
            <span><strong>{categories.length}</strong> قسماً</span>
            <span><strong>{restaurant.neighborhood}</strong></span>
          </div>
        </div>
        {featured && (
          <button className="lead-dish" onClick={() => onSelect(featured)}>
            <span className="lead-dish-image"><img src={featured.image} alt={featured.name} /></span>
            <span className="lead-dish-caption"><small>طبق الغلاف / اقتراح اليوم</small><strong>{featured.name}</strong><span>{featured.desc}</span><b>{formatSyp(featured.price)} <em>افتح التفاصيل</em></b></span>
          </button>
        )}
      </section>

      <section className="menu-index" aria-label="فهرس القائمة" data-reveal>
        <div className="index-intro"><span className="eyebrow">الفهرس</span><h2>اختَر إيقاع<br />وجبتك اليوم</h2></div>
        <div className="index-search"><span>ابحث في الوصفات</span><label className="search"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="اسم طبق، مكوّن، أو مزاج" /></label><small>{items.length} صنفاً مطابقاً</small></div>
        <div className="currency-switch"><span>عرض الأسعار</span><div className="segmented"><button className={currency === "syp" ? "active" : ""} onClick={() => setCurrency("syp")}>ليرة سورية</button><button className={currency === "usd" ? "active" : ""} onClick={() => setCurrency("usd")}>دولار</button></div></div>
      </section>

      <section className="menu-map" data-reveal>
        <div className="map-label"><span>تصفح الأقسام</span><strong>{category === "كل الأصناف" ? "القائمة كاملة" : category}</strong></div>
        <div className="category-row">
          {["كل الأصناف", "الأكثر طلباً", ...categories.map((entry) => entry.name)].map((entry) => (
            <button key={entry} className={category === entry ? "active" : ""} onClick={() => setCategory(entry)}>{entry}</button>
          ))}
        </div>
        <div className="taste-filters"><span>اختيارات المطبخ</span><button className={tag === "all" ? "active" : ""} onClick={() => setTag("all")}>الكل</button><button className={tag === "vegetarian" ? "active" : ""} onClick={() => setTag("vegetarian")}>نباتي</button><button className={tag === "chef" ? "active" : ""} onClick={() => setTag("chef")}>اختيار الشيف</button></div>
      </section>

      <section className="menu-catalogue">
        <header className="catalogue-header" data-reveal><div><span className="eyebrow">المطبخ اليوم</span><h2>{category === "كل الأصناف" ? "كل الأطباق" : category}</h2></div><p>اضغط على أي طبق لتختار الحجم والإضافات.</p><span className="results-count">{items.length} صنفاً</span></header>
        <div className="menu-grid">
          {items.map((item, index) => {
            const needsChoice = (item.options ?? []).some((group) => group.required);
            return (
              <article className={`menu-card menu-card-${index % 3} ${index === 0 ? "featured-card" : ""}`} key={item.id} data-reveal style={{ ["--reveal-i" as string]: String(Math.min(index, 8)) }}>
                <button className="card-image" onClick={() => onSelect(item)} aria-label={`تفاصيل ${item.name}`}><img src={item.image} alt={item.name} loading="lazy" />{item.popular && <span className="popular-chip">طلب متكرر</span>}</button>
                <div className="card-body">
                  <div className="card-title"><div><small>{item.en}</small><h3>{item.name}</h3></div><span>{formatSyp(item.price)}</span></div>
                  <p>{item.desc}</p>
                  <div className="card-meta">{item.tags.map((t) => <small key={t}>{tagLabels[t]}</small>)}</div>
                  {needsChoice ? (
                    <button className="card-add" onClick={() => onSelect(item)}><span>اختر الحجم والإضافات</span><b>تفاصيل الطبق</b></button>
                  ) : (
                    <button className="card-add" onClick={() => onQuickAdd(item)}><span>أضف إلى الطلب</span><b>{formatSyp(item.price)}</b></button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>
      {secondary.length > 0 && <aside className="editorial-callout" data-reveal><span className="eyebrow">من نفس المائدة</span><strong>{secondary.map((item) => item.name).join(" · ")}</strong><p>تشكيلة صغيرة تكمل اختيارك، وتصلح للمشاركة.</p></aside>}
      {items.length === 0 && <div className="empty-state"><strong>لم نجد صنفاً مطابقاً</strong><span>جرّب كلمة بحث أخرى أو اختر قسماً مختلفاً.</span></div>}
    </div>
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
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className="item-modal dish-brief" role="dialog" aria-modal="true" aria-label={item.name}>
        <aside className="dish-portrait"><img src={item.image} alt={item.name} /><span className="portrait-index">{item.category}</span><button className="close" onClick={onClose} aria-label="إغلاق">×</button></aside>
        <div className="dish-content">
          <header className="dish-heading"><div><span className="eyebrow">بطاقة الطبق / {item.en}</span><h2>{item.name}</h2><p>{item.desc}</p></div><div className="dish-total"><small>يبدأ من</small><strong>{formatSyp(item.price + extra)}</strong>{currency === "usd" && <span>≈ {formatUsd(item.price + extra, rate)}</span>}</div></header>
          <div className="dish-rule"><span>ابنِ طبقك</span><small>اختياراتك تحفظ مع الطلب</small></div>
          <div className="dish-options">
            {item.options?.map((group) => (
              <fieldset className="option-group" key={group.id}>
                <legend><StarMark /><strong>{group.name}</strong>{group.required && <small>اختيار مطلوب</small>}</legend>
                <div className="option-grid">{group.options.map((option) => <label className={selected[group.id]?.some((entry) => entry.id === option.id) ? "option selected" : "option"} key={option.id}><input type={group.required ? "radio" : "checkbox"} name={group.id} checked={selected[group.id]?.some((entry) => entry.id === option.id)} onChange={() => setSelected((current) => { const existing = current[group.id] ?? []; const next = group.required ? [option] : existing.some((entry) => entry.id === option.id) ? existing.filter((entry) => entry.id !== option.id) : [...existing, option]; return { ...current, [group.id]: next }; })} /><span>{option.name}</span><b>{option.price ? `+${formatSyp(option.price)}` : "أساسي"}</b></label>)}</div>
              </fieldset>
            ))}
          </div>
          <div className="dish-request"><label className="note-field"><span>ملاحظة للمطبخ <small>اختياري</small></span><textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="مثلاً: بدون بصل، الصوص جانباً..." /></label><button disabled={!valid} className="primary wide" onClick={() => onAdd(item, Object.values(selected).flat(), note)}><span>أضف إلى الطلب</span><strong>{formatSyp(item.price + extra)}</strong></button></div>
        </div>
      </section>
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
  const itemCount = cart.reduce((a, l) => a + l.qty, 0);
  return (
    <div className="modal-backdrop drawer-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className="cart-drawer order-desk" role="dialog" aria-modal="true">
        <header className="drawer-head order-desk-head"><div><span className="eyebrow">ورقة الطلب / قيد التجهيز</span><h2>مائدتك <b>{itemCount}</b></h2></div><button className="close" onClick={onClose} aria-label="إغلاق">×</button></header>
        {cart.length === 0 ? <div className="empty-state"><strong>لم تبدأ مائدتك بعد</strong><span>اختر طبقاً من الفهرس وسنضعه هنا.</span><button className="link-button" onClick={onClose}>العودة إلى القائمة</button></div> : <>
          <div className="order-desk-intro"><span>ملخص الاختيارات</span><small>راجع الإضافات والكمية قبل المتابعة</small></div>
          <div className="cart-lines receipt-lines">{cart.map((line, index) => <article className="cart-line receipt-line" key={line.key}><div className="receipt-marker">{String(index + 1).padStart(2, "0")}</div><img src={line.item.image} alt="" /><div className="line-info"><strong>{line.item.name}</strong><small>{line.options.map((o) => o.name).join("، ") || "بدون إضافات"}</small><b>{formatSyp((line.item.price + line.options.reduce((a, o) => a + o.price, 0)) * line.qty)}</b></div><div className="qty"><button onClick={() => onQty(line.key, -1)} aria-label="تقليل الكمية">−</button><b>{line.qty}</b><button onClick={() => onQty(line.key, 1)} aria-label="زيادة الكمية">+</button></div></article>)}</div>
          <footer className="cart-summary receipt-summary"><div className="summary-caption"><span>المجموع قبل رسوم التسليم</span><small>يُحسب الإجمالي النهائي في الخطوة التالية</small></div><strong>{formatSyp(total)}</strong>{currency === "usd" && <small>≈ {formatUsd(total, rate)} USD بسعر صرف تقريبي</small>}<button className="primary wide" onClick={onCheckout}>انتقل إلى تفاصيل الطلب</button></footer>
        </>}
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
  tableContext,
  backendReady,
}: {
  total: number;
  mode: Mode;
  setMode: (m: Mode) => void;
  onClose: () => void;
  onSubmit: (form: HTMLFormElement) => void | Promise<void>;
  settings?: RestaurantSettings;
  tableContext: PublicMenuPayload["table"];
  backendReady: boolean;
}) {
  const missingDineInContext = mode === "dine-in" && !tableContext;
  return (
    <div className="modal-backdrop">
      <section className="checkout-modal handoff-modal" role="dialog" aria-modal="true">
        <header className="handoff-header">
          <div><span className="eyebrow">إتمام الطلب</span><h2>لنضع اللمسات الأخيرة</h2><p>ثلاث خطوات قصيرة، ثم يصل طلبك إلى المطبخ.</p></div>
          <button className="close" onClick={onClose} aria-label="إغلاق">×</button>
        </header>
        <div className="handoff-layout">
          <div className="handoff-form-column">
            <div className="handoff-section service-section">
              <div className="section-marker"><span>01</span><div><strong>كيف تريد طلبك؟</strong><small>اختر طريقة الاستلام المناسبة</small></div></div>
              <div className="mode-tabs service-cards">
                {(["dine-in", "takeaway", "delivery"] as Mode[]).map((m) => (
                  <button
                    className={mode === m ? "active" : ""}
                    key={m}
                    onClick={() => setMode(m)}
                  >
                    {m === "dine-in"
                      ? "في المطعم"
                      : m === "takeaway"
                        ? "سفري"
                        : "توصيل"}
                  </button>
                ))}
              </div>
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
              <div className="handoff-section">
                <div className="section-marker"><span>02</span><div><strong>إلى من نجهزها؟</strong><small>نستخدمها لتسليم الطلب فقط</small></div></div>
                <div className="handoff-fields">
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
                  {mode === "dine-in" &&
                    (tableContext ? (
                      <div className="checkout-hint">
                        الطاولة: <strong>{tableContext.labelAr}</strong>
                        {tableContext.area ? ` — ${tableContext.area}` : ""}
                      </div>
                    ) : (
                      <div className="checkout-warning">
                        امسح رمز QR الصحيح الموجود على الطاولة لتفعيل الطلب داخل المطعم.
                      </div>
                    ))}
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
                </div>
              </div>
              <div className="handoff-section">
                <div className="section-marker"><span>03</span><div><strong>طريقة الدفع</strong><small>اختر وسيلة الدفع المفضلة</small></div></div>
                <div className="handoff-fields">
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
                </div>
              </div>
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
                disabled={
                  !backendReady ||
                  missingDineInContext ||
                  Boolean(
                    settings &&
                    !settings[
                    mode === "dine-in"
                      ? "dineIn"
                      : mode === "takeaway"
                        ? "takeaway"
                        : "delivery"
                    ],
                  )
                }
              >
                تأكيد الطلب
              </button>
            </form>
          </div>
          <aside className="handoff-receipt"><span className="eyebrow">ملخص الحساب</span><h3>مائدتك جاهزة</h3><div className="receipt-total"><small>الإجمالي المبدئي</small><strong>{formatSyp(total)}</strong></div><p>تظهر رسوم التوصيل أو أي تعديل نهائي بعد مراجعة المطعم.</p><div className="receipt-seal">تأكيد آمن قبل الإرسال</div></aside>
        </div>
      </section>
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
  const activeOrders = orders.filter((order) => !["completed", "cancelled"].includes(order.status));
  return (
    <div className="orders-page order-journal">
      <header className="journal-header"><div><span className="eyebrow">دفتر المائدة / متابعة مباشرة</span><h1>حكاية طلباتك</h1><p>كل طلب يحتفظ بوقته، تفاصيله، وحالته حتى يصل إليك.</p></div><div className="journal-count"><strong>{orders.length}</strong><span>طلبات محفوظة</span></div><button className="primary" onClick={onMenu}>ابدأ طلباً جديداً</button></header>
      {orders.length === 0 ? <div className="empty-panel journal-empty"><span className="eyebrow">الفصل الأول</span><h2>لم تُكتب أول حكاية بعد</h2><p>ابدأ بتصفح القائمة، واختر ما ترغب أن يصل إلى مائدتك.</p><button className="secondary" onClick={onMenu}>افتح القائمة</button></div> : <div className="journal-layout"><section className="journal-list"><div className="journal-list-head"><span>أرشيف الطلبات</span><small>{activeOrders.length} قيد المتابعة الآن</small></div>{orders.map((order, index) => <button className={`journal-entry ${activeOrders.includes(order) ? "is-live" : ""}`} key={order.id} onClick={() => onTrack(order)}><span className="entry-index">{String(index + 1).padStart(2, "0")}</span><span className="entry-main"><strong>{order.id}</strong><span>{modeLabels[order.mode]} · {order.lines.reduce((a, l) => a + l.qty, 0)} أصناف</span><small>{new Date(order.createdAt).toLocaleDateString("ar-SY", { day: "numeric", month: "long" })}، {new Date(order.createdAt).toLocaleTimeString("ar-SY", { hour: "2-digit", minute: "2-digit" })}</small></span><span className="entry-total"><strong>{formatSyp(order.total)}</strong><small className={`status ${order.status}`}>{statusLabels[order.status]}</small></span><span className="entry-arrow">عرض التفاصيل</span></button>)}</section><aside className="journal-aside"><span className="eyebrow">مفتوح الآن</span><h2>{activeOrders.length ? "هناك طلب يتحرك" : "المطبخ بانتظارك"}</h2><p>{activeOrders.length ? "افتح أي طلب قيد التنفيذ لمشاهدة آخر تحديث من المطعم." : "عد إلى القائمة وابدأ تركيبة جديدة من أطباق اليوم."}</p><button className="secondary" onClick={onMenu}>{activeOrders.length ? "استكشف القائمة أيضاً" : "اكتب طلبك التالي"}</button></aside></div>}
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
        <span className="eyebrow">دخول الموظفين</span>
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
              placeholder="كلمة المرور"
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
      <section className="tracking-modal tracking-dossier" role="dialog" aria-modal="true">
        <header className="dossier-header"><div><span className="eyebrow">سجل الطلب / {modeLabels[displayOrder.mode]}</span><h2>{displayOrder.id}</h2><p>{formatSyp(displayOrder.total)} · {displayOrder.table || displayOrder.address || "طلب خارجي"}</p></div><button className="close" onClick={onClose} aria-label="إغلاق">×</button></header>
        <div className="dossier-status"><span className="success-check" aria-hidden="true" /><div><small>الحالة الحالية</small><strong>{statusLabels[displayOrder.status]}</strong><p>{displayOrder.status === "received" ? "تم إرسال طلبك إلى المطعم، سيتم تأكيده قريباً." : displayOrder.status === "completed" ? "صحة وعافية! نتمنى أن تكون التجربة نالت إعجابك." : "فريقنا يعمل على تجهيز طلبك الآن."}</p></div></div>
        <div className="tracker dossier-timeline">{steps.map((step, i) => <div className={i <= current ? "track-step done" : "track-step"} key={step}><span>{i + 1}</span><div><strong>{statusLabels[step]}</strong><small>{i < current ? "اكتملت" : i === current ? "نحن هنا الآن" : "في انتظارها"}</small></div></div>)}</div>
        <section className="dossier-lines"><div className="dossier-section-head"><span>محتويات الطلب</span><small>{displayOrder.lines.length} أطباق</small></div>{displayOrder.lines.map((line) => <div className="dossier-line" key={line.key}><span>{line.qty} ×</span><strong>{line.item.name}</strong><small>{line.options.map((option) => option.name).join("، ") || "بدون إضافات"}</small><b>{formatSyp((line.item.price + line.options.reduce((a, o) => a + o.price, 0)) * line.qty)}</b></div>)}</section>
        {trackingMessage && <p className="tracking-note">{trackingMessage}</p>}
        <button className="secondary wide" onClick={() => onWhatsApp(displayOrder)}>تواصل مع المطعم عبر واتساب</button>
      </section>
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
  return (
    <div className="admin-page operations-workspace">
      <header className="admin-header workspace-masthead">
        <div className="masthead-title"><span className="eyebrow">دفتر التشغيل / {new Date().toLocaleDateString("ar-SY", { weekday: "long", day: "numeric", month: "long" })}</span><h1>{restaurant.name}</h1><p>مساحة العمل اليومية: الطلبات، المطبخ، والفريق في إيقاع واحد.</p></div>
        <div className="admin-account-actions"><div className="staff-identity"><span>{memberships.find((entry) => entry.restaurantSlug === restaurant.id)?.displayName || staffEmail}</span><small>{memberships.find((entry) => entry.restaurantSlug === restaurant.id)?.role || "staff"} · متصل</small></div><div className="restaurant-switch"><span>تبديل المطعم</span><select value={restaurant.id} onChange={(e) => onSwitch(e.target.value)}>{memberships.map((entry) => <option key={entry.restaurantId} value={entry.restaurantSlug}>{entry.restaurantName}</option>)}</select></div><button className="secondary sign-out-button" onClick={() => void onSignOut()}>خروج آمن</button></div>
      </header>
      <div className="workspace-pulse"><div><span>المشهد الآن</span><strong>{visible.length} طلباً في العرض</strong></div><div><span>قيد التنفيذ</span><strong>{orders.filter((o) => !["completed", "cancelled"].includes(o.status)).length}</strong></div><div><span>المطبخ</span><strong>{orders.filter((o) => ["preparing", "ready"].includes(o.status)).length} وصفات</strong></div><div><span>آخر مزامنة</span><strong>مباشر الآن</strong></div></div>
      <nav className="admin-tabs workspace-index" aria-label="فهرس مساحة العمل"><div className="admin-tabs-heading"><small>مساحة الإدارة</small><strong>فصول التشغيل</strong></div><div className="workspace-nav-group"><span>اليوم</span><button className={tab === "overview" ? "active" : ""} onClick={() => setTab("overview")}>نظرة عامة</button><button className={tab === "orders" ? "active" : ""} onClick={() => setTab("orders")}>الطلبات <b>{orders.filter((o) => !["completed", "cancelled"].includes(o.status)).length}</b></button></div><div className="workspace-nav-group"><span>المحتوى</span><button className={tab === "menu" ? "active" : ""} onClick={() => setTab("menu")}>القائمة <b>{restaurant.items.length}</b></button><button className={tab === "tables" ? "active" : ""} onClick={() => setTab("tables")}>الطاولات و QR</button></div><div className="workspace-nav-group"><span>المراجعة</span><button className={tab === "reports" ? "active" : ""} onClick={() => setTab("reports")}>التقارير</button><button className={tab === "operations" ? "active" : ""} onClick={() => setTab("operations")}>الفريق والتشغيل</button><button className={tab === "settings" ? "active" : ""} onClick={() => setTab("settings")}>إعدادات المطعم</button></div></nav>
      {tab === "overview" && (
        <AdminOverview
          orders={orders}
          settings={settings}
          onOpenOrders={() => setTab("orders")}
        />
      )}
      {tab === "orders" && (
        <>
          <div className="admin-toolbar order-desk-toolbar">
            <label className="order-search">
              <span>البحث في الطلبات</span>
              <input
                value={orderQuery}
                onChange={(event) => setOrderQuery(event.target.value)}
                placeholder="رقم الطلب، اسم العميل، أو الهاتف"
              />
            </label>
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
              {soundEnabled ? "التنبيهات مفعلة" : "التنبيهات متوقفة"}
            </button>
            <span className="sync">متصل الآن · آخر تحديث الآن</span>
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
    <div className="operations-panel operations-ledger">
      <div className="manager-intro operations-intro">
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
          {state.acceptingOrders ? "يستقبل الطلبات" : "الطلبات متوقفة"}
        </span>
      </div>
      <div className="operations-grid operations-workbench">
        <section className="service-switchboard">
          <span className="section-marker">01</span>
          <h3>لوحة تشغيل المطعم</h3>
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
        <section className="staff-roster">
          <div className="settings-section-head">
            <div><span className="section-marker">02</span><h3>سجل أعضاء الفريق</h3></div>
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
      <section className="audit-panel activity-ledger">
        <div className="settings-section-head">
          <h3>سجل النشاط</h3>
          <small>سجل دائم للعمليات الإدارية</small>
        </div>
        <div className="audit-list">
          {state.audit.map((entry) => (
            <div key={entry.id}>
              <span aria-hidden="true" />
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
      <div className="manager-intro report-masthead">
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
      <div className="report-filters date-folio">
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
      <div className="metric-grid report-metrics report-scoreboard">
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
      <div className="report-grid report-spreads">
        <section className="channel-ledger">
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
        <section className="best-sellers-ledger">
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
  settings,
  onOpenOrders,
}: {
  orders: Order[];
  settings: RestaurantSettings;
  onOpenOrders: () => void;
}) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(todayStart.getDate() + 1);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(todayStart.getDate() - 1);

  const inRange = (iso: string, from: Date, to: Date) => {
    const d = new Date(iso);
    return d >= from && d < to;
  };
  const isPaid = (order: Order) => order.status !== "cancelled";

  const todaysOrders = orders.filter((o) =>
    inRange(o.createdAt, todayStart, tomorrowStart),
  );
  const yesterdaysOrders = orders.filter((o) =>
    inRange(o.createdAt, yesterdayStart, todayStart),
  );
  const todaysRevenue = todaysOrders
    .filter(isPaid)
    .reduce((sum, o) => sum + o.total, 0);
  const yesterdaysRevenue = yesterdaysOrders
    .filter(isPaid)
    .reduce((sum, o) => sum + o.total, 0);
  const activeOrders = orders.filter(
    (o) => !["completed", "cancelled"].includes(o.status),
  ).length;
  const pendingOrders = orders.filter((o) => o.status === "received").length;
  const todaysPaidCount = todaysOrders.filter(isPaid).length;
  const avgOrder = todaysPaidCount
    ? Math.round(todaysRevenue / todaysPaidCount)
    : 0;

  const orderTrend = yesterdaysOrders.length
    ? ((todaysOrders.length - yesterdaysOrders.length) /
      yesterdaysOrders.length) *
    100
    : null;
  const revenueTrend = yesterdaysRevenue
    ? ((todaysRevenue - yesterdaysRevenue) / yesterdaysRevenue) * 100
    : null;

  const trendLabel = (trend: number | null) =>
    trend === null
      ? "—"
      : `${Math.round(trend) >= 0 ? "+" : ""}${Math.round(trend)}% عن أمس`;
  const trendClass = (trend: number | null) =>
    trend === null ? "" : trend >= 0 ? "trend-up" : "trend-down";

  const hourBuckets = Array.from({ length: 24 }, () => 0);
  orders.forEach((o) => {
    hourBuckets[new Date(o.createdAt).getHours()] += o.total;
  });
  const maxHour = Math.max(...hourBuckets, 1);
  const operatingHours = Array.from({ length: 15 }, (_, i) => i + 9);
  const peakRevenue = Math.max(...hourBuckets);

  const statusOrder: Order["status"][] = [
    "received",
    "confirmed",
    "preparing",
    "ready",
    "out-for-delivery",
    "completed",
    "cancelled",
  ];
  const statusColor: Record<Order["status"], string> = {
    received: "#e5a541",
    confirmed: "#3b82f6",
    preparing: "#6385c3",
    ready: "#42a26b",
    "out-for-delivery": "#8b5cf6",
    completed: "#23754a",
    cancelled: "#a23e38",
  };

  return (
    <div className="overview command-briefing">
      <header className="overview-intro briefing-intro"><div><span className="eyebrow">مذكرة التشغيل / اليوم</span><h1>صورة المطعم الآن</h1><p>قراءة سريعة لما يتحرك في المطبخ، وما يحتاج قراراً منك.</p></div><button className="primary" onClick={onOpenOrders}>افتح مكتب الطلبات</button></header>
      {orders.length === 0 ? <div className="empty-panel"><h2>ابدأ باستلام الطلبات</h2><p>ستظهر مقاييس اليوم ومخطط الحركة مع أول طلب مؤكد.</p><button className="primary" onClick={onOpenOrders}>فتح مكتب الطلبات</button></div> : <>
        <section className="briefing-lead"><div className="lead-revenue"><span className="eyebrow">المبيعات المحققة اليوم</span><strong>{formatSyp(todaysRevenue)}</strong>{settings.currencyEstimate && <small>≈ {formatUsd(todaysRevenue, settings.rate)} USD</small>}<em className={trendClass(revenueTrend)}>{trendLabel(revenueTrend)}</em></div><div className="lead-reading"><span>قراءة اليوم</span><h2>{activeOrders ? `${activeOrders} طلبات تتحرك الآن` : "الإيقاع هادئ حالياً"}</h2><p>{pendingOrders ? `${pendingOrders} طلبات جديدة تنتظر التأكيد. افتح مكتب الطلبات حتى لا تتأخر الوصفات.` : "لا توجد طلبات جديدة معلقة، ويمكن للفريق متابعة التحضير."}</p><button className="secondary" onClick={onOpenOrders}>راجع خط الإنتاج</button></div></section>
        <div className="briefing-stats"><article><span>طلبات اليوم</span><strong>{todaysOrders.length}</strong><em className={trendClass(orderTrend)}>{trendLabel(orderTrend)}</em></article><article><span>قيد المعالجة</span><strong>{activeOrders}</strong><em>{pendingOrders} جديدة</em></article><article><span>متوسط الطلب</span><strong>{formatSyp(avgOrder)}</strong><em>{todaysPaidCount} محتسبة اليوم</em></article></div>
        <div className="overview-grid briefing-grid"><section className="activity-panel briefing-chart"><div className="panel-title"><div><span className="eyebrow">إيقاع اليوم</span><h2>المبيعات حسب الساعة</h2></div><span className="legend">الذروة {formatSyp(peakRevenue)}</span></div>{peakRevenue > 0 ? <div className="chart-bars">{operatingHours.map((hour) => { const value = hourBuckets[hour]; const height = value ? (value / maxHour) * 100 : 0; return <div key={hour}>{value ? <span style={{ height: `${height}%` }} title={`${formatSyp(value)} — ${hour}:00`} /> : null}<small>{hour}</small></div>; })}</div> : <div className="chart-empty">لا توجد بيانات مبيعات للساعات بعد.</div>}</section><section className="status-breakdown briefing-ledger"><div className="panel-title"><div><span className="eyebrow">سجل الحركة</span><h2>حالة كل طلب</h2></div><span className="legend">{activeOrders} نشط · {orders.length} إجمالي</span></div><div className="status-rows">{statusOrder.map((status) => { const count = orders.filter((o) => o.status === status).length; const revenue = orders.filter((o) => o.status === status && o.status !== "cancelled").reduce((sum, o) => sum + o.total, 0); return <div className="status-row" key={status} style={{ opacity: count ? 1 : 0.5, background: count ? "rgba(0, 0, 0, 0.02)" : "transparent" }}><span className="status-dot" style={{ background: statusColor[status] }} /><span className="status-label">{statusLabels[status]}</span><b className="status-count">{count}</b>{revenue ? <small>{formatSyp(revenue)}</small> : null}</div>; })}</div></section></div>
        <footer className="dashboard-cta briefing-footer"><span><strong>{activeOrders}</strong> طلبات تحتاج المتابعة · <strong>{pendingOrders}</strong> جديدة</span><button className="primary" onClick={onOpenOrders}>دخول مكتب الطلبات</button></footer>
      </>}
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
      code: String(index + 1),
      name: `الطاولة ${String(index + 1).padStart(2, "0")}`,
      area: index < 8 ? "الصالة الرئيسية" : "التراس",
      active: true,
    }));
  const storedTables = () =>
    readStored<RestaurantTable[]>(storageKey, defaultTables()).map((table) => ({
      ...table,
      code: table.code ?? table.id.replace(/^table-/, ""),
    }));
  const [tables, setTables] = useState<RestaurantTable[]>(storedTables);
  const loadTables = async () => {
    if (!restaurantDatabaseId) return;
    const { data, error } = await supabase.rpc("get_admin_tables", {
      p_restaurant_id: restaurantDatabaseId,
    });
    if (error) {
      window.alert(`تعذر تحميل الطاولات: ${error.message}`);
      return;
    }
    setTables((data ?? []) as RestaurantTable[]);
  };
  useEffect(() => {
    setTables(storedTables());
    void loadTables();
  }, [storageKey, restaurantDatabaseId]);
  useEffect(
    () => writeStored(storageKey, tables),
    [storageKey, tables],
  );
  const tableUrl = (table: RestaurantTable) => {
    if (!table.qrToken) return "";
    const url = new URL(location.pathname, location.origin);
    url.searchParams.set("restaurant", restaurant.id);
    url.searchParams.set("table", table.code);
    url.searchParams.set("tableToken", table.qrToken);
    return url.toString();
  };
  const persistTables = async (nextTables: RestaurantTable[]) => {
    if (!restaurantDatabaseId) return;
    const { error } = await supabase.rpc("sync_admin_tables", {
      p_restaurant_id: restaurantDatabaseId,
      p_payload: nextTables,
    });
    if (error) {
      window.alert(`تعذر حفظ الطاولات: ${error.message}`);
      return;
    }
    await loadTables();
  };
  const updateTables = (nextTables: RestaurantTable[]) => {
    setTables(nextTables);
    void persistTables(nextTables);
  };
  const save = (form: HTMLFormElement) => {
    const data = new FormData(form);
    const previous = editing === "new" ? null : editing;
    const code = String(data.get("id")).trim();
    const table: RestaurantTable = {
      id: previous?.id ?? `table-${code}`,
      code: previous?.code ?? code,
      name: String(data.get("name")).trim(),
      area: String(data.get("area")).trim(),
      active: previous?.active ?? true,
      qrToken: previous?.qrToken,
    };
    if (!previous && tables.some((entry) => entry.code === table.code))
      return window.alert("رقم الطاولة مستخدم بالفعل.");
    updateTables(
      previous
        ? tables.map((entry) => (entry.id === previous.id ? table : entry))
        : [...tables, table],
    );
    setEditing(null);
  };
  const download = async (table: RestaurantTable) => {
    const targetUrl = tableUrl(table);
    if (!targetUrl) return window.alert("رمز الطاولة لم يُحمّل بعد.");
    const url = await QRCode.toDataURL(targetUrl, {
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
    const targetUrl = tableUrl(table);
    if (!targetUrl) return window.alert("رمز الطاولة لم يُحمّل بعد.");
    const qr = await QRCode.toDataURL(targetUrl, {
      width: 700,
      margin: 2,
    });
    const popup = window.open("", "_blank", "width=600,height=760");
    popup?.document.write(
      `<html dir="rtl"><head><title>${table.name}</title><style>body{font-family:Arial;text-align:center;padding:40px;color:#153a2f}img{width:360px;max-width:90%}h1{font-size:36px;margin-bottom:4px}p{font-size:18px}small{display:block;margin-top:22px;color:#667}</style></head><body><h1>${restaurant.name}</h1><p>${table.name} — ${table.area}</p><img src="${qr}" onload="window.print()"><small>امسح الرمز لفتح القائمة وبدء الطلب</small></body></html>`,
    );
    popup?.document.close();
  };
  const activeCount = tables.filter((table) => table.active).length;
  return (
    <div className="tables-manager table-registry">
      <header className="registry-header">
        <div>
          <span className="eyebrow">سجل نقاط الخدمة</span>
          <h2>الطاولات ورموز الوصول</h2>
          <p>كل رمز يفتح قائمة {restaurant.name} ضمن سياق طاولة موثوق.</p>
        </div>
        <div className="registry-summary">
          <span><small>إجمالي الطاولات</small><strong>{tables.length}</strong></span>
          <span><small>النشطة الآن</small><strong>{activeCount}</strong></span>
          <button className="primary" onClick={() => setEditing("new")}>إضافة طاولة</button>
        </div>
      </header>
      <div className="table-grid registry-grid">
        {tables.map((table) => (
          <TableCard
            key={table.id}
            table={table}
            url={tableUrl(table)}
            copied={copied === table.id}
            onCopy={() => {
              const url = tableUrl(table);
              if (!url) return window.alert("رمز الطاولة لم يُحمّل بعد.");
              navigator.clipboard?.writeText(url);
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
                    defaultValue={editing === "new" ? "" : editing.code}
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
    if (!url) {
      setSvg("");
      return;
    }
    QRCode.toString(url, { type: "svg", margin: 1, width: 220 }).then(setSvg);
  }, [url]);
  return (
    <article className={`table-pass ${!table.active ? "table-inactive" : ""}`}>
      <header className="table-pass-heading">
        <span className={`table-state ${table.active ? "active" : "paused"}`}>{table.active ? "نشطة" : "متوقفة"}</span>
        <span className="table-code">{table.code}</span>
      </header>
      <div className="table-pass-body">
        <div className="qr-plate">
          <div className="real-qr" aria-label={`QR ${table.name}`} dangerouslySetInnerHTML={{ __html: svg }} />
          <small>امسح لفتح القائمة</small>
        </div>
        <div className="table-identity">
          <span className="eyebrow">نقطة خدمة</span>
          <strong>{table.name}</strong>
          <small>{table.area}</small>
          <button className="copy-link" onClick={onCopy}>{copied ? "تم نسخ الرابط" : "نسخ رابط الوصول"}</button>
        </div>
      </div>
      <footer className="table-pass-actions">
        <button className="download" onClick={onDownload}>تنزيل الرمز</button>
        <button className="download" onClick={onPrint}>طباعة</button>
        <button onClick={onEdit}>تعديل</button>
        <button onClick={onToggle}>{table.active ? "إيقاف" : "تفعيل"}</button>
        <button className="danger-text" onClick={onDelete}>حذف</button>
      </footer>
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
    <div className="settings-panel settings-atlas">
      <div className="manager-intro settings-masthead">
        <div>
          <span className="eyebrow">إعداد المطعم</span>
          <h2>الهوية والتشغيل والدفع والتوصيل</h2>
          <p>
            جميع التغييرات محفوظة محلياً وجاهزة للربط بقاعدة البيانات لاحقاً.
          </p>
        </div>
      </div>
      <form className="settings-dossier"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <section className="settings-chapter identity-chapter">
          <header><span className="section-marker">01</span><div><small>الواجهة العامة</small><h3>معلومات وهوية المطعم</h3></div></header>
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
        <section className="settings-chapter finance-chapter">
          <header><span className="section-marker">02</span><div><small>الحسابات</small><h3>العملة والرسوم</h3></div></header>
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
        <section className="settings-chapter payment-chapter">
          <header><span className="section-marker">03</span><div><small>التحصيل</small><h3>المحافظ وطرق الدفع</h3></div></header>
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
        <section className="settings-chapter channels-chapter">
          <header><span className="section-marker">04</span><div><small>قنوات الخدمة</small><h3>طرق الطلب المتاحة</h3></div></header>
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
        <section className="settings-chapter hours-chapter">
          <header><span className="section-marker">05</span><div><small>الجدول الأسبوعي</small><h3>ساعات العمل</h3></div></header>
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
        <section className="settings-chapter delivery-chapter">
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
          {saved ? "تم حفظ التغييرات" : "حفظ جميع التغييرات"}
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
    <article className="admin-order kitchen-ticket">
      <header className="ticket-heading"><div><span className="ticket-number">{order.id}</span><strong>{modeLabels[order.mode]}</strong></div><span className={`status ${order.status}`}>{statusLabels[order.status]}</span></header>
      <button className="ticket-customer" onClick={onOpen}><span className="ticket-avatar">{order.customer.slice(0, 1)}</span><span><strong>{order.customer}</strong><small>{order.table || order.address || "طلب مباشر"}</small></span><b>فتح الملف</b></button>
      <div className="ticket-items">{order.lines.map((l) => <div className="ticket-item" key={l.key}><span><b>{l.qty}×</b>{l.item.name}</span><small>{l.options.map((o) => o.name).join("، ") || "التركيبة الأساسية"}</small><strong>{formatSyp((l.item.price + l.options.reduce((a, o) => a + o.price, 0)) * l.qty)}</strong></div>)}</div>
      <div className="ticket-meta"><span>الدفع: {order.paymentStatus === "verified" ? "متحقق" : order.paymentStatus === "rejected" ? "مرفوض" : "بانتظار التحقق"}</span><strong>{formatSyp(order.total)}</strong></div>
      <footer className="ticket-actions"><button className="mini-action" onClick={() => onWhatsApp(order)}>مراسلة العميل</button>{next[order.status] && <button className="advance" onClick={() => onStatus(order.id, next[order.status])}>{next[order.status] === "confirmed" ? "تأكيد واستلام" : next[order.status] === "preparing" ? "إرسال للمطبخ" : next[order.status] === "ready" ? "تحديد كجاهز" : "إتمام الطلب"}</button>}</footer>
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
    <div className="modal-backdrop dossier-backdrop">
      <section className="order-details-modal service-dossier" role="dialog" aria-modal="true" aria-label={`ملف الطلب ${order.id}`}>
        <header className="dossier-masthead">
          <div className="dossier-kicker">
            <span className="eyebrow">ملف الخدمة / {modeLabels[order.mode]}</span>
            <span className={`status dossier-status ${order.status}`}>
              {statusLabels[order.status]}
            </span>
          </div>
          <div className="dossier-title-row">
            <div>
              <span className="dossier-number">#{order.id}</span>
              <h2>سجل الطلب والتسليم</h2>
              <p>{new Date(order.createdAt).toLocaleString("ar-SY")}</p>
            </div>
            <button className="close dossier-close" onClick={onClose} aria-label="إغلاق الملف">
              ×
            </button>
          </div>
        </header>

        <div className="dossier-body">
          <main className="dossier-main">
            <section className="dossier-section customer-brief">
              <div className="dossier-section-heading">
                <span className="section-marker">01</span>
                <div>
                  <span className="eyebrow">الضيف</span>
                  <h3>بيانات التسليم</h3>
                </div>
              </div>
              <div className="customer-brief-grid">
                <div className="brief-person">
                  <span className="dossier-avatar">{order.customer.slice(0, 1)}</span>
                  <div>
                    <small>اسم العميل</small>
                    <strong>{order.customer}</strong>
                    <span>{order.phone || "لا يوجد هاتف مسجل"}</span>
                  </div>
                </div>
                <div>
                  <small>نقطة التسليم</small>
                  <strong>{order.table || order.address || "طلب مباشر"}</strong>
                  <span>{order.mode === "delivery" ? "عنوان توصيل" : modeLabels[order.mode]}</span>
                </div>
                <div>
                  <small>قناة الطلب</small>
                  <strong>{modeLabels[order.mode]}</strong>
                  <span>{order.paymentReference || "لا يوجد مرجع دفع"}</span>
                </div>
              </div>
            </section>

            <section className="dossier-section dish-manifest">
              <div className="dossier-section-heading">
                <span className="section-marker">02</span>
                <div>
                  <span className="eyebrow">المحتوى</span>
                  <h3>بيان الأطباق</h3>
                </div>
                <span className="manifest-count">{order.lines.length} أصناف</span>
              </div>
              <div className="dossier-lines">
                {order.lines.map((line, index) => (
                  <article className="dossier-dish" key={line.key}>
                    <span className="dish-index">{String(index + 1).padStart(2, "0")}</span>
                    <div className="dish-copy">
                      <strong>{line.qty}× {line.item.name}</strong>
                      <small>
                        {line.options.map((option) => option.name).join("، ") || "التركيبة الأساسية"}
                        {line.note ? ` · ${line.note}` : ""}
                      </small>
                    </div>
                    <b>{formatSyp((line.item.price + line.options.reduce((sum, option) => sum + option.price, 0)) * line.qty)}</b>
                  </article>
                ))}
              </div>
              <div className="dossier-total">
                <span>القيمة النهائية</span>
                <strong>{formatSyp(order.total)}</strong>
              </div>
            </section>

            <section className="dossier-section payment-review dossier-payment">
              <div className="dossier-section-heading">
                <span className="section-marker">03</span>
                <div>
                  <span className="eyebrow">المراجعة</span>
                  <h3>حالة التحصيل</h3>
                </div>
                <span className={`payment-stamp ${order.paymentStatus}`}>{order.payment}</span>
              </div>
              <div className="payment-actions">
                <button className={order.paymentStatus === "pending" ? "active" : ""} onClick={() => onChange(order.id, { paymentStatus: "pending" })}>بانتظار التحقق</button>
                <button className={order.paymentStatus === "verified" ? "verified active" : "verified"} onClick={() => onChange(order.id, { paymentStatus: "verified" })}>تم التحقق</button>
                <button className={order.paymentStatus === "rejected" ? "rejected active" : "rejected"} onClick={() => onChange(order.id, { paymentStatus: "rejected" })}>مرفوض</button>
                <button className={order.paymentStatus === "refunded" ? "rejected active" : "rejected"} onClick={() => onChange(order.id, { paymentStatus: "refunded" })}>مسترد</button>
              </div>
            </section>
          </main>

          <aside className="dossier-aside">
            <section className="dossier-action-board">
              <span className="eyebrow">الخطوة التالية</span>
              <h3>حرّك الطلب في مساره</h3>
              <div className="dossier-status-actions">
                {(["received", "confirmed", "preparing", "ready", "out-for-delivery", "completed"] as Order["status"][])
                  .filter((status) => status !== "out-for-delivery" || order.mode === "delivery")
                  .map((status) => (
                    <button key={status} className={order.status === status ? "active" : ""} onClick={() => onStatus(order.id, status)}>
                      <span>{statusLabels[status]}</span>
                      <small>{order.status === status ? "الحالة الحالية" : "تعيين الحالة"}</small>
                    </button>
                  ))}
              </div>
            </section>

            <label className="internal-note dossier-note">
              <span className="eyebrow">غرفة الفريق</span>
              <strong>ملاحظة داخلية</strong>
              <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="ملاحظة للمطبخ أو فريق الخدمة..." />
              <button onClick={() => onChange(order.id, { internalNote: note })}>حفظ الملاحظة</button>
            </label>

            <footer className="dossier-footer">
              <button className="secondary" onClick={() => onWhatsApp(order)}>مراسلة العميل</button>
              {order.status !== "cancelled" && order.status !== "completed" && <button className="danger-button" onClick={cancel}>إلغاء الطلب</button>}
              {order.cancellationReason && <p className="cancel-reason">سبب الإلغاء: {order.cancellationReason}</p>}
            </footer>
          </aside>
        </div>
      </section>
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
    <div className="menu-manager menu-studio">
      <div className="manager-intro studio-masthead">
        <div>
          <span className="eyebrow">محتوى المطعم</span>
          <h2>عناصر القائمة</h2>
          <p>أضف الأصناف وعدّل الأسعار والتصنيفات والإضافات والتوفر.</p>
        </div>
        <button className="primary" onClick={() => setEditing("new")}>
          + إضافة صنف جديد
        </button>
      </div>
      <div className="menu-admin-tools catalogue-index">
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
      <div className="inventory-list dish-inventory">
        {filtered.map((item) => (
          <article className="inventory-row inventory-dish" key={item.id}>
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
          </article>
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
                حفظ الصنف
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
    <section className="category-manager category-index-card">
      <div className="option-editor-title">
        <div>
          <strong>تصنيفات القائمة</strong>
          <small>رتّب التصنيفات وعدّل ظهورها للزبائن.</small>
        </div>
        <button type="button" onClick={onAdd}>
          إضافة تصنيف
        </button>
      </div>
      <div className="category-admin-list">
        {active.map((entry, index) => (
          <div className="category-admin-row" key={entry.id}>
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
                تقديم
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
                تأخير
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
    <div className="option-editor modifier-workshop">
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
