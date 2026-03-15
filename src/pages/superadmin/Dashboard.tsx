import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useCompanies, useUsers } from '../../hooks/useSupabaseData';
import { mockThemes } from '../../data/mock';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { CheckCircle2, XCircle, Building, Edit2, Trash2, Users, ArrowLeft, ExternalLink, Upload, Loader2 } from 'lucide-react';
import { Company, User, Theme } from '../../types';

// Proteção contra conflitos de rota
const RESERVED_SLUGS = ['admin', 'super-admin', 'login', 'api', 'assets', 'system', 'home', 'perfil', 'busca', 'hub', 'biblioteca'];

export const SuperAdminDashboard = () => {
  const { companies, mutate: mutateCompanies, isLoading: loadingCompanies } = useCompanies();
  const { users, mutate: mutateUsers, isLoading: loadingUsers } = useUsers();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'admins'>('details');
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', link_name: '', logo_url: '', active: true, landing_page_enabled: true });

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<{id: string, name: string} | null>(null);

  const [isDeleteAdminOpen, setIsDeleteAdminOpen] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState<{id: string, name: string} | null>(null);

  const [adminFormView, setAdminFormView] = useState(false);
  const [editingAdminId, setEditingAdminId] = useState<string | null>(null);
  const [adminFormData, setAdminFormData] = useState({ name: '', email: '', password: '', active: true });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalCompanies = companies.length;
  const activeCompanies = companies.filter(c => c.active).length;
  const inactiveCompanies = totalCompanies - activeCompanies;
  const totalAdmins = users.filter(u => u.role === 'ADMIN').length;

  const sortedCompanies = [...companies].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setTimeout(() => {
      setEditingId(null);
      setActiveCompany(null);
      setAdminFormView(false);
      setEditingAdminId(null);
      setFormData({ name: '', link_name: '', logo_url: '', active: true, landing_page_enabled: true });
      setAdminFormData({ name: '', email: '', password: '', active: true });
      setActiveTab('details');
    }, 300);
  };

  const handleCloseDelete = () => {
    setIsDeleteOpen(false);
    setTimeout(() => setCompanyToDelete(null), 300);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     const newName = e.target.value;
     const newLinkName = newName.toLowerCase().trim().replace(/[\s\W-]+/g, '');
     
     if (!editingId && (!formData.link_name || formData.link_name === formData.name.toLowerCase().trim().replace(/[\s\W-]+/g, ''))) {
        setFormData({ ...formData, name: newName, link_name: newLinkName });
     } else {
        setFormData({ ...formData, name: newName });
     }
  };

  const handleLinkNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     const newLink = e.target.value.toLowerCase().replace(/[\s\W-]+/g, '');
     setFormData({ ...formData, link_name: newLink });
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
        setFormData({ ...formData, logo_url: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setActiveCompany(null);
    setFormData({ name: '', link_name: '', logo_url: '', active: true, landing_page_enabled: true });
    setActiveTab('details');
    setAdminFormView(false);
    setIsFormOpen(true);
  };

  const openEdit = (company: Company) => {
    setEditingId(company.id);
    setActiveCompany(company);
    setFormData({ name: company.name, link_name: company.link_name, logo_url: company.logo_url || '', active: company.active !== false, landing_page_enabled: company.landing_page_enabled !== false });
    setActiveTab('details');
    setActiveTab('details');
    setAdminFormView(false);
    setIsFormOpen(true);
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = formData.name.trim();
    const link_name = formData.link_name.trim();
    
    if (!name || !link_name) return toast.error('Nome e Link da Empresa são obrigatórios.');

    if (RESERVED_SLUGS.includes(link_name)) {
      return toast.error(`"${link_name}" é um nome reservado pelo sistema e não pode ser utilizado.`);
    }

    const isDuplicate = companies.some(c => c.link_name === link_name && c.id !== editingId);
    if (isDuplicate) return toast.error('Este Link da Empresa já está em uso.');

    setIsSubmitting(true);
    if (editingId) {
      const { error } = await supabase.from('companies').update({
        name, link_name, logo_url: formData.logo_url, active: formData.active, landing_page_enabled: formData.landing_page_enabled
      }).eq('id', editingId);
      
      if (error) toast.error(`Erro ao atualizar empresa: ${error.message}`);
      else toast.success('Empresa atualizada com sucesso!');
    } else {
      const { error } = await supabase.from('companies').insert({
        name, 
        link_name, 
        slug: link_name, // Adicionado slug obrigatório
        logo_url: formData.logo_url, 
        active: formData.active, 
        landing_page_enabled: formData.landing_page_enabled,
        theme: mockThemes.corporateBlue as Theme
      });
      
      if (error) toast.error(`Erro ao criar empresa: ${error.message}`);
      else toast.success('Empresa criada com sucesso!');
    }
    
    await mutateCompanies();
    setIsSubmitting(false);
    handleCloseForm();
  };

  const handleDeleteCompany = async () => {
    if (companyToDelete) {
      setIsSubmitting(true);
      const { error } = await supabase.from('companies').delete().eq('id', companyToDelete.id);
      
      if (error) toast.error('Erro ao excluir empresa.');
      else {
        toast.success('Empresa excluída com sucesso.');
        mutateCompanies();
      }
      setIsSubmitting(false);
    }
    handleCloseDelete();
  };

  const toggleCompanyStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase.from('companies').update({ active: !currentStatus }).eq('id', id);
    if (error) toast.error('Erro ao alterar status.');
    else mutateCompanies();
  };

  const openAdminCreate = () => {
    setEditingAdminId(null);
    setAdminFormData({ name: '', email: '', password: '', active: true });
    setAdminFormView(true);
  };

  const openAdminEdit = (admin: User) => {
    setEditingAdminId(admin.id);
    setAdminFormData({ name: admin.name, email: admin.email || '', password: admin.password || '', active: admin.active !== false });
    setAdminFormView(true);
  };

  const handleSaveAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompany) return;
    
    if (!adminFormData.name || !adminFormData.email || (!editingAdminId && !adminFormData.password)) {
      return toast.error('Preencha os campos obrigatórios.');
    }

    const emailInUse = users.some(u => u.email === adminFormData.email && u.id !== editingAdminId);
    if (emailInUse) return toast.error('Este e-mail já está em uso.');

    setIsSubmitting(true);
    if (editingAdminId) {
      const { error } = await supabase.from('users').update({ 
        name: adminFormData.name, 
        email: adminFormData.email,
        ...(adminFormData.password ? { password: adminFormData.password } : {}),
        active: adminFormData.active 
      }).eq('id', editingAdminId);
      
      if (error) toast.error(`Erro ao atualizar admin: ${error.message}`);
      else toast.success('Admin atualizado!');
    } else {
      const { error } = await supabase.from('users').insert({
        name: adminFormData.name,
        email: adminFormData.email,
        password: adminFormData.password,
        role: 'ADMIN',
        company_id: activeCompany.id,
        active: adminFormData.active
      });
      
      if (error) toast.error(`Erro ao criar admin: ${error.message}`);
      else toast.success('Admin criado!');
    }
    
    await mutateUsers();
    setIsSubmitting(false);
    setAdminFormView(false);
  };

  const handleCloseDeleteAdmin = () => {
    setIsDeleteAdminOpen(false);
    setTimeout(() => setAdminToDelete(null), 300);
  };

  const handleDeleteAdmin = async () => {
    if (adminToDelete) {
      setIsSubmitting(true);
      const { error } = await supabase.from('users').delete().eq('id', adminToDelete.id);
      if (error) toast.error('Erro ao remover admin.');
      else { toast.success('Admin removido.'); mutateUsers(); }
      setIsSubmitting(false);
    }
    handleCloseDeleteAdmin();
  };

  const toggleUserStatus = async (id: string, currentStatus: boolean) => {
     const { error } = await supabase.from('users').update({ active: !currentStatus }).eq('id', id);
     if (error) toast.error('Erro ao alterar status.');
     else mutateUsers();
  };

  const activeAdmins = users.filter(u => u.company_id === activeCompany?.id && u.role === 'ADMIN');

  // Otimização: Apenas mostra o loader central na primeira carga (quando não há dados)
  // Isso evita que fundos/modais fechem durante revalidações do SWR
  const isInitialLoad = (loadingCompanies && companies.length === 0) || (loadingUsers && users.length === 0);

  if (isInitialLoad) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="animate-spin text-slate-300" size={40} />
      </div>
    );
  }

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
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0"><Users size={24} /></div>
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
                            {company.logo_url ? <img src={company.logo_url} alt={company.name} className="w-full h-full object-cover" /> : <Building className="text-slate-400" size={18} />}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{company.name}</p>
                            <p className="text-xs text-slate-500 font-mono">ID: {company.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                         <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">/{company.link_name}</span>
                            <Button asChild variant="outline" size="sm" className="h-7 text-xs flex items-center gap-1 text-blue-600 border-blue-200 hover:bg-blue-50">
                               <Link to={`/admin/${company.link_name}`}>
                                 Admin <ExternalLink size={12} />
                               </Link>
                            </Button>
                         </div>
                      </td>
                      <td className="p-4 text-slate-500">{new Date(company.updated_at || company.created_at).toLocaleDateString('pt-BR')}</td>
                      <td className="p-4 text-right">
                         <div className="flex items-center justify-end gap-1 md:gap-2">
                           <Switch checked={company.active} onCheckedChange={() => toggleCompanyStatus(company.id, company.active)} />
                           <div className="h-6 w-px bg-slate-200 mx-1"></div>
                           <Button variant="ghost" size="icon" onClick={() => openEdit(company)} className="text-slate-400 hover:text-blue-600"><Edit2 size={16} /></Button>
                           <Button variant="ghost" size="icon" onClick={() => {setCompanyToDelete({id: company.id, name: company.name}); setIsDeleteOpen(true);}} className="text-slate-400 hover:text-red-600"><Trash2 size={16} /></Button>
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

      <Dialog open={isFormOpen} onOpenChange={(open) => { if (!open && !isSubmitting) handleCloseForm(); }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
             <DialogTitle className="text-xl">
               {editingId ? 'Gerenciar Empresa' : 'Nova Empresa'}
             </DialogTitle>
          </DialogHeader>

          {editingId && !adminFormView && (
            <div className="flex border-b border-slate-200 mt-2">
              <button
                type="button"
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'details' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                onClick={() => setActiveTab('details')}
              >
                Detalhes da Empresa
              </button>
              <button
                type="button"
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'admins' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
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
                  <Label>Link de Acesso (URL) *</Label>
                  <div className="flex shadow-sm rounded-md overflow-hidden border border-slate-200">
                    <span className="flex items-center px-3 bg-slate-50 text-slate-500 text-sm font-mono border-r border-slate-200">seusite.com/</span>
                    <Input className="border-0 rounded-none focus-visible:ring-0 px-2" placeholder="globex" value={formData.link_name} onChange={handleLinkNameChange} />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Este slug servirá tanto para acesso do usuário (/{formData.link_name}/home) quanto para o admin (/admin/{formData.link_name}).</p>
                </div>

                <div className="space-y-2">
                  <Label>Logo da Empresa</Label>
                  <div className="flex gap-4 items-start">
                     <div className="w-16 h-16 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0 mt-1">
                        {formData.logo_url ? (
                          <img src={formData.logo_url} alt="Logo" className="w-full h-full object-cover" />
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
                             value={formData.logo_url} 
                             onChange={(e) => setFormData({...formData, logo_url: e.target.value})} 
                             className="h-9 text-xs"
                           />
                        </div>
                     </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="space-y-0.5">
                    <Label>Habilitar Módulo Landing Page</Label>
                    <p className="text-xs text-slate-500">Se desativado, o admin da empresa não poderá gerenciar a landing page.</p>
                  </div>
                  <Switch checked={formData.landing_page_enabled} onCheckedChange={(checked) => setFormData({...formData, landing_page_enabled: checked})} />
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
                        <Button type="button" onClick={openAdminCreate} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">+ Novo Admin</Button>
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
                                    <Switch checked={admin.active !== false} onCheckedChange={() => toggleUserStatus(admin.id, admin.active !== false)} title="Ativar/Desativar" className="mr-2" />
                                    <Button type="button" variant="ghost" size="icon" onClick={() => openAdminEdit(admin)} className="text-slate-400 hover:text-blue-600 h-8 w-8"><Edit2 size={16} /></Button>
                                     <Button type="button" variant="ghost" size="icon" onClick={() => { setAdminToDelete({id: admin.id, name: admin.name}); setIsDeleteAdminOpen(true); }} className="text-slate-400 hover:text-red-600 h-8 w-8"><Trash2 size={16} /></Button>
                                 </div>
                              </div>
                           ))}
                        </div>
                     )}
                  </div>
                ) : (
                  <div className="space-y-4">
                     <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
                       <Button type="button" variant="ghost" size="icon" onClick={() => setAdminFormView(false)} className="h-8 w-8 text-slate-500 -ml-2"><ArrowLeft size={18} /></Button>
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
                <Button type="button" variant="outline" onClick={handleCloseForm} disabled={isSubmitting}>Cancelar</Button>
                <Button type="submit" form="company-form" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : (editingId ? 'Salvar Alterações' : 'Criar Empresa')}
                </Button>
              </>
            ) : (
              adminFormView ? (
                <>
                  <Button type="button" variant="outline" onClick={() => setAdminFormView(false)} disabled={isSubmitting}>Cancelar</Button>
                  <Button type="submit" form="admin-form" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : 'Salvar Admin'}
                  </Button>
                </>
              ) : (
                <Button type="button" variant="outline" onClick={handleCloseForm} disabled={isSubmitting}>Fechar</Button>
              )
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={(open) => { if (!open && !isSubmitting) handleCloseDelete(); }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle className="text-red-600">Excluir Empresa</DialogTitle></DialogHeader>
          <div className="py-4">
             <p className="text-slate-600 text-sm">Tem certeza que deseja excluir <strong>{companyToDelete?.name}</strong>?</p>
             <p className="text-red-500 text-sm mt-2 font-medium">Isso apagará também todos os usuários e dados vinculados localmente.</p>
          </div>
          <div className="flex justify-end gap-3">
             <Button type="button" variant="outline" onClick={handleCloseDelete} disabled={isSubmitting}>Cancelar</Button>
             <Button type="button" variant="destructive" onClick={handleDeleteCompany} disabled={isSubmitting}>
               {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : 'Sim, excluir'}
             </Button>
          </div>
        </DialogContent>
       </Dialog>

      <Dialog open={isDeleteAdminOpen} onOpenChange={(open) => { if (!open && !isSubmitting) handleCloseDeleteAdmin(); }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle className="text-red-600">Excluir Administrador</DialogTitle></DialogHeader>
          <div className="py-4">
             <p className="text-slate-600 text-sm">Tem certeza que deseja excluir o admin <strong>{adminToDelete?.name}</strong>?</p>
             <p className="text-red-500 text-sm mt-2 font-medium">Esta ação não pode ser desfeita.</p>
          </div>
          <div className="flex justify-end gap-3">
             <Button type="button" variant="outline" onClick={handleCloseDeleteAdmin} disabled={isSubmitting}>Cancelar</Button>
             <Button type="button" variant="destructive" onClick={handleDeleteAdmin} disabled={isSubmitting}>
               {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : 'Sim, excluir'}
             </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};