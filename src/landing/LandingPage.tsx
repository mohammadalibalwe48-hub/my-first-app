import { useState, type JSX } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BarChart3,
  Check,
  ChefHat,
  Flame,
  Globe2,
  LayoutDashboard,
  MapPin,
  Menu,
  QrCode,
  ScanLine,
  ShoppingBasket,
  Smartphone,
  Store,
  Utensils,
  Wallet,
  X,
} from "lucide-react";
import {
  PLATFORM_NAME,
  PLATFORM_TAGLINE_AR,
  PLATFORM_TAGLINE_EN,
  PLATFORM_DESCRIPTION_AR,
  PLATFORM_DESCRIPTION_EN,
  PLATFORM_ADMIN_LABEL_AR,
  PLATFORM_ADMIN_LABEL_EN,
} from "../platform";
import {
  defaultCategories,
  formatSyp,
  makeItems,
  type Item,
} from "../domain";
import "./landing.css";

type Demo = {
  slug: string;
  letter: string;
  nameAr: string;
  nameEn: string;
  kindAr: string;
  kindEn: string;
  subAr: string;
  subEn: string;
  cityAr: string;
  cityEn: string;
  hoodAr: string;
  hoodEn: string;
};

const DEMOS: Demo[] = [
  {
    slug: "sufra",
    letter: "س",
    nameAr: "سُفرة الشام",
    nameEn: "Sufra Sham",
    kindAr: "مطعم شامي",
    kindEn: "Levantine restaurant",
    subAr: "مذاق البيت الشامي الأصيل",
    subEn: "Authentic Damascene taste",
    cityAr: "دمشق",
    cityEn: "Damascus",
    hoodAr: "المزة",
    hoodEn: "Al-Mazzeh",
  },
  {
    slug: "cozy",
    letter: "C",
    nameAr: "Cozy Corner",
    nameEn: "Cozy Corner",
    kindAr: "مقهى",
    kindEn: "Café",
    subAr: "قهوة. أكل. مزاج.",
    subEn: "Coffee. Food. Mood.",
    cityAr: "دمشق",
    cityEn: "Damascus",
    hoodAr: "أبو رمانة",
    hoodEn: "Abu Rummaneh",
  },
];

type Step = { icon: LucideIcon; title: string; text: string };
type Feature = { icon: LucideIcon; title: string; text: string };
type Stat = { value: string; unit: string; desc: string };
type DemoLink = { slug: string; label: string };
type DishPick = { slug: string; item: Item };

const dishById = (id: string): Item => {
  const found = makeItems(false).find((item) => item.id === id);
  if (!found) throw new Error(`missing seed dish ${id}`);
  return found;
};

const DISHES: DishPick[] = [
  { slug: "sufra", item: dishById("hummus") },
  { slug: "sufra", item: dishById("chicken") },
  { slug: "sufra", item: dishById("burger") },
  { slug: "sufra", item: dishById("cake") },
];

const CATEGORY_EN: Record<string, string> = Object.fromEntries(
  defaultCategories.map((entry) => [entry.name, entry.en]),
);
const TAG_EN: Record<string, string> = {
  chef: "Chef's pick",
  vegetarian: "Vegetarian",
  spicy: "Spicy",
};

type Copy = {
  navSub: string;
  langLabel: string;
  adminLabel: string;
  navLinks: { href: string; label: string }[];
  tryCta: string;
  heroEyebrow: string;
  heroScript: string;
  heroTitleA: string;
  heroTitleB: string;
  heroSub: string;
  heroCtaDemo: string;
  heroCtaHow: string;
  stats: Stat[];
  promoKind: string;
  promoLive: string;
  promoDishLabel: string;
  promoCta: (name: string) => string;
  promoHowTitle: string;
  promoHowText: string;
  dishesKicker: string;
  dishesTitle: string;
  dishesSub: string;
  dishesCta: string;
  dishBadge: string;
  dishFull: string;
  howKicker: string;
  howTitle: string;
  howSub: string;
  steps: Step[];
  featKicker: string;
  featTitle: string;
  featSub: string;
  features: Feature[];
  demoKicker: string;
  demoTitle: string;
  demoSub: string;
  demoBadge: string;
  demoNames: DemoLink[];
  demoButton: (name: string) => string;
  demoNote: string;
  ctaTitle: string;
  ctaSub: string;
  ctaBtn1: string;
  ctaBtn2: string;
  ctaPrint: string;
  footerTag: string;
  footerDemosTitle: string;
  footerAdminTitle: string;
  footerDemos: DemoLink[];
  footerAdmin: string;
  openAria: string;
  closeAria: string;
};

