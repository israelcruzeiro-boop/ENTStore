import { z } from 'zod';

export const userSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('E-mail inválido').or(z.string().regex(/^\d{11}@storepage\.com$/, 'Formato de e-mail de fallback inválido')),
  cpf: z.string().nullable().optional(),
  role: z.string().nullable().optional(),
  active: z.boolean().default(true).nullable().optional(),
  org_unit_id: z.string().uuid().nullable().optional(),
  company_id: z.string().uuid().nullable().optional(),
  password: z.string().optional().nullable(),
  deleted_at: z.any().nullable().optional(),
});

export const adminProvisioningSchema = z.object({
  name: z.string().min(2, 'O nome do responsável deve ter pelo menos 2 caracteres'),
  email: z.string().email('E-mail administrativo inválido'),
  password: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
});

// --- ESTRUTURA ORGANIZACIONAL ---
export const orgTopLevelSchema = z.object({
  company_id: z.string().uuid(),
  level_id: z.string().optional().nullable(),
  name: z.string().min(1, 'Nome é obrigatório'),
  parent_id: z.string().uuid().optional().nullable(),
  active: z.boolean().default(true),
  order_index: z.number().int().min(0).optional(),
  deleted_at: z.string().datetime().nullable().optional(),
});

export const orgUnitSchema = z.object({
  company_id: z.string().uuid(),
  name: z.string().min(1, 'Nome é obrigatório'),
  parent_id: z.string().uuid().optional().nullable(),
  active: z.boolean().default(true),
  order_index: z.number().int().min(0).optional(),
  deleted_at: z.string().datetime().nullable().optional(),
});

// --- EMPRESAS ---
export const companySchema = z.object({
  id: z.string().uuid().optional().nullable(),
  name: z.string().min(1, 'Nome é obrigatório'),
  slug: z.any().nullable().optional(),
  link_name: z.any().nullable().optional(),
  active: z.boolean().default(true).nullable().optional(),
  org_unit_name: z.string().optional().nullable(),
  org_top_level_name: z.string().optional().nullable(),
  org_levels: z.any().optional().nullable(),
  theme: z.any().optional().nullable(),
  logo_url: z.string().nullable().optional(),
  hero_image: z.string().nullable().optional(),
  hero_title: z.string().nullable().optional(),
  hero_subtitle: z.string().nullable().optional(),
  hero_position: z.number().nullable().optional(),
  hero_brightness: z.number().nullable().optional(),
  public_bio: z.string().nullable().optional(),
  landing_page_enabled: z.boolean().optional().nullable(),
  landing_page_active: z.boolean().optional().nullable(),
  landing_page_layout: z.string().nullable().optional(),
  checklists_enabled: z.boolean().optional().nullable(),
  created_at: z.string().optional().nullable(),
  updated_at: z.string().optional().nullable(),
  deleted_at: z.string().optional().nullable(),
});



// --- CURSOS ---
export const courseSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  company_id: z.string().uuid(),
  title: z.string().min(2),
  description: z.string().optional().nullable(),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).default('DRAFT'),
  access_type: z.enum(['ALL', 'RESTRICTED']).default('ALL'),
  thumbnail_url: z.string().url().or(z.string().length(0)).nullable().optional(),
  allowed_user_ids: z.array(z.string().uuid()).optional().nullable(),
  allowed_region_ids: z.array(z.string().uuid()).optional().nullable(),
  allowed_store_ids: z.array(z.string().uuid()).optional().nullable(),
  excluded_user_ids: z.array(z.string().uuid()).optional().nullable(),
  passing_score: z.number().min(0).max(100).default(70),
  diploma_template: z.string().default('azul'),
  created_at: z.string().optional().nullable(),
  deleted_at: z.string().datetime().nullable().optional(),
});

export const courseModuleSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  course_id: z.string().uuid(),
  title: z.string().min(1),
  order_index: z.number().int().min(0),
  created_at: z.string().optional().nullable(),
  deleted_at: z.string().datetime().nullable().optional(),
});

export const courseContentSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  module_id: z.string().uuid(),
  company_id: z.string().uuid().optional().nullable(),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  type: z.enum(['PDF', 'VIDEO', 'DOCUMENT', 'IMAGE', 'AUDIO', 'HTML']),
  url: z.string().url('URL inválida').optional().nullable(),
  content_url: z.string().optional().nullable(),
  order_index: z.number().int().min(0),
  quizzes: z.any().optional().nullable(),
  created_at: z.string().optional().nullable(),
  deleted_at: z.string().datetime().nullable().optional(),
});

