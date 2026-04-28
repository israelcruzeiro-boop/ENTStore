import { lazy, Suspense } from 'react';
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TenantProvider } from './contexts/TenantContext';
import { TourProvider } from './contexts/TourContext';

// Layouts
import { UserLayout } from './layouts/UserLayout';
import { AdminLayout } from './layouts/AdminLayout';

// Lazy Loaded Pages
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const ActivateInvite = lazy(() => import('./pages/ActivateInvite').then(m => ({ default: m.ActivateInvite })));
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

// Surveys (Pesquisas)
const AdminSurveys = lazy(() => import('./pages/admin/Surveys').then(m => ({ default: m.AdminSurveys })));
const SurveyBuilder = lazy(() => import('./pages/admin/SurveyBuilder').then(m => ({ default: m.SurveyBuilder })));
const SurveyDashboard = lazy(() => import('./pages/admin/SurveyDashboard').then(m => ({ default: m.SurveyDashboard })));
const UserSurveys = lazy(() => import('./pages/user/Surveys').then(m => ({ default: m.UserSurveys })));
const SurveyPlayer = lazy(() => import('./pages/user/SurveyPlayer').then(m => ({ default: m.SurveyPlayer })));

// Route Protectors
const RequireAuth = ({ children, role, allowSuperAdmin = false }: { children: React.ReactNode, role?: string, allowSuperAdmin?: boolean }) => {
  const { user, company, loading: authLoading } = useAuth();
  const params = useParams();
  const currentSlug = params.companySlug;

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          <p className="text-zinc-500 text-sm animate-pulse">Carregando segurança...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (currentSlug) return <Navigate to={`/${currentSlug}/login`} replace />;
    return <Navigate to="/login" replace />;
  }

  const ownSlug = company ? company.link_name || company.slug : null;

  if (currentSlug && user.role !== 'SUPER_ADMIN') {
    const matchesTenant = company && (company.link_name === currentSlug || company.slug === currentSlug);
    if (!matchesTenant) {
      if (ownSlug) return <Navigate to={`/${ownSlug}/home`} replace />;
      return <Navigate to="/login" replace />;
    }
  }

  if (role && user.role !== role) {
    if (allowSuperAdmin && user.role === 'SUPER_ADMIN') return children;

    if (user.role === 'SUPER_ADMIN') return <Navigate to="/super-admin" replace />;
    if (user.role === 'ADMIN') {
      if (ownSlug) return <Navigate to={`/admin/${ownSlug}`} replace />;
      return <Navigate to="/login" replace />;
    }
    if (ownSlug) return <Navigate to={`/${ownSlug}/home`} replace />;
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
    <Route path="/ativar-convite" element={<ActivateInvite />} />
    <Route path="/ativar-convite/:token" element={<ActivateInvite />} />

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
      <Route path="surveys" element={<AdminSurveys />} />
      <Route path="surveys/:surveyId/builder" element={<SurveyBuilder />} />
      <Route path="surveys/:surveyId/dashboard" element={<SurveyDashboard />} />
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
      <Route element={<RequireAuth role="USER"><TourProvider><UserLayout /></TourProvider></RequireAuth>}>
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
        <Route path="pesquisas" element={<UserSurveys />} />
        <Route path="pesquisas/:surveyId" element={<SurveyPlayer />} />
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