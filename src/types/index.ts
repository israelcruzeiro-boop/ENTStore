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
  
  // Nomenclaturas da Estrutura Organizacional
  orgLevels?: OrgLevelConfig[]; // Estrutura em N Níveis (Ex: 0: Diretoria, 1: Regional...)
  orgTopLevelName?: string; // Legado
  orgUnitName?: string; // Unidade Final (Ex: Loja)
  
  createdAt: string;
  updatedAt?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  password?: string;
  companyId?: string;
  orgUnitId?: string; // Vínculo com a Unidade final
  orgTopLevelId?: string; // Legado
  avatarUrl?: string;
  active?: boolean;
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
  allowedRegionIds?: string[]; // IDs de qualquer OrgTopLevel (Níveis intermediários) permitidos
  allowedStoreIds?: string[]; // IDs de OrgUnit permitidas
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
  levelId?: string; // Refere-se ao OrgLevelConfig.id da Company
  parentId?: string; // ID do OrgTopLevel que está um nível acima (se houver)
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrgUnit {
  id: string;
  companyId: string;
  parentId: string; // ID do OrgTopLevel do nível imediatamente superior
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}