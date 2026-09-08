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
  Star,
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
  navAriaLabel: string;
  mobileNavAria: string;
  langLabel: string;
  adminLabel: string;
  navLinks: { href: string; label: string }[];
  tryCta: string;
  edition: string;
  marquee: string[];
  heroEyebrow: string;
  heroScript: string;
  heroTitleA: string;
  heroTitleB: string;
  heroSub: string;
  heroCtaDemo: string;
  heroCtaHow: string;
  scanLabel: string;
  stats: Stat[];
  promoLive: string;
  dishesKicker: string;
  dishesTitle: string;
  dishesSub: string;
  dishesCta: string;
  dishBadge: string;
  dishFull: string;
  howKicker: string;
  howTitle: string;
  howSub: string;
  howFooter: string;
  steps: Step[];
  featKicker: string;
  featTitle: string;
  featSub: string;
  featNote: string;
  features: Feature[];
  demoKicker: string;
  demoTitle: string;
  demoSub: string;
  demoBadge: string;
  demoNames: DemoLink[];
  demoButton: (name: string) => string;
  demoNote: string;
  ctaScript: string;
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
  footerStatus: string;
  madeIn: string;
  openAria: string;
  closeAria: string;
};

const AR: Copy = {
  navSub: PLATFORM_TAGLINE_AR,
  navAriaLabel: "روابط التنقل الرئيسية",
  mobileNavAria: "قائمة التنقل للجوال",
  langLabel: "EN",
  adminLabel: PLATFORM_ADMIN_LABEL_AR,
  navLinks: [
    { href: "#dishes", label: "المنيو" },
    { href: "#how", label: "كيف تعمل" },
    { href: "#features", label: "المميزات" },
    { href: "#demos", label: "متاجر حية" },
  ],
  tryCta: "جرّب المتجر التجريبي",
  edition: "المجلد الأول · دمشق",
  marquee: [
    "اطلب من الطاولة",
    "بلا تطبيق",
    "دفع محلي مرن",
    "قوائم رقمية عربية",
  ],
  heroEyebrow: "منصّة سورية للقوائم الرقمية والطلب من الطاولة",
  heroScript: "اطلب وأنت جالس على طاولتك",
  heroTitleA: "لكل مطعم ومقهى",
  heroTitleB: "متجر رقمي باسمه وألوانه",
  heroSub: PLATFORM_DESCRIPTION_AR,
  heroCtaDemo: "جرّب المتجر التجريبي",
  heroCtaHow: "كيف تعمل؟",
  scanLabel: "امسح · اطلب · استمتع",
  stats: [
    { value: "٣", unit: "خطوات", desc: "لطلبك: من المسح حتى المطبخ" },
    { value: "١", unit: "رمز QR", desc: "لكل طاولة في مطعمك" },
    { value: "٠", unit: "تطبيق", desc: "على الهاتف — كل شيء من المتصفح" },
  ],
  promoLive: "مثال حيّ من مطبخنا",
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
  howFooter: "من المطبخ الشامي إلى طاولتك — بلا جرسون ولا انتظار.",
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
  featNote: "صُنعت في دمشق · لكل المطاعم والمقاهي السورية",
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
  ctaScript: "ألف هنا وصحة",
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
  footerStatus: "منصة سورية · قوائم رقمية وطلبات مباشرة",
  madeIn: "صُنع بحب في سوريا",
  openAria: "فتح قائمة التنقل",
  closeAria: "إغلاق قائمة التنقل",
};

