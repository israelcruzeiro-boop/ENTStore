import useSWR from 'swr';
import { Company, OrgTopLevel, OrgUnit, Repository, Content, SimpleLink, Category, User, ContentViewMetric, ContentRating, ContentMetricSummary, Quiz, QuizQuestion, QuizOption, QuizAttempt, Course, CourseModule, CourseContent, CoursePhaseQuestion, CourseEnrollment, CourseAnswer } from '../types';
import { 
  userSchema,
  companySchema,
  quizAttemptSchema,
  courseEnrollmentSchema,
  courseAnswerSchema,
  courseSchema,
  courseModuleSchema,
  courseContentSchema
} from '../types/schemas';
import { z } from 'zod';
import { Logger } from '../utils/logger';
import { courseService } from '../services/courseService';
import {
  adminUsersService,
  contentsService,
  landingService,
  mapApiCategoryToFrontend,
  mapApiCompanyToFrontend,
  mapApiContentToFrontend,
  mapApiCourseAnswerToFrontend,
  mapApiCourseContentToFrontend,
  mapApiCourseEnrollmentToFrontend,
  mapApiCourseQuestionToFrontend,
  mapApiContentMetricSummaryToFrontend,
  mapApiTopLevelToFrontend,
  mapApiRatingToFrontend,
  mapApiRepositoryToFrontend,
  mapApiSimpleLinkToFrontend,
  mapApiUnitToFrontend,
  mapApiUserToFrontend,
  mapApiVisibleUserToFrontend,
  mapApiViewMetricToFrontend,
  coursesService,
  metricsService,
  repositoriesService,
  rewardsService,
  structureService,
  superAdminService,
  tenantService,
  usersMeService,
} from '../services/api';

export const maskCPF = (cpf: string | null | undefined) => {
  if (!cpf) return cpf;
  const clean = cpf.replace(/\D/g, '');
  if (clean.length < 3) return clean;
  return `${clean.substring(0, 3)}.***.***-**`;
};

const stableCatalogSwrOptions = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  dedupingInterval: 60000,
};

export function useCompanies(includeDeleted = false, enabled = true) {
  const { data, error, isLoading, mutate } = useSWR<Company[]>(
    enabled ? `companies_${includeDeleted}` : null,
    async () => {
      const companies = includeDeleted
        ? await superAdminService.listCompanies({ includeDeleted })
        : await tenantService.listCompanies({ includeDeleted });
      const mapped = companies.map(mapApiCompanyToFrontend);

      try {
        return z.array(companySchema.partial()).parse(mapped) as Company[];
      } catch (err) {
        Logger.error('Zod Validation Error [useCompanies]:', err);
        return mapped as Company[];
      }
    },
    { revalidateOnFocus: false }
  );

  return {
    companies: data || [],
    isLoading,
    isError: error,
    mutate
  };
}

export function useUsers(companyId?: string, includeDeleted = false) {
  const cacheKey = companyId ? `users_${companyId}_${includeDeleted}` : `users_all_${includeDeleted}`;
  const { data, error, isLoading, mutate } = useSWR<User[]>(
    cacheKey,
    async () => {
      const result = companyId
        ? await adminUsersService.list({ page: 1, limit: 100, status: 'ALL' })
        : await superAdminService.listUsers({ page: 1, limit: 100, status: 'ALL', includeDeleted });

      const usersData = result.users.map(mapApiUserToFrontend);
      const mappedInvites = result.invites.map(inv => ({
        id: inv.id,
        name: inv.name,
        email: inv.email,
        role: inv.role,
        company_id: inv.companyId,
        org_unit_id: inv.orgUnitId ?? undefined,
        cpf: undefined,
        status: 'PENDING_SETUP',
        active: true,
        created_at: inv.createdAt,
        is_invite: true
      }));

      const combined = [...usersData, ...mappedInvites].sort((a, b) =>
        (a.name || '').localeCompare(b.name || '')
      );

      try {
        const validated = z.array(userSchema.partial()).parse(combined);

        return validated.map(u => ({
          ...u,
          cpf_raw: u?.cpf,
          cpf: maskCPF(u?.cpf)
        })) as User[];
      } catch (err) {
        Logger.error('Zod Validation Error [useUsers]:', err);
        if (err instanceof z.ZodError) {
          Logger.error('Zod Details:', JSON.stringify(err.errors, null, 2));
        }
        return combined.map(u => ({
          ...u,
          cpf_raw: u?.cpf,
          cpf: maskCPF(u?.cpf)
        })) as User[];
      }
    },
    { revalidateOnFocus: false }
  );

  return {
    users: data || [],
    isLoading,
    isError: error,
    mutate
  };
}

