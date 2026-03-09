import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Content } from '../../types';
import { ArrowLeft, Plus, Image as ImageIcon, Edit2, Trash2, Play, FileText, Link as LinkIcon, File, CheckCircle2, XCircle } from 'lucide-react';

export const AdminRepositoryContents = () => {
  const { linkName, repoId } = useParams();
  const { companies, repositories, contents, addContent, updateContent, deleteContent } = useAppStore();

  const company = companies.find(c => c.linkName === linkName);
  const repo = repositories.find(r => r.id === repoId && r.companyId === company?.id);
  
  // Filtra conteúdos apenas deste repositório
  const repoContents = contents.filter(c => c.repositoryId === repoId)
                               .sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    thumbnailUrl: '',
    type: 'VIDEO' as Content['type'],
    url: '',
    embedUrl: '',
    featured: false,
    recent: true,
    status: 'ACTIVE' as 'ACTIVE' | 'DRAFT'
  });

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [contentToDelete, setContentToDelete] = useState<{id: string, title: string} | null>(null);

  if (!company || !repo) return <div className="p-8 text-center text-slate-500">Repositório não encontrado.</div>;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) return toast.error('A imagem deve ter no máximo 2MB.');
      const reader = new FileReader();
      reader.onloadend = () => setFormData({ ...formData, thumbnailUrl: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setFormData({ title: '', description: '', thumbnailUrl: '', type: 'VIDEO', url: '', embedUrl: '', featured: false, recent: true, status: 'ACTIVE' });
    setIsFormOpen(true);
  };

  const openEdit = (content: Content) => {
    setEditingId(content.id);
    setFormData({ 
      title: content.title, 
      description: content.description, 
      thumbnailUrl: content.thumbnailUrl, 
      type: content.type, 
      url: content.url, 
      embedUrl: content.embedUrl || '', 
      featured: content.featured, 
      recent: content.recent,
      status: content.status || 'ACTIVE'
    });
    setIsFormOpen(true);
  };

  const handleSaveContent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.url || !formData.thumbnailUrl) {
      return toast.error('Título, Imagem (Thumbnail) e URL são obrigatórios.');
    }

    if (editingId) {
      updateContent(editingId, formData);
      toast.success('Conteúdo atualizado!');
    } else {
      addContent({
        companyId: company.id,
        repositoryId: repo.id,
        ...formData
      });
      toast.success('Conteúdo adicionado com sucesso!');
    }
    setIsFormOpen(false);
  };

  const handleDeleteContent = () => {
    if (contentToDelete) {
      deleteContent(contentToDelete.id);
      toast.success('Conteúdo excluído.');
      setIsDeleteOpen(false);
    }
  };

  const toggleStatus = (content: Content) => {
    updateContent(content.id, { status: content.status === 'ACTIVE' ? 'DRAFT' : 'ACTIVE' });
    toast.success(`Conteúdo alterado para ${content.status === 'ACTIVE' ? 'Rascunho' : 'Ativo'}.`);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'VIDEO': return <Play size={16} className="text-rose-500" />;
      case 'PDF': return <FileText size={16} className="text-blue-500" />;
      case 'LINK': return <LinkIcon size={16} className="text-emerald-500" />;
      default: return <File size={16} className="text-slate-500" />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <Link to={`/admin/${linkName}/repos`} className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium mb-6">
         <ArrowLeft size={16} /> Voltar para Repositórios
      </Link>

      {/* Hero do Repositório */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-8 relative">
         <div className="h-40 w-full bg-slate-100 relative">
            {(repo.bannerImage || repo.coverImage) && (
              <img src={repo.bannerImage || repo.coverImage} alt={repo.name} className="w-full h-full object-cover" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
         </div>
         <div className="p-6 relative -mt-12 flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
            <div className="flex gap-4 items-end">
               <img src={repo.coverImage} alt="Capa" className="w-24 h-32 rounded-lg object-cover shadow-lg border-2 border-white bg-slate-200" />
               <div className="mb-2">
                  <h1 className="text-2xl font-bold text-white drop-shadow-sm">{repo.name}</h1>
                  <p className="text-sm text-slate-100 mt-1 max-w-xl line-clamp-2">{repo.description || 'Sem descrição'}</p>
               </div>
            </div>
            <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm flex flex-col items-center">
               <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total de Conteúdos</span>
               <span className="text-2xl font-bold text-indigo-600">{repoContents.length}</span>
            </div>
         </div>
      </div>

      {/* Lista de Conteúdos */}
      <div className="flex justify-between items-center mb-6">
         <h2 className="text-xl font-bold text-slate-900">Conteúdos</h2>
         <Button onClick={openCreate} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus size={16} className="mr-2" /> Novo Conteúdo
         </Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
             <thead className="bg-slate-50 border-b border-slate-200 text-slate-900 font-semibold">
                <tr>
                   <th className="p-4 w-16 text-center">Status</th>
                   <th className="p-4">Conteúdo</th>
                   <th className="p-4 w-32">Tipo</th>
                   <th className="p-4 text-center">Destaque</th>
                   <th className="p-4 text-right">Ações</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
                {repoContents.map(content => (
                   <tr key={content.id} className={`hover:bg-slate-50 transition-colors ${content.status === 'DRAFT' ? 'opacity-70 bg-slate-50/50' : ''}`}>
                      <td className="p-4 text-center">
                         <div className="flex justify-center">
                            {content.status === 'ACTIVE' ? <CheckCircle2 className="text-emerald-500" size={20} title="Ativo" /> : <XCircle className="text-slate-400" size={20} title="Rascunho" />}
                         </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-4">
                          <img src={content.thumbnailUrl} alt={content.title} className="w-24 h-14 rounded object-cover shadow-sm bg-slate-100 border border-slate-200 shrink-0" />
                          <div>
                            <p className="font-semibold text-slate-900 text-base mb-0.5">{content.title}</p>
                            <p className="text-xs text-slate-500 line-clamp-1 max-w-md">{content.description || 'Sem descrição'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                         <div className="flex items-center gap-2 font-medium bg-slate-100 w-fit px-2.5 py-1 rounded-md text-xs">
                            {getTypeIcon(content.type)} {content.type}
                         </div>
                      </td>
                      <td className="p-4 text-center">
                         {content.featured ? (
                            <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider">Sim</span>
                         ) : (
                            <span className="text-slate-300">-</span>
                         )}
                      </td>
                      <td className="p-4 text-right">
                         <div className="flex items-center justify-end gap-1">
                           <Switch checked={content.status === 'ACTIVE'} onCheckedChange={() => toggleStatus(content)} title="Ativar/Inativar" />
                           <div className="h-6 w-px bg-slate-200 mx-1"></div>
                           <Button variant="ghost" size="icon" onClick={() => openEdit(content)} className="text-slate-400 hover:text-blue-600"><Edit2 size={16} /></Button>
                           <Button variant="ghost" size="icon" onClick={() => {setContentToDelete({id: content.id, title: content.title}); setIsDeleteOpen(true);}} className="text-slate-400 hover:text-red-600"><Trash2 size={16} /></Button>
                         </div>
                      </td>
                   </tr>
                ))}
                {repoContents.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-12 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <Play size={48} className="text-slate-300 mb-4" />
                        <p className="text-lg font-medium text-slate-900">Nenhum conteúdo adicionado</p>
                        <p className="text-sm mt-1">Clique em "Novo Conteúdo" para começar a preencher este repositório.</p>
                      </div>
                    </td>
                  </tr>
                )}
             </tbody>
          </table>
        </div>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? 'Editar Conteúdo' : 'Novo Conteúdo'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveContent} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Título do Conteúdo *</Label>
              <Input placeholder="Ex: Aula 01 - Introdução" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} autoFocus />
            </div>
            
            <div className="space-y-2">
              <Label>Descrição</Label>
              <textarea 
                className="flex w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 min-h-[80px] resize-y"
                placeholder="Uma breve descrição sobre este conteúdo..."
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label>Tipo de Conteúdo *</Label>
                 <select 
                   value={formData.type} 
                   onChange={(e) => setFormData({...formData, type: e.target.value as Content['type']})}
                   className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
                 >
                    <option value="VIDEO">Vídeo (YouTube/Vimeo)</option>
                    <option value="PDF">Arquivo PDF</option>
                    <option value="DOCUMENT">Documento (Docs, Slides)</option>
                    <option value="LINK">Link Externo</option>
                 </select>
               </div>
               
               <div className="space-y-2">
                 <Label>Imagem de Thumbnail (Capa) *</Label>
                 <div className="flex items-center gap-2">
                    <div className="w-16 h-10 rounded border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                       {formData.thumbnailUrl ? <img src={formData.thumbnailUrl} alt="Thumb" className="w-full h-full object-cover" /> : <ImageIcon size={16} className="text-slate-400" />}
                    </div>
                    <div className="flex-1">
                       <Input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="thumb-upload" />
                       <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('thumb-upload')?.click()} className="w-full text-xs h-10">Upload Imagem</Button>
                    </div>
                 </div>
                 <Input placeholder="Ou cole URL da imagem..." value={formData.thumbnailUrl} onChange={(e) => setFormData({...formData, thumbnailUrl: e.target.value})} className="h-8 text-xs" />
               </div>
            </div>

            <div className="space-y-2">
              <Label>URL Principal do Conteúdo *</Label>
              <Input placeholder="https://..." value={formData.url} onChange={(e) => setFormData({...formData, url: e.target.value})} />
              <p className="text-[10px] text-slate-500">O link de destino quando o usuário clicar.</p>
            </div>

            {formData.type === 'VIDEO' && (
              <div className="space-y-2">
                <Label>URL de Incorporação (Embed - Opcional)</Label>
                <Input placeholder="https://www.youtube.com/embed/..." value={formData.embedUrl} onChange={(e) => setFormData({...formData, embedUrl: e.target.value})} />
                <p className="text-[10px] text-slate-500">Usado para tocar o vídeo direto na plataforma. (ex: YouTube Embed)</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
               <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 mt-2">
                 <div className="space-y-0.5">
                   <Label>Destacar Conteúdo</Label>
                   <p className="text-[10px] text-slate-500">Aparece em evidência.</p>
                 </div>
                 <Switch checked={formData.featured} onCheckedChange={(checked) => setFormData({...formData, featured: checked})} />
               </div>

               <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 mt-2">
                 <div className="space-y-0.5">
                   <Label>Status</Label>
                   <p className="text-[10px] text-slate-500">{formData.status === 'ACTIVE' ? 'Conteúdo Ativo e visível' : 'Oculto (Rascunho)'}</p>
                 </div>
                 <Switch checked={formData.status === 'ACTIVE'} onCheckedChange={(checked) => setFormData({...formData, status: checked ? 'ACTIVE' : 'DRAFT'})} />
               </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">{editingId ? 'Salvar Alterações' : 'Adicionar Conteúdo'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle className="text-red-600">Excluir Conteúdo</DialogTitle></DialogHeader>
          <div className="py-4">
             <p className="text-slate-600 text-sm">Tem certeza que deseja excluir <strong>{contentToDelete?.title}</strong>?</p>
             <p className="text-red-500 text-sm mt-2 font-medium">Esta ação não pode ser desfeita.</p>
          </div>
          <div className="flex justify-end gap-3">
             <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancelar</Button>
             <Button variant="destructive" onClick={handleDeleteContent}>Sim, excluir</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};