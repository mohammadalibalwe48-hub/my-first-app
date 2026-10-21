import {
  ArrowRight,
  ArrowUpRight,
  Globe2,
  QrCode,
  Utensils,
  ShoppingBag,
} from "lucide-react";
import { PLATFORM_NAME } from "../platform";
import "./landing.css";

const venues = [
  {
    slug: "sufra",
    nameAr: "سُفرة الشام",
    nameEn: "Sufra Sham",
    kindAr: "مطبخ شامي",
    kindEn: "Levantine kitchen",
    descriptionAr: "مازة، مشاوي، وطعم بيجمعنا.",
    descriptionEn: "Mezze, grills, and food made for sharing.",
    image: "/images/table.webp",
    number: "01",
  },
  {
    slug: "cozy",
    nameAr: "Cozy Corner",
    nameEn: "Cozy Corner",
    kindAr: "قهوة ولقمات خفيفة",
    kindEn: "Coffee & comfort",
    descriptionAr: "قهوة على رواق، وشي حلو ليومك.",
    descriptionEn: "Slow mornings, good coffee, something sweet.",
    image: "/images/coffee.webp",
    number: "02",
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
            <span className="home-brand__mark">
              <Utensils size={22} strokeWidth={1.6} />
            </span>
            <span>
              SYRIAN<span className="home-brand__qr">QR</span>
            </span>
          </a>
          <nav aria-label={t("التنقل الرئيسي", "Main navigation")}>
            <a className="home-nav-menus" href="#restaurants">
              {t("المطاعم", "Restaurants")}
            </a>
            <button
              className="home-language"
              onClick={onToggleLanguage}
              aria-label="تغيير اللغة / Change language"
            >
              <Globe2 size={16} />
              {ar ? "EN" : "عربي"}
            </button>
            <button className="home-owner" onClick={onOpenAdmin}>
              {t("دخول الموظفين", "Staff login")}
              <ArrowUpRight size={15} />
            </button>
          </nav>
        </div>
      </header>
      <main>
        <section className="home-hero" aria-labelledby="home-title">
          <div className="home-hero__copy">
            <span className="home-eyebrow">
              <span />
              {t("على ذوقك، بكل بساطة", "GOOD FOOD. YOUR WAY.")}
            </span>
            <h1 id="home-title">
              {t("كل لقمة،", "Good food.")}
              <br />
              <em>{t("إلها حكاية.", "Great company.")}</em>
            </h1>
            <p>
              {t(
                "من قهوتك الصباحية لسُفرة بتجمع الأحباب. اكتشف القوائم، اختار اللي بتحبّه، واطلب على راحتك.",
                "From your first coffee to a table worth sharing. Discover the menus, find your favourites, and make yourself at home.",
              )}
            </p>
            <a href="#restaurants" className="home-button">
              {t("اكتشف المطاعم", "Find your table")}
              <ArrowRight size={20} />
            </a>
            <div className="home-hero__bottom">
              <span>01 — 02</span>
              <span>
                {t("أكل طيب. لحظات أحلى.", "A little taste of the everyday.")}
              </span>
            </div>
          </div>
          <div className="home-hero__photo">
            <img
              src="/images/table.webp"
              alt={t(
                "سُفرة غنية بالخضار الطازجة والأطباق الملوّنة",
                "A colourful meal with fresh vegetables, ready to share",
              )}
              fetchPriority="high"
              width="1400"
              height="933"
            />
            <span className="home-photo-note">
              <Utensils size={16} />
              {t("في كل سُفرة، شي بتحبّه", "Something for every appetite")}
            </span>
          </div>
        </section>
        <section
          className="home-restaurants"
          id="restaurants"
          aria-labelledby="restaurants-title"
        >
          <header>
            <div>
              <span className="home-kicker">
                {t("أماكن بتستاهل تجرّبها", "THE PLACES. THE FLAVOURS.")}
              </span>
              <h2 id="restaurants-title">
                {t("اليوم، شو عبالك؟", "What are you in the mood for?")}
              </h2>
            </div>
            <span className="home-section-note">
              {t("اختار مطعمك وافتح المنيو", "Pick a place. Explore the menu.")}
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
                  <img
                    src={venue.image}
                    alt=""
                    loading="lazy"
                    width="1400"
                    height="933"
                  />
                  <span className="home-venue__number">{venue.number}</span>
                </div>
                <div className="home-venue__body">
                  <span className="home-kicker">
                    {t(venue.kindAr, venue.kindEn)}
                  </span>
                  <h3>{t(venue.nameAr, venue.nameEn)}</h3>
                  <p>{t(venue.descriptionAr, venue.descriptionEn)}</p>
                  <span className="home-venue__action">
                    {t("افتح المنيو", "Explore menu")}
                    <ArrowRight size={19} />
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>
        <section className="home-table">
          <div className="home-table__intro">
            <span className="home-table__qr">
              <QrCode size={30} strokeWidth={1.5} />
            </span>
            <div>
              <h2>{t("قاعد بالمطعم؟", "Already at the table?")}</h2>
              <p>
                {t(
                  "امسح رمز طاولتك. المنيو والطلب صاروا بإيدك.",
                  "Scan your table’s QR code. Your menu is right here.",
                )}
              </p>
            </div>
          </div>
          <ol>
            <li>
              <span>01</span>
              {t("افتح المنيو", "Explore the menu")}
            </li>
            <li>
              <span>02</span>
              {t("اختار على ذوقك", "Make it yours")}
            </li>
            <li>
              <span>03</span>
              {t("اطلب وتابع", "Order & follow along")}
              <ShoppingBag size={17} />
            </li>
          </ol>
        </section>
      </main>
      <footer className="home-footer">
        <a className="home-brand" href="/">
          SYRIAN<span className="home-brand__qr">QR</span>
        </a>
        <p>{t("طعم بيجمعنا.", "Good food brings us together.")}</p>
        <button onClick={onOpenAdmin}>
          {t("مساحة عمل المطعم", "Restaurant workspace")}
          <ArrowUpRight size={15} />
        </button>
      </footer>
    </div>
  );
}