export function useOrgStructure(companyId?: string) {
  const { data: topLevels, isLoading: loadingTopLevels, mutate: mutateTopLevels } = useSWR<OrgTopLevel[]>(
    companyId ? `org_top_levels_${companyId}` : null,
    () => structureService.listTopLevels().then((items) => items.map((item) => mapApiTopLevelToFrontend(item, companyId!))),
    { revalidateOnFocus: false }
  );

  const { data: units, isLoading: loadingUnits, mutate: mutateUnits } = useSWR<OrgUnit[]>(
    companyId ? `org_units_${companyId}` : null,
    () => structureService.listUnits().then((items) => items.map((item) => mapApiUnitToFrontend(item, companyId!))),
    { revalidateOnFocus: false }
  );

  return {
    orgTopLevels: topLevels || [],
    orgUnits: units || [],
    isLoading: loadingTopLevels || loadingUnits,
    mutateTopLevels,
    mutateUnits
  };
}

export function useRepositories(companyId?: string) {
  const { data, error, isLoading, mutate } = useSWR<Repository[]>(
    companyId ? `repositories_${companyId}` : null,
    () => repositoriesService.list().then((repositories) => repositories.map((repository) => mapApiRepositoryToFrontend(repository, companyId))),
    stableCatalogSwrOptions,
  );

  return {
    repositories: data || [],
    isLoading,
    isError: error,
    mutate
  };
}

export function useContents(filter?: { repositoryId?: string; companyId?: string; contentId?: string }) {
  const key = filter?.contentId ? `contents_id_${filter.contentId}` : filter?.repositoryId ? `contents_repo_${filter.repositoryId}` : filter?.companyId ? `contents_company_${filter.companyId}` : null;
  const { data, error, isLoading, mutate } = useSWR<Content[]>(
    key,
    async () => {
      if (filter?.contentId) {
        const content = await contentsService.getContent(filter.contentId);
        return [mapApiContentToFrontend(content, filter.companyId)];
      }

      const contents = await contentsService.listAllContents({ repositoryId: filter?.repositoryId });
      return contents.map((content) => mapApiContentToFrontend(content, filter?.companyId));
    },
    { revalidateOnFocus: false }
  );

  return {
    contents: data || [],
    isLoading,
    isError: error,
    mutate
  };
}

export function useSimpleLinks(filter?: { repositoryId?: string; companyId?: string }) {
  const key = filter?.repositoryId ? `simple_links_repo_${filter.repositoryId}` : filter?.companyId ? `simple_links_company_${filter.companyId}` : null;
  const { data, error, isLoading, mutate } = useSWR<SimpleLink[]>(
    key,
    () => contentsService
      .listAllSimpleLinks({ repositoryId: filter?.repositoryId })
      .then((links) => links.map((link) => mapApiSimpleLinkToFrontend(link, filter?.companyId, filter?.repositoryId))),
    { revalidateOnFocus: false }
  );

  return {
    simpleLinks: data || [],
    isLoading,
    isError: error,
    mutate
  };
}

export function useCategories(repositoryId?: string) {
  const { data, error, isLoading, mutate } = useSWR<Category[]>(
    repositoryId ? `categories_${repositoryId}` : null,
    () => contentsService.listCategories(repositoryId!).then((categories) => categories.map(mapApiCategoryToFrontend)),
    { revalidateOnFocus: false }
  );

  return {
    categories: data || [],
    isLoading,
    isError: error,
    mutate
  };
}

