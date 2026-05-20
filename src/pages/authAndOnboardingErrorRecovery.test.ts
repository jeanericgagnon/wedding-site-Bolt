import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), 'utf8');

describe('auth and onboarding error recovery guards', () => {
  it('clears stale invite auth and claim messages when the collaborator invite form changes', () => {
    const source = read('src/pages/AcceptCollaboratorInvite.tsx');

    expect(source).toContain('const clearTransientAuthState = () => {');
    expect(source).toContain('setAuthError(null);');
    expect(source).toContain('setClaimError(null);');
    expect(source).toContain('setClaimMessage(null);');
    expect(source).toContain('const updateSignInForm = (patch: Partial<typeof initialSignInForm>) => {');
    expect(source).toContain('const updateSignUpForm = (patch: Partial<typeof initialSignUpForm>) => {');
    expect(source).toContain("onChange={(e) => updateSignInForm({ email: e.target.value })}");
    expect(source).toContain("onChange={(e) => updateSignInForm({ password: e.target.value })}");
    expect(source).toContain("onChange={(e) => updateSignUpForm({ fullName: e.target.value })}");
    expect(source).toContain("onChange={(e) => updateSignUpForm({ email: e.target.value })}");
    expect(source).toContain("onChange={(e) => updateSignUpForm({ password: e.target.value })}");
    expect(source).toContain("onChange={(e) => updateSignUpForm({ confirmPassword: e.target.value })}");
  });

  it('clears stale quick-start errors while guests continue typing or answering follow-ups', () => {
    const source = read('src/pages/onboarding/QuickStart.tsx');

    expect(source).toContain('const handleQuestionInputChange = (value: string) => {');
    expect(source).toContain("setError('');");
    expect(source).toContain('const handleFollowUpInputChange = (questionId: string, value: string) => {');
    expect(source).toContain("onChange={(event) => handleQuestionInputChange(event.target.value)}");
    expect(source).toContain("onChange={(event) => handleFollowUpInputChange(question.id, event.target.value)}");
  });

  it('clears stale wedding-status validation errors when the couple updates status details', () => {
    const source = read('src/pages/onboarding/WeddingStatus.tsx');

    expect(source).toContain('const clearStatusError = () => setError(\'\');');
    expect(source).toContain('const updateSelectedStatus = (status: PlanningStatus) => {');
    expect(source).toContain('const updateDestinationWedding = (checked: boolean) => {');
    expect(source).toContain('const updateStatusDetails = (patch: Partial<StatusDetails>) => {');
    expect(source).toContain('onChange={(e) => updateDestinationWedding(e.target.checked)}');
    expect(source).toContain('onChange={(e) => updateSelectedStatus(option.id)}');
    expect(source).toContain('onChange={(e) => updateStatusDetails({');
    expect(source).toContain('onChange={(address, coordinates) => {');
    expect(source).toContain('updateStatusDetails({');
  });
});
