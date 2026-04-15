import useSWR from 'swr';
import { supabase, fetcher } from '../lib/supabaseClient';
import { Company, OrgTopLevel, OrgUnit, Repository, Content, SimpleLink, Category, User, ContentViewMetric, ContentRating, Quiz, QuizQuestion, QuizOption, QuizAttempt, Course, CourseModule, CourseContent, CoursePhaseQuestion, CourseEnrollment, CourseAnswer } from '../types';
import { 
  userSchema,
  companySchema,
  contentViewMetricSchema, 
  contentRatingSchema,
  quizAttemptSchema,
  courseEnrollmentSchema,
  courseAnswerSchema,
  repositorySchema,
  repositoryContentSchema,
  simpleLinkSchema,
  courseSchema,
  courseModuleSchema,
  courseContentSchema
} from '../types/schemas';
import { z } from 'zod';
import { Logger } from '../utils/logger';

/**
 * Máscara de CPF (123.***.***-**)
 */
export const maskCPF = (cpf: string | null | undefined) => {
  if (!cpf) return cpf;
  const clean = cpf.replace(/\D/g, '');
  if (clean.length < 3) return clean;
  return `${clean.substring(0, 3)}.***.***-**`;
};

// ============================================================================

// ============================================================================
// HOOKS CENTRAIS DA ETAPA 4
// ============================================================================

/**
 * Hook para recuperar as empresas (Tenants) permitidas para o usuário ou publicamente.
 */
export function useCompanies(includeDeleted = false) {
  const { data, error, isLoading, mutate } = useSWR<Company[]>(`companies_${includeDeleted}`, async () => {
    const data = await fetcher(() => {
      let query = supabase.from('companies')
        .select('id, name, slug, link_name, theme, logo_url, hero_image, hero_title, hero_subtitle, hero_position, hero_brightness, public_bio, active, landing_page_enabled, landing_page_active, landing_page_layout, checklists_enabled, org_unit_name, org_top_level_name, org_levels, created_at, updated_at, deleted_at')
        .order('name');
      
      if (!includeDeleted) {
        query = query.is('deleted_at', null);
      }
      return query;
    });
    
    try {
      return z.array(companySchema.partial()).parse(data) as Company[];
    } catch (err) {
      Logger.error('Zod Validation Error [useCompanies]:', err);
      return data as Company[];
    }
  });

  return {
    companies: data || [],
    isLoading,
    isError: error,
    mutate
  };
}

/**
 * Hook para recuperar os usuários, filtrando opcionalmente por company.
 */
export function useUsers(companyId?: string, includeDeleted = false) {
  const cacheKey = companyId ? `users_${companyId}_${includeDeleted}` : `users_all_${includeDeleted}`;
  const { data, error, isLoading, mutate } = useSWR<User[]>(
    cacheKey,
    async () => {
      const data = await fetcher(() => {
        let query = supabase.from('users')
          .select('id, name, email, cpf, role, company_id, org_unit_id, org_top_level_id, avatar_url, active, first_access, status, xp_total, coins_total, created_at, deleted_at')
          .order('name');
        
        if (companyId) {
          query = query.eq('company_id', companyId);
        }

        if (!includeDeleted) {
          query = query.is('deleted_at', null);
        }

        return query;
      });

      try {
        const validated = z.array(userSchema.partial()).parse(data);

        // Máscara de CPF (Passo 2)
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
        return (data as any[]).map(u => ({
          ...u,
          cpf_raw: u?.cpf,
          cpf: maskCPF(u?.cpf)
        })) as User[];
      }
    }
  );

  return {
    users: data || [],
    isLoading,
    isError: error,
    mutate
  };
}

/**
 * Hook para buscar a árvore organizacional atrelada à empresa.
 */