const AR: Copy = {
  navSub: PLATFORM_TAGLINE_AR,
  langLabel: "EN",
  adminLabel: PLATFORM_ADMIN_LABEL_AR,
  navLinks: [
    { href: "#dishes", label: "المنيو" },
    { href: "#how", label: "كيف تعمل" },
    { href: "#features", label: "المميزات" },
    { href: "#demos", label: "متاجر حية" },
  ],
  tryCta: "جرّب المتجر التجريبي",
  heroEyebrow: "منصّة سورية للقوائم الرقمية والطلب من الطاولة",
  heroScript: "اطلب وأنت جالس على طاولتك",
  heroTitleA: "لكل مطعم ومقهى",
  heroTitleB: "متجر رقمي باسمه وألوانه",
  heroSub: PLATFORM_DESCRIPTION_AR,
  heroCtaDemo: "جرّب المتجر التجريبي",
  heroCtaHow: "كيف تعمل؟",
  stats: [
    { value: "٣", unit: "خطوات", desc: "لطلبك: من المسح حتى المطبخ" },
    { value: "١", unit: "رمز QR", desc: "لكل طاولة في مطعمك" },
    { value: "٠", unit: "تطبيق", desc: "على الهاتف — كل شيء من المتصفح" },
  ],
  promoKind: "مطعم شامي",
  promoLive: "مثال حيّ من مطبخنا",
  promoDishLabel: "طبق اليوم",
  promoCta: (name) => `افتح متجر ${name}`,
  promoHowTitle: "متجر رقمي لمطبخك",
  promoHowText:
    "قائمة رقمية بلون علامتك، طلب مباشر من الطاولة، ودفع محلي مرن.",
  dishesKicker: "من قوائمنا الحية",
  dishesTitle: "أطباق تليق بمائدتك",
  dishesSub:
    "نختار لك من قوائم متاجرنا التجريبية — اضغط على أي طبق لتدخل المطبخ الحيّ وتطلبه مباشرة.",
  dishesCta: "اطلبه الآن",
  dishBadge: "الأكثر طلباً",
  dishFull: "عرض التفاصيل في المطعم",
  howKicker: "كيف تعمل؟",
  howTitle: "من الطاولة إلى المطبخ في لحظات",
  howSub:
    "ثلاث خطوات بسيطة تفصل زبونك عن الطبق — بلا تطبيق يُحمَّل ولا رقم يُحفظ.",
  steps: [
    {
      icon: QrCode,
      title: "امسح رمز QR على طاولتك",
      text: "يفتح قائمة المطعم على هاتفك فوراً — دون تطبيق ولا تسجيل.",
    },
    {
      icon: ShoppingBasket,
      title: "تصفّح القائمة وأضف طلبك",
      text: "اختر الأطباق والإضافات والملاحظات وأضفها إلى سلة طلبك بلمسات قليلة.",
    },
    {
      icon: ChefHat,
      title: "يصل الطلب مباشرة إلى المطبخ",
      text: "يُجهَّز الطبق ويُسجَّل دفعه فوراً وتتابع طلبك لحظة بلحظة.",
    },
  ],
  featKicker: "لماذا سيريان كيو آر؟",
  featTitle: "كل ما يحتاجه مطعمك <em>في مكان واحد</em>",
  featSub:
    "صُممت المنصة للمطاعم والمقاهي السورية: سهلة لزبونك، وقوية لإدارتك.",
  features: [
    {
      icon: Store,
      title: "متجر لكل مطعم",
      text: "لكل مطعم أو مقهى عنوانه ومساحته وألوانه وهويّته الخاصة.",
    },
    {
      icon: Smartphone,
      title: "بلا تطبيق",
      text: "يعمل من أي متصفح بعد مسح QR — لا تنزيلات ولا مساحة على الهاتف.",
    },
    {
      icon: ScanLine,
      title: "طلب فوري من الطاولة",
      text: "يصل طلبك إلى المطبخ لحظياً دون انتظار جرسون ولا رفع صوت.",
    },
    {
      icon: Wallet,
      title: "دفع مرن محلي",
      text: "كاش، محافظ محلية، وتأكيد دفع سريع ومريح عبر واتساب.",
    },
    {
      icon: LayoutDashboard,
      title: "لوحة إدارة الطلبات",
      text: "استلم وجهّز وسلّم بمراحل لحظية يتتبعها زبونك خطوة بخطوة.",
    },
    {
      icon: BarChart3,
      title: "تقارير وقوائم بسهولة",
      text: "تحكّم بالقائمة والأصناف والأسعار، واطّلع على تقارير مبيعات واضحة.",
    },
  ],
  demoKicker: "جرّب بنفسك",
  demoTitle: "متاجر حية جاهزة للاستكشاف",
  demoSub: "لا تحتاج رمزاً ولا حساباً — اضغط وادخل إلى تجربة الطلب كاملة.",
  demoBadge: "مثال مباشر",
  demoNames: [
    { slug: "sufra", label: "سُفرة الشام" },
    { slug: "cozy", label: "Cozy Corner" },
  ],
  demoButton: (name) => `افتح متجر ${name}`,
  demoNote:
    "هذه متاجر حية — جرّب تجربة الطلب الكاملة من أول طبق حتى إرسال الطلب.",
  ctaTitle: "جاهز لقائمة رقمية تليق بمطبخك؟",
  ctaSub: "ابدأ بمتجر تجريبي اليوم — مجاناً وبلا تعقيد.",
  ctaBtn1: "جرّب سُفرة الشام",
  ctaBtn2: "جرّب Cozy Corner",
  ctaPrint: "منصة سورية، بيانات على خوادم سحابية، وتجربة عربية كاملة.",
  footerTag: PLATFORM_TAGLINE_AR,
  footerDemosTitle: "المتاجر التجريبية",
  footerAdminTitle: "الدخول",
  footerDemos: [
    { slug: "sufra", label: "سُفرة الشام" },
    { slug: "cozy", label: "Cozy Corner" },
  ],
  footerAdmin: PLATFORM_ADMIN_LABEL_AR,
  openAria: "فتح قائمة التنقل",
  closeAria: "إغلاق قائمة التنقل",
};

