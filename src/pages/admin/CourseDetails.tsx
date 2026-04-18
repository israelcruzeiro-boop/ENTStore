import { useState, useMemo, useEffect, useRef } from 'react';
import { z } from 'zod';
import { mutate as globalMutate } from 'swr';
import { cn } from '../../lib/utils';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useCompanies, useCourses, useCourseModules, useCourseContents, useOrgStructure, useUsers, useCourseQuestions, resetEnrollment } from '../../hooks/useSupabaseData';
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
  Eye,
  HelpCircle,
  FileCode,
  RefreshCw,
  Percent,
  Upload,
  Layers,
  Grid3X3,
  ListOrdered,
  MousePointer2,
  Skull
} from 'lucide-react';
import { Course, CourseModule, CourseContent, CoursePhaseQuestion, CourseQuestionType } from '../../types';
import { 
  courseSchema, 
  courseModuleSchema, 
  courseContentSchema,
  coursePhaseQuestionSchema,
  courseQuestionOptionSchema
} from '../../types/schemas';
import { Logger } from '../../utils/logger';
import { courseService } from '../../services/courseService';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { uploadToSupabase } from '../../lib/storage';
import { supabase } from '../../lib/supabaseClient';
import { toast } from 'sonner';
import { DIPLOMA_TEMPLATES } from '../../components/user/CourseDiploma';
import { Joyride } from 'react-joyride';
import { useTour } from '../../hooks/useTour';
import { COURSE_DETAILS_STEPS } from '../../data/tourSteps';

