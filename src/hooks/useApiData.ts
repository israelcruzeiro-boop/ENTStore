import useSWR from 'swr';
import type { Company, OrgTopLevel, OrgUnit, User, Repository, Content, Category, SimpleLink } from '@/types';
import {
  adminStructureService,
  adminUsersService,
  settingsService,
  tenantService,
  repositoriesService,
  contentsService,
  landingService,
} from '@/services/api';
import type {
  ApiAdminUsersList,
  ApiCompanyAuthenticatedView,
  ApiCompanyFeatureFlags,
  ApiInviteActivationDelivery,
  ApiInviteView,
  ApiStructure,
  ApiTenantBranding,
  ApiRepository,
  ApiRepositoryCatalog,
  ApiPublicRepository,
} from '@/services/api/types';
import {
  mapApiCompanyToFrontend,
  mapApiTopLevelToFrontend,
  mapApiUnitToFrontend,
  mapApiUserToFrontend,
  mapTenantBrandingToCompany,
  mapApiRepositoryToFrontend,
  mapApiContentToFrontend,
  mapApiCategoryToFrontend,
  mapApiSimpleLinkToFrontend,
} from '@/services/api/mappers';

/**
 * Pending invite shape exposed to UI consumers. Kept separate from User so the
 * admin/users page never confuses an unactivated invite with a real user.
 */
export interface PendingInvite {
  id: string;
  name: string;
  email: string;
  role: ApiInviteView['role'];
  companyId: string;
  orgUnitId: string | null;
  status: ApiInviteView['status'];
  expiresAt: string;
  createdAt: string;
  activationDelivery?: ApiInviteActivationDelivery;
}

function mapApiInviteToPending(invite: ApiInviteView): PendingInvite {
  return {
    id: invite.id,
    name: invite.name,
    email: invite.email,
    role: invite.role,
    companyId: invite.companyId,
    orgUnitId: invite.orgUnitId,
    status: invite.status,
    expiresAt: invite.expiresAt,
    createdAt: invite.createdAt,
    activationDelivery: invite.activationDelivery,
  };
}

export function usePublicTenant(slug?: string) {
  const { data, error, isLoading, mutate } = useSWR<ApiTenantBranding | null>(
    slug ? `tenant_${slug}` : null,
    () => (slug ? tenantService.getTenantBySlug(slug) : Promise.resolve(null)),
    { revalidateOnFocus: false, shouldRetryOnError: false },
  );

  const company: Company | null = data ? mapTenantBrandingToCompany(data) : null;

  return {
    tenant: data ?? null,
    company,
    isLoading,
    isError: error,
    mutate,
  };
}

export function useCurrentCompany(enabled = true) {
  const { data, error, isLoading, mutate } = useSWR<ApiCompanyAuthenticatedView | null>(
    enabled ? 'current_company' : null,
    () => tenantService.getCurrentCompany(),
    { revalidateOnFocus: false },
  );

  const company: Company | null = data ? mapApiCompanyToFrontend(data) : null;

  return {
    raw: data ?? null,
    company,
    isLoading,
    isError: error,
    mutate,
  };
}

export function useFeatures(enabled = true) {
  const { data, error, isLoading, mutate } = useSWR<ApiCompanyFeatureFlags | null>(
    enabled ? 'settings_features' : null,
    () => settingsService.getFeatures(),
    { revalidateOnFocus: false },
  );

  return {
    features: data,
    isLoading,
    isError: error,
    mutate,
  };
}

export function useAdminUsers(enabled = true) {
  const { data, error, isLoading, mutate } = useSWR<ApiAdminUsersList | null>(
    enabled ? 'admin_users' : null,
    () => adminUsersService.list({ limit: 100 }),
    { revalidateOnFocus: false },
  );

  // Real users (already activated) are kept strictly apart from pending invites.
  const users: User[] = data
    ? data.users.map(mapApiUserToFrontend).sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
    : [];

  const invites: PendingInvite[] = data
    ? data.invites
        .map(mapApiInviteToPending)
        .sort((a, b) => a.name.localeCompare(b.name))
    : [];

  return {
    users,
    invites,
    meta: data?.meta ?? null,
    isLoading,
    isError: error,
    mutate,
  };
}