const EN: Copy = {
  navSub: PLATFORM_TAGLINE_EN,
  langLabel: "عربي",
  adminLabel: PLATFORM_ADMIN_LABEL_EN,
  navLinks: [
    { href: "#dishes", label: "Menu" },
    { href: "#how", label: "How it works" },
    { href: "#features", label: "Features" },
    { href: "#demos", label: "Live stores" },
  ],
  tryCta: "Try a live demo",
  heroEyebrow: "A Syrian platform for digital menus and table ordering",
  heroScript: "Order from your seat",
  heroTitleA: "Every restaurant & café gets its own",
  heroTitleB: "digital storefront",
  heroSub: PLATFORM_DESCRIPTION_EN,
  heroCtaDemo: "Try a live demo",
  heroCtaHow: "How it works?",
  stats: [
    { value: "3", unit: "steps", desc: "to order — from scan to kitchen" },
    { value: "1", unit: "QR code", desc: "per table in your venue" },
    { value: "0", unit: "apps", desc: "to install — everything runs in the browser" },
  ],
  promoKind: "Levantine restaurant",
  promoLive: "Live from our kitchen",
  promoDishLabel: "Today's dish",
  promoCta: (name) => `Open ${name}`,
  promoHowTitle: "A digital storefront for your kitchen",
  promoHowText:
    "A QR menu in your brand colours, direct table ordering and flexible local payments.",
  dishesKicker: "From our live menus",
  dishesTitle: "Dishes worthy of your table",
  dishesSub:
    "Picked from our live demo kitchens — tap any dish to walk into the real store and order it.",
  dishesCta: "Order it now",
  dishBadge: "Bestseller",
  dishFull: "See it in the restaurant",
  howKicker: "How it works",
  howTitle: "From table to kitchen in moments",
  howSub:
    "Three simple steps separate your guest from the dish — no app to download, no number to remember.",
  steps: [
    {
      icon: QrCode,
      title: "Scan the QR code on your table",
      text: "The restaurant menu opens on your phone instantly — no app, no sign-up.",
    },
    {
      icon: ShoppingBasket,
      title: "Browse the menu and build your order",
      text: "Pick dishes, extras and notes, then add them to your basket in a few taps.",
    },
    {
      icon: ChefHat,
      title: "Your order reaches the kitchen directly",
      text: "It is prepared and registered for payment right away — follow it live.",
    },
  ],
  featKicker: "Why SYRIAN QR?",
  featTitle: "Everything your venue needs, <em>in one place</em>",
  featSub:
    "Built for Syrian restaurants and cafés: effortless for your guests, powerful for your team.",
  features: [
    {
      icon: Store,
      title: "A storefront for every venue",
      text: "Each restaurant or café gets its own address, space, colors and identity.",
    },
    {
      icon: Smartphone,
      title: "No app needed",
      text: "Works in any browser after a quick QR scan — no downloads, no clutter.",
    },
    {
      icon: ScanLine,
      title: "Instant ordering from the table",
      text: "Orders reach the kitchen right away — no waiting on staff.",
    },
    {
      icon: Wallet,
      title: "Flexible local payments",
      text: "Cash, local wallets, and fast, easy payment confirmation via WhatsApp.",
    },
    {
      icon: LayoutDashboard,
      title: "Order management dashboard",
      text: "Receive, prepare and deliver through live stages your guest can track.",
    },
    {
      icon: BarChart3,
      title: "Menus & reports made simple",
      text: "Control the menu, items and prices, and read clear sales reports.",
    },
  ],
  demoKicker: "Try it yourself",
  demoTitle: "Live stores ready to explore",
  demoSub: "No QR code and no account needed — just tap and step into a full ordering flow.",
  demoBadge: "Live example",
  demoNames: [
    { slug: "sufra", label: "Sufra Sham" },
    { slug: "cozy", label: "Cozy Corner" },
  ],
  demoButton: (name) => `Open ${name}`,
  demoNote:
    "These are real working stores — experience the full ordering journey from your first dish to sending the order.",
  ctaTitle: "Ready for a digital menu that suits your kitchen?",
  ctaSub: "Start with a free demo store today — no strings attached.",
  ctaBtn1: "Try Sufra Sham",
  ctaBtn2: "Try Cozy Corner",
  ctaPrint:
    "A Syrian platform with cloud-hosted data and a fully Arabic experience.",
  footerTag: PLATFORM_TAGLINE_EN,
  footerDemosTitle: "Demo stores",
  footerAdminTitle: "Access",
  footerDemos: [
    { slug: "sufra", label: "Sufra Sham" },
    { slug: "cozy", label: "Cozy Corner" },
  ],
  footerAdmin: PLATFORM_ADMIN_LABEL_EN,
  openAria: "Open navigation menu",
  closeAria: "Close navigation menu",
};

