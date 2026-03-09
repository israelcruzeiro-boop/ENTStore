import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, Users, FolderTree, Settings, LogOut, Palette } from 'lucide-react';

export const AdminLayout = ({ superAdmin = false }: { superAdmin?: boolean }) => {
  const { user, company, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = superAdmin ? [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/super-admin' },
    { label: 'Companies', icon: FolderTree, path: '/super-admin/companies' },
  ] : [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
    { label: 'Repositórios', icon: FolderTree, path: '/admin/repos' },
    { label: 'Usuários', icon: Users, path: '/admin/users' },
    { label: 'Aparência', icon: Palette, path: '/admin/appearance' },
    { label: 'Configurações', icon: Settings, path: '/admin/settings' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col hidden md:flex">
        <div className="p-6 border-b border-slate-100">
          <h1 className="text-xl font-bold text-slate-900">
            {superAdmin ? 'Super Admin' : company?.name || 'Admin'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">Painel de Controle</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
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

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden bg-white border-b border-slate-200 p-4 flex justify-between items-center">
            <h1 className="font-bold">{superAdmin ? 'Super Admin' : 'Admin'}</h1>
            <button onClick={handleLogout} className="text-red-600"><LogOut size={20}/></button>
        </header>
        
        <div className="flex-1 overflow-auto p-6 md:p-8">
            <Outlet />
        </div>
      </main>
    </div>
  );
};