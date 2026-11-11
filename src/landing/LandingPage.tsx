import { useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Coffee,
  Globe2,
  MapPin,
  QrCode,
  ReceiptText,
  Search,
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
  const railRef = useRef<HTMLDivElement>(null);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const results = restaurants.filter(
    (restaurant) =>
      (category === "all" || restaurant.type === category) &&
      `${restaurant.ar} ${restaurant.en} ${restaurant.kindAr} ${restaurant.kindEn} ${restaurant.descriptionAr} ${restaurant.descriptionEn} Damascus دمشق`
        .toLocaleLowerCase()
        .includes(normalizedQuery),
  );

  const moveRail = (direction: "previous" | "next") => {
    const rail = railRef.current;
    if (!rail) return;
    const sign = direction === "next" ? 1 : -1;
    const physicalSign = en ? sign : -sign;
    rail.scrollBy({
      left: physicalSign * Math.max(rail.clientWidth * 0.72, 320),
      behavior: "smooth",
    });
  };

  return (
    <div className="home food-home" dir={en ? "ltr" : "rtl"} lang={language}>
      <a className="home-skip" href="#restaurants">
        {t("تخطَّ إلى المطاعم", "Skip to restaurants")}
      </a>

      <div className="discovery-shell">
        <header className="discovery-header">
          <a href="/" className="discovery-brand" aria-label="SYRIAN QR">
            <span className="discovery-brand__mark" aria-hidden="true">
              <Utensils size={19} strokeWidth={2.2} />
            </span>
            <span className="discovery-brand__wordmark">SYRIAN<span>QR</span></span>
          </a>
          <nav className="discovery-header__nav" aria-label={t("روابط الموقع", "Site links")}>
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
              {t("دخول المطاعم", "For restaurants")}
              <ArrowUpRight size={15} aria-hidden="true" />
            </button>
          </nav>
        </header>

        <main className="discovery-main">
          <section className="discovery-hero" aria-labelledby="home-title">
            <div className="discovery-hero__copy">
              <div className="discovery-kicker">
                <span className="discovery-kicker__dot" />
                {t("نكهات محلية، على بُعد مسحة", "LOCAL FLAVORS, ONE SCAN AWAY")}
              </div>
              <h1 id="home-title">
                {en ? (
                  <>A good meal <em>starts here.</em></>
                ) : (
                  <>حكاية طيبة <em>بتبلّش هون.</em></>
                )}
              </h1>
              <p className="discovery-hero__intro">
                {t(
                  "اكتشف مطاعم دمشق وافتح منيو وجهتك الجاية بكل سهولة.",
                  "Discover Damascus one table at a time. Find a place, then open its menu.",
                )}
              </p>

              <label className="discovery-search">
                <Search size={20} aria-hidden="true" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t(
                    "ابحث عن مطعم أو أكلة…",
                    "Search for a restaurant or dish",
                  )}
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
                      {item.id === "all" && <span className="discovery-category__count">{restaurants.length}</span>}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="discovery-hero__visual" aria-label={t("أطباق من مطبخ الشام", "A taste of the Levant")}>
              <FoodPhoto
                className="discovery-hero__image"
                src="/images/syrian-table-hero.webp"
                alt={t("سفرة شامية عامرة بالأطباق", "A table filled with Levantine dishes")}
                priority
              />
              <div className="discovery-hero__image-shade" />
              <div className="discovery-hero__stamp" aria-hidden="true">
                <span>GOOD FOOD</span>
                <span>GOOD COMPANY</span>
              </div>
              <div className="discovery-hero__photo-note">
                <span className="discovery-hero__photo-icon"><Coffee size={17} /></span>
                <span>
                  <small>{t("على ذوقك", "MADE FOR YOUR MOOD")}</small>
                  <strong>{t("كل طاولة إلها حكاية", "Every table has a story")}</strong>
                </span>
                <ArrowUpRight size={18} aria-hidden="true" />
              </div>
              <a className="discovery-hero__jump" href="#restaurants" aria-label={t("تصفح المطاعم", "Explore restaurants")}>
                <ArrowDown size={17} aria-hidden="true" />
              </a>
            </div>
          </section>

          <section
            id="restaurants"
            className="restaurant-discovery"
            aria-labelledby="restaurant-heading"
          >
            <header className="restaurant-heading">
              <div className="restaurant-heading__copy">
                <span className="restaurant-heading__eyebrow">
                  <span /> {t("دليلك المحلي", "YOUR NEIGHBORHOOD GUIDE")}
                </span>
                <h2 id="restaurant-heading">{t("أماكن بتستاهل الزيارة", "Find your kind of place")}</h2>
                <p>{t("اختار مكانك وافتح المنيو مباشرة.", "Pick a place and step straight into its menu.")}</p>
              </div>
              {results.length > 1 && (
                <div className="discovery-rail-controls">
                  <span className="discovery-results-count">{t(`${results.length} أماكن`, `${results.length} places`)}</span>
                  <IconButton
                    type="button"
                    label={t("المكان السابق", "Previous place")}
                    onClick={() => moveRail("previous")}
                  >
                    {en ? <ArrowLeft size={18} /> : <ArrowRight size={18} />}
                  </IconButton>
                  <IconButton
                    type="button"
                    label={t("المكان التالي", "Next place")}
                    onClick={() => moveRail("next")}
                  >
                    {en ? <ArrowRight size={18} /> : <ArrowLeft size={18} />}
                  </IconButton>
                </div>
              )}
            </header>

            {results.length ? (
              <div
                ref={railRef}
                className="discovery-places"
                aria-label={t("المطاعم المتاحة", "Available restaurants")}
              >
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
                        {t(restaurant.type === "food" ? "مطبخ شامي" : "قهوة وحلو", restaurant.type === "food" ? "LEVANTINE" : "COFFEE & SWEETS")}
                      </span>
                      <span className="discovery-place__image-action" aria-hidden="true">
                        <ArrowUpRight size={19} />
                      </span>
                    </span>
                    <span className="discovery-place__content" dir={en ? "ltr" : "rtl"}>
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
                          {en ? <ArrowRight size={17} /> : <ArrowLeft size={17} />}
                        </span>
                        <span className="discovery-place__action-mark" aria-hidden="true">↗</span>
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

          <section className="scan-explainer" aria-labelledby="scan-title">
            <div className="scan-explainer__intro">
              <span className="scan-explainer__icon" aria-hidden="true"><QrCode size={27} strokeWidth={1.8} /></span>
              <div className="scan-explainer__copy">
                <span className="scan-explainer__eyebrow">{t("تجربة أسهل", "A LITTLE LESS FUSS")}</span>
                <h2 id="scan-title">{t("قاعد عالطاولة؟ المنيو جاهز.", "At the table? Your menu is ready.")}</h2>
                <p>
                  {t(
                    "امسح الكود، اختار اللي بتحبه، واطلب مباشرة — بدون تحميل أي تطبيق.",
                    "Scan the code, choose what you love, and order directly — no app download needed.",
                  )}
                </p>
              </div>
            </div>
            <div className="scan-explainer__steps" aria-label={t("امسح، اختار، اطلب", "Scan, choose, order")}>
              <span><QrCode size={17} /> {t("امسح", "Scan")}</span>
              <i aria-hidden="true" />
              <span><Utensils size={17} /> {t("اختار", "Choose")}</span>
              <i aria-hidden="true" />
              <span><ReceiptText size={17} /> {t("اطلب", "Order")}</span>
            </div>
          </section>
        </main>

        <footer className="discovery-footer">
          <a href="/" className="discovery-brand discovery-brand--footer" aria-label="SYRIAN QR">
            <span className="discovery-brand__mark" aria-hidden="true"><Utensils size={16} /></span>
            <span className="discovery-brand__wordmark">SYRIAN<span>QR</span></span>
          </a>
          <span className="discovery-footer__tagline">{t("لقمة حلوة، تجربة أسهل.", "Good food. Less fuss.")}</span>
          <button type="button" onClick={onOpenAdmin}>
            {t("مساحة عمل المطعم", "Restaurant workspace")}
            <ArrowUpRight size={15} aria-hidden="true" />
          </button>
        </footer>
      </div>
    </div>
  );
}
