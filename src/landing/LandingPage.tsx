import { useRef, useState } from "react";
import {
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
    image: "/images/syrian-table-hero.webp",
    type: "food",
  },
  {
    slug: "cozy",
    ar: "Cozy Corner",
    en: "Cozy Corner",
    kindAr: "قهوة · حلويات ولقمات خفيفة",
    kindEn: "Coffee · Sweets & light bites",
    image: "/images/coffee.webp",
    type: "coffee",
  },
];

const categories = [
  { id: "all", ar: "كل الأماكن", en: "All places", Icon: Utensils },
  {
    id: "food",
    ar: "مأكولات شامية",
    en: "Levantine",
    image: restaurants[0].image,
  },
  {
    id: "coffee",
    ar: "قهوة وحلويات",
    en: "Coffee & sweets",
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
      `${restaurant.ar} ${restaurant.en} ${restaurant.kindAr} ${restaurant.kindEn} Damascus دمشق`
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

      <header className="discovery-header">
        <a href="/" className="discovery-brand" aria-label="SYRIAN QR">
          <span aria-hidden="true">
            <Utensils size={20} strokeWidth={2} />
          </span>
          SYRIAN <b>QR</b>
        </a>
        <nav aria-label={t("روابط الموقع", "Site links")}>
          <button
            type="button"
            className="discovery-language"
            onClick={onToggleLanguage}
            aria-label={t("التبديل إلى الإنجليزية", "Switch to Arabic")}
          >
            <Globe2 size={17} aria-hidden="true" />
            {en ? "عربي" : "EN"}
          </button>
          <button
            type="button"
            className="discovery-staff"
            onClick={onOpenAdmin}
          >
            {t("دخول الموظفين", "Staff login")}
            <ArrowUpRight size={16} aria-hidden="true" />
          </button>
        </nav>
      </header>

      <main className="discovery-main">
        <section className="discovery-intro" aria-labelledby="home-title">
          <div className="discovery-intro__photography" aria-hidden="true">
            <FoodPhoto
              className="discovery-intro__photo discovery-intro__photo--start"
              src="/images/coffee.webp"
              alt=""
              priority
            />
            <FoodPhoto
              className="discovery-intro__photo discovery-intro__photo--end"
              src="/images/syrian-table-hero.webp"
              alt=""
              priority
            />
          </div>
          <h1 id="home-title">
            {en ? (
              <>Discover restaurants in <em>Damascus</em></>
            ) : (
              <>اكتشف مطاعم <em>دمشق</em></>
            )}
          </h1>
          <p>
            {t(
              "تصفّح الأماكن واختر وجهتك لفتح المنيو.",
              "Find your next favorite. Choose a place and open its menu.",
            )}
          </p>
          <label className="discovery-search">
            <Search size={21} aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t(
                "ابحث عن مطعم أو نوع من المأكولات…",
                "Search restaurants or food types…",
              )}
              aria-label={t("ابحث عن مطعم أو نوع من المأكولات", "Search restaurants or food types")}
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
                  aria-pressed={category === item.id}
                  onClick={() => setCategory(item.id)}
                >
                  <span className="discovery-category__photo" aria-hidden="true">
                    {"image" in item ? (
                      <FoodPhoto src={item.image} alt="" />
                    ) : Icon ? (
                      <Icon size={26} strokeWidth={1.7} />
                    ) : null}
                  </span>
                  <span className="discovery-category__label">
                    {t(item.ar, item.en)}
                  </span>
                </button>
              );
            })}
          </nav>
        </section>

        <section
          id="restaurants"
          className="restaurant-discovery"
          aria-labelledby="restaurant-heading"
        >
          <header className="restaurant-heading">
            <div>
              <span className="restaurant-heading__eyebrow">
                {t("منيوهات دمشق", "DAMASCUS MENUS")}
              </span>
              <h2 id="restaurant-heading">
                {t("اختار منيوك", "Choose your menu")}
              </h2>
              <p>
                {t(
                  "افتح المنيو مباشرة من مطعمك المفضّل.",
                  "Open a menu directly from your favorite place.",
                )}
              </p>
            </div>
            {results.length > 1 && (
              <div className="discovery-rail-controls">
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
                    `Open ${restaurant.en} menu`,
                  )}
                >
                  <FoodPhoto
                    className="discovery-place__image"
                    src={restaurant.image}
                    alt=""
                    priority={index === 0}
                  />
                  <span className="discovery-place__content" dir={en ? "ltr" : "rtl"}>
                    <span className="discovery-place__meta">
                      <span className="discovery-place__type">
                        {t(restaurant.kindAr, restaurant.kindEn)}
                      </span>
                      <span className="discovery-place__location">
                        <MapPin size={14} aria-hidden="true" />
                        {t("دمشق", "Damascus")}
                      </span>
                    </span>
                    <span className="discovery-place__bottom">
                      <span className="discovery-place__name">
                        {t(restaurant.ar, restaurant.en)}
                      </span>
                      <span className="discovery-place__action" aria-hidden="true">
                        {t("افتح المنيو", "Open menu")}
                        {en ? <ArrowRight size={18} /> : <ArrowLeft size={18} />}
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
              description={t(
                "جرّب اسم أو نوع تاني.",
                "Try another name or food type.",
              )}
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
          <span className="scan-explainer__icon" aria-hidden="true">
            <QrCode size={32} strokeWidth={1.7} />
          </span>
          <div className="scan-explainer__copy">
            <h2 id="scan-title">
              {t("قاعد بالمطعم؟ امسح الكود.", "Already at the table? Scan the QR.")}
            </h2>
            <p>
              {t(
                "افتح منيو طاولتك واطلب مباشرة، بدون تحميل أي تطبيق.",
                "Open your table’s menu and order directly, without downloading an app.",
              )}
            </p>
          </div>
          <div className="scan-explainer__steps" aria-hidden="true">
            <span>
              <QrCode size={17} /> {t("امسح", "Scan")}
            </span>
            <ArrowRight size={15} />
            <span>
              <Utensils size={17} /> {t("اختار", "Choose")}
            </span>
            <ArrowRight size={15} />
            <span>
              <ReceiptText size={17} /> {t("اطلب", "Order")}
            </span>
          </div>
        </section>
      </main>

      <footer className="discovery-footer">
        <span>
          SYRIAN QR
          <small>{t("لقمة حلوة، تجربة أسهل.", "Good food. Less fuss.")}</small>
        </span>
        <button type="button" onClick={onOpenAdmin}>
          {t("مساحة عمل المطعم", "Restaurant workspace")}
          <ArrowUpRight size={16} aria-hidden="true" />
        </button>
      </footer>
    </div>
  );
}
