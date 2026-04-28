import { createBrowserClient } from '@supabase/ssr';
import { runtimeConfig } from '../app/lib/runtimeConfig';

const supabaseUrl = runtimeConfig.supabaseUrl;
const supabaseAnonKey = runtimeConfig.supabaseAnonKey;

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

export default supabase;
