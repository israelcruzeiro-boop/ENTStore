import { api } from './client';
import type { ApiUserView } from './types';

export interface UpdateOwnProfilePayload {
  onboardingCompleted?: boolean;
}

export const usersMeService = {
  updateProfile: (payload: UpdateOwnProfilePayload) =>
    api.patch<{ user: ApiUserView }>('/users/me/profile', payload),
};
