import { useEffect, useMemo, useRef, useState } from 'react';
import { Users } from 'lucide-react';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from '../../../components/ui';
import { PLANNER_PERMISSION_GROUPS, type PlannerInviteRecord, type PlannerPermissionKey } from '../../../lib/plannerAccess';
import { plannerPermissionLabel } from './settingsDashboardUtils';
import { formatSettingsDate } from '../settingsDate';
import type { SettingsCollaboratorInviteRow } from './settingsSiteData';

type PlannerRoleOption = {
  value: string;
  label: string;
  description: string;
};

type CopyActionResult = 'copied' | 'downloaded';
type CollaboratorInviteCopyNotice = {
  action: 'copy' | 'resend';
  inviteId: string;
  mode: CopyActionResult;
} | null;

type SettingsTeamAccessPanelProps = {
  canManageOwnerSettings: boolean;
  collaboratorInvites: SettingsCollaboratorInviteRow[];
  creatingCollaboratorInvite: boolean;
  onCopyCollaboratorInviteLink: (inviteToken: string | undefined) => Promise<CopyActionResult | null>;
  onCreateCollaboratorInvite: () => void;
  onPlannerInviteEmailChange: (value: string) => void;
  onPlannerInviteNameChange: (value: string) => void;
  onPlannerInviteRoleChange: (role: 'planner' | 'coordinator' | 'viewer') => void;
  onRemovePlannerInvite: () => void;
  onResendCollaboratorInvite: (inviteToken: string | undefined) => Promise<CopyActionResult | null>;
  onRevokeCollaboratorInvite: (inviteId: string) => void;
  onSavePlannerInvite: () => void;
  onTogglePlannerPermission: (key: PlannerPermissionKey) => void;
  plannerInvite: PlannerInviteRecord | null;
  plannerInviteEmail: string;
  plannerInviteError: string | null;
  plannerInviteName: string;
  plannerInvitePermissions: PlannerPermissionKey[];
  plannerInviteRole: 'planner' | 'coordinator' | 'viewer';
  plannerInviteSuccess: string | null;
  plannerRoleOptions: PlannerRoleOption[];
  revokingCollaboratorInviteId: string | null;
};

