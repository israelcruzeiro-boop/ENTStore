import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  useCourseModules, 
  useCourseContents, 
  useCourses,
  useCourseQuestions,
  useCourseEnrollment,
  startEnrollment,
  submitCourseAnswer,
  completeEnrollment,
  updateEnrollmentProgress,
  useCourseAnswers,
  useOrgStructure
} from '../../hooks/useSupabaseData';
import { checkCourseAccess } from '../../lib/permissions';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  FileText, 
  Loader2,
  ArrowLeft,
  X,
  HelpCircle,
  Layers,
  FileCode,
  Image as ImageIcon,
  Music,
  CheckCircle2,
  Menu,
  BookOpen,
  Trophy,
  Zap,
  Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LMSMentor } from '../../components/user/LMSMentor';
import { Viewer } from '../../components/user/Viewer';
import { CourseQuestionPlayer } from '../../components/user/CourseQuestionPlayer';
import { CourseResultScreen } from '../../components/user/CourseResultScreen';
import type { Content } from '../../types';
import { printDiploma, type DiplomaTemplateId } from '../../components/user/CourseDiploma';
import { supabase } from '../../lib/supabaseClient';

const CircularProgress = ({ progress, size = 60, strokeWidth = 5, primaryColor = '#3b82f6' }: { progress: number, size?: number, strokeWidth?: number, primaryColor?: string }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  // Cor dinâmica baseada no progresso
  const getProgressColor = () => {
    if (progress < 30) return '#ef4444'; // Red
    if (progress < 70) return '#f59e0b'; // Amber
    return primaryColor; // Green/Blue
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-white/10"
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={getProgressColor()}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
          strokeLinecap="round"
          className="drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] font-black tabular-nums text-white">{progress}%</span>
      </div>
    </div>
  );
};