// --- REPOSITÓRIOS ---
export const repositorySchema = z.object({
  id: z.string().uuid().optional().nullable(),
  company_id: z.string().uuid(),
  name: z.string().min(2, 'Nome muito curto'),
  description: z.string().optional().nullable(),
  type: z.enum(['FULL', 'SIMPLE', 'PLAYLIST', 'VIDEO_PLAYLIST']).default('FULL'),
  cover_image: z.string().url('Capa deve ser uma URL válida').or(z.string().length(0)).optional().nullable(),
  banner_image: z.string().url('Banner deve ser uma URL válida').or(z.string().length(0)).optional().nullable(),
  featured: z.boolean().default(false),
  status: z.enum(['ACTIVE', 'DRAFT']).default('ACTIVE'),
  access_type: z.enum(['ALL', 'RESTRICTED']).default('ALL'),
  allowed_user_ids: z.array(z.string().uuid()).default([]),
  allowed_region_ids: z.array(z.string().uuid()).default([]),
  allowed_store_ids: z.array(z.string().uuid()).default([]),
  excluded_user_ids: z.array(z.string().uuid()).default([]),
  banner_position: z.number().min(0).max(100).default(50),
  banner_brightness: z.number().min(0).max(200).default(100),
  show_in_landing: z.boolean().default(false),
  deleted_at: z.string().datetime().nullable().optional(),
});

export const repositoryCategorySchema = z.object({
  repository_id: z.string().uuid(),
  name: z.string().min(1, 'Nome da categoria é obrigatório'),
  order_index: z.number().int().min(0),
  deleted_at: z.string().datetime().nullable().optional(),
});

export const repositoryContentSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  company_id: z.string().uuid(),
  repository_id: z.string().uuid(),
  category_id: z.string().uuid().nullable().optional(),
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional().nullable(),
  thumbnail_url: z.string().url('Thumbnail deve ser uma URL válida').or(z.string().length(0)).nullable().optional(),
  type: z.enum(['PDF', 'VIDEO', 'DOCUMENT', 'LINK', 'MUSIC', 'QUIZ']),
  url: z.string().url('URL inválida'),
  featured: z.boolean().default(false),
  status: z.enum(['ACTIVE', 'DRAFT']).default('ACTIVE'),
  order_index: z.number().int().min(0).optional(),
  deleted_at: z.string().datetime().nullable().optional(),
});

export const simpleLinkSchema = z.object({
  id: z.string().uuid().optional().nullable(),
  company_id: z.string().uuid(),
  repository_id: z.string().uuid(),
  name: z.string().min(1, 'Nome é obrigatório'),
  url: z.string().url('URL inválida'),
  type: z.string().default('link'),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE'),
  order_index: z.number().int().min(0),
  deleted_at: z.string().datetime().nullable().optional(),
});

// --- MÉTRICAS DE CONTEÚDO ---
export const contentViewMetricSchema = z.object({
  user_id: z.string().uuid(),
  content_id: z.string().uuid(),
  company_id: z.string().uuid(),
  repository_id: z.string().uuid(),
  content_type: z.string().optional(),
  viewed_at: z.string().datetime().optional(),
});

