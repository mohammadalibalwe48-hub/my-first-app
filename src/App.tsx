import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  ArrowRight,
  ArrowUp,
  Check,
  ClipboardList,
  Globe2,
  LayoutDashboard,
  Minus,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBasket,
  Store,
  Truck,
  Utensils,
  X,
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
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Scroll-to-top floating action button — appears after the hero scrolls past.
  const [showTop, setShowTop] = useState(false);
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 560);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
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

  // Secret admin access — no link anywhere in the UI points here. The only way
  // in is typing /admin (or ?admin=1) directly in the address bar, so ordinary
  // customers never see that an admin panel exists. If the visitor is already a
  // signed-in staff member we open the dashboard; otherwise we silently open the
  // staff login modal. The query parameter is then scrubbed from the URL.
  useEffect(() => {
    if (!authReady) return;
    const path = window.location.pathname.replace(/\/+$/, "");
    const params = new URLSearchParams(window.location.search);
    const isSecretAdminRoute = path === "/admin" || params.get("admin") === "1";
    if (!isSecretAdminRoute) return;

    if (staffEmail && memberships.length > 0) {
      setView("manage");
      setAdminTab("overview");
    } else {
      setAuthOpen(true);
    }

    const url = new URL(window.location.href);
    url.searchParams.delete("admin");
    window.history.replaceState(null, "", url.toString());
  }, [authReady, staffEmail, memberships]);

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
    <div className="app-root" dir={language === "ar" ? "rtl" : "ltr"}>
      <header className={`navbar${scrolled ? " navbar--scrolled" : ""}`}>
        <button
          className="navbar__brand"
          onClick={() => {
            setView("menu");
            setTrackingOrder(null);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          aria-label="العودة إلى القائمة"
        >
          <span className="navbar__logo">{restaurant.logo || "س"}</span>
          <span>
            <strong className="navbar__brand-name">{restaurant.name}</strong>
            <small className="navbar__brand-sub">مائدة دمشقية معاصرة</small>
            <span className="navbar__brand-loc">{restaurant.neighborhood}، {restaurant.city}</span>
          </span>
        </button>

        <nav className="navbar__nav" aria-label="التنقل الرئيسي">
          <button
            className={`navbar__link${view === "menu" ? " navbar__link--active" : ""}`}
            onClick={() => setView("menu")}
          >
            <Utensils />
            <span className="navbar__btn-text">القائمة</span>
          </button>
          <button
            className={`navbar__link${view === "orders" ? " navbar__link--active" : ""}`}
            onClick={() => setView("orders")}
          >
            <ClipboardList />
            <span className="navbar__btn-text">طلباتي</span>
            {orders.length > 0 && <b>{orders.length}</b>}
          </button>
          {staffEmail && memberships.length > 0 && (
            <button
              className={`navbar__link${view === "manage" ? " navbar__link--active" : ""}`}
              onClick={() => {
                setView("manage");
                setAdminTab("overview");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            >
              <LayoutDashboard />
              <span className="navbar__btn-text">الإدارة</span>
            </button>
          )}
        </nav>

        <div className="navbar__actions">
          <div className="navbar__status">
            <i className={isOnline ? "" : "is-off"} />
            <span>{isOnline ? "متصل" : "دون اتصال"}</span>
            {tableContext && view !== "manage" && <b>· {tableContext.labelAr}</b>}
          </div>
          <button
            className="navbar__btn"
            onClick={() => setLanguage(language === "ar" ? "en" : "ar")}
            aria-label="تغيير اللغة"
          >
            <Globe2 />
            {language === "ar" ? "EN" : "عربي"}
          </button>
          <button className="navbar__btn navbar__cart" onClick={() => setCartOpen(true)}>
            <ShoppingBasket />
            <span className="navbar__btn-text">كشف الطلب</span>
            <b>{cartCount}</b>
          </button>
        </div>
      </header>
      <div>
        <main>
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
              loading={!backendReady}
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
            <div className="section staff-gate">
              <div className="staff-gate__card">
                <span className="staff-gate__icon">
                  <ShieldCheck />
                </span>
                <span className="section-kicker" style={{ justifyContent: "center" }}>
                  دخول الموظفين
                </span>
                <h1>
                  {authReady ? "لوحة المطعم للموظفين" : "جارٍ التحقق من الجلسة…"}
                </h1>
                <p>
                  {staffEmail
                    ? "الحساب مسجل، لكنه لا يملك عضوية فعّالة في أي مطعم. اطلب من المالك إضافتك إلى فريق العمل."
                    : "سجّل الدخول بحساب موظف مرتبط بالمطعم للوصول إلى الطلبات والإعدادات والتقارير."}
                </p>
                {authReady && !staffEmail && (
                  <button
                    className="btn btn--gold"
                    onClick={() => setAuthOpen(true)}
                  >
                    <ShieldCheck />
                    تسجيل دخول الموظفين
                  </button>
                )}
                {staffEmail && (
                  <button
                    className="btn btn--outline"
                    onClick={async () => {
                      await supabase.auth.signOut();
                      setView("menu");
                    }}
                  >
                    تسجيل الخروج
                  </button>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
      {notice && (
        <div className="toast" role="status">
          {notice}
        </div>
      )}
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
      {showTop && view !== "manage" && (
        <button
          className="scroll-top"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="العودة إلى الأعلى"
          title="العودة إلى الأعلى"
        >
          <ArrowUp />
        </button>
      )}
      <nav className="mobile-nav" aria-label="التنقل السريع">
        <button
          className={view === "menu" ? "active" : ""}
          onClick={() => {
            setView("menu");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          <Utensils />
          <span>القائمة</span>
        </button>
        <button className={view === "orders" ? "active" : ""} onClick={() => setView("orders")}>
          <ClipboardList />
          <span>طلباتي</span>
        </button>
        <button onClick={() => setCartOpen(true)}>
          <ShoppingBasket />
          <span>السلة</span>
          <b>{cartCount}</b>
        </button>
        {staffEmail && memberships.length > 0 && (
          <button
            className={view === "manage" ? "active" : ""}
            onClick={() => {
              setView("manage");
            }}
          >
            <LayoutDashboard />
            <span>الإدارة</span>
          </button>
        )}
      </nav>
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
  loading,
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
  loading?: boolean;
  onSelect: (i: Item) => void;
  onQuickAdd: (i: Item) => void;
}) {
  const featured = items[0] ?? restaurant.items[0];
  const secondary = items.slice(1, 3);

  const heroImage = featured?.image ?? items[0]?.image ?? images.mezze;

  return (
    <div className="menu-view">
      {/* Hero — full-screen food photography with dark overlay */}
      <section className="hero">
        <div className="hero__bg" style={{ backgroundImage: `url(${heroImage})` }} aria-hidden="true" />
        <div className="float-deco float-deco--basil" aria-hidden="true">
          <svg viewBox="0 0 200 200" fill="none">
            <path d="M100 200C60 160 50 120 60 80C70 120 100 140 100 200Z" fill="#5a8f4e" opacity="0.5" />
            <path d="M100 200C140 160 150 120 140 80C130 120 100 140 100 200Z" fill="#6aa05a" opacity="0.4" />
            <path d="M100 190C95 170 95 150 100 130C105 150 105 170 100 190Z" fill="#7ab369" opacity="0.6" />
          </svg>
        </div>
        <div className="float-deco float-deco--spice" aria-hidden="true">
          <svg viewBox="0 0 200 200" fill="none">
            <circle cx="60" cy="60" r="5" fill="#c8a951" opacity="0.7" />
            <circle cx="80" cy="50" r="4" fill="#d4a843" opacity="0.5" />
            <circle cx="52" cy="78" r="4" fill="#c8a951" opacity="0.4" />
            <circle cx="95" cy="72" r="3" fill="#e8cc82" opacity="0.6" />
            <circle cx="44" cy="50" r="3" fill="#a8863a" opacity="0.5" />
          </svg>
        </div>
        <div className="hero__content">
          <span className="hero__eyebrow">
            <i />
            {restaurant.city} · {restaurant.neighborhood}
          </span>
          <p className="hero__script">مائدة الشام، كما نحبها</p>
          <h1 className="hero__title">
            {restaurant.name} <em>سُفرة</em>
          </h1>
          <p className="hero__subtitle">{restaurant.subtitle}</p>
          <p className="hero__desc">
            أطباق يومية تُبنى على النار الهادئة، والخبز الطازج، وذاكرة البيت.
          </p>
          <div className="hero__cta">
            <button
              className="btn btn--gold"
              onClick={() =>
                document
                  .getElementById("menu-catalogue")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              تصفح القائمة
              <ArrowRight />
            </button>
            <button
              className="btn btn--outline"
              onClick={() => onSelect(featured)}
            >
              اقتراح اليوم
            </button>
          </div>
          <div className="hero__stats">
            <span className="hero__stat">
              <strong>{restaurant.items.length}</strong>
              <small>صنفاً في القائمة</small>
            </span>
            <span className="hero__stat">
              <strong>{categories.length}</strong>
              <small>قسماً مختاراً بعناية</small>
            </span>
            <span className="hero__stat">
              <strong>{restaurant.neighborhood}</strong>
              <small>في قلب {restaurant.city}</small>
            </span>
          </div>
        </div>
        {featured && (
          <button className="hero__featured" onClick={() => onSelect(featured)}>
            <span className="hero__featured-media">
              <img src={featured.image} alt={featured.name} loading="lazy" />
            </span>
            <span className="hero__featured-body">
              <small className="hero__featured-kicker">طبق الغلاف · اقتراح اليوم</small>
              <strong className="hero__featured-name">{featured.name}</strong>
              <span className="hero__featured-desc">{featured.desc}</span>
              <span className="hero__featured-foot">
                <b className="hero__featured-price">{formatSyp(featured.price)}</b>
                <em className="hero__featured-open">افتح التفاصيل <ArrowRight /></em>
              </span>
            </span>
          </button>
        )}
      </section>

      {/* Search + currency index */}
      <section className="section section--alt" aria-label="فهرس القائمة">
        <div className="menu-index">
          <div className="menu-index__title">
            <span className="section-kicker">الفهرس</span>
            <h2>اختَر إيقاع وجبتك اليوم</h2>
          </div>
          <div className="menu-index__search">
            <label>
              <Search />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="اسم طبق، مكوّن، أو مزاج…"
              />
            </label>
            <small className="menu-index__count">{items.length} صنفاً مطابقاً</small>
          </div>
          <div className="menu-index__currency">
            <small>عرض الأسعار</small>
            <div className="currency-toggle">
              <button
                className={currency === "syp" ? "active" : ""}
                onClick={() => setCurrency("syp")}
              >
                ليرة سورية
              </button>
              <button
                className={currency === "usd" ? "active" : ""}
                onClick={() => setCurrency("usd")}
              >
                دولار
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="divider" aria-hidden="true">
        <span>✦</span>
      </div>

      {/* Category pills */}
      <section className="section section--carded categories" id="menu-catalogue">
        <div className="categories__heading">
          <span className="section-kicker">تصفح الأقسام</span>
          <strong>{category === "كل الأصناف" ? "القائمة كاملة" : category}</strong>
        </div>
        <div className="pills">
          {["كل الأصناف", "الأكثر طلباً", ...categories.map((entry) => entry.name)].map(
            (entry) => (
              <button
                key={entry}
                className={`pill${category === entry ? " pill--active" : ""}`}
                onClick={() => setCategory(entry)}
              >
                {entry}
              </button>
            ),
          )}
        </div>
        <div className="tag-row">
          <span>اختيارات المطبخ:</span>
          <button
            className={`pill${tag === "all" ? " pill--active" : ""}`}
            onClick={() => setTag("all")}
          >
            الكل
          </button>
          <button
            className={`pill${tag === "vegetarian" ? " pill--active" : ""}`}
            onClick={() => setTag("vegetarian")}
          >
            نباتي
          </button>
          <button
            className={`pill${tag === "chef" ? " pill--active" : ""}`}
            onClick={() => setTag("chef")}
          >
            اختيار الشيف
          </button>
        </div>
      </section>

      {/* Menu grid */}
      <section className="section menu">
        <div className="menu__head">
          <div>
            <span className="section-script">المطبخ اليوم</span>
            <h2 className="section-title">
              {category === "كل الأصناف" ? <em>كل الأطباق</em> : <em>{category}</em>}
            </h2>
            <p className="menu__head-note">اضغط على أي طبق لتختار الحجم والإضافات.</p>
          </div>
          <span className="menu__count">{items.length} صنفاً</span>
        </div>

        <div className="menu__grid">
          {loading
            ? Array.from({ length: 6 }).map((_, index) => (
              <div className="menu-card menu-card--skeleton" key={index} aria-hidden="true">
                <div className="menu-card__media menu-skeleton__media" />
                <div className="menu-card__body">
                  <div className="menu-skeleton__line menu-skeleton__line--title" />
                  <div className="menu-skeleton__line menu-skeleton__line--text" />
                  <div className="menu-skeleton__line menu-skeleton__line--text-short" />
                  <div className="menu-skeleton__line menu-skeleton__line--btn" />
                </div>
              </div>
            ))
            : items.map((item) => {
              const needsChoice = (item.options ?? []).some((group) => group.required);
              return (
                <article className="menu-card" key={item.id}>
                  <button
                    className="menu-card__media"
                    onClick={() => onSelect(item)}
                    aria-label={`تفاصيل ${item.name}`}
                  >
                    <img
                      className="menu-card__img"
                      src={item.image}
                      alt={item.name}
                      loading="lazy"
                    />
                    {item.popular && (
                      <span className="menu-card__badge">الأكثر طلباً</span>
                    )}
                  </button>
                  <div className="menu-card__body">
                    <div className="menu-card__title-row">
                      <h3 className="menu-card__name">
                        {item.name}
                        <small className="menu-card__en">{item.en}</small>
                      </h3>
                      <span className="menu-card__price">
                        {currency === "usd" ? formatUsd(item.price, restaurant.rate) : formatSyp(item.price)}
                      </span>
                    </div>
                    <p className="menu-card__desc">{item.desc}</p>
                    {item.tags.length > 0 && (
                      <div className="menu-card__tags">
                        {item.tags.map((t) => (
                          <small className="menu-card__tag" key={t}>
                            {tagLabels[t]}
                          </small>
                        ))}
                      </div>
                    )}
                    <div className="menu-card__actions">
                      {needsChoice ? (
                        <button
                          className="menu-card__btn menu-card__btn--details"
                          onClick={() => onSelect(item)}
                        >
                          اختر الحجم والإضافات
                          <ArrowRight />
                        </button>
                      ) : (
                        <button
                          className="menu-card__btn menu-card__btn--add"
                          onClick={() => onQuickAdd(item)}
                        >
                          <Plus />
                          أضف إلى الطلب
                          {currency === "usd"
                            ? formatUsd(item.price, restaurant.rate)
                            : formatSyp(item.price)}
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
        </div>

        {secondary.length > 0 && (
          <aside className="side-suggestion">
            <span>من نفس المائدة</span>
            <strong>{secondary.map((item) => item.name).join(" · ")}</strong>
            <p>تشكيلة صغيرة تكمل اختيارك، وتصلح للمشاركة.</p>
          </aside>
        )}
        {items.length === 0 && (
          <div className="empty-state">
            <h3>لم نجد صنفاً مطابقاً</h3>
            <p>جرّب كلمة بحث أخرى أو اختر قسماً مختلفاً.</p>
            <button className="btn btn--outline" onClick={() => setQuery("")}>
              مسح البحث
            </button>
          </div>
        )}
      </section>
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
    <div
      className="modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        className="modal item-modal"
        role="dialog"
        aria-modal="true"
        aria-label={item.name}
      >
        <aside className="item-modal__media">
          <img src={item.image} alt={item.name} />
          <span className="item-modal__cat">{item.category}</span>
        </aside>
        <button className="modal__close" onClick={onClose} aria-label="إغلاق">
          <X />
        </button>
        <div className="item-modal__content">
          <header className="item-modal__head">
            <span className="kicker">بطاقة الطبق / {item.en}</span>
            <h2>{item.name}</h2>
            <p>{item.desc}</p>
            <div className="item-modal__price">
              <strong>{formatSyp(item.price + extra)}</strong>
              {currency === "usd" && (
                <small>≈ {formatUsd(item.price + extra, rate)} USD</small>
              )}
            </div>
          </header>

          <div>
            <span className="section-kicker">ابنِ طبقك</span>
            <small style={{ color: "var(--text-faint)", display: "block" }}>
              اختياراتك تحفظ مع الطلب
            </small>
          </div>

          <div style={{ display: "grid", gap: "14px" }}>
            {item.options?.map((group) => (
              <fieldset className="option-group" key={group.id}>
                <legend>
                  <strong>{group.name}</strong>
                  {group.required && <small>اختيار مطلوب</small>}
                </legend>
                <div className="option-group__list">
                  {group.options.map((option) => {
                    const checked = selected[group.id]?.some(
                      (entry) => entry.id === option.id,
                    );
                    return (
                      <label
                        key={option.id}
                        className={`option-row${checked ? " has-check" : ""}`}
                      >
                        <input
                          type={group.required ? "radio" : "checkbox"}
                          name={group.id}
                          checked={checked}
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
                        <b>{option.price ? `+${formatSyp(option.price)}` : "أساسي"}</b>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>

          <label className="note-field">
            <span>
              ملاحظة للمطبخ <small>اختياري</small>
            </span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="مثلاً: بدون بصل، الصوص جانباً..."
            />
          </label>

          <div className="item-modal__addbar">
            <button
              className="btn btn--gold"
              disabled={!valid}
              onClick={() => onAdd(item, Object.values(selected).flat(), note)}
            >
              <Plus />
              أضف إلى الطلب
              <strong>{formatSyp(item.price + extra)}</strong>
            </button>
          </div>
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
    <div
      className="modal-backdrop cart-drawer"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <aside
        className="modal cart-drawer__panel"
        role="dialog"
        aria-modal="true"
        aria-label="كشف الطلب"
      >
        <header className="cart-drawer__head">
          <div>
            <span className="kicker">ورقة الطلب / قيد التجهيز</span>
            <h2>
              مائدتك <b>{itemCount}</b>
            </h2>
          </div>
          <button className="modal__close" onClick={onClose} aria-label="إغلاق">
            <X />
          </button>
        </header>
        {cart.length === 0 ? (
          <div className="cart-empty">
            <ShoppingBasket />
            <h3>لم تبدأ مائدتك بعد</h3>
            <p>اختر طبقاً من الفهرس وسنضعه هنا.</p>
            <button className="btn btn--outline" onClick={onClose}>
              العودة إلى القائمة
            </button>
          </div>
        ) : (
          <>
            <div style={{ padding: "16px 26px 0" }}>
              <span className="section-kicker">ملخص الاختيارات</span>
              <small style={{ color: "var(--text-faint)", display: "block" }}>
                راجع الإضافات والكمية قبل المتابعة
              </small>
            </div>
            <div className="cart-drawer__lines">
              {cart.map((line, index) => (
                <article className="cart-line" key={line.key}>
                  <span className="cart-line__index">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <img className="cart-line__img" src={line.item.image} alt="" />
                  <div className="cart-line__info">
                    <strong>{line.item.name}</strong>
                    <small>
                      {line.options.map((o) => o.name).join("، ") || "بدون إضافات"}
                    </small>
                    <b>
                      {formatSyp(
                        (line.item.price +
                          line.options.reduce((a, o) => a + o.price, 0)) *
                        line.qty,
                      )}
                    </b>
                  </div>
                  <div className="cart-line__qty">
                    <button
                      onClick={() => onQty(line.key, -1)}
                      aria-label="تقليل الكمية"
                    >
                      <Minus />
                    </button>
                    <b>{line.qty}</b>
                    <button
                      onClick={() => onQty(line.key, 1)}
                      aria-label="زيادة الكمية"
                    >
                      <Plus />
                    </button>
                  </div>
                </article>
              ))}
            </div>
            <footer className="cart-drawer__foot">
              <div className="cart-drawer__total">
                <span className="section-kicker">المجموع قبل رسوم التسليم</span>
                <strong>{formatSyp(total)}</strong>
              </div>
              {currency === "usd" && (
                <small>≈ {formatUsd(total, rate)} USD بسعر صرف تقريبي</small>
              )}
              <button
                className="btn btn--gold cart-drawer__checkout"
                onClick={onCheckout}
              >
                انتقل إلى تفاصيل الطلب
                <ArrowRight />
              </button>
            </footer>
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
      <section className="modal checkout-modal" role="dialog" aria-modal="true">
        <header className="checkout-modal__head">
          <div>
            <span className="section-kicker">إتمام الطلب</span>
            <h2>لنضع اللمسات الأخيرة</h2>
            <p>ثلاث خطوات قصيرة، ثم يصل طلبك إلى المطبخ.</p>
          </div>
          <button className="modal__close" onClick={onClose} aria-label="إغلاق">
            <X />
          </button>
        </header>
        <div className="checkout-body">
          <div className="checkout-form">
            <div className="step">
              <div className="step__head">
                <span className="step__num">01</span>
                <div>
                  <strong>كيف تريد طلبك؟</strong>
                  <small>اختر طريقة الاستلام المناسبة</small>
                </div>
              </div>
              <div className="mode-select">
                {(["dine-in", "takeaway", "delivery"] as Mode[]).map((m) => (
                  <button
                    key={m}
                    className={mode === m ? "active" : ""}
                    onClick={() => setMode(m)}
                  >
                    {m === "dine-in" ? (
                      <Store />
                    ) : m === "takeaway" ? (
                      <ShoppingBasket />
                    ) : (
                      <Truck />
                    )}
                    {m === "dine-in"
                      ? "في المطعم"
                      : m === "takeaway"
                        ? "سفري"
                        : "توصيل"}
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
                  <div className="warn-note" style={{ marginTop: "12px" }}>
                    هذا النوع من الطلبات غير متاح حالياً.
                  </div>
                )}
            </div>

            <form
              className="checkout-form"
              style={{ padding: 0 }}
              onSubmit={(e) => {
                e.preventDefault();
                void onSubmit(e.currentTarget);
              }}
            >
              <div className="step">
                <div className="step__head">
                  <span className="step__num">02</span>
                  <div>
                    <strong>إلى من نجهزها؟</strong>
                    <small>نستخدمها لتسليم الطلب فقط</small>
                  </div>
                </div>
                <div className="form-grid">
                  <label className="form-field">
                    <span>الاسم</span>
                    <input name="customer" required placeholder="اسمك الكريم" />
                  </label>
                  <label className="form-field">
                    <span>رقم الهاتف</span>
                    <input
                      name="phone"
                      required={mode !== "dine-in"}
                      placeholder="09XXXXXXXX"
                    />
                  </label>
                  {mode === "dine-in" &&
                    (tableContext ? (
                      <div className="table-chip">
                        الطاولة: <strong>{tableContext.labelAr}</strong>
                        {tableContext.area ? ` — ${tableContext.area}` : ""}
                      </div>
                    ) : (
                      <div className="warn-note form-grid--full">
                        امسح رمز QR الصحيح الموجود على الطاولة لتفعيل الطلب داخل المطعم.
                      </div>
                    ))}
                  {mode === "delivery" && (
                    <label className="form-field form-grid--full">
                      <span>العنوان بالتفصيل</span>
                      <textarea
                        name="address"
                        required
                        placeholder="الحي، الشارع، البناء، أقرب نقطة دالة"
                      />
                    </label>
                  )}
                  {mode === "takeaway" && (
                    <label className="form-field">
                      <span>وقت الاستلام</span>
                      <select name="pickup">
                        <option>الآن (25 - 35 دقيقة)</option>
                        <option>بعد ساعة</option>
                        <option>غداً الساعة 1:00 م</option>
                      </select>
                    </label>
                  )}
                </div>
              </div>

              <div className="step">
                <div className="step__head">
                  <span className="step__num">03</span>
                  <div>
                    <strong>طريقة الدفع</strong>
                    <small>اختر وسيلة الدفع المفضلة</small>
                  </div>
                </div>
                <div className="form-grid">
                  <label className="form-field">
                    <span>طريقة الدفع</span>
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
                  <label className="form-field">
                    <span>
                      مرجع الحوالة <small>(اختياري للمحافظ الإلكترونية)</small>
                    </span>
                    <input
                      name="paymentReference"
                      placeholder="رقم العملية أو اسم المرسل"
                    />
                  </label>
                  {mode === "delivery" && settings?.zones.length ? (
                    <label className="form-field">
                      <span>منطقة التوصيل</span>
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
                <small style={{ color: "var(--text-faint)" }}>
                  تطبق أجرة التوصيل والحد الأدنى حسب المنطقة التي يحددها المطعم.
                </small>
              ) : null}
              <button
                className="btn btn--gold"
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
                <ArrowRight />
              </button>
            </form>
          </div>

          <aside className="checkout-aside">
            <span className="section-kicker">ملخص الحساب</span>
            <h3>مائدتك جاهزة</h3>
            <div className="sum-row">
              <small>الإجمالي المبدئي</small>
              <strong>{formatSyp(total)}</strong>
            </div>
            <p>تظهر رسوم التوصيل أو أي تعديل نهائي بعد مراجعة المطعم.</p>
            <div className="trust-note">
              <ShieldCheck />
              <span>تأكيد آمن قبل الإرسال</span>
            </div>
          </aside>
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
    <div className="section orders">
      <header className="orders__head">
        <div>
          <span className="section-kicker">دفتر المائدة / متابعة مباشرة</span>
          <h1 className="section-title">حكاية طلباتك</h1>
          <p className="section-sub">
            كل طلب يحتفظ بوقته، تفاصيله، وحالته حتى يصل إليك.
          </p>
        </div>
        <div className="orders__count">
          <strong>{orders.length}</strong>
          <small>طلبات محفوظة</small>
        </div>
        <button className="btn btn--gold" onClick={onMenu}>
          ابدأ طلباً جديداً
          <ArrowRight />
        </button>
      </header>

      {orders.length === 0 ? (
        <div className="empty-state">
          <span className="section-script">الفصل الأول</span>
          <h3>لم تُكتب أول حكاية بعد</h3>
          <p>ابدأ بتصفح القائمة، واختر ما ترغب أن يصل إلى مائدتك.</p>
          <button className="btn btn--outline" onClick={onMenu}>
            افتح القائمة
          </button>
        </div>
      ) : (
        <div className="orders__layout">
          <section className="orders__list">
            <div style={{ marginBottom: "16px" }}>
              <span className="section-kicker">أرشيف الطلبات</span>
              <small style={{ color: "var(--text-faint)", display: "block" }}>
                {activeOrders.length} قيد المتابعة الآن
              </small>
            </div>
            {orders.map((order, index) => (
              <button
                className="order-row"
                key={order.id}
                onClick={() => onTrack(order)}
              >
                <span className="order-row__num">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="order-row__mid">
                  <strong>{order.id}</strong>
                  <span>
                    {modeLabels[order.mode]} ·{" "}
                    {order.lines.reduce((a, l) => a + l.qty, 0)} أصناف
                  </span>
                  <small>
                    {new Date(order.createdAt).toLocaleDateString("ar-SY", {
                      day: "numeric",
                      month: "long",
                    })}
                    ،{" "}
                    {new Date(order.createdAt).toLocaleTimeString("ar-SY", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </small>
                </span>
                <span className="order-row__end">
                  <strong>{formatSyp(order.total)}</strong>
                  <small>{statusLabels[order.status]}</small>
                  <span className="order-row__go">عرض التفاصيل</span>
                </span>
              </button>
            ))}
          </section>

          <aside className="orders__side">
            <span className="section-kicker">مفتوح الآن</span>
            <h3>
              {activeOrders.length ? "هناك طلب يتحرك" : "المطبخ بانتظارك"}
            </h3>
            <p>
              {activeOrders.length
                ? "افتح أي طلب قيد التنفيذ لمشاهدة آخر تحديث من المطعم."
                : "عد إلى القائمة وابدأ تركيبة جديدة من أطباق اليوم."}
            </p>
            <button
              className="btn btn--outline"
              onClick={onMenu}
            >
              {activeOrders.length ? "استكشف القائمة أيضاً" : "اكتب طلبك التالي"}
            </button>
          </aside>
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
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className="modal modal--narrow auth-card"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="modal__close" onClick={onClose} aria-label="إغلاق">
          <X />
        </button>
        <span className="section-kicker" style={{ justifyContent: "center" }}>
          دخول الموظفين
        </span>
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
          <label className="form-field">
            <span>البريد الإلكتروني</span>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={ownerEmail}
            />
          </label>
          <label className="form-field">
            <span>كلمة المرور</span>
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
          {message && <div className="auth-msg">{message}</div>}
          <button className="btn btn--gold" type="submit" disabled={loading}>
            {loading ? "جارٍ تسجيل الدخول…" : "تسجيل الدخول"}
          </button>
          {email.trim().toLowerCase() === ownerEmail && (
            <button
              className="btn btn--outline"
              type="button"
              disabled={loading || password.length < 6}
              onClick={() => void signUpInitialOwner()}
            >
              إنشاء حساب المالك لأول مرة
            </button>
          )}
          <button
            className="link-btn"
            type="button"
            disabled={loading}
            onClick={() => void resetPassword()}
          >
            نسيت كلمة المرور؟
          </button>
        </form>
        <small>
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
      <section
        className="modal tracking-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`تتبع الطلب ${displayOrder.id}`}
      >
        <header className="tracking__head">
          <div>
            <span className="kicker">سجل الطلب / {modeLabels[displayOrder.mode]}</span>
            <h2>{displayOrder.id}</h2>
            <p>
              {formatSyp(displayOrder.total)} ·{" "}
              {displayOrder.table || displayOrder.address || "طلب خارجي"}
            </p>
          </div>
          <button className="modal__close" onClick={onClose} aria-label="إغلاق">
            <X />
          </button>
        </header>

        <div className="tracking__status-banner">
          <small>الحالة الحالية</small>
          <strong>{statusLabels[displayOrder.status]}</strong>
          <p>
            {displayOrder.status === "received"
              ? "تم إرسال طلبك إلى المطعم، سيتم تأكيده قريباً."
              : displayOrder.status === "completed"
                ? "صحة وعافية! نتمنى أن تكون التجربة نالت إعجابك."
                : "فريقنا يعمل على تجهيز طلبك الآن."}
          </p>
        </div>

        <div className="tracking__steps">
          {steps.map((step, i) => (
            <div
              key={step}
              className={`tracking__step${i < current
                ? " tracking__step--done"
                : i === current
                  ? " tracking__step--current"
                  : ""
                }`}
            >
              <i>{i < current ? <Check /> : i + 1}</i>
              <strong>{statusLabels[step]}</strong>
              <small>
                {i < current ? "اكتملت" : i === current ? "نحن هنا الآن" : "في انتظارها"}
              </small>
            </div>
          ))}
        </div>

        <section className="tracking__lines">
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border-soft)" }}>
            <span className="section-kicker">محتويات الطلب</span>
            <small style={{ color: "var(--text-faint)", display: "block" }}>
              {displayOrder.lines.length} أطباق
            </small>
          </div>
          {displayOrder.lines.map((line) => (
            <div className="tracking__line" key={line.key}>
              <span>{line.qty} ×</span>
              <div>
                <strong>{line.item.name}</strong>
                <small>
                  {line.options.map((option) => option.name).join("، ") || "بدون إضافات"}
                </small>
              </div>
              <b>
                {formatSyp(
                  (line.item.price +
                    line.options.reduce((a, o) => a + o.price, 0)) *
                  line.qty,
                )}
              </b>
            </div>
          ))}
        </section>

        <div className="tracking__foot">
          {trackingMessage && <span className="tracking__msg">{trackingMessage}</span>}
          <button
            className="btn btn--outline"
            onClick={() => onWhatsApp(displayOrder)}
          >
            تواصل مع المطعم عبر واتساب
          </button>
        </div>
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
    <div className="admin section">
      <header className="admin__head">
        <div>
          <span className="section-kicker">
            دفتر التشغيل /{" "}
            {new Date().toLocaleDateString("ar-SY", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </span>
          <h1>{restaurant.name}</h1>
          <p className="section-sub">
            مساحة العمل اليومية: الطلبات، المطبخ، والفريق في إيقاع واحد.
          </p>
        </div>
        <div className="admin__meta">
          <div className="admin__user">
            <strong>
              {memberships.find(
                (entry) => entry.restaurantSlug === restaurant.id,
              )?.displayName || staffEmail}
            </strong>
            <small>
              {memberships.find(
                (entry) => entry.restaurantSlug === restaurant.id,
              )?.role || "staff"}{" "}
              · متصل
            </small>
          </div>
          <div className="admin__switch">
            <select
              value={restaurant.id}
              onChange={(e) => onSwitch(e.target.value)}
              aria-label="تبديل المطعم"
            >
              {memberships.map((entry) => (
                <option key={entry.restaurantId} value={entry.restaurantSlug}>
                  {entry.restaurantName}
                </option>
              ))}
            </select>
          </div>
          <button className="btn btn--outline" onClick={() => void onSignOut()}>
            خروج آمن
          </button>
        </div>
      </header>

      <div className="admin__stats">
        <div className="admin__stat">
          <span>المشهد الآن</span>
          <strong>{visible.length} طلباً في العرض</strong>
        </div>
        <div className="admin__stat">
          <span>قيد التنفيذ</span>
          <strong>
            {
              orders.filter(
                (o) => !["completed", "cancelled"].includes(o.status),
              ).length
            }
          </strong>
        </div>
        <div className="admin__stat">
          <span>المطبخ</span>
          <strong>
            {orders.filter((o) => ["preparing", "ready"].includes(o.status))
              .length}{" "}
            وصفات
          </strong>
        </div>
        <div className="admin__stat">
          <span>آخر مزامنة</span>
          <strong>مباشر الآن</strong>
        </div>
      </div>

      <nav className="admin__nav" aria-label="فهرس مساحة العمل">
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
            {orders.filter(
              (o) => !["completed", "cancelled"].includes(o.status),
            ).length}
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
          إعدادات المطعم
        </button>
      </nav>

      {tab === "overview" && (
        <AdminOverview
          orders={orders}
          settings={settings}
          onOpenOrders={() => setTab("orders")}
        />
      )}
      {tab === "orders" && (
        <>
          <div className="panel">
            <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", alignItems: "flex-end" }}>
              <label className="form-field" style={{ flex: "1 1 260px" }}>
                <span>البحث في الطلبات</span>
                <input
                  value={orderQuery}
                  onChange={(event) => setOrderQuery(event.target.value)}
                  placeholder="رقم الطلب، اسم العميل، أو الهاتف"
                />
              </label>
              <div className="pills" style={{ marginTop: 0 }}>
                {(["all", "dine-in", "takeaway", "delivery"] as const).map(
                  (filter) => (
                    <button
                      key={filter}
                      className={`pill${adminFilter === filter ? " pill--active" : ""}`}
                      onClick={() => setAdminFilter(filter)}
                    >
                      {filter === "all"
                        ? "الكل"
                        : filter === "dine-in"
                          ? "في المطعم"
                          : filter === "takeaway"
                            ? "سفري"
                            : "توصيل"}
                    </button>
                  ),
                )}
              </div>
              <select
                className="form-field"
                style={{ padding: "12px 15px", background: "rgba(255,255,255,0.035)", border: "1px solid var(--border-soft)", borderRadius: "12px", color: "var(--text)" }}
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
                className="btn btn--outline"
                style={{ padding: "10px 18px", fontSize: "0.82rem" }}
                onClick={() => setSoundEnabled((value) => !value)}
              >
                {soundEnabled ? "التنبيهات مفعلة" : "التنبيهات متوقفة"}
              </button>
              <span style={{ color: "var(--text-faint)", fontSize: "0.78rem" }}>
                متصل الآن · آخر تحديث الآن
              </span>
            </div>
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
              <section className="kanban-col" key={status}>
                <div className="kanban-col__head">
                  <h3>
                    <i />
                    {status === "received" ? "طلبات جديدة" : statusLabels[status]}
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
                  <div style={{ color: "var(--text-faint)", fontSize: "0.8rem", padding: "10px" }}>
                    لا توجد طلبات
                  </div>
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
    <div>
      <div className="panel__head">
        <div>
          <span className="section-kicker">التحكم والصلاحيات</span>
          <h2>الفريق وحالة التشغيل</h2>
          <p className="section-sub">
            تحكم باستقبال الطلبات والتنبيهات ووصول الموظفين.
          </p>
        </div>
        <span
          style={{
            alignSelf: "flex-start",
            padding: "8px 16px",
            borderRadius: "var(--radius-pill)",
            border: "1px solid var(--border)",
            color: state.acceptingOrders ? "var(--gold-light)" : "var(--danger)",
            fontSize: "0.82rem",
            fontWeight: 700,
          }}
        >
          {state.acceptingOrders ? "يستقبل الطلبات" : "الطلبات متوقفة"}
        </span>
      </div>
      <div className="admin-row">
        <section className="panel">
          <div className="panel__head">
            <div>
              <span className="step__num" style={{ display: "inline-grid", marginBottom: "10px" }}>
                01
              </span>
              <h3>لوحة تشغيل المطعم</h3>
            </div>
          </div>
          <div style={{ display: "grid", gap: "12px" }}>
            <label className="checkbox-pill">
              <span>
                استقبال الطلبات
                <small>إيقافه يبقي القائمة متاحة للتصفح</small>
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
            <label className="checkbox-pill">
              <span>
                إشعارات المتصفح
                <small>إظهار إشعار عند وصول طلب</small>
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
            <label className="checkbox-pill">
              <span>
                التنبيه الصوتي
                <small>صوت عند وصول طلب جديد</small>
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
        <section className="panel">
          <div className="panel__head">
            <div>
              <span className="step__num" style={{ display: "inline-grid", marginBottom: "10px" }}>
                02
              </span>
              <h3>سجل أعضاء الفريق</h3>
            </div>
            <button
              className="btn btn--outline"
              style={{ padding: "9px 16px", fontSize: "0.82rem" }}
              disabled={staffBusy}
              onClick={() => void addStaff()}
            >
              {staffBusy ? "جارٍ الحفظ..." : "+ إضافة موظف"}
            </button>
          </div>
          {operationError && (
            <div className="warn-note" style={{ marginBottom: "12px" }}>
              {operationError}
            </div>
          )}
          <div className="admin-list">
            {state.staff.map((member) => (
              <div className="admin-list-item" key={member.id}>
                <div style={{ flex: 1 }}>
                  <strong>{member.name}</strong>
                  <small>{roleLabels[member.role]}</small>
                </div>
                <select
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid var(--border-soft)",
                    borderRadius: "10px",
                    color: "var(--text)",
                    padding: "8px 10px",
                    outline: "none",
                  }}
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
                  className="btn btn--ghost"
                  style={{ fontSize: "0.76rem", padding: "6px 10px" }}
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
                  className="btn btn--ghost"
                  style={{
                    fontSize: "0.76rem",
                    padding: "6px 10px",
                    color: "var(--danger)",
                  }}
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
      <section className="panel">
        <div className="panel__head">
          <div>
            <h3>سجل النشاط</h3>
            <small style={{ color: "var(--text-faint)" }}>
              سجل دائم للعمليات الإدارية
            </small>
          </div>
        </div>
        <div className="admin-list">
          {state.audit.map((entry) => (
            <div className="admin-list-item" key={entry.id}>
              <span
                aria-hidden="true"
                style={{
                  width: "9px",
                  height: "9px",
                  borderRadius: "50%",
                  background: "var(--gold)",
                  boxShadow: "0 0 10px var(--gold)",
                  flex: "0 0 auto",
                }}
              />
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
            <div style={{ color: "var(--text-faint)", fontSize: "0.86rem" }}>
              لا توجد أنشطة مسجلة بعد
            </div>
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
    <div>
      <div className="panel__head">
        <div>
          <span className="section-kicker">التحليلات والتصدير</span>
          <h2>تقارير المبيعات والطلبات</h2>
          <p className="section-sub">
            نتائج فعلية محسوبة من الطلبات المحفوظة في هذا المطعم.
          </p>
        </div>
        <button className="btn btn--outline" onClick={exportCsv}>
          تنزيل CSV
        </button>
      </div>
      {reportError && <div className="warn-note">{reportError}</div>}
      <div className="panel" style={{ display: "flex", gap: "14px", flexWrap: "wrap", alignItems: "flex-end" }}>
        <label className="form-field">
          <span>من</span>
          <input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </label>
        <label className="form-field">
          <span>إلى</span>
          <input
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </label>
        <button
          className="btn btn--ghost"
          style={{ padding: "10px 18px", fontSize: "0.82rem" }}
          onClick={() => {
            setFrom("");
            setTo("");
          }}
        >
          كل الفترة
        </button>
      </div>
      <div className="report-grid">
        <article className="report-card">
          <small>صافي المبيعات</small>
          <strong>{formatSyp(reportRevenue)}</strong>
          <em>دون الطلبات الملغاة</em>
        </article>
        <article className="report-card">
          <small>عدد الطلبات</small>
          <strong>{reportOrderCount}</strong>
          <em>{reportPaidCount} طلب محتسب</em>
        </article>
        <article className="report-card">
          <small>متوسط الطلب</small>
          <strong>
            {formatSyp(
              reportPaidCount ? reportRevenue / reportPaidCount : 0,
            )}
          </strong>
          <em>لكل طلب محتسب</em>
        </article>
        <article className="report-card">
          <small>الطلبات الملغاة</small>
          <strong>{reportCancelledCount}</strong>
          <em>خلال الفترة المحددة</em>
        </article>
      </div>
      <div className="admin-row">
        <section className="panel">
          <div className="panel__head">
            <div>
              <span className="section-kicker">حسب القناة</span>
              <h2>أنواع الطلبات</h2>
            </div>
          </div>
          <div className="admin-list">
            {reportByMode.map((entry) => (
              <div className="admin-list-item" key={entry.mode}>
                <span style={{ flex: 1 }}>
                  {modeLabels[entry.mode]}{" "}
                  <small style={{ color: "var(--text-faint)" }}>
                    {entry.count} طلب
                  </small>
                </span>
                <strong style={{ color: "var(--gold-light)" }}>
                  {formatSyp(entry.revenue)}
                </strong>
              </div>
            ))}
          </div>
        </section>
        <section className="panel">
          <div className="panel__head">
            <div>
              <span className="section-kicker">الأداء</span>
              <h2>الأصناف الأكثر مبيعاً</h2>
            </div>
          </div>
          <div className="admin-list">
            {topItems.map((item, index) => (
              <div className="admin-list-item" key={item.name}>
                <span
                  style={{
                    width: "26px",
                    height: "26px",
                    borderRadius: "50%",
                    display: "grid",
                    placeItems: "center",
                    background: "var(--gold-dim)",
                    border: "1px solid var(--border)",
                    color: "var(--gold)",
                    fontWeight: 700,
                    fontSize: "0.78rem",
                    flex: "0 0 auto",
                  }}
                >
                  {index + 1}
                </span>
                <span style={{ flex: 1 }}>
                  {item.name}{" "}
                  <small style={{ color: "var(--text-faint)" }}>
                    {item.qty} وحدة
                  </small>
                </span>
                <strong style={{ color: "var(--gold-light)" }}>
                  {formatSyp(item.revenue)}
                </strong>
              </div>
            ))}
            {!topItems.length && (
              <div style={{ color: "var(--text-faint)", fontSize: "0.86rem" }}>
                لا توجد مبيعات ضمن الفترة
              </div>
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
    <div>
      <header className="panel__head">
        <div>
          <span className="section-kicker">مذكرة التشغيل / اليوم</span>
          <h1 className="section-title">صورة المطعم الآن</h1>
          <p className="section-sub">
            قراءة سريعة لما يتحرك في المطبخ، وما يحتاج قراراً منك.
          </p>
        </div>
        <button className="btn btn--gold" onClick={onOpenOrders}>
          افتح مكتب الطلبات
        </button>
      </header>
      {orders.length === 0 ? (
        <div className="empty-state">
          <h2 className="section-title">ابدأ باستلام الطلبات</h2>
          <p>ستظهر مقاييس اليوم ومخطط الحركة مع أول طلب مؤكد.</p>
          <button className="btn btn--outline" onClick={onOpenOrders}>
            فتح مكتب الطلبات
          </button>
        </div>
      ) : (
        <>
          <section className="panel" style={{ display: "grid", gridTemplateColumns: "0.8fr 1.2fr", gap: "24px" }}>
            <div>
              <span style={{ color: "var(--text-faint)", fontSize: "0.8rem", display: "block" }}>
                المبيعات المحققة اليوم
              </span>
              <strong
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "2.1rem",
                  color: "var(--gold-light)",
                  display: "block",
                  margin: "6px 0",
                }}
              >
                {formatSyp(todaysRevenue)}
              </strong>
              {settings.currencyEstimate && (
                <small style={{ color: "var(--text-faint)", display: "block" }}>
                  ≈ {formatUsd(todaysRevenue, settings.rate)} USD
                </small>
              )}
              <em style={{ color: "var(--success)", fontSize: "0.8rem", fontStyle: "normal" }}>
                {trendLabel(revenueTrend)}
              </em>
            </div>
            <div>
              <span className="section-kicker">قراءة اليوم</span>
              <h2 className="section-title" style={{ fontSize: "1.6rem" }}>
                {activeOrders
                  ? `${activeOrders} طلبات تتحرك الآن`
                  : "الإيقاع هادئ حالياً"}
              </h2>
              <p className="section-sub" style={{ fontSize: "0.9rem" }}>
                {pendingOrders
                  ? `${pendingOrders} طلبات جديدة تنتظر التأكيد. افتح مكتب الطلبات حتى لا تتأخر الوصفات.`
                  : "لا توجد طلبات جديدة معلقة، ويمكن للفريق متابعة التحضير."}
              </p>
              <button className="btn btn--outline" onClick={onOpenOrders}>
                راجع خط الإنتاج
              </button>
            </div>
          </section>
          <div className="report-grid">
            <article className="report-card">
              <small>طلبات اليوم</small>
              <strong>{todaysOrders.length}</strong>
              <em>{trendLabel(orderTrend)}</em>
            </article>
            <article className="report-card">
              <small>قيد المعالجة</small>
              <strong>{activeOrders}</strong>
              <em>{pendingOrders} جديدة</em>
            </article>
            <article className="report-card">
              <small>متوسط الطلب</small>
              <strong>{formatSyp(avgOrder)}</strong>
              <em>{todaysPaidCount} محتسبة اليوم</em>
            </article>
          </div>
          <div className="admin-row">
            <section className="panel">
              <div className="panel__head">
                <div>
                  <span className="section-kicker">إيقاع اليوم</span>
                  <h2>المبيعات حسب الساعة</h2>
                </div>
                <span style={{ color: "var(--gold)", fontSize: "0.8rem" }}>
                  الذروة {formatSyp(peakRevenue)}
                </span>
              </div>
              {peakRevenue > 0 ? (
                <div className="admin-chart">
                  {operatingHours.map((hour) => {
                    const value = hourBuckets[hour];
                    const height = value ? (value / maxHour) * 100 : 0;
                    return (
                      <div key={hour}>
                        {value ? (
                          <span
                            title={`${formatSyp(value)} — ${hour}:00`}
                            style={{ height: `${Math.max(height, 6)}%` }}
                          />
                        ) : null}
                        <small>{hour}</small>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ color: "var(--text-faint)", fontSize: "0.86rem" }}>
                  لا توجد بيانات مبيعات للساعات بعد.
                </div>
              )}
            </section>
            <section className="panel">
              <div className="panel__head">
                <div>
                  <span className="section-kicker">سجل الحركة</span>
                  <h2>حالة كل طلب</h2>
                </div>
                <span style={{ color: "var(--text-faint)", fontSize: "0.8rem" }}>
                  {activeOrders} نشط · {orders.length} إجمالي
                </span>
              </div>
              <div className="admin-list">
                {statusOrder.map((status) => {
                  const count = orders.filter((o) => o.status === status).length;
                  const revenue = orders
                    .filter((o) => o.status === status && o.status !== "cancelled")
                    .reduce((sum, o) => sum + o.total, 0);
                  return (
                    <div className="admin-list-item" key={status}>
                      <span
                        style={{
                          width: "9px",
                          height: "9px",
                          borderRadius: "50%",
                          background: statusColor[status],
                          boxShadow: `0 0 10px ${statusColor[status]}`,
                          flex: "0 0 auto",
                        }}
                      />
                      <span style={{ flex: 1 }}>{statusLabels[status]}</span>
                      <b style={{ color: "var(--gold-light)" }}>{count}</b>
                      {revenue ? (
                        <small style={{ color: "var(--text-faint)" }}>
                          {formatSyp(revenue)}
                        </small>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
          <footer
            className="panel"
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "14px", flexWrap: "wrap" }}
          >
            <span style={{ color: "var(--text-soft)" }}>
              <strong style={{ color: "var(--gold-light)" }}>{activeOrders}</strong>{" "}
              طلبات تحتاج المتابعة ·{" "}
              <strong style={{ color: "var(--gold-light)" }}>{pendingOrders}</strong>{" "}
              جديدة
            </span>
            <button className="btn btn--gold" onClick={onOpenOrders}>
              دخول مكتب الطلبات
            </button>
          </footer>
        </>
      )}
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
    <div>
      <header className="panel__head">
        <div>
          <span className="section-kicker">سجل نقاط الخدمة</span>
          <h2>الطاولات ورموز الوصول</h2>
          <p className="section-sub">
            كل رمز يفتح قائمة {restaurant.name} ضمن سياق طاولة موثوق.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
          <div className="report-card" style={{ padding: "14px 20px" }}>
            <small>إجمالي الطاولات</small>
            <strong style={{ fontSize: "1.2rem" }}>{tables.length}</strong>
          </div>
          <div className="report-card" style={{ padding: "14px 20px" }}>
            <small>النشطة الآن</small>
            <strong style={{ fontSize: "1.2rem" }}>{activeCount}</strong>
          </div>
          <button className="btn btn--gold" onClick={() => setEditing("new")}>
            إضافة طاولة
          </button>
        </div>
      </header>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: "18px",
        }}
      >
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
          <div className="modal modal--narrow" style={{ padding: "30px" }}>
            <button className="modal__close" onClick={() => setEditing(null)}>
              <X />
            </button>
            <span className="section-kicker">إدارة الطاولات</span>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", margin: "8px 0 18px" }}>
              {editing === "new" ? "إضافة طاولة" : `تعديل ${editing.name}`}
            </h2>
            <form
              className="checkout-form"
              style={{ padding: 0 }}
              onSubmit={(event) => {
                event.preventDefault();
                save(event.currentTarget);
              }}
            >
              <div className="form-grid form-grid--full">
                <label className="form-field">
                  <span>رقم / رمز الطاولة</span>
                  <input
                    name="id"
                    required
                    disabled={editing !== "new"}
                    defaultValue={editing === "new" ? "" : editing.code}
                  />
                </label>
                <label className="form-field">
                  <span>اسم العرض</span>
                  <input
                    name="name"
                    required
                    defaultValue={editing === "new" ? "" : editing.name}
                  />
                </label>
                <label className="form-field">
                  <span>المنطقة</span>
                  <input
                    name="area"
                    required
                    placeholder="الصالة الرئيسية"
                    defaultValue={editing === "new" ? "" : editing.area}
                  />
                </label>
              </div>
              <button className="btn btn--gold" type="submit">
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
    <article className="table-card">
      <header className="table-card__head">
        <span className={table.active ? "" : "is-off"}>
          {table.active ? "نشطة" : "متوقفة"}
        </span>
        <span>{table.code}</span>
      </header>
      <div className="table-card__body">
        <div className="table-card__qr">
          <div
            aria-label={`QR ${table.name}`}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        </div>
        <div className="table-card__info">
          <small>نقطة خدمة</small>
          <strong>{table.name}</strong>
          <span className="table-card__area">{table.area}</span>
          <button
            className="btn btn--outline"
            style={{ padding: "8px 14px", fontSize: "0.78rem", marginTop: "8px" }}
            onClick={onCopy}
          >
            {copied ? "تم نسخ الرابط" : "نسخ رابط الوصول"}
          </button>
        </div>
      </div>
      <footer className="table-card__foot">
        <button onClick={onDownload}>تنزيل الرمز</button>
        <button onClick={onPrint}>طباعة</button>
        <button onClick={onEdit}>تعديل</button>
        <button onClick={onToggle}>{table.active ? "إيقاف" : "تفعيل"}</button>
        <button onClick={onDelete}>حذف</button>
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
    <div>
      <div className="panel__head">
        <div>
          <span className="section-kicker">إعداد المطعم</span>
          <h2>الهوية والتشغيل والدفع والتوصيل</h2>
          <p className="section-sub">
            جميع التغييرات محفوظة محلياً وجاهزة للربط بقاعدة البيانات لاحقاً.
          </p>
        </div>
      </div>
      <form
        className="checkout-form"
        style={{ padding: 0 }}
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <section className="panel">
          <div className="step__head">
            <span className="step__num">01</span>
            <div>
              <small style={{ color: "var(--text-faint)" }}>الواجهة العامة</small>
              <h3>معلومات وهوية المطعم</h3>
            </div>
          </div>
          <div className="form-grid">
            <label className="form-field">
              <span>اسم المطعم</span>
              <input
                value={draft.name}
                onChange={(event) => field("name", event.target.value)}
              />
            </label>
            <label className="form-field">
              <span>الوصف المختصر</span>
              <input
                value={draft.subtitle}
                onChange={(event) => field("subtitle", event.target.value)}
              />
            </label>
            <label className="form-field">
              <span>رقم التواصل</span>
              <input
                value={draft.phone}
                onChange={(event) => field("phone", event.target.value)}
              />
            </label>
            <label className="form-field">
              <span>رقم واتساب</span>
              <input
                value={draft.whatsapp}
                onChange={(event) =>
                  field("whatsapp", event.target.value.replace(/\D/g, ""))
                }
              />
            </label>
            <label className="form-field">
              <span>المدينة</span>
              <input
                value={draft.city}
                onChange={(event) => field("city", event.target.value)}
              />
            </label>
            <label className="form-field">
              <span>الحي</span>
              <input
                value={draft.neighborhood}
                onChange={(event) => field("neighborhood", event.target.value)}
              />
            </label>
          </div>
        </section>
        <section className="panel">
          <div className="step__head">
            <span className="step__num">02</span>
            <div>
              <small style={{ color: "var(--text-faint)" }}>الحسابات</small>
              <h3>العملة والرسوم</h3>
            </div>
          </div>
          <div className="form-grid">
            <label className="form-field">
              <span>سعر الدولار (ألف ل.س)</span>
              <input
                type="number"
                min="1"
                value={draft.rate}
                onChange={(event) => field("rate", Number(event.target.value))}
              />
            </label>
            <label className="form-field">
              <span>الضريبة %</span>
              <input
                type="number"
                min="0"
                value={draft.taxPercent}
                onChange={(event) =>
                  field("taxPercent", Number(event.target.value))
                }
              />
            </label>
            <label className="form-field">
              <span>رسم الخدمة %</span>
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
          <label className="checkbox-pill" style={{ marginTop: "14px" }}>
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
        </section>
        <section className="panel">
          <div className="step__head">
            <span className="step__num">03</span>
            <div>
              <small style={{ color: "var(--text-faint)" }}>التحصيل</small>
              <h3>المحافظ وطرق الدفع</h3>
            </div>
          </div>
          <div className="form-grid">
            <label className="form-field">
              <span>Syriatel Cash</span>
              <input
                value={draft.syriatelCash}
                onChange={(event) => field("syriatelCash", event.target.value)}
              />
            </label>
            <label className="form-field">
              <span>Sham Cash / BEMO</span>
              <input
                value={draft.shamCash}
                onChange={(event) => field("shamCash", event.target.value)}
              />
            </label>
            <label className="form-field">
              <span>MTN Cash</span>
              <input
                value={draft.mtnCash}
                onChange={(event) => field("mtnCash", event.target.value)}
              />
            </label>
          </div>
        </section>
        <section className="panel">
          <div className="step__head">
            <span className="step__num">04</span>
            <div>
              <small style={{ color: "var(--text-faint)" }}>قنوات الخدمة</small>
              <h3>طرق الطلب المتاحة</h3>
            </div>
          </div>
          <div style={{ display: "grid", gap: "12px" }}>
            <label className="checkbox-pill">
              <span>
                الطلب داخل المطعم
                <small>عبر رمز QR الخاص بالطاولة</small>
              </span>
              <input
                type="checkbox"
                checked={draft.dineIn}
                onChange={(event) => field("dineIn", event.target.checked)}
              />
            </label>
            <label className="checkbox-pill">
              <span>
                الطلبات الخارجية
                <small>استلام من المطعم</small>
              </span>
              <input
                type="checkbox"
                checked={draft.takeaway}
                onChange={(event) => field("takeaway", event.target.checked)}
              />
            </label>
            <label className="checkbox-pill">
              <span>
                خدمة التوصيل
                <small>حسب المناطق والحد الأدنى</small>
              </span>
              <input
                type="checkbox"
                checked={draft.delivery}
                onChange={(event) => field("delivery", event.target.checked)}
              />
            </label>
          </div>
        </section>
        <section className="panel">
          <div className="step__head">
            <span className="step__num">05</span>
            <div>
              <small style={{ color: "var(--text-faint)" }}>الجدول الأسبوعي</small>
              <h3>ساعات العمل</h3>
            </div>
          </div>
          <div className="admin-list">
            {draft.hours.map((hour, index) => (
              <div className="admin-list-item" key={hour.day} style={{ flexWrap: "wrap" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", flex: "0 0 120px" }}>
                  <input
                    type="checkbox"
                    style={{ accentColor: "var(--gold)", width: "16px", height: "16px" }}
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
                  <strong style={{ fontSize: "0.88rem" }}>{hour.day}</strong>
                </label>
                <input
                  type="time"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid var(--border-soft)",
                    borderRadius: "10px",
                    color: "var(--text)",
                    padding: "7px 10px",
                    outline: "none",
                  }}
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
                <span style={{ color: "var(--text-faint)", fontSize: "0.8rem" }}>حتى</span>
                <input
                  type="time"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid var(--border-soft)",
                    borderRadius: "10px",
                    color: "var(--text)",
                    padding: "7px 10px",
                    outline: "none",
                  }}
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
        <section className="panel">
          <div className="panel__head">
            <h3>مناطق التوصيل</h3>
            <button className="btn btn--outline" type="button" onClick={addZone}>
              + إضافة منطقة
            </button>
          </div>
          <div className="admin-list">
            {draft.zones.map((zone, index) => (
              <div className="admin-list-item" key={zone.id} style={{ flexWrap: "wrap" }}>
                <input
                  aria-label="اسم المنطقة"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid var(--border-soft)",
                    borderRadius: "10px",
                    color: "var(--text)",
                    padding: "9px 12px",
                    outline: "none",
                    flex: "1 1 140px",
                  }}
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
                <label className="form-field" style={{ flex: "1 1 120px" }}>
                  <span>رسوم التوصيل</span>
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
                <label className="form-field" style={{ flex: "1 1 120px" }}>
                  <span>الحد الأدنى</span>
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
                <label style={{ display: "flex", alignItems: "center", gap: "7px", color: "var(--text-soft)", fontSize: "0.84rem" }}>
                  <input
                    type="checkbox"
                    style={{ accentColor: "var(--gold)", width: "16px", height: "16px" }}
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
                  className="btn btn--ghost"
                  style={{ color: "var(--danger)", fontSize: "0.78rem", padding: "6px 10px" }}
                  type="button"
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
        <button className="btn btn--gold" type="submit" style={{ width: "100%" }}>
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
    <article className="order-card">
      <header className="order-card__head">
        <div>
          <span>{order.id}</span>
          <span style={{ marginInlineStart: "8px", color: "var(--text-faint)", fontSize: "0.72rem" }}>
            {modeLabels[order.mode]}
          </span>
        </div>
        <span>{statusLabels[order.status]}</span>
      </header>
      <button className="order-card__who" onClick={onOpen}>
        <span className="order-card__avatar">{order.customer.slice(0, 1)}</span>
        <span>
          <strong>{order.customer}</strong>
          <small>{order.table || order.address || "طلب مباشر"}</small>
        </span>
        <b>فتح الملف</b>
      </button>
      <div className="order-card__lines">
        {order.lines.map((l) => (
          <div className="order-card__line" key={l.key}>
            <span>
              <b>{l.qty}×</b> {l.item.name}
              <small>
                {l.options.map((o) => o.name).join("، ") || "التركيبة الأساسية"}
              </small>
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
      <div className="order-card__pay">
        <span>
          الدفع:{" "}
          {order.paymentStatus === "verified"
            ? "متحقق"
            : order.paymentStatus === "rejected"
              ? "مرفوض"
              : "بانتظار التحقق"}
        </span>
        <strong>{formatSyp(order.total)}</strong>
      </div>
      <footer className="order-card__foot">
        <button onClick={() => onWhatsApp(order)}>مراسلة العميل</button>
        {next[order.status] && (
          <button onClick={() => onStatus(order.id, next[order.status])}>
            {next[order.status] === "confirmed"
              ? "تأكيد واستلام"
              : next[order.status] === "preparing"
                ? "إرسال للمطبخ"
                : next[order.status] === "ready"
                  ? "تحديد كجاهز"
                  : "إتمام الطلب"}
          </button>
        )}
      </footer>
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
      <section
        className="modal order-details"
        role="dialog"
        aria-modal="true"
        aria-label={`ملف الطلب ${order.id}`}
      >
        <header className="checkout-modal__head">
          <div>
            <span className="section-kicker">
              ملف الخدمة / {modeLabels[order.mode]}
            </span>
            <span
              style={{
                display: "inline-block",
                marginTop: "8px",
                padding: "5px 14px",
                borderRadius: "var(--radius-pill)",
                border: "1px solid var(--gold)",
                color: "var(--gold-light)",
                fontSize: "0.78rem",
                fontWeight: 700,
              }}
            >
              {statusLabels[order.status]}
            </span>
          </div>
          <div>
            <span
              style={{
                fontFamily: "var(--font-display)",
                color: "var(--gold)",
                fontSize: "0.85rem",
              }}
            >
              #{order.id}
            </span>
            <h2>سجل الطلب والتسليم</h2>
            <p>{new Date(order.createdAt).toLocaleString("ar-SY")}</p>
          </div>
          <button className="modal__close" onClick={onClose} aria-label="إغلاق الملف">
            <X />
          </button>
        </header>

        <div className="checkout-body">
          <main className="checkout-form" style={{ gap: "18px" }}>
            <section className="step">
              <div className="step__head">
                <span className="step__num">01</span>
                <div>
                  <span className="section-kicker">الضيف</span>
                  <h3>بيانات التسليم</h3>
                </div>
              </div>
              <div className="admin-row" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                <div className="report-card" style={{ padding: "16px" }}>
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
                      display: "grid",
                      placeItems: "center",
                      background: "linear-gradient(135deg, var(--gold-2), var(--gold-deep))",
                      color: "#16130a",
                      fontWeight: 800,
                      fontFamily: "var(--font-display)",
                      marginBottom: "8px",
                    }}
                  >
                    {order.customer.slice(0, 1)}
                  </div>
                  <small>اسم العميل</small>
                  <strong style={{ display: "block" }}>{order.customer}</strong>
                  <em style={{ color: "var(--text-faint)", fontSize: "0.76rem", fontStyle: "normal" }}>
                    {order.phone || "لا يوجد هاتف مسجل"}
                  </em>
                </div>
                <div className="report-card" style={{ padding: "16px" }}>
                  <small>نقطة التسليم</small>
                  <strong style={{ display: "block" }}>{order.table || order.address || "طلب مباشر"}</strong>
                  <em style={{ color: "var(--text-faint)", fontSize: "0.76rem", fontStyle: "normal" }}>
                    {order.mode === "delivery" ? "عنوان توصيل" : modeLabels[order.mode]}
                  </em>
                </div>
                <div className="report-card" style={{ padding: "16px" }}>
                  <small>قناة الطلب</small>
                  <strong style={{ display: "block" }}>{modeLabels[order.mode]}</strong>
                  <em style={{ color: "var(--text-faint)", fontSize: "0.76rem", fontStyle: "normal" }}>
                    {order.paymentReference || "لا يوجد مرجع دفع"}
                  </em>
                </div>
              </div>
            </section>

            <section className="step">
              <div className="step__head">
                <span className="step__num">02</span>
                <div>
                  <span className="section-kicker">المحتوى</span>
                  <h3>بيان الأطباق</h3>
                </div>
                <span style={{ marginInlineStart: "auto", color: "var(--gold)", fontSize: "0.8rem" }}>
                  {order.lines.length} أصناف
                </span>
              </div>
              <div className="admin-list">
                {order.lines.map((line, index) => (
                  <div className="admin-list-item" key={line.key}>
                    <span
                      style={{
                        fontFamily: "var(--font-display)",
                        color: "var(--gold)",
                        fontSize: "0.8rem",
                        flex: "0 0 auto",
                      }}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div style={{ flex: 1 }}>
                      <strong>{line.qty}× {line.item.name}</strong>
                      <small style={{ color: "var(--text-faint)", display: "block" }}>
                        {line.options.map((option) => option.name).join("، ") || "التركيبة الأساسية"}
                        {line.note ? ` · ${line.note}` : ""}
                      </small>
                    </div>
                    <strong style={{ color: "var(--gold-light)", fontFamily: "var(--font-display)" }}>
                      {formatSyp((line.item.price + line.options.reduce((sum, option) => sum + option.price, 0)) * line.qty)}
                    </strong>
                  </div>
                ))}
              </div>
              <div className="checkout-total" style={{ marginTop: "14px" }}>
                <span>القيمة النهائية</span>
                <strong>{formatSyp(order.total)}</strong>
              </div>
            </section>

            <section className="step">
              <div className="step__head">
                <span className="step__num">03</span>
                <div>
                  <span className="section-kicker">المراجعة</span>
                  <h3>حالة التحصيل</h3>
                </div>
                <span style={{ marginInlineStart: "auto", color: "var(--gold)", fontSize: "0.8rem" }}>
                  {order.payment}
                </span>
              </div>
              <div className="mode-select">
                <button onClick={() => onChange(order.id, { paymentStatus: "pending" })}>
                  بانتظار التحقق
                </button>
                <button onClick={() => onChange(order.id, { paymentStatus: "verified" })}>
                  تم التحقق
                </button>
                <button onClick={() => onChange(order.id, { paymentStatus: "rejected" })}>
                  مرفوض
                </button>
                <button onClick={() => onChange(order.id, { paymentStatus: "refunded" })}>
                  مسترد
                </button>
              </div>
            </section>
          </main>

          <aside className="checkout-aside">
            <section>
              <span className="section-kicker">الخطوة التالية</span>
              <h3>حرّك الطلب في مساره</h3>
              <div className="admin-list" style={{ marginTop: "12px" }}>
                {(["received", "confirmed", "preparing", "ready", "out-for-delivery", "completed"] as Order["status"][])
                  .filter((status) => status !== "out-for-delivery" || order.mode === "delivery")
                  .map((status) => (
                    <button
                      className="admin-list-item"
                      key={status}
                      style={{
                        textAlign: "start",
                        border:
                          order.status === status
                            ? "1px solid var(--gold)"
                            : "1px solid var(--border-soft)",
                        background:
                          order.status === status
                            ? "var(--gold-dim)"
                            : "rgba(255,255,255,0.02)",
                        color: "inherit",
                        cursor: "pointer",
                      }}
                      onClick={() => onStatus(order.id, status)}
                    >
                      <span style={{ flex: 1 }}>{statusLabels[status]}</span>
                      <small style={{ color: "var(--text-faint)" }}>
                        {order.status === status ? "الحالة الحالية" : "تعيين الحالة"}
                      </small>
                    </button>
                  ))}
              </div>
            </section>

            <label className="note-field">
              <span>
                غرفة الفريق <strong style={{ display: "block" }}>ملاحظة داخلية</strong>
              </span>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="ملاحظة للمطبخ أو فريق الخدمة..."
              />
              <button
                className="btn btn--outline"
                style={{ padding: "9px 16px", fontSize: "0.82rem" }}
                onClick={() => onChange(order.id, { internalNote: note })}
              >
                حفظ الملاحظة
              </button>
            </label>

            <footer className="cart-drawer__foot" style={{ borderTop: "none", padding: 0 }}>
              <button className="btn btn--gold" onClick={() => onWhatsApp(order)}>
                مراسلة العميل
              </button>
              {order.status !== "cancelled" && order.status !== "completed" && (
                <button
                  className="btn btn--outline"
                  style={{ marginTop: "10px", color: "var(--danger)", borderColor: "rgba(194,86,74,0.4)" }}
                  onClick={cancel}
                >
                  إلغاء الطلب
                </button>
              )}
              {order.cancellationReason && (
                <p style={{ color: "var(--text-faint)", fontSize: "0.8rem", margin: "10px 0 0" }}>
                  سبب الإلغاء: {order.cancellationReason}
                </p>
              )}
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
    <div>
      <div className="panel__head">
        <div>
          <span className="section-kicker">محتوى المطعم</span>
          <h2>عناصر القائمة</h2>
          <p className="section-sub">
            أضف الأصناف وعدّل الأسعار والتصنيفات والإضافات والتوفر.
          </p>
        </div>
        <button className="btn btn--gold" onClick={() => setEditing("new")}>
          + إضافة صنف جديد
        </button>
      </div>

      <div className="panel" style={{ display: "flex", gap: "14px", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
        <div className="pills" style={{ marginTop: 0 }}>
          {["الكل", ...activeCategories.map((category) => category.name)].map(
            (entry) => (
              <button
                key={entry}
                className={`pill${categoryFilter === entry ? " pill--active" : ""}`}
                onClick={() => setCategoryFilter(entry)}
              >
                {entry}
              </button>
            ),
          )}
        </div>
        <span style={{ color: "var(--text-faint)", fontSize: "0.82rem" }}>
          {filtered.length} أصناف
        </span>
      </div>

      <CategoryManager
        categories={categories}
        onAdd={addCategory}
        onUpdate={updateCategory}
        onArchive={archiveCategory}
      />

      <div className="admin-list">
        {filtered.map((item) => (
          <article
            className="admin-list-item"
            key={item.id}
            style={{ alignItems: "center" }}
          >
            <img
              src={item.image}
              alt=""
              style={{
                width: "56px",
                height: "48px",
                borderRadius: "10px",
                objectFit: "cover",
                border: "1px solid var(--border-soft)",
                flex: "0 0 auto",
              }}
            />
            <div style={{ flex: 1 }}>
              <strong>{item.name}</strong>
              <span style={{ display: "block", color: "var(--text-faint)", fontSize: "0.78rem" }}>
                {item.category} · {formatSyp(item.price)} ·{" "}
                {item.options?.length ?? 0} مجموعات خيارات
              </span>
            </div>
            <span
              style={{
                padding: "5px 12px",
                borderRadius: "var(--radius-pill)",
                fontSize: "0.72rem",
                fontWeight: 700,
                background: item.available
                  ? "rgba(93,156,111,0.12)"
                  : "rgba(194,86,74,0.12)",
                color: item.available ? "var(--success)" : "var(--danger)",
                border: `1px solid ${item.available
                  ? "rgba(93,156,111,0.3)"
                  : "rgba(194,86,74,0.3)"
                  }`,
              }}
            >
              {item.available ? "متوفر" : "نفد المخزون"}
            </span>
            <button
              className="checkbox-pill"
              style={{ padding: "8px 14px", minWidth: "52px", justifyContent: "center" }}
              onClick={() => toggle(item.id)}
              aria-label={item.available ? "إيقاف الصنف" : "تفعيل الصنف"}
            >
              <i
                style={{
                  width: "38px",
                  height: "20px",
                  borderRadius: "var(--radius-pill)",
                  background: item.available ? "var(--gold)" : "rgba(255,255,255,0.12)",
                  position: "relative",
                  display: "inline-block",
                  transition: "background 0.3s ease",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: "3px",
                    insetInlineStart: item.available ? "18px" : "3px",
                    width: "14px",
                    height: "14px",
                    borderRadius: "50%",
                    background: "#16130a",
                    transition: "inset-inline-start 0.3s ease",
                  }}
                />
              </i>
            </button>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                className="btn btn--outline"
                style={{ padding: "8px 14px", fontSize: "0.76rem" }}
                onClick={() => setEditing(item)}
              >
                تعديل
              </button>
              <button
                className="btn btn--ghost"
                style={{ padding: "8px 12px", fontSize: "0.76rem", color: "var(--danger)" }}
                onClick={() => remove(item.id)}
              >
                حذف
              </button>
            </div>
          </article>
        ))}
      </div>

      {editing && (
        <div className="modal-backdrop">
          <div className="modal" style={{ padding: "30px" }}>
            <button className="modal__close" onClick={() => setEditing(null)}>
              <X />
            </button>
            <span className="section-kicker">
              {editing === "new" ? "صنف جديد" : "تعديل الصنف"}
            </span>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "1.5rem",
                margin: "8px 0 18px",
              }}
            >
              {editing === "new" ? "إضافة صنف إلى القائمة" : editing.name}
            </h2>
            <form
              className="checkout-form"
              style={{ padding: 0 }}
              onSubmit={(event) => {
                event.preventDefault();
                save(event.currentTarget);
              }}
            >
              <div className="form-grid">
                <label className="form-field">
                  <span>الاسم بالعربية</span>
                  <input
                    name="name"
                    required
                    defaultValue={editing === "new" ? "" : editing.name}
                  />
                </label>
                <label className="form-field">
                  <span>الاسم بالإنجليزية</span>
                  <input
                    name="en"
                    required
                    defaultValue={editing === "new" ? "" : editing.en}
                  />
                </label>
                <label className="form-field form-grid--full">
                  <span>الوصف</span>
                  <textarea
                    name="desc"
                    required
                    defaultValue={editing === "new" ? "" : editing.desc}
                  />
                </label>
                <label className="form-field">
                  <span>السعر بالليرة</span>
                  <input
                    name="price"
                    type="number"
                    min="0"
                    required
                    defaultValue={editing === "new" ? 0 : editing.price}
                  />
                </label>
                <label className="form-field">
                  <span>التصنيف</span>
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
                <label className="form-field form-grid--full">
                  <span>رابط الصورة</span>
                  <input
                    name="image"
                    defaultValue={editing === "new" ? "" : editing.image}
                    placeholder="https://..."
                  />
                </label>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                  padding: "14px 16px",
                  borderRadius: "var(--radius)",
                  border: "1px solid var(--border-soft)",
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                <label className="checkbox-pill" style={{ flex: "1 1 130px", padding: "10px 14px" }}>
                  <span style={{ fontSize: "0.82rem" }}>نباتي</span>
                  <input
                    type="checkbox"
                    name="tags"
                    value="vegetarian"
                    defaultChecked={
                      editing !== "new" && editing.tags.includes("vegetarian")
                    }
                  />
                </label>
                <label className="checkbox-pill" style={{ flex: "1 1 130px", padding: "10px 14px" }}>
                  <span style={{ fontSize: "0.82rem" }}>حار</span>
                  <input
                    type="checkbox"
                    name="tags"
                    value="spicy"
                    defaultChecked={
                      editing !== "new" && editing.tags.includes("spicy")
                    }
                  />
                </label>
                <label className="checkbox-pill" style={{ flex: "1 1 150px", padding: "10px 14px" }}>
                  <span style={{ fontSize: "0.82rem" }}>اختيار الشيف</span>
                  <input
                    type="checkbox"
                    name="tags"
                    value="chef"
                    defaultChecked={
                      editing !== "new" && editing.tags.includes("chef")
                    }
                  />
                </label>
                <label className="checkbox-pill" style={{ flex: "1 1 140px", padding: "10px 14px" }}>
                  <span style={{ fontSize: "0.82rem" }}>الأكثر طلباً</span>
                  <input
                    type="checkbox"
                    name="popular"
                    defaultChecked={editing !== "new" && editing.popular}
                  />
                </label>
              </div>
              {editing !== "new" && (
                <OptionEditor
                  item={editing}
                  onUpdate={(options) => setEditing({ ...editing, options })}
                />
              )}
              <button className="btn btn--gold" type="submit">
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
    <section className="panel">
      <div className="panel__head">
        <div>
          <strong style={{ fontFamily: "var(--font-display)", fontSize: "1.15rem" }}>
            تصنيفات القائمة
          </strong>
          <small style={{ color: "var(--text-faint)", display: "block" }}>
            رتّب التصنيفات وعدّل ظهورها للزبائن.
          </small>
        </div>
        <button className="btn btn--outline" type="button" onClick={onAdd}>
          إضافة تصنيف
        </button>
      </div>
      <div className="admin-list">
        {active.map((entry, index) => (
          <div className="admin-list-item" key={entry.id} style={{ flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: "10px", flex: "1 1 240px" }}>
              <input
                aria-label="اسم التصنيف بالعربية"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid var(--border-soft)",
                  borderRadius: "10px",
                  color: "var(--text)",
                  padding: "9px 12px",
                  outline: "none",
                  flex: 1,
                }}
                value={entry.name}
                onChange={(event) =>
                  onUpdate(entry.id, { name: event.target.value })
                }
              />
              <input
                aria-label="اسم التصنيف بالإنجليزية"
                dir="ltr"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid var(--border-soft)",
                  borderRadius: "10px",
                  color: "var(--text)",
                  padding: "9px 12px",
                  outline: "none",
                  flex: 1,
                }}
                value={entry.en}
                onChange={(event) =>
                  onUpdate(entry.id, { en: event.target.value })
                }
              />
            </div>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "7px",
                color: "var(--text-soft)",
                fontSize: "0.84rem",
                padding: "8px 12px",
                border: "1px solid var(--border-soft)",
                borderRadius: "var(--radius-pill)",
                background: "rgba(255,255,255,0.02)",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                style={{ accentColor: "var(--gold)", width: "16px", height: "16px" }}
                checked={entry.visible}
                onChange={(event) =>
                  onUpdate(entry.id, { visible: event.target.checked })
                }
              />{" "}
              ظاهر
            </label>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                className="btn btn--ghost"
                style={{ padding: "8px 12px", fontSize: "0.76rem" }}
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
                className="btn btn--ghost"
                style={{ padding: "8px 12px", fontSize: "0.76rem" }}
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
                className="btn btn--ghost"
                style={{ padding: "8px 12px", fontSize: "0.76rem", color: "var(--gold)" }}
                type="button"
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
    <div>
      <div className="panel__head">
        <strong style={{ fontFamily: "var(--font-display)", fontSize: "1.05rem" }}>
          مجموعات الخيارات والإضافات
        </strong>
        <button className="btn btn--outline" type="button" onClick={addGroup}>
          + مجموعة خيارات
        </button>
      </div>
      <div style={{ display: "grid", gap: "14px" }}>
        {groups.map((group, groupIndex) => (
          <section
            key={group.id}
            style={{
              border: "1px solid var(--border-soft)",
              borderRadius: "var(--radius)",
              padding: "16px",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "10px",
                alignItems: "center",
                flexWrap: "wrap",
                marginBottom: "12px",
              }}
            >
              <input
                aria-label="اسم المجموعة"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid var(--border-soft)",
                  borderRadius: "10px",
                  color: "var(--text)",
                  padding: "9px 12px",
                  outline: "none",
                  flex: "1 1 160px",
                }}
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
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "7px",
                  color: "var(--text-soft)",
                  fontSize: "0.82rem",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  style={{ accentColor: "var(--gold)", width: "16px", height: "16px" }}
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
                className="btn btn--ghost"
                style={{ color: "var(--danger)", fontSize: "0.76rem", padding: "6px 10px" }}
                type="button"
                onClick={() =>
                  onUpdate(groups.filter((_, i) => i !== groupIndex))
                }
              >
                حذف المجموعة
              </button>
            </div>
            <div className="admin-list">
              {group.options.map((option, optionIndex) => (
                <div className="admin-list-item" key={option.id} style={{ flexWrap: "wrap" }}>
                  <input
                    aria-label="اسم الخيار"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid var(--border-soft)",
                      borderRadius: "10px",
                      color: "var(--text)",
                      padding: "8px 11px",
                      outline: "none",
                      flex: "1 1 160px",
                    }}
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
                    aria-label="سعر الخيار"
                    type="number"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid var(--border-soft)",
                      borderRadius: "10px",
                      color: "var(--text)",
                      padding: "8px 11px",
                      outline: "none",
                      flex: "0 0 110px",
                    }}
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
                    className="btn btn--ghost"
                    style={{ color: "var(--danger)", fontSize: "0.8rem", padding: "6px 10px" }}
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
                    <X />
                  </button>
                </div>
              ))}
            </div>
            <button
              className="btn btn--ghost"
              style={{ color: "var(--gold)", fontSize: "0.8rem", padding: "8px 12px", marginTop: "10px" }}
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
    </div>
  );
}

export default App;
