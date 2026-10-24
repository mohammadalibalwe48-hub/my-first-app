import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Globe2,
  MapPin,
  QrCode,
  Search,
  ShoppingBag,
  Utensils,
  X,
  Coffee,
  ReceiptText,
} from "lucide-react";
import {
  Button,
  FoodPhoto,
  IconButton,
  SectionTitle,
  EmptyState,
} from "../components/AppKit";
import "../features/customer/app.css";
import "./landing.css";
const restaurants = [
  {
    slug: "sufra",
    ar: "سُفرة الشام",
    en: "Sufra Sham",
    kindAr: "مطبخ شامي · مازة ومشاوي",
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
  const t = (a: string, b: string) => (en ? b : a);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const results = restaurants.filter(
    (r) =>
      (filter === "all" || r.type === filter) &&
      `${r.ar} ${r.en} ${r.kindAr} ${r.kindEn}`
        .toLocaleLowerCase()
        .includes(query.toLocaleLowerCase().trim()),
  );
  return (
    <div className="home food-home" dir={en ? "ltr" : "rtl"} lang={language}>
      <a className="home-skip" href="#restaurants">
        {t("تخطَّ إلى المطاعم", "Skip to restaurants")}
      </a>
      <header className="discovery-header">
        <a href="/" className="discovery-brand">
          <span>
            <Utensils size={21} />
          </span>
          SYRIAN <b>QR</b>
        </a>
        <nav>
          <button
            onClick={onToggleLanguage}
            aria-label="تغيير اللغة / Change language"
          >
            <Globe2 size={17} />
            {en ? "عربي" : "EN"}
          </button>
          <button className="discovery-staff" onClick={onOpenAdmin}>
            {t("دخول الموظفين", "Staff login")}
            <ArrowUpRight size={16} />
          </button>
        </nav>
      </header>
      <main className="discovery-main">
        <section className="discovery-intro">
          <div>
            <span className="ui-eyebrow">
              <MapPin size={14} />
              {t("نكهات قريبة منك", "GOOD FOOD, CLOSE TO YOU")}
            </span>
            <h1>
              {t("شو عبالك", "Something good")}
              <br />
              <em>{t("تاكل اليوم؟", "starts here.")}</em>
            </h1>
            <p>
              {t(
                "من أول قهوة لآخر لقمة. لاقي مكانك، افتح المنيو، واطلب على ذوقك.",
                "Your first coffee. Your favourite plate. Find a place, explore the menu, and make it yours.",
              )}
            </p>
            <label className="discovery-search">
              <Search size={21} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t(
                  "ابحث عن مطعم أو قهوة…",
                  "Find a restaurant or coffee spot…",
                )}
                aria-label={t("ابحث عن مطعم", "Search restaurants")}
              />
              {query && (
                <IconButton
                  label={t("مسح البحث", "Clear search")}
                  onClick={() => setQuery("")}
                >
                  <X size={17} />
                </IconButton>
              )}
            </label>
          </div>
          <button
            className="featured-place"
            onClick={() => onOpenCafe("sufra")}
          >
            <FoodPhoto
              src="/images/syrian-table-hero.webp"
              alt={t(
                "سُفرة شامية من المشاوي والحمص والفتوش",
                "Levantine mezze and grilled skewers",
              )}
              priority
            />
            <span className="featured-place__tag">
              {t("على سُفرة وحدة", "MADE TO SHARE")}
            </span>
            <div>
              <span>{t("منيو يستاهل تفتحه", "FIND YOUR NEXT FAVOURITE")}</span>
              <h2>{t("سُفرة الشام", "Sufra Sham")}</h2>
              <span>
                {t("افتح المنيو", "Explore menu")}
                <ArrowRight size={18} />
              </span>
            </div>
          </button>
        </section>
        <section id="restaurants" className="restaurant-discovery">
          <SectionTitle
            title={t(
              "اختار المكان. خلّينا نطلب.",
              "Pick a place. Make it a moment.",
            )}
            action={
              <span className="discovery-count">
                {results.length} {t("مطاعم", "places")}
              </span>
            }
          />
          <div className="discovery-filters">
            {[
              { id: "all", a: "كل الأماكن", e: "All places", Icon: Utensils },
              {
                id: "food",
                a: "أكل ومشاوي",
                e: "Food & grills",
                Icon: ShoppingBag,
              },
              {
                id: "coffee",
                a: "قهوة وحلويات",
                e: "Coffee & sweets",
                Icon: Coffee,
              },
            ].map(({ id, a, e, Icon }) => (
              <button
                key={id}
                aria-pressed={filter === id}
                className={filter === id ? "is-on" : ""}
                onClick={() => setFilter(id)}
              >
                <Icon size={18} />
                {t(a, e)}
              </button>
            ))}
          </div>
          {results.length ? (
            <div className="discovery-places">
              {results.map((r) => (
                <button
                  key={r.slug}
                  className="home-venue discovery-place"
                  onClick={() => onOpenCafe(r.slug)}
                >
                  <div className="discovery-place__image">
                    <FoodPhoto src={r.image} alt="" />
                    <span>
                      <ArrowUpRight size={21} />
                    </span>
                  </div>
                  <div>
                    <span className="ui-eyebrow">{t(r.kindAr, r.kindEn)}</span>
                    <h3>{t(r.ar, r.en)}</h3>
                    <p>
                      <MapPin size={13} />
                      {t("دمشق", "Damascus")}
                      <span>
                        {t("تصفح المنيو", "Explore menu")}
                        <ArrowRight size={16} />
                      </span>
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Search />}
              title={t("ما لقينا مكان مطابق", "No places found")}
              description={t(
                "جرّب اسم أو تصنيف تاني.",
                "Try another name or category.",
              )}
              action={
                <Button
                  onClick={() => {
                    setQuery("");
                    setFilter("all");
                  }}
                >
                  {t("عرض كل المطاعم", "Show all places")}
                </Button>
              }
            />
          )}
        </section>
        <section className="scan-explainer">
          <span>
            <QrCode size={35} strokeWidth={1.6} />
          </span>
          <div>
            <h2>{t("قاعد بالمطعم؟ منيوك هون.", "Already at the table?")}</h2>
            <p>
              {t(
                "امسح رمز طاولتك لتفتح المنيو وتطلب مباشرة. بلا تحميل، بلا حساب.",
                "Scan your table’s QR to open the menu and order. No downloads. No account needed.",
              )}
            </p>
          </div>
          <div className="scan-explainer__steps">
            <span>
              <QrCode size={17} />
              {t("امسح", "Scan")}
            </span>
            <ArrowRight size={15} />
            <span>
              <Utensils size={17} />
              {t("اختار", "Choose")}
            </span>
            <ArrowRight size={15} />
            <span>
              <ReceiptText size={17} />
              {t("اطلب", "Order")}
            </span>
          </div>
        </section>
      </main>
      <footer className="discovery-footer">
        <span>
          SYRIAN QR{" "}
          <small>{t("لقمة حلوة، تجربة أسهل.", "Good food. Less fuss.")}</small>
        </span>
        <button onClick={onOpenAdmin}>
          {t("مساحة عمل المطعم", "Restaurant workspace")}
          <ArrowUpRight size={16} />
        </button>
      </footer>
    </div>
  );
}