const EN: Copy = {
  navSub: PLATFORM_TAGLINE_EN,
  navAriaLabel: "Primary navigation",
  mobileNavAria: "Mobile navigation menu",
  langLabel: "عربي",
  adminLabel: PLATFORM_ADMIN_LABEL_EN,
  navLinks: [
    { href: "#dishes", label: "Menu" },
    { href: "#how", label: "How it works" },
    { href: "#features", label: "Features" },
    { href: "#demos", label: "Live stores" },
  ],
  tryCta: "Try a live demo",
  edition: "Vol. 01 · Damascus",
  marquee: [
    "Order from the table",
    "No app needed",
    "Flexible local payments",
    "Bilingual digital menus",
  ],
  heroEyebrow: "A Syrian platform for digital menus and table ordering",
  heroScript: "Order from your seat",
  heroTitleA: "Every restaurant & café gets its own",
  heroTitleB: "digital storefront",
  heroSub: PLATFORM_DESCRIPTION_EN,
  heroCtaDemo: "Try a live demo",
  heroCtaHow: "How it works?",
  scanLabel: "Scan · Order · Enjoy",
  stats: [
    { value: "3", unit: "steps", desc: "to order — from scan to kitchen" },
    { value: "1", unit: "QR code", desc: "per table in your venue" },
    { value: "0", unit: "apps", desc: "to install — everything runs in the browser" },
  ],
  promoLive: "Live from our kitchen",
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
  howFooter: "From the Damascene kitchen to your table — no waiter, no waiting.",
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
  featNote: "Made in Damascus · for every Syrian restaurant & café",
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
  ctaScript: "Bon appétit",
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
  footerStatus: "Proudly Syrian · digital menus & direct orders",
  madeIn: "Made with love in Syria",
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
      ? i.tags.map((tag) => (tag === "chef" ? "اختيار الشيف" : tag === "vegetarian" ? "نباتي" : "حار"))
      : i.tags.map((tag) => TAG_EN[tag] ?? tag);

  const openDemo = (slug: string) => {
    setMenuOpen(false);
    onOpenCafe(slug);
  };

  const mainDemo = demoOf("sufra");
  const cozyDemo = demoOf("cozy");
  const mainDish = dishById("chicken");
  const cozyDish = dishById("coffee");
  const marquee = [...t.marquee, ...t.marquee, ...t.marquee, ...t.marquee];

  return (
    <div
      className="lp"
      dir={isRtl(language) ? "rtl" : "ltr"}
      lang={language}
    >
      <a className="lp-skip" href="#lp-main">
        {language === "ar" ? "تخطَّ إلى المحتوى" : "Skip to content"}
      </a>

      {/* ================= NAV ================= */}
      <header className="lp-nav">
        <div className="lp-nav__inner">
          <a className="lp-brand" href="#top" aria-label={`${PLATFORM_NAME} — ${t.navSub}`}>
            <span className="lp-brand__mark" aria-hidden="true">
              <Utensils size={20} strokeWidth={2.4} />
            </span>
            <span className="lp-brand__text">
              <strong className="lp-brand__name">{PLATFORM_NAME}</strong>
              <small className="lp-brand__sub">{t.navSub}</small>
            </span>
          </a>

          <nav className="lp-nav__links" aria-label={t.navAriaLabel}>
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
              <Globe2 size={16} aria-hidden="true" />
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
              {menuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav
            id="lp-mobile-menu"
            className="lp-nav-menu"
            aria-label={t.mobileNavAria}
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
                <Globe2 size={16} aria-hidden="true" />
                {t.langLabel}
              </button>
              <button type="button" onClick={onOpenAdmin}>
                {t.adminLabel}
              </button>
              <button type="button" onClick={() => openDemo("sufra")}>
                <Utensils size={16} aria-hidden="true" />
                {t.tryCta}
              </button>
            </div>
          </nav>
        )}
      </header>

      <main id="lp-main">
        {/* ================= HERO ================= */}
        <section className="lp-hero" id="top">
          <span className="lp-hero__texture" aria-hidden="true" />
          <span className="lp-hero__orb lp-hero__orb--a" aria-hidden="true" />
          <span className="lp-hero__orb lp-hero__orb--b" aria-hidden="true" />

          <div className="lp-inner">
            <div className="lp-hero__grid">
              <div className="lp-hero__intro">
                <span className="lp-kicker lp-kicker--hero">
                  <span className="lp-kicker__bar" aria-hidden="true" />
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
                    className="lp-btn lp-btn--yellow"
                    onClick={() => openDemo("sufra")}
                  >
                    {t.heroCtaDemo}
                    <ArrowRight className="lp-arrow" size={18} aria-hidden="true" />
                  </button>
                  <a href="#how" className="lp-btn lp-btn--ghost">
                    {t.heroCtaHow}
                  </a>
                </div>

                <dl className="lp-stats">
                  {t.stats.map((stat, index) => (
                    <div className="lp-stat" key={stat.unit + stat.value}>
                      <dt>
                        <span className="lp-stat__num" aria-hidden="true">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="lp-stat__value">{stat.value}</span>
                        <span className="lp-stat__unit">{stat.unit}</span>
                      </dt>
                      <dd>{stat.desc}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="lp-hero__stage">
                <span className="lp-hero__edition">
                  {PLATFORM_NAME} — {t.edition}
                </span>

                <figure className="lp-hero__plate lp-hero__plate--main">
                  <img src={mainDish.image} alt={dishName(mainDish)} />
                  <span className="lp-hero__burst" aria-hidden="true">
                    <Star size={30} fill="currentColor" strokeWidth={0} />
                  </span>
                  <figcaption>
                    <span className="lp-hero__plate-index">01</span>
                    <span className="lp-hero__plate-title">
                      <small>{dishCategory(mainDish)}</small>
                      <strong>{dishName(mainDish)}</strong>
                    </span>
                    <b className="lp-hero__plate-price">{formatSyp(mainDish.price)}</b>
                  </figcaption>
                </figure>

                <figure className="lp-hero__plate lp-hero__plate--side">
                  <img src={cozyDish.image} alt={dishName(cozyDish)} />
                  <figcaption>
                    <span className="lp-hero__plate-index">02</span>
                    <span className="lp-hero__plate-title">
                      <small>{t.promoLive}</small>
                      <strong>{dishName(cozyDish)}</strong>
                    </span>
                    <b className="lp-hero__plate-price">{formatSyp(cozyDish.price)}</b>
                  </figcaption>
                </figure>

                <span className="lp-hero__scan" aria-hidden="true">
                  <QrCode size={22} strokeWidth={1.8} />
                  <span>{t.scanLabel}</span>
                </span>

                <span className="lp-hero__num" aria-hidden="true">
                  {language === "ar" ? "٠٢" : "02"}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ================= TICKER ================= */}
        <div className="lp-ticker" aria-hidden="true">
          <div className="lp-ticker__track">
            {marquee.map((item, index) => (
              <span className="lp-ticker__item" key={`${item}-${index}`}>
                <Star size={13} fill="currentColor" strokeWidth={0} />
                {item}
                <i />
              </span>
            ))}
          </div>
        </div>

        {/* ================= POPULAR DISHES ================= */}
        <section className="lp-section lp-section--paper" id="dishes">
          <div className="lp-inner">
            <header className="lp-head lp-head--split">
              <div className="lp-head__title">
                <span className="lp-kicker">
                  <span className="lp-kicker__bar" aria-hidden="true" />
                  <b className="lp-kicker__num" aria-hidden="true">01</b>
                  {t.dishesKicker}
                </span>
                <h2 className="lp-title">{t.dishesTitle}</h2>
              </div>
              <p className="lp-head__sub">{t.dishesSub}</p>
            </header>

            <div className="lp-dishes">
              {DISHES.map((pick, index) => {
                const item = pick.item;
                const tags = dishTags(item);
                return (
                  <article className="lp-dish" key={item.id}>
                    <div className="lp-dish__frame">
                      <button
                        type="button"
                        className="lp-dish__media"
                        onClick={() => openDemo(pick.slug)}
                        aria-label={`${dishName(item)} — ${t.dishFull}`}
                      >
                        <img src={item.image} alt={dishName(item)} loading="lazy" />
                        <span className="lp-dish__num" aria-hidden="true">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        {item.popular && (
                          <span className="lp-dish__badge">
                            <Star size={11} fill="currentColor" strokeWidth={0} aria-hidden="true" />
                            {t.dishBadge}
                          </span>
                        )}
                      </button>
                    </div>
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
                          className="lp-btn lp-btn--mini lp-btn--ink"
                          onClick={() => openDemo(pick.slug)}
                        >
                          {t.dishesCta}
                          <ArrowRight size={15} className="lp-arrow" aria-hidden="true" />
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
        <section className="lp-section lp-section--teal" id="how">
          <div className="lp-inner">
            <header className="lp-head lp-head--center lp-head--on-dark">
              <span className="lp-kicker lp-kicker--on-dark">
                <span className="lp-kicker__bar" aria-hidden="true" />
                <b className="lp-kicker__num" aria-hidden="true">02</b>
                {t.howKicker}
              </span>
              <h2 className="lp-title">{t.howTitle}</h2>
              <p className="lp-head__sub">{t.howSub}</p>
            </header>

            <div className="lp-steps">
              {t.steps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <article className="lp-step" key={step.title}>
                    <span className="lp-step__num" aria-hidden="true">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="lp-step__icon">
                      <Icon size={26} strokeWidth={2} aria-hidden="true" />
                    </span>
                    <h3>{step.title}</h3>
                    <p>{step.text}</p>
                  </article>
                );
              })}
            </div>

            <p className="lp-how__foot">
              <Check size={16} strokeWidth={3} aria-hidden="true" />
              {t.howFooter}
            </p>
          </div>
        </section>

        {/* ================= FEATURES ================= */}
        <section className="lp-section lp-section--cream" id="features">
          <div className="lp-inner">
            <header className="lp-head lp-head--split">
              <div className="lp-head__title">
                <span className="lp-kicker">
                  <span className="lp-kicker__bar" aria-hidden="true" />
                  <b className="lp-kicker__num" aria-hidden="true">03</b>
                  {t.featKicker}
                </span>
                <h2
                  className="lp-title"
                  dangerouslySetInnerHTML={{ __html: t.featTitle }}
                />
              </div>
              <p className="lp-head__sub">{t.featSub}</p>
            </header>

            <div className="lp-features">
              {t.features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <article className="lp-feature" key={feature.title}>
                    <span className="lp-feature__index" aria-hidden="true">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="lp-feature__icon">
                      <Icon size={22} aria-hidden="true" />
                    </span>
                    <h3>{feature.title}</h3>
                    <p>{feature.text}</p>
                  </article>
                );
              })}
            </div>

            <p className="lp-feat__note">
              <Flame size={15} strokeWidth={2.2} aria-hidden="true" />
              {t.featNote}
            </p>
          </div>
        </section>

        {/* ================= LIVE STORES ================= */}
        <section className="lp-section lp-section--paper" id="demos">
          <div className="lp-inner">
            <header className="lp-head lp-head--split">
              <div className="lp-head__title">
                <span className="lp-kicker">
                  <span className="lp-kicker__bar" aria-hidden="true" />
                  <b className="lp-kicker__num" aria-hidden="true">04</b>
                  {t.demoKicker}
                </span>
                <h2 className="lp-title">{t.demoTitle}</h2>
              </div>
              <p className="lp-head__sub">{t.demoSub}</p>
            </header>

            <div className="lp-demos">
              {DEMOS.map((demo, index) => {
                const pick =
                  demo.slug === "sufra"
                    ? dishById("kibbeh")
                    : dishById("coffee");
                return (
                  <article className="lp-demo" key={demo.slug}>
                    <div className="lp-demo__media">
                      <img src={pick.image} alt={demoName(demo)} loading="lazy" />
                      <span className="lp-demo__badge">
                        <Star size={11} fill="currentColor" strokeWidth={0} aria-hidden="true" />
                        {t.demoBadge}
                      </span>
                      <span className="lp-demo__num" aria-hidden="true">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <div className="lp-demo__body">
                      <span className="lp-demo__kind">{demoKind(demo)}</span>
                      <h3>{demoName(demo)}</h3>
                      <p className="lp-demo__sub">
                        {language === "ar" ? demo.subAr : demo.subEn}
                      </p>
                      <p className="lp-demo__loc">
                        <MapPin size={14} aria-hidden="true" />
                        {demoLocation(demo)}
                      </p>
                      <div className="lp-demo__foot">
                        <button
                          type="button"
                          className="lp-btn lp-btn--red"
                          onClick={() => openDemo(demo.slug)}
                        >
                          {t.demoButton(demoName(demo))}
                          <ArrowRight size={17} className="lp-arrow" aria-hidden="true" />
                        </button>
                        <span className="lp-demo__chip">
                          <Utensils size={14} aria-hidden="true" />
                          {formatSyp(pick.price)}
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            <p className="lp-demo-note">{t.demoNote}</p>
          </div>
        </section>

        {/* ================= CTA ================= */}
        <section className="lp-section lp-offer-wrap">
          <div className="lp-inner">
            <div className="lp-offer">
              <span className="lp-offer__burst" aria-hidden="true" />
              <span className="lp-offer__disc" aria-hidden="true">
                <small>٪</small>
                <b>{language === "ar" ? "شهي" : "Tasty"}</b>
              </span>
              <div className="lp-offer__copy">
                <p className="lp-offer__script">{t.ctaScript}</p>
                <h2>{t.ctaTitle}</h2>
                <p className="lp-offer__sub">{t.ctaSub}</p>
                <div className="lp-offer__actions">
                  <button
                    type="button"
                    className="lp-btn lp-btn--yellow"
                    onClick={() => openDemo("sufra")}
                  >
                    {t.ctaBtn1}
                    <ArrowRight className="lp-arrow" size={18} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="lp-btn lp-btn--ghostlight"
                    onClick={() => openDemo("cozy")}
                  >
                    {t.ctaBtn2}
                    <ArrowRight className="lp-arrow" size={18} aria-hidden="true" />
                  </button>
                </div>
                <small className="lp-offer__print">
                  <Check size={14} strokeWidth={3} aria-hidden="true" />
                  {t.ctaPrint}
                </small>
              </div>
              <div className="lp-offer__plate" aria-hidden="true">
                <img src={dishById("burger").image} alt="" />
                <span className="lp-offer__plate-num">٪</span>
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
            {t.footerStatus}
          </div>
        </div>
        <div className="lp-footer__bottom">
          <div className="lp-inner">
            <span>
              © {new Date().getFullYear()} {PLATFORM_NAME}
            </span>
            <span className="lp-footer__made">
              <Flame size={14} aria-hidden="true" />
              {t.madeIn}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
