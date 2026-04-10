import { useState, useMemo, lazy, Suspense } from 'react';
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TenantProvider } from './contexts/TenantContext';
import { useCompanies } from './hooks/useSupabaseData';

// Layouts
import { UserLayout } from './layouts/UserLayout';
import { AdminLayout } from './layouts/AdminLayout';

// Lazy Loaded Pages
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const UserHome = lazy(() => import('./pages/user/Home').then(m => ({ default: m.UserHome })));
const UserBiblioteca = lazy(() => import('./pages/user/Biblioteca').then(m => ({ default: m.UserBiblioteca })));
const UserHub = lazy(() => import('./pages/user/Hub').then(m => ({ default: m.UserHub })));
const UserProfile = lazy(() => import('./pages/user/Profile').then(m => ({ default: m.UserProfile })));
const UserBusca = lazy(() => import('./pages/user/Search').then(m => ({ default: m.UserBusca })));
const RepositoryDetail = lazy(() => import('./pages/user/RepositoryDetail').then(m => ({ default: m.RepositoryDetail })));
const ContentDetail = lazy(() => import('./pages/user/ContentDetail').then(m => ({ default: m.ContentDetail })));
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard').then(m => ({ default: m.AdminDashboard })));
const AdminCourses = lazy(() => import('./pages/admin/Courses').then(m => ({ default: m.AdminCourses })));
const AdminCourseDetails = lazy(() => import('./pages/admin/CourseDetails').then(m => ({ default: m.AdminCourseDetails })));
const AdminCourseDashboard = lazy(() => import('./pages/admin/CourseDashboard').then(m => ({ default: m.AdminCourseDashboard })));
const AdminRepositories = lazy(() => import('./pages/admin/Repositories').then(m => ({ default: m.AdminRepositories })));
const AdminRepositoryContents = lazy(() => import('./pages/admin/RepositoryContents').then(m => ({ default: m.AdminRepositoryContents })));
const AdminUsers = lazy(() => import('./pages/admin/Users').then(m => ({ default: m.AdminUsers })));
const AdminStructure = lazy(() => import('./pages/admin/Structure').then(m => ({ default: m.AdminStructure })));
const AdminAppearance = lazy(() => import('./pages/admin/Appearance').then(m => ({ default: m.AdminAppearance })));
const AdminSettings = lazy(() => import('./pages/admin/Settings').then(m => ({ default: m.AdminSettings })));
const UserCourseList = lazy(() => import('./pages/user/CourseList').then(m => ({ default: m.UserCourseList })));
const UserCoursePlayer = lazy(() => import('./pages/user/CoursePlayer').then(m => ({ default: m.UserCoursePlayer })));
const SuperAdminDashboard = lazy(() => import('./pages/superadmin/Dashboard').then(m => ({ default: m.SuperAdminDashboard })));
const NotFound = lazy(() => import("./pages/NotFound"));
const LandingPage = lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })));
const CompanyLandingPage = lazy(() => import('./pages/user/CompanyLandingPage').then(m => ({ default: m.CompanyLandingPage })));
const AdminChecklists = lazy(() => import('./pages/admin/Checklists').then(m => ({ default: m.AdminChecklists })));
const UserChecklists = lazy(() => import('./pages/user/Checklists').then(m => ({ default: m.UserChecklists })));
const UserChecklistPlayer = lazy(() => import('./pages/user/ChecklistPlayer').then(m => ({ default: m.ChecklistPlayer })));
const ChecklistBuilder = lazy(() => import('./pages/admin/ChecklistBuilder').then(m => ({ default: m.ChecklistBuilder })));
const AdminChecklistDashboard = lazy(() => import('./pages/admin/ChecklistDashboard').then(m => ({ default: m.AdminChecklistDashboard })));
const ChecklistSubmissionDetail = lazy(() => import('./pages/admin/ChecklistSubmissionDetail').then(m => ({ default: m.ChecklistSubmissionDetail })));
const ActionPlans = lazy(() => import('./pages/user/ActionPlans').then(m => ({ default: m.ActionPlans })));



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
        if (userCompany) return <Navigate to={`/${userCompany.link_name || userCompany.slug}/home`} replace />;
        // Evita loop: se não sabemos para onde ir, força login global
        return <Navigate to="/login" replace />;
     }
     
     // 2. Se tentar acessar o painel/slug de uma empresa que não é a sua (Proteção de Tenant)
     if (targetCompany && user.company_id !== targetCompany.id && user.role !== 'SUPER_ADMIN') {
        const userCompany = companies.find(c => c.id === user.company_id);
        if (userCompany) return <Navigate to={`/${userCompany.link_name || userCompany.slug}/home`} replace />;
        return <Navigate to="/login" replace />;
     }
  }
  
  if (role && user.role !== role) {
     if (allowSuperAdmin && user.role === 'SUPER_ADMIN') return children; 
     
     if (user.role === 'SUPER_ADMIN') return <Navigate to="/super-admin" replace />;
     if (user.role === 'ADMIN') {
        const adminCompany = companies.find(c => c.id === user.company_id);
        if (adminCompany) return <Navigate to={`/admin/${adminCompany.link_name || adminCompany.slug}`} replace />;
        return <Navigate to="/login" replace />;
     }
     
     const userCompany = companies.find(c => c.id === user.company_id);
     if (userCompany) return <Navigate to={`/${userCompany.link_name || userCompany.slug}/home`} replace />;
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
      <Route path="courses/dashboard" element={<AdminCourseDashboard />} />
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
        <Route path="action-plans" element={<ActionPlans />} />
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
  <TooltipProvider>
    <Sonner />
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={
          <div className="flex h-[100dvh] items-center justify-center bg-slate-950">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500"></div>
              <p className="text-zinc-500 text-xs font-bold animate-pulse uppercase tracking-widest">Carregando interface...</p>
            </div>
          </div>
        }>
          <AppRoutes />
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  </TooltipProvider>
);

export default App;