import { Outlet, Link, useNavigate, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAppStore } from '../store/useAppStore';
import { LayoutDashboard, Users, FolderTree, Settings, LogOut, Palette, ArrowLeft } from 'lucide-react';

export const AdminLayout = ({ superAdmin = false }: { superAdmin?: boolean }) => {
  const { user, company, logout } = useAuth();
  const { companies } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { linkName } = useParams();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Se for superadmin visitando o Admin de uma empresa, o displayCompany será pego da URL
  const displayCompany = linkName ? companies.find(c => c.linkName === linkName) : company;

  const navItems = superAdmin ? [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/super-admin' },
    { label: 'Companies', icon: FolderTree, path: '/super-admin/companies' },
  ] : [
    { label: 'Dashboard', icon: LayoutDashboard, path: `/admin/${linkName}` },
    { label: 'Repositórios', icon: FolderTree, path: `/admin/${linkName}/repos` },
    { label: 'Usuários', icon: Users, path: `/admin/${linkName}/users` },
    { label: 'Aparência', icon: Palette, path: `/admin/${linkName}/appearance` },
    { label: 'Configurações', icon: Settings, path: `/admin/${linkName}/settings` },
  ];

  if (!superAdmin && !displayCompany) {
    return <div className="flex h-screen items-center justify-center p-4">Empresa não encontrada para a URL /admin/{linkName}.</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col hidden md:flex">
        <div className="p-6 border-b border-slate-100 flex flex-col">
          {user?.role === 'SUPER_ADMIN' && !superAdmin && (
             <Link to="/super-admin" className="text-xs text-indigo-600 flex items-center gap-1 mb-2 hover:underline font-medium">
               <ArrowLeft size={12} /> Voltar p/ Super Admin
             </Link>
          )}
          <h1 className="text-xl font-bold text-slate-900 truncate">
            {superAdmin ? 'Super Admin' : displayCompany?.name}
          </h1>
          <p className="text-xs text-slate-500 mt-1">Painel de Controle</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (location.pathname === `/admin/${linkName}` && item.path === `/admin/${linkName}`);
            const Icon = item.icon;
            return (
              <Link 
                key={item.path} 
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100">
           <div className="flex items-center gap-3 mb-4 px-3">
              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold">
                 {user?.name.charAt(0)}
              </div>
              <div className="overflow-hidden">
                 <p className="text-sm font-medium text-slate-900 truncate">{user?.name}</p>
                 <p className="text-xs text-slate-500 truncate">{user?.email}</p>
              </div>
           </div>
           <button 
             onClick={handleLogout}
             className="flex w-full items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
           >
              <LogOut size={18} />
              Sair
           </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="md:hidden bg-white border-b border-slate-200 p-4 flex justify-between items-center">
            <h1 className="font-bold truncate">{superAdmin ? 'Super Admin' : displayCompany?.name}</h1>
            <button onClick={handleLogout} className="text-red-600"><LogOut size={20}/></button>
        </header>
        
        <div className="flex-1 overflow-auto p-6 md:p-8">
            <Outlet />
        </div>
      </main>
    </div>
  );
};