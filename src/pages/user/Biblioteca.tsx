import { useAuth } from '../../contexts/AuthContext';
import { useOrgStructure, useRepositories } from '../../hooks/usePlatformData';
import { checkRepoAccess } from '../../lib/permissions';
import { RepoCard } from '../../components/user/RepoCard';
import { Library } from 'lucide-react';

export const UserBiblioteca = () => {
  const { company, user } = useAuth();
  
  // SWR Hooks para dados da API
  const { repositories, isLoading: loadingRepos } = useRepositories(company?.id);
  const { orgUnits, orgTopLevels, isLoading: loadingOrg } = useOrgStructure(company?.id);

  const isLoading = loadingRepos || loadingOrg;

  const libraryRepos = repositories.filter(r => {
     if (r.company_id !== company?.id || r.status !== 'ACTIVE' || r.type !== 'SIMPLE') return false;
     return checkRepoAccess(r, user, orgUnits, orgTopLevels);
  });

  if (isLoading) {
    return (
      <div 
        className="flex items-center justify-center min-h-screen"
        style={{ backgroundColor: company?.theme?.background || '#050505' }}
      >
        <div className="w-12 h-12 border-4 border-[var(--c-primary)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-12 px-4 md:px-12 max-w-[1600px] mx-auto min-h-screen">
      <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8">
         <Library size={32} className="text-[var(--c-primary)] drop-shadow-md" />
         <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-md">Biblioteca</h1>
      </div>
      <p className="text-zinc-300 mb-10 max-w-3xl text-lg md:text-xl font-medium leading-relaxed drop-shadow-sm">Acesse repositórios ágeis contendo links úteis, planilhas organizadas e acessos rápidos aos documentos do dia a dia da empresa.</p>
      
      {libraryRepos.length > 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4 md:gap-6">
          {libraryRepos.map(repo => (
            <div key={repo.id} className="w-full">
              <RepoCard repo={repo} fullWidth />
            </div>
          ))}
        </div>
      ) : (
        <div className="py-20 flex items-center justify-center flex-col text-zinc-500">
           <Library size={48} className="mb-4 opacity-30" />
           <h2 className="text-xl font-bold text-white mb-2">Sem bibliotecas</h2>
           <p>Sua empresa ainda não disponibilizou repositórios simples (links) aqui.</p>
        </div>
      )}
    </div>
  );
};