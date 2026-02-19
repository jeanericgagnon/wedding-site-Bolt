export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
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
