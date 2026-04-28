import { createClient } from '@supabase/supabase-js';
import { runtimeConfig } from './runtimeConfig';

export const SUPABASE_URL: string =
  runtimeConfig.supabaseUrl;

export const SUPABASE_ANON_KEY: string =
  runtimeConfig.supabaseAnonKey;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
