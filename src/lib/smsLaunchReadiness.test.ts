import { describe, expect, it } from 'vitest';

import {
  SMS_CREDITS_LOCK_COPY,
  SMS_PUBLIC_LOCK_COPY,
  SMS_SENDING_ENABLED,
  SMS_WORKSPACE_LOCK_COPY,
} from './smsLaunchReadiness';

describe('smsLaunchReadiness', () => {
  it('keeps SMS sending disabled by default until the env is explicitly enabled', () => {
    expect(SMS_SENDING_ENABLED).toBe(false);
  });

  it('shares the narrowed SMS lock copy across public and owner surfaces', () => {
    expect(SMS_PUBLIC_LOCK_COPY).toBe('Texts stay locked until sender setup, consent, and delivery readiness are complete.');
    expect(SMS_WORKSPACE_LOCK_COPY).toBe('Texting stays locked in this workspace until sender setup, consent, opt-out, and delivery readiness are complete.');
    expect(SMS_CREDITS_LOCK_COPY).toBe('SMS credits stay locked until texting readiness is complete.');
  });
});
