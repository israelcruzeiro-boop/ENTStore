import { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  useCourseModules,
  useCourseContents,
  useCourses,
  useCourseQuestions,
  useCourseContentsByCourse,
  useCourseQuestionsByCourse,
  useCourseEnrollment,
  startEnrollment,
  submitCourseAnswer,
  completeEnrollment,
  updateEnrollmentProgress,
  useCourseAnswers,
  useOrgStructure
} from '../../hooks/usePlatformData';
import type { CourseAnswer, CourseContent, CoursePhaseQuestion } from '../../types';
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
import {
  CourseFocusLayout,
  CourseJourneyLayout,
  CourseStudioLayout,
  type CourseNavigationSurface,
  type CoursePlayerViewModel,
} from '../../components/user/course-layouts';
// Viewer ÃƒÂ© pesado (video/audio/pdf/image players) Ã¢â‚¬â€ carrega sob demanda.
const Viewer = lazy(() => import('../../components/user/Viewer').then(m => ({ default: m.Viewer })));
import { CourseQuestionPlayer } from '../../components/user/CourseQuestionPlayer';
import { CourseResultScreen } from '../../components/user/CourseResultScreen';
import type { Content } from '../../types';
import { printDiploma, type DiplomaTemplateId } from '../../components/user/CourseDiploma';
import { getPublicStorageUrl } from '../../lib/storage';
import { sanitizeHtml } from '../../utils/sanitizeHtml';
import { Logger } from '../../utils/logger';

type QuestionAnswerSnapshot = {
  optionId?: string;
  complexAnswer?: any;
  isCorrect: boolean;
  finalized?: boolean;
};

const isFinalCourseAnswer = (answer: CourseAnswer, enrollmentStatus?: string) =>
  Boolean(answer.completed_answer_id) || enrollmentStatus === 'COMPLETED';

const CircularProgress = memo(({ progress, size = 60, strokeWidth = 5, primaryColor = '#3b82f6' }: { progress: number, size?: number, strokeWidth?: number, primaryColor?: string }) => {
  const { radius, circumference, offset } = useMemo(() => {
    const r = (size - strokeWidth) / 2;
    const c = r * 2 * Math.PI;
    return { radius: r, circumference: c, offset: c - (progress / 100) * c };
  }, [size, strokeWidth, progress]);

  const progressColor = useMemo(() => {
    if (progress < 30) return '#ef4444';
    if (progress < 70) return '#f59e0b';
    return primaryColor;
  }, [progress, primaryColor]);

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
          stroke={progressColor}
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
});
CircularProgress.displayName = 'CircularProgress';

