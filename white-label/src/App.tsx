import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ResellerDashboard from "./pages/ResellerDashboard";
import ProductPage from "./pages/ProductPage";
import GoogleReviewsProduct from "./pages/GoogleReviewsProduct";
import VCardProduct from "./pages/VCardProduct";
import WebsiteBuilderProduct from "./pages/WebsiteBuilderProduct";
import { useWhiteLabelStore } from "./lib/store";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useWhiteLabelStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/products" element={<ProductPage />} />
        <Route path="/products/google-reviews" element={<GoogleReviewsProduct />} />
        <Route path="/products/digital-vcard" element={<VCardProduct />} />
        <Route path="/products/website-builder" element={<WebsiteBuilderProduct />} />
        <Route
          path="/dashboard/*"
          element={
            <ProtectedRoute>
              <ResellerDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
