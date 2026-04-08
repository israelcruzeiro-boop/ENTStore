import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import { Home, Library, MonitorPlay, UserCircle, LogOut, BookOpen, ClipboardCheck } from 'lucide-react';
import { useState, useEffect } from 'react';
import { FirstAccessModal } from '../components/user/FirstAccessModal';

export const UserLayout = () => {
  const { user, company, logout } = useAuth();
  const { slug } = useTenant();
  const location = useLocation();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate(`/${slug}/login`);
  };

  const basePath = `/${slug}`;

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
      {user?.first_access && <FirstAccessModal />}
      
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      
      {/* Navbar Transparente (escurece no scroll) */}
      <header className={`fixed top-0 w-full z-50 transition-colors duration-300 ${scrolled ? 'bg-black/90 backdrop-blur-sm shadow-lg' : 'bg-gradient-to-b from-black/80 to-transparent'}`}>
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-8">
          <Link to={`${basePath}/home`} className="flex items-center">
            <img src="/assets/logo.png" alt="ENTStore" className="h-8 md:h-10 w-auto" />
          </Link>
          <nav className="hidden md:flex gap-6 text-sm font-medium text-zinc-400">
            <Link to={`${basePath}/home`} className={`transition-colors hover:text-white ${isActive('/home') ? 'text-white font-bold' : ''}`}>Home</Link>
            <Link to={`${basePath}/cursos`} className={`transition-colors hover:text-white ${isActive('/cursos') ? 'text-white font-bold' : ''}`}>Cursos</Link>
            <Link to={`${basePath}/biblioteca`} className={`transition-colors hover:text-white ${isActive('/biblioteca') ? 'text-white font-bold' : ''}`}>Biblioteca</Link>
            <Link to={`${basePath}/hub`} className={`transition-colors hover:text-white ${isActive('/hub') ? 'text-white font-bold' : ''}`}>Hub</Link>
            {company?.checklists_enabled && (
              <Link to={`${basePath}/checklists`} className={`transition-colors hover:text-white ${isActive('/checklists') ? 'text-white font-bold' : ''}`}>Checklists</Link>
            )}
          </nav>
        </div>
        
        <div className="flex items-center gap-4 md:gap-5">
          <Link to={`${basePath}/perfil`} className={`flex items-center gap-2 cursor-pointer group hover:text-white transition-colors ${isActive('/perfil') ? 'text-white' : 'text-zinc-400'}`} title="Perfil">
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
         <Link to={`${basePath}/home`} className={`flex flex-col items-center gap-1 w-16 py-2 rounded-xl transition-colors ${isActive('/home') ? 'text-[var(--c-primary)]' : 'text-zinc-500 hover:text-zinc-300'}`}>
            <Home size={22} />
            <span className="text-[10px] font-medium">Home</span>
         </Link>
         <Link to={`${basePath}/cursos`} className={`flex flex-col items-center gap-1 w-16 py-2 rounded-xl transition-colors ${isActive('/cursos') ? 'text-[var(--c-primary)]' : 'text-zinc-500 hover:text-zinc-300'}`}>
            <BookOpen size={22} />
            <span className="text-[10px] font-medium">Cursos</span>
         </Link>
         <Link to={`${basePath}/biblioteca`} className={`flex flex-col items-center gap-1 w-16 py-2 rounded-xl transition-colors ${isActive('/biblioteca') ? 'text-[var(--c-primary)]' : 'text-zinc-500 hover:text-zinc-300'}`}>
            <Library size={22} />
            <span className="text-[10px] font-medium">Biblioteca</span>
         </Link>
         <Link to={`${basePath}/hub`} className={`flex flex-col items-center gap-1 w-16 py-2 rounded-xl transition-colors ${isActive('/hub') ? 'text-[var(--c-primary)]' : 'text-zinc-500 hover:text-zinc-300'}`}>
            <MonitorPlay size={22} />
            <span className="text-[10px] font-medium">Hub</span>
         </Link>
         {company?.checklists_enabled && (
           <Link to={`${basePath}/checklists`} className={`flex flex-col items-center gap-1 w-16 py-2 rounded-xl transition-colors ${isActive('/checklists') ? 'text-[var(--c-primary)]' : 'text-zinc-500 hover:text-zinc-300'}`}>
              <ClipboardCheck size={22} />
              <span className="text-[10px] font-medium">Checklist</span>
           </Link>
         )}
         <Link to={`${basePath}/perfil`} className={`flex flex-col items-center gap-1 w-16 py-2 rounded-xl transition-colors ${isActive('/perfil') ? 'text-[var(--c-primary)]' : 'text-zinc-500 hover:text-zinc-300'}`}>
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