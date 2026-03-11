import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Content, SimpleLink } from '../../types';
import { ArrowLeft, Plus, Image as ImageIcon, Edit2, Trash2, Play, FileText, Link as LinkIcon, File, CheckCircle2, XCircle, List, ExternalLink, Calendar, Search, ArrowDownUp } from 'lucide-react';

export const AdminRepositoryContents = () => {
  const { linkName, repoId } = useParams();
  const { companies, repositories, contents, simpleLinks, addContent, updateContent, deleteContent, addSimpleLink, updateSimpleLink, deleteSimpleLink } = useAppStore();

  const company = companies.find(c => c.linkName === linkName);
  const repo = repositories.find(r => r.id === repoId && r.companyId === company?.id);
  
  // Estado UI Geral
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{id: string, title: string} | null>(null);

  // Estados de Filtro (Repositório Simples)
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterDate, setFilterDate] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Formulário Conteúdo Completo
  const [formData, setFormData] = useState({
    title: '', description: '', thumbnailUrl: '', type: 'VIDEO' as Content['type'], url: '', embedUrl: '', featured: false, recent: true, status: 'ACTIVE' as 'ACTIVE' | 'DRAFT'
  });

  // Formulário Link Simples (Cadastro em Lote)
  const [batchLinks, setBatchLinks] = useState<{id: string, name: string, url: string, type: string}[]>([]);

  // Tipos pré-definidos para Links Simples
  const PREDEFINED_TYPES = ['Link', 'Vídeo', 'PDF', 'Planilha', 'Documento', 'Imagem', 'Apresentação', 'Drive/Pasta'];

  if (!company || !repo) return <div className="p-8 text-center text-slate-500">Repositório não encontrado.</div>;

  const isSimple = repo.type === 'SIMPLE';

  const repoContents = contents.filter(c => c.repositoryId === repoId).sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
  
  // --- Filtros e Ordenação de Links Simples ---
  const availableTypes = useMemo(() => {
    const types = new Set(simpleLinks.filter(l => l.repositoryId === repoId).map(l => l.type).filter(Boolean));
    return Array.from(types).sort();
  }, [simpleLinks, repoId]);

  const filteredLinks = useMemo(() => {
    let result = simpleLinks.filter(l => l.repositoryId === repoId);
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(l => l.name.toLowerCase().includes(q) || l.url.toLowerCase().includes(q));
    }
    if (filterType !== 'ALL') {
      result = result.filter(l => l.type === filterType);
    }
    if (filterDate) {
      result = result.filter(l => l.date === filterDate);
    }
    
    result.sort((a, b) => {
      const timeA = new Date(a.date).getTime();
      const timeB = new Date(b.date).getTime();
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });

    return result;
  }, [simpleLinks, repoId, searchQuery, filterType, filterDate, sortOrder]);

  // --- Handlers COMPLETO ---
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) return toast.error('A imagem deve ter no máximo 2MB.');
      const reader = new FileReader();
      reader.onloadend = () => setFormData({ ...formData, thumbnailUrl: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  const openCreateFull = () => {
    setEditingId(null);
    setFormData({ title: '', description: '', thumbnailUrl: '', type: 'VIDEO', url: '', embedUrl: '', featured: false, recent: true, status: 'ACTIVE' });
    setIsFormOpen(true);
  };

  const openEditFull = (content: Content) => {
    setEditingId(content.id);
    setFormData({ title: content.title, description: content.description, thumbnailUrl: content.thumbnailUrl, type: content.type, url: content.url, embedUrl: content.embedUrl || '', featured: content.featured, recent: content.recent, status: content.status || 'ACTIVE' });
    setIsFormOpen(true);
  };

  const handleSaveFull = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.url) return toast.error('Os campos Título e URL são obrigatórios.');
    if (editingId) {
      updateContent(editingId, formData);
      toast.success('Conteúdo atualizado com sucesso!');
    } else {
      addContent({ companyId: company.id, repositoryId: repo.id, ...formData });
      toast.success('Conteúdo adicionado com sucesso!');
    }
    setIsFormOpen(false);
  };

  // --- Handlers SIMPLES (EM LOTE) ---
  const openCreateSimple = () => {
    setEditingId(null);
    // Inicia com 3 linhas vazias para facilitar a digitação rápida
    setBatchLinks([
      { id: crypto.randomUUID(), name: '', url: '', type: 'Link' },
      { id: crypto.randomUUID(), name: '', url: '', type: 'Link' },
      { id: crypto.randomUUID(), name: '', url: '', type: 'Link' }
    ]);
    setIsFormOpen(true);
  };

  const openEditSimple = (link: SimpleLink) => {
    setEditingId(link.id);
    setBatchLinks([{ id: link.id, name: link.name, url: link.url, type: link.type }]);
    setIsFormOpen(true);
  };

  const updateBatch = (index: number, field: string, value: string) => {
    const newBatch = [...batchLinks];
    newBatch[index] = { ...newBatch[index], [field]: value };
    setBatchLinks(newBatch);
  };

  const addBatchRow = () => {
    setBatchLinks([...batchLinks, { id: crypto.randomUUID(), name: '', url: '', type: 'Link' }]);
  };

  const removeBatch = (index: number) => {
    setBatchLinks(batchLinks.filter((_, i) => i !== index));
  };

  const handlePaste = (e: React.ClipboardEvent, index: number) => {
    const paste = e.clipboardData.getData('text');
    if (paste.includes('\n')) {
      e.preventDefault(); // Previne colar tudo num único campo
      
      const lines = paste.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      const newLinks = [...batchLinks];
      
      lines.forEach((line, i) => {
        // Tenta separar por Tabulação (caso venha do Excel: Nome \t URL \t Tipo)
        const parts = line.split('\t');
        let name = '', url = '', type = newLinks[index].type || 'Link';
        
        if (parts.length >= 2) {
           name = parts[0].trim();
           url = parts[1].trim();
           // Se a pessoa colou um tipo, valida se existe ou deixa como o que ela escreveu mesmo
           if (parts[2]) type = parts[2].trim();
        } else {
           // Fallback inteligente: procura por um link HTTP na linha colada
           const urlMatch = line.match(/(https?:\/\/[^\s]+)/);
           url = urlMatch ? urlMatch[0] : '';
           name = line.replace(url, '').trim() || `Link Importado ${i+1}`;
        }

        if (i === 0) {
          // Substitui a linha atual onde o paste ocorreu
          newLinks[index] = { ...newLinks[index], name: name || newLinks[index].name, url: url || newLinks[index].url, type };
        } else {
          // Insere novas linhas logo abaixo
          newLinks.splice(index + i, 0, { id: crypto.randomUUID(), name, url, type });
        }
      });
      
      // Adiciona uma linha vazia no final por conveniência
      if (newLinks[newLinks.length - 1].name || newLinks[newLinks.length - 1].url) {
         newLinks.push({ id: crypto.randomUUID(), name: '', url: '', type: 'Link' });
      }
      
      setBatchLinks(newLinks);
      toast.success(`${lines.length} links processados com sucesso!`);
    }
  };

  const handleSaveSimple = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Filtra apenas as linhas que foram preenchidas (ignora linhas vazias)
    const validLinks = batchLinks.filter(l => l.name.trim() || l.url.trim());
    
    if (validLinks.length === 0) return toast.error('Nenhum link preenchido para salvar.');

    // Validação de segurança
    const invalid = validLinks.find(l => !l.name.trim() || !l.url.trim());
    if (invalid) return toast.error('Por favor, preencha o Nome e a URL em todas as linhas utilizadas.');

    if (editingId) {
      // Edição de link único
      const link = validLinks[0];
      updateSimpleLink(editingId, { name: link.name, url: link.url, type: link.type || 'Link' });
      toast.success('Link atualizado!');
    } else {
      // Criação em lote
      validLinks.forEach(link => {
        addSimpleLink({
          companyId: company.id,
          repositoryId: repo.id,
          name: link.name,
          url: link.url,
          type: link.type || 'Link',
          date: new Date().toISOString().split('T')[0],
          status: 'ACTIVE'
        });
      });
      toast.success(`${validLinks.length} link(s) adicionado(s)!`);
    }
    setIsFormOpen(false);
  };

  // --- DELETE & STATUS ---
  const confirmDelete = (id: string, title: string) => {
    setItemToDelete({ id, title });
    setIsDeleteOpen(true);
  };

  const handleDelete = () => {
    if (itemToDelete) {
      if (isSimple) deleteSimpleLink(itemToDelete.id);
      else deleteContent(itemToDelete.id);
      toast.success('Item excluído permanentemente.');
      setIsDeleteOpen(false);
    }
  };

  const toggleStatusFull = (content: Content) => {
    updateContent(content.id, { status: content.status === 'ACTIVE' ? 'DRAFT' : 'ACTIVE' });
  };

  const toggleStatusSimple = (link: SimpleLink) => {
    updateSimpleLink(link.id, { status: link.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' });
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
         <div className="h-40 w-full bg-slate-100 relative overflow-hidden">
            {repo.bannerImage || repo.coverImage ? (
              <img src={repo.bannerImage || repo.coverImage} alt={repo.name} className="w-full h-full object-cover opacity-60 mix-blend-multiply" />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-slate-200 to-slate-100"></div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
         </div>
         <div className="p-6 relative -mt-16 flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
            <div className="flex gap-4 items-end">
               <div className="w-24 h-24 md:h-32 rounded-lg shadow-lg border-4 border-white bg-white flex items-center justify-center shrink-0 overflow-hidden">
                 {repo.coverImage ? (
                   <img src={repo.coverImage} alt="Capa" className="w-full h-full object-cover" />
                 ) : (
                   isSimple ? <List size={40} className="text-slate-300" /> : <ImageIcon size={40} className="text-slate-300" />
                 )}
               </div>
               <div className="mb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/20 text-white backdrop-blur-sm border border-white/30">
                      {isSimple ? 'Repositório Simples' : 'Repositório Completo'}
                    </span>
                  </div>
                  <h1 className="text-2xl font-bold text-white drop-shadow-sm leading-tight">{repo.name}</h1>
                  <p className="text-sm text-slate-200 mt-1 max-w-xl line-clamp-2">{repo.description || 'Sem descrição'}</p>
               </div>
            </div>
            <div className="bg-white px-5 py-3 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center">
               <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isSimple ? 'Total de Links' : 'Total de Conteúdos'}</span>
               <span className="text-3xl font-black text-indigo-600 leading-none mt-1">{isSimple ? simpleLinks.filter(l => l.repositoryId === repoId).length : repoContents.length}</span>
            </div>
         </div>
      </div>

      {/* Cabeçalho da Lista */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
         <h2 className="text-xl font-bold text-slate-900">{isSimple ? 'Lista de Links' : 'Conteúdos do Repositório'}</h2>
         <Button onClick={isSimple ? openCreateSimple : openCreateFull} className="bg-indigo-600 hover:bg-indigo-700 shadow-md">
            <Plus size={16} className="mr-2" /> {isSimple ? 'Adicionar Links' : 'Novo Conteúdo'}
         </Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        
        {isSimple && (
          /* BARRA DE FILTROS - APENAS REPOSITÓRIO SIMPLES (COMPACTA) */
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col gap-2.5 shadow-sm">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <Input 
                placeholder="Buscar por nome ou URL..." 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                className="pl-9 bg-white" 
              />
            </div>
            <div className="grid grid-cols-2 md:flex md:flex-row gap-2 w-full">
               <select 
                 value={filterType} 
                 onChange={(e) => setFilterType(e.target.value)} 
                 className="col-span-1 w-full md:w-48 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
               >
                 <option value="ALL">Tipos (Todos)</option>
                 {availableTypes.map(t => <option key={t} value={t}>{t}</option>)}
               </select>
               <Input 
                 type="date" 
                 value={filterDate} 
                 onChange={(e) => setFilterDate(e.target.value)} 
                 className="col-span-1 w-full md:w-auto bg-white text-slate-600" 
               />
               <Button 
                 variant="outline" 
                 onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')} 
                 className="col-span-2 md:col-span-1 bg-white min-w-[150px] flex items-center gap-2 h-9"
               >
                 <ArrowDownUp size={14} className="text-slate-500" />
                 {sortOrder === 'desc' ? 'Recentes' : 'Antigos'}
               </Button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          {isSimple ? (
            /* TABELA SIMPLES MELHORADA */
            <table className="w-full text-left text-sm text-slate-600">
               <thead className="bg-slate-50 border-b border-slate-200 text-slate-900 font-semibold">
                  <tr>
                     <th className="p-4 w-16 text-center">Status</th>
                     <th className="p-4">Nome do Link</th>
                     <th className="p-4">Tipo / Categoria</th>
                     <th className="p-4">Data</th>
                     <th className="p-4 text-right">Ações</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {filteredLinks.map(link => (
                     <tr key={link.id} className={`hover:bg-slate-50 transition-colors ${link.status === 'INACTIVE' ? 'opacity-60 bg-slate-50/50' : ''}`}>
                        <td className="p-4 text-center">
                           <div className="flex justify-center">
                              {link.status === 'ACTIVE' ? <CheckCircle2 className="text-emerald-500" size={20} title="Ativo" /> : <XCircle className="text-slate-400" size={20} title="Inativo" />}
                           </div>
                        </td>
                        <td className="p-4">
                           <p className="font-semibold text-slate-900 text-base mb-0.5">{link.name}</p>
                           <p className="text-xs text-slate-500 line-clamp-1 max-w-sm">{link.url}</p>
                        </td>
                        <td className="p-4">
                           <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-xs font-medium border border-slate-200">
                              {link.type}
                           </span>
                        </td>
                        <td className="p-4 font-medium text-slate-600">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={14} className="text-slate-400" />
                            {new Date(link.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                          </div>
                        </td>
                        <td className="p-4 text-right">
                           <div className="flex items-center justify-end gap-1">
                             <Button asChild variant="outline" size="sm" className="hidden sm:flex items-center gap-1.5 h-8 mr-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50">
                                <a href={link.url} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Abrir</a>
                             </Button>
                             <Switch checked={link.status === 'ACTIVE'} onCheckedChange={() => toggleStatusSimple(link)} title="Ativar/Inativar" />
                             <div className="h-6 w-px bg-slate-200 mx-1"></div>
                             <Button variant="ghost" size="icon" onClick={() => openEditSimple(link)} className="text-slate-400 hover:text-blue-600"><Edit2 size={16} /></Button>
                             <Button variant="ghost" size="icon" onClick={() => confirmDelete(link.id, link.name)} className="text-slate-400 hover:text-red-600"><Trash2 size={16} /></Button>
                           </div>
                        </td>
                     </tr>
                  ))}
                  {filteredLinks.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-slate-500">
                        <LinkIcon size={48} className="text-slate-300 mx-auto mb-4" />
                        <p className="text-lg font-medium text-slate-900">Nenhum link encontrado</p>
                        <p className="text-sm mt-1">Verifique os filtros ou crie um novo link.</p>
                      </td>
                    </tr>
                  )}
               </tbody>
            </table>
          ) : (
            /* TABELA COMPLETA */
            <table className="w-full text-left text-sm text-slate-600">
               <thead className="bg-slate-50 border-b border-slate-200 text-slate-900 font-semibold">
                  <tr>
                     <th className="p-4 w-16 text-center">Status</th>
                     <th className="p-4">Conteúdo</th>
                     <th className="p-4 w-32">Tipo</th>
                     <th className="p-4 text-right">Ações</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {repoContents.map(content => (
                     <tr key={content.id} className={`hover:bg-slate-50 transition-colors ${content.status === 'DRAFT' ? 'opacity-70 bg-slate-50/50' : ''}`}>
                        <td className="p-4 text-center">
                           <div className="flex justify-center">
                              {content.status === 'ACTIVE' ? <CheckCircle2 className="text-emerald-500" size={20} title="Ativo" /> : <XCircle className="text-slate-400" size={20} title="Inativo" />}
                           </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-4">
                            <div className="w-24 h-14 rounded overflow-hidden shadow-sm bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center">
                              {content.thumbnailUrl ? <img src={content.thumbnailUrl} alt={content.title} className="w-full h-full object-cover" /> : <ImageIcon size={20} className="text-slate-400" />}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 text-base mb-0.5">{content.title}</p>
                              <p className="text-xs text-slate-500 line-clamp-1 max-w-md">{content.description || 'Sem descrição'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                           <div className="flex items-center gap-2 font-medium bg-slate-100 w-fit px-2.5 py-1 rounded-md text-xs border border-slate-200">
                              {getTypeIcon(content.type)} {content.type}
                           </div>
                        </td>
                        <td className="p-4 text-right">
                           <div className="flex items-center justify-end gap-1">
                             <Switch checked={content.status === 'ACTIVE'} onCheckedChange={() => toggleStatusFull(content)} title="Ativar/Inativar" />
                             <div className="h-6 w-px bg-slate-200 mx-1"></div>
                             <Button variant="ghost" size="icon" onClick={() => openEditFull(content)} className="text-slate-400 hover:text-blue-600"><Edit2 size={16} /></Button>
                             <Button variant="ghost" size="icon" onClick={() => confirmDelete(content.id, content.title)} className="text-slate-400 hover:text-red-600"><Trash2 size={16} /></Button>
                           </div>
                        </td>
                     </tr>
                  ))}
                  {repoContents.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-12 text-center text-slate-500">
                        <Play size={48} className="text-slate-300 mx-auto mb-4" />
                        <p className="text-lg font-medium text-slate-900">Nenhum conteúdo adicionado</p>
                        <p className="text-sm mt-1">Clique em "Novo Conteúdo" para adicionar.</p>
                      </td>
                    </tr>
                  )}
               </tbody>
            </table>
          )}
        </div>
      </div>

      {/* MODAL COMPLETO */}
      {!isSimple && (
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingId ? 'Editar Conteúdo' : 'Novo Conteúdo'}</DialogTitle></DialogHeader>
            <form onSubmit={handleSaveFull} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Título do Conteúdo *</Label>
                <Input placeholder="Ex: Planilha de Metas 2024" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} autoFocus />
              </div>
              <div className="space-y-2">
                <Label>Descrição (Opcional)</Label>
                <textarea className="flex w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-slate-500 min-h-[80px] resize-y" placeholder="Uma breve descrição..." value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <Label>Tipo de Conteúdo *</Label>
                   <select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value as Content['type']})} className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
                      <option value="VIDEO">Vídeo</option><option value="PDF">Arquivo PDF</option><option value="DOCUMENT">Documento</option><option value="LINK">Link Externo</option>
                   </select>
                 </div>
                 <div className="space-y-2">
                   <Label>Imagem de Capa (Opcional)</Label>
                   <div className="flex items-center gap-2">
                      <div className="w-16 h-10 rounded border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                         {formData.thumbnailUrl ? <img src={formData.thumbnailUrl} alt="Thumb" className="w-full h-full object-cover" /> : <ImageIcon size={16} className="text-slate-400" />}
                      </div>
                      <div className="flex-1">
                         <Input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="thumb-upload" />
                         <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('thumb-upload')?.click()} className="w-full text-xs h-10">Upload Imagem</Button>
                      </div>
                   </div>
                   <Input placeholder="Ou cole URL..." value={formData.thumbnailUrl} onChange={(e) => setFormData({...formData, thumbnailUrl: e.target.value})} className="h-8 text-xs" />
                 </div>
              </div>
              <div className="space-y-2">
                <Label>URL Principal *</Label>
                <Input placeholder="https://..." value={formData.url} onChange={(e) => setFormData({...formData, url: e.target.value})} />
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 mt-2">
                <div className="space-y-0.5"><Label>Conteúdo Ativo</Label><p className="text-[10px] text-slate-500">{formData.status === 'ACTIVE' ? 'Conteúdo visível' : 'Rascunho'}</p></div>
                <Switch checked={formData.status === 'ACTIVE'} onCheckedChange={(checked) => setFormData({...formData, status: checked ? 'ACTIVE' : 'DRAFT'})} />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">{editingId ? 'Salvar Alterações' : 'Adicionar Conteúdo'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* MODAL SIMPLES (CADASTRO EM LOTE) */}
      {isSimple && (
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col">
            <DialogHeader className="shrink-0">
              <DialogTitle>{editingId ? 'Editar Link' : 'Cadastro Rápido de Links'}</DialogTitle>
              {!editingId && (
                 <p className="text-xs text-slate-500 mt-1">
                   Digite os links ou cole diretamente uma tabela do Excel (colunas: Nome, URL, Tipo).
                 </p>
              )}
            </DialogHeader>
            
            <form onSubmit={handleSaveSimple} className="flex flex-col flex-1 overflow-hidden mt-4">
               {/* Cabeçalho da Tabela do Form */}
               <div className="grid grid-cols-[2fr_3fr_1.5fr_auto] gap-3 px-1 mb-2 text-xs font-semibold text-slate-500">
                 <div>NOME DO LINK</div>
                 <div>URL DE DESTINO</div>
                 <div>TIPO / CATEGORIA</div>
                 <div className="w-8"></div>
               </div>
               
               {/* Linhas Editáveis */}
               <div className="overflow-y-auto flex-1 space-y-2 px-1 pb-2 min-h-[250px]">
                  {batchLinks.map((link, index) => (
                     <div key={link.id} className="grid grid-cols-[2fr_3fr_1.5fr_auto] gap-3 items-center group">
                        <Input 
                          placeholder="Ex: Planilha XPTO" 
                          value={link.name} 
                          onChange={e => updateBatch(index, 'name', e.target.value)} 
                          className="h-9 text-sm focus-visible:ring-indigo-500"
                        />
                        <Input 
                          placeholder="https://..." 
                          value={link.url} 
                          onChange={e => updateBatch(index, 'url', e.target.value)} 
                          onPaste={e => handlePaste(e, index)}
                          className="h-9 text-sm font-mono focus-visible:ring-indigo-500"
                        />
                        <select
                          value={link.type}
                          onChange={e => updateBatch(index, 'type', e.target.value)}
                          className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          {PREDEFINED_TYPES.map(type => (
                             <option key={type} value={type}>{type}</option>
                          ))}
                          {/* Garante que tipos não listados inseridos via colar (paste) não quebrem e apareçam */}
                          {!PREDEFINED_TYPES.includes(link.type) && (
                             <option value={link.type}>{link.type}</option>
                          )}
                        </select>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => removeBatch(index)}
                          disabled={batchLinks.length === 1 && !editingId} // Não deixa excluir se for o único, exceto edição
                          className="h-9 w-9 text-slate-400 hover:text-red-500 hover:bg-red-50 opacity-50 group-hover:opacity-100 transition-all"
                        >
                           <Trash2 size={16} />
                        </Button>
                     </div>
                  ))}
               </div>

               {/* Botão de Adicionar Nova Linha */}
               {!editingId && (
                  <div className="shrink-0 mt-2 px-1">
                    <Button type="button" variant="outline" onClick={addBatchRow} className="w-full border-dashed border-slate-300 text-slate-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 h-9">
                       <Plus size={16} className="mr-2" /> Adicionar linha vazia
                    </Button>
                  </div>
               )}

               {/* Rodapé e Salvar */}
               <div className="shrink-0 flex justify-end gap-3 pt-4 mt-4 border-t border-slate-100">
                 <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancelar</Button>
                 <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                   {editingId ? 'Salvar Alteração' : 'Salvar Links'}
                 </Button>
               </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* DELETE MODAL (AMBOS) */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle className="text-red-600">Excluir Item</DialogTitle></DialogHeader>
          <div className="py-4">
             <p className="text-slate-600 text-sm">Tem certeza que deseja excluir <strong>{itemToDelete?.title}</strong>?</p>
             <p className="text-red-500 text-sm mt-2 font-medium">Esta ação não pode ser desfeita.</p>
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