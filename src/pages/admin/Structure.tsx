import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { useAdminStructure } from '../../hooks/useApiData';
import { adminStructureService, settingsService } from '../../services/api';
import { ApiException } from '../../services/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Network, Save, Building2, Store, Edit2, Trash2, Plus, Loader2, FolderOpen, ChevronRight, Layers, HelpCircle, AlertTriangle } from 'lucide-react';
import { OrgTopLevel, OrgUnit } from '../../types';
import { orgTopLevelSchema, orgUnitSchema } from '../../types/schemas';
import { Logger } from '../../utils/logger';
import {
  deriveOrgHierarchy,
  getParentOptionsForLevel,
  getParentOptionsForUnit,
  getTopLevelsForLevel,
} from '../../utils/orgHierarchy';
import { Joyride } from 'react-joyride';
import { useTour } from '../../hooks/useTour';
import { STRUCTURE_STEPS } from '../../data/tourSteps';

export const AdminStructure = () => {
  const { company, refreshUser } = useAuth();

  const { orgTopLevels: allTopLevels, orgUnits: allUnits, mutate: mutateStructure, isLoading } = useAdminStructure(company?.id);
  const mutateTopLevels = mutateStructure;
  const mutateUnits = mutateStructure;

  // Tour Guiado (Tutorial)
  const { startTour, joyrideProps } = useTour(STRUCTURE_STEPS);

  // Estados Fixos para os 3 níveis (id corresponde ao levelIndex do backend)
  const [l1, setL1] = useState({ active: false, id: '1', name: 'Diretoria' });
  const [l2, setL2] = useState({ active: true, id: '2', name: 'Regional' });
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
  const [isParentTransitionOpen, setIsParentTransitionOpen] = useState(false);
  const [parentLevelName, setParentLevelName] = useState('Diretoria');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedParentFilter, setSelectedParentFilter] = useState<string>('all');

  useEffect(() => {
    if (company) {
      setL3Name(company.org_unit_name || 'Unidade');
      const levels = company.org_levels || [];

      if (levels.length >= 2) {
        setL1({ active: true, id: '1', name: levels[0].name });
        setL2({ active: true, id: '2', name: levels[1].name });
      } else if (levels.length === 1) {
        setL1(prev => ({ ...prev, active: false }));
        setL2({ active: true, id: '2', name: levels[0].name });
      } else {
        setL1(prev => ({ ...prev, active: false }));
        setL2(prev => ({ ...prev, active: false }));
      }
    }
  }, [company]);

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

  const savedLevelInputs = useMemo(() => {
    const levels = company?.org_levels || [];
    if (levels.length >= 2) {
      return [
        { id: '1', name: levels[0].name, visualPosition: 1 },
        { id: '2', name: levels[1].name, visualPosition: 2 },
      ];
    }

    if (levels.length === 1) {
      return [{ id: '2', name: levels[0].name, visualPosition: 2 }];
    }

    return [];
  }, [company?.org_levels]);

  const savedHierarchy = useMemo(() => deriveOrgHierarchy(savedLevelInputs), [savedLevelInputs]);
  const savedLeafTopLevels = useMemo(
    () => getTopLevelsForLevel(allTopLevels, savedHierarchy.lastLevel),
    [allTopLevels, savedHierarchy.lastLevel],
  );

  const getDraftLevelNames = () => {
    const levelNames: string[] = [];
    if (l1.active) levelNames.push(l1.name.trim());
    if (l2.active) levelNames.push(l2.name.trim());
    return levelNames;
  };

  const requiresParentLevelTransition = (levelNames = getDraftLevelNames()) => {
    const savedLevels = company?.org_levels || [];
    return (
      savedLevels.length === 1 &&
      levelNames.length === 2 &&
      levelNames[1] === savedLevels[0]?.name &&
      savedLeafTopLevels.length > 0
    );
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!l3Name.trim()) return toast.error("O nome do Nível 3 não pode ser vazio.");
    if (l1.active && !l1.name.trim()) return toast.error("Preencha o nome do Nível 1.");
    if (l2.active && !l2.name.trim()) return toast.error("Preencha o nome do Nível 2.");
    
    const newLevelNames = getDraftLevelNames();

    if (requiresParentLevelTransition(newLevelNames)) {
      setParentLevelName(l1.name.trim());
      setIsParentTransitionOpen(true);
      return;
    }

    try {
      setIsSubmitting(true);
      await settingsService.updateGeneral({
        orgLevels: newLevelNames,
        orgUnitName: l3Name.trim(),
      });
      toast.success('Nomenclaturas da estrutura configuradas com sucesso!');
      await refreshUser();
    } catch (err) {
      const error = err as Error;
      if (err instanceof ApiException && err.code === 'RESOURCE_IN_USE' && requiresParentLevelTransition(newLevelNames)) {
        setParentLevelName(l1.name.trim());
        setIsParentTransitionOpen(true);
        return;
      }
      toast.error(`Erro ao salvar nomenclaturas: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInsertParentLevel = async () => {
    const parentName = parentLevelName.trim();
    const newLevelNames = getDraftLevelNames();
    if (!parentName) return toast.error('Informe o nome da nova Diretoria.');
    if (!requiresParentLevelTransition(newLevelNames)) {
      return toast.error('A estrutura atual nao exige esta transicao.');
    }

    try {
      setIsSubmitting(true);
      await adminStructureService.insertParentLevelTransition({
        orgLevels: newLevelNames,
        orgUnitName: l3Name.trim(),
        parentName,
        childTopLevelIds: savedLeafTopLevels.map((topLevel) => topLevel.id),
      });
      toast.success('Nivel pai inserido e regionais preservadas com sucesso!');
      setIsParentTransitionOpen(false);
      await Promise.all([refreshUser(), mutateStructure()]);
    } catch (err) {
      if (err instanceof ApiException && err.code === 'DATABASE_SCHEMA_OUT_OF_DATE') {
        toast.error(
          'A transicao esta pronta, mas a funcao do banco ainda nao foi instalada. Aplique a migration 20260502_insert_parent_level_transition.sql e tente novamente.',
        );
        return;
      }

      const error = err as Error;
      toast.error(`Erro ao reorganizar hierarquia: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const configuredLevelInputs = useMemo(() => {
    const levels = [];
    if (l1.active) levels.push({ id: l1.id, name: l1.name, visualPosition: 1 });
    if (l2.active) levels.push({ id: l2.id, name: l2.name, visualPosition: 2 });
    return levels;
  }, [l1.active, l1.id, l1.name, l2.active, l2.id, l2.name]);

  const orgHierarchy = useMemo(() => deriveOrgHierarchy(configuredLevelInputs), [configuredLevelInputs]);
  const isParentLevelTransitionPending = requiresParentLevelTransition();
  const displayHierarchy = isParentLevelTransitionPending ? savedHierarchy : orgHierarchy;
  const activeLevelsConfig = displayHierarchy.levels;
  const lowestLevelConfig = displayHierarchy.lastLevel;

  useEffect(() => {
    if (activeLevelsConfig.length === 0) {
      if (activeTabIndex !== 0) setActiveTabIndex(0);
      return;
    }

    if (activeTabIndex >= activeLevelsConfig.length) {
      setActiveTabIndex(Math.max(0, activeLevelsConfig.length - 1));
    }
  }, [activeLevelsConfig.length, activeTabIndex]);

  if (!company) {
    return (
      <div className="flex justify-center items-center h-48 text-slate-400">
         <Loader2 className="animate-spin" />
      </div>
    );
  }

  const currentActiveLevel = activeLevelsConfig[activeTabIndex];
  const activePreviousLevelConfig = currentActiveLevel?.previousLevel ?? null;

  const companyTopLevels = allTopLevels.slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const companyUnits = allUnits.slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const currentGroups = getTopLevelsForLevel(companyTopLevels, currentActiveLevel);

  const parentOptionsForL2 = getParentOptionsForLevel(companyTopLevels, currentActiveLevel, topLevelFormData.parent_id);
  const parentOptionsForUnit = getParentOptionsForUnit(companyTopLevels, lowestLevelConfig, unitFormData.parent_id);

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
        level_id: currentActiveLevel ? String(currentActiveLevel.levelIndex) : null,
        name,
        parent_id: topLevelFormData.parent_id || null,
      };

      const validation = editingTopLevelId
        ? orgTopLevelSchema.partial().safeParse(payload)
        : orgTopLevelSchema.safeParse(payload);

      if (!validation.success) {
        return toast.error("Dados inválidos: " + validation.error.issues.map(i => i.message).join(', '));
      }

      const levelIndex = currentActiveLevel?.levelIndex ?? 1;

      if (editingTopLevelId) {
        await adminStructureService.updateTopLevel(editingTopLevelId, {
          name,
          levelIndex,
          parentId: topLevelFormData.parent_id || null,
        });
        toast.success(`${currentActiveLevel?.name} atualizado(a) com sucesso!`);
      } else {
        await adminStructureService.createTopLevel({
          name,
          levelIndex,
          parentId: topLevelFormData.parent_id || null,
        });
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
        await adminStructureService.updateUnit(editingUnitId, {
          name,
          topLevelId: unitFormData.parent_id || null,
          active: unitFormData.active,
        });
        toast.success(`${l3Name} atualizada!`);
      } else {
        await adminStructureService.createUnit({
          name,
          topLevelId: unitFormData.parent_id || null,
          active: unitFormData.active,
        });
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
      await adminStructureService.updateUnit(id, { active: !active });
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
        if (itemToDelete.type === 'TOP_LEVEL') {
          await adminStructureService.deleteTopLevel(itemToDelete.id);
          mutateTopLevels();
          toast.success(`Registro removido da lista.`);
        } else {
          await adminStructureService.deleteUnit(itemToDelete.id);
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

      {isParentLevelTransitionPending && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle size={17} className="text-amber-600" />
            Reorganizacao pendente
          </div>
          <p className="flex-1 text-xs sm:text-sm">
            As {savedLeafTopLevels.length} {l2.name.toLowerCase()}{savedLeafTopLevels.length !== 1 ? 's' : ''} existentes continuam sendo exibidas no nivel salvo ate a transicao ser concluida.
          </p>
          <Button type="button" size="sm" onClick={() => setIsParentTransitionOpen(true)} className="bg-amber-600 hover:bg-amber-700 text-white">
            Concluir transicao
          </Button>
        </div>
      )}

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
                      const isL1 = lvl.visualPosition === 1;
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
                {/* Se houver nivel anterior, agrupa pelo pai configurado */}
                {currentActiveLevel.previousLevel ? (
                  <div className="space-y-3">
                    {(() => {
                      const l1Parents = getTopLevelsForLevel(companyTopLevels, currentActiveLevel.previousLevel);
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
                       const isL1 = currentActiveLevel.visualPosition === 1;
                       const childCount = currentActiveLevel.isLast
                         ? companyUnits.filter(u => u.parent_id === item.id).length
                         : companyTopLevels.filter(t => t.parent_id === item.id).length;
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
                        const isL1Parent = lowestLevelConfig.visualPosition === 2;
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
            
            {/* Se houver nivel anterior, pede o pai */}
            {currentActiveLevel?.previousLevel && (
               <div className="space-y-2">
                 <Label>Pertence a qual {currentActiveLevel.previousLevel.name}? *</Label>
                 <select 
                   value={topLevelFormData.parent_id} 
                   onChange={(e) => setTopLevelFormData({...topLevelFormData, parent_id: e.target.value})}
                   className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500"
                   disabled={parentOptionsForL2.length === 0 || isSubmitting}
                 >
                    {parentOptionsForL2.length === 0 ? (
                      <option value="" disabled>Nenhum(a) {currentActiveLevel.previousLevel.name} cadastrado(a). Cadastre primeiro.</option>
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

      <Dialog open={isParentTransitionOpen} onOpenChange={(open) => { if (!isSubmitting) setIsParentTransitionOpen(open); }}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Concluir reorganizacao da hierarquia</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <p className="font-semibold mb-1">As regionais existentes nao serao movidas para Diretoria.</p>
              <p className="text-xs leading-relaxed">
                O sistema criara a nova Diretoria abaixo e mantera {savedLeafTopLevels.length} {l2.name.toLowerCase()}{savedLeafTopLevels.length !== 1 ? 's' : ''} como nivel operacional intermediario, preservando os vinculos das {l3Name.toLowerCase()}s.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Nome da nova {l1.name || 'Diretoria'} *</Label>
              <Input
                value={parentLevelName}
                onChange={(event) => setParentLevelName(event.target.value)}
                placeholder="Ex: Diretoria Nacional"
                disabled={isSubmitting}
              />
            </div>

            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                {l2.name || 'Regional'}s que serao preservadas
              </div>
              <div className="max-h-40 overflow-y-auto divide-y divide-slate-100">
                {savedLeafTopLevels.map((topLevel) => (
                  <div key={topLevel.id} className="px-3 py-2 text-sm text-slate-700 flex items-center gap-2">
                    <FolderOpen size={14} className="text-amber-500" />
                    {topLevel.name}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setIsParentTransitionOpen(false)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="button" onClick={handleInsertParentLevel} className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Confirmar transicao'}
              </Button>
            </div>
          </div>
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
