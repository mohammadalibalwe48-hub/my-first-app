import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useUI } from "../context/UI";
import LandingPage from "../landing/LandingPage";

export default function HomePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { language, toggleLanguage } = useUI();

  const params = new URLSearchParams(location.search);
  const legacySlug = params.get("restaurant");
  if (legacySlug) {
    const next = new URLSearchParams(params);
    next.delete("restaurant");
    const qs = next.toString();
    return (
      <Navigate
        to={`/c/${encodeURIComponent(legacySlug)}${qs ? `?${qs}` : ""}`}
        replace
      />
    );
  }

  return (
    <LandingPage
      language={language}
      onToggleLanguage={toggleLanguage}
      onOpenCafe={(slug) => navigate(`/c/${slug}`)}
      onOpenAdmin={() => navigate("/admin")}
    />
  );
}
