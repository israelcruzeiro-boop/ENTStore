import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { usePublicTenant } from '@/hooks/useApiData';
import type { Company } from '@/types';
import { DEFAULT_THEME, hexToRgbChannel, normalizeTheme } from '@/lib/appearance';

interface TenantContextType {
  tenantCompany: Company | null;
  slug: string;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider = () => {
  const { companySlug } = useParams<{ companySlug: string }>();
  const { company: tenantCompany } = usePublicTenant(companySlug);

  const slug = companySlug ?? '';
  const contextValue = useMemo(() => ({ tenantCompany, slug }), [tenantCompany, slug]);

  useEffect(() => {
    const root = document.documentElement;
    const theme = normalizeTheme(tenantCompany?.theme ?? DEFAULT_THEME);

    root.style.setProperty('--c-primary', theme.primary);
    root.style.setProperty('--c-primary-rgb', hexToRgbChannel(theme.primary, '37 99 235'));
    root.style.setProperty('--c-secondary', theme.secondary);
    root.style.setProperty('--c-secondary-rgb', hexToRgbChannel(theme.secondary, '29 78 216'));
    root.style.setProperty('--c-bg', theme.background);
    root.style.setProperty('--c-bg-rgb', hexToRgbChannel(theme.background, '9 9 11'));
    root.style.setProperty('--c-card', theme.card);
    root.style.setProperty('--c-card-rgb', hexToRgbChannel(theme.card, hexToRgbChannel(theme.background, '24 24 27')));
    root.style.setProperty('--c-text', theme.text);
    root.style.setProperty('--c-text-rgb', hexToRgbChannel(theme.text, '255 255 255'));
  }, [tenantCompany]);

  return (
    <TenantContext.Provider value={contextValue}>
      <Outlet />
    </TenantContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useTenant = () => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};
