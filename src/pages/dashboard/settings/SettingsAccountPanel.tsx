import { Eye, EyeOff, Loader2, Lock, LogOut, Save } from 'lucide-react';
import type { FormEvent } from 'react';
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from '../../../components/ui';

type SettingsAccountPanelProps = {
  canEditWeddingAccountInfo: boolean;
  coupleNames: string;
  accountEmail: string;
  accountSaving: boolean;
  accountSuccess: string | null;
  accountError: string | null;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  showCurrentPw: boolean;
  showNewPw: boolean;
  showConfirmPw: boolean;
  passwordSaving: boolean;
  passwordSuccess: string | null;
  passwordError: string | null;
  onCoupleNamesChange: (value: string) => void;
  onCurrentPasswordChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onToggleCurrentPassword: () => void;
  onToggleNewPassword: () => void;
  onToggleConfirmPassword: () => void;
  onSaveAccount: (event: FormEvent) => void;
  onUpdatePassword: (event: FormEvent) => void;
  onLogout: () => void;
};

export function SettingsAccountPanel({
  canEditWeddingAccountInfo,
  coupleNames,
  accountEmail,
  accountSaving,
  accountSuccess,
  accountError,
  currentPassword,
  newPassword,
  confirmPassword,
  showCurrentPw,
  showNewPw,
  showConfirmPw,
  passwordSaving,
  passwordSuccess,
  passwordError,
  onCoupleNamesChange,
  onCurrentPasswordChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onToggleCurrentPassword,
  onToggleNewPassword,
  onToggleConfirmPassword,
  onSaveAccount,
  onUpdatePassword,
  onLogout,
}: SettingsAccountPanelProps) {
  return (
    <>
      <Card variant="bordered" padding="lg" className="rounded-[20px] shadow-none">
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Update your account details</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSaveAccount} className="space-y-4">
            {accountSuccess && (
              <div className="rounded-xl border border-success/20 bg-success-light p-3 text-sm text-success">{accountSuccess}</div>
            )}
            {accountError && (
              <div className="rounded-xl border border-border-subtle bg-surface-subtle p-3 text-sm text-text-secondary">{accountError}</div>
            )}
            <Input
              label="Partner names"
              value={coupleNames}
              onChange={(e) => onCoupleNamesChange(e.target.value)}
              disabled={!canEditWeddingAccountInfo}
              placeholder="e.g. Alex & Jordan"
              helperText="Separate names with &"
            />
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">Email</label>
              <p className="rounded-xl border border-border bg-surface-subtle px-3 py-2 text-sm text-text-secondary">{accountEmail}</p>
              <p className="text-xs text-text-tertiary mt-1">Contact support to change your email address.</p>
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="primary" size="md" type="submit" disabled={accountSaving || !canEditWeddingAccountInfo}>
                {accountSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                Save Changes
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card variant="bordered" padding="lg" className="rounded-[20px] shadow-none">
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>Change your password</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onUpdatePassword} className="space-y-4">
            {passwordSuccess && (
              <div className="rounded-xl border border-success/20 bg-success-light p-3 text-sm text-success">{passwordSuccess}</div>
            )}
            {passwordError && (
              <div className="rounded-xl border border-border-subtle bg-surface-subtle p-3 text-sm text-text-secondary">{passwordError}</div>
            )}
            <div className="relative">
              <Input
                label="Current password"
                type={showCurrentPw ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => onCurrentPasswordChange(e.target.value)}
              />
              <button
                type="button"
                onClick={onToggleCurrentPassword}
                className="absolute right-3 top-8 text-text-tertiary hover:text-text-primary"
                aria-label={showCurrentPw ? 'Hide password' : 'Show password'}
              >
                {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="relative">
              <Input
                label="New password"
                type={showNewPw ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => onNewPasswordChange(e.target.value)}
                helperText="Minimum 8 characters"
              />
              <button
                type="button"
                onClick={onToggleNewPassword}
                className="absolute right-3 top-8 text-text-tertiary hover:text-text-primary"
                aria-label={showNewPw ? 'Hide password' : 'Show password'}
              >
                {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="relative">
              <Input
                label="Confirm new password"
                type={showConfirmPw ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => onConfirmPasswordChange(e.target.value)}
              />
              <button
                type="button"
                onClick={onToggleConfirmPassword}
                className="absolute right-3 top-8 text-text-tertiary hover:text-text-primary"
                aria-label={showConfirmPw ? 'Hide password' : 'Show password'}
              >
                {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="primary" size="md" type="submit" disabled={passwordSaving}>
                {passwordSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
                Update Password
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card variant="bordered" padding="lg" className="rounded-[20px] shadow-none">
        <CardHeader>
          <CardTitle>Session</CardTitle>
          <CardDescription>Log out of your account on this device</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-end">
          <Button variant="outline" size="md" onClick={onLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Log out
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
