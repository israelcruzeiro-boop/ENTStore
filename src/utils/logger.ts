/**
 * Logger customizado para centralizar logs do sistema.
 * Substitui o uso de console.log conforme REGRAS_AGENTE.md.
 */

const isProd = import.meta.env.PROD;
const REDACTED = '[REDACTED]';
const sensitiveKeyPattern = /(token|password|secret|cookie|authorization|email|cpf|refresh|access|activation)/i;

function redactString(value: string): string {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, `Bearer ${REDACTED}`)
    .replace(/([?&](?:token|activationToken|inviteToken)=)[^&#\s]+/gi, `$1${REDACTED}`)
    .replace(/(\/ativar-convite\/)[A-Za-z0-9_-]{20,}/gi, `$1${REDACTED}`)
    .replace(/(\/auth\/invites\/)[A-Za-z0-9_-]{20,}/gi, `$1${REDACTED}`);
}

function sanitizeForLog(value: unknown, depth = 0): unknown {
  if (value instanceof Error) {
    const maybeApiError = value as Error & { code?: string; status?: number };
    return {
      name: value.name,
      message: redactString(value.message),
      ...(maybeApiError.code ? { code: maybeApiError.code } : {}),
      ...(typeof maybeApiError.status === 'number' ? { status: maybeApiError.status } : {}),
    };
  }

  if (typeof value === 'string') return redactString(value);
  if (typeof value !== 'object' || value === null) return value;
  if (depth >= 2) return '[Object]';

  if (Array.isArray(value)) {
    return value.slice(0, 10).map((entry) => sanitizeForLog(entry, depth + 1));
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      key,
      sensitiveKeyPattern.test(key) ? REDACTED : sanitizeForLog(entry, depth + 1),
    ]),
  );
}

function sanitizeArgs(args: unknown[]): unknown[] {
  return args.map((arg) => sanitizeForLog(arg));
}

export const Logger = {
  info: (message: string, ...args: unknown[]) => {
    if (!isProd) {
      console.log(`[INFO] ${redactString(message)}`, ...sanitizeArgs(args));
    }
  },
  warn: (message: string, ...args: unknown[]) => {
    const safeArgs = isProd ? [] : sanitizeArgs(args);
    console.warn(`[WARN] ${redactString(message)}`, ...safeArgs);
  },
  error: (message: string, ...args: unknown[]) => {
    const safeArgs = isProd ? sanitizeArgs(args).slice(0, 1) : sanitizeArgs(args);
    console.error(`[ERROR] ${redactString(message)}`, ...safeArgs);
  },
  debug: (message: string, ...args: unknown[]) => {
    if (!isProd) {
      console.debug(`[DEBUG] ${redactString(message)}`, ...sanitizeArgs(args));
    }
  }
};
