import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { invokeFunctionOrThrowMock } = vi.hoisted(() => ({
  invokeFunctionOrThrowMock: vi.fn(),
}));

vi.mock('../../lib/invokeFunctionOrThrow', () => ({
  invokeFunctionOrThrow: invokeFunctionOrThrowMock,
}));

vi.mock('../../lib/supabase', () => ({
  supabase: { __brand: 'supabase-client' },
}));

import { submitSetupBootstrap } from './setupService';

describe('setupService', () => {
  beforeEach(() => {
    invokeFunctionOrThrowMock.mockReset();
    invokeFunctionOrThrowMock.mockResolvedValue(undefined);
  });

  it('keeps setup bootstrap invocation behind the setup service', () => {
    const page = readFileSync(join(process.cwd(), 'src/pages/setup/SetupShell.tsx'), 'utf8');
    const service = readFileSync(join(process.cwd(), 'src/pages/setup/setupService.ts'), 'utf8');

    expect(page).toContain('submitSetupBootstrap(draft)');
    expect(page).not.toContain("invokeFunctionOrThrow(supabase, 'setup-bootstrap'");
    expect(page).not.toContain("from '../../lib/supabase'");
    expect(service).toContain("invokeFunctionOrThrow(supabase, 'setup-bootstrap'");
  });

  it('submits setup bootstrap through the shared function invoker', async () => {
    const draft = {
      migrationSource: 'fresh',
      partnerOneFirstName: 'Alex',
      partnerTwoFirstName: 'Jordan',
      partnerOneLastName: '',
      partnerTwoLastName: '',
      dateKnown: false,
      weddingDate: '',
      weddingCity: 'Los Angeles',
      guestEstimateBand: '50-100',
      stylePreferences: [],
      selectedTemplateId: '',
    } as any;

    await submitSetupBootstrap(draft);

    expect(invokeFunctionOrThrowMock).toHaveBeenCalledWith(
      expect.objectContaining({ __brand: 'supabase-client' }),
      'setup-bootstrap',
      draft,
    );
  });

  it('clears stale setup-shell validation copy when navigating backward', () => {
    const page = readFileSync(join(process.cwd(), 'src/pages/setup/SetupShell.tsx'), 'utf8');

    expect(page).toContain('const goPrev = () => {');
    expect(page).toContain("setError('');");
  });

  it('routes setup-shell reset through React Router instead of forcing a full page reload', () => {
    const page = readFileSync(join(process.cwd(), 'src/pages/setup/SetupShell.tsx'), 'utf8');

    expect(page).toContain("const navigate = useNavigate();");
    expect(page).toContain("navigate('/setup/names');");
    expect(page).not.toContain("window.location.href = '/setup/names';");
  });

  it('surfaces recommended template page routes and all use-case packs in setup', () => {
    const page = readFileSync(join(process.cwd(), 'src/pages/setup/SetupShell.tsx'), 'utf8');

    expect(page).toContain('tpl.guestRoutes.slice(0, 4).map');
    expect(page).toContain('tpl.pageCount');
    expect(page).toContain('tpl.readinessLabel');
    expect(page).toContain('tpl.pageBlueprints.slice(0, 2).map');
    expect(page).toContain('recommendedTemplateMatches.map');
    expect(page).toContain('reasons.slice(0, 2).map');
    expect(page).toContain("pack.id === 'weekend' && setupMode.weekend");
    expect(page).toContain("pack.id === 'black-tie' && setupMode.blackTie");
    expect(page).toContain("pack.id === 'guest-interactive' && setupMode.guestInteractive");
  });
});