export const AdminCourseDetails = () => {
  const { companySlug, courseId } = useParams();
  const navigate = useNavigate();

  // Tour Guiado (Tutorial) - Hook Rule: Must be at the top level
  const { startTour, joyrideProps } = useTour(COURSE_DETAILS_STEPS);

  const { companies } = useCompanies();
  const company = companies.find(c => c.link_name === companySlug || c.slug === companySlug);
  
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
    type: 'PDF' as 'PDF' | 'VIDEO' | 'DOCUMENT' | 'IMAGE' | 'AUDIO' | 'HTML',
    file: null as File | null,
    url: '',
    html_content: ''
  });
  const [addMethod, setAddMethod] = useState<'upload' | 'link'>('upload');


  // Estado para Configurações do Curso (Público/Status/Estruturas)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [courseStatus, setCourseStatus] = useState<string>(course?.status || 'DRAFT');
  
  const [accessType, setAccessType] = useState<'ALL' | 'RESTRICTED'>(course?.access_type || 'ALL');
  const [allowedUserIds, setAllowedUserIds] = useState<string[]>(course?.allowed_user_ids || []);
  const [allowedRegionIds, setAllowedRegionIds] = useState<string[]>(course?.allowed_region_ids || []);
  const [allowedStoreIds, setAllowedStoreIds] = useState<string[]>(course?.allowed_store_ids || []);
  const [excludedUserIds, setExcludedUserIds] = useState<string[]>(course?.excluded_user_ids || []);
  const [passingScore, setPassingScore] = useState<number>(course?.passing_score || 70);
  const [diplomaTemplate, setDiplomaTemplate] = useState<string>(course?.diploma_template || 'azul');
  const [thumbnailUrl, setThumbnailUrl] = useState<string>(course?.thumbnail_url || '');
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  
  // Estado para perguntas
  const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [questionModuleId, setQuestionModuleId] = useState<string | null>(null);
  const [questionText, setQuestionText] = useState('');
  const [questionExplanation, setQuestionExplanation] = useState('');
  const [questionType, setQuestionType] = useState<CourseQuestionType>('MULTIPLE_CHOICE');
  const [questionImageUrl, setQuestionImageUrl] = useState('');
  const [questionOptions, setQuestionOptions] = useState<{text: string; isCorrect: boolean}[]>([
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false }
  ]);
  const [wordSearchWords, setWordSearchWords] = useState<string[]>(['']);
  const [wordSearchDifficulty, setWordSearchDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
  const [orderingItems, setOrderingItems] = useState<string[]>(['']);
  const [hotspotPoints, setHotspotPoints] = useState<{ x: number; y: number; radius?: number }[]>([]);
  const [hangmanWord, setHangmanWord] = useState('');
  const [hangmanMaxAttempts, setHangmanMaxAttempts] = useState(6);
  const [hangmanHint, setHangmanHint] = useState('');
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [resetUserId, setResetUserId] = useState('');

  const companyUsers = users.filter(u => u.role === 'USER');
  const companyTopLevels = orgTopLevels.filter(o => o.active);
  const companyUnitsLocal = orgUnits.filter(u => u.active);
  const unitLabel = company?.org_unit_name || 'Unidade';
  const org_levels = company?.org_levels?.length ? company.org_levels : [{ id: 'legacy', name: company?.org_top_level_name || 'Regional' }];

  // Sincronizar estados quando o curso for carregado
  useEffect(() => {
    if (course) {
      setCourseTitle(course.title || '');
      setCourseStatus(course.status || 'DRAFT');
      setAccessType(course.access_type || 'ALL');
      setAllowedUserIds(course.allowed_user_ids || []);
      setAllowedRegionIds(course.allowed_region_ids || []);
      setAllowedStoreIds(course.allowed_store_ids || []);
      setExcludedUserIds(course.excluded_user_ids || []);
      setPassingScore(course.passing_score || 70);
      setDiplomaTemplate(course.diploma_template || 'azul');
      setThumbnailUrl(course.thumbnail_url || '');
    }
  }, [course]);

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

  const handleUploadCover = async (file: File) => {
    if (!company?.id || !courseId) return;
    setIsUploadingCover(true);
    try {
      const publicUrl = await uploadToSupabase(file, 'assets', `courses/${company.id}/covers`, 'thumbnail');
      if (publicUrl) {
        setThumbnailUrl(publicUrl);
        toast.success('Capa carregada!');
      }
    } catch (err) {
      const error = err as Error;
      Logger.error("Erro ao enviar imagem de capa:", error);
      toast.error('Erro ao enviar imagem');
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleUpdateCourse = async () => {
    const finalTitle = courseTitle || course?.title;
    if (!courseId || !finalTitle || !company?.id) return;

    setIsSubmitting(true);
    try {
      await courseService.updateCourse(courseId, {
        title: finalTitle,
        status: courseStatus as any,
        access_type: accessType,
        allowed_user_ids: allowedUserIds,
        allowed_region_ids: allowedRegionIds,
        allowed_store_ids: allowedStoreIds,
        excluded_user_ids: excludedUserIds,
        passing_score: passingScore,
        diploma_template: diplomaTemplate,
        thumbnail_url: thumbnailUrl || null,
      });

      toast.success('Configurações salvas com sucesso!');
      
      await mutateCourses();
      setIsEditingTitle(false);
      setIsSettingsOpen(false);
    } catch (err: unknown) {
      const error = err as Error;
      Logger.error(`Erro ao atualizar curso: ${error.message}`);
      toast.error('Erro ao atualizar curso: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublishCourse = async () => {
    setIsSubmitting(true);
    try {
      await courseService.updateCourse(courseId, { status: 'ACTIVE' });
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
    if (!confirm("⚠️ ATENÇÃO: Deseja realmente remover este curso da lista ativa? Os dados não serão apagados permanentemente, mas o curso não será mais exibido.")) return;
    
    setIsSubmitting(true);
    try {
      await courseService.deleteCourse(courseId);
      toast.success("Curso removido com sucesso!");
      navigate(`/admin/${companySlug}/courses`);
    } catch (err) {
      Logger.error("Erro ao realizar soft delete de curso:", err);
      toast.error("Erro ao excluir curso.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddModule = async () => {
    if (!courseId || !company?.id) return;
    try {
      await courseService.createModule({
        course_id: courseId,
        company_id: company.id,
        title: `Módulo ${modules.length + 1}`,
        order_index: modules.length
      });
      toast.success("Módulo adicionado!");
      mutateModules();
    } catch (err: unknown) {
      Logger.error(`Erro ao adicionar módulo:`, err);
      toast.error("Erro ao adicionar módulo.");
    }
  };

  const handleDeleteModule = async (id: string) => {
    if (!confirm("Deseja marcar este módulo como excluído?")) return;
    try {
      await courseService.deleteModule(id);
      toast.success("Módulo removido");
      mutateModules();
    } catch (err) {
      Logger.error("Erro ao excluir módulo:", err);
      toast.error("Erro ao remover modulo.");
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

      // O service já faz a detecção de tipo se necessário, mas mantemos o override do admin
      await courseService.createContent({
        module_id: selectedModuleId,
        company_id: company.id,
        title: newContent.title,
        description: newContent.description,
        type: newContent.type as any,
        url: publicUrl,
        order_index: modules.find(m => m.id === selectedModuleId)?.contents?.length || 0
      });

      toast.success("Conteúdo adicionado!");
      setIsAddContentOpen(false);
      setNewContent({ title: '', description: '', type: 'PDF', file: null, url: '', html_content: '' });
      setAddMethod('upload');
      mutateModules();

    } catch (error: unknown) {
      const err = error as Error;
      Logger.error(`Erro no upload: ${err.message}`);
      toast.error("Erro no upload: " + err.message);
    } finally {
      setUploadProgress(false);
    }
  };


  const handleDeleteContent = async (id: string) => {
    if (!confirm("Deseja remover esta aula?")) return;
    try {
      await courseService.deleteContent(id);
      toast.success("Conteúdo removido da lista");
      mutateModules();
    } catch (err) {
      Logger.error("Erro ao excluir conteúdo:", err);
      toast.error("Erro ao remover aula.");
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      let type: 'PDF' | 'VIDEO' | 'DOCUMENT' | 'IMAGE' | 'AUDIO' = 'PDF';
      if (file.type.includes('pdf')) type = 'PDF';
      else if (file.type.startsWith('image/')) type = 'IMAGE';
      else if (file.type.startsWith('audio/')) type = 'AUDIO';
      else type = 'DOCUMENT';
      
      setNewContent({
        ...newContent,
        file,
        title: newContent.title || file.name.split('.')[0],
        type
      });
    }
  };

  const handleAddQuestion = (moduleId: string) => {
    setQuestionModuleId(moduleId);
    setEditingQuestionId(null);
    setQuestionText("");
    setQuestionExplanation("");
    setQuestionType("MULTIPLE_CHOICE");
    setQuestionImageUrl("");
    setWordSearchWords([""]);
    setWordSearchDifficulty("MEDIUM");
    setOrderingItems([""]);
    setHotspotPoints([]);
    setQuestionOptions([
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
      { text: "", isCorrect: false },
    ]);
    setIsQuestionDialogOpen(true);
  };

  const handleEditQuestion = (q: CoursePhaseQuestion) => {
    setEditingQuestionId(q.id);
    setQuestionModuleId(q.module_id);
    setQuestionText(q.question_text);
    setQuestionExplanation(q.explanation || "");
    setQuestionType(q.question_type);
    setQuestionImageUrl(q.image_url || "");

    if (q.question_type === "MULTIPLE_CHOICE") {
      setQuestionOptions(
        q.options?.map((o) => ({
          text: o.option_text,
          isCorrect: o.is_correct,
        })) || []
      );
    } else if (q.question_type === "WORD_SEARCH") {
      setWordSearchWords(q.configuration?.words || [""]);
      setWordSearchDifficulty(q.configuration?.difficulty || "MEDIUM");
    } else if (q.question_type === "ORDERING") {
      setOrderingItems(q.configuration?.items || [""]);
    } else if (q.question_type === "HOTSPOT") {
      setHotspotPoints(q.configuration?.hotspots || []);
    } else if (q.question_type === "HANGMAN") {
      setHangmanWord(q.configuration?.word || '');
      setHangmanMaxAttempts(q.configuration?.maxAttempts || 6);
      setHangmanHint(q.configuration?.hint || '');
    }
    setIsQuestionDialogOpen(true);
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
      <Joyride {...joyrideProps} />

      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Link 
            to={`/admin/${companySlug}/courses`} 
            className="text-slate-500 hover:text-slate-900 transition-colors flex items-center gap-2 text-sm font-medium w-fit"
          >
            <ArrowLeft size={16} /> Voltar para Cursos
          </Link>
          <Button variant="ghost" size="sm" className="text-blue-600 font-bold hover:bg-blue-50" onClick={startTour}>
            <HelpCircle size={16} className="mr-2" /> Como criar um curso?
          </Button>
        </div>
        
        <div className="flex justify-between items-start gap-6">
          <div className="flex-1 tour-title-step">
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
            ) : null}
            <p className="text-slate-500 mt-2 max-w-2xl">{course?.description || 'Adicione uma descrição para este curso.'}</p>
          </div>

          <div className="flex items-center gap-3">
             <Button 
                variant="outline" 
                onClick={() => {
                   setCourseTitle(course?.title || '');
                   setCourseStatus(course?.status || 'DRAFT');
                   setAccessType(course?.access_type || 'ALL');
                   setAllowedUserIds(course?.allowed_user_ids || []);
                   setAllowedRegionIds(course?.allowed_region_ids || []);
                   setAllowedStoreIds(course?.allowed_store_ids || []);
                   setExcludedUserIds(course?.excluded_user_ids || []);
                   setIsSettingsOpen(true);
                }}
                className="gap-2 border-slate-200 tour-settings-step"
             >
                <Settings2 size={18} /> Configurações
             </Button>

             {course?.status !== 'ACTIVE' && (
                <Button onClick={handlePublishCourse} disabled={isSubmitting} className="gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-md border-0 px-6 tour-publish-step">
                   {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />} 
                   Concluir e Publicar
                </Button>
             )}

             {course?.status === 'ACTIVE' && (
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-700 font-bold text-xs uppercase tracking-wider tour-publish-step">
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
          <Button onClick={handleAddModule} size="sm" className="gap-2 bg-blue-600 tour-add-module-step">
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
                linkName={companySlug!}
                onAddContent={() => {
                  setSelectedModuleId(module.id);
                  setIsAddContentOpen(true);
                }}
                onDeleteContent={handleDeleteContent}
                onAddQuestion={handleAddQuestion}
                onEditQuestion={handleEditQuestion}
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
                        onChange={(e) => setNewContent(prev => ({ ...prev, file: e.target.files?.[0] || null }))}
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.webp,.mp3,.wav"
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

                  <div className="space-y-4">
                   <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      Configurações do Curso
                   </h3>
                   
                   <div className="space-y-3">
                      <div className="flex flex-col gap-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                         <Label className="text-slate-900 font-bold flex items-center gap-2">
                            <ImageIcon size={18} className="text-blue-500" /> Capa do Curso
                         </Label>
                         
                         {thumbnailUrl && (
                           <div className="relative rounded-lg overflow-hidden border border-slate-200 aspect-video mb-2">
                             <img src={thumbnailUrl} alt="Capa" className="w-full h-full object-cover" />
                             <button 
                               type="button"
                               onClick={() => setThumbnailUrl('')}
                               className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors"
                             >
                               <X size={12} />
                             </button>
                           </div>
                         )}

                         <div className="flex gap-2">
                           <Input 
                              type="text"
                              placeholder="https://exemplo.com/imagem.png"
                              value={thumbnailUrl}
                              onChange={(e) => setThumbnailUrl(e.target.value)}
                              className="bg-white border-slate-200 focus:border-blue-500 flex-1"
                           />
                           <input
                             ref={coverInputRef}
                             type="file"
                             accept="image/*"
                             className="hidden"
                             onChange={(e) => {
                               const file = e.target.files?.[0];
                               if (file) handleUploadCover(file);
                               e.target.value = '';
                             }}
                           />
                           <Button
                             type="button"
                             variant="outline"
                             size="sm"
                             disabled={isUploadingCover}
                             onClick={() => coverInputRef.current?.click()}
                             className="border-blue-200 text-blue-700 hover:bg-blue-50 shrink-0 gap-1"
                           >
                             {isUploadingCover ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                             Upload
                           </Button>
                         </div>
                         <p className="text-[10px] text-slate-500 italic">Cole uma URL ou faça upload. Esta imagem será exibida no card do curso.</p>
                      </div>

                      <div className="flex justify-between items-center bg-amber-50 p-3 rounded-lg border border-amber-100 mb-4">
                     <Label className="text-slate-900 font-bold flex items-center gap-2">
                        <Percent size={18} className="text-amber-500" /> Nota Mínima (%)
                     </Label>
                     <Input 
                        type="number"
                        min={0}
                        max={100}
                        value={passingScore}
                        onChange={(e) => setPassingScore(Number(e.target.value))}
                        className="w-20 text-center font-bold border-amber-200"
                     />
                  </div>

                  {/* Template de Diploma */}
                  <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 mb-4">
                     <Label className="text-slate-900 font-bold flex items-center gap-2 mb-3">
                        <BookOpen size={18} className="text-emerald-500" /> Template de Diploma
                     </Label>
                     <div className="grid grid-cols-5 gap-2">
                        {DIPLOMA_TEMPLATES.map(t => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setDiplomaTemplate(t.id)}
                            className={`relative rounded-lg overflow-hidden border-2 transition-all aspect-[297/210] ${
                              diplomaTemplate === t.id 
                                ? 'border-emerald-500 ring-2 ring-emerald-200 scale-105' 
                                : 'border-slate-200 hover:border-emerald-300 opacity-70 hover:opacity-100'
                            }`}
                          >
                            <img src={t.image} alt={t.label} className="w-full h-full object-cover" />
                            {diplomaTemplate === t.id && (
                              <div className="absolute top-1 right-1 bg-emerald-500 text-white rounded-full w-4 h-4 flex items-center justify-center">
                                <CheckCircle2 size={10} />
                              </div>
                            )}
                          </button>
                        ))}
                     </div>
                     <p className="text-[10px] text-slate-500 mt-2 text-center">
                       Selecionado: <strong>{DIPLOMA_TEMPLATES.find(t => t.id === diplomaTemplate)?.label}</strong>
                     </p>
                  </div>
                </div>
             </div>

             {/* Liberar curso para refazer */}
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mb-4">
                     <Label className="text-slate-900 font-bold flex items-center gap-2 mb-2">
                        <RefreshCw size={18} className="text-blue-500" /> Liberar Curso para Refazer
                     </Label>
                     <p className="text-[10px] text-slate-500 mb-3">Selecione um usuário para resetar a matrícula e permitir que ele refaça o curso.</p>
                     <div className="flex gap-2">
                        <select
                          className="flex-1 h-9 border border-slate-200 rounded-md bg-white text-sm px-3"
                          value={resetUserId}
                          onChange={(e) => setResetUserId(e.target.value)}
                        >
                          <option value="">Selecione um usuário...</option>
                          {companyUsers.map(u => (
                            <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                          ))}
                        </select>
                        <Button 
                          variant="outline"
                          size="sm"
                          disabled={!resetUserId || !courseId}
                          className="border-blue-200 text-blue-700 hover:bg-blue-100 text-xs shrink-0"
                          onClick={async () => {
                            if (!courseId || !resetUserId) return;
                            try {
                              await resetEnrollment(courseId, resetUserId);
                              toast.success('Curso liberado para o usuário refazer!');
                              setResetUserId('');
                            } catch (err) {
                              const error = err as Error;
                              Logger.error(`Erro ao liberar curso: ${error.message}`);
                              toast.error('Erro ao liberar curso');
                            }
                          }}
                        >
                          <RefreshCw size={14} className="mr-1" /> Liberar
                        </Button>
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
                  ) : null}
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

      {/* DIÁLOGO: ADICIONAR PERGUNTA */}
      <Dialog open={isQuestionDialogOpen} onOpenChange={setIsQuestionDialogOpen}>
        <DialogContent className="sm:max-w-[550px] border-0 shadow-2xl p-0 overflow-hidden rounded-2xl">
          <div className="bg-amber-600 p-6 text-white flex justify-between items-center">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <HelpCircle size={24} /> Nova Pergunta
              </DialogTitle>
            </DialogHeader>
            <Button variant="ghost" size="icon" onClick={() => setIsQuestionDialogOpen(false)} className="text-white hover:bg-white/10"><X /></Button>
          </div>
          <div className="p-6 space-y-5 bg-white overflow-y-auto max-h-[70vh]">
            <div className="space-y-4">
              <Label className="font-bold text-slate-700">Tipo de Interação</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'MULTIPLE_CHOICE', label: 'Múltipla Escolha', icon: HelpCircle, color: 'text-blue-500' },
                  { id: 'WORD_SEARCH', label: 'Caça Palavras', icon: Grid3X3, color: 'text-emerald-500' },
                  { id: 'ORDERING', label: 'Reordenação', icon: ListOrdered, color: 'text-amber-500' },
                  { id: 'HOTSPOT', label: 'Clique na Imagem', icon: MousePointer2, color: 'text-rose-500' },
                  { id: 'FILE', label: 'Envio de Imagem', icon: Upload, color: 'text-violet-500' },
                  { id: 'HANGMAN', label: 'Jogo da Forca', icon: Skull, color: 'text-orange-500' }
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setQuestionType(t.id as CourseQuestionType)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left",
                      questionType === t.id 
                        ? "border-blue-600 bg-blue-50" 
                        : "border-slate-100 hover:border-slate-200"
                    )}
                  >
                    <t.icon className={cn("shrink-0", t.color)} size={20} />
                    <span className={cn("text-xs font-bold", questionType === t.id ? "text-blue-900" : "text-slate-600")}>
                      {t.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-bold text-slate-700">Pergunta / Instrução *</Label>
              <Textarea
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="Ex: Encontre os termos de segurança no quadro abaixo..."
                className="min-h-[80px] border-slate-200"
              />
            </div>

            {/* Configuração Dinâmica por Tipo */}
            {questionType === 'MULTIPLE_CHOICE' && (
              <div className="space-y-3 animate-in fade-in duration-300">
                <div className="flex items-center justify-between">
                  <Label className="font-bold text-slate-700">Alternativas</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setQuestionOptions([...questionOptions, { text: '', isCorrect: false }])}
                    className="text-xs text-blue-600"
                  >
                    <Plus size={14} className="mr-1" /> Adicionar
                  </Button>
                </div>
                {questionOptions.map((option, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setQuestionOptions(prev => prev.map((o, i) => ({
                          ...o,
                          isCorrect: i === idx
                        })));
                      }}
                      className={cn(
                        "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                        option.isCorrect ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300"
                      )}
                    >
                      {option.isCorrect && <CheckCircle2 size={14} />}
                    </button>
                    <Input
                      value={option.text}
                      onChange={(e) => {
                        const updated = [...questionOptions];
                        updated[idx].text = e.target.value;
                        setQuestionOptions(updated);
                      }}
                      placeholder={`Alternativa ${idx + 1}`}
                      className="flex-1 border-slate-200"
                    />
                    {questionOptions.length > 2 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setQuestionOptions(prev => prev.filter((_, i) => i !== idx))}
                        className="h-8 w-8 text-slate-400 hover:text-red-500"
                      >
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {questionType === 'WORD_SEARCH' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="space-y-2">
                  <Label className="font-bold text-slate-700 text-[10px] uppercase tracking-wider">Dificuldade do Desafio</Label>
                  <div className="grid grid-cols-3 gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200">
                    {['EASY', 'MEDIUM', 'HARD'].map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setWordSearchDifficulty(level as 'EASY' | 'MEDIUM' | 'HARD')}
                        className={cn(
                          "py-2 rounded-md text-[10px] font-bold transition-all",
                          wordSearchDifficulty === level 
                            ? "bg-white text-blue-600 shadow-sm ring-1 ring-slate-200" 
                            : "text-slate-500 hover:text-slate-700"
                        )}
                      >
                        {level === 'EASY' ? 'FÁCIL' : level === 'MEDIUM' ? 'MÉDIO' : 'DIFÍCIL'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <Label className="font-bold text-slate-700">Palavras Alvo</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setWordSearchWords([...wordSearchWords, ''])}
                    className="text-xs text-blue-600 font-bold"
                  >
                    <Plus size={14} className="mr-1" /> Adicionar
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {wordSearchWords.map((word, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input 
                        value={word} 
                        onChange={e => {
                          const updated = [...wordSearchWords];
                          updated[idx] = e.target.value.toUpperCase();
                          setWordSearchWords(updated);
                        }}
                        placeholder={`Palavra ${idx + 1}`}
                        className="h-9 text-sm font-medium"
                      />
                      {wordSearchWords.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setWordSearchWords(prev => prev.filter((_, i) => i !== idx))}
                          className="h-8 w-8 text-slate-400 hover:text-red-500"
                        >
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100/50">
                   <p className="text-[10px] text-blue-600 italic">O grid será gerado automaticamente ao salvar.</p>
                </div>
              </div>
            )}

            {questionType === 'ORDERING' && (
              <div className="space-y-3 animate-in fade-in duration-300">
                <div className="flex items-center justify-between">
                  <Label className="font-bold text-slate-700">Itens em Ordem Correta</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setOrderingItems([...orderingItems, ''])}
                    className="text-xs text-blue-600"
                  >
                    <Plus size={14} className="mr-1" /> Adicionar
                  </Button>
                </div>
                <div className="space-y-2">
                  {orderingItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                        {idx + 1}
                      </div>
                      <Input 
                        value={item} 
                        onChange={e => {
                          const updated = [...orderingItems];
                          updated[idx] = e.target.value;
                          setOrderingItems(updated);
                        }}
                        placeholder={`Item ${idx + 1}`}
                        className="h-9 text-sm flex-1"
                      />
                      {orderingItems.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setOrderingItems(prev => prev.filter((_, i) => i !== idx))}
                          className="h-8 w-8 text-slate-400 hover:text-red-500"
                        >
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500 italic">O aluno verá estes itens embaralhados e deve colocá-los nesta ordem.</p>
              </div>
            )}

            {questionType === 'HOTSPOT' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="space-y-2">
                  <Label className="font-bold text-slate-700">Imagem de Referência</Label>
                  {questionImageUrl ? (
                    <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                      <img src={questionImageUrl} alt="Preview" className="w-full max-h-40 object-contain" />
                      <button
                        onClick={() => setQuestionImageUrl('')}
                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-slate-300 rounded-lg hover:border-amber-400 hover:bg-amber-50/50 transition-all cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file || !company?.id) return;
                          try {
                            toast.loading('Enviando imagem...');
                            const publicUrl = await uploadToSupabase(
                              file,
                              'course-materials',
                              `courses/${courseId}/questions/hotspot`
                            );
                            setQuestionImageUrl(publicUrl);
                            toast.dismiss();
                            toast.success('Imagem enviada!');
                          } catch (err) {
                            toast.dismiss();
                            const error = err as Error;
                            Logger.error("Erro ao enviar imagem de hotspot:", error);
                            toast.error('Erro ao enviar imagem');
                          }
                        }}
                      />
                      <Upload size={24} className="text-slate-400" />
                      <span className="text-sm font-medium text-slate-500">Clique para enviar uma imagem</span>
                      <span className="text-[10px] text-slate-400">JPG, PNG, WEBP</span>
                    </label>
                  )}
                </div>
                {questionImageUrl && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="font-bold text-slate-700">Áreas de Clique (Hotspots)</Label>
                      {hotspotPoints.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setHotspotPoints([])}
                          className="text-xs text-red-500"
                        >
                          <Trash2 size={14} className="mr-1" /> Limpar Tudo
                        </Button>
                      )}
                    </div>
                    
                    <div 
                      className="relative rounded-lg overflow-hidden border-2 border-dashed border-slate-200 cursor-crosshair group"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = ((e.clientX - rect.left) / rect.width) * 100;
                        const y = ((e.clientY - rect.top) / rect.height) * 100;
                        setHotspotPoints([...hotspotPoints, { id: Math.random().toString(36), x, y, radius: 5 }]);
                      }}
                    >
                      <img src={questionImageUrl} alt="Preview" className="w-full h-auto opacity-70 group-hover:opacity-100 transition-opacity" />
                      {hotspotPoints.map((hs, idx) => (
                        <div 
                          key={hs.id} 
                          className="absolute -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-rose-500/50 border-2 border-rose-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold"
                          style={{ left: `${hs.x}%`, top: `${hs.y}%` }}
                        >
                          {idx + 1}
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setHotspotPoints(hotspotPoints.filter(p => p.id !== hs.id));
                            }}
                            className="absolute -top-2 -right-2 bg-red-600 rounded-full p-0.5"
                          >
                            <X size={8} />
                          </button>
                        </div>
                      ))}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <p className="text-[10px] font-bold text-slate-400 bg-white/80 px-2 py-1 rounded">CLIQUE NA IMAGEM PARA MARCAR O PONTO CORRETO</p>
                      </div>
                    </div>

                    {/* Lista Gerencial de Pontos */}
                    {hotspotPoints.length > 0 && (
                      <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                        <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-2">Pontos Definidos ({hotspotPoints.length})</h4>
                        <div className="flex flex-wrap gap-2">
                          {hotspotPoints.map((hs, idx) => (
                            <div key={hs.id} className="flex items-center gap-1.5 bg-white px-2 py-1 rounded border border-slate-200 text-[10px] font-medium text-slate-600">
                              <span className="w-4 h-4 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center font-bold">{idx + 1}</span>
                              X:{Math.round(hs.x)}% Y:{Math.round(hs.y)}%
                              <button onClick={() => setHotspotPoints(hotspotPoints.filter(p => p.id !== hs.id))} className="text-slate-400 hover:text-red-500 transition-colors">
                                <X size={10} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {questionType === 'HANGMAN' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="space-y-2">
                  <Label className="font-bold text-slate-700">Palavra Secreta *</Label>
                  <Input
                    value={hangmanWord}
                    onChange={(e) => setHangmanWord(e.target.value.toUpperCase().replace(/[^A-ZÁÉÍÓÚÂÊÔÃÕÇ ]/g, ''))}
                    placeholder="Ex: SEGURANÇA"
                    className="font-mono text-lg tracking-widest uppercase"
                    maxLength={20}
                  />
                  <p className="text-[10px] text-slate-400 italic">
                    Apenas letras. Máx 20 caracteres. Espaços separam palavras compostas.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="font-bold text-slate-700">Máximo de Erros Permitidos</Label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min={3}
                      max={10}
                      step={1}
                      value={hangmanMaxAttempts}
                      onChange={(e) => setHangmanMaxAttempts(Number(e.target.value))}
                      className="flex-1 accent-orange-500"
                    />
                    <span className="text-2xl font-black text-slate-700 w-8 text-center">
                      {hangmanMaxAttempts}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    {hangmanMaxAttempts <= 4 ? '⚠️ Difícil' : hangmanMaxAttempts <= 6 ? '⚡ Moderado' : '✅ Fácil'}
                    {' — '}{hangmanMaxAttempts} chances antes de ser enforcado
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="font-bold text-slate-700">Dica (Opcional)</Label>
                  <Input
                    value={hangmanHint}
                    onChange={(e) => setHangmanHint(e.target.value)}
                    placeholder="Ex: Equipamento obrigatório no canteiro de obras"
                    maxLength={100}
                  />
                </div>

                {hangmanWord && (
                  <div className="p-4 bg-slate-900 rounded-xl border border-slate-700">
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-3">Preview</p>
                    <div className="flex justify-center gap-1.5 flex-wrap">
                      {hangmanWord.split('').map((char, i) => (
                        <div key={i} className={cn(
                          "w-8 h-10 rounded flex items-center justify-center text-lg font-black",
                          char === ' ' ? 'bg-transparent w-3' : 'bg-white/10 text-white border-b-2 border-orange-500'
                        )}>
                          {char !== ' ' ? '_' : ''}
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-500 text-center mt-2">{hangmanWord.replace(/ /g, '').length} letras • {hangmanMaxAttempts} chances</p>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2 border-t pt-4">
              <Label className="font-bold text-slate-700 flex items-center gap-2">
                <AlertCircle size={14} className="text-amber-500" /> Explicação (opcional)
              </Label>
              <Textarea
                value={questionExplanation}
                onChange={(e) => setQuestionExplanation(e.target.value)}
                placeholder="Explicação exibida após a resposta..."
                className="min-h-[60px] border-slate-200"
              />
            </div>
          </div>
          <DialogFooter className="p-4 bg-slate-50 border-t flex gap-3">
            <Button variant="ghost" onClick={() => setIsQuestionDialogOpen(false)} className="flex-1">Cancelar</Button>
            <Button
              className="flex-1 bg-amber-600 hover:bg-amber-700"
              disabled={
                isSubmitting || 
                !questionText.trim() ||
                (questionType === 'MULTIPLE_CHOICE' && (!questionOptions.some(o => o.isCorrect) || questionOptions.some(o => !o.text.trim()))) ||
                (questionType === 'WORD_SEARCH' && wordSearchWords.every(w => !w.trim())) ||
                (questionType === 'ORDERING' && orderingItems.every(i => !i.trim())) ||
                (questionType === 'HOTSPOT' && (!questionImageUrl.trim() || hotspotPoints.length === 0)) ||
                (questionType === 'HANGMAN' && !hangmanWord.trim())
              }
              onClick={async () => {
                if (!questionModuleId) return;
                setIsSubmitting(true);
                try {
                  // Preparar configuração baseada no tipo
                  let config: Record<string, unknown> = {};
                  if (questionType === 'WORD_SEARCH') {
                    const wordsForGrid = wordSearchWords.map(w => w.trim().toUpperCase()).filter(Boolean);
                    if (wordsForGrid.length === 0) throw new Error("Adicione pelo menos uma palavra.");
                    
                    const longestWord = Math.max(...wordsForGrid.map(w => w.length));
                    const baseSize = wordSearchDifficulty === 'HARD' ? 14 : wordSearchDifficulty === 'MEDIUM' ? 12 : 10;
                    const size = Math.max(baseSize, longestWord + 2); 
                    const grid = Array(size).fill(null).map(() => Array(size).fill(''));
                    
                    const directionsByDifficulty = {
                      EASY: [[0, 1], [1, 0]], 
                      MEDIUM: [[0, 1], [1, 0], [1, 1], [-1, 1]], 
                      HARD: [[0, 1], [1, 0], [1, 1], [-1, 1], [0, -1], [-1, 0], [-1, -1], [1, -1]] 
                    };
                    const directions = directionsByDifficulty[wordSearchDifficulty];

                    // Posicionar palavras
                    const placedWords: string[] = [];
                    const sortedWords = [...wordsForGrid].sort((a, b) => b.length - a.length);

                    for (const word of sortedWords) {
                      let placed = false;
                      let attempts = 0;
                      while (!placed && attempts < 1000) { 
                        const [dr, dc] = directions[Math.floor(Math.random() * directions.length)];
                        const r = Math.floor(Math.random() * size);
                        const c = Math.floor(Math.random() * size);
                        
                        let fits = true;
                        if (r + dr * (word.length - 1) < 0 || r + dr * (word.length - 1) >= size) fits = false;
                        if (c + dc * (word.length - 1) < 0 || c + dc * (word.length - 1) >= size) fits = false;
                        
                        if (fits) {
                          for (let i = 0; i < word.length; i++) {
                            const currChar = grid[r + i * dr][c + i * dc];
                            if (currChar !== '' && currChar !== word[i]) {
                              fits = false;
                              break;
                            }
                          }
                        }

                        if (fits) {
                          for (let i = 0; i < word.length; i++) {
                            grid[r + i * dr][c + i * dc] = word[i];
                          }
                          placed = true;
                          placedWords.push(word);
                        }
                        attempts++;
                      }
                    }

                    if (placedWords.length < sortedWords.length) {
                       const missing = sortedWords.filter(w => !placedWords.includes(w));
                       toast.error(`Falha ao gerar grid: Não foi possível encaixar "${missing.join(', ')}". Tente reduzir o número de palavras ou simplificar.`);
                       setIsSubmitting(false);
                       return;
                    }

                    for (let r = 0; r < size; r++) {
                      for (let c = 0; c < size; c++) {
                        if (grid[r][c] === '') {
                          grid[r][c] = String.fromCharCode(65 + Math.floor(Math.random() * 26));
                        }
                      }
                    }
                    config = { words: placedWords, grid, difficulty: wordSearchDifficulty };
                  } else if (questionType === 'ORDERING') {
                    config = { items: orderingItems.map(i => i.trim()).filter(Boolean) };
                  } else if (questionType === 'HOTSPOT') {
                    config = { hotspots: hotspotPoints };
                  } else if (questionType === 'HANGMAN') {
                    config = {
                      word: hangmanWord.trim().toUpperCase(),
                      maxAttempts: hangmanMaxAttempts,
                      hint: hangmanHint.trim() || null
                    };
                  }

                  const questionData = {
                    id: editingQuestionId || undefined,
                    module_id: questionModuleId,
                    question_text: questionText.trim(),
                    explanation: questionExplanation.trim() || null,
                    question_type: questionType,
                    configuration: config,
                    image_url: questionImageUrl || null,
                    order_index: 0
                  };

                  let optionsData = undefined;
                  if (questionType === 'MULTIPLE_CHOICE') {
                    optionsData = questionOptions.map(opt => ({
                      option_text: opt.text.trim(),
                      is_correct: opt.isCorrect
                    }));
                  }

                  await courseService.saveQuestion(questionData, optionsData);

                  toast.success(editingQuestionId ? 'Pergunta atualizada!' : 'Pergunta adicionada!');
                  setIsQuestionDialogOpen(false);
                  setEditingQuestionId(null);
                  setQuestionText('');
                  setQuestionExplanation('');
                  setQuestionType('MULTIPLE_CHOICE');
                  setQuestionImageUrl('');
                  setWordSearchWords(['']);
                  setOrderingItems(['']);
                  setHotspotPoints([]);
                  setHangmanWord('');
                  setHangmanMaxAttempts(6);
                  setHangmanHint('');
                  setQuestionOptions([
                    { text: '', isCorrect: false },
                    { text: '', isCorrect: false },
                    { text: '', isCorrect: false },
                    { text: '', isCorrect: false }
                  ]);
                  globalMutate(`course_questions_${questionModuleId}`);
                  mutateModules();
                } catch (err: unknown) {
                  Logger.error(`Erro ao salvar pergunta:`, err);
                  toast.error(editingQuestionId ? 'Erro ao atualizar pergunta' : 'Erro ao criar pergunta');
                } finally {
                  setIsSubmitting(false);
                }
              }}
            >
              {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2" size={18} />} Salvar Pergunta
            </Button>
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
  onDeleteContent,
  onAddQuestion,
  onEditQuestion
}: { 
  module: { id: string; title: string }, 
  onDelete: () => void, 
  linkName: string, 
  onAddContent: () => void,
  onDeleteContent: (id: string) => void,
  onAddQuestion: (moduleId: string) => void,
  onEditQuestion: (question: CoursePhaseQuestion) => void
}) => {
  const { contents, mutate: mutateContents } = useCourseContents(module.id);
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(module.title);

  const handleUpdate = async () => {
    try {
      await courseService.updateModule(module.id, { title });
      setIsEditing(false);
      toast.success("Módulo renomeado");
      mutateModules(); // Refresh modules from parent context
    } catch (err) {
      Logger.error("Erro ao renomear módulo:", err);
      toast.error("Erro ao renomear módulo.");
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
           
           {/* Seção de Perguntas da Fase */}
           <ModuleQuestionsSection 
              moduleId={module.id} 
              onAddQuestion={onAddQuestion} 
              onEditQuestion={onEditQuestion} 
            />
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
      case 'HTML': return <FileCode size={16} className="text-purple-500" />;
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

// Subcomponente para perguntas do módulo
const ModuleQuestionsSection = ({ 
  moduleId, 
  onAddQuestion, 
  onEditQuestion 
}: { 
  moduleId: string; 
  onAddQuestion: (moduleId: string) => void;
  onEditQuestion: (question: CoursePhaseQuestion) => void;
}) => {
  const { questions, mutate } = useCourseQuestions(moduleId);
  
  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm("Remover esta pergunta?")) return;
    try {
      // IMPLEMENTAÇÃO DE SOFT DELETE
      const { error } = await supabase
        .from('course_phase_questions')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', questionId);
        
      if (error) throw error;
      mutate();
      toast.success('Pergunta removida');
    } catch (err) {
      const error = err as Error;
      Logger.error("Erro ao excluir pergunta:", error);
      toast.error('Erro ao remover pergunta');
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-slate-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-xs font-bold text-amber-600">
          <HelpCircle size={14} />
          <span>Perguntas da Fase ({questions.length})</span>
        </div>
        <Button onClick={() => onAddQuestion(moduleId)} variant="outline" size="sm" className="text-xs gap-1 border-amber-200 text-amber-700 hover:bg-amber-50">
          <Plus size={14} /> Nova Pergunta
        </Button>
      </div>
      <div className="space-y-2">
        {questions.map((q, idx) => (
          <div key={q.id} className="bg-white p-3 rounded-lg border border-slate-100 flex items-start justify-between group">
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium text-slate-700 truncate">
                <span className="text-slate-400 mr-1">{idx + 1}.</span>
                {q.question_text}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-slate-400 uppercase font-bold bg-slate-100 px-1 rounded">{q.question_type}</span>
                <span className="text-[10px] text-slate-400">
                  {q.question_type === 'MULTIPLE_CHOICE' ? `${q.options?.length || 0} alternativas` : 
                   q.question_type === 'WORD_SEARCH' ? `${q.configuration?.words?.length || 0} palavras` :
                   q.question_type === 'ORDERING' ? `${q.configuration?.items?.length || 0} itens` :
                   q.question_type === 'FILE' ? 'Envio de imagem' :
                   q.question_type === 'HANGMAN' ? `"${q.configuration?.word}" (${q.configuration?.maxAttempts} chances)` :
                   `${q.configuration?.hotspots?.length || 0} pontos`}
                </span>
                {(q.question_type === 'MULTIPLE_CHOICE' ? q.options?.some(o => o.is_correct) : true) && (
                  <span className="text-[10px] text-emerald-500 flex items-center gap-0.5">
                    <CheckCircle2 size={10} /> Configurado
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => onEditQuestion(q)} 
                className="h-7 w-7 text-slate-400 hover:text-blue-600"
              >
                <Edit2 size={12} />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => handleDeleteQuestion(q.id)} 
                className="h-7 w-7 text-slate-300 hover:text-red-500"
              >
                <Trash2 size={12} />
              </Button>
            </div>
          </div>
        ))}
        {questions.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-2">Nenhuma pergunta nesta fase. Opcional — o aluno avançará diretamente.</p>
        )}
      </div>
    </div>
  );
};
