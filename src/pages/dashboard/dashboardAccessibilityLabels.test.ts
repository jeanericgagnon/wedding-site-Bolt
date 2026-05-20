import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('dashboard accessibility labels', () => {
  it('gives vault icon controls explicit accessible names', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/dashboard/VaultCard.tsx'), 'utf8');

    expect(source).toContain('aria-label={`Share ${config.label || `Vault ${config.vault_index}`}`}');
    expect(source).toContain('aria-label={`Edit ${config.label || `Vault ${config.vault_index}`}`}');
    expect(source).toContain("aria-label={`${config.is_enabled ? 'Disable' : 'Enable'} ${config.label || `Vault ${config.vault_index}`}`}");
    expect(source).toContain("aria-label={`${expanded ? 'Collapse' : 'Expand'} ${config.label || `Vault ${config.vault_index}`}`}");
  });

  it('gives itinerary event icon buttons explicit accessible names', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/dashboard/ItineraryDashboardRouteContent.tsx'), 'utf8');

    expect(source).toContain('aria-label={`Edit ${event.event_name}`}');
    expect(source).toContain('aria-label={`Delete ${event.event_name}`}');
  });

  it('keeps the coordinator proof surface anchored on the wedding-day helper heading', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/dashboard/coordinator/CoordinatorDashboardRouteContent.tsx'), 'utf8');

    expect(source).toContain('title="Everything helpers need on the wedding day."');
  });
});
