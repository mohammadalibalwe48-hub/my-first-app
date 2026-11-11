import { useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BellRing,
  BookOpenText,
  ChefHat,
  Coffee,
  Globe2,
  Languages,
  MapPin,
  QrCode,
  ReceiptText,
  Search,
  ShoppingBag,
  Smartphone,
  Utensils,
  X,
} from "lucide-react";
import { Button, EmptyState, FoodPhoto, IconButton } from "../components/AppKit";
import "../features/customer/app.css";
import "./landing.css";

const restaurants = [
  {
    slug: "sufra",
    ar: "سُفرة الشام",
    en: "Sufra Sham",
    kindAr: "مطبخ شامي · مقبلات ومشاوي",
    kindEn: "Levantine · Mezze & grills",
    descriptionAr: "سفرة عامرة بالنكهات الشامية والأطباق اللي بتنحب للمشاركة.",
    descriptionEn: "A generous taste of the Levant, made for gathering and sharing.",
    image: "/images/syrian-table-hero.webp",
    type: "food",
  },
  {
    slug: "cozy",
    ar: "Cozy Corner",
    en: "Cozy Corner",
    kindAr: "قهوة · حلويات ولقمات خفيفة",
    kindEn: "Coffee · Sweets & light bites",
    descriptionAr: "استراحة دافئة مع قهوة طيبة وحلو شي على مزاجك.",
    descriptionEn: "A cozy pause for good coffee, something sweet, and a little more time.",
    image: "/images/coffee.webp",
    type: "coffee",
  },
];

const categories = [
  { id: "all", ar: "كل الأماكن", en: "All", Icon: Utensils },
  {
    id: "food",
    ar: "مأكولات شامية",
    en: "Levantine",
    image: restaurants[0].image,
  },
  {
    id: "coffee",
    ar: "قهوة وحلويات",
    en: "Coffee",
    image: restaurants[1].image,
  },
];

type CategoryId = (typeof categories)[number]["id"];

const proof = [
  { Icon: Smartphone, ar: "بدون تحميل تطبيق", en: "No app to download" },
  { Icon: Languages, ar: "منيو بالعربي والإنجليزي", en: "Arabic & English menus" },
  { Icon: ShoppingBag, ar: "بالمطعم، سفري أو توصيل", en: "Dine in, takeaway or delivery" },
];

const steps = [
  {
    Icon: QrCode,
    ar: "امسح رمز طاولتك",
    en: "Scan your table’s code",
    bodyAr: "وجّه كاميرا موبايلك على رمز QR يلي على الطاولة، والمنيو بيفتح فوراً بالمتصفح.",
    bodyEn: "Point your phone camera at the QR code on your table and the menu opens right in your browser.",
  },
  {
    Icon: Utensils,
    ar: "اختار على ذوقك",
    en: "Choose what you love",
    bodyAr: "تصفّح الأطباق بالصور، اختار الإضافات، واترك ملاحظتك للمطبخ.",
    bodyEn: "Browse dishes with photos, pick your options and leave a note for the kitchen.",
  },
  {
    Icon: ReceiptText,
    ar: "اطلب وتابع طلبك",
    en: "Order and follow along",
    bodyAr: "طلبك بيوصل للمطعم مباشرة، وبتقدر تتابع حالته من صفحة طلباتي.",
    bodyEn: "Your order goes straight to the restaurant, and you can follow its status from My orders.",
  },
];

