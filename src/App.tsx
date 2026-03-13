import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useAppStore } from './store/useAppStore';
import { TenantProvider } from './contexts/TenantContext';

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
  const { companySlug, linkName } = useParams();
  const { companies } = useAppStore();
  
  if (!user) {
     if (companySlug) return <Navigate to={`/${companySlug}/login`} replace />;
     return <Navigate to="/login" replace />;
  }

  // Validação Multi-tenant rigorosa para rotas de usuário
  if (role === 'USER' && companySlug) {
     const targetCompany = companies.find(c => c.linkName === companySlug || c.slug === companySlug);
     
     // 1. Se acessar um slug de empresa que não existe (ou foi inativada)
     if (!targetCompany) {
        const userCompany = companies.find(c => c.id === user.companyId);
        if (userCompany) return <Navigate to={`/${userCompany.linkName}/home`} replace />;
        return <Navigate to="/login" replace />;
     }
     
     // 2. Se tentar acessar o painel/slug de uma empresa que não é a sua
     if (user.companyId !== targetCompany.id && user.role !== 'SUPER_ADMIN') {
        const userCompany = companies.find(c => c.id === user.companyId);
        if (userCompany) return <Navigate to={`/${userCompany.linkName}/home`} replace />;
        return <Navigate to={`/${companySlug}/login`} replace />;
     }
  }
  
  if (role && user.role !== role) {
     // Permite Super Admin impersonar Admins
     if (allowSuperAdmin && user.role === 'SUPER_ADMIN') {
         return children; 
     }
     // Resgate de papel incorreto na rota
     if (user.role === 'SUPER_ADMIN') return <Navigate to="/super-admin" replace />;
     if (user.role === 'ADMIN') {
        const adminCompany = companies.find(c => c.id === user.companyId);
        if (adminCompany) return <Navigate to={`/admin/${adminCompany.linkName}`} replace />;
        return <Navigate to="/login" replace />;
     }
     
     // Resgate para usuário final
     const userCompany = companies.find(c => c.id === user.companyId);
     if (userCompany) return <Navigate to={`/${userCompany.linkName}/home`} replace />;
     return <Navigate to="/login" replace />;
  }
  
  return children;
};

const AppRoutes = () => (
  <Routes>
    {/* Rotas Globais e Reservadas (Têm prioridade sobre /:companySlug) */}
    <Route path="/" element={<Navigate to="/login" replace />} />
    <Route path="/login" element={<Login />} />

    <Route path="/super-admin" element={<RequireAuth role="SUPER_ADMIN"><AdminLayout superAdmin /></RequireAuth>}>
      <Route index element={<SuperAdminDashboard />} />
      <Route path="*" element={<SuperAdminDashboard />} />
    </Route>

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
    
    {/* Redirecionamento seguro para quem esquecer o slug do admin */}
    <Route path="/admin" element={<Navigate to="/login" replace />} />

    {/* Namespace de Tenant (Captura os acessos ao painel do usuário) */}
    <Route path="/:companySlug" element={<TenantProvider />}>
      {/* Tenant Login */}
      <Route path="login" element={<Login />} />

      {/* Protected Area */}
      <Route element={<RequireAuth role="USER"><UserLayout /></RequireAuth>}>
        <Route index element={<Navigate to="home" replace />} />
        <Route path="home" element={<UserHome />} />
        <Route path="biblioteca" element={<UserBiblioteca />} />
        <Route path="hub" element={<UserHub />} />
        <Route path="busca" element={<UserBusca />} />
        <Route path="perfil" element={<UserProfile />} />
        <Route path="repo/:id" element={<RepositoryDetail />} />
        <Route path="content/:id" element={<ContentDetail />} />
        {/* Fallback interno do Tenant */}
        <Route path="*" element={<Navigate to="home" replace />} />
      </Route>
    </Route>

    {/* Rota 404 Global */}
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