import { useEffect, useState, type JSX } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ClipboardList,
  Globe2,
  Languages,
  LayoutDashboard,
  Lock,
  LogOut,
  QrCode,
  ShieldCheck,
  UsersRound,
  Utensils,
} from "lucide-react";
import { useAuth } from "../../context/Auth";
import { useUI } from "../../context/UI";
import { StaffAuthModal } from "../../features/AdminUI";
import "./admin-entry.css";

const COPY = {
  ar: {
    brandSub: "إدارة مطعمك تبدأ من هنا",
    language: "تغيير اللغة",
    publicSite: "الموقع العام",
    signOut: "خروج",
    loading: "جارٍ التحقق من الجلسة…",
    kicker: "مساحة مخصصة لفريق المطعم",
    title: "أدِر مطعمك من مكان واحد.",
    lead: "تابع الطلبات، حدّث قائمتك، ونظّم فريقك من لوحة بسيطة تعمل على هاتفك أو حاسوبك.",
    points: ["الطلبات اليومية", "قائمتك الرقمية", "فريق المطعم"],
    cardEyebrow: "بوابة آمنة للمشغّلين",
    cardTitle: "مرحباً بعودتك",
    cardText: "سجّل الدخول للوصول إلى لوحة مطعمك وأدوات فريقك.",
    signIn: "تسجيل الدخول",
    security: "حسابك وصلاحياتك محمية",
    welcome: "أهلاً بعودتك",
    destinations: "اختر مساحة العمل التي تريد فتحها.",
    platform: "لوحة المنصة",
    platformDescription: "إدارة المطاعم ومتابعة أداء المنصة",
    restaurantDashboard: "لوحة المطعم",
    noMembership: "حسابك لا يملك عضوية فعّالة في أي مطعم. اطلب من مالك المطعم إضافتك إلى فريق العمل.",
    footer: "منصة سورية لإدارة المطاعم",
    roles: { owner: "مالك", manager: "مدير", cashier: "كاشير", kitchen: "المطبخ", viewer: "مشاهدة" },
  },
  en: {
    brandSub: "Restaurant management starts here",
    language: "Change language",
    publicSite: "Public site",
    signOut: "Sign out",
    loading: "Checking your session…",
    kicker: "A workspace built for restaurant teams",
    title: "Run your restaurant from one place.",
    lead: "Keep orders moving, update your menu, and organize your team from a simple dashboard on any device.",
    points: ["Daily orders", "Digital menu", "Restaurant team"],
    cardEyebrow: "Secure operator access",
    cardTitle: "Welcome back",
    cardText: "Sign in to open your restaurant dashboard and team tools.",
    signIn: "Sign in",
    security: "Your account and access stay protected",
    welcome: "Welcome back",
    destinations: "Choose the workspace you want to open.",
    platform: "Platform dashboard",
    platformDescription: "Manage restaurants and review platform activity",
    restaurantDashboard: "Restaurant dashboard",
    noMembership: "This account has no active restaurant membership. Ask a restaurant owner to add you to their team.",
    footer: "Syrian restaurant management platform",
    roles: { owner: "Owner", manager: "Manager", cashier: "Cashier", kitchen: "Kitchen", viewer: "Viewer" },
  },
} as const;

const ROLE_LABEL: Record<string, string> = {
  owner: "مالك",
  manager: "مدير",
  cashier: "كاشير",
  kitchen: "المطبخ",
  viewer: "مشاهدة",
};

const initials = (name: string): string => {
  const clean = name.trim().replace(/\s+/g, "");
  return clean.slice(0, 2).toUpperCase();
};

