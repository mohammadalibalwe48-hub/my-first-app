import { useEffect, useState, type JSX } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Globe2,
  LayoutDashboard,
  ShieldCheck,
  Store,
  Utensils,
  X,
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
      <header className="entry-top">
        <button
          type="button"
          className="entry-top__brand"
          onClick={() => navigate("/")}
        >
          <span className="entry-top__mark">
            <Utensils />
          </span>
          <span>
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
            <Globe2 />
            {language === "ar" ? "EN" : "عربي"}
          </button>
          <button type="button" className="entry-pill" onClick={() => navigate("/")}>
            الموقع العام
          </button>
          {signedIn && (
            <button
              type="button"
              className="entry-pill entry-pill--danger"
              onClick={() => void signOut()}
            >
              خروج
            </button>
          )}
        </div>
      </header>

      <main className="entry-main">
        {!authReady ? (
          <div className="entry-card">
            <span className="entry-spinner" />
            <h1>جارٍ التحقق من الجلسة…</h1>
          </div>
        ) : !signedIn ? (
          <div className="entry-hero">
            <span className="entry-hero__icon">
              <ShieldCheck />
            </span>
            <span className="entry-kicker">بوابة آمنة</span>
            <h1>أهلاً بك في مركز تحكم سيريان كيو آر</h1>
            <p>
              سجّل الدخول للوصول إلى لوحات مطاعمك، أو إلى لوحة المنصة الشاملة
              إذا كنت مديراً عاماً.
            </p>
            <button
              type="button"
              className="entry-cta"
              onClick={() => setAuthOpen(true)}
            >
              <ShieldCheck />
              تسجيل الدخول
              <ArrowRight className="entry-arrow" />
            </button>
            <button
              type="button"
              className="entry-ghost"
              onClick={() => navigate("/")}
            >
              العودة إلى الموقع
            </button>
          </div>
        ) : (
          <div className="entry-hero">
            <span className="entry-kicker">أهلاً بعودتك</span>
            <h1>إلى أين تريد الذهاب؟</h1>
            <p className="entry-email">{staffEmail}</p>

            <div className="entry-options">
              {platformAdmin && (
                <button
                  type="button"
                  className="entry-option entry-option--dark"
                  onClick={() => navigate("/platform")}
                >
                  <span className="entry-option__icon">
                    <LayoutDashboard />
                  </span>
                  <span className="entry-option__body">
                    <b>لوحة المنصة</b>
                    <small>تحليلات وإدارة كل المطاعم على المنصة</small>
                  </span>
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
                  <span className="entry-option__icon">
                    <Store />
                  </span>
                  <span className="entry-option__body">
                    <b>{m.restaurantName}</b>
                    <small>
                      لوحة المطعم · {ROLE_LABEL[m.role] ?? m.role}
                    </small>
                  </span>
                  <ArrowRight className="entry-arrow" />
                </button>
              ))}

              {memberships.length === 0 && !platformAdmin && (
                <div className="entry-note">
                  الحساب مسجّل لكنه لا يملك عضوية فعّالة في أي مطعم.
                  <br />
                  اطلب من مالك المطعم إضافتك إلى فريق العمل.
                </div>
              )}
            </div>
          </div>
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
