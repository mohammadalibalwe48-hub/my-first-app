import { useEffect, useState, type CSSProperties } from "react";
import {
  Navigate,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import { ArrowRight, Home, LayoutDashboard, Store } from "lucide-react";
import { supabase } from "../../supabase";
import { useAuth } from "../../context/Auth";
import { useUI } from "../../context/UI";
import { useRestaurant } from "../../hooks/useRestaurant";
import { AdminView } from "../../features/AdminUI";
import { cafeThemeVars } from "../../cafeTheme";
import {
  formatSyp,
  images,
  modeLabels,
  type Item,
  type MenuCategory,
  type Mode,
  type Order,
  type Restaurant,
  type RestaurantSettings,
} from "../../domain";

const TABS = [
  "overview",
  "orders",
  "menu",
  "tables",
  "reports",
  "operations",
  "settings",
] as const;
type AdminTab = (typeof TABS)[number];

const DAYS = [
  "الأحد",
  "الاثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];

export default function AdminWorkspacePage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const { authReady, staffEmail, memberships, platformAdmin, signOut } = useAuth();
  const { dir } = useUI();
  const navigate = useNavigate();
  const location = useLocation();

  const data = useRestaurant(slug);
  const [items, setItems] = useState<Item[]>(data.menuItems);
  const [categories, setCategories] = useState<MenuCategory[]>(data.categories);
  const [settings, setSettings] = useState<RestaurantSettings>(data.settings);
  const [orders, setOrders] = useState<Order[]>([]);

  const membership = memberships.find((m) => m.restaurantSlug === slug);
  const restaurantDatabaseId = membership?.restaurantId ?? "";

  useEffect(() => {
    if (data.restaurant.name) {
      document.title = `لوحة الإدارة — ${data.restaurant.name}`;
    }
  }, [data.restaurant.name]);

  useEffect(() => {
    if (data.ready) {
      setItems(data.menuItems);
      setCategories(data.categories);
      setSettings(data.settings);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, data.ready]);

  // Remote order desk: fetch + realtime updates for this restaurant.
  useEffect(() => {
    if (!staffEmail || !membership?.restaurantId) return;
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
        window.alert(`تعذر تحميل طلبات المطعم: ${error.message}`);
        return;
      }
      const rows = ((data ?? []) as unknown as Array<{
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
      }>).map((row) => ({
        id: String(row.order_number),
        databaseId: row.id,
        restaurantId: slug,
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
          options: (line.order_line_options ?? []).map((o) => ({
            id: o.option_id ?? o.id,
            name: o.option_name_ar,
            price: Number(o.price_delta_syp),
          })),
        })),
        customer: row.customer_name ?? "زبون المطعم",
        phone: row.customer_phone ?? "",
        address: row.delivery_address ?? "",
        table:
          row.restaurant_tables?.label_ar ??
          row.restaurant_tables?.table_code ??
          "",
        total: Number(row.total_syp),
        payment: row.payment_method,
        paymentStatus: row.payment_status,
        paymentReference: row.payment_reference ?? "",
        internalNote: row.internal_note ?? "",
        cancellationReason: row.cancellation_reason ?? "",
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
      setOrders(rows);
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
  }, [staffEmail, membership?.restaurantId, slug]);

  const persistOrderPatch = async (id: string, patch: Partial<Order>) => {
    const existing = orders.find((order) => order.id === id);
    const updatedAt = new Date().toISOString();
    setOrders((current) =>
      current.map((order) =>
        order.id === id ? { ...order, ...patch, updatedAt } : order,
      ),
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
      window.alert(`تعذر حفظ تحديث الطلب: ${error.message}`);
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
      if (!error) {
        dispatchId = String((data as { id?: string } | null)?.id || "");
      }
    }
    const message = [
      `*${restaurantForView.name} — طلب جديد*`,
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
    window.open(
      `https://wa.me/${restaurantForView.whatsapp}?text=${encodeURIComponent(message)}`,
      "_blank",
    );
    if (dispatchId) {
      void supabase.rpc("update_whatsapp_dispatch", {
        p_dispatch_id: dispatchId,
        p_state: "sent",
        p_provider_message_id: null,
        p_error_code: null,
      });
    }
  };

  const onSettingsChange = async (next: RestaurantSettings) => {
    const previous = settings;
    setSettings(next);
    if (!membership) return;
    const { error } = await supabase.rpc("sync_admin_settings", {
      p_restaurant_id: membership.restaurantId,
      p_payload: {
        ...next,
        hours: next.hours.map((hour) => ({
          ...hour,
          weekday: DAYS.indexOf(hour.day),
        })),
        wallets: [
          { provider: "Syriatel Cash", merchantIdentifier: next.syriatelCash },
          { provider: "Sham Cash / BEMO", merchantIdentifier: next.shamCash },
          { provider: "MTN Cash", merchantIdentifier: next.mtnCash },
        ],
      },
    });
    if (error) {
      setSettings(previous);
      window.alert(`تعذر حفظ الإعدادات: ${error.message}`);
    }
  };

  const restaurantForView: Restaurant = { ...data.restaurant, items };

  const tail = location.pathname.replace(`/admin/${slug}/`, "").replace(/\/$/, "");
  const tab: AdminTab = (TABS as readonly string[]).includes(tail)
    ? (tail as AdminTab)
    : "overview";

  if (!authReady) {
    return (
      <div className="app-root" dir={dir} style={cafeThemeVars(slug) as CSSProperties}>
        <div className="admin section">
          <div className="empty-state">
            <h3>جارٍ التحقق من الجلسة…</h3>
          </div>
        </div>
      </div>
    );
  }
  if (!staffEmail || memberships.length === 0) {
    return <Navigate to="/admin" replace />;
  }
  if (!membership) {
    return <Navigate to={`/admin/${memberships[0].restaurantSlug}`} replace />;
  }

  const goTab = (t: AdminTab) =>
    navigate(t === "overview" ? `/admin/${slug}` : `/admin/${slug}/${t}`);

  return (
    <div
      className="app-root"
      dir={dir}
      style={cafeThemeVars(slug) as CSSProperties}
    >
      <header className="admin-bar">
        <button className="admin-bar__link" onClick={() => navigate("/")}>
          <Home /> <span>SYRIAN QR</span>
        </button>
        <span className="admin-bar__sep">·</span>
        {platformAdmin && (
          <>
            <button
              className="admin-bar__link"
              onClick={() => navigate("/platform")}
            >
              <LayoutDashboard /> <span>لوحة المنصة</span>
            </button>
            <span className="admin-bar__sep">·</span>
          </>
        )}
        <button className="admin-bar__link" onClick={() => navigate(`/c/${slug}`)}>
          <Store /> <span>المتجر</span>
          <ArrowRight />
        </button>
        <span className="admin-bar__spacer" />
        <button className="admin-bar__link" onClick={() => void signOut()}>
          تسجيل الخروج
        </button>
      </header>
      <AdminView
        restaurant={restaurantForView}
        settings={settings}
        categories={categories}
        tab={tab}
        setTab={goTab}
        orders={orders}
        restaurantDatabaseId={restaurantDatabaseId}
        onStatus={updateOrderStatus}
        onWhatsApp={(o) => void openWhatsApp(o)}
        onOrderChange={(id, patch) => void persistOrderPatch(id, patch)}
        onSwitch={(id) => navigate(`/admin/${id}`)}
        memberships={memberships}
        staffEmail={staffEmail}
        onSignOut={async () => {
          await signOut();
          navigate("/");
        }}
        onItemsChange={setItems}
        onCategoriesChange={setCategories}
        onSettingsChange={onSettingsChange}
      />
    </div>
  );
}
