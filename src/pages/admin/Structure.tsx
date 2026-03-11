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
import { OrgTopLevel } from '../../types';

export const AdminStructure = () => {
  const { linkName } = useParams();
  const { companies, updateCompany, orgTopLevels, addOrgTopLevel, updateOrgTopLevel, deleteOrgTopLevel, toggleOrgTopLevelStatus } = useAppStore();
  
  const company = companies.find(c => c.linkName === linkName);

  // Estados: Nomenclaturas
  const [configData, setConfigData] = useState({
    orgTopLevelName: '',
    orgUnitName: ''
  });

  // Estados: Modal CRUD Nível Superior
  const [isTopLevelFormOpen, setIsTopLevelFormOpen] = useState(false);
  const [editingTopLevelId, setEditingTopLevelId] = useState<string | null>(null);
  const [topLevelFormData, setTopLevelFormData] = useState({ name: '', active: true });

  // Estados: Exclusão
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{id: string, name: string} | null>(null);

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

  const companyTopLevels = orgTopLevels.filter(o => o.companyId === company.id)
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

  // --- Handlers: Nível Superior (CRUD) ---
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

  const handleDeleteTopLevel = () => {
    if (itemToDelete) {
      deleteOrgTopLevel(itemToDelete.id);
      toast.success('Registro excluído com sucesso.');
      setIsDeleteOpen(false);
    }
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

      {/* BLOCO 2: Cadastro do Nível Superior */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
           <div>
             <h2 className="text-lg font-semibold text-slate-900">Gestão de {topLevelLabel}s</h2>
             <p className="text-sm text-slate-500 mt-1">Cadastre as áreas que vão agrupar suas {unitLabel}s.</p>
           </div>
           <Button onClick={openCreateTopLevel} className="bg-indigo-600 hover:bg-indigo-700 shadow-sm">
             <Plus size={16} className="mr-2" /> Novo(a) {topLevelLabel}
           </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
             <thead className="bg-slate-50 border-b border-slate-200 text-slate-900 font-semibold">
                <tr>
                   <th className="p-4 w-16 text-center">Status</th>
                   <th className="p-4">Nome do(a) {topLevelLabel}</th>
                   <th className="p-4">Cadastrado em</th>
                   <th className="p-4 text-right">Ações</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
                {companyTopLevels.map(item => (
                   <tr key={item.id} className={`hover:bg-slate-50 transition-colors ${!item.active ? 'opacity-60 bg-slate-50/50' : ''}`}>
                      <td className="p-4 text-center">
                         <div className="flex justify-center">
                            {item.active ? <CheckCircle2 className="text-emerald-500" size={20} title="Ativo" /> : <XCircle className="text-slate-400" size={20} title="Inativo" />}
                         </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                              <Building2 size={20} className="text-indigo-600" />
                           </div>
                           <p className="font-semibold text-slate-900 text-base">{item.name}</p>
                        </div>
                      </td>
                      <td className="p-4 text-slate-500 font-medium">
                         {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="p-4 text-right">
                         <div className="flex items-center justify-end gap-1 md:gap-2">
                           <Switch 
                             checked={item.active} 
                             onCheckedChange={() => { toggleOrgTopLevelStatus(item.id); toast.success('Status alterado!'); }} 
                             title="Ativar/Inativar" 
                           />
                           <div className="h-6 w-px bg-slate-200 mx-1"></div>
                           <Button variant="ghost" size="icon" onClick={() => openEditTopLevel(item)} className="text-slate-400 hover:text-blue-600">
                             <Edit2 size={16} />
                           </Button>
                           <Button variant="ghost" size="icon" onClick={() => { setItemToDelete({id: item.id, name: item.name}); setIsDeleteOpen(true); }} className="text-slate-400 hover:text-red-600">
                             <Trash2 size={16} />
                           </Button>
                         </div>
                      </td>
                   </tr>
                ))}
                {companyTopLevels.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-12 text-center text-slate-500">
                      <Building2 size={40} className="text-slate-300 mx-auto mb-3" />
                      <p className="text-lg font-medium text-slate-900">Nenhum(a) {topLevelLabel.toLowerCase()} cadastrado(a)</p>
                      <p className="text-sm mt-1">Crie o primeiro nível superior da sua estrutura.</p>
                    </td>
                  </tr>
                )}
             </tbody>
          </table>
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

      {/* MODAL CONFIRMAR EXCLUSÃO */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle className="text-red-600">Excluir {topLevelLabel}</DialogTitle></DialogHeader>
          <div className="py-4">
             <p className="text-slate-600 text-sm">Tem certeza que deseja excluir <strong>{itemToDelete?.name}</strong>?</p>
             <p className="text-red-500 text-sm mt-2 font-medium">Isso poderá impactar as unidades e usuários vinculados (futuro).</p>
          </div>
          <div className="flex justify-end gap-3">
             <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancelar</Button>
             <Button variant="destructive" onClick={handleDeleteTopLevel}>Sim, excluir</Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};