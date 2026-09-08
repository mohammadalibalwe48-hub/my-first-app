import { useEffect, useState, type JSX } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Globe2,
  Languages,
  LayoutDashboard,
  Lock,
  LogOut,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../../context/Auth";
import { useUI } from "../../context/UI";
import { StaffAuthModal } from "../../features/AdminUI";
import "./admin-entry.css";

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
    >
      <div className="entry-stage" aria-hidden="true">
        <span className="entry-glyph entry-glyph--one">QR</span>
        <span className="entry-glyph entry-glyph--two" />
        <span className="entry-orbit entry-orbit--a" />
        <span className="entry-orbit entry-orbit--b" />
      </div>

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
            <small>مركز الإدارة والدخول</small>
          </span>
        </button>
        <div className="entry-top__actions">
          <button
            type="button"
            className="entry-pill"
            onClick={toggleLanguage}
            aria-label="تغيير اللغة"
          >
            <Languages />
            {language === "ar" ? "EN" : "عربي"}
          </button>
          <button type="button" className="entry-pill" onClick={() => navigate("/")}>
            <Globe2 />
            الموقع العام
          </button>
          {signedIn && (
            <button
              type="button"
              className="entry-pill entry-pill--out"
              onClick={() => void signOut()}
            >
              <LogOut />
              خروج
            </button>
          )}
        </div>
      </header>

      <main className="entry-main">
        {!authReady ? (
          <div className="entry-loading" role="status">
            <span className="entry-spinner" />
            <span className="entry-loading__text">جارٍ التحقق من الجلسة…</span>
          </div>
        ) : !signedIn ? (
          <section className="entry-hero entry-hero--signin">
            <span className="entry-kicker">
              <span className="entry-kicker__dot" />
              بوابة المشغّلين · دخول آمن
            </span>
            <h1 className="entry-hero__title">
              سجّل الدخول إلى
              <br />
              مكتب التحكّم
            </h1>
            <p className="entry-hero__lead">
              بوابة موحّدة لإدارة مطاعمك على منصة سيريان كيو آر — الطلبات،
              القوائم، الفريق، والتقارير في مكان واحد.
            </p>
            <button
              type="button"
              className="entry-cta"
              onClick={() => setAuthOpen(true)}
            >
              <Lock />
              تسجيل الدخول
              <ArrowRight className="entry-arrow" />
            </button>
            <p className="entry-sec">
              <ShieldCheck />
              اتصال مشفّر، وصلاحيات تُطبَّق على مستوى قاعدة البيانات.
            </p>
          </section>
        ) : (
          <section className="entry-hero entry-hero--hub">
            <span className="entry-kicker">
              <span className="entry-kicker__dot" />
              أهلاً بعودتك
            </span>
            <h1 className="entry-hero__title entry-hero__title--hub">
              إلى أين تذهب اليوم؟
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
                    <b>لوحة المنصة</b>
                    <small>تحليلات وإدارة كل المطاعم على المنصة</small>
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
                    <small>لوحة المطعم</small>
                  </span>
                  <span className="entry-option__tag">
                    {ROLE_LABEL[m.role] ?? m.role}
                  </span>
                  <ArrowRight className="entry-arrow" />
                </button>
              ))}

              {memberships.length === 0 && !platformAdmin && (
                <div className="entry-note">
                  <ShieldCheck />
                  <p>
                    الحساب مسجّل لكنه لا يملك عضوية فعّالة في أي مطعم.
                    <br />
                    اطلب من مالك المطعم إضافتك إلى فريق العمل.
                  </p>
                </div>
              )}
            </div>
          </section>
        )}
      </main>

      <footer className="entry-foot">
        <span>© {new Date().getFullYear()} SYRIAN QR — منصة سورية</span>
      </footer>

      {authOpen && (
        <StaffAuthModal
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
