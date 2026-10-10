import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from './store/useAuthStore';
import { AuthPage } from './pages/AuthPage';
import { AppLayout } from './components/layout/AppLayout';

import { LandingPage } from './pages/LandingPage';
import { TermsPage } from './pages/TermsPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { RefundPage } from './pages/RefundPage';
import { ContactPage } from './pages/ContactPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { PublicProposalPage } from './pages/PublicProposalPage';
import { PublicInvoicePage } from './pages/PublicInvoicePage';

import { DashboardPage } from './pages/DashboardPage';
import { AnalyzerPage } from './pages/AnalyzerPage';
import { ProposalsPage } from './pages/ProposalsPage';
import { ProposalBuilderPage } from './pages/ProposalBuilderPage';
import { ClientsPage } from './pages/ClientsPage';
import { ClientDetailPage } from './pages/ClientDetailPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { TemplatesPage } from './pages/TemplatesPage';
import { PricingRulesPage } from './pages/PricingRulesPage';
import { AgentsDocPage } from './pages/AgentsDocPage';
import { SettingsPage } from './pages/SettingsPage';
import { ProposalPrintPage } from './pages/ProposalPrintPage';
import { InvoicePrintPage } from './pages/InvoicePrintPage';
import { PaymentReceiptPrintPage } from './pages/PaymentReceiptPrintPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-background text-charcoal-600 gap-3 font-sans">
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
        <span className="text-xs font-medium tracking-wide">Loading Floorly Workspace...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AppContent() {
  const { isAuthenticated, isLoading, fetchUser } = useAuthStore();

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-background text-charcoal-600 gap-3 font-sans">
        <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
        <span className="text-xs font-medium tracking-wide">Initializing Floorly...</span>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Marketing & Legal Pages */}
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <AuthPage />}
        />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/refund" element={<RefundPage />} />
        <Route path="/refund-policy" element={<RefundPage />} />
        <Route
          path="/signup"
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <AuthPage />}
        />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/contact" element={<ContactPage />} />

        {/* Public Shared Document View Pages (Accessible by clients without account) */}
        <Route path="/p/:token" element={<PublicProposalPage />} />
        <Route path="/i/:token" element={<PublicInvoicePage />} />

        {/* Authenticated Workspace Application Routes */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/analyzer" element={<AnalyzerPage />} />
          <Route path="/proposals" element={<ProposalsPage />} />
          <Route path="/proposals/new" element={<ProposalBuilderPage />} />
          <Route path="/proposals/:id/edit" element={<ProposalBuilderPage />} />
          <Route path="/proposals/:id" element={<ProposalBuilderPage />} />
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/clients/:id" element={<ClientDetailPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/invoices" element={<InvoicesPage />} />
          <Route path="/expenses" element={<ExpensesPage />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/pricing-rules" element={<PricingRulesPage />} />
          <Route path="/agents-doc" element={<AgentsDocPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/:section" element={<SettingsPage />} />
        </Route>

        {/* Dedicated Print Routes (No AppLayout shell, no navbar, no sidebar) */}
        <Route
          path="/proposals/:id/print"
          element={
            <ProtectedRoute>
              <ProposalPrintPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/invoices/:id/print"
          element={
            <ProtectedRoute>
              <InvoicePrintPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/invoices/payments/:paymentId/print"
          element={
            <ProtectedRoute>
              <PaymentReceiptPrintPage />
            </ProtectedRoute>
          }
        />

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}