const isRtl = (language: "ar" | "en") => language === "ar";

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
}): JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false);
  const t = language === "ar" ? AR : EN;
    const demoOf = (slug: string) => DEMOS.find((d) => d.slug === slug) ?? DEMOS[0];
  const demoName = (d: Demo) => (language === "ar" ? d.nameAr : d.nameEn);
  const demoKind = (d: Demo) => (language === "ar" ? d.kindAr : d.kindEn);
  const demoLocation = (d: Demo) =>
    language === "ar"
      ? `${d.hoodAr}، ${d.cityAr}`
      : `${d.hoodEn}, ${d.cityEn}`;
  const dishName = (i: Item) => (language === "ar" ? i.name : i.en || i.name);
  const dishCategory = (i: Item) =>
    language === "ar" ? i.category : CATEGORY_EN[i.category] ?? "";
  const dishTags = (i: Item) =>
    language === "ar"
      ? i.tags.map((tag) => tag === "chef" ? "اختيار الشيف" : tag === "vegetarian" ? "نباتي" : "حار")
      : i.tags.map((tag) => TAG_EN[tag] ?? tag);

  const openDemo = (slug: string) => {
    setMenuOpen(false);
    onOpenCafe(slug);
  };

  const mainDemo = demoOf("sufra");
  const cozyDemo = demoOf("cozy");
  const mainDish = dishById("chicken");
  const cozyDish = dishById("coffee");

  return (
    <div
      className="lp"
      dir={isRtl(language) ? "rtl" : "ltr"}
      lang={language}
    >
      <a className="lp-skip" href="#lp-main">
        {language === "ar" ? "تخطَّ إلى المحتوى" : "Skip to content"}
      </a>

      <header className="lp-nav">
        <div className="lp-nav__inner">
          <div className="lp-nav__start">
            <span className="lp-brand__mark" aria-hidden="true">
              <Utensils size={20} strokeWidth={2.4} />
            </span>
            <span className="lp-brand__text">
              <strong className="lp-brand__name">{PLATFORM_NAME}</strong>
              <small className="lp-brand__sub">{t.navSub}</small>
            </span>
          </div>

          <nav
            className="lp-nav__links"
            aria-label={language === "ar" ? "روابط التنقل" : "Navigation links"}
          >
            {t.navLinks.map((link) => (
              <a key={link.href} href={link.href}>
                {link.label}
              </a>
            ))}
          </nav>

          <div className="lp-nav__end">
            <button
              type="button"
              className="lp-btn lp-lang"
              onClick={onToggleLanguage}
              aria-label={
                language === "ar"
                  ? "Switch to English"
                  : "التبديل إلى العربية"
              }
            >
              <Globe2 size={16} />
              <span>{t.langLabel}</span>
            </button>
            <button type="button" className="lp-btn lp-admin" onClick={onOpenAdmin}>
              {t.adminLabel}
            </button>
            <button
              type="button"
              className="lp-burger"
              aria-expanded={menuOpen}
              aria-controls="lp-mobile-menu"
              aria-label={menuOpen ? t.closeAria : t.openAria}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav
            id="lp-mobile-menu"
            className="lp-nav-menu"
            aria-label={language === "ar" ? "قائمة الجوال" : "Mobile menu"}
          >
            {t.navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <div className="lp-nav-menu__row">
              <button type="button" onClick={onToggleLanguage}>
                <Globe2 size={16} />
                {t.langLabel}
              </button>
              <button type="button" onClick={onOpenAdmin}>
                {t.adminLabel}
              </button>
              <button type="button" onClick={() => openDemo("sufra")}>
                <Utensils size={16} />
                {t.tryCta}
              </button>
            </div>
          </nav>
        )}
      </header>

      <main id="lp-main">
        {/* ================= HERO ================= */}
        <section className="lp-hero" id="top">
          <div className="lp-hero__sun lp-hero__sun--a" aria-hidden="true" />
          <div className="lp-hero__sun lp-hero__sun--b" aria-hidden="true" />

          <div className="lp-inner">
            <div className="lp-hero__intro">
              <span className="lp-eyebrow">
                <Flame size={15} strokeWidth={2.4} />
                {t.heroEyebrow}
              </span>
              <p className="lp-hero__script">{t.heroScript}</p>
              <h1 className="lp-hero__title">
                <span>{t.heroTitleA}</span>
                <span className="lp-hero__title-accent">{t.heroTitleB}</span>
              </h1>
              <p className="lp-hero__sub">{t.heroSub}</p>
              <div className="lp-hero__cta">
                <button
                  type="button"
                  className="lp-btn lp-btn--red"
                  onClick={() => openDemo("sufra")}
                >
                  {t.heroCtaDemo}
                  <ArrowRight />
                </button>
                <a href="#how" className="lp-btn lp-btn--light">
                  {t.heroCtaHow}
                </a>
              </div>
            </div>

            {/* Promotional grid */}
            <div className="lp-promos">
              <article className="lp-promo lp-promo--red">
                <span className="lp-promo__burst" aria-hidden="true" />
                <div className="lp-promo__copy">
                  <span className="lp-promo__kicker">
                    <i />
                    {demoKind(mainDemo)}
                  </span>
                  <h2>{demoName(mainDemo)}</h2>
                  <p>
                    {language === "ar" ? mainDemo.subAr : mainDemo.subEn}
                  </p>
                  <span className="lp-promo__dish">
                    {t.promoDishLabel} · {dishName(mainDish)}
                  </span>
                  <button
                    type="button"
                    className="lp-btn lp-btn--yellow"
                    onClick={() => openDemo(mainDemo.slug)}
                  >
                    {t.promoCta(demoName(mainDemo))}
                    <ArrowRight />
                  </button>
                </div>
                <div className="lp-promo__media">
                  <img src={mainDish.image} alt={dishName(mainDish)} />
                  <span className="lp-promo__badge">
                    <b>{formatSyp(mainDish.price)}</b>
                    <small>{t.promoLive}</small>
                  </span>
                </div>
              </article>

              <article className="lp-promo lp-promo--yellow">
                <div className="lp-promo__media">
                  <img src={cozyDish.image} alt={dishName(cozyDish)} />
                </div>
                <div className="lp-promo__copy">
                  <span className="lp-promo__kicker">
                    <i />
                    {demoKind(cozyDemo)}
                  </span>
                  <h2>{demoName(cozyDemo)}</h2>
                  <p>
                    {language === "ar" ? cozyDemo.subAr : cozyDemo.subEn}
                  </p>
                  <span className="lp-promo__dish">
                    {t.promoDishLabel} · {dishName(cozyDish)}
                  </span>
                  <div className="lp-promo__row">
                    <button
                      type="button"
                      className="lp-btn lp-btn--ink"
                      onClick={() => openDemo(cozyDemo.slug)}
                    >
                      {t.promoCta(demoName(cozyDemo))}
                      <ArrowRight />
                    </button>
                    <span className="lp-promo__chip">
                      {formatSyp(cozyDish.price)}
                    </span>
                  </div>
                </div>
              </article>

              <article className="lp-promo lp-promo--teal">
                <div className="lp-promo__copy">
                  <span className="lp-promo__kicker">
                    <i />
                    SYRIAN QR
                  </span>
                  <h2>{t.promoHowTitle}</h2>
                  <p>{t.promoHowText}</p>
                  <div className="lp-promo__ticks">
                    <span>
                      <Check size={13} strokeWidth={3} /> {t.stats[1].unit} QR
                    </span>
                    <span>
                      <Check size={13} strokeWidth={3} /> {t.stats[2].unit} {language === "ar" ? "تطبيقات" : "apps"}
                    </span>
                    <span>
                      <Check size={13} strokeWidth={3} /> {language === "ar" ? "دفع محلي" : "Local payments"}
                    </span>
                  </div>
                  <a href="#how" className="lp-btn lp-btn--light">
                    {t.heroCtaHow}
                    <ArrowRight />
                  </a>
                </div>
                <div className="lp-promo__qr" aria-hidden="true">
                  <QrCode size={150} strokeWidth={1.1} />
                </div>
              </article>
            </div>

            {/* Stats band */}
            <dl className="lp-stats">
              {t.stats.map((stat) => (
                <div className="lp-stat" key={stat.unit + stat.value}>
                  <dt>
                    <span className="lp-stat__value">{stat.value}</span>
                    <span className="lp-stat__unit">{stat.unit}</span>
                  </dt>
                  <dd>{stat.desc}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ================= POPULAR DISHES ================= */}
        <section className="lp-section lp-section--paper" id="dishes">
          <div className="lp-inner">
            <div className="lp-head lp-head--center">
              <span className="section-kicker">{t.dishesKicker}</span>
              <h2 className="section-title">{t.dishesTitle}</h2>
              <p className="section-sub lp-head__sub">{t.dishesSub}</p>
            </div>

            <div className="lp-dishes">
              {DISHES.map((pick) => {
                const item = pick.item;
                const tags = dishTags(item);
                return (
                  <article className="lp-dish" key={item.id}>
                    <button
                      type="button"
                      className="lp-dish__media"
                      onClick={() => openDemo(pick.slug)}
                      aria-label={`${dishName(item)} — ${t.dishFull}`}
                    >
                      <img src={item.image} alt={dishName(item)} loading="lazy" />
                      {item.popular && (
                        <span className="lp-dish__badge">{t.dishBadge}</span>
                      )}
                    </button>
                    <div className="lp-dish__body">
                      <span className="lp-dish__cat">{dishCategory(item)}</span>
                      <button
                        type="button"
                        className="lp-dish__name"
                        onClick={() => openDemo(pick.slug)}
                      >
                        {dishName(item)}
                      </button>
                      {item.desc && <p className="lp-dish__desc">{item.desc}</p>}
                      {tags.length > 0 && (
                        <div className="lp-dish__tags">
                          {tags.map((tag) => (
                            <span key={tag}>{tag}</span>
                          ))}
                        </div>
                      )}
                      <div className="lp-dish__foot">
                        <strong className="lp-dish__price">
                          {formatSyp(item.price)}
                        </strong>
                        <button
                          type="button"
                          className="lp-dish__btn"
                          onClick={() => openDemo(pick.slug)}
                        >
                          {t.dishesCta}
                          <ArrowRight size={16} />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* ================= HOW ================= */}
        <section className="lp-section" id="how">
          <div className="lp-inner">
            <div className="lp-head">
              <span className="section-kicker">{t.howKicker}</span>
              <h2 className="section-title">{t.howTitle}</h2>
              <p className="section-sub lp-head__sub">{t.howSub}</p>
            </div>

            <div className="lp-steps">
              {t.steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <article className="lp-step" key={step.title}>
                    <span className="lp-step__num">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="lp-step__icon">
                      <Icon size={26} />
                    </span>
                    <h3>{step.title}</h3>
                    <p>{step.text}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* ================= FEATURES ================= */}
        <section className="lp-section lp-section--alt" id="features">
          <div className="lp-inner">
            <div className="lp-head lp-head--center">
              <span className="section-kicker">{t.featKicker}</span>
              <h2
                className="section-title"
                dangerouslySetInnerHTML={{ __html: t.featTitle }}
              />
              <p className="section-sub lp-head__sub">{t.featSub}</p>
            </div>

            <div className="lp-features">
              {t.features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <article className="lp-feature" key={feature.title}>
                    <span className="lp-feature__icon">
                      <Icon size={22} />
                    </span>
                    <h3>{feature.title}</h3>
                    <p>{feature.text}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* ================= LIVE STORES ================= */}
        <section className="lp-section" id="demos">
          <div className="lp-inner">
            <div className="lp-head">
              <span className="section-kicker">{t.demoKicker}</span>
              <h2 className="section-title">{t.demoTitle}</h2>
              <p className="section-sub lp-head__sub">{t.demoSub}</p>
            </div>

            <div className="lp-demos">
              {DEMOS.map((demo) => {
                const pick =
                  demo.slug === "sufra"
                    ? dishById("kibbeh")
                    : dishById("coffee");
                return (
                  <article className="lp-demo" key={demo.slug}>
                    <div className="lp-demo__media">
                      <img src={pick.image} alt={demoName(demo)} loading="lazy" />
                      <span className="lp-demo__badge">{t.demoBadge}</span>
                    </div>
                    <div className="lp-demo__body">
                      <span className="lp-demo__kind">{demoKind(demo)}</span>
                      <h3>{demoName(demo)}</h3>
                      <p className="lp-demo__sub">
                        {language === "ar" ? demo.subAr : demo.subEn}
                      </p>
                      <p className="lp-demo__loc">
                        <MapPin size={14} />
                        {demoLocation(demo)}
                      </p>
                      <button
                        type="button"
                        className="lp-demo-btn"
                        onClick={() => openDemo(demo.slug)}
                      >
                        {t.demoButton(demoName(demo))}
                        <ArrowRight size={17} />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            <p className="lp-demo-note">{t.demoNote}</p>
          </div>
        </section>

        {/* ================= FEATURED OFFER ================= */}
        <section className="lp-section lp-offer-wrap">
          <div className="lp-inner">
            <div className="lp-offer">
              <div className="lp-offer__burst" aria-hidden="true" />
              <span className="lp-offer__disc" aria-hidden="true">
                <small>٪</small>
                <b>{language === "ar" ? "شهي" : "Tasty"}</b>
              </span>
              <div className="lp-offer__copy">
                <p className="lp-offer__script">
                  {language === "ar" ? "ألف هنا وصحة" : "Bon appétit"}
                </p>
                <h2>{t.ctaTitle}</h2>
                <p className="lp-offer__sub">{t.ctaSub}</p>
                <div className="lp-offer__actions">
                  <button
                    type="button"
                    className="lp-btn lp-btn--yellow"
                    onClick={() => openDemo("sufra")}
                  >
                    {t.ctaBtn1}
                    <ArrowRight />
                  </button>
                  <button
                    type="button"
                    className="lp-btn lp-btn--ghostlight"
                    onClick={() => openDemo("cozy")}
                  >
                    {t.ctaBtn2}
                    <ArrowRight />
                  </button>
                </div>
                <small className="lp-offer__print">{t.ctaPrint}</small>
              </div>
              <div className="lp-offer__plate" aria-hidden="true">
                <img src={dishById("burger").image} alt="" />
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ================= FOOTER ================= */}
      <footer className="lp-footer">
        <div className="lp-inner lp-footer__grid">
          <div className="lp-footer__brand">
            <span className="lp-brand__mark" aria-hidden="true">
              <Utensils size={18} strokeWidth={2.4} />
            </span>
            <div>
              <strong>{PLATFORM_NAME}</strong>
              <p>{t.footerTag}</p>
            </div>
          </div>

          <div className="lp-footer__col">
            <h4>{t.footerDemosTitle}</h4>
            {t.footerDemos.map((demo) => (
              <button
                type="button"
                key={demo.slug}
                onClick={() => openDemo(demo.slug)}
              >
                {demo.label}
              </button>
            ))}
          </div>

          <div className="lp-footer__col">
            <h4>{t.footerAdminTitle}</h4>
            <button type="button" onClick={onOpenAdmin}>
              {t.footerAdmin}
            </button>
          </div>

          <div className="lp-footer__note">
            <span className="lp-brand__mark" aria-hidden="true">
              <Globe2 size={16} />
            </span>
            {language === "ar"
              ? "منصة سورية · قوائم رقمية وطلبات مباشرة"
              : "Proudly Syrian · digital menus & direct orders"}
          </div>
        </div>
        <div className="lp-footer__bottom">
          <div className="lp-inner">
            <span>
              © {new Date().getFullYear()} {PLATFORM_NAME}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
