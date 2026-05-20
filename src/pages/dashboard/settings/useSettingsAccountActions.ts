import { useCallback, useRef } from 'react';

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
  const accountSaveRequestIdRef = useRef(0);
  const passwordUpdateRequestIdRef = useRef(0);

  const handleSaveAccount = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    if (!weddingSiteId) return;
    const requestId = ++accountSaveRequestIdRef.current;
    const isCurrentAccountSave = () => requestId === accountSaveRequestIdRef.current;
    setAccountSaving(true);
    setAccountError(null);
    setAccountSuccess(null);
    try {
      const { name1, name2 } = splitCoupleNames(coupleNames);
      await updateSettingsSite(weddingSiteId, { couple_name_1: name1, couple_name_2: name2 });
      if (!isCurrentAccountSave()) return;
      setAccountSuccess('Account information saved.');
    } catch (err) {
      if (!isCurrentAccountSave()) return;
      setAccountError(safeSettingsError(err, 'Couldn’t save changes.'));
    } finally {
      if (isCurrentAccountSave()) {
        setAccountSaving(false);
      }
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

    const requestId = ++passwordUpdateRequestIdRef.current;
    const isCurrentPasswordUpdate = () => requestId === passwordUpdateRequestIdRef.current;
    setPasswordSaving(true);
    try {
      const authUser = await requireSettingsAuthenticatedUser();
      if (!isCurrentPasswordUpdate()) return;
      await verifySettingsCurrentPassword(authUser.email || '', currentPassword);
      if (!isCurrentPasswordUpdate()) return;
      await updateSettingsAccountPassword(newPassword);
      if (!isCurrentPasswordUpdate()) return;
      logSettingsAction('account_password_changed', 'Account password was changed.');
      setPasswordSuccess('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      if (!isCurrentPasswordUpdate()) return;
      setPasswordError(safeSettingsError(err, 'Couldn’t update password.'));
    } finally {
      if (isCurrentPasswordUpdate()) {
        setPasswordSaving(false);
      }
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
