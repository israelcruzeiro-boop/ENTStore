import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  const clearSession = useCallback(() => {
    if (!mountedRef.current) return;
    setUser(null);
    setCompany(null);
  }, []);

  const loadMe = useCallback(async () => {
    try {
      const me = await authService.me();
      if (!mountedRef.current) return;
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
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const unregister = onSessionExpired(() => {
      clearSession();
      toast.error('Sua sessão expirou. Faça login novamente.');
    });

    const bootstrap = async () => {
      try {
        if (!tokenStorage.hasSession()) {
          if (!tokenStorage.hasRefreshSessionHint()) return;
          const refreshed = await refreshAccessToken();
          if (!refreshed) return;
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
  }, [clearSession, loadMe]);

  const login = async (
    identifier: string,
    password: string,
    companySlug?: string,
  ): Promise<{ user: User; company: Company } | null> => {
    setLoading(true);
    try {
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
      clearSession();
      if (isApiUnavailableError(err)) throw err;
      return null;
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  const logout = async () => {
    try {
      if (tokenStorage.getAccess()) {
        await authService.logout();
      }
    } catch (err) {
      Logger.warn('Logout request failed', err);
    } finally {
      tokenStorage.clear();
      clearSession();
    }
  };

  const clearLocalSession = () => {
    tokenStorage.clear();
    clearSession();
  };

  const refreshUser = async () => {
    try {
      if (!tokenStorage.hasSession()) {
        if (!tokenStorage.hasRefreshSessionHint()) return;
        const refreshed = await refreshAccessToken();
        if (!refreshed) return;
      }
      await loadMe();
    } catch {
      // already handled
    }
  };

  return (
    <AuthContext.Provider value={{ user, company, loading, login, logout, clearLocalSession, refreshUser }}>
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
