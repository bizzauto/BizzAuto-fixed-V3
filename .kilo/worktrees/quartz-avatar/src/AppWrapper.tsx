import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './lib/authStore';
import PageSkeleton from './components/PageSkeleton';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast';

// Public pages
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import PricingPage from './components/PricingPage';
import TermsPage from './components/TermsPage';
import PrivacyPage from './components/PrivacyPage';
import AboutPage from './components/AboutPage';
import ContactPage from './components/ContactPage';
import ForgotPasswordPage from './components/ForgotPasswordPage';
import NotFoundPage from './components/NotFoundPage';

// Authenticated layout
import AuthLayout from './layouts/AuthLayout';

// Authenticated pages
import Dashboard from './components/DashboardPage';
import WhatsAppModule from './components/WhatsAppModule';
import CRMPage from './components/CRMPage';
import LeadGenerationPage from './components/LeadGenerationPage';
import AppointmentsPage from './components/AppointmentsPage';
import ECommercePage from './components/ECommercePage';
import DocumentsPage from './components/DocumentsPage';
import SocialMediaPage from './components/SocialMediaPage';
import GoogleBusinessPage from './components/GoogleBusinessPage';
import AIChatbotPage from './components/AIChatbotPage';
import VoiceCallPage from './components/VoiceCallPage';
import CreativeGeneratorPage from './components/CreativeGeneratorPage';
import AutomationPage from './components/AutomationPage';
import ReportsPage from './components/ReportsPage';
import ReviewsPage from './components/ReviewsPage';
import BillingPage from './components/BillingPage';
import ApiKeysPage from './components/ApiKeysPage';
import AuditLogPage from './components/AuditLogPage';
import TeamManagement from './components/TeamManagement';
import UserProfile from './components/UserProfile';
import SettingsPage from './components/SettingsPage';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import OnboardingWizard from './components/OnboardingWizard';
import BulkImportPage from './components/BulkImportPage';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isInitialized, onboardingCompleted } = useAuthStore();

  if (!isInitialized) {
    return <PageSkeleton />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check if onboarding is required (only redirect if not already on /onboarding)
  if (!onboardingCompleted && !window.location.pathname.startsWith('/onboarding')) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};

// Super Admin Route
const SuperAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isInitialized, user } = useAuthStore();

  if (!isInitialized) {
    return <PageSkeleton />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'SUPER_ADMIN') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

function AppRoutes() {
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <ToastProvider>
      <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/about" element={<AboutPage />} />
      <Route path="/contact" element={<ContactPage />} />

      {/* Onboarding */}
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <OnboardingWizard />
          </ProtectedRoute>
        }
      />

      {/* Super Admin */}
      <Route
        path="/admin"
        element={
          <SuperAdminRoute>
            <SuperAdminDashboard />
          </SuperAdminRoute>
        }
      />

      {/* Authenticated Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AuthLayout>
              <Dashboard />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/whatsapp"
        element={
          <ProtectedRoute>
            <AuthLayout>
              <WhatsAppModule />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/crm"
        element={
          <ProtectedRoute>
            <AuthLayout>
              <CRMPage />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/leads"
        element={
          <ProtectedRoute>
            <AuthLayout>
              <LeadGenerationPage />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/appointments"
        element={
          <ProtectedRoute>
            <AuthLayout>
              <AppointmentsPage />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/ecommerce"
        element={
          <ProtectedRoute>
            <AuthLayout>
              <ECommercePage />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/documents"
        element={
          <ProtectedRoute>
            <AuthLayout>
              <DocumentsPage />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/social"
        element={
          <ProtectedRoute>
            <AuthLayout>
              <SocialMediaPage />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/google-business"
        element={
          <ProtectedRoute>
            <AuthLayout>
              <GoogleBusinessPage />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/ai-chatbot"
        element={
          <ProtectedRoute>
            <AuthLayout>
              <AIChatbotPage />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/voice-call"
        element={
          <ProtectedRoute>
            <AuthLayout>
              <VoiceCallPage />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/creative"
        element={
          <ProtectedRoute>
            <AuthLayout>
              <CreativeGeneratorPage />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/automation"
        element={
          <ProtectedRoute>
            <AuthLayout>
              <AutomationPage />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <AuthLayout>
              <ReportsPage />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <AuthLayout>
              <ReportsPage />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/bulk-import"
        element={
          <ProtectedRoute>
            <AuthLayout>
              <BulkImportPage />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reviews"
        element={
          <ProtectedRoute>
            <AuthLayout>
              <ReviewsPage />
            </AuthLayout>
          </ProtectedRoute>
        }
      />

      {/* Settings & Profile */}
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <AuthLayout>
              <UserProfile />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <AuthLayout>
              <SettingsPage />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/billing"
        element={
          <ProtectedRoute>
            <AuthLayout>
              <BillingPage />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/team"
        element={
          <ProtectedRoute>
            <AuthLayout>
              <TeamManagement />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/api-keys"
        element={
          <ProtectedRoute>
            <AuthLayout>
              <ApiKeysPage />
            </AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/audit-log"
        element={
          <ProtectedRoute>
            <AuthLayout>
              <AuditLogPage />
            </AuthLayout>
          </ProtectedRoute>
        }
      />

      {/* Redirects */}
      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    </ToastProvider>
  );
}

export default function AppWrapper() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ErrorBoundary>
  );
}
