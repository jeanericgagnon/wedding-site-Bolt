import React from 'react';
import { Trash2 } from 'lucide-react';
import { DashboardLayout } from '../../../components/dashboard/DashboardLayout';
import { DashboardPageHero } from '../../../components/dashboard/DashboardPageHero';
import { Badge, Button, Card, Input, Select } from '../../../components/ui';
import type { ConfirmDialogProps } from '../../../components/ui/ConfirmDialog';
import {
  RSVP_QUESTION_TEMPLATES,
  type PersistedRsvpAccessSelection,
  type RsvpAccessModePlan,
  type RsvpQuestionTemplate,
  type RsvpQuestionTemplateCoverageItem,
  type RsvpSetupChecklistItem,
  type SupportedRsvpAccessModeId,
} from '../../../lib/rsvpAccessPlanner';
import { formatGuestOpsRelativeTime } from '../guestOpsTime';
import {
  getAuditActionIcon,
  getAuditActionTone,
  getAuditGuestLabel,
  summarizeAuditEntry,
} from './guestDisplayUtils';
import { makeRsvpQuestion, toTitleCase } from './guestDashboardUtils';
import type { GuestAuditEntry, RSVPQuestionSetting } from './guestDashboardTypes';

interface GuestRsvpStats {
  confirmed: number;
  declined: number;
  pending: number;
}

interface GuestRsvpSettingsViewProps {
  recommendedRsvpAccessMode: RsvpAccessModePlan;
  rsvpAccessModePlan: RsvpAccessModePlan[];
  rsvpAccessSelection: PersistedRsvpAccessSelection;
  rsvpAuditFeed: GuestAuditEntry[];
  rsvpAuditLoading: boolean;
  rsvpAutoSaveState: 'idle' | 'saving' | 'saved' | 'error';
  rsvpConfigSaving: boolean;
  rsvpMealEnabled: boolean;
  rsvpMealOptions: string[];
  rsvpQuestionTemplateCoverage: RsvpQuestionTemplateCoverageItem[];
  rsvpQuestions: RSVPQuestionSetting[];
  rsvpSetupChecklist: RsvpSetupChecklistItem[];
  stats: GuestRsvpStats;
  onAddRsvpQuestionTemplate: (template: RsvpQuestionTemplate) => void;
  onSaveRsvpConfig: () => void;
  onSetConfirmDialog: React.Dispatch<React.SetStateAction<null | Omit<ConfirmDialogProps, 'open'>>>;
  onSetGuestsTab: (tab: 'ops' | 'rsvp-config') => void;
  onSetRsvpAccessSelection: React.Dispatch<React.SetStateAction<PersistedRsvpAccessSelection>>;
  onSetRsvpConfigDirty: (dirty: boolean) => void;
  onSetRsvpMealEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  onSetRsvpMealOptions: React.Dispatch<React.SetStateAction<string[]>>;
  onSetRsvpQuestions: React.Dispatch<React.SetStateAction<RSVPQuestionSetting[]>>;
}

const RSVP_QUESTION_TYPE_OPTIONS = [
  { value: 'short_text', label: 'Short text' },
  { value: 'long_text', label: 'Long text' },
  { value: 'single_choice', label: 'Single choice' },
  { value: 'multi_choice', label: 'Multiple choice' },
];

const RSVP_QUESTION_APPLIES_TO_OPTIONS = [
  { value: 'all', label: 'All attendees' },
  { value: 'ceremony', label: 'Ceremony attendees' },
  { value: 'reception', label: 'Reception attendees' },
];

function getRsvpTemplateLabel(template: RsvpQuestionTemplate): string {
  if (template.key === 'dietary') return 'Dietary notes';
  if (template.key === 'song') return 'Song request';
  if (template.key === 'shuttle') return 'Shuttle';
  if (template.key === 'lodging') return 'Lodging';
  if (template.key === 'childcare') return 'Childcare';
  if (template.key === 'plus_one_note') return 'Plus-one note';
  return 'Event attendance';
}

