import useSWR from 'swr';
import { supabase, fetcher } from '../lib/supabaseClient';
import { Company, OrgTopLevel, OrgUnit, Repository, Content, SimpleLink, Category, User, ContentViewMetric, ContentRating, Quiz, QuizQuestion, QuizOption, QuizAttempt, Course, CourseModule, CourseContent } from '../types';

// ============================================================================

// ============================================================================
// HOOKS CENTRAIS DA ETAPA 4
// ============================================================================

/**
 * Hook para recuperar as empresas (Tenants) permitidas para o usuário ou publicamente.
 */
export function useCompanies() {
  const { data, error, isLoading, mutate } = useSWR<Company[]>('companies', () =>
    fetcher(() => supabase.from('companies').select('*').order('name'))
  );

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
export function useUsers(companyId?: string) {
  const { data, error, isLoading, mutate } = useSWR<User[]>(
    companyId ? `users_${companyId}` : 'users_all',
    () => fetcher(() => {
      let query = supabase.from('users').select('*').order('name');
      if (companyId) {
        query = query.eq('company_id', companyId);
      }
      return query;
    })
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
    () => fetcher(() => supabase.from('org_top_levels').select('*').eq('company_id', companyId).order('name'))
  );

  // Busca Unidades Lojas
  const { data: units, isLoading: loadingUnits, mutate: mutateUnits } = useSWR<OrgUnit[]>(
    companyId ? `org_units_${companyId}` : null,
    () => fetcher(() => supabase.from('org_units').select('*').eq('company_id', companyId).order('name'))
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
    () => fetcher(() => supabase.from('repositories').select('*').eq('company_id', companyId).order('created_at', { ascending: false }))
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
    () => fetcher(() => {
      let query = supabase.from('contents').select('*').order('created_at', { ascending: false });
      if (filter?.contentId) query = query.eq('id', filter.contentId);
      else if (filter?.repositoryId) query = query.eq('repository_id', filter.repositoryId);
      else if (filter?.companyId) query = query.eq('company_id', filter.companyId);
      return query;
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
    () => fetcher(() => {
      let query = supabase.from('simple_links').select('*').order('created_at', { ascending: false });
      if (filter?.repositoryId) query = query.eq('repository_id', filter.repositoryId);
      else if (filter?.companyId) query = query.eq('company_id', filter.companyId);
      return query;
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
    () => fetcher(() => supabase.from('categories').select('*').eq('repository_id', repositoryId).order('created_at', { ascending: true }))
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
    () => fetcher(() => supabase.from('content_views').select('*').eq('repository_id', repositoryId))
  );

  const { data: ratings, isLoading: loadingRatings, mutate: mutateRatings } = useSWR<ContentRating[]>(
    repositoryId ? `content_ratings_${repositoryId}` : null,
    () => fetcher(() => supabase.from('content_ratings').select('*').eq('repository_id', repositoryId))
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
    () => fetcher(() => supabase.from('content_views').select('*').eq('company_id', companyId))
  );

  const { data: ratings, isLoading: loadingRatings, mutate: mutateRatings } = useSWR<ContentRating[]>(
    companyId ? `company_ratings_${companyId}` : null,
    () => fetcher(() => supabase.from('content_ratings').select('*').eq('company_id', companyId))
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
    () => fetcher(() => supabase.from('content_views').select('*').eq('user_id', userId).order('viewed_at', { ascending: false }))
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
  const { error } = await supabase.from('content_views').insert({
    ...metric,
    viewed_at: new Date().toISOString()
  });
  if (error) {
    console.error('Error adding content view:', error);
    throw error;
  }
}

/**
 * Função para avaliar um conteúdo
 */
export async function rateContent(metric: Omit<ContentRating, 'id' | 'created_at' | 'updated_at'>) {
  // Tenta bucar uma avaliação existente para atualizar, ou insere uma nova
  const { data: existing } = await supabase
    .from('content_ratings')
    .select('id')
    .eq('user_id', metric.user_id)
    .eq('content_id', metric.content_id)
    .single();

  if (existing) {
    const { error } = await supabase
      .from('content_ratings')
      .update({ 
        rating: metric.rating,
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('content_ratings').insert({
      ...metric,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    if (error) throw error;
  }
}

/**
 * Função para atualizar dados do usuário no Supabase
 */
export async function updateSupabaseUser(userId: string, data: Partial<User>) {
  const { error } = await supabase
    .from('users')
    .update(data)
    .eq('id', userId);
    
  if (error) {
    console.error('Error updating user:', error);
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
        .select('*')
        .eq('repository_id', repositoryId)
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
        .select('*')
        .eq('repository_id', repositoryId)
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
    () => fetcher(() => supabase.from('courses').select('*').eq('company_id', companyId).order('created_at', { ascending: false }))
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
    () => fetcher(() => supabase.from('course_modules').select('*').eq('course_id', courseId).order('order_index', { ascending: true }))
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
        .select('*, quizzes(id)')
        .eq('module_id', moduleId)
        .order('order_index', { ascending: true });
        
      if (error) throw error;
      
      return contents.map(c => ({
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
      let query = supabase.from('quizzes').select('*');
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
      .select('*, quiz_options(*)')
      .eq('quiz_id', quizId)
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
  const { error } = await supabase.from('quiz_attempts').insert({
    ...attempt,
    completed_at: new Date().toISOString()
  });
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
