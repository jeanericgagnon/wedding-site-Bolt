export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

export const SUPABASE_CONFIGURED =
  Boolean(import.meta.env.VITE_SUPABASE_URL) &&
  Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY);

export function requireSupabase(): void {
  if (!SUPABASE_CONFIGURED && !DEMO_MODE) {
    throw new Error('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.');
  }
}

export function isDemoAllowed(): boolean {
  return DEMO_MODE;
}