export function GuestRsvpSettingsView({
  recommendedRsvpAccessMode,
  rsvpAccessModePlan,
  rsvpAccessSelection,
  rsvpAuditFeed,
  rsvpAuditLoading,
  rsvpAutoSaveState,
  rsvpConfigSaving,
  rsvpMealEnabled,
  rsvpMealOptions,
  rsvpQuestionTemplateCoverage,
  rsvpQuestions,
  rsvpSetupChecklist,
  stats,
  onAddRsvpQuestionTemplate,
  onSaveRsvpConfig,
  onSetConfirmDialog,
  onSetGuestsTab,
  onSetRsvpAccessSelection,
  onSetRsvpConfigDirty,
  onSetRsvpMealEnabled,
  onSetRsvpMealOptions,
  onSetRsvpQuestions,
}: GuestRsvpSettingsViewProps) {
  const safeStats = stats ?? { confirmed: 0, declined: 0, pending: 0 };
  const safeRsvpAccessModePlan = Array.isArray(rsvpAccessModePlan) ? rsvpAccessModePlan : [];
  const safeRecommendedRsvpAccessMode = recommendedRsvpAccessMode
    ?? safeRsvpAccessModePlan[0]
    ?? { id: 'private_link', label: 'Private guest links', detail: '', tradeoff: '', status: 'needs-setup' as const };
  const safeRsvpAccessSelection = rsvpAccessSelection ?? {
    primaryMode: 'private_link' as const,
    allowNameLookupBackup: true,
  };
  const safeRsvpQuestionTemplateCoverage = Array.isArray(rsvpQuestionTemplateCoverage) ? rsvpQuestionTemplateCoverage : [];
  const safeRsvpQuestions = Array.isArray(rsvpQuestions) ? rsvpQuestions : [];
  const safeRsvpMealOptions = Array.isArray(rsvpMealOptions) ? rsvpMealOptions : [];
  const safeRsvpSetupChecklist = Array.isArray(rsvpSetupChecklist) ? rsvpSetupChecklist : [];
  const verificationInputsChecklistItem = safeRsvpSetupChecklist.find((item) => item.id === 'verification_inputs') ?? null;
  const markRsvpConfigDirty = () => onSetRsvpConfigDirty(true);
  const rsvpAccessSummary = safeRsvpAccessSelection.primaryMode === 'private_link'
    ? safeRsvpAccessSelection.allowNameLookupBackup
      ? 'Guests reply through private RSVP links, with name lookup kept on as the backup for misplaced invites.'
      : 'Guests reply through private RSVP links only.'
    : 'Guests can find their RSVP by name or email, while private invite links still stay available per guest.';

  const selectPrimaryMode = (primaryMode: SupportedRsvpAccessModeId) => {
    onSetRsvpAccessSelection((prev) => ({
      primaryMode,
      allowNameLookupBackup: primaryMode === 'name_lookup' ? false : prev.allowNameLookupBackup,
    }));
    markRsvpConfigDirty();
  };

  const updateMealOption = (index: number, value: string) => {
    onSetRsvpMealOptions((prev) => {
      const next = [...prev];
      next[index] = toTitleCase(value);
      return next;
    });
  };

  const updateQuestion = (questionId: string, patch: Partial<RSVPQuestionSetting>) => {
    onSetRsvpQuestions((prev) => prev.map((question) => question.id === questionId ? { ...question, ...patch } : question));
    markRsvpConfigDirty();
  };

  const updateQuestionOption = (questionId: string, optionIndex: number, value: string) => {
    onSetRsvpQuestions((prev) => prev.map((question) => {
      if (question.id !== questionId) return question;
      const options = [...(question.options ?? [])];
      options[optionIndex] = toTitleCase(value);
      return { ...question, options };
    }));
    markRsvpConfigDirty();
  };

  const removeQuestionOption = (questionId: string, optionIndex: number) => {
    onSetRsvpQuestions((prev) => prev.map((question) => {
      if (question.id !== questionId) return question;
      const options = [...(question.options ?? [])];
      options.splice(optionIndex, 1);
      return { ...question, options };
    }));
    markRsvpConfigDirty();
  };

  return (
    <DashboardLayout currentPage="guests">
      <div className="max-w-[1100px] mx-auto space-y-5">
        <DashboardPageHero
          eyebrow="RSVP settings"
          title="Ask only what you truly need from guests."
          description="Meal choices, custom questions, and event-specific answers stay editable before guests see them."
          stats={[
            { label: 'Questions', value: safeRsvpQuestions.length, detail: 'custom prompts' },
            { label: 'Meal choices', value: rsvpMealEnabled ? safeRsvpMealOptions.length : 'Off', detail: rsvpMealEnabled ? 'shown on RSVP' : 'hidden from guests' },
            { label: 'Responses', value: safeStats.confirmed + safeStats.declined, detail: `${safeStats.pending} still pending` },
          ]}
          actions={<a href="/dashboard/rsvp-board" className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white no-underline hover:bg-primary/90">Open RSVP view</a>}
        >
          <div className="inline-flex rounded-lg border border-border-subtle bg-white p-1">
            <button className="px-3 py-1.5 text-sm rounded-md text-text-secondary" onClick={() => onSetGuestsTab('ops')}>Guests</button>
            <button className="px-3 py-1.5 text-sm rounded-md bg-surface-subtle text-text-primary border border-border-subtle" onClick={() => onSetGuestsTab('rsvp-config')}>RSVP questions</button>
          </div>
        </DashboardPageHero>

        <Card variant="bordered" padding="lg">
          <div className="space-y-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-text-primary">RSVP access mode</h3>
                <p className="text-sm text-text-secondary">{rsvpAccessSummary}</p>
              </div>
              <Badge variant="success">Recommended: {safeRecommendedRsvpAccessMode.label}</Badge>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {safeRsvpAccessModePlan.map((mode) => (
                <div
                  key={mode.id}
                  className={`rounded-lg border p-4 ${
                    mode.status === 'recommended'
                      ? 'border-primary/40 bg-primary/5'
                      : mode.status === 'future'
                        ? 'border-border-subtle bg-surface-subtle/50'
                        : 'border-border-subtle bg-white'
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-text-primary">{mode.label}</p>
                      {mode.selected ? <Badge variant="neutral">Selected</Badge> : null}
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      mode.status === 'recommended'
                        ? 'bg-primary/10 text-primary'
                        : mode.status === 'needs-setup'
                          ? 'bg-warning/10 text-warning'
                          : mode.status === 'future'
                            ? 'bg-surface-subtle text-text-tertiary'
                            : 'bg-success/10 text-success'
                    }`}>
                      {mode.status === 'recommended' ? 'Recommended' : mode.status === 'needs-setup' ? 'Needs setup' : mode.status === 'future' ? 'Planned' : 'Ready'}
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary">{mode.detail}</p>
                  <p className="mt-2 text-xs text-text-tertiary">{mode.tradeoff}</p>
                  {mode.id === 'private_link' || mode.id === 'name_lookup' ? (
                    <div className="mt-3">
                      <Button
                        type="button"
                        variant={mode.selected ? 'secondary' : 'outline'}
                        size="sm"
                        disabled={mode.selected}
                        onClick={() => selectPrimaryMode(mode.id as SupportedRsvpAccessModeId)}
                      >
                        {mode.selected ? 'Selected as primary' : 'Use as primary access'}
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-border-subtle bg-surface-subtle/30 p-4">
              <label className="flex items-start gap-3 text-sm text-text-primary">
                <input
                  type="checkbox"
                  checked={safeRsvpAccessSelection.allowNameLookupBackup}
                  disabled={safeRsvpAccessSelection.primaryMode !== 'private_link'}
                  onChange={(event) => {
                    onSetRsvpAccessSelection((prev) => ({
                      ...prev,
                      allowNameLookupBackup: event.target.checked,
                    }));
                    markRsvpConfigDirty();
                  }}
                  className="mt-0.5 h-4 w-4"
                />
                <span>
                  Keep name lookup as the backup when guests lose their private link.
                  <span className="mt-1 block text-xs text-text-tertiary">
                    {safeRsvpAccessSelection.primaryMode === 'private_link'
                      ? 'This keeps search-by-name recovery on without changing your primary RSVP path.'
                      : 'Name lookup is already the active RSVP path, so the backup toggle stays off.'}
                  </span>
                </span>
              </label>
            </div>

            <p className="text-xs text-text-tertiary">
              Guest codes, shared passwords, and open RSVP stay planned until recovery, privacy, and capacity rules are fully proven.
            </p>

            {verificationInputsChecklistItem ? (
              <div className="rounded-lg border border-border-subtle bg-surface-subtle/30 p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">Phone or email recovery plan</p>
                    <p className="text-xs text-text-tertiary">This does not turn code, password, or open RSVP on. It shows whether your saved guest contact data is strong enough to design a safer recovery step later.</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    verificationInputsChecklistItem.status === 'ready'
                      ? 'bg-success/10 text-success'
                      : 'bg-warning/10 text-warning'
                  }`}>
                    {verificationInputsChecklistItem.status === 'ready' ? 'Ready to design' : 'Needs setup'}
                  </span>
                </div>
                <p className="text-sm text-text-secondary">{verificationInputsChecklistItem.detail}</p>
              </div>
            ) : null}
          </div>
        </Card>

        <Card variant="bordered" padding="lg">
          <div className="space-y-5">
            <div>
              <h3 className="text-lg font-semibold text-text-primary">RSVP Questions & Meal Choices</h3>
              <p className="text-sm text-text-secondary">Choose what guests answer when they reply on the RSVP page.</p>
            </div>

            <div className="rounded-lg border border-border-subtle bg-white p-4">
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-text-primary">Setup proof checklist</p>
                  <p className="text-sm text-text-secondary">Use this before publishing RSVP changes so launch modes stay clear.</p>
                </div>
                <Badge variant="neutral">Owner readback</Badge>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {safeRsvpSetupChecklist.map((item) => (
                  <div key={item.id} className="rounded-md border border-border-subtle bg-surface-subtle/30 p-3">
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-text-primary">{item.label}</p>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        item.status === 'ready'
                          ? 'bg-success/10 text-success'
                          : item.status === 'planned'
                            ? 'bg-surface-subtle text-text-tertiary'
                            : 'bg-warning/10 text-warning'
                      }`}>
                        {item.status === 'ready' ? 'Ready' : item.status === 'planned' ? 'Planned' : 'Needs setup'}
                      </span>
                    </div>
                    <p className="text-xs text-text-tertiary">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-border-subtle bg-surface-subtle/40 p-4">
              <div className="mb-3">
                <p className="text-sm font-semibold text-text-primary">Question templates</p>
                <p className="text-sm text-text-secondary">Add common wedding questions, then edit the wording before guests see them.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {RSVP_QUESTION_TEMPLATES.map((template) => {
                  const templateAdded = safeRsvpQuestionTemplateCoverage.find((item) => item.key === template.key)?.added ?? false;
                  const templateLabel = getRsvpTemplateLabel(template);

                  return (
                    <Button
                      key={template.key}
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={templateAdded}
                      onClick={() => onAddRsvpQuestionTemplate(template)}
                    >
                      {templateAdded ? `${templateLabel} added` : templateLabel}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3 p-4 border border-border rounded-lg">
              <label className="flex items-center gap-2 text-sm text-text-primary">
                <input
                  type="checkbox"
                  checked={rsvpMealEnabled}
                  onChange={(event) => {
                    onSetRsvpMealEnabled(event.target.checked);
                    markRsvpConfigDirty();
                  }}
                  className="w-4 h-4"
                />
                Collect meal choice on the RSVP form
              </label>
              {rsvpMealEnabled && (
                <div className="space-y-2">
                  {safeRsvpMealOptions.map((option, index) => (
                    <div key={`meal-${index}`} className="flex items-center gap-2">
                      <Input value={option} onChange={(event) => updateMealOption(index, event.target.value)} placeholder={`Meal option ${index + 1}`} />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          onSetRsvpMealOptions((prev) => prev.filter((_, optionIndex) => optionIndex !== index));
                          markRsvpConfigDirty();
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onSetRsvpMealOptions((prev) => [...prev, '']);
                      markRsvpConfigDirty();
                    }}
                  >
                    Add meal choice
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {safeRsvpQuestions.map((question, index) => (
                <div key={question.id} className="p-4 border border-border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">Question {index + 1}</p>
                    <button
                      type="button"
                      aria-label="Delete question"
                      title="Delete question"
                      className="p-1.5 rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-subtle"
                      onClick={() => {
                        onSetConfirmDialog({
                          title: 'Delete this RSVP question?',
                          description: 'Guests will no longer see this question. Existing saved answers stay in response history.',
                          confirmLabel: 'Delete question',
                          tone: 'danger',
                          onCancel: () => onSetConfirmDialog(null),
                          onConfirm: () => {
                            onSetRsvpQuestions((prev) => prev.filter((item) => item.id !== question.id));
                            markRsvpConfigDirty();
                            onSetConfirmDialog(null);
                          },
                        });
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <Input
                    value={question.label}
                    onChange={(event) => updateQuestion(question.id, { label: event.target.value })}
                    placeholder="Question prompt"
                  />
                  <div className="grid md:grid-cols-3 gap-3">
                    <Select
                      value={question.type}
                      onChange={(event) => updateQuestion(question.id, {
                        type: event.target.value as RSVPQuestionSetting['type'],
                        options: (event.target.value === 'single_choice' || event.target.value === 'multi_choice') ? (question.options?.length ? question.options : ['', '']) : [],
                      })}
                      options={RSVP_QUESTION_TYPE_OPTIONS}
                    />
                    <Select
                      value={question.appliesTo}
                      onChange={(event) => updateQuestion(question.id, { appliesTo: event.target.value as RSVPQuestionSetting['appliesTo'] })}
                      options={RSVP_QUESTION_APPLIES_TO_OPTIONS}
                    />
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={question.required}
                        onChange={(event) => updateQuestion(question.id, { required: event.target.checked })}
                      />
                      Required
                    </label>
                  </div>
                  {(question.type === 'single_choice' || question.type === 'multi_choice') && (
                    <div className="space-y-2">
                      {(question.options ?? []).map((option, optionIndex) => (
                        <div key={`${question.id}-opt-${optionIndex}`} className="flex items-center gap-2">
                          <Input
                            value={option}
                            onChange={(event) => updateQuestionOption(question.id, optionIndex, event.target.value)}
                            placeholder={`Option ${optionIndex + 1}`}
                          />
                          <Button type="button" variant="ghost" size="sm" onClick={() => removeQuestionOption(question.id, optionIndex)}>Remove</Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuestion(question.id, { options: [...(question.options ?? []), ''] })}
                      >
                        Add choice
                      </Button>
                    </div>
                  )}
                </div>
              ))}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    onSetRsvpQuestions((prev) => [...prev, makeRsvpQuestion()]);
                    markRsvpConfigDirty();
                  }}
                >
                  Add question
                </Button>
                <div className="flex items-center gap-3">
                  <Button type="button" variant="primary" onClick={onSaveRsvpConfig} disabled={rsvpConfigSaving}>
                    {rsvpConfigSaving ? 'Saving...' : 'Save Now'}
                  </Button>
                  <span className="text-xs text-text-tertiary">
                    {rsvpAutoSaveState === 'saving' ? 'Auto-saving...' : rsvpAutoSaveState === 'saved' ? 'Auto-saved' : rsvpAutoSaveState === 'error' ? 'Auto-save needs retry' : 'Auto-save on'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card variant="bordered" padding="lg">
          <details className="group" open>
            <summary className="cursor-pointer list-none flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-text-primary">Guest change history</h3>
                <p className="text-sm text-text-secondary">Recent guest updates so you can track what changed without leaving RSVP settings.</p>
              </div>
              <span className="text-xs text-text-tertiary">{rsvpAuditFeed.length} recent</span>
            </summary>

            <div className="mt-4 space-y-2">
              {rsvpAuditLoading ? (
                <div className="text-sm text-text-secondary">Loading history...</div>
              ) : rsvpAuditFeed.length === 0 ? (
                <div className="text-sm text-text-secondary">No recent guest changes yet.</div>
              ) : (
                rsvpAuditFeed.slice(0, 8).map((entry) => (
                  <div key={entry.id} className="rounded-lg border border-border-subtle bg-surface-subtle/40 px-3 py-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {(() => {
                            const ActionIcon = getAuditActionIcon(entry.action);
                            return (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-lg border ${getAuditActionTone(entry.action)}`}>
                                <ActionIcon className="w-3 h-3" />
                                <span>{entry.action === 'insert' ? 'Created' : entry.action === 'delete' ? 'Removed' : 'Updated'}</span>
                              </span>
                            );
                          })()}
                          <span className="text-xs text-text-tertiary truncate">{getAuditGuestLabel(entry)}</span>
                        </div>
                        <p className="text-sm text-text-secondary leading-relaxed">{summarizeAuditEntry(entry)}</p>
                      </div>
                      <span className="text-xs text-text-tertiary whitespace-nowrap">{formatGuestOpsRelativeTime(entry.changed_at)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </details>
        </Card>
      </div>
    </DashboardLayout>
  );
}
