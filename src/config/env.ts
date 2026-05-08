const demoModeRaw = String(import.meta.env.VITE_DEMO_MODE ?? '').trim().toLowerCase();
const isProductionBuild = import.meta.env.PROD;

export function resolveDemoModeAllowed(raw: unknown, productionBuild: boolean): boolean {
  const normalized = String(raw ?? '').trim().toLowerCase();
  return !productionBuild && (normalized === 'true' || normalized === '1' || normalized === 'yes');
}

export const DEMO_MODE = resolveDemoModeAllowed(demoModeRaw, isProductionBuild);

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
    throw new Error('DayOf is still being connected. Please try again shortly.');
  }
}

export function isDemoAllowed(): boolean {
  return DEMO_MODE;
}
