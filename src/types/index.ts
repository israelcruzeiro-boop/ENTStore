export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'USER';
export type ContentType = 'PDF' | 'VIDEO' | 'DOCUMENT' | 'LINK' | 'MUSIC';

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
  rating: number; // 0 a 10
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