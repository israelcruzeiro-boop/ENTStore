import type { UserRole } from '@/types';
import { api } from './client';
import type {
  ApiAdminUsersList,
  ApiInviteView,
  ApiUserStatus,
  ApiUserView,
} from './types';

export interface AdminUsersQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'ALL' | ApiUserStatus;
}

export interface CreateInvitePayload {
  name: string;
  email: string;
  cpf?: string | null;
  role: UserRole;
  orgUnitId?: string | null;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  cpf?: string | null;
  role?: UserRole;
  status?: ApiUserStatus;
  active?: boolean;
  avatarUrl?: string | null;
  orgUnitId?: string | null;
}

export const adminUsersService = {
  list: (query: AdminUsersQuery = {}) =>
    api.get<ApiAdminUsersList>('/admin/users', { query: { ...query } }),

  get: (id: string) =>
    api.get<{ user: ApiUserView; orgUnit: { id: string; name: string } | null }>(
      `/admin/users/${id}`,
    ),

  createInvite: (payload: CreateInvitePayload) =>
    api.post<{ invite: ApiInviteView; activationToken: string }>(
      '/admin/users/invite',
      payload,
    ),

  update: (id: string, payload: UpdateUserPayload) =>
    api.put<{ user: ApiUserView }>(`/admin/users/${id}`, payload),

  delete: (id: string) =>
    api.delete<{ deleted: boolean; id: string }>(`/admin/users/${id}`),

  cancelInvite: (inviteId: string) =>
    api.delete<{ deleted: boolean; id: string }>(`/admin/users/invites/${inviteId}`),
};
