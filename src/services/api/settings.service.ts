import { api } from './client';
import type { ApiCompanyAuthenticatedView, ApiCompanyFeatureFlags } from './types';

export interface UpdateAppearancePayload {
  logoUrl?: string | null;
  faviconUrl?: string | null;
  theme?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    surface?: string;
    text?: string;
  };
  hero?: {
    title?: string;
    subtitle?: string;
    ctaLabel?: string | null;
    imageUrl?: string | null;
  };
}

export interface UpdateFeaturesPayload {
  repositories?: boolean;
  lms?: boolean;
  checklists?: boolean;
  surveys?: boolean;
  metrics?: boolean;
}

export interface UpdateGeneralPayload {
  name?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  active?: boolean;
  orgLevels?: string[];
  orgUnitName?: string;
  supportEmail?: string | null;
}

export const settingsService = {
  getFeatures: () => api.get<ApiCompanyFeatureFlags>('/settings/features'),

  updateAppearance: (payload: UpdateAppearancePayload) =>
    api.patch<ApiCompanyAuthenticatedView>('/admin/settings/appearance', payload),

  updateFeatures: (payload: UpdateFeaturesPayload) =>
    api.patch<ApiCompanyAuthenticatedView>('/admin/settings/features', payload),

  updateGeneral: (payload: UpdateGeneralPayload) =>
    api.patch<ApiCompanyAuthenticatedView>('/admin/settings/general', payload),
};
