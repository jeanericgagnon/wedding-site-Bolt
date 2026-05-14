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
  privacyMode: SettingsPrivacyMode;
  hideFromSearch: boolean;
  allowedLanguages: SiteLanguageCode[];
  defaultLanguage: SiteLanguageCode;
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
  setPrivacyCopied: SetState<boolean>;
  setTranslatingLanguage: SetState<TranslationLanguageCode | null>;
  setAllowedLanguages: SetState<SiteLanguageCode[]>;
  setDefaultLanguage: SetState<SiteLanguageCode>;
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
  privacyMode,
  hideFromSearch,
  allowedLanguages,
  defaultLanguage,
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
  setPrivacyCopied,
  setRevokingCollaboratorInviteId,
  setSitePassword,
  setSiteSlug,
  setSlugError,
  setSlugSaving,
  setSlugSuccess,
  setTranslatingLanguage,
  setAllowedLanguages,
  setVisibilityError,
  setVisibilitySaving,
  setVisibilitySuccess,
  setWeddingSiteId,
}: UseSettingsSiteAccessActionsArgs) {
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
    setPlannerInviteError(null);
    setPlannerInviteSuccess(null);
    const name = plannerInviteName.trim();
    const email = plannerInviteEmail.trim().toLowerCase();

    const targetSiteId = await resolveSettingsSiteId();
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
      setPlannerInviteError(safeSettingsError(err, 'Couldn’t create helper invite.'));
    } finally {
      setCreatingCollaboratorInvite(false);
    }
  };

  const handleRevokeCollaboratorInvite = async (inviteId: string) => {
    setPlannerInviteError(null);
    setPlannerInviteSuccess(null);
    setRevokingCollaboratorInviteId(inviteId);
    try {
      const invite = collaboratorInvites.find((row) => row.id === inviteId);
      await revokeSettingsCollaboratorInvite(inviteId);

      if (weddingSiteId) {
        await loadCollaboratorInvites(weddingSiteId);
      }
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
      setPlannerInviteError(safeSettingsError(err, 'Couldn’t revoke helper invite.'));
    } finally {
      setRevokingCollaboratorInviteId(null);
    }
  };

  const handleCopyCollaboratorInviteLink = async (inviteToken: string | undefined) => {
    if (!inviteToken) {
      setPlannerInviteError('This invite link is not ready yet.');
      return;
    }

    const inviteUrl = `${window.location.origin}/accept-collaborator-invite?token=${inviteToken}`;
    const result = await copyTextOrDownload(inviteUrl, 'dayof-collaborator-invite-link.txt');
    if (result === 'copied') {
      setPlannerInviteSuccess('Invite link copied.');
    } else {
      setPlannerInviteSuccess('Clipboard was blocked, so the invite link downloaded.');
    }
    setPlannerInviteError(null);
  };

  const handleResendCollaboratorInvite = async (inviteToken: string | undefined) => {
    await handleCopyCollaboratorInviteLink(inviteToken);
    setPlannerInviteSuccess('Invite link copied for sending.');
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
    setSlugSaving(true);
    setSlugError(null);
    setSlugSuccess(null);
    try {
      const cleaned = normalizeSettingsSlug(siteSlug);
      if (!cleaned) {
        setSlugError('URL cannot be empty.');
        setSlugSaving(false);
        return;
      }

      let targetSiteId = weddingSiteId;
      if (!targetSiteId && userId) {
        targetSiteId = await resolveSettingsSiteId();
        if (targetSiteId) setWeddingSiteId(targetSiteId);
      }
      if (!targetSiteId) {
        setSlugError(SETTINGS_SITE_MISSING_COPY);
        setSlugSaving(false);
        return;
      }

      const existing = await findSettingsSiteBySlug(cleaned);
      if (existing && existing.id !== targetSiteId) {
        setSlugError('That URL is already taken. Please choose another.');
        setSlugSaving(false);
        return;
      }
      await updateSettingsSite(targetSiteId, { site_slug: cleaned });
      setSiteSlug(cleaned);
      logSettingsAction('site_slug_updated', 'Public site URL slug was updated.', { slug: cleaned }, targetSiteId, cleaned, targetSiteId);
      setSlugSuccess(`Site URL updated to /${cleaned}`);
    } catch (err) {
      setSlugError(safeSettingsError(err, 'Couldn’t update URL.'));
    } finally {
      setSlugSaving(false);
    }
  };

  const handleSavePrivacy = async (e: React.FormEvent) => {
    e.preventDefault();
    setVisibilitySaving(true);
    setVisibilityError(null);
    setVisibilitySuccess(null);
    let nextGuestAccessToken: string | null = null;
    try {
      const targetSiteId = await resolveSettingsSiteId();
      if (!targetSiteId) {
        setVisibilityError(SETTINGS_SITE_MISSING_COPY);
        return;
      }

      const sitePasswordHash = privacyMode === 'password_protected' && sitePassword
        ? await hashSettingsSitePassword(sitePassword)
        : null;

      if (privacyMode === 'invite_only' && !guestAccessToken) {
        nextGuestAccessToken = await generateSettingsSecureToken();
      }

      const updates: SettingsSiteUpdates = buildPrivacySettingsUpdates({
        privacyMode,
        hideFromSearch,
        allowedLanguages,
        defaultLanguage,
        weddingData: settingsWeddingData,
        sitePasswordHash,
        guestAccessToken: nextGuestAccessToken,
      });

      await updateSettingsSite(targetSiteId, updates);
      if (nextGuestAccessToken) setGuestAccessToken(nextGuestAccessToken);
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
          passwordChanged: privacyMode === 'password_protected' && Boolean(sitePassword),
          guestAccessTokenCreated: Boolean(nextGuestAccessToken),
        },
        targetSiteId,
        'Site privacy',
        targetSiteId,
      );
      setVisibilitySuccess('Privacy settings saved.');
    } catch (err) {
      setVisibilityError(safeSettingsError(err, 'Couldn’t save sharing settings.'));
    } finally {
      setVisibilitySaving(false);
    }
  };

  const handleRegenerateToken = async () => {
    try {
      const targetSiteId = await resolveSettingsSiteId();
      if (!targetSiteId) {
        toast(SETTINGS_SITE_MISSING_COPY, 'error');
        return;
      }

      const data = await generateSettingsSecureToken();
      await updateSettingsSite(targetSiteId, { guest_access_token: data });
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
      toast(safeSettingsError(err, 'Couldn’t refresh guest access link.'), 'error');
    }
  };

  const copyInviteLink = async () => {
    if (!guestAccessToken || !siteSlug) return;
    const url = `${window.location.origin}/site/${siteSlug}?token=${guestAccessToken}`;
    const result = await copyTextOrDownload(url, 'dayof-guest-access-link.txt');
    if (result === 'copied') {
      setPrivacyCopied(true);
      window.setTimeout(() => setPrivacyCopied(false), 2000);
    } else {
      toast('Clipboard was blocked, so the guest access link downloaded.', 'success');
    }
  };

  const copyIdentityManifest = async () => {
    const manifest = buildWeddingIdentityManifestText(weddingIdentityExportKit);
    const result = await copyTextOrDownload(manifest, 'dayof-wedding-identity-export-manifest.txt');
    toast(result === 'copied' ? 'Wedding identity manifest copied.' : 'Wedding identity manifest downloaded.', 'success');
  };

  const copyIdentityStyleKit = async () => {
    const result = await copyTextOrDownload(weddingIdentityStyleKit.text, weddingIdentityStyleKit.filename);
    toast(result === 'copied' ? 'Wedding identity style kit copied.' : 'Wedding identity style kit downloaded.', 'success');
  };

  const downloadIdentityPrintPack = async () => {
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
      downloadBlob(
        'dayof-wedding-identity-print-pack.pdf',
        await rasterizeSvgToPdfBlob(printSheet.svg),
      );
      toast('Wedding identity print pack saved as HTML, SVG, PNG, and PDF.', 'success');
    } catch (err) {
      toast(safeSettingsError(err, 'Couldn’t save the identity print pack.'), 'error');
    }
  };

  const downloadIdentityStoryGraphic = async () => {
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
      toast('Wedding story graphic saved as SVG and PNG.', 'success');
    } catch (err) {
      toast(safeSettingsError(err, 'Couldn’t save the story graphic.'), 'error');
    }
  };

  const togglePlannerPermission = (key: PlannerPermissionKey) => {
    setPlannerInvitePermissions((prev) => (
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    ));
  };

  const handleDefaultLanguageChange = async (next: SiteLanguageCode) => {
    const previous = defaultLanguage;
    setDefaultLanguage(next);
    setAllowedLanguages((current) => Array.from(new Set([next, ...current])));
    setVisibilityError(null);
    setVisibilitySuccess(null);
    try {
      const targetSiteId = await resolveSettingsSiteId();
      if (!targetSiteId) {
        setDefaultLanguage(previous);
        visibilityDraftGuard.markSaved();
        setVisibilityError(SETTINGS_SITE_MISSING_COPY);
        return;
      }

      await updateSettingsSite(targetSiteId, { default_language: next });
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
    setTranslatingLanguage(language);
    setVisibilityError(null);
    setVisibilitySuccess(null);
    try {
      const targetSiteId = await resolveSettingsSiteId();
      if (!targetSiteId) {
        setVisibilityError(SETTINGS_SITE_MISSING_COPY);
        return;
      }

      await translateSettingsSiteContent(targetSiteId, language);
      await loadTranslationStatuses(targetSiteId);
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
      setVisibilityError(safeSettingsError(err, 'Couldn’t prepare translation.'));
    } finally {
      setTranslatingLanguage(null);
    }
  };

  const handleSaveMusicPlaylist = async () => {
    setVisibilityError(null);
    setVisibilitySuccess(null);
    try {
      const targetSiteId = await resolveSettingsSiteId();
      if (!targetSiteId) {
        setVisibilityError(SETTINGS_SITE_MISSING_COPY);
        return;
      }

      const value = musicPlaylistUrl.trim();
      await updateSettingsSite(targetSiteId, { music_playlist_url: value || null });
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
