import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Search, Bell, Menu, UserCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

export const UserLayout = () => {
  const { user, company, logout } = useAuth();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

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
             [NOME]<span className="text-white">Store</span>
          </Link>
          <nav className="hidden md:flex gap-6 text-sm font-medium text-zinc-300">
            <Link to="/" className="hover:text-white transition-colors">Início</Link>
            <Link to="/" className="hover:text-white transition-colors">Repositórios</Link>
            <Link to="/" className="hover:text-white transition-colors">Minha Lista</Link>
          </nav>
        </div>
        
        <div className="flex items-center gap-4 md:gap-6 text-zinc-300">
          <button className="hover:text-white"><Search size={20} /></button>
          <button className="hidden md:block hover:text-white"><Bell size={20} /></button>
          <div className="flex items-center gap-2 cursor-pointer group" onClick={handleLogout}>
            {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="avatar" className="w-8 h-8 rounded-md" />
            ) : (
                <UserCircle size={24} />
            )}
            <span className="text-xs hidden md:block opacity-0 group-hover:opacity-100 transition-opacity">Sair</span>
          </div>
        </div>
      </header>

      <main className="min-h-screen">
        <Outlet />
      </main>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 w-full bg-black/90 backdrop-blur-lg border-t border-zinc-800 flex justify-around p-4 z-50">
         <Link to="/" className="flex flex-col items-center gap-1 text-[var(--c-primary)]">
            <Menu size={20} />
            <span className="text-[10px]">Início</span>
         </Link>
         <button className="flex flex-col items-center gap-1 text-zinc-500 hover:text-white transition-colors">
            <Search size={20} />
            <span className="text-[10px]">Busca</span>
         </button>
         <button className="flex flex-col items-center gap-1 text-zinc-500 hover:text-white transition-colors">
            <UserCircle size={20} />
            <span className="text-[10px]">Perfil</span>
         </button>
      </div>
    </div>
  );
};