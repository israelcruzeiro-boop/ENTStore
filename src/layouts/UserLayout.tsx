import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Home, Library, MonitorPlay, UserCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

export const UserLayout = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen text-[var(--c-text)] pb-20 md:pb-0" style={{ backgroundColor: 'var(--c-bg)' }}>
      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      
      {/* Navbar Transparente (escurece no scroll) */}
      <header className={`fixed top-0 w-full z-50 transition-colors duration-300 px-4 md:px-12 py-4 flex justify-between items-center ${scrolled ? 'bg-black/90 backdrop-blur-sm' : 'bg-gradient-to-b from-black/80 to-transparent'}`}>
        <div className="flex items-center gap-8">
          <Link to="/" className="text-2xl font-bold tracking-tighter" style={{ color: 'var(--c-primary)' }}>
             ENT<span className="text-white">Store</span>
          </Link>
          <nav className="hidden md:flex gap-6 text-sm font-medium text-zinc-400">
            <Link to="/" className={`transition-colors hover:text-white ${isActive('/') ? 'text-white font-bold' : ''}`}>Home</Link>
            <Link to="/biblioteca" className={`transition-colors hover:text-white ${isActive('/biblioteca') ? 'text-white font-bold' : ''}`}>Biblioteca</Link>
            <Link to="/hub" className={`transition-colors hover:text-white ${isActive('/hub') ? 'text-white font-bold' : ''}`}>Hub</Link>
          </nav>
        </div>
        
        <div className="flex items-center gap-4 md:gap-6 text-zinc-400">
          <Link to="/perfil" className={`flex items-center gap-2 cursor-pointer group hover:text-white transition-colors ${isActive('/perfil') ? 'text-white' : ''}`} title="Perfil">
            {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="avatar" className="w-8 h-8 rounded-md" />
            ) : (
                <UserCircle size={26} />
            )}
          </Link>
        </div>
      </header>

      <main className="min-h-screen">
        <Outlet />
      </main>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 w-full bg-black/95 backdrop-blur-lg border-t border-zinc-900 flex justify-around p-2 z-50">
         <Link to="/" className={`flex flex-col items-center gap-1 w-16 py-2 rounded-xl transition-colors ${isActive('/') ? 'text-[var(--c-primary)]' : 'text-zinc-500 hover:text-zinc-300'}`}>
            <Home size={22} />
            <span className="text-[10px] font-medium">Home</span>
         </Link>
         <Link to="/biblioteca" className={`flex flex-col items-center gap-1 w-16 py-2 rounded-xl transition-colors ${isActive('/biblioteca') ? 'text-[var(--c-primary)]' : 'text-zinc-500 hover:text-zinc-300'}`}>
            <Library size={22} />
            <span className="text-[10px] font-medium">Biblioteca</span>
         </Link>
         <Link to="/hub" className={`flex flex-col items-center gap-1 w-16 py-2 rounded-xl transition-colors ${isActive('/hub') ? 'text-[var(--c-primary)]' : 'text-zinc-500 hover:text-zinc-300'}`}>
            <MonitorPlay size={22} />
            <span className="text-[10px] font-medium">Hub</span>
         </Link>
         <Link to="/perfil" className={`flex flex-col items-center gap-1 w-16 py-2 rounded-xl transition-colors ${isActive('/perfil') ? 'text-[var(--c-primary)]' : 'text-zinc-500 hover:text-zinc-300'}`}>
            <UserCircle size={22} />
            <span className="text-[10px] font-medium">Perfil</span>
         </Link>
      </div>
    </div>
  );
};