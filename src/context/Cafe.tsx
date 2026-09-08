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
import { useRestaurant } from "../hooks/useRestaurant";
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
  placeOrder: (form: HTMLFormElement) => Promise<void>;
  openWhatsApp: (order: Order) => Promise<void>;
  customerOrders: Order[];

  notice: string;
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
  const data = useRestaurant(slug);

  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [currency, setCurrency] = useState<"syp" | "usd">("syp");
  const [category, setCategory] = useState("كل الأصناف");
  const [tag, setTag] = useState<Tag | "all">("all");
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<Mode>("dine-in");

  const [cart, setCart] = useState<CartLine[]>(() =>
    readStored(`sufra-cart-${slug}`, []),
  );
  const [orders, setOrders] = useState<Order[]>(() =>
    readStored("sufra-orders", []),
  );

  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [trackingOrder, setTrackingOrder] = useState<Order | null>(null);
  const [notice, setNotice] = useState("");
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
    setCart(readStored(`sufra-cart-${slug}`, []));
    setCategory("كل الأصناف");
    setTag("all");
    setQuery("");
    setNotice("");
    setCartOpen(false);
    setCheckoutOpen(false);
    setSelectedItem(null);
    setTrackingOrder(null);
    setMode("dine-in");
  }, [slug]);

  useEffect(
    () => writeStored(`sufra-cart-${slug}`, cart),
    [cart, slug],
  );
  useEffect(() => writeStored("sufra-orders", orders), [orders]);

  const { restaurant, settings, categories, customerCategories, ready, tableContext } =
    data;

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

  const showNotice = (msg: string, ms = 2400) => {
    setNotice(msg);
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
    noticeTimer.current = window.setTimeout(() => setNotice(""), ms);
  };

  const addToCart = (
    item: Item,
    options: Option[] = [],
    note = "",
    qty = 1,
  ) => {
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
    showNotice("تمت الإضافة إلى الطلب", 1800);
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
    if (!isOnline || !ready) {
      showNotice("لا يمكن إرسال الطلب حالياً. تحقق من الاتصال وحاول مجدداً.", 4200);
      return;
    }
    const tableToken = new URLSearchParams(window.location.search).get(
      "tableToken",
    );
    if (mode === "dine-in" && (!tableToken || !tableContext)) {
      showNotice("لطلب داخل المطعم، امسح رمز QR الصحيح الموجود على الطاولة.", 4200);
      return;
    }
    const operationState = readStored<OperationsState | null>(
      `sufra-operations-${slug}`,
      null,
    );
    if (operationState?.acceptingOrders === false) {
      showNotice("المطعم متوقف عن استقبال الطلبات حالياً", 2600);
      return;
    }
    if (submittingRef.current) {
      showNotice("جارٍ إرسال طلبك… لحظة واحدة", 2400);
      return;
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
        );
        return;
      }
      type OrderReceipt = { orderNumber: string; publicToken: string; total: number };
      const { data: submitted, error } = await supabase.rpc(
        "submit_public_order",
        {
          p_payload: {
            restaurantSlug: slug,
            idempotencyKey: newId(),
            mode,
            tableToken,
            deliveryZoneId: selectedZone?.id ?? null,
            customerName: String(dataForm.get("customer") || "زبون المطعم"),
            phone: String(dataForm.get("phone") || ""),
            address: String(dataForm.get("address") || ""),
            pickupTime: String(dataForm.get("pickup") || ""),
            paymentMethod: String(dataForm.get("payment") || "الدفع نقداً"),
            paymentReference: String(dataForm.get("paymentReference") || ""),
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
        showNotice(`تعذر إرسال الطلب: ${error?.message ?? "خطأ غير معروف"}`, 5000);
        return;
      }
      const receipt = submitted as unknown as OrderReceipt;
      const order: Order = {
        id: receipt.orderNumber,
        restaurantId: slug,
        publicToken: receipt.publicToken,
        mode,
        status: "received",
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
      setOrders((current) => [order, ...current]);
      setCart([]);
      setCheckoutOpen(false);
      setCartOpen(false);
      setTrackingOrder(order);
      navigate(`/c/${slug}/orders`);
    } catch (err) {
      console.error("Order submission failed", err);
      showNotice(
        "تعذر إرسال الطلب — تحقق من اتصالك وحاول مجدداً. إذا استمرت المشكلة أعد تحميل الصفحة.",
        5200,
      );
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
        showNotice(`تعذر تسجيل محاولة واتساب: ${error.message}`, 4200);
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
            l.options.length ? ` (${l.options.map((o) => o.name).join(", ")})` : ""
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
    notice,
  };

  return <CafeContext.Provider value={value}>{children}</CafeContext.Provider>;
}

export function useCafe() {
  const ctx = useContext(CafeContext);
  if (!ctx) throw new Error("useCafe must be used inside <CafeProvider>");
  return ctx;
}
