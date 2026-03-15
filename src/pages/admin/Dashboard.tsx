import { useParams, Link } from 'react-router-dom';
import { useCompanies, useRepositories, useContents, useUsers } from '../../hooks/useSupabaseData';
import { Users, FolderTree, FileVideo, ArrowRight, Loader2 } from 'lucide-react';

export const AdminDashboard = () => {
  const { link_name } = useParams();
  const { companies, isLoading: loadingCompanies } = useCompanies();
  
  // 1. Identifica a empresa atual pela URL
  const company = companies.find(c => c.link_name === link_name);
  
  // 2. Busca os dados filtrados por empresa
  const { repositories: companyRepos, isLoading: loadingRepos } = useRepositories(company?.id);
  const { contents: companyContents, isLoading: loadingContents } = useContents({ companyId: company?.id });
  const { users: companyUsers, isLoading: loadingUsers } = useUsers(company?.id);
  
  const adminsCount = companyUsers.filter(u => u.role === 'ADMIN').length;
  const regularUsersCount = companyUsers.filter(u => u.role === 'USER').length;

  const isLoading = loadingCompanies || loadingRepos || loadingContents || loadingUsers;

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
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Visão Geral</h1>
        <p className="text-slate-500 text-sm mt-1">
          Dashboard isolado: exibindo apenas dados pertencentes à <strong>{company?.name}</strong>.
        </p>
      </div>
      
      {/* MÉTRICAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
            <Link to={`/admin/${link_name}/repos`} className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
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
                  <Link to={`/admin/${link_name}/repos`} className="px-3 py-1.5 bg-white border border-slate-200 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors shrink-0">
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
            <Link to={`/admin/${link_name}/users`} className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
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