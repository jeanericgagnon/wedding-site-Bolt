const demoModeRaw = String(import.meta.env.VITE_DEMO_MODE ?? '').trim().toLowerCase();
export const DEMO_MODE = demoModeRaw === 'true' || demoModeRaw === '1' || demoModeRaw === 'yes';

const builderV2EnabledRaw = String(import.meta.env.VITE_BUILDER_V2_ENABLED ?? 'true').trim().toLowerCase();
export const BUILDER_V2_ENABLED = !['false', '0', 'no'].includes(builderV2EnabledRaw);
const builderV2AudienceRaw = String(import.meta.env.VITE_BUILDER_V2_AUDIENCE ?? 'all').trim().toLowerCase();
export const BUILDER_V2_AUDIENCE = builderV2AudienceRaw === 'internal' ? 'internal' : 'all';
const internalToolingRoutesRaw = String(import.meta.env.VITE_ENABLE_INTERNAL_TOOLING_ROUTES ?? 'false').trim().toLowerCase();
export const ENABLE_INTERNAL_TOOLING_ROUTES = ['true', '1', 'yes'].includes(internalToolingRoutesRaw);

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
