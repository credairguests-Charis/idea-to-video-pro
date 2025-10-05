import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
// Removed TooltipProvider to avoid Radix runtime error
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Projects from "./pages/Projects";
import Folders from "./pages/Folders";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import Pricing from "./pages/Pricing";
import NotFound from "./pages/NotFound";
import { ArcadsLayout } from "./components/ArcadsLayout";
import { AuthProvider } from "./hooks/useAuth";
import { AuthGuard } from "./components/AuthGuard";
import { AdminGuard } from "./components/admin/AdminGuard";
import { AdminLayout } from "./components/admin/AdminLayout";
import AdminOverview from "./pages/admin/AdminOverview";
import AdminHealth from "./pages/admin/AdminHealth";
import AdminPromos from "./pages/admin/AdminPromos";
import AdminLinks from "./pages/admin/AdminLinks";
import AdminLogs from "./pages/admin/AdminLogs";
import AdminUsers from "./pages/admin/AdminUsers";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          
          {/* Admin Routes */}
          <Route path="/admin/*" element={
            <AdminGuard>
              <AdminLayout>
                <Routes>
                  <Route path="/" element={<AdminOverview />} />
                  <Route path="/health" element={<AdminHealth />} />
                  <Route path="/promos" element={<AdminPromos />} />
                  <Route path="/links" element={<AdminLinks />} />
                  <Route path="/logs" element={<AdminLogs />} />
                  <Route path="/users" element={<AdminUsers />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </AdminLayout>
            </AdminGuard>
          } />
          
          {/* Pricing Page (Accessible without auth) */}
          <Route path="/pricing" element={<Pricing />} />

          {/* User Routes */}
          <Route path="/*" element={
            <AuthGuard>
              <ArcadsLayout>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/projects" element={<Projects />} />
                  <Route path="/folders" element={<Folders />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/still-watching" element={<Projects />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </ArcadsLayout>
            </AuthGuard>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
