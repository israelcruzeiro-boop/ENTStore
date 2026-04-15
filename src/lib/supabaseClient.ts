import { createClient } from '@supabase/supabase-js';
import { Logger } from '../utils/logger';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Fetcher genérico para queries do Supabase com SWR ou React Query.
 */
export const fetcher = async <T>(queryFn: () => PromiseLike<{ data: T | null; error: unknown }>) => {
  const { data, error } = await queryFn();
  if (error) {
    Logger.error('Supabase fetch error:', error);
    throw error;
  }
  return data;
};

export const SUPABASE_CONFIG = {
  url: supabaseUrl,
  anonKey: supabaseAnonKey,
  isConfigured: !!(supabaseUrl && supabaseAnonKey),
};
