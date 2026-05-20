import { useEffect, useRef } from 'react';
import type React from 'react';
import { copyTextOrDownload } from '../../../lib/copyText';
import {
  generateSettingsSecureToken,
  hashSettingsSitePassword,
  createSettingsCollaboratorInvite,
  findSettingsSiteBySlug,
  revokeSettingsCollaboratorInvite,
  translateSettingsSiteContent,
  updateSettingsSite,
  type SettingsCollaboratorInviteRow,
  type SettingsSiteUpdates,
} from './settingsSiteData';
import {
  getPlannerPermissionPreset,
  writePlannerInvite,
  type PlannerAccessRole,
  type PlannerInviteRecord,
  type PlannerPermissionKey,
} from '../../../lib/plannerAccess';
import {
  buildWeddingIdentityManifestText,
  renderWeddingIdentityPrintSvg,
  buildWeddingIdentityStoryGraphic,
  buildWeddingIdentityStyleKit,
  renderWeddingIdentityPrintHtml,
  type WeddingIdentityExportKit,
  type WeddingIdentityPrintAsset,
} from '../../../lib/weddingIdentityExports';
import { downloadBlob, rasterizeSvgToPdfBlob, rasterizeSvgToPngBlob } from '../../../lib/svgRaster';
import {
  SETTINGS_SITE_MISSING_COPY,
  buildPrivacySettingsUpdates,
  getSiteLanguageLabel,
  normalizeSettingsSlug,
  safeSettingsError,
  type SettingsPrivacyMode,
} from './settingsDashboardUtils';
import type {
  AnalyticsRetentionDays,
  SiteLanguageCode,
  TranslationLanguageCode,
} from './settingsDashboardTypes';

type VisibilityDraftGuard = {
  markSaved: () => void;
};

type ToastFn = (message: string, tone?: 'success' | 'error') => void;

type LogSettingsAction = (
  type: string,
  summary: string,
  metadata?: Record<string, unknown>,
  targetId?: string | null,
  targetLabel?: string | null,
  siteIdOverride?: string | null,
) => void;

type DownloadTextFile = (filename: string, content: string, type?: string) => void;

type SetState<T> = React.Dispatch<React.SetStateAction<T>>;
type CopyActionResult = 'copied' | 'downloaded';

export type UseSettingsSiteAccessActionsArgs = {
  userId: string | null | undefined;
  siteSlug: string;
  weddingSiteId: string | null;
  plannerInvite: PlannerInviteRecord | null;
  plannerInviteName: string;
  plannerInviteEmail: string;
  plannerInviteRole: Exclude<PlannerAccessRole, 'owner'>;
  plannerInvitePermissions: PlannerPermissionKey[];
  collaboratorInvites: SettingsCollaboratorInviteRow[];
  isPublished: boolean;
  privacyMode: SettingsPrivacyMode;
  hideFromSearch: boolean;
  allowedLanguages: SiteLanguageCode[];
  defaultLanguage: SiteLanguageCode;
  analyticsEnabled: boolean;
  analyticsRetentionDays: AnalyticsRetentionDays;
  analyticsGuestNotice: string;
  settingsWeddingData: Record<string, unknown> | null;
  sitePassword: string;
  guestAccessToken: string | null;
  musicPlaylistUrl: string;
  weddingIdentityExportKit: WeddingIdentityExportKit;
  weddingIdentityPrintAssets: WeddingIdentityPrintAsset[];
  weddingIdentityStoryGraphic: ReturnType<typeof buildWeddingIdentityStoryGraphic>;
  weddingIdentityStyleKit: ReturnType<typeof buildWeddingIdentityStyleKit>;
  resolveSettingsSiteId: () => Promise<string | null>;
  loadCollaboratorInvites: (siteId: string) => Promise<void>;
  loadTranslationStatuses: (siteId: string) => Promise<void>;
  logSettingsAction: LogSettingsAction;
  toast: ToastFn;
  visibilityDraftGuard: VisibilityDraftGuard;
  downloadTextFile: DownloadTextFile;
  setPlannerInvite: SetState<PlannerInviteRecord | null>;
  setPlannerInviteName: SetState<string>;
  setPlannerInviteEmail: SetState<string>;
  setPlannerInviteRole: SetState<Exclude<PlannerAccessRole, 'owner'>>;
  setPlannerInvitePermissions: SetState<PlannerPermissionKey[]>;
  setPlannerInviteError: SetState<string | null>;
  setPlannerInviteSuccess: SetState<string | null>;
  setCreatingCollaboratorInvite: SetState<boolean>;
  setRevokingCollaboratorInviteId: SetState<string | null>;
  setWeddingSiteId: SetState<string | null>;
  setSiteSlug: SetState<string>;
  setSlugSaving: SetState<boolean>;
  setSlugError: SetState<string | null>;
  setSlugSuccess: SetState<string | null>;
  setVisibilitySaving: SetState<boolean>;
  setVisibilityError: SetState<string | null>;
  setVisibilitySuccess: SetState<string | null>;
  setGuestAccessToken: SetState<string | null>;
  setSitePassword: SetState<string>;
  setPrivacyCopyNotice: SetState<'copied' | 'downloaded' | null>;
  setTranslatingLanguage: SetState<TranslationLanguageCode | null>;
  setAllowedLanguages: SetState<SiteLanguageCode[]>;
  setDefaultLanguage: SetState<SiteLanguageCode>;
  setSettingsWeddingData: SetState<Record<string, unknown> | null>;
};

