import { describe, expect, it } from 'vitest';

import { createBuilderV2CommandPaletteExecutionGuard } from './builderV2CommandPaletteExecution';

describe('builderV2CommandPaletteExecution', () => {
  it('blocks duplicate execution of the same command inside one palette session', () => {
    const guard = createBuilderV2CommandPaletteExecutionGuard();

    expect(guard.canExecute('launch-review')).toBe(true);
    expect(guard.canExecute('launch-review')).toBe(false);
  });

  it('allows different commands in the same palette session', () => {
    const guard = createBuilderV2CommandPaletteExecutionGuard();

    expect(guard.canExecute('launch-review')).toBe(true);
    expect(guard.canExecute('export-open')).toBe(true);
  });

  it('allows the same command again after the palette session resets', () => {
    const guard = createBuilderV2CommandPaletteExecutionGuard();

    expect(guard.canExecute('sel-review')).toBe(true);
    expect(guard.canExecute('sel-review')).toBe(false);

    guard.reset();

    expect(guard.canExecute('sel-review')).toBe(true);
  });
});
