/**
 * Supabase client — single shared instance for the entire app.
 *
 * Uses VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY env vars when available,
 * otherwise falls back to the hardcoded project credentials from
 * utils/supabase/info.tsx.
 */

import { createClient } from '@supabase/supabase-js';

/* eslint-disable @typescript-eslint/no-explicit-any */
const _meta = (import.meta as any).env || {};

const SUPABASE_URL: string =
  (_meta.VITE_SUPABASE_URL as string) ||
  'https://yghrnwlwfdadlnzhqhdp.supabase.co';

const SUPABASE_ANON_KEY: string =
  (_meta.VITE_SUPABASE_ANON_KEY as string) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlnaHJud2x3ZmRhZGxuemhxaGRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4MDYxOTksImV4cCI6MjA4OTM4MjE5OX0.-MEafOtWd6wh2cOuMub4C8eerqHkFGk8JV7aj1ivm5c';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
export { SUPABASE_URL, SUPABASE_ANON_KEY };