export default function AdminEntryPage(): JSX.Element {
  const { authReady, staffEmail, platformAdmin, memberships, signOut } = useAuth();
  const { language, toggleLanguage } = useUI();
  const t = COPY[language];
  const navigate = useNavigate();
  const [authOpen, setAuthOpen] = useState(false);

  const signedIn = Boolean(staffEmail);

  useEffect(() => {
    if (!authReady) return;
    if (!signedIn) return;
    // Single clear destination → go straight in.
    if (platformAdmin && memberships.length === 0) {
      navigate("/platform", { replace: true });
    } else if (!platformAdmin && memberships.length === 1) {
      navigate(`/admin/${memberships[0].restaurantSlug}`, { replace: true });
    }
  }, [authReady, signedIn, platformAdmin, memberships, navigate]);

  if (authReady && signedIn) {
    const onlyOne =
      (platformAdmin ? 1 : 0) + memberships.length === 1;
    if (onlyOne) {
      if (platformAdmin && memberships.length === 0)
        return <Navigate to="/platform" replace />;
      if (!platformAdmin && memberships.length === 1)
        return <Navigate to={`/admin/${memberships[0].restaurantSlug}`} replace />;
    }
  }

  return (
    <div
      className="entry"
      dir={language === "ar" ? "rtl" : "ltr"}
      lang={language}
    >
      <header className="entry-top">
        <button
          type="button"
          className="entry-top__brand"
          onClick={() => navigate("/")}
        >
          <span className="entry-top__mark">
            <QrCode />
          </span>
          <span className="entry-top__name">
            <b>SYRIAN QR</b>
            <small>{t.brandSub}</small>
          </span>
        </button>
        <div className="entry-top__actions">
          <button
            type="button"
            className="entry-pill"
            onClick={toggleLanguage}
            aria-label={t.language}
          >
            <Languages />
            {language === "ar" ? "EN" : "عربي"}
          </button>
          <button type="button" className="entry-pill" onClick={() => navigate("/")}>
            <Globe2 />
            {t.publicSite}
          </button>
          {signedIn && (
            <button
              type="button"
              className="entry-pill entry-pill--out"
              onClick={() => void signOut()}
            >
              <LogOut />
              {t.signOut}
            </button>
          )}
        </div>
      </header>

      <main className="entry-main">
        {!authReady ? (
          <div className="entry-loading" role="status">
            <span className="entry-spinner" />
            <span className="entry-loading__text">{t.loading}</span>
          </div>
        ) : !signedIn ? (
          <section className="entry-portal entry-portal--signin">
            <div className="entry-portal__intro">
            <span className="entry-kicker">
              <span className="entry-kicker__dot" />
              {t.kicker}
            </span>
            <h1 className="entry-hero__title">
              {t.title}
            </h1>
            <p className="entry-hero__lead">
              {t.lead}
            </p>
            <div className="entry-points">
              <span><ClipboardList aria-hidden="true" />{t.points[0]}</span>
              <span><Utensils aria-hidden="true" />{t.points[1]}</span>
              <span><UsersRound aria-hidden="true" />{t.points[2]}</span>
            </div>
            </div>
            <aside className="entry-login-card">
              <span className="entry-login-card__mark"><QrCode aria-hidden="true" /></span>
              <span className="entry-login-card__eyebrow">{t.cardEyebrow}</span>
              <h2>{t.cardTitle}</h2>
              <p>{t.cardText}</p>
            <button
              type="button"
              className="entry-cta"
              onClick={() => setAuthOpen(true)}
            >
              <Lock />
              {t.signIn}
              <ArrowRight className="entry-arrow" />
            </button>
            <p className="entry-sec">
              <ShieldCheck />
              {t.security}
            </p>
            </aside>
          </section>
        ) : (
          <section className="entry-hub">
            <span className="entry-kicker">
              <span className="entry-kicker__dot" />
              {t.welcome}
            </span>
            <h1 className="entry-hero__title entry-hero__title--hub">
              {t.destinations}
            </h1>
            <p className="entry-email">{staffEmail}</p>

            <div className="entry-options">
              {platformAdmin && (
                <button
                  type="button"
                  className="entry-option entry-option--platform"
                  onClick={() => navigate("/platform")}
                >
                  <span className="entry-option__mono">
                    <LayoutDashboard />
                  </span>
                  <span className="entry-option__body">
                    <b>{t.platform}</b>
                    <small>{t.platformDescription}</small>
                  </span>
                  <span className="entry-option__tag">منصة</span>
                  <ArrowRight className="entry-arrow" />
                </button>
              )}

              {memberships.map((m) => (
                <button
                  type="button"
                  className="entry-option"
                  key={m.restaurantId}
                  onClick={() => navigate(`/admin/${m.restaurantSlug}`)}
                >
                  <span className="entry-option__mono">
                    {initials(m.restaurantName)}
                  </span>
                  <span className="entry-option__body">
                    <b>{m.restaurantName}</b>
                    <small>{t.restaurantDashboard}</small>
                  </span>
                  <span className="entry-option__tag">
                    {t.roles[m.role as keyof typeof t.roles] ?? ROLE_LABEL[m.role] ?? m.role}
                  </span>
                  <ArrowRight className="entry-arrow" />
                </button>
              ))}

              {memberships.length === 0 && !platformAdmin && (
                <div className="entry-note">
                  <ShieldCheck />
                  <p>
                    {t.noMembership}
                  </p>
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      <footer className="entry-foot">
        <span>© {new Date().getFullYear()} SYRIAN QR — {t.footer}</span>
      </footer>

      {authOpen && (
        <StaffAuthModal
          language={language}
          onClose={() => setAuthOpen(false)}
          onSuccess={() => {
            setAuthOpen(false);
            navigate("/admin");
          }}
        />
      )}
    </div>
  );
}
