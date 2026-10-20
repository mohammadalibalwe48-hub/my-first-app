import { useEffect, useState } from "react";
import {
  ChefHat,
  Check,
  Clock,
  Search,
  Wallet,
} from "lucide-react";
import { useUI } from "../context/UI";
import {
  formatSyp,
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
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 15000);
    return () => window.clearInterval(timer);
  }, []);
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