export function useRepositoryMetrics(repositoryId?: string) {
  const { data, error, isLoading, mutate } = useSWR<{ contentViews: ContentViewMetric[]; contentRatings: ContentRating[] }>(
    repositoryId ? `repository_metrics_${repositoryId}` : null,
    async () => {
      const [views, ratings] = await Promise.all([
        metricsService.listViews({ repositoryId }),
        metricsService.listRatings({ repositoryId }),
      ]);

      return {
        contentViews: views.map(mapApiViewMetricToFrontend),
        contentRatings: ratings.map(mapApiRatingToFrontend),
      };
    },
    { revalidateOnFocus: false }
  );

  return {
    contentViews: data?.contentViews || [],
    contentRatings: data?.contentRatings || [],
    isLoading,
    isError: error,
    mutate
  };
}

export function useCompanyMetrics(companyId?: string) {
  const { data, error, isLoading, mutate } = useSWR<{ contentViews: ContentViewMetric[]; contentRatings: ContentRating[] }>(
    companyId ? `company_metrics_${companyId}` : null,
    async () => {
      const [views, ratings] = await Promise.all([
        metricsService.listViews(),
        metricsService.listRatings(),
      ]);

      return {
        contentViews: views.map(mapApiViewMetricToFrontend),
        contentRatings: ratings.map(mapApiRatingToFrontend),
      };
    },
    { revalidateOnFocus: false }
  );

  return {
    contentViews: data?.contentViews || [],
    contentRatings: data?.contentRatings || [],
    isLoading,
    isError: error,
    mutate
  };
}

export function useEmptyContentMetrics() {
  const isLoading = false;
  return {
    contentViews: [],
    contentRatings: [],
    isLoading,
    isError: undefined,
    mutate: async () => undefined,
  } as {
    contentViews: ContentViewMetric[];
    contentRatings: ContentRating[];
    isLoading: boolean;
    isError: undefined;
    mutate: () => Promise<void>;
  };
}

export function useContentMetricSummaries(params?: { companyId?: string; repositoryId?: string }) {
  const key = params?.companyId || params?.repositoryId
    ? `content_metric_summaries_${params?.companyId ?? 'current'}_${params?.repositoryId ?? 'all'}`
    : null;

  const { data, error, isLoading, mutate } = useSWR<ContentMetricSummary[]>(
    key,
    async () => (await metricsService.listContentSummaries({ repositoryId: params?.repositoryId }))
      .map(mapApiContentMetricSummaryToFrontend),
    { revalidateOnFocus: false }
  );

  return {
    metricSummaries: data || [],
    isLoading,
    isError: error,
    mutate,
  };
}

export function useVisibleUsers(ids?: string[], enabled = true) {
  const uniqueIds = ids?.length ? Array.from(new Set(ids.filter(Boolean))).sort() : [];
  const key = enabled ? `visible_users_${uniqueIds.join(',') || 'assignable'}` : null;

  const { data, error, isLoading, mutate } = useSWR<User[]>(
    key,
    async () => (await usersMeService.listVisibleUsers({ ids: uniqueIds })).map(mapApiVisibleUserToFrontend),
    { revalidateOnFocus: false }
  );

  return {
    users: data || [],
    isLoading,
    isError: error,
    mutate,
  };
}

export function useUserActivity(userId?: string) {
  const { data, error, isLoading, mutate } = useSWR<ContentViewMetric[]>(
    userId ? `user_activity_${userId}` : null,
    () => metricsService.getUserActivity(userId!).then((activity) => activity.map(mapApiViewMetricToFrontend)),
    { revalidateOnFocus: false }
  );

  return {
    activity: data || [],
    isLoading,
    isError: error,
    mutate
  };
}

export async function addContentView(metric: Omit<ContentViewMetric, 'id' | 'viewed_at'>) {
  await metricsService.recordView({
    contentId: metric.content_id,
    repositoryId: metric.repository_id,
    contentType: metric.content_type,
  });
}

