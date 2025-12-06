import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
// Removed TooltipProvider to avoid Radix runtime error
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Waitlist from "./pages/Waitlist";
import Index from "./pages/Index";
import Projects from "./pages/Projects";
import Folders from "./pages/Folders";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import Pricing from "./pages/Pricing";
import NotFound from "./pages/NotFound";
import VideoGenerator from "./pages/VideoGenerator";
import ProjectWorkspace from "./pages/ProjectWorkspace";
import AgentMode from "./pages/AgentMode";
import InviteSignup from "./pages/InviteSignup";
import MarketingSignup from "./pages/MarketingSignup";
import { ArcadsLayout } from "./components/ArcadsLayout";
import { AuthProvider } from "./hooks/useAuth";
import { AuthGuard } from "./components/AuthGuard";
import { SubscriptionGuard } from "./components/SubscriptionGuard";
import { AdminGuard } from "./components/admin/AdminGuard";
import { AdminLayout } from "./components/admin/AdminLayout";
import AdminOverview from "./pages/admin/AdminOverview";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminHealth from "./pages/admin/AdminHealth";
import AdminPromos from "./pages/admin/AdminPromos";
import AdminLinks from "./pages/admin/AdminLinks";
import AdminMarketingLinks from "./pages/admin/AdminMarketingLinks";
import AdminLogs from "./pages/admin/AdminLogs";
import AdminUsers from "./pages/admin/AdminUsers";

const queryClient = new QueryClient();

const App = () => {
  // Detect if we're on the waitlist subdomain
  const isWaitlistSubdomain = window.location.hostname.startsWith('waitlist.');

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
          <Routes>
            {/* If on waitlist subdomain, show waitlist at root */}
            {isWaitlistSubdomain ? (
              <>
                <Route path="/" element={<Waitlist />} />
                <Route path="*" element={<Waitlist />} />
              </>
            ) : (
              <>
                {/* Landing Page */}
                <Route path="/" element={<Landing />} />
                
                {/* Waitlist Page - Public Route */}
                <Route path="/waitlist" element={<Waitlist />} />
          
          <Route path="/auth" element={<Auth />} />
          
          {/* Invite Signup - Public Route */}
          <Route path="/invite/:slug" element={<InviteSignup />} />
          
          {/* Marketing Signup - Public Route */}
          <Route path="/marketing/:slug" element={<MarketingSignup />} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={
            <AdminGuard>
              <AdminLayout>
                <AdminOverview />
              </AdminLayout>
            </AdminGuard>
          } />
          <Route path="/admin/analytics" element={
            <AdminGuard>
              <AdminLayout>
                <AdminAnalytics />
              </AdminLayout>
            </AdminGuard>
          } />
          <Route path="/admin/health" element={
            <AdminGuard>
              <AdminLayout>
                <AdminHealth />
              </AdminLayout>
            </AdminGuard>
          } />
          <Route path="/admin/promos" element={
            <AdminGuard>
              <AdminLayout>
                <AdminPromos />
              </AdminLayout>
            </AdminGuard>
          } />
          <Route path="/admin/links" element={
            <AdminGuard>
              <AdminLayout>
                <AdminLinks />
              </AdminLayout>
            </AdminGuard>
          } />
          <Route path="/admin/marketing-links" element={
            <AdminGuard>
              <AdminLayout>
                <AdminMarketingLinks />
              </AdminLayout>
            </AdminGuard>
          } />
          <Route path="/admin/logs" element={
            <AdminGuard>
              <AdminLayout>
                <AdminLogs />
              </AdminLayout>
            </AdminGuard>
          } />
          <Route path="/admin/users" element={
            <AdminGuard>
              <AdminLayout>
                <AdminUsers />
              </AdminLayout>
            </AdminGuard>
          } />
          
          {/* Pricing Page (Accessible without auth) */}
          <Route path="/pricing" element={<Pricing />} />

          {/* User Routes - Protected by Auth + Subscription */}
          <Route path="/app/*" element={
            <AuthGuard>
              <SubscriptionGuard>
                <Routes>
                  <Route path="/" element={<ProjectWorkspace />} />
                  <Route path="/workspace" element={<ProjectWorkspace />} />
                  <Route path="/workspace/:projectId" element={<ProjectWorkspace />} />
                  <Route path="/agent-mode" element={<AgentMode />} />
                  <Route path="/settings" element={<ProjectWorkspace settingsMode={true} />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </SubscriptionGuard>
            </AuthGuard>
          } />
              </>
            )}
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
  );
};

export default App;
