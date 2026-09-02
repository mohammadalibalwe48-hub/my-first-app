import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import {
  Outlet,
  useLocation,
  useNavigate,
  useParams,
  Link,
} from "react-router-dom";
import { ArrowUp, ClipboardList, Globe2, LayoutDashboard, ShoppingBasket, Utensils } from "lucide-react";
import { useUI } from "../context/UI";
import { useAuth } from "../context/Auth";
import { CafeProvider, useCafe } from "../context/Cafe";
import { cafeThemeVars } from "../cafeTheme";
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
      setScrolled(window.scrollY > 40);
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

  const openAdmin = () => navigate(memberOfThisCafe ? `/admin/${slug}` : "/admin");

  const overlays: ReactNode = (
    <>
      {cafe.notice && (
        <div className="toast" role="status">
          {cafe.notice}
        </div>
      )}
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
      className="app-root"
      dir={dir}
      style={cafeThemeVars(slug) as CSSProperties}
    >
      <header className={`navbar${scrolled ? " navbar--scrolled" : ""}`}>
        <button
          className="navbar__brand"
          onClick={() => {
            navigate(base);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          aria-label="العودة إلى القائمة"
        >
          <span className="navbar__logo">{restaurant.logo || "س"}</span>
          <span>
            <strong className="navbar__brand-name">{restaurant.name}</strong>
            <small className="navbar__brand-sub">{restaurant.subtitle}</small>
            <span className="navbar__brand-loc">
              {restaurant.neighborhood}، {restaurant.city}
            </span>
          </span>
        </button>

        <nav className="navbar__nav" aria-label="التنقل الرئيسي">
          <button
            className={`navbar__link${onMenu ? " navbar__link--active" : ""}`}
            onClick={() => navigate(base)}
          >
            <Utensils />
            <span className="navbar__btn-text">القائمة</span>
          </button>
          <button
            className={`navbar__link${onOrders ? " navbar__link--active" : ""}`}
            onClick={() => navigate(`${base}/orders`)}
          >
            <ClipboardList />
            <span className="navbar__btn-text">طلباتي</span>
          </button>
          {staffEmail && memberOfThisCafe && (
            <button
              className={`navbar__link${location.pathname.startsWith("/admin") ? " navbar__link--active" : ""}`}
              onClick={openAdmin}
            >
              <LayoutDashboard />
              <span className="navbar__btn-text">الإدارة</span>
            </button>
          )}
        </nav>

        <div className="navbar__actions">
          <div className="navbar__status">
            <i className={cafe.isOnline ? "" : "is-off"} />
            <span>{cafe.isOnline ? "متصل" : "دون اتصال"}</span>
            {cafe.tableContext && <b>· {cafe.tableContext.labelAr}</b>}
          </div>
          <button
            className="navbar__btn"
            onClick={toggleLanguage}
            aria-label="تغيير اللغة"
          >
            <Globe2 />
            <span className="navbar__btn-text">
              {language === "ar" ? "EN" : "عربي"}
            </span>
          </button>
          <button
            className="navbar__btn navbar__cart"
            onClick={cafe.openCart}
          >
            <ShoppingBasket />
            <span className="navbar__btn-text">كشف الطلب</span>
            <b>{cafe.cartCount}</b>
          </button>
        </div>
      </header>

      <div>
        <main>
          <Outlet />
        </main>
        <div className="cafe-bottom-spacer" aria-hidden="true" />
      </div>

      {overlays}

      {showTop && (
        <button
          className="scroll-top"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="العودة إلى الأعلى"
          title="العودة إلى الأعلى"
        >
          <ArrowUp />
        </button>
      )}

      <nav className="mobile-nav" aria-label="التنقل السريع">
        <Link
          className={`mobile-nav__item${onMenu ? " active" : ""}`}
          to={base}
        >
          <span className="mobile-nav__icon">
            <Utensils />
          </span>
          <span>القائمة</span>
        </Link>
        <Link
          className={`mobile-nav__item${onOrders ? " active" : ""}`}
          to={`${base}/orders`}
        >
          <span className="mobile-nav__icon">
            <ClipboardList />
          </span>
          <span>طلباتي</span>
        </Link>
        <button className="mobile-nav__item" onClick={cafe.openCart}>
          <span className="mobile-nav__icon">
            <ShoppingBasket />
            {cafe.cartCount > 0 && <b>{cafe.cartCount}</b>}
          </span>
          <span>السلة</span>
        </button>
        {staffEmail && memberOfThisCafe && (
          <Link
            className={`mobile-nav__item${location.pathname.startsWith("/admin") ? " active" : ""}`}
            to={`/admin/${slug}`}
          >
            <span className="mobile-nav__icon">
              <LayoutDashboard />
            </span>
            <span>الإدارة</span>
          </Link>
        )}
      </nav>
    </div>
  );
}
