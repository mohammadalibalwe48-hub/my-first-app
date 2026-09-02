import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Globe2, ShieldCheck } from "lucide-react";
import { useAuth } from "../../context/Auth";
import { useUI } from "../../context/UI";
import { StaffAuthModal } from "../../features/AdminUI";

export default function AdminEntryPage() {
  const { authReady, staffEmail, memberships } = useAuth();
  const { language, toggleLanguage } = useUI();
  const navigate = useNavigate();
  const [authOpen, setAuthOpen] = useState(false);

  if (authReady && staffEmail && memberships.length > 0) {
    return <Navigate to={`/admin/${memberships[0].restaurantSlug}`} replace />;
  }

  return (
    <div className="app-root" dir={language === "ar" ? "rtl" : "ltr"}>
      <header className="navbar">
        <button
          className="navbar__brand"
          onClick={() => navigate("/")}
          aria-label="العودة إلى الموقع"
        >
          <span className="navbar__logo">S</span>
          <span>
            <strong className="navbar__brand-name">SYRIAN QR</strong>
            <small className="navbar__brand-sub">مساحة الموظفين</small>
          </span>
        </button>
        <div className="navbar__actions">
          <button
            className="navbar__btn"
            onClick={toggleLanguage}
            aria-label="تغيير اللغة"
          >
            <Globe2 />
            <span className="navbar__btn-text">
              {language === "ar" ? "EN" : "عربي"}
            </span>
          </button>
        </div>
      </header>

      <div className="section staff-gate">
        <div className="staff-gate__card">
          <span className="staff-gate__icon">
            <ShieldCheck />
          </span>
          <span
            className="section-kicker"
            style={{ justifyContent: "center" }}
          >
            دخول الموظفين
          </span>
          <h1>
            {authReady ? "لوحة المطعم للموظفين" : "جارٍ التحقق من الجلسة…"}
          </h1>
          <p>
            {authReady
              ? staffEmail
                ? "الحساب مسجل، لكنه لا يملك عضوية فعّالة في أي مطعم. اطلب من المالك إضافتك إلى فريق العمل."
                : "سجّل الدخول بحساب موظف مرتبط بالمطعم للوصول إلى الطلبات والإعدادات والتقارير."
              : ""}
          </p>
          {authReady && !staffEmail && (
            <button className="btn btn--gold" onClick={() => setAuthOpen(true)}>
              <ShieldCheck />
              تسجيل دخول الموظفين
            </button>
          )}
          <button
            className="btn btn--outline"
            onClick={() => navigate("/")}
            style={{ marginTop: 8 }}
          >
            العودة إلى الموقع
          </button>
        </div>
      </div>

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
