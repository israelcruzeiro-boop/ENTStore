import { useAuth } from '../../contexts/AuthContext';
import { useAppStore } from '../../store/useAppStore';
import { RepoCard } from '../../components/user/RepoCard';
import { MonitorPlay } from 'lucide-react';

export const UserHub = () => {
  const { company, user } = useAuth();
  const { repositories } = useAppStore();

  const hubRepos = repositories.filter(r => {
     if (r.companyId !== company?.id || r.status !== 'ACTIVE') return false;
     // Fallback: se o type não existir, considera como FULL (Hub)
     if (r.type !== 'FULL' && r.type !== undefined) return false;
     
     if (r.accessType === 'RESTRICTED' && user?.role === 'USER') {
         if (!r.allowedUserIds?.includes(user.id)) return false;
     }
     return true;
  });

  return (
    <div className="pt-24 pb-12 px-4 md:px-12 max-w-7xl mx-auto min-h-screen">
      <div className="flex items-center gap-3 mb-8">
         <MonitorPlay size={28} className="text-[var(--c-primary)]" />
         <h1 className="text-3xl font-bold text-white">Hubs de Conteúdo</h1>
      </div>
      <p className="text-zinc-400 mb-8 max-w-2xl">Trilhas de aprendizado, cursos e conteúdos estruturados que vão impulsionar seus conhecimentos.</p>
      
      {hubRepos.length > 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3 md:gap-5">
          {hubRepos.map(repo => (
            <div key={repo.id} className="w-full">
              <RepoCard repo={repo} fullWidth />
            </div>
          ))}
        </div>
      ) : (
        <div className="py-20 flex items-center justify-center flex-col text-zinc-500">
           <MonitorPlay size={48} className="mb-4 opacity-30" />
           <h2 className="text-xl font-bold text-white mb-2">Sem hubs</h2>
           <p>Sua empresa ainda não disponibilizou conteúdos estruturados aqui.</p>
        </div>
      )}
    </div>
  );
};