import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabaseClient';
import { useCompanies, useOrgStructure } from '../../hooks/useSupabaseData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Network, Save, Building2, Store, Edit2, Trash2, Plus, Loader2, FolderOpen, ChevronRight, Layers, HelpCircle } from 'lucide-react';
import { OrgTopLevel, OrgUnit } from '../../types';
import { orgTopLevelSchema, orgUnitSchema } from '../../types/schemas';
import { Logger } from '../../utils/logger';
import { Joyride } from 'react-joyride';
import { useTour } from '../../hooks/useTour';
import { STRUCTURE_STEPS } from '../../data/tourSteps';

export const AdminStructure = () => {
  const { companySlug } = useParams();
  
  const { companies, mutate: mutateCompanies } = useCompanies();
  const company = companies.find(c => c.link_name === companySlug || c.slug === companySlug);

  const { orgTopLevels: allTopLevels, orgUnits: allUnits, mutateTopLevels, mutateUnits, isLoading } = useOrgStructure(company?.id);

  // Tour Guiado (Tutorial)
  const { startTour, joyrideProps } = useTour(STRUCTURE_STEPS);

  // Estados Fixos para os 3 níveis
  const [l1, setL1] = useState({ active: false, id: 'level-1', name: 'Diretoria' });
  const [l2, setL2] = useState({ active: true, id: 'level-2', name: 'Regional' });
  const [l3Name, setL3Name] = useState('Unidade');

  const [activeTabIndex, setActiveTabIndex] = useState(0);

  const [isTopLevelFormOpen, setIsTopLevelFormOpen] = useState(false);
  const [editingTopLevelId, setEditingTopLevelId] = useState<string | null>(null);
  const [topLevelFormData, setTopLevelFormData] = useState({ name: '', parent_id: '', active: true });

  const [isUnitFormOpen, setIsUnitFormOpen] = useState(false);
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [unitFormData, setUnitFormData] = useState({ name: '', parent_id: '', active: true });

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{id: string, name: string, type: 'TOP_LEVEL' | 'UNIT'} | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedParentFilter, setSelectedParentFilter] = useState<string>('all');

  useEffect(() => {
    if (company) {
      setL3Name(company.org_unit_name || 'Unidade');
      const levels = company.org_levels || [];
      
      // Carregando do banco de forma retrocompatível
      if (levels.length === 2) {
        setL1({ active: true, id: levels[0].id, name: levels[0].name });
        setL2({ active: true, id: levels[1].id, name: levels[1].name });
      } else if (levels.length === 1) {
        if (levels[0].id === 'level-1') {
          setL1({ active: true, id: levels[0].id, name: levels[0].name });
          setL2(prev => ({ ...prev, active: false }));
        } else {
          setL1(prev => ({ ...prev, active: false }));
          setL2({ active: true, id: levels[0].id, name: levels[0].name });
        }
      } else if (levels.length === 0) {
        if (company.org_top_level_name) {
          // Legacy support
          setL1(prev => ({ ...prev, active: false }));
          setL2({ active: true, id: 'legacy', name: company.org_top_level_name });
        } else {
          setL1(prev => ({ ...prev, active: false }));
          setL2(prev => ({ ...prev, active: false }));
        }
      }
    }
  }, [company]);

  if (!company) {
    return (
      <div className="flex justify-center items-center h-48 text-slate-400">
         <Loader2 className="animate-spin" />
      </div>
    );
  }

  const handleCloseTopLevelForm = () => {
    setIsTopLevelFormOpen(false);
    setTimeout(() => {
      setEditingTopLevelId(null);
      setTopLevelFormData({ name: '', parent_id: '', active: true });
    }, 300);
  };

  const handleCloseUnitForm = () => {
    setIsUnitFormOpen(false);
    setTimeout(() => {
      setEditingUnitId(null);
      setUnitFormData({ name: '', parent_id: '', active: true });
    }, 300);
  };

  const handleCloseDelete = () => {
    setIsDeleteOpen(false);
    setTimeout(() => setItemToDelete(null), 300);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!l3Name.trim()) return toast.error("O nome do Nível 3 não pode ser vazio.");
    if (l1.active && !l1.name.trim()) return toast.error("Preencha o nome do Nível 1.");
    if (l2.active && !l2.name.trim()) return toast.error("Preencha o nome do Nível 2.");
    
    const newLevels = [];
    if (l1.active) newLevels.push({ id: l1.id, name: l1.name.trim() });
    if (l2.active) newLevels.push({ id: l2.id, name: l2.name.trim() });

    try {
      setIsSubmitting(true);
      const { error } = await supabase.from('companies').update({
        org_levels: newLevels,
        org_unit_name: l3Name.trim()
      }).eq('id', company.id);

      if (error) throw error;
      toast.success('Nomenclaturas da estrutura configuradas com sucesso!');
      mutateCompanies();
    } catch (err) {
      const error = err as Error;
      toast.error(`Erro ao salvar nomenclaturas: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mapeamento dos Níveis Ativos para o Passo 2
  const activeLevelsConfig = [];
  if (l1.active) activeLevelsConfig.push({ id: l1.id, name: l1.name, type: 'L1' });
  if (l2.active) activeLevelsConfig.push({ id: l2.id, name: l2.name, type: 'L2' });

  const lowestLevelConfig = activeLevelsConfig.length > 0 ? activeLevelsConfig[activeLevelsConfig.length - 1] : null;

  if (activeTabIndex >= activeLevelsConfig.length && activeLevelsConfig.length > 0) {
     setActiveTabIndex(Math.max(0, activeLevelsConfig.length - 1));
  }

  const currentActiveLevel = activeLevelsConfig[activeTabIndex];
  const activePreviousLevelConfig = activeTabIndex > 0 ? activeLevelsConfig[activeTabIndex - 1] : null;

  const companyTopLevels = allTopLevels.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const companyUnits = allUnits.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const currentGroups = currentActiveLevel 
    ? companyTopLevels.filter(t => t.level_id === currentActiveLevel.id || (!t.level_id && activeTabIndex === 0))
    : [];

  const parentOptionsForL2 = companyTopLevels.filter(t => t.level_id === l1.id || !t.level_id || t.id === topLevelFormData.parent_id);
  const parentOptionsForUnit = lowestLevelConfig
    ? companyTopLevels.filter(t => 
        t.level_id === lowestLevelConfig.id || 
        (!t.level_id && activeLevelsConfig[0]?.id === lowestLevelConfig.id) || 
        t.id === unitFormData.parent_id
      )
    : [];

  // ==== HANDLERS PARA TOP LEVELS (L1 e L2) ====
  const openCreateTopLevel = () => {
    setEditingTopLevelId(null);
    setTopLevelFormData({ name: '', parent_id: '', active: true });
    setIsTopLevelFormOpen(true);
  };

  const openEditTopLevel = (item: OrgTopLevel) => {
    setEditingTopLevelId(item.id);
    setTopLevelFormData({ name: item.name, parent_id: item.parent_id || '', active: item.active });
    setIsTopLevelFormOpen(true);
  };

  const handleSaveTopLevel = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = topLevelFormData.name.trim();

    if (!name) return toast.error('O Nome é obrigatório.');
    if (activePreviousLevelConfig && !topLevelFormData.parent_id) return toast.error(`Selecione a qual ${activePreviousLevelConfig.name} este registro pertence.`);

    try {
      setIsSubmitting(true);
      
      const payload = { 
        company_id: company.id,
        level_id: currentActiveLevel?.id || null,
        name, 
        parent_id: topLevelFormData.parent_id || null, 
        active: topLevelFormData.active 
      };

      const validation = editingTopLevelId 
        ? orgTopLevelSchema.partial().safeParse(payload)
        : orgTopLevelSchema.safeParse(payload);

      if (!validation.success) {
        return toast.error("Dados inválidos: " + validation.error.issues.map(i => i.message).join(', '));
      }

      if (editingTopLevelId) {
        const { error } = await supabase.from('org_top_levels').update(validation.data).eq('id', editingTopLevelId);
        if (error) throw error;
        toast.success(`${currentActiveLevel?.name} atualizado(a) com sucesso!`);
      } else {
        const { error } = await supabase.from('org_top_levels').insert(validation.data);
        if (error) throw error;
        toast.success(`${currentActiveLevel?.name} cadastrado(a) com sucesso!`);
      }
      mutateTopLevels();
      handleCloseTopLevelForm();
    } catch (err) {
      const error = err as Error;
      Logger.error(`Erro ao salvar grupo: ${error.message}`);
      toast.error(`Erro ao salvar grupo: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleOrgTopLevelStatus = async (id: string, active: boolean) => {
    try {
      const { error } = await supabase.from('org_top_levels').update({ active: !active }).eq('id', id);
      if (error) throw error;
      mutateTopLevels();
    } catch (err) {
      const error = err as Error;
      toast.error(`Erro ao alterar status: ${error.message}`);
    }
  };

  // ==== HANDLERS PARA UNIDADES (L3) ====
  const openCreateUnit = () => {
    setEditingUnitId(null);
    setUnitFormData({ name: '', parent_id: '', active: true });
    setIsUnitFormOpen(true);
  };

  const openEditUnit = (item: OrgUnit) => {
    setEditingUnitId(item.id);
    setUnitFormData({ name: item.name, parent_id: item.parent_id || '', active: item.active });
    setIsUnitFormOpen(true);
  };

  const handleSaveUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = unitFormData.name.trim();

    if (!name) return toast.error('O Nome é obrigatório.');
    if (lowestLevelConfig && !unitFormData.parent_id) return toast.error(`Selecione a qual ${lowestLevelConfig.name} esta unidade pertence.`);

    const isDuplicate = companyUnits.some(o => o.name.toLowerCase() === name.toLowerCase() && o.id !== editingUnitId);
    if (isDuplicate) return toast.error(`Já existe uma ${l3Name.toLowerCase()} com este nome nesta empresa.`);

    try {
      setIsSubmitting(true);
      
      const payload = { 
        company_id: company.id, 
        name, 
        parent_id: unitFormData.parent_id || null, 
        active: unitFormData.active 
      };

      const validation = editingUnitId
        ? orgUnitSchema.partial().safeParse(payload)
        : orgUnitSchema.safeParse(payload);

      if (!validation.success) {
        return toast.error("Dados inválidos: " + validation.error.issues.map(i => i.message).join(', '));
      }

      if (editingUnitId) {
        const { error } = await supabase.from('org_units').update(validation.data).eq('id', editingUnitId);
        if (error) throw error;
        toast.success(`${l3Name} atualizada!`);
      } else {
        const { error } = await supabase.from('org_units').insert(validation.data);
        if (error) throw error;
        toast.success(`${l3Name} cadastrada!`);
      }
      mutateUnits();
      handleCloseUnitForm();
    } catch (err) {
      const error = err as Error;
      Logger.error(`Erro ao salvar unidade: ${error.message}`);
      toast.error(`Erro ao salvar unidade: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleOrgUnitStatus = async (id: string, active: boolean) => {
    try {
      const { error } = await supabase.from('org_units').update({ active: !active }).eq('id', id);
      if (error) throw error;
      mutateUnits();
    } catch (err) {
      const error = err as Error;
      toast.error(`Erro ao alterar status: ${error.message}`);
    }
  };

  const confirmDelete = (id: string, name: string, type: 'TOP_LEVEL' | 'UNIT') => {
    setItemToDelete({ id, name, type });
    setIsDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (itemToDelete) {
      try {
        setIsSubmitting(true);
        // Implementação de Soft Delete
        const { error } = await supabase
          .from(itemToDelete.type === 'TOP_LEVEL' ? 'org_top_levels' : 'org_units')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', itemToDelete.id);

        if (error) throw error;
        
        if (itemToDelete.type === 'TOP_LEVEL') {
          mutateTopLevels();
          toast.success(`Registro removido da lista.`);
        } else {
          mutateUnits();
          toast.success(`Unidade removida da lista.`);
        }
      } catch (err) {
        const error = err as Error;
        Logger.error(`Erro ao excluir item da estrutura: ${error.message}`);
        toast.error(`Erro ao excluir: ${error.message}`);
      } finally {
        setIsSubmitting(false);
      }
    }
    handleCloseDelete();
  };

  // Rendering Loading state se os Níveis Organizacionais estiverem carregando e ainda nao existirem
  if (isLoading && companyTopLevels.length === 0 && companyUnits.length === 0 && !isSubmitting) {
    return (
      <div className="flex justify-center items-center h-48 text-slate-400">
         <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-12 space-y-8">
      <Joyride {...joyrideProps} />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 tour-structure-header">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Network className="text-indigo-600" size={28} />
            Estrutura Organizacional
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure a hierarquia em até 3 níveis e cadastre suas instâncias.
          </p>
        </div>
        <Button variant="ghost" size="sm" className="text-indigo-600 font-bold hover:bg-indigo-50" onClick={startTour}>
          <HelpCircle size={16} className="mr-1" /> Como funciona?
        </Button>
      </div>

      <form onSubmit={handleSaveSettings} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">Passo 1: Definir os Níveis da Hierarquia</h2>
          <p className="text-xs text-slate-500 mb-6">Ative e nomeie cada nível da sua estrutura organizacional.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Nível 1 */}
            <div className={`relative p-4 rounded-xl border-2 transition-all ${l1.active ? 'border-blue-300 bg-blue-50/50 shadow-sm' : 'border-slate-200 bg-slate-50/50 opacity-70'}`}>
               <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-black ${l1.active ? 'bg-blue-600 text-white' : 'bg-slate-300 text-white'}`}>1</span>
                    <div>
                      <p className="text-sm font-bold text-slate-800">Nível 1</p>
                      <p className="text-[10px] text-slate-400">Topo da hierarquia</p>
                    </div>
                  </div>
                  <Switch checked={l1.active} onCheckedChange={(c) => setL1({...l1, active: c})} disabled={isSubmitting} />
               </div>
               <Input 
                 placeholder="Ex: Diretoria, Região" 
                 value={l1.name} 
                 onChange={e => setL1({...l1, name: e.target.value})} 
                 disabled={!l1.active || isSubmitting} 
                 className={`text-sm font-semibold ${l1.active ? 'bg-white border-blue-200' : 'bg-slate-100 text-slate-400'}`}
               />
            </div>

            {/* Nível 2 */}
            <div className={`relative p-4 rounded-xl border-2 transition-all ${l2.active ? 'border-amber-300 bg-amber-50/50 shadow-sm' : 'border-slate-200 bg-slate-50/50 opacity-70'}`}>
               <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-black ${l2.active ? 'bg-amber-500 text-white' : 'bg-slate-300 text-white'}`}>2</span>
                    <div>
                      <p className="text-sm font-bold text-slate-800">Nível 2</p>
                      <p className="text-[10px] text-slate-400">Intermediário</p>
                    </div>
                  </div>
                  <Switch checked={l2.active} onCheckedChange={(c) => setL2({...l2, active: c})} disabled={isSubmitting} />
               </div>
               <Input 
                 placeholder="Ex: Regional, Área" 
                 value={l2.name} 
                 onChange={e => setL2({...l2, name: e.target.value})} 
                 disabled={!l2.active || isSubmitting} 
                 className={`text-sm font-semibold ${l2.active ? 'bg-white border-amber-200' : 'bg-slate-100 text-slate-400'}`}
               />
            </div>

            {/* Nível 3 */}
            <div className="relative p-4 rounded-xl border-2 border-emerald-300 bg-emerald-50/50 shadow-sm">
               <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-black bg-emerald-600 text-white">3</span>
                    <div>
                      <p className="text-sm font-bold text-slate-800">Nível 3</p>
                      <p className="text-[10px] text-slate-400">Base operacional</p>
                    </div>
                  </div>
                  <span className="text-[8px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Fixo</span>
               </div>
               <Input 
                 placeholder="Ex: Loja, Filial" 
                 value={l3Name} 
                 onChange={e => setL3Name(e.target.value)} 
                 disabled={isSubmitting}
                 className="text-sm font-semibold bg-white border-emerald-200"
               />
            </div>
          </div>
        </div>
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end">
          <Button type="submit" disabled={isSubmitting} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 px-5 text-xs">
            {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Salvar Configuração
          </Button>
        </div>
      </form>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Passo 2: Níveis Intermediários */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full min-h-[400px] tour-structure-toplevel">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50">
             <h2 className="text-base font-semibold text-slate-900 mb-3 flex items-center gap-2">
               <Layers size={18} className="text-indigo-500" /> Passo 2: Cadastrar Agrupamentos
             </h2>
             {activeLevelsConfig.length > 0 ? (
                <div className="flex gap-2 overflow-x-auto pb-1">
                   {activeLevelsConfig.map((lvl, index) => {
                      const isL1 = lvl.type === 'L1';
                      const colorClasses = activeTabIndex === index
                        ? (isL1 ? 'bg-blue-600 text-white shadow-sm' : 'bg-amber-500 text-white shadow-sm')
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50';
                      return (
                        <button 
                          type="button"
                          key={lvl.id} 
                          onClick={() => setActiveTabIndex(index)}
                          className={`px-3 py-1.5 text-xs font-bold rounded-md whitespace-nowrap transition-colors flex items-center gap-1.5 ${colorClasses}`}
                        >
                          <span className={`inline-flex items-center justify-center w-4 h-4 rounded text-[9px] font-black ${activeTabIndex === index ? 'bg-white/25' : (isL1 ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600')}`}>{isL1 ? '1' : '2'}</span>
                          {lvl.name}
                        </button>
                      );
                   })}
                </div>
             ) : (
                <p className="text-xs text-slate-500 italic mt-2">Nenhum nível foi ativado no Passo 1.</p>
             )}
          </div>
          
          {activeLevelsConfig.length > 0 && currentActiveLevel ? (
            <>
              <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-white">
                 <p className="text-xs font-medium text-slate-500">Exibindo: <strong className="text-slate-700">{currentActiveLevel.name}</strong></p>
                 <Button type="button" onClick={openCreateTopLevel} size="sm" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 h-7 text-xs">
                   <Plus size={12} className="mr-1" /> Novo(a)
                 </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {/* Se estiver na tab L2 e L1 estiver ativo, agrupa por Diretoria */}
                {currentActiveLevel.type === 'L2' && l1.active ? (
                  <div className="space-y-3">
                    {(() => {
                      const l1Parents = companyTopLevels.filter(t => t.level_id === l1.id || (!t.level_id && activeLevelsConfig[0]?.id === l1.id));
                      const l2WithParent = l1Parents.filter(p => currentGroups.some(g => g.parent_id === p.id));
                      const l2Unlinked = currentGroups.filter(g => !g.parent_id || !l1Parents.find(p => p.id === g.parent_id));
                      
                      return (
                        <>
                          {l2WithParent.map(parentItem => {
                            const children = currentGroups.filter(g => g.parent_id === parentItem.id);
                            return (
                              <div key={parentItem.id} className="rounded-lg border border-slate-200 overflow-hidden">
                                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50/70 border-b border-blue-100">
                                  <FolderOpen size={14} className="text-blue-500" />
                                  <span className="text-xs font-bold text-blue-700">{parentItem.name}</span>
                                  <span className="text-[10px] text-slate-400 ml-auto">{children.length} {currentActiveLevel.name.toLowerCase()}{children.length !== 1 ? 's' : ''}</span>
                                </div>
                                <div className="divide-y divide-slate-100 bg-white">
                                  {children.map(item => {
                                    const childCount = companyUnits.filter(u => u.parent_id === item.id).length;
                                    return (
                                      <div key={item.id} className={`group flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-slate-50 ${!item.active ? 'opacity-50' : ''}`}>
                                        <div className="flex items-center gap-2 text-slate-300 shrink-0">
                                          <ChevronRight size={12} />
                                        </div>
                                        <div className={`shrink-0 w-6 h-6 rounded-md flex items-center justify-center ${item.active ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
                                          <FolderOpen size={12} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium text-slate-800 truncate">{item.name}</p>
                                          {childCount > 0 && (
                                            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-600">
                                              {childCount} {l3Name.toLowerCase()}{childCount !== 1 ? 's' : ''}
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <Switch checked={item.active} onCheckedChange={() => toggleOrgTopLevelStatus(item.id, item.active)} />
                                          <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-blue-600" onClick={() => openEditTopLevel(item)}><Edit2 size={12} /></Button>
                                          <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-red-500" onClick={() => confirmDelete(item.id, item.name, 'TOP_LEVEL')}><Trash2 size={12} /></Button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                          
                          {l2Unlinked.length > 0 && (
                            <div className="rounded-lg border border-dashed border-slate-300 overflow-hidden">
                              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50/70 border-b border-slate-200">
                                <FolderOpen size={14} className="text-slate-400" />
                                <span className="text-xs font-bold text-slate-500">Sem vínculo</span>
                                <span className="text-[10px] text-slate-400 ml-auto">{l2Unlinked.length}</span>
                              </div>
                              <div className="divide-y divide-slate-100 bg-white">
                                {l2Unlinked.map(item => {
                                  const childCount = companyUnits.filter(u => u.parent_id === item.id).length;
                                  return (
                                    <div key={item.id} className={`group flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-slate-50 ${!item.active ? 'opacity-50' : ''}`}>
                                      <div className="flex items-center gap-2 text-slate-300 shrink-0">
                                        <ChevronRight size={12} />
                                      </div>
                                      <div className={`shrink-0 w-6 h-6 rounded-md flex items-center justify-center ${item.active ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
                                        <FolderOpen size={12} />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-800 truncate">{item.name}</p>
                                        {childCount > 0 && (
                                          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-600">
                                            {childCount} {l3Name.toLowerCase()}{childCount !== 1 ? 's' : ''}
                                          </span>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Switch checked={item.active} onCheckedChange={() => toggleOrgTopLevelStatus(item.id, item.active)} />
                                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-blue-600" onClick={() => openEditTopLevel(item)}><Edit2 size={12} /></Button>
                                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-red-500" onClick={() => confirmDelete(item.id, item.name, 'TOP_LEVEL')}><Trash2 size={12} /></Button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          
                          {l2WithParent.length === 0 && l2Unlinked.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                              <Building2 size={28} className="mb-2 opacity-30" />
                              <p className="font-medium text-slate-500 text-sm">Nenhum(a) {currentActiveLevel.name}</p>
                              <p className="text-xs mt-1">Clique em "Novo(a)" para criar.</p>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  /* Lista flat para L1 ou quando não há nível anterior */
                  <>
                    {currentGroups.map(item => {
                       const isL1 = currentActiveLevel.type === 'L1';
                       const childCount = isL1 
                         ? companyTopLevels.filter(t => t.parent_id === item.id).length
                         : companyUnits.filter(u => u.parent_id === item.id).length;
                       return (
                         <div key={item.id} className={`group flex items-center gap-3 p-3 rounded-lg border transition-all hover:shadow-sm ${item.active ? 'border-slate-200 bg-white hover:border-slate-300' : 'border-slate-100 bg-slate-50/50 opacity-60'}`}>
                            <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${isL1 ? (item.active ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400') : (item.active ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400')}`}>
                              <FolderOpen size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-slate-900 text-sm truncate">{item.name}</p>
                              {childCount > 0 && (
                                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${isL1 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                  {childCount} {childCount === 1 ? 'item' : 'itens'}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Switch checked={item.active} onCheckedChange={() => toggleOrgTopLevelStatus(item.id, item.active)} />
                              <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-blue-600" onClick={() => openEditTopLevel(item)}><Edit2 size={13} /></Button>
                              <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-500" onClick={() => confirmDelete(item.id, item.name, 'TOP_LEVEL')}><Trash2 size={13} /></Button>
                            </div>
                         </div>
                       );
                    })}
                    {currentGroups.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                        <Building2 size={28} className="mb-2 opacity-30" />
                        <p className="font-medium text-slate-500 text-sm">Nenhum(a) {currentActiveLevel.name}</p>
                        <p className="text-xs mt-1">Clique em "Novo(a)" para criar.</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          ) : (
             <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 bg-slate-50/30">
                <Network size={32} className="mb-3 opacity-30" />
                <p className="font-medium text-sm">Nenhum agrupamento ativo.</p>
                <p className="text-xs mt-1">Ative Nível 1 ou 2 no Passo 1.</p>
             </div>
          )}
        </div>

        {/* Passo 3: Unidades (Agrupadas por Pai) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full min-h-[400px] tour-structure-unit">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50">
             <h2 className="text-base font-semibold text-slate-900 mb-1 flex items-center gap-2">
               <Store size={18} className="text-emerald-500" /> Passo 3: Cadastrar {l3Name}s
             </h2>
             <p className="text-[11px] text-slate-400">
               {lowestLevelConfig 
                 ? `Unidades agrupadas por ${lowestLevelConfig.name}`
                 : `As ${l3Name.toLowerCase()}s ficarão independentes.`}
             </p>
          </div>

          <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-white">
             <p className="text-xs text-slate-500 font-medium">{companyUnits.length} {l3Name.toLowerCase()}{companyUnits.length !== 1 ? 's' : ''} cadastrada{companyUnits.length !== 1 ? 's' : ''}</p>
             <Button type="button" onClick={openCreateUnit} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs">
               <Plus size={12} className="mr-1" /> Nova {l3Name}
             </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {lowestLevelConfig ? (
              <div className="space-y-4">
                {/* Unidades agrupadas por pai */}
                {(() => {
                  const parentGroups = parentOptionsForUnit.filter(p => companyUnits.some(u => u.parent_id === p.id));
                  const unlinkedUnits = companyUnits.filter(u => !u.parent_id || !parentOptionsForUnit.find(p => p.id === u.parent_id));
                  
                  return (
                    <>
                      {parentGroups.map(parentItem => {
                        const children = companyUnits.filter(u => u.parent_id === parentItem.id);
                        const isL1Parent = activeLevelsConfig.length === 2;
                        return (
                          <div key={parentItem.id} className="rounded-lg border border-slate-200 overflow-hidden">
                            {/* Header do grupo */}
                            <div className={`flex items-center gap-2 px-3 py-2 ${isL1Parent ? 'bg-amber-50/70 border-b border-amber-100' : 'bg-blue-50/70 border-b border-blue-100'}`}>
                              <FolderOpen size={14} className={isL1Parent ? 'text-amber-500' : 'text-blue-500'} />
                              <span className={`text-xs font-bold ${isL1Parent ? 'text-amber-700' : 'text-blue-700'}`}>{parentItem.name}</span>
                              <span className="text-[10px] text-slate-400 ml-auto">{children.length} {l3Name.toLowerCase()}{children.length !== 1 ? 's' : ''}</span>
                            </div>
                            {/* Unidades do grupo */}
                            <div className="divide-y divide-slate-100 bg-white">
                              {children.map(unit => (
                                <div key={unit.id} className={`group flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-slate-50 ${!unit.active ? 'opacity-50' : ''}`}>
                                  <div className="flex items-center gap-2 text-slate-300 shrink-0">
                                    <ChevronRight size={12} />
                                  </div>
                                  <div className={`shrink-0 w-6 h-6 rounded-md flex items-center justify-center ${unit.active ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                    <Store size={12} />
                                  </div>
                                  <p className="flex-1 text-sm font-medium text-slate-800 truncate">{unit.name}</p>
                                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Switch checked={unit.active} onCheckedChange={() => toggleOrgUnitStatus(unit.id, unit.active)} />
                                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-blue-600" onClick={() => openEditUnit(unit)}><Edit2 size={12} /></Button>
                                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-red-500" onClick={() => confirmDelete(unit.id, unit.name, 'UNIT')}><Trash2 size={12} /></Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                      
                      {/* Unidades sem vínculo */}
                      {unlinkedUnits.length > 0 && (
                        <div className="rounded-lg border border-dashed border-slate-300 overflow-hidden">
                          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50/70 border-b border-slate-200">
                            <Store size={14} className="text-slate-400" />
                            <span className="text-xs font-bold text-slate-500">Sem vínculo</span>
                            <span className="text-[10px] text-slate-400 ml-auto">{unlinkedUnits.length}</span>
                          </div>
                          <div className="divide-y divide-slate-100 bg-white">
                            {unlinkedUnits.map(unit => (
                              <div key={unit.id} className={`group flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-slate-50 ${!unit.active ? 'opacity-50' : ''}`}>
                                <div className="flex items-center gap-2 text-slate-300 shrink-0">
                                  <ChevronRight size={12} />
                                </div>
                                <div className={`shrink-0 w-6 h-6 rounded-md flex items-center justify-center ${unit.active ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                  <Store size={12} />
                                </div>
                                <p className="flex-1 text-sm font-medium text-slate-800 truncate">{unit.name}</p>
                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Switch checked={unit.active} onCheckedChange={() => toggleOrgUnitStatus(unit.id, unit.active)} />
                                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-blue-600" onClick={() => openEditUnit(unit)}><Edit2 size={12} /></Button>
                                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-red-500" onClick={() => confirmDelete(unit.id, unit.name, 'UNIT')}><Trash2 size={12} /></Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {parentGroups.length === 0 && unlinkedUnits.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                          <Store size={28} className="mb-2 opacity-30" />
                          <p className="font-medium text-slate-500 text-sm">Nenhuma {l3Name.toLowerCase()} cadastrada</p>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            ) : (
              /* Sem níveis superiores — lista simples */
              <div className="space-y-2">
                {companyUnits.map(unit => (
                  <div key={unit.id} className={`group flex items-center gap-3 p-3 rounded-lg border transition-all hover:shadow-sm ${unit.active ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50/50 opacity-60'}`}>
                    <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${unit.active ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                      <Store size={16} />
                    </div>
                    <p className="flex-1 text-sm font-semibold text-slate-900 truncate">{unit.name}</p>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Switch checked={unit.active} onCheckedChange={() => toggleOrgUnitStatus(unit.id, unit.active)} />
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-blue-600" onClick={() => openEditUnit(unit)}><Edit2 size={13} /></Button>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-500" onClick={() => confirmDelete(unit.id, unit.name, 'UNIT')}><Trash2 size={13} /></Button>
                    </div>
                  </div>
                ))}
                {companyUnits.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <Store size={28} className="mb-2 opacity-30" />
                    <p className="font-medium text-slate-500 text-sm">Nenhuma {l3Name.toLowerCase()} cadastrada</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Níveis Intermediários */}
      <Dialog open={isTopLevelFormOpen} onOpenChange={(open) => { if (!open && !isSubmitting) handleCloseTopLevelForm(); }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader><DialogTitle>{editingTopLevelId ? `Editar ${currentActiveLevel?.name}` : `Novo(a) ${currentActiveLevel?.name}`}</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveTopLevel} className="space-y-4 mt-4">
            
            {/* Se for L2 e o L1 estiver ativo, pede o pai */}
            {currentActiveLevel?.type === 'L2' && l1.active && (
               <div className="space-y-2">
                 <Label>Pertence a qual {l1.name}? *</Label>
                 <select 
                   value={topLevelFormData.parent_id} 
                   onChange={(e) => setTopLevelFormData({...topLevelFormData, parent_id: e.target.value})}
                   className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
                   disabled={parentOptionsForL2.length === 0 || isSubmitting}
                 >
                    {parentOptionsForL2.length === 0 ? (
                      <option value="" disabled>Nenhum(a) {l1.name} cadastrado(a). Cadastre primeiro.</option>
                    ) : (
                      <option value="" disabled>Selecione...</option>
                    )}
                    {parentOptionsForL2.map(t => (
                       <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                 </select>
               </div>
            )}

            <div className="space-y-2">
              <Label>Nome do(a) {currentActiveLevel?.name} *</Label>
              <Input placeholder={`Ex: Sudeste / Operação Alpha`} value={topLevelFormData.name} onChange={(e) => setTopLevelFormData({...topLevelFormData, name: e.target.value})} autoFocus disabled={isSubmitting} />
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 mt-2">
              <div className="space-y-0.5"><Label>Status</Label><p className="text-xs text-slate-500">Ativo no sistema</p></div>
              <Switch checked={topLevelFormData.active} onCheckedChange={(checked) => setTopLevelFormData({...topLevelFormData, active: checked})} disabled={isSubmitting} />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-4">
              <Button type="button" variant="outline" onClick={handleCloseTopLevelForm} disabled={isSubmitting}>Cancelar</Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Salvar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Unidade (Nível Final) */}
      <Dialog open={isUnitFormOpen} onOpenChange={(open) => { if (!open && !isSubmitting) handleCloseUnitForm(); }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader><DialogTitle>{editingUnitId ? `Editar ${l3Name}` : `Nova ${l3Name}`}</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveUnit} className="space-y-4 mt-4">
            
            {/* Se houver algum nível superior ativo, pede o pai correspondente */}
            {lowestLevelConfig && (
              <div className="space-y-2">
                <Label>Pertence a qual {lowestLevelConfig.name}? *</Label>
                <select 
                  value={unitFormData.parent_id} 
                  onChange={(e) => setUnitFormData({...unitFormData, parent_id: e.target.value})}
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
                  disabled={parentOptionsForUnit.length === 0 || isSubmitting}
                >
                   {parentOptionsForUnit.length === 0 ? (
                     <option value="" disabled>Nenhum(a) {lowestLevelConfig.name} cadastrado(a). Volte ao Passo 2.</option>
                   ) : (
                     <option value="" disabled>Selecione...</option>
                   )}
                   {parentOptionsForUnit.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                   ))}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Nome da {l3Name} *</Label>
              <Input placeholder="Ex: Loja Matriz" value={unitFormData.name} onChange={(e) => setUnitFormData({...unitFormData, name: e.target.value})} disabled={isSubmitting} />
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 mt-2">
              <div className="space-y-0.5"><Label>Status</Label><p className="text-xs text-slate-500">Ativa no sistema</p></div>
              <Switch checked={unitFormData.active} onCheckedChange={(checked) => setUnitFormData({...unitFormData, active: checked})} disabled={isSubmitting} />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-4">
              <Button type="button" variant="outline" onClick={handleCloseUnitForm} disabled={isSubmitting}>Cancelar</Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Salvar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={(open) => { if (!open && !isSubmitting) handleCloseDelete(); }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle className="text-red-600">Excluir Registro</DialogTitle></DialogHeader>
          <div className="py-4">
             <p className="text-slate-600 text-sm">Tem certeza que deseja excluir <strong>{itemToDelete?.name}</strong>?</p>
             {itemToDelete?.type === 'TOP_LEVEL' && (
               <p className="text-red-500 text-sm mt-2 font-medium">Atenção: Excluir um nível apaga todo o rastro dos nós abaixo dele na hierarquia!</p>
             )}
          </div>
          <div className="flex justify-end gap-3">
             <Button type="button" variant="outline" onClick={handleCloseDelete} disabled={isSubmitting}>Cancelar</Button>
             <Button type="button" variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
               {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Sim, excluir'}
             </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
