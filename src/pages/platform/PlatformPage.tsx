import {
  useCallback,
  useEffect,
  useState,
  type CSSProperties,
  type JSX,
} from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Check,
  ClipboardList,
  Globe2,
  LayoutDashboard,
  Search,
  ShieldCheck,
  ShoppingBasket,
  Store,
  Truck,
  Utensils,
} from "lucide-react";
import { supabase } from "../../supabase";
import { useAuth } from "../../context/Auth";
import { useUI } from "../../context/UI";
import { formatSyp, modeLabels, statusLabels } from "../../domain";
import "./platform.css";

/* ---------------- types ---------------- */
type RestaurantStat = {
  id: string;
  slug: string;
  nameAr: string;
  nameEn: string;
  city: string;
  neighborhood: string;
  accent: string;
  acceptanceState: "open" | "paused" | "closed";
  orderCount: number;
  activeOrders: number;
  revenueSyp: number;
  lastOrderAt: string | null;
  tableCount: number;
  staffCount: number;
  statusBreakdown: Record<string, number>;
};

type PlatformOverview = {
  generatedAt: string;
  totals: {
    restaurants: number;
    orders: number;
    activeOrders: number;
    revenueSyp: number;
  };
  restaurants: RestaurantStat[];
};

type PlatformOrder = {
  id: string;
  order_number: number;
  public_token: string;
  mode: "dine-in" | "takeaway" | "delivery";
  status: string;
  payment_status: string;
  total_syp: number;
  customer_name: string;
  created_at: string;
  updated_at: string;
  restaurant_slug: string;
  restaurant_name: string;
  accent_color: string | null;
  table_label: string | null;
  item_count: number;
};

type Tab = "overview" | "restaurants" | "orders";

const TAB_META: Record<Tab, { label: string; icon: typeof Store; sub: string }> = {
  overview: { label: "نظرة عامة", icon: LayoutDashboard, sub: "مؤشرات كل المطاعم لحظياً" },
  restaurants: { label: "المطاعم", icon: Store, sub: "كل المتاجر المسجّلة على المنصة" },
  orders: { label: "الطلبات", icon: ClipboardList, sub: "آخر الطلبات عبر كل المطاعم" },
};

const num = (n: number) => new Intl.NumberFormat("ar-SY").format(n);

const statusTone = (status: string) =>
  status === "completed"
    ? "completed"
    : status === "cancelled"
      ? "cancelled"
      : status === "received"
        ? "received"
        : "preparing";

const orderTotal = (n: number) =>
  `${new Intl.NumberFormat("ar-SY").format(n)} ل.س`;

