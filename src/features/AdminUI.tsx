import "./admin.css";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import {
  Archive,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Banknote,
  BarChart3,
  BellRing,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock,
  Copy,
  Download,
  Flame,
  FileDown,
  LayoutDashboard,
  Leaf,
  Loader2,
  MapPin,
  MessageCircle,
  Package,
  Palette,
  Pencil,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBasket,
  Sparkles,
  Store,
  Trash2,
  Truck,
  UserPlus,
  Users,
  Utensils,
  UtensilsCrossed,
  Volume2,
  VolumeX,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import QRCode from "qrcode";
import { supabase } from "../supabase";
import MenuDesignStudio from "./MenuDesignStudio";
import {
  cafePath,
  formatSyp,
  formatUsd,
  images,
  modeLabels,
  readStored,
  statusLabels,
  tagLabels,
  writeStored,
  type AuditEntry,
  type BusinessHour,
  type CartLine,
  type DeliveryZone,
  type Item,
  type MenuCategory,
  type Mode,
  type OperationsState,
  type Option,
  type OptionGroup,
  type Order,
  type Restaurant,
  type RestaurantMembership,
  type RestaurantSettings,
  type RestaurantTable,
  type StaffMember,
  type Tag,
} from "../domain";

/* ============================================================================
   Shared local atoms & helpers (presentation only)
   ========================================================================== */

const MODE_ICON: Record<Mode, LucideIcon> = {
  "dine-in": Utensils,
  takeaway: ShoppingBasket,
  delivery: Truck,
};

const STATUS_ICON: Record<Order["status"], LucideIcon> = {
  received: BellRing,
  confirmed: Check,
  preparing: Flame,
  ready: Package,
  "out-for-delivery": Truck,
  completed: CheckCircle2,
  cancelled: X,
};

const fmtClock = (iso: string) =>
  new Date(iso).toLocaleTimeString("ar-SY", {
    hour: "2-digit",
    minute: "2-digit",
  });

const payStatusOf = (order: Order) =>
  order.paymentStatus === "verified"
    ? "متحقق"
    : order.paymentStatus === "rejected"
      ? "مرفوض"
      : order.paymentStatus === "refunded"
        ? "مسترد"
        : "بانتظار التحقق";

function StatusChip({
  status,
  compact,
}: {
  status: Order["status"];
  compact?: boolean;
}) {
  const Icon = STATUS_ICON[status];
  return (
    <span className={`adm-chip adm-chip--${status}${compact ? " adm-chip--sm" : ""}`}>
      <i className="adm-chip__dot" aria-hidden="true" />
      {statusLabels[status]}
      <Icon aria-hidden="true" />
    </span>
  );
}

function ModeChip({ mode }: { mode: Mode }) {
  const Icon = MODE_ICON[mode];
  return (
    <span className="adm-chip adm-chip--mode">
      <Icon aria-hidden="true" />
      {modeLabels[mode]}
    </span>
  );
}

function PayChip({ status }: { status: Order["paymentStatus"] }) {
  return (
    <span className={`adm-chip adm-chip--${status}`}>
      <i className="adm-chip__dot" aria-hidden="true" />
      {status === "verified"
        ? "متحقق"
        : status === "rejected"
          ? "مرفوض"
          : status === "refunded"
            ? "مسترد"
            : "بانتظار التحقق"}
    </span>
  );
}

function monogram(restaurant: Restaurant) {
  return restaurant.logo || restaurant.name.slice(0, 1);
}

function PageHead({
  kicker,
  title,
  lede,
  actions,
}: {
  kicker: string;
  title: string;
  lede?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="adm-hdr">
      <div className="adm-hdr__t">
        <span className="adm-kicker">{kicker}</span>
        <h2 className="adm-title">{title}</h2>
        {lede ? <p className="adm-lede">{lede}</p> : null}
      </div>
      {actions ? <div className="adm-actions">{actions}</div> : null}
    </header>
  );
}

function AdminEmpty({
  icon: Icon,
  title,
  copy,
  children,
  tone,
}: {
  icon: LucideIcon;
  title: string;
  copy?: string;
  children?: ReactNode;
  tone?: "dark";
}) {
  return (
    <div className={`adm-empty${tone ? " adm-empty--dark" : ""}`}>
      <span className="adm-empty__ico">
        <Icon aria-hidden="true" />
      </span>
      <h3>{title}</h3>
      {copy ? <p className="adm-empty__copy">{copy}</p> : null}
      {children}
    </div>
  );
}

function AdminAlert({
  tone,
  icon: Icon,
  children,
}: {
  tone: "err" | "ok";
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <div className={`adm-alert adm-alert--${tone}`} role="alert">
      <Icon aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

function AdmDialog({
  onClose,
  labelledBy,
  wide,
  narrow,
  children,
  footer,
}: {
  onClose: () => void;
  labelledBy: string;
  wide?: boolean;
  narrow?: boolean;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);
  const size = wide ? " modal--wide" : narrow ? " modal--narrow" : "";
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className={`modal adm-dialog${size}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          className="modal__close"
          onClick={onClose}
          aria-label="إغلاق"
        >
          <X aria-hidden="true" />
        </button>
        {children}
        {footer ? <div className="adm-dialog__foot">{footer}</div> : null}
      </div>
    </div>
  );
}

/* ============================================================================
   Staff authentication modal — entry-page dependency, presentation only.
   ========================================================================== */
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

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

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
        role="dialog"
        aria-modal="true"
        aria-labelledby="staff-auth-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="modal__close" onClick={onClose} aria-label="إغلاق">
          <X />
        </button>
        <span
          className="section-kicker"
          style={{ justifyContent: "center", marginTop: "6px" }}
        >
          دخول الموظفين
        </span>
        <h2 id="staff-auth-title">لوحة المطعم</h2>
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

/* ============================================================================
   AdminView — the restaurant operations workspace
   ========================================================================== */

type AdminTab =
  | "overview"
  | "orders"
  | "menu"
  | "tables"
  | "reports"
  | "operations"
  | "design"
  | "settings";

const TAB_ITEMS: {
  id: AdminTab;
  label: string;
  icon: LucideIcon;
}[] = [
  { id: "overview", label: "نظرة عامة", icon: LayoutDashboard },
  { id: "orders", label: "الطلبات", icon: ClipboardList },
  { id: "menu", label: "القائمة", icon: UtensilsCrossed },
  { id: "tables", label: "الطاولات و QR", icon: QrCode },
  { id: "reports", label: "التقارير", icon: BarChart3 },
  { id: "operations", label: "الفريق والتشغيل", icon: Users },
  { id: "design", label: "استوديو التصميم", icon: Palette },
  { id: "settings", label: "الإعدادات", icon: Settings },
];

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
  tab: AdminTab;
  setTab: (t: AdminTab) => void;
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
  const [statusFilter, setStatusFilter] = useState<"all" | Order["status"]>(
    "all",
  );
  const [orderQuery, setOrderQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(
    () => localStorage.getItem("sufra-order-sound") !== "off",
  );
  const [operationState, setOperationState] = useState<OperationsState | null>(
    null,
  );
  const previousOrderCount = useRef(orders.length);

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

  const membership = memberships.find(
    (entry) => entry.restaurantSlug === restaurant.id,
  );
  const canDesign =
    membership?.role === "owner" || membership?.role === "manager";
  const activeOrdersCount = orders.filter(
    (o) => !["completed", "cancelled"].includes(o.status),
  ).length;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const liveOrdersToday = orders.filter(
    (o) => new Date(o.createdAt) >= startOfToday,
  ).length;
  const liveNewOrders = orders.filter((o) => o.status === "received").length;
  const todayLabel = new Date().toLocaleDateString("ar-SY", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const roleLabel =
    membership?.role === "owner"
      ? "المالك"
      : membership?.role === "manager"
        ? "مدير"
        : membership?.role === "cashier"
          ? "كاشير"
          : membership?.role === "kitchen"
            ? "المطبخ"
            : "موظف";
  const activeCountFor = (t: AdminTab) =>
    t === "orders"
      ? activeOrdersCount
      : t === "menu"
        ? restaurant.items.length
        : 0;

  return (
    <div className="adm">
      {/* ---- Deep-teal command mast: identity + live status + switch ---- */}
      <header className="adm-mast">
        <div className="adm-mast__in">
          <div className="adm-mast__id">
            <span className="adm-seal" aria-hidden="true">
              {monogram(restaurant)}
            </span>
            <div className="adm-mast__id__txt">
              <span className="adm-kicker adm-kicker--on-dark">
                دفتر التشغيل · {todayLabel}
              </span>
              <h1 className="adm-mast__name">{restaurant.name}</h1>
              <div className="adm-mast__meta">
                {restaurant.city || restaurant.neighborhood ? (
                  <span>
                    <MapPin aria-hidden="true" />
                    {[restaurant.neighborhood, restaurant.city]
                      .filter(Boolean)
                      .join("، ")}
                  </span>
                ) : null}
                <span className="adm-live">
                  <i className="adm-live__dot" aria-hidden="true" />
                  بث مباشر · مستلم الطلبات الآن
                </span>
              </div>
            </div>
          </div>

          <div className="adm-mast__tools">
            <div
              className="adm-maststat"
              role="group"
              aria-label="إيقاع التشغيل الآن"
            >
              <span className="adm-maststat__cell">
                <strong className="adm-num">{liveOrdersToday}</strong>
                <small>طلباً اليوم</small>
              </span>
              <span className="adm-maststat__sep" aria-hidden="true" />
              <span className="adm-maststat__cell adm-maststat__cell--live">
                <strong className="adm-num">{activeOrdersCount}</strong>
                <small>يعمل الآن</small>
                {liveNewOrders > 0 ? (
                  <b className="adm-maststat__ping adm-num">
                    {liveNewOrders} جديد
                  </b>
                ) : null}
              </span>
            </div>
            <div className="adm-whoswitch">
              <div className="adm-user">
                <span className="adm-user__avatar" aria-hidden="true">
                  {(membership?.displayName || staffEmail).slice(0, 1)}
                </span>
                <span className="adm-user__txt">
                  <strong>{membership?.displayName || staffEmail}</strong>
                  <small>
                    <CheckCircle2 aria-hidden="true" />
                    {roleLabel} · متصل
                  </small>
                </span>
              </div>
              <label className="adm-switchsel">
                <Store aria-hidden="true" />
                <span className="sr-only">تبديل المطعم</span>
                <select
                  value={restaurant.id}
                  onChange={(event) => onSwitch(event.target.value)}
                  aria-label="تبديل المطعم"
                >
                  {memberships.map((entry) => (
                    <option
                      key={entry.restaurantId}
                      value={entry.restaurantSlug}
                    >
                      {entry.restaurantName}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    insetInlineEnd: 12,
                    width: 15,
                    height: 15,
                    color: "rgba(255,255,255,0.7)",
                    pointerEvents: "none",
                  }}
                />
              </label>
            </div>
          </div>
        </div>
      </header>

      {/* ---- Section rail ---- */}
      <nav className="adm-nav" aria-label="فهرس مساحة العمل">
        <div className="adm-nav__in">
          {TAB_ITEMS.map((item) => {
            const Icon = item.icon;
            const count = activeCountFor(item.id);
            return (
              <button
                key={item.id}
                className={`adm-nav__item${tab === item.id ? " is-on" : ""}`}
                onClick={() => setTab(item.id)}
                aria-current={tab === item.id ? "page" : undefined}
                aria-label={item.label}
              >
                <Icon aria-hidden="true" />
                <span className="adm-nav__label">{item.label}</span>
                {count > 0 ? (
                  <b className="adm-nav__badge adm-num">{count}</b>
                ) : null}
              </button>
            );
          })}
        </div>
      </nav>

      {/* ---- Content ---- */}
      <main className="adm-body">
        <div className="adm-body__in">
          {tab === "overview" && (
            <AdminOverview
              orders={orders}
              settings={settings}
              onOpenOrders={() => setTab("orders")}
              onOpenOrder={(order) => {
                setTab("orders");
                setSelectedOrder(order);
              }}
            />
          )}

          {tab === "orders" && (
            <>
              <PageHead
                kicker="مكتب الطلبات / حيّ التدفق"
                title="خط إنتاج الطلبات"
                lede="الطلبات تتحرك من الاستلام حتى التسليم. اضغط على أي بطاقة لفتح ملف الخدمة الكامل."
                actions={
                  <>
                    <span className="adm-live">
                      <i className="adm-live__dot" aria-hidden="true" />
                      متصل الآن
                    </span>
                  </>
                }
              />

              <div className="adm-toolbar">
                <label className="adm-search">
                  <Search aria-hidden="true" />
                  <span className="sr-only">البحث في الطلبات</span>
                  <input
                    value={orderQuery}
                    onChange={(event) => setOrderQuery(event.target.value)}
                    placeholder="رقم الطلب، اسم العميل، أو الهاتف"
                  />
                </label>

                <div className="adm-seg" role="group" aria-label="تصفية حسب القناة">
                  {(
                    [
                      ["all", "الكل"],
                      ["dine-in", "في المطعم"],
                      ["takeaway", "سفري"],
                      ["delivery", "توصيل"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      className={`adm-seg__btn${adminFilter === value ? " is-on" : ""}`}
                      onClick={() => setAdminFilter(value as "all" | Mode)}
                    >
                      {value !== "all" ? (
                        (() => {
                          const Icon = MODE_ICON[value as Mode];
                          return <Icon aria-hidden="true" />;
                        })()
                      ) : null}
                      {label}
                    </button>
                  ))}
                </div>

                <label className="adm-field" style={{ minWidth: 170 }}>
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
                </label>

                <button
                  className="adm-btn adm-btn--soft adm-btn--sm"
                  onClick={() => setSoundEnabled((value) => !value)}
                >
                  {soundEnabled ? (
                    <Volume2 aria-hidden="true" />
                  ) : (
                    <VolumeX aria-hidden="true" />
                  )}
                  {soundEnabled ? "التنبيهات مفعلة" : "التنبيهات متوقفة"}
                </button>
              </div>

              <div className="adm-kb">
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
                ).map((status) => {
                  const columnOrders = visibleOrders(orders, {
                    mode: adminFilter,
                    status: statusFilter,
                    query: orderQuery,
                  }).filter((o) => o.status === status);
                  const Icon = STATUS_ICON[status];
                  return (
                    <section
                      className="adm-kb__col"
                      key={status}
                      aria-label={status === "received" ? "طلبات جديدة" : statusLabels[status]}
                    >
                      <div
                        className={`adm-kb__hd${status === "cancelled" ? " adm-kb__hd--cancelled" : ""}`}
                        style={
                          {
                            "--kb-c":
                              status === "received"
                                ? "var(--ink)"
                                : status === "confirmed"
                                  ? "var(--teal)"
                                  : status === "preparing"
                                    ? "var(--teal-2)"
                                    : status === "ready"
                                      ? "var(--teal-3)"
                                      : status === "completed"
                                        ? "var(--success)"
                                        : status === "cancelled"
                                          ? "var(--danger)"
                                          : "var(--teal)",
                          } as CSSProperties
                        }
                      >
                        <h3 className="adm-kb__title">
                          <Icon aria-hidden="true" />
                          {status === "received" ? "طلبات جديدة" : statusLabels[status]}
                        </h3>
                        <b className="adm-kb__count adm-num">
                          {columnOrders.length}
                        </b>
                      </div>
                      <div className="adm-kb__stack">
                        {columnOrders.length === 0 && (
                          <div className="adm-kb__empty">
                            <CheckCircle2 aria-hidden="true" />
                            {status === "cancelled"
                              ? "لا ملغي اليوم"
                              : status === "completed"
                                ? "لا مكتملة بعد"
                                : "لا توجد طلبات"}
                          </div>
                        )}
                        {columnOrders.map((order) => (
                          <OrderCard
                            key={order.id}
                            order={order}
                            onStatus={onStatus}
                            onWhatsApp={onWhatsApp}
                            onOpen={() => setSelectedOrder(order)}
                          />
                        ))}
                      </div>
                    </section>
                  );
                })}
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

          {tab === "design" && (
            <MenuDesignStudio
              restaurant={restaurant}
              restaurantDatabaseId={restaurantDatabaseId}
              categories={categories}
              canEdit={canDesign}
            />
          )}

          {tab === "settings" && (
            <SettingsPanel settings={settings} onChange={onSettingsChange} />
          )}
        </div>
      </main>
    </div>
  );
}

function visibleOrders(
  orders: Order[],
  filters: {
    mode: "all" | Mode;
    status: "all" | Order["status"];
    query: string;
  },
) {
  const query = filters.query.trim().toLowerCase();
  return orders.filter(
    (o) =>
      (filters.mode === "all" || o.mode === filters.mode) &&
      (filters.status === "all" || o.status === filters.status) &&
      (!query ||
        `${o.id} ${o.customer} ${o.phone} ${o.table} ${o.address}`
          .toLowerCase()
          .includes(query)),
  );
}

/* ============================================================================
   AdminOverview — order command center
   ========================================================================== */

function AdminOverview({
  orders,
  settings,
  onOpenOrders,
  onOpenOrder,
}: {
  orders: Order[];
  settings: RestaurantSettings;
  onOpenOrders: () => void;
  onOpenOrder: (order: Order) => void;
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

  const queueOrders = orders
    .filter((o) => !["completed", "cancelled"].includes(o.status))
    .slice(0, 10);

  const hourBuckets = Array.from({ length: 24 }, () => 0);
  orders.forEach((o) => {
    hourBuckets[new Date(o.createdAt).getHours()] += o.total;
  });
  const maxHour = Math.max(...hourBuckets, 1);
  const operatingHours = Array.from({ length: 15 }, (_, i) => i + 9);
  const peakHourValue = Math.max(...hourBuckets);
  const peakHour = hourBuckets.indexOf(peakHourValue);

  const statusOrder: Order["status"][] = [
    "received",
    "confirmed",
    "preparing",
    "ready",
    "out-for-delivery",
    "completed",
    "cancelled",
  ];

  return (
    <>
      <PageHead
        kicker="مذكرة التشغيل / اليوم"
        title="صورة المطعم الآن"
        lede="قراءة سريعة لما يتحرك في المطبخ، وما يحتاج قراراً منك."
        actions={
          <button
            className="adm-btn adm-btn--accent"
            onClick={onOpenOrders}
          >
            افتح مكتب الطلبات
            <ArrowRight aria-hidden="true" />
          </button>
        }
      />

      {orders.length === 0 ? (
        <AdminEmpty
          icon={BellRing}
          title="ابدأ باستلام الطلبات"
          copy="ستظهر مقاييس اليوم ومخطط الحركة مع أول طلب مؤكد. جهّز مكتب الطلبات الآن لتلتقط كل طلب من اللحظة الأولى."
          tone="dark"
        >
          <button className="adm-btn adm-btn--gold" onClick={onOpenOrders}>
            فتح مكتب الطلبات
            <ArrowRight aria-hidden="true" />
          </button>
        </AdminEmpty>
      ) : (
        <>
          {/* ---- Live revenue ledger ---- */}
          <section className="ov-ledger">
            <div className="ov-ledger__rev">
              <small>المبيعات المحققة اليوم</small>
              <strong>{formatSyp(todaysRevenue)}</strong>
              {settings.currencyEstimate ? (
                <div className="adm-mast__meta" style={{ marginTop: 0 }}>
                  ≈ {formatUsd(todaysRevenue, settings.rate)} USD
                </div>
              ) : null}
              <div className="ov-ledger__meta">
                {revenueTrend === null ? (
                  <span className="ov-trend ov-trend--flat">— لا أمس للمقارنة</span>
                ) : revenueTrend >= 0 ? (
                  <span className="ov-trend">
                    <ArrowUp aria-hidden="true" />
                    {trendLabel(revenueTrend)}
                  </span>
                ) : (
                  <span className="ov-trend ov-trend--down">
                    <ArrowDown aria-hidden="true" />
                    {trendLabel(revenueTrend)}
                  </span>
                )}
                <span className="adm-chip adm-chip--brand">
                  <i className="adm-chip__dot" aria-hidden="true" />
                  {todaysOrders.length} طلباً اليوم
                </span>
              </div>
            </div>
            <div className="ov-ledger__read">
              <h2>
                {activeOrders
                  ? `${activeOrders} طلبات تتحرك الآن`
                  : "الإيقاع هادئ حالياً"}
              </h2>
              <p>
                {pendingOrders
                  ? `${pendingOrders} طلبات جديدة تنتظر التأكيد. افتح مكتب الطلبات حتى لا تتأخر الوصفات.`
                  : "لا توجد طلبات جديدة معلقة، ويمكن للفريق متابعة التحضير."}
              </p>
              <button
                className="adm-btn adm-btn--gold"
                onClick={onOpenOrders}
              >
                راجع خط الإنتاج
              </button>
            </div>
          </section>

          {/* ---- KPI stat band ---- */}
          <div className="ov-kpis">
            <article className="ov-kpi">
              <div className="ov-kpi__top">
                <span className="ov-kpi__lbl">
                  <ClipboardList aria-hidden="true" />
                  طلبات اليوم
                </span>
                {orderTrend !== null && orderTrend >= 0 ? (
                  <span className="ov-kpi__sub is-up">
                    +{Math.round(orderTrend)}%
                  </span>
                ) : orderTrend !== null ? (
                  <span className="ov-kpi__sub is-down">
                    {Math.round(orderTrend)}%
                  </span>
                ) : null}
              </div>
              <strong className="ov-kpi__val adm-num">
                {todaysOrders.length}
              </strong>
              <span className="ov-kpi__sub">{trendLabel(orderTrend)}</span>
            </article>

            <article className="ov-kpi ov-kpi--accent">
              <div className="ov-kpi__top">
                <span className="ov-kpi__lbl">
                  <Flame aria-hidden="true" />
                  قيد المعالجة
                </span>
              </div>
              <strong className="ov-kpi__val adm-num">{activeOrders}</strong>
              <span className="ov-kpi__sub">
                {pendingOrders} جديدة لم تُؤكَّد
              </span>
            </article>

            <article className="ov-kpi">
              <div className="ov-kpi__top">
                <span className="ov-kpi__lbl">
                  <UtensilsCrossed aria-hidden="true" />
                  المطبخ يشتغل
                </span>
              </div>
              <strong className="ov-kpi__val adm-num">
                {orders.filter((o) => ["preparing", "ready"].includes(o.status))
                  .length || 0}
              </strong>
              <span className="ov-kpi__sub">وصفات قيد التحضير أو جاهزة</span>
            </article>

            <article className="ov-kpi ov-kpi--gold">
              <div className="ov-kpi__top">
                <span className="ov-kpi__lbl">
                  <ShoppingBasket aria-hidden="true" />
                  متوسط الطلب
                </span>
              </div>
              <strong className="ov-kpi__val">{formatSyp(avgOrder)}</strong>
              <span className="ov-kpi__sub">
                {todaysPaidCount} طلب محتسب اليوم
              </span>
            </article>
          </div>

          {/* ---- Live queue: active orders awaiting attention ---- */}
          <section className="adm-card ov-queue">
            <div className="adm-card__hd">
              <div>
                <span className="adm-kicker">طابور التشغيل · مباشر</span>
                <h3 style={{ marginTop: 6 }}>الطلبات النشطة الآن</h3>
              </div>
              <button
                className="adm-btn adm-btn--soft adm-btn--sm"
                onClick={onOpenOrders}
              >
                افتح مكتب الطلبات
                <ArrowRight aria-hidden="true" />
              </button>
            </div>
            <div className="adm-card__bd">
              {queueOrders.length === 0 ? (
                <div className="ov-queue__idle">
                  <span className="ov-queue__idle__ico" aria-hidden="true">
                    <CheckCircle2 />
                  </span>
                  <div>
                    <strong>لا توجد طلبات نشطة</strong>
                    <small>
                      أُنجزت الطلبات أو أُلغيت — المكتب جاهز لاستقبال الطلب
                      التالي.
                    </small>
                  </div>
                </div>
              ) : (
                <div className="ov-queue__row">
                  {queueOrders.map((entry) => (
                    <button
                      className="ov-queue__ticket"
                      data-status={entry.status}
                      key={entry.id}
                      onClick={() => onOpenOrder(entry)}
                    >
                      <span className="ov-queue__top">
                        <b className="adm-num">#{entry.id}</b>
                        <StatusChip status={entry.status} compact />
                      </span>
                      <span className="ov-queue__who">
                        <strong>{entry.customer}</strong>
                        <small>
                          {entry.mode === "delivery" ? (
                            <Truck aria-hidden="true" />
                          ) : entry.mode === "dine-in" ? (
                            <Utensils aria-hidden="true" />
                          ) : (
                            <ShoppingBasket aria-hidden="true" />
                          )}
                          {entry.table || entry.address || "طلب مباشر"}
                        </small>
                      </span>
                      <span className="ov-queue__foot">
                        <small className="ov-queue__time adm-num">
                          <Clock aria-hidden="true" />
                          {fmtClock(entry.createdAt)}
                        </small>
                        <strong className="ov-queue__total adm-num">
                          {formatSyp(entry.total)}
                        </strong>
                      </span>
                      <ArrowRight className="ov-queue__go" aria-hidden="true" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>

          <div className="adm-grid adm-cols-2">
            {/* ---- Hourly rhythm chart ---- */}
            <section className="adm-card">
              <div className="adm-card__hd">
                <div>
                  <span className="adm-kicker">إيقاع اليوم</span>
                  <h3 style={{ marginTop: 6 }}>المبيعات حسب الساعة</h3>
                </div>
                {peakHourValue > 0 ? (
                  <span className="adm-chip adm-chip--mode">
                    <Clock aria-hidden="true" />
                    الذروة {formatSyp(peakHourValue)} · {peakHour}:00
                  </span>
                ) : null}
              </div>
              <div className="adm-card__bd">
                {peakHourValue > 0 ? (
                  <div className="ov-chart" role="img" aria-label="المبيعات حسب الساعة">
                    {operatingHours.map((hour) => {
                      const value = hourBuckets[hour];
                      const height = value ? (value / maxHour) * 100 : 0;
                      return (
                        <div
                          className={`ov-chart__col${hour === peakHour ? " is-peak" : ""}`}
                          key={hour}
                          title={value ? `${formatSyp(value)} — ${hour}:00` : undefined}
                        >
                          <div
                            className="ov-chart__bar"
                            style={{ height: `${height || 3}%` }}
                          />
                          <small>{hour}</small>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p style={{ color: "var(--text-3)", fontSize: "0.86rem" }}>
                    لا توجد بيانات مبيعات للساعات بعد.
                  </p>
                )}
              </div>
            </section>

            {/* ---- Status breakdown ---- */}
            <section className="adm-card">
              <div className="adm-card__hd">
                <div>
                  <span className="adm-kicker">سجل الحركة</span>
                  <h3 style={{ marginTop: 6 }}>حالة كل طلب</h3>
                </div>
                <span
                  className="adm-chip adm-chip--mode"
                  style={{ fontSize: "0.72rem" }}
                >
                  {activeOrders} نشط · {orders.length} إجمالي
                </span>
              </div>
              <div className="adm-card__bd">
                <div>
                  {statusOrder.map((status) => {
                    const count = orders.filter((o) => o.status === status).length;
                    const revenue = orders
                      .filter(
                        (o) => o.status === status && o.status !== "cancelled",
                      )
                      .reduce((sum, o) => sum + o.total, 0);
                    const color =
                      status === "received"
                        ? "var(--ink)"
                        : status === "confirmed"
                          ? "var(--teal)"
                          : status === "preparing"
                            ? "var(--teal-2)"
                            : status === "ready"
                              ? "var(--teal-3)"
                              : status === "out-for-delivery"
                                ? "var(--teal-3)"
                                : status === "completed"
                                  ? "var(--success)"
                                  : "var(--danger)";
                    return (
                      <div
                        className="ov-status__row"
                        key={status}
                        style={{ "--dot-c": color } as CSSProperties}
                      >
                        <i className="ov-status__dot" aria-hidden="true" />
                        <span className="ov-status__name">
                          {statusLabels[status]}
                        </span>
                        <b className="ov-status__count adm-num">{count}</b>
                        <span className="ov-status__rev">
                          {revenue ? formatSyp(revenue) : "—"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          </div>

          <div className="ov-foot">
            <span className="ov-foot__txt">
              <strong className="adm-num">{activeOrders}</strong> طلبات تحتاج
              المتابعة · <strong className="adm-num">{pendingOrders}</strong>{" "}
              جديدة تنتظر التأكيد
            </span>
            <button className="adm-btn adm-btn--accent" onClick={onOpenOrders}>
              دخول مكتب الطلبات
              <ArrowRight aria-hidden="true" />
            </button>
          </div>
        </>
      )}
    </>
  );
}

/* ============================================================================
   OrderCard + OrderDetails — the service ticket & its full file
   ========================================================================== */

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
  const locator = order.table || order.address || "طلب مباشر";
  const nextStatus = next[order.status];
  return (
    <article className={`adm-oc adm-oc--${order.status}`}>
      <header className="adm-oc__head">
        <span className="adm-oc__no adm-num">
          #{order.id}
          <small>· {fmtClock(order.createdAt)}</small>
        </span>
        <span className="adm-oc__chips">
          <ModeChip mode={order.mode} />
        </span>
      </header>

      <button className="adm-oc__who" onClick={onOpen}>
        <span className="adm-oc__avatar" aria-hidden="true">
          {order.customer.slice(0, 1)}
        </span>
        <span className="adm-oc__who__id">
          <strong>{order.customer}</strong>
          <small>
            {order.mode === "delivery" ? (
              <Truck aria-hidden="true" />
            ) : order.mode === "dine-in" ? (
              <Utensils aria-hidden="true" />
            ) : (
              <ShoppingBasket aria-hidden="true" />
            )}
            {locator}
          </small>
        </span>
        <span className="adm-oc__open">
          فتح الملف
          <ArrowRight aria-hidden="true" />
        </span>
      </button>

      <div className="adm-oc__items">
        {order.lines.slice(0, 4).map((line) => (
          <div className="adm-oc__item" key={line.key}>
            <b className="adm-num">{line.qty}×</b>
            <span>
              {line.item.name}
              {line.options.length ? (
                <small> ({line.options.map((o) => o.name).join("، ")})</small>
              ) : null}
            </span>
            <strong className="adm-num">
              {formatSyp(
                (line.item.price +
                  line.options.reduce((sum, o) => sum + o.price, 0)) *
                  line.qty,
              )}
            </strong>
          </div>
        ))}
        {order.lines.length > 4 ? (
          <div className="adm-oc__item">
            <span style={{ color: "var(--text-3)", fontSize: "0.78rem" }}>
              + {order.lines.length - 4} أصناف إضافية في الملف الكامل
            </span>
          </div>
        ) : null}
      </div>

      <div className="adm-oc__total">
        <small>
          <PayChip status={order.paymentStatus} />
        </small>
        <strong className="adm-num">{formatSyp(order.total)}</strong>
      </div>

      <footer className="adm-oc__foot">
        <button
          className="adm-oc__footbtn"
          onClick={() => onWhatsApp(order)}
          title="مراسلة العميل عبر واتساب"
        >
          <MessageCircle aria-hidden="true" />
          مراسلة العميل
        </button>
        {nextStatus ? (
          <button
            className={`adm-oc__footbtn adm-oc__footbtn--main`}
            onClick={() => onStatus(order.id, nextStatus)}
          >
            {nextStatus === "confirmed"
              ? "تأكيد واستلام"
              : nextStatus === "preparing"
                ? "إرسال للمطبخ"
                : nextStatus === "ready"
                  ? "تحديد كجاهز"
                  : "إتمام الطلب"}
          </button>
        ) : (
          <span className="adm-oc__footbtn adm-oc__footbtn--idle">
            <StatusChip status={order.status} />
          </span>
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
  useEffect(() => setNote(order.internalNote || ""), [order.internalNote]);
  const cancel = () => {
    const reason = window.prompt("سبب إلغاء الطلب")?.trim();
    if (reason)
      onStatus(order.id, "cancelled", { cancellationReason: reason });
  };

  const flow = (
    [
      "received",
      "confirmed",
      "preparing",
      "ready",
      "out-for-delivery",
      "completed",
    ] as Order["status"][]
  ).filter((status) => status !== "out-for-delivery" || order.mode === "delivery");
  const flowIndex =
    order.status === "cancelled" ? -1 : flow.indexOf(order.status);

  const lineTotal = (line: CartLine) =>
    (line.item.price + line.options.reduce((sum, o) => sum + o.price, 0)) *
    line.qty;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section
        className="adm-sheet"
        role="dialog"
        aria-modal="true"
        aria-label={`ملف الطلب ${order.id}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        {/* ---- Sheet header ---- */}
        <header className="adm-sheet__head">
          <span className="adm-sheet__no adm-num">#{order.id}</span>
          <div className="adm-sheet__id">
            <span className="adm-kicker adm-kicker--on-dark">
              ملف الخدمة · {modeLabels[order.mode]}
            </span>
            <h2>
              {order.customer} — {order.table || order.address || "طلب مباشر"}
            </h2>
            <p>
              <Clock aria-hidden="true" />
              {new Date(order.createdAt).toLocaleString("ar-SY")}
              <StatusChip status={order.status} />
            </p>
          </div>
          <button
            className="adm-iconbtn"
            style={{
              background: "rgba(255,255,255,0.1)",
              borderColor: "rgba(255,255,255,0.24)",
              color: "#fff",
            }}
            onClick={onClose}
            aria-label="إغلاق الملف"
          >
            <X aria-hidden="true" />
          </button>
        </header>

        <div className="adm-sheet__body">
          {/* ================= main column ================= */}
          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <section>
              <div className="adm-odsec__hd">
                <span className="adm-odsec__step adm-num">01</span>
                <div className="adm-odsec__t">
                  <h3>بيانات التسليم</h3>
                  <small>معلومات الضيف ونقطة الخدمة</small>
                </div>
              </div>
              <div className="adm-facts">
                <div className="adm-fact">
                  <span className="adm-fact__lbl">
                    <Users aria-hidden="true" />
                    اسم العميل
                  </span>
                  <strong>{order.customer}</strong>
                  <small dir="ltr" style={{ textAlign: "start" }}>
                    {order.phone || "لا يوجد هاتف مسجل"}
                  </small>
                </div>
                <div className="adm-fact">
                  <span className="adm-fact__lbl">
                    <MapPin aria-hidden="true" />
                    نقطة التسليم
                  </span>
                  <strong>{order.table || order.address || "طلب مباشر"}</strong>
                  <small>
                    {order.mode === "delivery"
                      ? "عنوان توصيل"
                      : modeLabels[order.mode]}
                  </small>
                </div>
                <div className="adm-fact">
                  <span className="adm-fact__lbl">
                    <Store aria-hidden="true" />
                    قناة الطلب
                  </span>
                  <strong>{modeLabels[order.mode]}</strong>
                  <small dir="ltr" style={{ textAlign: "start" }}>
                    {order.paymentReference || "لا يوجد مرجع دفع"}
                  </small>
                </div>
              </div>
            </section>

            <section>
              <div className="adm-odsec__hd">
                <span className="adm-odsec__step adm-num">02</span>
                <div className="adm-odsec__t">
                  <h3>بيان الأطباق</h3>
                  <small>{order.lines.length} أصناف في الفاتورة</small>
                </div>
                <span className="adm-odsec__cta">
                  {order.payment === "كاش" ? "الدفع عند الاستلام" : order.payment}
                </span>
              </div>
              <div className="adm-lines">
                {order.lines.map((line, index) => (
                  <div className="adm-lines__row" key={line.key}>
                    <span className="adm-lines__idx adm-num">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="adm-lines__mid">
                      <strong>
                        {line.qty}× {line.item.name}
                      </strong>
                      {line.options.length ? (
                        <small>
                          {line.options.map((o) => o.name).join("، ")}
                        </small>
                      ) : (
                        <small>التركيبة الأساسية</small>
                      )}
                      {line.note ? (
                        <small className="adm-lines__note">
                          ملاحظة: {line.note}
                        </small>
                      ) : null}
                    </div>
                    <strong className="adm-lines__price adm-num">
                      {formatSyp(lineTotal(line))}
                    </strong>
                  </div>
                ))}
                <div className="adm-lines__total">
                  <span>القيمة النهائية</span>
                  <strong className="adm-num">{formatSyp(order.total)}</strong>
                </div>
              </div>
            </section>

            <section>
              <div className="adm-odsec__hd">
                <span className="adm-odsec__step adm-num">03</span>
                <div className="adm-odsec__t">
                  <h3>حالة التحصيل</h3>
                  <small>حدّث حالة الدفع عند استلام المبلغ</small>
                </div>
              </div>
              <div className="adm-seg" role="group" aria-label="حالة التحصيل">
                {(
                  [
                    ["pending", "بانتظار التحقق"],
                    ["verified", "تم التحقق"],
                    ["rejected", "مرفوض"],
                    ["refunded", "مسترد"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    className={`adm-seg__btn${
                      order.paymentStatus === value ? " is-on--accent" : ""
                    }`}
                    onClick={() => onChange(order.id, { paymentStatus: value })}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </section>
          </div>

          {/* ================= rail column ================= */}
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <section className="adm-card" style={{ borderRadius: "var(--r-md)" }}>
              <div className="adm-card__bd" style={{ padding: "16px" }}>
                <div className="adm-odsec__hd" style={{ marginBottom: 6 }}>
                  <div className="adm-odsec__t">
                    <span className="adm-kicker">الخطوة التالية</span>
                    <h3 style={{ marginTop: 4 }}>حرّك الطلب في مساره</h3>
                  </div>
                </div>
                <div className="adm-route">
                  {flow.map((status, index) => {
                    const state =
                      order.status === "cancelled"
                        ? "is-off"
                        : index < flowIndex
                          ? "is-done"
                          : index === flowIndex
                            ? "is-current"
                            : "";
                    return (
                      <button
                        className={`adm-route__btn ${state}`}
                        key={status}
                        onClick={() => onStatus(order.id, status)}
                        disabled={order.status === "cancelled"}
                      >
                        <span className="adm-route__mark">
                          {index < flowIndex ? (
                            <Check aria-hidden="true" />
                          ) : (
                            <ChevronDown aria-hidden="true" />
                          )}
                        </span>
                        <span className="adm-route__txt">
                          <strong>{statusLabels[status]}</strong>
                          <small>
                            {order.status === "cancelled"
                              ? "الطلب ملغي"
                              : index === flowIndex
                                ? "الحالة الحالية"
                                : index < flowIndex
                                  ? "اكتملت"
                                  : "تعيين الحالة"}
                          </small>
                        </span>
                      </button>
                    );
                  })}
                  {order.status === "cancelled" && (
                    <div className="adm-cancel-note">
                      أُلغي هذا الطلب في {fmtClock(order.updatedAt)}
                      {order.cancellationReason
                        ? ` — السبب: ${order.cancellationReason}`
                        : ""}
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="adm-note-box">
              <label>
                <span className="adm-odsec__t" style={{ display: "block" }}>
                  <strong style={{ fontSize: "0.9rem" }}>
                    غرفة الفريق — ملاحظة داخلية
                  </strong>
                </span>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="ملاحظة للمطبخ أو فريق الخدمة..."
                />
              </label>
              <button
                className="adm-btn adm-btn--teal adm-btn--sm"
                onClick={() => onChange(order.id, { internalNote: note })}
              >
                <Check aria-hidden="true" />
                حفظ الملاحظة
              </button>
            </section>

            {order.status !== "cancelled" && order.status !== "completed" && (
              <button
                className="adm-btn adm-btn--danger"
                onClick={cancel}
              >
                <X aria-hidden="true" />
                إلغاء الطلب
              </button>
            )}
          </div>
        </div>

        <footer className="adm-sheet__foot">
          <button className="adm-btn adm-btn--gold" onClick={() => onWhatsApp(order)}>
            <MessageCircle aria-hidden="true" />
            مراسلة العميل واتساب
          </button>
          <button className="adm-btn adm-btn--soft" onClick={onClose}>
            إغلاق الملف
          </button>
        </footer>
      </section>
    </div>
  );
}

/* ============================================================================
   MenuManager + CategoryManager + OptionEditor — food-first content studio
   ========================================================================== */

const TAG_ICON: Record<Tag, LucideIcon> = {
  vegetarian: Leaf,
  spicy: Flame,
  chef: Sparkles,
};

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
        if (
          !Array.isArray(parsed) ||
          !parsed.every((entry) => typeof entry === "string")
        )
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
  const knownCategories = Array.from(
    new Set([
      ...activeCategories.map((category) => category.name),
      ...restaurant.items.map((item) => item.category),
    ]),
  );

  return (
    <>
      <PageHead
        kicker="محتوى المطعم / المطبخ أولاً"
        title="عناصر القائمة"
        lede="أضف الأصناف وعدّل الأسعار والتصنيفات والإضافات والتوفر — كل تغيير يُزامن تلقائياً مع المتجر."
        actions={
          <button
            className="adm-btn adm-btn--accent"
            onClick={() => setEditing("new")}
          >
            <Plus aria-hidden="true" />
            إضافة صنف جديد
          </button>
        }
      />

      <div className="adm-toolbar">
        <div className="adm-mfilters">
          {["الكل", ...activeCategories.map((category) => category.name)].map(
            (entry) => (
              <button
                key={entry}
                className={`adm-fchip${categoryFilter === entry ? " is-on" : ""}`}
                onClick={() => setCategoryFilter(entry)}
              >
                {entry}
              </button>
            ),
          )}
        </div>
        <span className="adm-toolbar__meta">
          <UtensilsCrossed aria-hidden="true" />
          {filtered.length} أصناف في هذا العرض
        </span>
      </div>

      <CategoryManager
        categories={categories}
        onAdd={addCategory}
        onUpdate={updateCategory}
        onArchive={archiveCategory}
      />

      {filtered.length === 0 ? (
        <AdminEmpty
          icon={UtensilsCrossed}
          title="لا توجد أصناف هنا"
          copy="أضف أول صنف إلى هذا التصنيف، أو غيّر تصفية العرض لترى بقية القائمة."
        >
          <button
            className="adm-btn adm-btn--accent"
            onClick={() => setEditing("new")}
          >
            <Plus aria-hidden="true" />
            إضافة صنف جديد
          </button>
        </AdminEmpty>
      ) : (
        <div className="adm-itemgrid">
          {filtered.map((item) => {
            const unavailable = !item.available;
            return (
              <article
                className={`adm-dish${unavailable ? " is-off" : ""}`}
                key={item.id}
              >
                <div className="adm-dish__media">
                  <img src={item.image} alt="" loading="lazy" />
                  <div className="adm-dish__badges">
                    {unavailable ? (
                      <span className="adm-badge adm-badge--off">
                        <X aria-hidden="true" />
                        نفد المخزون
                      </span>
                    ) : null}
                    {item.popular ? (
                      <span className="adm-badge adm-badge--chef">
                        <Sparkles aria-hidden="true" />
                        الأكثر طلباً
                      </span>
                    ) : null}
                  </div>
                  <div className="adm-dish__actions">
                    <button
                      className="adm-dish__mini"
                      onClick={() => setEditing(item)}
                      aria-label={`تعديل ${item.name}`}
                      title="تعديل"
                    >
                      <Pencil aria-hidden="true" />
                    </button>
                    <button
                      className="adm-dish__mini adm-dish__mini--danger"
                      onClick={() => remove(item.id)}
                      aria-label={`حذف ${item.name}`}
                      title="حذف"
                    >
                      <Trash2 aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <div className="adm-dish__body">
                  <div className="adm-dish__row1">
                    <div style={{ minWidth: 0 }}>
                      <h3 className="adm-dish__name">
                        {item.name}
                        <span className="adm-dish__en" dir="ltr">
                          {item.en}
                        </span>
                      </h3>
                    </div>
                    <div className="adm-dish__price">
                      <strong className="adm-num">
                        {formatSyp(item.price)}
                      </strong>
                      {item.category ? (
                        <small>{item.category}</small>
                      ) : null}
                    </div>
                  </div>

                  {item.desc ? (
                    <p
                      style={{
                        color: "var(--text-3)",
                        fontSize: "0.8rem",
                        lineHeight: 1.6,
                        marginTop: "-4px",
                      }}
                    >
                      {item.desc}
                    </p>
                  ) : null}

                  {(item.tags.length || (item.options?.length ?? 0) > 0) ? (
                    <div className="adm-dish__tags">
                      {item.tags.map((tag) => {
                        const Icon = TAG_ICON[tag];
                        return (
                          <span className="adm-tagchip" key={tag}>
                            <Icon aria-hidden="true" />
                            {tagLabels[tag]}
                          </span>
                        );
                      })}
                      {item.options?.length ? (
                        <span className="adm-tagchip">
                          <Settings aria-hidden="true" />
                          {(item.options ?? []).length} مجموعات خيارات
                        </span>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="adm-dish__foot">
                    <small>
                      <Package aria-hidden="true" />
                      {item.available ? "متاح للطلب" : "مخفياً مؤقتاً"}
                    </small>
                    <label className="adm-toggle">
                      <input
                        type="checkbox"
                        checked={item.available}
                        onChange={() => toggle(item.id)}
                        aria-label={
                          item.available
                            ? `إيقاف ${item.name}`
                            : `تفعيل ${item.name}`
                        }
                      />
                      <span className="adm-toggle__track" aria-hidden="true" />
                      <span className="adm-toggle__lbl">
                        <strong style={{ fontSize: "0.78rem" }}>
                          {item.available ? "متوفر" : "نفد"}
                        </strong>
                      </span>
                    </label>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {editing && (
        <AdmDialog
          onClose={() => setEditing(null)}
          labelledBy="menu-item-edit-title"
          wide
        >
          <div className="adm-dialog__body adm-dialog__title">
            <span className="adm-kicker">
              {editing === "new" ? "صنف جديد" : "تعديل الصنف"}
            </span>
            <h2 id="menu-item-edit-title" className="adm-title">
              {editing === "new"
                ? "إضافة صنف إلى القائمة"
                : `${editing.name} — تعديل`}
            </h2>
            <form
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 20,
                marginTop: 18,
              }}
              onSubmit={(event) => {
                event.preventDefault();
                save(event.currentTarget);
              }}
            >
              <div className="adm-form-grid">
                <label className="adm-field">
                  <span>الاسم بالعربية</span>
                  <input
                    name="name"
                    required
                    defaultValue={editing === "new" ? "" : editing.name}
                  />
                </label>
                <label className="adm-field">
                  <span>الاسم بالإنجليزية</span>
                  <input
                    name="en"
                    required
                    dir="ltr"
                    defaultValue={editing === "new" ? "" : editing.en}
                  />
                </label>
                <label className="adm-field" style={{ gridColumn: "1 / -1" }}>
                  <span>الوصف</span>
                  <textarea
                    name="desc"
                    required
                    defaultValue={editing === "new" ? "" : editing.desc}
                  />
                </label>
                <label className="adm-field">
                  <span>السعر بالليرة</span>
                  <input
                    name="price"
                    type="number"
                    min="0"
                    required
                    defaultValue={editing === "new" ? 0 : editing.price}
                  />
                </label>
                <label className="adm-field">
                  <span>التصنيف</span>
                  <select
                    name="category"
                    defaultValue={
                      editing === "new" ? "رئيسية" : editing.category
                    }
                  >
                    {(knownCategories.length
                      ? knownCategories
                      : ["مقبلات", "رئيسية", "مشروبات", "حلويات"]
                    ).map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="adm-field" style={{ gridColumn: "1 / -1" }}>
                  <span>رابط الصورة</span>
                  <input
                    name="image"
                    dir="ltr"
                    defaultValue={editing === "new" ? "" : editing.image}
                    placeholder="https://..."
                  />
                  {editing !== "new" ? (
                    <img
                      src={editing.image}
                      alt=""
                      style={{
                        width: 120,
                        height: 76,
                        objectFit: "cover",
                        borderRadius: 12,
                        border: "1px solid var(--line)",
                      }}
                    />
                  ) : null}
                </label>
              </div>

              <fieldset
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: 16,
                  padding: "14px 16px",
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))",
                  gap: 10,
                }}
              >
                <legend
                  style={{
                    padding: "0 8px",
                    fontWeight: 700,
                    fontSize: "0.82rem",
                    color: "var(--text-2)",
                  }}
                >
                  العلامات والميزات
                </legend>
                {(
                  [
                    ["vegetarian", "نباتي", Leaf],
                    ["spicy", "حار", Flame],
                    ["chef", "اختيار الشيف", Sparkles],
                  ] as const
                ).map(([value, label, Icon]) => (
                  <label className="adm-checkrow" key={value} style={{ padding: "11px 12px" }}>
                    <input
                      type="checkbox"
                      name="tags"
                      value={value}
                      defaultChecked={
                        editing !== "new" && editing.tags.includes(value)
                      }
                    />
                    <span className="adm-checkrow__lbl" style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
                      <Icon style={{ width: 15, height: 15, color: "var(--teal)" }} aria-hidden="true" />
                      <strong>{label}</strong>
                    </span>
                  </label>
                ))}
                <label
                  className="adm-checkrow"
                  key="popular"
                  style={{ padding: "11px 12px" }}
                >
                  <input
                    type="checkbox"
                    name="popular"
                    defaultChecked={editing !== "new" && editing.popular}
                  />
                  <span
                    className="adm-checkrow__lbl"
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 7,
                    }}
                  >
                    <Sparkles style={{ width: 15, height: 15, color: "var(--warn)" }} aria-hidden="true" />
                    <strong>الأكثر طلباً</strong>
                  </span>
                </label>
              </fieldset>

              {editing !== "new" && (
                <OptionEditor
                  item={editing}
                  onUpdate={(options) => setEditing({ ...editing, options })}
                />
              )}

              <button className="adm-btn adm-btn--accent" type="submit">
                <Check aria-hidden="true" />
                حفظ الصنف
              </button>
            </form>
          </div>
        </AdmDialog>
      )}
    </>
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
    <section className="adm-card">
      <div className="adm-card__hd">
        <div>
          <h3>تصنيفات القائمة</h3>
          <p>رتّب التصنيفات وعدّل ظهورها للزبائن.</p>
        </div>
        <button className="adm-btn adm-btn--soft adm-btn--sm" type="button" onClick={onAdd}>
          <Plus aria-hidden="true" />
          إضافة تصنيف
        </button>
      </div>
      <div className="adm-card__bd" style={{ paddingBlock: "8px" }}>
        {active.length === 0 ? (
          <p style={{ color: "var(--text-3)", fontSize: "0.86rem", padding: "10px 4px" }}>
            لا توجد تصنيفات ظاهرة — أضف تصنيفاً لتنظيم القائمة.
          </p>
        ) : (
          active.map((entry, index) => (
            <div className="adm-catrow" key={entry.id}>
              <span className="adm-catrow__rank adm-num">
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="adm-catrow__name">
                <input
                  aria-label="اسم التصنيف بالعربية"
                  value={entry.name}
                  onChange={(event) =>
                    onUpdate(entry.id, { name: event.target.value })
                  }
                />
                <input
                  aria-label="اسم التصنيف بالإنجليزية"
                  dir="ltr"
                  value={entry.en}
                  onChange={(event) =>
                    onUpdate(entry.id, { en: event.target.value })
                  }
                />
              </div>
              <label className="adm-catrow__ctl">
                <input
                  type="checkbox"
                  checked={entry.visible}
                  onChange={(event) =>
                    onUpdate(entry.id, { visible: event.target.checked })
                  }
                />
                ظاهر
              </label>
              <div className="adm-catrow__btns">
                <button
                  className="adm-icobtn"
                  type="button"
                  disabled={index === 0}
                  aria-label="تقديم التصنيف"
                  title="تقديم"
                  onClick={() => {
                    const next = [...active];
                    [next[index - 1], next[index]] = [next[index], next[index - 1]];
                    onUpdate("__reorder__", {
                      id: JSON.stringify(next.map((item) => item.id)),
                    } as Partial<MenuCategory>);
                  }}
                >
                  <ArrowRight aria-hidden="true" />
                </button>
                <button
                  className="adm-icobtn"
                  type="button"
                  disabled={index === active.length - 1}
                  aria-label="تأخير التصنيف"
                  title="تأخير"
                  onClick={() => {
                    const next = [...active];
                    [next[index + 1], next[index]] = [next[index], next[index + 1]];
                    onUpdate("__reorder__", {
                      id: JSON.stringify(next.map((item) => item.id)),
                    } as Partial<MenuCategory>);
                  }}
                >
                  <ArrowRight
                    aria-hidden="true"
                    style={{ transform: "rotate(180deg)" }}
                  />
                </button>
                <button
                  className="adm-icobtn adm-icobtn--danger"
                  type="button"
                  aria-label="أرشفة التصنيف"
                  title="أرشفة"
                  onClick={() => onArchive(entry)}
                >
                  <Archive aria-hidden="true" />
                </button>
              </div>
            </div>
          ))
        )}
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
    <section className="adm-card" style={{ borderRadius: "var(--r-md)" }}>
      <div className="adm-card__hd">
        <div>
          <h3 style={{ fontSize: "0.98rem" }}>مجموعات الخيارات والإضافات</h3>
          <p>أضف خيارات تُعرض للزبون قبل تأكيد الطلب.</p>
        </div>
        <button
          className="adm-btn adm-btn--soft adm-btn--sm"
          type="button"
          onClick={addGroup}
        >
          <Plus aria-hidden="true" />
          مجموعة خيارات
        </button>
      </div>
      <div
        className="adm-card__bd"
        style={{ display: "grid", gap: 14, paddingBlock: 16 }}
      >
        {groups.length === 0 ? (
          <p style={{ color: "var(--text-3)", fontSize: "0.86rem" }}>
            لا توجد مجموعات خيارات لهذا الصنف حتى الآن.
          </p>
        ) : (
          groups.map((group, groupIndex) => (
            <section className="adm-ogroup" key={group.id}>
              <div className="adm-ogroup__hd">
                <input
                  type="text"
                  aria-label="اسم المجموعة"
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
                <label className="adm-ogroup__req">
                  <input
                    type="checkbox"
                    checked={Boolean(group.required)}
                    onChange={(e) =>
                      onUpdate(
                        groups.map((entry, i) =>
                          i === groupIndex
                            ? { ...entry, required: e.target.checked }
                            : entry,
                        ),
                      )
                    }
                  />
                  مطلوب
                </label>
                <button
                  className="adm-btn adm-btn--danger adm-btn--sm"
                  type="button"
                  onClick={() =>
                    onUpdate(groups.filter((_, i) => i !== groupIndex))
                  }
                >
                  <Trash2 aria-hidden="true" />
                  حذف المجموعة
                </button>
              </div>

              <div>
                {group.options.map((option, optionIndex) => (
                  <div className="adm-ogroup__opt" key={option.id}>
                    <span
                      className="adm-lines__idx adm-num"
                      style={{ paddingTop: 10 }}
                    >
                      {String(optionIndex + 1).padStart(2, "0")}
                    </span>
                    <input
                      className="adm-ogroup__name"
                      type="text"
                      aria-label="اسم الخيار"
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
                      className="adm-ogroup__price"
                      type="number"
                      min="0"
                      aria-label="سعر الخيار بالليرة"
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
                      className="adm-icobtn adm-icobtn--danger"
                      type="button"
                      aria-label="حذف الخيار"
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
                      <X aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>

              <button
                className="adm-ogroup__add"
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
                <Plus aria-hidden="true" />
                إضافة خيار
              </button>
            </section>
          ))
        )}
      </div>
    </section>
  );
}

/* ============================================================================
   ReportsPanel + OperationsPanel
   ========================================================================== */

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
  const maxModeRevenue = Math.max(
    1,
    ...reportByMode.map((entry) => entry.revenue),
  );
  const maxItemQty = Math.max(1, ...topItems.map((entry) => entry.qty));

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
    const csv = `\uFEFF${rows
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n")}`;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    link.download = `orders-${from || "all"}-${to || "today"}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <>
      <PageHead
        kicker="التحليلات والتصدير"
        title="تقارير المبيعات والطلبات"
        lede="نتائج فعلية محسوبة من الطلبات المحفوظة في هذا المطعم."
        actions={
          <button className="adm-btn adm-btn--teal" onClick={exportCsv}>
            <FileDown aria-hidden="true" />
            تنزيل CSV
          </button>
        }
      />

      {reportError ? (
        <AdminAlert tone="err" icon={X}>
          {reportError}
        </AdminAlert>
      ) : null}

      <div className="adm-toolbar">
        <label className="adm-field" style={{ minWidth: 150 }}>
          <span>من</span>
          <input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </label>
        <label className="adm-field" style={{ minWidth: 150 }}>
          <span>إلى</span>
          <input
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </label>
        <button
          className="adm-btn adm-btn--soft adm-btn--sm"
          style={{ alignSelf: "flex-end" }}
          onClick={() => {
            setFrom("");
            setTo("");
          }}
        >
          <RefreshCw aria-hidden="true" />
          كل الفترة
        </button>
        <span className="adm-toolbar__meta" style={{ marginInlineStart: "auto" }}>
          <CheckCircle2 aria-hidden="true" />
          مزامنة مع قاعدة البيانات
        </span>
      </div>

      <div className="ov-kpis">
        <article className="ov-kpi ov-kpi--accent">
          <div className="ov-kpi__top">
            <span className="ov-kpi__lbl">
              <Store aria-hidden="true" />
              صافي المبيعات
            </span>
          </div>
          <strong className="ov-kpi__val adm-num">
            {formatSyp(reportRevenue)}
          </strong>
          <span className="ov-kpi__sub">دون الطلبات الملغاة</span>
        </article>
        <article className="ov-kpi">
          <div className="ov-kpi__top">
            <span className="ov-kpi__lbl">
              <ClipboardList aria-hidden="true" />
              عدد الطلبات
            </span>
          </div>
          <strong className="ov-kpi__val adm-num">{reportOrderCount}</strong>
          <span className="ov-kpi__sub">
            {reportPaidCount} طلب محتسب
          </span>
        </article>
        <article className="ov-kpi ov-kpi--gold">
          <div className="ov-kpi__top">
            <span className="ov-kpi__lbl">
              <ShoppingBasket aria-hidden="true" />
              متوسط الطلب
            </span>
          </div>
          <strong className="ov-kpi__val adm-num">
            {formatSyp(reportPaidCount ? reportRevenue / reportPaidCount : 0)}
          </strong>
          <span className="ov-kpi__sub">لكل طلب محتسب</span>
        </article>
        <article className="ov-kpi">
          <div className="ov-kpi__top">
            <span className="ov-kpi__lbl">
              <X aria-hidden="true" />
              الطلبات الملغاة
            </span>
          </div>
          <strong className="ov-kpi__val adm-num">
            {reportCancelledCount}
          </strong>
          <span className="ov-kpi__sub">خلال الفترة المحددة</span>
        </article>
      </div>

      <div className="adm-rsplit">
        <section className="adm-card">
          <div className="adm-card__hd">
            <div>
              <span className="adm-kicker">حسب القناة</span>
              <h3 style={{ marginTop: 6 }}>أنواع الطلبات</h3>
            </div>
          </div>
          <div className="adm-card__bd">
            {reportByMode.map((entry) => {
              const Icon = MODE_ICON[entry.mode];
              const share = entry.count
                ? Math.round((entry.revenue / maxModeRevenue) * 100)
                : 0;
              return (
                <div className="rv-row" key={entry.mode}>
                  <span className="rv-row__lbl">
                    <strong>
                      <Icon
                        style={{
                          width: 14,
                          height: 14,
                          verticalAlign: "-2px",
                          marginInlineEnd: 6,
                          color: "var(--teal)",
                        }}
                        aria-hidden="true"
                      />
                      {modeLabels[entry.mode]}
                    </strong>
                    <small>{entry.count} طلب</small>
                  </span>
                  <span className="rv-row__track" aria-hidden="true">
                    <span
                      className="rv-row__fill"
                      style={{ width: `${share}%`, display: "block" }}
                    />
                  </span>
                  <strong className="rv-row__val adm-num">
                    {formatSyp(entry.revenue)}
                  </strong>
                </div>
              );
            })}
          </div>
        </section>

        <section className="adm-card">
          <div className="adm-card__hd">
            <div>
              <span className="adm-kicker">الأداء</span>
              <h3 style={{ marginTop: 6 }}>الأصناف الأكثر مبيعاً</h3>
            </div>
          </div>
          <div className="adm-card__bd">
            {topItems.length === 0 ? (
              <p style={{ color: "var(--text-3)", fontSize: "0.86rem" }}>
                لا توجد مبيعات ضمن الفترة.
              </p>
            ) : (
              topItems.map((item, index) => (
                <div className="rv-row" key={`${item.name}-${index}`}>
                  <span className={`rv-rank${index === 0 ? " rv-rank--top" : ""} adm-num`}>
                    {index + 1}
                  </span>
                  <span className="rv-row__lbl" style={{ flex: 1, minWidth: 0 }}>
                    <strong style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.name}
                    </strong>
                    <small>{item.qty} وحدة</small>
                  </span>
                  <span className="rv-row__track" aria-hidden="true">
                    <span
                      className={`rv-row__fill${index === 0 ? " rv-row__fill--hot" : ""}`}
                      style={{
                        width: `${Math.round((item.qty / maxItemQty) * 100)}%`,
                        display: "block",
                      }}
                    />
                  </span>
                  <strong className="rv-row__val adm-num">
                    {formatSyp(item.revenue)}
                  </strong>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </>
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
    <>
      <PageHead
        kicker="التحكم والصلاحيات"
        title="الفريق وحالة التشغيل"
        lede="تحكم باستقبال الطلبات والتنبيهات ووصول الموظفين."
        actions={
          <span
            className={`adm-ospill${state.acceptingOrders ? " is-on" : " is-off"}`}
          >
            {state.acceptingOrders ? (
              <>
                <ShieldCheck aria-hidden="true" />
                يستقبل الطلبات
              </>
            ) : (
              <>
                <X aria-hidden="true" />
                الطلبات متوقفة
              </>
            )}
          </span>
        }
      />

      {operationError ? (
        <AdminAlert tone="err" icon={X}>
          {operationError}
        </AdminAlert>
      ) : null}

      <div className="adm-grid adm-cols-2">
        <section className="adm-card">
          <div className="adm-card__hd">
            <div>
              <span className="adm-kicker">01</span>
              <h3 style={{ marginTop: 6 }}>لوحة تشغيل المطعم</h3>
            </div>
          </div>
          <div className="adm-card__bd">
            <div className="adm-togglecard">
              <span className="adm-toggle__lbl">
                <strong>استقبال الطلبات</strong>
                <small>إيقافه يبقي القائمة متاحة للتصفح</small>
              </span>
              <label className="adm-toggle">
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
                <span className="adm-toggle__track" aria-hidden="true" />
              </label>
            </div>

            <div className="adm-togglecard">
              <span className="adm-toggle__lbl">
                <strong>إشعارات المتصفح</strong>
                <small>إظهار إشعار عند وصول طلب</small>
              </span>
              <label className="adm-toggle">
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
                <span className="adm-toggle__track" aria-hidden="true" />
              </label>
            </div>

            <div className="adm-togglecard">
              <span className="adm-toggle__lbl">
                <strong>التنبيه الصوتي</strong>
                <small>صوت عند وصول طلب جديد</small>
              </span>
              <label className="adm-toggle">
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
                <span className="adm-toggle__track" aria-hidden="true" />
              </label>
            </div>
          </div>
        </section>

        <section className="adm-card">
          <div className="adm-card__hd">
            <div>
              <span className="adm-kicker">02</span>
              <h3 style={{ marginTop: 6 }}>سجل أعضاء الفريق</h3>
            </div>
            <button
              className="adm-btn adm-btn--soft adm-btn--sm"
              disabled={staffBusy}
              onClick={() => void addStaff()}
            >
              {staffBusy ? (
                <Loader2 aria-hidden="true" />
              ) : (
                <UserPlus aria-hidden="true" />
              )}
              {staffBusy ? "جارٍ الحفظ..." : "إضافة موظف"}
            </button>
          </div>
          <div className="adm-card__bd" style={{ paddingBlock: "8px" }}>
            {state.staff.map((member) => (
              <div className="adm-staff" key={member.id}>
                <span
                  className={`adm-staff__avatar${member.active ? "" : " is-inactive"}`}
                >
                  {member.name.slice(0, 1)}
                </span>
                <div className="adm-staff__mid">
                  <strong>
                    {member.name}
                    {!member.active ? (
                      <span style={{ color: "var(--danger)", fontSize: "0.7rem", marginInlineStart: 6 }}>
                        (موقوف)
                      </span>
                    ) : null}
                  </strong>
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
                  aria-label="دور الموظف"
                >
                  <option value="manager">مدير</option>
                  <option value="cashier">كاشير</option>
                  <option value="kitchen">المطبخ</option>
                  {member.role === "owner" && (
                    <option value="owner">المالك</option>
                  )}
                </select>
                <button
                  className="adm-icobtn"
                  title={member.active ? "تعطيل" : "تفعيل"}
                  disabled={member.role === "owner" || staffBusy}
                  onClick={() =>
                    void manageStaff("toggle", member, {
                      active: !member.active,
                    })
                  }
                >
                  {member.active ? (
                    <VolumeX aria-hidden="true" />
                  ) : (
                    <Volume2 aria-hidden="true" />
                  )}
                </button>
                <button
                  className="adm-icobtn adm-icobtn--danger"
                  title="حذف"
                  disabled={member.role === "owner" || staffBusy}
                  onClick={() => {
                    if (window.confirm(`حذف وصول ${member.name} نهائياً؟`)) {
                      void manageStaff("remove", member);
                    }
                  }}
                >
                  <Trash2 aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="adm-card">
        <div className="adm-card__hd">
          <div>
            <span className="adm-kicker">03</span>
            <h3 style={{ marginTop: 6 }}>سجل النشاط</h3>
            <p>سجل دائم للعمليات الإدارية</p>
          </div>
        </div>
        <div className="adm-card__bd" style={{ paddingBlock: "8px" }}>
          {state.audit.length === 0 ? (
            <p style={{ color: "var(--text-3)", fontSize: "0.86rem", padding: "10px 4px" }}>
              لا توجد أنشطة مسجلة بعد.
            </p>
          ) : (
            state.audit.map((entry) => (
              <div className="adm-audit" key={entry.id}>
                <i className="adm-audit__dot" aria-hidden="true" />
                <div className="adm-audit__txt">
                  <strong>{entry.action}</strong>
                  <small>
                    {entry.actor} ·{" "}
                    {new Date(entry.createdAt).toLocaleString("ar-SY")}
                  </small>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </>
  );
}

/* ============================================================================
   TablesManager + TableCard — tables & QR service points
   ========================================================================== */

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, restaurantDatabaseId]);

  useEffect(() => writeStored(storageKey, tables), [storageKey, tables]);

  const tableUrl = (table: RestaurantTable) => {
    if (!table.qrToken) return "";
    const url = new URL(cafePath(restaurant.id), location.origin);
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
    <>
      <PageHead
        kicker="سجل نقاط الخدمة"
        title="الطاولات ورموز الوصول"
        lede={`كل رمز يفتح قائمة ${restaurant.name} ضمن سياق طاولة موثوق.`}
        actions={
          <>
            <span className="adm-chip adm-chip--mode adm-num">
              <Utensils aria-hidden="true" />
              إجمالي الطاولات {tables.length}
            </span>
            <span className="adm-chip adm-chip--completed adm-num">
              <CheckCircle2 aria-hidden="true" />
              النشطة الآن {activeCount}
            </span>
            <button
              className="adm-btn adm-btn--accent"
              onClick={() => setEditing("new")}
            >
              <Plus aria-hidden="true" />
              إضافة طاولة
            </button>
          </>
        }
      />

      {tables.length === 0 ? (
        <AdminEmpty
          icon={QrCode}
          title="لا توجد طاولات بعد"
          copy="أضف أول طاولة لتوليد رمز QR يفتح القائمة ضمن سياق الطاولة."
        >
          <button
            className="adm-btn adm-btn--accent"
            onClick={() => setEditing("new")}
          >
            <Plus aria-hidden="true" />
            إضافة طاولة
          </button>
        </AdminEmpty>
      ) : (
        <div className="adm-tqgrid">
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
              onDownload={() => void download(table)}
              onPrint={() => void print(table)}
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
      )}

      {editing && (
        <AdmDialog
          onClose={() => setEditing(null)}
          labelledBy="table-edit-title"
          narrow
        >
          <div className="adm-dialog__body adm-dialog__title">
            <span className="adm-kicker">إدارة الطاولات</span>
            <h2 id="table-edit-title" className="adm-title">
              {editing === "new" ? "إضافة طاولة" : `تعديل ${editing.name}`}
            </h2>
            <form
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 16,
                marginTop: 18,
              }}
              onSubmit={(event) => {
                event.preventDefault();
                save(event.currentTarget);
              }}
            >
              <div className="adm-form-grid">
                <label className="adm-field">
                  <span>رقم / رمز الطاولة</span>
                  <input
                    name="id"
                    required
                    disabled={editing !== "new"}
                    defaultValue={editing === "new" ? "" : editing.code}
                  />
                </label>
                <label className="adm-field">
                  <span>اسم العرض</span>
                  <input
                    name="name"
                    required
                    defaultValue={editing === "new" ? "" : editing.name}
                  />
                </label>
                <label className="adm-field" style={{ gridColumn: "1 / -1" }}>
                  <span>المنطقة</span>
                  <input
                    name="area"
                    required
                    placeholder="الصالة الرئيسية"
                    defaultValue={editing === "new" ? "" : editing.area}
                  />
                </label>
              </div>
              <button className="adm-btn adm-btn--accent" type="submit">
                <Check aria-hidden="true" />
                حفظ الطاولة
              </button>
            </form>
          </div>
        </AdmDialog>
      )}
    </>
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
    <article className={`adm-tqcard${table.active ? "" : " is-off"}`}>
      <header className="adm-tqcard__head">
        <span className="adm-tqcard__code adm-num">{table.code}</span>
        <div className="adm-tqcard__name">
          <strong>{table.name}</strong>
          <small>
            <MapPin aria-hidden="true" />
            {table.area}
          </small>
        </div>
        <span className={`adm-chip${table.active ? " adm-chip--verified" : " adm-chip--cancelled"}`}>
          <i className="adm-chip__dot" aria-hidden="true" />
          {table.active ? "نشطة" : "متوقفة"}
        </span>
      </header>

      <div className="adm-tqcard__body">
        <div
          className="adm-tqcard__qr"
          aria-label={`QR ${table.name}`}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
        <div className="adm-tqcard__info">
          <span className="adm-tqcard__stat">
            <QrCode aria-hidden="true" />
            {url ? "الرمز جاهز للطباعة" : "بانتظار إنشاء الرمز…"}
          </span>
          <button
            className="adm-btn adm-btn--soft adm-btn--sm"
            onClick={onCopy}
            disabled={!url}
          >
            <Copy aria-hidden="true" />
            {copied ? "تم نسخ الرابط" : "نسخ رابط الوصول"}
          </button>
        </div>
      </div>

      <footer className="adm-tqcard__foot">
        <button
          className="adm-btn adm-btn--soft adm-btn--sm"
          onClick={onDownload}
          disabled={!url}
        >
          <Download aria-hidden="true" />
          تنزيل الرمز
        </button>
        <button
          className="adm-btn adm-btn--soft adm-btn--sm"
          onClick={onPrint}
          disabled={!url}
        >
          <Printer aria-hidden="true" />
          طباعة
        </button>
        <button className="adm-icobtn" onClick={onEdit} aria-label="تعديل" title="تعديل">
          <Pencil aria-hidden="true" />
        </button>
        <button
          className="adm-icobtn"
          onClick={onToggle}
          aria-label={table.active ? "إيقاف الطاولة" : "تفعيل الطاولة"}
          title={table.active ? "إيقاف" : "تفعيل"}
        >
          {table.active ? (
            <VolumeX aria-hidden="true" />
          ) : (
            <Volume2 aria-hidden="true" />
          )}
        </button>
        <button
          className="adm-icobtn adm-icobtn--danger"
          onClick={onDelete}
          aria-label="حذف"
          title="حذف"
          style={{ marginInlineStart: "auto" }}
        >
          <Trash2 aria-hidden="true" />
        </button>
      </footer>
    </article>
  );
}

/* ============================================================================
   SettingsPanel — identity, currency, wallets, channels, hours, zones
   ========================================================================== */

const SET_ICONS: LucideIcon[] = [
  Store,
  Banknote,
  Wallet,
  ShoppingBasket,
  Clock,
  MapPin,
];

function SettingsPanel({
  settings,
  onChange,
}: {
  settings: RestaurantSettings;
  onChange: (settings: RestaurantSettings) => void | Promise<void>;
}) {
  const [draft, setDraft] = useState(settings);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => setDraft(settings), [settings]);

  const field = <K extends keyof RestaurantSettings>(
    key: K,
    value: RestaurantSettings[K],
  ) => setDraft((current) => ({ ...current, [key]: value }));

  const save = async () => {
    setSaving(true);
    await onChange(draft);
    setSaving(false);
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

  const setHoursDay = (index: number, patch: Partial<BusinessHour>) =>
    setDraft((current) => ({
      ...current,
      hours: current.hours.map((entry, i) =>
        i === index ? { ...entry, ...patch } : entry,
      ),
    }));

  const setZone = (index: number, patch: Partial<DeliveryZone>) =>
    setDraft((current) => ({
      ...current,
      zones: current.zones.map((entry, i) =>
        i === index ? { ...entry, ...patch } : entry,
      ),
    }));

  const sections: {
    num: string;
    tag: string;
    title: string;
    body: ReactNode;
  }[] = [
    {
      num: "01",
      tag: "الواجهة العامة",
      title: "معلومات وهوية المطعم",
      body: (
        <div className="adm-form-grid">
          <label className="adm-field">
            <span>اسم المطعم</span>
            <input
              value={draft.name}
              onChange={(event) => field("name", event.target.value)}
            />
          </label>
          <label className="adm-field">
            <span>الوصف المختصر</span>
            <input
              value={draft.subtitle}
              onChange={(event) => field("subtitle", event.target.value)}
            />
          </label>
          <label className="adm-field">
            <span>رقم التواصل</span>
            <input
              value={draft.phone}
              onChange={(event) => field("phone", event.target.value)}
            />
          </label>
          <label className="adm-field">
            <span>رقم واتساب</span>
            <input
              value={draft.whatsapp}
              dir="ltr"
              onChange={(event) =>
                field("whatsapp", event.target.value.replace(/\D/g, ""))
              }
            />
          </label>
          <label className="adm-field">
            <span>المدينة</span>
            <input
              value={draft.city}
              onChange={(event) => field("city", event.target.value)}
            />
          </label>
          <label className="adm-field">
            <span>الحي</span>
            <input
              value={draft.neighborhood}
              onChange={(event) => field("neighborhood", event.target.value)}
            />
          </label>
        </div>
      ),
    },
    {
      num: "02",
      tag: "الحسابات",
      title: "العملة والرسوم",
      body: (
        <>
          <div className="adm-form-grid">
            <label className="adm-field">
              <span>سعر الدولار (ألف ل.س)</span>
              <input
                type="number"
                min="1"
                value={draft.rate}
                onChange={(event) => field("rate", Number(event.target.value))}
              />
            </label>
            <label className="adm-field">
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
            <label className="adm-field">
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
          <label className="adm-checkrow">
            <input
              type="checkbox"
              checked={draft.currencyEstimate}
              onChange={(event) =>
                field("currencyEstimate", event.target.checked)
              }
            />
            <span className="adm-checkrow__lbl">
              <strong>إظهار تقدير الدولار</strong>
              <small>سعر تقريبي، والفوترة بالليرة السورية</small>
            </span>
          </label>
        </>
      ),
    },
    {
      num: "03",
      tag: "التحصيل",
      title: "المحافظ وطرق الدفع",
      body: (
        <div className="adm-form-grid">
          <label className="adm-field">
            <span>Syriatel Cash</span>
            <input
              value={draft.syriatelCash}
              dir="ltr"
              onChange={(event) => field("syriatelCash", event.target.value)}
            />
          </label>
          <label className="adm-field">
            <span>Sham Cash / BEMO</span>
            <input
              value={draft.shamCash}
              dir="ltr"
              onChange={(event) => field("shamCash", event.target.value)}
            />
          </label>
          <label className="adm-field">
            <span>MTN Cash</span>
            <input
              value={draft.mtnCash}
              dir="ltr"
              onChange={(event) => field("mtnCash", event.target.value)}
            />
          </label>
        </div>
      ),
    },
    {
      num: "04",
      tag: "قنوات الخدمة",
      title: "طرق الطلب المتاحة",
      body: (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {(
            [
              [
                "dineIn",
                "الطلب داخل المطعم",
                "عبر رمز QR الخاص بالطاولة",
              ] as const,
              [
                "takeaway",
                "الطلبات الخارجية",
                "استلام من المطعم",
              ] as const,
              [
                "delivery",
                "خدمة التوصيل",
                "حسب المناطق والحد الأدنى",
              ] as const,
            ]
          ).map(([key, label, hint]) => (
            <label className="adm-checkrow" key={key}>
              <input
                type="checkbox"
                checked={draft[key]}
                onChange={(event) => field(key, event.target.checked)}
              />
              <span className="adm-checkrow__lbl">
                <strong>{label}</strong>
                <small>{hint}</small>
              </span>
            </label>
          ))}
        </div>
      ),
    },
    {
      num: "05",
      tag: "الجدول الأسبوعي",
      title: "ساعات العمل",
      body: (
        <div>
          {draft.hours.map((hour, index) => (
            <div className="adm-hoursrow" key={hour.day}>
              <label className="adm-hoursrow__day">
                <input
                  type="checkbox"
                  checked={hour.enabled}
                  onChange={(event) =>
                    setHoursDay(index, { enabled: event.target.checked })
                  }
                />
                {hour.day}
              </label>
              <input
                type="time"
                disabled={!hour.enabled}
                value={hour.open}
                onChange={(event) =>
                  setHoursDay(index, { open: event.target.value })
                }
              />
              <span style={{ color: "var(--text-3)", fontSize: "0.8rem" }}>
                حتى
              </span>
              <input
                type="time"
                disabled={!hour.enabled}
                value={hour.close}
                onChange={(event) =>
                  setHoursDay(index, { close: event.target.value })
                }
              />
            </div>
          ))}
        </div>
      ),
    },
    {
      num: "06",
      tag: "مناطق التوصيل",
      title: "التوصيل حسب المنطقة",
      body: (
        <>
          {draft.zones.map((zone, index) => (
            <div className="adm-zone" key={zone.id}>
              <span className="adm-zone__num adm-num">
                {String(index + 1).padStart(2, "0")}
              </span>
              <label className="adm-field">
                <span>اسم المنطقة</span>
                <input
                  value={zone.name}
                  onChange={(event) => setZone(index, { name: event.target.value })}
                />
              </label>
              <label className="adm-field">
                <span>رسوم التوصيل</span>
                <input
                  type="number"
                  min="0"
                  value={zone.fee}
                  onChange={(event) =>
                    setZone(index, { fee: Number(event.target.value) })
                  }
                />
              </label>
              <label className="adm-field">
                <span>الحد الأدنى</span>
                <input
                  type="number"
                  min="0"
                  value={zone.minimum}
                  onChange={(event) =>
                    setZone(index, { minimum: Number(event.target.value) })
                  }
                />
              </label>
              <button
                className="adm-icobtn adm-icobtn--danger"
                type="button"
                aria-label={`حذف ${zone.name}`}
                title="حذف"
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    zones: current.zones.filter((_, i) => i !== index),
                  }))
                }
              >
                <Trash2 aria-hidden="true" />
              </button>
            </div>
          ))}
          <button
            className="adm-btn adm-btn--soft adm-btn--sm"
            type="button"
            onClick={addZone}
            style={{ alignSelf: "flex-start", marginTop: 6 }}
          >
            <Plus aria-hidden="true" />
            إضافة منطقة
          </button>
        </>
      ),
    },
  ];

  return (
    <>
      <PageHead
        kicker="إعداد المطعم"
        title="الهوية والتشغيل والدفع والتوصيل"
        lede="جميع التغييرات تُحفظ في القائمة وتُزامن مع قاعدة بيانات المطعم."
        actions={
          saved ? (
            <span className="adm-toast-saved">
              <CheckCircle2 aria-hidden="true" />
              تم حفظ التغييرات
            </span>
          ) : (
            <span className="adm-chip adm-chip--mode">
              <ShieldCheck aria-hidden="true" />
              مزامنة تلقائية
            </span>
          )
        }
      />

      <form
        style={{ display: "flex", flexDirection: "column", gap: "clamp(14px, 2vw, 20px)" }}
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        {sections.map((section, index) => {
          const Icon = SET_ICONS[index] ?? Store;
          return (
            <section className="adm-setsec" key={section.num}>
              <div className="adm-setsec__hd">
                <span className="adm-setsec__icon">
                  <Icon aria-hidden="true" />
                </span>
                <div className="adm-setsec__t">
                  <small>
                    {section.num} · {section.tag}
                  </small>
                  <h3>{section.title}</h3>
                </div>
              </div>
              <div className="adm-setsec__bd">{section.body}</div>
            </section>
          );
        })}

        <button className="adm-btn adm-btn--accent" type="submit" disabled={saving}>
          {saving ? (
            <Loader2 aria-hidden="true" />
          ) : saved ? (
            <Check aria-hidden="true" />
          ) : (
            <Check aria-hidden="true" />
          )}
          {saving
            ? "جارٍ الحفظ…"
            : saved
              ? "تم الحفظ"
              : "حفظ جميع التغييرات"}
        </button>
      </form>
    </>
  );
}

export {
  StaffAuthModal,
  AdminView,
  OperationsPanel,
  ReportsPanel,
  AdminOverview,
  TablesManager,
  TableCard,
  SettingsPanel,
  OrderCard,
  OrderDetails,
  MenuManager,
  CategoryManager,
  OptionEditor,
};
