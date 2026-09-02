import { useState, type JSX } from "react";
import type * as React from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Check,
  ChefHat,
  Globe2,
  LayoutDashboard,
  MapPin,
  Menu,
  QrCode,
  ScanLine,
  ShoppingBasket,
  Smartphone,
  Store,
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
  accent: string;
  accent2: string;
};

const DEMOS: Demo[] = [
  {
    slug: "sufra",
    letter: "س",
    nameAr: "سُفرة الشام",
    nameEn: "Sufra Sham",
    kindAr: "مطعم",
    kindEn: "Restaurant",
    subAr: "مذاق البيت الشامي الأصيل",
    subEn: "Authentic Damascene taste",
    cityAr: "دمشق",
    cityEn: "Damascus",
    hoodAr: "المزة",
    hoodEn: "Al-Mazzeh",
    accent: "#a3451f",
    accent2: "#d06a3a",
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
    accent: "#3d6883",
    accent2: "#5b8ca6",
  },
];

type Step = { icon: LucideIcon; title: string; text: string };
type Feature = { icon: LucideIcon; title: string; text: string };
type Stat = { value: string; unit: string; desc: string };
type DemoLink = { slug: string; label: string };

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
  badgeText: string;
  scanChip: string;
  phoneTitle: string;
  phoneSub: string;
  phoneCaption: string;
  stats: Stat[];
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
    { href: "#features", label: "المميزات" },
    { href: "#how", label: "كيف تعمل" },
    { href: "#demos", label: "تجارب حية" },
  ],
  tryCta: "جرّب المتجر التجريبي",
  heroEyebrow: "منصّة سورية للقوائم الرقمية والطلب من الطاولة",
  heroScript: "اطلب وأنت جالس على طاولتك",
  heroTitleA: "لكل مطعم ومقهى",
  heroTitleB: "متجر رقمي باسمه وألوانه",
  heroSub: PLATFORM_DESCRIPTION_AR,
  heroCtaDemo: "جرّب المتجر التجريبي",
  heroCtaHow: "كيف تعمل؟",
  badgeText: "الطلب وصل إلى المطبخ",
  scanChip: "امسح واطلب مباشرة",
  phoneTitle: "قائمة المطعم",
  phoneSub: "من الطاولة إلى المطبخ",
  phoneCaption: "امسح الرمز واطلب",
  stats: [
    { value: "٣", unit: "خطوات", desc: "لطلبك: من المسح حتى المطبخ" },
    { value: "١", unit: "رمز QR", desc: "لكل طاولة في مطعمك" },
    { value: "٠", unit: "تطبيق", desc: "على الهاتف — كل شيء من المتصفح" },
  ],
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
  ctaPrint:
    "منصة سورية، بيانات على خوادم سحابية، وتجربة عربية كاملة.",
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
    { href: "#features", label: "Features" },
    { href: "#how", label: "How it works" },
    { href: "#demos", label: "Live demos" },
  ],
  tryCta: "Try a live demo",
  heroEyebrow: "A Syrian platform for digital menus and table ordering",
  heroScript: "Order from your seat",
  heroTitleA: "Every restaurant & café gets its own",
  heroTitleB: "digital storefront",
  heroSub: PLATFORM_DESCRIPTION_EN,
  heroCtaDemo: "Try a live demo",
  heroCtaHow: "How it works?",
  badgeText: "Order sent to the kitchen",
  scanChip: "Scan & order instantly",
  phoneTitle: "Restaurant menu",
  phoneSub: "From table to kitchen",
  phoneCaption: "Scan & order",
  stats: [
    { value: "3", unit: "steps", desc: "to order — from scan to kitchen" },
    { value: "1", unit: "QR code", desc: "per table in your venue" },
    { value: "0", unit: "apps", desc: "to install — everything runs in the browser" },
  ],
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
  const ForwardArrow = isRtl(language) ? ArrowLeft : ArrowRight;
  const demoName = (d: Demo) => (language === "ar" ? d.nameAr : d.nameEn);
  const demoKind = (d: Demo) => (language === "ar" ? d.kindAr : d.kindEn);
  const demoLocation = (d: Demo) =>
    language === "ar"
      ? `${d.hoodAr}، ${d.cityAr}`
      : `${d.hoodEn}, ${d.cityEn}`;

  const openDemo = (slug: string) => {
    setMenuOpen(false);
    onOpenCafe(slug);
  };

  return (
    <div
      className="lp"
      dir={isRtl(language) ? "rtl" : "ltr"}
      lang={language}
    >
      <header className="lp-nav">
        <div className="lp-nav__inner">
          <div className="lp-nav__start">
            <span className="lp-brand__mark" aria-hidden="true">
              <QrCode size={20} strokeWidth={2.4} />
            </span>
            <span className="lp-brand__text">
              <strong className="lp-brand__name">{PLATFORM_NAME}</strong>
              <small className="lp-brand__sub">{t.navSub}</small>
            </span>
          </div>

          <nav className="lp-nav__links" aria-label={language === "ar" ? "روابط التنقل" : "Navigation links"}>
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
              aria-label={language === "ar" ? "Switch to English" : "التبديل إلى العربية"}
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
              aria-label={menuOpen ? t.closeAria : t.openAria}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav
            className="lp-nav-menu"
            aria-label={language === "ar" ? "قائمة الجوال" : "Mobile menu"}
          >
            {t.navLinks.map((link) => (
              <a key={link.href} href={link.href} onClick={() => setMenuOpen(false)}>
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
            </div>
          </nav>
        )}
      </header>

      <main>
        <section className="lp-hero" id="top">
          <div className="lp-blob lp-blob--one" aria-hidden="true" />
          <div className="lp-blob lp-blob--two" aria-hidden="true" />
          <div className="lp-blob lp-blob--three" aria-hidden="true" />

          <div className="lp-inner lp-hero__grid">
            <div className="lp-hero__copy">
              <span className="lp-eyebrow">
                <QrCode size={15} />
                {t.heroEyebrow}
              </span>
              <p className="lp-hero__script">{t.heroScript}</p>
              <h1 className="lp-hero__title">
                <span>{t.heroTitleA}</span>
                <span className="lp-hero__title-gold">{t.heroTitleB}</span>
              </h1>
              <p className="lp-hero__sub">{t.heroSub}</p>
              <div className="lp-hero__cta">
                <button
                  type="button"
                  className="btn btn--gold lp-btn-lg"
                  onClick={() => openDemo("sufra")}
                >
                  {t.heroCtaDemo}
                  <ArrowRight />
                </button>
                <a href="#how" className="btn lp-btn-light">
                  {t.heroCtaHow}
                </a>
              </div>
            </div>

            <div className="lp-hero__visual" aria-hidden="true">
              <div className="lp-phone">
                <div className="lp-phone__top">
                  <span className="lp-phone__avatar">
                    {language === "ar" ? "س" : "S"}
                  </span>
                  <span className="lp-phone__meta">
                    <b>{t.phoneTitle}</b>
                    <small>{t.phoneSub}</small>
                  </span>
                  <span className="lp-phone__live" />
                </div>
                <div className="lp-phone__qr">
                  <QrCode size={104} strokeWidth={1.2} />
                </div>
                <div className="lp-phone__caption">{t.phoneCaption}</div>
                <div className="lp-phone__menu">
                  <div className="lp-menu-line">
                    <i className="lp-menu-line__dot" />
                    <b className="lp-menu-line__dish" />
                    <em className="lp-menu-line__price" />
                  </div>
                  <div className="lp-menu-line">
                    <i className="lp-menu-line__dot" />
                    <b className="lp-menu-line__dish lp-menu-line__dish--w" />
                    <em className="lp-menu-line__price" />
                  </div>
                  <div className="lp-menu-line">
                    <i className="lp-menu-line__dot" />
                    <b className="lp-menu-line__dish" />
                    <em className="lp-menu-line__price" />
                  </div>
                </div>
              </div>

              <div className="lp-chip lp-chip--scan">
                <ScanLine size={14} />
                {t.scanChip}
              </div>

              <div className="lp-chip lp-badge">
                <span className="lp-badge__icon">
                  <Check size={14} strokeWidth={3} />
                </span>
                {t.badgeText}
              </div>
            </div>
          </div>

          <div className="lp-inner">
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

        <section className="lp-section lp-section--alt" id="features">
          <div className="lp-inner">
            <div className="lp-head">
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

        <section className="lp-section" id="demos">
          <div className="lp-inner">
            <div className="lp-head">
              <span className="section-kicker">{t.demoKicker}</span>
              <h2 className="section-title">{t.demoTitle}</h2>
              <p className="section-sub lp-head__sub">{t.demoSub}</p>
            </div>

            <div className="lp-demos">
              {DEMOS.map((demo) => (
                <article
                  className="lp-demo"
                  key={demo.slug}
                  style={
                    { "--demo": demo.accent, "--demo-2": demo.accent2 } as React.CSSProperties
                  }
                >
                  <span className="lp-demo__badge">{t.demoBadge}</span>
                  <div className="lp-demo__top">
                    <span className="lp-demo__avatar">{demo.letter}</span>
                    <span className="lp-demo__kind">
                      {demoKind(demo)}
                    </span>
                  </div>
                  <div className="lp-demo__body">
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
                      <ForwardArrow size={17} />
                    </button>
                  </div>
                </article>
              ))}
            </div>

            <p className="lp-demo-note">{t.demoNote}</p>
          </div>
        </section>

        <section className="lp-section lp-cta-wrap">
          <div className="lp-inner">
            <div className="lp-cta">
              <div className="lp-blob lp-blob--two" aria-hidden="true" />
              <span className="lp-cta__script">
                {language === "ar" ? "ألف هنا وصحة" : "Bon appétit"}
              </span>
              <h2>{t.ctaTitle}</h2>
              <p>{t.ctaSub}</p>
              <div className="lp-cta__actions">
                <button
                  type="button"
                  className="btn btn--gold lp-btn-lg"
                  onClick={() => openDemo("sufra")}
                >
                  {t.ctaBtn1}
                  <ArrowRight />
                </button>
                <button
                  type="button"
                  className="btn lp-btn-light"
                  onClick={() => openDemo("cozy")}
                >
                  {t.ctaBtn2}
                  <ArrowRight />
                </button>
              </div>
              <small className="lp-cta__print">{t.ctaPrint}</small>
            </div>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-inner lp-footer__grid">
          <div className="lp-footer__brand">
            <span className="lp-brand__mark" aria-hidden="true">
              <QrCode size={18} strokeWidth={2.4} />
            </span>
            <div>
              <strong>{PLATFORM_NAME}</strong>
              <p>{t.footerTag}</p>
            </div>
          </div>

          <div className="lp-footer__col">
            <h4>{t.footerDemosTitle}</h4>
            {t.footerDemos.map((demo) => (
              <button type="button" key={demo.slug} onClick={() => openDemo(demo.slug)}>
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