export const contentRatingSchema = z.object({
  user_id: z.string().uuid(),
  content_id: z.string().uuid(),
  company_id: z.string().uuid(),
  repository_id: z.string().uuid(),
  rating: z.number().min(1).max(5),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

// --- QUIZZES ---
export const quizAttemptSchema = z.object({
  quiz_id: z.string().uuid(),
  user_id: z.string().uuid(),
  score: z.number().min(0).max(100),
  passed: z.boolean(),
  completed_at: z.string().datetime().optional(),
});

// --- MATRÍCULAS E RESPOSTAS DE CURSOS ---
export const courseEnrollmentSchema = z.object({
  course_id: z.string().uuid(),
  user_id: z.string().uuid(),
  company_id: z.string().uuid(),
  status: z.enum(['IN_PROGRESS', 'COMPLETED', 'DROPPED']).default('IN_PROGRESS'),
  started_at: z.string().datetime().optional(),
  completed_at: z.string().datetime().nullable().optional(),
  score_percent: z.number().min(0).max(100).optional(),
  total_correct: z.number().int().min(0).optional(),
  total_questions: z.number().int().min(0).optional(),
  current_module_id: z.string().uuid().nullable().optional(),
  current_content_id: z.string().uuid().nullable().optional(),
  time_spent_seconds: z.number().int().min(0).optional(),
  updated_at: z.string().datetime().nullable().optional(),
});

export const courseAnswerSchema = z.object({
  enrollment_id: z.string().uuid(),
  question_id: z.string().uuid(),
  selected_option_id: z.string().uuid().nullable().optional(),
  complex_answer: z.any().nullable().optional(),
  is_correct: z.boolean(),
  answered_at: z.string().datetime().optional(),
});

export const coursePhaseQuestionSchema = z.object({
  module_id: z.string().uuid(),
  question_text: z.string().min(1),
  question_type: z.enum(['MULTIPLE_CHOICE', 'TEXT', 'FILE', 'WORD_SEARCH', 'ORDERING', 'HOTSPOT']).default('MULTIPLE_CHOICE'),
  configuration: z.any().optional().nullable(),
  image_url: z.string().url().or(z.string().length(0)).nullable().optional(),
  explanation: z.string().optional().nullable(),
  order_index: z.number().int().min(0),
  deleted_at: z.string().datetime().nullable().optional(),
});

export const courseQuestionOptionSchema = z.object({
  question_id: z.string().uuid(),
  option_text: z.string().min(1),
  is_correct: z.boolean().default(false),
  order_index: z.number().int().min(0),
});

// --- CHECKLISTS ---
export const checklistSubmissionSchema = z.object({
  checklist_id: z.string().uuid(),
  user_id: z.string().uuid(),
  company_id: z.string().uuid(),
  org_unit_id: z.string().uuid().nullable().optional(),
  status: z.enum(['IN_PROGRESS', 'COMPLETED', 'ARCHIVED']).default('IN_PROGRESS'),
  started_at: z.string().datetime().optional(),
  completed_at: z.string().datetime().nullable().optional(),
  updated_at: z.string().datetime().nullable().optional(),
});

export const checklistAnswerSchema = z.object({
  submission_id: z.string().uuid(),
  question_id: z.string().uuid(),
  value: z.string().nullable(),
  note: z.string().nullable().optional(),
  photo_urls: z.array(z.string().url()).nullable().optional(),
  action_plan: z.string().nullable().optional(),
  assigned_user_id: z.string().uuid().nullable().optional(),
  action_plan_due_date: z.string().datetime().nullable().optional(),
  action_plan_status: z.string().nullable().optional(),
  updated_at: z.string().datetime().nullable().optional(),
});

export const checklistSchema = z.object({
  id: z.string().uuid().optional(),
  company_id: z.string().uuid(),
  folder_id: z.string().uuid().nullable().optional(),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'DRAFT', 'ARCHIVED']).default('DRAFT'),
  access_type: z.enum(['ALL', 'RESTRICTED']).default('ALL'),
  allowed_user_ids: z.array(z.string().uuid()).optional().nullable(),
  allowed_region_ids: z.array(z.string().uuid()).optional().nullable(),
  allowed_store_ids: z.array(z.string().uuid()).optional().nullable(),
  excluded_user_ids: z.array(z.string().uuid()).optional().nullable(),
  created_at: z.string().optional().nullable(),
  updated_at: z.string().optional().nullable(),
  deleted_at: z.string().nullable().optional(),
});

export const checklistFolderSchema = z.object({
  id: z.string().uuid().optional(),
  company_id: z.string().uuid(),
  name: z.string().min(1),
  color: z.string().optional().nullable(),
  order_index: z.number().int().min(0).optional().default(0),
  created_at: z.string().optional().nullable(),
  updated_at: z.string().optional().nullable(),
  deleted_at: z.string().nullable().optional(),
});

export const checklistSectionSchema = z.object({
  id: z.string().uuid().optional(),
  checklist_id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  order_index: z.number().int().min(0).default(0),
  created_at: z.string().optional().nullable(),
  updated_at: z.string().optional().nullable(),
  deleted_at: z.string().nullable().optional(),
});

export const checklistQuestionSchema = z.object({
  id: z.string().uuid().optional(),
  checklist_id: z.string().uuid(),
  section_id: z.string().uuid().nullable().optional(),
  text: z.string().min(1),
  type: z.enum(['COMPLIANCE', 'RATING', 'TEXT', 'NUMBER', 'DATE', 'TIME', 'CHECK']).default('COMPLIANCE'),
  required: z.boolean().default(true),
  order_index: z.number().int().min(0).optional().default(0),
  description: z.string().optional().nullable(),
  config: z.any().optional().nullable(),
  created_at: z.string().optional().nullable(),
  updated_at: z.string().optional().nullable(),
  deleted_at: z.string().nullable().optional(),
});

// --- UTILITÁRIOS E REORDENAÇÃO ---
export const reorderItemSchema = z.object({
  id: z.string().uuid(),
  order_index: z.number().int().min(0),
  section_id: z.string().uuid().nullable().optional(), // Para perguntas que podem mudar de seção
});

export const reorderListSchema = z.array(reorderItemSchema);
