import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useOrgStructure, useRepositories } from '../../hooks/usePlatformData';
import { checkRepoAccess } from '../../lib/permissions';
import { RepoCard } from '../../components/user/RepoCard';
import { MonitorPlay, LayoutGrid, Music, PlaySquare, Folder, Library } from 'lucide-react';
import { UserPageShell } from '../../components/user/UserPageShell';
import { UserPageHeader } from '../../components/user/UserPageHeader';
import { UserSegmentedTabs, type UserTab } from '../../components/user/UserSegmentedTabs';
import { UserEmptyState } from '../../components/user/UserEmptyState';

type HubTab = 'ALL' | 'FULL' | 'SIMPLE' | 'PLAYLIST' | 'VIDEO_PLAYLIST';

const hubTabs: UserTab<HubTab>[] = [
  { value: 'ALL', label: 'Todos', icon: LayoutGrid },
  { value: 'FULL', label: 'Trilhas & Cursos', icon: Folder },
  { value: 'SIMPLE', label: 'Biblioteca', icon: Library },
  { value: 'VIDEO_PLAYLIST', label: 'Vídeos', icon: PlaySquare },
  { value: 'PLAYLIST', label: 'Áudios', icon: Music },
];

export const UserHub = () => {
  const { company, user } = useAuth();
  const [activeTab, setActiveTab] = useState<HubTab>('ALL');

  const { repositories, isLoading: loadingRepos } = useRepositories(company?.id);
  const { orgUnits, orgTopLevels, isLoading: loadingOrg } = useOrgStructure(company?.id);

  const isLoading = loadingRepos || loadingOrg;

  const allHubRepos = repositories.filter(r => {
    if (r.company_id !== company?.id || r.status !== 'ACTIVE') return false;
    if (r.type !== 'FULL' && r.type !== 'SIMPLE' && r.type !== 'PLAYLIST' && r.type !== 'VIDEO_PLAYLIST' && r.type !== undefined) return false;
    return checkRepoAccess(r, user, orgUnits, orgTopLevels);
  });

  const filteredRepos = allHubRepos.filter(r => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'FULL') return r.type === 'FULL' || r.type === undefined;
    if (activeTab === 'SIMPLE') return r.type === 'SIMPLE';
    if (activeTab === 'PLAYLIST') return r.type === 'PLAYLIST';
    if (activeTab === 'VIDEO_PLAYLIST') return r.type === 'VIDEO_PLAYLIST';
    return true;
  });

  return (
    <UserPageShell loading={isLoading}>
      <UserPageHeader
        icon={MonitorPlay}
        title="Hub de Repositórios"
        subtitle="Acesse trilhas, bibliotecas, vídeos e playlists disponibilizados pela sua empresa em um só lugar."
      />

      <UserSegmentedTabs tabs={hubTabs} active={activeTab} onChange={(v) => setActiveTab(v as HubTab)} />

      {filteredRepos.length > 0 ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4 md:gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {filteredRepos.map(repo => (
            <RepoCard key={repo.id} repo={repo} fullWidth />
          ))}
        </div>
      ) : (
        <UserEmptyState
          icon={MonitorPlay}
          title="Sem repositórios"
          message="Sua empresa ainda não disponibilizou repositórios para o seu acesso."
        />
      )}
    </UserPageShell>
  );
};
