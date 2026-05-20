import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('settings account recovery wiring', () => {
  it('clears stale account and password status once the owner edits those fields again', () => {
    const source = readFileSync(join(process.cwd(), 'src/pages/dashboard/Settings.tsx'), 'utf8');

    expect(source).toContain("setCoupleNames: (value) => {\n      setAccountError(null);\n      setAccountSuccess(null);\n      setCoupleNames(value);\n    },");
    expect(source).toContain("setCurrentPassword: (value) => {\n      setPasswordError(null);\n      setPasswordSuccess(null);\n      setCurrentPassword(value);\n    },");
    expect(source).toContain("setNewPassword: (value) => {\n      setPasswordError(null);\n      setPasswordSuccess(null);\n      setNewPassword(value);\n    },");
    expect(source).toContain("setConfirmPassword: (value) => {\n      setPasswordError(null);\n      setPasswordSuccess(null);\n      setConfirmPassword(value);\n    },");
  });
});