export function useAdminStructure(companyId?: string, enabled = true) {
  const { data, error, isLoading, mutate } = useSWR<ApiStructure | null>(
    enabled ? 'admin_structure' : null,
    () => adminStructureService.getStructure(),
    { revalidateOnFocus: false },
  );

  const orgTopLevels: OrgTopLevel[] = data
    ? data.topLevels.map((entry) => mapApiTopLevelToFrontend(entry, companyId ?? data.companyId))
    : [];
  const orgUnits: OrgUnit[] = data
    ? data.units.map((entry) => mapApiUnitToFrontend(entry, companyId ?? data.companyId))
    : [];

  return {
    structure: data ?? null,
    orgTopLevels,
    orgUnits,
    isLoading,
    isError: error,
    mutate,
  };
}

// ─── Phase 2 hooks ────────────────────────────────────────────────────────────

export function useRepositories(enabled = true) {
  const { data, error, isLoading, mutate } = useSWR<ApiRepository[] | null>(
    enabled ? 'repositories' : null,
    () => repositoriesService.list(),
    { revalidateOnFocus: false },
  );

  const repositories: Repository[] = data
    ? data.map((r) => mapApiRepositoryToFrontend(r))
    : [];

  return { repositories, isLoading, isError: error, mutate };
}

export function useRepository(id?: string) {
  const { data, error, isLoading, mutate } = useSWR<ApiRepository | null>(
    id ? `repository_${id}` : null,
    () => (id ? repositoriesService.get(id) : Promise.resolve(null)),
    { revalidateOnFocus: false },
  );

  const repository: Repository | null = data ? mapApiRepositoryToFrontend(data) : null;

  return { repository, raw: data ?? null, isLoading, isError: error, mutate };
}

export function useRepositoryCatalog(repositoryId?: string) {
  const { data, error, isLoading, mutate } = useSWR<ApiRepositoryCatalog | null>(
    repositoryId ? `catalog_${repositoryId}` : null,
    () => (repositoryId ? contentsService.getCatalog(repositoryId) : Promise.resolve(null)),
    { revalidateOnFocus: false },
  );

  const repository: Repository | null = data
    ? mapApiRepositoryToFrontend(data.repository)
    : null;
  const contents: Content[] = data
    ? data.contents.map((c) => mapApiContentToFrontend(c))
    : [];
  const categories: Category[] = data
    ? data.categories.map(mapApiCategoryToFrontend)
    : [];
  const simpleLinks: SimpleLink[] = data
    ? data.simpleLinks.map((l) => mapApiSimpleLinkToFrontend(l))
    : [];

  return { repository, contents, categories, simpleLinks, isLoading, isError: error, mutate };
}

export function usePublicLanding(slug?: string) {
  const { data: landing, error: landingError, isLoading: loadingLanding } = useSWR(
    slug ? `landing_${slug}` : null,
    () => (slug ? landingService.getLanding(slug) : Promise.resolve(null)),
    { revalidateOnFocus: false, shouldRetryOnError: false },
  );

  const { data: repos, error: reposError, isLoading: loadingRepos, mutate } = useSWR<ApiPublicRepository[] | null>(
    slug ? `landing_repos_${slug}` : null,
    () => (slug ? landingService.getPublicRepositories(slug) : Promise.resolve(null)),
    { revalidateOnFocus: false, shouldRetryOnError: false },
  );

  const repositories: Repository[] = repos
    ? repos.map((r) => mapApiRepositoryToFrontend(r))
    : [];

  return {
    landing: landing ?? null,
    repositories,
    isLoading: loadingLanding || loadingRepos,
    isError: landingError ?? reposError,
    mutate,
  };
}
