import { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCompanies } from '../hooks/useSupabaseData';
import { LayoutDashboard, Users, FolderTree, Settings, LogOut, Palette, ArrowLeft, Building, AlertTriangle, ShieldAlert, Network, Menu, Loader2, BookOpen, ClipboardCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

export const AdminLayout = ({ superAdmin = false }: { superAdmin?: boolean }) => {
  const { user, logout } = useAuth();
  const { companies, isLoading } = useCompanies();
  const navigate = useNavigate();
  const location = useLocation();
  const { companySlug } = useParams();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // 1. Identifica a empresa alvo a partir da URL
  const targetCompany = companySlug ? companies.find(c => c.slug === companySlug) : undefined;

  // 2. Estado de Carregamento (Apenas se não hover dados e estiver carregando)
  if (isLoading && companies.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  // 3. Validações e Bloqueios
  if (!superAdmin) {
    if (!targetCompany) {
      return (
        <div className="flex flex-col h-screen items-center justify-center p-4 bg-slate-50 text-center">
           <Building size={48} className="text-slate-300 mb-4" />
           <h1 className="text-2xl font-bold text-slate-900 mb-2">Empresa não encontrada</h1>
           <p className="text-slate-500 max-w-md mb-6">A URL acessada não corresponde a nenhuma empresa cadastrada no sistema.</p>
           <Button onClick={() => navigate(user?.role === 'SUPER_ADMIN' ? '/super-admin' : '/login')}>Voltar</Button>
        </div>
      );
    }
    if (!targetCompany.active) {
      return (
        <div className="flex flex-col h-screen items-center justify-center p-4 bg-slate-50 text-center">
           <AlertTriangle size={48} className="text-red-400 mb-4" />
           <h1 className="text-2xl font-bold text-slate-900 mb-2">Empresa Inativa</h1>
           <p className="text-slate-500 max-w-md mb-6">O acesso ao painel desta empresa foi suspenso temporariamente.</p>
           <Button onClick={() => navigate(user?.role === 'SUPER_ADMIN' ? '/super-admin' : '/login')}>Voltar</Button>
        </div>
      );
    }
    if (user?.role === 'ADMIN' && user.company_id !== targetCompany.id) {
      return (
         <div className="flex flex-col h-screen items-center justify-center p-4 bg-slate-50 text-center">
           <ShieldAlert size={48} className="text-amber-400 mb-4" />
           <h1 className="text-2xl font-bold text-slate-900 mb-2">Acesso Negado</h1>
           <p className="text-slate-500 max-w-md mb-6">Você não tem permissão para acessar o painel de gerenciamento de outra empresa.</p>
           <Button onClick={handleLogout}>Fazer Login Novamente</Button>
        </div>
      );
    }
  }

  const navItems = superAdmin ? [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/super-admin' },
  ] : [
    { label: 'Dashboard', icon: LayoutDashboard, path: `/admin/${companySlug}` },
    { label: 'Repositórios', icon: FolderTree, path: `/admin/${companySlug}/repos` },
    ...(targetCompany?.checklists_enabled ? [{ label: 'Checklists', icon: ClipboardCheck, path: `/admin/${companySlug}/checklists` }] : []),
    { label: 'Cursos', icon: BookOpen, path: `/admin/${companySlug}/courses` },
    { label: 'Usuários', icon: Users, path: `/admin/${companySlug}/users` },
    { label: 'Estrutura Org.', icon: Network, path: `/admin/${companySlug}/structure` },
    { label: 'Aparência', icon: Palette, path: `/admin/${companySlug}/appearance` },
    { label: 'Configurações', icon: Settings, path: `/admin/${companySlug}/settings` },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white">
      <div className="p-6 border-b border-slate-100 flex flex-col">
          {user?.role === 'SUPER_ADMIN' && !superAdmin && (
            <Link to="/super-admin" onClick={() => setIsMobileMenuOpen(false)} className="text-xs text-blue-600 flex items-center gap-1 mb-4 hover:underline font-medium">
              <ArrowLeft size={12} /> Voltar p/ Super Admin
            </Link>
          )}
          
          {!superAdmin && targetCompany ? (
            <div className="flex items-center gap-3">
              {targetCompany.logo_url ? (
                <img src={targetCompany.logo_url} alt={targetCompany.name} className="w-8 h-8 rounded-md object-cover border border-slate-200 shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
                   {targetCompany.name.charAt(0)}
                </div>
              )}
              <div className="overflow-hidden">
                 <h1 className="text-sm font-bold text-slate-900 truncate">{targetCompany.name}</h1>
                 <p className="text-[10px] text-slate-500 uppercase tracking-wider">Painel Admin</p>
              </div>
            </div>
          ) : (
            <div>
               <h1 className="text-xl font-bold text-slate-900 truncate">Super Admin</h1>
               <p className="text-xs text-slate-500 mt-1">Gestão de Plataforma</p>
            </div>
          )}
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (location.pathname === `/admin/${companySlug}` && item.path === `/admin/${companySlug}`);
            const Icon = item.icon;
            return (
              <Link 
                key={item.path} 
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
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
              {user?.avatar_url ? (
                 <img src={user.avatar_url} alt={user.name} className="w-8 h-8 rounded-full object-cover shrink-0 border border-slate-200" />
              ) : (
                 <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold shrink-0">
                    {user?.name.charAt(0)}
                 </div>
              )}
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
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col">
        <SidebarContent />
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header with Hamburger Menu */}
        <header className="md:hidden bg-white border-b border-slate-200 p-4 flex justify-between items-center">
            <div className="flex items-center gap-3 overflow-hidden">
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-slate-600 -ml-2">
                    <Menu size={24} />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-0">
                   <SidebarContent />
                </SheetContent>
              </Sheet>
              <h1 className="font-bold truncate text-slate-900 text-sm">
                {superAdmin ? 'Super Admin' : targetCompany?.name}
              </h1>
            </div>
            <button onClick={handleLogout} className="text-red-600"><LogOut size={20}/></button>
        </header>
        
        <div className="flex-1 overflow-auto p-6 md:p-8">
            <Outlet />
        </div>
      </main>
    </div>
  );
};