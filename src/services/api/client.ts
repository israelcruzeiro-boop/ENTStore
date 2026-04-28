import { Logger } from '@/utils/logger';

const API_BASE_URL = import.meta.env.VITE_API_URL;

if (!API_BASE_URL) {
  throw new Error('VITE_API_URL is not defined. Check your .env configuration.');
}

const LEGACY_ACCESS_TOKEN_KEY = 'sp_access_token';
let accessToken: string | null = null;

try {
  localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
} catch {
  // Storage can be unavailable in hardened browsers; auth falls back to memory.
}

const SESSION_EXPIRED_CODES = new Set([
  'UNAUTHENTICATED',
  'SESSION_REVOKED',
  'INVALID_REFRESH_TOKEN',
]);

const NO_REFRESH_PATHS = ['/auth/login', '/auth/refresh', '/auth/logout'];

type ApiSuccess<T> = { success: true; data: T; message?: string };
type ApiError = { success: false; error: string; code?: string };
type ApiEnvelope<T> = ApiSuccess<T> | ApiError;

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  skipAuth?: boolean;
}

export class ApiException extends Error {
  status: number;
  code?: string;
  payload?: unknown;

  constructor(message: string, status: number, code?: string, payload?: unknown) {
    super(message);
    this.name = 'ApiException';
    this.status = status;
    this.code = code;
    this.payload = payload;
  }
}

type SessionExpiredHandler = () => void;
let sessionExpiredHandler: SessionExpiredHandler | null = null;

export function onSessionExpired(handler: SessionExpiredHandler): () => void {
  sessionExpiredHandler = handler;
  return () => {
    if (sessionExpiredHandler === handler) sessionExpiredHandler = null;
  };
}

export const tokenStorage = {
  getAccess(): string | null {
    return accessToken;
  },
  set(access: string): void {
    accessToken = access;
  },
  clear(): void {
    accessToken = null;
    try {
      localStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
    } catch {
      // Ignore storage failures; the in-memory token is already cleared.
    }
  },
  hasSession(): boolean {
    return Boolean(accessToken);
  },
};

function buildUrl(path: string, query?: ApiRequestOptions['query']): string {
  const base = API_BASE_URL.replace(/\/+$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  const url = `${base}${suffix}`;
  if (!query) return url;
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    params.append(key, String(value));
  });
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

function isRefreshablePath(path: string): boolean {
  return !NO_REFRESH_PATHS.some((excluded) => path === excluded || path.startsWith(`${excluded}?`));
}

function clearSessionFromError(code: string | undefined): void {
  if (!code || !SESSION_EXPIRED_CODES.has(code)) return;
  tokenStorage.clear();
  if (sessionExpiredHandler) {
    try {
      sessionExpiredHandler();
    } catch (err) {
      Logger.error('Session expired handler failed', err);
    }
  }
}

let refreshPromise: Promise<boolean> | null = null;

async function performRefresh(): Promise<boolean> {
  try {
    const response = await fetch(buildUrl('/auth/refresh'), {
      method: 'POST',
      headers: { Accept: 'application/json' },
      credentials: 'include',
    });
    const envelope = (await response.json().catch(() => null)) as ApiEnvelope<{
      accessToken: string;
    }> | null;

    if (!response.ok || !envelope || envelope.success !== true) {
      const code = envelope && envelope.success === false ? envelope.code : undefined;
      clearSessionFromError(code ?? 'INVALID_REFRESH_TOKEN');
      return false;
    }

    tokenStorage.set(envelope.data.accessToken);
    return true;
  } catch (err) {
    Logger.error('Token refresh failed', err);
    return false;
  }
}

function refreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export function refreshAccessToken(): Promise<boolean> {
  return refreshSession();
}

async function doFetch<T>(path: string, options: ApiRequestOptions): Promise<T> {
  const { body, query, skipAuth, headers: rawHeaders, ...rest } = options;
  const headers = new Headers(rawHeaders as HeadersInit | undefined);

  if (body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');

  if (!skipAuth) {
    const token = tokenStorage.getAccess();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(buildUrl(path, query), {
    ...rest,
    credentials: rest.credentials ?? 'include',
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  let envelope: ApiEnvelope<T> | null = null;
  if (text) {
    try {
      envelope = JSON.parse(text) as ApiEnvelope<T>;
    } catch {
      envelope = null;
    }
  }

  if (!response.ok || !envelope || envelope.success === false) {
    const code = envelope && envelope.success === false ? envelope.code : undefined;
    const message =
      (envelope && envelope.success === false && envelope.error) ||
      `Request failed with status ${response.status}`;
    throw new ApiException(message, response.status, code, envelope);
  }

  return envelope.data;
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  try {
    return await doFetch<T>(path, options);
  } catch (err) {
    if (!(err instanceof ApiException)) throw err;

    const canRefresh =
      err.status === 401 &&
      !options.skipAuth &&
      isRefreshablePath(path) &&
      err.code !== 'SESSION_REVOKED' &&
      err.code !== 'INVALID_REFRESH_TOKEN';

    if (canRefresh) {
      const refreshed = await refreshSession();
      if (refreshed) {
        return await doFetch<T>(path, options);
      }
    }

    if (err.status === 401) clearSessionFromError(err.code);
    throw err;
  }
}

export const api = {
  get: <T>(path: string, options: Omit<ApiRequestOptions, 'body' | 'method'> = {}) =>
    apiRequest<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options: Omit<ApiRequestOptions, 'body' | 'method'> = {}) =>
    apiRequest<T>(path, { ...options, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, options: Omit<ApiRequestOptions, 'body' | 'method'> = {}) =>
    apiRequest<T>(path, { ...options, method: 'PATCH', body }),
  put: <T>(path: string, body?: unknown, options: Omit<ApiRequestOptions, 'body' | 'method'> = {}) =>
    apiRequest<T>(path, { ...options, method: 'PUT', body }),
  delete: <T>(path: string, options: Omit<ApiRequestOptions, 'body' | 'method'> = {}) =>
    apiRequest<T>(path, { ...options, method: 'DELETE' }),
};
