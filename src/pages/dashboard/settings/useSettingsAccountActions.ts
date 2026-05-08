import { useCallback } from 'react';

import { splitCoupleNames, safeSettingsError } from './settingsDashboardUtils';
import {
  requireSettingsAuthenticatedUser,
  updateSettingsAccountPassword,
  updateSettingsSite,
  verifySettingsCurrentPassword,
} from './settingsSiteData';

interface UseSettingsAccountActionsArgs {
  coupleNames: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  logSettingsAction: (type: string, summary: string, metadata?: Record<string, unknown>) => void;
  setAccountError: React.Dispatch<React.SetStateAction<string | null>>;
  setAccountSaving: React.Dispatch<React.SetStateAction<boolean>>;
  setAccountSuccess: React.Dispatch<React.SetStateAction<string | null>>;
  setConfirmPassword: React.Dispatch<React.SetStateAction<string>>;
  setCurrentPassword: React.Dispatch<React.SetStateAction<string>>;
  setNewPassword: React.Dispatch<React.SetStateAction<string>>;
  setPasswordError: React.Dispatch<React.SetStateAction<string | null>>;
  setPasswordSaving: React.Dispatch<React.SetStateAction<boolean>>;
  setPasswordSuccess: React.Dispatch<React.SetStateAction<string | null>>;
  weddingSiteId: string | null;
}

export function useSettingsAccountActions({
  coupleNames,
  currentPassword,
  newPassword,
  confirmPassword,
  logSettingsAction,
  setAccountError,
  setAccountSaving,
  setAccountSuccess,
  setConfirmPassword,
  setCurrentPassword,
  setNewPassword,
  setPasswordError,
  setPasswordSaving,
  setPasswordSuccess,
  weddingSiteId,
}: UseSettingsAccountActionsArgs) {
  const handleSaveAccount = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    if (!weddingSiteId) return;
    setAccountSaving(true);
    setAccountError(null);
    setAccountSuccess(null);
    try {
      const { name1, name2 } = splitCoupleNames(coupleNames);
      await updateSettingsSite(weddingSiteId, { couple_name_1: name1, couple_name_2: name2 });
      setAccountSuccess('Account information saved.');
    } catch (err) {
      setAccountError(safeSettingsError(err, 'Couldn’t save changes.'));
    } finally {
      setAccountSaving(false);
    }
  }, [coupleNames, setAccountError, setAccountSaving, setAccountSuccess, weddingSiteId]);

  const handleUpdatePassword = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);
    if (!currentPassword) {
      setPasswordError('Current password is required.');
      return;
    }
    if (!newPassword) {
      setPasswordError('New password is required.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters.');
      return;
    }

    setPasswordSaving(true);
    try {
      const authUser = await requireSettingsAuthenticatedUser();
      await verifySettingsCurrentPassword(authUser.email || '', currentPassword);
      await updateSettingsAccountPassword(newPassword);
      logSettingsAction('account_password_changed', 'Account password was changed.');
      setPasswordSuccess('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPasswordError(safeSettingsError(err, 'Couldn’t update password.'));
    } finally {
      setPasswordSaving(false);
    }
  }, [
    confirmPassword,
    currentPassword,
    logSettingsAction,
    newPassword,
    setConfirmPassword,
    setCurrentPassword,
    setNewPassword,
    setPasswordError,
    setPasswordSaving,
    setPasswordSuccess,
  ]);

  return {
    handleSaveAccount,
    handleUpdatePassword,
  };
}
