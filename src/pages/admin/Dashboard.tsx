import { useParams } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { Users, FolderTree, FileVideo } from 'lucide-react';

export const AdminDashboard = () => {
  const { linkName } = useParams();
  const { companies, repositories, contents, users } = useAppStore();
  
  const company = companies.find(c => c.linkName === linkName);
  
  const companyRepos = repositories.filter(r => r.companyId === company?.id);
  const repoIds = companyRepos.map(r => r.id);
  const companyContents = contents.filter(c => repoIds.includes(c.repositoryId));
  const companyUsers = users.filter(u => u.companyId === company?.id);
  
  const adminsCount = companyUsers.filter(u => u.role === 'ADMIN').length;
  const regularUsersCount = companyUsers.filter(u => u.role === 'USER').length;

  if (!company) return null;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Visão Geral</h1>
        <p className="text-slate-500 text-sm mt-1">
          Dashboard isolado: exibindo apenas dados pertencentes à <strong>{company.name}</strong>.
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
          </div>
          <div className="divide-y divide-slate-100 flex-1">
            {companyRepos.map(repo => (
                <div key={repo.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                      <img src={repo.coverImage} alt={repo.name} className="w-10 h-10 rounded-md object-cover shadow-sm" />
                      <div>
                        <p className="font-medium text-slate-900">{repo.name}</p>
                        <p className="text-xs text-slate-500">{repo.status === 'ACTIVE' ? 'Ativo' : 'Rascunho'}</p>
                      </div>
                  </div>
                  <button className="px-3 py-1.5 bg-white border border-slate-200 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">Gerenciar</button>
                </div>
            ))}
            {companyRepos.length === 0 && (
                <div className="p-8 text-center text-slate-500">
                  Nenhum repositório criado ainda para a {company.name}.
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
          </div>
          <div className="divide-y divide-slate-100 flex-1">
            {companyUsers.map(user => (
                <div key={user.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold shrink-0">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-slate-900">{user.name}</p>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${user.role === 'ADMIN' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                            {user.role}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">{user.email}</p>
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