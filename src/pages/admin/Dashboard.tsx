import { useAuth } from '../../contexts/AuthContext';
import { MOCK_REPOSITORIES, MOCK_CONTENTS, MOCK_USERS } from '../../data/mock';

export const AdminDashboard = () => {
  const { company } = useAuth();
  
  // Filter mocks for current company
  const companyRepos = MOCK_REPOSITORIES.filter(r => r.companyId === company?.id);
  const repoIds = companyRepos.map(r => r.id);
  const companyContents = MOCK_CONTENTS.filter(c => repoIds.includes(c.repositoryId));
  const companyUsers = MOCK_USERS.filter(u => u.companyId === company?.id);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Visão Geral</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-medium text-slate-500 mb-2">Total de Usuários</h3>
          <p className="text-3xl font-bold text-slate-900">{companyUsers.length}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-medium text-slate-500 mb-2">Repositórios Ativos</h3>
          <p className="text-3xl font-bold text-slate-900">{companyRepos.length}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-sm font-medium text-slate-500 mb-2">Conteúdos Publicados</h3>
          <p className="text-3xl font-bold text-slate-900">{companyContents.length}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-slate-900">Repositórios Recentes</h2>
          <button className="text-sm text-blue-600 font-medium hover:underline">Ver todos</button>
        </div>
        <div className="divide-y divide-slate-100">
           {companyRepos.map(repo => (
              <div key={repo.id} className="p-4 flex items-center justify-between hover:bg-slate-50">
                 <div className="flex items-center gap-4">
                    <img src={repo.coverImage} alt={repo.name} className="w-12 h-12 rounded object-cover" />
                    <div>
                       <p className="font-medium text-slate-900">{repo.name}</p>
                       <p className="text-xs text-slate-500">{repo.status}</p>
                    </div>
                 </div>
                 <button className="px-3 py-1 bg-white border border-slate-200 rounded text-sm font-medium text-slate-600 hover:bg-slate-50">Editar</button>
              </div>
           ))}
        </div>
      </div>
    </div>
  );
};