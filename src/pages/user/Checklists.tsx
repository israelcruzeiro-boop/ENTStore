import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useOrgStructure } from '../../hooks/usePlatformData';
import { useChecklists, checklistActions, useUserSubmissions, useReadableChecklistFolders } from '../../hooks/useChecklists';
import { checkChecklistAccess } from '../../lib/permissions';
import type { Checklist, ChecklistFolder, ChecklistSubmission } from '../../types';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FolderOpen,
  Gauge,
  Layers3,
  ListChecks,
  RotateCcw,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { ActionPlans } from './ActionPlans';
import { UserPageShell } from '../../components/user/UserPageShell';
import { UserPageHeader } from '../../components/user/UserPageHeader';
import { UserSearchField } from '../../components/user/UserSearchField';
import { UserSegmentedTabs, type UserTab } from '../../components/user/UserSegmentedTabs';
import { UserEmptyState } from '../../components/user/UserEmptyState';

type ChecklistTab = 'CHECKLISTS' | 'ACTION_PLANS';
type StatusFilter = 'ALL' | 'PENDING' | 'IN_PROGRESS';
type FolderView = ChecklistFolder & { checklists: Checklist[] };

const checklistTabs: UserTab<ChecklistTab>[] = [
  { value: 'CHECKLISTS', label: 'Meus Checklists', icon: ClipboardCheck },
  { value: 'ACTION_PLANS', label: 'Planos de Ação', icon: AlertCircle },
];

const statusFilters: Array<{ id: StatusFilter; label: string; icon: typeof ListChecks }> = [
  { id: 'ALL', label: 'Todos', icon: ListChecks },
  { id: 'PENDING', label: 'Pendentes', icon: Clock3 },
  { id: 'IN_PROGRESS', label: 'Em andamento', icon: RotateCcw },
];

const normalizeText = (value?: string | null) => (value || '').toLowerCase().trim();

const getLatestSubmission = (submissions: ChecklistSubmission[], checklistId: string) => (
  submissions
    .filter(submission => submission.checklist_id === checklistId)
    .sort((a, b) => new Date(b.updated_at || b.created_at || b.started_at).getTime() - new Date(a.updated_at || a.created_at || a.started_at).getTime())[0]
);

const formatDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(date);
};

interface ChecklistCardProps {
  checklist: Checklist;
  folder?: ChecklistFolder;
  submission?: ChecklistSubmission;
  onOpen: (checklist: Checklist) => void;
}

