import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Network, Save, Building2, Store, CheckCircle2, XCircle, Edit2, Trash2, Plus, ArrowUp, ArrowDown } from 'lucide-react';
import { OrgTopLevel, OrgUnit, OrgLevelConfig } from '../../types';

export const AdminStructure = () => {
  const { linkName } = useParams();
  const { 
    companies, updateCompany, 
    orgTopLevels, addOrgTopLevel, updateOrgTopLevel, deleteOrgTopLevel, toggleOrgTopLevelStatus,
    orgUnits, addOrgUnit, updateOrgUnit, deleteOrgUnit, toggleOrgUnitStatus
  } = useAppStore();
  
  const company = companies.find(c => c.linkName === linkName);

  const [levelsConfig, setLevelsConfig] = useState<OrgLevelConfig[]>([]);
  const [unitNameConfig, setUnitNameConfig] = useState('');
  const [activeTabIndex, setActiveTabIndex] = useState(0);

  const [isTopLevelFormOpen, setIsTopLevelFormOpen] = useState(false);
  const [editingTopLevelId, setEditingTopLevelId] = useState<string | null>(null);
  const [topLevelFormData, setTopLevelFormData] = useState({ name: '', parentId: '', active: true });

  const [isUnitFormOpen, setIsUnitFormOpen] = useState(false);
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [unitFormData, setUnitFormData] = useState({ name: '', parentId: '', active: true });

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{id: string, name: string, type: 'TOP_LEVEL' | 'UNIT'} | null>(null);

  useEffect(() => {
    if (company) {
      setUnitNameConfig(company.orgUnitName || 'Unidade');
      if (company.orgLevels && company.orgLevels.length > 0) {
        setLevelsConfig(company.orgLevels);
      } else if (company.orgTopLevelName) {
        setLevelsConfig([{ id: crypto.randomUUID(), name: company.orgTopLevelName }]);
      } else {
        setLevelsConfig([{ id: crypto.randomUUID(), name: 'Regional' }]);
      }
    }
  }, [company]);

  if (!company) return null;

  const handleCloseTopLevelForm = () => {
    setIsTopLevelFormOpen(false);
    setTimeout(() => {
      setEditingTopLevelId(null);
      setTopLevelFormData({ name: '', parentId: '', active: true });
    }, 300);
  };

  const handleCloseUnitForm = () => {
    setIsUnitFormOpen(false);
    setTimeout(() => {
      setEditingUnitId(null);
      setUnitFormData({ name: '', parentId: '', active: true });
    }, 300);
  };

  const handleCloseDelete = () => {
    setIsDeleteOpen(false);
    setTimeout(() => setItemToDelete(null), 300);
  };

  const addLevel = () => setLevelsConfig([...levelsConfig, { id: crypto.randomUUID(), name: '' }]);
  const updateLevelName = (index: number, val: string) => {
    const arr = [...levelsConfig];
    arr[index].name = val;
    setLevelsConfig(arr);
  };
  const removeLevel = (index: number) => setLevelsConfig(levelsConfig.filter((_, i) => i !== index));
  const moveLevel = (index: number, dir: number) => {
    const arr = [...levelsConfig];
    const target = index + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[index], arr[target]] = [arr[target], arr[index]];
    setLevelsConfig(arr);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (levelsConfig.length === 0) return toast.error("É necessário definir ao menos 1 nível intermediário.");
    if (levelsConfig.some(l => !l.name.trim())) return toast.error("Preencha o nome de todos os níveis.");
    if (!unitNameConfig.trim()) return toast.error("O nome da Unidade base não pode ser vazio.");
    
    updateCompany(company.id, {
      orgLevels: levelsConfig,
      orgUnitName: unitNameConfig.trim()
    });
    toast.success('Estrutura configurada com sucesso!');
  };

  const companyTopLevels = orgTopLevels.filter(o => o.companyId === company.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const companyUnits = orgUnits.filter(u => u.companyId === company.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (activeTabIndex >= levelsConfig.length && levelsConfig.length > 0) {
     setActiveTabIndex(Math.max(0, levelsConfig.length - 1));
  }

  const activeLevelConfig = levelsConfig[activeTabIndex] || { id: 'fallback', name: 'Nível' };
  const activePreviousLevelConfig = activeTabIndex > 0 ? levelsConfig[activeTabIndex - 1] : null;
  const lowestLevelConfig = levelsConfig.length > 0 ? levelsConfig[levelsConfig.length - 1] : { id: 'fallback', name: 'Nível' };

  const currentGroups = companyTopLevels.filter(t => t.levelId === activeLevelConfig.id || (!t.levelId && activeTabIndex === 0));

  const openCreateTopLevel = () => {
    setEditingTopLevelId(null);
    setTopLevelFormData({ name: '', parentId: '', active: true });
    setIsTopLevelFormOpen(true);
  };

  const openEditTopLevel = (item: OrgTopLevel) => {
    setEditingTopLevelId(item.id);
    setTopLevelFormData({ name: item.name, parentId: item.parentId || '', active: item.active });
    setIsTopLevelFormOpen(true);
  };

  const handleSaveTopLevel = (e: React.FormEvent) => {
    e.preventDefault();
    const name = topLevelFormData.name.trim();

    if (!name) return toast.error('O Nome é obrigatório.');
    if (activePreviousLevelConfig && !topLevelFormData.parentId) return toast.error(`Selecione um(a) ${activePreviousLevelConfig.name} a qual este nível pertence.`);

    if (editingTopLevelId) {
      updateOrgTopLevel(editingTopLevelId, { name, parentId: topLevelFormData.parentId, active: topLevelFormData.active });
      toast.success(`${activeLevelConfig.name} atualizado(a) com sucesso!`);
    } else {
      addOrgTopLevel({ companyId: company.id, levelId: activeLevelConfig.id, name, parentId: topLevelFormData.parentId, active: topLevelFormData.active });
      toast.success(`${activeLevelConfig.name} cadastrado(a) com sucesso!`);
    }
    handleCloseTopLevelForm();
  };

  const openCreateUnit = () => {
    setEditingUnitId(null);
    setUnitFormData({ name: '', parentId: '', active: true });
    setIsUnitFormOpen(true);
  };

  const openEditUnit = (item: OrgUnit) => {
    setEditingUnitId(item.id);
    setUnitFormData({ name: item.name, parentId: item.parentId, active: item.active });
    setIsUnitFormOpen(true);
  };

  const handleSaveUnit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = unitFormData.name.trim();

    if (!name) return toast.error('O Nome é obrigatório.');
    if (!unitFormData.parentId) return toast.error(`Selecione um(a) ${lowestLevelConfig.name} a qual esta unidade pertence.`);

    const isDuplicate = companyUnits.some(o => o.name.toLowerCase() === name.toLowerCase() && o.id !== editingUnitId);
    if (isDuplicate) return toast.error(`Já existe uma ${unitNameConfig.toLowerCase()} com este nome nesta empresa.`);

    if (editingUnitId) {
      updateOrgUnit(editingUnitId, { name, parentId: unitFormData.parentId, active: unitFormData.active });
      toast.success(`${unitNameConfig} atualizada!`);
    } else {
      addOrgUnit({ companyId: company.id, name, parentId: unitFormData.parentId, active: unitFormData.active });
      toast.success(`${unitNameConfig} cadastrada!`);
    }
    handleCloseUnitForm();
  };

  const confirmDelete = (id: string, name: string, type: 'TOP_LEVEL' | 'UNIT') => {
    setItemToDelete({ id, name, type });
    setIsDeleteOpen(true);
  };

  const handleDelete = () => {
    if (itemToDelete) {
      if (itemToDelete.type === 'TOP_LEVEL') {
        deleteOrgTopLevel(itemToDelete.id);
        toast.success(`Nível e seus dependentes foram excluídos.`);
      } else {
        deleteOrgUnit(itemToDelete.id);
        toast.success(`Unidade excluída.`);
      }
    }
    handleCloseDelete();
  };

  return (
    <div className="max-w-6xl mx-auto pb-12 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Network className="text-indigo-600" size={28} />
          Estrutura Organizacional
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure a hierarquia em múltiplos níveis e cadastre suas instâncias.
        </p>
      </div>

      <form onSubmit={handleSaveSettings} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 border-b border-slate-100 pb-2">Passo 1: Definir as Nomenclaturas da Hierarquia</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <Label className="flex items-center gap-2 text-base"><Building2 size={18} className="text-slate-400" /> Níveis Intermediários</Label>
              <p className="text-xs text-slate-500 mb-2 leading-relaxed">Os agrupamentos do maior para o menor. Ex: Diretoria {'->'} Regional {'->'} Cidade</p>
              
              <div className="space-y-2">
                 {levelsConfig.map((lvl, index) => (
                    <div key={lvl.id} className="flex gap-2 items-center">
                       <span className="text-sm font-bold w-6 text-slate-400 text-right">{index + 1}.</span>
                       <Input placeholder="Nome do Nível..." value={lvl.name} onChange={e => updateLevelName(index, e.target.value)} />
                       <div className="flex items-center bg-slate-50 rounded-md border border-slate-200">
                          <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-slate-400" onClick={()=>moveLevel(index, -1)} disabled={index===0}><ArrowUp size={16}/></Button>
                          <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-slate-400" onClick={()=>moveLevel(index, 1)} disabled={index===levelsConfig.length-1}><ArrowDown size={16}/></Button>
                          <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-red-500 hover:text-red-700" onClick={()=>removeLevel(index)}><Trash2 size={16}/></Button>
                       </div>
                    </div>
                 ))}
                 {levelsConfig.length === 0 && (
                    <div className="text-sm text-red-500 font-medium py-2">Você precisa criar ao menos um nível!</div>
                 )}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addLevel} className="mt-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50"><Plus size={14} className="mr-1"/> Adicionar Novo Nível</Button>
            </div>
            
            <div className="space-y-3 pl-0 md:pl-6 md:border-l border-slate-100">
              <Label className="flex items-center gap-2 text-base"><Store size={18} className="text-slate-400" /> Nível Final (Unidade Base)</Label>
              <p className="text-xs text-slate-500 leading-relaxed">
                  A ponta operacional onde os usuários geralmente são vinculados (Ex: Loja, Filial).
              </p>
              <Input placeholder="Ex: Loja" value={unitNameConfig} onChange={(e) => setUnitNameConfig(e.target.value)} className="bg-slate-50" />
            </div>
          </div>
        </div>
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end">
          <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2">
            <Save size={16} /> Salvar Estrutura
          </Button>
        </div>
      </form>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full min-h-[400px] ${levelsConfig.length === 0 ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="p-4 border-b border-slate-200 bg-slate-50/50">
             <h2 className="text-base font-semibold text-slate-900 mb-3">Passo 2: Cadastrar Agrupamentos</h2>
             <div className="flex gap-2 overflow-x-auto pb-1">
                {levelsConfig.map((lvl, index) => (
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
          </div>
          
          <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-white">
             <p className="text-xs font-medium text-slate-500">Exibindo registros de: <strong>{activeLevelConfig.name}</strong></p>
             <Button type="button" onClick={openCreateTopLevel} size="sm" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 h-8">
               <Plus size={14} className="mr-1" /> Nova(o) {activeLevelConfig.name}
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
                     const parent = activePreviousLevelConfig ? companyTopLevels.find(t => t.id === item.parentId) : null;
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
                             <Switch checked={item.active} onCheckedChange={() => toggleOrgTopLevelStatus(item.id)} title="Ativar/Inativar" />
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
                        <p className="font-medium text-slate-900 text-sm">Nenhum(a) {activeLevelConfig.name} cadastrado(a)</p>
                      </td>
                    </tr>
                  )}
               </tbody>
            </table>
          </div>
        </div>

        <div className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full min-h-[400px] ${levelsConfig.length === 0 ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="p-4 border-b border-slate-200 bg-slate-50/50">
             <h2 className="text-base font-semibold text-slate-900 mb-3">Passo 3: Cadastrar {unitNameConfig}s</h2>
             <div className="flex gap-2 overflow-x-auto pb-1">
                 <div className="px-3 py-1.5 text-xs font-bold rounded-md whitespace-nowrap bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm flex items-center gap-1.5">
                   <Store size={14} /> {unitNameConfig} (Unidade Final)
                 </div>
             </div>
          </div>

          <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-white">
             <p className="text-xs font-medium text-slate-500">As unidades vinculam-se aos registros de <strong>{lowestLevelConfig.name}</strong></p>
             <Button type="button" onClick={openCreateUnit} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white h-8">
               <Plus size={14} className="mr-1" /> Nova {unitNameConfig}
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
                  {companyUnits.map(unit => {
                     const parent = companyTopLevels.find(t => t.id === unit.parentId);
                     return (
                       <tr key={unit.id} className={`hover:bg-slate-50 transition-colors ${!unit.active ? 'opacity-60 bg-slate-50/50' : ''}`}>
                          <td className="p-3 text-center">
                             {unit.active ? <CheckCircle2 className="text-emerald-500 mx-auto" size={16} /> : <XCircle className="text-slate-400 mx-auto" size={16} />}
                          </td>
                          <td className="p-3">
                              <p className="font-semibold text-slate-900 truncate max-w-[200px]">{unit.name}</p>
                              <p className="text-[10px] text-slate-500 font-medium mt-0.5 truncate max-w-[200px]">Vinculado a: {parent?.name || 'Nível Excluído'}</p>
                          </td>
                          <td className="p-3 text-right">
                             <div className="flex items-center justify-end gap-1">
                               <Switch checked={unit.active} onCheckedChange={() => toggleOrgUnitStatus(unit.id)} title="Ativar/Inativar" />
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
                        <p className="font-medium text-slate-900 text-sm">Nenhuma {unitNameConfig.toLowerCase()} cadastrada</p>
                      </td>
                    </tr>
                  )}
               </tbody>
            </table>
          </div>
        </div>
      </div>

      <Dialog open={isTopLevelFormOpen} onOpenChange={(open) => { if (!open) handleCloseTopLevelForm(); }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader><DialogTitle>{editingTopLevelId ? `Editar ${activeLevelConfig.name}` : `Novo(a) ${activeLevelConfig.name}`}</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveTopLevel} className="space-y-4 mt-4">
            {activePreviousLevelConfig && (
               <div className="space-y-2">
                 <Label>Pertence a qual {activePreviousLevelConfig.name}? *</Label>
                 <select 
                   value={topLevelFormData.parentId} 
                   onChange={(e) => setTopLevelFormData({...topLevelFormData, parentId: e.target.value})}
                   className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
                 >
                    <option value="" disabled>Selecione...</option>
                    {companyTopLevels.filter(t => t.levelId === activePreviousLevelConfig.id || (!t.levelId && activeTabIndex === 1)).map(t => (
                       <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                 </select>
               </div>
            )}
            <div className="space-y-2">
              <Label>Nome do(a) {activeLevelConfig.name} *</Label>
              <Input placeholder="Ex: Sudeste" value={topLevelFormData.name} onChange={(e) => setTopLevelFormData({...topLevelFormData, name: e.target.value})} autoFocus />
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 mt-2">
              <div className="space-y-0.5"><Label>Status</Label><p className="text-xs text-slate-500">Ativo no sistema</p></div>
              <Switch checked={topLevelFormData.active} onCheckedChange={(checked) => setTopLevelFormData({...topLevelFormData, active: checked})} />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-4">
              <Button type="button" variant="outline" onClick={handleCloseTopLevelForm}>Cancelar</Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">Salvar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isUnitFormOpen} onOpenChange={(open) => { if (!open) handleCloseUnitForm(); }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader><DialogTitle>{editingUnitId ? `Editar ${unitNameConfig}` : `Nova ${unitNameConfig}`}</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveUnit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Pertence a qual {lowestLevelConfig.name}? *</Label>
              <select 
                value={unitFormData.parentId} 
                onChange={(e) => setUnitFormData({...unitFormData, parentId: e.target.value})}
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
              >
                 <option value="" disabled>Selecione...</option>
                 {companyTopLevels.filter(t => t.levelId === lowestLevelConfig.id || (!t.levelId && levelsConfig.length === 1)).map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                 ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Nome da {unitNameConfig} *</Label>
              <Input placeholder="Ex: Loja Matriz" value={unitFormData.name} onChange={(e) => setUnitFormData({...unitFormData, name: e.target.value})} />
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 mt-2">
              <div className="space-y-0.5"><Label>Status</Label><p className="text-xs text-slate-500">Ativa no sistema</p></div>
              <Switch checked={unitFormData.active} onCheckedChange={(checked) => setUnitFormData({...unitFormData, active: checked})} />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-4">
              <Button type="button" variant="outline" onClick={handleCloseUnitForm}>Cancelar</Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">Salvar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={(open) => { if (!open) handleCloseDelete(); }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle className="text-red-600">Excluir Registro</DialogTitle></DialogHeader>
          <div className="py-4">
             <p className="text-slate-600 text-sm">Tem certeza que deseja excluir <strong>{itemToDelete?.name}</strong>?</p>
             {itemToDelete?.type === 'TOP_LEVEL' && (
               <p className="text-red-500 text-sm mt-2 font-medium">Atenção: Excluir um nível apaga todo o rastro dos nós abaixo dele na hierarquia!</p>
             )}
          </div>
          <div className="flex justify-end gap-3">
             <Button type="button" variant="outline" onClick={handleCloseDelete}>Cancelar</Button>
             <Button type="button" variant="destructive" onClick={handleDelete}>Sim, excluir</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};