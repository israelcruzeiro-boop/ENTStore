import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { mockThemes } from '../../data/mock';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { CheckCircle2, XCircle, Building, Edit2, Trash2 } from 'lucide-react';

export const SuperAdminDashboard = () => {
  const { companies, addCompany, updateCompany, deleteCompany, toggleCompanyStatus } = useAppStore();
  
  // Estados para Modal de Criação/Edição
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', logoUrl: '', active: true });

  // Estados para Modal de Exclusão
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<{id: string, name: string} | null>(null);

  // Geração de Slug em tempo real para preview
  const previewSlug = formData.name.toLowerCase().trim().replace(/[\s\W-]+/g, '-');

  const openCreate = () => {
    setEditingId(null);
    setFormData({ name: '', logoUrl: '', active: true });
    setIsFormOpen(true);
  };

  const openEdit = (company: any) => {
    setEditingId(company.id);
    setFormData({ name: company.name, logoUrl: company.logoUrl || '', active: company.active });
    setIsFormOpen(true);
  };

  const confirmDelete = (company: any) => {
    setCompanyToDelete({ id: company.id, name: company.name });
    setIsDeleteOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    const name = formData.name.trim();
    if (!name) return toast.error('O nome da empresa é obrigatório');

    const slug = previewSlug;
    
    // Validação de Duplicidade
    const isDuplicate = companies.some(c => c.slug === slug && c.id !== editingId);
    if (isDuplicate) {
      return toast.error('Já existe uma empresa registrada com este nome (slug duplicado).');
    }

    if (editingId) {
      updateCompany(editingId, {
        name: formData.name,
        slug: slug,
        logoUrl: formData.logoUrl,
        active: formData.active
      });
      toast.success('Empresa atualizada com sucesso!');
    } else {
      addCompany({
        name: formData.name,
        logoUrl: formData.logoUrl,
        active: formData.active,
        theme: mockThemes.corporateBlue // Tema Padrão
      });
      toast.success('Empresa criada! Admin padrão gerado.');
    }

    setIsFormOpen(false);
  };

  const handleDelete = () => {
    if (companyToDelete) {
      deleteCompany(companyToDelete.id);
      toast.success('Empresa e usuários vinculados excluídos com sucesso.');
      setIsDeleteOpen(false);
      setCompanyToDelete(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
         <div>
           <h1 className="text-2xl font-bold text-slate-900">Gestão de Empresas (Tenants)</h1>
           <p className="text-sm text-slate-500 mt-1">Gerencie os clientes da plataforma ENTStore</p>
         </div>
         <Button onClick={openCreate} className="bg-slate-900 hover:bg-slate-800">
            + Nova Company
         </Button>
      </div>
      
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
             <thead className="bg-slate-50 border-b border-slate-200 text-slate-900 font-semibold">
                <tr>
                   <th className="p-4 w-16">Status</th>
                   <th className="p-4">Empresa</th>
                   <th className="p-4">Slug</th>
                   <th className="p-4">Atualizado em</th>
                   <th className="p-4 text-right">Ações</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
                {companies.map(company => (
                   <tr key={company.id} className={`hover:bg-slate-50 transition-colors ${!company.active ? 'opacity-60' : ''}`}>
                      <td className="p-4">
                         {company.active ? (
                           <CheckCircle2 className="text-emerald-500" size={20} />
                         ) : (
                           <XCircle className="text-slate-300" size={20} />
                         )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                            {company.logoUrl ? (
                              <img src={company.logoUrl} alt={company.name} className="w-full h-full object-cover" />
                            ) : (
                              <Building className="text-slate-400" size={18} />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{company.name}</p>
                            <p className="text-xs text-slate-500 font-mono">ID: {company.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-xs text-slate-500">
                        {company.slug}
                      </td>
                      <td className="p-4 text-slate-500">
                        {new Date(company.updatedAt || company.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="p-4 text-right">
                         <div className="flex items-center justify-end gap-2">
                           <Switch 
                             checked={company.active} 
                             onCheckedChange={() => toggleCompanyStatus(company.id)}
                             title="Ativar/Desativar"
                             className="mr-2"
                           />
                           <Button variant="ghost" size="icon" onClick={() => openEdit(company)} className="text-slate-400 hover:text-blue-600">
                             <Edit2 size={16} />
                           </Button>
                           <Button variant="ghost" size="icon" onClick={() => confirmDelete(company)} className="text-slate-400 hover:text-red-600">
                             <Trash2 size={16} />
                           </Button>
                         </div>
                      </td>
                   </tr>
                ))}
                {companies.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      Nenhuma empresa cadastrada ainda.
                    </td>
                  </tr>
                )}
             </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DE CRIAÇÃO / EDIÇÃO */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Empresa' : 'Nova Empresa'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-6 mt-4">
            <div className="space-y-2">
              <Label>Nome da Empresa *</Label>
              <Input 
                placeholder="Ex: Globex Corporation" 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                autoFocus
              />
              {formData.name && (
                <p className="text-[10px] text-slate-400 font-mono mt-1">
                  Slug gerado: {previewSlug}
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label>URL da Logo (Opcional)</Label>
              <Input 
                placeholder="https://..." 
                value={formData.logoUrl}
                onChange={(e) => setFormData({...formData, logoUrl: e.target.value})}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="space-y-0.5">
                <Label>Status da Conta</Label>
                <p className="text-xs text-slate-500">Se inativo, usuários não poderão logar.</p>
              </div>
              <Switch 
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({...formData, active: checked})}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
              <Button type="submit">{editingId ? 'Salvar Alterações' : 'Criar Empresa'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-red-600">Excluir Empresa</DialogTitle>
          </DialogHeader>
          <div className="py-4">
             <p className="text-slate-600 text-sm">
               Tem certeza que deseja excluir a empresa <strong>{companyToDelete?.name}</strong>?
             </p>
             <p className="text-red-500 text-sm mt-2 font-medium">
               Aviso: Isso apagará também todos os usuários e dados vinculados a ela localmente.
             </p>
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