export function useSettingsSiteAccessActions({
  userId,
  siteSlug,
  weddingSiteId,
  plannerInvite,
  plannerInviteName,
  plannerInviteEmail,
  plannerInviteRole,
  plannerInvitePermissions,
  collaboratorInvites,
  isPublished,
  privacyMode,
  hideFromSearch,
  allowedLanguages,
  defaultLanguage,
  analyticsEnabled,
  analyticsRetentionDays,
  analyticsGuestNotice,
  settingsWeddingData,
  sitePassword,
  guestAccessToken,
  musicPlaylistUrl,
  weddingIdentityExportKit,
  weddingIdentityPrintAssets,
  weddingIdentityStoryGraphic,
  weddingIdentityStyleKit,
  resolveSettingsSiteId,
  loadCollaboratorInvites,
  loadTranslationStatuses,
  logSettingsAction,
  toast,
  visibilityDraftGuard,
  downloadTextFile,
  setPlannerInvite,
  setPlannerInviteName,
  setPlannerInviteEmail,
  setPlannerInviteRole,
  setPlannerInvitePermissions,
  setCreatingCollaboratorInvite,
  setDefaultLanguage,
  setGuestAccessToken,
  setPlannerInviteError,
  setPlannerInviteSuccess,
  setPrivacyCopyNotice,
  setRevokingCollaboratorInviteId,
  setSitePassword,
  setSiteSlug,
  setSlugError,
  setSlugSaving,
  setSlugSuccess,
  setTranslatingLanguage,
  setAllowedLanguages,
  setSettingsWeddingData,
  setVisibilityError,
  setVisibilitySaving,
  setVisibilitySuccess,
  setWeddingSiteId,
}: UseSettingsSiteAccessActionsArgs) {
  const privacyCopyNoticeTimeoutRef = useRef<number | null>(null);
  const collaboratorInviteActionRequestIdRef = useRef(0);
  const collaboratorInviteCopyRequestIdRef = useRef(0);
  const guestAccessCopyRequestIdRef = useRef(0);
  const identityCopyRequestIdRef = useRef(0);
  const identityDownloadRequestIdRef = useRef(0);
  const slugSaveRequestIdRef = useRef(0);
  const privacySaveRequestIdRef = useRef(0);
  const defaultLanguageSaveRequestIdRef = useRef(0);
  const translationRequestIdRef = useRef(0);
  const musicPlaylistSaveRequestIdRef = useRef(0);
  const guestTokenRegenerationRequestIdRef = useRef(0);
  const actionContextRef = useRef({ userId, weddingSiteId });
  actionContextRef.current = { userId, weddingSiteId };

  useEffect(() => () => {
    if (privacyCopyNoticeTimeoutRef.current) window.clearTimeout(privacyCopyNoticeTimeoutRef.current);
  }, []);

  const handleSavePlannerInvite = () => {
    setPlannerInviteError(null);
    setPlannerInviteSuccess(null);
    const name = plannerInviteName.trim();
    const email = plannerInviteEmail.trim().toLowerCase();

    if (!name) {
      setPlannerInviteError("Add your planner's name.");
      return;
    }

    if (!email || !email.includes('@')) {
      setPlannerInviteError('Add a valid planner email.');
      return;
    }

    const invite: PlannerInviteRecord = {
      name,
      email,
      role: plannerInviteRole,
      status: plannerInvite?.status === 'active' ? 'active' : 'pending',
      invitedAtISO: plannerInvite?.invitedAtISO ?? new Date().toISOString(),
      permissions: plannerInvitePermissions,
    };

    try {
      writePlannerInvite(siteSlug || userId || null, invite);
      setPlannerInvite(invite);
      setPlannerInviteSuccess(plannerInvite ? 'Planner access updated.' : 'Planner invite saved.');
    } catch (err) {
      setPlannerInviteError(safeSettingsError(err, 'Couldn’t save planner invite.'));
    }
  };

  const handleCreateCollaboratorInvite = async () => {
    const requestId = ++collaboratorInviteActionRequestIdRef.current;
    const actionUserId = userId;
    const actionSiteId = weddingSiteId;
    const isCurrentCollaboratorInviteAction = (targetSiteId?: string | null) =>
      requestId === collaboratorInviteActionRequestIdRef.current &&
      actionContextRef.current.userId === actionUserId &&
      (!actionSiteId || actionContextRef.current.weddingSiteId === actionSiteId) &&
      (!targetSiteId || !actionContextRef.current.weddingSiteId || actionContextRef.current.weddingSiteId === targetSiteId);
    setPlannerInviteError(null);
    setPlannerInviteSuccess(null);
    const name = plannerInviteName.trim();
    const email = plannerInviteEmail.trim().toLowerCase();

    const targetSiteId = await resolveSettingsSiteId();
    if (!isCurrentCollaboratorInviteAction(targetSiteId)) return;
    if (!targetSiteId) {
      setPlannerInviteError(SETTINGS_SITE_MISSING_COPY);
      return;
    }
    if (!userId) {
      setPlannerInviteError('Sign in again before creating an invite.');
      return;
    }
    if (!name) {
      setPlannerInviteError("Add your planner's name.");
      return;
    }
    if (!email || !email.includes('@')) {
      setPlannerInviteError('Add a valid planner email.');
      return;
    }

    setCreatingCollaboratorInvite(true);
    try {
      const inviteToken = crypto.randomUUID();
      const data = await createSettingsCollaboratorInvite({
        weddingSiteId: targetSiteId,
        inviteEmail: email,
        inviteName: name,
        role: plannerInviteRole,
        inviteToken,
        invitedBy: userId,
        permissions: plannerInvitePermissions,
      });

      await loadCollaboratorInvites(targetSiteId);
      if (!isCurrentCollaboratorInviteAction(targetSiteId)) return;
      logSettingsAction(
        'collaborator_invite_created',
        'Collaborator invite was created.',
        {
          role: plannerInviteRole,
          permissionCount: plannerInvitePermissions.length,
          status: 'pending',
        },
        data.id as string,
        name,
        targetSiteId,
      );
      setPlannerInviteSuccess('Collaborator invite link created. Copy it and send it to the invited teammate.');
    } catch (err) {
      if (!isCurrentCollaboratorInviteAction(targetSiteId)) return;
      setPlannerInviteError(safeSettingsError(err, 'Couldn’t create helper invite.'));
    } finally {
      if (isCurrentCollaboratorInviteAction(targetSiteId)) {
        setCreatingCollaboratorInvite(false);
      }
    }
  };

  const handleRevokeCollaboratorInvite = async (inviteId: string) => {
    const requestId = ++collaboratorInviteActionRequestIdRef.current;
    const actionSiteId = weddingSiteId;
    const isCurrentCollaboratorInviteAction = () =>
      requestId === collaboratorInviteActionRequestIdRef.current &&
      actionContextRef.current.userId === userId &&
      actionContextRef.current.weddingSiteId === actionSiteId;
    setPlannerInviteError(null);
    setPlannerInviteSuccess(null);
    setRevokingCollaboratorInviteId(inviteId);
    try {
      const invite = collaboratorInvites.find((row) => row.id === inviteId);
      await revokeSettingsCollaboratorInvite(inviteId);
      if (!isCurrentCollaboratorInviteAction()) return;

      if (actionSiteId) {
        await loadCollaboratorInvites(actionSiteId);
      }
      if (!isCurrentCollaboratorInviteAction()) return;
      logSettingsAction(
        'collaborator_invite_revoked',
        'Collaborator invite was revoked.',
        {
          role: invite?.role ?? null,
          previousStatus: invite?.status ?? null,
        },
        inviteId,
        invite?.invite_name || invite?.invite_email || 'Collaborator invite',
      );
      setPlannerInviteSuccess('Collaborator invite revoked.');
    } catch (err) {
      if (!isCurrentCollaboratorInviteAction()) return;
      setPlannerInviteError(safeSettingsError(err, 'Couldn’t revoke helper invite.'));
    } finally {
      if (isCurrentCollaboratorInviteAction()) {
        setRevokingCollaboratorInviteId(null);
      }
    }
  };

  const handleCopyCollaboratorInviteLink = async (inviteToken: string | undefined): Promise<CopyActionResult | null> => {
    const requestId = ++collaboratorInviteCopyRequestIdRef.current;
    const actionUserId = userId;
    const actionSiteId = weddingSiteId;
    const isCurrentCollaboratorInviteCopy = () =>
      requestId === collaboratorInviteCopyRequestIdRef.current &&
      actionContextRef.current.userId === actionUserId &&
      (!actionSiteId || actionContextRef.current.weddingSiteId === actionSiteId);
    setPlannerInviteSuccess(null);
    setPlannerInviteError(null);
    if (!inviteToken) {
      setPlannerInviteError('This invite link is not ready yet.');
      return null;
    }

    const inviteUrl = `${window.location.origin}/accept-collaborator-invite?token=${inviteToken}`;
    try {
      const result = await copyTextOrDownload(inviteUrl, 'dayof-collaborator-invite-link.txt');
      if (!isCurrentCollaboratorInviteCopy()) return null;
      if (result === 'copied') {
        setPlannerInviteSuccess('Invite link copied.');
      } else {
        setPlannerInviteSuccess('Clipboard was blocked, so the invite link downloaded.');
      }
      return result;
    } catch (err) {
      if (!isCurrentCollaboratorInviteCopy()) return null;
      setPlannerInviteError(safeSettingsError(err, 'Couldn’t copy the collaborator invite link right now.'));
      return null;
    }
  };

  const handleResendCollaboratorInvite = async (inviteToken: string | undefined): Promise<CopyActionResult | null> => {
    const result = await handleCopyCollaboratorInviteLink(inviteToken);
    if (result === 'copied') {
      setPlannerInviteSuccess('Invite link copied for sending.');
    } else if (result === 'downloaded') {
      setPlannerInviteSuccess('Clipboard was blocked, so the invite link downloaded for sending.');
    }
    return result;
  };

  const handleRemovePlannerInvite = () => {
    try {
      writePlannerInvite(siteSlug || userId || null, null);
      setPlannerInvite(null);
      setPlannerInviteName('');
      setPlannerInviteEmail('');
      setPlannerInviteRole('planner');
      setPlannerInvitePermissions(getPlannerPermissionPreset('planner'));
      setPlannerInviteError(null);
      setPlannerInviteSuccess('Planner invite removed.');
    } catch (err) {
      setPlannerInviteError(safeSettingsError(err, 'Couldn’t remove planner invite.'));
    }
  };

  const handleUpdateSlug = async (e: React.FormEvent) => {
    e.preventDefault();
    const requestId = ++slugSaveRequestIdRef.current;
    const actionUserId = userId;
    const actionSiteId = weddingSiteId;
    const isCurrentSlugSave = () =>
      requestId === slugSaveRequestIdRef.current &&
      actionContextRef.current.userId === actionUserId &&
      (!actionSiteId || actionContextRef.current.weddingSiteId === actionSiteId);
    setSlugSaving(true);
    setSlugError(null);
    setSlugSuccess(null);
    try {
      const cleaned = normalizeSettingsSlug(siteSlug);
      if (!isCurrentSlugSave()) return;
      if (!cleaned) {
        setSlugError('URL cannot be empty.');
        return;
      }

      let targetSiteId = weddingSiteId;
      if (!targetSiteId && userId) {
        targetSiteId = await resolveSettingsSiteId();
        if (!isCurrentSlugSave()) return;
        if (targetSiteId) setWeddingSiteId(targetSiteId);
      }
      if (!targetSiteId) {
        setSlugError(SETTINGS_SITE_MISSING_COPY);
        return;
      }

      const existing = await findSettingsSiteBySlug(cleaned);
      if (!isCurrentSlugSave()) return;
      if (existing && existing.id !== targetSiteId) {
        setSlugError('That URL is already taken. Please choose another.');
        return;
      }
      await updateSettingsSite(targetSiteId, { site_slug: cleaned });
      if (!isCurrentSlugSave()) return;
      setSiteSlug(cleaned);
      logSettingsAction('site_slug_updated', 'Public site URL slug was updated.', { slug: cleaned }, targetSiteId, cleaned, targetSiteId);
      setSlugSuccess(`Site URL updated to /${cleaned}`);
    } catch (err) {
      if (!isCurrentSlugSave()) return;
      setSlugError(safeSettingsError(err, 'Couldn’t update URL.'));
    } finally {
      if (isCurrentSlugSave()) {
        setSlugSaving(false);
      }
    }
  };

  const handleSavePrivacy = async (e: React.FormEvent) => {
    e.preventDefault();
    const requestId = ++privacySaveRequestIdRef.current;
    const actionUserId = userId;
    const actionSiteId = weddingSiteId;
    const isCurrentPrivacySave = () =>
      requestId === privacySaveRequestIdRef.current &&
      actionContextRef.current.userId === actionUserId &&
      (!actionSiteId || actionContextRef.current.weddingSiteId === actionSiteId);
    setVisibilitySaving(true);
    setVisibilityError(null);
    setVisibilitySuccess(null);
    let nextGuestAccessToken: string | null = null;
    try {
      const targetSiteId = await resolveSettingsSiteId();
      if (!isCurrentPrivacySave()) return;
      if (!targetSiteId) {
        setVisibilityError(SETTINGS_SITE_MISSING_COPY);
        return;
      }

      const sitePasswordHash = privacyMode === 'password_protected' && sitePassword
        ? await hashSettingsSitePassword(sitePassword)
        : null;
      if (!isCurrentPrivacySave()) return;

      if (privacyMode === 'invite_only' && !guestAccessToken) {
        nextGuestAccessToken = await generateSettingsSecureToken();
        if (!isCurrentPrivacySave()) return;
      }

      const updates: SettingsSiteUpdates = buildPrivacySettingsUpdates({
        privacyMode,
        hideFromSearch,
        allowedLanguages,
        defaultLanguage,
        analyticsEnabled,
        analyticsRetentionDays,
        analyticsGuestNotice,
        weddingData: settingsWeddingData,
        sitePasswordHash,
        guestAccessToken: nextGuestAccessToken,
      });

      await updateSettingsSite(targetSiteId, updates);
      if (!isCurrentPrivacySave()) return;
      if (nextGuestAccessToken) setGuestAccessToken(nextGuestAccessToken);
      setSettingsWeddingData((current) => ({
        ...((current && typeof current === 'object') ? current : {}),
        ...((updates.wedding_data as Record<string, unknown> | undefined) ?? {}),
      }));
      visibilityDraftGuard.markSaved();
      setSitePassword('');
      logSettingsAction(
        'site_privacy_saved',
        'Site privacy and access settings were updated.',
        {
          privacyMode,
          hideFromSearch,
          allowedLanguages,
          defaultLanguage,
          analyticsEnabled,
          analyticsRetentionDays,
          analyticsGuestNoticeSet: analyticsGuestNotice.trim().length > 0,
          passwordChanged: privacyMode === 'password_protected' && Boolean(sitePassword),
          guestAccessTokenCreated: Boolean(nextGuestAccessToken),
        },
        targetSiteId,
        'Site privacy',
        targetSiteId,
      );
      setVisibilitySuccess('Privacy settings saved.');
    } catch (err) {
      if (!isCurrentPrivacySave()) return;
      setVisibilityError(safeSettingsError(err, 'Couldn’t save sharing settings.'));
    } finally {
      if (isCurrentPrivacySave()) {
        setVisibilitySaving(false);
      }
    }
  };

  const handleRegenerateToken = async () => {
    const requestId = ++guestTokenRegenerationRequestIdRef.current;
    guestAccessCopyRequestIdRef.current += 1;
    const actionUserId = userId;
    const actionSiteId = weddingSiteId;
    const isCurrentGuestTokenRegeneration = () =>
      requestId === guestTokenRegenerationRequestIdRef.current &&
      actionContextRef.current.userId === actionUserId &&
      (!actionSiteId || actionContextRef.current.weddingSiteId === actionSiteId);
    try {
      const targetSiteId = await resolveSettingsSiteId();
      if (!isCurrentGuestTokenRegeneration()) return;
      if (!targetSiteId) {
        toast(SETTINGS_SITE_MISSING_COPY, 'error');
        return;
      }

      const data = await generateSettingsSecureToken();
      if (!isCurrentGuestTokenRegeneration()) return;
      await updateSettingsSite(targetSiteId, { guest_access_token: data });
      if (!isCurrentGuestTokenRegeneration()) return;
      setGuestAccessToken(data);
      logSettingsAction(
        'guest_access_token_regenerated',
        'Invite-only guest access link was regenerated.',
        { privacyMode },
        targetSiteId,
        'Guest access link',
        targetSiteId,
      );
      toast('Guest access link refreshed.', 'success');
    } catch (err) {
      if (!isCurrentGuestTokenRegeneration()) return;
      toast(safeSettingsError(err, 'Couldn’t refresh guest access link.'), 'error');
    }
  };

  const copyInviteLink = async () => {
    if (!guestAccessToken || !siteSlug) return;
    const requestId = ++guestAccessCopyRequestIdRef.current;
    const actionUserId = userId;
    const actionSiteId = weddingSiteId;
    const isCurrentGuestAccessCopy = () =>
      requestId === guestAccessCopyRequestIdRef.current &&
      actionContextRef.current.userId === actionUserId &&
      (!actionSiteId || actionContextRef.current.weddingSiteId === actionSiteId);
    const url = `${window.location.origin}/site/${siteSlug}?token=${guestAccessToken}`;
    setPrivacyCopyNotice(null);
    try {
      const result = await copyTextOrDownload(url, 'dayof-guest-access-link.txt');
      if (!isCurrentGuestAccessCopy()) return;
      if (result === 'copied') {
        setPrivacyCopyNotice('copied');
      } else {
        setPrivacyCopyNotice('downloaded');
        toast('Clipboard was blocked, so the guest access link downloaded.', 'success');
      }
      if (privacyCopyNoticeTimeoutRef.current) window.clearTimeout(privacyCopyNoticeTimeoutRef.current);
      privacyCopyNoticeTimeoutRef.current = window.setTimeout(() => setPrivacyCopyNotice((current) => (current === result ? null : current)), 2000);
    } catch (err) {
      if (!isCurrentGuestAccessCopy()) return;
      toast(safeSettingsError(err, 'Couldn’t copy the guest access link right now.'), 'error');
    }
  };

  const copyIdentityManifest = async () => {
    const requestId = ++identityCopyRequestIdRef.current;
    const actionUserId = userId;
    const actionSiteId = weddingSiteId;
    const isCurrentIdentityCopy = () =>
      requestId === identityCopyRequestIdRef.current &&
      actionContextRef.current.userId === actionUserId &&
      (!actionSiteId || actionContextRef.current.weddingSiteId === actionSiteId);
    try {
      const manifest = buildWeddingIdentityManifestText(weddingIdentityExportKit);
      const result = await copyTextOrDownload(manifest, 'dayof-wedding-identity-export-manifest.txt');
      if (!isCurrentIdentityCopy()) return;
      toast(result === 'copied' ? 'Wedding identity manifest copied.' : 'Wedding identity manifest downloaded.', 'success');
    } catch (err) {
      if (!isCurrentIdentityCopy()) return;
      toast(safeSettingsError(err, 'Couldn’t copy the wedding identity manifest right now.'), 'error');
    }
  };

  const copyIdentityStyleKit = async () => {
    const requestId = ++identityCopyRequestIdRef.current;
    const actionUserId = userId;
    const actionSiteId = weddingSiteId;
    const isCurrentIdentityCopy = () =>
      requestId === identityCopyRequestIdRef.current &&
      actionContextRef.current.userId === actionUserId &&
      (!actionSiteId || actionContextRef.current.weddingSiteId === actionSiteId);
    try {
      const result = await copyTextOrDownload(weddingIdentityStyleKit.text, weddingIdentityStyleKit.filename);
      if (!isCurrentIdentityCopy()) return;
      toast(result === 'copied' ? 'Wedding identity style kit copied.' : 'Wedding identity style kit downloaded.', 'success');
    } catch (err) {
      if (!isCurrentIdentityCopy()) return;
      toast(safeSettingsError(err, 'Couldn’t copy the wedding identity style kit right now.'), 'error');
    }
  };

  const downloadIdentityPrintPack = async () => {
    const requestId = ++identityDownloadRequestIdRef.current;
    const actionUserId = userId;
    const actionSiteId = weddingSiteId;
    const isCurrentIdentityDownload = () =>
      requestId === identityDownloadRequestIdRef.current &&
      actionContextRef.current.userId === actionUserId &&
      (!actionSiteId || actionContextRef.current.weddingSiteId === actionSiteId);
    if (!isPublished) {
      toast('Publish the site before saving the identity print pack.', 'error');
      return;
    }

    if (weddingIdentityPrintAssets.length === 0) {
      toast('Set a public site URL before saving the identity print pack.', 'error');
      return;
    }

    const printSheet = renderWeddingIdentityPrintSvg(weddingIdentityPrintAssets);
    if (!printSheet) {
      toast('Set a public site URL before saving the identity print pack.', 'error');
      return;
    }

    try {
      downloadTextFile(
        'dayof-wedding-identity-print-pack.html',
        renderWeddingIdentityPrintHtml(weddingIdentityPrintAssets),
        'text/html;charset=utf-8',
      );
      downloadTextFile(
        printSheet.filename,
        printSheet.svg,
        'image/svg+xml;charset=utf-8',
      );
      downloadBlob(
        'dayof-wedding-identity-print-pack.png',
        await rasterizeSvgToPngBlob(printSheet.svg),
      );
      if (!isCurrentIdentityDownload()) return;
      downloadBlob(
        'dayof-wedding-identity-print-pack.pdf',
        await rasterizeSvgToPdfBlob(printSheet.svg),
      );
      if (!isCurrentIdentityDownload()) return;
      toast('Wedding identity print pack saved as HTML, SVG, PNG, and PDF.', 'success');
    } catch (err) {
      if (!isCurrentIdentityDownload()) return;
      toast(safeSettingsError(err, 'Couldn’t save the identity print pack.'), 'error');
    }
  };

  const downloadIdentityStoryGraphic = async () => {
    const requestId = ++identityDownloadRequestIdRef.current;
    const actionUserId = userId;
    const actionSiteId = weddingSiteId;
    const isCurrentIdentityDownload = () =>
      requestId === identityDownloadRequestIdRef.current &&
      actionContextRef.current.userId === actionUserId &&
      (!actionSiteId || actionContextRef.current.weddingSiteId === actionSiteId);
    if (!isPublished) {
      toast('Publish the site before saving the story graphic.', 'error');
      return;
    }

    if (!weddingIdentityStoryGraphic) {
      toast('Set a public site URL before saving the story graphic.', 'error');
      return;
    }

    try {
      downloadTextFile(
        weddingIdentityStoryGraphic.filename,
        weddingIdentityStoryGraphic.svg,
        'image/svg+xml;charset=utf-8',
      );
      downloadBlob(
        'dayof-wedding-story-graphic.png',
        await rasterizeSvgToPngBlob(weddingIdentityStoryGraphic.svg),
      );
      if (!isCurrentIdentityDownload()) return;
      toast('Wedding story graphic saved as SVG and PNG.', 'success');
    } catch (err) {
      if (!isCurrentIdentityDownload()) return;
      toast(safeSettingsError(err, 'Couldn’t save the story graphic.'), 'error');
    }
  };

  const togglePlannerPermission = (key: PlannerPermissionKey) => {
    setPlannerInvitePermissions((prev) => (
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    ));
  };

  const handleDefaultLanguageChange = async (next: SiteLanguageCode) => {
    const requestId = ++defaultLanguageSaveRequestIdRef.current;
    const actionUserId = userId;
    const actionSiteId = weddingSiteId;
    const isCurrentDefaultLanguageSave = () =>
      requestId === defaultLanguageSaveRequestIdRef.current &&
      actionContextRef.current.userId === actionUserId &&
      (!actionSiteId || actionContextRef.current.weddingSiteId === actionSiteId);
    const previous = defaultLanguage;
    setDefaultLanguage(next);
    setAllowedLanguages((current) => Array.from(new Set([next, ...current])));
    setVisibilityError(null);
    setVisibilitySuccess(null);
    try {
      const targetSiteId = await resolveSettingsSiteId();
      if (!isCurrentDefaultLanguageSave()) return;
      if (!targetSiteId) {
        setDefaultLanguage(previous);
        visibilityDraftGuard.markSaved();
        setVisibilityError(SETTINGS_SITE_MISSING_COPY);
        return;
      }

      await updateSettingsSite(targetSiteId, { default_language: next });
      if (!isCurrentDefaultLanguageSave()) return;
      visibilityDraftGuard.markSaved();
      logSettingsAction(
        'default_language_updated',
        'Default public-site language was updated.',
        { language: next },
        targetSiteId,
        getSiteLanguageLabel(next),
        targetSiteId,
      );
      setVisibilitySuccess(`Default language set to ${getSiteLanguageLabel(next)}.`);
    } catch (err) {
      if (!isCurrentDefaultLanguageSave()) return;
      setDefaultLanguage(previous);
      setAllowedLanguages((current) => current.includes(previous) ? current : [previous, ...current]);
      visibilityDraftGuard.markSaved();
      setVisibilityError(safeSettingsError(err, 'Couldn’t save default language.'));
    }
  };

  const handleAllowedLanguagesChange = (languages: SiteLanguageCode[]) => {
    setAllowedLanguages(Array.from(new Set([defaultLanguage, ...languages])));
    setVisibilityError(null);
    setVisibilitySuccess(null);
  };

  const handleAutoTranslateLanguage = async (language: TranslationLanguageCode) => {
    const requestId = ++translationRequestIdRef.current;
    const actionUserId = userId;
    const actionSiteId = weddingSiteId;
    const isCurrentTranslation = () =>
      requestId === translationRequestIdRef.current &&
      actionContextRef.current.userId === actionUserId &&
      (!actionSiteId || actionContextRef.current.weddingSiteId === actionSiteId);
    setTranslatingLanguage(language);
    setVisibilityError(null);
    setVisibilitySuccess(null);
    try {
      const targetSiteId = await resolveSettingsSiteId();
      if (!isCurrentTranslation()) return;
      if (!targetSiteId) {
        setVisibilityError(SETTINGS_SITE_MISSING_COPY);
        return;
      }

      await translateSettingsSiteContent(targetSiteId, language);
      if (!isCurrentTranslation()) return;
      await loadTranslationStatuses(targetSiteId);
      if (!isCurrentTranslation()) return;
      logSettingsAction(
        'site_translation_generated',
        'Site translation was generated.',
        { language },
        targetSiteId,
        getSiteLanguageLabel(language),
        targetSiteId,
      );
      setVisibilitySuccess(`${getSiteLanguageLabel(language)} translation generated. Guests can switch languages on the public site.`);
    } catch (err) {
      if (!isCurrentTranslation()) return;
      setVisibilityError(safeSettingsError(err, 'Couldn’t prepare translation.'));
    } finally {
      if (isCurrentTranslation()) {
        setTranslatingLanguage(null);
      }
    }
  };

  const handleSaveMusicPlaylist = async () => {
    const requestId = ++musicPlaylistSaveRequestIdRef.current;
    const actionUserId = userId;
    const actionSiteId = weddingSiteId;
    const isCurrentMusicPlaylistSave = () =>
      requestId === musicPlaylistSaveRequestIdRef.current &&
      actionContextRef.current.userId === actionUserId &&
      (!actionSiteId || actionContextRef.current.weddingSiteId === actionSiteId);
    setVisibilityError(null);
    setVisibilitySuccess(null);
    try {
      const targetSiteId = await resolveSettingsSiteId();
      if (!isCurrentMusicPlaylistSave()) return;
      if (!targetSiteId) {
        setVisibilityError(SETTINGS_SITE_MISSING_COPY);
        return;
      }

      const value = musicPlaylistUrl.trim();
      await updateSettingsSite(targetSiteId, { music_playlist_url: value || null });
      if (!isCurrentMusicPlaylistSave()) return;
      logSettingsAction(
        'music_playlist_saved',
        'Song request playlist link was saved.',
        { hasPlaylist: Boolean(value) },
        targetSiteId,
        'Song request playlist',
        targetSiteId,
      );
      setVisibilitySuccess('Song request playlist link saved.');
    } catch (err) {
      if (!isCurrentMusicPlaylistSave()) return;
      setVisibilityError(safeSettingsError(err, 'Couldn’t save playlist link.'));
    }
  };

  return {
    copyIdentityManifest,
    copyIdentityStyleKit,
    copyInviteLink,
    downloadIdentityStoryGraphic,
    downloadIdentityPrintPack,
    handleAllowedLanguagesChange,
    handleAutoTranslateLanguage,
    handleCopyCollaboratorInviteLink,
    handleCreateCollaboratorInvite,
    handleDefaultLanguageChange,
    handleRegenerateToken,
    handleRemovePlannerInvite,
    handleResendCollaboratorInvite,
    handleRevokeCollaboratorInvite,
    handleSaveMusicPlaylist,
    handleSavePlannerInvite,
    handleSavePrivacy,
    handleUpdateSlug,
    togglePlannerPermission,
  };
}