export async function rateContent(metric: Omit<ContentRating, 'id' | 'created_at' | 'updated_at'>) {
  await metricsService.recordRating({
    contentId: metric.content_id,
    repositoryId: metric.repository_id,
    rating: metric.rating,
  });
}

/**
 * Hook para recuperar uma Empresa de forma PÃšBLICA e OTIMIZADA (Landing Page).
 */
export function usePublicCompanyBySlug(slug?: string) {
  const { data, error, isLoading } = useSWR<Company | null>(
    slug ? `public_company_${slug}` : null,
    () => slug
      ? landingService.getLanding(slug).then((landing) => ({
        id: landing.companyId,
        name: landing.name,
        slug: landing.slug,
        link_name: landing.slug,
        active: true,
        theme: {
          primary: landing.branding.theme.primary,
          secondary: landing.branding.theme.secondary,
          background: landing.branding.theme.surface,
          card: landing.branding.theme.surface,
          text: landing.branding.theme.text,
        },
        logo_url: landing.branding.logoUrl ?? undefined,
        hero_image: landing.branding.hero.imageUrl ?? undefined,
        hero_title: landing.branding.hero.title,
        hero_subtitle: landing.branding.hero.subtitle,
        landing_page_active: landing.landingPageActive ?? true,
        landing_page_enabled: landing.landingPageEnabled ?? true,
        landing_page_layout: landing.landingPageLayout as Company['landing_page_layout'],
        created_at: '',
      }))
      : Promise.resolve(null)
  );

  return {
    company: data || null,
    isLoading,
    isError: error
  };
}

/**
 * Hook para buscar RepositÃ³rios PÃšBLICOS da Landing Page (Zero Egress Otimizado).
 */
export function usePublicRepositories(slug?: string) {
  const { data, error, isLoading } = useSWR<Partial<Repository>[]>(
    slug ? `public_repositories_${slug}` : null,
    () => landingService
      .getPublicRepositories(slug!)
      .then((repositories) => repositories.map((repository) => mapApiRepositoryToFrontend(repository)))
  );

  return {
     // ForÃ§amos o type cast para interagir melhor com RepoCard,
     // assumindo que metadados vitais estÃ£o inclusos na query.
    repositories: (data || []) as Repository[],
    isLoading,
    isError: error
  };
}

/**
 * Hook para buscar ConteÃºdos PÃšBLICOS sob demanda (Popup Landing Page).
 * Implementa Lazy Loading agressivo para Zero Egress Inicial.
 */
export function usePublicRepositoryContents(repositoryId?: string) {
  const { data, error, isLoading } = useSWR<Content[]>(
    repositoryId ? `public_contents_repo_${repositoryId}` : null,
    () => landingService
      .getPublicContents(repositoryId!)
      .then((contents) => contents.map((content) => mapApiContentToFrontend(content)))
  );

  return {
    contents: data || [],
    isLoading,
    isError: error,
  };
}

/**
 * Hook para buscar Links Simples PÃšBLICOS sob demanda (Popup Landing Page).
 */
export function usePublicRepositorySimpleLinks(repositoryId?: string) {
  const { data, error, isLoading } = useSWR<SimpleLink[]>(
    repositoryId ? `public_simple_links_repo_${repositoryId}` : null,
    () => landingService
      .getPublicSimpleLinks(repositoryId!)
      .then((links) => links.map((link) => mapApiSimpleLinkToFrontend(link)))
  );

  return {
    simpleLinks: data || [],
    isLoading,
    isError: error,
  };
}


/**
 * Hook para buscar Cursos de uma Empresa
 */
export function useCourses(companyId?: string) {
  const { data, error, isLoading, mutate } = useSWR<Course[]>(
    companyId ? `courses_${companyId}` : null,
    () => courseService.getCourses(companyId!),
    stableCatalogSwrOptions,
  );

  return {
    courses: data || [],
    isLoading,
    isError: error,
    mutate
  };
}

/**
 * Hook para buscar MÃ³dulos de um Curso
 */
