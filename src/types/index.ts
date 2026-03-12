export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'USER';
export type ContentType = 'PDF' | 'VIDEO' | 'DOCUMENT' | 'LINK';

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
  linkName: string;
  active: boolean;
  theme: Theme;
  logoUrl?: string;
  heroImage?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  
  orgLevels?: OrgLevelConfig[];
  orgTopLevelName?: string;
  orgUnitName?: string;
  
  createdAt: string;
  updatedAt?: string;
}

export interface User {
  id: string;
  name: string;
  email?: string;
  cpf?: string;
  role: UserRole;
  password?: string;
  companyId?: string;
  orgUnitId?: string;
  orgTopLevelId?: string;
  avatarUrl?: string;
  active?: boolean;
  firstAccess?: boolean;
  status?: 'ACTIVE' | 'INACTIVE' | 'PENDING_SETUP';
  createdAt?: string;
  updatedAt?: string;
}

export interface Repository {
  id: string;
  companyId: string;
  name: string;
  description: string;
  coverImage: string;
  bannerImage?: string;
  featured: boolean;
  type: 'FULL' | 'SIMPLE';
  status: 'ACTIVE' | 'DRAFT';
  accessType?: 'ALL' | 'RESTRICTED';
  allowedUserIds?: string[];
  allowedRegionIds?: string[];
  allowedStoreIds?: string[];
  excludedUserIds?: string[]; 
  createdAt?: string;
  updatedAt?: string;
}

export interface Category {
  id: string;
  repositoryId: string;
  name: string;
  order?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Content {
  id: string;
  companyId: string;
  repositoryId: string;
  categoryId?: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  type: ContentType;
  url: string;
  embedUrl?: string;
  featured: boolean;
  recent: boolean;
  status: 'ACTIVE' | 'DRAFT';
  createdAt?: string;
  updatedAt?: string;
}

export interface SimpleLink {
  id: string;
  companyId: string;
  repositoryId: string;
  name: string;
  url: string;
  type: string;
  date: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt?: string;
  updatedAt?: string;
}

export interface ContentViewMetric {
  id: string;
  userId: string;
  contentId: string;
  companyId: string;
  repositoryId: string;
  contentType: string;
  orgUnitId?: string; 
  orgTopLevelId?: string;
  viewedAt: string;
}

export interface ContentRating {
  id: string;
  userId: string;
  contentId: string;
  companyId: string;
  repositoryId: string;
  rating: number; // 0 a 10
  orgUnitId?: string;
  orgTopLevelId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrgTopLevel {
  id: string;
  companyId: string;
  levelId?: string; 
  parentId?: string; 
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrgUnit {
  id: string;
  companyId: string;
  parentId: string; 
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}