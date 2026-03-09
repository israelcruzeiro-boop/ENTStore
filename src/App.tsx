import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Layouts
import { UserLayout } from './layouts/UserLayout';
import { AdminLayout } from './layouts/AdminLayout';

// Pages
import { Login } from './pages/Login';
import { UserHome } from './pages/user/Home';
import { RepositoryDetail } from './pages/user/RepositoryDetail';
import { ContentDetail } from './pages/user/ContentDetail';
import { AdminDashboard } from './pages/admin/Dashboard';
import { AdminAppearance } from './pages/admin/Appearance';
import { SuperAdminDashboard } from './pages/superadmin/Dashboard';
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Route Protectors
const RequireAuth = ({ children, role, allowSuperAdmin = false }: { children: JSX.Element, role?: string, allowSuperAdmin?: boolean }) => {
  const { user } = useAuth();
  
  if (!user) return <Navigate to="/login" replace />;
  
  if (role && user.role !== role) {
     if (allowSuperAdmin && user.role === 'SUPER_ADMIN') {
         return children; // Permite Super Admin acessar (Impersonate)
     }
     if (user.role === 'SUPER_ADMIN') return <Navigate to="/super-admin" replace />;
     if (user.role === 'ADMIN') return <Navigate to="/login" replace />; // Volta para o login para recalcular rota
     return <Navigate to="/" replace />;
  }
  return children;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    
    {/* User Routes (Netflix style) */}
    <Route path="/" element={<RequireAuth role="USER"><UserLayout /></RequireAuth>}>
      <Route index element={<UserHome />} />
      <Route path="repo/:id" element={<RepositoryDetail />} />
      <Route path="content/:id" element={<ContentDetail />} />
    </Route>

    {/* Admin Routes (Com linkName na URL) */}
    <Route path="/admin/:linkName" element={<RequireAuth role="ADMIN" allowSuperAdmin><AdminLayout /></RequireAuth>}>
      <Route index element={<AdminDashboard />} />
      <Route path="appearance" element={<AdminAppearance />} />
      <Route path="*" element={<AdminDashboard />} /> 
    </Route>

    {/* Fallback de Admin sem parametro volta pro Login pra pegar a rota certa */}
    <Route path="/admin" element={<Navigate to="/login" replace />} />

    {/* Super Admin Routes */}
    <Route path="/super-admin" element={<RequireAuth role="SUPER_ADMIN"><AdminLayout superAdmin /></RequireAuth>}>
      <Route index element={<SuperAdminDashboard />} />
      <Route path="*" element={<SuperAdminDashboard />} />
    </Route>

    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;