export function useCourseModules(courseId?: string) {
  const { data, error, isLoading, mutate } = useSWR<CourseModule[]>(
    courseId ? `course_modules_${courseId}` : null,
    () => courseService.getModules(courseId!)
  );

  return {
    modules: data || [],
    isLoading,
    isError: error,
    mutate
  };
}

/**
 * Hook para buscar ConteÃºdos de um MÃ³dulo
 */
export function useCourseContents(moduleId?: string) {
  const { data, error, isLoading, mutate } = useSWR<(CourseContent & { has_quiz?: boolean })[]>(
    moduleId ? `course_contents_${moduleId}` : null,
    async () => {
      const contents = await courseService.getContents(moduleId!);
      return contents.map((c: any) => ({
        ...c,
        has_quiz: (c.quizzes || []).length > 0
      }));
    }
  );

  return {
    contents: data || [],
    isLoading,
    isError: error,
    mutate
  };
}

/**
 * Hook agregado: busca TODOS os conteÃºdos de TODOS os mÃ³dulos de um curso em uma Ãºnica query.
 * Retorna um Map<moduleId, CourseContent[]>. Elimina o N+1 em listas de navegaÃ§Ã£o.
 */
export function useCourseContentsByCourse(moduleIds: string[]) {
  const sortedModuleIds = Array.from(new Set(moduleIds)).sort();
  const key = sortedModuleIds.length > 0 ? `course_contents_by_modules_${sortedModuleIds.join(',')}` : null;
  const { data, error, isLoading, mutate } = useSWR<Map<string, CourseContent[]>>(
    key,
    async () => {
      const contents = (await coursesService.listContentsByModules(sortedModuleIds)).map(mapApiCourseContentToFrontend);
      const map = new Map<string, CourseContent[]>();
      contents.forEach((c) => {
        const list = map.get(c.module_id) || [];
        list.push(c as CourseContent);
        map.set(c.module_id, list);
      });
      return map;
    }
  );
  return { contentsByModule: data || new Map<string, CourseContent[]>(), isLoading, isError: error, mutate };
}

/**
 * Hook agregado: busca TODAS as perguntas de TODOS os mÃ³dulos em uma Ãºnica query.
 */
export function useCourseQuestionsByCourse(moduleIds: string[]) {
  const sortedModuleIds = Array.from(new Set(moduleIds)).sort();
  const key = sortedModuleIds.length > 0 ? `course_questions_by_modules_${sortedModuleIds.join(',')}` : null;
  const { data, error, isLoading, mutate } = useSWR<Map<string, CoursePhaseQuestion[]>>(
    key,
    async () => {
      const questions = (await coursesService.listQuestionsByModules(sortedModuleIds)).map(mapApiCourseQuestionToFrontend);
      const map = new Map<string, CoursePhaseQuestion[]>();
      questions.forEach((q) => {
        const list = map.get(q.module_id) || [];
        list.push(q as CoursePhaseQuestion);
        map.set(q.module_id, list);
      });
      return map;
    }
  );
  return { questionsByModule: data || new Map<string, CoursePhaseQuestion[]>(), isLoading, isError: error, mutate };
}

/**
 * Hook para buscar dados mestre de um Quiz (suporta conteÃºdo legado ou curso)
 */
export function useQuiz(params: { contentId?: string; courseContentId?: string }) {
  const key = params.courseContentId ? `quiz_course_${params.courseContentId}` : params.contentId ? `quiz_content_${params.contentId}` : null;
  const { data, error, isLoading, mutate } = useSWR<Quiz>(
    key,
    () => courseService.getQuiz(params)
  );

  return {
    quiz: data,
    isLoading,
    isError: error,
    mutate
  };
}

/**
 * Hook para buscar Perguntas e OpÃ§Ãµes de um Quiz
 */
export function useQuizQuestions(quizId?: string) {
  const { data, error, isLoading, mutate } = useSWR<QuizQuestion[]>(
    quizId ? `quiz_questions_${quizId}` : null,
    () => courseService.getQuizQuestions(quizId!)
  );

  return {
    questions: data || [],
    isLoading,
    isError: error,
    mutate
  };
}