const ChecklistCard = ({ checklist, folder, submission, onOpen }: ChecklistCardProps) => {
  const isInProgress = submission?.status === 'IN_PROGRESS';
  const lastActivity = formatDate(submission?.updated_at || submission?.created_at || submission?.started_at);

  return (
    <button
      type="button"
      onClick={() => onOpen(checklist)}
      className="audit-file-card user-card user-template-panel group relative min-h-[238px] overflow-hidden rounded-2xl border p-5 text-left transition-all duration-300 hover:-translate-y-1 hover:border-[var(--c-primary)]/45 focus:outline-none focus:ring-2 focus:ring-[var(--c-primary)]/50"
    >
      <div className="relative z-10 flex h-full flex-col justify-between gap-5">
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="audit-file-icon flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-[var(--c-primary)] transition-transform duration-300 group-hover:scale-105">
                <ClipboardCheck size={24} />
              </div>
              <div className="min-w-0">
                <p className="theme-subtle-text text-[10px] font-black uppercase tracking-[0.18em]">
                  {folder?.name || 'Sem pasta'}
                </p>
                <h3 className="mt-1 line-clamp-2 text-lg font-black leading-tight text-[var(--c-text)] transition-colors group-hover:text-[var(--c-primary)]">
                  {checklist.title}
                </h3>
              </div>
            </div>

            <span className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${
              isInProgress
                ? 'bg-amber-500/12 text-amber-400'
                : 'bg-[rgb(var(--c-text-rgb)/0.06)] theme-muted-text'
            }`}>
              {isInProgress ? 'Em andamento' : 'Pendente'}
            </span>
          </div>

          <p className="line-clamp-3 text-sm leading-relaxed theme-muted-text">
            {checklist.description || 'Checklist disponível para execução. Abra para iniciar a verificação.'}
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="user-chip theme-surface-soft inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold">
              <ShieldCheck size={13} className="text-[var(--c-primary)]" />
              Acesso liberado
            </span>
            {lastActivity && (
              <span className="user-chip theme-surface-soft inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold">
                <Clock3 size={13} className="text-amber-400" />
                {lastActivity}
              </span>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-[rgb(var(--c-text-rgb)/0.08)] pt-4">
            <span className="text-xs font-black uppercase tracking-wider text-[var(--c-primary)]">
              {isInProgress ? 'Continuar' : 'Iniciar'}
            </span>
            <ArrowRight size={18} className="text-[var(--c-primary)] transition-transform group-hover:translate-x-1" />
          </div>
        </div>
      </div>
    </button>
  );
};

interface FolderChipProps {
  folder: FolderView;
  active: boolean;
  onClick: () => void;
  inProgressCount: number;
}

const FolderChip = ({ folder, active, onClick, inProgressCount }: FolderChipProps) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={`audit-folder-button flex min-h-[128px] min-w-[232px] flex-col justify-end text-left transition-all duration-300 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-[var(--c-primary)]/50 ${
      active ? 'is-active' : ''
    }`}
  >
    <div className="audit-folder-content flex min-w-0 items-end justify-between gap-4">
      <div className="min-w-0">
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.15] text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.22)]">
          <FolderOpen size={23} />
        </div>
        <p className="truncate text-base font-black text-white">{folder.name}</p>
        <p className="mt-1 text-xs font-bold text-white/75">
          {folder.checklists.length} checklist{folder.checklists.length === 1 ? '' : 's'}
        </p>
      </div>
      {inProgressCount > 0 && (
        <span className="rounded-full bg-white/[0.15] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white">
          {inProgressCount}
        </span>
      )}
    </div>
  </button>
);

export const UserChecklists = () => {
  const { company, user } = useAuth();
  const { companySlug } = useParams();
  const navigate = useNavigate();
  const { checklists, isLoading } = useChecklists(company?.id);
  const { folders, isLoading: foldersLoading } = useReadableChecklistFolders(company?.id);
  const { submissions: userSubmissions, isLoading: submissionsLoading } = useUserSubmissions(user?.id, company?.id);
  const { orgUnits, orgTopLevels, isLoading: orgLoading } = useOrgStructure(company?.id);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFolderId, setActiveFolderId] = useState<string | null>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [activeTab, setActiveTab] = useState<ChecklistTab>('CHECKLISTS');

  const submissionByChecklistId = useMemo(() => {
    const lookup = new Map<string, ChecklistSubmission>();
    userSubmissions.forEach((submission) => {
      const current = lookup.get(submission.checklist_id);
      if (!current) {
        lookup.set(submission.checklist_id, submission);
        return;
      }

      const currentTime = new Date(current.updated_at || current.created_at || current.started_at).getTime();
      const nextTime = new Date(submission.updated_at || submission.created_at || submission.started_at).getTime();
      if (nextTime > currentTime) lookup.set(submission.checklist_id, submission);
    });
    return lookup;
  }, [userSubmissions]);

  const availableChecklists = useMemo(() => (
    checklists.filter(c => {
      if (c.company_id !== company?.id || c.status !== 'ACTIVE') return false;
      return checkChecklistAccess(c, user, orgUnits, orgTopLevels);
    })
  ), [checklists, company?.id, user, orgUnits, orgTopLevels]);

  const foldersWithChecklists = useMemo<FolderView[]>(() => {
    const visibleFolders = folders
      .map(folder => ({
        ...folder,
        checklists: availableChecklists.filter(checklist => checklist.folder_id === folder.id),
      }))
      .filter(folder => folder.checklists.length > 0);

    const rootChecklists = availableChecklists.filter(checklist => !checklist.folder_id);
    if (rootChecklists.length === 0) return visibleFolders;

    return [
      ...visibleFolders,
      {
        id: 'root',
        company_id: company?.id || '',
        name: 'Sem pasta',
        color: '#64748B',
        checklists: rootChecklists,
      },
    ];
  }, [folders, availableChecklists, company?.id]);

  const query = normalizeText(searchTerm);
  const selectedFolder = activeFolderId && activeFolderId !== 'ALL'
    ? foldersWithChecklists.find(folder => folder.id === activeFolderId)
    : null;

  const filteredChecklists = availableChecklists.filter(checklist => {
    const folder = foldersWithChecklists.find(item => item.checklists.some(c => c.id === checklist.id));
    const inProgress = submissionByChecklistId.has(checklist.id);
    const matchesFolder = !selectedFolder || folder?.id === selectedFolder.id;
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'IN_PROGRESS' && inProgress) ||
      (statusFilter === 'PENDING' && !inProgress);
    const matchesSearch =
      !query ||
      normalizeText(checklist.title).includes(query) ||
      normalizeText(checklist.description).includes(query) ||
      normalizeText(folder?.name).includes(query);

    return matchesFolder && matchesStatus && matchesSearch;
  });

  const inProgressChecklists = availableChecklists.filter(checklist => submissionByChecklistId.has(checklist.id));
  const pendingChecklists = availableChecklists.filter(checklist => !submissionByChecklistId.has(checklist.id));
  const folderInProgressCounts = new Map<string, number>(
    foldersWithChecklists.map(folder => [
      folder.id,
      folder.checklists.filter(checklist => submissionByChecklistId.has(checklist.id)).length,
    ]),
  );

  const handleOpen = async (checklist: Checklist) => {
    const existingSubmission = getLatestSubmission(userSubmissions, checklist.id);
    if (existingSubmission) {
      navigate(`/${companySlug}/checklists/${existingSubmission.id}`);
      return;
    }

    if (!user) return;
    try {
      const submission = await checklistActions.startSubmission(
        checklist.id,
        user.id,
        company?.id || '',
        user.org_unit_id,
      );
      navigate(`/${companySlug}/checklists/${submission.id}`);
    } catch (err) {
      toast.error('Erro ao iniciar checklist');
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setActiveFolderId('ALL');
    setStatusFilter('ALL');
  };

  return (
    <UserPageShell loading={isLoading || foldersLoading || submissionsLoading || orgLoading} className="space-y-7">
      <UserPageHeader
        icon={ClipboardCheck}
        title="Central de Auditoria"
        subtitle="Abra suas pastas de auditoria, continue rotinas em andamento e encontre cada checklist digital sem perder tempo."
        action={
          <UserSearchField
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Buscar checklists..."
          />
        }
      />

      <UserSegmentedTabs
        tabs={checklistTabs}
        active={activeTab}
        onChange={(v) => setActiveTab(v as ChecklistTab)}
      />

      {activeTab === 'ACTION_PLANS' ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <ActionPlans />
        </div>
      ) : availableChecklists.length > 0 ? (
        <div className="space-y-7 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <section className="audit-folder-hero user-template-panel relative overflow-hidden rounded-3xl border p-5 md:p-7">
            <div className="relative z-10 grid gap-5 md:grid-cols-[1.15fr_0.85fr] md:items-end">
              <div>
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/[0.15] bg-white/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-white/80">
                  <FolderOpen size={14} />
                  Arquivo digital
                </div>
                <h2 className="max-w-3xl text-3xl font-black tracking-tight text-white md:text-5xl">
                  {inProgressChecklists.length > 0 ? 'Você tem auditorias em andamento' : 'Tudo pronto para a próxima verificação'}
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/75 md:text-base">
                  Cada pasta mostra somente checklists liberados para você. Use coleções, status e busca para chegar direto na rotina certa.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="audit-folder-metric rounded-2xl p-4">
                  <Gauge className="mb-3 text-white" size={22} />
                  <p className="text-2xl font-black text-white">{availableChecklists.length}</p>
                  <p className="text-xs font-bold uppercase tracking-wider text-white/70">Liberados</p>
                </div>
                <div className="audit-folder-metric rounded-2xl p-4">
                  <RotateCcw className="mb-3 text-amber-400" size={22} />
                  <p className="text-2xl font-black text-white">{inProgressChecklists.length}</p>
                  <p className="text-xs font-bold uppercase tracking-wider text-white/70">Em andamento</p>
                </div>
                <div className="audit-folder-metric rounded-2xl p-4">
                  <Clock3 className="mb-3 text-white" size={22} />
                  <p className="text-2xl font-black text-white">{pendingChecklists.length}</p>
                  <p className="text-xs font-bold uppercase tracking-wider text-white/70">Pendentes</p>
                </div>
                <div className="audit-folder-metric rounded-2xl p-4">
                  <Layers3 className="mb-3 text-white" size={22} />
                  <p className="text-2xl font-black text-white">{foldersWithChecklists.length}</p>
                  <p className="text-xs font-bold uppercase tracking-wider text-white/70">Coleções</p>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="theme-subtle-text text-[11px] font-black uppercase tracking-[0.22em]">Filtros rápidos</p>
                <h2 className="user-section-title text-xl font-black">Coleções e status</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {statusFilters.map(filter => {
                  const Icon = filter.icon;
                  const active = statusFilter === filter.id;
                  return (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => setStatusFilter(filter.id)}
                      aria-pressed={active}
                      className={`user-chip inline-flex min-h-12 items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[var(--c-primary)]/50 ${
                        active ? 'bg-[var(--c-primary)] text-white' : 'theme-surface-soft hover:border-[var(--c-primary)]/35'
                      }`}
                    >
                      <Icon size={15} />
                      {filter.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar snap-x">
              <FolderChip
                folder={{
                  id: 'ALL',
                  company_id: company?.id || '',
                  name: 'Todas as coleções',
                  checklists: availableChecklists,
                }}
                active={activeFolderId === 'ALL'}
                onClick={() => setActiveFolderId('ALL')}
                inProgressCount={inProgressChecklists.length}
              />
              {foldersWithChecklists.map(folder => (
                <FolderChip
                  key={folder.id}
                  folder={folder}
                  active={activeFolderId === folder.id}
                  onClick={() => setActiveFolderId(folder.id)}
                  inProgressCount={folderInProgressCounts.get(folder.id) || 0}
                />
              ))}
            </div>
          </section>

          <section className="audit-folder-stage user-template-panel relative overflow-hidden rounded-3xl border p-4 md:p-6">
            <div className="relative z-10 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="theme-subtle-text text-[11px] font-black uppercase tracking-[0.22em]">
                  {selectedFolder ? selectedFolder.name : 'Todos os checklists'}
                </p>
                <h2 className="user-section-title text-2xl font-black">
                  {filteredChecklists.length} resultado{filteredChecklists.length === 1 ? '' : 's'}
                </h2>
              </div>
              {(query || activeFolderId !== 'ALL' || statusFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="w-fit text-sm font-black text-[var(--c-primary)] transition-opacity hover:opacity-75"
                >
                  Limpar filtros
                </button>
              )}
            </div>

            {filteredChecklists.length > 0 ? (
              <div className="relative z-10 mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filteredChecklists.map(checklist => {
                  const folder = foldersWithChecklists.find(item => item.checklists.some(c => c.id === checklist.id));
                  return (
                    <ChecklistCard
                      key={checklist.id}
                      checklist={checklist}
                      folder={folder}
                      submission={submissionByChecklistId.get(checklist.id)}
                      onOpen={handleOpen}
                    />
                  );
                })}
              </div>
            ) : (
              <UserEmptyState
                icon={Search}
                title="Nenhum checklist encontrado"
                message="Ajuste a busca ou os filtros para visualizar outros checklists liberados para você."
                action={
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="rounded-full bg-[var(--c-primary)] px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
                  >
                    Limpar filtros
                  </button>
                }
              />
            )}
          </section>
        </div>
      ) : (
        <UserEmptyState
          icon={CheckCircle2}
          title="Nenhum checklist disponível"
          message="Sua empresa ainda não disponibilizou checklists para o seu acesso."
        />
      )}
    </UserPageShell>
  );
};