/* ---------------- page ---------------- */
export default function PlatformPage() {
  const { authReady, platformAdmin, staffEmail, signOut } = useAuth();
  const { dir } = useUI();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("overview");

  const [overview, setOverview] = useState<PlatformOverview | null>(null);
  const [orders, setOrders] = useState<PlatformOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setRefreshing(true);
    setError("");
    try {
      const [ov, ors] = await Promise.all([
        supabase.rpc("pf_platform_overview"),
        supabase.rpc("pf_platform_orders", { p_limit: 300 }),
      ]);
      if (ov.error) throw new Error(String(ov.error.message));
      if (ors.error) throw new Error(String(ors.error.message));
      setOverview((ov.data ?? null) as PlatformOverview | null);
      setOrders((ors.data ?? []) as PlatformOrder[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر تحميل البيانات");
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authReady || !platformAdmin) return;
    void load();
  }, [authReady, platformAdmin, load]);

  useEffect(() => {
    if (!authReady || !platformAdmin) return;
    const timer = window.setInterval(() => void load(), 30000);
    return () => window.clearInterval(timer);
  }, [authReady, platformAdmin, load]);

  if (!authReady) {
    return (
      <div className="px" dir={dir}>
        <div className="px-loading">جارٍ التحقق من الجلسة…</div>
      </div>
    );
  }
  if (!platformAdmin) {
    return <Navigate to="/admin" replace />;
  }

  const meta = TAB_META[tab];
  const TabIcon = meta.icon;

  const maxRevenue = Math.max(
    1,
    ...(overview?.restaurants.map((r) => r.revenueSyp) ?? [1]),
  );
  const maxOrders = Math.max(
    1,
    ...(overview?.restaurants.map((r) => r.orderCount) ?? [1]),
  );
  const recent = orders.slice(0, 8);
  const byRevenue = [...(overview?.restaurants ?? [])].sort(
    (a, b) => b.revenueSyp - a.revenueSyp,
  );
  const filteredOrders = orders.filter((o) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      String(o.order_number).includes(q) ||
      o.restaurant_name.toLowerCase().includes(q) ||
      o.customer_name.toLowerCase().includes(q) ||
      o.restaurant_slug.toLowerCase().includes(q)
    );
  });

  const go = (slug: string) => navigate(`/admin/${slug}`);

  return (
    <div className="px" dir={dir}>
      <div className="px-frame">
        {/* Desktop sidebar */}
        <aside className="px-sidebar">
          <div className="px-brand">
            <span className="px-brand__mark">
              <Utensils />
            </span>
            <div>
              <b>SYRIAN QR</b>
              <small>لوحة المنصة</small>
            </div>
          </div>
          <nav className="px-nav" aria-label="أقسام المنصة">
            <span className="px-nav__label">التحليلات</span>
            {(Object.keys(TAB_META) as Tab[]).map((key) => {
              const Icon = TAB_META[key].icon;
              return (
                <button
                  type="button"
                  key={key}
                  className={`px-nav__item${tab === key ? " is-active" : ""}`}
                  onClick={() => setTab(key)}
                >
                  <Icon />
                  {TAB_META[key].label}
                  {key === "orders" && orders.length > 0 && (
                    <span className="px-nav__count">{num(orders.length)}</span>
                  )}
                </button>
              );
            })}
          </nav>
          <div className="px-sidebar__foot">
            {overview?.totals.restaurants && (
              <div className="px-user">
                <span className="px-user__avatar">
                  {staffEmail ? staffEmail[0].toUpperCase() : "م"}
                </span>
                <div>
                  <b>{staffEmail}</b>
                  <small>مدير المنصة · كل المتاجر</small>
                </div>
              </div>
            )}
            <button type="button" className="px-sbtn" onClick={() => navigate("/")}>
              <Globe2 />
              الموقع العام
            </button>
            <button
              type="button"
              className="px-sbtn px-sbtn--gold"
              onClick={() => void signOut().then(() => navigate("/"))}
            >
              <ArrowRight />
              تسجيل الخروج
            </button>
          </div>
        </aside>

        {/* Main column */}
        <div className="px-main">
          <div className="px-mtop">
            <div className="px-mtop__brand">
              <span className="px-brand__mark">
                <Utensils />
              </span>
              <b>SYRIAN QR</b>
            </div>
            {(Object.keys(TAB_META) as Tab[]).map((key) => {
              const Icon = TAB_META[key].icon;
              return (
                <button
                  type="button"
                  key={key}
                  className={`px-nav__item${tab === key ? " is-active" : ""}`}
                  onClick={() => setTab(key)}
                >
                  <Icon />
                  {TAB_META[key].label}
                </button>
              );
            })}
            <div className="px-mtop__foot">
              <button
                type="button"
                className="px-ibtn"
                onClick={() => void signOut().then(() => navigate("/"))}
                aria-label="تسجيل الخروج"
              >
                <ArrowRight />
              </button>
            </div>
          </div>

          <header className="px-topbar">
            <div className="px-topbar__title">
              <h1>{meta.label}</h1>
              <small>{meta.sub}</small>
            </div>
            <span className="px-topbar__spacer" />
            <span className="px-live">
              <i />
              مباشر
            </span>
            <button
              type="button"
              className={`px-ibtn${refreshing ? " is-spin" : ""}`}
              onClick={() => void load()}
            >
              {refreshing ? "جارٍ التحديث…" : "تحديث"}
            </button>
          </header>

          <main className="px-content">
            {loading ? (
              <div className="px-loading">جارٍ تحميل بيانات المنصة…</div>
            ) : error ? (
              <div className="px-panel">
                <div className="px-empty">
                  <b>تعذّر التحميل:</b> {error}
                  <br />
                  <button className="px-ibtn is-solid" style={{ marginTop: 14 }} onClick={() => void load()}>
                    إعادة المحاولة
                  </button>
                </div>
              </div>
            ) : tab === "overview" ? (
              <OverviewView
                overview={overview}
                byRevenue={byRevenue}
                maxRevenue={maxRevenue}
                recent={recent}
                onOpen={go}
                onAllOrders={() => setTab("orders")}
              />
            ) : tab === "restaurants" ? (
              <RestaurantsView
                restaurants={overview?.restaurants ?? []}
                maxOrders={maxOrders}
                onOpen={go}
              />
            ) : (
              <OrdersView
                orders={filteredOrders}
                query={query}
                setQuery={setQuery}
              />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Overview ---------------- */
function OverviewView({
  overview,
  byRevenue,
  maxRevenue,
  recent,
  onOpen,
  onAllOrders,
}: {
  overview: PlatformOverview | null;
  byRevenue: RestaurantStat[];
  maxRevenue: number;
  recent: PlatformOrder[];
  onOpen: (slug: string) => void;
  onAllOrders: () => void;
}) {
  if (!overview) return null;
  const { totals } = overview;
  return (
    <>
      <section className="px-kpis">
        <Kpi
          icon={ShoppingBasket}
          tone=""
          label="إجمالي المبيعات"
          value={orderTotal(totals.revenueSyp)}
          hint="قيمة كل الطلبات غير الملغاة"
        />
        <Kpi
          icon={ClipboardList}
          tone="is-blue"
          label="الطلبات"
          value={num(totals.orders)}
          hint="عبر كل المطاعم"
        />
        <Kpi
          icon={Store}
          tone="is-green"
          label="قيد التحضير"
          value={num(totals.activeOrders)}
          hint="طلبات نشطة تحتاج متابعة"
        />
        <Kpi
          icon={ShieldCheck}
          tone="is-red"
          label="المطاعم"
          value={num(totals.restaurants)}
          hint="متاجر مفعّلة على المنصة"
        />
      </section>

      <section className="px-panel">
        <div className="px-panel__head">
          <div>
            <h3>ترتيب المطاعم بالإيرادات</h3>
            <p>أفضل المتاجر أداءً على المنصة</p>
          </div>
        </div>
        <div className="px-rank">
          {byRevenue.map((r, index) => (
            <div className="px-rank__row" key={r.id}>
              <span className="px-rank__num">{String(index + 1).padStart(2, "0")}</span>
              <div className="px-rank__rest">
                <span className="px-rank__avatar" style={{ background: r.accent }}>
                  {(r.nameAr || r.nameEn || "؟")[0]}
                </span>
                <div className="px-rank__meta">
                  <b>{r.nameAr}</b>
                  <small>
                    {r.city} · {r.neighborhood}
                  </small>
                </div>
              </div>
              <div className="px-bar muted">
                <i style={{ width: `${Math.max(2, (r.revenueSyp / maxRevenue) * 100)}%` }} />
              </div>
              <div className="px-rank__val">
                <b>{orderTotal(r.revenueSyp)}</b>
                <small>{num(r.orderCount)} طلباً</small>
              </div>
            </div>
          ))}
          {byRevenue.length === 0 && (
            <div className="px-empty">لا توجد مطاعم مفعّلة بعد.</div>
          )}
        </div>
      </section>

      <section className="px-panel">
        <div className="px-panel__head">
          <div>
            <h3>آخر الطلبات</h3>
            <p>أحدث النشاط عبر كل المتاجر</p>
          </div>
          <button type="button" className="px-ibtn" onClick={onAllOrders}>
            كل الطلبات
          </button>
        </div>
        <div className="px-feed">
          {recent.map((o) => (
            <div className="px-feed__row" key={o.id}>
              <span className="px-feed__num">#{o.order_number}</span>
              <div className="px-feed__mid">
                <b>
                  <i style={{ background: o.accent_color ?? "#f0002f" }} />
                  {o.restaurant_name}
                </b>
                <small>
                  {modeLabels[o.mode]} · {o.customer_name || "زبون"}
                  {o.table_label ? ` · ${o.table_label}` : ""} ·{" "}
                  {new Date(o.created_at).toLocaleString("ar-SY", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </small>
              </div>
              <div className="px-feed__end">
                <b>{orderTotal(o.total_syp)}</b>
                <small>{statusLabels[o.status as keyof typeof statusLabels] ?? o.status}</small>
              </div>
            </div>
          ))}
          {recent.length === 0 && <div className="px-empty">لا طلبات بعد — جرّب إرسال طلب من أحد المتاجر.</div>}
        </div>
      </section>

      {byRevenue.length > 0 && (
        <button
          type="button"
          className="px-go"
          onClick={() => onOpen(byRevenue[0]?.slug ?? "")}
          style={{ justifySelf: "start" }}
        >
          فتح لوحة أفضل مطعم
          <ArrowRight />
        </button>
      )}
    </>
  );
}

function Kpi({
  icon: Icon,
  tone,
  label,
  value,
  hint,
}: {
  icon: typeof Store;
  tone: string;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <article className="px-kpi">
      <div className="px-kpi__top">
        <span>{label}</span>
        <span className={`px-kpi__ico ${tone}`}>
          <Icon />
        </span>
      </div>
      <strong>{value}</strong>
      <small>{hint}</small>
    </article>
  );
}

/* ---------------- Restaurants ---------------- */
function RestaurantsView({
  restaurants,
  maxOrders,
  onOpen,
}: {
  restaurants: RestaurantStat[];
  maxOrders: number;
  onOpen: (slug: string) => void;
}) {
  return (
    <section className="px-cards">
      {restaurants.map((r) => {
        const closed = r.acceptanceState !== "open";
        const state =
          r.acceptanceState === "open"
            ? "مفتوح"
            : r.acceptanceState === "paused"
              ? "متوقف مؤقتاً"
              : "مغلق";
        const breakdown = Object.entries(r.statusBreakdown)
          .map(([s, n]) => ({ s, n }))
          .sort((a, b) => b.n - a.n);
        return (
          <article className="px-card" key={r.id}>
            <div className="px-card__top">
              <span className={`px-card__badge${closed ? " is-closed" : ""}`}>
                {closed ? <Truck /> : <Check />}
                {state}
              </span>
              <div className="px-card__head">
                <span
                  className="px-card__avatar"
                  style={{ "--c1": r.accent, "--c2": r.accent } as CSSProperties}
                >
                  {(r.nameAr || r.nameEn || "؟")[0]}
                </span>
                <div>
                  <b>{r.nameAr}</b>
                  <small>
                    {r.city} · {r.neighborhood}
                  </small>
                </div>
              </div>
            </div>
            <div className="px-card__stats">
              <div className="px-card__stat">
                <b>{num(r.orderCount)}</b>
                <small>طلب</small>
              </div>
              <div className="px-card__stat">
                <b>{num(r.activeOrders)}</b>
                <small>نشط</small>
              </div>
              <div className="px-card__stat">
                <b>{orderTotal(r.revenueSyp)}</b>
                <small>إيراد</small>
              </div>
            </div>
            <div className="px-card__body">
              <div className="px-card__break">
                {breakdown.slice(0, 4).map(({ s, n }) => (
                  <span key={s}>{statusLabels[s as keyof typeof statusLabels] ?? s}: {num(n)}</span>
                ))}
              </div>
            </div>
            <div className="px-card__foot">
              <span>{r.tableCount} طاولة · {r.staffCount} موظف</span>
              <button type="button" className="px-go" onClick={() => onOpen(r.slug)}>
                لوحة المطعم
                <ArrowRight />
              </button>
            </div>
          </article>
        );
      })}
      {restaurants.length === 0 && (
        <div className="px-panel">
          <div className="px-empty">لا توجد مطاعم مفعّلة بعد.</div>
        </div>
      )}
    </section>
  );
}

/* ---------------- Orders ---------------- */
function OrdersView({
  orders,
  query,
  setQuery,
}: {
  orders: PlatformOrder[];
  query: string;
  setQuery: (q: string) => void;
}) {
  const filters = ["all", "active", "completed", "cancelled"] as const;
  const [filter, setFilter] = useState<(typeof filters)[number]>("all");

  const visible = orders.filter((o) => {
    if (filter === "all") return true;
    if (filter === "active")
      return !["completed", "cancelled"].includes(o.status);
    return o.status === filter;
  });

  return (
    <section className="px-panel">
      <div className="px-panel__head">
        <div>
          <h3>طلبات كل المطاعم</h3>
          <p>حدّث تلقائياً كل ٣٠ ثانية</p>
        </div>
      </div>
      <div className="px-filterbar">
        <label className="px-chip" style={{ border: "none", background: "transparent", padding: 0 }}>
          <Search />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="رقم الطلب، المطعم، الزبون…"
            style={{
              border: "none",
              background: "transparent",
              outline: "none",
              fontSize: "0.9rem",
              width: 190,
              padding: "0 4px",
            }}
          />
        </label>
        {filters.map((f) => (
          <button
            type="button"
            key={f}
            className={`px-chip${filter === f ? " is-on" : ""}`}
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "الكل" : f === "active" ? "النشطة" : f === "completed" ? "المكتملة" : "الملغاة"}
          </button>
        ))}
      </div>
      <div className="px-tablewrap">
        <table className="px-table">
          <thead>
            <tr>
              <th>الطلب</th>
              <th>المطعم</th>
              <th>الزبون</th>
              <th>النوع</th>
              <th>الحالة</th>
              <th>الدفع</th>
              <th style={{ textAlign: "end" }}>الإجمالي</th>
              <th>الوقت</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((o) => (
              <tr key={o.id}>
                <td className="px-num">#{o.order_number}</td>
                <td>
                  <span className="px-restchip">
                    <i style={{ "--r": o.accent_color ?? "#f0002f" } as CSSProperties} />
                    {o.restaurant_name}
                  </span>
                </td>
                <td>{o.customer_name || "زبون"}</td>
                <td>{modeLabels[o.mode]}</td>
                <td>
                  <span className={`px-pill px-pill--${statusTone(o.status)}`}>
                    {statusLabels[o.status as keyof typeof statusLabels] ?? o.status}
                  </span>
                </td>
                <td>
                  <span className={`px-pill px-pill--${o.payment_status === "verified" ? "verified" : "pending"}`}>
                    {o.payment_status === "verified" ? "موثّق" : "معلّق"}
                  </span>
                </td>
                <td style={{ textAlign: "end" }} className="px-num">
                  {orderTotal(o.total_syp)}
                </td>
                <td style={{ whiteSpace: "nowrap", fontSize: "0.82rem", color: "var(--px-ink-3)" }}>
                  {new Date(o.created_at).toLocaleString("ar-SY", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 && <div className="px-empty">لا توجد طلبات مطابقة.</div>}
      </div>
    </section>
  );
}
