import { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { mockThemes } from '../../data/mock';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { CheckCircle2, XCircle, Building, Edit2, Trash2, Users, ArrowLeft } from 'lucide-react';
import { Company, User } from '../../types';

export const SuperAdminDashboard = () => {
  const { companies, users, addCompany, updateCompany, deleteCompany, toggleCompanyStatus, addUser, updateUser, deleteUser, toggleUserStatus } = useAppStore();
  
  // Estados - Company Modal
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', logoUrl: '', active: true });

  // Estados - Exclusão Company
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<{id: string, name: string} | null>(null);

  // Estados - Admins Modal
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);
  const [adminFormView, setAdminFormView] = useState(false);
  const [editingAdminId, setEditingAdminId] = useState<string | null>(null);
  const [adminFormData, setAdminFormData] = useState({ name: '', email: '', password: '', active: true });

  const previewSlug = formData.name.toLowerCase().trim().replace(/[\s\W-]+/g, '-');

  // ---- FUNÇÕES COMPANY ----
  const openCreate = () => {
    setEditingId(null);
    setFormData({ name: '', logoUrl: '', active: true });
    setIsFormOpen(true);
  };

  const openEdit = (company: Company) => {
    setEditingId(company.id);
    setFormData({ name: company.name, logoUrl: company.logoUrl || '', active: company.active });
    setIsFormOpen(true);
  };

  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    const name = formData.name.trim();
    if (!name) return toast.error('O nome da empresa é obrigatório');

    const isDuplicate = companies.some(c => c.slug === previewSlug && c.id !== editingId);
    if (isDuplicate) return toast.error('Já existe uma empresa registrada com este nome.');

    if (editingId) {
      updateCompany(editingId, { name, slug: previewSlug, logoUrl: formData.logoUrl, active: formData.active });
      toast.success('Empresa atualizada com sucesso!');
    } else {
      addCompany({ name, logoUrl: formData.logoUrl, active: formData.active, theme: mockThemes.corporateBlue });
      toast.success('Empresa criada! Admin padrão gerado.');
    }
    setIsFormOpen(false);
  };

  const handleDeleteCompany = () => {
    if (companyToDelete) {
      deleteCompany(companyToDelete.id);
      toast.success('Empresa e usuários excluídos com sucesso.');
      setIsDeleteOpen(false);
    }
  };

  // ---- FUNÇÕES ADMINS ----
  const openAdminsModal = (company: Company) => {
    setActiveCompany(company);
    setAdminFormView(false);
    setAdminModalOpen(true);
  };

  const openAdminCreate = () => {
    setEditingAdminId(null);
    setAdminFormData({ name: '', email: '', password: '', active: true });
    setAdminFormView(true);
  };

  const openAdminEdit = (admin: User) => {
    setEditingAdminId(admin.id);
    setAdminFormData({ name: admin.name, email: admin.email, password: admin.password || '', active: admin.active !== false });
    setAdminFormView(true);
  };

  const handleSaveAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompany) return;
    
    if (!adminFormData.name || !adminFormData.email || (!editingAdminId && !adminFormData.password)) {
      return toast.error('Preencha os campos obrigatórios.');
    }

    const emailInUse = users.some(u => u.email === adminFormData.email && u.id !== editingAdminId);
    if (emailInUse) return toast.error('Este e-mail já está em uso.');

    if (editingAdminId) {
      updateUser(editingAdminId, { 
        name: adminFormData.name, 
        email: adminFormData.email,
        ...(adminFormData.password ? { password: adminFormData.password } : {}),
        active: adminFormData.active 
      });
      toast.success('Admin atualizado!');
    } else {
      addUser({
        name: adminFormData.name,
        email: adminFormData.email,
        password: adminFormData.password,
        role: 'ADMIN',
        companyId: activeCompany.id,
        active: adminFormData.active
      });
      toast.success('Admin criado!');
    }
    setAdminFormView(false);
  };

  const handleDeleteAdmin = (id: string) => {
    if(confirm('Tem certeza que deseja excluir este admin?')) {
      deleteUser(id);
      toast.success('Admin removido.');
    }
  };

  const activeAdmins = users.filter(u => u.companyId === activeCompany?.id && u.role === 'ADMIN');

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
      
      {/* TABELA DE EMPRESAS */}
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
                         {company.active ? <CheckCircle2 className="text-emerald-500" size={20} /> : <XCircle className="text-slate-300" size={20} />}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                            {company.logoUrl ? <img src={company.logoUrl} alt={company.name} className="w-full h-full object-cover" /> : <Building className="text-slate-400" size={18} />}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{company.name}</p>
                            <p className="text-xs text-slate-500 font-mono">ID: {company.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-xs text-slate-500">{company.slug}</td>
                      <td className="p-4 text-slate-500">{new Date(company.updatedAt || company.createdAt).toLocaleDateString('pt-BR')}</td>
                      <td className="p-4 text-right">
                         <div className="flex items-center justify-end gap-1 md:gap-2">
                           <Switch 
                             checked={company.active} 
                             onCheckedChange={() => toggleCompanyStatus(company.id)}
                             title="Ativar/Desativar"
                           />
                           <div className="h-6 w-px bg-slate-200 mx-1"></div>
                           <Button variant="ghost" size="icon" onClick={() => openAdminsModal(company)} title="Gerenciar Admins" className="text-slate-400 hover:text-indigo-600">
                             <Users size={16} />
                           </Button>
                           <Button variant="ghost" size="icon" onClick={() => openEdit(company)} className="text-slate-400 hover:text-blue-600">
                             <Edit2 size={16} />
                           </Button>
                           <Button variant="ghost" size="icon" onClick={() => {setCompanyToDelete({id: company.id, name: company.name}); setIsDeleteOpen(true);}} className="text-slate-400 hover:text-red-600">
                             <Trash2 size={16} />
                           </Button>
                         </div>
                      </td>
                   </tr>
                ))}
                {companies.length === 0 && (
                  <tr><td colSpan={5} className="p-8 text-center text-slate-500">Nenhuma empresa cadastrada ainda.</td></tr>
                )}
             </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: NOVA/EDITAR COMPANY */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle>{editingId ? 'Editar Empresa' : 'Nova Empresa'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveCompany} className="space-y-6 mt-4">
            <div className="space-y-2">
              <Label>Nome da Empresa *</Label>
              <Input placeholder="Ex: Globex" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} autoFocus />
              {formData.name && <p className="text-[10px] text-slate-400 font-mono mt-1">Slug gerado: {previewSlug}</p>}
            </div>
            <div className="space-y-2">
              <Label>URL da Logo (Opcional)</Label>
              <Input placeholder="https://..." value={formData.logoUrl} onChange={(e) => setFormData({...formData, logoUrl: e.target.value})} />
            </div>
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="space-y-0.5">
                <Label>Status da Conta</Label>
                <p className="text-xs text-slate-500">Se inativo, usuários não poderão logar.</p>
              </div>
              <Switch checked={formData.active} onCheckedChange={(checked) => setFormData({...formData, active: checked})} />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
              <Button type="submit">{editingId ? 'Salvar Alterações' : 'Criar Empresa'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: EXCLUIR COMPANY */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle className="text-red-600">Excluir Empresa</DialogTitle></DialogHeader>
          <div className="py-4">
             <p className="text-slate-600 text-sm">Tem certeza que deseja excluir <strong>{companyToDelete?.name}</strong>?</p>
             <p className="text-red-500 text-sm mt-2 font-medium">Isso apagará também todos os usuários e dados vinculados localmente.</p>
          </div>
          <div className="flex justify-end gap-3">
             <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancelar</Button>
             <Button variant="destructive" onClick={handleDeleteCompany}>Sim, excluir</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL: GERENCIAR ADMINS */}
      <Dialog open={adminModalOpen} onOpenChange={setAdminModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
          <DialogHeader className="pb-4 border-b border-slate-100 flex-shrink-0">
             <DialogTitle className="flex items-center gap-2 text-xl">
               {adminFormView && (
                 <Button variant="ghost" size="icon" onClick={() => setAdminFormView(false)} className="-ml-2 h-8 w-8">
                   <ArrowLeft size={18} />
                 </Button>
               )}
               {adminFormView ? (editingAdminId ? 'Editar Admin' : 'Novo Admin') : `Admins: ${activeCompany?.name}`}
             </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto py-4">
            {!adminFormView ? (
              // LIST VIEW
              <div className="space-y-4">
                 <div className="flex justify-end">
                    <Button onClick={openAdminCreate} size="sm" className="bg-indigo-600 hover:bg-indigo-700">+ Novo Admin</Button>
                 </div>
                 {activeAdmins.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg border border-slate-100">
                       Nenhum administrador cadastrado para esta empresa.
                    </div>
                 ) : (
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                       {activeAdmins.map(admin => (
                          <div key={admin.id} className={`flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors ${admin.active === false ? 'opacity-60' : ''}`}>
                             <div>
                                <div className="flex items-center gap-2">
                                   <p className="font-semibold text-slate-900">{admin.name}</p>
                                   {admin.active === false && <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-medium">Inativo</span>}
                                </div>
                                <p className="text-sm text-slate-500">{admin.email}</p>
                             </div>
                             <div className="flex items-center gap-2">
                                <Switch checked={admin.active !== false} onCheckedChange={() => toggleUserStatus(admin.id)} title="Ativar/Desativar" className="mr-2" />
                                <Button variant="ghost" size="icon" onClick={() => openAdminEdit(admin)} className="text-slate-400 hover:text-blue-600 h-8 w-8">
                                  <Edit2 size={16} />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDeleteAdmin(admin.id)} className="text-slate-400 hover:text-red-600 h-8 w-8">
                                  <Trash2 size={16} />
                                </Button>
                             </div>
                          </div>
                       ))}
                    </div>
                 )}
              </div>
            ) : (
              // FORM VIEW
              <form id="admin-form" onSubmit={handleSaveAdmin} className="space-y-4 px-1">
                 <div className="space-y-2">
                    <Label>Nome Completo *</Label>
                    <Input placeholder="Ex: João Silva" value={adminFormData.name} onChange={(e) => setAdminFormData({...adminFormData, name: e.target.value})} autoFocus />
                 </div>
                 <div className="space-y-2">
                    <Label>E-mail *</Label>
                    <Input type="email" placeholder="admin@empresa.com" value={adminFormData.email} onChange={(e) => setAdminFormData({...adminFormData, email: e.target.value})} />
                 </div>
                 <div className="space-y-2">
                    <Label>{editingAdminId ? 'Nova Senha (deixe em branco para manter)' : 'Senha *'}</Label>
                    <Input type="text" placeholder="••••••••" value={adminFormData.password} onChange={(e) => setAdminFormData({...adminFormData, password: e.target.value})} />
                 </div>
                 <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 mt-2">
                    <div className="space-y-0.5">
                       <Label>Status do Admin</Label>
                       <p className="text-xs text-slate-500">Admins inativos não podem acessar o painel.</p>
                    </div>
                    <Switch checked={adminFormData.active} onCheckedChange={(checked) => setAdminFormData({...adminFormData, active: checked})} />
                 </div>
              </form>
            )}
          </div>

          <div className="flex-shrink-0 pt-4 border-t border-slate-100 flex justify-end gap-3">
             {adminFormView ? (
                <>
                  <Button variant="outline" onClick={() => setAdminFormView(false)}>Cancelar</Button>
                  <Button type="submit" form="admin-form">Salvar Admin</Button>
                </>
             ) : (
                <Button variant="outline" onClick={() => setAdminModalOpen(false)}>Fechar</Button>
             )}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};