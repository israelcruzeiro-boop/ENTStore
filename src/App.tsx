import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useAppStore } from './store/useAppStore';

// Layouts
import { UserLayout } from './layouts/UserLayout';
import { AdminLayout } from './layouts/AdminLayout';

// Pages
import { Login } from './pages/Login';
import { UserHome } from './pages/user/Home';
import { UserBiblioteca } from './pages/user/Biblioteca';
import { UserHub } from './pages/user/Hub';
import { UserProfile } from './pages/user/Profile';
import { UserBusca } from './pages/user/Search';
import { RepositoryDetail } from './pages/user/RepositoryDetail';
import { ContentDetail } from './pages/user/ContentDetail';
import { AdminDashboard } from './pages/admin/Dashboard';
import { AdminRepositories } from './pages/admin/Repositories';
import { AdminRepositoryContents } from './pages/admin/RepositoryContents';
import { AdminUsers } from './pages/admin/Users';
import { AdminStructure } from './pages/admin/Structure';
import { AdminAppearance } from './pages/admin/Appearance';
import { AdminSettings } from './pages/admin/Settings';
import { SuperAdminDashboard } from './pages/superadmin/Dashboard';
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Route Protectors
const RequireAuth = ({ children, role, allowSuperAdmin = false }: { children: JSX.Element, role?: string, allowSuperAdmin?: boolean }) => {
  const { user } = useAuth();
  const { slug } = useParams();
  const { companies } = useAppStore();
  
  if (!user) {
     if (slug) return <Navigate to={`/${slug}/login`} replace />;
     return <Navigate to="/login" replace />;
  }

  // Validação Multi-tenant (Garante que o usuário está na URL da sua própria empresa)
  if (role === 'USER' && slug) {
     const targetCompany = companies.find(c => c.linkName === slug || c.slug === slug);
     if (!targetCompany || user.companyId !== targetCompany.id) {
        return <Navigate to={`/${slug}/login`} replace />;
     }
  }
  
  if (role && user.role !== role) {
     if (allowSuperAdmin && user.role === 'SUPER_ADMIN') {
         return children; // Permite Super Admin acessar (Impersonate)
     }
     if (user.role === 'SUPER_ADMIN') return <Navigate to="/super-admin" replace />;
     if (user.role === 'ADMIN') return <Navigate to="/login" replace />; // Volta para o login para recalcular rota
     return <Navigate to="/login" replace />;
  }
  return children;
};

const AppRoutes = () => (
  <Routes>
    {/* Redirect padrão */}
    <Route path="/" element={<Navigate to="/login" replace />} />
    
    {/* Global Login (Super Admin / Fallback) */}
    <Route path="/login" element={<Login />} />
    
    {/* Tenant Login */}
    <Route path="/:slug/login" element={<Login />} />

    {/* User Routes (Multi-tenant via Slug) */}
    <Route path="/:slug" element={<RequireAuth role="USER"><UserLayout /></RequireAuth>}>
      <Route index element={<UserHome />} />
      <Route path="home" element={<UserHome />} />
      <Route path="biblioteca" element={<UserBiblioteca />} />
      <Route path="hub" element={<UserHub />} />
      <Route path="busca" element={<UserBusca />} />
      <Route path="perfil" element={<UserProfile />} />
      <Route path="repo/:id" element={<RepositoryDetail />} />
      <Route path="content/:id" element={<ContentDetail />} />
    </Route>

    {/* Admin Routes (Com linkName na URL) */}
    <Route path="/admin/:linkName" element={<RequireAuth role="ADMIN" allowSuperAdmin><AdminLayout /></RequireAuth>}>
      <Route index element={<AdminDashboard />} />
      <Route path="repos" element={<AdminRepositories />} />
      <Route path="repos/:repoId" element={<AdminRepositoryContents />} />
      <Route path="users" element={<AdminUsers />} />
      <Route path="structure" element={<AdminStructure />} />
      <Route path="appearance" element={<AdminAppearance />} />
      <Route path="settings" element={<AdminSettings />} />
      <Route path="*" element={<AdminDashboard />} /> 
    </Route>

    {/* Fallback de Admin sem parametro */}
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