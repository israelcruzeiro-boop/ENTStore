import { useAuth } from '../../contexts/AuthContext';
import { useAppStore, checkRepoAccess } from '../../store/useAppStore';
import { RepoCard } from '../../components/user/RepoCard';
import { Library } from 'lucide-react';

export const UserBiblioteca = () => {
  const { company, user } = useAuth();
  const { repositories, orgUnits, orgTopLevels } = useAppStore();

  const libraryRepos = repositories.filter(r => {
     if (r.companyId !== company?.id || r.status !== 'ACTIVE' || r.type !== 'SIMPLE') return false;
     return checkRepoAccess(r, user, orgUnits, orgTopLevels);
  });

  return (
    <div className="pt-24 pb-12 px-4 md:px-12 max-w-7xl mx-auto min-h-screen">
      <div className="flex items-center gap-3 mb-8">
         <Library size={28} className="text-[var(--c-primary)]" />
         <h1 className="text-3xl font-bold text-white">Biblioteca</h1>
      </div>
      <p className="text-zinc-400 mb-8 max-w-2xl">Acesse repositórios ágeis contendo links úteis, planilhas organizadas e acessos rápidos aos documentos do dia a dia da empresa.</p>
      
      {libraryRepos.length > 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3 md:gap-5">
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