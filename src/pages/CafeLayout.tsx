import { useCustomerText } from "../features/customerText";
import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import {
  Outlet,
  useLocation,
  useNavigate,
  useParams,
  Link,
} from "react-router-dom";
import {
  ArrowUp,
  Check,
  CircleAlert,
  Globe2,
  Info,
  LoaderCircle,
  LayoutDashboard,
  MapPin,
  ShoppingBasket,
  Utensils,
  ReceiptText,
} from "lucide-react";
import { useUI } from "../context/UI";
import { useAuth } from "../context/Auth";
import { CafeProvider, useCafe } from "../context/Cafe";
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
  const { t: tx } = useCustomerText();
  const cafe = useCafe();
  const { language, dir, toggleLanguage } = useUI();
  const noticeText = cafe.notice?.message ?? "";
  const NoticeIcon =
    cafe.notice?.kind === "success"
      ? Check
      : cafe.notice?.kind === "warning" || cafe.notice?.kind === "error"
        ? CircleAlert
        : cafe.notice?.kind === "loading"
          ? LoaderCircle
          : Info;
  const { staffEmail, memberships } = useAuth();
  const { slug, restaurant } = cafe;
  const navigate = useNavigate();
  const location = useLocation();

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    document.getElementById("cx-main")?.focus({ preventScroll: true });
  }, [location.pathname]);

  const [scrolled, setScrolled] = useState(false);
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const currentY = window.scrollY;
      setScrolled(currentY > 8);
      setShowTop(currentY > 600);
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

  const logoUrl = restaurant.design?.content.logoUrl || "";

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
          restaurantSlug={cafe.slug}
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
    <div className="cx cx--fresh experience-app" dir={dir}>
      <a className="cx-skip" href="#cx-main">
        {tx("تخطَّ إلى المحتوى")}
      </a>
      <header className="cx-head">
        <div className="app-topbar">
          <Link
            to="/"
            className="app-back"
            aria-label={language === "en" ? "All restaurants" : "كل المطاعم"}
          >
            <ArrowUp size={20} />
          </Link>
          <Link to={base} className="app-restaurant">
            <span>
              {logoUrl ? <img src={logoUrl} alt="" /> : <Utensils size={21} />}
            </span>
            <div>
              <b>
                {language === "en"
                  ? restaurant.nameEn || restaurant.name
                  : restaurant.name}
              </b>
              <small>{locationLabel}</small>
            </div>
          </Link>
          <nav className="app-desktop-nav">
            <Link to={base} aria-current={onMenu ? "page" : undefined}>
              {tx("القائمة")}
            </Link>
            <Link
              to={`${base}/orders`}
              aria-current={onOrders ? "page" : undefined}
            >
              {tx("طلباتي")}
            </Link>
            {canAdmin && <Link to={`/admin/${slug}`}>{tx("الإدارة")}</Link>}
          </nav>
          <div className="app-topbar__tools">
            <button
              className="app-language"
              onClick={toggleLanguage}
              aria-label="تغيير اللغة / Change language"
            >
              <Globe2 size={17} />
              {language === "ar" ? "EN" : "عربي"}
            </button>
            <button
              className="cx-cartbtn"
              onClick={cafe.openCart}
              aria-label={language === "en" ? "Open basket" : "فتح سلة الطلب"}
            >
              <ShoppingBasket size={21} />
              {cafe.cartCount > 0 && <b>{cafe.cartCount}</b>}
            </button>
          </div>
        </div>
      </header>
      {(!cafe.isOnline || cafe.tableContext) && (
        <div
          className={`app-context${!cafe.isOnline ? " is-off" : ""}`}
          role="status"
        >
          {cafe.isOnline ? (
            <>
              <Check size={15} />
              {language === "en"
                ? `Ordering for ${cafe.tableContext?.labelEn || cafe.tableContext?.labelAr}`
                : `الطلب للطاولة ${cafe.tableContext?.labelAr}`}
            </>
          ) : (
            <>
              <CircleAlert size={15} />
              {tx("دون اتصال")}
            </>
          )}
        </div>
      )}
      <div className={`app-layout${onMenu ? " has-order-rail" : ""}`}>
        <main id="cx-main" className="cx-main" tabIndex={-1}>
          <Outlet />
        </main>
        {onMenu && (
          <aside className="desktop-order-rail">
            <header>
              <ShoppingBasket size={21} />
              <h2>{language === "en" ? "Your order" : "طلبك"}</h2>
              <span>{cafe.cartCount}</span>
            </header>
            {cafe.cart.length ? (
              <>
                <div className="rail-lines">
                  {cafe.cart.map((line) => (
                    <div key={line.key}>
                      <span>{line.qty}×</span>
                      <div>
                        <b>
                          {language === "en"
                            ? line.item.en || line.item.name
                            : line.item.name}
                        </b>
                        <small>
                          {line.options
                            .map((o) =>
                              language === "en" ? o.en || o.name : o.name,
                            )
                            .join(" · ")}
                        </small>
                      </div>
                      <strong>
                        {cafe.currency === "usd"
                          ? formatUsd(
                              (line.item.price +
                                line.options.reduce((a, o) => a + o.price, 0)) *
                                line.qty,
                              restaurant.rate,
                            )
                          : formatSyp(
                              (line.item.price +
                                line.options.reduce((a, o) => a + o.price, 0)) *
                                line.qty,
                            )}
                      </strong>
                    </div>
                  ))}
                </div>
                <div className="rail-subtotal">
                  <span>
                    {language === "en" ? "Subtotal" : "المجموع الفرعي"}
                  </span>
                  <b>{dockTotal}</b>
                </div>
                <p>
                  {language === "en"
                    ? "Fees and discounts are calculated at checkout."
                    : "تُحسب الرسوم والخصم عند إتمام الطلب."}
                </p>
                <button
                  className="ui-button ui-button--primary"
                  onClick={cafe.openCart}
                >
                  {language === "en" ? "Review your basket" : "راجع سلتك"}
                  <ArrowUp size={18} />
                </button>
              </>
            ) : (
              <div className="rail-empty">
                <ShoppingBasket size={42} strokeWidth={1.1} />
                <h3>
                  {language === "en"
                    ? "A little room for delicious"
                    : "في مكان لشي طيب"}
                </h3>
                <p>
                  {language === "en"
                    ? "Choose a dish from the menu. We’ll keep your order here."
                    : "اختار أطباقك من المنيو. طلبك رح يكون هون."}
                </p>
              </div>
            )}
            <div className="rail-table">
              <Utensils size={17} />
              <span>
                {language === "en"
                  ? "Dining in? Scan your table QR."
                  : "قاعد بالمطعم؟ امسح رمز طاولتك."}
              </span>
            </div>
          </aside>
        )}
      </div>
      {overlays}
      {showDock && (
        <div className="cx-dock">
          <button className="cx-dock__btn" onClick={cafe.openCart}>
            <span>
              <ShoppingBasket size={20} />
              <b>{cafe.cartCount}</b>
            </span>
            <strong>{language === "en" ? "View basket" : "عرض السلة"}</strong>
            <strong>{dockTotal}</strong>
          </button>
        </div>
      )}
      <nav className="cx-bottab" aria-label={tx("التنقل الرئيسي")}>
        <Link
          to={base}
          className={`cx-bottab__item${onMenu ? " is-active" : ""}`}
          aria-current={onMenu ? "page" : undefined}
        >
          <Utensils size={21} />
          <span>{tx("القائمة")}</span>
        </Link>
        <Link
          to={`${base}/orders`}
          className={`cx-bottab__item${onOrders ? " is-active" : ""}`}
          aria-current={onOrders ? "page" : undefined}
        >
          <ReceiptText size={21} />
          <span>{tx("طلباتي")}</span>
        </Link>
        <button className="cx-bottab__item" onClick={cafe.openCart}>
          <ShoppingBasket size={21} />
          <span>
            {language === "en" ? "Basket" : "السلة"}
            {cafe.cartCount > 0 ? ` (${cafe.cartCount})` : ""}
          </span>
        </button>
      </nav>
      {cafe.notice &&
        !cafe.selectedItem &&
        !cafe.cartOpen &&
        !cafe.checkoutOpen &&
        !cafe.trackingOrder && (
          <div className={`app-notice is-${cafe.notice.kind}`} role="status">
            <NoticeIcon size={19} />
            <span>{noticeText}</span>
          </div>
        )}
    </div>
  );
}
