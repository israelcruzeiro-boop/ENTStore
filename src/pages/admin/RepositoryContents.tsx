import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabaseClient';
import { useCompanies, useRepositories, useContents, useSimpleLinks, useCategories, useRepositoryMetrics } from '../../hooks/useSupabaseData';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Content, SimpleLink } from '../../types';
import { repositoryContentSchema, repositoryCategorySchema, simpleLinkSchema } from '../../types/schemas';
import { Logger } from '../../utils/logger';
import {
  ArrowLeft,
  Plus,
  Image as ImageIcon,
  Edit2,
  Trash2,
  Play,
  FileText,
  Link as LinkIcon,
  File,
  CheckCircle2,
  XCircle,
  List,
  ExternalLink,
  Calendar,
  Search,
  ArrowDownUp,
  PlayCircle,
  FileSpreadsheet,
  Presentation,
  Folder,
  Link2,
  Eye,
  Users,
  Star,
  Layers,
  ArrowUp,
  ArrowDown,
  Loader2,
  Music
} from 'lucide-react';
import { uploadToSupabase } from '../../lib/storage';

const getPremiumAdminConfig = (type: string) => {
  const t = type?.toLowerCase();
  if (t === 'vídeo' || t === 'video') {
    return { icon: PlayCircle, gradient: 'from-rose-500 to-orange-500', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' };
  } else if (t === 'pdf') {
    return { icon: FileText, gradient: 'from-red-500 to-rose-600', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' };
  } else if (t === 'planilha') {
    return { icon: FileSpreadsheet, gradient: 'from-emerald-400 to-emerald-600', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' };
  } else if (t === 'documento') {
    return { icon: FileText, gradient: 'from-blue-500 to-cyan-500', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' };
  } else if (t === 'imagem') {
    return { icon: ImageIcon, gradient: 'from-indigo-500 to-blue-600', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' };
  } else if (t === 'apresentação' || t === 'apresentacao') {
    return { icon: Presentation, gradient: 'from-amber-400 to-orange-500', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' };
  } else if (t === 'drive/pasta' || t === 'pasta') {
    return { icon: Folder, gradient: 'from-indigo-500 to-violet-500', bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' };
  } else {
    return { icon: Link2, gradient: 'from-slate-400 to-slate-600', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' };
  }
};

export const AdminRepositoryContents = () => {
  const { link_name, repoId } = useParams();

  const { companies } = useCompanies();
  const company = companies.find(c => c.link_name === companySlug || c.slug === companySlug);

  const { repositories } = useRepositories(company?.id);
  const repo = repositories.find(r => r.id === repoId && r.company_id === company?.id);

  const { contents, mutate: mutateContents, isLoading: loadingContents } = useContents({ repositoryId: repoId });
  const { simpleLinks, mutate: mutateLinks, isLoading: loadingLinks } = useSimpleLinks({ repositoryId: repoId });
  const { categories: repoCategories, mutate: mutateCategories } = useCategories(repoId);
  const { contentViews, contentRatings } = useRepositoryMetrics(repoId);

  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; title: string } | null>(null);

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterDate, setFilterDate] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    thumbnail_url: '',
    type: 'VIDEO' as Content['type'],
    url: '',
    embed_url: '',
    featured: false,
    recent: true,
    status: 'ACTIVE' as 'ACTIVE' | 'DRAFT',
    category_id: ''
  });

  const [batchLinks, setBatchLinks] = useState<{ id: string; name: string; url: string; type: string }[]>([]);

  const PREDEFINED_TYPES = ['Link', 'Vídeo', 'Música', 'PDF', 'Planilha', 'Documento', 'Imagem', 'Apresentação', 'Drive/Pasta'];

  const isSimple = repo?.type === 'SIMPLE';
  const isPlaylist = repo?.type === 'PLAYLIST';
  const isVideoPlaylist = repo?.type === 'VIDEO_PLAYLIST';

  const availableTypes = useMemo(() => {
    const types = new Set(simpleLinks.map(l => l.type).filter(Boolean));
    return Array.from(types).sort();
  }, [simpleLinks]);

  const filteredLinks = useMemo(() => {
    let result = [...simpleLinks];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(l => l.name.toLowerCase().includes(q) || l.url.toLowerCase().includes(q));
    }
    if (filterType !== 'ALL') result = result.filter(l => l.type === filterType);
    if (filterDate) result = result.filter(l => l.date === filterDate);

    result.sort((a, b) => {
      const timeA = new Date(a.date).getTime();
      const timeB = new Date(b.date).getTime();
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });

    return result;
  }, [simpleLinks, searchQuery, filterType, filterDate, sortOrder]);

  if (!company || (!repo && !loadingContents && !loadingLinks)) {
    return <div className="p-8 text-center text-slate-500">Repositório não encontrado.</div>;
  }

  const getDisplayThumbnail = (content: Content) => {
    if (content.thumbnail_url) return content.thumbnail_url;
    if (content.type === 'VIDEO' || content.type === 'MUSIC') {
      const url = content.embed_url || content.url;
      const ytMatch = url?.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([^&?]+)/);
      if (ytMatch && ytMatch[1]) return `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`;
    }
    return null;
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setTimeout(() => {
      setEditingId(null);
      setFormData({
        title: '',
        description: '',
        thumbnail_url: '',
        type: 'VIDEO',
        url: '',
        embed_url: '',
        featured: false,
        recent: true,
        status: 'ACTIVE',
        category_id: ''
      });
      setBatchLinks([]);
    }, 300);
  };

  const handleCloseDelete = () => {
    setIsDeleteOpen(false);
    setTimeout(() => setItemToDelete(null), 300);
  };

  const handleCloseCategory = () => {
    setIsCategoryModalOpen(false);
    setTimeout(() => setNewCategoryName(''), 300);
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      setIsSubmitting(true);
      const { error } = await supabase.from('categories').insert({
        repository_id: repo!.id,
        name: newCategoryName.trim(),
        order_index: repoCategories.length
      });
      if (error) throw error;
      toast.success('Fase adicionada!');
      setNewCategoryName('');
      mutateCategories();
    } catch (err) {
      const error = err as Error;
      toast.error(`Erro ao salvar fase: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const moveCategory = async (index: number, direction: number) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= repoCategories.length) return;

    const copy = [...repoCategories];
    const current = copy[index];
    const target = copy[targetIndex];

    const currentOrder = current.order_index ?? index;
    const targetOrder = target.order_index ?? targetIndex;

    try {
      const u1 = supabase.from('categories').update({ order_index: targetOrder }).eq('id', current.id);
      const u2 = supabase.from('categories').update({ order_index: currentOrder }).eq('id', target.id);
      await Promise.all([u1, u2]);
      mutateCategories();
    } catch {
      toast.error('Erro ao reordenar fases.');
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      setIsSubmitting(true);
      // IMPLEMENTAÇÃO DE SOFT DELETE
      const { error } = await supabase
        .from('categories')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
        
      if (error) throw error;
      toast.success('Fase removida da lista (Soft Delete).');
      mutateCategories();
    } catch (error) {
      const err = error as Error;
      Logger.error('Erro ao realizar soft delete de categoria:', err);
      toast.error(`Erro ao remover fase: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) {
        toast.error('A capa fornecida é muito grande (máx: 20MB).');
        return;
      }
      try {
        setIsUploading(true);
        const toastId = toast.loading('Otimizando e enviando capa...');
        const publicUrl = await uploadToSupabase(file, 'assets', `contents/${company!.id}/thumbnail`, 'thumbnail');
        toast.dismiss(toastId);
        if (publicUrl) {
          setFormData(prev => ({ ...prev, thumbnail_url: publicUrl }));
        } else {
          toast.error('Erro no upload para o armazenamento.');
        }
      } catch {
        toast.error('Falha de rede ao enviar a imagem.');
      } finally {
        setIsUploading(false);
        e.target.value = '';
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, rowIndex?: number) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 100 * 1024 * 1024) { // 100MB limit for general files
        toast.error('O arquivo fornecido é muito grande (máx: 100MB).');
        return;
      }
      try {
        setIsUploading(true);
        const toastId = toast.loading(`Enviando ${file.name}...`);
        const publicUrl = await uploadToSupabase(file, 'assets', `contents/${company!.id}/files`, 'generic');
        toast.dismiss(toastId);
        
        if (publicUrl) {
          if (typeof rowIndex === 'number') {
            updateBatch(rowIndex, 'url', publicUrl);
          } else {
            setFormData(prev => ({ ...prev, url: publicUrl }));
          }
          toast.success('Upload concluído!');
        } else {
          toast.error('Erro no upload para o armazenamento.');
        }
      } catch (err) {
        const error = err as Error;
        toast.error(`Falha no upload: ${error.message}`);
      } finally {
        setIsUploading(false);
        e.target.value = '';
      }
    }
  };

  const openCreateFull = () => {
    setEditingId(null);
    setFormData({
      title: '',
      description: '',
      thumbnail_url: '',
      type: isPlaylist ? 'MUSIC' : isVideoPlaylist ? 'VIDEO' : 'VIDEO',
      url: '',
      embed_url: '',
      featured: false,
      recent: true,
      status: 'ACTIVE',
      category_id: ''
    });
    setIsFormOpen(true);
  };

  const openEditFull = (content: Content) => {
    setEditingId(content.id);
    setFormData({
      title: content.title,
      description: content.description,
      thumbnail_url: content.thumbnail_url,
      type: content.type,
      url: content.url,
      embed_url: content.embed_url || '',
      featured: content.featured,
      recent: content.recent,
      status: content.status || 'ACTIVE',
      category_id: content.category_id || ''
    });
    setIsFormOpen(true);
  };

  const handleSaveFull = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);

      const payload = {
        company_id: company.id,
        repository_id: repo!.id,
        category_id: formData.category_id || null,
        title: formData.title,
        description: formData.description,
        thumbnail_url: formData.thumbnail_url,
        type: formData.type,
        url: formData.url,
        featured: formData.featured,
        status: formData.status,
        order_index: contents.length
      };

      const validation = editingId
        ? repositoryContentSchema.partial().safeParse(payload)
        : repositoryContentSchema.safeParse(payload);

      if (!validation.success) {
        return toast.error("Dados do conteúdo inválidos: " + validation.error.format());
      }

      if (editingId) {
        const { error } = await supabase.from('contents').update(validation.data).eq('id', editingId);
        if (error) throw error;
        toast.success('Conteúdo atualizado com sucesso!');
      } else {
        const { error } = await supabase.from('contents').insert(validation.data).select('id');
        if (error) throw error;
        toast.success('Conteúdo adicionado com sucesso!');
      }
      mutateContents();
      handleCloseForm();
    } catch (error) {
      const err = error as Error;
      Logger.error(`Erro ao salvar conteúdo: ${err.message}`);
      toast.error(`Erro ao salvar conteúdo: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCreateSimple = () => {
    setEditingId(null);
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
      e.preventDefault();
      const lines = paste.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      const newLinks = [...batchLinks];

      lines.forEach((line, i) => {
        const parts = line.split('\t');
        let name = '', url = '', type = newLinks[index].type || 'Link';
        if (parts.length >= 2) {
          name = parts[0].trim();
          url = parts[1].trim();
          if (parts[2]) type = parts[2].trim();
        } else {
          const urlMatch = line.match(/(https?:\/\/[^\s]+)/);
          url = urlMatch ? urlMatch[0] : '';
          name = line.replace(url, '').trim() || `Link Importado ${i + 1}`;
        }
        if (i === 0) {
          newLinks[index] = { ...newLinks[index], name: name || newLinks[index].name, url: url || newLinks[index].url, type };
        } else {
          newLinks.splice(index + i, 0, { id: crypto.randomUUID(), name, url, type });
        }
      });

      if (newLinks[newLinks.length - 1].name || newLinks[newLinks.length - 1].url) {
        newLinks.push({ id: crypto.randomUUID(), name: '', url: '', type: 'Link' });
      }

      setBatchLinks(newLinks);
      toast.success(`${lines.length} links colados com sucesso!`);
    }
  };

  const handleSaveSimple = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      
      const validLinks = batchLinks.filter(l => l.name.trim() || l.url.trim());

      if (editingId) {
        const linkToUpdate = validLinks.find(l => l.id === editingId);
        if (linkToUpdate) {
          const payload = {
            company_id: company.id,
            repository_id: repo!.id,
            name: linkToUpdate.name,
            url: linkToUpdate.url,
            type: linkToUpdate.type || 'link',
            status: linkToUpdate.status || 'ACTIVE',
            order_index: simpleLinks.findIndex(l => l.id === editingId) ?? 0
          };

          const validation = simpleLinkSchema.partial().safeParse(payload);
          if (!validation.success) throw new Error("Dados inválidos: " + JSON.stringify(validation.error.format()));

          const { error } = await supabase.from('simple_links').update(validation.data).eq('id', editingId);
          if (error) throw error;
        }

        const newLinksInBatch = validLinks.filter(l => l.id !== editingId);
        if (newLinksInBatch.length > 0) {
          const payloads = newLinksInBatch.map((l, idx) => ({
            company_id: company.id,
            repository_id: repo!.id,
            name: l.name,
            url: l.url,
            type: l.type || 'link',
            status: 'ACTIVE',
            order_index: simpleLinks.length + idx
          }));

          const validation = z.array(simpleLinkSchema).safeParse(payloads);
          if (!validation.success) throw new Error("Dados de novos links inválidos");

          const { error } = await supabase.from('simple_links').insert(validation.data);
          if (error) throw error;
        }
        toast.success('Operação concluída com sucesso!');
      } else {
        const payloads = validLinks.map((l, idx) => ({
          company_id: company.id,
          repository_id: repo!.id,
          name: l.name,
          url: l.url,
          type: l.type || 'link',
          status: 'ACTIVE',
          order_index: simpleLinks.length + idx
        }));

        const validation = z.array(simpleLinkSchema).safeParse(payloads);
        if (!validation.success) {
          return toast.error("Alguns links possuem dados inválidos.");
        }

        const { error } = await supabase.from('simple_links').insert(validation.data);
        if (error) throw error;
        toast.success(`${validLinks.length} link(s) adicionado(s)!`);
      }
      mutateLinks();
      handleCloseForm();
    } catch (err) {
      const error = err as Error;
      Logger.error(`Erro ao salvar links: ${error.message}`);
      toast.error(`Erro ao salvar links: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = (id: string, title: string) => {
    setItemToDelete({ id, title });
    setIsDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (itemToDelete) {
      try {
        setIsSubmitting(true);
        // IMPLEMENTAÇÃO DE SOFT DELETE
        const { error } = await supabase
          .from(isSimple ? 'simple_links' : 'contents')
          .update({ deleted_at: new Date().toISOString() })
          .eq('id', itemToDelete.id);

        if (error) throw error;
        
        if (isSimple) {
          mutateLinks();
        } else {
          mutateContents();
        }
        toast.success('Item removido da lista (Soft Delete).');
      } catch (error) {
        const err = error as Error;
        Logger.error('Erro ao realizar soft delete de conteúdo/link:', err);
        toast.error(`Erro ao excluir: ${err.message}`);
      } finally {
        setIsSubmitting(false);
      }
    }
    handleCloseDelete();
  };

  const toggleStatusFull = async (content: Content) => {
    const newStatus = content.status === 'ACTIVE' ? 'DRAFT' : 'ACTIVE';
    const { error } = await supabase.from('contents').update({ status: newStatus }).eq('id', content.id);
    if (!error) mutateContents();
  };

  const toggleStatusSimple = async (link: SimpleLink) => {
    const newStatus = link.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const { error } = await supabase.from('simple_links').update({ status: newStatus }).eq('id', link.id);
    if (!error) mutateLinks();
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'VIDEO':
        return <Play size={16} className="text-rose-500" />;
      case 'PDF':
        return <FileText size={16} className="text-blue-500" />;
      case 'LINK':
        return <LinkIcon size={16} className="text-emerald-500" />;
      case 'MUSIC':
        return <Music size={16} className="text-purple-500" />;
      case 'IMAGE':
        return <ImageIcon size={16} className="text-indigo-500" />;
      default:
        return <File size={16} className="text-slate-500" />;
    }
  };

  if (!repo) {
    return (
      <div className="flex justify-center items-center h-48 text-slate-400">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <Link to={`/admin/${companySlug}/repos`} className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium mb-6">
        <ArrowLeft size={16} /> Voltar para Repositórios
      </Link>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-8 relative">
        <div className="h-40 w-full bg-slate-100 relative overflow-hidden">
          {repo.banner_image || repo.cover_image ? (
            <img src={repo.banner_image || repo.cover_image} alt={repo.name} className="w-full h-full object-cover opacity-60 mix-blend-multiply" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-slate-200 to-slate-100"></div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
        </div>
        <div className="p-6 relative -mt-16 flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
          <div className="flex gap-4 items-end">
            <div className="w-24 h-24 md:h-32 rounded-lg shadow-lg border-4 border-white bg-white flex items-center justify-center shrink-0 overflow-hidden">
              {repo.cover_image ? (
                <img src={repo.cover_image} alt="Capa" className="w-full h-full object-cover" />
              ) : isSimple ? (
                <List size={40} className="text-slate-300" />
              ) : (
                <ImageIcon size={40} className="text-slate-300" />
              )}
            </div>
            <div className="mb-2">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/20 text-white backdrop-blur-sm border border-white/30">
                  {isSimple ? 'Repositório Simples' : isPlaylist ? 'Playlist de Músicas' : isVideoPlaylist ? 'Playlist de Vídeos' : 'Repositório Completo'}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-white drop-shadow-sm leading-tight">{repo.name}</h1>
              <p className="text-sm text-slate-200 mt-1 max-w-xl line-clamp-2">{repo.description || 'Sem descrição'}</p>
            </div>
          </div>
          <div className="bg-white px-5 py-3 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {isSimple ? 'Total de Links' : isPlaylist ? 'Total de Músicas' : isVideoPlaylist ? 'Total de Vídeos' : 'Total de Conteúdos'}
            </span>
            <span className="text-3xl font-black text-indigo-600 leading-none mt-1">{isSimple ? simpleLinks.length : contents.length}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-xl font-bold text-slate-900">
          {isSimple ? 'Lista de Links' : isPlaylist ? 'Faixas da Playlist' : isVideoPlaylist ? 'Vídeos da Playlist' : 'Conteúdos do Repositório'}
        </h2>
        <div className="flex gap-2 w-full sm:w-auto">
          {!isSimple && (
            <Button variant="outline" onClick={() => setIsCategoryModalOpen(true)} className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 flex-1 sm:flex-none">
              <Layers size={16} className="mr-2" /> Fases
            </Button>
          )}
          <Button onClick={isSimple ? openCreateSimple : openCreateFull} className="bg-indigo-600 hover:bg-indigo-700 shadow-md flex-1 sm:flex-none">
            <Plus size={16} className="mr-2" /> {isSimple ? 'Adicionar Links' : isPlaylist ? 'Adicionar Música' : isVideoPlaylist ? 'Adicionar Vídeo' : 'Novo Conteúdo'}
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {isSimple && (
          <div className="p-4 bg-white border-b border-slate-200 flex flex-col gap-3 shadow-sm z-10">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <Input placeholder="Buscar por nome ou URL..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 bg-slate-50 border-slate-200" />
            </div>
            <div className="grid grid-cols-2 md:flex md:flex-row gap-3 w-full">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="col-span-1 w-full md:w-48 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="ALL">Tipos (Todos)</option>
                {availableTypes.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="col-span-1 w-full md:w-auto bg-slate-50 border-slate-200 text-slate-600" />
              <Button variant="outline" onClick={() => setSortOrder(prev => (prev === 'desc' ? 'asc' : 'desc'))} className="col-span-2 md:col-span-1 bg-white min-w-[150px] flex items-center gap-2 h-9">
                <ArrowDownUp size={14} className="text-slate-500" />
                {sortOrder === 'desc' ? 'Recentes' : 'Antigos'}
              </Button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          {isSimple ? (
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-900 font-semibold">
                <tr>
                  <th className="p-4 w-16 text-center">Status</th>
                  <th className="p-4">Nome do Link</th>
                  <th className="p-4">Tipo / Categoria</th>
                  <th className="p-4">Data</th>
                  <th className="p-4 text-center">Métricas</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLinks.map(link => {
                  const conf = getPremiumAdminConfig(link.type);
                  const Icon = conf.icon;

                  const linkViews = contentViews.filter(v => v.content_id === link.id);
                  const totalViews = linkViews.length;
                  const uniqueUsers = new Set(linkViews.map(v => v.user_id)).size;
                  const linkRatings = contentRatings.filter(r => r.content_id === link.id);
                  const avgRating = linkRatings.length > 0 ? (linkRatings.reduce((acc, curr) => acc + curr.rating, 0) / linkRatings.length).toFixed(1) : '-';

                  return (
                    <tr key={link.id} className={`hover:bg-slate-50/80 transition-colors group ${link.status === 'INACTIVE' ? 'opacity-60 bg-slate-50/50' : ''}`}>
                      <td className="p-4 text-center">
                        <div className="flex justify-center">
                          {link.status === 'ACTIVE' ? <span title="Ativo"><CheckCircle2 className="text-emerald-500" size={20} /></span> : <span title="Inativo"><XCircle className="text-slate-400" size={20} /></span>}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="relative w-12 h-12 rounded-xl flex items-center justify-center shrink-0 overflow-hidden shadow-sm group-hover:shadow-md transition-shadow">
                            <div className={`absolute inset-0 bg-gradient-to-br ${conf.gradient} opacity-20`}></div>
                            <Icon size={22} className={`${conf.text} drop-shadow-sm`} strokeWidth={1.5} />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-base mb-0.5 group-hover:text-indigo-700 transition-colors">{link.name}</p>
                            <p className="text-xs text-slate-500 line-clamp-1 max-w-[280px] truncate">{link.url}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${conf.bg} ${conf.text} ${conf.border}`}>{link.type}</span>
                      </td>
                      <td className="p-4 font-medium text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={14} className="text-slate-400" />
                          {new Date(link.date + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          <div className="flex items-center justify-center gap-2 w-full">
                            <span className="flex items-center gap-1 text-xs font-medium text-slate-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md" title={`Média de ${linkRatings.length} avaliações`}>
                              <Star size={12} className="text-amber-500" fill="currentColor" /> {avgRating}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md" title="Total de Visualizações">
                              <Eye size={12} className="text-slate-400" /> {totalViews}
                            </span>
                            <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md" title="Usuários Únicos">
                              <Users size={12} className="text-slate-400" /> {uniqueUsers}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button asChild variant="outline" size="sm" className="hidden sm:flex items-center gap-1.5 h-8 mr-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50 shadow-sm">
                            <a href={link.url} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Abrir</a>
                          </Button>
                          <Switch checked={link.status === 'ACTIVE'} onCheckedChange={() => toggleStatusSimple(link)} title="Ativar/Inativar" />
                          <div className="h-6 w-px bg-slate-200 mx-1"></div>
                          <Button variant="ghost" size="icon" onClick={() => openEditSimple(link)} className="text-slate-400 hover:text-indigo-600"><Edit2 size={16} /></Button>
                          <Button variant="ghost" size="icon" onClick={() => confirmDelete(link.id, link.name)} className="text-slate-400 hover:text-red-600"><Trash2 size={16} /></Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredLinks.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-500">
                      <LinkIcon size={48} className="text-slate-300 mx-auto mb-4" />
                      <p className="text-lg font-medium text-slate-900">Nenhum link encontrado</p>
                      <p className="text-sm mt-1">Verifique os filtros ou crie um novo link.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-900 font-semibold">
                <tr>
                  <th className="p-4 w-16 text-center">Status</th>
                  <th className="p-4">Conteúdo</th>
                  <th className="p-4 w-32">Tipo & Fase</th>
                  <th className="p-4 text-center">Métricas</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contents.map(content => {
                  const cViews = contentViews.filter(v => v.content_id === content.id);
                  const totalViews = cViews.length;
                  const uniqueUsers = new Set(cViews.map(v => v.user_id)).size;
                  const cRatings = contentRatings.filter(r => r.content_id === content.id);
                  const avgRating = cRatings.length > 0 ? (cRatings.reduce((acc, curr) => acc + curr.rating, 0) / cRatings.length).toFixed(1) : '-';

                  const tUrl = getDisplayThumbnail(content);
                  const phase = repoCategories.find(c => c.id === content.category_id);

                  return (
                    <tr key={content.id} className={`hover:bg-slate-50 transition-colors ${content.status === 'DRAFT' ? 'opacity-70 bg-slate-50/50' : ''}`}>
                      <td className="p-4 text-center">
                        <div className="flex justify-center">
                          {content.status === 'ACTIVE' ? <span title="Ativo"><CheckCircle2 className="text-emerald-500" size={20} /></span> : <span title="Inativo"><XCircle className="text-slate-400" size={20} /></span>}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="w-24 h-14 rounded overflow-hidden shadow-sm bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center">
                            {tUrl ? <img src={tUrl} alt={content.title} className="w-full h-full object-cover" /> : <ImageIcon size={20} className="text-slate-400" />}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 text-base mb-0.5">{content.title}</p>
                            <p className="text-xs text-slate-500 line-clamp-1 max-w-md">{content.description || 'Sem descrição'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col items-start gap-1.5">
                          <div className="flex items-center gap-2 font-medium bg-slate-100 w-fit px-2.5 py-1 rounded-md text-xs border border-slate-200">
                            {getTypeIcon(content.type)} {content.type}
                          </div>
                          {phase && (
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                              {phase.name}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          <div className="flex items-center justify-center gap-2 w-full">
                            <span className="flex items-center gap-1 text-xs font-medium text-slate-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md" title={`Média de ${cRatings.length} avaliações`}>
                              <Star size={12} className="text-amber-500" fill="currentColor" /> {avgRating}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md" title="Total de Visualizações">
                              <Eye size={12} className="text-slate-400" /> {totalViews}
                            </span>
                            <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md" title="Usuários Únicos">
                              <Users size={12} className="text-slate-400" /> {uniqueUsers}
                            </span>
                          </div>
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
                  );
                })}
                {contents.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-500">
                      <Play size={48} className="text-slate-300 mx-auto mb-4" />
                      <p className="text-lg font-medium text-slate-900">{isPlaylist ? 'Nenhuma música adicionada' : isVideoPlaylist ? 'Nenhum vídeo adicionado' : 'Nenhum conteúdo adicionado'}</p>
                      <p className="text-sm mt-1">{isPlaylist ? 'Clique em "Adicionar Música" para começar sua lista.' : isVideoPlaylist ? 'Clique em "Adicionar Vídeo" para começar sua lista.' : 'Clique em "Novo Conteúdo" para adicionar.'}</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {!isSimple && (
        <Dialog open={isFormOpen} onOpenChange={(open) => { if (!open && !isUploading && !isSubmitting) handleCloseForm(); }}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingId ? 'Editar Conteúdo' : 'Novo Conteúdo'}</DialogTitle></DialogHeader>
            <form onSubmit={handleSaveFull} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>{isPlaylist ? 'Nome da Música *' : isVideoPlaylist ? 'Título do Vídeo *' : 'Título do Conteúdo *'}</Label>
                <Input placeholder={isPlaylist ? "Ex: Bohemian Rhapsody" : isVideoPlaylist ? "Ex: Aula 01 - Introdução" : "Ex: Planilha de Metas 2024"} value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} autoFocus disabled={isSubmitting} />
              </div>
              <div className="space-y-2">
                <Label>Descrição (Opcional)</Label>
                <textarea className="flex w-full rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-slate-500 min-h-[80px] resize-y" placeholder="Uma breve descrição..." value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} disabled={isSubmitting} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Conteúdo *</Label>
                  <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as Content['type'] })} className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm cursor-pointer" disabled={isSubmitting}>
                    {isPlaylist ? (
                      <>
                        <option value="MUSIC">Música (YouTube)</option>
                        <option value="VIDEO">Vídeo</option>
                      </>
                    ) : isVideoPlaylist ? (
                      <option value="VIDEO">Vídeo (YouTube / Shorts)</option>
                    ) : (
                      <>
                        <option value="VIDEO">Vídeo</option>
                        <option value="MUSIC">Música (YouTube)</option>
                        <option value="PDF">Arquivo PDF</option>
                        <option value="DOCUMENT">Documento</option>
                        <option value="LINK">Link Externo</option>
                      </>
                    )}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Fase (Opcional)</Label>
                  <select value={formData.category_id || ''} onChange={(e) => setFormData({ ...formData, category_id: e.target.value })} className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm cursor-pointer" disabled={isSubmitting}>
                    <option value="">Nenhuma (Fica Solto)</option>
                    {repoCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 sm:col-span-2">
                  <Label>URL Principal *</Label>
                  <div className="flex gap-2">
                    <Input placeholder="https://..." value={formData.url} onChange={(e) => setFormData({ ...formData, url: e.target.value })} className="flex-1" disabled={isSubmitting} />
                    <input type="file" onChange={(e) => handleFileUpload(e)} className="hidden" id="file-upload" accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.webp,.mp3,.wav" disabled={isSubmitting || isUploading} />
                    <Button type="button" variant="outline" onClick={() => document.getElementById('file-upload')?.click()} className="shrink-0" disabled={isSubmitting || isUploading}>
                      {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Imagem de Capa (Opcional)</Label>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-10 rounded border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                      {formData.thumbnail_url ? <img src={formData.thumbnail_url} alt="Thumb" className="w-full h-full object-cover" /> : <ImageIcon size={16} className="text-slate-400" />}
                    </div>
                    <div className="flex-1">
                      <Input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="thumb-upload" disabled={isSubmitting || isUploading} />
                      <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById('thumb-upload')?.click()} className="w-full text-xs h-10" disabled={isSubmitting || isUploading}>Upload Imagem</Button>
                    </div>
                  </div>
                  <Input placeholder="Ou cole a URL..." value={formData.thumbnail_url} onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })} className="h-8 text-xs mt-2" disabled={isSubmitting} />
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 mt-2">
                <div className="space-y-0.5">
                  <Label>Conteúdo Ativo</Label>
                  <p className="text-[10px] text-slate-500">{formData.status === 'ACTIVE' ? 'Conteúdo visível na plataforma' : 'Rascunho'}</p>
                </div>
                <Switch checked={formData.status === 'ACTIVE'} onCheckedChange={(checked) => setFormData({ ...formData, status: checked ? 'ACTIVE' : 'DRAFT' })} disabled={isSubmitting} />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={handleCloseForm} disabled={isSubmitting}>Cancelar</Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={isSubmitting || isUploading}>
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : editingId ? 'Salvar Alterações' : 'Adicionar Conteúdo'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {!isSimple && (
        <Dialog open={isCategoryModalOpen} onOpenChange={(open) => { if (!open && !isSubmitting) handleCloseCategory(); }}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader><DialogTitle>Gerenciar Fases</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="flex gap-2">
                <Input placeholder="Nome da nova fase..." value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCategory(); } }} disabled={isSubmitting} />
                <Button type="button" onClick={handleAddCategory} className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={isSubmitting || !newCategoryName.trim()}>Adicionar</Button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {repoCategories.map((cat, index) => (
                  <div key={cat.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg bg-slate-50 shadow-sm">
                    <span className="text-sm font-semibold text-slate-700">{cat.name}</span>
                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-md p-0.5">
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-indigo-600" onClick={() => moveCategory(index, -1)} disabled={index === 0 || isSubmitting}><ArrowUp size={14} /></Button>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-indigo-600" onClick={() => moveCategory(index, 1)} disabled={index === repoCategories.length - 1 || isSubmitting}><ArrowDown size={14} /></Button>
                      <div className="w-px h-4 bg-slate-200 mx-1"></div>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-500" onClick={() => deleteCategory(cat.id)} disabled={isSubmitting}><Trash2 size={14} /></Button>
                    </div>
                  </div>
                ))}
                {repoCategories.length === 0 && <p className="text-sm text-slate-500 text-center py-6 border border-dashed border-slate-200 rounded-lg">Nenhuma fase cadastrada.</p>}
              </div>
            </div>
            <div className="flex justify-end pt-4 border-t border-slate-100 mt-2">
              <Button type="button" variant="outline" onClick={handleCloseCategory} disabled={isSubmitting}>Fechar Gerenciador</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {isSimple && (
        <Dialog open={isFormOpen} onOpenChange={(open) => { if (!open && !isSubmitting) handleCloseForm(); }}>
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
              <div className="grid grid-cols-[2fr_2.5fr_0.5fr_1.5fr_auto] gap-3 px-1 mb-2 text-xs font-semibold text-slate-500">
                <div>NOME DO LINK</div>
                <div>URL DE DESTINO</div>
                <div className="text-center">FILE</div>
                <div>TIPO / CATEGORIA</div>
                <div className="w-8"></div>
              </div>

              <div className="overflow-y-auto flex-1 space-y-2 px-1 pb-2 min-h-[250px]">
                {batchLinks.map((link, index) => (
                  <div key={link.id} className="grid grid-cols-[2fr_2.5fr_0.5fr_1.5fr_auto] gap-3 items-center group">
                    <Input placeholder="Ex: Planilha XPTO" value={link.name} onChange={e => updateBatch(index, 'name', e.target.value)} className="h-9 text-sm focus-visible:ring-indigo-500" disabled={isSubmitting} />
                    <Input placeholder="https://..." value={link.url} onChange={e => updateBatch(index, 'url', e.target.value)} onPaste={e => handlePaste(e, index)} className="h-9 text-sm font-mono focus-visible:ring-indigo-500" disabled={isSubmitting} />
                    <div className="flex justify-center">
                      <Input type="file" onChange={(e) => handleFileUpload(e, index)} className="hidden" id={`file-upload-batch-${index}`} accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.webp,.mp3,.wav" disabled={isSubmitting || isUploading} />
                      <Button type="button" variant="ghost" size="icon" onClick={() => document.getElementById(`file-upload-batch-${index}`)?.click()} className="h-9 w-9 text-slate-400 hover:text-indigo-600" disabled={isSubmitting || isUploading}>
                        <Plus size={16} />
                      </Button>
                    </div>
                    <select value={link.type} onChange={e => updateBatch(index, 'type', e.target.value)} className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer" disabled={isSubmitting}>
                      {PREDEFINED_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                      {!PREDEFINED_TYPES.includes(link.type) && (
                        <option value={link.type}>{link.type}</option>
                      )}
                    </select>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeBatch(index)} disabled={(batchLinks.length === 1 && !editingId) || isSubmitting} className="h-9 w-9 text-slate-400 hover:text-red-500 hover:bg-red-50 opacity-50 group-hover:opacity-100 transition-all">
                      <Trash2 size={16} />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="shrink-0 mt-2 px-1">
                <Button type="button" variant="outline" onClick={addBatchRow} className="w-full border-dashed border-slate-300 text-slate-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 h-9" disabled={isSubmitting}>
                  <Plus size={16} className="mr-2" /> Adicionar mais links
                </Button>
              </div>

              <div className="shrink-0 flex justify-end gap-3 pt-4 mt-4 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={handleCloseForm} disabled={isSubmitting}>Cancelar</Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : editingId ? 'Salvar Alteração' : 'Salvar Links'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}


      <Dialog open={isDeleteOpen} onOpenChange={(open) => { if (!open && !isSubmitting) handleCloseDelete(); }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle className="text-red-600">Excluir Item</DialogTitle></DialogHeader>
          <div className="py-4">
            <p className="text-slate-600 text-sm">Tem certeza que deseja excluir <strong>{itemToDelete?.title}</strong>?</p>
            <p className="text-red-500 text-sm mt-2 font-medium">Esta ação não pode ser desfeita.</p>
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={handleCloseDelete} disabled={isSubmitting}>Cancelar</Button>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Sim, excluir'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
