import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useChecklists, checklistActions, useChecklistFolders } from '../../hooks/useChecklists';
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  ClipboardCheck,
  Settings,
  Trash2,
  Eye,
  CheckCircle2,
  AlertCircle,
  Users,
  TrendingUp,
  ArrowRight,
  FolderPlus,
  FolderOpen,
  Clock,
  FolderMinus,
  Pencil,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAllSubmissions } from '../../hooks/useChecklists';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useOrgStructure, useUsers } from '../../hooks/useSupabaseData';
import { Checklist, ChecklistQuestion, ChecklistSection, ChecklistQuestionType } from '../../types';
import * as XLSX from 'xlsx';
import { Joyride } from 'react-joyride';
import { useTour } from '../../hooks/useTour';
import { CHECKLISTS_STEPS, CHECKLIST_CONFIG_STEPS } from '../../data/tourSteps';
import { HelpCircle } from 'lucide-react';

interface FolderWithChecklists {
  id: string;
  name: string;
  checklists: Checklist[];
}

export const AdminChecklists = () => {
  const { companySlug } = useParams();
  const navigate = useNavigate();
  const { company, user } = useAuth();
  const { checklists, isLoading, mutate } = useChecklists(company?.id);
  const { folders, mutate: mutateFolders } = useChecklistFolders(company?.id);
  const { orgTopLevels, orgUnits } = useOrgStructure(company?.id);
  const { users } = useUsers(company?.id);

  // Tour Guiado (Tutorial) - Hook Rule: Must be at the top level
  const { startTour, joyrideProps } = useTour(CHECKLISTS_STEPS);
  const { startTour: configStartTour, joyrideProps: configJoyrideProps } = useTour(CHECKLIST_CONFIG_STEPS);

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('templates');
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);

  const foldersWithChecklists: FolderWithChecklists[] = folders.map(f => ({
      id: f.id,
      name: f.name,
      checklists: checklists.filter(c => c.folder_id === f.id)
  }));

  const unassigned = checklists.filter(c => !c.folder_id);
  if (unassigned.length > 0) {
      foldersWithChecklists.push({ id: 'unassigned', name: 'Avulsos (Sem Pasta)', checklists: unassigned });
  }

  const viewingChecklists = activeFolderId === null 
    ? [] 
    : checklists.filter(c => activeFolderId === 'unassigned' ? !c.folder_id : c.folder_id === activeFolderId);

  // Form State
  const [formData, setFormData] = useState<Partial<Checklist>>({
    title: '',
    description: '',
    status: 'DRAFT',
    access_type: 'ALL',
    folder_id: undefined,
    allowed_region_ids: [],
    allowed_store_ids: [],
    allowed_user_ids: [],
    excluded_user_ids: []
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  const openSettings = (checklist: Checklist) => {
    setEditingId(checklist.id);
    setFormData({
      title: checklist.title,
      description: checklist.description || '',
      status: checklist.status,
      access_type: checklist.access_type,
      folder_id: checklist.folder_id || undefined,
      allowed_region_ids: checklist.allowed_region_ids || [],
      allowed_store_ids: checklist.allowed_store_ids || [],
      allowed_user_ids: checklist.allowed_user_ids || [],
      excluded_user_ids: checklist.excluded_user_ids || []
    });
    setIsModalOpen(true);
  };

  const handleSaveChecklist = async () => {
    if (!formData.title) {
      toast.error('O título é obrigatório');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingId) {
        await checklistActions.updateChecklist(editingId, formData);
        toast.success('Configurações atualizadas!');
      } else {
        const newChecklist = await checklistActions.createChecklist({
          ...formData,
          company_id: company?.id
        });
        toast.success('Checklist criado! Redirecionando para o editor...');
        navigate(`/admin/${companySlug}/checklists/${newChecklist.id}/builder`);
      }

      setIsModalOpen(false);
      mutate();
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error('Erro: ' + err.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir permanentemente este checklist?')) return;
    try {
      await checklistActions.deleteChecklist(id);
      toast.success('Checklist excluído');
      mutate();
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error('Erro ao excluir: ' + err.message);
      }
    }
  };

  const handleSaveFolder = async () => {
    if (!folderName.trim()) return;
    setIsSubmitting(true);
    try {
      if (editingFolderId) {
        await checklistActions.updateFolder(editingFolderId, { name: folderName });
        toast.success('Pasta atualizada com sucesso!');
      } else {
        await checklistActions.createFolder({ company_id: company?.id, name: folderName });
        toast.success('Pasta criada com sucesso!');
      }
      setFolderName('');
      setEditingFolderId(null);
      setIsFolderModalOpen(false);
      mutateFolders();
    } catch (err: unknown) {
      if (err instanceof Error) toast.error('Erro ao salvar pasta: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditFolder = (folder: ChecklistFolder) => {
    setEditingFolderId(folder.id);
    setFolderName(folder.name);
    setIsFolderModalOpen(true);
  };

  const handleDeleteFolder = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Tem certeza que deseja excluir esta pasta? Modelos internos ficarão sem pasta associada.')) return;
    try {
      await checklistActions.deleteFolder(id);
      toast.success('Pasta excluída com sucesso!');
      if (activeFolderId === id) setActiveFolderId(null);
      mutateFolders();
      mutate();
    } catch (err: unknown) {
      if (err instanceof Error) toast.error('Erro ao excluir: ' + err.message);
    }
  };

  const [isImporting, setIsImporting] = useState(false);

  const downloadTemplate = () => {
    const templateData = [
      {
        'Nome do Checklist': 'Auditoria de PDV Semanal',
        'Fase/Sub-tema': 'Limpeza',
        'Pergunta': 'O chão está brilhando?',
        'Tipo (Código)': 1
      },
      {
        'Nome do Checklist': 'Auditoria de PDV Semanal',
        'Fase/Sub-tema': 'Atendimento',
        'Pergunta': 'Nota de satisfação do cliente',
        'Tipo (Código)': 3
      }
    ];

    const legendData = [
      { 'Código': 1, 'Tipo': 'Conformidade (SIM/NÃO/NA)' },
      { 'Código': 2, 'Tipo': 'Texto Aberto' },
      { 'Código': 3, 'Tipo': 'Valor Numérico' },
      { 'Código': 4, 'Tipo': 'Data (Dia/Mês/Ano)' },
      { 'Código': 5, 'Tipo': 'Horário (HH:mm)' }
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wsLegend = XLSX.utils.json_to_sheet(legendData);

    XLSX.utils.book_append_sheet(wb, ws, 'Checklist');
    XLSX.utils.book_append_sheet(wb, wsLegend, 'Legenda de Tipos');

    XLSX.writeFile(wb, 'modelo_checklist_storepage.xlsx');
    toast.info('Modelo baixado! Preencha e suba no Modo Rápido.');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<Record<string, string | number>>(ws);

        if (data.length === 0) throw new Error('Planilha vazia');

        // Pega o nome do checklist da primeira linha
        const checklistName = data[0]['Nome do Checklist'] || 'Importado via Planilha';

        // 1. Cria o Checklist
        const newChecklist = await checklistActions.createChecklist({
          title: checklistName,
          company_id: company?.id,
          status: 'DRAFT',
          access_type: 'ALL'
        });

        // 2. Processa Fases e Perguntas
        const sectionsMap: Record<string, string> = {};
        const typeMap: Record<number, string> = {
          1: 'COMPLIANCE',
          2: 'TEXT',
          3: 'NUMBER',
          4: 'DATE',
          5: 'TIME'
        };

        for (const [idx, row] of data.entries()) {
          const phaseName = row['Fase/Sub-tema'] || 'Geral';
          const questionText = row['Pergunta'];
          const typeCode = row['Tipo (Código)'] || 1;

          if (!questionText) continue;

          // Cria seção se não existir
          let sectionId = sectionsMap[phaseName];
          if (!sectionId && phaseName !== 'Geral') {
            const newSection = await checklistActions.createSection(
              newChecklist.id,
              phaseName,
              Object.keys(sectionsMap).length
            );
            sectionId = newSection.id;
            sectionsMap[phaseName] = sectionId;
          }

          // Cria Pergunta
          await checklistActions.createQuestion({
            checklist_id: newChecklist.id,
            section_id: sectionId,
            text: questionText,
            type: (typeMap[typeCode as number] || 'COMPLIANCE') as ChecklistQuestionType,
            order_index: idx
          });
        }

        toast.success('Importação magistral concluída!');
        setIsModalOpen(false);
        mutate();
        navigate(`/admin/${companySlug}/checklists/${newChecklist.id}/builder`);

      } catch (err: unknown) {
        if (err instanceof Error) {
          toast.error('Erro ao processar planilha: ' + err.message);
        }
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleCreateNew = async () => {
    if (!formData.title) {
      toast.error('O título é obrigatório');
      return;
    }

    setIsSubmitting(true);
    try {
      const newChecklist = await checklistActions.createChecklist({
        ...formData,
        company_id: company?.id
      });

      toast.success('Checklist criado! Redirecionando para o editor...');
      setIsModalOpen(false);
      mutate();

      // Redireciona para o Builder (que vamos criar)
      navigate(`/admin/${companySlug}/checklists/${newChecklist.id}/builder`);
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error('Erro ao criar checklist: ' + err.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleArrayItem = (arrayName: keyof Checklist, value: string) => {
    const currentArray = (formData[arrayName] as string[]) || [];
    const isRemoving = currentArray.includes(value);

    const newFormData = { ...formData };
    
    if (isRemoving) {
      // Se estiver removendo, limpa os dependentes
      const newArray = currentArray.filter(i => i !== value);
      (newFormData as Record<string, string[]>)[arrayName] = newArray;

      if (arrayName === 'allowed_region_ids') {
        // Remove unidades que pertencem a esta região
        const unitsToRemove = orgUnits.filter(u => u.parent_id === value).map(u => u.id);
        newFormData.allowed_store_ids = (formData.allowed_store_ids || []).filter(id => !unitsToRemove.includes(id));
        
        // Remove usuários que pertencem a esta região (diretamente ou via unidades da região)
        const usersToRemove = users.filter(u => u.org_top_level_id === value || unitsToRemove.includes(u.org_unit_id)).map(u => u.id);
        newFormData.excluded_user_ids = (formData.excluded_user_ids || []).filter(id => !usersToRemove.includes(id));
      } else if (arrayName === 'allowed_store_ids') {
        // Remove usuários desta unidade específica
        const usersToRemove = users.filter(u => u.org_unit_id === value).map(u => u.id);
        newFormData.excluded_user_ids = (formData.excluded_user_ids || []).filter(id => !usersToRemove.includes(id));
      }
    } else {
      (newFormData as Record<string, string[]>)[arrayName] = [...currentArray, value];
    }

    setFormData(newFormData);
  };


  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Render methods

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <Joyride {...joyrideProps} />
      <Joyride {...configJoyrideProps} />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 tour-checklists-header">
        <div className="flex items-center gap-4 tour-checklist-header">
          <div className="w-16 h-16 rounded-3xl bg-blue-600 text-white flex items-center justify-center shadow-xl shadow-blue-500/20">
            <ClipboardCheck size={32} />
          </div>
          <div>
            <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tighter">Módulo de Checklists</h1>
            <p className="text-slate-500 font-bold ml-1 text-sm">Gestão magistral de conformidade e auditoria de campo.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" className="text-blue-600 font-bold hover:bg-blue-50 h-14 rounded-2xl" onClick={startTour}>
            <HelpCircle size={18} className="mr-2" /> Como funciona?
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(`/admin/${companySlug}/checklists/dashboard`)}
            className="bg-white border-slate-200 text-slate-700 font-black px-6 h-14 rounded-2xl shadow-sm hover:bg-slate-50 transition-all font-bold"
          >
            <TrendingUp size={20} className="mr-2 text-emerald-500" /> Dashboard
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setEditingFolderId(null);
              setFolderName('');
              setIsFolderModalOpen(true);
            }}
            className="bg-white border-blue-200 text-blue-700 font-black px-6 h-14 rounded-2xl shadow-sm hover:bg-blue-50 transition-all tour-checklist-folders"
          >
            <FolderPlus size={20} className="mr-2" /> Nova Pasta
          </Button>
          <Button
            onClick={() => {
              setEditingId(null);
              setFormData({
                title: '',
                description: '',
                status: 'DRAFT',
                access_type: 'ALL',
                folder_id: undefined,
                allowed_region_ids: [],
                allowed_store_ids: [],
                allowed_user_ids: [],
                excluded_user_ids: []
              });
              setIsModalOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-black px-8 h-14 rounded-2xl shadow-xl shadow-blue-500/20 text-lg transition-all active:scale-95 border-none tour-checklist-create"
          >
            <Plus size={24} className="mr-2" /> Novo Checklist
          </Button>
        </div>
      </div>

      {/* Tabs Principais */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex items-center justify-between border-b border-slate-100 bg-white/50 px-1 rounded-2xl mb-8">
           <TabsList className="bg-transparent h-14 gap-8">
             <TabsTrigger 
               value="templates" 
               className="data-[state=active]:bg-transparent data-[state=active]:text-blue-600 data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-blue-600 rounded-none px-2 font-black uppercase text-[10px] tracking-widest transition-all"
             >
               Modelos de Checklist
             </TabsTrigger>
             <TabsTrigger 
               value="history" 
               className="tour-checklist-history data-[state=active]:bg-transparent data-[state=active]:text-blue-600 data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-blue-600 rounded-none px-2 font-black uppercase text-[10px] tracking-widest transition-all"
             >
               Histórico de Auditorias
             </TabsTrigger>
           </TabsList>
           
           <div className="hidden md:flex items-center gap-4 px-4">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Total de Registros: {checklists.length}</span>
           </div>
        </div>

        <TabsContent value="templates" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500 tour-checklist-list">
           {/* Filters & Search */}
           <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
             <div className="relative flex-1 w-full">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
               <Input
                 placeholder="Buscar por título ou descrição..."
                 className="pl-10 border-slate-100 focus:ring-blue-500 font-bold text-slate-900"
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
               />
             </div>
             <Button variant="outline" className="border-slate-100 text-slate-600 shrink-0 font-bold rounded-xl">
               <Filter size={18} className="mr-2" /> Filtrar
             </Button>
           </div>
           
           {activeFolderId === null ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {foldersWithChecklists.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase())).map(folder => (
                  <div 
                    key={folder.id} 
                    className="group bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden p-6 relative"
                    onClick={() => setActiveFolderId(folder.id)}
                  >
                     <div className="flex justify-between items-start mb-6 relative">
                       <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                          <FolderOpen size={28} />
                       </div>
                       {folder.id !== 'unassigned' && (
                         <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openEditFolder(folder); }} className="h-9 w-9 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl">
                               <Pencil size={18} />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={(e) => handleDeleteFolder(folder.id, e)} className="h-9 w-9 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl">
                               <Trash2 size={18} />
                            </Button>
                         </div>
                       )}
                     </div>
                     <h3 className="text-xl font-black text-slate-900 group-hover:text-blue-600 transition-colors mb-2 pr-4">{folder.name}</h3>
                     <p className="text-xs font-bold text-slate-500 bg-slate-50 py-1.5 px-3 rounded-full inline-flex items-center gap-2">
                       <ClipboardCheck size={14} /> {folder.checklists.length} checklist(s)
                     </p>
                     
                     <ChevronRight className="absolute right-6 bottom-6 text-slate-300 group-hover:text-blue-600 transition-transform group-hover:translate-x-1" size={20} />
                  </div>
                ))}
             </div>
           ) : (
             <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
               <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
                 <Button variant="ghost" onClick={() => setActiveFolderId(null)} className="text-slate-500 hover:text-blue-600 hover:bg-blue-50 font-bold uppercase tracking-widest text-[10px] rounded-xl px-3 py-2 h-auto">
                   <ChevronLeft size={16} className="mr-1" /> Voltar para Pastas
                 </Button>
                 <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                   <FolderOpen className="text-blue-600" size={28} /> 
                   {foldersWithChecklists.find(f => f.id === activeFolderId)?.name}
                 </h2>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                 {viewingChecklists.filter(c => c.title.toLowerCase().includes(searchTerm.toLowerCase())).map(item => (
                    <div key={item.id} className="group bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden">
                       <div className="p-6">
                          <div className="flex justify-between items-start mb-4">
                             <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${item.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                {item.status === 'ACTIVE' ? 'Ativo' : 'Rascunho'}
                             </div>
                             <div className="flex gap-1 opacity-10 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="icon" onClick={() => openSettings(item)} className="h-9 w-9 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl">
                                   <Settings size={18} />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="h-9 w-9 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl">
                                   <Trash2 size={18} />
                                </Button>
                             </div>
                          </div>
                          <h3 className="text-xl font-black text-slate-900 group-hover:text-blue-600 transition-colors mb-2 pr-2">{item.title}</h3>
                          
                          <p className="text-sm font-medium text-slate-500 line-clamp-2 mb-6">{item.description || 'Sem descrição definida.'}</p>
                          
                          <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                             <div className="flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                <span className="flex items-center gap-1.5"><ClipboardCheck size={14} className="text-blue-500" /> Modelagem</span>
                                <span className="flex items-center gap-1.5"><Users size={14} className="text-slate-500" /> {item.access_type === 'RESTRICTED' ? 'Restrito' : 'Público'}</span>
                             </div>
                             <Button variant="ghost" size="sm" className="text-blue-600 font-black hover:bg-blue-50 rounded-xl uppercase text-[10px] tracking-widest" onClick={() => navigate(`/admin/${companySlug}/checklists/${item.id}/builder`)}>
                                Editar Builder
                             </Button>
                          </div>
                       </div>
                    </div>
                 ))}
                 
                 {viewingChecklists.length === 0 && (
                   <div className="col-span-full py-12 text-center bg-slate-50 border border-dashed border-slate-200 rounded-3xl">
                     <FolderOpen className="text-slate-300 mx-auto mb-3" size={48} />
                     <p className="text-slate-500 font-bold">Nenhum checklist nesta pasta.</p>
                     <Button 
                       variant="link" 
                       className="text-blue-600 mt-2 font-black text-xs uppercase tracking-widest"
                       onClick={() => {
                         setEditingId(null);
                         setFormData({
                           title: '',
                           description: '',
                           status: 'DRAFT',
                           access_type: 'ALL',
                           folder_id: activeFolderId === 'unassigned' ? undefined : activeFolderId,
                           allowed_region_ids: [],
                           allowed_store_ids: [],
                           allowed_user_ids: [],
                           excluded_user_ids: []
                         });
                         setIsModalOpen(true);
                       }}
                     >
                       Adicionar Checklist Aqui
                     </Button>
                   </div>
                 )}
               </div>
             </div>
           )}
        </TabsContent>

        <TabsContent value="history" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
           <AdminChecklistHistory />
        </TabsContent>
      </Tabs>

      {/* Modal de Criar Pasta */}
      <Dialog open={isFolderModalOpen} onOpenChange={setIsFolderModalOpen}>
        <DialogContent className="max-w-md bg-white p-6 rounded-3xl border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-2">
              <FolderPlus className="text-blue-500" /> {editingFolderId ? "Editar Pasta" : "Nova Pasta"}
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              {editingFolderId ? "Atualize o nome da pasta de checklists." : "Crie uma pasta para organizar seus checklists e agrupar auditorias logicamente."}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label className="font-bold text-[10px] uppercase tracking-widest text-slate-500">Nome da Categoria/Pasta</Label>
              <Input 
                placeholder="Ex: Qualidade & Segurança" 
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                className="h-12 border-slate-200 focus:ring-blue-500"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsFolderModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveFolder} disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 px-6">
              {isSubmitting ? 'Salvando...' : editingFolderId ? 'Salvar Edição' : 'Criar Pasta'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Configurações */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent 
          className="max-w-2xl bg-white p-0 overflow-hidden rounded-3xl border-none shadow-2xl tour-checklist-settings-modal"
          onInteractOutside={(e) => {
            // Impede o fechamento do modal se a interação for com o balão do tour (Joyride)
            // O Joyride usa as classes "__joyride-tooltip__" e ".joyride-beacon" em seus elementos
            const target = e.target as HTMLElement;
            if (target?.closest('.joyride-tooltip') || target?.closest('.__joyride-tooltip__')) {
              e.preventDefault();
            }
          }}
        >
          <DialogHeader className="p-8 bg-slate-900 text-white relative">
            <DialogTitle className="text-2xl font-black tracking-tight flex items-center gap-2">
              <Plus className="text-blue-400" /> {editingId ? 'Editar Configurações' : 'Criar Novo Checklist'}
            </DialogTitle>
            <DialogDescription className="text-slate-400 font-medium">
              {editingId ? 'Atualize as informações e permissões deste checklist.' : 'Configure as informações básicas e o direcionamento antes de iniciar a construção.'}
            </DialogDescription>
            <Button variant="ghost" size="sm" onClick={configStartTour} className="absolute top-8 right-8 text-slate-300 hover:text-white hover:bg-slate-800">
              <HelpCircle size={16} className="mr-1" /> Ajuda
            </Button>
          </DialogHeader>

          <Tabs defaultValue="basic" className="w-full">
            <div className="px-8 border-b border-slate-100 bg-slate-50/50">
              <TabsList className="bg-transparent h-12 gap-8">
                <TabsTrigger value="basic" className="data-[state=active]:bg-transparent data-[state=active]:text-blue-600 data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-blue-600 rounded-none px-0 font-bold">1. Informações Básicas</TabsTrigger>
                <TabsTrigger value="access" className="tour-checklist-settings-access data-[state=active]:bg-transparent data-[state=active]:text-blue-600 data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-blue-600 rounded-none px-0 font-bold">2. Público & Acesso</TabsTrigger>
              </TabsList>
            </div>

            <div className="p-8 max-h-[60vh] overflow-y-auto">
              <TabsContent value="basic" className="space-y-6 mt-0">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-bold uppercase text-[10px] tracking-widest">Status de Ativação</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(val: 'DRAFT' | 'ACTIVE' | 'ARCHIVED') => setFormData({ ...formData, status: val })}
                    >
                      <SelectTrigger className={`h-12 rounded-xl border-none font-bold text-white transition-all ${formData.status === 'ACTIVE' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-500 hover:bg-amber-600'}`}>
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DRAFT">Rascunho (Privado)</SelectItem>
                        <SelectItem value="ACTIVE">Ativo (Visível para Usuários Permitidos)</SelectItem>
                        <SelectItem value="ARCHIVED">Arquivado (Histórico)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-700 font-bold uppercase text-[10px] tracking-widest">Título do Checklist</Label>
                    <Input
                      placeholder="Ex: Auditoria de PDV Semanal"
                      className="h-12 rounded-xl border-slate-200 focus:ring-blue-500 font-bold text-slate-900"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-slate-700 font-bold uppercase text-[10px] tracking-widest">Pasta (Opcional)</Label>
                    <Select
                      value={formData.folder_id || "none"}
                      onValueChange={(val: string) => setFormData({ ...formData, folder_id: val === "none" ? undefined : val })}
                    >
                      <SelectTrigger className="h-12 rounded-xl border-slate-200 font-bold text-slate-900 focus:ring-blue-500">
                        <SelectValue placeholder="Selecione uma pasta..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem pasta (Diretório Raiz)</SelectItem>
                        {folders.map(f => (
                          <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700 font-bold uppercase text-[10px] tracking-widest">Descrição (Opcional)</Label>
                    <textarea
                      placeholder="Explique o objetivo desta checagem..."
                      className="w-full min-h-[100px] p-4 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-medium"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl border border-blue-100 bg-blue-50/30 flex flex-col gap-1 cursor-pointer">
                    <p className="text-xs font-black text-blue-900 uppercase">Manual</p>
                    <p className="text-[10px] text-blue-700 font-medium">Perguntas, Fases e Seções Dinâmicas.</p>
                  </div>
                  <div
                    onClick={() => document.getElementById('excel-import')?.click()}
                    className="p-4 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 transition-all flex flex-col gap-1 cursor-pointer relative overflow-hidden group"
                  >
                    <div className="flex justify-between items-start">
                      <p className="text-xs font-black text-slate-900 group-hover:text-blue-900 uppercase">Importação via Planilha</p>
                      <button
                        onClick={(e) => { e.stopPropagation(); downloadTemplate(); }}
                        className="text-[10px] font-black underline text-blue-600 hover:text-blue-800"
                      >
                        Baixar Modelo
                      </button>
                    </div>
                    <p className="text-[10px] text-zinc-500 font-medium">Importação massiva via Excel.</p>
                    <input
                      id="excel-import"
                      type="file"
                      accept=".xlsx, .xls"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={isImporting}
                    />
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-amber-50 border border-amber-100 space-y-3 shadow-inner">
                   <p className="text-[10px] font-black text-amber-900 uppercase tracking-widest flex items-center gap-2">
                     <AlertCircle size={14} className="text-amber-600" /> Legenda de Tipos para Planilha (Coluna Código)
                   </p>
                   <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-amber-200 text-amber-900 flex items-center justify-center text-[9px] font-black">1</div>
                        <span className="text-[10px] font-bold text-amber-700">Conformidade (SIM/NÃO/NA)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-amber-200 text-amber-900 flex items-center justify-center text-[9px] font-black">2</div>
                        <span className="text-[10px] font-bold text-amber-700">Texto Aberto</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-amber-200 text-amber-900 flex items-center justify-center text-[9px] font-black">3</div>
                        <span className="text-[10px] font-bold text-amber-700">Valor Numérico</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-amber-200 text-amber-900 flex items-center justify-center text-[9px] font-black">4</div>
                        <span className="text-[10px] font-bold text-amber-700">Data (dd/mm/aaaa)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-amber-200 text-amber-900 flex items-center justify-center text-[9px] font-black">5</div>
                        <span className="text-[10px] font-bold text-amber-700">Horário (HH:mm)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-amber-200 text-amber-900 flex items-center justify-center text-[9px] font-black">6</div>
                        <span className="text-[10px] font-bold text-amber-700">Check (Apenas Check)</span>
                      </div>
                   </div>
                </div>
              </TabsContent>

              <TabsContent value="access" className="space-y-6 mt-0">
                <div className="space-y-2">
                  <Label className="text-slate-700 font-bold uppercase text-[10px] tracking-widest">Tipo de Acesso</Label>
                  <Select
                    value={formData.access_type}
                    onValueChange={(val: 'ALL' | 'RESTRICTED') => setFormData({ ...formData, access_type: val })}
                  >
                    <SelectTrigger className="h-12 rounded-xl border-slate-200 font-bold text-slate-900">
                      <SelectValue placeholder="Selecione o acesso" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Público (Todos da Empresa)</SelectItem>
                      <SelectItem value="RESTRICTED">Restrito (Direcionado)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.access_type === 'RESTRICTED' && (
                  <div className="space-y-6 animate-in slide-in-from-top-2 duration-300">
                    <div className="space-y-3">
                      <Label className="text-slate-700 font-bold text-[10px] uppercase tracking-widest text-blue-600">Direcionar por {company?.org_top_level_name || 'Região'}</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {orgTopLevels.map(lvl => (
                          <div key={lvl.id} className="flex items-center space-x-2 p-3 rounded-xl bg-slate-50 border border-slate-100">
                            <Checkbox
                              id={`lvl-${lvl.id}`}
                              checked={formData.allowed_region_ids?.includes(lvl.id)}
                              onCheckedChange={() => toggleArrayItem('allowed_region_ids', lvl.id)}
                            />
                            <label htmlFor={`lvl-${lvl.id}`} className="text-xs font-bold text-slate-600 cursor-pointer">{lvl.name}</label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {formData.allowed_region_ids && formData.allowed_region_ids.length > 0 && (
                      <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-300">
                        <Label className="text-slate-700 font-bold text-[10px] uppercase tracking-widest text-blue-600">Direcionar por {company?.org_unit_name || 'Unidade'} (Nível 3)</Label>
                        <div className="grid grid-cols-2 gap-2 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
                          {orgUnits.filter(u => formData.allowed_region_ids?.includes(u.parent_id)).map(unit => (
                            <div key={unit.id} className="flex items-center space-x-2 p-3 rounded-xl bg-slate-50 border border-slate-100">
                              <Checkbox
                                id={`unit-${unit.id}`}
                                checked={formData.allowed_store_ids?.includes(unit.id)}
                                onCheckedChange={() => toggleArrayItem('allowed_store_ids', unit.id)}
                              />
                              <label htmlFor={`unit-${unit.id}`} className="text-xs font-bold text-slate-600 cursor-pointer">{unit.name}</label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {((formData.allowed_region_ids && formData.allowed_region_ids.length > 0) || (formData.allowed_store_ids && formData.allowed_store_ids.length > 0)) && (
                      <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-300 pt-4 border-t border-slate-100">
                        <Label className="text-rose-600 font-black text-[10px] uppercase tracking-widest flex items-center gap-2">
                          <Users size={14} /> Bloquear Usuários Específicos
                        </Label>
                        <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                          {users.filter(u => {
                            // Se tem unidades selecionadas, filtra por elas
                            if (formData.allowed_store_ids && formData.allowed_store_ids.length > 0) {
                              return formData.allowed_store_ids.includes(u.org_unit_id);
                            }
                            // Se não tem unidades, filtra pelas regiões
                            return formData.allowed_region_ids?.includes(u.org_top_level_id);
                          }).map(user => (
                            <div key={user.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 group">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-400">
                                  {user.name.charAt(0)}
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-slate-700">{user.name}</p>
                                  <p className="text-[9px] font-medium text-slate-400 uppercase tracking-tighter">
                                    {orgUnits.find(u => u.id === user.org_unit_id)?.name || 'Sem Unidade'}
                                  </p>
                                </div>
                              </div>
                              <Checkbox
                                id={`block-${user.id}`}
                                checked={formData.excluded_user_ids?.includes(user.id)}
                                onCheckedChange={() => toggleArrayItem('excluded_user_ids', user.id)}
                                className="border-rose-200 data-[state=checked]:bg-rose-600 data-[state=checked]:border-rose-600"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            </div>

            <DialogFooter className="p-8 bg-slate-50 mt-0 flex-col sm:flex-row gap-4 border-t border-slate-200">
              <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="font-bold text-slate-500 rounded-xl">Cancelar</Button>
              <Button
                onClick={handleSaveChecklist}
                className="bg-blue-600 hover:bg-blue-700 font-black rounded-xl px-8 h-12 shadow-lg shadow-blue-500/20 uppercase text-[10px] tracking-widest"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Salvando...' : editingId ? 'Atualizar' : 'Criar Checklist'}
                <CheckCircle2 size={18} className="ml-2" />
              </Button>
            </DialogFooter>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Stats Cards (Premium) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <ClipboardCheck size={28} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Modelos Ativos</p>
            <p className="text-3xl font-black text-slate-900 tracking-tighter">{checklists.filter(c => c.status === 'ACTIVE').length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock size={28} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Em Rascunho</p>
            <p className="text-3xl font-black text-slate-900 tracking-tighter">{checklists.filter(c => c.status === 'DRAFT').length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 size={28} />
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Taxa de Conclusão</p>
            <p className="text-3xl font-black text-slate-900 tracking-tighter">98.4%</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const AdminChecklistHistory = () => {
  const { company } = useAuth();
  const { submissions, isLoading } = useAllSubmissions(company?.id);
  const { checklists } = useChecklists(company?.id);
  const { users } = useUsers(company?.id);
  const navigate = useNavigate();
  const { companySlug } = useParams();

  if (isLoading) return <div className="py-20 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  // Helper para formatação segura de datas (evita RangeError no date-fns)
  const safeFormatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '--';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Data Inválida';
    return format(date, 'dd/MM/yyyy HH:mm', { locale: ptBR });
  };

  return (
    <div className="space-y-6">
       <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
         <div className="relative flex-1 w-full">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
           <Input
             placeholder="Buscar por auditor ou unidade..."
             className="pl-10 border-slate-100 font-bold text-slate-900 rounded-xl h-12"
           />
         </div>
         <Button variant="outline" className="border-slate-100 text-slate-600 font-bold rounded-xl h-12 px-6">
           <Filter size={18} className="mr-2" /> Filtrar Período
         </Button>
       </div>

       <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
             <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                   <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Auditoria</th>
                   <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Auditor</th>
                   <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Unidade</th>
                   <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                   <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</th>
                   <th className="px-6 py-4 text-right"></th>
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-50">
                {submissions.sort((a, b) => {
                   const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
                   const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
                   return (isNaN(dateB) ? 0 : dateB) - (isNaN(dateA) ? 0 : dateA);
                }).map(sub => {
                  const checklist = checklists.find(c => c.id === sub.checklist_id);
                  const auditor = users.find(u => u.id === sub.user_id);
                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/50 transition-colors group">
                       <td className="px-6 py-4">
                          <p className="text-sm font-black text-slate-900">{checklist?.title || 'Checklist Excluído'}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">ID: {sub.id?.slice(0,8) || '--'}</p>
                       </td>
                       <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                             <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-[10px] font-black uppercase">
                                {auditor?.name.charAt(0)}
                             </div>
                             <p className="text-xs font-bold text-slate-700">{auditor?.name}</p>
                          </div>
                       </td>
                       <td className="px-6 py-4">
                          <p className="text-xs font-bold text-slate-600">{sub.org_unit_id || 'Geral'}</p>
                       </td>
                       <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                            sub.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                          }`}>
                             {sub.status === 'COMPLETED' ? 'Concluída' : 'Em Andamento'}
                          </span>
                       </td>
                       <td className="px-6 py-4">
                          <p className="text-xs font-bold text-slate-600">{safeFormatDate(sub.created_at)}</p>
                       </td>
                       <td className="px-6 py-4 text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="opacity-0 group-hover:opacity-100 text-blue-600 font-black text-[10px] uppercase tracking-widest hover:bg-blue-50 rounded-xl transition-all"
                            onClick={() => navigate(`/admin/${companySlug}/checklists/submissions/${sub.id}`)}
                          >
                             Ver Detalhes <ArrowRight size={14} className="ml-2" />
                          </Button>
                       </td>
                    </tr>
                  );
                })}
                {submissions.length === 0 && (
                   <tr>
                      <td colSpan={6} className="py-20 text-center">
                         <p className="text-sm font-medium text-slate-400">Nenhuma auditoria registrada até o momento.</p>
                      </td>
                   </tr>
                )}
             </tbody>
          </table>
       </div>
    </div>
  );
};
