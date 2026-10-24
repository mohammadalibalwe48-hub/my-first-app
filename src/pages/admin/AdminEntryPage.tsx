import { Navigate, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  ChefHat,
  Globe2,
  LayoutDashboard,
  ReceiptText,
  Store,
  Utensils,
  Wallet,
} from "lucide-react";
import { useAuth } from "../../context/Auth";
import { useUI } from "../../context/UI";
import StaffAuthModal from "../../features/StaffAuthModal";
import "../../features/workspace-app.css";
export default function AdminEntryPage() {
  const { authReady, staffEmail, platformAdmin, memberships, signOut } =
    useAuth();
  const { language, dir, toggleLanguage } = useUI();
  const en = language === "en";
  const t = (a: string, b: string) => (en ? b : a);
  const navigate = useNavigate();
  if (authReady && staffEmail) {
    if (platformAdmin && !memberships.length)
      return <Navigate to="/platform" replace />;
    if (!platformAdmin && memberships.length === 1)
      return (
        <Navigate to={`/admin/${memberships[0].restaurantSlug}`} replace />
      );
  }
  return (
    <div className="staff-entry" dir={dir}>
      <aside className="staff-entry__story">
        <a href="/" className="staff-entry__brand">
          <span>
            <Utensils size={21} />
          </span>
          SYRIAN QR
        </a>
        <div>
          <span>
            {t("خلف كل طلب حلو، فريق مرتب", "BEHIND EVERY GOOD ORDER")}
          </span>
          <h1>
            {t(
              "كل الخدمة.\nبمكان واحد.",
              "A busy restaurant.\nA calmer workspace.",
            )}
          </h1>
          <p>
            {t(
              "خلّي فريقك مركز على الأكل والخدمة. الطلبات، المطبخ، والمدفوعات، كلّها قدامك.",
              "Keep your team focused on the food and the people. Orders, kitchen, and payments, brought together.",
            )}
          </p>
          <ul>
            {[
              {
                Icon: ReceiptText,
                a: "طلبات واضحة، من أول لحظة",
                b: "Every order, clearly organised",
              },
              {
                Icon: ChefHat,
                a: "مطبخ وكاشير على نفس الصفحة",
                b: "Kitchen and cashier, in sync",
              },
              {
                Icon: Wallet,
                a: "مدفوعات وفريق تحت السيطرة",
                b: "Payments and people, in one place",
              },
            ].map(({ Icon, a, b }) => (
              <li key={b}>
                <Icon size={19} />
                {t(a, b)}
              </li>
            ))}
          </ul>
        </div>
        <small>
          {t("مصمّم لفريق المطعم.", "Built for the people behind the service.")}
        </small>
      </aside>
      <main className="staff-entry__main">
        <header>
          <button onClick={() => navigate("/")}>
            <ArrowLeft size={16} />
            {t("رجوع للموقع", "Back to the website")}
          </button>
          <button onClick={toggleLanguage}>
            <Globe2 size={16} />
            {en ? "عربي" : "EN"}
          </button>
        </header>
        <div className="staff-entry__content">
          {!authReady ? (
            <p role="status">
              {t("جارٍ فتح مساحة العمل…", "Opening your workspace…")}
            </p>
          ) : staffEmail ? (
            <section className="staff-destinations">
              <span className="staff-welcome-icon">
                <LayoutDashboard size={28} />
              </span>
              <h1>{t("أهلاً بعودتك.", "Welcome back.")}</h1>
              <p>
                {t(
                  "اختار مساحة العمل اللي بدك تفتحها.",
                  "Choose the workspace you want to open.",
                )}
              </p>
              {platformAdmin && (
                <button onClick={() => navigate("/platform")}>
                  <LayoutDashboard size={22} />
                  <span>{t("لوحة المنصة", "Platform dashboard")}</span>
                  <ArrowRight size={18} />
                </button>
              )}
              {memberships.map((m) => (
                <button
                  key={m.restaurantId}
                  onClick={() => navigate(`/admin/${m.restaurantSlug}`)}
                >
                  <Store size={22} />
                  <span>
                    <b>{m.restaurantName}</b>
                    <small>{m.role}</small>
                  </span>
                  <ArrowRight size={18} />
                </button>
              ))}
              {!memberships.length && !platformAdmin && (
                <p>
                  {t(
                    "اطلب من مالك المطعم إضافتك إلى فريق العمل.",
                    "Ask your restaurant owner to add you to the team.",
                  )}
                </p>
              )}
              <button className="staff-signout" onClick={() => void signOut()}>
                {t("تسجيل الخروج", "Sign out")}
              </button>
            </section>
          ) : (
            <StaffAuthModal
              inline
              language={language}
              onClose={() => {}}
              onSuccess={() => navigate("/admin")}
            />
          )}
        </div>
        <footer>
          {t(
            "حسابات الفريق فقط. لا يحتاج الزبائن إلى تسجيل الدخول.",
            "For restaurant teams. Guests don’t need an account.",
          )}
        </footer>
      </main>
    </div>
  );
}
