import { api } from './client';
import type {
  ApiInviteView,
  ApiMeView,
  ApiSessionBundle,
  ApiUserView,
} from './types';

export interface LoginPayload {
  identifier: string;
  password: string;
  company_slug?: string;
}

export interface UpdateProfilePayload {
  name?: string;
  email?: string;
  avatarUrl?: string | null;
}

export interface UpdatePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface ActivateInvitePayload {
  email: string;
  cpf?: string;
  password: string;
  avatarUrl?: string | null;
  name?: string;
  orgUnitId?: string | null;
}

export const authService = {
  login: (payload: LoginPayload) =>
    api.post<ApiSessionBundle>('/auth/login', payload, { skipAuth: true }),

  logout: () => api.post<{ loggedOut: boolean; sessionId: string }>('/auth/logout'),

  me: () => api.get<ApiMeView>('/auth/me'),

  updateProfile: (payload: UpdateProfilePayload) =>
    api.patch<ApiMeView>('/auth/profile', payload),

  updatePassword: (payload: UpdatePasswordPayload) =>
    api.patch<{ passwordUpdated: boolean; requiresReauthentication: boolean }>(
      '/auth/password',
      payload,
    ),

  createInviteActivationSession: (token: string) =>
    api.post<{
      invite: ApiInviteView;
      company: { id?: string; name?: string; slug?: string; linkName?: string } | null;
      availableUnits: Array<{ id: string; name: string }>;
    }>('/auth/invites/session', { token }, { skipAuth: true }),

  activateInvite: (payload: ActivateInvitePayload) =>
    api.post<ApiSessionBundle>('/auth/invites/activate', payload, { skipAuth: true }),
};

export type { ApiSessionBundle, ApiMeView, ApiUserView };
