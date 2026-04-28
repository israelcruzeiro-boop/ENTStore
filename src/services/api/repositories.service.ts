import { api } from './client';
import type { ApiRepository } from './types';

export interface CreateRepositoryPayload {
  name: string;
  description: string;
  type: 'FULL' | 'SIMPLE' | 'PLAYLIST' | 'VIDEO_PLAYLIST';
  coverImage?: string | null;
  bannerImage?: string | null;
  bannerPosition?: number | null;
  bannerBrightness?: number | null;
  featured?: boolean;
  showInLanding?: boolean;
  status?: 'ACTIVE' | 'DRAFT';
  accessType?: 'ALL' | 'RESTRICTED';
  allowedUserIds?: string[];
  allowedRegionIds?: string[];
  allowedStoreIds?: string[];
  excludedUserIds?: string[];
}

export type UpdateRepositoryPayload = Partial<CreateRepositoryPayload>;

export const repositoriesService = {
  list(): Promise<ApiRepository[]> {
    return api.get<ApiRepository[]>('/repositories');
  },

  get(id: string): Promise<ApiRepository> {
    return api.get<ApiRepository>(`/repositories/${id}`);
  },

  create(payload: CreateRepositoryPayload): Promise<ApiRepository> {
    return api.post<ApiRepository>('/admin/repositories', payload);
  },

  update(id: string, payload: UpdateRepositoryPayload): Promise<ApiRepository> {
    return api.put<ApiRepository>(`/admin/repositories/${id}`, payload);
  },

  delete(id: string): Promise<void> {
    return api.delete<void>(`/admin/repositories/${id}`);
  },
};