export const UserCoursePlayer = () => {
  const { companySlug, courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { tenantCompany } = useTenant();
  const { courses, isLoading: loadingCourses } = useCourses(tenantCompany?.id);
  const { orgUnits, orgTopLevels, isLoading: orgLoading } = useOrgStructure(tenantCompany?.id);
  const course = courses.find(c => c.id === courseId);
  
  // VerificaÃƒÂ§ÃƒÂ£o de acesso
  useEffect(() => {
    if (!loadingCourses && !orgLoading && courses.length > 0 && courseId && user) {
      const currentCourse = courses.find(c => c.id === courseId);
      if (currentCourse) {
        const hasAccess = checkCourseAccess(currentCourse, user, orgUnits, orgTopLevels);
        if (!hasAccess) {
          toast.error('VocÃƒÂª nÃƒÂ£o tem permissÃƒÂ£o para acessar este conteÃƒÂºdo.');
          navigate(`/${companySlug}/home`);
        }
      }
    }
  }, [loadingCourses, orgLoading, courses, courseId, user, orgUnits, orgTopLevels, navigate, companySlug]);

  const { modules, isLoading: modulesLoading } = useCourseModules(courseId);
  // PrÃƒÂ©-carrega TODOS os conteÃƒÂºdos e perguntas do curso em 2 queries (elimina N+1 na navegaÃƒÂ§ÃƒÂ£o).
  const allModuleIds = useMemo(() => modules.map(m => m.id), [modules]);
  const { contentsByModule, isLoading: allContentsLoading } = useCourseContentsByCourse(allModuleIds);
  const { questionsByModule, isLoading: allQuestionsLoading } = useCourseQuestionsByCourse(allModuleIds);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
  const [activeContentId, setActiveContentId] = useState<string | null>(null);
  const [showNav, setShowNav] = useState(false);
  const [showPhaseQuestions, setShowPhaseQuestions] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);
  
  // Enrollment (matrÃƒÂ­cula e tracking)
  const { enrollment, isLoading: enrollmentLoading, mutate: mutateEnrollment } = useCourseEnrollment(courseId, user?.id);
  const enrollmentStartInFlight = useRef(false);
  const questionResumeHandled = useRef(false);

  const [totalCorrect, setTotalCorrect] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);

  useEffect(() => {
    questionResumeHandled.current = false;
  }, [courseId, enrollment?.id]);

  useEffect(() => {
    if (enrollment && enrollment.status === 'IN_PROGRESS') {
      if (enrollment.total_correct) setTotalCorrect(enrollment.total_correct);
      if (enrollment.total_questions) setTotalQuestions(enrollment.total_questions);
    }
  }, [enrollment]);

  // Hook de respostas carregado para o ID desta matrÃƒÂ­cula
  const { answers: savedAnswers, isLoading: answersLoading, mutate: mutateAnswers } = useCourseAnswers(enrollment?.id);

  // Busca conteÃƒÂºdos do mÃƒÂ³dulo ativo
  const { contents: activeModuleContents } = useCourseContents(activeModuleId || undefined);
  
  // Busca perguntas do mÃƒÂ³dulo ativo
  const { questions: moduleQuestions } = useCourseQuestions(activeModuleId || undefined);

  // Encontra o conteÃƒÂºdo atual
  const currentContent = activeModuleContents?.find(c => c.id === activeContentId);

  // ÃƒÂndices para UI
  const currentModuleIndex = modules.findIndex(m => m.id === activeModuleId);
  const currentContentIndex = activeModuleContents.findIndex(c => c.id === activeContentId);

  const savedAnswersByQuestionId = useMemo(
    () => new Map(savedAnswers.map(answer => [answer.question_id, answer])),
    [savedAnswers]
  );

  const finalSavedAnswers = useMemo(
    () => savedAnswers.filter(answer => isFinalCourseAnswer(answer, enrollment?.status)),
    [savedAnswers, enrollment?.status]
  );

  const finalSavedAnswersByQuestionId = useMemo(
    () => new Map(finalSavedAnswers.map(answer => [answer.question_id, answer])),
    [finalSavedAnswers]
  );

  const currentModuleInitialAnswers = useMemo(() => Object.fromEntries(
    moduleQuestions
      .map(question => {
        const answer = savedAnswersByQuestionId.get(question.id);
        return answer
          ? [question.id, {
              optionId: answer.selected_option_id,
              complexAnswer: answer.complex_answer,
              isCorrect: answer.is_correct,
              finalized: isFinalCourseAnswer(answer, enrollment?.status)
            } satisfies QuestionAnswerSnapshot] as [string, QuestionAnswerSnapshot]
          : null;
      })
      .filter((entry): entry is [string, QuestionAnswerSnapshot] => Boolean(entry))
  ), [moduleQuestions, savedAnswersByQuestionId, enrollment?.status]);

  const allCourseQuestionIds = useMemo(() => {
    const ids = new Set<string>();
    modules.forEach(module => {
      (questionsByModule.get(module.id) || []).forEach(question => ids.add(question.id));
    });
    return ids;
  }, [modules, questionsByModule]);

  // Durante a fase de perguntas (fora de review), o usuÃƒÂ¡rio nÃƒÂ£o pode voltar para aulas anteriores
  // nem sair do curso sem confirmar Ã¢â‚¬â€ respostas sÃƒÂ£o persistidas incrementalmente via autosave.
  // Marca apenas que o aluno esta respondendo perguntas. Isso nao deve travar
  // conteudos ja liberados; a imutabilidade da resposta final fica no backend.
  const isAnsweringQuestions = showPhaseQuestions && !isReviewMode;

  // Inicia enrollment ao abrir o curso (APENAS se nÃƒÂ£o existir ou se nÃƒÂ£o estiver COMPLETED)
  useEffect(() => {
    if (enrollmentLoading) return;

    if (enrollment) {
      enrollmentStartInFlight.current = false;
      return;
    }

    if (courseId && user?.id && course?.company_id && !enrollmentStartInFlight.current) {
      enrollmentStartInFlight.current = true;
      startEnrollment(courseId, user.id, course.company_id)
        .then(() => mutateEnrollment())
        .catch(err => Logger.warn('Error starting enrollment', err))
        .finally(() => {
          enrollmentStartInFlight.current = false;
        });
    }
  }, [courseId, user?.id, course?.company_id, enrollment, enrollmentLoading, mutateEnrollment]);

  // Se enrollment jÃƒÂ¡ estÃƒÂ¡ completed, mostra resultado (mas nÃƒÂ£o se estiver em modo revisÃƒÂ£o)
  useEffect(() => {
    if (enrollment?.status === 'COMPLETED' && !isReviewMode) {
      setShowResult(true);
    }
  }, [enrollment, isReviewMode]);

  useEffect(() => {
    if (!enrollment || enrollment.status !== 'IN_PROGRESS' || answersLoading || allQuestionsLoading) return;

    const courseAnswers = finalSavedAnswers.filter(answer => allCourseQuestionIds.has(answer.question_id));
    setTotalCorrect(courseAnswers.filter(answer => answer.is_correct).length);
    setTotalQuestions(courseAnswers.length);
  }, [enrollment, answersLoading, allQuestionsLoading, finalSavedAnswers, allCourseQuestionIds]);

  // RecuperaÃƒÂ§ÃƒÂ£o de Progresso Salvo
  useEffect(() => {
    // Auto-selecionar o primeiro mÃƒÂ³dulo se nenhum estÃƒÂ¡ ativo
    if (modules.length > 0 && !activeModuleId) {
      if (enrollment?.status === 'IN_PROGRESS' && enrollment.current_module_id) {
        setActiveModuleId(enrollment.current_module_id);
      } else {
        setActiveModuleId(modules[0].id);
      }
      return; // Aguarda o prÃƒÂ³ximo ciclo para os conteÃƒÂºdos carregarem
    }

    // Auto-selecionar o primeiro conteÃƒÂºdo quando os conteÃƒÂºdos do mÃƒÂ³dulo carregarem
    if (activeModuleContents.length > 0 && !activeContentId) {
      // Verificar se o enrollment tem um content_id que pertence a ESTE mÃƒÂ³dulo
      if (
        enrollment?.status === 'IN_PROGRESS' &&
        enrollment.current_content_id &&
        activeModuleContents.some(c => c.id === enrollment.current_content_id)
      ) {
        setActiveContentId(enrollment.current_content_id);
      } else {
        // Fallback: primeiro conteÃƒÂºdo do mÃƒÂ³dulo
        setActiveContentId(activeModuleContents[0].id);
      }
    }
  }, [enrollment, modules, activeModuleContents, activeModuleId, activeContentId, isReviewMode]);

  // Retoma perguntas somente quando a ultima posicao salva era a etapa de perguntas
  // ou quando ja existe resposta iniciada nessa fase.
  useEffect(() => {
    if (
      enrollment?.status === 'IN_PROGRESS' &&
      activeModuleId &&
      !answersLoading &&
      !allQuestionsLoading &&
      !allContentsLoading &&
      !showPhaseQuestions &&
      !isReviewMode &&
      !questionResumeHandled.current
    ) {
      questionResumeHandled.current = true;
      const hasPendingQuestions = moduleQuestions.some(q => !finalSavedAnswersByQuestionId.has(q.id));
      if (!hasPendingQuestions) return;

      const hasStartedThisPhaseQuestions = moduleQuestions.some(q => savedAnswersByQuestionId.has(q.id));
      const savedAtQuestions = enrollment.current_module_id === activeModuleId && !enrollment.current_content_id;
      const phaseHasNoContent = activeModuleContents.length === 0;

      if (savedAtQuestions || hasStartedThisPhaseQuestions || phaseHasNoContent) {
        setShowPhaseQuestions(true);
      }
    }
  }, [enrollment, activeModuleId, activeModuleContents, moduleQuestions, finalSavedAnswersByQuestionId, savedAnswersByQuestionId, answersLoading, allQuestionsLoading, allContentsLoading, isReviewMode, showPhaseQuestions]);

  // Salvar Progresso sempre que mudar de mÃƒÂ³dulo ou conteÃƒÂºdo
  useEffect(() => {
    if (!enrollment || enrollment.status !== 'IN_PROGRESS' || !activeModuleId) return;
    if (!showPhaseQuestions && !activeContentId) return;

    updateEnrollmentProgress(enrollment.id, activeModuleId, showPhaseQuestions ? null : activeContentId).catch(err => {
      Logger.warn('Failed to update progress', err);
    });
  }, [enrollment, activeModuleId, activeContentId, showPhaseQuestions]);

  const finishCourse = useCallback(async (correct: number, total: number) => {
    // Tenta salvar no banco se enrollment existir
    if (!enrollment) {
      Logger.warn('Enrollment not found; cannot complete course');
      toast.error('Nao foi possivel registrar a conclusao do curso. Recarregue e tente novamente.');
      return;
    }

    try {
      await completeEnrollment(enrollment.id, correct, total);
      await mutateEnrollment();
      setShowResult(true);
      toast.success('Curso concluido!');
    } catch (err) {
      Logger.warn('Error completing enrollment', err);
      toast.error('Nao foi possivel salvar a conclusao do curso no banco. Tente novamente.');
    }

  }, [enrollment, mutateEnrollment]);

  useEffect(() => {
    if (
      enrollment?.status !== 'IN_PROGRESS' ||
      !activeModuleId ||
      !activeContentId ||
      showPhaseQuestions ||
      showResult ||
      isReviewMode ||
      answersLoading ||
      allQuestionsLoading ||
      allContentsLoading
    ) {
      return;
    }

    const activeQuestions = questionsByModule.get(activeModuleId) || [];
    if (activeQuestions.length === 0) return;

    const activeContents = contentsByModule.get(activeModuleId) || activeModuleContents;
    const lastContent = activeContents[activeContents.length - 1];
    if (!lastContent || activeContentId !== lastContent.id) return;

    const hasPendingInModule = activeQuestions.some(question => !finalSavedAnswersByQuestionId.has(question.id));
    if (hasPendingInModule) return;

    const moduleIndex = modules.findIndex(module => module.id === activeModuleId);
    if (moduleIndex >= 0 && moduleIndex < modules.length - 1) {
      setActiveModuleId(modules[moduleIndex + 1].id);
      setActiveContentId(null);
      setShowPhaseQuestions(false);
      return;
    }

    const courseQuestionCount = allCourseQuestionIds.size;
    const answeredCourseQuestions = finalSavedAnswers.filter(answer => allCourseQuestionIds.has(answer.question_id));
    if (courseQuestionCount > 0 && answeredCourseQuestions.length >= courseQuestionCount) {
      const correctCount = answeredCourseQuestions.filter(answer => answer.is_correct).length;
      void finishCourse(correctCount, courseQuestionCount);
    }
  }, [
    enrollment?.status,
    activeModuleId,
    activeContentId,
    showPhaseQuestions,
    showResult,
    isReviewMode,
    answersLoading,
    allQuestionsLoading,
    allContentsLoading,
    questionsByModule,
    contentsByModule,
    activeModuleContents,
    finalSavedAnswersByQuestionId,
    finalSavedAnswers,
    modules,
    allCourseQuestionIds,
    finishCourse
  ]);

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
        // Curso sem perguntas na ÃƒÂºltima fase Ã¢â‚¬â€ finaliza direto (sÃƒÂ³ em modo normal)
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
      // Em review mode, voltar para o mÃƒÂ³dulo anterior
      const modIdx = modules.findIndex(m => m.id === activeModuleId);
      if (modIdx > 0) {
        setActiveModuleId(modules[modIdx - 1].id);
        setActiveContentId(null);
        setShowPhaseQuestions(false);
      }
    }
  };

  const exitReviewMode = useCallback(() => {
    setIsReviewMode(false);
    setShowResult(true);
    setActiveModuleId(null);
    setActiveContentId(null);
    setShowPhaseQuestions(false);
  }, []);

  const openModuleQuestions = useCallback((moduleId: string) => {
    setActiveModuleId(moduleId);
    setActiveContentId(null);
    setShowPhaseQuestions(true);
    setShowNav(false);
  }, []);

  const getNextModuleWithQuestionsIndex = useCallback((fromIndex: number) => {
    for (let index = fromIndex + 1; index < modules.length; index += 1) {
      if ((questionsByModule.get(modules[index].id) || []).length > 0) {
        return index;
      }
    }
    return -1;
  }, [modules, questionsByModule]);

  const handleReviewQuestionsComplete = useCallback(() => {
    const currentModuleIdx = modules.findIndex(module => module.id === activeModuleId);
    const nextModuleIdx = getNextModuleWithQuestionsIndex(currentModuleIdx);

    if (nextModuleIdx >= 0) {
      openModuleQuestions(modules[nextModuleIdx].id);
      return;
    }

    exitReviewMode();
  }, [activeModuleId, modules, getNextModuleWithQuestionsIndex, openModuleQuestions, exitReviewMode]);

  const reviewCompleteLabel = useMemo(() => {
    if (!isReviewMode) return undefined;
    const currentModuleIdx = modules.findIndex(module => module.id === activeModuleId);
    return getNextModuleWithQuestionsIndex(currentModuleIdx) >= 0 ? 'Proxima Fase' : 'Voltar ao Resultado';
  }, [isReviewMode, activeModuleId, modules, getNextModuleWithQuestionsIndex]);

  const handleAutosaveAnswer = useCallback(async (
    questionId: string,
    payload: QuestionAnswerSnapshot
  ) => {
    if (!enrollment) return;
    try {
      await submitCourseAnswer(enrollment.id, questionId, payload.optionId, payload.isCorrect, payload.complexAnswer, Boolean(payload.finalized));
      mutateAnswers();
    } catch (err) {
        Logger.warn('Autosave answer failed', err);
    }
  }, [enrollment, mutateAnswers]);

  const handlePhaseQuestionsComplete = async (_correct: number, _total: number, answers: Record<string, QuestionAnswerSnapshot>) => {
    const mergedAnswers = new Map<string, { is_correct: boolean }>();
    finalSavedAnswers.forEach(answer => {
      if (allCourseQuestionIds.has(answer.question_id)) {
        mergedAnswers.set(answer.question_id, { is_correct: answer.is_correct });
      }
    });
    Object.entries(answers).forEach(([questionId, answer]) => {
      if (answer.finalized && allCourseQuestionIds.has(questionId)) {
        mergedAnswers.set(questionId, { is_correct: answer.isCorrect });
      }
    });
    const mergedCourseAnswers = Array.from(mergedAnswers.values());
    const newTotalCorrect = mergedCourseAnswers.filter(answer => answer.is_correct).length;
    const newTotalQuestions = mergedCourseAnswers.length;
    setTotalCorrect(newTotalCorrect);
    setTotalQuestions(newTotalQuestions);

    // Salva respostas finais (autosave jÃƒÂ¡ persistiu os parciais; isso garante o estado final)
    if (enrollment) {
      for (const [questionId, answer] of Object.entries(answers)) {
        if (!answer.finalized) continue;
        try {
          await submitCourseAnswer(enrollment.id, questionId, answer.optionId, answer.isCorrect, answer.complexAnswer, true);
        } catch (err) {
      Logger.warn('Error saving answer', err);
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
      // ÃƒÅ¡ltimo mÃƒÂ³dulo Ã¢â‚¬â€ finaliza o curso
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

  const [coverUrl, setCoverUrl] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    const rawUrl = course?.image_url || course?.thumbnail_url;

    async function resolveCoverUrl() {
      if (!rawUrl) {
        if (!cancelled) setCoverUrl(undefined);
        return;
      }

      if (rawUrl.startsWith('http') || rawUrl.startsWith('data:')) {
        if (!cancelled) setCoverUrl(rawUrl);
        return;
      }

      try {
        const publicUrl = await getPublicStorageUrl(rawUrl, 'company-assets');
        if (!cancelled) setCoverUrl(publicUrl ?? undefined);
      } catch {
        if (!cancelled) setCoverUrl(undefined);
      }
    }

    void resolveCoverUrl();

    return () => {
      cancelled = true;
    };
  }, [course?.image_url, course?.thumbnail_url]);

  const progress = calculateProgress();

  if (modulesLoading || enrollmentLoading || allContentsLoading || allQuestionsLoading || answersLoading) {
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
        <h2 className="text-2xl font-bold mb-3">Curso em construÃƒÂ§ÃƒÂ£o</h2>
        <p className="text-white/40 text-center max-w-sm mb-8 text-sm leading-relaxed">
          Este treinamento ainda nÃƒÂ£o possui fases ou conteÃƒÂºdos estruturados.
        </p>
        <button 
          onClick={() => navigate(`/${companySlug}/home`)}
          className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-6 py-3 rounded-full text-sm font-bold transition-colors"
        >
          <ArrowLeft size={16} />
          Voltar ao InÃƒÂ­cio
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
          const firstModuleWithQuestions = modules.find(module => (questionsByModule.get(module.id) || []).length > 0);
          setIsReviewMode(true);
          setShowResult(false);
          setActiveModuleId(firstModuleWithQuestions?.id ?? modules[0]?.id ?? null);
          setActiveContentId(null);
          setShowPhaseQuestions(Boolean(firstModuleWithQuestions));
        } : undefined}
        onPrintDiploma={scoreForDiploma >= (course?.passing_score || 70) ? () => {
          printDiploma(
            user?.name || 'Aluno',
            course?.title || 'Curso',
            tenantCompany?.name || 'Empresa',
            finalEnrollment,
            (course?.diploma_template || 'azul') as DiplomaTemplateId,
            tenantCompany?.logo_url
          );
        } : undefined}
      />
    );
  }

  // Helper: Adaptar CourseContent para a interface Content (necessÃƒÂ¡rio para o Viewer)
  // RefatoraÃƒÂ§ÃƒÂ£o robusta para detecÃƒÂ§ÃƒÂ£o de vÃƒÂ­deo e URLs de embed
  const adaptContentForViewer = (cc: typeof currentContent): Content | null => {
    if (!cc) return null;
    
    let type = cc.type as Content['type'];
    if (cc.type === 'AUDIO') type = 'MUSIC';
    
    // DetecÃƒÂ§ÃƒÂ£o inteligente de YouTube se o tipo for VIDEO mas a URL for link normal
    const finalUrl = cc.url || '';
    let embedUrl = cc.url || '';
    
    if (type === 'VIDEO' && finalUrl) {
      const isYT = /youtube\.com|youtu\.be/i.test(finalUrl);
      if (isYT) {
        // Importar helpers do Viewer (replicados aqui para robustez inline)
        const extractId = (u: string) => {
          const match = u.match(/(?:youtu\.be\/|youtube\.com\/(?:shorts\/|watch\?v=|embed\/))([a-zA-Z0-9_-]{11})/);
          return match?.[1] || null;
        };
        const id = extractId(finalUrl);
        if (id) embedUrl = `https://www.youtube.com/embed/${id}`;
      }
    }

    return {
      id: cc.id,
      company_id: course?.company_id || '',
      repository_id: '',
      title: cc.title,
      description: cc.description || '',
      thumbnail_url: '',
      type,
      url: finalUrl,
      embed_url: embedUrl,
      featured: false,
      recent: false,
      status: 'ACTIVE',
      _suppressQuiz: true,
    } as Content;
  };

  const layoutTemplate = course?.layout_template;
  const selectedLayout: CoursePlayerViewModel['template'] =
    layoutTemplate === 'studio' || layoutTemplate === 'journey' ? layoutTemplate : 'focus';
  const primaryColor = tenantCompany?.primary_color || '#3b82f6';

  const renderSharedHeader = (
    <div className="shrink-0 relative overflow-hidden border-b border-white/[0.04] safe-area-top" style={{ zIndex: 30, backgroundColor: tenantCompany?.primary_color ? `${tenantCompany.primary_color}05` : undefined }}>
      <div className="relative px-4 pt-3 pb-3">
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <button
            onClick={() => {
              if (isReviewMode) {
                exitReviewMode();
                return;
              }
              if (isAnsweringQuestions) {
                const confirmed = window.confirm(
                  'Voce esta no meio das perguntas. Suas respostas estao salvas e voce pode continuar depois. Deseja sair agora?'
                );
                if (!confirmed) return;
              }
              navigate(`/${companySlug}/home`);
            }}
            className="flex items-center gap-1.5 text-white/60 hover:text-white transition-colors active:scale-95 h-11 px-2 -ml-2 shrink-0"
            aria-label="Voltar"
          >
            <ArrowLeft size={20} />
            <span className="text-xs font-medium hidden sm:inline">{isReviewMode ? 'Voltar ao Resultado' : 'Voltar'}</span>
          </button>

          {isReviewMode && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full">
              <Eye size={12} className="text-blue-400" />
              <span className="text-[10px] font-bold text-blue-300 uppercase tracking-wider">Modo Revisao</span>
            </div>
          )}

          <div className="flex items-center gap-2 shrink-0">
            <CircularProgress
              progress={progress}
              primaryColor={primaryColor}
              size={44}
            />
            <button
              onClick={() => setShowNav(!showNav)}
              className={`w-11 h-11 flex items-center justify-center rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-all active:scale-95 ${selectedLayout === 'studio' ? 'lg:hidden' : ''}`}
              aria-label={showNav ? 'Fechar menu' : 'Abrir menu'}
            >
              {showNav ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {coverUrl && (
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl overflow-hidden border border-white/10 shadow-lg shrink-0">
              <img src={coverUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-bold text-white truncate leading-tight">{course?.title}</h1>
            <div className="flex items-center gap-2 mt-0.5 min-w-0">
              <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/20 hover:bg-blue-500/20 text-[9px] uppercase px-2 py-0 shrink-0">
                Fase {currentModuleIndex + 1}/{modules.length}
              </Badge>
              <span className="text-[10px] text-white/40 truncate min-w-0">
                {showPhaseQuestions
                  ? 'Perguntas da fase'
                  : currentContent?.title || modules[currentModuleIndex]?.title}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-3 relative">
          <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progress}%`, backgroundColor: primaryColor }}
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderSharedHero = coverUrl ? (
    <div className="relative w-full h-48 sm:h-64 md:h-80 lg:h-96 shrink-0 overflow-hidden mb-2 border-b border-white/[0.04]">
      <motion.div
        initial={{ scale: 1.05, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        className="absolute inset-0"
      >
        <img src={coverUrl} alt="Capa" className="w-full h-full object-cover" fetchPriority="high" />
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/40 to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-0 z-10 mix-blend-overlay" style={{ backgroundColor: primaryColor, opacity: 0.15 }} />

      <div className="absolute bottom-6 left-4 md:left-10 z-20 max-w-3xl">
        <motion.div
          initial={{ x: -16, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="inline-flex items-center gap-1.5 mb-3 px-3 py-1.5 bg-white/10 rounded-xl border border-white/20 text-xs font-bold text-white/90"
        >
          <BookOpen size={14} className="text-blue-400" /> Trilha de Conhecimento
        </motion.div>
        <motion.h1
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.45 }}
          className="text-2xl sm:text-4xl md:text-5xl lg:text-7xl font-black text-white leading-tight drop-shadow-2xl tracking-tighter"
        >
          {course?.title}
        </motion.h1>
      </div>
    </div>
  ) : null;

  const renderSharedMentor = (
    <LMSMentor
      progress={progress}
      isQuiz={showPhaseQuestions}
      currentContentTitle={currentContent?.title}
    />
  );

  const renderSharedStepIndicators = (
    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 -mx-1 px-1 tour-course-nav snap-x snap-mandatory scroll-px-4">
      {activeModuleContents.map((c, idx) => {
        const isActive = activeContentId === c.id && !showPhaseQuestions;
        const isCompleted = idx < currentContentIndex;
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
            style={isActive ? { background: `linear-gradient(to right, ${primaryColor}, ${primaryColor}80)` } : {}}
            className={`snap-start shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-semibold transition-all duration-300 ${!isLocked ? 'active:scale-95 cursor-pointer' : 'cursor-not-allowed opacity-50'} ${
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
        const isLastContent = currentContentIndex >= activeModuleContents.length - 1;
        const canAccessQuestions = isReviewMode || isLastContent;
        return (
          <button
            onClick={() => { if (canAccessQuestions) setShowPhaseQuestions(true); }}
            disabled={!canAccessQuestions}
            className={`snap-start shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-semibold transition-all duration-300 ${canAccessQuestions ? 'active:scale-95 cursor-pointer' : 'cursor-not-allowed opacity-50'} ${
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
  );

  const renderSharedActiveStage = (
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
            onAutosave={handleAutosaveAnswer}
            reviewMode={isReviewMode}
            onReviewComplete={handleReviewQuestionsComplete}
            reviewCompleteLabel={reviewCompleteLabel}
            initialAnswers={currentModuleInitialAnswers}
          />
        ) : currentContent ? (
          <div className="space-y-6">
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

            <div className="tour-course-viewer">
              {currentContent.type === 'HTML' && currentContent.html_content ? (
                <div className="rounded-3xl overflow-hidden shadow-2xl border border-white/[0.06] bg-white">
                  <div
                    className="prose prose-slate max-w-none text-slate-800 p-6 md:p-12 text-sm md:text-lg leading-relaxed shadow-inner"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(currentContent.html_content) }}
                  />
                </div>
              ) : (
                <div className="rounded-3xl overflow-hidden shadow-2xl border border-white/[0.08] ring-1 ring-white/5 bg-black/20">
                  <Suspense fallback={
                    <div className="flex items-center justify-center py-20">
                      <Loader2 className="animate-spin text-blue-400" size={32} />
                    </div>
                  }>
                    <Viewer content={adaptContentForViewer(currentContent) as Content} />
                  </Suspense>
                </div>
              )}
            </div>

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

            <div className="pt-4 flex flex-col-reverse sm:grid sm:grid-cols-2 gap-3">
              <Button
                variant="ghost"
                onClick={handlePrevious}
                disabled={currentContentIndex === 0 && !showPhaseQuestions}
                className="h-12 sm:h-14 rounded-2xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-20"
              >
                <ChevronLeft className="mr-2" size={20} /> Aula Anterior
              </Button>

              {currentContentIndex < activeModuleContents.length - 1 ? (
                <Button
                  onClick={handleNext}
                  className="h-12 sm:h-14 rounded-2xl text-black font-black text-base sm:text-lg transition-transform active:scale-95 shadow-[0_0_30px_-5px_var(--primary-glow)] tour-course-next"
                  style={{
                    backgroundColor: tenantCompany?.primary_color || '#ffffff',
                    '--primary-glow': (tenantCompany?.primary_color || '#ffffff') + '40'
                  } as any}
                >
                  Proxima Aula <ChevronRight className="ml-2" size={20} />
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  className={`h-12 sm:h-14 rounded-2xl text-black font-black text-base sm:text-lg transition-transform active:scale-95 shadow-[0_0_30px_-5px_var(--primary-glow)] tour-course-next ${isReviewMode ? '' : 'animate-pulse'}`}
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
                    ? (moduleQuestions.length > 0 ? 'Ver Perguntas' : 'Proxima Fase')
                    : (moduleQuestions.length > 0 ? 'Ir para Perguntas' : 'Concluir Fase')}
                  <ChevronRight className="ml-2" size={20} />
                </Button>
              )}
            </div>
          </div>
        ) : activeModuleContents.length === 0 && moduleQuestions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-white/20 bg-white/[0.02] rounded-[3rem] border border-white/[0.05] dashed-border">
            <BookOpen size={64} className="mb-6 opacity-20" />
            <h3 className="text-white/60 font-black text-2xl mb-2 tracking-tight">Fase em estruturacao</h3>
            <p className="text-sm md:text-base font-medium opacity-40">Os conteudos desta fase ainda nao foram adicionados.</p>
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
  );

  const renderModuleNavigation = (surface: CourseNavigationSurface = 'sheet') => (
    <div className={surface === 'sheet' ? 'overflow-y-auto overscroll-contain flex-1 px-4 py-4 space-y-5' : 'space-y-5'}>
      {modules.map((module, mIdx) => {
        const isModuleLocked = !isReviewMode && mIdx > currentModuleIndex;
        const moduleIsCurrent = mIdx === currentModuleIndex;
        const moduleStatusClass = moduleIsCurrent
          ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white ring-2 ring-blue-400/30 shadow-lg shadow-blue-500/20'
          : mIdx < currentModuleIndex || isReviewMode
            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
            : 'bg-white/[0.04] text-white/25 border border-white/[0.06]';

        return (
          <div key={module.id} className={surface === 'timeline' ? 'relative space-y-2 pl-1' : 'space-y-1.5'}>
            <div className="flex items-center gap-2.5 px-1.5">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 transition-all duration-300 ${moduleStatusClass}`}>
                {(mIdx < currentModuleIndex || isReviewMode) ? <CheckCircle2 size={14} /> : mIdx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className={`text-sm font-bold truncate transition-colors ${
                  isModuleLocked ? 'text-white/25' : moduleIsCurrent ? 'text-white' : 'text-white/50'
                }`}>{module.title}</h4>
                {isModuleLocked && (
                  <p className="text-[9px] text-white/20 mt-0.5">Conclua a fase anterior para desbloquear</p>
                )}
              </div>
              {moduleIsCurrent && (
                <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/20 text-[9px] uppercase shrink-0">
                  Atual
                </Badge>
              )}
              {isModuleLocked && (
                <div className="w-6 h-6 flex items-center justify-center rounded-lg bg-white/5 border border-white/10">
                  <Layers size={10} className="text-white/20" />
                </div>
              )}
            </div>

            <NavModuleContents
              contents={contentsByModule.get(module.id) || []}
              questions={questionsByModule.get(module.id) || []}
              activeContentId={activeContentId}
              isCurrentModule={moduleIsCurrent}
              isLocked={isModuleLocked}
              isQuestionsActive={showPhaseQuestions && activeModuleId === module.id}
              canSelectQuestions={isReviewMode || (
                moduleIsCurrent &&
                (activeModuleContents.length === 0 || currentContentIndex >= activeModuleContents.length - 1)
              )}
              onSelect={(id) => {
                if (isModuleLocked) return;
                setActiveModuleId(module.id);
                setActiveContentId(id);
                setShowPhaseQuestions(false);
                setShowNav(false);
              }}
              onSelectQuestions={() => {
                const canSelectQuestions = isReviewMode || (
                  moduleIsCurrent &&
                  (activeModuleContents.length === 0 || currentContentIndex >= activeModuleContents.length - 1)
                );
                if (isModuleLocked || !canSelectQuestions) return;
                setActiveModuleId(module.id);
                if (isReviewMode) setActiveContentId(null);
                setShowPhaseQuestions(true);
                setShowNav(false);
              }}
              getIcon={getContentIcon}
            />
          </div>
        );
      })}
    </div>
  );

  const renderSharedNavigationPanel = showNav ? (
    <>
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 animate-in fade-in duration-200"
        onClick={() => setShowNav(false)}
      />
      <div className="fixed inset-x-0 bottom-0 z-50 animate-in slide-in-from-bottom duration-300">
        <div className="bg-slate-900 border-t border-white/10 rounded-t-[2rem] max-h-[80dvh] flex flex-col shadow-[0_-10px_50px_rgba(0,0,0,0.5)]">
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1.5 bg-white/15 rounded-full" />
          </div>

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
                aria-label="Fechar menu"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {renderModuleNavigation('sheet')}
        </div>
      </div>
    </>
  ) : null;

  {
    const LayoutComponent = selectedLayout === 'studio'
      ? CourseStudioLayout
      : selectedLayout === 'journey'
        ? CourseJourneyLayout
        : CourseFocusLayout;
    const viewModel: CoursePlayerViewModel = {
      template: selectedLayout,
      courseTitle: course?.title || 'Curso',
      coverUrl,
      progress,
      primaryColor,
      modules,
      activeModuleId,
      currentModuleIndex,
      currentContentTitle: showPhaseQuestions
        ? 'Perguntas da fase'
        : currentContent?.title || modules[currentModuleIndex]?.title,
      showPhaseQuestions,
      isReviewMode,
      activeModuleContents,
      moduleQuestions,
      render: {
        header: renderSharedHeader,
        hero: renderSharedHero,
        mentor: renderSharedMentor,
        stepIndicators: renderSharedStepIndicators,
        activeStage: renderSharedActiveStage,
        navigationPanel: renderSharedNavigationPanel,
        moduleNavigation: renderModuleNavigation,
      },
    };

    return (
      <div
        className="flex flex-col h-[100dvh] text-white overflow-hidden relative"
        style={{
          backgroundColor: '#020617',
          backgroundImage: tenantCompany?.primary_color ? `radial-gradient(ellipse at top, ${tenantCompany.primary_color}15 0%, #020617 70%)` : undefined
        }}
      >
        <LayoutComponent viewModel={viewModel} />
        <style>{`
          .safe-area-top { padding-top: env(safe-area-inset-top); }
          .safe-area-bottom { padding-bottom: env(safe-area-inset-bottom); }
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `}</style>
      </div>
    );
  }

};

