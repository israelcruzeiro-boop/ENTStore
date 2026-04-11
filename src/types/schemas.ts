import { z } from 'zod';

// --- USUÁRIOS ---
export const userSchema = z.object({
  name: z.string().min(2, 'Nome muito curto'),
  email: z.string().email('E-mail inválido').or(z.string().regex(/^\d{11}@storepage\.com$/, 'Formato de e-mail de fallback inválido')),
  cpf: z.string().length(11, 'CPF deve ter 11 dígitos').nullable().optional(),
  role: z.enum(['ADMIN', 'USER', 'MANAGER', 'SUPER_ADMIN', 'MAESTRO']),
  active: z.boolean().default(true),
  org_unit_id: z.string().uuid().nullable().optional(),
  company_id: z.string().uuid(),
  deleted_at: z.string().datetime().nullable().optional(),
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
  name: z.string().min(2, 'Nome da empresa muito curto'),
  slug: z.string().min(2),
  link_name: z.string().min(2),
  active: z.boolean().default(true),
  org_unit_name: z.string().optional().nullable(),
  org_top_level_name: z.string().optional().nullable(),
  org_levels: z.array(z.object({ id: z.string(), name: z.string() })).optional().nullable(),
});



// --- CURSOS ---
export const courseSchema = z.object({
  company_id: z.string().uuid(),
  title: z.string().min(2),
  description: z.string().optional().nullable(),
  status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).default('DRAFT'),
  access_type: z.enum(['ALL', 'RESTRICTED']).default('ALL'),
  thumbnail_url: z.string().url().or(z.string().length(0)).nullable().optional(),
  passing_score: z.number().min(0).max(100).default(70),
  diploma_template: z.string().default('azul'),
  deleted_at: z.string().datetime().nullable().optional(),
});

export const courseModuleSchema = z.object({
  course_id: z.string().uuid(),
  title: z.string().min(1),
  order_index: z.number().int().min(0),
  deleted_at: z.string().datetime().nullable().optional(),
});

export const courseContentSchema = z.object({
  module_id: z.string().uuid(),
  company_id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  type: z.enum(['PDF', 'VIDEO', 'DOCUMENT', 'IMAGE', 'AUDIO', 'HTML']),
  url: z.string().url('URL inválida'),
  order_index: z.number().int().min(0),
  deleted_at: z.string().datetime().nullable().optional(),
});

// --- REPOSITÓRIOS ---
export const repositorySchema = z.object({
  company_id: z.string().uuid(),
  name: z.string().min(2, 'Nome muito curto'),
  description: z.string().optional().nullable(),
  type: z.enum(['FULL', 'SIMPLE', 'PLAYLIST', 'VIDEO_PLAYLIST']).default('FULL'),
  cover_image: z.string().url('Capa deve ser uma URL válida'),
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
  company_id: z.string().uuid(),
  repository_id: z.string().uuid(),
  category_id: z.string().uuid().nullable().optional(),
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional().nullable(),
  thumbnail_url: z.string().url('Thumbnail deve ser uma URL válida').or(z.string().length(0)).nullable().optional(),
  type: z.enum(['PDF', 'VIDEO', 'DOCUMENT', 'IMAGE', 'AUDIO', 'HTML']),
  url: z.string().url('URL inválida'),
  featured: z.boolean().default(false),
  status: z.enum(['ACTIVE', 'DRAFT']).default('ACTIVE'),
  order_index: z.number().int().min(0).optional(),
  deleted_at: z.string().datetime().nullable().optional(),
});

export const simpleLinkSchema = z.object({
  company_id: z.string().uuid(),
  repository_id: z.string().uuid(),
  name: z.string().min(1, 'Nome é obrigatório'),
  url: z.string().url('URL inválida'),
  type: z.string().default('link'),
  status: z.enum(['ACTIVE', 'DRAFT']).default('ACTIVE'),
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
  company_id: z.string().uuid(),
  folder_id: z.string().uuid().nullable().optional(),
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'DRAFT']).default('ACTIVE'),
  access_type: z.enum(['ALL', 'RESTRICTED']).default('ALL'),
  deleted_at: z.string().datetime().nullable().optional(),
});

export const checklistFolderSchema = z.object({
  company_id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  order_index: z.number().int().min(0),
  deleted_at: z.string().datetime().nullable().optional(),
});

export const checklistSectionSchema = z.object({
  checklist_id: z.string().uuid(),
  title: z.string().min(1),
  order_index: z.number().int().min(0),
  deleted_at: z.string().datetime().nullable().optional(),
});

export const checklistQuestionSchema = z.object({
  section_id: z.string().uuid(),
  text: z.string().min(1),
  type: z.enum(['MULTIPLE_CHOICE', 'YES_NO', 'TEXT', 'NUMBER', 'PHOTO']).default('YES_NO'),
  required: z.boolean().default(true),
  order_index: z.number().int().min(0),
  configuration: z.any().optional().nullable(),
  deleted_at: z.string().datetime().nullable().optional(),
});

// --- UTILITÁRIOS E REORDENAÇÃO ---
export const reorderItemSchema = z.object({
  id: z.string().uuid(),
  order_index: z.number().int().min(0),
  section_id: z.string().uuid().nullable().optional(), // Para perguntas que podem mudar de seção
});

export const reorderListSchema = z.array(reorderItemSchema);
