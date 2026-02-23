const demoModeRaw = String(import.meta.env.VITE_DEMO_MODE ?? '').trim().toLowerCase();
export const DEMO_MODE = demoModeRaw === 'true' || demoModeRaw === '1' || demoModeRaw === 'yes';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const supabaseAnon = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();
const isPlaceholderSupabase =
  !supabaseUrl ||
  !supabaseAnon ||
  supabaseUrl.includes('your-project.supabase.co') ||
  supabaseUrl.includes('example.supabase.co') ||
  supabaseAnon === 'your-anon-key-here' ||
  supabaseAnon === 'demo-anon-key';

export const SUPABASE_CONFIGURED = !isPlaceholderSupabase;

export function requireSupabase(): void {
  if (!SUPABASE_CONFIGURED && !DEMO_MODE) {
    throw new Error('Supabase is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.');
  }
}

export function isDemoAllowed(): boolean {
  return DEMO_MODE;
}
