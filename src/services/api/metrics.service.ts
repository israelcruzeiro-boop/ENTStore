import { api } from './client';
import type { ApiContentMetricSummary, ApiContentViewMetric, ApiContentRating, ApiRepositoryMetrics } from './types';

export interface RecordViewPayload {
  contentId: string;
  repositoryId: string;
  contentType: string;
}

export interface RecordRatingPayload {
  contentId: string;
  repositoryId: string;
  rating: number;
}

export const metricsService = {
  recordView(payload: RecordViewPayload): Promise<ApiContentViewMetric> {
    return api.post<ApiContentViewMetric>('/metrics/views', payload);
  },

  recordRating(payload: RecordRatingPayload): Promise<ApiContentRating> {
    return api.post<ApiContentRating>('/metrics/ratings', payload);
  },

  getRepositoryMetrics(repositoryId: string): Promise<ApiRepositoryMetrics> {
    return api.get<ApiRepositoryMetrics>('/admin/metrics/repositories', {
      query: { repositoryId },
    });
  },

  listViews(query?: { repositoryId?: string }): Promise<ApiContentViewMetric[]> {
    return api.get<ApiContentViewMetric[]>('/admin/metrics/views', {
      query: { repositoryId: query?.repositoryId },
    });
  },

  listRatings(query?: { repositoryId?: string }): Promise<ApiContentRating[]> {
    return api.get<ApiContentRating[]>('/admin/metrics/ratings', {
      query: { repositoryId: query?.repositoryId },
    });
  },

  listContentSummaries(query?: { repositoryId?: string }): Promise<ApiContentMetricSummary[]> {
    return api.get<ApiContentMetricSummary[]>('/metrics/content-summaries', {
      query: { repositoryId: query?.repositoryId },
    });
  },

  getUserActivity(userId: string): Promise<ApiContentViewMetric[]> {
    return api.get<ApiContentViewMetric[]>(`/admin/metrics/users/${userId}/activity`);
  },

  getSummary(): Promise<{ totalViews: number; totalRatings: number; activeUsers: number }> {
    return api.get('/admin/metrics/summary');
  },
};
