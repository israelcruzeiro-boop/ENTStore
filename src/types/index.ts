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
  active: boolean;
  theme: Theme;
  logoUrl?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  password?: string; // Adicionado para o mock de login
  companyId?: string; // Super admins might not have one
  avatarUrl?: string;
}

export interface Repository {
  id: string;
  companyId: string;
  name: string;
  description: string;
  coverImage: string;
  bannerImage?: string;
  featured: boolean;
  status: 'ACTIVE' | 'DRAFT';
}

export interface Category {
  id: string;
  repositoryId: string;
  name: string;
}

export interface Content {
  id: string;
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
}