/**
 * FunÃ§Ã£o para registrar uma tentativa de quiz
 */
export async function submitQuizAttempt(attempt: Omit<QuizAttempt, 'id' | 'completed_at'>) {
  await courseService.submitQuizAttempt(attempt);
}

/**
 * Premia o usuÃ¡rio autenticado com XP e moedas.
 *
 * Phase 5 migration: was a direct call to the legacy `increment_user_stats`
* database RPC. The backend
 * now exposes `POST /api/users/me/rewards/increment` and infers the target user
 * from the session â€” the `userId` argument is kept for call-site compatibility
 * but ignored, because callers can only ever award stats to themselves.
 */
export async function awardXP(_userId: string, xp: number, coins: number = 0) {
  if (xp === 0 && coins === 0) return;
  await rewardsService.incrementSelf({ xp, coins });
}

// ============================================================================
// HOOKS DO MÃ“DULO DE CURSOS (FASES, PERGUNTAS, MATRÃCULAS)
// ============================================================================

/**
 * Hook para buscar perguntas de uma fase/mÃ³dulo
 */
export function useCourseQuestions(moduleId?: string) {
  const { data, error, isLoading, mutate } = useSWR<CoursePhaseQuestion[]>(
    moduleId ? `course_questions_${moduleId}` : null,
    () => courseService.getQuestions(moduleId!)
  );

  return {
    questions: data || [],
    isLoading,
    isError: error,
    mutate
  };
}

/**
 * Hook para buscar matrÃ­cula do usuÃ¡rio em um curso
 */
export function useCourseEnrollment(courseId?: string, userId?: string) {
  const { data, error, isLoading, mutate } = useSWR<CourseEnrollment | null>(
    courseId && userId ? `enrollment_${courseId}_${userId}` : null,
    () => courseService.getEnrollment(courseId!, userId!)
  );

  return {
    enrollment: data,
    isLoading,
    isError: error,
    mutate
  };
}

/**
 * Inicia uma matrÃ­cula em um curso
 */
export async function startEnrollment(courseId: string, userId: string, companyId: string) {
  return courseService.startEnrollment({ course_id: courseId, user_id: userId, company_id: companyId });
}

/**
 * Atualiza o progresso atual da matrÃ­cula (mÃ³dulo e conteÃºdo)
 */
export async function updateEnrollmentProgress(enrollmentId: string, moduleId: string | null, contentId: string | null) {
  return courseService.updateProgress(enrollmentId, moduleId || '', contentId || '');
}

/**
 * Registra uma resposta do aluno
 */
export async function submitCourseAnswer(
  enrollmentId: string,
  questionId: string,
  selectedOptionId: string | undefined,
  isCorrect: boolean,
  complexAnswer?: any,
  finalize = false
) {
  return courseService.submitAnswer({
    enrollment_id: enrollmentId,
    question_id: questionId,
    selected_option_id: selectedOptionId || null,
    complex_answer: complexAnswer || null,
    is_correct: isCorrect,
    completed_answer_id: finalize ? 'final' : undefined
  });
}

/**
 * Finaliza uma matrÃ­cula (calcula score e tempo)
 */
export async function completeEnrollment(
  enrollmentId: string,
  totalCorrect: number,
  totalQuestions: number,
  startedAt?: string
) {
  return courseService.completeEnrollment(enrollmentId, totalCorrect, totalQuestions, startedAt);
}

/**
 * Hook para buscar respostas do aluno em uma matrÃ­cula
 */
export function useCourseAnswers(enrollmentId?: string) {
  const { data, error, isLoading, mutate } = useSWR<CourseAnswer[]>(
    enrollmentId ? `course_answers_${enrollmentId}` : null,
    () => courseService.getAnswers(enrollmentId!)
  );

  return {
    answers: data || [],
    isLoading,
    isError: error,
    mutate
  };
}

/**
 * Hook para estatÃ­sticas de um curso (dashboard admin)
 */