export function useOrgStructure(companyId?: string) {
  // Busca Níveis Macro (Top Levels)
  const { data: topLevels, isLoading: loadingTopLevels, mutate: mutateTopLevels } = useSWR<OrgTopLevel[]>(
    companyId ? `org_top_levels_${companyId}` : null,
    () => fetcher(() => supabase.from('org_top_levels').select('id, company_id, level_id, parent_id, name, active, created_at, deleted_at').eq('company_id', companyId).is('deleted_at', null).order('name'))
  );

  // Busca Unidades Lojas
  const { data: units, isLoading: loadingUnits, mutate: mutateUnits } = useSWR<OrgUnit[]>(
    companyId ? `org_units_${companyId}` : null,
    () => fetcher(() => supabase.from('org_units').select('id, company_id, parent_id, name, active, created_at, deleted_at').eq('company_id', companyId).is('deleted_at', null).order('name'))
  );

  return {
    orgTopLevels: topLevels || [],
    orgUnits: units || [],
    isLoading: loadingTopLevels || loadingUnits,
    mutateTopLevels,
    mutateUnits
  };
}

/**
 * Hook para buscar Repositórios
 */
export function useRepositories(companyId?: string) {
  const { data, error, isLoading, mutate } = useSWR<Repository[]>(
    companyId ? `repositories_${companyId}` : null,
    () => fetcher(async () => {
      const result = await supabase.from('repositories')
        .select('id, company_id, name, description, cover_image, banner_image, featured, show_in_landing, type, status, access_type, allowed_user_ids, allowed_region_ids, allowed_store_ids, excluded_user_ids, banner_position, banner_brightness, created_at, deleted_at')
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      
      if (result.data) {
        result.data = z.array(repositorySchema.partial()).parse(result.data) as any;
      }
      return result;
    })
  );

  return {
    repositories: data || [],
    isLoading,
    isError: error,
    mutate
  };
}

/**
 * Hook para buscar Conteúdos (PDF/Videos/Docs) de um Repositório Específico ou de toda a Empresa
 */
export function useContents(filter?: { repositoryId?: string; companyId?: string; contentId?: string }) {
  const key = filter?.contentId ? `contents_id_${filter.contentId}` : filter?.repositoryId ? `contents_repo_${filter.repositoryId}` : filter?.companyId ? `contents_company_${filter.companyId}` : null;
  const { data, error, isLoading, mutate } = useSWR<Content[]>(
    key,
    () => fetcher(async () => {
      let query = supabase.from('contents')
        .select('id, company_id, repository_id, category_id, title, description, thumbnail_url, type, url, embed_url, featured, recent, status, created_at, deleted_at')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (filter?.contentId) query = query.eq('id', filter.contentId);
      else if (filter?.repositoryId) query = query.eq('repository_id', filter.repositoryId);
      else if (filter?.companyId) query = query.eq('company_id', filter.companyId);
      
      const result = await query;
      if (result.data) {
        result.data = z.array(repositoryContentSchema.partial()).parse(result.data) as any;
      }
      return result;
    })
  );

  return {
    contents: data || [],
    isLoading,
    isError: error,
    mutate
  };
}

/**
 * Hook para buscar Links Simples de um Repositório Específico ou de toda a Empresa
 */
export function useSimpleLinks(filter?: { repositoryId?: string; companyId?: string }) {
  const key = filter?.repositoryId ? `simple_links_repo_${filter.repositoryId}` : filter?.companyId ? `simple_links_company_${filter.companyId}` : null;
  const { data, error, isLoading, mutate } = useSWR<SimpleLink[]>(
    key,
    () => fetcher(async () => {
      let query = supabase.from('simple_links')
        .select('id, company_id, repository_id, name, url, type, date, status, created_at, deleted_at')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (filter?.repositoryId) query = query.eq('repository_id', filter.repositoryId);
      else if (filter?.companyId) query = query.eq('company_id', filter.companyId);
      
      const result = await query;
      if (result.data) {
        result.data = z.array(simpleLinkSchema.partial()).parse(result.data) as any;
      }
      return result;
    })
  );

  return {
    simpleLinks: data || [],
    isLoading,
    isError: error,
    mutate
  };
}

/**
 * Hook para buscar Categorias de um repositório
 */
