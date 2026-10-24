import {
  ArrowRight,
  ArrowUpRight,
  Globe2,
  QrCode,
  Utensils,
  ShoppingBag,
  ReceiptText,
} from "lucide-react";
import { PLATFORM_NAME } from "../platform";
import "./landing.css";

const venues = [
  {
    slug: "sufra",
    ar: "سُفرة الشام",
    en: "Sufra Sham",
    kindAr: "مطبخ شامي",
    kindEn: "LEVANTINE KITCHEN",
    descriptionAr: "مازة، مشاوي، ونكهات بتجمعنا على سُفرة وحدة.",
    descriptionEn: "Mezze, grills, and the pleasure of sharing a table.",
    image: "/images/syrian-table-hero.webp",
    number: "01",
  },
  {
    slug: "cozy",
    ar: "Cozy Corner",
    en: "Cozy Corner",
    kindAr: "قهوة ولقمات خفيفة",
    kindEn: "COFFEE & COMFORT",
    descriptionAr: "قهوة على رواق، لقمة خفيفة، وشي حلو ليومك.",
    descriptionEn: "Your morning coffee. A light bite. A slower moment.",
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
      <div className="home-paper">
        <header className="home-head">
          <div className="home-head__in">
            <a className="home-brand" href="/" aria-label={PLATFORM_NAME}>
              <Utensils size={21} strokeWidth={1.5} />
              <span>
                SYRIAN<span className="home-brand__qr">QR</span>
              </span>
            </a>
            <nav aria-label={t("التنقل الرئيسي", "Main navigation")}>
              <a className="home-nav-menus" href="#restaurants">
                {t("المطاعم", "The restaurants")}
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
              <span className="home-kicker">
                {t("المنيو أقرب. اللَّمّة أحلى.", "GOOD TASTE. GOOD COMPANY.")}
              </span>
              <h1 id="home-title">
                {t("سُفرة حلوة،", "A little taste")}
                <br />
                <em>{t("على ذوقك.", "of together.")}</em>
              </h1>
              <p>
                {t(
                  "اختار مطعمك، اكتشف اللي بتحبّه، وخلّي طلبك على راحتك. من أول قهوة لآخر لقمة.",
                  "A favourite place. Something delicious. Explore the menus and order your way, from the first coffee to the last bite.",
                )}
              </p>
              <a href="#restaurants" className="home-button">
                {t("اكتشف المطاعم", "Find your favourite")}
                <ArrowRight size={19} />
              </a>
              <div className="home-hero__note">
                <QrCode size={20} strokeWidth={1.5} />
                <span>
                  {t(
                    "بالمطعم؟ امسح رمز طاولتك واطلب مباشرة.",
                    "At the table? Scan your QR code to order.",
                  )}
                </span>
              </div>
            </div>
            <div className="home-hero__photo">
              <img
                src="/images/syrian-table-hero.webp"
                alt={t(
                  "سُفرة شامية من الحمص والفتوش والمشاوي والخبز",
                  "A sharing table of hummus, fattoush, grilled skewers and flatbread",
                )}
                fetchPriority="high"
                width="1536"
                height="1024"
              />
              <span className="home-photo-note">
                {t(
                  "على سُفرة وحدة، منجتمع.",
                  "Made for the middle of the table.",
                )}
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
                  {t("اختار قعدتك", "PICK YOUR PLACE")}
                </span>
                <h2 id="restaurants-title">
                  {t("وين حابب تكون؟", "Where shall we eat?")}
                </h2>
              </div>
              <p>
                {t(
                  "منيو جديد، ومزاج على ذوقك.",
                  "Two places. Plenty to fall in love with.",
                )}
              </p>
            </header>
            <div className="home-venues">
              {venues.map((v) => (
                <button
                  className="home-venue"
                  key={v.slug}
                  onClick={() => onOpenCafe(v.slug)}
                >
                  <div className="home-venue__photo">
                    <img
                      src={v.image}
                      alt=""
                      loading="lazy"
                      width="1536"
                      height="1024"
                    />
                    <span className="home-venue__number">{v.number}</span>
                    <span className="home-venue__open">
                      <ArrowUpRight size={23} strokeWidth={1.4} />
                    </span>
                  </div>
                  <div className="home-venue__body">
                    <span className="home-kicker">{t(v.kindAr, v.kindEn)}</span>
                    <h3>{t(v.ar, v.en)}</h3>
                    <p>{t(v.descriptionAr, v.descriptionEn)}</p>
                    <span className="home-venue__action">
                      {t("تصفح المنيو", "Explore the menu")}
                      <ArrowRight size={17} />
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>
          <section className="home-how" aria-labelledby="how-title">
            <header>
              <span className="home-kicker">
                {t("بكل بساطة", "LESS WAITING. MORE ENJOYING.")}
              </span>
              <h2 id="how-title">
                {t("طلبك، بثلاث خطوات.", "From menu to moment.")}
              </h2>
            </header>
            <div className="home-how__steps">
              {[
                {
                  Icon: QrCode,
                  n: "01",
                  ar: "افتح المنيو",
                  en: "Make yourself at home",
                  a: "امسح رمز الطاولة أو اختار مطعمك من هون.",
                  e: "Scan the table QR or choose your restaurant here.",
                },
                {
                  Icon: Utensils,
                  n: "02",
                  ar: "اختار على ذوقك",
                  en: "Find your flavour",
                  a: "شوف الأطباق، اختار إضافاتك، وجهّز طلبك.",
                  e: "Explore the dishes and add your own little extras.",
                },
                {
                  Icon: ReceiptText,
                  n: "03",
                  ar: "اطلب وخليك مطمّن",
                  en: "Enjoy the moment",
                  a: "راجع سلتك واطلب، وتابع حالة طلبك بسهولة.",
                  e: "Review your basket, place your order, and follow its progress.",
                },
              ].map(({ Icon, n, ar: a, en, a: descAr, e }) => (
                <div key={n}>
                  <div className="home-how__top">
                    <Icon size={26} strokeWidth={1.35} />
                    <span>{n}</span>
                  </div>
                  <h3>{t(a, en)}</h3>
                  <p>{t(descAr, e)}</p>
                </div>
              ))}
            </div>
          </section>
          <section className="home-workspace">
            <div>
              <span className="home-kicker">
                {t(
                  "للفريق اللي خلف كل سُفرة",
                  "FOR THE PEOPLE BEHIND THE TABLE",
                )}
              </span>
              <h2>
                {t("خدمة أرتب. فريق أريح.", "A good service starts here.")}
              </h2>
              <p>
                {t(
                  "الطلبات، المطبخ، والكاشير. كل شغل المطعم بمكان واحد.",
                  "Orders, kitchen, and cashier. Your restaurant’s day, in one place.",
                )}
              </p>
            </div>
            <button onClick={onOpenAdmin}>
              {t("افتح مساحة العمل", "Open your workspace")}
              <ArrowUpRight size={20} />
            </button>
          </section>
        </main>
        <footer className="home-footer">
          <a className="home-brand" href="/" aria-label={PLATFORM_NAME}>
            SYRIAN<span className="home-brand__qr">QR</span>
          </a>
          <p>{t("كل سُفرة إلها حكاية.", "Every table has a story.")}</p>
          <span>
            <ShoppingBag size={14} />
            {t(
              "منيو وطلب، بلا تحميل تطبيق.",
              "Menus & ordering. No app needed.",
            )}
          </span>
        </footer>
      </div>
    </div>
  );
}