export function useCourseStats(courseId?: string) {
  const { data, error, isLoading } = useSWR(
    courseId ? `course_stats_${courseId}` : null,
    async () => {
      const stats = await coursesService.getCourseStats(courseId!);
      return {
        ...stats,
        enrollments: stats.enrollments.map(mapApiCourseEnrollmentToFrontend),
      };
    }
  );

  return {
    stats: data || { totalEnrolled: 0, totalCompleted: 0, completionRate: 0, avgScore: 0, avgTimeSeconds: 0, enrollments: [] },
    isLoading,
    isError: error
  };
}

/**
 * Hook para dashboard de cursos (visao geral por company)
 */
export function useCourseDashboard(companyId?: string) {
  const { data, error, isLoading } = useSWR(
    companyId ? `course_dashboard_${companyId}` : null,
    async () => (await coursesService.getDashboard()).map(mapApiCourseEnrollmentToFrontend)
  );

  return {
    enrollments: data || [],
    isLoading,
    isError: error
  };
}

/**
 * Hook para contar modulos e conteudos de um curso (stats reais para CourseCard)
 */
export function useCourseModuleStats(courseId?: string) {
  const { data, error, isLoading } = useSWR(
    courseId ? `course_module_stats_${courseId}` : null,
    () => coursesService.getModuleStats(courseId!)
  );

  return {
    moduleStats: data || { totalModules: 0, totalContents: 0 },
    isLoading,
    isError: error
  };
}

/**
 * Admin: Liberar curso para um usuario refazer
 */
export async function resetEnrollment(courseId: string, userId: string) {
  await coursesService.resetEnrollment(courseId, userId);
}

/**
 * Hook para buscar o historico de cursos de um usuario especifico
 */
interface UserCourseHistoryEntry extends CourseEnrollment {
  courses: { title: string; image_url?: string | null } | Array<{ title: string; image_url?: string | null }> | null;
}

export function useUserCourseHistory(userId?: string, companyId?: string) {
  const { data, error, isLoading } = useSWR<UserCourseHistoryEntry[]>(
    userId && companyId ? `user_course_history_${userId}_${companyId}` : null,
    async () => (await coursesService.getUserHistory(userId!)).map(mapApiCourseEnrollmentToFrontend) as UserCourseHistoryEntry[]
  );

  return {
    history: data || [],
    isLoading,
    isError: error
  };
}

export function useOwnCourseEnrollments(courseIds: string[], userId?: string, companyId?: string) {
  const uniqueCourseIds = Array.from(new Set(courseIds)).sort();
  const key = userId && companyId && uniqueCourseIds.length > 0
    ? `own_course_enrollments_${userId}_${companyId}_${uniqueCourseIds.join(',')}`
    : null;

  const { data, error, isLoading, mutate } = useSWR<CourseEnrollment[]>(
    key,
    async () => {
      const enrollments = await Promise.all(uniqueCourseIds.map((courseId) => coursesService.getEnrollment(courseId)));
      return enrollments
        .filter((enrollment): enrollment is NonNullable<typeof enrollment> => Boolean(enrollment))
        .map(mapApiCourseEnrollmentToFrontend);
    },
    { revalidateOnFocus: false }
  );

  return {
    enrollments: data || [],
    isLoading,
    isError: error,
    mutate
  };
}

/**
 * Hook centralizado para Analytics do Dashboard de Cursos (Admin)
 */
export function useCourseAnalytics(companyId?: string) {
  const swrOpts = { revalidateOnFocus: false, revalidateOnReconnect: false, dedupingInterval: 60000 };

  const { data, isLoading, mutate } = useSWR(
    companyId ? `course_analytics_${companyId}` : null,
    async () => {
      const analytics = await coursesService.getAnalytics();
      return {
        enrollments: analytics.enrollments.map(mapApiCourseEnrollmentToFrontend),
        answers: analytics.answers.map(mapApiCourseAnswerToFrontend),
        questions: analytics.questions.map(mapApiCourseQuestionToFrontend),
      };
    },
    swrOpts
  );

  return {
    enrollments: data?.enrollments || [],
    answers: data?.answers || [],
    questions: data?.questions || [],
    isLoading,
    mutate
  };
}


