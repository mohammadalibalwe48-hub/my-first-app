import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { UIProvider, useUI } from "./context/UI";
import { AuthProvider } from "./context/Auth";

const HomePage = lazy(() => import("./pages/HomePage"));
const CafeLayout = lazy(() => import("./pages/CafeLayout"));
const StorefrontPage = lazy(() => import("./pages/StorefrontPage"));
const OrdersPage = lazy(() => import("./pages/OrdersPage"));
const AdminEntryPage = lazy(() => import("./pages/admin/AdminEntryPage"));
const AdminWorkspacePage = lazy(
  () => import("./pages/admin/AdminWorkspacePage"),
);
const PlatformPage = lazy(() => import("./pages/platform/PlatformPage"));
const AssetLibraryPage = lazy(
  () => import("./pages/platform/AssetLibraryPage"),
);

function RouteLoading() {
  const { language } = useUI();
  return (
    <div className="app-loading" role="status" aria-live="polite">
      <span className="app-loading__spinner" aria-hidden="true" />
      <p>{language === "en" ? "Loading…" : "جارٍ التحميل…"}</p>
    </div>
  );
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <UIProvider>
        <AuthProvider>
          <Suspense fallback={<RouteLoading />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/c/:slug" element={<CafeLayout />}>
                <Route index element={<StorefrontPage />} />
                <Route path="orders" element={<OrdersPage />} />
              </Route>
              <Route path="/admin" element={<AdminEntryPage />} />
              <Route path="/admin/:slug/*" element={<AdminWorkspacePage />} />
              <Route path="/platform" element={<PlatformPage />} />
              <Route path="/platform/assets" element={<AssetLibraryPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </UIProvider>
    </BrowserRouter>
  );
}
