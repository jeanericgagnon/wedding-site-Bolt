import { describe, expect, it } from 'vitest';
import { getCoordinatorCommandBadgeTone } from './coordinatorCommandBadgeTone';

describe('coordinatorCommandBadgeTone', () => {
  it('maps shared command-strip badge tones to consistent classes', () => {
    expect(getCoordinatorCommandBadgeTone({ tone: 'primary' })).toBe('border-primary/20 bg-white/70 text-primary');
    expect(getCoordinatorCommandBadgeTone({ tone: 'warning' })).toBe('border-amber-200 bg-white/80 text-amber-800');
    expect(getCoordinatorCommandBadgeTone({ tone: 'success' })).toBe('border-emerald-200 bg-white/80 text-emerald-800');
    expect(getCoordinatorCommandBadgeTone({ tone: 'neutral' })).toBe('border-border/40 bg-white/80 text-text-primary');
  });
});
