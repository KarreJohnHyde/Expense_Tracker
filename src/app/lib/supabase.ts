import { createClient } from '@supabase/supabase-js';

const _meta = (import.meta as any).env || {};

export const SUPABASE_URL: string =
  (_meta.VITE_SUPABASE_URL as string) ||
  'https://mock.supabase.co';

export const SUPABASE_ANON_KEY: string =
  (_meta.VITE_SUPABASE_ANON_KEY as string) ||
  'mock-key';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
