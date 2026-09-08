import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Ban,
  Check,
  ChefHat,
  ClipboardList,
  ExternalLink,
  Globe2,
  Inbox,
  Languages,
  LayoutDashboard,
  Loader2,
  LogOut,
  MapPin,
  Pause,
  PieChart,
  RefreshCw,
  Search,
  SearchX,
  ShieldCheck,
  Store,
  Timer,
  TrendingUp,
  TriangleAlert,
  Utensils,
  Wallet,
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

/* ---------------- meta ---------------- */

const TAB_META: Record<
  Tab,
  { label: string; icon: typeof Store; kicker: string; desc: string }
> = {
  overview: {
    label: "نظرة عامة",
    icon: LayoutDashboard,
    kicker: "تشغيل المنصة",
    desc: "المؤشرات اللحظية لكل المطاعم على الشبكة",
  },
  restaurants: {
    label: "المطاعم",
    icon: Store,
    kicker: "الشبكة",
    desc: "كل المتاجر النشطة على المنصة وملفات أدائها",
  },
  orders: {
    label: "الطلبات",
    icon: ClipboardList,
    kicker: "سجل مباشر",
    desc: "آخر الطلبات الواردة عبر كل المتاجر",
  },
};

const NAV_ORDER: Tab[] = ["overview", "restaurants", "orders"];

const TERMINAL = new Set(["completed", "cancelled"]);
const AR_DIGITS = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
const idxAr = (n: number) =>
  String(n)
    .padStart(2, "٠")
    .replace(/\d/g, (d) => AR_DIGITS[Number(d)]);

const num = (n: number) => new Intl.NumberFormat("ar-SY").format(n);
const orderTotal = (n: number) => formatSyp(n);
const dt = (iso: string) =>
  new Date(iso).toLocaleString("ar-SY", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
const hm = (iso: string) =>
  new Date(iso).toLocaleString("ar-SY", { hour: "2-digit", minute: "2-digit" });

const statusLabel = (s: string) =>
  statusLabels[s as keyof typeof statusLabels] ?? s;

const ACCEPT = {
  open: { label: "مفتوح", icon: Check, cls: "is-open" },
  paused: { label: "متوقف مؤقتاً", icon: Pause, cls: "is-paused" },
  closed: { label: "مغلق", icon: Ban, cls: "is-closed" },
} as const;

const MIX_SEGS = [
  { key: "active", label: "قيد التشغيل", color: "var(--red)" },
  { key: "completed", label: "مكتملة", color: "var(--teal-2)" },
  { key: "cancelled", label: "ملغية", color: "var(--gray)" },
] as const;

const payLabel = (status: string) => {
  if (status === "verified") return "موثّق";
  if (status === "rejected") return "مرفوض";
  if (status === "refunded") return "مسترد";
  return "معلّق";
};

const pillTone = (status: string) => {
  if (status === "completed") return "is-done";
  if (status === "cancelled") return "is-muted";
  if (status === "received") return "is-live";
  if (status === "out-for-delivery") return "is-go";
  return "is-work";
};
const payTone = (status: string) => {
  if (status === "verified") return "is-done";
  if (status === "rejected" || status === "refunded") return "is-bad";
  return "is-wait";
};

const monoInitial = (r: RestaurantStat) =>
  (r.nameAr || r.nameEn || "؟").trim()[0];

/* ---------------- page ---------------- */

export default function PlatformPage() {
  const { authReady, platformAdmin, staffEmail, signOut } = useAuth();
  const { dir, language, toggleLanguage } = useUI();
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
    return <AuthSplash dir={dir} />;
  }
  if (!platformAdmin) {
    return <Navigate to="/admin" replace />;
  }

  const meta = TAB_META[tab];
  const MetaIcon = meta.icon;

  const restaurants = overview?.restaurants ?? [];
  const byRevenue = useMemo(
    () => [...restaurants].sort((a, b) => b.revenueSyp - a.revenueSyp),
    [restaurants],
  );
  const maxRevenue = Math.max(1, ...byRevenue.map((r) => r.revenueSyp));
  const maxOrders = Math.max(1, ...restaurants.map((r) => r.orderCount));
  const recent = orders.slice(0, 6);
  const filteredOrders = useMemo(() => {
    if (!query) return orders;
    const q = query.toLowerCase();
    return orders.filter(
      (o) =>
        String(o.order_number).includes(q) ||
        o.restaurant_name.toLowerCase().includes(q) ||
        o.customer_name.toLowerCase().includes(q) ||
        o.restaurant_slug.toLowerCase().includes(q),
    );
  }, [orders, query]);
  const openCount = restaurants.filter((r) => r.acceptanceState === "open").length;
  const pausedCount = restaurants.filter((r) => r.acceptanceState === "paused").length;
  const closedCount = restaurants.filter((r) => r.acceptanceState === "closed").length;
  const lastSync = overview?.generatedAt ? new Date(overview.generatedAt) : null;

  const go = (slug: string) => navigate(`/admin/${slug}`);
  const doSignOut = () => void signOut().then(() => navigate("/"));

  return (
    <div className="px" dir={dir}>
      <a className="px-skip" href="#px-main">
        تخطَّ إلى المحتوى
      </a>

      <Sidebar
        tab={tab}
        onTab={setTab}
        ordersCount={orders.length}
        restaurants={restaurants}
        openCount={openCount}
        pausedCount={pausedCount}
        closedCount={closedCount}
        staffEmail={staffEmail}
        onSite={() => navigate("/")}
        onAdmin={() => navigate("/admin")}
        onSignOut={doSignOut}
      />

      <div className="px-stage">
        <div className="px-stage__inner">
          <MobileTopBar
            language={language}
            onToggleLanguage={toggleLanguage}
            onRefresh={() => void load()}
            refreshing={refreshing}
            onSite={() => navigate("/")}
            onSignOut={doSignOut}
          />

          <PageHeader
            kicker={meta.kicker}
            icon={MetaIcon}
            title={meta.label}
            desc={meta.desc}
            language={language}
            refreshing={refreshing}
            lastSync={lastSync}
            onToggleLanguage={toggleLanguage}
            onRefresh={() => void load()}
          />

          <main className="px-main" id="px-main" tabIndex={-1}>
            {loading ? (
              <ContentSkeleton />
            ) : error ? (
              <ErrorPanel message={error} onRetry={() => void load()} />
            ) : tab === "overview" ? (
              <OverviewView
                overview={overview}
                byRevenue={byRevenue}
                maxRevenue={maxRevenue}
                orders={orders}
                recent={recent}
                openCount={openCount}
                pausedCount={pausedCount}
                closedCount={closedCount}
                onOpen={go}
                onAllOrders={() => setTab("orders")}
              />
            ) : tab === "restaurants" ? (
              <RestaurantsView
                restaurants={restaurants}
                openCount={openCount}
                pausedCount={pausedCount}
                closedCount={closedCount}
                maxOrders={maxOrders}
                onOpen={go}
              />
            ) : (
              <OrdersView
                orders={filteredOrders}
                totalOrders={orders.length}
                query={query}
                setQuery={setQuery}
                onOpen={go}
              />
            )}
          </main>

          <footer className="px-stage__foot">
            <span className="px-stage__foot-mark" aria-hidden />
            <span>منصة سيريان كيو آر · جميع المتاجر تعمل ضمن شبكة واحدة</span>
          </footer>
        </div>
      </div>

      <MobileTabBar tab={tab} onTab={setTab} ordersCount={orders.length} />
    </div>
  );
}