export function useCategories(repositoryId?: string) {
  const { data, error, isLoading, mutate } = useSWR<Category[]>(
    repositoryId ? `categories_${repositoryId}` : null,
    () => fetcher(() => supabase.from('categories')
      .select('id, repository_id, name, order_index, created_at, deleted_at')
      .eq('repository_id', repositoryId)
      .is('deleted_at', null)
      .order('created_at', { ascending: true }))
  );

  return {
    categories: data || [],
    isLoading,
    isError: error,
    mutate
  };
}

/**
 * Hook para buscar as Métricas (Visualizações e Avaliações) de um Repositório
 */
export function useRepositoryMetrics(repositoryId?: string) {
  const { data: views, isLoading: loadingViews, mutate: mutateViews } = useSWR<ContentViewMetric[]>(
    repositoryId ? `content_views_${repositoryId}` : null,
    () => fetcher(() => supabase.from('content_views').select('id, user_id, content_id, company_id, repository_id, content_type, viewed_at').eq('repository_id', repositoryId))
  );

  const { data: ratings, isLoading: loadingRatings, mutate: mutateRatings } = useSWR<ContentRating[]>(
    repositoryId ? `content_ratings_${repositoryId}` : null,
    () => fetcher(() => supabase.from('content_ratings').select('id, user_id, content_id, company_id, repository_id, rating, created_at').eq('repository_id', repositoryId))
  );

  const mutate = async () => {
    mutateViews();
    mutateRatings();
  };

  return {
    contentViews: views || [],
    contentRatings: ratings || [],
    isLoading: loadingViews || loadingRatings,
    mutate
  };
}

/**
 * Hook para buscar todas as métricas (Visualizações e Avaliações) de uma Empresa
 */
export function useCompanyMetrics(companyId?: string) {
  const { data: views, isLoading: loadingViews, mutate: mutateViews } = useSWR<ContentViewMetric[]>(
    companyId ? `company_views_${companyId}` : null,
    () => fetcher(() => supabase.from('content_views').select('id, user_id, content_id, company_id, repository_id, content_type, viewed_at').eq('company_id', companyId))
  );

  const { data: ratings, isLoading: loadingRatings, mutate: mutateRatings } = useSWR<ContentRating[]>(
    companyId ? `company_ratings_${companyId}` : null,
    () => fetcher(() => supabase.from('content_ratings').select('id, user_id, content_id, company_id, repository_id, rating, created_at').eq('company_id', companyId))
  );

  const mutate = async () => {
    mutateViews();
    mutateRatings();
  };

  return {
    contentViews: views || [],
    contentRatings: ratings || [],
    isLoading: loadingViews || loadingRatings,
    mutate
  };
}

/**
 * Hook para buscar a atividade (visualizações) de um usuário específico
 */
export function useUserActivity(userId?: string) {
  const { data, error, isLoading, mutate } = useSWR<ContentViewMetric[]>(
    userId ? `user_activity_${userId}` : null,
    () => fetcher(() => supabase.from('content_views').select('id, user_id, content_id, company_id, repository_id, content_type, viewed_at').eq('user_id', userId).order('viewed_at', { ascending: false }))
  );

  return {
    activity: data || [],
    isLoading,
    isError: error,
    mutate
  };
}

/**
 * Função para registrar uma visualização de conteúdo
 */
export async function addContentView(metric: Omit<ContentViewMetric, 'id' | 'viewed_at'>) {
  const validation = contentViewMetricSchema.safeParse({
    ...metric,
    viewed_at: new Date().toISOString()
  });

  if (!validation.success) {
    throw new Error("Dados de métrica inválidos: " + validation.error.message);
  }

  const { error } = await supabase.from('content_views').insert(validation.data);
  if (error) {
    Logger.error('Error adding content view:', error);
    throw error;
  }
}

/**
 * Função para avaliar um conteúdo
 */
