import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import {
  Outlet,
  useLocation,
  useNavigate,
  useParams,
  Link,
} from "react-router-dom";
import {
  ArrowUp,
  Globe2,
  LayoutDashboard,
  MapPin,
  ShoppingBasket,
  Utensils,
  ReceiptText,
} from "lucide-react";
import { useUI } from "../context/UI";
import { useAuth } from "../context/Auth";
import { CafeProvider, useCafe } from "../context/Cafe";
import {
  DEFAULT_MENU_DESIGN,
  ensureGoogleFonts,
  menuDesignAttrs,
  menuDesignCssVars,
} from "../menuDesign";
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
      setScrolled(window.scrollY > 8);
      setShowTop(window.scrollY > 600);
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
  const locationLabel = restaurant.neighborhood
    ? `${restaurant.neighborhood} · ${restaurant.city}`
    : restaurant.city;

  const goMenu = () => {
    navigate(base);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const ds = restaurant.design ?? DEFAULT_MENU_DESIGN;
  const designStyle = useMemo(
    () => menuDesignCssVars(ds, restaurant.design ? undefined : restaurant.accent),
    [ds, restaurant.design, restaurant.accent],
  );
  const designAttrs = useMemo(() => menuDesignAttrs(ds), [ds]);
  const logoIsImage = Boolean(ds.content.logoUrl);

  useEffect(() => {
    ensureGoogleFonts(ds);
  }, [ds.type.display, ds.type.body]);

  const overlays: ReactNode = (
    <>
      {cafe.selectedItem && (
        <ItemModal
          item={cafe.selectedItem}
          currency={cafe.currency}
          rate={restaurant.rate}
          onClose={cafe.closeItem}
          onAdd={(item, options, note, qty) =>
            cafe.addToCart(item, options, note, qty)
          }
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
      style={designStyle as CSSProperties}
      {...designAttrs}
    >
      {/* Skip link for keyboard users */}
      <a className="cx-skip" href="#cx-main">
        تخطَّ إلى المحتوى
      </a>

      <header className={`cx-head${scrolled ? " is-scrolled" : ""}`}>
        <div className="cx-head__in">
          <button
            type="button"
            className="cx-brand"
            onClick={goMenu}
            aria-label={`${restaurant.name} — العودة إلى القائمة`}
          >
            <span className="cx-brand__seal" aria-hidden="true">
              {logoIsImage ? (
                <img src={ds.content.logoUrl} alt="" />
              ) : (
                restaurant.logo || "م"
              )}
            </span>
            <span className="cx-brand__id">
              <b>{restaurant.name}</b>
              <small>
                <MapPin size={11} strokeWidth={2.6} aria-hidden="true" />
                {locationLabel}
              </small>
            </span>
          </button>

          <nav className="cx-head__nav" aria-label="التنقل الرئيسي">
            <button
              type="button"
              className={`cx-navlink${onMenu ? " is-active" : ""}`}
              onClick={goMenu}
            >
              <Utensils size={17} aria-hidden="true" />
              <span>القائمة</span>
            </button>
            <button
              type="button"
              className={`cx-navlink${onOrders ? " is-active" : ""}`}
              onClick={() => navigate(`${base}/orders`)}
            >
              <ReceiptText size={17} aria-hidden="true" />
              <span>طلباتي</span>
            </button>
            {canAdmin && (
              <button
                type="button"
                className="cx-navlink"
                onClick={() => navigate(`/admin/${slug}`)}
              >
                <LayoutDashboard size={17} aria-hidden="true" />
                <span>الإدارة</span>
              </button>
            )}
          </nav>

          <div className="cx-head__tools">
            <span className={`cx-live${cafe.isOnline ? "" : " is-off"}`}>
              <i aria-hidden="true" />
              {cafe.isOnline ? "متصل" : "دون اتصال"}
              {cafe.tableContext ? ` · ${cafe.tableContext.labelAr}` : ""}
            </span>
            <button
              type="button"
              className="cx-lang"
              onClick={toggleLanguage}
              aria-label="تغيير اللغة / Change language"
            >
              <Globe2 size={17} aria-hidden="true" />
              <span>{language === "ar" ? "EN" : "عربي"}</span>
            </button>
            <button
              type="button"
              className="cx-cartbtn"
              onClick={cafe.openCart}
              aria-label={`فتح سلة الطلب${
                cafe.cartCount ? ` — ${cafe.cartCount} صنف` : ""
              }`}
            >
              <ShoppingBasket size={21} aria-hidden="true" />
              {cafe.cartCount > 0 && (
                <b className="cx-cartbtn__badge" aria-hidden="true">
                  {cafe.cartCount}
                </b>
              )}
            </button>
          </div>
        </div>
      </header>

      <main id="cx-main" className="cx-main">
        <Outlet />
        <div className="cx-bottompad" aria-hidden="true" />
      </main>

      {overlays}

      {showDock && (
        <div className="cx-dock">
          <button type="button" className="cx-dock__btn" onClick={cafe.openCart}>
            <span className="cx-dock__bag" aria-hidden="true">
              <ShoppingBasket size={20} />
              <b>{cafe.cartCount}</b>
            </span>
            <span className="cx-dock__mid">
              <strong>عرض الطلب والمتابعة</strong>
              <small>اضغط لإتمام طلبك</small>
            </span>
            <span className="cx-dock__total">{dockTotal}</span>
            <span className="cx-dock__go" aria-hidden="true">
              <span>تأكيد</span>
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
        >
          <ArrowUp size={20} aria-hidden="true" />
        </button>
      )}

      {cafe.notice && (
        <div className="cx-toast" role="status">
          <span aria-hidden="true">✦</span>
          {cafe.notice}
        </div>
      )}

      {/* Mobile bottom dock navigation */}
      <nav className="cx-bottab" aria-label="التنقل السريع">
        <Link
          className={`cx-bottab__item${onMenu ? " is-active" : ""}`}
          to={base}
        >
          <span className="cx-bottab__ico" aria-hidden="true">
            <Utensils size={20} />
          </span>
          القائمة
        </Link>
        <Link
          className={`cx-bottab__item${onOrders ? " is-active" : ""}`}
          to={`${base}/orders`}
        >
          <span className="cx-bottab__ico" aria-hidden="true">
            <ReceiptText size={20} />
          </span>
          طلباتي
        </Link>
        {canAdmin && (
          <Link className="cx-bottab__item" to={`/admin/${slug}`}>
            <span className="cx-bottab__ico" aria-hidden="true">
              <LayoutDashboard size={20} />
            </span>
            الإدارة
          </Link>
        )}
        <button type="button" className="cx-bottab__item" onClick={cafe.openCart}>
          <span className="cx-bottab__ico" aria-hidden="true">
            <ShoppingBasket size={20} />
            {cafe.cartCount > 0 && <b>{cafe.cartCount}</b>}
          </span>
          السلة
        </button>
      </nav>
    </div>
  );
}
