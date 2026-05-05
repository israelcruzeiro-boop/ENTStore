import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useSWRConfig } from 'swr';
import { toast } from 'sonner';
import { authService } from '@/services/api/auth.service';
import {
  ApiException,
  isApiUnavailableError,
  onSessionExpired,
  refreshAccessToken,
  tokenStorage,
} from '@/services/api/client';
import { mapApiCompanyToFrontend, mapApiUserToFrontend } from '@/services/api/mappers';
import type { Company, User } from '@/types';
import { Logger } from '@/utils/logger';

interface AuthContextType {
  user: User | null;
  company: Company | null;
  loading: boolean;
  login: (
    identifier: string,
    password: string,
    companySlug?: string,
  ) => Promise<{ user: User; company: Company } | null>;
  logout: () => Promise<void>;
  clearLocalSession: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PROTECTED_TENANT_ROUTES = new Set([
  'action-plans',
  'biblioteca',
  'busca',
  'checklists',
  'content',
  'cursos',
  'home',
  'hub',
  'perfil',
  'pesquisas',
  'repo',
]);

function isKnownProtectedRoute(pathname: string): boolean {
  const normalizedPath = pathname.replace(/\/+$/, '') || '/';
  const segments = normalizedPath.split('/').filter(Boolean);
  const [rootSegment, tenantRoute] = segments;

  if (rootSegment === 'super-admin') return true;
  if (rootSegment === 'admin' && segments.length >= 2) return true;
  if (!rootSegment) return false;
  if (['login', 'lpage', 'ativar-convite'].includes(rootSegment)) return false;
  if (tenantRoute === undefined) return true;
  if (tenantRoute === 'login' || tenantRoute === 'landing') return false;

  return PROTECTED_TENANT_ROUTES.has(tenantRoute);
}

function shouldAttemptBootstrapRefresh(): boolean {
  if (tokenStorage.hasRefreshSessionHint()) return true;
  if (typeof window === 'undefined') return false;
  return isKnownProtectedRoute(window.location.pathname);
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { mutate: mutateSWR } = useSWRConfig();
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);
  const sessionEpochRef = useRef(0);
  const loadMePromiseRef = useRef<{ epoch: number; promise: Promise<void> } | null>(null);

  const bumpSessionEpoch = useCallback(() => {
    sessionEpochRef.current += 1;
    loadMePromiseRef.current = null;
  }, []);

  const clearClientCache = useCallback(() => {
    void mutateSWR(() => true, undefined, { revalidate: false });
  }, [mutateSWR]);

  const clearSession = useCallback(() => {
    if (!mountedRef.current) return;
    setUser(null);
    setCompany(null);
  }, []);

  const loadMe = useCallback(async () => {
    const epoch = sessionEpochRef.current;
    const inFlight = loadMePromiseRef.current;
    if (inFlight && inFlight.epoch === epoch) return inFlight.promise;

    const promise = (async () => {
      try {
        const me = await authService.me();
        if (!mountedRef.current || sessionEpochRef.current !== epoch) return;
        setUser(mapApiUserToFrontend(me.user));
        setCompany(mapApiCompanyToFrontend(me.company));
      } catch (err) {
        // Token / session cleanup for 401 with session-expired codes is handled
        // centrally in services/api/client (clearSessionFromError + onSessionExpired
        // handler). We only need to log here and propagate for the caller to react.
        if (err instanceof ApiException) {
          Logger.warn(`Failed to load authenticated profile (${err.code ?? err.status})`);
        } else {
          Logger.error('Failed to load authenticated profile', err);
        }
        throw err;
      }
    })();

    loadMePromiseRef.current = { epoch, promise };

    try {
      await promise;
    } finally {
      if (loadMePromiseRef.current?.promise === promise) {
        loadMePromiseRef.current = null;
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const unregister = onSessionExpired(() => {
      bumpSessionEpoch();
      clearSession();
      clearClientCache();
      toast.error('Sua sessão expirou. Faça login novamente.');
    });

    const bootstrap = async () => {
      try {
        if (!tokenStorage.hasSession()) {
          if (!shouldAttemptBootstrapRefresh()) return;
          const refreshed = await refreshAccessToken();
          if (!refreshed) return;
          bumpSessionEpoch();
        }
        await loadMe();
      } catch {
        // loadMe already handled session cleanup when applicable.
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    };

    bootstrap();

    return () => {
      mountedRef.current = false;
      unregister();
    };
  }, [bumpSessionEpoch, clearClientCache, clearSession, loadMe]);

  const login = useCallback(async (
    identifier: string,
    password: string,
    companySlug?: string,
  ): Promise<{ user: User; company: Company } | null> => {
    setLoading(true);
    try {
      bumpSessionEpoch();
      clearClientCache();
      const session = await authService.login({
        identifier: identifier.trim(),
        password,
        ...(companySlug ? { company_slug: companySlug } : {}),
      });
      tokenStorage.set(session.accessToken);
      const mappedUser = mapApiUserToFrontend(session.user);
      const mappedCompany = mapApiCompanyToFrontend(session.company);
      setUser(mappedUser);
      setCompany(mappedCompany);
      return { user: mappedUser, company: mappedCompany };
    } catch (err) {
      if (err instanceof ApiException) {
        Logger.warn(`Login failed: ${err.code ?? err.status}`);
      } else {
        Logger.error('Login unexpected error', err);
      }
      tokenStorage.clear();
      bumpSessionEpoch();
      clearSession();
      clearClientCache();
      if (isApiUnavailableError(err)) throw err;
      return null;
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [bumpSessionEpoch, clearClientCache, clearSession]);

  const logout = useCallback(async () => {
    try {
      if (tokenStorage.getAccess()) {
        await authService.logout();
      }
    } catch (err) {
      Logger.warn('Logout request failed', err);
    } finally {
      tokenStorage.clear();
      bumpSessionEpoch();
      clearSession();
      clearClientCache();
    }
  }, [bumpSessionEpoch, clearClientCache, clearSession]);

  const clearLocalSession = useCallback(() => {
    tokenStorage.clear();
    bumpSessionEpoch();
    clearSession();
    clearClientCache();
  }, [bumpSessionEpoch, clearClientCache, clearSession]);

  const refreshUser = useCallback(async () => {
    try {
      if (!tokenStorage.hasSession()) {
        if (!tokenStorage.hasRefreshSessionHint()) return;
        const refreshed = await refreshAccessToken();
        if (!refreshed) return;
        bumpSessionEpoch();
      }
      await loadMe();
    } catch {
      // already handled
    }
  }, [bumpSessionEpoch, loadMe]);

  const contextValue = useMemo(
    () => ({ user, company, loading, login, logout, clearLocalSession, refreshUser }),
    [user, company, loading, login, logout, clearLocalSession, refreshUser],
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