// Sub-componente para listar conteÃƒÂºdos de um mÃƒÂ³dulo na navegaÃƒÂ§ÃƒÂ£o.
// Recebe contents/questions prÃƒÂ©-carregados (via useCourseContentsByCourse no pai)
// para evitar N+1 quando renderizado em loop no bottom sheet.
const NavModuleContents = ({
  contents,
  questions,
  activeContentId,
  isCurrentModule,
  isLocked = false,
  isQuestionsActive = false,
  canSelectQuestions = false,
  onSelect,
  onSelectQuestions,
  getIcon
}: {
  contents: CourseContent[];
  questions: CoursePhaseQuestion[];
  activeContentId: string | null;
  isCurrentModule: boolean;
  isLocked?: boolean;
  isQuestionsActive?: boolean;
  canSelectQuestions?: boolean;
  onSelect: (id: string) => void;
  onSelectQuestions?: () => void;
  getIcon: (type: string, size?: number) => React.ReactNode;
}) => {
  if (isLocked) {
    return (
      <div className="ml-4 pl-4 border-l-2 border-white/[0.03] space-y-0.5">
        <div className="px-3 py-2 text-[10px] text-white/15 font-medium">
          {contents.length} {contents.length === 1 ? 'aula' : 'aulas'}{questions.length > 0 ? ` + ${questions.length} ${questions.length === 1 ? 'pergunta' : 'perguntas'}` : ''}
        </div>
      </div>
    );
  }
  
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
        <button
          type="button"
          onClick={onSelectQuestions}
          disabled={!canSelectQuestions}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all ${
            isQuestionsActive
              ? 'bg-amber-500/15 text-amber-300 border border-amber-500/20'
              : canSelectQuestions
                ? 'text-amber-400/80 hover:bg-amber-500/10 hover:text-amber-300 border border-transparent'
                : 'text-amber-500/30 cursor-not-allowed border border-transparent'
          }`}
        >
          <HelpCircle size={12} />
          <span>{questions.length} perguntas</span>
        </button>
      )}
    </div>
  );
};
