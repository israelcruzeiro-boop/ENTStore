import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { CheckCircle2, XCircle, Edit2, Trash2, FolderTree, Upload, Image as ImageIcon, Star, Layers } from 'lucide-react';
import { Repository } from '../../types';

export const AdminRepositories = () => {
  const { linkName } = useParams();
  const { companies, repositories, contents, addRepository, updateRepository, deleteRepository } = useAppStore();
  
  const company = companies.find(c => c.linkName === linkName);
  
  // Filtra apenas repositórios dessa empresa
  const companyRepos = repositories.filter(r => r.companyId === company?.id)
                                   .sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    coverImage: '',
    bannerImage: '',
    featured: false,
    status: 'ACTIVE' as 'ACTIVE' | 'DRAFT'
  });

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [repoToDelete, setRepoToDelete] = useState<{id: string, name: string} | null>(null);

  if (!company) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'coverImage' | 'bannerImage') => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('A imagem deve ter no máximo 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, [field]: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setFormData({ name: '', description: '', coverImage: '', bannerImage: '', featured: false, status: 'ACTIVE' });
    setIsFormOpen(true);
  };

  const openEdit = (repo: Repository) => {
    setEditingId(repo.id);
    setFormData({ 
      name: repo.name, 
      description: repo.description, 
      coverImage: repo.coverImage, 
      bannerImage: repo.bannerImage || '', 
      featured: repo.featured, 
      status: repo.status 
    });
    setIsFormOpen(true);
  };

  const handleSaveRepo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.coverImage) {
      return toast.error('Nome e Capa são obrigatórios.');
    }

    if (editingId) {
      updateRepository(editingId, formData);
      toast.success('Repositório atualizado com sucesso!');
    } else {
      addRepository({
        companyId: company.id,
        ...formData
      });
      toast.success('Repositório criado com sucesso!');
    }
    setIsFormOpen(false);
  };

  const handleDeleteRepo = () => {
    if (repoToDelete) {
      deleteRepository(repoToDelete.id);
      toast.success('Repositório excluído.');
      setIsDeleteOpen(false);
    }
  };

  const toggleStatus = (repo: Repository) => {
    updateRepository(repo.id, { status: repo.status === 'ACTIVE' ? 'DRAFT' : 'ACTIVE' });
    toast.success(`Status alterado para ${repo.status === 'ACTIVE' ? 'Rascunho' : 'Ativo'}.`);
  };

  const toggleFeatured = (repo: Repository) => {
    updateRepository(repo.id, { featured: !repo.featured });
    toast.success(repo.featured ? 'Removido dos destaques.' : 'Adicionado aos destaques!');
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
                   <th className="p-4 text-center">Conteúdos</th>
                   <th className="p-4 text-center">Destaque</th>
                   <th className="p-4">Atualizado</th>
                   <th className="p-4 text-right">Ações</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
                {companyRepos.map(repo => {
                   // Calcula a quantidade de conteúdos vinculados a este repositório
                   const repoContentsCount = contents.filter(c => c.repositoryId === repo.id).length;

                   return (
                     <tr key={repo.id} className={`hover:bg-slate-50 transition-colors ${repo.status === 'DRAFT' ? 'opacity-70 bg-slate-50/50' : ''}`}>
                        <td className="p-4 text-center">
                           <div className="flex justify-center">
                              {repo.status === 'ACTIVE' ? <CheckCircle2 className="text-emerald-500" size={20} title="Ativo" /> : <XCircle className="text-slate-400" size={20} title="Rascunho" />}
                           </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-4">
                            <div className="w-16 h-24 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                              {repo.coverImage ? <img src={repo.coverImage} alt={repo.name} className="w-full h-full object-cover" /> : <ImageIcon className="text-slate-400" size={24} />}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 text-base mb-1">{repo.name}</p>
                              <p className="text-xs text-slate-500 line-clamp-2 max-w-sm">{repo.description || 'Sem descrição'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                           <div className="flex flex-col items-center justify-center">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${repoContentsCount > 0 ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                                <Layers size={14} />
                                {repoContentsCount}
                              </span>
                           </div>
                        </td>
                        <td className="p-4 text-center">
                            <button onClick={() => toggleFeatured(repo)} className={`p-2 rounded-full transition-colors ${repo.featured ? 'text-amber-500 hover:bg-amber-50' : 'text-slate-300 hover:bg-slate-100 hover:text-slate-500'}`}>
                               <Star size={20} fill={repo.featured ? "currentColor" : "none"} />
                            </button>
                        </td>
                        <td className="p-4 text-slate-500">{new Date(repo.updatedAt || repo.createdAt || '').toLocaleDateString('pt-BR')}</td>
                        <td className="p-4 text-right">
                           <div className="flex items-center justify-end gap-1 md:gap-2">
                             <Switch checked={repo.status === 'ACTIVE'} onCheckedChange={() => toggleStatus(repo)} title="Ativar/Rascunho" />
                             <div className="h-6 w-px bg-slate-200 mx-1"></div>
                             <Button variant="ghost" size="icon" onClick={() => openEdit(repo)} className="text-slate-400 hover:text-blue-600"><Edit2 size={16} /></Button>
                             <Button variant="ghost" size="icon" onClick={() => {setRepoToDelete({id: repo.id, name: repo.name}); setIsDeleteOpen(true);}} className="text-slate-400 hover:text-red-600"><Trash2 size={16} /></Button>
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

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? 'Editar Repositório' : 'Novo Repositório'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveRepo} className="space-y-5 mt-4">
            <div className="space-y-2">
              <Label>Nome do Repositório *</Label>
              <Input placeholder="Ex: Treinamento de Vendas 2024" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} autoFocus />
            </div>
            
            <div className="space-y-2">
              <Label>Descrição</Label>
              <textarea 
                className="flex w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 min-h-[80px] resize-y"
                placeholder="Uma breve descrição sobre o conteúdo deste repositório..."
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {/* Cover Image */}
               <div className="space-y-2">
                 <Label>Capa (Retrato) *</Label>
                 <div className="border-2 border-dashed border-slate-200 rounded-lg p-2 flex flex-col items-center justify-center relative bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer group h-48 overflow-hidden" onClick={() => document.getElementById('cover-upload')?.click()}>
                    {formData.coverImage ? (
                       <>
                         <img src={formData.coverImage} alt="Capa" className="w-full h-full object-cover rounded-md opacity-80 group-hover:opacity-40 transition-opacity" />
                         <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Button type="button" variant="secondary" size="sm">Trocar Imagem</Button></div>
                       </>
                    ) : (
                       <div className="text-center p-4">
                          <ImageIcon className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                          <p className="text-xs text-slate-500">Proporção 2:3 (Pôster)</p>
                       </div>
                    )}
                 </div>
                 <Input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'coverImage')} className="hidden" id="cover-upload" />
                 <Input placeholder="Ou cole a URL da imagem..." value={formData.coverImage} onChange={(e) => setFormData({...formData, coverImage: e.target.value})} className="h-8 text-xs mt-2" />
               </div>

               {/* Banner Image */}
               <div className="space-y-2">
                 <Label>Banner (Paisagem)</Label>
                 <div className="border-2 border-dashed border-slate-200 rounded-lg p-2 flex flex-col items-center justify-center relative bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer group h-48 overflow-hidden" onClick={() => document.getElementById('banner-upload')?.click()}>
                    {formData.bannerImage ? (
                       <>
                         <img src={formData.bannerImage} alt="Banner" className="w-full h-full object-cover rounded-md opacity-80 group-hover:opacity-40 transition-opacity" />
                         <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Button type="button" variant="secondary" size="sm">Trocar Banner</Button></div>
                       </>
                    ) : (
                       <div className="text-center p-4">
                          <ImageIcon className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                          <p className="text-xs text-slate-500">Proporção 16:9 (Opcional)</p>
                       </div>
                    )}
                 </div>
                 <Input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'bannerImage')} className="hidden" id="banner-upload" />
                 <Input placeholder="Ou cole a URL da imagem..." value={formData.bannerImage} onChange={(e) => setFormData({...formData, bannerImage: e.target.value})} className="h-8 text-xs mt-2" />
               </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 mt-2">
              <div className="space-y-0.5">
                <Label>Repositório Ativo</Label>
                <p className="text-xs text-slate-500">Se desmarcado, ficará como rascunho e invisível aos usuários.</p>
              </div>
              <Switch checked={formData.status === 'ACTIVE'} onCheckedChange={(checked) => setFormData({...formData, status: checked ? 'ACTIVE' : 'DRAFT'})} />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">{editingId ? 'Salvar Alterações' : 'Criar Repositório'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle className="text-red-600">Excluir Repositório</DialogTitle></DialogHeader>
          <div className="py-4">
             <p className="text-slate-600 text-sm">Tem certeza que deseja excluir <strong>{repoToDelete?.name}</strong>?</p>
             <p className="text-red-500 text-sm mt-2 font-medium">Os conteúdos dentro dele também ficarão inacessíveis (ou excluídos).</p>
          </div>
          <div className="flex justify-end gap-3">
             <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancelar</Button>
             <Button variant="destructive" onClick={handleDeleteRepo}>Sim, excluir</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};