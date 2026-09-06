import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import {
  Outlet,
  useLocation,
  useNavigate,
  useParams,
  Link,
} from "react-router-dom";
import {
  ArrowRight,
  ArrowUp,
  ClipboardList,
  Globe2,
  LayoutDashboard,
  ShoppingBasket,
  Utensils,
} from "lucide-react";
import { useUI } from "../context/UI";
import { useAuth } from "../context/Auth";
import { CafeProvider, useCafe } from "../context/Cafe";
import { cafeThemeVars } from "../cafeTheme";
import { formatSyp, formatUsd } from "../domain";
import {
  CartDrawer,
  CheckoutModal,
  ItemModal,
  TrackingModal,
} from "../features/CustomerUI";

export default function CafeLayout() {
  const { slug } = useParams<{ slug: string }>();
  if (!slug) return null;
  return (
    <CafeProvider slug={slug}>
      <CafeShell />
    </CafeProvider>
  );
}

function CafeShell() {
  const cafe = useCafe();
  const { language, dir, toggleLanguage } = useUI();
  const { staffEmail, memberships } = useAuth();
  const { slug, restaurant } = cafe;
  const navigate = useNavigate();
  const location = useLocation();

  const [scrolled, setScrolled] = useState(false);
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 10);
      setShowTop(window.scrollY > 560);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const base = `/c/${slug}`;
  const onMenu = location.pathname === base;
  const onOrders = location.pathname === `${base}/orders`;
  const memberOfThisCafe = memberships.some((m) => m.restaurantSlug === slug);
  const canAdmin = Boolean(staffEmail && memberOfThisCafe);
  const showDock =
    onMenu && cafe.cartCount > 0 && !cafe.cartOpen && !cafe.checkoutOpen;
  const dockTotal =
    cafe.currency === "usd"
      ? formatUsd(cafe.total, restaurant.rate)
      : formatSyp(cafe.total);

  const overlays: ReactNode = (
    <>
      {cafe.selectedItem && (
        <ItemModal
          item={cafe.selectedItem}
          currency={cafe.currency}
          rate={restaurant.rate}
          onClose={cafe.closeItem}
          onAdd={(item, options, note) => cafe.addToCart(item, options, note)}
        />
      )}
      {cafe.cartOpen && (
        <CartDrawer
          cart={cafe.cart}
          total={cafe.total}
          currency={cafe.currency}
          rate={restaurant.rate}
          onClose={cafe.closeCart}
          onQty={cafe.updateQty}
          onCheckout={cafe.openCheckout}
        />
      )}
      {cafe.checkoutOpen && (
        <CheckoutModal
          total={cafe.total}
          mode={cafe.mode}
          setMode={cafe.setMode}
          onClose={cafe.closeCheckout}
          onSubmit={cafe.placeOrder}
          settings={cafe.settings}
          tableContext={cafe.tableContext}
          backendReady={cafe.ready && cafe.isOnline}
          currency={cafe.currency}
          rate={restaurant.rate}
          lines={cafe.cart}
        />
      )}
      {cafe.trackingOrder && (
        <TrackingModal
          order={cafe.trackingOrder}
          onClose={cafe.closeTracking}
          onWhatsApp={cafe.openWhatsApp}
        />
      )}
    </>
  );

  return (
    <div
      className="cx"
      dir={dir}
      style={cafeThemeVars(slug) as CSSProperties}
    >
      {/* Top app bar */}
      <header className={`cx-topbar${scrolled ? " is-scrolled" : ""}`}>
        <div className="cx-topbar__in">
          <button
            type="button"
            className="cx-topbar__brand"
            onClick={() => {
              navigate(base);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            aria-label="العودة إلى القائمة"
          >
            <span className="cx-topbar__logo">{restaurant.logo || "س"}</span>
            <span>
              <b>{restaurant.name}</b>
              <small>{restaurant.subtitle}</small>
            </span>
          </button>

          <nav className="cx-topbar__nav" aria-label="التنقل الرئيسي">
            <button
              type="button"
              className={`cx-topbar__link${onMenu ? " is-active" : ""}`}
              onClick={() => navigate(base)}
            >
              <Utensils />
              <span className="cx-topbar__link-txt">القائمة</span>
            </button>
            <button
              type="button"
              className={`cx-topbar__link${onOrders ? " is-active" : ""}`}
              onClick={() => navigate(`${base}/orders`)}
            >
              <ClipboardList />
              <span className="cx-topbar__link-txt">طلباتي</span>
            </button>
            {canAdmin && (
              <button
                type="button"
                className="cx-topbar__link"
                onClick={() => navigate(`/admin/${slug}`)}
              >
                <LayoutDashboard />
                <span className="cx-topbar__link-txt">الإدارة</span>
              </button>
            )}
          </nav>

          <span className="cx-topbar__spacer" />

          <div className="cx-topbar__actions">
            <span className={`cx-live${cafe.isOnline ? "" : " is-off"}`}>
              <i />
              {cafe.isOnline ? "متصل" : "دون اتصال"}
              {cafe.tableContext ? ` · ${cafe.tableContext.labelAr}` : ""}
            </span>
            <button
              type="button"
              className="cx-pillbtn"
              onClick={toggleLanguage}
              aria-label="تغيير اللغة"
            >
              <Globe2 />
              <span>{language === "ar" ? "EN" : "عربي"}</span>
            </button>
            <button
              type="button"
              className="cx-pillbtn cx-topbar__cartbtn"
              onClick={cafe.openCart}
              aria-label="فتح سلة الطلب"
            >
              <ShoppingBasket />
              {cafe.cartCount > 0 && <b className="cx-count">{cafe.cartCount}</b>}
            </button>
          </div>
        </div>
      </header>

      <main>
        <Outlet />
        <div className="cx-bottompad" aria-hidden="true" />
      </main>

      {overlays}

      {showDock && (
        <div className="cx-dock-wrap">
          <button type="button" className="cx-dock" onClick={cafe.openCart}>
            <span className="cx-dock__bag">
              <ShoppingBasket />
              <b>{cafe.cartCount}</b>
            </span>
            <span className="cx-dock__mid">
              <strong>عرض طلبك</strong>
              <small>اضغط للمتابعة إلى تفاصيل الطلب</small>
            </span>
            <span className="cx-dock__total">{dockTotal}</span>
            <span className="cx-dock__go">
              <ArrowRight className="cx-arrow" />
            </span>
          </button>
        </div>
      )}

      {showTop && (
        <button
          type="button"
          className="cx-topbtn"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="العودة إلى الأعلى"
          title="العودة إلى الأعلى"
        >
          <ArrowUp />
        </button>
      )}

      {cafe.notice && (
        <div className="cx-toast" role="status">
          {cafe.notice}
        </div>
      )}

      {/* Mobile bottom tabs */}
      <nav className="cx-tabs" aria-label="التنقل السريع">
        <Link className={`cx-tabs__item${onMenu ? " is-active" : ""}`} to={base}>
          <span className="cx-tabs__ico">
            <Utensils />
          </span>
          القائمة
        </Link>
        <Link
          className={`cx-tabs__item${onOrders ? " is-active" : ""}`}
          to={`${base}/orders`}
        >
          <span className="cx-tabs__ico">
            <ClipboardList />
          </span>
          طلباتي
        </Link>
        {canAdmin ? (
          <Link
            className="cx-tabs__item"
            to={`/admin/${slug}`}
          >
            <span className="cx-tabs__ico">
              <LayoutDashboard />
            </span>
            الإدارة
          </Link>
        ) : (
          <button type="button" className="cx-tabs__item" onClick={cafe.openCart}>
            <span className="cx-tabs__ico">
              <ShoppingBasket />
              {cafe.cartCount > 0 && <b>{cafe.cartCount}</b>}
            </span>
            السلة
          </button>
        )}
      </nav>
    </div>
  );
}
