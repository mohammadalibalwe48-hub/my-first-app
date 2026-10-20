import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase";
import { useUI } from "./UI";
import { readSavedCart, readSavedOrders } from "../storedOrdering";
import { rebuildOrder } from "../ordering";
import { useRestaurant } from "../hooks/useRestaurant";
import type { GeoFix } from "../geolocation";
import {
  formatSyp,
  modeLabels,
  readStored,
  writeStored,
  type CartLine,
  type Item,
  type Mode,
  type OperationsState,
  type Option,
  type Order,
  type PublicMenuPayload,
  type RestaurantSettings,
  type Tag,
} from "../domain";

/** Cross-browser unique id — crypto.randomUUID needs a secure context (HTTPS/localhost). */
const newId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}${Math.random()
        .toString(36)
        .slice(2, 10)}`;

type CafeContextValue = {
  slug: string;
  restaurant: ReturnType<typeof useRestaurant>["restaurant"];
  settings: RestaurantSettings;
  categories: ReturnType<typeof useRestaurant>["customerCategories"];
  availableItems: Item[];
  ready: boolean;
  loadError: string | null;
  retryMenu: () => void;
  isOnline: boolean;
  tableContext: PublicMenuPayload["table"];

  currency: "syp" | "usd";
  setCurrency: (c: "syp" | "usd") => void;
  category: string;
  setCategory: (c: string) => void;
  tag: Tag | "all";
  setTag: (t: Tag | "all") => void;
  query: string;
  setQuery: (q: string) => void;

  cart: CartLine[];
  cartCount: number;
  total: number;
  mode: Mode;
  setMode: (m: Mode) => void;

  cartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  checkoutOpen: boolean;
  openCheckout: () => void;
  closeCheckout: () => void;
  selectedItem: Item | null;
  openItem: (item: Item) => void;
  closeItem: () => void;
  trackingOrder: Order | null;
  trackOrder: (o: Order) => void;
  closeTracking: () => void;

  addToCart: (
    item: Item,
    options?: Option[],
    note?: string,
    qty?: number,
  ) => void;
  updateQty: (key: string, delta: number) => void;
  placeOrder: (form: HTMLFormElement, fix?: GeoFix | null) => Promise<boolean>;
  openWhatsApp: (order: Order) => Promise<void>;
  customerOrders: Order[];
  reorder: (order: Order) => void;
  trackingStale: boolean;

  notice: {
    message: string;
    kind: "success" | "error" | "warning" | "info" | "loading";
  } | null;
};

const CafeContext = createContext<CafeContextValue | null>(null);

export function CafeProvider({
  slug,
  children,
}: {
  slug: string;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  const { language } = useUI();
  const [trackingStale, setTrackingStale] = useState(false);
  const data = useRestaurant(slug);

  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [currency, setCurrency] = useState<"syp" | "usd">("syp");
  const [category, setCategory] = useState("كل الأصناف");
  const [tag, setTag] = useState<Tag | "all">("all");
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<Mode>("dine-in");

  const [cart, setCart] = useState<CartLine[]>(() =>
    readSavedCart(slug),
  );
  const [orders, setOrders] = useState<Order[]>(() =>
    readSavedOrders(),
  );
  const pendingOrderKey = useRef<string | null>(
    readStored(`sufra-pending-order-${slug}`, null),
  );

  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [trackingOrder, setTrackingOrder] = useState<Order | null>(null);
  const [notice, setNotice] = useState<CafeContextValue["notice"]>(null);
  const noticeTimer = useRef<number | null>(null);
  const submittingRef = useRef(false);

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

  // Reset customer session state when switching cafe.
  useEffect(() => {
    setCart(readSavedCart(slug));
    pendingOrderKey.current = readStored(`sufra-pending-order-${slug}`, null);
    setCategory("كل الأصناف");
    setTag("all");
    setQuery("");
    setNotice(null);
    setCartOpen(false);
    setCheckoutOpen(false);
    setSelectedItem(null);
    setTrackingOrder(null);
    setMode("dine-in");
  }, [slug]);

  useEffect(() => writeStored(`sufra-cart-${slug}`, cart), [cart, slug]);
  useEffect(() => writeStored("sufra-orders", orders), [orders]);

  const {
    restaurant,
    settings,
    categories,
    customerCategories,
    ready,
    loadError,
    retryLoad,
    tableContext,
  } = data;

  const ordersRef = useRef(orders);
  ordersRef.current = orders;
  useEffect(() => {
    let active = true;
    let running = false;
    const refresh = async () => {
      if (
        running ||
        !navigator.onLine ||
        document.visibilityState !== "visible"
      )
        return;
      const pending = ordersRef.current.filter(
        (o) =>
          o.restaurantId === slug &&
          o.publicToken &&
          !["completed", "cancelled"].includes(o.status),
      );
      if (!pending.length) return;
      running = true;
      try {
        const results = await Promise.allSettled(
          pending.map(async (order) => {
            const { data, error } = await supabase.rpc("track_public_order", {
              p_token: order.publicToken,
            });
            if (error || !data) throw new Error("tracking_unavailable");
            return {
              token: order.publicToken,
              payload: data as { status: Order["status"]; total: number },
            };
          }),
        );
        if (!active) return;
        setTrackingStale(results.some((r) => r.status === "rejected"));
        setOrders((current) =>
          current.map((order) => {
            const match = results.find(
              (r) =>
                r.status === "fulfilled" && r.value.token === order.publicToken,
            );
            if (!match || match.status !== "fulfilled") return order;
            return {
              ...order,
              status: match.value.payload.status,
              total: Number(match.value.payload.total),
              updatedAt: new Date().toISOString(),
            };
          }),
        );
      } finally {
        running = false;
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 15000);
    const focused = () => void refresh();
    window.addEventListener("focus", focused);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("focus", focused);
    };
  }, [slug]);

  const clearPendingOrderKey = () => {
    pendingOrderKey.current = null;
    try {
      window.localStorage.removeItem(`sufra-pending-order-${slug}`);
    } catch {
      // Keep the in-memory basket usable when storage is unavailable.
    }
  };

  const reorder = (order: Order) => {
    const rebuilt = rebuildOrder(order, restaurant.items);
    if (!rebuilt.lines.length) {
      showNotice(
        language === "en"
          ? "These items are no longer available. Choose from the current menu."
          : "أصناف هذا الطلب لم تعد متاحة. اختر من القائمة الحالية.",
        5000,
        "warning",
      );
      return;
    }
    if (
      cart.length &&
      !window.confirm(
        language === "en"
          ? "Replace your current basket with this order?"
          : "استبدال السلة الحالية بهذا الطلب؟",
      )
    )
      return;
    clearPendingOrderKey();
    setCart(rebuilt.lines);
    setCartOpen(true);
    showNotice(
      language === "en"
        ? `Basket rebuilt at current prices.${rebuilt.skipped ? " Some unavailable items were skipped." : ""}`
        : `أُعيدت الأصناف إلى السلة بالأسعار الحالية.${rebuilt.skipped ? " تم استبعاد أصناف غير متاحة." : ""}`,
      5000,
      "info",
    );
  };

  const total = cart.reduce(
    (sum, line) =>
      sum +
      (line.item.price + line.options.reduce((a, o) => a + o.price, 0)) *
        line.qty,
    0,
  );
  const cartCount = cart.reduce((sum, line) => sum + line.qty, 0);

  const availableItems = useMemo(
    () =>
      restaurant.items.filter(
        (item) =>
          item.available &&
          (!item.availableFrom ||
            Date.parse(item.availableFrom) <= Date.now()) &&
          (!item.availableUntil ||
            Date.parse(item.availableUntil) >= Date.now()) &&
          customerCategories.some((c) => c.name === item.category) &&
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

  const showNotice = (
    msg: string,
    ms = 2400,
    kind: NonNullable<CafeContextValue["notice"]>["kind"] = "info",
  ) => {
    setNotice({ message: msg, kind });
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(null), ms);
  };

  const addToCart = (
    item: Item,
    options: Option[] = [],
    note = "",
    qty = 1,
  ) => {
    clearPendingOrderKey();
    const key = `${item.id}-${options
      .map((o) => o.id)
      .sort()
      .join("-")}-${note}`;
    setCart((current) => {
      const existing = current.find((line) => line.key === key);
      return existing
        ? current.map((line) =>
            line.key === key ? { ...line, qty: line.qty + qty } : line,
          )
        : [...current, { key, item, qty, options, note }];
    });
    setSelectedItem(null);
    showNotice(
      language === "en"
        ? `Added ${item.en || item.name} to your basket`
        : `تمت إضافة ${item.name} إلى الطلب`,
      2600,
      "success",
    );
  };

  const updateQty = (key: string, delta: number) => {
    clearPendingOrderKey();
    setCart((current) =>
      current
        .map((line) =>
          line.key === key ? { ...line, qty: line.qty + delta } : line,
        )
        .filter((line) => line.qty > 0),
    );
  };

  const placeOrder = async (
    form: HTMLFormElement,
    fix?: GeoFix | null,
  ): Promise<boolean> => {
    if (!isOnline || !ready) {
      showNotice(
        "لا يمكن إرسال الطلب حالياً. تحقق من الاتصال وحاول مجدداً.",
        4200,
        "error",
      );
      return false;
    }
    const tableToken = new URLSearchParams(window.location.search).get(
      "tableToken",
    );
    if (mode === "dine-in" && (!tableToken || !tableContext)) {
      showNotice(
        "لطلب داخل المطعم، امسح رمز QR الصحيح الموجود على الطاولة.",
        4200,
        "warning",
      );
      return false;
    }
    if (
      mode === "dine-in" &&
      settings.latitude != null &&
      settings.longitude != null &&
      !fix
    ) {
      showNotice(
        "تحقق من موقعك داخل المطعم أولاً عبر زر التحقق في صفحة الدفع.",
        3600,
        "warning",
      );
      return false;
    }
    const operationState = readStored<OperationsState | null>(
      `sufra-operations-${slug}`,
      null,
    );
    if (operationState?.acceptingOrders === false) {
      showNotice("المطعم متوقف عن استقبال الطلبات حالياً", 2600, "warning");
      return false;
    }
    if (submittingRef.current) {
      showNotice("جارٍ إرسال طلبك… لحظة واحدة", 2400, "loading");
      return false;
    }
    submittingRef.current = true;
    try {
      const dataForm = new FormData(form);
      const selectedZone = settings.zones.find(
        (zone) => zone.id === dataForm.get("zone"),
      );
      if (mode === "delivery" && selectedZone && total < selectedZone.minimum) {
        showNotice(
          `الحد الأدنى للطلب في ${selectedZone.name} هو ${formatSyp(selectedZone.minimum)}`,
          3200,
          "warning",
        );
        return false;
      }
      if (!pendingOrderKey.current) {
        pendingOrderKey.current = newId();
        writeStored(`sufra-pending-order-${slug}`, pendingOrderKey.current);
      }
      type OrderReceipt = {
        orderNumber: string;
        publicToken: string;
        total: number;
        status?: Order["status"];
      };
      const { data: submitted, error } = await supabase.rpc(
        "submit_public_order",
        {
          p_payload: {
            restaurantSlug: slug,
            idempotencyKey: pendingOrderKey.current,
            mode,
            tableToken,
            deliveryZoneId: selectedZone?.id ?? null,
            customerName: String(dataForm.get("customer") || "زبون المطعم"),
            phone: String(dataForm.get("phone") || ""),
            address: String(dataForm.get("address") || ""),
            pickupTime: String(dataForm.get("pickup") || ""),
            paymentMethod: String(dataForm.get("payment") || "الدفع نقداً"),
            paymentReference: String(dataForm.get("paymentReference") || ""),
            clientLat: mode === "dine-in" && fix ? String(fix.lat) : undefined,
            clientLng: mode === "dine-in" && fix ? String(fix.lng) : undefined,
            clientAcc:
              mode === "dine-in" && fix ? String(fix.accuracy) : undefined,
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
        const raw = error?.message ?? "";
        const messages: Array<[string, string, string]> = [
          [
            "table_token_required",
            "امسح رمز الطاولة للطلب داخل المطعم.",
            "Scan your table QR code to order at the restaurant.",
          ],
          [
            "invalid_table",
            "رمز الطاولة غير صالح.",
            "This table code is no longer valid.",
          ],
          [
            "location_too_far",
            "أنت خارج نطاق المطعم.",
            "You are outside the restaurant area.",
          ],
          [
            "location_required",
            "اسمح بتحديد الموقع ثم أعد المحاولة.",
            "Allow location access and retry.",
          ],
          [
            "minimum_order_not_met",
            "لم يتم بلوغ الحد الأدنى للتوصيل.",
            "The delivery minimum has not been reached.",
          ],
          [
            "order_mode_disabled",
            "طريقة الاستلام غير متاحة حالياً.",
            "This order type is currently unavailable.",
          ],
          [
            "invalid_delivery_zone",
            "منطقة التوصيل لم تعد متاحة.",
            "This delivery zone is no longer available.",
          ],
          ["phone_required", "أدخل رقم الهاتف.", "Enter your phone number."],
          [
            "address_required",
            "أدخل عنوان التوصيل.",
            "Enter your delivery address.",
          ],
          ["cart_empty", "أضف صنفاً إلى السلة.", "Add an item to your basket."],
          [
            "required_options_missing",
            "أكمل الخيارات المطلوبة.",
            "Complete the required item options.",
          ],
          [
            "too_many_options",
            "تم اختيار خيارات أكثر من المسموح.",
            "Too many options selected for an item.",
          ],
          [
            "item_unavailable",
            "أحد الأصناف لم يعد متاحاً. حدّث القائمة.",
            "An item is no longer available. Refresh the menu.",
          ],
          [
            "outside_business_hours",
            "المطعم مغلق خارج أوقات الدوام.",
            "The restaurant is outside its opening hours.",
          ],
          [
            "restaurant_not_accepting_orders",
            "المطعم متوقف عن استقبال الطلبات.",
            "The restaurant is not accepting orders.",
          ],
        ];
        const match = messages.find(([code]) => raw.includes(code));
        const friendly = match
          ? match[language === "en" ? 2 : 1]
          : language === "en"
            ? "Could not confirm your order. Check your connection and retry."
            : "تعذر تأكيد الطلب. تحقق من الاتصال وأعد المحاولة.";
        showNotice(friendly, 5200, "error");
        return false;
      }
      const receipt = submitted as unknown as OrderReceipt;
      const order: Order = {
        id: receipt.orderNumber,
        restaurantId: slug,
        publicToken: receipt.publicToken,
        mode,
        status: receipt.status ?? "received",
        lines: cart,
        customer: String(dataForm.get("customer") || "زبون المطعم"),
        phone: String(dataForm.get("phone") || ""),
        address: String(dataForm.get("address") || ""),
        table: tableContext?.labelAr ?? tableContext?.code ?? "",
        total: receipt.total,
        payment: String(dataForm.get("payment") || "الدفع نقداً"),
        paymentStatus: "pending",
        paymentReference: String(dataForm.get("paymentReference") || ""),
        internalNote: "",
        cancellationReason: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      // Persist the receipt before navigation: Safari may suspend this tab before effects run.
      writeStored("sufra-orders", [order, ...ordersRef.current]);
      writeStored(`sufra-cart-${slug}`, []);
      setOrders((current) => [order, ...current]);
      setCart([]);
      clearPendingOrderKey();
      setCheckoutOpen(false);
      setCartOpen(false);
      setTrackingOrder(order);
      navigate(`/c/${slug}/orders`);
      return true;
    } catch (err) {
      console.error("Order submission failed", err);
      showNotice(
        "تعذر إرسال الطلب — تحقق من اتصالك وحاول مجدداً. إذا استمرت المشكلة أعد تحميل الصفحة.",
        5200,
        "error",
      );
      return false;
    } finally {
      submittingRef.current = false;
    }
  };

  const openWhatsApp = async (order: Order) => {
    let dispatchId = "";
    if (order.databaseId) {
      const { data, error } = await supabase.rpc("create_whatsapp_dispatch", {
        p_order_id: order.databaseId,
      });
      if (error) {
        showNotice(`تعذر تسجيل محاولة واتساب: ${error.message}`, 4200, "error");
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
          `- ${l.qty}× ${l.item.name}${
            l.options.length
              ? ` (${l.options.map((o) => o.name).join(", ")})`
              : ""
          }`,
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

  const customerOrders = orders.filter(
    (o) => o.restaurantId === slug && !o.databaseId,
  );

  const value: CafeContextValue = {
    slug,
    restaurant,
    settings,
    categories: customerCategories,
    availableItems,
    ready,
    loadError,
    retryMenu: retryLoad,
    isOnline,
    tableContext,
    currency,
    setCurrency,
    category,
    setCategory,
    tag,
    setTag,
    query,
    setQuery,
    cart,
    cartCount,
    total,
    mode,
    setMode,
    cartOpen,
    openCart: () => setCartOpen(true),
    closeCart: () => setCartOpen(false),
    checkoutOpen,
    openCheckout: () => setCheckoutOpen(true),
    closeCheckout: () => setCheckoutOpen(false),
    selectedItem,
    openItem: (item) => setSelectedItem(item),
    closeItem: () => setSelectedItem(null),
    trackingOrder,
    trackOrder: (o) => setTrackingOrder(o),
    closeTracking: () => setTrackingOrder(null),
    addToCart,
    updateQty,
    placeOrder,
    openWhatsApp,
    customerOrders,
    reorder,
    trackingStale,
    notice,
  };

  return <CafeContext.Provider value={value}>{children}</CafeContext.Provider>;
}

export function useCafe() {
  const ctx = useContext(CafeContext);
  if (!ctx) throw new Error("useCafe must be used inside <CafeProvider>");
  return ctx;
}
