import { api } from './client';
import type { ApiUserView, ApiVisibleUser } from './types';

export interface UpdateOwnProfilePayload {
  onboardingCompleted?: boolean;
}

export const usersMeService = {
  updateProfile: (payload: UpdateOwnProfilePayload) =>
    api.patch<{ user: ApiUserView }>('/users/me/profile', payload),

  listVisibleUsers: (query?: { ids?: string[] }) =>
    api.get<ApiVisibleUser[]>('/users/me/visible-users', {
      query: {
        ids: query?.ids?.length ? query.ids.join(',') : undefined,
      },
    }),
};
