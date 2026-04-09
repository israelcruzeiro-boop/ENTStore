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
import { Network, Save, Building2, Store, CheckCircle2, XCircle, Edit2, Trash2, Plus, Loader2 } from 'lucide-react';
import { OrgTopLevel, OrgUnit } from '../../types';

export const AdminStructure = () => {
  const { companySlug } = useParams();
  
  const { companies, mutate: mutateCompanies } = useCompanies();
  const company = companies.find(c => c.slug === companySlug);

  const { orgTopLevels: allTopLevels, orgUnits: allUnits, mutateTopLevels, mutateUnits, isLoading } = useOrgStructure(company?.id);

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
    if (!l3Name.trim()) return toast.error("O nome da Unidade Operacional (Base) não pode ser vazio.");
    if (l1.active && !l1.name.trim()) return toast.error("Preencha o nome do Agrupamento Principal (Topo).");
    if (l2.active && !l2.name.trim()) return toast.error("Preencha o nome do Agrupamento Secundário (Interm.).");
    
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
      if (editingTopLevelId) {
        const { error } = await supabase.from('org_top_levels').update({ 
          name, 
          parent_id: topLevelFormData.parent_id || null, 
          active: topLevelFormData.active 
        }).eq('id', editingTopLevelId);
        if (error) throw error;
        toast.success(`${currentActiveLevel?.name} atualizado(a) com sucesso!`);
      } else {
        const { error } = await supabase.from('org_top_levels').insert({ 
          company_id: company.id, 
          level_id: currentActiveLevel?.id, 
          name, 
          parent_id: topLevelFormData.parent_id || null, 
          active: topLevelFormData.active 
        });
        if (error) throw error;
        toast.success(`${currentActiveLevel?.name} cadastrado(a) com sucesso!`);
      }
      mutateTopLevels();
      handleCloseTopLevelForm();
    } catch (err) {
      const error = err as Error;
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
      if (editingUnitId) {
        const { error } = await supabase.from('org_units').update({ 
          name, 
          parent_id: unitFormData.parent_id || null, 
          active: unitFormData.active 
        }).eq('id', editingUnitId);
        if (error) throw error;
        toast.success(`${l3Name} atualizada!`);
      } else {
        const { error } = await supabase.from('org_units').insert({ 
          company_id: company.id, 
          name, 
          parent_id: unitFormData.parent_id || null, 
          active: unitFormData.active 
        });
        if (error) throw error;
        toast.success(`${l3Name} cadastrada!`);
      }
      mutateUnits();
      handleCloseUnitForm();
    } catch (err) {
      const error = err as Error;
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
        if (itemToDelete.type === 'TOP_LEVEL') {
          const { error } = await supabase.from('org_top_levels').delete().eq('id', itemToDelete.id);
          if (error) throw error;
          mutateTopLevels();
          toast.success(`Registro excluído.`);
        } else {
          const { error } = await supabase.from('org_units').delete().eq('id', itemToDelete.id);
          if (error) throw error;
          mutateUnits();
          toast.success(`Unidade excluída.`);
        }
      } catch (err) {
        const error = err as Error;
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
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Network className="text-indigo-600" size={28} />
          Estrutura Organizacional
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure a hierarquia em até 3 níveis e cadastre suas instâncias.
        </p>
      </div>

      <form onSubmit={handleSaveSettings} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-6 border-b border-slate-100 pb-2">Passo 1: Definir os Níveis da Hierarquia</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Nível 1 */}
            <div className={`p-5 rounded-xl border transition-colors ${l1.active ? 'border-indigo-200 bg-indigo-50/40 shadow-sm' : 'border-slate-200 bg-slate-50 opacity-80'}`}>
               <div className="flex justify-between items-center mb-4">
                  <Label className="text-sm font-bold text-slate-700">Agrupamento Principal (Topo)</Label>
                  <Switch checked={l1.active} onCheckedChange={(c) => setL1({...l1, active: c})} disabled={isSubmitting} />
               </div>
               <Input 
                 placeholder="Ex: Diretoria" 
                 value={l1.name} 
                 onChange={e => setL1({...l1, name: e.target.value})} 
                 disabled={true} 
                 className={'bg-slate-100 text-slate-500 font-bold'} 
               />
               <p className="text-[10px] text-slate-500 mt-2.5 font-medium">Nome fixo</p>
            </div>

            {/* Nível 2 */}
            <div className={`p-5 rounded-xl border transition-colors ${l2.active ? 'border-indigo-200 bg-indigo-50/40 shadow-sm' : 'border-slate-200 bg-slate-50 opacity-80'}`}>
               <div className="flex justify-between items-center mb-4">
                  <Label className="text-sm font-bold text-slate-700">Agrupamento Secundário (Interm.)</Label>
                  <Switch checked={l2.active} onCheckedChange={(c) => setL2({...l2, active: c})} disabled={isSubmitting} />
               </div>
               <Input 
                 placeholder="Ex: Regional" 
                 value={l2.name} 
                 onChange={e => setL2({...l2, name: e.target.value})} 
                 disabled={true} 
                 className={'bg-slate-100 text-slate-500 font-bold'} 
               />
               <p className="text-[10px] text-slate-500 mt-2.5 font-medium">Nome fixo</p>
            </div>

            {/* Nível 3 */}
            <div className="p-5 rounded-xl border border-emerald-200 bg-emerald-50/30 shadow-sm">
               <div className="flex justify-between items-center mb-4">
                  <Label className="text-sm font-bold text-emerald-800">Unidade Operacional (Base)</Label>
                  <span className="text-[9px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-bold uppercase tracking-wider">Obrigatório</span>
               </div>
               <Input 
                 placeholder="Ex: Loja, Filial" 
                 value={l3Name} 
                 onChange={e => setL3Name(e.target.value)} 
                 disabled={true}
                 className="bg-slate-100 text-slate-500 font-bold border-emerald-200"
               />
               <p className="text-[10px] text-emerald-600/80 mt-2.5 font-medium">Nome fixo</p>
            </div>
          </div>
        </div>
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end">
          <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2 px-6">
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Salvar Nomenclaturas
          </Button>
        </div>
      </form>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Passo 2: Níveis Intermediários (Opcional) */}
        <div className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full min-h-[400px]`}>
          <div className="p-4 border-b border-slate-200 bg-slate-50/50">
             <h2 className="text-base font-semibold text-slate-900 mb-3">Passo 2: Cadastrar Agrupamentos</h2>
             {activeLevelsConfig.length > 0 ? (
                <div className="flex gap-2 overflow-x-auto pb-1">
                   {activeLevelsConfig.map((lvl, index) => (
                      <button 
                        type="button"
                        key={lvl.id} 
                        onClick={() => setActiveTabIndex(index)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md whitespace-nowrap transition-colors ${activeTabIndex === index ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
                      >
                        {lvl.name}
                      </button>
                   ))}
                </div>
             ) : (
                <p className="text-xs text-slate-500 italic mt-2">Nenhum nível superior/intermediário foi ativado no Passo 1.</p>
             )}
          </div>
          
          {activeLevelsConfig.length > 0 && currentActiveLevel ? (
            <>
              <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-white">
                 <p className="text-xs font-medium text-slate-500">Exibindo registros de: <strong>{currentActiveLevel.name}</strong></p>
                 <Button type="button" onClick={openCreateTopLevel} size="sm" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 h-8">
                   <Plus size={14} className="mr-1" /> Nova(o) {currentActiveLevel.name}
                 </Button>
              </div>

              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left text-sm text-slate-600">
                   <thead className="bg-slate-50 border-b border-slate-200 text-slate-900 font-semibold">
                      <tr>
                         <th className="p-3 w-12 text-center">Status</th>
                         <th className="p-3">Nome</th>
                         <th className="p-3 text-right">Ações</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                      {currentGroups.map(item => {
                         const parent = activePreviousLevelConfig ? companyTopLevels.find(t => t.id === item.parent_id) : null;
                         return (
                         <tr key={item.id} className={`hover:bg-slate-50 transition-colors ${!item.active ? 'opacity-60 bg-slate-50/50' : ''}`}>
                            <td className="p-3 text-center">
                               {item.active ? <CheckCircle2 className="text-emerald-500 mx-auto" size={16} /> : <XCircle className="text-slate-400 mx-auto" size={16} />}
                            </td>
                            <td className="p-3">
                              <p className="font-semibold text-slate-900 truncate max-w-[200px]">{item.name}</p>
                              {parent && <p className="text-[10px] text-slate-500 font-medium truncate max-w-[200px] mt-0.5">Pertence a: {parent.name}</p>}
                            </td>
                            <td className="p-3 text-right">
                               <div className="flex items-center justify-end gap-1">
                                 <Switch checked={item.active} onCheckedChange={() => toggleOrgTopLevelStatus(item.id, item.active)} title="Ativar/Inativar" />
                                 <div className="h-4 w-px bg-slate-200 mx-1"></div>
                                 <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-blue-600" onClick={() => openEditTopLevel(item)}><Edit2 size={14} /></Button>
                                 <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-600" onClick={() => confirmDelete(item.id, item.name, 'TOP_LEVEL')}><Trash2 size={14} /></Button>
                               </div>
                            </td>
                         </tr>
                      )})}
                      {currentGroups.length === 0 && (
                        <tr>
                          <td colSpan={3} className="p-8 text-center text-slate-500">
                            <Building2 size={24} className="text-slate-300 mx-auto mb-2" />
                            <p className="font-medium text-slate-900 text-sm">Nenhum(a) {currentActiveLevel.name} cadastrado(a)</p>
                          </td>
                        </tr>
                      )}
                   </tbody>
                </table>
              </div>
            </>
          ) : (
             <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 bg-slate-50/30">
                <Network size={32} className="mb-3 opacity-30" />
                <p className="font-medium text-sm">Agrupamentos desativados.</p>
                <p className="text-xs mt-1">Sua estrutura utilizará apenas as Unidades.</p>
             </div>
          )}
        </div>

        {/* Passo 3: Unidades Finais (Sempre Ativo) */}
        <div className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full min-h-[400px]`}>
          <div className="p-4 border-b border-slate-200 bg-slate-50/50">
             <h2 className="text-base font-semibold text-slate-900 mb-3">Passo 3: Cadastrar {l3Name}s</h2>
             <div className="flex gap-2 overflow-x-auto pb-1">
                 <div className="px-3 py-1.5 text-xs font-bold rounded-md whitespace-nowrap bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm flex items-center gap-1.5">
                   <Store size={14} /> {l3Name} (Unidade Final)
                 </div>
             </div>
          </div>

          <div className="p-3 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white">
             {lowestLevelConfig ? (
                <div className="flex items-center gap-2">
                   <p className="text-xs font-medium text-slate-500 whitespace-nowrap">Filtrar por {lowestLevelConfig.name}:</p>
                   <select 
                     value={selectedParentFilter}
                     onChange={(e) => setSelectedParentFilter(e.target.value)}
                     className="h-8 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs focus:ring-1 focus:ring-emerald-500 max-w-[200px]"
                   >
                      <option value="all">TODAS</option>
                      {companyTopLevels
                        .filter(t => t.level_id === lowestLevelConfig.id || (!t.level_id && activeLevelsConfig[0]?.id === lowestLevelConfig.id))
                        .map(t => (
                         <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                   </select>
                </div>
             ) : (
                <p className="text-xs font-medium text-slate-500">
                   As {l3Name}s ficarão livres, pois não há níveis intermediários.
                </p>
             )}
             <Button type="button" onClick={openCreateUnit} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 w-full sm:w-auto shrink-0">
               <Plus size={14} className="mr-1" /> Nova {l3Name}
             </Button>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm text-slate-600">
               <thead className="bg-slate-50 border-b border-slate-200 text-slate-900 font-semibold">
                  <tr>
                     <th className="p-3 w-12 text-center">Status</th>
                     <th className="p-3">Nome</th>
                     <th className="p-3 text-right">Ações</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {(selectedParentFilter === 'all' ? companyUnits : companyUnits.filter(u => u.parent_id === selectedParentFilter)).map(unit => {
                     const parent = lowestLevelConfig ? companyTopLevels.find(t => t.id === unit.parent_id) : null;
                     return (
                       <tr key={unit.id} className={`hover:bg-slate-50 transition-colors ${!unit.active ? 'opacity-60 bg-slate-50/50' : ''}`}>
                          <td className="p-3 text-center">
                             {unit.active ? <CheckCircle2 className="text-emerald-500 mx-auto" size={16} /> : <XCircle className="text-slate-400 mx-auto" size={16} />}
                          </td>
                          <td className="p-3">
                              <p className="font-semibold text-slate-900 truncate max-w-[200px]">{unit.name}</p>
                              {lowestLevelConfig && (
                                <p className="text-[10px] text-slate-500 font-medium mt-0.5 truncate max-w-[200px]">Vinculado a: {parent?.name || 'Não vinculado'}</p>
                              )}
                          </td>
                          <td className="p-3 text-right">
                             <div className="flex items-center justify-end gap-1">
                               <Switch checked={unit.active} onCheckedChange={() => toggleOrgUnitStatus(unit.id, unit.active)} title="Ativar/Inativar" />
                               <div className="h-4 w-px bg-slate-200 mx-1"></div>
                               <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-blue-600" onClick={() => openEditUnit(unit)}><Edit2 size={14} /></Button>
                               <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-600" onClick={() => confirmDelete(unit.id, unit.name, 'UNIT')}><Trash2 size={14} /></Button>
                             </div>
                          </td>
                       </tr>
                     );
                  })}
                  {companyUnits.length === 0 && (
                    <tr>
                      <td colSpan={3} className="p-8 text-center text-slate-500">
                        <Store size={24} className="text-slate-300 mx-auto mb-2" />
                        <p className="font-medium text-slate-900 text-sm">Nenhuma {l3Name.toLowerCase()} cadastrada</p>
                      </td>
                    </tr>
                  )}
               </tbody>
            </table>
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