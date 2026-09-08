import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { UIProvider } from "./context/UI";
import { AuthProvider } from "./context/Auth";
import HomePage from "./pages/HomePage";
import CafeLayout from "./pages/CafeLayout";
import StorefrontPage from "./pages/StorefrontPage";
import OrdersPage from "./pages/OrdersPage";
import AdminEntryPage from "./pages/admin/AdminEntryPage";
import AdminWorkspacePage from "./pages/admin/AdminWorkspacePage";
import PlatformPage from "./pages/platform/PlatformPage";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <UIProvider>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/c/:slug" element={<CafeLayout />}>
              <Route index element={<StorefrontPage />} />
              <Route path="orders" element={<OrdersPage />} />
            </Route>
            <Route path="/admin" element={<AdminEntryPage />} />
            <Route path="/admin/:slug/*" element={<AdminWorkspacePage />} />
            <Route path="/platform" element={<PlatformPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </UIProvider>
    </BrowserRouter>
  );
}
