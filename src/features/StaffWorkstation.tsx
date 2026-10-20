import { useEffect, useState } from "react";
import {
  ChefHat,
  Check,
  Clock,
  Search,
  Wallet,
  Package,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useUI } from "../context/UI";
import { formatSyp, type Item, type Order, type StaffRole } from "../domain";
import { PageHead, AdminEmpty } from "./AdminPrimitives";
import { supabase } from "../supabase";
import "./staff-workstation.css";

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
    setMessage("");
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
    setMessage("");
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
  const kitchen = view === "kitchen";
  const statusText: Record<Order["status"], string> = {
    received: t("جديد", "New"),
    confirmed: t("مؤكد", "Confirmed"),
    preparing: t("قيد التحضير", "Preparing"),
    ready: t("جاهز", "Ready"),
    "out-for-delivery": t("في الطريق", "Out for delivery"),
    completed: t("مكتمل", "Completed"),
    cancelled: t("ملغى", "Cancelled"),
  };
  const paymentText = (status: Order["paymentStatus"]) =>
    ({
      verified: t("تم استلام الدفع", "Payment received"),
      pending: t("بانتظار الدفع", "Payment pending"),
      rejected: t("الدفع مرفوض", "Payment rejected"),
      refunded: t("مسترد", "Refunded"),
    })[status ?? "pending"];
  const filteredStock = stockItems.filter((item) =>
    `${item.name} ${item.en}`.toLowerCase().includes(stockSearch.toLowerCase()),
  );
  return (
    <section
      className="adm-workstation"
      aria-label={
        kitchen
          ? t("شاشة المطبخ", "Kitchen display")
          : t("شاشة الكاشير", "Cashier desk")
      }
    >
      <PageHead
        kicker={t("غرفة العمليات", "LIVE OPERATIONS")}
        title={
          kitchen
            ? t("شاشة المطبخ", "Kitchen display")
            : t("شاشة الكاشير", "Cashier desk")
        }
        lede={
          kitchen
            ? t(
                "تابع التحضير وجهّز الطلبات للاستلام، مع تحديث توفر الأصناف.",
                "Track preparation, mark orders ready, and manage item availability.",
              )
            : t(
                "تابع المدفوعات وسلّم الطلبات من مكان واحد.",
                "Track payments and complete order handoffs in one place.",
              )
        }
        actions={
          <span className="adm-chip adm-chip--brand">
            <Package aria-hidden="true" />
            <b className="adm-num">{visible.length}</b>{" "}
            {t("طلب بالانتظار", "pending orders")}
          </span>
        }
      />
      <div className="adm-toolbar">
        <label className="adm-search">
          <Search aria-hidden="true" />
          <input
            type="search"
            aria-label={t("البحث عن طلب", "Search orders")}
            placeholder={t(
              "رقم الطلب أو الطاولة أو الاسم",
              "Order, table or customer",
            )}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <span className="adm-toolbar__meta">
          <CheckCircle2 aria-hidden="true" />
          {t(
            "تحديث مباشر مع مزامنة تلقائية",
            "Live updates with automatic sync",
          )}
        </span>
      </div>
      {message && (
        <p className="adm-alert adm-alert--err" role="alert">
          <AlertCircle aria-hidden="true" />
          {message}
        </p>
      )}
      {visible.length === 0 ? (
        <section className="adm-card">
          <AdminEmpty
            icon={kitchen ? ChefHat : Wallet}
            title={
              query
                ? t("لا توجد نتائج للبحث", "No matching orders")
                : t("لا توجد طلبات معلقة", "No pending orders")
            }
            copy={
              query
                ? t(
                    "جرّب رقم طلب أو اسماً مختلفاً.",
                    "Try another order number or name.",
                  )
                : t(
                    "الطلبات الجديدة رح تظهر هون تلقائياً.",
                    "New orders will appear here automatically.",
                  )
            }
          >
            {query && (
              <button
                className="adm-btn adm-btn--soft adm-btn--sm"
                onClick={() => setQuery("")}
              >
                {t("مسح البحث", "Clear search")}
              </button>
            )}
          </AdminEmpty>
        </section>
      ) : (
        <div className="adm-workstation__tickets">
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
            const late =
              kitchen && minutes > target && order.status !== "ready";
            const next =
              order.status === "received"
                ? "confirmed"
                : order.status === "confirmed"
                  ? "preparing"
                  : "ready";
            return (
              <article
                className={`adm-card adm-work-ticket${late ? " is-late" : ""}`}
                key={order.databaseId || order.id}
                aria-busy={busy === order.id}
              >
                <header className="adm-card__hd">
                  <strong className="adm-work-ticket__number adm-num">
                    <bdi>#{order.id}</bdi>
                  </strong>
                  <span className={`adm-chip adm-chip--${order.status}`}>
                    <i className="adm-chip__dot" aria-hidden="true" />
                    {statusText[order.status]}
                  </span>
                </header>
                <div className="adm-card__bd">
                  <div className="adm-work-ticket__who">
                    <h3>{order.customer}</h3>
                    <span>
                      {order.table ||
                        (order.mode === "delivery"
                          ? t("توصيل", "Delivery")
                          : t("استلام من المطعم", "Takeaway"))}
                    </span>
                  </div>
                  <p
                    className={`adm-work-ticket__time${late ? " is-late" : ""}`}
                  >
                    <Clock aria-hidden="true" />
                    <span>
                      {minutes} {t("دقيقة منذ الطلب", "min since ordered")}
                      {late
                        ? ` · ${t("متأخر عن وقت التحضير", "Past preparation target")}`
                        : ""}
                    </span>
                  </p>
                  <ul className="adm-work-ticket__lines">
                    {order.lines.map((line) => (
                      <li key={line.key}>
                        <span className="adm-work-ticket__qty adm-num">
                          {line.qty} ×
                        </span>
                        <div>
                          <strong>
                            {en
                              ? line.item.en || line.item.name
                              : line.item.name}
                          </strong>
                          {line.options.length > 0 && (
                            <small>
                              {line.options
                                .map((option) => option.name)
                                .join(" · ")}
                            </small>
                          )}
                          {line.note && (
                            <p className="adm-work-ticket__note">{line.note}</p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                  {!kitchen && (
                    <div className="adm-work-ticket__payment">
                      <strong className="adm-num">
                        {formatSyp(order.total)}
                      </strong>
                      <span
                        className={`adm-chip adm-chip--${order.paymentStatus ?? "pending"}`}
                      >
                        {paymentText(order.paymentStatus)}
                      </span>
                      <small>{order.payment}</small>
                      {order.paymentReference && (
                        <small>
                          {t("المرجع", "Reference")}:{" "}
                          <bdi>{order.paymentReference}</bdi>
                        </small>
                      )}
                    </div>
                  )}
                </div>
                <footer className="adm-work-ticket__actions">
                  {kitchen && canKitchen && order.status !== "ready" && (
                    <button
                      className="adm-btn adm-btn--teal"
                      disabled={!!busy}
                      onClick={() => void patch(order, { status: next })}
                    >
                      <ChefHat aria-hidden="true" />
                      {next === "confirmed"
                        ? t("قبول الطلب", "Accept order")
                        : next === "preparing"
                          ? t("بدء التحضير", "Start preparing")
                          : t("جاهز للاستلام", "Mark ready")}
                    </button>
                  )}
                  {kitchen && order.status === "ready" && (
                    <span className="adm-work-ticket__ready">
                      <CheckCircle2 aria-hidden="true" />
                      {t("بانتظار التسليم", "Awaiting handoff")}
                    </span>
                  )}
                  {!kitchen && canCashier && (
                    <>
                      {order.paymentStatus !== "verified" && (
                        <button
                          className="adm-btn adm-btn--teal"
                          disabled={!!busy}
                          onClick={() =>
                            void patch(order, { paymentStatus: "verified" })
                          }
                        >
                          <Wallet aria-hidden="true" />
                          {t("تأكيد استلام الدفع", "Confirm payment received")}
                        </button>
                      )}
                      {["ready", "out-for-delivery"].includes(order.status) && (
                        <button
                          className="adm-btn adm-btn--accent"
                          disabled={
                            !!busy || order.paymentStatus !== "verified"
                          }
                          onClick={() =>
                            void patch(order, { status: "completed" })
                          }
                        >
                          <Check aria-hidden="true" />
                          {t("تسليم وإغلاق", "Complete handoff")}
                        </button>
                      )}
                      {order.mode === "delivery" &&
                        order.status === "ready" && (
                          <button
                            className="adm-btn adm-btn--soft"
                            disabled={!!busy}
                            onClick={() =>
                              void patch(order, { status: "out-for-delivery" })
                            }
                          >
                            <ArrowRight aria-hidden="true" />
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
      )}
      {kitchen && canKitchen && (
        <section className="adm-card adm-work-stock">
          <header className="adm-card__hd">
            <div>
              <h3>{t("توفر الأصناف", "Item availability")}</h3>
              <p>
                {t(
                  "حدّث التوفر حتى يشوف الزبون الأصناف المتاحة فقط.",
                  "Keep availability current for customer ordering.",
                )}
              </p>
            </div>
            <span className="adm-chip adm-chip--mode">
              {filteredStock.length} {t("صنف", "items")}
            </span>
          </header>
          <div className="adm-card__bd">
            <label className="adm-search">
              <Search aria-hidden="true" />
              <input
                type="search"
                aria-label={t("بحث الأصناف", "Search items")}
                placeholder={t("ابحث عن صنف", "Search items")}
                value={stockSearch}
                onChange={(event) => setStockSearch(event.target.value)}
              />
            </label>
            <div className="adm-work-stock__items">
              {filteredStock.map((item) => (
                <button
                  className="adm-work-stock__item"
                  aria-pressed={item.available}
                  disabled={!!busy}
                  key={item.id}
                  onClick={() => void stock(item)}
                >
                  <span>{en ? item.en || item.name : item.name}</span>
                  <b>
                    {item.available
                      ? t("متاح", "Available")
                      : t("نفد", "Sold out")}
                  </b>
                </button>
              ))}
            </div>
            {filteredStock.length === 0 && (
              <p className="adm-work-stock__empty">
                {t("لا توجد أصناف مطابقة.", "No matching items.")}
              </p>
            )}
          </div>
        </section>
      )}
    </section>
  );
}
