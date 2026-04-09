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
  cover_image?: string;
  thumbnail_url?: string;
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  access_type?: 'ALL' | 'RESTRICTED';
  allowed_user_ids?: string[];
  allowed_region_ids?: string[];
  allowed_store_ids?: string[];
  excluded_user_ids?: string[];
  target_audience?: string[]; 
  created_at: string;
  updated_at?: string;
}

export interface CourseModule {
  id: string;
  course_id: string;
  title: string;
  order_index: number;
  created_at: string;
  updated_at?: string;
}

export interface CourseContent {
  id: string;
  company_id: string;
  module_id: string;
  title: string;
  description: string;
  type: 'PDF' | 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT';
  url: string;
  file_path?: string;
  size_bytes?: number;
  order_index: number;
  has_quiz?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface SimpleLink {
  id: string;
  company_id: string;
  repository_id: string;
  name: string;
  url: string;
  type: string;
  date: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_at?: string;
  updated_at?: string;
}

export interface ContentViewMetric {
  id: string;
  user_id: string;
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
  user_id: string;
  content_id: string;
  company_id: string;
  repository_id: string;
  rating: number;
  org_unit_id?: string;
  org_top_level_id?: string;
  created_at: string;
  updated_at: string;
}

export interface OrgTopLevel {
  id: string;
  company_id: string;
  level_id?: string;
  parent_id?: string;
  name: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface OrgUnit {
  id: string;
  company_id: string;
  parent_id: string;
  name: string;
  active: boolean;
  created_at: string;
  updated_at: string;
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
  updated_at: string;
}

export interface ChecklistSection {
  id: string;
  checklist_id: string;
  title: string;
  description?: string;
  order_index: number;
  created_at: string;
  updated_at: string;
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
  created_at: string;
  updated_at: string;
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
  created_at: string;
  updated_at: string;
  checklist?: { title: string };
}

export interface ChecklistAnswer {
  id: string;
  submission_id: string;
  question_id: string;
  value?: string;
  note?: string;
  action_plan?: string;
  assigned_user_id?: string;
  photo_urls?: string[];
  action_plan_due_date?: string;
  action_plan_status?: 'PENDING' | 'RESOLVED';
  created_at: string;
  updated_at: string;
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
