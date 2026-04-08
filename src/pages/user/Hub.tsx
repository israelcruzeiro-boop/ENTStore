import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useOrgStructure, useRepositories } from '../../hooks/useSupabaseData';
import { checkRepoAccess } from '../../lib/permissions';
import { RepoCard } from '../../components/user/RepoCard';
import { MonitorPlay, LayoutGrid, Music, PlaySquare, Folder } from 'lucide-react';

export const UserHub = () => {
  const { company, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'ALL' | 'FULL' | 'PLAYLIST' | 'VIDEO_PLAYLIST'>('ALL');

  // SWR Hooks para dados do Supabase
  const { repositories, isLoading: loadingRepos } = useRepositories(company?.id);
  const { orgUnits, orgTopLevels, isLoading: loadingOrg } = useOrgStructure(company?.id);

  const isLoading = loadingRepos || loadingOrg;

  const allHubRepos = repositories.filter(r => {
    if (r.company_id !== company?.id || r.status !== 'ACTIVE') return false;
    if (r.type !== 'FULL' && r.type !== 'PLAYLIST' && r.type !== 'VIDEO_PLAYLIST' && r.type !== undefined) return false;

    return checkRepoAccess(r, user, orgUnits, orgTopLevels);
  });

  const filteredRepos = allHubRepos.filter(r => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'FULL') return r.type === 'FULL' || r.type === undefined;
    if (activeTab === 'PLAYLIST') return r.type === 'PLAYLIST';
    if (activeTab === 'VIDEO_PLAYLIST') return r.type === 'VIDEO_PLAYLIST';
    return true;
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
        <MonitorPlay size={32} className="text-[var(--c-primary)] drop-shadow-md" />
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-md">Hubs de Conteúdo</h1>
      </div>
      <p className="text-zinc-300 mb-8 max-w-3xl text-lg md:text-xl font-medium leading-relaxed drop-shadow-sm">Trilhas de aprendizado, cursos e conteúdos estruturados que vão impulsionar seus conhecimentos.</p>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-10 border-b border-white/5 pb-6">
        <button
          onClick={() => setActiveTab('ALL')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm transition-all duration-300 ${activeTab === 'ALL' ? 'bg-[var(--c-primary)] text-white shadow-[0_0_20px_rgba(var(--c-primary-rgb),0.3)]' : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'}`}
        >
          <LayoutGrid size={16} /> Todos
        </button>
        <button
          onClick={() => setActiveTab('FULL')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm transition-all duration-300 ${activeTab === 'FULL' ? 'bg-[var(--c-primary)] text-white shadow-[0_0_20px_rgba(var(--c-primary-rgb),0.3)]' : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'}`}
        >
          <Folder size={16} /> Trilhas & Cursos
        </button>
        <button
          onClick={() => setActiveTab('VIDEO_PLAYLIST')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm transition-all duration-300 ${activeTab === 'VIDEO_PLAYLIST' ? 'bg-[var(--c-primary)] text-white shadow-[0_0_20px_rgba(var(--c-primary-rgb),0.3)]' : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'}`}
        >
          <PlaySquare size={16} /> Vídeos
        </button>
        <button
          onClick={() => setActiveTab('PLAYLIST')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm transition-all duration-300 ${activeTab === 'PLAYLIST' ? 'bg-[var(--c-primary)] text-white shadow-[0_0_20px_rgba(var(--c-primary-rgb),0.3)]' : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'}`}
        >
          <Music size={16} /> Áudios
        </button>
      </div>

      {filteredRepos.length > 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4 md:gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {filteredRepos.map(repo => (
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