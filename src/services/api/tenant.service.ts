import { api } from './client';
import type {
  ApiCompanyAuthenticatedView,
  ApiCompanyPublicView,
  ApiTenantBranding,
} from './types';

export const tenantService = {
  getTenantBySlug: (slug: string) =>
    api.get<ApiTenantBranding>(`/auth/tenant/${encodeURIComponent(slug)}`, {
      skipAuth: true,
    }),

  getPublicCompany: (slug: string) =>
    api.get<ApiCompanyPublicView>(`/companies/public/${encodeURIComponent(slug)}`, {
      skipAuth: true,
    }),

  getCurrentCompany: () => api.get<ApiCompanyAuthenticatedView>('/companies/current'),

  listCompanies: (query: { includeDeleted?: boolean } = {}) =>
    api.get<ApiCompanyAuthenticatedView[]>('/companies', { query }),

  getPublicAppearance: (slug: string) =>
    api.get<ApiTenantBranding>(`/settings/appearance/${encodeURIComponent(slug)}`, {
      skipAuth: true,
    }),
};
