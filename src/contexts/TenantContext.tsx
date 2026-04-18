import React, { createContext, useContext, useEffect } from 'react';
import { useParams, Outlet } from 'react-router-dom';
import { usePublicCompanyBySlug } from '../hooks/useSupabaseData';
import { Company } from '../types';

interface TenantContextType {
  tenantCompany: Company | null;
  slug: string;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider = () => {
  const { companySlug } = useParams<{ companySlug: string }>();
  const { company: tenantCompany } = usePublicCompanyBySlug(companySlug);
  
  const slug = companySlug || '';

  useEffect(() => {
    const root = document.documentElement;
    if (tenantCompany && tenantCompany.theme) {
      root.style.setProperty('--c-primary', tenantCompany.theme.primary);
      root.style.setProperty('--c-secondary', tenantCompany.theme.secondary);
      root.style.setProperty('--c-bg', tenantCompany.theme.background);
      root.style.setProperty('--c-card', tenantCompany.theme.card);
      root.style.setProperty('--c-text', tenantCompany.theme.text);
    } else {
      root.style.setProperty('--c-primary', '#3b82f6');
      root.style.setProperty('--c-secondary', '#1d4ed8');
      root.style.setProperty('--c-bg', '#09090b');
      root.style.setProperty('--c-card', '#18181b');
      root.style.setProperty('--c-text', '#ffffff');
    }
  }, [tenantCompany]);

  return (
    <TenantContext.Provider value={{ tenantCompany, slug }}>
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