/**
 * Environment variable validation.
 * Import this module to ensure all required env vars are set at startup.
 */

function getEnv(key: string, required = true): string {
  const val = import.meta.env[key] ?? process.env[key] ?? '';
  if (required && !val) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return val;
}

const supabaseUrl = getEnv('SUPABASE_URL');
if (!supabaseUrl.startsWith('https://')) {
  throw new Error('SUPABASE_URL must start with https://');
}

export const env = {
  SUPABASE_URL: supabaseUrl,
  SUPABASE_ANON_KEY: getEnv('SUPABASE_ANON_KEY'),
  SUPABASE_SERVICE_KEY: getEnv('SUPABASE_SERVICE_KEY'),
  MEILISEARCH_HOST: getEnv('MEILISEARCH_HOST', false) || 'http://localhost:7700',
  MEILISEARCH_API_KEY: getEnv('MEILISEARCH_API_KEY', false),
  ANTHROPIC_API_KEY: getEnv('ANTHROPIC_API_KEY', false),
  STEAM_API_KEY: getEnv('STEAM_API_KEY', false),
};
