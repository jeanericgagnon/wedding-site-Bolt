import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('AI product contract', () => {
  it('keeps a canonical classified AI contract doc for V2 closeout', () => {
    const source = readFileSync(join(process.cwd(), 'docs/ai-product-contract.md'), 'utf8');

    expect(source).toContain('## Model-backed server lanes');
    expect(source).toContain('## Deterministic or reviewable lanes');
    expect(source).toContain('## Intentionally non-AI lanes');
    expect(source).toContain('Quick Start orchestration may use a server-side model when configured.');
    expect(source).toContain('Generated wedding-site copy remains a grounded draft helper.');
    expect(source).toContain('Planner suggestions, invisible-intelligence nudges, and recap coaching are deterministic helpers');
    expect(source).toContain('Vendor profile generation is a bounded public-source fetch and draft flow, not a model-backed AI lane.');
  });

  it('keeps deterministic recap coaching out of AI-labeled owner copy', () => {
    const source = readFileSync(join(process.cwd(), 'src/lib/memoryCurator.ts'), 'utf8');

    expect(source).toContain('Generate the first recap draft while the collection is still compact.');
    expect(source).not.toContain('Generate the first AI recap while the collection is still compact.');
  });
});
