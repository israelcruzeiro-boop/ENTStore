import { api } from './client';
import type { ApiLandingData, ApiPublicRepository, ApiPublicContent, ApiPublicSimpleLink } from './types';

export const landingService = {
  getLanding(slug: string): Promise<ApiLandingData> {
    return api.get<ApiLandingData>(`/landing/${slug}`, { skipAuth: true });
  },

  getPublicRepositories(slug: string): Promise<ApiPublicRepository[]> {
    return api.get<ApiPublicRepository[]>(`/landing/${slug}/repositories`, { skipAuth: true });
  },

  getPublicContents(repositoryId: string): Promise<ApiPublicContent[]> {
    return api.get<ApiPublicContent[]>(`/landing/repositories/${repositoryId}/contents`, { skipAuth: true });
  },

  getPublicSimpleLinks(repositoryId: string): Promise<ApiPublicSimpleLink[]> {
    return api.get<ApiPublicSimpleLink[]>(`/landing/repositories/${repositoryId}/simple-links`, { skipAuth: true });
  },
};
