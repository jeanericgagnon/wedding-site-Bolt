import { supabase } from '../../lib/supabase';
import { invokeFunctionOrThrow } from '../../lib/invokeFunctionOrThrow';
import type { SetupDraft } from '../../lib/setupDraft';

export async function submitSetupBootstrap(draft: SetupDraft): Promise<void> {
  await invokeFunctionOrThrow(supabase, 'setup-bootstrap', draft as unknown as Record<string, unknown>);
}
