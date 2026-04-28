export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'USER';
export type ContentType = 'PDF' | 'VIDEO' | 'DOCUMENT' | 'LINK' | 'MUSIC' | 'IMAGE' | 'QUIZ';

export interface Theme {
  primary: string;
  secondary: string;
  background: string;
  card: string;
  text: string;
}

export interface OrgLevelConfig {
  id: string;
  name: string;
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  link_name: string;
  active: boolean;
  deleted_at?: string | null;
  theme: Theme;
  logo_url?: string;
  hero_image?: string;
  hero_title?: string;
  hero_subtitle?: string;
  hero_position?: number;
  hero_brightness?: number;
  public_bio?: string;
  landing_page_enabled?: boolean;
  landing_page_active?: boolean;
  landing_page_layout?: 'classic' | 'gradient' | 'immersive' | 'solid' | 'glass' | 'split';
  primary_color?: string;
  checklists_enabled?: boolean;
  org_levels?: OrgLevelConfig[];
  org_top_level_name?: string;
  org_unit_name?: string;
  created_at: string;
  updated_at?: string;
}

export interface User {
  id: string;
  name: string;
  email?: string;
  cpf?: string;
  cpf_raw?: string;
  role: UserRole;
  password?: string;
  company_id?: string;
  org_unit_id?: string;
  org_top_level_id?: string;
  avatar_url?: string;
  active?: boolean;
  first_access?: boolean;
  status?: 'ACTIVE' | 'INACTIVE' | 'PENDING_SETUP';
  xp_total?: number;
  coins_total?: number;
  onboarding_completed?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Repository {
  id: string;
  company_id: string;
  name: string;
  description: string;
  cover_image: string;
  banner_image?: string;
  banner_position?: number;
  banner_brightness?: number;
  featured: boolean;
  show_in_landing?: boolean;
  type: 'FULL' | 'SIMPLE' | 'PLAYLIST' | 'VIDEO_PLAYLIST';
  status: 'ACTIVE' | 'DRAFT';
  access_type?: 'ALL' | 'RESTRICTED';
  allowed_user_ids?: string[];
  allowed_region_ids?: string[];
  allowed_store_ids?: string[];
  excluded_user_ids?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface Category {
  id: string;
  repository_id: string;
  name: string;
  order_index?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Content {
  id: string;
  company_id: string;
  repository_id: string;
  category_id?: string;
  title: string;
  description: string;
  thumbnail_url: string;
  type: ContentType;
  url: string;
  embed_url?: string;
  featured: boolean;
  recent: boolean;
  status: 'ACTIVE' | 'DRAFT';
  created_at?: string;
  updated_at?: string;
}

export interface Course {
  id: string;
  company_id: string;
  title: string;
  description: string;
  thumbnail_url?: string;
  cover_image?: string;
  image_url?: string;
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  access_type?: 'ALL' | 'RESTRICTED';
  allowed_user_ids?: string[];
  allowed_region_ids?: string[];
  allowed_store_ids?: string[];
  excluded_user_ids?: string[];
  target_audience?: string[];
  passing_score?: number;
  diploma_template?: string;
  created_at: string;
  updated_at?: string;
}

export interface CourseModule {
  id: string;
  course_id: string;
  company_id?: string;
  title: string;
  order_index: number;
  created_at: string;
  updated_at?: string;
  contents?: CourseContent[];
}

export interface CourseContent {
  id: string;
  company_id: string;
  module_id: string;
  title: string;
  description: string;
  type: 'PDF' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT' | 'HTML';
  url: string;
  content_url?: string;
  file_path?: string;
  size_bytes?: number;
  html_content?: string;
  order_index: number;
  has_quiz?: boolean;
  created_at: string;
  updated_at?: string;
}

export type CourseQuestionType = 'MULTIPLE_CHOICE' | 'WORD_SEARCH' | 'ORDERING' | 'HOTSPOT' | 'FILE' | 'HANGMAN';

export interface CoursePhaseQuestion {
  id: string;
  module_id: string;
  question_text: string;
  question_type: CourseQuestionType;
  configuration?: any;
  image_url?: string;
  explanation?: string;
  order_index: number;
  created_at: string;
  updated_at?: string;
  options?: CourseQuestionOption[];
}

export interface CourseQuestionOption {
  id: string;
  question_id: string;
  option_text: string;
  is_correct: boolean;
  order_index: number;
}

export interface CourseEnrollment {
  id: string;
  course_id: string;
  user_id: string;
  company_id: string;
  status: 'IN_PROGRESS' | 'COMPLETED';
  started_at: string;
  completed_at?: string;
  score_percent?: number;
  total_correct?: number;
  total_questions?: number;
  time_spent_seconds?: number;
  current_module_id?: string;
  current_content_id?: string;
  created_at: string;
  updated_at?: string;
}

export interface CourseAnswer {
  id: string;
  enrollment_id: string;
  question_id: string;
  selected_option_id?: string;
  complex_answer?: any;
  is_correct: boolean;
  answered_at: string;
}

// Legacy Quiz types (backward compat)
export interface Quiz {
  id: string;
  company_id?: string;
  content_id?: string;
  course_content_id?: string;
  title?: string;
  passing_score: number;
  time_limit?: number;
  shuffle_questions?: boolean;
  points_reward: number;
  created_at?: string;
}

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  question_text: string;
  explanation?: string;
  source_excerpt?: string;
  order_index: number;
  quiz_options?: QuizOption[];
}

export interface QuizOption {
  id: string;
  question_id: string;
  option_text: string;
  is_correct: boolean;
  order_index: number;
}

export interface QuizAttempt {
  id: string;
  company_id: string;
  // nullable after 20260417123000_refactor_user_provisioning — deleted users
  // become NULL here to preserve the audit row.
  user_id: string | null;
  quiz_id: string;
  score: number;
  passed: boolean;
  answers: Record<string, string>;
  completed_at?: string;
}

export interface SimpleLink {
  id: string;
  company_id: string;
  repository_id: string;
  name: string;
  url: string;
  type: string;
  date?: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_at?: string;
  updated_at?: string;
}

export interface ContentViewMetric {
  id: string;
  // nullable after 20260417123000 — SET NULL on user delete preserves the view.
  user_id: string | null;
  content_id: string;
  company_id: string;
  repository_id: string;
  content_type: string;
  org_unit_id?: string;
  org_top_level_id?: string;
  viewed_at: string;
}

export interface ContentRating {
  id: string;
  // nullable after 20260417123000 — SET NULL on user delete preserves the rating.
  user_id: string | null;
  content_id: string;
  company_id: string;
  repository_id: string;
  rating: number;
  org_unit_id?: string;
  org_top_level_id?: string;
  created_at: string;
  updated_at?: string;
}

export interface OrgTopLevel {
  id: string;
  company_id: string;
  level_id?: string;
  parent_id?: string;
  name: string;
  active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface OrgUnit {
  id: string;
  company_id: string;
  parent_id: string;
  name: string;
  active: boolean;
  created_at: string;
  updated_at?: string;
}

export type ChecklistStatus = 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
export type ChecklistQuestionType = 'COMPLIANCE' | 'DATE' | 'TIME' | 'NUMBER' | 'TEXT' | 'RATING' | 'CHECK';
export type SubmissionStatus = 'IN_PROGRESS' | 'COMPLETED';

export interface ChecklistFolder {
  id: string;
  company_id: string;
  name: string;
  color?: string;
  order_index?: number;
  created_at?: string;
  updated_at?: string;
}


export interface Checklist {
  id: string;
  company_id: string;
  folder_id?: string;
  title: string;
  description?: string;
  access_type: 'ALL' | 'RESTRICTED';
  allowed_user_ids?: string[];
  allowed_region_ids?: string[];
  allowed_store_ids?: string[];
  excluded_user_ids?: string[];
  status: ChecklistStatus;
  created_at: string;
  updated_at?: string;
}

export interface ChecklistSection {
  id: string;
  checklist_id: string;
  title: string;
  description?: string;
  order_index: number;
  created_at?: string;
  updated_at?: string;
}

export interface ChecklistQuestion {
  id: string;
  checklist_id: string;
  section_id?: string;
  text: string;
  type: ChecklistQuestionType;
  required: boolean;
  order_index: number;
  description?: string;
  config?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface ChecklistSubmission {
  id: string;
  checklist_id: string;
  user_id: string;
  company_id: string;
  org_unit_id?: string;
  status: SubmissionStatus;
  started_at: string;
  completed_at?: string;
  created_at?: string;
  updated_at?: string;
  checklist?: { title: string } | Array<{ title: string }>;
}

export interface ChecklistAnswer {
  id: string;
  submission_id: string;
  question_id: string;
  value?: string;
  note?: string;
  action_plan?: string;
  action_plan_created_by?: string;
  assigned_user_id?: string;
  photo_urls?: string[];
  action_plan_due_date?: string;
  action_plan_status?: 'PENDING' | 'RESOLVED';
  created_at?: string;
  updated_at?: string;
}

export interface Notification {
  id: string;
  user_id: string;
  company_id: string;
  title: string;
  body: string;
  type: string;
  status: 'UNREAD' | 'READ';
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}
