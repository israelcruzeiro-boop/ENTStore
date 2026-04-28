import { api } from './client';
import type { ApiContent, ApiSimpleLink, ApiCategory, ApiRepositoryCatalog } from './types';

// ─── Categories ──────────────────────────────────────────────────────────────

export interface CreateCategoryPayload {
  repositoryId: string;
  name: string;
  orderIndex?: number;
}

export interface UpdateCategoryPayload {
  name?: string;
  orderIndex?: number;
}

// ─── Contents ────────────────────────────────────────────────────────────────

export interface CreateContentPayload {
  repositoryId: string;
  categoryId?: string | null;
  title: string;
  description: string;
  thumbnailUrl?: string | null;
  type: 'PDF' | 'VIDEO' | 'DOCUMENT' | 'LINK' | 'MUSIC' | 'IMAGE' | 'QUIZ';
  url: string;
  embedUrl?: string | null;
  featured?: boolean;
  recent?: boolean;
  status?: 'ACTIVE' | 'DRAFT';
}

export type UpdateContentPayload = Partial<CreateContentPayload>;

// ─── Simple Links ─────────────────────────────────────────────────────────────

export interface CreateSimpleLinkPayload {
  repositoryId: string;
  name: string;
  url: string;
  type: string;
  date: string;
  status?: 'ACTIVE' | 'INACTIVE';
}

export type UpdateSimpleLinkPayload = Partial<CreateSimpleLinkPayload>;

export const contentsService = {
  // Catalog
  getCatalog(repositoryId: string): Promise<ApiRepositoryCatalog> {
    return api.get<ApiRepositoryCatalog>(`/repositories/${repositoryId}/catalog`);
  },

  listContents(repositoryId: string): Promise<ApiContent[]> {
    return api.get<ApiRepositoryCatalog>(`/repositories/${repositoryId}/catalog`).then(c => c.contents);
  },

  listAllContents(query?: { repositoryId?: string }): Promise<ApiContent[]> {
    return api.get<ApiContent[]>('/contents', {
      query: { repositoryId: query?.repositoryId },
    });
  },

  getContent(id: string): Promise<ApiContent> {
    return api.get<ApiContent>(`/contents/${id}`);
  },

  createContent(payload: CreateContentPayload): Promise<ApiContent> {
    return api.post<ApiContent>('/admin/contents', payload);
  },

  updateContent(id: string, payload: UpdateContentPayload): Promise<ApiContent> {
    return api.put<ApiContent>(`/admin/contents/${id}`, payload);
  },

  deleteContent(id: string): Promise<void> {
    return api.delete<void>(`/admin/contents/${id}`);
  },

  // Categories
  listCategories(repositoryId: string): Promise<ApiCategory[]> {
    return api.get<ApiCategory[]>(`/repositories/${repositoryId}/categories`);
  },

  createCategory(payload: CreateCategoryPayload): Promise<ApiCategory> {
    return api.post<ApiCategory>(`/admin/repositories/${payload.repositoryId}/categories`, payload);
  },

  updateCategory(id: string, payload: UpdateCategoryPayload): Promise<ApiCategory> {
    return api.put<ApiCategory>(`/admin/categories/${id}`, payload);
  },

  deleteCategory(id: string): Promise<void> {
    return api.delete<void>(`/admin/categories/${id}`);
  },

  // Simple Links
  listSimpleLinks(repositoryId: string): Promise<ApiSimpleLink[]> {
    return api.get<ApiSimpleLink[]>(`/repositories/${repositoryId}/simple-links`);
  },

  listAllSimpleLinks(query?: { repositoryId?: string }): Promise<ApiSimpleLink[]> {
    return api.get<ApiSimpleLink[]>('/simple-links', {
      query: { repositoryId: query?.repositoryId },
    });
  },

  createSimpleLink(payload: CreateSimpleLinkPayload): Promise<ApiSimpleLink> {
    return api.post<ApiSimpleLink>('/admin/simple-links', payload);
  },

  updateSimpleLink(id: string, payload: UpdateSimpleLinkPayload): Promise<ApiSimpleLink> {
    return api.put<ApiSimpleLink>(`/admin/simple-links/${id}`, payload);
  },

  deleteSimpleLink(id: string): Promise<void> {
    return api.delete<void>(`/admin/simple-links/${id}`);
  },
};
