import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import { Home, Library, MonitorPlay, UserCircle, LogOut, BookOpen, ClipboardCheck, Target, MessageSquare } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { FirstAccessModal } from '../components/user/FirstAccessModal';
import { useOrgStructure, useRepositories, useCourses } from '../hooks/usePlatformData';
import { useChecklists } from '../hooks/useChecklists';
import { checkRepoAccess, checkCourseAccess, checkChecklistAccess } from '../lib/permissions';
import { useTourContext } from '../contexts/TourContext';
import { HelpButton } from '../components/user/HelpButton';
import { getTourKeyByPath } from '../data/userTourSteps';
import { Joyride, STATUS, EVENTS, type EventData, type Controls } from 'react-joyride';
import { Logger } from '../utils/logger';
import { usersMeService } from '../services/api';

export const UserLayout = () => {
  const { user, company, logout, refreshUser } = useAuth();
  const { slug } = useTenant();
  const location = useLocation();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  const { orgUnits, orgTopLevels } = useOrgStructure(company?.id);
  const { repositories } = useRepositories(company?.id);
  const { courses } = useCourses(company?.id);
  const { checklists } = useChecklists(company?.id);

  const availableRepos = repositories.filter(r => r.status === 'ACTIVE' && checkRepoAccess(r, user, orgUnits, orgTopLevels));
  const hasLibraries = availableRepos.some(r => r.type === 'SIMPLE');
  const hasHubs = availableRepos.some(r => r.type === 'FULL' || r.type === 'PLAYLIST' || r.type === 'VIDEO_PLAYLIST' || !r.type);
  
  const availableCourses = courses.filter(c => c.status === 'ACTIVE' && checkCourseAccess(c, user, orgUnits, orgTopLevels));
  const hasCourses = availableCourses.length > 0;

  const availableChecklists = checklists.filter(c => c.status === 'ACTIVE' && checkChecklistAccess(c, user, orgUnits, orgTopLevels));
  const hasChecklists = company?.checklists_enabled && availableChecklists.length > 0;

  const { 
    steps, 
    run, 
    startTour, 
    activeTourKey,
    stopTour 
  } = useTourContext();

  const basePath = `/${slug}`;
  const isHomePage = location.pathname === `${basePath}/home` || location.pathname === `${basePath}`;

  // Para o tour automaticamente ao trocar de página para evitar bugs visuais
  useEffect(() => {
    stopTour();
  }, [location.pathname, stopTour]);

  const handleTourToggle = () => {
    const key = getTourKeyByPath(location.pathname);
    startTour(key);
  };

  const handleTourEvent = useCallback(async (data: EventData, controls: Controls) => {
    const { status, type } = data;

    // Pula automaticamente steps cujo target não existe no DOM
    if (type === EVENTS.TARGET_NOT_FOUND) {
      controls.next();
      return;
    }

    // Finalização ou Saída — usando constantes v3
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED || type === EVENTS.TOUR_END) {
      stopTour();
      
      // Apenas marca como completo e atualiza se for o tour GERAL e ainda não estiver completo.
      if (user && user.onboarding_completed === false && activeTourKey === 'GENERAL') {
        try {
          await usersMeService.updateProfile({ onboardingCompleted: true });
          await refreshUser();
        } catch (err) {
          Logger.warn('Failed to persist onboarding flag', err);
        }
      }
    }
  }, [stopTour, user, activeTourKey, refreshUser]);

  const handleLogout = async () => {
    await logout();
    navigate(`/${slug}/login`);
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    
    if (company?.name) {
      document.title = company.name;
    }
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, [company]);

  const isActive = (path: string) => {
    if (path === '/home') return location.pathname === `${basePath}/home` || location.pathname === `${basePath}`;
    return location.pathname === `${basePath}${path}`;
  };

  return (
    <div 
      className="min-h-screen pb-20 md:pb-0 selection:bg-[var(--c-primary)] selection:text-white transition-colors duration-300"
      style={{ 
        backgroundColor: company?.theme?.background || '#050505',
        color: company?.theme?.text || '#e2e8f0'
      }}
    >
      <Joyride
        key={`${activeTourKey}-${location.pathname}`}
        steps={steps}
        run={run}
        continuous
        onEvent={handleTourEvent}
        options={{
          primaryColor: company?.theme?.primary || '#3b82f6',
          zIndex: 10000,
          showProgress: true,
          skipBeacon: true,
          skipScroll: true,
          buttons: ['back', 'close', 'skip', 'primary'],
        }}
        locale={{
          back: 'Voltar',
          close: 'Fechar',
          last: 'Entendi!',
          next: 'Próximo',
          skip: 'Pular Tour',
        }}
        styles={{
          tooltipContainer: {
            textAlign: 'left' as const,
          },
          buttonPrimary: {
            borderRadius: '8px',
            fontWeight: 'bold',
            fontSize: '14px',
            padding: '8px 16px',
          },
          buttonBack: {
            color: '#64748b',
            fontSize: '14px',
          },
          buttonSkip: {
            color: '#94a3b8',
            fontSize: '13px',
          },
          tooltip: {
            borderRadius: '12px',
            padding: '20px',
          },
        }}
      />
      {user?.first_access && <FirstAccessModal />}
      
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      
      {/* Navbar Transparente (escurece no scroll) */}
      <header className={`fixed top-0 w-full z-50 transition-colors duration-300 ${scrolled ? 'bg-black/90 backdrop-blur-sm shadow-lg' : 'bg-gradient-to-b from-black/80 to-transparent'}`}>
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-8">
          <div className="flex items-center">
            {/* Logo removido conforme solicitado para evitar redundância visual */}
          </div>
          <nav className="hidden md:flex gap-6 text-sm font-medium text-zinc-400">
            <Link to={`${basePath}/home`} className={`transition-colors hover:text-white tour-nav-home ${isActive('/home') ? 'text-white font-bold' : ''}`}>Home</Link>
            {hasCourses && (
              <Link to={`${basePath}/cursos`} className={`transition-colors hover:text-white tour-nav-cursos ${isActive('/cursos') ? 'text-white font-bold' : ''}`}>Cursos</Link>
            )}
            {hasLibraries && (
              <Link to={`${basePath}/biblioteca`} className={`transition-colors hover:text-white tour-nav-biblioteca ${isActive('/biblioteca') ? 'text-white font-bold' : ''}`}>Biblioteca</Link>
            )}
            {hasHubs && (
              <Link to={`${basePath}/hub`} className={`transition-colors hover:text-white tour-nav-hub ${isActive('/hub') ? 'text-white font-bold' : ''}`}>Hub</Link>
            )}
            {hasChecklists && (
              <Link to={`${basePath}/checklists`} className={`transition-colors hover:text-white tour-nav-checklist ${isActive('/checklists') ? 'text-white font-bold' : ''}`}>Checklists</Link>
            )}
            <Link to={`${basePath}/pesquisas`} className={`transition-colors hover:text-white tour-nav-pesquisa ${isActive('/pesquisas') ? 'text-white font-bold' : ''}`}>Pesquisas</Link>
          </nav>
        </div>
        
        <div className="flex items-center gap-4 md:gap-5">
          <HelpButton onClick={handleTourToggle} />
          <Link to={`${basePath}/perfil`} className={`flex items-center gap-2 cursor-pointer group hover:text-white transition-colors tour-nav-perfil ${isActive('/perfil') ? 'text-white' : 'text-zinc-400'}`} title="Perfil">
            {user?.avatar_url ? (
                <img src={user.avatar_url} alt="avatar" className="w-8 h-8 rounded-full object-cover border border-zinc-800" />
            ) : (
                <UserCircle size={26} />
            )}
          </Link>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 text-zinc-400 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-500/10"
            title="Sair"
          >
            <LogOut size={22} />
          </button>
        </div>
        </div>
      </header>

      <main className="min-h-screen">
        <Outlet />
      </main>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 w-full bg-black/95 backdrop-blur-lg border-t border-zinc-900 flex justify-around p-2 z-50">
         <Link to={`${basePath}/home`} className={`flex flex-col items-center gap-1 w-16 py-2 rounded-xl transition-colors tour-nav-home ${isActive('/home') ? 'text-[var(--c-primary)]' : 'text-zinc-500 hover:text-zinc-300'}`}>
            <Home size={22} />
            <span className="text-[10px] font-medium">Home</span>
         </Link>
         {hasCourses && (
           <Link to={`${basePath}/cursos`} className={`flex flex-col items-center gap-1 w-16 py-2 rounded-xl transition-colors tour-nav-cursos ${isActive('/cursos') ? 'text-[var(--c-primary)]' : 'text-zinc-500 hover:text-zinc-300'}`}>
              <BookOpen size={22} />
              <span className="text-[10px] font-medium">Cursos</span>
           </Link>
         )}
         {hasLibraries && (
           <Link to={`${basePath}/biblioteca`} className={`flex flex-col items-center gap-1 w-16 py-2 rounded-xl transition-colors tour-nav-biblioteca ${isActive('/biblioteca') ? 'text-[var(--c-primary)]' : 'text-zinc-500 hover:text-zinc-300'}`}>
              <Library size={22} />
              <span className="text-[10px] font-medium">Biblioteca</span>
           </Link>
         )}
         {hasHubs && (
           <Link to={`${basePath}/hub`} className={`flex flex-col items-center gap-1 w-16 py-2 rounded-xl transition-colors tour-nav-hub ${isActive('/hub') ? 'text-[var(--c-primary)]' : 'text-zinc-500 hover:text-zinc-300'}`}>
              <MonitorPlay size={22} />
              <span className="text-[10px] font-medium">Hub</span>
           </Link>
         )}
         {hasChecklists && (
           <Link to={`${basePath}/checklists`} className={`flex flex-col items-center gap-1 w-16 py-2 rounded-xl transition-colors tour-nav-checklist ${isActive('/checklists') ? 'text-[var(--c-primary)]' : 'text-zinc-500 hover:text-zinc-300'}`}>
              <ClipboardCheck size={22} />
              <span className="text-[10px] font-medium">Checklist</span>
           </Link>
         )}
         <Link to={`${basePath}/pesquisas`} className={`flex flex-col items-center gap-1 w-16 py-2 rounded-xl transition-colors tour-nav-pesquisa ${isActive('/pesquisas') ? 'text-[var(--c-primary)]' : 'text-zinc-500 hover:text-zinc-300'}`}>
            <MessageSquare size={22} />
            <span className="text-[10px] font-medium">Pesquisas</span>
         </Link>
         <Link to={`${basePath}/perfil`} className={`flex flex-col items-center gap-1 w-16 py-2 rounded-xl transition-colors tour-nav-perfil ${isActive('/perfil') ? 'text-[var(--c-primary)]' : 'text-zinc-500 hover:text-zinc-300'}`}>
            {user?.avatar_url ? (
               <img src={user.avatar_url} alt="avatar" className="w-6 h-6 rounded-full object-cover" />
            ) : (
               <UserCircle size={22} />
            )}
            <span className="text-[10px] font-medium">Perfil</span>
         </Link>
      </div>

    </div>
  );
};