export async function rateContent(metric: Omit<ContentRating, 'id' | 'created_at' | 'updated_at'>) {
  const validation = contentRatingSchema.safeParse({
    ...metric,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  if (!validation.success) {
    throw new Error("Dados de avaliação inválidos: " + validation.error.message);
  }

  const validatedData = validation.data;

  // Tenta bucar uma avaliação existente para atualizar, ou insere uma nova
  const { data: existing } = await supabase
    .from('content_ratings')
    .select('id')
    .eq('user_id', validatedData.user_id)
    .eq('content_id', validatedData.content_id)
    .single();

  if (existing) {
    const { error } = await supabase
      .from('content_ratings')
      .update({ 
        rating: validatedData.rating,
        updated_at: validatedData.updated_at
      })
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('content_ratings').insert(validatedData);
    if (error) throw error;
  }
}

/**
 * Função para atualizar dados do usuário no Supabase
 */
export async function updateSupabaseUser(userId: string, data: Partial<User>) {
  // Validação estrita via Zod (schemas.ts)
  const validation = userSchema.partial().safeParse(data);
  
  if (!validation.success) {
    const errorMsg = "Dados de usuário inválidos: " + validation.error.errors.map(e => e.message).join(', ');
    Logger.error(errorMsg, validation.error);
    throw new Error(errorMsg);
  }

  const { error } = await supabase
    .from('users')
    .update(validation.data)
    .eq('id', userId);
    
  if (error) {
    Logger.error('Error updating user:', error);
    throw error;
  }
}

/**
 * Hook para recuperar uma Empresa de forma PÚBLICA e OTIMIZADA (Landing Page).
 */
export function usePublicCompanyBySlug(slug?: string) {
  const { data, error, isLoading } = useSWR<Company | null>(
    slug ? `public_company_${slug}` : null,
    () => fetcher(() => supabase
        .from('companies')
        .select(`id, name, slug, link_name, theme, logo_url, hero_image, hero_title, hero_subtitle, public_bio, active, landing_page_active, landing_page_layout`)
        .or(`slug.eq.${slug},link_name.eq.${slug}`)
        .eq('active', true)
        .single()
    ) as unknown as Promise<Company | null>
  );

  return {
    company: data || null,
    isLoading,
    isError: error
  };
}

/**
 * Hook para buscar Repositórios PÚBLICOS da Landing Page (Zero Egress Otimizado).
 */
export function usePublicRepositories(companyId?: string) {
  const { data, error, isLoading } = useSWR<Partial<Repository>[]>(
    companyId ? `public_repositories_${companyId}` : null,
    () => fetcher(() => supabase.from('repositories')
      .select('id, name, description, cover_image, type, show_in_landing')
      .eq('company_id', companyId)
      .eq('status', 'ACTIVE')
      .eq('show_in_landing', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    )
  );

  return {
     // Forçamos o type cast para interagir melhor com RepoCard,
     // assumindo que metadados vitais estão inclusos na query.
    repositories: (data || []) as Repository[],
    isLoading,
    isError: error
  };
}

/**
 * Hook para buscar Conteúdos PÚBLICOS sob demanda (Popup Landing Page).
 * Implementa Lazy Loading agressivo para Zero Egress Inicial.
 */
export function usePublicRepositoryContents(repositoryId?: string) {
  const { data, error, isLoading } = useSWR<Content[]>(
    repositoryId ? `public_contents_repo_${repositoryId}` : null,
    () => fetcher(() => supabase
        .from('contents')
        .select('id, company_id, repository_id, category_id, title, description, thumbnail_url, type, url, embed_url, featured, recent, status')
        .eq('repository_id', repositoryId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
    )
  );

  return {
    contents: data || [],
    isLoading,
    isError: error,
  };
}

/**
 * Hook para buscar Links Simples PÚBLICOS sob demanda (Popup Landing Page).
 */
export function usePublicRepositorySimpleLinks(repositoryId?: string) {
  const { data, error, isLoading } = useSWR<SimpleLink[]>(
    repositoryId ? `public_simple_links_repo_${repositoryId}` : null,
    () => fetcher(() => supabase
        .from('simple_links')
        .select('id, company_id, repository_id, name, url, type, status')
        .eq('repository_id', repositoryId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
    )
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
    () => fetcher(async () => {
      const result = await supabase.from('courses')
        .select('id, company_id, title, description, thumbnail_url, status, access_type, allowed_user_ids, allowed_region_ids, allowed_store_ids, excluded_user_ids, passing_score, diploma_template, created_at, deleted_at')
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      
      if (result.data) {
        result.data = z.array(courseSchema.partial()).parse(result.data) as any;
      }
      return result;
    })
  );

  return {
    courses: data || [],
    isLoading,
    isError: error,
    mutate
  };
}

/**
 * Hook para buscar Módulos de um Curso
 */
export function useCourseModules(courseId?: string) {
  const { data, error, isLoading, mutate } = useSWR<CourseModule[]>(
    courseId ? `course_modules_${courseId}` : null,
    () => fetcher(async () => {
      const result = await supabase.from('course_modules')
        .select('id, course_id, title, order_index, created_at, deleted_at')
        .eq('course_id', courseId)
        .is('deleted_at', null)
        .order('order_index', { ascending: true });
      
      if (result.data) {
        result.data = z.array(courseModuleSchema.partial()).parse(result.data) as any;
      }
      return result;
    })
  );

  return {
    modules: data || [],
    isLoading,
    isError: error,
    mutate
  };
}

/**
 * Hook para buscar Conteúdos de um Módulo
 */
export function useCourseContents(moduleId?: string) {
  const { data, error, isLoading, mutate } = useSWR<(CourseContent & { has_quiz?: boolean })[]>(
    moduleId ? `course_contents_${moduleId}` : null,
    async () => {
      const { data: contents, error } = await supabase
        .from('course_contents')
        .select('id, module_id, title, type, url, order_index, created_at, deleted_at, quizzes(id)')
        .eq('module_id', moduleId)
        .is('deleted_at', null)
        .order('order_index', { ascending: true });
        
      if (error) throw error;
      const validated = z.array(courseContentSchema.partial()).parse(contents);
      
      return validated.map(c => ({
        ...c,
        has_quiz: (c.quizzes as unknown[]).length > 0
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
 * Hook para buscar dados mestre de um Quiz (suporta conteúdo legado ou curso)
 */
export function useQuiz(params: { contentId?: string; courseContentId?: string }) {
  const key = params.courseContentId ? `quiz_course_${params.courseContentId}` : params.contentId ? `quiz_content_${params.contentId}` : null;
  const { data, error, isLoading, mutate } = useSWR<Quiz>(
    key,
    () => fetcher(() => {
      let query = supabase.from('quizzes')
        .select('id, company_id, content_id, course_content_id, title, passing_score, time_limit, points_reward');
        // .is('deleted_at', null); // TODO: Descomentar após aplicar a migration 20260411182000
      if (params.courseContentId) query = query.eq('course_content_id', params.courseContentId);
      else if (params.contentId) query = query.eq('content_id', params.contentId);
      return query.maybeSingle();
    })
  );

  return {
    quiz: data,
    isLoading,
    isError: error,
    mutate
  };
}

/**
 * Hook para buscar Perguntas e Opções de um Quiz
 */
export function useQuizQuestions(quizId?: string) {
  const { data, error, isLoading, mutate } = useSWR<QuizQuestion[]>(
    quizId ? `quiz_questions_${quizId}` : null,
    () => fetcher(() => supabase
      .from('quiz_questions')
      .select('id, quiz_id, question_text, explanation, order_index, quiz_options(id, question_id, option_text, is_correct, order_index)')
      .eq('quiz_id', quizId)
      .is('deleted_at', null)
      .order('order_index', { ascending: true })
    )
  );

  return {
    questions: data || [],
    isLoading,
    isError: error,
    mutate
  };
}

/**
 * Função para registrar uma tentativa de quiz
 */
export async function submitQuizAttempt(attempt: Omit<QuizAttempt, 'id' | 'completed_at'>) {
  const validation = quizAttemptSchema.safeParse({
    ...attempt,
    completed_at: new Date().toISOString()
  });

  if (!validation.success) {
    throw new Error("Dados de tentativa de quiz inválidos: " + validation.error.message);
  }

  const { error } = await supabase.from('quiz_attempts').insert(validation.data);
  if (error) throw error;
}

/**
 * Função para premiar o usuário com XP e Moedas
 */
export async function awardXP(userId: string, xp: number, coins: number = 0) {
  if (!userId || (xp === 0 && coins === 0)) return;

  const { error } = await supabase.rpc('increment_user_stats', {
    user_id_param: userId,
    xp_to_add: xp,
    coins_to_add: coins
  });
  
  if (error) throw error;
}

// ============================================================================
// HOOKS DO MÓDULO DE CURSOS (FASES, PERGUNTAS, MATRÍCULAS)
// ============================================================================

/**
 * Hook para buscar perguntas de uma fase/módulo
 */
export function useCourseQuestions(moduleId?: string) {
  const { data, error, isLoading, mutate } = useSWR<CoursePhaseQuestion[]>(
    moduleId ? `course_questions_${moduleId}` : null,
    async () => {
      const { data: questions, error } = await supabase
        .from('course_phase_questions')
        .select('id, module_id, question_text, question_type, configuration, image_url, explanation, order_index, deleted_at, options:course_question_options(id, question_id, option_text, is_correct, order_index)')
        .eq('module_id', moduleId)
        .is('deleted_at', null)
        .order('order_index', { ascending: true });
      if (error) throw error;
      return questions as CoursePhaseQuestion[];
    }
  );

  return {
    questions: data || [],
    isLoading,
    isError: error,
    mutate
  };
}

/**
 * Hook para buscar matrícula do usuário em um curso
 */
export function useCourseEnrollment(courseId?: string, userId?: string) {
  const { data, error, isLoading, mutate } = useSWR<CourseEnrollment | null>(
    courseId && userId ? `enrollment_${courseId}_${userId}` : null,
    async () => {
      const { data, error } = await supabase
        .from('course_enrollments')
        .select('id, course_id, user_id, company_id, status, started_at, completed_at, score_percent, total_correct, total_questions, current_module_id, current_content_id')
        .eq('course_id', courseId)
        .eq('user_id', userId)
        .is('deleted_at', null)
        .maybeSingle();
      if (error) throw error;
      return data;
    }
  );

  return {
    enrollment: data,
    isLoading,
    isError: error,
    mutate
  };
}

/**
 * Inicia uma matrícula em um curso
 */
export async function startEnrollment(courseId: string, userId: string, companyId: string) {
  // Verifica se já existe uma matrícula — protege cursos COMPLETED de serem resetados
  const { data: existing } = await supabase
    .from('course_enrollments')
    .select('id, status, course_id, user_id')
    .eq('course_id', courseId)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .maybeSingle();

  if (existing) {
    // Se já está COMPLETED, retorna sem modificar
    return existing as CourseEnrollment;
  }

  // Cria nova matrícula apenas se não existir
  const validation = courseEnrollmentSchema.safeParse({
    course_id: courseId,
    user_id: userId,
    company_id: companyId,
    status: 'IN_PROGRESS',
    started_at: new Date().toISOString()
  });

  if (!validation.success) {
    throw new Error("Dados de matrícula inválidos: " + validation.error.message);
  }

  const { data, error } = await supabase
    .from('course_enrollments')
    .insert(validation.data)
    .select('id')
    .single();
  if (error) throw error;
  return data as CourseEnrollment;
}

/**
 * Atualiza o progresso atual da matrícula (módulo e conteúdo)
 */
export async function updateEnrollmentProgress(enrollmentId: string, moduleId: string | null, contentId: string | null) {
  const payload = {
    current_module_id: moduleId,
    current_content_id: contentId,
    updated_at: new Date().toISOString()
  };

  const validation = courseEnrollmentSchema.partial().safeParse(payload);
  if (!validation.success) {
    throw new Error("Dados de progresso inválidos: " + validation.error.message);
  }

  const { error } = await supabase
    .from('course_enrollments')
    .update(validation.data)
    .eq('id', enrollmentId);
  if (error) throw error;
}

/**
 * Registra uma resposta do aluno
 */
export async function submitCourseAnswer(
  enrollmentId: string,
  questionId: string,
  selectedOptionId: string | undefined,
  isCorrect: boolean,
  complexAnswer?: any
) {
  const validation = courseAnswerSchema.safeParse({
    enrollment_id: enrollmentId,
    question_id: questionId,
    selected_option_id: selectedOptionId || null,
    complex_answer: complexAnswer || null,
    is_correct: isCorrect,
    answered_at: new Date().toISOString()
  });

  if (!validation.success) {
    throw new Error("Dados de resposta inválidos: " + validation.error.message);
  }

  const { error } = await supabase
    .from('course_answers')
    .upsert(validation.data, { onConflict: 'enrollment_id,question_id' });
  if (error) throw error;
}

/**
 * Finaliza uma matrícula (calcula score e tempo)
 */
export async function completeEnrollment(
  enrollmentId: string,
  totalCorrect: number,
  totalQuestions: number,
  startedAt: string
) {
  const now = new Date();
  const startTime = startedAt ? new Date(startedAt) : now;
  const timeSpent = isNaN(startTime.getTime()) ? 0 : Math.round((now.getTime() - startTime.getTime()) / 1000);
  const scorePercent = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 100;

  const validation = courseEnrollmentSchema.safeParse({
    status: 'COMPLETED',
    completed_at: now.toISOString(),
    score_percent: scorePercent,
    total_correct: totalCorrect,
    total_questions: totalQuestions,
    time_spent_seconds: timeSpent,
    updated_at: now.toISOString()
  });

  if (!validation.success) {
    throw new Error("Dados de finalização inválidos: " + validation.error.message);
  }

  const { data, error } = await supabase
    .from('course_enrollments')
    .update(validation.data)
    .eq('id', enrollmentId)
    .select('id')
    .single();
  if (error) throw error;
  return data as CourseEnrollment;
}

/**
 * Hook para buscar respostas do aluno em uma matrícula
 */
export function useCourseAnswers(enrollmentId?: string) {
  const { data, error, isLoading, mutate } = useSWR<CourseAnswer[]>(
    enrollmentId ? `course_answers_${enrollmentId}` : null,
    () => fetcher(() => supabase
      .from('course_answers')
      .select('id, enrollment_id, question_id, selected_option_id, complex_answer, is_correct, answered_at')
      .eq('enrollment_id', enrollmentId)
    )
  );

  return {
    answers: data || [],
    isLoading,
    isError: error,
    mutate
  };
}

/**
 * Hook para estatísticas de um curso (dashboard admin)
 */
export function useCourseStats(courseId?: string) {
  const { data, error, isLoading } = useSWR(
    courseId ? `course_stats_${courseId}` : null,
    async () => {
      const { data: enrollments, error } = await supabase
        .from('course_enrollments')
        .select('id, course_id, user_id, company_id, status, score_percent, time_spent_seconds')
        .eq('course_id', courseId);
      if (error) throw error;

      const completed = (enrollments || []).filter(e => e.status === 'COMPLETED');
      const totalEnrolled = enrollments?.length || 0;
      const completionRate = totalEnrolled > 0 ? Math.round((completed.length / totalEnrolled) * 100) : 0;
      const avgScore = completed.length > 0 ? Math.round(completed.reduce((sum, e) => sum + (e.score_percent || 0), 0) / completed.length) : 0;
      const avgTime = completed.length > 0 ? Math.round(completed.reduce((sum, e) => sum + (e.time_spent_seconds || 0), 0) / completed.length) : 0;

      return {
        totalEnrolled,
        totalCompleted: completed.length,
        completionRate,
        avgScore,
        avgTimeSeconds: avgTime,
        enrollments: enrollments || []
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
 * Hook para dashboard de cursos (visão geral por company)
 */
export function useCourseDashboard(companyId?: string) {
  const { data, error, isLoading } = useSWR(
    companyId ? `course_dashboard_${companyId}` : null,
    async () => {
      const { data: enrollments, error } = await supabase
        .from('course_enrollments')
        .select('id, status, course_id, user_id, created_at, courses(id, title)')
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return enrollments || [];
    }
  );

  return {
    enrollments: data || [],
    isLoading,
    isError: error
  };
}

/**
 * Hook para contar módulos e conteúdos de um curso (stats reais para CourseCard)
 */
export function useCourseModuleStats(courseId?: string) {
  const { data, error, isLoading } = useSWR(
    courseId ? `course_module_stats_${courseId}` : null,
    async () => {
      const { data: modules, error: mErr } = await supabase
        .from('course_modules')
        .select('id')
        .eq('course_id', courseId);
      if (mErr) throw mErr;
      
      let totalContents = 0;
      if (modules && modules.length > 0) {
        const moduleIds = modules.map(m => m.id);
        const { count, error: cErr } = await supabase
          .from('course_contents')
          .select('id', { count: 'exact', head: true })
          .in('module_id', moduleIds);
        if (cErr) throw cErr;
        totalContents = count || 0;
      }

      return {
        totalModules: modules?.length || 0,
        totalContents
      };
    }
  );

  return {
    moduleStats: data || { totalModules: 0, totalContents: 0 },
    isLoading,
    isError: error
  };
}

/**
 * Admin: Liberar curso para um usuário refazer
 */
export async function resetEnrollment(courseId: string, userId: string) {
  // Arquiva a matrícula anterior para que o usuário possa refazer
  const { error } = await supabase
    .from('course_enrollments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('course_id', courseId)
    .eq('user_id', userId);
  if (error) throw error;
}

/**
 * Hook para buscar o histórico de cursos de um usuário específico
 */
export function useUserCourseHistory(userId?: string, companyId?: string) {
  const { data, error, isLoading } = useSWR(
    userId && companyId ? `user_course_history_${userId}_${companyId}` : null,
    async () => {
      const { data, error } = await supabase
        .from('course_enrollments')
        .select('id, course_id, user_id, company_id, status, started_at, completed_at, created_at, courses(title)')
        .eq('user_id', userId)
        .eq('company_id', companyId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  );

  return {
    history: data || [],
    isLoading,
    isError: error
  };
}

/**
 * Hook centralizado para Analytics do Dashboard de Cursos (Admin)
 */
export function useCourseAnalytics(companyId?: string) {
  const { data: enrollments, isLoading: loadingEnrollments, mutate: mutateEnrollments } = useSWR<CourseEnrollment[]>(
    companyId ? `course_enrollments_all_${companyId}` : null,
    () => fetcher(() => supabase.from('course_enrollments')
      .select('id, user_id, course_id, company_id, status, score_percent, started_at, completed_at, created_at')
      .eq('company_id', companyId)
      .is('deleted_at', null))
  );

  const { data: answers, isLoading: loadingAnswers, mutate: mutateAnswers } = useSWR(
    companyId ? `course_analytics_answers_${companyId}` : null,
    async () => {
      const { data, error } = await supabase
        .from('course_answers')
        .select(`
          id, enrollment_id, question_id, completed_answer_id, selected_option_id, complex_answer, is_correct, answered_at,
          course_enrollments!inner(company_id)
        `)
        .eq('course_enrollments.company_id', companyId);
      if (error) throw error;
      return data;
    }
  );

  const { data: questions, isLoading: loadingQuestions, mutate: mutateQuestions } = useSWR(
    companyId ? `course_analytics_questions_${companyId}` : null,
    async () => {
      const { data, error } = await supabase
        .from('course_phase_questions')
        .select(`
          id, module_id, question_text, question_type, configuration, image_url, explanation, order_index,
          course_modules!inner(
            course_id,
           deleted_at,
            courses!inner(company_id, deleted_at)
          )
        `)
        .eq('course_modules.courses.company_id', companyId)
        .is('deleted_at', null)
        .is('course_modules.deleted_at', null)
        .is('course_modules.courses.deleted_at', null);
      
      if (error) throw error;
      
      const { data: options, error: optErr } = await supabase
        .from('course_question_options')
        .select('id, question_id, option_text, is_correct, created_at, deleted_at')
        .is('deleted_at', null);
      
      if (optErr) throw optErr;

      return data.map(q => ({
        ...q,
        options: options.filter(o => o.question_id === q.id)
      }));
    }
  );

  const mutate = async () => {
    await Promise.all([mutateEnrollments(), mutateAnswers(), mutateQuestions()]);
  };

  return {
    enrollments: enrollments || [],
    answers: (answers as any[]) || [],
    questions: (questions as any[]) || [],
    isLoading: loadingEnrollments || loadingAnswers || loadingQuestions,
    mutate
  };
}
