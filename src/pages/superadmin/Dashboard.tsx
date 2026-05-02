import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCompanies, useUsers } from '../../hooks/usePlatformData';
import { mockThemes } from '../../data/mock';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { CheckCircle2, XCircle, Building, Edit2, Trash2, Users, ArrowLeft, ExternalLink, Upload, Loader2, Plus } from 'lucide-react';
import { Company, User, Theme } from '../../types';
import { Logger } from '../../utils/logger';
import { uploadFile } from '../../lib/storage';
import { superAdminService } from '../../services/api';
import { ApiException } from '../../services/api/client';

const RESERVED_SLUGS = ['admin', 'super-admin', 'login', 'api', 'assets', 'system', 'home', 'perfil', 'busca', 'hub', 'biblioteca'];
const TENANT_ADMIN_ROLES = new Set(['ADMIN', 'MANAGER']);

type AdminListItem = User & { is_invite?: boolean };

const isPendingInvite = (user: AdminListItem) => user.is_invite === true || user.status === 'PENDING_SETUP';
const isTenantAdminRole = (role: string | undefined) => TENANT_ADMIN_ROLES.has((role || '').toUpperCase());

export const SuperAdminDashboard = () => {
  const { companies, mutate: mutateCompanies, isLoading: loadingCompanies } = useCompanies(true);
  const { users, mutate: mutateUsers, isLoading: loadingUsers } = useUsers(undefined, true);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'admins'>('details');
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({ 
    name: '', link_name: '', logo_url: '', active: true, 
    landing_page_enabled: true, checklists_enabled: false, surveys_enabled: false,
    adminName: '', adminEmail: ''
  });

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<{id: string, name: string} | null>(null);
  const [isDeleteAdminOpen, setIsDeleteAdminOpen] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState<{id: string, name: string} | null>(null);

  const [adminFormView, setAdminFormView] = useState(false);
  const [editingAdminId, setEditingAdminId] = useState<string | null>(null);
  const [adminFormData, setAdminFormData] = useState({ name: '', email: '', active: true });
  const [adminError, setAdminError] = useState('');

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
      setAdminError('');
      setFormData({ 
        name: '', link_name: '', logo_url: '', active: true, 
        landing_page_enabled: true, checklists_enabled: false, surveys_enabled: false,
        adminName: '', adminEmail: ''
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
    const surveysEnabled = (company as any).surveys_enabled ?? (company as any).Surveys_enabled;

    const companyAdmin = users.find(u => u.company_id === company.id && isTenantAdminRole(u.role));

    setFormData({ 
      name: company.name, 
      link_name: company.link_name, 
      logo_url: company.logo_url || '', 
      active: company.active !== false, 
      landing_page_enabled: lpEnabled === true, 
      checklists_enabled: ckEnabled === true,
      surveys_enabled: surveysEnabled === true,
      adminName: companyAdmin?.name || '',
      adminEmail: companyAdmin?.email || '',
    });
    setAdminError('');
    setActiveTab('details');
    setIsFormOpen(true);
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsSubmitting(true);
    const isNew = !editingId;
    const normalizedLink = formData.link_name?.toLowerCase().trim();

    try {
      setAdminError('');
      if (!formData.name || !formData.link_name) {
        throw new Error('O nome e o link da empresa são obrigatórios.');
      }

      if (isNew && (!formData.adminEmail || !formData.adminName)) {
        throw new Error('O nome e o e-mail do administrador são obrigatórios.');
      }

      const existingCompany = companies.find(c => 
        c.link_name?.toLowerCase().trim() === normalizedLink
      );

      const isReactivating = isNew && existingCompany && !!existingCompany.deleted_at;
      let companyIdForSave = editingId || (isReactivating ? existingCompany.id : null);
      let savedCompanyForRecovery: Company | null = null;

      if (isNew && existingCompany && !existingCompany.deleted_at) {
        setIsSubmitting(false);
        return toast.error(`O link "/${formData.link_name}" já está em uso ativo.`);
      }

      if (isNew || isReactivating) {
        const payload = {
          name: formData.name,
          slug: formData.link_name,
          linkName: formData.link_name,
          logoUrl: formData.logo_url || null,
          active: true,
          landingPageEnabled: Boolean(formData.landing_page_enabled),
          landingPageActive: Boolean(formData.landing_page_enabled),
          checklistsEnabled: Boolean(formData.checklists_enabled),
          surveysEnabled: Boolean(formData.surveys_enabled),
        };

        const savedCompany = companyIdForSave
          ? await superAdminService.updateCompany(companyIdForSave, payload)
          : await superAdminService.createCompany(payload);
        companyIdForSave = savedCompany.id;
        savedCompanyForRecovery = {
          id: savedCompany.id,
          name: savedCompany.name,
          slug: savedCompany.slug,
          link_name: savedCompany.linkName,
          active: savedCompany.active,
          deleted_at: savedCompany.deletedAt,
          theme: mockThemes[0],
          logo_url: savedCompany.branding?.logoUrl ?? undefined,
          landing_page_enabled: savedCompany.landingPageEnabled,
          landing_page_active: savedCompany.landingPageActive,
          landing_page_layout: savedCompany.landingPageLayout as Company['landing_page_layout'],
          checklists_enabled: savedCompany.features?.checklists,
          surveys_enabled: savedCompany.features?.surveys,
          created_at: savedCompany.createdAt,
          updated_at: savedCompany.updatedAt,
        };
        toast.success(isReactivating ? 'Empresa reativada com sucesso!' : 'Empresa criada!');
      } else {
        await superAdminService.updateCompany(companyIdForSave!, {
          name: formData.name,
          logoUrl: formData.logo_url || null,
          active: Boolean(formData.active),
          landingPageEnabled: Boolean(formData.landing_page_enabled),
          landingPageActive: Boolean(formData.landing_page_enabled),
          checklistsEnabled: Boolean(formData.checklists_enabled),
          surveysEnabled: Boolean(formData.surveys_enabled),
        });
        toast.success('Configuracoes salvas!');
      }

      if (!editingId && formData.adminEmail && formData.adminName && companyIdForSave) {
        const cleanEmail = formData.adminEmail.toLowerCase().trim();

        try {
          const result = await superAdminService.provisionTenantAdmin(companyIdForSave, {
            name: formData.adminName,
            email: cleanEmail,
            role: 'ADMIN',
          });
          toast.success(`Admin ${cleanEmail} ${result.status === 'updated_existing' ? 'atualizado' : 'criado'}!`);
        } catch (err) {
          const message = err instanceof ApiException ? err.message : (err as Error).message;
          Logger.error('Erro ao provisionar admin:', err);
          setEditingId(companyIdForSave);
          setActiveCompany(savedCompanyForRecovery);
          setActiveTab('admins');
          setAdminFormView(true);
          setAdminFormData({ name: formData.adminName, email: cleanEmail, active: true });
          setAdminError(`Empresa salva, mas houve erro ao configurar o admin: ${message}`);
          await mutateCompanies();
          await mutateUsers();
          toast.warning('Empresa salva, mas o administrador ainda precisa ser configurado.');
          return;
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
    try {
      await superAdminService.updateCompanyStatus(id, { active: !currentStatus });
      mutateCompanies();
    } catch (error: any) {
      Logger.error('Erro ao alterar status da empresa:', error);
      toast.error(error.message || 'Erro ao alterar status.');
    }
  };

  const handleDeleteCompany = async (id: string, name: string) => {
    if (!window.confirm(`Tem certeza que deseja ARQUIVAR a empresa "${name}"?\nIsso removera o acesso dos usuarios.`)) return;
    
    try {
      await superAdminService.deleteCompany(id);
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
    setAdminError('');
    
    try {
      const cleanEmail = adminFormData.email.toLowerCase().trim();
      
      if (editingAdminId) {
         if (!cleanEmail || !adminFormData.name) {
           throw new Error("Nome e E-mail são obrigatórios.");
         }
         
         const updatePayload = { 
           name: adminFormData.name, 
           email: cleanEmail,
           active: adminFormData.active 
         };
         
         await superAdminService.updateUser(editingAdminId, updatePayload);
         toast.success('Admin atualizado!');
      } else {
         if (!cleanEmail || !adminFormData.name) {
           throw new Error("Nome e E-mail são obrigatórios.");
         }
         await superAdminService.provisionTenantAdmin(activeCompany.id, {
           name: adminFormData.name,
           email: cleanEmail,
           role: 'ADMIN',
         });
         toast.success('Novo administrador provisionado!');
      }
      
      await mutateUsers();
      setAdminFormView(false);
      setEditingAdminId(null);
      setAdminFormData({ name: '', email: '', active: true });
    } catch (error: any) {
      Logger.error('Erro ao salvar admin:', error);
      setAdminError(error.message || 'Falha ao salvar administrador.');
      await mutateUsers();
      toast.error(error.message || 'Falha ao salvar administrador.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleUserStatus = async (id: string, currentStatus: boolean) => {
     try {
       await superAdminService.updateUserStatus(id, { active: !currentStatus });
       mutateUsers();
     } catch (error: any) {
       Logger.error('Erro ao alterar status do admin:', error);
       toast.error(error.message || 'Erro ao alterar status do admin.');
     }
  };

  const activeAdmins = (users as AdminListItem[]).filter(u =>
    u.company_id === activeCompany?.id && isTenantAdminRole(u.role)
  );

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setIsUploading(true);
        const url = await uploadFile(file, 'uploads', 'companies/logos', 'logo');
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
                landing_page_enabled: true, checklists_enabled: true, surveys_enabled: false,
                adminName: '', adminEmail: ''
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
             <DialogDescription className="sr-only">
               Gerencie dados da empresa e administradores vinculados.
             </DialogDescription>
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
                    className={editingId ? "bg-slate-50 cursor-not-allowed text-slate-500" : ""}
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
                        type="email"
                        value={formData.adminEmail} 
                        onChange={(e) => setFormData({...formData, adminEmail: e.target.value})}
                        placeholder="admin@empresa.com"
                        className="bg-white border-blue-200"
                        />
                        <p className="text-[10px] text-blue-600 font-medium italic">Acesso indicado: admin@{formData.link_name || "empresa"}.com</p>
                        <p className="text-[10px] text-blue-600 italic">O administrador troca a senha obrigatoriamente no primeiro acesso.</p>
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

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <div className="space-y-0.5"><Label>Habilitar Pesquisas</Label><p className="text-xs text-slate-500">Modulo de pesquisas e NPS para usuarios finais.</p></div>
                  <Switch
                     key={`survey-key-${formData.surveys_enabled}`}
                     checked={formData.surveys_enabled}
                     onCheckedChange={(checked) => setFormData({...formData, surveys_enabled: checked})}
                  />
                </div>
              </form>
            ) : (
              <div className="px-1 space-y-4">
                <div className="flex justify-between items-center">
                   <p className="text-sm text-slate-500">Administradores vinculados:</p>
                   {!adminFormView ? (
                     <Button type="button" size="sm" onClick={() => { setAdminError(''); setAdminFormData({ name: '', email: '', active: true }); setEditingAdminId(null); setAdminFormView(true); }} className="bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs h-8">
                       <Plus size={14} className="mr-1" /> Novo Administrador
                     </Button>
                   ) : (
                     <Button type="button" size="sm" variant="outline" onClick={() => { setAdminError(''); setAdminFormView(false); setEditingAdminId(null); }} className="h-8 text-xs">
                        Voltar para Lista
                     </Button>
                   )}
                </div>

                {adminError && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    {adminError}
                  </div>
                )}

                {adminFormView ? (
                   <form id="admin-form" onSubmit={handleSaveAdmin} className="p-4 border border-slate-200 rounded-lg space-y-4 bg-slate-50">
                      <div className="space-y-2"><Label>Nome Completo *</Label><Input value={adminFormData.name} onChange={e => setAdminFormData({...adminFormData, name: e.target.value})} placeholder="Ex: João Silva" required /></div>
                      <div className="space-y-2"><Label>E-mail *</Label><Input type="email" value={adminFormData.email} onChange={e => setAdminFormData({...adminFormData, email: e.target.value})} placeholder="admin@empresa.com" required /></div>
                      {!editingAdminId && <p className="text-xs text-slate-500">O administrador troca a senha obrigatoriamente no primeiro acesso.</p>}
                      <div className="flex justify-end pt-2">
                        <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={isSubmitting}>
                          {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : 'Salvar Administrador'}
                        </Button>
                      </div>
                   </form>
                ) : (
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                     {activeAdmins.map(admin => {
                       const pendingInvite = isPendingInvite(admin);

                       return (
                        <div key={admin.id} className="flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors">
                           <div className="flex-1">
                              <div className="flex items-center gap-2">
                                 <p className="font-semibold text-slate-900">{admin.name}</p>
                                 <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded uppercase">{admin.role}</span>
                                 {admin.first_access && (
                                   <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded uppercase">Primeiro acesso</span>
                                 )}
                                 {pendingInvite && (
                                   <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded uppercase">Convite pendente</span>
                                 )}
                              </div>
                              <p className="text-sm text-slate-500">{admin.email}</p>
                           </div>
                           <div className="flex items-center gap-3">
                             {pendingInvite ? (
                               <span className="text-xs text-slate-500">Aguardando ativação</span>
                             ) : (
                               <>
                                 <Button type="button" variant="ghost" size="icon" onClick={() => { setAdminError(''); setEditingAdminId(admin.id); setAdminFormData({ name: admin.name || '', email: admin.email || '', active: admin.active !== false }); setAdminFormView(true); }} className="text-slate-400 hover:text-blue-600 h-8 w-8">
                                    <Edit2 size={14} />
                                 </Button>
                                 <Switch checked={admin.active !== false} onCheckedChange={() => toggleUserStatus(admin.id, admin.active !== false)} />
                               </>
                             )}
                           </div>
                        </div>
                       );
                     })}
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

