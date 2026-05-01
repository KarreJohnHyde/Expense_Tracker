const env = (import.meta as { env?: Record<string, string> }).env || {};

function normalizeUrl(url: string | undefined | null): string {
  return (url || '').trim().replace(/\/+$/, '');
}

export function buildFunctionsUrl(supabaseUrl: string): string {
  const normalized = normalizeUrl(supabaseUrl);
  return normalized ? `${normalized}/functions/v1` : '';
}

const supabaseUrl = normalizeUrl(env.VITE_SUPABASE_URL);
const functionsUrlFromSupabase = buildFunctionsUrl(supabaseUrl);

const localApi = 'http://127.0.0.1:3001';

export const runtimeConfig = {
  supabaseUrl: supabaseUrl || 'https://mock.supabase.co',
  supabaseAnonKey: (env.VITE_SUPABASE_ANON_KEY || '').trim() || 'mock-key',
  pythonApiUrl: normalizeUrl(env.VITE_PYTHON_API_URL) || 'http://127.0.0.1:3000',
  edgeApiUrl: normalizeUrl(env.VITE_API_URL) || functionsUrlFromSupabase,
  webhookBaseUrl: normalizeUrl(env.VITE_WEBHOOK_BASE_URL || env.VITE_API_URL) || functionsUrlFromSupabase || localApi,
  ocrApiUrl: normalizeUrl(env.VITE_OCR_API_URL) || localApi,
  marketApiBase: normalizeUrl(env.VITE_MARKET_API_BASE),
  apiMode: (env.VITE_API_MODE || '').trim(),
  twelveDataKey: (env.VITE_TWELVEDATA_API_KEY || '').trim(),
};

export const hasEdgeApi = Boolean(runtimeConfig.edgeApiUrl);
