export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'USER';
export type ContentType = 'PDF' | 'VIDEO' | 'DOCUMENT' | 'LINK';

export interface Theme {
  primary: string;
  secondary: string;
  background: string;
  card: string;
  text: string;
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
  type: 'FULL' | 'SIMPLE'; // Novo campo para definir o tipo de repositório
  status: 'ACTIVE' | 'DRAFT';
  accessType?: 'ALL' | 'RESTRICTED';
  allowedUserIds?: string[];
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
  viewedAt: string;
}

export interface ContentRating {
  id: string;
  userId: string;
  contentId: string;
  companyId: string;
  repositoryId: string;
  rating: number; // 0 a 10
  createdAt: string;
  updatedAt: string;
}