import { useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { CheckCircle2, XCircle, Edit2, Trash2, FolderTree, Image as ImageIcon, Layers, FolderOpen, Lock, Globe, List, MonitorPlay } from 'lucide-react';
import { Repository } from '../../types';

export const AdminRepositories = () => {
  const { linkName } = useParams();
  const { companies, users, repositories, contents, simpleLinks, orgTopLevels, orgUnits, addRepository, updateRepository, deleteRepository } = useAppStore();
  
  const company = companies.find(c => c.linkName === linkName);
  
  // Ordenação segura
  const companyRepos = useMemo(() => {
    return repositories
      .filter(r => r.companyId === company?.id)
      .sort((a, b) => {
         const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
         const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
         return timeB - timeA;
      });
  }, [repositories, company?.id]);

  const companyUsers = users.filter(u => u.companyId === company?.id && u.role === 'USER');
  const companyTopLevels = orgTopLevels.filter(o => o.companyId === company?.id && o.active);
  const companyUnitsLocal = orgUnits.filter(u => u.companyId === company?.id && u.active);

  const unitLabel = company?.orgUnitName || 'Unidade';
  const orgLevels = company?.orgLevels?.length ? company.orgLevels : [{ id: 'legacy', name: company?.orgTopLevelName || 'Regional' }];

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'FULL' as 'FULL' | 'SIMPLE',
    coverImage: '',
    bannerImage: '',
    featured: false,
    status: 'ACTIVE' as 'ACTIVE' | 'DRAFT',
    accessType: 'ALL' as 'ALL' | 'RESTRICTED',
    allowedUserIds: [] as string[],
    allowedRegionIds: [] as string[],
    allowedStoreIds: [] as string[],
    excludedUserIds: [] as string[]
  });

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [repoToDelete, setRepoToDelete] = useState<{id: string, name: string} | null>(null);

  if (!company) return null;

  const usersInScope = useMemo(() => {
    if (formData.allowedRegionIds.length === 0 && formData.allowedStoreIds.length === 0) return [];
    return companyUsers.filter(u => {
      if (u.orgUnitId && formData.allowedStoreIds.includes(u.orgUnitId)) return true;
      if (u.orgUnitId && formData.allowedRegionIds.length > 0) {
        const unit = companyUnitsLocal.find(unit => unit.id === u.orgUnitId);
        let currentParent = companyTopLevels.find(t => t.id === unit?.parentId);
        while (currentParent) {
          if (formData.allowedRegionIds.includes(currentParent.id)) return true;
          currentParent = companyTopLevels.find(t => t.id === currentParent?.parentId);
        }
      }
      if (u.orgTopLevelId && formData.allowedRegionIds.includes(u.orgTopLevelId)) return true;
      return false;
    });
  }, [formData.allowedRegionIds, formData.allowedStoreIds, companyUsers, companyUnitsLocal, companyTopLevels]);

  useEffect(() => {
    setFormData(prev => {
      const inScopeIds = new Set(usersInScope.map(u => u.id));
      const filteredExclusions = prev.excludedUserIds.filter(id => inScopeIds.has(id));
      if (filteredExclusions.length !== prev.excludedUserIds.length) return { ...prev, excludedUserIds: filteredExclusions };
      return prev;
    });
  }, [usersInScope]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'coverImage' | 'bannerImage') => {
    const file = e.target.files?.[0];
    if (file) {
      // Regra fundamental: Limite reduzido para proteger a memória (QuotaExceededError do LocalStorage)
      if (file.size > 300 * 1024) {
         toast.error('A imagem é muito pesada (máx: 300KB). Para imagens maiores, por favor use o campo de URL logo abaixo.');
         return;
      }
      const reader = new FileReader();
      reader.onloadend = () => setFormData(prev => ({ ...prev, [field]: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setTimeout(() => {
      setEditingId(null);
      setFormData({ 
        name: '', description: '', type: 'FULL', coverImage: '', bannerImage: '', 
        featured: false, status: 'ACTIVE', accessType: 'ALL', 
        allowedUserIds: [], allowedRegionIds: [], allowedStoreIds: [], excludedUserIds: []
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
       name: '', description: '', type: 'FULL', coverImage: '', bannerImage: '', 
       featured: false, status: 'ACTIVE', accessType: 'ALL', 
       allowedUserIds: [], allowedRegionIds: [], allowedStoreIds: [], excludedUserIds: []
    });
    setIsFormOpen(true);
  };

  const openEdit = (repo: Repository) => {
    setEditingId(repo.id);
    setFormData({ 
      name: repo.name, description: repo.description, type: repo.type || 'FULL', 
      coverImage: repo.coverImage, bannerImage: repo.bannerImage || '', 
      featured: repo.featured, status: repo.status, accessType: repo.accessType || 'ALL', 
      allowedUserIds: repo.allowedUserIds || [],
      allowedRegionIds: repo.allowedRegionIds || [],
      allowedStoreIds: repo.allowedStoreIds || [],
      excludedUserIds: repo.excludedUserIds || []
    });
    setIsFormOpen(true);
  };

  const toggleArrayItem = (arrayName: 'allowedUserIds' | 'allowedRegionIds' | 'allowedStoreIds' | 'excludedUserIds', id: string) => {
    setFormData(prev => ({
      ...prev,
      [arrayName]: prev[arrayName].includes(id)
        ? prev[arrayName].filter(item => item !== id)
        : [...prev[arrayName], id]
    }));
  };

  const handleSaveRepo = (e: React.FormEvent) => {
    e.preventDefault();
    const repoName = formData.name.trim();
    
    if (!repoName) return toast.error('Nome é obrigatório.');
    
    const isDuplicate = companyRepos.some(r => r.name.toLowerCase() === repoName.toLowerCase() && r.id !== editingId);
    if (isDuplicate) return toast.error('Já existe um repositório com este nome nesta empresa.');
    if (formData.type === 'FULL' && !formData.coverImage) return toast.error('Capa é obrigatória para Repositórios Completos.');

    if (formData.accessType === 'RESTRICTED' && formData.allowedUserIds.length === 0 && formData.allowedRegionIds.length === 0 && formData.allowedStoreIds.length === 0) {
      return toast.error('Selecione ao menos um usuário ou nível na estrutura para o acesso restrito.');
    }

    try {
      if (editingId) {
        updateRepository(editingId, { ...formData, name: repoName });
        toast.success('Repositório atualizado com sucesso!');
      } else {
        addRepository({ companyId: company.id, ...formData, name: repoName });
        toast.success('Repositório criado com sucesso!');
      }
      handleCloseForm();
    } catch (err: any) {
      // Captura o erro silencioso de estouro de LocalStorage que quebrava o fluxo
      if (err?.name === 'QuotaExceededError' || err?.message?.includes('exceeded the quota')) {
         toast.error('Limite de armazenamento atingido! Você salvou muitas imagens pesadas. Remova as imagens grandes e use URLs.');
      } else {
         toast.error('Erro inesperado ao salvar o repositório.');
      }
      console.error("Store persistence error:", err);
    }
  };

  const handleDeleteRepo = () => {
    if (repoToDelete) {
      deleteRepository(repoToDelete.id);
      toast.success('Repositório excluído.');
    }
    handleCloseDelete();
  };

  const toggleStatus = (repo: Repository) => {
    updateRepository(repo.id, { status: repo.status === 'ACTIVE' ? 'DRAFT' : 'ACTIVE' });
    toast.success(`Status alterado para ${repo.status === 'ACTIVE' ? 'Rascunho' : 'Ativo'}.`);
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
                      ? simpleLinks.filter(l => l.repositoryId === repo.id).length 
                      : contents.filter(c => c.repositoryId === repo.id).length;
                   
                   const isRestricted = repo.accessType === 'RESTRICTED';

                   return (
                     <tr key={repo.id} className={`hover:bg-slate-50 transition-colors ${repo.status === 'DRAFT' ? 'opacity-70 bg-slate-50/50' : ''}`}>
                        <td className="p-4 text-center">
                           <div className="flex justify-center">
                              {repo.status === 'ACTIVE' ? <CheckCircle2 className="text-emerald-500" size={20} title="Ativo" /> : <XCircle className="text-slate-400" size={20} title="Rascunho" />}
                           </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                              {repo.coverImage ? <img src={repo.coverImage} alt={repo.name} className="w-full h-full object-cover" /> : (repo.type === 'SIMPLE' ? <List className="text-slate-400" size={24}/> : <ImageIcon className="text-slate-400" size={24} />)}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 text-base mb-1">{repo.name}</p>
                              <p className="text-xs text-slate-500 line-clamp-2 max-w-sm">{repo.description || 'Sem descrição'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                           <div className="flex justify-center">
                             {repo.type === 'SIMPLE' ? (
                               <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                 <List size={12} /> Simples
                               </span>
                             ) : (
                               <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                 <MonitorPlay size={12} /> Completo
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
                                <Layers size={14} /> {itemsCount}
                              </span>
                           </div>
                        </td>
                        <td className="p-4 text-right">
                           <div className="flex items-center justify-end gap-1 md:gap-2">
                             <Button asChild variant="default" size="sm" className="hidden sm:flex items-center gap-1.5 h-8 mr-2 bg-indigo-600 hover:bg-indigo-700 text-white">
                                <Link to={`/admin/${linkName}/repos/${repo.id}`}>
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

      <Dialog open={isFormOpen} onOpenChange={(open) => { if (!open) handleCloseForm(); }}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? 'Editar Repositório' : 'Novo Repositório'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveRepo} className="space-y-6 mt-4">
            
            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
               <Label className="text-sm font-semibold text-slate-900">Tipo de Repositório</Label>
               <div className="grid grid-cols-2 gap-4">
                  <label className={`relative flex flex-col items-start p-4 rounded-lg border-2 cursor-pointer transition-all ${formData.type === 'FULL' ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-200 bg-white hover:border-indigo-300'}`}>
                     <input type="radio" name="type" className="sr-only" checked={formData.type === 'FULL'} onChange={() => setFormData({...formData, type: 'FULL'})} disabled={!!editingId} />
                     <MonitorPlay size={24} className={formData.type === 'FULL' ? 'text-indigo-600' : 'text-slate-400'} />
                     <span className={`mt-2 font-bold ${formData.type === 'FULL' ? 'text-indigo-900' : 'text-slate-700'}`}>Completo</span>
                     <span className="mt-1 text-xs text-slate-500 leading-relaxed">Layout rico (estilo Netflix) com thumbnails, vídeos, PDFs e preview.</span>
                  </label>
                  <label className={`relative flex flex-col items-start p-4 rounded-lg border-2 cursor-pointer transition-all ${formData.type === 'SIMPLE' ? 'border-indigo-600 bg-indigo-50/50' : 'border-slate-200 bg-white hover:border-indigo-300'}`}>
                     <input type="radio" name="type" className="sr-only" checked={formData.type === 'SIMPLE'} onChange={() => setFormData({...formData, type: 'SIMPLE'})} disabled={!!editingId} />
                     <List size={24} className={formData.type === 'SIMPLE' ? 'text-indigo-600' : 'text-slate-400'} />
                     <span className={`mt-2 font-bold ${formData.type === 'SIMPLE' ? 'text-indigo-900' : 'text-slate-700'}`}>Simples (Links)</span>
                     <span className="mt-1 text-xs text-slate-500 leading-relaxed">Layout limpo para listar dezenas de links diretos, planilhas e acessos rápidos.</span>
                  </label>
               </div>
               {editingId && <p className="text-xs text-rose-500">O tipo do repositório não pode ser alterado após a criação.</p>}
            </div>

            <div className="space-y-4">
               <div className="space-y-2">
                 <Label>Nome do Repositório *</Label>
                 <Input placeholder="Ex: Treinamento de Vendas 2024" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
               </div>
               <div className="space-y-2">
                 <Label>Descrição</Label>
                 <textarea 
                   className="flex w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 min-h-[80px] resize-y"
                   placeholder="Uma breve descrição..."
                   value={formData.description}
                   onChange={(e) => setFormData({...formData, description: e.target.value})}
                 />
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Capa (Retrato) {formData.type === 'FULL' && '*'}</Label>
                    <div className="border-2 border-dashed border-slate-200 rounded-lg p-2 flex flex-col items-center justify-center relative bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer group h-48 overflow-hidden" onClick={() => document.getElementById('cover-upload')?.click()}>
                       {formData.coverImage ? (
                          <>
                            <img src={formData.coverImage} alt="Capa" className="w-full h-full object-cover rounded-md opacity-80 group-hover:opacity-40 transition-opacity" />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Button type="button" variant="secondary" size="sm">Trocar</Button></div>
                          </>
                       ) : (
                          <div className="text-center p-4">
                             <ImageIcon className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                             <p className="text-xs text-slate-500">Proporção 2:3</p>
                          </div>
                       )}
                    </div>
                    <Input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'coverImage')} className="hidden" id="cover-upload" />
                    <Input placeholder="URL da imagem..." value={formData.coverImage} onChange={(e) => setFormData({...formData, coverImage: e.target.value})} className="h-8 text-xs mt-2" />
                  </div>
                  <div className="space-y-2">
                    <Label>Banner (Paisagem)</Label>
                    <div className="border-2 border-dashed border-slate-200 rounded-lg p-2 flex flex-col items-center justify-center relative bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer group h-48 overflow-hidden" onClick={() => document.getElementById('banner-upload')?.click()}>
                       {formData.bannerImage ? (
                          <>
                            <img src={formData.bannerImage} alt="Banner" className="w-full h-full object-cover rounded-md opacity-80 group-hover:opacity-40 transition-opacity" />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Button type="button" variant="secondary" size="sm">Trocar</Button></div>
                          </>
                       ) : (
                          <div className="text-center p-4">
                             <ImageIcon className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                             <p className="text-xs text-slate-500">Proporção 16:9</p>
                          </div>
                       )}
                    </div>
                    <Input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'bannerImage')} className="hidden" id="banner-upload" />
                    <Input placeholder="URL da imagem..." value={formData.bannerImage} onChange={(e) => setFormData({...formData, bannerImage: e.target.value})} className="h-8 text-xs mt-2" />
                  </div>
               </div>
            </div>

            <div className="border-t border-slate-100 my-4"></div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-900">Privacidade e Acesso</h3>
              <div className="flex gap-6">
                 <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="accessType" checked={formData.accessType === 'ALL'} onChange={() => setFormData({...formData, accessType: 'ALL'})} className="accent-indigo-600 w-4 h-4" />
                    <span className="text-sm font-medium text-slate-700">Todos os Usuários</span>
                 </label>
                 <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="accessType" checked={formData.accessType === 'RESTRICTED'} onChange={() => setFormData({...formData, accessType: 'RESTRICTED'})} className="accent-indigo-600 w-4 h-4" />
                    <span className="text-sm font-medium text-slate-700">Acesso Restrito</span>
                 </label>
              </div>

              {formData.accessType === 'RESTRICTED' && (
                 <div className="mt-4 border-t border-slate-100 pt-4">
                    <p className="text-sm font-semibold text-slate-900 mb-3">Definir Permissões (quem pode acessar)</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       
                       {orgLevels.map((lvl, index) => {
                          const groupsInThisLevel = companyTopLevels.filter(t => t.levelId === lvl.id || (!t.levelId && index === 0));
                          if (groupsInThisLevel.length === 0) return null;
                          return (
                             <div key={lvl.id} className="border border-slate-200 rounded-md p-3 max-h-48 overflow-y-auto bg-slate-50">
                                <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">{lvl.name}s:</p>
                                <div className="space-y-1">
                                  {groupsInThisLevel.map(t => (
                                     <label key={t.id} className="flex items-center gap-3 p-2 hover:bg-slate-100 rounded-md cursor-pointer transition-colors border border-transparent hover:border-slate-200">
                                       <input type="checkbox" checked={formData.allowedRegionIds.includes(t.id)} onChange={() => toggleArrayItem('allowedRegionIds', t.id)} className="accent-indigo-600 rounded w-4 h-4" />
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
                                 <input type="checkbox" checked={formData.allowedStoreIds.includes(u.id)} onChange={() => toggleArrayItem('allowedStoreIds', u.id)} className="accent-indigo-600 rounded w-4 h-4" />
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
                                 <input type="checkbox" checked={formData.allowedUserIds.includes(u.id)} onChange={() => toggleArrayItem('allowedUserIds', u.id)} className="accent-indigo-600 rounded w-4 h-4" />
                                 <div className="flex flex-col"><span className="text-sm font-semibold text-slate-900 leading-tight">{u.name}</span><span className="text-[10px] text-slate-500">{u.email}</span></div>
                               </label>
                            ))}
                            {companyUsers.length === 0 && <span className="text-xs text-slate-400">Nenhum registro.</span>}
                          </div>
                       </div>

                       {(formData.allowedRegionIds.length > 0 || formData.allowedStoreIds.length > 0) && (
                         <div className="border border-red-100 rounded-md p-3 max-h-48 overflow-y-auto bg-red-50/30">
                            <p className="text-xs font-semibold text-red-500 mb-2 uppercase tracking-wider">Exceções (Bloqueados):</p>
                            <div className="space-y-1">
                              {usersInScope.map(u => (
                                 <label key={u.id} className="flex items-center gap-3 p-2 hover:bg-red-50 rounded-md cursor-pointer transition-colors border border-transparent hover:border-red-200">
                                   <input type="checkbox" checked={formData.excludedUserIds.includes(u.id)} onChange={() => toggleArrayItem('excludedUserIds', u.id)} className="accent-red-600 rounded w-4 h-4" />
                                   <div className="flex flex-col"><span className="text-sm font-semibold text-slate-900 leading-tight">{u.name}</span><span className="text-[10px] text-slate-500">{u.email}</span></div>
                                 </label>
                              ))}
                              {usersInScope.length === 0 && <span className="text-xs text-slate-400">Nenhum usuário no escopo selecionado.</span>}
                            </div>
                         </div>
                       )}

                    </div>
                 </div>
              )}
            </div>

            <div className="border-t border-slate-100 my-4"></div>

            <div className="grid grid-cols-2 gap-4">
               <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                 <div className="space-y-0.5"><Label>Destacar</Label><p className="text-[10px] text-slate-500">Topo da home.</p></div>
                 <Switch checked={formData.featured} onCheckedChange={(checked) => setFormData({...formData, featured: checked})} />
               </div>
               <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                 <div className="space-y-0.5"><Label>Ativo</Label><p className="text-[10px] text-slate-500">Inativos ficam ocultos.</p></div>
                 <Switch checked={formData.status === 'ACTIVE'} onCheckedChange={(checked) => setFormData({...formData, status: checked ? 'ACTIVE' : 'DRAFT'})} />
               </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <Button type="button" variant="outline" onClick={handleCloseForm}>Cancelar</Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">{editingId ? 'Salvar Alterações' : 'Criar Repositório'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={(open) => { if (!open) handleCloseDelete(); }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle className="text-red-600">Excluir Repositório</DialogTitle></DialogHeader>
          <div className="py-4">
             <p className="text-slate-600 text-sm">Tem certeza que deseja excluir <strong>{repoToDelete?.name}</strong>?</p>
             <p className="text-red-500 text-sm mt-2 font-medium">Os conteúdos dentro dele também ficarão inacessíveis (ou excluídos).</p>
          </div>
          <div className="flex justify-end gap-3">
             <Button type="button" variant="outline" onClick={handleCloseDelete}>Cancelar</Button>
             <Button type="button" variant="destructive" onClick={handleDeleteRepo}>Sim, excluir</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};