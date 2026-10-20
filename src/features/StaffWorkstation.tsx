import { useEffect, useRef, useState } from "react";
import {
  Bell,
  BellOff,
  ChefHat,
  Check,
  Clock,
  Search,
  Volume2,
  VolumeX,
  Wallet,
} from "lucide-react";
import { useUI } from "../context/UI";
import {
  formatSyp,
  readStored,
  writeStored,
  type Item,
  type Order,
  type StaffRole,
} from "../domain";
import { supabase } from "../supabase";
import "./workflows.css";

export default function StaffWorkstation({
  view,
  orders,
  role,
  items,
  restaurantId,
  onPatch,
  onStock,
}: {
  view: "kitchen" | "cashier";
  orders: Order[];
  role: StaffRole;
  items: Item[];
  restaurantId: string;
  onPatch: (id: string, patch: Partial<Order>) => Promise<boolean>;
  onStock: (id: string, available: boolean) => void;
}) {
  const { language } = useUI();
  const en = language === "en";
  const t = (ar: string, english: string) => (en ? english : ar);
  const [query, setQuery] = useState("");
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [sound, setSound] = useState(false);
  const [notifying, setNotifying] = useState(
    typeof Notification !== "undefined" &&
      Notification.permission === "granted",
  );
  const audio = useRef<AudioContext | null>(null);
  const known = useRef<Set<string> | null>(null);
  const soundKey = `syrianqr-alerts-${restaurantId}`;
  useEffect(() => {
    setSound(false);
    known.current = null;
    if (readStored(soundKey, false))
      setMessage(
        t(
          "اضغط زر الصوت لتفعيل التنبيهات في هذه الجلسة",
          "Enable sound for alerts in this session",
        ),
      );
  }, [soundKey]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(
    () => () => {
      void audio.current?.close();
    },
    [],
  );
  useEffect(() => {
    const fresh = known.current
      ? orders.filter(
          (o) => !known.current!.has(o.id) && o.status === "received",
        )
      : [];
    known.current = new Set(orders.map((o) => o.id));
    if (!fresh.length) return;
    setMessage(
      t(
        `وصل ${fresh.length} طلب جديد`,
        `${fresh.length} new order(s) received`,
      ),
    );
    if (sound && audio.current?.state === "running") {
      const oscillator = audio.current.createOscillator(),
        gain = audio.current.createGain();
      oscillator.connect(gain);
      gain.connect(audio.current.destination);
      oscillator.frequency.value = 760;
      gain.gain.setValueAtTime(0.08, audio.current.currentTime);
      gain.gain.exponentialRampToValueAtTime(
        0.001,
        audio.current.currentTime + 0.4,
      );
      oscillator.start();
      oscillator.stop(audio.current.currentTime + 0.4);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
    }
    if (
      notifying &&
      typeof Notification !== "undefined" &&
      Notification.permission === "granted"
    )
      new Notification(t("طلب جديد", "New order"), {
        body: `${fresh[0].id} · ${fresh.length}`,
        tag: `orders-${restaurantId}`,
      });
  }, [orders, sound, notifying, restaurantId, en]);
  const enableSound = async () => {
    try {
      if (!audio.current) audio.current = new AudioContext();
      await audio.current.resume();
    } catch {
      setMessage(
        t(
          "تعذر تفعيل الصوت في هذا المتصفح",
          "Sound is unavailable in this browser",
        ),
      );
      return;
    }
    setSound((current) => {
      writeStored(soundKey, !current);
      return !current;
    });
  };
  const enableNotifications = async () => {
    if (typeof Notification === "undefined") {
      setMessage(
        t("المتصفح لا يدعم التنبيهات", "Browser notifications are unavailable"),
      );
      return;
    }
    if (notifying) {
      setNotifying(false);
      return;
    }
    const permission = await Notification.requestPermission();
    setNotifying(permission === "granted");
    if (permission !== "granted")
      setMessage(
        t(
          "اسمح بالتنبيهات من إعدادات المتصفح",
          "Allow notifications in browser settings",
        ),
      );
  };
  const patch = async (order: Order, values: Partial<Order>) => {
    setBusy(order.id);
    try {
      if (!(await onPatch(order.id, values)))
        setMessage(
          t("تعذر حفظ التغيير. أعد المحاولة.", "Could not save. Please retry."),
        );
    } finally {
      setBusy(null);
    }
  };
  const canKitchen = ["owner", "manager", "kitchen"].includes(role);
  const canCashier = ["owner", "manager", "cashier"].includes(role);
  const visible = orders
    .filter(
      (o) =>
        (view === "kitchen"
          ? ["received", "confirmed", "preparing", "ready"].includes(o.status)
          : o.status !== "cancelled" &&
            (o.status !== "completed" || o.paymentStatus === "pending")) &&
        `${o.id} ${o.customer} ${o.table}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  const [stockSearch, setStockSearch] = useState("");
  const [stockItems, setStockItems] = useState(items);
  useEffect(() => setStockItems(items), [items]);
  const stock = async (item: Item) => {
    setBusy(item.id);
    try {
      const { error } = await supabase.rpc("set_item_availability", {
        p_restaurant_id: restaurantId,
        p_item_id: item.id,
        p_available: !item.available,
      });
      if (error) setMessage(error.message);
      else {
        setStockItems((current) =>
          current.map((entry) =>
            entry.id === item.id
              ? { ...entry, available: !item.available }
              : entry,
          ),
        );
        onStock(item.id, !item.available);
      }
    } finally {
      setBusy(null);
    }
  };
  return (
    <section className="wf-desk">
      <header className="wf-head">
        <div>
          <span className="wf-eyebrow">
            {t("غرفة العمليات", "LIVE OPERATIONS")}
          </span>
          <h1>
            {view === "kitchen"
              ? t("شاشة المطبخ", "Kitchen display")
              : t("شاشة الكاشير", "Cashier desk")}
          </h1>
          <p>
            {t(
              "تحديث مباشر مع إعادة المزامنة تلقائياً",
              "Live updates with automatic resynchronization",
            )}
          </p>
        </div>
        <b className="wf-count">{visible.length}</b>
      </header>
      <div className="wf-toolbar">
        <label>
          <Search size={18} />
          <input
            aria-label={t("البحث عن طلب", "Search orders")}
            placeholder={t(
              "رقم الطلب أو الطاولة أو الاسم",
              "Order, table or customer",
            )}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <button onClick={() => void enableSound()} aria-pressed={sound}>
          {sound ? <Volume2 /> : <VolumeX />}
          {t("الصوت", "Sound")}
        </button>
        <button
          onClick={() => void enableNotifications()}
          aria-pressed={notifying}
        >
          {notifying ? <Bell /> : <BellOff />}
          {t("التنبيهات", "Notifications")}
        </button>
      </div>
      <p role="status" aria-live="polite">
        {message}
      </p>
      <div className="wf-tickets">
        {visible.length === 0 && (
          <p>{t("لا توجد طلبات معلقة", "No pending orders")}</p>
        )}
        {visible.map((order) => {
          const minutes = Math.max(
            0,
            Math.floor((now - Date.parse(order.createdAt)) / 60000),
          );
          const target = Math.max(
            1,
            ...order.lines.map(
              (line) =>
                items.find((item) => item.id === line.item.id)
                  ?.preparationMinutes ??
                line.item.preparationMinutes ??
                15,
            ),
          );
          const next =
            order.status === "received"
              ? "confirmed"
              : order.status === "confirmed"
                ? "preparing"
                : "ready";
          const statusAr = {
            received: "جديد",
            confirmed: "مؤكد",
            preparing: "قيد التحضير",
            ready: "جاهز",
            "out-for-delivery": "في الطريق",
            completed: "مكتمل",
            cancelled: "ملغى",
          };
          return (
            <article
              className={`wf-ticket${minutes > target && order.status !== "ready" ? " is-late" : ""}`}
              key={order.id}
            >
              <header>
                <strong>#{order.id}</strong>
                <span>{order.table || t("طلب خارجي", "Off-premise")}</span>
              </header>
              <p>
                <Clock size={15} />
                {minutes} {t("دقيقة منذ الطلب", "min since ordered")} ·{" "}
                {en
                  ? order.status.replaceAll("-", " ")
                  : statusAr[order.status]}
              </p>
              <h3>{order.customer}</h3>
              <ul>
                {order.lines.map((line) => (
                  <li key={line.key}>
                    <b>
                      {line.qty} ×{" "}
                      {en ? line.item.en || line.item.name : line.item.name}
                    </b>
                    {line.options.length > 0 && (
                      <small>
                        {line.options.map((o) => o.name).join(" · ")}
                      </small>
                    )}
                    {line.note && <em>{line.note}</em>}
                  </li>
                ))}
              </ul>
              {view === "cashier" && (
                <div className="wf-payment">
                  <strong>{formatSyp(order.total)}</strong>
                  <span>
                    {order.payment} · {order.paymentStatus}
                  </span>
                  {order.paymentReference && (
                    <small>
                      {t("المرجع", "Reference")}: {order.paymentReference}
                    </small>
                  )}
                </div>
              )}
              <footer>
                {view === "kitchen" &&
                  canKitchen &&
                  order.status !== "ready" && (
                    <button
                      disabled={!!busy}
                      onClick={() => void patch(order, { status: next })}
                    >
                      <ChefHat />
                      {next === "confirmed"
                        ? t("قبول الطلب", "Accept order")
                        : next === "preparing"
                          ? t("بدء التحضير", "Start preparing")
                          : t("جاهز للاستلام", "Mark ready")}
                    </button>
                  )}
                {view === "cashier" && canCashier && (
                  <>
                    {order.paymentStatus !== "verified" && (
                      <button
                        disabled={!!busy}
                        onClick={() =>
                          void patch(order, { paymentStatus: "verified" })
                        }
                      >
                        <Wallet />
                        {t("تأكيد استلام الدفع", "Confirm payment received")}
                      </button>
                    )}
                    {["ready", "out-for-delivery"].includes(order.status) && (
                      <button
                        disabled={!!busy || order.paymentStatus !== "verified"}
                        onClick={() =>
                          void patch(order, { status: "completed" })
                        }
                      >
                        <Check />
                        {t("تسليم وإغلاق", "Complete handoff")}
                      </button>
                    )}
                    {order.mode === "delivery" && order.status === "ready" && (
                      <button
                        disabled={!!busy}
                        onClick={() =>
                          void patch(order, { status: "out-for-delivery" })
                        }
                      >
                        {t("خرج للتوصيل", "Dispatch delivery")}
                      </button>
                    )}
                  </>
                )}
              </footer>
            </article>
          );
        })}
      </div>
      {view === "kitchen" && canKitchen && (
        <section className="wf-stock">
          <h2>{t("توفر الأصناف", "Item availability")}</h2>
          <input
            aria-label={t("بحث الأصناف", "Search items")}
            placeholder={t("ابحث عن صنف", "Search items")}
            value={stockSearch}
            onChange={(e) => setStockSearch(e.target.value)}
          />
          <div>
            {stockItems
              .filter((i) =>
                `${i.name} ${i.en}`
                  .toLowerCase()
                  .includes(stockSearch.toLowerCase()),
              )
              .map((item) => (
                <button
                  aria-pressed={item.available}
                  disabled={!!busy}
                  key={item.id}
                  onClick={() => void stock(item)}
                >
                  {en ? item.en || item.name : item.name}
                  <b>
                    {item.available
                      ? t("متاح", "Available")
                      : t("نفد", "Sold out")}
                  </b>
                </button>
              ))}
          </div>
        </section>
      )}
    </section>
  );
}
