import {
  ArrowRight,
  Globe2,
  Leaf,
  MapPin,
  QrCode,
  ShoppingBag,
  Utensils,
  ArrowUpRight,
} from "lucide-react";
import { images } from "../domain";
import { PLATFORM_NAME, PLATFORM_LOGO_URL } from "../platform";
import "./landing.css";

const venues = [
  {
    slug: "sufra",
    nameAr: "سُفرة الشام",
    nameEn: "Sufra Sham",
    descriptionAr: "من المازة الشامية للمشاوي. أطباق بتشبه لَمّة البيت.",
    descriptionEn: "Levantine mezze, grills, and the familiar taste of home.",
    kindAr: "مطبخ شامي",
    kindEn: "Levantine kitchen",
    image: images.mezze,
    letter: "س",
  },
  {
    slug: "cozy",
    nameAr: "Cozy Corner",
    nameEn: "Cozy Corner",
    descriptionAr: "قهوة على رواق، لقمة خفيفة، وشي حلو يكمل يومك.",
    descriptionEn:
      "A good coffee, a light bite, and something sweet for your day.",
    kindAr: "قهوة ولقمات خفيفة",
    kindEn: "Coffee & comfort food",
    image: images.coffee,
    letter: "C",
  },
];
export default function LandingPage({
  language,
  onToggleLanguage,
  onOpenCafe,
  onOpenAdmin,
}: {
  language: "ar" | "en";
  onToggleLanguage: () => void;
  onOpenCafe: (slug: string) => void;
  onOpenAdmin: () => void;
}) {
  const ar = language === "ar";
  const t = (a: string, e: string) => (ar ? a : e);
  return (
    <div className="home" dir={ar ? "rtl" : "ltr"} lang={language}>
      <a className="home-skip" href="#restaurants">
        {t("تخطَّ إلى القوائم", "Skip to menus")}
      </a>
      <header className="home-head">
        <div className="home-head__in">
          <a className="home-brand" href="/" aria-label={PLATFORM_NAME}>
            <img src={PLATFORM_LOGO_URL} alt="" />
            <span>
              {PLATFORM_NAME}
              <small>
                {t("كل شي طيب، أقرب إلك", "Good food, a little closer")}
              </small>
            </span>
          </a>
          <nav aria-label={t("التنقل الرئيسي", "Main navigation")}>
            <button
              className="home-language"
              onClick={onToggleLanguage}
              aria-label="تغيير اللغة / Change language"
            >
              <Globe2 size={17} />
              {ar ? "EN" : "عربي"}
            </button>
            <button className="home-owner" onClick={onOpenAdmin}>
              {t("إدارة المطعم", "Restaurant login")}
              <ArrowUpRight size={15} />
            </button>
          </nav>
        </div>
      </header>
      <main className="home-main">
        <section className="home-welcome">
          <div className="home-welcome__copy">
            <span className="home-eyebrow">
              <Leaf size={15} />
              {t("الطلب الحلو، بيبلّش من هون", "A good order starts here")}
            </span>
            <h1>
              {t("من أول نظرة،", "From the first look,")}
              <br />
              <em>{t("لآخر لقمة.", "to the last bite.")}</em>
            </h1>
            <p>
              {t(
                "منيو واضح، أطباق بتشهي، وطلب على ذوقك. اختار مطعمك وخلّي الباقي علينا.",
                "A clearer menu. Food you’ll love. Your order, just the way you like it. Pick a restaurant and explore.",
              )}
            </p>
            <a href="#restaurants" className="home-button">
              {t("استكشف القوائم", "Explore the menus")}
              <ArrowRight size={18} />
            </a>
            <small className="home-welcome__hint">
              <QrCode size={14} />
              {t(
                "بالمطعم؟ امسح رمز طاولتك لتطلب مباشرة.",
                "Dining in? Scan your table’s QR code to order.",
              )}
            </small>
          </div>
          <div className="home-welcome__art" aria-hidden="true">
            <span className="home-art__shape" />
            <img
              className="home-art__plate"
              src={images.salad}
              alt=""
              fetchPriority="high"
            />
            <img className="home-art__small" src={images.mezze} alt="" />
            <span className="home-art__label">
              <Leaf size={16} />
              {t("على ذوقك", "Made for your taste")}
            </span>
          </div>
        </section>
        <section className="home-restaurants" id="restaurants">
          <header>
            <div>
              <span className="home-eyebrow">
                {t(
                  "اختار المكان، والباقي على ذوقك",
                  "Find your next favourite",
                )}
              </span>
              <h2>{t("وين حابب تطلب؟", "Where would you like to order?")}</h2>
            </div>
            <span className="home-section-note">
              <Utensils size={15} />
              {t("تصفح، اختار، واطلب", "Browse, choose, enjoy")}
            </span>
          </header>
          <div className="home-venues">
            {venues.map((venue) => (
              <button
                className="home-venue"
                key={venue.slug}
                onClick={() => onOpenCafe(venue.slug)}
              >
                <div className="home-venue__photo">
                  <img src={venue.image} alt="" loading="lazy" />
                  <span>{t(venue.kindAr, venue.kindEn)}</span>
                </div>
                <div className="home-venue__body">
                  <span className="home-venue__seal">{venue.letter}</span>
                  <div>
                    <h3>{t(venue.nameAr, venue.nameEn)}</h3>
                    <p>{t(venue.descriptionAr, venue.descriptionEn)}</p>
                    <small>
                      <MapPin size={12} />
                      {t("دمشق", "Damascus")}
                    </small>
                  </div>
                  <span className="home-venue__go">
                    <ArrowRight size={20} />
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>
        <section className="home-how">
          <div>
            <span className="home-how__icon">
              <QrCode />
            </span>
            <h3>{t("افتح المنيو", "Open the menu")}</h3>
            <p>
              {t(
                "امسح رمز الطاولة، أو اختار مطعمك من هون.",
                "Scan the table QR code or choose a restaurant here.",
              )}
            </p>
          </div>
          <div>
            <span className="home-how__icon">
              <Utensils />
            </span>
            <h3>{t("اختار على ذوقك", "Make it yours")}</h3>
            <p>
              {t(
                "شوف التفاصيل والإضافات، وجهّز طلبك بسهولة.",
                "Explore the dishes and customise your favourites.",
              )}
            </p>
          </div>
          <div>
            <span className="home-how__icon">
              <ShoppingBag />
            </span>
            <h3>{t("اطلب وتابع", "Order and follow along")}</h3>
            <p>
              {t(
                "راجع السلة وتفاصيل الاستلام، وتابع حالة طلبك.",
                "Review your basket, choose collection, and track your order.",
              )}
            </p>
          </div>
        </section>
      </main>
      <footer className="home-footer">
        <span>
          {PLATFORM_NAME}
          <small>
            {t("تجربة أبسط، منيو ألطف.", "A simpler way to order.")}
          </small>
        </span>
        <button onClick={onOpenAdmin}>
          {t("مساحة عمل المطعم", "Restaurant workspace")}
          <ArrowUpRight size={14} />
        </button>
      </footer>
    </div>
  );
}
