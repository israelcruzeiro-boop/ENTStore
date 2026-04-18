import { useState, useEffect } from 'react';
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
import { CheckCircle2, XCircle, Building, Edit2, Trash2, Users, ArrowLeft, ExternalLink, Upload, Loader2, Plus } from 'lucide-react';
import { Company, User, Theme } from '../../types';
import { adminProvisioningSchema } from '../../types/schemas';
import { z } from 'zod';
import { Logger } from '../../utils/logger';
import { uploadToSupabase } from '../../lib/storage';

const RESERVED_SLUGS = ['admin', 'super-admin', 'login', 'api', 'assets', 'system', 'home', 'perfil', 'busca', 'hub', 'biblioteca'];

export const SuperAdminDashboard = () => {
  const { companies, mutate: mutateCompanies, isLoading: loadingCompanies } = useCompanies(true);
  const { users, mutate: mutateUsers, isLoading: loadingUsers } = useUsers(undefined, true);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'admins'>('details');
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({ 
    name: '', link_name: '', logo_url: '', active: true, 
    landing_page_enabled: true, checklists_enabled: false,
    adminName: '', adminEmail: '', adminPassword: ''
  });

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<{id: string, name: string} | null>(null);
  const [isDeleteAdminOpen, setIsDeleteAdminOpen] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState<{id: string, name: string} | null>(null);

  const [adminFormView, setAdminFormView] = useState(false);
  const [editingAdminId, setEditingAdminId] = useState<string | null>(null);
  const [adminFormData, setAdminFormData] = useState({ name: '', email: '', password: '', active: true });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Estatísticas para os cards
  const totalCompaniesCount = companies.length;
  const activeCompaniesCount = companies.filter(c => c.active).length;
  const inactiveCompaniesCount = totalCompaniesCount - activeCompaniesCount;
  const totalAdminsCount = users.filter(u => u.role?.toUpperCase() === 'ADMIN' || u.role?.toUpperCase() === 'SUPER_ADMIN').length;

  const sortedCompanies = [...companies].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setTimeout(() => {
      setEditingId(null);
      setActiveCompany(null);
      setAdminFormView(false);
      setEditingAdminId(null);
      setFormData({ 
        name: '', link_name: '', logo_url: '', active: true, 
        landing_page_enabled: true, checklists_enabled: false,
        adminName: '', adminEmail: '', adminPassword: ''
      });
      setActiveTab('details');
    }, 300);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     const newName = e.target.value;
     // Gerar slug limpo
     const newLinkName = newName.toLowerCase().trim()
       .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove acentos
       .replace(/[\s\W-]+/g, ''); // Remove espaços e caracteres especiais

     if (!editingId) {
        setFormData({ 
          ...formData, 
          name: newName, 
          link_name: newLinkName,
          adminEmail: newLinkName ? `admin@${newLinkName}.com` : ''
        });
     } else {
        setFormData({ ...formData, name: newName });
     }
  };

  const openEdit = (company: Company) => {
    setEditingId(company.id);
    setActiveCompany(company);
    
    // Suporte a nomes de colunas do banco (maiúsculo/minúsculo e enabled/active)
    const lpEnabled = (company as any).landing_page_enabled ?? (company as any).Landing_page_enabled ?? (company as any).landing_page_active;
    const ckEnabled = (company as any).checklists_enabled ?? (company as any).Checklists_enabled;

    // Busca o administrador oficial para preencher o form
    const companyAdmin = users.find(u => 
      u.company_id === company.id && 
      ((u.role || '').toUpperCase() === 'ADMIN' || (u.email || '').toLowerCase().includes('admin'))
    );

    setFormData({ 
      name: company.name, 
      link_name: company.link_name, 
      logo_url: company.logo_url || '', 
      active: company.active !== false, 
      landing_page_enabled: lpEnabled === true, 
      checklists_enabled: ckEnabled === true,
      adminName: companyAdmin?.name || '',
      adminEmail: companyAdmin?.email || '',
      adminPassword: ''
    });
    setActiveTab('details');
    setIsFormOpen(true);
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsSubmitting(true);
    const isNew = !editingId;
    const normalizedLink = formData.link_name?.toLowerCase().trim();

    try {
      // 1. VALIDAÇÃO RIGOROSA (Zod + Manual)
      if (!formData.name || !formData.link_name) {
        throw new Error('O nome e o link da empresa são obrigatórios.');
      }

      if (!formData.adminEmail || !formData.adminName) {
        throw new Error('O nome e o e-mail do administrador são obrigatórios.');
      }

      // Validação de E-mail e Senha via Schema Central
      try {
        const validationData: any = { 
          name: formData.adminName,
          email: formData.adminEmail,
          password: (isNew || formData.adminPassword) ? formData.adminPassword : 'dummy-pass' 
        };
        adminProvisioningSchema.parse(validationData);
      } catch (e: any) {
        if (e instanceof z.ZodError) {
          throw new Error(e.errors[0].message);
        }
        throw e;
      }

      // 2. VERIFICAÇÃO DE EXISTÊNCIA (Incluindo Deletados)
      const existingCompany = companies.find(c => 
        c.link_name?.toLowerCase().trim() === normalizedLink
      );

      const isReactivating = isNew && existingCompany && !!existingCompany.deleted_at;
      let companyIdForSave = editingId || (isReactivating ? existingCompany.id : null);

      if (isNew && existingCompany && !existingCompany.deleted_at) {
        setIsSubmitting(false);
        return toast.error(`O link "/${formData.link_name}" já está em uso ativo.`);
      }

      if (isNew || isReactivating) {
        // --- INSERÇÃO OU REATIVAÇÃO DA EMPRESA ---
        const payload: any = {
          name: formData.name, 
          link_name: formData.link_name, 
          slug: formData.link_name, 
          logo_url: formData.logo_url, 
          active: true, 
          landing_page_enabled: Boolean(formData.landing_page_enabled),
          landing_page_active: Boolean(formData.landing_page_enabled),
          checklists_enabled: Boolean(formData.checklists_enabled),
          deleted_at: null // LIMPEZA CRÍTICA DO SOFT DELETE
        };

        if (companyIdForSave) payload.id = companyIdForSave;

        const { data: savedCompany, error: insError } = await supabase.from('companies').upsert(payload).select('id').single();

        if (insError) throw insError;
        companyIdForSave = savedCompany.id;
        toast.success(isReactivating ? 'Empresa reativada com sucesso!' : 'Empresa criada!');
      } else {
        // --- ATUALIZAÇÃO DA EMPRESA ---
        const { error: updError } = await supabase.from('companies').update({
          name: formData.name, 
          logo_url: formData.logo_url, 
          active: Boolean(formData.active), 
          landing_page_enabled: Boolean(formData.landing_page_enabled),
          landing_page_active: Boolean(formData.landing_page_enabled),
          checklists_enabled: Boolean(formData.checklists_enabled),
          deleted_at: null // Garantindo que não permaneça deletado se houver update
        }).eq('id', companyIdForSave);

        if (updError) throw updError;
        toast.success('Configurações salvas!');
      }

      // --- PROVISIONAMENTO DO ADMIN (Apenas na Criação) ---
      // Chama a RPC provision_invite: o servidor valida role/tenant, grava em
      // provisioned_invites (ou atualiza o perfil existente se já houver conta
      // no auth.users). A "Senha Inicial" do formulário é apenas visual — não
      // trafega mais daqui pra frente; o usuário define a senha dele no
      // primeiro login, via signUp.
      if (!editingId && formData.adminEmail && formData.adminName) {
        const cleanEmail = formData.adminEmail.toLowerCase().trim();

        const { data: rpcResult, error: rpcError } = await supabase.rpc('provision_invite', {
          target_email: cleanEmail,
          target_name: formData.adminName,
          target_role: 'ADMIN',
          target_company_id: companyIdForSave
        });

        if (rpcError) {
          Logger.error('Erro ao provisionar admin:', rpcError);
          toast.warning(`Empresa salva, mas houve erro ao configurar o admin: ${rpcError.message}`);
        } else {
          const status = (rpcResult as any)?.status;
          toast.success(`Admin ${cleanEmail} ${status === 'updated_existing' ? 'atualizado' : 'convidado'}!`);
        }
      }

      await mutateCompanies();
      await mutateUsers();
      handleCloseForm();
    } catch (error: any) {
      Logger.error('Erro ao salvar empresa:', error);
      toast.error(`Erro: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleCompanyStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase.from('companies').update({ 
      active: !currentStatus,
      updated_at: new Date().toISOString()
    }).eq('id', id);
    if (!error) mutateCompanies();
    else toast.error('Erro ao alterar status.');
  };

  const handleDeleteCompany = async (id: string, name: string) => {
    if (!window.confirm(`Tem certeza que deseja ARQUIVAR a empresa "${name}"?\nIsso removerá o acesso dos usuários.`)) return;
    
    try {
      const { error } = await supabase.from('companies')
        .update({ 
          deleted_at: new Date().toISOString(),
          active: false 
        })
        .eq('id', id);

      if (error) throw error;
      toast.success('Empresa arquivada com sucesso!');
      mutateCompanies();
    } catch (error: any) {
      Logger.error('Erro ao deletar empresa:', error);
      toast.error(`Erro: ${error.message}`);
    }
  };

  const handleSaveAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompany) return;
    setIsSubmitting(true);
    
    try {
      const cleanEmail = adminFormData.email.toLowerCase().trim();
      
      if (editingAdminId) {
         if (adminFormData.password && adminFormData.password.length < 6) {
           throw new Error("A nova senha deve ter pelo menos 6 caracteres.");
         }
         if (!cleanEmail || !adminFormData.name) {
           throw new Error("Nome e E-mail são obrigatórios.");
         }
         
         const updatePayload: any = { 
           name: adminFormData.name, 
           email: cleanEmail,
           active: adminFormData.active 
         };
         if (adminFormData.password) updatePayload.password = adminFormData.password;
         
         const { error } = await supabase.from('users').update(updatePayload).eq('id', editingAdminId);
         if (error) throw error;
         toast.success('Admin atualizado!');
      } else {
         if (!cleanEmail || !adminFormData.name) {
           throw new Error("Nome e E-mail são obrigatórios.");
         }

         // Senha inicial é apenas visual — ignorada no provisionamento.
         // O admin define a própria senha no primeiro login (signUp).
         const { error: rpcError } = await supabase.rpc('provision_invite', {
           target_email: cleanEmail,
           target_name: adminFormData.name,
           target_role: 'ADMIN',
           target_company_id: activeCompany.id
         });

         if (rpcError) throw rpcError;
         toast.success('Novo administrador provisionado!');
      }
      
      await mutateUsers();
      setAdminFormView(false);
      setEditingAdminId(null);
      setAdminFormData({ name: '', email: '', password: '', active: true });
    } catch (error: any) {
      Logger.error('Erro ao salvar admin:', error);
      toast.error(error.message || 'Falha ao salvar administrador.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleUserStatus = async (id: string, currentStatus: boolean) => {
     await supabase.from('users').update({ active: !currentStatus }).eq('id', id);
     mutateUsers();
  };

  const activeAdmins = users.filter(u => {
    if (u.company_id !== activeCompany?.id) return false;
    
    const roleStr = (u.role || '').toUpperCase();
    const emailStr = (u.email || '').toLowerCase();
    
    // Filtro Flexível: ADMIN, SUPER_ADMIN, MAESTRO ou e-mail que contenha "admin"
    const isMatch = roleStr === 'ADMIN' || 
           roleStr === 'SUPER_ADMIN' || 
           roleStr === 'MAESTRO' ||
           emailStr.includes('admin');
    
    Logger.info(`Debug Admin Filter [${u.email}]:`, { role: u.role, isMatch });
    return isMatch;
  });

  // LOG DE DIAGNÓSTICO AVANÇADO
  useEffect(() => {
    if (activeCompany && activeTab === 'admins') {
      const members = users.filter(u => u.company_id === activeCompany.id);
      Logger.info(`Membros da ${activeCompany.name}:`, members.map(m => ({
        id: m.id,
        email: m.email,
        role: m.role,
        company_id: m.company_id,
        passes_filter: (m.role || '').toUpperCase() === 'ADMIN' || (m.email || '').toLowerCase().includes('admin')
      })));
    }
  }, [activeCompany, activeTab, users]);

  // LOG DE DIAGNÓSTICO (Aparecerá no console do seu navegador)
  useEffect(() => {
    if (activeCompany) {
      const allCompanyMembers = users.filter(u => u.company_id === activeCompany.id);
      Logger.info(`Membros encontrados para ${activeCompany.name}:`, allCompanyMembers);
    }
  }, [activeCompany, users]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setIsUploading(true);
        const url = await uploadToSupabase(file, 'uploads', 'companies/logos', 'logo');
        if (url) setFormData({ ...formData, logo_url: url });
      } catch (err) {
        Logger.error('Erro upload:', err);
      } finally {
        setIsUploading(false);
      }
    }
  };

  if (loadingCompanies || loadingUsers) return <div className="flex h-[80vh] items-center justify-center"><Loader2 className="animate-spin text-slate-300" size={40} /></div>;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
         <div>
           <h1 className="text-2xl font-bold text-slate-900">🚀 Dashboard do Super Admin</h1>
           <p className="text-sm text-slate-500 mt-1">Gestão de Plataforma (Tenants)</p>
         </div>
          <Button 
            onClick={() => {
              setEditingId(null);
              setFormData({
                name: '', link_name: '', logo_url: '', active: true, 
                landing_page_enabled: true, checklists_enabled: true,
                adminName: '', adminEmail: '', adminPassword: ''
              });
              setIsFormOpen(true);
            }} 
            className="bg-slate-900 hover:bg-slate-800 text-white"
          >
             + Nova Company
          </Button>
      </div>

      {/* RESTAURANDO OS CARDS DE MÉTRICAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0"><Building size={24} /></div>
          <div><p className="text-sm font-medium text-slate-500">Total Companies</p><p className="text-2xl font-bold text-slate-900">{totalCompaniesCount}</p></div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shrink-0"><CheckCircle2 size={24} /></div>
          <div><p className="text-sm font-medium text-slate-500">Ativas</p><p className="text-2xl font-bold text-slate-900">{activeCompaniesCount}</p></div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center shrink-0"><XCircle size={24} /></div>
          <div><p className="text-sm font-medium text-slate-500">Inativas</p><p className="text-2xl font-bold text-slate-900">{inactiveCompaniesCount}</p></div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0"><Users size={24} /></div>
          <div><p className="text-sm font-medium text-slate-500">Total Admins</p><p className="text-2xl font-bold text-slate-900">{totalAdminsCount}</p></div>
        </div>
      </div>

      {/* RESTAURANDO A TABELA PREMIUM */}
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
                {sortedCompanies.map((company) => (
                    <tr key={company.id} className={`hover:bg-slate-50 transition-colors ${!company.active ? 'opacity-60' : ''} ${company.deleted_at ? 'bg-rose-50/30' : ''}`}>
                       <td className="p-4">
                          <Switch 
                            disabled={!!company.deleted_at} // Não permite ativar empresa deletada sem reativar pelo form
                            checked={company.active} 
                            onCheckedChange={() => toggleCompanyStatus(company.id, company.active)} 
                          />
                       </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                            {company.logo_url ? <img src={company.logo_url} alt={company.name} className="w-full h-full object-cover" /> : <Building className="text-slate-400" size={18} />}
                          </div>
                           <div>
                             <div className="flex items-center gap-2">
                               <p className="font-semibold text-slate-900">{company.name}</p>
                               {company.deleted_at && (
                                 <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-bold rounded uppercase">Arquivada</span>
                               )}
                             </div>
                             <p className="text-xs text-slate-500 font-mono">ID: {company.id}</p>
                           </div>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded w-fit">/{company.link_name}</td>
                       <td className="p-4 text-slate-500">
                         {company.updated_at || company.created_at 
                           ? new Date(company.updated_at || company.created_at).toLocaleDateString('pt-BR') 
                           : 'Sem data'}
                       </td>
                       <td className="p-4 text-right flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(company)} className="text-slate-400 hover:text-blue-600">
                             <Edit2 size={16} />
                          </Button>
                          {!company.deleted_at && (
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteCompany(company.id, company.name)} className="text-slate-400 hover:text-rose-600">
                               <Trash2 size={16} />
                            </Button>
                          )}
                       </td>
                   </tr>
                ))}
             </tbody>
          </table>
        </div>
      </div>

      <Dialog open={isFormOpen} onOpenChange={(open) => !open && handleCloseForm()}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
          <DialogHeader>
             <DialogTitle>{editingId ? 'Editar Empresa' : 'Nova Empresa'}</DialogTitle>
          </DialogHeader>
          
          <div className="flex border-b border-slate-200 mt-2 mb-4">
            <button onClick={() => setActiveTab('details')} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'details' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}>Detalhes da Empresa</button>
            <button onClick={() => setActiveTab('admins')} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'admins' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}>Administradores</button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {activeTab === 'details' ? (
              <form id="company-form" onSubmit={handleSaveCompany} className="space-y-6 px-1">
                <div className="space-y-2"><Label>Nome da Empresa *</Label><Input value={formData.name} onChange={handleNameChange} placeholder="Ex: Everest Retail" /></div>
                <div className="space-y-2">
                  <Label>Link de Acesso (URL) *</Label>
                  <Input 
                    value={formData.link_name} 
                    onChange={(e) => setFormData({...formData, link_name: e.target.value})} 
                    placeholder="Ex: everest" 
                    readOnly={!!editingId}
                    className={!!editingId ? "bg-slate-50 cursor-not-allowed text-slate-500" : ""}
                  />
                  {!!editingId && <p className="text-[10px] text-slate-400 italic">O link não pode ser alterado após a criação.</p>}
                </div>
                
                {!editingId && (
                  <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-lg space-y-4">
                    <p className="text-sm font-semibold text-blue-900 border-b border-blue-100 pb-2">🚀 Administrador Principal *</p>
                    <div className="space-y-2">
                        <Label className="text-blue-800">Nome do Administrador *</Label>
                        <Input 
                        value={formData.adminName} 
                        onChange={(e) => setFormData({...formData, adminName: e.target.value})}
                        placeholder="Nome Completo"
                        className="bg-white border-blue-200"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-blue-800">E-mail do Administrador *</Label>
                        <Input 
                        value={formData.adminEmail} 
                        onChange={(e) => setFormData({...formData, adminEmail: e.target.value})}
                        placeholder="admin@empresa.com"
                        className="bg-white border-blue-200"
                        />
                        <p className="text-[10px] text-blue-600 font-medium italic">Acesso indicado: admin@{formData.link_name || "empresa"}.com</p>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-blue-800">Senha Inicial *</Label>
                        <Input 
                        type="password"
                        value={formData.adminPassword} 
                        onChange={(e) => setFormData({...formData, adminPassword: e.target.value})}
                        placeholder="******"
                        className="bg-white border-blue-200"
                        />
                    </div>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label>Logo da Empresa</Label>
                  <div className="flex gap-4 items-center">
                     <div className="w-16 h-16 rounded-xl border border-slate-200 bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                        {formData.logo_url ? <img src={formData.logo_url} alt="Logo" className="w-full h-full object-cover" /> : <Building className="text-slate-400" size={24} />}
                     </div>
                     <Button type="button" variant="outline" onClick={() => document.getElementById('logo-upload')?.click()} className="flex items-center gap-2" disabled={isUploading}>
                        <Upload size={16} /> Fazer Upload
                     </Button>
                     <input type="file" id="logo-upload" onChange={handleImageUpload} className="hidden" accept="image/*" />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="space-y-0.5"><Label>Habilitar Landing Page</Label><p className="text-xs text-slate-500">Configurações para o site institucional.</p></div>
                  <Switch 
                     key={`lp-key-${formData.landing_page_enabled}`}
                     checked={formData.landing_page_enabled} 
                     onCheckedChange={(checked) => setFormData({...formData, landing_page_enabled: checked})} 
                  />
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="space-y-0.5"><Label>Habilitar Checklist</Label><p className="text-xs text-slate-500">Módulo de auditoria e vistorias.</p></div>
                  <Switch 
                     key={`ck-key-${formData.checklists_enabled}`}
                     checked={formData.checklists_enabled} 
                     onCheckedChange={(checked) => setFormData({...formData, checklists_enabled: checked})} 
                  />
                </div>
              </form>
            ) : (
              <div className="px-1 space-y-4">
                <div className="flex justify-between items-center">
                   <p className="text-sm text-slate-500">Administradores vinculados:</p>
                   {!adminFormView ? (
                     <Button type="button" size="sm" onClick={() => { setAdminFormData({ name: '', email: '', password: '', active: true }); setEditingAdminId(null); setAdminFormView(true); }} className="bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs h-8">
                       <Plus size={14} className="mr-1" /> Novo Administrador
                     </Button>
                   ) : (
                     <Button type="button" size="sm" variant="outline" onClick={() => { setAdminFormView(false); setEditingAdminId(null); }} className="h-8 text-xs">
                        Voltar para Lista
                     </Button>
                   )}
                </div>
                
                {adminFormView ? (
                   <form id="admin-form" onSubmit={handleSaveAdmin} className="p-4 border border-slate-200 rounded-lg space-y-4 bg-slate-50">
                      <div className="space-y-2"><Label>Nome Completo *</Label><Input value={adminFormData.name} onChange={e => setAdminFormData({...adminFormData, name: e.target.value})} placeholder="Ex: João Silva" required /></div>
                      <div className="space-y-2"><Label>E-mail *</Label><Input type="email" value={adminFormData.email} onChange={e => setAdminFormData({...adminFormData, email: e.target.value})} placeholder="admin@empresa.com" required /></div>
                      <div className="space-y-2">
                        <Label>{editingAdminId ? 'Nova Senha (opcional)' : 'Senha Inicial *'}</Label>
                        <Input type="password" value={adminFormData.password} onChange={e => setAdminFormData({...adminFormData, password: e.target.value})} placeholder="Mínimo 6 caracteres" required={!editingAdminId} minLength={6} />
                      </div>
                      <div className="flex justify-end pt-2">
                        <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={isSubmitting}>
                          {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : 'Salvar Administrador'}
                        </Button>
                      </div>
                   </form>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                     {activeAdmins.map(admin => (
                        <div key={admin.id} className="flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors">
                           <div className="flex-1">
                              <div className="flex items-center gap-2">
                                 <p className="font-semibold text-slate-900">{admin.name}</p>
                                 <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded uppercase">{admin.role}</span>
                              </div>
                              <p className="text-sm text-slate-500">{admin.email}</p>
                           </div>
                           <div className="flex items-center gap-3">
                             <Button type="button" variant="ghost" size="icon" onClick={() => { setEditingAdminId(admin.id); setAdminFormData({ name: admin.name || '', email: admin.email || '', password: '', active: admin.active !== false }); setAdminFormView(true); }} className="text-slate-400 hover:text-blue-600 h-8 w-8">
                                <Edit2 size={14} />
                             </Button>
                             <Switch checked={admin.active !== false} onCheckedChange={() => toggleUserStatus(admin.id, admin.active !== false)} />
                           </div>
                        </div>
                     ))}
                      {activeAdmins.length === 0 && (
                        <div className="p-12 text-center">
                          <Users className="mx-auto text-slate-300 mb-3" size={32} />
                          <p className="text-slate-500 font-medium">Nenhum administrador encontrado.</p>
                          <p className="text-xs text-slate-400 mt-1 italic">Dica: O acesso padrão indicado é admin@{activeCompany?.link_name}.com</p>
                        </div>
                      )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex-shrink-0 pt-4 border-t border-slate-100 flex justify-end gap-3 mt-4">
             <Button type="button" variant="outline" onClick={handleCloseForm}>Cancelar</Button>
             {activeTab === 'details' && (
               <Button type="submit" form="company-form" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={isSubmitting}>
                 {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : 'Salvar Empresa'}
               </Button>
             )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};