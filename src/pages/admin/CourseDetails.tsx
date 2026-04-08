import { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useCompanies, useCourses, useCourseModules, useCourseContents, useOrgStructure, useUsers } from '../../hooks/useSupabaseData';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  GripVertical, 
  FileText, 
  Play, 
  Music, 
  Image as ImageIcon, 
  BookOpen, 
  ChevronDown, 
  ChevronUp, 
  MoreVertical,
  Edit2,
  Save,
  CheckCircle2,
  Loader2,
  AlertCircle,
  XCircle,
  AlertTriangle,
  Settings2,
  X,
  Target,
  Globe,
  Lock,
  Eye
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { uploadToSupabase } from '../../lib/storage';
import { supabase } from '../../lib/supabaseClient';
import { toast } from 'sonner';

export const AdminCourseDetails = () => {
  const { link_name: companySlug, courseId } = useParams();
  const navigate = useNavigate();
  const { companies } = useCompanies();
  const company = companies.find(c => c.slug === companySlug);
  
  const { courses, mutate: mutateCourses } = useCourses(company?.id);
  const course = courses.find(c => c.id === courseId);
  
  const { users, isLoading: loadingUsers } = useUsers(company?.id);
  const { orgTopLevels, orgUnits, isLoading: loadingOrg } = useOrgStructure(company?.id);
  
  const { modules, isLoading: loadingModules, mutate: mutateModules } = useCourseModules(courseId);
  
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [courseTitle, setCourseTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados para Adição de Conteúdo
  const [isAddContentOpen, setIsAddContentOpen] = useState(false);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(false);
  const [newContent, setNewContent] = useState({
    title: '',
    description: '',
    type: 'PDF' as 'PDF' | 'VIDEO' | 'DOCUMENT' | 'IMAGE' | 'AUDIO',
    file: null as File | null,
    url: '' // Adicionado para links externos/YouTube
  });
  const [addMethod, setAddMethod] = useState<'upload' | 'link'>('upload');


  // Estado para Configurações do Curso (Público/Status/Estruturas)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [targetAudience, setTargetAudience] = useState<string[]>(course?.target_audience || []);
  const [courseStatus, setCourseStatus] = useState<string>(course?.status || 'DRAFT');
  
  const [accessType, setAccessType] = useState<'ALL' | 'RESTRICTED'>(course?.access_type || 'ALL');
  const [allowedUserIds, setAllowedUserIds] = useState<string[]>(course?.allowed_user_ids || []);
  const [allowedRegionIds, setAllowedRegionIds] = useState<string[]>(course?.allowed_region_ids || []);
  const [allowedStoreIds, setAllowedStoreIds] = useState<string[]>(course?.allowed_store_ids || []);
  const [excludedUserIds, setExcludedUserIds] = useState<string[]>(course?.excluded_user_ids || []);

  const companyUsers = users.filter(u => u.role === 'USER');
  const companyTopLevels = orgTopLevels.filter(o => o.active);
  const companyUnitsLocal = orgUnits.filter(u => u.active);
  const unitLabel = company?.org_unit_name || 'Unidade';
  const org_levels = company?.org_levels?.length ? company.org_levels : [{ id: 'legacy', name: company?.org_top_level_name || 'Regional' }];

  const usersInScope = useMemo(() => {
    if (allowedRegionIds.length === 0 && allowedStoreIds.length === 0) return [];
    return companyUsers.filter(u => {
      if (u.org_unit_id && allowedStoreIds.includes(u.org_unit_id)) return true;
      if (u.org_unit_id && allowedRegionIds.length > 0) {
        const unit = companyUnitsLocal.find(unit => unit.id === u.org_unit_id);
        let currentParent = companyTopLevels.find(t => t.id === unit?.parent_id);
        while (currentParent) {
          if (allowedRegionIds.includes(currentParent.id)) return true;
          currentParent = companyTopLevels.find(t => t.id === currentParent?.parent_id);
        }
      }
      if (u.org_top_level_id && allowedRegionIds.includes(u.org_top_level_id)) return true;
      return false;
    });
  }, [allowedRegionIds, allowedStoreIds, companyUsers, companyUnitsLocal, companyTopLevels]);

  const handleUpdateCourse = async () => {
    const finalTitle = courseTitle || course?.title;
    if (!courseId || !finalTitle) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('courses').update({ 
        title: finalTitle,
        target_audience: targetAudience,
        status: courseStatus,
        access_type: accessType,
        allowed_user_ids: allowedUserIds,
        allowed_region_ids: allowedRegionIds,
        allowed_store_ids: allowedStoreIds,
        excluded_user_ids: excludedUserIds
      }).eq('id', courseId);
      
      if (error) throw error;
      toast.success("Curso atualizado com sucesso!");
      setIsEditingTitle(false);
      setIsSettingsOpen(false);
      mutateCourses();
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error("Erro: " + error.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublishCourse = async () => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('courses').update({ 
        status: 'ACTIVE' 
      }).eq('id', courseId);
      
      if (error) throw error;
      toast.success("Curso publicado! Agora está visível para os alunos.");
      mutateCourses();
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error("Erro ao publicar: " + error.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCourse = async () => {
    if (!courseId) return;
    if (!confirm("⚠️ ATENÇÃO: Deseja realmente excluir este curso? Esta ação é irreversível e removerá todos os módulos e aulas vinculados.")) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('courses').delete().eq('id', courseId);
      
      if (error) throw error;
      
      toast.success("Curso excluído com sucesso!");
      navigate(`/admin/${companySlug}/courses`);
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error("Erro ao excluir curso: " + error.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddModule = async () => {
    if (!courseId) return;
    try {
      const nextOrder = modules.length;
      const { error } = await supabase.from('course_modules').insert({
        course_id: courseId,
        title: `Módulo ${modules.length + 1}`,
        order_index: nextOrder
      });
      if (error) throw error;
      toast.success("Módulo adicionado!");
      mutateModules();
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error("Erro ao adicionar módulo: " + error.message);
      }
    }
  };

  const handleDeleteModule = async (id: string) => {
    if (!confirm("Deseja realmente excluir este módulo e todos os seus conteúdos?")) return;
    try {
      const { error } = await supabase.from('course_modules').delete().eq('id', id);
      if (error) throw error;
      toast.success("Módulo removido");
      mutateModules();
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error("Erro ao remover: " + error.message);
      }
    }
  };

  const handleSaveContent = async () => {
    if (!selectedModuleId || !newContent.title || !company?.id) return;
    if (addMethod === 'upload' && !newContent.file) return;
    if (addMethod === 'link' && !newContent.url) return;

    setUploadProgress(true);
    try {
      let publicUrl = '';
      
      if (addMethod === 'upload' && newContent.file) {
        publicUrl = await uploadToSupabase(
          newContent.file,
          'course-materials',
          `courses/${courseId}/modules/${selectedModuleId}`
        );
      } else {
        publicUrl = newContent.url;
      }

      if (!publicUrl) throw new Error("URL não definida");

      const { data: inserted, error } = await supabase.from('course_contents').insert({
        module_id: selectedModuleId,
        company_id: company.id,
        title: newContent.title,
        description: newContent.description,
        type: newContent.type,
        url: publicUrl,
        size_bytes: newContent.file?.size || 0,
        order_index: 0
      }).select().single();

      if (error) throw error;

      toast.success("Conteúdo adicionado!");
      setIsAddContentOpen(false);
      setNewContent({ title: '', description: '', type: 'PDF', file: null, url: '' });
      setAddMethod('upload');
      mutateModules();

    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error("Erro no upload: " + error.message);
      }
    } finally {
      setUploadProgress(false);
    }
  };


  const handleDeleteContent = async (id: string) => {
    if (!confirm("Deseja remover esta aula?")) return;
    try {
      const { error } = await supabase.from('course_contents').delete().eq('id', id);
      if (error) throw error;
      toast.success("Conteúdo removido");
      mutateModules();
    } catch (error: unknown) {
      toast.error("Erro ao remover");
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      let type: 'PDF' | 'VIDEO' | 'DOCUMENT' | 'IMAGE' | 'AUDIO' = 'PDF';
      if (file.type.startsWith('video/')) type = 'VIDEO';
      else if (file.type.startsWith('audio/')) type = 'AUDIO';
      else if (file.type.startsWith('image/')) type = 'IMAGE';
      
      setNewContent({
        ...newContent,
        file,
        title: newContent.title || file.name.split('.')[0],
        type
      });
    }
  };

  if (!course && !loadingModules) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle size={48} className="text-slate-300 mb-4" />
        <h2 className="text-xl font-bold">Curso não encontrado</h2>
        <Button variant="link" asChild><Link to={`/admin/${companySlug}/courses`}>Voltar para a lista</Link></Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Link 
          to={`/admin/${companySlug}/courses`} 
          className="text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-2 text-sm font-medium w-fit"
        >
          <ArrowLeft size={16} /> Voltar para Cursos
        </Link>
        
        <div className="flex justify-between items-start gap-6">
          <div className="flex-1">
            {isEditingTitle ? (
              <div className="flex items-center gap-2 max-w-xl">
                <Input 
                  value={courseTitle || course?.title} 
                  onChange={(e) => setCourseTitle(e.target.value)}
                  className="text-2xl font-bold h-12 border-blue-200 focus:ring-blue-500"
                  autoFocus
                />
                <Button onClick={handleUpdateCourse} disabled={isSubmitting} size="icon" className="shrink-0 bg-blue-600">
                  {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                </Button>
                <Button onClick={() => setIsEditingTitle(false)} variant="ghost" size="icon" className="shrink-0">
                  <ArrowLeft size={18} />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-3 group">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">{course?.title}</h1>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => {
                    setCourseTitle(course?.title || '');
                    setIsEditingTitle(true);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-blue-600"
                >
                  <Edit2 size={18} />
                </Button>
              </div>
            )}
            <p className="text-slate-500 mt-2 max-w-2xl">{course?.description || 'Adicione uma descrição para este curso.'}</p>
          </div>

          <div className="flex items-center gap-3">
             <Button 
                variant="outline" 
                onClick={() => {
                   setCourseTitle(course?.title || '');
                   setTargetAudience(course?.target_audience || []);
                   setCourseStatus(course?.status || 'DRAFT');
                   setAccessType(course?.access_type || 'ALL');
                   setAllowedUserIds(course?.allowed_user_ids || []);
                   setAllowedRegionIds(course?.allowed_region_ids || []);
                   setAllowedStoreIds(course?.allowed_store_ids || []);
                   setExcludedUserIds(course?.excluded_user_ids || []);
                   setIsSettingsOpen(true);
                }}
                className="gap-2 border-slate-200"
             >
                <Settings2 size={18} /> Configurações
             </Button>

             {course?.status !== 'ACTIVE' && (
                <Button onClick={handlePublishCourse} disabled={isSubmitting} className="gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-md border-0 px-6">
                   {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />} 
                   Concluir e Publicar
                </Button>
             )}

             {course?.status === 'ACTIVE' && (
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-700 font-bold text-xs uppercase tracking-wider">
                   <Globe size={14} /> Ativo e Visível
                </div>
             )}
          </div>
        </div>
      </div>

      {/* Main Content: Modules List */}
      <div className="space-y-4">
        <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <BookOpen size={20} className="text-blue-600" /> Grade Curricular
          </h2>
          <Button onClick={handleAddModule} size="sm" className="gap-2 bg-blue-600">
            <Plus size={16} /> Adicionar Módulo
          </Button>
        </div>

        {loadingModules ? (
          <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-blue-600" /></div>
        ) : (
          <Accordion type="single" collapsible className="space-y-4">
            {modules.map((module) => (
              <ModuleItem 
                key={module.id} 
                module={module} 
                onDelete={() => handleDeleteModule(module.id)}
                companySlug={companySlug!}
                onAddContent={() => {
                  setSelectedModuleId(module.id);
                  setIsAddContentOpen(true);
                }}
                onDeleteContent={handleDeleteContent}
              />
            ))}
          </Accordion>
        )}
      </div>

      {/* DIÁLOGO: ADICIONAR CONTEÚDO */}
      <Dialog open={isAddContentOpen} onOpenChange={setIsAddContentOpen}>
        <DialogContent className="sm:max-w-[500px] border-0 shadow-2xl p-0 overflow-hidden rounded-2xl">
          <div className="bg-slate-900 p-6 text-white flex justify-between items-center shrink-0">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Plus size={24} className="text-blue-400" /> Adicionar Aula
              </DialogTitle>
            </DialogHeader>
            <Button variant="ghost" size="icon" onClick={() => setIsAddContentOpen(false)} className="text-white hover:bg-white/10"><X /></Button>
          </div>
          <div className="p-6 space-y-5 bg-white overflow-y-auto max-h-[70vh]">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-700 font-semibold">Tipo de Arquivo</Label>
                <select 
                  className="w-full border-2 border-slate-200 rounded-lg p-2 bg-white text-slate-800 outline-none focus:border-blue-500 transition-colors"
                  value={newContent.type}
                  onChange={(e) => {
                    const type = e.target.value as 'PDF' | 'VIDEO' | 'DOCUMENT' | 'IMAGE' | 'AUDIO';
                    setNewContent(prev => ({ ...prev, type }));
                    if (type === 'VIDEO') setAddMethod('link');
                  }}
                >
                  <option value="PDF">Documento PDF (.pdf)</option>
                  <option value="DOCUMENT">Documento de Texto (.txt, .docx)</option>
                  <option value="IMAGE">Imagem (.png, .jpg)</option>
                  <option value="AUDIO">Música / Áudio (.mp3, .wav)</option>
                  <option value="VIDEO">Vídeo (Somente Link YouTube)</option>
                </select>
              </div>

              {newContent.type !== 'VIDEO' && (
                <div className="flex p-1 bg-slate-100 rounded-lg">
                   <button 
                      onClick={() => setAddMethod('upload')}
                      className={`flex-1 py-2 text-[10px] font-bold rounded-md transition-all ${addMethod === 'upload' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                   >
                      UPLOAD DE ARQUIVO
                   </button>
                   <button 
                      onClick={() => setAddMethod('link')}
                      className={`flex-1 py-2 text-[10px] font-bold rounded-md transition-all ${addMethod === 'link' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                   >
                      USAR LINK EXTERNO
                   </button>
                </div>
              )}

              {addMethod === 'upload' && newContent.type !== 'VIDEO' ? (
                <div className="space-y-2">
                  <Label className="text-slate-700 font-semibold text-xs uppercase tracking-wider">Selecione o Arquivo</Label>
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center hover:border-blue-400 hover:bg-blue-50/50 transition-all cursor-pointer relative group">
                     <input 
                        type="file" 
                        onChange={onFileChange} 
                        className="absolute inset-0 opacity-0 cursor-pointer" 
                        accept={
                          newContent.type === 'PDF' ? 'application/pdf' :
                          newContent.type === 'DOCUMENT' ? '.txt,.doc,.docx' :
                          newContent.type === 'IMAGE' ? 'image/*' :
                          newContent.type === 'AUDIO' ? 'audio/*' : '*'
                        } 
                     />
                     {newContent.file ? (
                        <div className="text-center">
                           <p className="font-bold text-slate-800 text-sm">{newContent.file.name}</p>
                           <p className="text-[10px] text-slate-400">{(newContent.file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                     ) : (
                        <div className="text-center">
                           <Plus size={32} className="mx-auto text-slate-300 mb-2" />
                           <p className="text-sm text-slate-500 font-medium">Clique para selecionar seu arquivo</p>
                        </div>
                     )}
                  </div>
                </div>
              ) : (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                   <Label className="text-slate-700 font-semibold">
                     {newContent.type === 'VIDEO' ? 'URL do Vídeo no YouTube' : 'URL Pública do Arquivo'}
                   </Label>
                   <Input 
                      placeholder={newContent.type === 'VIDEO' ? "https://www.youtube.com/watch?v=..." : "https://..."} 
                      value={newContent.url} 
                      onChange={e => {
                         const url = e.target.value;
                         setNewContent(prev => ({ ...prev, url }));
                         if (!newContent.title && url.includes('youtube.com')) {
                            setNewContent(prev => ({ ...prev, title: 'Vídeo do YouTube' }));
                         }
                      }} 
                   />
                   <p className="text-[10px] text-slate-400 italic">
                     {newContent.type === 'VIDEO' 
                        ? 'Insira o link direto do YouTube para vincular o vídeo ao conteúdo do curso.'
                        : 'Certifique-se de que a URL inserida é diretamente acessível de forma pública.'}
                   </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700 font-semibold">Título</Label>
              <Input value={newContent.title} onChange={e => setNewContent({...newContent, title: e.target.value})} />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700 font-semibold">Descrição (Opcional)</Label>
              <Textarea value={newContent.description} onChange={e => setNewContent({...newContent, description: e.target.value})} placeholder="Breve resumo desta aula..." />
            </div>
          </div>
          <DialogFooter className="p-6 bg-slate-50 border-t flex gap-3">
            <Button variant="ghost" onClick={() => setIsAddContentOpen(false)} disabled={uploadProgress} className="flex-1">Cancelar</Button>
            <Button onClick={handleSaveContent} disabled={uploadProgress || (addMethod === 'upload' ? !newContent.file : !newContent.url) || !newContent.title} className="flex-1 bg-blue-600">
              {uploadProgress ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />} {addMethod === 'upload' ? 'Enviar Arquivo' : 'Adicionar Link'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* DIÁLOGO: CONFIGURAÇÕES DO CURSO E PÚBLICO ALVO */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
         <DialogContent className="sm:max-w-[500px] border-0 shadow-2xl p-0 overflow-hidden rounded-2xl">
            <div className="bg-slate-900 p-6 text-white flex justify-between items-center shrink-0">
               <DialogHeader>
                  <DialogTitle className="text-xl font-bold flex items-center gap-2">
                     <Settings2 size={24} className="text-blue-400" /> Configurações
                  </DialogTitle>
               </DialogHeader>
               <Button variant="ghost" size="icon" onClick={() => setIsSettingsOpen(false)} className="text-white hover:bg-white/10"><X /></Button>
            </div>
            <div className="p-6 space-y-6 bg-white overflow-y-auto max-h-[70vh]">
               <div className="space-y-4">
                  <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100 mb-4">
                     <Label className="text-slate-900 font-bold flex items-center gap-2">
                        <Globe size={18} className="text-blue-500" /> Visibilidade
                     </Label>
                     <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">{courseStatus === 'ACTIVE' ? 'Público/Ativo' : 'Rascunho'}</span>
                        <Switch 
                           checked={courseStatus === 'ACTIVE'} 
                           onCheckedChange={(checked) => setCourseStatus(checked ? 'ACTIVE' : 'DRAFT')}
                        />
                     </div>
                  </div>

                  <Label className="text-slate-900 font-bold flex items-center gap-2">
                     <Target size={18} className="text-rose-500" /> Público Alvo e Acesso
                  </Label>
                  
                  <div className="flex gap-4 p-1 bg-slate-100 rounded-lg">
                     <button 
                        onClick={() => setAccessType('ALL')}
                        className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all ${accessType === 'ALL' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
                     >
                        TODOS OS USUÁRIOS
                     </button>
                     <button 
                        onClick={() => setAccessType('RESTRICTED')}
                        className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all ${accessType === 'RESTRICTED' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
                     >
                        ACESSO RESTRITO
                     </button>
                  </div>

                  {accessType === 'RESTRICTED' ? (
                     <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                        <p className="text-[10px] text-slate-500 italic">Defina quais estruturas organizacionais têm acesso a este curso.</p>
                        
                        <div className="grid grid-cols-1 gap-4">
                           {/* Regionais / Top Levels */}
                           {org_levels.map((lvl, index) => {
                              const groupsInThisLevel = companyTopLevels.filter(t => t.level_id === lvl.id || (!t.level_id && index === 0));
                              if (groupsInThisLevel.length === 0) return null;
                              return (
                                 <div key={lvl.id} className="border border-slate-200 rounded-lg p-3 max-h-40 overflow-y-auto bg-slate-50">
                                    <p className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">{lvl.name}s:</p>
                                    <div className="space-y-1">
                                       {groupsInThisLevel.map(t => (
                                          <label key={t.id} className="flex items-center gap-2 p-1.5 hover:bg-white rounded transition-colors cursor-pointer group">
                                             <input 
                                                type="checkbox" 
                                                checked={allowedRegionIds.includes(t.id)} 
                                                onChange={() => setAllowedRegionIds(prev => prev.includes(t.id) ? prev.filter(i => i !== t.id) : [...prev, t.id])}
                                                className="accent-blue-600 rounded"
                                             />
                                             <span className="text-xs font-semibold text-slate-700 group-hover:text-blue-600">{t.name}</span>
                                          </label>
                                       ))}
                                    </div>
                                 </div>
                              );
                           })}

                           {/* Unidades / Lojas */}
                           <div className="border border-slate-200 rounded-lg p-3 max-h-40 overflow-y-auto bg-slate-50">
                              <p className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">{unitLabel}s:</p>
                              <div className="space-y-1">
                                 {companyUnitsLocal.map(u => (
                                    <label key={u.id} className="flex items-center gap-2 p-1.5 hover:bg-white rounded transition-colors cursor-pointer group">
                                       <input 
                                          type="checkbox" 
                                          checked={allowedStoreIds.includes(u.id)} 
                                          onChange={() => setAllowedStoreIds(prev => prev.includes(u.id) ? prev.filter(i => i !== u.id) : [...prev, u.id])}
                                          className="accent-blue-600 rounded"
                                       />
                                       <span className="text-xs font-semibold text-slate-700 group-hover:text-blue-600">{u.name}</span>
                                    </label>
                                 ))}
                              </div>
                           </div>

                           {/* Usuários Específicos */}
                           <div className="border border-slate-200 rounded-lg p-3 max-h-40 overflow-y-auto bg-slate-50">
                              <p className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest">Usuários Específicos:</p>
                              <div className="space-y-1">
                                 {companyUsers.map(u => (
                                    <label key={u.id} className="flex items-center gap-2 p-1.5 hover:bg-white rounded transition-colors cursor-pointer group">
                                       <input 
                                          type="checkbox" 
                                          checked={allowedUserIds.includes(u.id)} 
                                          onChange={() => setAllowedUserIds(prev => prev.includes(u.id) ? prev.filter(i => i !== u.id) : [...prev, u.id])}
                                          className="accent-blue-600 rounded"
                                       />
                                       <div className="flex flex-col">
                                          <span className="text-[11px] font-bold text-slate-700 group-hover:text-blue-600 leading-none">{u.name}</span>
                                          <span className="text-[9px] text-slate-400">{u.email}</span>
                                       </div>
                                    </label>
                                 ))}
                              </div>
                           </div>

                           {/* Exceções */}
                           {(allowedRegionIds.length > 0 || allowedStoreIds.length > 0) && (
                              <div className="border border-rose-100 rounded-lg p-3 max-h-40 overflow-y-auto bg-rose-50/30">
                                 <p className="text-[10px] font-bold text-rose-400 mb-2 uppercase tracking-widest text-center">Exceções (Bloqueados):</p>
                                 <div className="space-y-1">
                                    {usersInScope.map(u => (
                                       <label key={u.id} className="flex items-center gap-2 p-1.5 hover:bg-white rounded transition-colors cursor-pointer group">
                                          <input 
                                             type="checkbox" 
                                             checked={excludedUserIds.includes(u.id)} 
                                             onChange={() => setExcludedUserIds(prev => prev.includes(u.id) ? prev.filter(i => i !== u.id) : [...prev, u.id])}
                                             className="accent-rose-600 rounded"
                                          />
                                          <span className="text-[11px] font-bold text-slate-600 group-hover:text-rose-600">{u.name}</span>
                                       </label>
                                    ))}
                                 </div>
                              </div>
                           )}
                        </div>
                     </div>
                  ) : (
                     <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                        <p className="text-xs font-semibold text-blue-800 mb-2 flex items-center gap-2">
                           <Globe size={14} /> Filtro por Perfis (Opcional)
                        </p>
                        <p className="text-[10px] text-slate-500 mb-3 leading-relaxed">
                           Apenas usuários com as roles abaixo verão o curso. Se vazio, todos os usuários da empresa verão.
                        </p>
                        <div className="flex flex-wrap gap-2">
                           {['vendedor', 'gerente', 'viewer'].map(role => (
                              <button
                                 key={role}
                                 type="button"
                                 onClick={() => {
                                    if (targetAudience?.includes(role)) setTargetAudience(targetAudience.filter(r => r !== role));
                                    else setTargetAudience([...(targetAudience || []), role]);
                                 }}
                                 className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase transition-all border ${
                                    targetAudience?.includes(role) 
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                                    : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                                 }`}
                              >
                                 {role}
                              </button>
                           ))}
                        </div>
                     </div>
                  )}
               </div>
            </div>
            <DialogFooter className="p-6 bg-slate-50 border-t flex flex-col sm:flex-row gap-3">
               <Button 
                  variant="ghost" 
                  onClick={handleDeleteCourse} 
                  disabled={isSubmitting} 
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 font-bold"
               >
                  <Trash2 className="mr-2" size={18} /> Excluir Curso
               </Button>
               <div className="flex-1 flex gap-3">
                  <Button variant="ghost" onClick={() => setIsSettingsOpen(false)} disabled={isSubmitting} className="flex-1">Cancelar</Button>
                  <Button onClick={handleUpdateCourse} disabled={isSubmitting} className="flex-1 bg-blue-600 hover:bg-blue-700 shadow-md">
                     {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" size={18} />} Salvar Alterações
                  </Button>
               </div>
            </DialogFooter>
         </DialogContent>
      </Dialog>
    </div>
  );
};

const ModuleItem = ({ 
  module, 
  onDelete, 
  linkName, 
  onAddContent,
  onDeleteContent
}: { 
  module: { id: string; title: string }, 
  onDelete: () => void, 
  linkName: string, 
  onAddContent: () => void,
  onDeleteContent: (id: string) => void
}) => {
  const { contents, mutate: mutateContents } = useCourseContents(module.id);
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(module.title);

  const handleUpdate = async () => {
    try {
      await supabase.from('course_modules').update({ title }).eq('id', module.id);
      setIsEditing(false);
      toast.success("Módulo renomeado");
    } catch (err) {
      toast.error("Erro ao renomear");
    }
  };

  return (
    <AccordionItem value={module.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden px-0 shadow-sm hover:border-blue-100 transition-colors">
      <div className="flex items-center px-4 py-1">
        <GripVertical size={20} className="text-slate-300 mr-2" />
        {isEditing ? (
          <div className="flex-1 flex items-center gap-2 py-3">
             <Input value={title} onChange={e => setTitle(e.target.value)} className="h-9" autoFocus />
             <Button onClick={handleUpdate} size="sm"><Save size={14}/></Button>
             <Button onClick={() => setIsEditing(false)} variant="ghost" size="sm"><ArrowLeft size={14}/></Button>
          </div>
        ) : (
          <AccordionTrigger className="flex-1 hover:no-underline py-4">
            <span className="font-bold text-slate-800 text-left">{module.title}</span>
          </AccordionTrigger>
        )}
        {!isEditing && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)} className="text-slate-400 hover:text-blue-600"><Edit2 size={16} /></Button>
            <Button variant="ghost" size="icon" onClick={onDelete} className="text-slate-400 hover:text-red-500"><Trash2 size={16} /></Button>
          </div>
        )}
      </div>
      <AccordionContent className="border-t border-slate-50 bg-slate-50/30 px-6 py-4">
        <div className="space-y-3">
           {contents.map(content => (
             <ContentRow 
               key={content.id} 
               content={content} 
               linkName={linkName} 
               onDelete={() => onDeleteContent(content.id)} 
             />
           ))}
           <div className="pt-2">
              <Button onClick={onAddContent} variant="outline" size="sm" className="w-full border-dashed border-slate-300 bg-white hover:text-blue-600 gap-2">
                 <Plus size={16} /> Adicionar Aula ou Conteúdo
              </Button>
           </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};

// Subcomponente para cada aula/conteúdo dentro do módulo
const ContentRow = ({ 
  content, 
  linkName,
  onDelete
}: { 
  content: { id: string; type: string; title: string; url?: string }, 
  linkName: string,
  onDelete: () => void
}) => {
  const getIcon = (type: string) => {
    switch(type) {
      case 'VIDEO': return <Play size={16} className="text-rose-500" />;
      case 'PDF': return <FileText size={16} className="text-red-500" />;
      case 'AUDIO': return <Music size={16} className="text-amber-500" />;
      case 'IMAGE': return <ImageIcon size={16} className="text-blue-500" />;
      case 'DOCUMENT': return <FileText size={16} className="text-emerald-500" />;
      default: return <FileText size={16} />;
    }
  };

  return (
    <div className="flex items-center justify-between bg-white px-4 py-3 rounded-lg border border-slate-100 shadow-sm group hover:border-blue-200 transition-colors">
      <div className="flex items-center gap-3 overflow-hidden">
        <div className="p-2 bg-slate-50 rounded group-hover:bg-blue-50 shrink-0">{getIcon(content.type)}</div>
        <div className="overflow-hidden">
          <p className="font-semibold text-slate-800 text-sm truncate">{content.title}</p>
          <div className="flex items-center gap-2 mt-0.5">
             <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase">{content.type}</span>
             <span className="text-[10px] text-emerald-600 flex items-center gap-1">
                <CheckCircle2 size={10}/> Pronto
             </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1">
         <Button variant="ghost" size="icon" onClick={onDelete} className="h-8 w-8 text-slate-400 hover:text-red-500">
            <Trash2 size={14} />
         </Button>
      </div>
    </div>
  );
};
