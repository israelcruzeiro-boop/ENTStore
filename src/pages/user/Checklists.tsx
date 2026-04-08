import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useChecklists, checklistActions, useUserSubmissions, useChecklistFolders } from '../../hooks/useChecklists';
import { 
  ClipboardCheck, 
  Play, 
  Clock, 
  CheckCircle2, 
  Search, 
  LayoutGrid, 
  ChevronRight, 
  ChevronLeft,
  AlertCircle,
  Pencil,
  Folder,
  FolderOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export const UserChecklists = () => {
  const { company, user } = useAuth();
  const { companySlug } = useParams();
  const navigate = useNavigate();
  const { checklists, isLoading } = useChecklists(company?.id);
  const { folders, isLoading: foldersLoading } = useChecklistFolders(company?.id);
  const { submissions: userSubmissions } = useUserSubmissions(user?.id, company?.id);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);

  const handleStart = async (checklistId: string) => {
    if (!user) return;
    try {
      const submission = await checklistActions.startSubmission(
        checklistId, 
        user.id, 
        company?.id || '', 
        user.org_unit_id
      );
      navigate(`/${companySlug}/checklists/${submission.id}`);
    } catch (err) {
      toast.error('Erro ao iniciar checklist');
    }
  };

  if (isLoading || foldersLoading) {
    return (
      <div className="pt-32 flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-[var(--c-primary)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Filtragem básica por permissões (Simplificada para o MVP)
  const availableChecklists = checklists.filter(c => {
    if (c.status !== 'ACTIVE') return false;

    // 1. Verifica Lista Negra (Usuários excluídos individualmente)
    if (user?.id && c.excluded_user_ids?.includes(user.id)) return false;

    // 2. Verifica Tipo de Acesso
    if (c.access_type === 'ALL') return true;

    // 3. Se Restrito, verifica Unidade, Região ou Usuário Permitido
    if (c.access_type === 'RESTRICTED') {
      const isUserAllowed = user?.id && c.allowed_user_ids?.includes(user.id);
      const isUnitAllowed = user?.org_unit_id && c.allowed_store_ids?.includes(user.org_unit_id);
      const isRegionAllowed = user?.org_top_level_id && c.allowed_region_ids?.includes(user.org_top_level_id);
      
      return isUserAllowed || isUnitAllowed || isRegionAllowed;
    }
    return false;
  });

  // Agrupamento por pastas
  const foldersWithChecklists = folders.map(f => ({
    ...f,
    checklists: availableChecklists.filter(c => c.folder_id === f.id)
  })).filter(f => f.checklists.length > 0);

  const rootChecklists = availableChecklists.filter(c => !c.folder_id);

  if (rootChecklists.length > 0) {
    foldersWithChecklists.push({
      id: 'root',
      company_id: company?.id || '',
      name: 'Diversos',
      color: '#64748B',
      checklists: rootChecklists
    });
  }

  const viewingChecklists = activeFolderId 
    ? foldersWithChecklists.find(f => f.id === activeFolderId)?.checklists || []
    : [];

  return (
    <div className="pt-24 pb-12 px-4 md:px-12 max-w-[1600px] mx-auto min-h-screen">
      <div className="flex items-center gap-4 mb-4">
        <ClipboardCheck size={36} className="text-[var(--c-primary)] drop-shadow-md" />
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-md">Meus Checklists</h1>
      </div>
      
      <p className="text-zinc-400 mb-10 max-w-3xl text-lg md:text-xl font-medium leading-relaxed">
        Listas de verificação, auditorias e formulários de conformidade para manter a excelência operacional.
      </p>

      {foldersWithChecklists.length > 0 ? (
        activeFolderId === null ? (
          // --- VISAO DE PASTAS ---
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xl font-black text-white mb-6 flex items-center gap-2"><FolderOpen className="text-blue-500" /> Categorias</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {foldersWithChecklists.map(folder => (
                <div 
                  key={folder.id}
                  onClick={() => setActiveFolderId(folder.id)}
                  className="group relative bg-gradient-to-br from-zinc-900 to-black border border-white/10 rounded-3xl p-8 hover:border-[var(--c-primary)]/50 transition-all duration-300 cursor-pointer overflow-hidden shadow-2xl hover:-translate-y-1"
                >
                  <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-30 transition-opacity">
                    <Folder size={120} />
                  </div>
                  <div className="relative z-10 flex items-center justify-between">
                     <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center border border-white/5 group-hover:bg-[var(--c-primary)]/10 transition-colors">
                           <FolderOpen size={30} className="text-zinc-400 group-hover:text-[var(--c-primary)] transition-colors" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-black text-white mb-1 group-hover:text-[var(--c-primary)] transition-colors">{folder.name}</h3>
                          <p className="text-sm font-bold text-zinc-500">{folder.checklists.length} checklist(s)</p>
                        </div>
                     </div>
                     <ChevronRight className="text-zinc-600 group-hover:text-[var(--c-primary)] transition-transform group-hover:translate-x-2" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          // --- VISAO INTERNA DA PASTA ---
          <div className="animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="flex items-center justify-between mb-8">
              <div className="flex flex-col gap-2">
                <Button variant="ghost" onClick={() => setActiveFolderId(null)} className="w-fit text-zinc-400 hover:text-white px-0 font-bold hover:bg-transparent tracking-widest text-[10px] uppercase">
                  <ChevronLeft size={14} className="mr-1" /> Voltar para Pastas
                </Button>
                <h2 className="text-3xl font-black text-white flex items-center gap-3">
                  <FolderOpen className="text-[var(--c-primary)]" /> 
                  {foldersWithChecklists.find(f => f.id === activeFolderId)?.name}
                </h2>
              </div>
              <div className="relative max-w-sm w-full group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-[var(--c-primary)] transition-colors" size={20} />
                <Input 
                  placeholder="Buscar..." 
                  className="bg-white/5 border-white/10 pl-12 h-12 text-md rounded-xl focus:ring-[var(--c-primary)] focus:border-[var(--c-primary)] transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {viewingChecklists
                .filter(c => c.title.toLowerCase().includes(searchTerm.toLowerCase()))
                .map(checklist => (
                  <div 
                    key={checklist.id}
                    className="group relative bg-[#0a0a0a] border border-white/5 rounded-3xl p-6 hover:border-[var(--c-primary)]/50 hover:bg-white/[0.02] transition-all duration-500 cursor-pointer overflow-hidden shadow-xl"
                    onClick={() => handleStart(checklist.id)}
                  >
                    <div className="absolute top-0 right-0 -mr-12 -mt-12 w-32 h-32 bg-[var(--c-primary)] opacity-[0.03] rounded-full blur-3xl pointer-events-none transition-opacity group-hover:opacity-10"></div>
                    
                    <div className="relative z-10 flex flex-col h-full">
                       <div className="flex justify-between items-start mb-6">
                         <div className="w-12 h-12 rounded-xl bg-white/5 text-zinc-500 flex items-center justify-center group-hover:bg-[var(--c-primary)] group-hover:text-white transition-all duration-500 shadow-inner">
                            <LayoutGrid size={24} />
                         </div>
                       </div>

                       <h3 className="text-xl font-black text-white mb-3 group-hover:text-[var(--c-primary)] transition-colors leading-tight">
                         {checklist.title}
                       </h3>
                       
                       <p className="text-zinc-500 text-sm mb-8 line-clamp-2 font-medium">
                         {checklist.description || 'Auditoria oficial.'}
                       </p>

                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                           <div className="flex flex-col gap-1">
                              {userSubmissions.some(s => s.checklist_id === checklist.id) ? (
                                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#FFF] bg-[var(--c-primary)]/20 px-2 py-1 rounded">
                                   <Pencil size={12} />
                                   <span>Em Andamento</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                   <Clock size={12} />
                                   <span>Módulo Ativo</span>
                                </div>
                              )}
                           </div>
                           <div className="flex items-center gap-1 text-[var(--c-primary)] font-black text-sm group-hover:translate-x-1 transition-transform">
                              {userSubmissions.some(s => s.checklist_id === checklist.id) ? 'Continuar' : 'Iniciar'} <ChevronRight size={16} />
                           </div>
                        </div>
                    </div>
                  </div>
                ))}
            </div>
            
            {viewingChecklists.filter(c => c.title.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
              <div className="py-20 text-center text-zinc-500 font-medium">
                Nenhum checklist encontrado com a busca "{searchTerm}" nesta pasta.
              </div>
            )}
          </div>
        )
      ) : (
        <div className="py-24 flex flex-col items-center justify-center text-center">
           <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center text-zinc-700 mb-8 border border-white/5">
              <FolderOpen size={48} />
           </div>
           <h2 className="text-2xl font-black text-white mb-3">Nenhuma pasta disponível</h2>
           <p className="text-zinc-500 max-w-sm">Sua empresa ainda não disponibilizou checklists.</p>
        </div>
      )}
    </div>
  );
};
