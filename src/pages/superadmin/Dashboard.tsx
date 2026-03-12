import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { mockThemes } from '../../data/mock';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { CheckCircle2, XCircle, Building, Edit2, Trash2, Users, ArrowLeft, ExternalLink, Upload } from 'lucide-react';
import { Company, User } from '../../types';

export const SuperAdminDashboard = () => {
  const { companies, users, addCompany, updateCompany, deleteCompany, toggleCompanyStatus, addUser, updateUser, deleteUser, toggleUserStatus } = useAppStore();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'admins'>('details');
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', linkName: '', logoUrl: '', active: true });

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<{id: string, name: string} | null>(null);

  const [adminFormView, setAdminFormView] = useState(false);
  const [editingAdminId, setEditingAdminId] = useState<string | null>(null);
  const [adminFormData, setAdminFormData] = useState({ name: '', email: '', password: '', active: true });

  const totalCompanies = companies.length;
  const activeCompanies = companies.filter(c => c.active).length;
  const inactiveCompanies = totalCompanies - activeCompanies;
  const totalAdmins = users.filter(u => u.role === 'ADMIN').length;

  const sortedCompanies = [...companies].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     const newName = e.target.value;
     const newLinkName = newName.toLowerCase().trim().replace(/[\s\W-]+/g, '');
     
     if (!editingId && (!formData.linkName || formData.linkName === formData.name.toLowerCase().trim().replace(/[\s\W-]+/g, ''))) {
        setFormData({ ...formData, name: newName, linkName: newLinkName });
     } else {
        setFormData({ ...formData, name: newName });
     }
  };

  const handleLinkNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     const newLink = e.target.value.toLowerCase().replace(/[\s\W-]+/g, '');
     setFormData({ ...formData, linkName: newLink });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('A imagem deve ter no máximo 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, logoUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setActiveCompany(null);
    setFormData({ name: '', linkName: '', logoUrl: '', active: true });
    setActiveTab('details');
    setAdminFormView(false);
    setIsFormOpen(true);
  };

  const openEdit = (company: Company) => {
    setEditingId(company.id);
    setActiveCompany(company);
    setFormData({ name: company.name, linkName: company.linkName, logoUrl: company.logoUrl || '', active: company.active });
    setActiveTab('details');
    setAdminFormView(false);
    setIsFormOpen(true);
  };

  const handleSaveCompany = (e: React.FormEvent) => {
    e.preventDefault();
    const name = formData.name.trim();
    const linkName = formData.linkName.trim();
    
    if (!name || !linkName) return toast.error('Nome e Link da Empresa são obrigatórios.');

    const isDuplicate = companies.some(c => c.linkName === linkName && c.id !== editingId);
    if (isDuplicate) return toast.error('Este Link da Empresa já está em uso.');

    if (editingId) {
      updateCompany(editingId, { name, linkName, logoUrl: formData.logoUrl, active: formData.active });
      toast.success('Empresa atualizada com sucesso!');
    } else {
      addCompany({ name, linkName, logoUrl: formData.logoUrl, active: formData.active, theme: mockThemes.corporateBlue });
      toast.success('Empresa criada! Admin padrão gerado.');
    }
    setIsFormOpen(false);
    setEditingId(null);
  };

  const handleDeleteCompany = () => {
    if (companyToDelete) {
      deleteCompany(companyToDelete.id);
      toast.success('Empresa e usuários excluídos com sucesso.');
    }
    setIsDeleteOpen(false);
    setCompanyToDelete(null);
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
    setIsFormOpen(false);
    setEditingAdminId(null);
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
           <h1 className="text-2xl font-bold text-slate-900">Dashboard do Super Admin</h1>
           <p className="text-sm text-slate-500 mt-1">Visão geral e gestão de Tenants (Empresas)</p>
         </div>
         <Button onClick={openCreate} className="bg-slate-900 hover:bg-slate-800 text-white">
            + Nova Company
         </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0"><Building size={24} /></div>
          <div><p className="text-sm font-medium text-slate-500">Total Companies</p><p className="text-2xl font-bold text-slate-900">{totalCompanies}</p></div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shrink-0"><CheckCircle2 size={24} /></div>
          <div><p className="text-sm font-medium text-slate-500">Ativas</p><p className="text-2xl font-bold text-slate-900">{activeCompanies}</p></div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center shrink-0"><XCircle size={24} /></div>
          <div><p className="text-sm font-medium text-slate-500">Inativas</p><p className="text-2xl font-bold text-slate-900">{inactiveCompanies}</p></div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center shrink-0"><Users size={24} /></div>
          <div><p className="text-sm font-medium text-slate-500">Total Admins</p><p className="text-2xl font-bold text-slate-900">{totalAdmins}</p></div>
        </div>
      </div>
      
      <h2 className="text-lg font-semibold text-slate-900 mb-4">Empresas Cadastradas (Mais recentes)</h2>
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
             <thead className="bg-slate-50 border-b border-slate-200 text-slate-900 font-semibold">
                <tr>
                   <th className="p-4 w-16">Status</th>
                   <th className="p-4">Empresa</th>
                   <th className="p-4">Acesso e Rota</th>
                   <th className="p-4">Atualizado</th>
                   <th className="p-4 text-right">Ações</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
                {sortedCompanies.map(company => (
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
                      <td className="p-4">
                         <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">/admin/{company.linkName}</span>
                            <Button asChild variant="outline" size="sm" className="h-7 text-xs flex items-center gap-1 text-indigo-600 border-indigo-200 hover:bg-indigo-50">
                               <Link to={`/admin/${company.linkName}`}>
                                 Entrar <ExternalLink size={12} />
                               </Link>
                            </Button>
                         </div>
                      </td>
                      <td className="p-4 text-slate-500">{new Date(company.updatedAt || company.createdAt).toLocaleDateString('pt-BR')}</td>
                      <td className="p-4 text-right">
                         <div className="flex items-center justify-end gap-1 md:gap-2">
                           <Switch checked={company.active} onCheckedChange={() => toggleCompanyStatus(company.id)} title="Ativar/Desativar" />
                           <div className="h-6 w-px bg-slate-200 mx-1"></div>
                           <Button variant="ghost" size="icon" onClick={() => openEdit(company)} title="Editar Empresa e Administradores" className="text-slate-400 hover:text-blue-600"><Edit2 size={16} /></Button>
                           <Button variant="ghost" size="icon" onClick={() => {setCompanyToDelete({id: company.id, name: company.name}); setIsDeleteOpen(true);}} title="Excluir Empresa" className="text-slate-400 hover:text-red-600"><Trash2 size={16} /></Button>
                         </div>
                      </td>
                   </tr>
                ))}
                {sortedCompanies.length === 0 && (
                  <tr><td colSpan={5} className="p-8 text-center text-slate-500">Nenhuma empresa cadastrada ainda.</td></tr>
                )}
             </tbody>
          </table>
        </div>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
             <DialogTitle className="text-xl">
               {editingId ? 'Gerenciar Empresa' : 'Nova Empresa'}
             </DialogTitle>
          </DialogHeader>

          {editingId && !adminFormView && (
            <div className="flex border-b border-slate-200 mt-2">
              <button
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'details' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                onClick={() => setActiveTab('details')}
              >
                Detalhes da Empresa
              </button>
              <button
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'admins' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                onClick={() => setActiveTab('admins')}
              >
                Administradores
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto py-2">
            {activeTab === 'details' ? (
              <form id="company-form" onSubmit={handleSaveCompany} className="space-y-6 mt-2 px-1">
                <div className="space-y-2">
                  <Label>Nome da Empresa *</Label>
                  <Input placeholder="Ex: Globex" value={formData.name} onChange={handleNameChange} autoFocus />
                </div>
                
                <div className="space-y-2">
                  <Label>Link do Admin *</Label>
                  <div className="flex shadow-sm rounded-md overflow-hidden border border-slate-200">
                    <span className="flex items-center px-3 bg-slate-50 text-slate-500 text-sm font-mono border-r border-slate-200">/admin/</span>
                    <Input className="border-0 rounded-none focus-visible:ring-0 px-2" placeholder="globex" value={formData.linkName} onChange={handleLinkNameChange} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Logo da Empresa</Label>
                  <div className="flex gap-4 items-start">
                     <div className="w-16 h-16 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0 mt-1">
                        {formData.logoUrl ? (
                          <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                          <Building className="text-slate-400" size={24} />
                        )}
                     </div>
                     <div className="flex-1 space-y-2">
                        <Input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleImageUpload}
                          className="hidden" 
                          id="logo-upload"
                        />
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => document.getElementById('logo-upload')?.click()}
                          className="w-full flex items-center justify-center gap-2 h-9"
                        >
                          <Upload size={16} /> Fazer Upload da Imagem
                        </Button>
                        <div className="flex items-center gap-2">
                           <span className="text-xs text-slate-400 font-medium">OU</span>
                           <Input 
                             placeholder="Cole a URL da imagem (https://...)" 
                             value={formData.logoUrl} 
                             onChange={(e) => setFormData({...formData, logoUrl: e.target.value})} 
                             className="h-9 text-xs"
                           />
                        </div>
                     </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="space-y-0.5">
                    <Label>Status da Conta</Label>
                    <p className="text-xs text-slate-500">Se inativo, usuários não poderão logar.</p>
                  </div>
                  <Switch checked={formData.active} onCheckedChange={(checked) => setFormData({...formData, active: checked})} />
                </div>
              </form>
            ) : (
              <div className="px-1 mt-2">
                {!adminFormView ? (
                  <div className="space-y-4">
                     <div className="flex justify-between items-center">
                        <p className="text-sm text-slate-500">Gestão de acesso ao painel da {activeCompany?.name}</p>
                        <Button onClick={openAdminCreate} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">+ Novo Admin</Button>
                     </div>
                     {activeAdmins.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg border border-slate-100">Nenhum administrador cadastrado.</div>
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
                                    <Button variant="ghost" size="icon" onClick={() => openAdminEdit(admin)} className="text-slate-400 hover:text-blue-600 h-8 w-8"><Edit2 size={16} /></Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleDeleteAdmin(admin.id)} className="text-slate-400 hover:text-red-600 h-8 w-8"><Trash2 size={16} /></Button>
                                 </div>
                              </div>
                           ))}
                        </div>
                     )}
                  </div>
                ) : (
                  <div className="space-y-4">
                     <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
                       <Button variant="ghost" size="icon" onClick={() => setAdminFormView(false)} className="h-8 w-8 text-slate-500 -ml-2"><ArrowLeft size={18} /></Button>
                       <h3 className="text-lg font-semibold text-slate-900">{editingAdminId ? 'Editar Admin' : 'Novo Admin'}</h3>
                     </div>
                     <form id="admin-form" onSubmit={handleSaveAdmin} className="space-y-4">
                       <div className="space-y-2"><Label>Nome Completo *</Label><Input placeholder="Ex: João Silva" value={adminFormData.name} onChange={(e) => setAdminFormData({...adminFormData, name: e.target.value})} autoFocus /></div>
                       <div className="space-y-2"><Label>E-mail *</Label><Input type="email" placeholder="admin@empresa.com" value={adminFormData.email} onChange={(e) => setAdminFormData({...adminFormData, email: e.target.value})} /></div>
                       <div className="space-y-2"><Label>{editingAdminId ? 'Nova Senha (deixe em branco para manter)' : 'Senha *'}</Label><Input type="text" placeholder="••••••••" value={adminFormData.password} onChange={(e) => setAdminFormData({...adminFormData, password: e.target.value})} /></div>
                       <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 mt-2">
                          <div className="space-y-0.5"><Label>Status do Admin</Label><p className="text-xs text-slate-500">Admins inativos não podem acessar o painel.</p></div>
                          <Switch checked={adminFormData.active} onCheckedChange={(checked) => setAdminFormData({...adminFormData, active: checked})} />
                       </div>
                     </form>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex-shrink-0 pt-4 border-t border-slate-100 flex justify-end gap-3 mt-2">
            {activeTab === 'details' ? (
              <>
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
                <Button type="submit" form="company-form" className="bg-indigo-600 hover:bg-indigo-700 text-white">{editingId ? 'Salvar Alterações' : 'Criar Empresa'}</Button>
              </>
            ) : (
              adminFormView ? (
                <>
                  <Button type="button" variant="outline" onClick={() => setAdminFormView(false)}>Cancelar</Button>
                  <Button type="submit" form="admin-form" className="bg-indigo-600 hover:bg-indigo-700 text-white">Salvar Admin</Button>
                </>
              ) : (
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Fechar</Button>
              )
            )}
          </div>
        </DialogContent>
      </Dialog>

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
    </div>
  );
};