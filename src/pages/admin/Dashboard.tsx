import { useParams, Link } from 'react-router-dom';
import { useCompanies, useRepositories, useContents, useUsers } from '../../hooks/usePlatformData';
import { Users, FolderTree, FileVideo, ArrowRight, Loader2, BookOpen, CheckSquare, HelpCircle } from 'lucide-react';
import { Joyride } from 'react-joyride';
import { useTour } from '../../hooks/useTour';
import { DASHBOARD_STEPS } from '../../data/tourSteps';
import { Button } from '@/components/ui/button';

export const AdminDashboard = () => {
  const { companySlug } = useParams();
  const { companies, isLoading: loadingCompanies } = useCompanies();
  
  // 1. Identifica a empresa atual pela URL
  const company = companies.find(c => c.link_name === companySlug || c.slug === companySlug);
  
  // 2. Busca os dados filtrados por empresa
  const { repositories: companyRepos, isLoading: loadingRepos } = useRepositories(company?.id);
  const { contents: companyContents, isLoading: loadingContents } = useContents({ companyId: company?.id });
  const { users: companyUsers, isLoading: loadingUsers } = useUsers(company?.id);
  
  const adminsCount = companyUsers.filter(u => u.role === 'ADMIN').length;
  const regularUsersCount = companyUsers.filter(u => u.role === 'USER').length;

  const isLoading = loadingCompanies || loadingRepos || loadingContents || loadingUsers;

  // Tour Guiado (Tutorial)
  const { startTour, joyrideProps } = useTour(DASHBOARD_STEPS);

  if (!company && !loadingCompanies) return (
    <div className="p-8 text-center text-slate-500">
      Empresa não encontrada.
    </div>
  );

  if (isLoading) return (
    <div className="flex justify-center items-center h-64 text-slate-400">
       <Loader2 className="animate-spin" />
    </div>
  );

  return (
    <div>
      <Joyride {...joyrideProps} />
      <div className="mb-8 flex justify-between items-start">
        <div className="tour-dash-header">
          <h1 className="text-2xl font-bold text-slate-900">Visão Geral</h1>
        <p className="text-slate-500 text-sm mt-1">
          Dashboard isolado: exibindo apenas dados pertencentes à <strong>{company?.name}</strong>.
        </p>
        </div>
        <Button variant="ghost" size="sm" className="text-blue-600 font-bold hover:bg-blue-50" onClick={startTour}>
          <HelpCircle size={16} className="mr-2" /> Conheça o painel
        </Button>
      </div>
      
      {/* ATALHOS RÁPIDOS PARA DASHBOARDS ESPECIALIZADOS */}
      <h2 className="text-lg font-bold text-slate-900 mb-4 px-1">Painéis Especializados</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 tour-dash-panels">
        <Link to={`/admin/${companySlug}/courses/dashboard`} className="group relative overflow-hidden bg-gradient-to-br from-indigo-900 to-indigo-800 p-8 rounded-2xl border border-indigo-700 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between transition-all hover:scale-[1.02] hover:shadow-indigo-500/20 gap-4">
           <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-white/10 transition-all opacity-50" />
           <div className="relative z-10 flex items-center gap-6">
              <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 backdrop-blur-sm shrink-0">
                <BookOpen size={32} className="text-white drop-shadow-md" />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-black text-white mb-1">Dashboard de Cursos</h3>
                <p className="text-indigo-200 font-medium text-sm md:text-base pr-4">Acesse métricas avançadas, conclusões, engajamento e painel de rankeamentos das trilhas educacionais.</p>
              </div>
           </div>
           <div className="relative z-10 w-12 h-12 shrink-0 bg-white/10 rounded-full flex items-center justify-center border border-white/20 group-hover:bg-white/20 group-hover:translate-x-1 transition-all">
              <ArrowRight className="text-white" />
           </div>
        </Link>

        <Link to={`/admin/${companySlug}/checklists/dashboard`} className="group relative overflow-hidden bg-gradient-to-br from-emerald-900 to-emerald-800 p-8 rounded-2xl border border-emerald-700 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between transition-all hover:scale-[1.02] hover:shadow-emerald-500/20 gap-4">
           <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-white/10 transition-all opacity-50" />
           <div className="relative z-10 flex items-center gap-6">
              <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 backdrop-blur-sm shrink-0">
                <CheckSquare size={32} className="text-white drop-shadow-md" />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-black text-white mb-1">Dashboard de Checklist</h3>
                <p className="text-emerald-200 font-medium text-sm md:text-base pr-4">Analise a adesão às avaliações, monitoramentos e notas gerais através do painel de mapas táticos corporativos.</p>
              </div>
           </div>
           <div className="relative z-10 w-12 h-12 shrink-0 bg-white/10 rounded-full flex items-center justify-center border border-white/20 group-hover:bg-white/20 group-hover:translate-x-1 transition-all">
              <ArrowRight className="text-white" />
           </div>
        </Link>
      </div>

      {/* MÉTRICAS GERAIS */}
      <h2 className="text-lg font-bold text-slate-900 mb-4 px-1">Métricas Globais</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 tour-dash-metrics">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
             <Users size={24} />
          </div>
          <div>
             <p className="text-sm font-medium text-slate-500">Usuários Finais</p>
             <p className="text-2xl font-bold text-slate-900">{regularUsersCount}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center shrink-0">
             <Users size={24} />
          </div>
          <div>
             <p className="text-sm font-medium text-slate-500">Administradores</p>
             <p className="text-2xl font-bold text-slate-900">{adminsCount}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shrink-0">
             <FolderTree size={24} />
          </div>
          <div>
             <p className="text-sm font-medium text-slate-500">Repositórios</p>
             <p className="text-2xl font-bold text-slate-900">{companyRepos.length}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center shrink-0">
             <FileVideo size={24} />
          </div>
          <div>
             <p className="text-sm font-medium text-slate-500">Conteúdos</p>
             <p className="text-2xl font-bold text-slate-900">{companyContents.length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LISTA: REPOSITÓRIOS DA EMPRESA */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
          <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <FolderTree size={18} className="text-slate-400" /> Seus Repositórios
            </h2>
            <Link to={`/admin/${companySlug}/repos`} className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
              Ver todos <ArrowRight size={16} />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 flex-1 max-h-[400px] overflow-y-auto">
            {companyRepos.map(repo => (
                <div key={repo.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4 overflow-hidden">
                      <img src={repo.cover_image || ''} alt={repo.name} className="w-10 h-10 rounded-md object-cover shadow-sm bg-slate-100 shrink-0" />
                      <div className="overflow-hidden">
                        <p className="font-medium text-slate-900 truncate">{repo.name}</p>
                        <p className="text-xs text-slate-500">{repo.status === 'ACTIVE' ? 'Ativo' : 'Rascunho'}</p>
                      </div>
                  </div>
                  <Link to={`/admin/${companySlug}/repos`} className="px-3 py-1.5 bg-white border border-slate-200 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors shrink-0">
                    Gerenciar
                  </Link>
                </div>
            ))}
            {companyRepos.length === 0 && (
                <div className="p-8 text-center text-slate-500">
                  Nenhum repositório criado ainda para a {company?.name}.
                </div>
            )}
          </div>
        </div>

        {/* LISTA: USUÁRIOS DA EMPRESA */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
          <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
            <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <Users size={18} className="text-slate-400" /> Usuários da Empresa
            </h2>
            <Link to={`/admin/${companySlug}/users`} className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
              Ver todos <ArrowRight size={16} />
            </Link>
          </div>
          <div className="divide-y divide-slate-100 flex-1 max-h-[400px] overflow-y-auto">
            {companyUsers.map(user => (
                <div key={user.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold shrink-0">
                        {user.name.charAt(0)}
                      </div>
                      <div className="overflow-hidden">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-slate-900 truncate">{user.name}</p>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${user.role === 'ADMIN' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                            {user.role}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 truncate">{user.email || 'Sem e-mail'}</p>
                      </div>
                  </div>
                </div>
            ))}
            {companyUsers.length === 0 && (
                <div className="p-8 text-center text-slate-500">
                  Nenhum usuário cadastrado.
                </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};
