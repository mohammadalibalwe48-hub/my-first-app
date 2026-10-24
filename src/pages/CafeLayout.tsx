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
    <div className="cx cx--fresh" dir={dir}>
      {/* Skip link for keyboard users */}
      <a className="cx-skip" href="#cx-main">
        {tx("تخطَّ إلى المحتوى")}
      </a>

      <header className={`cx-head${scrolled ? " is-scrolled" : ""}`}>
        <div className="cx-head__in">
          <button
            type="button"
            className="cx-brand"
            onClick={goMenu}
            aria-label={
              language === "en"
                ? `${restaurant.name} — Back to menu`
                : `${restaurant.name} — العودة إلى القائمة`
            }
          >
            <span className="cx-brand__seal" aria-hidden="true">
              {logoUrl ? <img src={logoUrl} alt="" /> : restaurant.logo || "م"}
            </span>
            <span className="cx-brand__id">
              <b>
                {language === "en"
                  ? restaurant.nameEn || restaurant.name
                  : restaurant.name}
              </b>
              <small>
                <MapPin size={11} strokeWidth={2.6} aria-hidden="true" />
                {locationLabel}
              </small>
            </span>
          </button>

          <nav className="cx-head__nav" aria-label={tx("التنقل الرئيسي")}>
            <button
              type="button"
              className={`cx-navlink${onMenu ? " is-active" : ""}`}
              onClick={goMenu}
            >
              <Utensils size={17} aria-hidden="true" />
              <span>{tx("القائمة")}</span>
            </button>
            <button
              type="button"
              className={`cx-navlink${onOrders ? " is-active" : ""}`}
              onClick={() => navigate(`${base}/orders`)}
            >
              <ReceiptText size={17} aria-hidden="true" />
              <span>{tx("طلباتي")}</span>
            </button>
            {canAdmin && (
              <button
                type="button"
                className="cx-navlink"
                onClick={() => navigate(`/admin/${slug}`)}
              >
                <LayoutDashboard size={17} aria-hidden="true" />
                <span>{tx("الإدارة")}</span>
              </button>
            )}
          </nav>

          <div className="cx-head__tools">
            {(!cafe.isOnline || cafe.tableContext) && (
              <span className={`cx-live${cafe.isOnline ? "" : " is-off"}`}>
                <i aria-hidden="true" />
                {cafe.isOnline ? cafe.tableContext?.labelAr : tx("دون اتصال")}
              </span>
            )}
            <button
              type="button"
              className="cx-lang"
              onClick={toggleLanguage}
              aria-label={tx("تغيير اللغة / Change language")}
            >
              <Globe2 size={17} aria-hidden="true" />
              <span>{language === "ar" ? "EN" : tx("عربي")}</span>
            </button>
            <button
              type="button"
              className="cx-cartbtn"
              onClick={cafe.openCart}
              aria-label={`${language === "en" ? "Open basket" : "فتح سلة الطلب"}${
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

      <main id="cx-main" className="cx-main" tabIndex={-1}>
        <div className="cx-page" key={location.pathname}>
          <Outlet />
        </div>
        <div className="cx-bottompad" aria-hidden="true" />
      </main>

      {overlays}

      {showDock && (
        <div className="cx-dock">
          <button
            type="button"
            className="cx-dock__btn"
            onClick={cafe.openCart}
          >
            <span className="cx-dock__bag" aria-hidden="true">
              <ShoppingBasket size={20} />
              <b>{cafe.cartCount}</b>
            </span>
            <span className="cx-dock__mid">
              <strong>{tx("عرض الطلب والمتابعة")}</strong>
              <small>{tx("اضغط لإتمام طلبك")}</small>
            </span>
            <span className="cx-dock__total">{dockTotal}</span>
            <span className="cx-dock__go" aria-hidden="true">
              <span>{tx("تأكيد")}</span>
            </span>
          </button>
        </div>
      )}

      {showTop && (
        <button
          type="button"
          className="cx-topbtn"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label={tx("العودة إلى الأعلى")}
        >
          <ArrowUp size={20} aria-hidden="true" />
        </button>
      )}

      {cafe.notice && (
        <div
          className={`cx-toast cx-toast--${cafe.notice.kind}${showDock ? " cx-toast--above-dock" : ""}`}
          role="status"
          aria-live="polite"
          key={cafe.notice.message}
        >
          <span className="cx-toast__icon" aria-hidden="true">
            <NoticeIcon size={19} strokeWidth={2.4} />
          </span>
          <span className="cx-toast__content">
            <strong className="cx-toast__title">
              {language === "ar"
                ? cafe.notice.kind === "success"
                  ? tx("تمت الإضافة")
                  : cafe.notice.kind === "error"
                    ? tx("تعذّر إكمال الطلب")
                    : cafe.notice.kind === "warning"
                      ? tx("يرجى الانتباه")
                      : cafe.notice.kind === "loading"
                        ? tx("جارٍ التنفيذ")
                        : tx("معلومة")
                : cafe.notice.kind === "success"
                  ? "Added to your order"
                  : cafe.notice.kind === "error"
                    ? "Something went wrong"
                    : cafe.notice.kind === "warning"
                      ? "Action needed"
                      : cafe.notice.kind === "loading"
                        ? "Working on it"
                        : "Notice"}
            </strong>
            <span className="cx-toast__message">{noticeText}</span>
          </span>
          {cafe.notice.kind === "success" && (
            <button
              type="button"
              className="cx-toast__action"
              onClick={cafe.openCart}
            >
              {language === "ar" ? tx("السلة") : "Cart"}
            </button>
          )}
        </div>
      )}

      {/* Mobile bottom dock navigation */}
      <nav className="cx-bottab" aria-label={tx("التنقل السريع")}>
        <Link
          className={`cx-bottab__item${onMenu ? " is-active" : ""}`}
          to={base}
        >
          <span className="cx-bottab__ico" aria-hidden="true">
            <Utensils size={20} />
          </span>
          {tx("القائمة")}
        </Link>
        <Link
          className={`cx-bottab__item${onOrders ? " is-active" : ""}`}
          to={`${base}/orders`}
        >
          <span className="cx-bottab__ico" aria-hidden="true">
            <ReceiptText size={20} />
          </span>
          {tx("طلباتي")}
        </Link>
        {canAdmin && (
          <Link className="cx-bottab__item" to={`/admin/${slug}`}>
            <span className="cx-bottab__ico" aria-hidden="true">
              <LayoutDashboard size={20} />
            </span>
            {tx("الإدارة")}
          </Link>
        )}
        <button
          type="button"
          className="cx-bottab__item"
          onClick={cafe.openCart}
        >
          <span className="cx-bottab__ico" aria-hidden="true">
            <ShoppingBasket size={20} />
            {cafe.cartCount > 0 && <b>{cafe.cartCount}</b>}
          </span>
          {tx("السلة")}
        </button>
      </nav>
    </div>
  );
}