const features = [
  {
    Icon: BookOpenText,
    ar: "منيو رقمي باسم مطعمك",
    en: "Your own digital menu",
    bodyAr: "أقسام وصور وإضافات وتصنيفات غذائية، بالعربي والإنجليزي، وبالليرة أو الدولار.",
    bodyEn: "Categories, photos, options and dietary tags in Arabic and English, priced in SYP or USD.",
  },
  {
    Icon: QrCode,
    ar: "طلب مباشر من كل طاولة",
    en: "Ordering from every table",
    bodyAr: "لكل طاولة رمز خاص، والطلبات بتوصل بأسعار مدقّقة: بالمطعم، سفري أو توصيل.",
    bodyEn: "Each table gets its own code, and orders arrive with validated prices for dine-in, takeaway or delivery.",
  },
  {
    Icon: ChefHat,
    ar: "شاشات للمطبخ والكاشير",
    en: "Kitchen and cashier screens",
    bodyAr: "مساحات عمل حسب الدور، لتضل الطلبات والدفع متزامنة بين الفريق.",
    bodyEn: "Role-based workspaces keep preparation and payments in sync across your team.",
  },
  {
    Icon: BellRing,
    ar: "تنبيهات فورية وتقارير",
    en: "Instant alerts and reports",
    bodyAr: "إشعارات اختيارية على أجهزة الفريق، وتقارير للمبيعات والطلبات.",
    bodyEn: "Optional push notifications on staff devices, plus sales and order reports.",
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
  const en = language === "en";
  const t = (ar: string, english: string) => (en ? english : ar);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryId>("all");
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const results = restaurants.filter(
    (restaurant) =>
      (category === "all" || restaurant.type === category) &&
      `${restaurant.ar} ${restaurant.en} ${restaurant.kindAr} ${restaurant.kindEn} ${restaurant.descriptionAr} ${restaurant.descriptionEn} Damascus دمشق`
        .toLocaleLowerCase()
        .includes(normalizedQuery),
  );
  const Forward = en ? ArrowRight : ArrowLeft;
  const featured = restaurants[0];
  const resultsLabel =
    results.length === 1
      ? t("مكان واحد", "1 place")
      : results.length === 2
        ? t("مكانين", "2 places")
        : t(`${results.length} أماكن`, `${results.length} places`);

  const showResults = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    document
      .getElementById("restaurants")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="home food-home" dir={en ? "ltr" : "rtl"} lang={language}>
      <a className="home-skip" href="#restaurants">
        {t("تخطَّ إلى المطاعم", "Skip to restaurants")}
      </a>

      <header className="discovery-header">
        <a href="/" className="discovery-brand" aria-label="SYRIAN QR">
          <span className="discovery-brand__mark" aria-hidden="true">
            <Utensils size={19} strokeWidth={2.2} />
          </span>
          <span className="discovery-brand__wordmark">
            SYRIAN<span>QR</span>
          </span>
        </a>
        <nav className="discovery-header__nav" aria-label={t("روابط الموقع", "Site links")}>
          <a className="discovery-header__link" href="#how-it-works">
            {t("كيف بيشتغل", "How it works")}
          </a>
          <a className="discovery-header__link" href="#for-restaurants">
            {t("للمطاعم", "For restaurants")}
          </a>
          <button
            type="button"
            className="discovery-language"
            onClick={onToggleLanguage}
            aria-label={t("التبديل إلى الإنجليزية", "Switch to Arabic")}
          >
            <Globe2 size={16} aria-hidden="true" />
            {en ? "عربي" : "EN"}
          </button>
          <button type="button" className="discovery-staff" onClick={onOpenAdmin}>
            {t("دخول المطاعم", "Restaurant sign in")}
            <ArrowUpRight size={15} aria-hidden="true" />
          </button>
        </nav>
      </header>

      <main className="discovery-main">
        <section className="discovery-hero" aria-labelledby="home-title">
          <div className="discovery-hero__copy">
            <div className="discovery-kicker">
              <span className="discovery-kicker__dot" aria-hidden="true" />
              {t("نكهات محلية، على بُعد مسحة", "Local flavors, one scan away")}
            </div>
            <h1 id="home-title">
              {en ? (
                <>
                  A good meal <em>starts here.</em>
                </>
              ) : (
                <>
                  حكاية طيبة <em>بتبلّش هون.</em>
                </>
              )}
            </h1>
            <p className="discovery-hero__intro">
              {t(
                "اكتشف مطاعم دمشق وافتح منيو وجهتك الجاية بكل سهولة.",
                "Discover Damascus one table at a time. Find a place, then open its menu.",
              )}
            </p>

            <form className="discovery-search-form" role="search" onSubmit={showResults}>
              <label className="discovery-search">
                <Search size={20} aria-hidden="true" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t("ابحث عن مطعم أو أكلة…", "Search for a restaurant or dish")}
                  aria-label={t("ابحث عن مطعم أو نوع من المأكولات", "Search for a restaurant or dish")}
                />
                {query && (
                  <IconButton
                    type="button"
                    label={t("مسح البحث", "Clear search")}
                    onClick={() => setQuery("")}
                  >
                    <X size={17} />
                  </IconButton>
                )}
              </label>
              <button type="submit" className="discovery-search__submit">
                <Search size={18} aria-hidden="true" />
                <span>{t("ابحث", "Search")}</span>
              </button>
            </form>

            <nav className="discovery-categories" aria-label={t("تصفية حسب النوع", "Filter by type")}>
              {categories.map((item) => {
                const Icon = "Icon" in item ? item.Icon : undefined;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`discovery-category${category === item.id ? " is-active" : ""}`}
                    aria-label={t(item.ar, item.en)}
                    aria-pressed={category === item.id}
                    onClick={() => setCategory(item.id)}
                  >
                    <span className="discovery-category__photo" aria-hidden="true">
                      {"image" in item ? (
                        <FoodPhoto src={item.image} alt="" />
                      ) : Icon ? (
                        <Icon size={18} strokeWidth={1.8} />
                      ) : null}
                    </span>
                    <span>{t(item.ar, item.en)}</span>
                    {item.id === "all" && (
                      <span className="discovery-category__count">{restaurants.length}</span>
                    )}
                  </button>
                );
              })}
            </nav>

            <ul className="discovery-proof">
              {proof.map(({ Icon, ar, en: english }) => (
                <li key={english}>
                  <Icon size={17} aria-hidden="true" />
                  {t(ar, english)}
                </li>
              ))}
            </ul>
          </div>

          <div className="discovery-hero__visual">
            <div className="discovery-hero__frame">
              <FoodPhoto
                className="discovery-hero__image"
                src="/images/syrian-table-hero.webp"
                alt={t("سفرة شامية عامرة بالأطباق", "A table filled with Levantine dishes")}
                priority
              />
              <span className="discovery-hero__steps" aria-hidden="true">
                <span>
                  <QrCode size={15} /> {t("امسح", "Scan")}
                </span>
                <i />
                <span>
                  <Utensils size={15} /> {t("اختار", "Choose")}
                </span>
                <i />
                <span>
                  <ReceiptText size={15} /> {t("اطلب", "Order")}
                </span>
              </span>
              <button
                type="button"
                className="discovery-hero__feature"
                onClick={() => onOpenCafe(featured.slug)}
              >
                <span className="discovery-hero__feature-text">
                  <small>{t("وجهة مقترحة", "A place to start")}</small>
                  <strong>{t(featured.ar, featured.en)}</strong>
                  <span>{t(featured.kindAr, featured.kindEn)}</span>
                </span>
                <span className="discovery-hero__feature-go" aria-hidden="true">
                  <Forward size={19} />
                </span>
              </button>
            </div>
          </div>
        </section>

        <section id="restaurants" className="restaurant-discovery" aria-labelledby="restaurant-heading">
          <header className="restaurant-heading">
            <div className="restaurant-heading__copy">
              <span className="home-eyebrow">{t("دليلك المحلي", "Your neighborhood guide")}</span>
              <h2 id="restaurant-heading" className="home-title">
                {t("أماكن بتستاهل الزيارة", "Find your kind of place")}
              </h2>
              <p className="home-lead">
                {t("اختار مكانك وافتح المنيو مباشرة.", "Pick a place and step straight into its menu.")}
              </p>
            </div>
            {results.length > 0 && (
              <span className="discovery-results-count" aria-live="polite">
                {resultsLabel}
              </span>
            )}
          </header>

          {results.length ? (
            <div className="discovery-places">
              {results.map((restaurant, index) => (
                <button
                  key={restaurant.slug}
                  type="button"
                  className="home-venue discovery-place"
                  onClick={() => onOpenCafe(restaurant.slug)}
                  aria-label={t(
                    `افتح منيو ${restaurant.ar}`,
                    `Open menu ${restaurant.en === "Sufra Sham" ? "Sufra" : restaurant.en}`,
                  )}
                >
                  <span className="discovery-place__media">
                    <FoodPhoto
                      className="discovery-place__image"
                      src={restaurant.image}
                      alt=""
                      priority={index === 0}
                    />
                    <span className="discovery-place__tag">
                      {restaurant.type === "food" ? <Utensils size={13} /> : <Coffee size={13} />}
                      {t(
                        restaurant.type === "food" ? "مطبخ شامي" : "قهوة وحلو",
                        restaurant.type === "food" ? "Levantine" : "Coffee & sweets",
                      )}
                    </span>
                    <span className="discovery-place__image-action" aria-hidden="true">
                      <ArrowUpRight size={19} />
                    </span>
                  </span>
                  <span className="discovery-place__content">
                    <span className="discovery-place__meta">
                      <span className="discovery-place__type">{t(restaurant.kindAr, restaurant.kindEn)}</span>
                      <span className="discovery-place__location">
                        <MapPin size={14} aria-hidden="true" />
                        {t("دمشق", "Damascus")}
                      </span>
                    </span>
                    <span className="discovery-place__name">{t(restaurant.ar, restaurant.en)}</span>
                    <span className="discovery-place__description">
                      {t(restaurant.descriptionAr, restaurant.descriptionEn)}
                    </span>
                    <span className="discovery-place__bottom">
                      <span className="discovery-place__action">
                        {t("شوف المنيو", "Explore menu")}
                        <Forward size={17} aria-hidden="true" />
                      </span>
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Search />}
              title={t("ما لقينا مكان مطابق", "No places found")}
              description={t("جرّب اسم أو نوع تاني.", "Try another name or food type.")}
              action={
                <Button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setCategory("all");
                  }}
                >
                  {t("عرض كل الأماكن", "Show all places")}
                </Button>
              }
            />
          )}
        </section>

        <section id="how-it-works" className="home-steps" aria-labelledby="steps-title">
          <div className="home-section-head">
            <span className="home-eyebrow">{t("تجربة أسهل", "A little less fuss")}</span>
            <h2 id="steps-title" className="home-title">
              {t("قاعد عالطاولة؟ المنيو جاهز.", "At the table? Your menu is ready.")}
            </h2>
            <p className="home-lead">
              {t(
                "امسح الكود، اختار اللي بتحبه، واطلب مباشرة — بدون تحميل أي تطبيق.",
                "Scan the code, choose what you love, and order directly — no app download needed.",
              )}
            </p>
          </div>
          <ol className="home-steps__grid">
            {steps.map(({ Icon, ...step }, index) => (
              <li key={step.en} className="home-step">
                <span className="home-step__icon" aria-hidden="true">
                  <Icon size={23} />
                </span>
                <span className="home-step__num" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3>{t(step.ar, step.en)}</h3>
                <p>{t(step.bodyAr, step.bodyEn)}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="for-restaurants" className="home-partner" aria-labelledby="partner-title">
          <div className="home-partner__panel">
            <div className="home-partner__copy">
              <span className="home-eyebrow">{t("للمطاعم والمقاهي", "For restaurants & cafés")}</span>
              <h2 id="partner-title" className="home-title">
                {t("المنيو، الطاولات والطلبات… بمكان واحد.", "Your menu, tables and orders in one place.")}
              </h2>
              <p className="home-lead">
                {t(
                  "SYRIAN QR بيعطي كل مطعم ومقهى متجر رقمي خاص فيه، مع مساحة عمل لكل فريقك.",
                  "SYRIAN QR gives every restaurant and café its own digital storefront, with a workspace for the whole team.",
                )}
              </p>
              <ul className="home-features">
                {features.map(({ Icon, ...feature }) => (
                  <li key={feature.en}>
                    <span aria-hidden="true">
                      <Icon size={21} />
                    </span>
                    <div>
                      <h3>{t(feature.ar, feature.en)}</h3>
                      <p>{t(feature.bodyAr, feature.bodyEn)}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="home-partner__actions">
                <button type="button" className="home-cta home-cta--primary" onClick={onOpenAdmin}>
                  {t("افتح مساحة عمل المطعم", "Open restaurant workspace")}
                  <ArrowUpRight size={18} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="home-cta home-cta--ghost"
                  onClick={() => onOpenCafe(featured.slug)}
                >
                  {t("شوف منيو حقيقي", "Preview a live menu")}
                  <Forward size={18} aria-hidden="true" />
                </button>
              </div>
            </div>
            <div className="home-tent" aria-hidden="true">
              <div className="home-tent__card">
                <span className="home-tent__pin">{t("رمز الطاولة", "Table QR")}</span>
                <span className="home-tent__brand">
                  <Utensils size={14} /> SYRIAN QR
                </span>
                <span className="home-tent__qr">
                  <QrCode size={128} strokeWidth={1.2} />
                </span>
                <strong>{t("امسح واطلب", "Scan to order")}</strong>
                <small>{t("المنيو بيفتح بالمتصفح", "The menu opens in your browser")}</small>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="discovery-footer">
        <div className="discovery-footer__brand">
          <a href="/" className="discovery-brand discovery-brand--footer" aria-label="SYRIAN QR">
            <span className="discovery-brand__mark" aria-hidden="true">
              <Utensils size={16} />
            </span>
            <span className="discovery-brand__wordmark">
              SYRIAN<span>QR</span>
            </span>
          </a>
          <span className="discovery-footer__tagline">
            {t("لقمة حلوة، تجربة أسهل.", "Good food. Less fuss.")}
          </span>
        </div>
        <nav className="discovery-footer__links" aria-label={t("روابط التذييل", "Footer links")}>
          <a href="#restaurants">{t("المطاعم", "Restaurants")}</a>
          <a href="#how-it-works">{t("كيف بيشتغل", "How it works")}</a>
          <a href="#for-restaurants">{t("للمطاعم", "For restaurants")}</a>
          <button type="button" onClick={onOpenAdmin}>
            {t("مساحة عمل المطعم", "Restaurant workspace")}
            <ArrowUpRight size={15} aria-hidden="true" />
          </button>
        </nav>
        <p className="discovery-footer__legal">
          © {new Date().getFullYear()} SYRIAN QR · {t("دمشق", "Damascus")}
        </p>
      </footer>
    </div>
  );
}
