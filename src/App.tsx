import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TenantProvider } from './contexts/TenantContext';
import { useCompanies } from './hooks/useSupabaseData';

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
import { AdminCourses } from './pages/admin/Courses';
import { AdminCourseDetails } from './pages/admin/CourseDetails';
import { AdminRepositories } from './pages/admin/Repositories';
import { AdminRepositoryContents } from './pages/admin/RepositoryContents';
import { AdminUsers } from './pages/admin/Users';
import { AdminStructure } from './pages/admin/Structure';
import { AdminAppearance } from './pages/admin/Appearance';
import { AdminSettings } from './pages/admin/Settings';
import { UserCourseList } from './pages/user/CourseList';
import { UserCoursePlayer } from './pages/user/CoursePlayer';
import { SuperAdminDashboard } from './pages/superadmin/Dashboard';
import NotFound from "./pages/NotFound";
import { LandingPage } from './pages/LandingPage';
import { CompanyLandingPage } from './pages/user/CompanyLandingPage';
import { AdminChecklists } from './pages/admin/Checklists';
import { UserChecklists } from './pages/user/Checklists';
import { ChecklistPlayer as UserChecklistPlayer } from './pages/user/ChecklistPlayer';
import { ChecklistBuilder } from './pages/admin/ChecklistBuilder';
import { AdminChecklistDashboard } from './pages/admin/ChecklistDashboard';
import { ChecklistSubmissionDetail } from './pages/admin/ChecklistSubmissionDetail';

const queryClient = new QueryClient();

// Route Protectors
const RequireAuth = ({ children, role, allowSuperAdmin = false }: { children: React.ReactNode, role?: string, allowSuperAdmin?: boolean }) => {
  const { user, loading: authLoading } = useAuth();
  const params = useParams();
  const { companies, isLoading: companiesLoading } = useCompanies();
  
  // companySlug é usado em todas as rotas unificadas
  const currentSlug = params.companySlug;
  const loading = authLoading || companiesLoading;
  
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          <p className="text-zinc-500 text-sm animate-pulse">Carregando segurança...</p>
        </div>
      </div>
    );
  }

  // Se não houver usuário logado (Supabase Auth reporta nulo)
  if (!user) {
     if (currentSlug) return <Navigate to={`/${currentSlug}/login`} replace />;
     return <Navigate to="/login" replace />;
  }

  // Validação Multi-tenant rigorosa para rotas de usuário e admin
  if (currentSlug) {
     const targetCompany = companies.find(c => c.link_name === currentSlug || c.slug === currentSlug);
     
     // 1. Se acessar um slug de empresa que não existe (ou foi inativada)
     if (!targetCompany && companies.length > 0) {
        const userCompany = companies.find(c => c.id === user.company_id);
        if (userCompany) return <Navigate to={`/${userCompany.slug}/home`} replace />;
        // Evita loop: se não sabemos para onde ir, força login global
        return <Navigate to="/login" replace />;
     }
     
     // 2. Se tentar acessar o painel/slug de uma empresa que não é a sua (Proteção de Tenant)
     if (targetCompany && user.company_id !== targetCompany.id && user.role !== 'SUPER_ADMIN') {
        const userCompany = companies.find(c => c.id === user.company_id);
        if (userCompany) return <Navigate to={`/${userCompany.slug}/home`} replace />;
        return <Navigate to="/login" replace />;
     }
  }
  
  if (role && user.role !== role) {
     if (allowSuperAdmin && user.role === 'SUPER_ADMIN') return children; 
     
     if (user.role === 'SUPER_ADMIN') return <Navigate to="/super-admin" replace />;
     if (user.role === 'ADMIN') {
        const adminCompany = companies.find(c => c.id === user.company_id);
        if (adminCompany) return <Navigate to={`/admin/${adminCompany.slug}`} replace />;
        return <Navigate to="/login" replace />;
     }
     
     const userCompany = companies.find(c => c.id === user.company_id);
     if (userCompany) return <Navigate to={`/${userCompany.slug}/home`} replace />;
     return <Navigate to="/login" replace />;
  }
  
  return children;
};

const AppRoutes = () => (
  <Routes>
    {/* Rotas Globais e Reservadas (Têm prioridade sobre /:companySlug) */}
    <Route path="/" element={<Navigate to="/login" replace />} />
    <Route path="/login" element={<Login />} />
    <Route path="/lpage" element={<LandingPage />} />

    <Route path="/super-admin" element={<RequireAuth role="SUPER_ADMIN"><AdminLayout superAdmin /></RequireAuth>}>
      <Route index element={<SuperAdminDashboard />} />
      <Route path="*" element={<SuperAdminDashboard />} />
    </Route>

    <Route path="/admin/:companySlug" element={<RequireAuth role="ADMIN" allowSuperAdmin><AdminLayout /></RequireAuth>}>
      <Route index element={<AdminDashboard />} />
      <Route path="repos" element={<AdminRepositories />} />
      <Route path="repos/:repoId" element={<AdminRepositoryContents />} />
      <Route path="courses" element={<AdminCourses />} />
      <Route path="courses/:courseId" element={<AdminCourseDetails />} />
      <Route path="users" element={<AdminUsers />} />
      <Route path="checklists" element={<AdminChecklists />} />
      <Route path="checklists/dashboard" element={<AdminChecklistDashboard />} />
      <Route path="checklists/submissions/:submissionId" element={<ChecklistSubmissionDetail />} />
      <Route path="checklists/:checklistId/builder" element={<ChecklistBuilder />} />
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
      {/* Public Landing Page */}
      <Route path="landing" element={<CompanyLandingPage />} />

      {/* Protected Area */}
      <Route element={<RequireAuth role="USER"><UserLayout /></RequireAuth>}>
        <Route index element={<Navigate to="home" replace />} />
        <Route path="home" element={<UserHome />} />
        <Route path="biblioteca" element={<UserBiblioteca />} />
        <Route path="hub" element={<UserHub />} />
        <Route path="busca" element={<UserBusca />} />
        <Route path="perfil" element={<UserProfile />} />
        <Route path="cursos" element={<UserCourseList />} />
        <Route path="cursos/:courseId" element={<UserCoursePlayer />} />
        <Route path="checklists" element={<UserChecklists />} />
        <Route path="checklists/:submissionId" element={<UserChecklistPlayer />} />
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