import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { buildRegistryMaintenanceProofReport } from '../../scripts/v1-proof-registry-maintenance-report.mjs';

describe('registry maintenance proof script', () => {
  it('builds a fixture-backed registry maintenance proof report', () => {
    const result = buildRegistryMaintenanceProofReport({
      siteLabel: 'fixture-couple',
      source: 'fixture',
      items: [
        {
          id: 'broken-1',
          wedding_site_id: 'site-1',
          item_name: 'Access Denied',
          price_label: null,
          price_amount: null,
          store_name: 'REI',
          merchant: 'rei.com',
          item_url: 'https://www.rei.com/product/example',
          canonical_url: 'https://www.rei.com/product/example',
          selected_product_url: 'https://www.rei.com/product/example',
          image_url: null,
          description: null,
          notes: null,
          quantity_needed: 1,
          quantity_purchased: 0,
          purchaser_name: null,
          purchase_status: 'available',
          hide_when_purchased: false,
          sort_order: 0,
          priority: 'medium',
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
          metadata_fetch_status: 'blocked',
          metadata_confidence_score: 0.4,
          metadata_source_method: 'adapter',
          metadata_retailer: 'rei',
          source_status: 'blocked',
        },
      ],
    });

    expect(result.ok).toBe(true);
    expect(result.source).toBe('fixture');
    expect(result.truthSweepPrediction.linkOnlyCount).toBe(1);
    expect(result.maintenanceReportText).toContain('Would shift to link-only: 1');
  });

  it('registers the proof command in package.json', () => {
    const packageJson = readFileSync(join(process.cwd(), 'package.json'), 'utf8');
    expect(packageJson).toContain('"proof:v1:registry-maintenance-report": "node scripts/v1-proof-registry-maintenance-report.mjs"');
  });
});