export const UserCoursePlayer = () => {
  const { companySlug, courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tenantCompany } = useTenant();
  const { courses, isLoading: loadingCourses } = useCourses(tenantCompany?.id);
  const { orgUnits, orgTopLevels, isLoading: orgLoading } = useOrgStructure(tenantCompany?.id);
  const course = courses.find(c => c.id === courseId);
  
  // Verificação de acesso
  useEffect(() => {
    if (!loadingCourses && !orgLoading && courses.length > 0 && courseId && user) {
      const currentCourse = courses.find(c => c.id === courseId);
      if (currentCourse) {
        const hasAccess = checkCourseAccess(currentCourse, user, orgUnits, orgTopLevels);
        if (!hasAccess) {
          toast.error('Você não tem permissão para acessar este conteúdo.');
          navigate(`/${companySlug}/home`);
        }
      }
    }
  }, [loadingCourses, orgLoading, courses, courseId, user, orgUnits, orgTopLevels, navigate, companySlug]);

  const { modules, isLoading: modulesLoading } = useCourseModules(courseId);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [activeContentId, setActiveContentId] = useState<string | null>(null);
  const [showNav, setShowNav] = useState(false);
  const [showPhaseQuestions, setShowPhaseQuestions] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);
  
  // Enrollment (matrícula e tracking)
  const { enrollment, mutate: mutateEnrollment } = useCourseEnrollment(courseId, user?.id);

  // Inicializa a contagem a partir do banco de dados na primeira carga
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);

  useEffect(() => {
    if (enrollment && enrollment.status === 'IN_PROGRESS') {
      if (enrollment.total_correct) setTotalCorrect(enrollment.total_correct);
      if (enrollment.total_questions) setTotalQuestions(enrollment.total_questions);
    }
  }, [enrollment]);

  // Hook de respostas carregado para o ID desta matrícula
  const { answers: savedAnswers, mutate: mutateAnswers } = useCourseAnswers(enrollment?.id);

  // Busca conteúdos do módulo ativo
  const { contents: activeModuleContents } = useCourseContents(activeModuleId || undefined);
  
  // Busca perguntas do módulo ativo
  const { questions: moduleQuestions } = useCourseQuestions(activeModuleId || undefined);

  // Encontra o conteúdo atual
  const currentContent = activeModuleContents?.find(c => c.id === activeContentId);

  // Índices para UI
  const currentModuleIndex = modules.findIndex(m => m.id === activeModuleId);
  const currentContentIndex = activeModuleContents.findIndex(c => c.id === activeContentId);

  // Inicia enrollment ao abrir o curso (APENAS se não existir ou se não estiver COMPLETED)
  useEffect(() => {
    if (courseId && user?.id && course?.company_id && !enrollment) {
      startEnrollment(courseId, user.id, course.company_id)
        .then(() => mutateEnrollment())
        .catch(err => console.error('Error starting enrollment:', err));
    }
  }, [courseId, user?.id, course?.company_id, enrollment, mutateEnrollment]);

  // Se enrollment já está completed, mostra resultado (mas não se estiver em modo revisão)
  useEffect(() => {
    if (enrollment?.status === 'COMPLETED' && !isReviewMode) {
      setShowResult(true);
    }
  }, [enrollment, isReviewMode]);

  // Recuperação de Progresso Salvo
  useEffect(() => {
    if (enrollment && enrollment.status === 'IN_PROGRESS') {
      if (enrollment.current_module_id && !activeModuleId) {
        setActiveModuleId(enrollment.current_module_id);
      } else if (modules.length > 0 && !activeModuleId) {
        setActiveModuleId(modules[0].id);
      }

      if (enrollment.current_content_id && !activeContentId) {
        setActiveContentId(enrollment.current_content_id);
      } else if (activeModuleContents.length > 0 && !activeContentId) {
        setActiveContentId(activeModuleContents[0].id);
      }
    } else if (isReviewMode) {
      // Em modo revisão, começar do primeiro módulo
      if (modules.length > 0 && !activeModuleId) {
        setActiveModuleId(modules[0].id);
      }
      if (activeModuleContents.length > 0 && !activeContentId) {
        setActiveContentId(activeModuleContents[0].id);
      }
    } else {
      if (modules.length > 0 && !activeModuleId) {
        setActiveModuleId(modules[0].id);
      }
      if (activeModuleContents.length > 0 && !activeContentId) {
        setActiveContentId(activeModuleContents[0].id);
      }
    }
  }, [enrollment, modules, activeModuleContents, activeModuleId, activeContentId, isReviewMode]);

  // Direcionamento automático para perguntas pendentes em cursos em andamento
  useEffect(() => {
    if (
      enrollment?.status === 'IN_PROGRESS' &&
      activeModuleId &&
      activeModuleContents.length > 0 &&
      activeContentId &&
      moduleQuestions.length > 0 &&
      savedAnswers &&
      !showPhaseQuestions
    ) {
      // Verificar se é o último conteúdo do módulo atual
      const lastContent = activeModuleContents[activeModuleContents.length - 1];
      if (activeContentId === lastContent?.id) {
        // Verificar quais questões do módulo atual já foram respondidas
        const moduleQuestionIds = moduleQuestions.map(q => q.id);
        const answeredIds = savedAnswers.filter(a => moduleQuestionIds.includes(a.question_id)).map(a => a.question_id);
        const hasPendingQuestions = moduleQuestionIds.some(qId => !answeredIds.includes(qId));
        
        if (hasPendingQuestions) {
          // Há perguntas não respondidas neste módulo — ir direto para elas
          setShowPhaseQuestions(true);
        }
      }
    }
  }, [enrollment?.status, activeModuleId, activeModuleContents, activeContentId, moduleQuestions, savedAnswers, showPhaseQuestions]);

  // Salvar Progresso sempre que mudar de módulo ou conteúdo
  useEffect(() => {
    if (enrollment && enrollment.status === 'IN_PROGRESS' && activeModuleId && activeContentId) {
      updateEnrollmentProgress(enrollment.id, activeModuleId, activeContentId).catch(err => {
        console.error('Failed to update progress', err);
      });
    }
  }, [enrollment, activeModuleId, activeContentId]);

  const finishCourse = useCallback(async (correct: number, total: number) => {
    // Tenta salvar no banco se enrollment existir
    if (enrollment) {
      try {
        await completeEnrollment(enrollment.id, correct, total, enrollment.started_at);
        await mutateEnrollment();
      } catch (err) {
        console.error('Error completing enrollment:', err);
        // Não bloqueia — ainda mostra o resultado
      }
    } else {
      console.warn('Enrollment não encontrado — exibindo resultado local.');
    }
    // SEMPRE mostra o resultado, com ou sem enrollment salvo
    setShowResult(true);
    toast.success('Curso concluído!');
  }, [enrollment, mutateEnrollment]);

  const handleNext = useCallback(() => {
    const currentIndex = activeModuleContents.findIndex(c => c.id === activeContentId);
    
    if (currentIndex < activeModuleContents.length - 1) {
      setActiveContentId(activeModuleContents[currentIndex + 1].id);
      setShowPhaseQuestions(false);
    } else {
      if (moduleQuestions.length > 0 && !showPhaseQuestions) {
        setShowPhaseQuestions(true);
        return;
      }

      const modIdx = modules.findIndex(m => m.id === activeModuleId);
      if (modIdx < modules.length - 1) {
        setActiveModuleId(modules[modIdx + 1].id);
        setActiveContentId(null);
        setShowPhaseQuestions(false);
      } else if (!isReviewMode) {
        // Curso sem perguntas na última fase — finaliza direto (só em modo normal)
        finishCourse(totalCorrect, totalQuestions);
      }
    }
  }, [activeModuleContents, activeContentId, modules, activeModuleId, moduleQuestions, showPhaseQuestions, totalCorrect, totalQuestions, finishCourse, isReviewMode]);

  const handlePrevious = () => {
    if (showPhaseQuestions) {
      setShowPhaseQuestions(false);
      return;
    }
    const currentIndex = activeModuleContents.findIndex(c => c.id === activeContentId);
    if (currentIndex > 0) {
      setActiveContentId(activeModuleContents[currentIndex - 1].id);
      setShowPhaseQuestions(false);
    } else if (isReviewMode) {
      // Em review mode, voltar para o módulo anterior
      const modIdx = modules.findIndex(m => m.id === activeModuleId);
      if (modIdx > 0) {
        setActiveModuleId(modules[modIdx - 1].id);
        setActiveContentId(null);
        setShowPhaseQuestions(false);
      }
    }
  };

  const handlePhaseQuestionsComplete = async (correct: number, total: number, answers: Record<string, { optionId?: string; complexAnswer?: any; isCorrect: boolean }>) => {
    const newTotalCorrect = totalCorrect + correct;
    const newTotalQuestions = totalQuestions + total;
    setTotalCorrect(newTotalCorrect);
    setTotalQuestions(newTotalQuestions);

    // Salva respostas (se enrollment existir)
    if (enrollment) {
      for (const [questionId, answer] of Object.entries(answers)) {
        try {
          await submitCourseAnswer(enrollment.id, questionId, answer.optionId, answer.isCorrect, answer.complexAnswer);
        } catch (err) {
          console.error('Error saving answer:', err);
        }
      }
      await mutateAnswers();
    }

    const modIdx = modules.findIndex(m => m.id === activeModuleId);
    if (modIdx < modules.length - 1) {
      setActiveModuleId(modules[modIdx + 1].id);
      setActiveContentId(null);
      setShowPhaseQuestions(false);
    } else {
      // Último módulo — finaliza o curso
      await finishCourse(newTotalCorrect, newTotalQuestions);
    }
  };



  const calculateProgress = () => {
    if (modules.length === 0) return 0;
    const modIdx = modules.findIndex(m => m.id === activeModuleId);
    const moduleProgress = modIdx / modules.length;
    const contentProgress = activeModuleContents.length > 0 
      ? (currentContentIndex + 1) / activeModuleContents.length / modules.length 
      : 0;
    return Math.min(100, Math.round((moduleProgress + contentProgress) * 100));
  };

  const getContentIcon = (type: string, size = 16) => {
    switch(type) {
      case 'VIDEO': return <Play size={size} />;
      case 'HTML': return <FileCode size={size} />;
      case 'IMAGE': return <ImageIcon size={size} />;
      case 'AUDIO': case 'MUSIC': return <Music size={size} />;
      case 'PDF': return <FileText size={size} />;
      default: return <FileText size={size} />;
    }
  };

  const getImageUrl = (url?: string | null) => {
    if (!url) return undefined;
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    const { data } = supabase.storage.from('company-assets').getPublicUrl(url);
    return data.publicUrl;
  };

  const coverUrl = getImageUrl(course?.image_url || course?.thumbnail_url);
  const progress = calculateProgress();

  if (modulesLoading) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-gradient-to-b from-slate-900 to-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 rounded-full border-[3px] border-slate-800" />
            <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-blue-500 animate-spin" />
            <BookOpen size={24} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-400" />
          </div>
          <p className="text-slate-500 text-sm font-medium animate-pulse">Carregando curso...</p>
        </div>
      </div>
    );
  }

  if (modules.length === 0) {
    return (
      <div className="flex flex-col h-[100dvh] items-center justify-center text-white" style={{ backgroundColor: '#020617' }}>
        <BookOpen size={64} className="text-blue-500/20 mb-6" />
        <h2 className="text-2xl font-bold mb-3">Curso em construção</h2>
        <p className="text-white/40 text-center max-w-sm mb-8 text-sm leading-relaxed">
          Este treinamento ainda não possui fases ou conteúdos estruturados.
        </p>
        <button 
          onClick={() => navigate(`/${companySlug}/home`)}
          className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-6 py-3 rounded-full text-sm font-bold transition-colors"
        >
          <ArrowLeft size={16} />
          Voltar ao Início
        </button>
      </div>
    );
  }

  // Tela de Resultado
  if ((showResult || enrollment?.status === 'COMPLETED') && !isReviewMode) {
    const scoreForDiploma = enrollment?.score_percent ?? (totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 100);
    
    // Objeto de fallback local caso o salvamento remoto do status COMPLETED atrase
    const finalEnrollment = enrollment?.status === 'COMPLETED' ? enrollment : {
      ...enrollment,
      score_percent: scoreForDiploma,
      completed_at: new Date().toISOString()
    };

    return (
      <CourseResultScreen
        enrollment={finalEnrollment}
        courseTitle={course?.title || 'Curso'}
        passingScore={course?.passing_score || 70}
        onGoHome={() => navigate(`/${companySlug}/home`)}
        localCorrect={totalCorrect}
        localTotal={totalQuestions}
        onReviewQuestions={(finalEnrollment?.total_questions ?? totalQuestions) > 0 ? () => {
          setIsReviewMode(true);
          setShowResult(false);
          setActiveModuleId(null);
          setActiveContentId(null);
          setShowPhaseQuestions(false);
        } : undefined}
        onPrintDiploma={scoreForDiploma >= (course?.passing_score || 70) ? () => {
          const w = printDiploma(
            user?.name || 'Aluno',
            course?.title || 'Curso',
            tenantCompany?.name || 'Empresa',
            finalEnrollment,
            (course?.diploma_template || 'azul') as DiplomaTemplateId,
            tenantCompany?.logo_url
          );
          if (w === false) {
             toast.error('O navegador bloqueou a abertura do certificado. Por favor, libere os pop-ups para este site.');
          }
        } : undefined}
      />
    );
  }

  // Helper: Adaptar CourseContent para a interface Content (necessário para o Viewer)
  const adaptContentForViewer = (cc: typeof currentContent): Content | null => {
    if (!cc) return null;
    return {
      id: cc.id,
      company_id: course?.company_id || '',
      repository_id: '',
      title: cc.title,
      description: cc.description || '',
      thumbnail_url: '',
      type: cc.type === 'AUDIO' ? 'MUSIC' : cc.type as Content['type'],
      url: cc.url,
      embed_url: cc.url, // Garante que embed_url sempre existe para o Viewer
      featured: false,
      recent: false,
      status: 'ACTIVE',
    };
  };

  return (
    <div 
      className="flex flex-col h-[100dvh] text-white overflow-hidden relative"
      style={{
        backgroundColor: '#020617', // slate-950 base
        backgroundImage: tenantCompany?.primary_color ? `radial-gradient(ellipse at top, ${tenantCompany.primary_color}15 0%, #020617 70%)` : undefined
      }}
    >
      
      {/* ===== HEADER ===== */}
      <div className="shrink-0 relative overflow-hidden border-b border-white/[0.04] safe-area-top" style={{ zIndex: 30, backgroundColor: tenantCompany?.primary_color ? `${tenantCompany.primary_color}05` : undefined }}>
        
        {/* Conteúdo do Header */}
        <div className="relative px-4 pt-3 pb-4">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-3">
            <button 
              onClick={() => {
                if (isReviewMode) {
                  setIsReviewMode(false);
                  setShowResult(true);
                  setActiveModuleId(null);
                  setActiveContentId(null);
                  setShowPhaseQuestions(false);
                } else {
                  navigate(`/${companySlug}/home`);
                }
              }} 
              className="flex items-center gap-1.5 text-white/60 hover:text-white transition-colors active:scale-95"
            >
              <ArrowLeft size={18} />
              <span className="text-xs font-medium hidden sm:inline">{isReviewMode ? 'Voltar ao Resultado' : 'Voltar'}</span>
            </button>
            {isReviewMode && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full">
                <Eye size={12} className="text-blue-400" />
                <span className="text-[10px] font-bold text-blue-300 uppercase tracking-wider">Modo Revisão</span>
              </div>
            )}

            <div className="flex items-center gap-3">
              {/* Barra Circular de Progresso */}
              <CircularProgress 
                progress={progress} 
                primaryColor={tenantCompany?.primary_color || '#3b82f6'} 
                size={48} 
              />

              <button
                onClick={() => setShowNav(!showNav)}
                className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-all active:scale-95 shadow-inner"
              >
                {showNav ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>

          {/* Curso info */}
          <div className="flex items-center gap-3">
            {coverUrl && (
              <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10 shadow-lg shrink-0">
                <img src={coverUrl} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-sm font-bold text-white truncate leading-tight">{course?.title}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/20 hover:bg-blue-500/20 text-[9px] uppercase px-2 py-0">
                  Fase {currentModuleIndex + 1}/{modules.length}
                </Badge>
                <span className="text-[10px] text-white/40 truncate">
                  {showPhaseQuestions 
                    ? '📝 Perguntas' 
                    : currentContent?.title || modules[currentModuleIndex]?.title
                  }
                </span>
              </div>
            </div>
          </div>

          {/* Barra de progresso */}
          <div className="mt-3 relative">
            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: `${progress}%`, backgroundColor: tenantCompany?.primary_color || '#3b82f6' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ===== CONTEÚDO PRINCIPAL ===== */}
      <main className="flex-1 overflow-y-auto overscroll-contain">
        
        {/* HERO COVER HEADER (NO TOPO DO CONTEÚDO) */}
        {coverUrl && (
          <div className="relative w-full h-64 md:h-80 lg:h-96 shrink-0 overflow-hidden mb-2 border-b border-white/[0.04]">
            <motion.div 
              initial={{ scale: 1.1, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="absolute inset-0"
            >
              <img src={coverUrl} alt="Capa" className="w-full h-full object-cover" />
            </motion.div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/40 to-transparent z-10 pointer-events-none" />
            <div className="absolute inset-0 z-10 mix-blend-overlay" style={{ backgroundColor: tenantCompany?.primary_color || '#1e3a8a', opacity: 0.15 }} />
            
            <div className="absolute bottom-8 left-4 md:left-10 z-20 max-w-3xl">
              <motion.div 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="inline-flex items-center gap-1.5 mb-4 px-3 py-1.5 bg-white/10 backdrop-blur-2xl rounded-xl border border-white/20 text-xs font-bold text-white/90 shadow-2xl"
              >
                <BookOpen size={14} className="text-blue-400" /> Trilha de Conhecimento
              </motion.div>
              <motion.h1 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="text-4xl md:text-5xl lg:text-7xl font-black text-white leading-tight drop-shadow-2xl tracking-tighter"
              >
                {course?.title}
              </motion.h1>
            </div>
          </div>
        )}

        <div className="w-full max-w-4xl mx-auto px-4 pt-6 pb-40 space-y-8 relative z-10">
          
          {/* MENTOR CONVERSACIONAL */}
          <LMSMentor 
            progress={progress} 
            isQuiz={showPhaseQuestions} 
            currentContentTitle={currentContent?.title} 
          />
          
          {/* ===== STEP INDICATORS (Horizontais) ===== */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 -mx-1 px-1">
            {activeModuleContents.map((c, idx) => {
              const isActive = activeContentId === c.id && !showPhaseQuestions;
              const isCompleted = idx < currentContentIndex;
              // Em review mode, tudo é acessível; caso contrário, bloquear aulas futuras
              const isLocked = !isReviewMode && idx > currentContentIndex;

              return (
                <button
                  key={c.id}
                  onClick={() => { 
                    if (!isLocked) {
                      setActiveContentId(c.id); 
                      setShowPhaseQuestions(false); 
                    }
                  }}
                  disabled={isLocked}
                  style={isActive ? { background: `linear-gradient(to right, ${tenantCompany?.primary_color || '#2563eb'}, ${tenantCompany?.primary_color || '#3b82f6'}80)` } : {}}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-semibold transition-all duration-300 ${!isLocked ? 'active:scale-95 cursor-pointer' : 'cursor-not-allowed opacity-50'} ${
                    isActive
                      ? 'text-white shadow-lg scale-105'
                      : isCompleted || isReviewMode
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                        : 'bg-white/[0.04] text-white/40 border border-white/[0.06] hover:bg-white/[0.08] hover:text-white/60'
                  }`}
                >
                  {isCompleted || isReviewMode ? (
                    <CheckCircle2 size={13} />
                  ) : (
                    <span className={`${isActive ? 'text-white/80' : ''}`}>{getContentIcon(c.type, 13)}</span>
                  )}
                  <span className="max-w-[90px] truncate">{c.title}</span>
                </button>
              );
            })}
            {moduleQuestions.length > 0 && (() => {
              // Em review mode ou quando o usuário está no último conteúdo, permitir acesso às perguntas
              const isLastContent = currentContentIndex >= activeModuleContents.length - 1;
              const canAccessQuestions = isReviewMode || isLastContent;
              return (
                <button
                  onClick={() => { if (canAccessQuestions) setShowPhaseQuestions(true); }}
                  disabled={!canAccessQuestions}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-semibold transition-all duration-300 ${canAccessQuestions ? 'active:scale-95 cursor-pointer' : 'cursor-not-allowed opacity-50'} ${
                    showPhaseQuestions
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30'
                      : canAccessQuestions
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20'
                        : 'bg-white/[0.04] text-white/30 border border-white/[0.06]'
                  }`}
                >
                  <HelpCircle size={13} />
                  <span>{moduleQuestions.length} Perguntas</span>
                </button>
              );
            })()}
          </div>

          {/* ===== CONTEÚDO / PERGUNTAS ===== */}
          <AnimatePresence mode="wait">
            <motion.div 
              key={`${activeContentId}-${showPhaseQuestions}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="w-full"
            >
              {showPhaseQuestions && moduleQuestions.length > 0 ? (
                <CourseQuestionPlayer 
                  questions={moduleQuestions}
                  phaseTitle={modules.find(m => m.id === activeModuleId)?.title || 'Fase'}
                  primaryColor={tenantCompany?.primary_color}
                  courseThumbnail={coverUrl}
                  onComplete={handlePhaseQuestionsComplete}
                  reviewMode={isReviewMode}
                  initialAnswers={savedAnswers ? Object.fromEntries(
                    savedAnswers
                      .filter(a => moduleQuestions.some(q => q.id === a.question_id))
                      .map(a => [a.question_id, { optionId: a.selected_option_id, complexAnswer: a.complex_answer, isCorrect: a.is_correct }])
                  ) : undefined}
                />
              ) : currentContent ? (
                <div className="space-y-6">
                  {/* Barra de Aproveitamento (Só aparece se houver questões anteriores) */}
                  {totalQuestions > 0 && (
                    <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/20 rounded-lg border border-emerald-500/20 text-emerald-400">
                          <Trophy size={18} />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Aproveitamento</p>
                          <p className="text-lg font-black text-white tabular-nums tracking-tight">
                            {Math.round((totalCorrect / totalQuestions) * 100)}%
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Respostas</p>
                        <p className="text-sm font-bold text-white/80 tabular-nums">
                          {totalCorrect} <span className="text-white/20">/</span> {totalQuestions}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Viewer de Conteúdo */}
                  {currentContent.type === 'HTML' && currentContent.html_content ? (
                    <div className="rounded-3xl overflow-hidden shadow-2xl border border-white/[0.06] bg-white">
                      <div 
                        className="prose prose-slate max-w-none text-slate-800 p-6 md:p-12 text-sm md:text-lg leading-relaxed shadow-inner"
                        dangerouslySetInnerHTML={{ __html: currentContent.html_content }}
                      />
                    </div>
                  ) : (
                    <div className="rounded-3xl overflow-hidden shadow-2xl border border-white/[0.08] ring-1 ring-white/5 bg-black/20">
                      <Viewer content={adaptContentForViewer(currentContent) as Content} />
                    </div>
                  )}
                  
                  {/* Info Card */}
                  <div className="bg-gradient-to-br from-white/[0.06] to-white/[0.02] rounded-3xl p-6 md:p-8 border border-white/[0.1] shadow-2xl backdrop-blur-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
                      {getContentIcon(currentContent.type, 120)}
                    </div>
                    <div className="flex items-start gap-5 relative z-10">
                      <div className="p-4 bg-gradient-to-br from-blue-500/30 to-blue-600/10 rounded-2xl shrink-0 border border-blue-500/20 shadow-xl">
                        {getContentIcon(currentContent.type, 24)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3 mb-2.5">
                          <Badge className="bg-white/10 text-white/70 border-white/10 hover:bg-white/20 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full">
                            {currentContent.type}
                          </Badge>
                          <span className="text-xs font-bold text-white/20 tracking-widest">
                            AULA {currentContentIndex + 1} DE {activeModuleContents.length}
                          </span>
                        </div>
                        <h2 className="text-2xl md:text-3xl font-black text-white leading-tight tracking-tight">{currentContent.title}</h2>
                        {currentContent.description && (
                          <p className="text-sm md:text-base text-white/50 mt-3 leading-relaxed max-w-2xl">{currentContent.description}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Navegação de aulas (Próximo / Anterior) */}
                  <div className="pt-6 grid grid-cols-2 gap-4">
                    <Button
                      variant="ghost"
                      onClick={handlePrevious}
                      disabled={currentContentIndex === 0 && !showPhaseQuestions}
                      className="h-14 rounded-2xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-20"
                    >
                      <ChevronLeft className="mr-2" size={20} /> Aula Anterior
                    </Button>

                    {currentContentIndex < activeModuleContents.length - 1 ? (
                      <Button
                        onClick={handleNext}
                        className="h-14 rounded-2xl text-black font-black text-lg transition-transform active:scale-95 shadow-[0_0_30px_-5px_var(--primary-glow)]"
                        style={{ 
                          backgroundColor: tenantCompany?.primary_color || '#ffffff',
                          '--primary-glow': (tenantCompany?.primary_color || '#ffffff') + '40'
                        } as any}
                      >
                        Próxima Aula <ChevronRight className="ml-2" size={20} />
                      </Button>
                    ) : (
                      <Button
                        onClick={handleNext}
                        className={`h-14 rounded-2xl text-black font-black text-lg transition-transform active:scale-95 shadow-[0_0_30px_-5px_var(--primary-glow)] ${isReviewMode ? '' : 'animate-pulse'}`}
                        style={{ 
                          backgroundColor: isReviewMode 
                            ? (tenantCompany?.primary_color || '#ffffff')
                            : (moduleQuestions.length > 0 ? '#f59e0b' : (tenantCompany?.primary_color || '#ffffff')),
                          '--primary-glow': (isReviewMode 
                            ? (tenantCompany?.primary_color || '#ffffff')
                            : (moduleQuestions.length > 0 ? '#f59e0b' : (tenantCompany?.primary_color || '#ffffff'))) + '40'
                        } as any}
                      >
                        {isReviewMode 
                          ? (moduleQuestions.length > 0 ? 'Ver Perguntas' : 'Próxima Fase')
                          : (moduleQuestions.length > 0 ? 'Iniciar Quiz' : 'Concluir Fase')} 
                        <ChevronRight className="ml-2" size={20} />
                      </Button>
                    )}
                  </div>
                </div>
              ) : activeModuleContents.length === 0 && moduleQuestions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 text-white/20 bg-white/[0.02] rounded-[3rem] border border-white/[0.05] dashed-border">
                  <BookOpen size={64} className="mb-6 opacity-20" />
                  <h3 className="text-white/60 font-black text-2xl mb-2 tracking-tight">Fase em estruturação</h3>
                  <p className="text-sm md:text-base font-medium opacity-40">Os conteúdos desta fase ainda não foram adicionados.</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-32">
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="relative w-16 h-16 mb-6"
                  >
                    <div className="absolute inset-0 rounded-full border-4 border-white/5" />
                    <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500" />
                  </motion.div>
                  <p className="text-sm font-black text-white/40 uppercase tracking-widest animate-pulse">Preparando aula...</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* ===== NAVIGATION PANEL (Bottom Sheet) ===== */}
      {showNav && (
        <>
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 animate-in fade-in duration-200" 
            onClick={() => setShowNav(false)}
          />
          <div className="fixed inset-x-0 bottom-0 z-50 animate-in slide-in-from-bottom duration-300">
            <div className="bg-slate-900 border-t border-white/10 rounded-t-[2rem] max-h-[80dvh] flex flex-col shadow-[0_-10px_50px_rgba(0,0,0,0.5)]">
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1.5 bg-white/15 rounded-full" />
              </div>
              
              {/* Header com capa */}
              <div className="px-5 pb-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-3">
                  {coverUrl && (
                    <div className="w-14 h-14 rounded-xl overflow-hidden border border-white/10 shadow-lg shrink-0">
                      <img src={coverUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-bold text-white truncate">{course?.title}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-white/40">{modules.length} fases</span>
                      <div className="flex items-center gap-1.5">
                        <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all" style={{ width: `${progress}%` }} />
                        </div>
                        <span className="text-[10px] font-bold text-blue-400 tabular-nums">{progress}%</span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowNav(false)} 
                    className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-white/40 hover:text-white active:scale-90"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Lista de fases */}
              <div className="overflow-y-auto overscroll-contain flex-1 px-4 py-4 space-y-5">
                {modules.map((module, mIdx) => (
                  <div key={module.id} className="space-y-1.5">
                    {/* Fase header */}
                    <div className="flex items-center gap-2.5 px-1.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 transition-all duration-300 ${
                        mIdx === currentModuleIndex 
                          ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white ring-2 ring-blue-400/30 shadow-lg shadow-blue-500/20' 
                          : mIdx < currentModuleIndex
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                            : 'bg-white/[0.04] text-white/25 border border-white/[0.06]'
                      }`}>
                        {mIdx < currentModuleIndex ? <CheckCircle2 size={14} /> : mIdx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className={`text-sm font-bold truncate transition-colors ${
                          mIdx === currentModuleIndex ? 'text-white' : 'text-white/50'
                        }`}>{module.title}</h4>
                      </div>
                      {mIdx === currentModuleIndex && (
                        <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/20 text-[9px] uppercase shrink-0">
                          Atual
                        </Badge>
                      )}
                    </div>

                    {/* Conteúdos da fase */}
                    <NavModuleContents 
                      moduleId={module.id} 
                      activeContentId={activeContentId}
                      isCurrentModule={mIdx === currentModuleIndex}
                      onSelect={(id) => {
                        setActiveModuleId(module.id);
                        setActiveContentId(id);
                        setShowPhaseQuestions(false);
                        setShowNav(false);
                      }}
                      getIcon={getContentIcon}
                    />

                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Safe area + scrollbar styles */}
      <style>{`
        .safe-area-top { padding-top: env(safe-area-inset-top); }
        .safe-area-bottom { padding-bottom: env(safe-area-inset-bottom); }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

// Sub-componente para listar conteúdos de um módulo na navegação
const NavModuleContents = ({ 
  moduleId, 
  activeContentId, 
  isCurrentModule,
  onSelect,
  getIcon
}: { 
  moduleId: string; 
  activeContentId: string | null;
  isCurrentModule: boolean;
  onSelect: (id: string) => void;
  getIcon: (type: string, size?: number) => React.ReactNode;
}) => {
  const { contents } = useCourseContents(moduleId);
  const { questions } = useCourseQuestions(moduleId);
  
  return (
    <div className="ml-4 pl-4 border-l-2 border-white/[0.05] space-y-0.5">
      {contents.map(content => {
        const isActive = activeContentId === content.id && isCurrentModule;
        return (
          <button
            key={content.id}
            onClick={() => onSelect(content.id)}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all duration-200 active:scale-[0.98] ${
              isActive
                ? 'bg-blue-500/10 text-white border border-blue-500/15' 
                : 'text-white/35 hover:bg-white/[0.04] hover:text-white/60 border border-transparent'
            }`}
          >
            <div className={`shrink-0 ${isActive ? 'text-blue-400' : 'text-white/20'}`}>
              {getIcon(content.type, 14)}
            </div>
            <span className="text-xs font-medium truncate flex-1">{content.title}</span>
          </button>
        );
      })}
      {questions.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 text-[10px] font-bold text-amber-500/50 uppercase tracking-wider">
          <HelpCircle size={12} />
          <span>{questions.length} perguntas</span>
        </div>
      )}
    </div>
  );
};
