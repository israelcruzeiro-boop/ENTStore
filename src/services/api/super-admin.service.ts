import { api } from './client';
import type {
  ApiAdminUsersList,
  ApiCompanyAuthenticatedView,
  ApiUserStatus,
  ApiUserView,
} from './types';

export interface ProvisionTenantAdminPayload {
  name: string;
  email: string;
  role?: 'ADMIN' | 'MANAGER' | 'USER';
}

export type ProvisionTenantAdminStatus = 'created_user' | 'updated_existing';

export interface ProvisionTenantAdminResult {
  status: ProvisionTenantAdminStatus;
  inviteId: string | null;
  userId: string | null;
}

export interface SuperAdminUsersQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'ALL' | ApiUserStatus;
  includeDeleted?: boolean;
  companyId?: string;
}

export interface SuperAdminCompanyPayload {
  name?: string;
  slug?: string;
  linkName?: string;
  logoUrl?: string | null;
  active?: boolean;
  landingPageEnabled?: boolean;
  landingPageActive?: boolean;
  landingPageLayout?: string | null;
  checklistsEnabled?: boolean;
  surveysEnabled?: boolean;
}

export interface SuperAdminUserPayload {
  name?: string;
  email?: string;
  role?: 'ADMIN' | 'MANAGER' | 'USER';
  status?: ApiUserStatus;
  active?: boolean;
}

/**
 * HTTP wrapper for super-admin platform operations.
 *
 * The backend route (`POST /api/super-admin/companies/:id/provision-admin`)
 * requires SUPER_ADMIN role. Temporary first-access credentials are owned by
 * the backend and are never generated or returned by the frontend.
 */
export const superAdminService = {
  listCompanies: (query: { includeDeleted?: boolean } = {}) =>
    api.get<ApiCompanyAuthenticatedView[]>('/super-admin/companies', { query }),

  createCompany: (payload: SuperAdminCompanyPayload & { name: string }) =>
    api.post<ApiCompanyAuthenticatedView>('/super-admin/companies', payload),

  updateCompany: (companyId: string, payload: SuperAdminCompanyPayload) =>
    api.put<ApiCompanyAuthenticatedView>(
      `/super-admin/companies/${encodeURIComponent(companyId)}`,
      payload,
    ),

  deleteCompany: (companyId: string) =>
    api.delete<{ deleted: boolean; id: string }>(
      `/super-admin/companies/${encodeURIComponent(companyId)}`,
    ),

  updateCompanyStatus: (companyId: string, payload: { active: boolean }) =>
    api.patch<ApiCompanyAuthenticatedView>(
      `/super-admin/companies/${encodeURIComponent(companyId)}/status`,
      payload,
    ),

  listUsers: (query: SuperAdminUsersQuery = {}) =>
    api.get<ApiAdminUsersList>('/super-admin/users', { query: { ...query } }),

  updateUser: (userId: string, payload: SuperAdminUserPayload) =>
    api.put<{ user: ApiUserView }>(
      `/super-admin/users/${encodeURIComponent(userId)}`,
      payload,
    ),

  updateUserStatus: (userId: string, payload: { active: boolean }) =>
    api.patch<{ user: ApiUserView }>(
      `/super-admin/users/${encodeURIComponent(userId)}/status`,
      payload,
    ),

  provisionTenantAdmin: (companyId: string, payload: ProvisionTenantAdminPayload) =>
    api.post<ProvisionTenantAdminResult>(
      `/super-admin/companies/${encodeURIComponent(companyId)}/provision-admin`,
      payload,
    ),
};