/* ================= shell pieces ================= */

function BrandSeal({ large = false }: { large?: boolean }) {
  return (
    <span className={`px-seal${large ? " is-large" : ""}`} aria-hidden>
      <Utensils />
    </span>
  );
}

function Sidebar({
  tab,
  onTab,
  ordersCount,
  restaurants,
  openCount,
  pausedCount,
  closedCount,
  staffEmail,
  onSite,
  onAdmin,
  onSignOut,
}: {
  tab: Tab;
  onTab: (t: Tab) => void;
  ordersCount: number;
  restaurants: RestaurantStat[];
  openCount: number;
  pausedCount: number;
  closedCount: number;
  staffEmail: string;
  onSite: () => void;
  onAdmin: () => void;
  onSignOut: () => void;
}) {
  return (
    <aside className="px-sidebar" aria-label="القائمة الرئيسية">
      <div className="px-sidebar__scroll">
        <div className="px-brand">
          <BrandSeal />
          <div className="px-brand__txt">
            <b>SYRIAN QR</b>
            <small>لوحة المنصة</small>
          </div>
        </div>

        <nav className="px-nav" aria-label="أقسام المنصة">
          <span className="px-nav__label">أقسام المنصة</span>
          {NAV_ORDER.map((key) => {
            const Icon = TAB_META[key].icon;
            const active = tab === key;
            return (
              <button
                type="button"
                key={key}
                className={`px-nav__item${active ? " is-active" : ""}`}
                onClick={() => onTab(key)}
                aria-current={active ? "page" : undefined}
              >
                <span className="px-nav__ico">
                  <Icon aria-hidden />
                </span>
                <span className="px-nav__txt">{TAB_META[key].label}</span>
                {key === "orders" && ordersCount > 0 && (
                  <span className="px-nav__count px-tnum">{num(ordersCount)}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="px-sidebar__net">
          <span className="px-sidebar__net-head">
            <Activity aria-hidden />
            الشبكة الآن
          </span>
          <div className="px-sidebar__net-row">
            <span>
              <i className="is-open" aria-hidden />
              {num(openCount)} مفتوح
            </span>
            <span>
              <i className="is-paused" aria-hidden />
              {num(pausedCount)}
            </span>
            <span>
              <i className="is-closed" aria-hidden />
              {num(closedCount)}
            </span>
          </div>
          <div className="px-sidebar__net-bar" aria-hidden>
            {restaurants.length > 0 && (
              <>
                <i
                  className="seg-open"
                  style={{ width: `${(openCount / restaurants.length) * 100}%` }}
                />
                <i
                  className="seg-paused"
                  style={{ width: `${(pausedCount / restaurants.length) * 100}%` }}
                />
                <i
                  className="seg-closed"
                  style={{ width: `${(closedCount / restaurants.length) * 100}%` }}
                />
              </>
            )}
          </div>
          <span className="px-sidebar__net-foot">
            {num(restaurants.length)} متجراً على المنصة
          </span>
        </div>

        <div className="px-sidebar__bottom">
          <div className="px-user">
            <span className="px-user__avatar" aria-hidden>
              {staffEmail ? staffEmail[0].toUpperCase() : "م"}
            </span>
            <span className="px-user__meta">
              <b>{staffEmail || "مدير المنصة"}</b>
              <small>صلاحية كاملة على كل المتاجر</small>
            </span>
          </div>

          <div className="px-sbtnrow">
            <button type="button" className="px-sbtn" onClick={onSite}>
              <Globe2 aria-hidden />
              الموقع العام
            </button>
            <button type="button" className="px-sbtn" onClick={onAdmin}>
              <ShieldCheck aria-hidden />
              مركز الإدارة
            </button>
          </div>

          <button type="button" className="px-sbtn px-sbtn--danger" onClick={onSignOut}>
            <LogOut aria-hidden />
            تسجيل الخروج
          </button>
        </div>
      </div>
    </aside>
  );
}

function MobileTopBar({
  language,
  onToggleLanguage,
  onRefresh,
  refreshing,
  onSite,
  onSignOut,
}: {
  language: "ar" | "en";
  onToggleLanguage: () => void;
  onRefresh: () => void;
  refreshing: boolean;
  onSite: () => void;
  onSignOut: () => void;
}) {
  return (
    <header className="px-rail">
      <div className="px-rail__brand">
        <BrandSeal />
        <span className="px-rail__word">
          <b>SYRIAN QR</b>
          <small>منصة</small>
        </span>
      </div>
      <span className="px-rail__spacer" aria-hidden />
      <span className="px-rail__live" title="التحديث المباشر مفعّل">
        <i aria-hidden />
        <span className="sr-only">مباشر</span>
      </span>
      <button
        type="button"
        className="px-ibtn"
        onClick={onToggleLanguage}
        aria-label="تغيير اللغة"
      >
        <Languages aria-hidden />
        <span className="px-ibtn__label">{language === "ar" ? "EN" : "عربي"}</span>
      </button>
      <button
        type="button"
        className="px-ibtn"
        onClick={onRefresh}
        aria-label="تحديث البيانات"
      >
        <RefreshCw aria-hidden className={refreshing ? "px-spin" : ""} />
      </button>
      <button type="button" className="px-ibtn" onClick={onSite} aria-label="الموقع العام">
        <Globe2 aria-hidden />
      </button>
      <button
        type="button"
        className="px-ibtn px-ibtn--out"
        onClick={onSignOut}
        aria-label="تسجيل الخروج"
      >
        <LogOut aria-hidden />
      </button>
    </header>
  );
}

function MobileTabBar({
  tab,
  onTab,
  ordersCount,
}: {
  tab: Tab;
  onTab: (t: Tab) => void;
  ordersCount: number;
}) {
  return (
    <nav className="px-tabbar" aria-label="أقسام المنصة">
      {NAV_ORDER.map((key) => {
        const Icon = TAB_META[key].icon;
        const active = tab === key;
        return (
          <button
            type="button"
            key={key}
            className={`px-tabbar__item${active ? " is-active" : ""}`}
            onClick={() => onTab(key)}
            aria-current={active ? "page" : undefined}
          >
            <span className="px-tabbar__ico">
              <Icon aria-hidden />
              {key === "orders" && ordersCount > 0 && (
                <i className="px-tabbar__badge px-tnum" aria-hidden>
                  {ordersCount > 99 ? "٩٩+" : num(ordersCount)}
                </i>
              )}
            </span>
            <span className="px-tabbar__label">{TAB_META[key].label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function PageHeader({
  kicker,
  icon: Icon,
  title,
  desc,
  language,
  refreshing,
  lastSync,
  onToggleLanguage,
  onRefresh,
}: {
  kicker: string;
  icon: typeof Store;
  title: string;
  desc: string;
  language: "ar" | "en";
  refreshing: boolean;
  lastSync: Date | null;
  onToggleLanguage: () => void;
  onRefresh: () => void;
}) {
  return (
    <header className="px-head">
      <div className="px-head__lead">
        <p className="px-eyebrow">
          <Icon aria-hidden />
          <span>{kicker}</span>
        </p>
        <h1>{title}</h1>
        <p className="px-head__desc">{desc}</p>
      </div>

      <div className="px-head__tools">
        <span className="px-live">
          <i aria-hidden />
          مباشر
          {lastSync && (
            <span className="px-live__time">
              {lastSync.toLocaleTimeString("ar-SY", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>
          )}
        </span>

        <button
          type="button"
          className="px-btn px-btn--ghost"
          onClick={onRefresh}
          disabled={refreshing}
        >
          <RefreshCw aria-hidden className={refreshing ? "px-spin" : ""} />
          {refreshing ? "جارٍ التحديث…" : "تحديث"}
        </button>

        <div className="px-lang" role="group" aria-label="اللغة">
          <button
            type="button"
            className={`px-lang__opt${language === "ar" ? " is-on" : ""}`}
            onClick={onToggleLanguage}
            aria-pressed={language === "ar"}
            disabled={language === "ar"}
          >
            عربي
          </button>
          <button
            type="button"
            className={`px-lang__opt${language === "en" ? " is-on" : ""}`}
            onClick={onToggleLanguage}
            aria-pressed={language === "en"}
            disabled={language === "en"}
          >
            EN
          </button>
        </div>
      </div>
    </header>
  );
}

/* ================= shared editorial card head ================= */

function CardHead({
  kicker,
  title,
  id,
  sub,
  mark,
  extra,
}: {
  kicker: string;
  title: string;
  id?: string;
  sub?: string;
  mark?: ReactNode;
  extra?: ReactNode;
}) {
  return (
    <header className="px-card__head">
      <div className="px-card__title">
        <span className="px-kicker">{kicker}</span>
        <h2 id={id}>{title}</h2>
        {sub && <p>{sub}</p>}
      </div>
      <div className="px-card__headside">
        {extra}
        {mark && (
          <span className="px-card__mark" aria-hidden>
            {mark}
          </span>
        )}
      </div>
    </header>
  );
}

/* ================= Overview ================= */

function OverviewView({
  overview,
  byRevenue,
  maxRevenue,
  orders,
  recent,
  openCount,
  pausedCount,
  closedCount,
  onOpen,
  onAllOrders,
}: {
  overview: PlatformOverview | null;
  byRevenue: RestaurantStat[];
  maxRevenue: number;
  orders: PlatformOrder[];
  recent: PlatformOrder[];
  openCount: number;
  pausedCount: number;
  closedCount: number;
  onOpen: (slug: string) => void;
  onAllOrders: () => void;
}) {
  if (!overview) return null;
  const { totals } = overview;
  const activeShare = totals.orders
    ? Math.round((totals.activeOrders / totals.orders) * 100)
    : 0;

  return (
    <div className="px-view">
      <h2 className="sr-only">مؤشرات المنصة اللحظية</h2>
      <section className="px-kpis" aria-label="مؤشرات المنصة">
        <KpiPlate
          index={1}
          tone="hero"
          icon={Wallet}
          label="إجمالي المبيعات"
          value={orderTotal(totals.revenueSyp)}
          hint="قيمة الطلبات غير الملغاة"
        />
        <KpiPlate
          index={2}
          tone="teal"
          icon={ClipboardList}
          label="إجمالي الطلبات"
          value={num(totals.orders)}
          hint={`${num(totals.restaurants)} ${
            totals.restaurants === 1 ? "مطعم مفعّل" : "مطاعم مفعّلة"
          }`}
        />
        <KpiPlate
          index={3}
          tone="yellow"
          icon={Timer}
          label="قيد التشغيل"
          value={num(totals.activeOrders)}
          hint={activeShare ? `${num(activeShare)}٪ من إجمالي الطلبات` : "بانتظار الطلبات"}
        />
        <KpiPlate
          index={4}
          tone="red"
          icon={Store}
          label="المطاعم"
          value={num(totals.restaurants)}
          hint={`${num(openCount)} مفتوح · ${num(pausedCount)} متوقف · ${num(closedCount)} مغلق`}
        />
      </section>

      {byRevenue.length === 0 ? (
        <section className="px-card px-empty-card">
          <VoidState
            icon={Store}
            title="لا مطاعم مفعّلة على المنصة بعد"
            text="ما إن تفعّل أي متجر عبر مركز الإدارة ستبدأ المؤشرات بالظهور هنا لحظياً."
          />
        </section>
      ) : (
        <div className="px-dashgrid">
          <section className="px-dashgrid__main">
            <RankPanel rows={byRevenue} maxRevenue={maxRevenue} onOpen={onOpen} />
          </section>
          <aside className="px-dashgrid__rail" aria-label="نظرة جانبية">
            <MixPanel orders={orders} />
            <FeedPanel rows={recent} onOpen={onOpen} onAllOrders={onAllOrders} />
          </aside>
        </div>
      )}
    </div>
  );
}

function KpiPlate({
  index,
  tone = "",
  icon: Icon,
  label,
  value,
  hint,
}: {
  index: number;
  tone?: "hero" | "teal" | "yellow" | "red" | "";
  icon: typeof Store;
  label: string;
  value: string;
  hint: string;
}) {
  const cls = ["px-kpi"];
  if (tone) cls.push(`tone-${tone}`);
  return (
    <article className={cls.join(" ")}>
      <div className="px-kpi__top">
        <span className="px-kpi__idx" aria-hidden>
          {idxAr(index)}
        </span>
        <span className="px-kpi__tag">
          <Icon aria-hidden />
          <span>{label}</span>
        </span>
      </div>
      <strong className="px-kpi__value px-tnum">{value}</strong>
      <p className="px-kpi__hint">
        <i aria-hidden />
        {hint}
      </p>
    </article>
  );
}

function RankPanel({
  rows,
  maxRevenue,
  onOpen,
}: {
  rows: RestaurantStat[];
  maxRevenue: number;
  onOpen: (slug: string) => void;
}) {
  const best = rows[0];
  return (
    <section className="px-card px-rankcard" aria-labelledby="rank-title">
      <CardHead
        kicker="الأداء المالي"
        title="ترتيب المتاجر بالإيرادات"
        id="rank-title"
        sub="حسب قيمة الطلبات غير الملغاة عبر كل المتاجر"
        mark={<TrendingUp />}
        extra={
          best && (
            <button
              type="button"
              className="px-btn px-btn--ghost px-rankcard__best"
              onClick={() => onOpen(best.slug)}
            >
              <span className="px-rankcard__best-dot" style={{ "--c1": best.accent } as CSSProperties} aria-hidden />
              {best.nameAr}
              <ArrowUpRight aria-hidden />
              <span className="sr-only">، افتح لوحة {best.nameAr}</span>
            </button>
          )
        }
      />
      <ol className="px-ranks">
        {rows.map((r, i) => (
          <li key={r.id}>
            <RankRow
              r={r}
              i={i}
              share={Math.max(3, (r.revenueSyp / maxRevenue) * 100)}
              onOpen={onOpen}
            />
          </li>
        ))}
      </ol>
    </section>
  );
}

function RankRow({
  r,
  i,
  share,
  onOpen,
}: {
  r: RestaurantStat;
  i: number;
  share: number;
  onOpen: (slug: string) => void;
}) {
  const meta = ACCEPT[r.acceptanceState];
  const StateIcon = meta.icon;
  return (
    <button
      type="button"
      className={`px-rank${i === 0 ? " is-leader" : ""}`}
      onClick={() => onOpen(r.slug)}
      style={{ "--c1": r.accent } as CSSProperties}
    >
      <span className="px-rank__seat">
        <b className={`px-rank__num${i < 3 ? " is-podium" : ""}`} aria-hidden>
          {idxAr(i + 1)}
        </b>
        {i === 0 && <em className="px-rank__crown" aria-hidden />}
      </span>

      <span className="px-rank__id">
        <span className="px-rank__mono" aria-hidden>
          {monoInitial(r)}
        </span>
        <span className="px-rank__meta">
          <b>{r.nameAr}</b>
          <small>
            <MapPin aria-hidden />
            {r.city}
            {r.neighborhood ? ` · ${r.neighborhood}` : ""}
          </small>
        </span>
      </span>

      <span className="px-rank__bar" aria-hidden>
        <i style={{ width: `${share}%` }} />
      </span>

      <span className="px-rank__val">
        <strong className="px-tnum">{orderTotal(r.revenueSyp)}</strong>
        <small>
          <span className="px-tnum">{num(r.orderCount)} طلباً</span>
          <span className="px-rank__state">
            <StateIcon aria-hidden />
            <span className={`px-dot ${meta.cls}`} aria-hidden />
            {meta.label}
          </span>
        </small>
      </span>

      <ArrowUpRight className="px-rank__go" aria-hidden />
      <span className="sr-only">، افتح لوحة {r.nameAr}</span>
    </button>
  );
}

function MixPanel({ orders }: { orders: PlatformOrder[] }) {
  const mix = useMemo(() => {
    const counts = { active: 0, completed: 0, cancelled: 0 };
    for (const o of orders) {
      if (o.status === "completed") counts.completed += 1;
      else if (o.status === "cancelled") counts.cancelled += 1;
      else counts.active += 1;
    }
    return counts;
  }, [orders]);

  const total = orders.length;
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);

  const parts = MIX_SEGS.map((s, i) => {
    const frac = total > 0 ? mix[s.key] / total : 0;
    const from =
      i === 0 ? 0 : MIX_SEGS.slice(0, i).reduce((a, x) => a + (total > 0 ? mix[x.key] / total : 0), 0);
    const to = i === MIX_SEGS.length - 1 ? 1 : from + frac;
    return { ...s, n: mix[s.key], from, to };
  });
  const gradient =
    total > 0
      ? `conic-gradient(${parts
          .map((s) => `${s.color} ${(s.from * 360).toFixed(2)}deg ${(s.to * 360).toFixed(2)}deg`)
          .join(", ")})`
      : "conic-gradient(var(--surface-3) 0deg 360deg)";

  return (
    <section className="px-card px-mix" aria-labelledby="mix-title">
      <CardHead
        kicker="الحالة اللحظية"
        title="مزيج الطلبات"
        id="mix-title"
        mark={<PieChart />}
      />
      <div className="px-mix__body">
        <div
          className={`px-donut${total === 0 ? " is-empty" : ""}`}
          role="img"
          aria-label={`${num(total)} ${total === 1 ? "طلب" : "طلباً"}`}
        >
          <span className="px-donut__ring" style={{ background: gradient }} aria-hidden>
            <span className="px-donut__hole">
              <b className="px-tnum">{num(total)}</b>
              <small>طلب</small>
            </span>
          </span>
        </div>
        <ul className="px-mix__legend">
          {MIX_SEGS.map((s) => (
            <li key={s.key}>
              <i style={{ background: s.color }} aria-hidden />
              <span>{s.label}</span>
              <b className="px-tnum">{num(mix[s.key])}</b>
              <em className="px-tnum">{num(pct(mix[s.key]))}٪</em>
            </li>
          ))}
        </ul>
      </div>
      {total > 0 && (
        <div className="px-mix__stack" aria-hidden>
          {MIX_SEGS.map((s) => (
            <i
              key={s.key}
              style={{ background: s.color, width: `${pct(mix[s.key])}%` }}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function FeedPanel({
  rows,
  onOpen,
  onAllOrders,
}: {
  rows: PlatformOrder[];
  onOpen: (slug: string) => void;
  onAllOrders: () => void;
}) {
  return (
    <section className="px-card px-feed" aria-labelledby="feed-title">
      <CardHead
        kicker="نشاط مباشر"
        title="آخر الطلبات"
        id="feed-title"
        extra={<span className="px-live px-live--sm"><i aria-hidden /> مباشر</span>}
        mark={<Activity />}
      />
      {rows.length === 0 ? (
        <div className="px-card__empty">
          <VoidState
            compact
            icon={Inbox}
            title="لا طلبات واردة بعد"
            text="أول طلب عبر أي متجر سيظهر هنا فوراً."
          />
        </div>
      ) : (
        <ol className="px-feed__rows">
          {rows.map((o) => (
            <li key={o.id}>
              <FeedRow o={o} onOpen={onOpen} />
            </li>
          ))}
        </ol>
      )}
      <footer className="px-card__foot">
        <button type="button" className="px-linkbtn" onClick={onAllOrders}>
          عرض سجل الطلبات كاملاً
          <ArrowRight className="px-forward" aria-hidden />
        </button>
      </footer>
    </section>
  );
}

function FeedRow({ o, onOpen }: { o: PlatformOrder; onOpen: (slug: string) => void }) {
  return (
    <button
      type="button"
      className="px-feedrow"
      onClick={() => onOpen(o.restaurant_slug)}
    >
      <span className="px-feedrow__time px-tnum">{hm(o.created_at)}</span>
      <span
        className="px-feedrow__accent"
        style={{ "--c1": o.accent_color ?? "var(--red)" } as CSSProperties}
        aria-hidden
      />
      <span className="px-feedrow__main">
        <b>
          <em className="px-feedrow__num px-tnum">#{o.order_number}</em>
          {o.restaurant_name}
        </b>
        <small>
          {modeLabels[o.mode]}
          {o.table_label ? ` · ${o.table_label}` : ""} · {o.customer_name || "زبون"} ·{" "}
          {dt(o.created_at)}
        </small>
      </span>
      <span className="px-feedrow__total px-tnum">{orderTotal(o.total_syp)}</span>
      <span className="sr-only">، افتح طلبات {o.restaurant_name}</span>
    </button>
  );
}

/* ================= Restaurants ================= */

function RestaurantsView({
  restaurants,
  openCount,
  pausedCount,
  closedCount,
  maxOrders,
  onOpen,
}: {
  restaurants: RestaurantStat[];
  openCount: number;
  pausedCount: number;
  closedCount: number;
  maxOrders: number;
  onOpen: (slug: string) => void;
}) {
  return (
    <div className="px-view">
      <section className="px-netbar" role="status" aria-label="حالة الشبكة">
        <span className="px-netbar__lead">
          <span className="px-netbar__lead-ico" aria-hidden>
            <Store />
          </span>
          <b className="px-tnum">{num(restaurants.length)}</b>
          <span>{restaurants.length === 1 ? "مطعم على الشبكة" : "مطاعم على الشبكة"}</span>
        </span>
        <span className="px-netbar__sep" aria-hidden />
        <span className="px-netbar__cell">
          <i className="px-dot is-open" aria-hidden />
          {num(openCount)} مفتوح الآن
        </span>
        <span className="px-netbar__cell">
          <i className="px-dot is-paused" aria-hidden />
          {num(pausedCount)} متوقف
        </span>
        <span className="px-netbar__cell">
          <i className="px-dot is-closed" aria-hidden />
          {num(closedCount)} مغلق
        </span>
        <span className="px-netbar__note">
          مرتبة حسب الإيرادات · <span className="px-netbar__note-live"><i aria-hidden /> مباشر</span>
        </span>
      </section>

      {restaurants.length === 0 ? (
        <section className="px-card px-empty-card">
          <VoidState
            icon={Store}
            title="لا مطاعم مفعّلة بعد"
            text="ستظهر هنا بطاقات كل المتاجر المفعلة على المنصة مع أرقام أدائها."
          />
        </section>
      ) : (
        <div className="px-rsts">
          {restaurants.map((r, i) => (
            <RestaurantCard
              key={r.id}
              r={r}
              index={i}
              orderShare={Math.max(3, (r.orderCount / maxOrders) * 100)}
              onOpen={onOpen}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function RestaurantCard({
  r,
  index,
  orderShare,
  onOpen,
}: {
  r: RestaurantStat;
  index: number;
  orderShare: number;
  onOpen: (slug: string) => void;
}) {
  const meta = ACCEPT[r.acceptanceState];
  const StateIcon = meta.icon;
  const breakdown = Object.entries(r.statusBreakdown)
    .map(([s, n]) => ({ s, n }))
    .sort((a, b) => b.n - a.n);

  return (
    <article
      className={`px-rst${r.acceptanceState !== "open" ? " is-muted" : ""}`}
      style={{ "--c1": r.accent } as CSSProperties}
    >
      <span className="px-rst__idx" aria-hidden>
        {idxAr(index + 1)}
      </span>

      <header className="px-rst__top">
        <span className="px-rst__seal" aria-hidden>
          {monoInitial(r)}
        </span>
        <span className="px-rst__name">
          <b>{r.nameAr}</b>
          <small>
            <MapPin aria-hidden />
            {r.city}
            {r.neighborhood ? ` · ${r.neighborhood}` : ""}
          </small>
        </span>
        <span className={`px-state ${meta.cls}`}>
          <StateIcon aria-hidden />
          {meta.label}
        </span>
      </header>

      <div className="px-rst__plate">
        <span className="px-rst__plate-top">
          <span>الإيراد الكلي</span>
          <ChefHat aria-hidden />
        </span>
        <strong className="px-rst__revenue px-tnum">{orderTotal(r.revenueSyp)}</strong>
        <span className="px-rst__plate-sub">
          {num(r.orderCount)} {r.orderCount === 1 ? "طلب" : "طلبات"} ·{" "}
          {r.lastOrderAt ? `آخر طلب ${dt(r.lastOrderAt)}` : "بانتظار أول طلب"}
        </span>
      </div>

      <div className="px-rst__stats">
        <div className="px-rst__stat">
          <b className="px-tnum">{num(r.orderCount)}</b>
          <small>إجمالي</small>
        </div>
        <div className="px-rst__stat">
          <b className="px-tnum">{num(r.activeOrders)}</b>
          <small>قيد التشغيل</small>
        </div>
        <div className="px-rst__stat">
          <b className="px-tnum">{num(r.tableCount)}</b>
          <small>طاولة</small>
        </div>
        <div className="px-rst__stat">
          <b className="px-tnum">{num(r.staffCount)}</b>
          <small>موظف</small>
        </div>
      </div>

      <div className="px-rst__break">
        {breakdown.length === 0 ? (
          <span className="px-chip px-chip--quiet">بانتظار أول طلب</span>
        ) : (
          breakdown.slice(0, 4).map(({ s, n }) => (
            <span className="px-chip" key={s}>
              {statusLabel(s)}
              <b className="px-tnum">{num(n)}</b>
            </span>
          ))
        )}
      </div>

      <div className="px-rst__share" aria-hidden>
        <i style={{ width: `${orderShare}%` }} />
      </div>

      <footer className="px-rst__foot">
        <span className="px-rst__scope">
          <span className="px-rst__scope-dot" aria-hidden />
          نصيب المنصة من الطلبات
        </span>
        <button type="button" className="px-btn px-btn--solid" onClick={() => onOpen(r.slug)}>
          لوحة المطعم
          <ArrowRight className="px-forward" aria-hidden />
        </button>
      </footer>
    </article>
  );
}

/* ================= Orders ================= */

const STATUS_FILTERS = [
  { key: "all", label: "الكل" },
  { key: "active", label: "قيد التشغيل" },
  { key: "completed", label: "مكتملة" },
  { key: "cancelled", label: "ملغية" },
] as const;
type OrderFilter = (typeof STATUS_FILTERS)[number]["key"];

const matchesFilter = (o: PlatformOrder, f: OrderFilter) => {
  if (f === "all") return true;
  if (f === "active") return !TERMINAL.has(o.status);
  return o.status === f;
};

function OrdersView({
  orders,
  totalOrders,
  query,
  setQuery,
  onOpen,
}: {
  orders: PlatformOrder[];
  totalOrders: number;
  query: string;
  setQuery: (q: string) => void;
  onOpen: (slug: string) => void;
}) {
  const [filter, setFilter] = useState<OrderFilter>("all");

  const counts = useMemo(
    () =>
      STATUS_FILTERS.reduce(
        (acc, f) => {
          acc[f.key] = orders.reduce((n, o) => n + (matchesFilter(o, f.key) ? 1 : 0), 0);
          return acc;
        },
        { all: 0, active: 0, completed: 0, cancelled: 0 } as Record<OrderFilter, number>,
      ),
    [orders],
  );

  const visible = orders.filter((o) => matchesFilter(o, filter));
  const scopeTotal = visible.reduce((s, o) => s + o.total_syp, 0);

  const clearFilters = () => {
    setFilter("all");
    setQuery("");
  };

  return (
    <div className="px-view">
      <section className="px-card px-ledger" aria-label="سجل الطلبات">
        <header className="px-ledger__head">
          <div className="px-search">
            <Search aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث برقم الطلب أو المطعم أو الزبون…"
              aria-label="البحث في الطلبات"
            />
            {query && (
              <button
                type="button"
                className="px-search__clear"
                onClick={() => setQuery("")}
                aria-label="مسح البحث"
              >
                <Ban aria-hidden />
              </button>
            )}
          </div>
          <div className="px-seg" role="group" aria-label="تصفية حسب الحالة">
            {STATUS_FILTERS.map((f) => (
              <button
                type="button"
                key={f.key}
                className={`px-seg__item${filter === f.key ? " is-on" : ""}`}
                onClick={() => setFilter(f.key)}
                aria-pressed={filter === f.key}
              >
                {f.label}
                <span className="px-tnum">{num(counts[f.key])}</span>
              </button>
            ))}
          </div>
        </header>

        {orders.length === 0 ? (
          <div className="px-card__empty">
            <VoidState
              icon={Inbox}
              title="لا طلبات واردة بعد"
              text="كل طلب يصدر من أي متجر على المنصة يظهر هنا فوراً. يُحدَّث السجل تلقائياً."
            />
          </div>
        ) : visible.length === 0 ? (
          <div className="px-card__empty">
            <VoidState
              icon={SearchX}
              title="لا نتائج مطابقة"
              text="جرّب تعديل كلمة البحث أو إعادة ضبط التصفية."
              action={
                <button type="button" className="px-btn px-btn--solid" onClick={clearFilters}>
                  إعادة ضبط الفلاتر
                </button>
              }
            />
          </div>
        ) : (
          <>
            <div className="px-tablewrap" tabIndex={0} aria-label="جدول الطلبات، مرّر أفقياً للاطلاع على الأعمدة">
              <table className="px-table">
                <caption className="sr-only">سجل الطلبات الواردة عبر المنصة</caption>
                <thead>
                  <tr>
                    <th scope="col">الطلب</th>
                    <th scope="col">المطعم</th>
                    <th scope="col">الزبون</th>
                    <th scope="col">النوع</th>
                    <th scope="col">الحالة</th>
                    <th scope="col">الدفع</th>
                    <th scope="col" className="px-table__num-col">الإجمالي</th>
                    <th scope="col">الوقت</th>
                    <th scope="col">
                      <span className="sr-only">فتح</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((o) => (
                    <OrderRow key={o.id} o={o} onOpen={onOpen} />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-ocards">
              {visible.map((o) => (
                <OrderCard key={o.id} o={o} onOpen={onOpen} />
              ))}
            </div>

            <footer className="px-ledger__foot">
              <span className="px-ledger__meta">
                يعرض <b className="px-tnum">{num(visible.length)}</b> من أصل{" "}
                <b className="px-tnum">{num(totalOrders)}</b>{" "}
                {totalOrders === 1 ? "طلب" : "طلباً"}
              </span>
              <span className="px-ledger__total">
                إجمالي المعروض
                <strong className="px-tnum">{orderTotal(scopeTotal)}</strong>
              </span>
              <span className="px-ledger__sync">
                <i aria-hidden />
                يُحدَّث تلقائياً كل ٣٠ ثانية
              </span>
            </footer>
          </>
        )}
      </section>
    </div>
  );
}

function OrderRow({ o, onOpen }: { o: PlatformOrder; onOpen: (slug: string) => void }) {
  return (
    <tr>
      <td>
        <span className="px-table__order">
          <b className="px-tnum">#{o.order_number}</b>
          <small>
            {o.item_count > 0 ? `${num(o.item_count)} صنف` : "طلب واحد"}
          </small>
        </span>
      </td>
      <td>
        <span className="px-rest">
          <i style={{ "--c1": o.accent_color ?? "var(--red)" } as CSSProperties} aria-hidden />
          {o.restaurant_name}
        </span>
      </td>
      <td>
        <span className="px-table__cust">
          {o.customer_name || "زبون"}
          {o.table_label && <small>{o.table_label}</small>}
        </span>
      </td>
      <td>
        <span className="px-badge px-badge--mode">{modeLabels[o.mode]}</span>
      </td>
      <td>
        <span className={`px-pill ${pillTone(o.status)}`}>
          <i aria-hidden />
          {statusLabel(o.status)}
        </span>
      </td>
      <td>
        <span className={`px-pill px-pill--pay ${payTone(o.payment_status)}`}>
          <i aria-hidden />
          {payLabel(o.payment_status)}
        </span>
      </td>
      <td className="px-table__total px-tnum">{orderTotal(o.total_syp)}</td>
      <td className="px-table__time">{dt(o.created_at)}</td>
      <td className="px-table__go">
        <button
          type="button"
          className="px-iconbtn"
          onClick={() => onOpen(o.restaurant_slug)}
          aria-label={`فتح لوحة ${o.restaurant_name}`}
          title="لوحة المطعم"
        >
          <ExternalLink aria-hidden />
        </button>
      </td>
    </tr>
  );
}

function OrderCard({ o, onOpen }: { o: PlatformOrder; onOpen: (slug: string) => void }) {
  return (
    <article
      className="px-ocard"
      style={{ "--c": o.accent_color ?? "var(--red)" } as CSSProperties}
    >
      <header className="px-ocard__top">
        <span className="px-ocard__num">
          <b className="px-tnum">#{o.order_number}</b>
          <small>
            <i aria-hidden />
            {o.restaurant_name}
          </small>
        </span>
        <time className="px-ocard__time">{dt(o.created_at)}</time>
      </header>

      <div className="px-ocard__who">
        <span className="px-ocard__who-main">
          <strong>{o.customer_name || "زبون"}</strong>
          {o.table_label && <small>{o.table_label}</small>}
        </span>
        <span className="px-ocard__items px-tnum">
          {o.item_count > 0 ? `${num(o.item_count)} صنف` : "طلب واحد"}
        </span>
      </div>

      <div className="px-ocard__tags">
        <span className="px-badge px-badge--mode">{modeLabels[o.mode]}</span>
        <span className={`px-pill ${pillTone(o.status)}`}>
          <i aria-hidden />
          {statusLabel(o.status)}
        </span>
        <span className={`px-pill px-pill--pay ${payTone(o.payment_status)}`}>
          <i aria-hidden />
          {payLabel(o.payment_status)}
        </span>
      </div>

      <footer className="px-ocard__foot">
        <span className="px-ocard__total">
          <small>الإجمالي</small>
          <strong className="px-tnum">{orderTotal(o.total_syp)}</strong>
        </span>
        <button
          type="button"
          className="px-btn px-btn--teal"
          onClick={() => onOpen(o.restaurant_slug)}
        >
          لوحة المطعم
          <ExternalLink aria-hidden />
        </button>
      </footer>
    </article>
  );
}

/* ================= states ================= */

function AuthSplash({ dir }: { dir: string }) {
  return (
    <div className="px px-splash" dir={dir}>
      <BrandSeal large />
      <div className="px-splash__brand">
        <b>SYRIAN QR</b>
        <small>لوحة المنصة</small>
      </div>
      <Loader2 className="px-splash__spinner" aria-hidden />
      <p>جارٍ التحقق من الجلسة…</p>
    </div>
  );
}

function ContentSkeleton() {
  return (
    <div className="px-ls" role="status" aria-label="جارٍ تحميل بيانات المنصة">
      <div className="px-ls__kpis">
        {[0, 1, 2, 3].map((i) => (
          <div className="px-ls__kpi" key={i}>
            <span className="px-ls__row">
              <i className="sk" />
              <i className="sk" />
            </span>
            <b className="sk" />
            <span className="px-ls__line sk" />
          </div>
        ))}
      </div>
      <div className="px-ls__split">
        <div className="px-ls__panel px-ls__panel--big">
          <span className="px-ls__eyebrow sk" />
          <span className="px-ls__title sk" />
          <span className="px-ls__sub sk" />
          <div className="px-ls__ranks">
            {[0, 1, 2, 3].map((i) => (
              <div className="px-ls__rank" key={i}>
                <i className="sk" />
                <i className="sk" />
                <i className="sk" />
                <i className="sk" />
              </div>
            ))}
          </div>
        </div>
        <div className="px-ls__side">
          <div className="px-ls__panel">
            <span className="px-ls__title sk" />
            <div className="px-ls__circle sk" />
            <span className="px-ls__line sk" />
          </div>
          <div className="px-ls__panel">
            <span className="px-ls__title sk" />
            {[0, 1, 2].map((i) => (
              <span className="px-ls__row px-ls__row--feed sk" key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ErrorPanel({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <section className="px-card px-error" role="alert" aria-labelledby="error-title">
      <span className="px-error__seal" aria-hidden>
        <span className="px-error__seal-ring" />
        <TriangleAlert />
      </span>
      <span className="px-kicker">خطأ في الاتصال</span>
      <h2 id="error-title">تعذّر تحميل بيانات المنصة</h2>
      <p className="px-error__msg">{message}</p>
      <div className="px-error__row">
        <button type="button" className="px-btn px-btn--solid" onClick={onRetry}>
          <RefreshCw aria-hidden />
          إعادة المحاولة
        </button>
        <span className="px-error__hint">ستُعاد المحاولة تلقائياً كل ٣٠ ثانية</span>
      </div>
    </section>
  );
}

function VoidState({
  icon: Icon,
  title,
  text,
  action,
  compact = false,
}: {
  icon: typeof Store;
  title: string;
  text: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`px-void${compact ? " is-compact" : ""}`}>
      <span className="px-void__mark" aria-hidden>
        <span className="px-void__ring" />
        <span className="px-void__dot" />
        <Icon />
      </span>
      <b>{title}</b>
      <p>{text}</p>
      {action && <div className="px-void__action">{action}</div>}
    </div>
  );
}
