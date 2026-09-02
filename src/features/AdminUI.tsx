import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ArrowRight, ArrowUp, Check, ClipboardList, Globe2, LayoutDashboard, Minus, Plus, Search, ShieldCheck, ShoppingBasket, Store, Truck, Utensils, X } from "lucide-react";
import QRCode from "qrcode";
import { supabase } from "../supabase";
import { cafePath, defaultCategories, formatSyp, formatUsd, images, makeItems, mapAdminOrder, modeLabels, readStored, restaurants, statusLabels, tagLabels, writeStored, type AdminOrderRow, type AuditEntry, type BusinessHour, type CartLine, type Category, type DeliveryZone, type Item, type MenuCategory, type Mode, type OperationsState, type Option, type OptionGroup, type Order, type PublicMenuPayload, type Restaurant, type RestaurantMembership, type RestaurantSettings, type RestaurantTable, type StaffMember, type StaffRole, type Tag, type View } from "../domain";

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


export { StaffAuthModal, AdminView, OperationsPanel, ReportsPanel, AdminOverview, TablesManager, TableCard, SettingsPanel, OrderCard, OrderDetails, MenuManager, CategoryManager, OptionEditor };
