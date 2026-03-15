import { useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useCompanies, useUsers, useRepositories, useOrgStructure, useContents, useSimpleLinks } from '../../hooks/useSupabaseData';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { CheckCircle2, XCircle, Edit2, Trash2, FolderTree, Image as ImageIcon, Layers, FolderOpen, Lock, Globe, List, MonitorPlay, Loader2, Music, Sun, MoveVertical, PlaySquare } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Repository } from '../../types';
import { uploadToSupabase } from '../../lib/storage';
import { CoverPreview } from '../../components/admin/CoverPreview';

export const AdminRepositories = () => {
  const { link_name } = useParams();
  
  const { companies, isLoading: loadingCompanies } = useCompanies();
  const company = companies.find(c => c.link_name === link_name);
  
  const { users, isLoading: loadingUsers } = useUsers(company?.id);
  const { repositories, mutate: mutateRepos, isLoading: loadingRepos } = useRepositories(company?.id);
  const { orgTopLevels, orgUnits, isLoading: loadingOrg } = useOrgStructure(company?.id);
  const { contents, isLoading: loadingContents } = useContents({ companyId: company?.id });
  const { simpleLinks, isLoading: loadingLinks } = useSimpleLinks({ companyId: company?.id });
  
  // Ordenação segura
  const companyRepos = useMemo(() => {
    return repositories
      .sort((a, b) => {
         const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
         const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
         return timeB - timeA;
      });
  }, [repositories]);

  const companyUsers = users.filter(u => u.role === 'USER');
  const companyTopLevels = orgTopLevels.filter(o => o.active);
  const companyUnitsLocal = orgUnits.filter(u => u.active);

  const unitLabel = company?.org_unit_name || 'Unidade';
  const org_levels = company?.org_levels?.length ? company.org_levels : [{ id: 'legacy', name: company?.org_top_level_name || 'Regional' }];

  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'FULL' as 'FULL' | 'SIMPLE' | 'PLAYLIST' | 'VIDEO_PLAYLIST',
    cover_image: '',
    banner_image: '',
    featured: false,
    status: 'ACTIVE' as 'ACTIVE' | 'DRAFT',
    access_type: 'ALL' as 'ALL' | 'RESTRICTED',
    allowed_user_ids: [] as string[],
    allowed_region_ids: [] as string[],
    allowed_store_ids: [] as string[],
    excluded_user_ids: [] as string[],
    banner_position: 50,
    banner_brightness: 100,
    show_in_landing: false
  });

  const REPO_TYPES = [
    { id: 'FULL', label: 'Completo', icon: MonitorPlay, description: 'Layout rico (estilo Netflix) com thumbnails, vídeos, PDFs e preview.' },
    { id: 'SIMPLE', label: 'Simples (Links)', icon: List, description: 'Layout limpo para listar dezenas de links diretos, planilhas e acessos rápidos.' },
    { id: 'PLAYLIST', label: 'Playlist de Músicas', icon: Music, description: 'Focado em vídeos de música com reprodução sequencial automática.' },
    { id: 'VIDEO_PLAYLIST', label: 'Playlist de Vídeos', icon: PlaySquare, description: 'Lista de reprodução de vídeos YouTube com reprodução sequencial automática.' }
  ];

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [repoToDelete, setRepoToDelete] = useState<{id: string, name: string} | null>(null);



  const usersInScope = useMemo(() => {
    if (formData.allowed_region_ids.length === 0 && formData.allowed_store_ids.length === 0) return [];
    return companyUsers.filter(u => {
      if (u.org_unit_id && formData.allowed_store_ids.includes(u.org_unit_id)) return true;
      if (u.org_unit_id && formData.allowed_region_ids.length > 0) {
        const unit = companyUnitsLocal.find(unit => unit.id === u.org_unit_id);
        let currentParent = companyTopLevels.find(t => t.id === unit?.parent_id);
        while (currentParent) {
          if (formData.allowed_region_ids.includes(currentParent.id)) return true;
          currentParent = companyTopLevels.find(t => t.id === currentParent?.parent_id);
        }
      }
      if (u.org_top_level_id && formData.allowed_region_ids.includes(u.org_top_level_id)) return true;
      return false;
    });
  }, [formData.allowed_region_ids, formData.allowed_store_ids, companyUsers, companyUnitsLocal, companyTopLevels]);

  useEffect(() => {
    setFormData(prev => {
      const inScopeIds = new Set(usersInScope.map(u => u.id));
      const filteredExclusions = prev.excluded_user_ids.filter(id => inScopeIds.has(id));
      if (filteredExclusions.length !== prev.excluded_user_ids.length) return { ...prev, excluded_user_ids: filteredExclusions };
      return prev;
    });
  }, [usersInScope]);

  if (loadingCompanies || loadingRepos) {
    return <div className="flex h-[50vh] items-center justify-center">
      <Loader2 className="animate-spin text-slate-400" size={32} />
    </div>;
  }

  if (!company) return null;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'cover_image' | 'banner_image') => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
         toast.error('A imagem é muito pesada (máx: 20MB).');
         return;
      }
      const context = field === 'banner_image' ? 'banner' : 'thumbnail';
      try {
        setIsUploading(true);
        const toastId = toast.loading('Otimizando e enviando imagem...');
        const publicUrl = await uploadToSupabase(file, 'assets', `repositories/${company.id}/${field}`, context);
        toast.dismiss(toastId);
        if (publicUrl) {
          setFormData(prev => ({ ...prev, [field]: publicUrl }));
        } else {
          toast.error('Erro no upload para o banco de imagens.');
        }
      } catch (err) {
        toast.error('Falha de rede ao enviar a imagem.');
      } finally {
        setIsUploading(false);
        e.target.value = '';
      }
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setTimeout(() => {
      setEditingId(null);
      setFormData({ 
        name: '', description: '', type: 'FULL', cover_image: '', banner_image: '', 
        featured: false, status: 'ACTIVE', access_type: 'ALL', 
        allowed_user_ids: [], allowed_region_ids: [], allowed_store_ids: [], excluded_user_ids: [],
        banner_position: 50, banner_brightness: 100, show_in_landing: false
      });
    }, 300);
  };

  const handleCloseDelete = () => {
    setIsDeleteOpen(false);
    setTimeout(() => setRepoToDelete(null), 300);
  };

  const openCreate = () => {
    setEditingId(null);
    setFormData({ 
       name: '', description: '', type: 'FULL', cover_image: '', banner_image: '', 
       featured: false, status: 'ACTIVE', access_type: 'ALL', 
       allowed_user_ids: [], allowed_region_ids: [], allowed_store_ids: [], excluded_user_ids: [],
       banner_position: 50, banner_brightness: 100, show_in_landing: false
    });
    setIsFormOpen(true);
  };

  const openEdit = (repo: Repository) => {
    setEditingId(repo.id);
    setFormData({ 
      name: repo.name, description: repo.description, type: repo.type || 'FULL', 
      cover_image: repo.cover_image, banner_image: repo.banner_image || '', 
      featured: repo.featured, status: repo.status, access_type: repo.access_type || 'ALL', 
      allowed_user_ids: repo.allowed_user_ids || [],
      allowed_region_ids: repo.allowed_region_ids || [],
      allowed_store_ids: repo.allowed_store_ids || [],
      excluded_user_ids: repo.excluded_user_ids || [],
      banner_position: repo.banner_position ?? 50,
      banner_brightness: repo.banner_brightness ?? 100,
      show_in_landing: repo.show_in_landing || false
    });
    setIsFormOpen(true);
  };

  const toggleArrayItem = (arrayName: 'allowed_user_ids' | 'allowed_region_ids' | 'allowed_store_ids' | 'excluded_user_ids', id: string) => {
    setFormData(prev => ({
      ...prev,
      [arrayName]: prev[arrayName].includes(id)
        ? prev[arrayName].filter(item => item !== id)
        : [...prev[arrayName], id]
    }));
  };

  const handleSaveRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    const repoName = formData.name.trim();
    
    if (!repoName) return toast.error('Nome é obrigatório.');
    
    const isDuplicate = companyRepos.some(r => r.name.toLowerCase() === repoName.toLowerCase() && r.id !== editingId);
    if (isDuplicate) return toast.error('Já existe um repositório com este nome nesta empresa.');
    if (formData.type === 'FULL' && !formData.cover_image) return toast.error('Capa é obrigatória para Repositórios Completos.');

    if (formData.access_type === 'RESTRICTED' && formData.allowed_user_ids.length === 0 && formData.allowed_region_ids.length === 0 && formData.allowed_store_ids.length === 0) {
      return toast.error('Selecione ao menos um usuário ou nível na estrutura para o acesso restrito.');
    }

    try {
      setIsSubmitting(true);
      if (editingId) {
        const { error } = await supabase.from('repositories').update({ ...formData, name: repoName }).eq('id', editingId);
        if (error) throw error;
        toast.success('Repositório atualizado com sucesso!');
      } else {
        const { error } = await supabase.from('repositories').insert({ company_id: company.id, ...formData, name: repoName });
        if (error) throw error;
        toast.success('Repositório criado com sucesso!');
      }
      await mutateRepos();
      handleCloseForm();
    } catch (err) {
      const error = err as Error;
      toast.error(`Erro ao salvar repositório: ${error.message}`);
      console.error("Supabase error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRepo = async () => {
    if (repoToDelete) {
      setIsSubmitting(true);
      const { error } = await supabase.from('repositories').delete().eq('id', repoToDelete.id);
      setIsSubmitting(false);
      
      if (error) {
        toast.error('Erro ao excluir repositório.');
      } else {
        toast.success('Repositório excluído.');
        mutateRepos();
      }
    }
    handleCloseDelete();
  };

  const toggleStatus = async (repo: Repository) => {
    const newStatus = repo.status === 'ACTIVE' ? 'DRAFT' : 'ACTIVE';
    const { error } = await supabase.from('repositories').update({ status: newStatus }).eq('id', repo.id);
    if (error) {
      toast.error('Erro ao alterar status.');
    } else {
      toast.success(`Status alterado para ${newStatus === 'ACTIVE' ? 'Ativo' : 'Rascunho'}.`);
      mutateRepos();
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="flex justify-between items-center mb-8">
         <div>
           <h1 className="text-2xl font-bold text-slate-900">Repositórios de Conteúdo</h1>
           <p className="text-sm text-slate-500 mt-1">Gerencie os "Canais/Trilhas" da sua plataforma e veja seus conteúdos.</p>
         </div>
         <Button onClick={openCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
            + Novo Repositório
         </Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
             <thead className="bg-slate-50 border-b border-slate-200 text-slate-900 font-semibold">
                <tr>
                   <th className="p-4 w-16 text-center">Status</th>
                   <th className="p-4">Repositório</th>
                   <th className="p-4 text-center">Tipo</th>
                   <th className="p-4 text-center">Acesso</th>
                   <th className="p-4 text-center">Itens</th>
                   <th className="p-4 text-right">Ações</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
                {companyRepos.map(repo => {
                   const itemsCount = repo.type === 'SIMPLE' 
                      ? simpleLinks.filter(l => l.repository_id === repo.id).length 
                      : contents.filter(c => c.repository_id === repo.id).length;
                   
                   const isRestricted = repo.access_type === 'RESTRICTED';

                   return (
                     <tr key={repo.id} className={`hover:bg-slate-50 transition-colors ${repo.status === 'DRAFT' ? 'opacity-70 bg-slate-50/50' : ''}`}>
                        <td className="p-4 text-center">
                           <div className="flex justify-center">
                              {repo.status === 'ACTIVE' ? <span title="Ativo"><CheckCircle2 className="text-emerald-500" size={20} /></span> : <span title="Rascunho"><XCircle className="text-slate-400" size={20} /></span>}
                           </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                              {repo.cover_image ? <img src={repo.cover_image} alt={repo.name} className="w-full h-full object-cover" /> : (repo.type === 'SIMPLE' ? <List className="text-slate-400" size={24}/> : <ImageIcon className="text-slate-400" size={24} />)}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 text-base mb-1">{repo.name}</p>
                              <p className="text-xs text-slate-500 line-clamp-2 max-w-sm">{repo.description || 'Sem descrição'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                           <div className="flex justify-center">
                             {repo.type === 'FULL' ? (
                               <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                 <MonitorPlay size={12} /> Completo
                               </span>
                             ) : repo.type === 'PLAYLIST' ? (
                               <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-purple-50 text-purple-700 border border-purple-100">
                                 <Music size={12} /> Playlist
                               </span>
                             ) : repo.type === 'VIDEO_PLAYLIST' ? (
                               <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-teal-50 text-teal-700 border border-teal-100">
                                 <PlaySquare size={12} /> Vídeos
                               </span>
                             ) : (
                               <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                 <List size={12} /> Simples
                               </span>
                             )}
                           </div>
                        </td>
                        <td className="p-4 text-center">
                           <div className="flex justify-center">
                             {isRestricted ? (
                               <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-100">
                                 <Lock size={12} /> Restrito
                               </span>
                             ) : (
                               <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                                 <Globe size={12} /> Todos
                               </span>
                             )}
                           </div>
                        </td>
                        <td className="p-4 text-center">
                           <div className="flex flex-col items-center justify-center">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${itemsCount > 0 ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-slate-100 text-slate-500'}`}>
                                <Layers size={14} /> {(loadingContents || loadingLinks) ? <Loader2 size={12} className="animate-spin" /> : itemsCount}
                              </span>
                           </div>
                        </td>
                        <td className="p-4 text-right">
                           <div className="flex items-center justify-end gap-1 md:gap-2">
                             <Button asChild variant="default" size="sm" className="hidden sm:flex items-center gap-1.5 h-8 mr-2 bg-indigo-600 hover:bg-indigo-700 text-white">
                                <Link to={`/admin/${link_name}/repos/${repo.id}`}>
                                   <FolderOpen size={14} /> Abrir
                                </Link>
                             </Button>
                             <Switch checked={repo.status === 'ACTIVE'} onCheckedChange={() => toggleStatus(repo)} title="Ativar/Inativar" />
                             <div className="h-6 w-px bg-slate-200 mx-1"></div>
                             <Button type="button" variant="ghost" size="icon" onClick={() => openEdit(repo)} className="text-slate-400 hover:text-blue-600" title="Editar Repositório"><Edit2 size={16} /></Button>
                             <Button type="button" variant="ghost" size="icon" onClick={() => {setRepoToDelete({id: repo.id, name: repo.name}); setIsDeleteOpen(true);}} className="text-slate-400 hover:text-red-600" title="Excluir Repositório"><Trash2 size={16} /></Button>
                           </div>
                        </td>
                     </tr>
                   );
                })}
                {companyRepos.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-12 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <FolderTree size={48} className="text-slate-300 mb-4" />
                        <p className="text-lg font-medium text-slate-900">Nenhum repositório criado</p>
                        <p className="text-sm mt-1">Crie seu primeiro repositório para começar a organizar seus conteúdos.</p>
                      </div>
                    </td>
                  </tr>
                )}
             </tbody>
          </table>
        </div>
      </div>

      <Dialog open={isFormOpen} onOpenChange={(open) => { if (!open && !isUploading && !isSubmitting) handleCloseForm(); }}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? 'Editar Repositório' : 'Novo Repositório'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveRepo} className="space-y-6 mt-4">
            
            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
               <Label className="text-sm font-semibold text-slate-900">Tipo de Repositório</Label>
               <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {REPO_TYPES.map((t) => {
                    const Icon = t.icon;
                    const isActive = formData.type === t.id;
                    return (
                      <label key={t.id} className={`relative flex flex-col items-start p-4 rounded-lg border-2 cursor-pointer transition-all ${isActive ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-200 bg-white hover:border-indigo-300'}`}>
                         <input type="radio" name="type" className="sr-only" checked={isActive} onChange={() => setFormData({...formData, type: t.id as 'FULL' | 'SIMPLE' | 'PLAYLIST' | 'VIDEO_PLAYLIST'})} disabled={!!editingId || isSubmitting} />
                         <Icon size={24} className={isActive ? 'text-indigo-600' : 'text-slate-400'} />
                         <span className={`mt-2 font-bold ${isActive ? 'text-indigo-900' : 'text-slate-700'}`}>{t.label}</span>
                         <span className="mt-1 text-xs text-slate-500 leading-relaxed">{t.description}</span>
                      </label>
                    );
                  })}
               </div>
               {editingId && <p className="text-xs text-rose-500">O tipo do repositório não pode ser alterado após a criação.</p>}
            </div>

            <div className="space-y-4">
               <div className="space-y-2">
                 <Label>Nome do Repositório *</Label>
                 <Input placeholder="Ex: Treinamento de Vendas 2024" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} disabled={isSubmitting} />
               </div>
               <div className="space-y-2">
                 <Label>Descrição</Label>
                 <textarea 
                   className="flex w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 min-h-[80px] resize-y disabled:opacity-50"
                   placeholder="Uma breve descrição..."
                   value={formData.description}
                   onChange={(e) => setFormData({...formData, description: e.target.value})}
                   disabled={isSubmitting}
                 />
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Capa (Retrato) {formData.type === 'FULL' && '*'}</Label>
                    <div className={`border-2 border-dashed border-slate-200 rounded-lg p-2 flex flex-col items-center justify-center relative bg-slate-50 ${!isSubmitting ? 'hover:bg-slate-100 cursor-pointer' : 'opacity-50 cursor-not-allowed'} transition-colors group h-48 overflow-hidden`} onClick={() => !isSubmitting && document.getElementById('cover-upload')?.click()}>
                       {formData.cover_image ? (
                          <>
                            <img src={formData.cover_image} alt="Capa" className="w-full h-full object-cover rounded-md opacity-80 group-hover:opacity-40 transition-opacity" />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Button type="button" variant="secondary" size="sm" disabled={isSubmitting}>Trocar</Button></div>
                          </>
                       ) : (
                          <div className="text-center p-4">
                             <ImageIcon className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                             <p className="text-xs text-slate-500">Proporção 2:3</p>
                          </div>
                       )}
                    </div>
                    <Input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'cover_image')} className="hidden" id="cover-upload" disabled={isSubmitting || isUploading} />
                    <Input placeholder="URL da imagem..." value={formData.cover_image} onChange={(e) => setFormData({...formData, cover_image: e.target.value})} className="h-8 text-xs mt-2" disabled={isSubmitting} />
                  </div>
                  <div className="space-y-2">
                    <Label>Banner (Paisagem)</Label>
                    <div className={`border-2 border-dashed border-slate-200 rounded-lg p-2 flex flex-col items-center justify-center relative bg-slate-50 ${!isSubmitting ? 'hover:bg-slate-100 cursor-pointer' : 'opacity-50 cursor-not-allowed'} transition-colors group h-48 overflow-hidden`} onClick={() => !isSubmitting && document.getElementById('banner-upload')?.click()}>
                       {formData.banner_image ? (
                          <>
                            <img src={formData.banner_image} alt="Banner" className="w-full h-full object-cover rounded-md opacity-80 group-hover:opacity-40 transition-opacity" />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Button type="button" variant="secondary" size="sm" disabled={isSubmitting}>Trocar</Button></div>
                          </>
                       ) : (
                          <div className="text-center p-4">
                             <ImageIcon className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                             <p className="text-xs text-slate-500">Proporção 16:9</p>
                          </div>
                       )}
                    </div>
                    <Input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'banner_image')} className="hidden" id="banner-upload" disabled={isSubmitting || isUploading} />
                     <Input placeholder="URL da imagem..." value={formData.banner_image} onChange={(e) => setFormData({...formData, banner_image: e.target.value})} className="h-8 text-xs mt-2" disabled={isSubmitting} />
                   </div>
                </div>
             </div>

                 {/* UI Customization */}
                 <div className="space-y-6">
                   <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                     Banner do Repositório
                   </h3>
                   
                   {/* Real-time Preview */}
                     <CoverPreview 
                        image={formData.banner_image || formData.cover_image}
                        position={formData.banner_position}
                        brightness={formData.banner_brightness}
                        title={formData.name}
                        subtitle="Visualize aqui o enquadramento do banner..."
                        type="banner"
                     />

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Label className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                        <MoveVertical size={14} className="text-indigo-500" /> Posição da Capa ({formData.banner_position}%)
                      </Label>
                    </div>
                    <Slider 
                      value={[formData.banner_position]} 
                      min={0} 
                      max={100} 
                      step={1} 
                      onValueChange={(val) => setFormData(prev => ({ ...prev, banner_position: val[0] }))}
                      disabled={isSubmitting}
                    />
                    <p className="text-[10px] text-slate-500">Ajuste o foco vertical da imagem do cabeçalho.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Label className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
                        <Sun size={14} className="text-amber-500" /> Exposição ({formData.banner_brightness}%)
                      </Label>
                    </div>
                    <Slider 
                      value={[formData.banner_brightness]} 
                      min={0} 
                      max={200} 
                      step={1} 
                      onValueChange={(val) => setFormData(prev => ({ ...prev, banner_brightness: val[0] }))}
                      disabled={isSubmitting}
                    />
                    <p className="text-[10px] text-slate-500">Controle o brilho para melhor legibilidade dos textos.</p>
                   </div>
                </div>
             </div>

            <div className="border-t border-slate-100 my-4"></div>

            <div className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="text-sm font-semibold text-slate-900">Privacidade e Acesso</h3>
                 {company.landing_page_enabled !== false && (
                   <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-600 bg-emerald-100 text-emerald-700 px-2 py-1 rounded">Landing Page Pública</span>
                      <Switch checked={formData.show_in_landing || false} onCheckedChange={(val) => setFormData({...formData, show_in_landing: val})} title="Exibir na Landing Page Pública" disabled={isSubmitting} />
                   </div>
                 )}
              </div>
              <div className="flex gap-6">
                 <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="access_type" checked={formData.access_type === 'ALL'} onChange={() => setFormData({...formData, access_type: 'ALL'})} className="accent-indigo-600 w-4 h-4" disabled={isSubmitting} />
                    <span className="text-sm font-medium text-slate-700">Todos os Usuários</span>
                 </label>
                 <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="access_type" checked={formData.access_type === 'RESTRICTED'} onChange={() => setFormData({...formData, access_type: 'RESTRICTED'})} className="accent-indigo-600 w-4 h-4" disabled={isSubmitting} />
                    <span className="text-sm font-medium text-slate-700">Acesso Restrito</span>
                 </label>
              </div>

              {formData.access_type === 'RESTRICTED' && (
                 <div className="mt-4 border-t border-slate-100 pt-4">
                    <p className="text-sm font-semibold text-slate-900 mb-3">Definir Permissões (quem pode acessar)</p>
                    {loadingOrg || loadingUsers ? (
                      <div className="flex justify-center py-4"><Loader2 className="animate-spin text-slate-400" /></div>
                    ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       
                       {org_levels.map((lvl, index) => {
                          const groupsInThisLevel = companyTopLevels.filter(t => t.level_id === lvl.id || (!t.level_id && index === 0));
                          if (groupsInThisLevel.length === 0) return null;
                          return (
                             <div key={lvl.id} className="border border-slate-200 rounded-md p-3 max-h-48 overflow-y-auto bg-slate-50">
                                <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">{lvl.name}s:</p>
                                <div className="space-y-1">
                                  {groupsInThisLevel.map(t => (
                                     <label key={t.id} className="flex items-center gap-3 p-2 hover:bg-slate-100 rounded-md cursor-pointer transition-colors border border-transparent hover:border-slate-200">
                                       <input type="checkbox" checked={formData.allowed_region_ids.includes(t.id)} onChange={() => toggleArrayItem('allowed_region_ids', t.id)} className="accent-indigo-600 rounded w-4 h-4" disabled={isSubmitting} />
                                       <span className="text-sm font-semibold text-slate-900 leading-tight">{t.name}</span>
                                     </label>
                                  ))}
                                </div>
                             </div>
                          );
                       })}

                       <div className="border border-slate-200 rounded-md p-3 max-h-48 overflow-y-auto bg-slate-50">
                          <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">{unitLabel}s:</p>
                          <div className="space-y-1">
                            {companyUnitsLocal.map(u => (
                               <label key={u.id} className="flex items-center gap-3 p-2 hover:bg-slate-100 rounded-md cursor-pointer transition-colors border border-transparent hover:border-slate-200">
                                 <input type="checkbox" checked={formData.allowed_store_ids.includes(u.id)} onChange={() => toggleArrayItem('allowed_store_ids', u.id)} className="accent-indigo-600 rounded w-4 h-4" disabled={isSubmitting} />
                                 <span className="text-sm font-semibold text-slate-900 leading-tight">{u.name}</span>
                               </label>
                            ))}
                            {companyUnitsLocal.length === 0 && <span className="text-xs text-slate-400">Nenhum registro.</span>}
                          </div>
                       </div>

                       <div className="border border-slate-200 rounded-md p-3 max-h-48 overflow-y-auto bg-slate-50">
                          <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">Usuários Específicos:</p>
                          <div className="space-y-1">
                            {companyUsers.map(u => (
                               <label key={u.id} className="flex items-center gap-3 p-2 hover:bg-slate-100 rounded-md cursor-pointer transition-colors border border-transparent hover:border-slate-200">
                                 <input type="checkbox" checked={formData.allowed_user_ids.includes(u.id)} onChange={() => toggleArrayItem('allowed_user_ids', u.id)} className="accent-indigo-600 rounded w-4 h-4" disabled={isSubmitting} />
                                 <div className="flex flex-col"><span className="text-sm font-semibold text-slate-900 leading-tight">{u.name}</span><span className="text-[10px] text-slate-500">{u.email}</span></div>
                               </label>
                            ))}
                            {companyUsers.length === 0 && <span className="text-xs text-slate-400">Nenhum registro.</span>}
                          </div>
                       </div>

                       {(formData.allowed_region_ids.length > 0 || formData.allowed_store_ids.length > 0) && (
                         <div className="border border-red-100 rounded-md p-3 max-h-48 overflow-y-auto bg-red-50/30">
                            <p className="text-xs font-semibold text-red-500 mb-2 uppercase tracking-wider">Exceções (Bloqueados):</p>
                            <div className="space-y-1">
                              {usersInScope.map(u => (
                                 <label key={u.id} className="flex items-center gap-3 p-2 hover:bg-red-50 rounded-md cursor-pointer transition-colors border border-transparent hover:border-red-200">
                                   <input type="checkbox" checked={formData.excluded_user_ids.includes(u.id)} onChange={() => toggleArrayItem('excluded_user_ids', u.id)} className="accent-red-600 rounded w-4 h-4" disabled={isSubmitting} />
                                   <div className="flex flex-col"><span className="text-sm font-semibold text-slate-900 leading-tight">{u.name}</span><span className="text-[10px] text-slate-500">{u.email}</span></div>
                                 </label>
                              ))}
                              {usersInScope.length === 0 && <span className="text-xs text-slate-400">Nenhum usuário no escopo selecionado.</span>}
                            </div>
                         </div>
                       )}

                    </div>
                    )}
                 </div>
              )}
            </div>

            <div className="border-t border-slate-100 my-4"></div>

            <div className="grid grid-cols-2 gap-4">
               <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                 <div className="space-y-0.5"><Label>Destacar</Label><p className="text-[10px] text-slate-500">Topo da home.</p></div>
                 <Switch checked={formData.featured} onCheckedChange={(checked) => setFormData({...formData, featured: checked})} disabled={isSubmitting} />
               </div>
               <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                 <div className="space-y-0.5"><Label>Ativo</Label><p className="text-[10px] text-slate-500">Inativos ficam ocultos.</p></div>
                 <Switch checked={formData.status === 'ACTIVE'} onCheckedChange={(checked) => setFormData({...formData, status: checked ? 'ACTIVE' : 'DRAFT'})} disabled={isSubmitting} />
               </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <Button type="button" variant="outline" onClick={handleCloseForm} disabled={isSubmitting}>Cancelar</Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={isSubmitting || isUploading}>
                {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : (editingId ? 'Salvar Alterações' : 'Criar Repositório')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={(open) => { if (!open && !isSubmitting) handleCloseDelete(); }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle className="text-red-600">Excluir Repositório</DialogTitle></DialogHeader>
          <div className="py-4">
             <p className="text-slate-600 text-sm">Tem certeza que deseja excluir <strong>{repoToDelete?.name}</strong>?</p>
             <p className="text-red-500 text-sm mt-2 font-medium">Os conteúdos dentro dele também ficarão inacessíveis (ou excluídos).</p>
          </div>
          <div className="flex justify-end gap-3">
             <Button type="button" variant="outline" onClick={handleCloseDelete} disabled={isSubmitting}>Cancelar</Button>
             <Button type="button" variant="destructive" onClick={handleDeleteRepo} disabled={isSubmitting}>
               {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : 'Sim, excluir'}
             </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};