export function SettingsTeamAccessPanel({
  canManageOwnerSettings,
  collaboratorInvites,
  creatingCollaboratorInvite,
  onCopyCollaboratorInviteLink,
  onCreateCollaboratorInvite,
  onPlannerInviteEmailChange,
  onPlannerInviteNameChange,
  onPlannerInviteRoleChange,
  onRemovePlannerInvite,
  onResendCollaboratorInvite,
  onRevokeCollaboratorInvite,
  onSavePlannerInvite,
  onTogglePlannerPermission,
  plannerInvite,
  plannerInviteEmail,
  plannerInviteError,
  plannerInviteName,
  plannerInvitePermissions,
  plannerInviteRole,
  plannerInviteSuccess,
  plannerRoleOptions,
  revokingCollaboratorInviteId,
}: SettingsTeamAccessPanelProps) {
  const [collaboratorInviteCopyNotice, setCollaboratorInviteCopyNotice] = useState<CollaboratorInviteCopyNotice>(null);
  const [collaboratorInviteCopying, setCollaboratorInviteCopying] = useState<{
    action: 'copy' | 'resend';
    inviteId: string;
  } | null>(null);
  const collaboratorInviteCopyRequestIdRef = useRef(0);
  const collaboratorInviteSignature = useMemo(
    () => collaboratorInvites
      .map((invite) => `${invite.id}:${invite.invite_token ?? ''}`)
      .join('|'),
    [collaboratorInvites],
  );
  const collaboratorInviteSignatureRef = useRef(collaboratorInviteSignature);
  collaboratorInviteSignatureRef.current = collaboratorInviteSignature;

  useEffect(() => {
    collaboratorInviteCopyRequestIdRef.current += 1;
    setCollaboratorInviteCopyNotice(null);
    setCollaboratorInviteCopying(null);
  }, [collaboratorInviteSignature]);

  const runCollaboratorInviteCopy = async (
    action: 'copy' | 'resend',
    inviteId: string,
    inviteToken: string | undefined,
    handler: (inviteToken: string | undefined) => Promise<CopyActionResult | null>,
  ) => {
    const requestId = ++collaboratorInviteCopyRequestIdRef.current;
    const requestSignature = collaboratorInviteSignatureRef.current;
    const isCurrentInviteCopy = () => (
      requestId === collaboratorInviteCopyRequestIdRef.current &&
      collaboratorInviteSignatureRef.current === requestSignature
    );
    setCollaboratorInviteCopyNotice(null);
    setCollaboratorInviteCopying({ action, inviteId });
    try {
      const result = await handler(inviteToken);
      if (result && isCurrentInviteCopy()) {
        setCollaboratorInviteCopyNotice({ action, inviteId, mode: result });
      }
    } finally {
      if (isCurrentInviteCopy()) {
        setCollaboratorInviteCopying((current) => (
          current?.inviteId === inviteId && current.action === action ? null : current
        ));
      }
    }
  };

  return (
    <Card variant="bordered" padding="lg" className="rounded-[20px] shadow-none">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Planner access
            </CardTitle>
            <CardDescription>Invite planners, coordinators, or trusted helpers with role-based access that stays separate from couple ownership and billing.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 rounded-xl border border-border-subtle bg-surface-subtle/40 p-4">
          <p className="text-sm font-medium text-text-primary">Invite your planner, not a generic staff account</p>
          <p className="text-sm text-text-secondary">Keep ownership with the couple while sharing the parts of dayof that help someone run the event well. Helpers claim access from a secure invite link and do not touch billing.</p>
        </div>

        {plannerInviteSuccess && (
          <div className="rounded-xl border border-success/20 bg-success-light p-3 text-sm text-success">{plannerInviteSuccess}</div>
        )}
        {plannerInviteError && (
          <div className="rounded-xl border border-border-subtle bg-surface-subtle p-3 text-sm text-text-secondary">{plannerInviteError}</div>
        )}

        <div className="grid gap-3 md:grid-cols-3">
          {plannerRoleOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onPlannerInviteRoleChange(option.value as 'planner' | 'coordinator' | 'viewer')}
              disabled={!canManageOwnerSettings}
              className={`rounded-xl border p-4 text-left transition-colors ${plannerInviteRole === option.value ? 'border-primary bg-primary/5' : 'border-border-subtle bg-white hover:border-primary/35'}`}
            >
              <p className="text-sm font-medium text-text-primary">{option.label}</p>
              <p className="mt-1 text-xs text-text-secondary">{option.description}</p>
            </button>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label htmlFor="planner-invite-name" className="mb-2 block text-sm font-medium text-text-primary">Planner name</label>
            <Input id="planner-invite-name" value={plannerInviteName} onChange={(e) => onPlannerInviteNameChange(e.target.value)} disabled={!canManageOwnerSettings} placeholder="Your planner or coordinator" />
          </div>
          <div>
            <label htmlFor="planner-invite-email" className="mb-2 block text-sm font-medium text-text-primary">Planner email</label>
            <Input id="planner-invite-email" value={plannerInviteEmail} onChange={(e) => onPlannerInviteEmailChange(e.target.value)} disabled={!canManageOwnerSettings} placeholder="planner@example.com" />
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-dashed border-border bg-surface-subtle/20 p-4">
          <div>
            <p className="text-sm font-medium text-text-primary">Permissions</p>
            <p className="mt-1 text-sm text-text-secondary">Start with a role preset, then tighten or expand access simply before you send the invite.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {PLANNER_PERMISSION_GROUPS.map((permission) => {
              const checked = plannerInvitePermissions.includes(permission.key);
              return (
                <label key={permission.key} className={`cursor-pointer rounded-xl border p-3 transition-colors ${checked ? 'border-primary bg-primary/5' : 'border-border-subtle bg-white hover:border-primary/30'}`}>
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onTogglePlannerPermission(permission.key)}
                      disabled={!canManageOwnerSettings}
                      className="mt-1 h-4 w-4 rounded border-border-subtle text-primary focus:ring-primary/30"
                    />
                    <div>
                      <p className="text-sm font-medium text-text-primary">{permission.label}</p>
                      <p className="mt-1 text-xs text-text-secondary">{permission.description}</p>
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
          <p className="text-xs text-text-tertiary">Billing and couple ownership stay with the owner. This selector is for support access only.</p>
        </div>

        {plannerInvite && (
          <div className="rounded-xl border border-border-subtle bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-text-primary">Access setup saved for {plannerInvite.name}</p>
                <p className="mt-1 text-xs text-text-secondary">{plannerInvite.email} · {plannerRoleOptions.find((option) => option.value === plannerInvite.role)?.label} · {plannerInvite.status === 'active' ? 'Active' : 'Pending'}</p>
              </div>
              <Badge variant={plannerInvite.status === 'active' ? 'success' : 'secondary'}>{plannerInvite.status === 'active' ? 'Active' : 'Pending'}</Badge>
            </div>
          </div>
        )}

        <div className="space-y-3 rounded-xl border border-border-subtle bg-surface-subtle/20 p-4">
          <div>
            <p className="text-sm font-medium text-text-primary">Collaborator list</p>
            <p className="mt-1 text-xs text-text-secondary">Track pending and accepted access links, copy invite URLs, and revoke pending access before it is claimed.</p>
          </div>

          {plannerInvite ? (
            <div className="rounded-xl border border-border-subtle bg-white px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-text-primary">{plannerInvite.name}</p>
                  <p className="mt-1 text-xs text-text-secondary">{plannerInvite.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{plannerRoleOptions.find((option) => option.value === plannerInvite.role)?.label || plannerInvite.role}</Badge>
                  <Badge variant={plannerInvite.status === 'active' ? 'success' : 'secondary'}>{plannerInvite.status === 'active' ? 'Active' : 'Pending'}</Badge>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border-subtle bg-white px-4 py-3 text-sm text-text-secondary">
              No collaborator access setups saved yet.
            </div>
          )}

          {collaboratorInvites.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-text-tertiary">Sent invite links</p>
              {collaboratorInvites.map((invite) => (
                <div key={invite.id} className="rounded-xl border border-border-subtle bg-white px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-text-primary">{invite.invite_name || invite.invite_email}</p>
                      <p className="mt-1 text-xs text-text-secondary">{invite.invite_email} · {invite.role} · {formatSettingsDate(invite.invited_at)}{invite.expires_at ? ` · expires ${formatSettingsDate(invite.expires_at)}` : ''}</p>
                      {invite.permissions && invite.permissions.length > 0 && <p className="mt-1 text-[11px] text-text-tertiary">{invite.permissions.map(plannerPermissionLabel).join(' · ')}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={invite.status === 'accepted' ? 'success' : invite.status === 'pending' ? 'secondary' : 'warning'}>{invite.status}</Badge>
                      {invite.status === 'pending' && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={!canManageOwnerSettings || (collaboratorInviteCopying?.inviteId === invite.id && collaboratorInviteCopying.action === 'copy')}
                          onClick={() => { void runCollaboratorInviteCopy('copy', invite.id, invite.invite_token, onCopyCollaboratorInviteLink); }}
                        >
                          {collaboratorInviteCopying?.inviteId === invite.id && collaboratorInviteCopying.action === 'copy'
                            ? 'Copying link...'
                            : collaboratorInviteCopyNotice?.inviteId === invite.id && collaboratorInviteCopyNotice.action === 'copy'
                              ? collaboratorInviteCopyNotice.mode === 'downloaded'
                                ? 'Downloaded invite link'
                                : 'Copied invite link'
                              : 'Copy link'}
                        </Button>
                      )}
                      {invite.status === 'pending' && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={!canManageOwnerSettings || (collaboratorInviteCopying?.inviteId === invite.id && collaboratorInviteCopying.action === 'resend')}
                          onClick={() => { void runCollaboratorInviteCopy('resend', invite.id, invite.invite_token, onResendCollaboratorInvite); }}
                        >
                          {collaboratorInviteCopying?.inviteId === invite.id && collaboratorInviteCopying.action === 'resend'
                            ? 'Copying resend link...'
                            : collaboratorInviteCopyNotice?.inviteId === invite.id && collaboratorInviteCopyNotice.action === 'resend'
                              ? collaboratorInviteCopyNotice.mode === 'downloaded'
                                ? 'Downloaded resend link'
                                : 'Copied resend link'
                              : 'Copy again'}
                        </Button>
                      )}
                      {invite.status === 'pending' && (
                        <Button type="button" variant="outline" size="sm" onClick={() => onRevokeCollaboratorInvite(invite.id)} disabled={!canManageOwnerSettings || revokingCollaboratorInviteId === invite.id}>
                          {revokingCollaboratorInviteId === invite.id ? 'Revoking…' : 'Revoke'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          {plannerInvite && (
            <Button type="button" variant="outline" size="sm" onClick={onRemovePlannerInvite} disabled={!canManageOwnerSettings}>Remove invite</Button>
          )}
          <Button type="button" variant="outline" size="sm" onClick={onCreateCollaboratorInvite} disabled={creatingCollaboratorInvite || !canManageOwnerSettings}>
            {creatingCollaboratorInvite ? 'Creating invite…' : 'Create invite link'}
          </Button>
          <Button type="button" variant="primary" size="md" onClick={onSavePlannerInvite} disabled={!canManageOwnerSettings}>
            {plannerInvite ? 'Update planner access' : 'Save planner invite'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
