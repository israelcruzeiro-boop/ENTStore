import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Network, Save, Building2, Store, CheckCircle2, XCircle, Edit2, Trash2, Plus } from 'lucide-react';
import { OrgTopLevel, OrgUnit } from '../../types';

export const AdminStructure = () => {
  const { linkName } = useParams();
  const { 
    companies, updateCompany, 
    orgTopLevels, addOrgTopLevel, updateOrgTopLevel, deleteOrgTopLevel, toggleOrgTopLevelStatus,
    orgUnits, addOrgUnit, updateOrgUnit, deleteOrgUnit, toggleOrgUnitStatus
  } = useAppStore();
  
  const company = companies.find(c => c.linkName === linkName);

  // Estados: Nomenclaturas
  const [configData, setConfigData] = useState({
    orgTopLevelName: '',
    orgUnitName: ''
  });

  // Estados: Modal Nível Superior
  const [isTopLevelFormOpen, setIsTopLevelFormOpen] = useState(false);
  const [editingTopLevelId, setEditingTopLevelId] = useState<string | null>(null);
  const [topLevelFormData, setTopLevelFormData] = useState({ name: '', active: true });

  // Estados: Modal Unidade
  const [isUnitFormOpen, setIsUnitFormOpen] = useState(false);
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [unitFormData, setUnitFormData] = useState({ name: '', parentId: '', active: true });

  // Estados: Exclusão (Genérico)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{id: string, name: string, type: 'TOP_LEVEL' | 'UNIT'} | null>(null);

  useEffect(() => {
    if (company) {
      setConfigData({
        orgTopLevelName: company.orgTopLevelName || '',
        orgUnitName: company.orgUnitName || ''
      });
    }
  }, [company]);

  if (!company) return null;

  // Nomenclatura Padrão ou Dinâmica
  const topLevelLabel = company.orgTopLevelName || 'Nível Superior';
  const unitLabel = company.orgUnitName || 'Unidade';

  // Listas de Dados
  const companyTopLevels = orgTopLevels.filter(o => o.companyId === company.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const companyUnits = orgUnits.filter(u => u.companyId === company.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());


  // --- Handlers: Nomenclatura ---
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateCompany(company.id, {
      orgTopLevelName: configData.orgTopLevelName.trim(),
      orgUnitName: configData.orgUnitName.trim()
    });
    toast.success('Nomenclaturas atualizadas com sucesso!');
  };

  // --- Handlers: Nível Superior ---
  const openCreateTopLevel = () => {
    setEditingTopLevelId(null);
    setTopLevelFormData({ name: '', active: true });
    setIsTopLevelFormOpen(true);
  };

  const openEditTopLevel = (item: OrgTopLevel) => {
    setEditingTopLevelId(item.id);
    setTopLevelFormData({ name: item.name, active: item.active });
    setIsTopLevelFormOpen(true);
  };

  const handleSaveTopLevel = (e: React.FormEvent) => {
    e.preventDefault();
    const name = topLevelFormData.name.trim();

    if (!name) return toast.error('O Nome é obrigatório.');

    const isDuplicate = companyTopLevels.some(o => o.name.toLowerCase() === name.toLowerCase() && o.id !== editingTopLevelId);
    if (isDuplicate) return toast.error(`Já existe um cadastro com este nome para ${topLevelLabel}.`);

    if (editingTopLevelId) {
      updateOrgTopLevel(editingTopLevelId, { name, active: topLevelFormData.active });
      toast.success(`${topLevelLabel} atualizado(a) com sucesso!`);
    } else {
      addOrgTopLevel({ companyId: company.id, name, active: topLevelFormData.active });
      toast.success(`${topLevelLabel} cadastrado(a) com sucesso!`);
    }
    setIsTopLevelFormOpen(false);
  };


  // --- Handlers: Unidades ---
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
    if (!unitFormData.parentId) return toast.error(`Selecione um(a) ${topLevelLabel} a qual esta unidade pertence.`);

    // Validação de duplicidade na empresa toda
    const isDuplicate = companyUnits.some(o => o.name.toLowerCase() === name.toLowerCase() && o.id !== editingUnitId);
    if (isDuplicate) return toast.error(`Já existe uma ${unitLabel.toLowerCase()} com este nome nesta empresa.`);

    if (editingUnitId) {
      updateOrgUnit(editingUnitId, { name, parentId: unitFormData.parentId, active: unitFormData.active });
      toast.success(`${unitLabel} atualizada com sucesso!`);
    } else {
      addOrgUnit({ companyId: company.id, name, parentId: unitFormData.parentId, active: unitFormData.active });
      toast.success(`${unitLabel} cadastrada com sucesso!`);
    }
    setIsUnitFormOpen(false);
  };


  // --- Handlers: Exclusão ---
  const confirmDelete = (id: string, name: string, type: 'TOP_LEVEL' | 'UNIT') => {
    setItemToDelete({ id, name, type });
    setIsDeleteOpen(true);
  };

  const handleDelete = () => {
    if (!itemToDelete) return;
    
    if (itemToDelete.type === 'TOP_LEVEL') {
      deleteOrgTopLevel(itemToDelete.id);
      toast.success(`${topLevelLabel} e suas unidades excluídas com sucesso.`);
    } else {
      deleteOrgUnit(itemToDelete.id);
      toast.success(`${unitLabel} excluída com sucesso.`);
    }
    
    setIsDeleteOpen(false);
  };

  return (
    <div className="max-w-5xl mx-auto pb-12 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Network className="text-indigo-600" size={28} />
          Estrutura Organizacional
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Personalize as nomenclaturas e gerencie as áreas da sua empresa.
        </p>
      </div>

      {/* BLOCO 1: Nomenclaturas */}
      <form onSubmit={handleSaveSettings} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 border-b border-slate-100 pb-2">Configuração de Nomenclaturas</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-base">
                  <Building2 size={18} className="text-slate-400" /> Nome do Nível Superior
              </Label>
              <p className="text-xs text-slate-500 leading-relaxed">
                  Grandes agrupamentos ou divisões (Ex: Regional, Diretoria, Grupo).
              </p>
              <Input 
                placeholder="Ex: Regional" 
                value={configData.orgTopLevelName} 
                onChange={(e) => setConfigData({...configData, orgTopLevelName: e.target.value})} 
              />
            </div>
            
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-base">
                  <Store size={18} className="text-slate-400" /> Nome da Unidade Base
              </Label>
              <p className="text-xs text-slate-500 leading-relaxed">
                  Ponta operacional do negócio (Ex: Loja, Unidade, Filial).
              </p>
              <Input 
                placeholder="Ex: Loja" 
                value={configData.orgUnitName} 
                onChange={(e) => setConfigData({...configData, orgUnitName: e.target.value})} 
              />
            </div>
          </div>
        </div>
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end">
          <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-2">
            <Save size={16} /> Salvar Nomenclaturas
          </Button>
        </div>
      </form>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* BLOCO 2: Cadastro do Nível Superior */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
          <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
             <div>
               <h2 className="text-base font-semibold text-slate-900">Gestão de {topLevelLabel}s</h2>
               <p className="text-xs text-slate-500 mt-0.5">Agrupadores de {unitLabel.toLowerCase()}s.</p>
             </div>
             <Button onClick={openCreateTopLevel} size="sm" className="bg-indigo-600 hover:bg-indigo-700 shadow-sm shrink-0">
               <Plus size={16} className="mr-1" /> Novo
             </Button>
          </div>

          <div className="overflow-x-auto flex-1 min-h-[300px]">
            <table className="w-full text-left text-sm text-slate-600">
               <thead className="bg-slate-50 border-b border-slate-200 text-slate-900 font-semibold">
                  <tr>
                     <th className="p-4 w-12 text-center">Status</th>
                     <th className="p-4">{topLevelLabel}</th>
                     <th className="p-4 text-right">Ações</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {companyTopLevels.map(item => (
                     <tr key={item.id} className={`hover:bg-slate-50 transition-colors ${!item.active ? 'opacity-60 bg-slate-50/50' : ''}`}>
                        <td className="p-4 text-center">
                           {item.active ? <CheckCircle2 className="text-emerald-500 mx-auto" size={18} /> : <XCircle className="text-slate-400 mx-auto" size={18} />}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-md bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                                <Building2 size={16} className="text-indigo-600" />
                             </div>
                             <p className="font-semibold text-slate-900 truncate max-w-[150px]">{item.name}</p>
                          </div>
                        </td>
                        <td className="p-4 text-right">
                           <div className="flex items-center justify-end gap-1">
                             <Switch checked={item.active} onCheckedChange={() => toggleOrgTopLevelStatus(item.id)} title="Ativar/Inativar" />
                             <div className="h-5 w-px bg-slate-200 mx-1"></div>
                             <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600" onClick={() => openEditTopLevel(item)}><Edit2 size={14} /></Button>
                             <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600" onClick={() => confirmDelete(item.id, item.name, 'TOP_LEVEL')}><Trash2 size={14} /></Button>
                           </div>
                        </td>
                     </tr>
                  ))}
                  {companyTopLevels.length === 0 && (
                    <tr>
                      <td colSpan={3} className="p-8 text-center text-slate-500">
                        <Building2 size={32} className="text-slate-300 mx-auto mb-2" />
                        <p className="font-medium text-slate-900">Nenhum(a) {topLevelLabel.toLowerCase()} cadastrado(a)</p>
                      </td>
                    </tr>
                  )}
               </tbody>
            </table>
          </div>
        </div>

        {/* BLOCO 3: Cadastro das Unidades */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
          <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
             <div>
               <h2 className="text-base font-semibold text-slate-900">Gestão de {unitLabel}s</h2>
               <p className="text-xs text-slate-500 mt-0.5">Ponta da operação vinculada aos níveis.</p>
             </div>
             <Button onClick={openCreateUnit} size="sm" className="bg-indigo-600 hover:bg-indigo-700 shadow-sm shrink-0" disabled={companyTopLevels.length === 0}>
               <Plus size={16} className="mr-1" /> Nova
             </Button>
          </div>

          <div className="overflow-x-auto flex-1 min-h-[300px]">
            <table className="w-full text-left text-sm text-slate-600">
               <thead className="bg-slate-50 border-b border-slate-200 text-slate-900 font-semibold">
                  <tr>
                     <th className="p-4 w-12 text-center">Status</th>
                     <th className="p-4">{unitLabel} / {topLevelLabel}</th>
                     <th className="p-4 text-right">Ações</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {companyUnits.map(unit => {
                     const parent = companyTopLevels.find(t => t.id === unit.parentId);
                     return (
                       <tr key={unit.id} className={`hover:bg-slate-50 transition-colors ${!unit.active ? 'opacity-60 bg-slate-50/50' : ''}`}>
                          <td className="p-4 text-center">
                             {unit.active ? <CheckCircle2 className="text-emerald-500 mx-auto" size={18} /> : <XCircle className="text-slate-400 mx-auto" size={18} />}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                               <div className="w-8 h-8 rounded-md bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                                  <Store size={16} className="text-emerald-600" />
                               </div>
                               <div>
                                  <p className="font-semibold text-slate-900 truncate max-w-[150px]">{unit.name}</p>
                                  <p className="text-[10px] text-slate-500 font-medium mt-0.5 truncate max-w-[150px]">{parent?.name || 'Nível Excluído'}</p>
                               </div>
                            </div>
                          </td>
                          <td className="p-4 text-right">
                             <div className="flex items-center justify-end gap-1">
                               <Switch checked={unit.active} onCheckedChange={() => toggleOrgUnitStatus(unit.id)} title="Ativar/Inativar" />
                               <div className="h-5 w-px bg-slate-200 mx-1"></div>
                               <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600" onClick={() => openEditUnit(unit)}><Edit2 size={14} /></Button>
                               <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600" onClick={() => confirmDelete(unit.id, unit.name, 'UNIT')}><Trash2 size={14} /></Button>
                             </div>
                          </td>
                       </tr>
                     );
                  })}
                  {companyUnits.length === 0 && (
                    <tr>
                      <td colSpan={3} className="p-8 text-center text-slate-500">
                        <Store size={32} className="text-slate-300 mx-auto mb-2" />
                        <p className="font-medium text-slate-900">Nenhuma {unitLabel.toLowerCase()} cadastrada</p>
                        {companyTopLevels.length === 0 && <p className="text-xs mt-1 text-red-500">Crie o {topLevelLabel.toLowerCase()} primeiro.</p>}
                      </td>
                    </tr>
                  )}
               </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL CRIAR/EDITAR NÍVEL SUPERIOR */}
      <Dialog open={isTopLevelFormOpen} onOpenChange={setIsTopLevelFormOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader><DialogTitle>{editingTopLevelId ? `Editar ${topLevelLabel}` : `Novo(a) ${topLevelLabel}`}</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveTopLevel} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Nome do(a) {topLevelLabel} *</Label>
              <Input placeholder={`Ex: ${topLevelLabel} Sul`} value={topLevelFormData.name} onChange={(e) => setTopLevelFormData({...topLevelFormData, name: e.target.value})} autoFocus />
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 mt-2">
              <div className="space-y-0.5">
                 <Label>Status</Label>
                 <p className="text-xs text-slate-500">{topLevelFormData.active ? 'Ativo no sistema' : 'Inativo e oculto'}</p>
              </div>
              <Switch checked={topLevelFormData.active} onCheckedChange={(checked) => setTopLevelFormData({...topLevelFormData, active: checked})} />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-4">
              <Button type="button" variant="outline" onClick={() => setIsTopLevelFormOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">Salvar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL CRIAR/EDITAR UNIDADE */}
      <Dialog open={isUnitFormOpen} onOpenChange={setIsUnitFormOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader><DialogTitle>{editingUnitId ? `Editar ${unitLabel}` : `Nova ${unitLabel}`}</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveUnit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Pertence ao {topLevelLabel} *</Label>
              <select 
                value={unitFormData.parentId} 
                onChange={(e) => setUnitFormData({...unitFormData, parentId: e.target.value})}
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500"
              >
                 <option value="" disabled>Selecione um(a) {topLevelLabel.toLowerCase()}</option>
                 {companyTopLevels.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                 ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Nome da {unitLabel} *</Label>
              <Input placeholder={`Ex: ${unitLabel} Centro`} value={unitFormData.name} onChange={(e) => setUnitFormData({...unitFormData, name: e.target.value})} />
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 mt-2">
              <div className="space-y-0.5">
                 <Label>Status</Label>
                 <p className="text-xs text-slate-500">{unitFormData.active ? 'Ativa no sistema' : 'Inativa e oculta'}</p>
              </div>
              <Switch checked={unitFormData.active} onCheckedChange={(checked) => setUnitFormData({...unitFormData, active: checked})} />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-4">
              <Button type="button" variant="outline" onClick={() => setIsUnitFormOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">Salvar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL CONFIRMAR EXCLUSÃO GERAL */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle className="text-red-600">Excluir Registro</DialogTitle></DialogHeader>
          <div className="py-4">
             <p className="text-slate-600 text-sm">Tem certeza que deseja excluir <strong>{itemToDelete?.name}</strong>?</p>
             {itemToDelete?.type === 'TOP_LEVEL' && (
               <p className="text-red-500 text-sm mt-2 font-medium">Atenção: Todas as {unitLabel.toLowerCase()}s vinculadas a este nível também serão excluídas!</p>
             )}
          </div>
          <div className="flex justify-end gap-3">
             <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancelar</Button>
             <Button variant="destructive" onClick={handleDelete}>Sim, excluir</Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};