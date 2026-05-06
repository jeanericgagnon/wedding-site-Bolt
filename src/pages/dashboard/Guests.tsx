import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { PLANNER_ROLE_OPTIONS, canManageGuests, derivePlannerRoleFromPermissions, readPlannerAccessRole, writePlannerAccessRole, type PlannerAccessRole, type PlannerPermissionKey } from '../../lib/plannerAccess';
import { getDaysUntilGuestWedding } from './guestWeddingDate';
import { getGuestLifecycleStage } from '../../lib/guestLifecycleStage';
import {
  buildRsvpAccessModePlan,
  buildRsvpQuestionTemplateCoverage,
  buildRsvpSetupChecklist,
  createRsvpQuestionFromTemplate,
  type RsvpQuestionTemplate,
} from '../../lib/rsvpAccessPlanner';
import { hasRespondedRsvpStatus, isDeclinedRsvpStatus } from '../../lib/rsvpStatus';
import { GUEST_IMPORT_MAX_FILE_BYTES, GUEST_IMPORT_MAX_ROWS, buildDefaultCsvFieldMap, buildGuestImportPreview, isCsvNameMappingValid, readGuestImportRows, type CsvFieldMap } from '../../lib/guestImportParser';
import { DashboardStateBlock } from '../../components/dashboard/DashboardStateBlock';
import { Card } from '../../components/ui';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/ui/Toast';
import type { ConfirmDialogProps } from '../../components/ui/ConfirmDialog';
import { demoWeddingSite, demoGuests, demoRSVPs } from '../../lib/demoData';
import { buildQuickStartPhotosPath, readQuickStartDashboardContinuation } from '../../lib/quickStartContinuation';
import { sendWeddingInvitation } from '../../lib/emailService';
import { copyTextOrDownload } from '../../lib/copyText';
import { logAppAction } from '../../lib/actionAudit';
import {
  type Guest,
  type GuestAuditEntry,
  type GuestWithRSVP,
  type ItineraryEvent,
  type RSVPQuestionSetting,
  type RsvpConflict,
  type RsvpConflictStats,
  type WeddingSiteInfo,
} from './guests/guestDashboardTypes';
import {
  buildDemoImportedGuests,
  buildGuestEventReport,
  buildGuestHouseholdGroups,
  buildGuestOpsQueue,
  filterGuestDashboardGuests,
  buildFilteredEmailList,
  buildFollowUpTask,
  buildGeneratedFollowUpTasks,
  applyGuestFormToDemoGuest,
  applyDemoAssistedRsvp,
  buildAssistedRsvpNotes,
  buildMissingMealChecklistLines,
  buildNoContactChecklistLines,
  buildRsvpExceptionChecklistLines,
  cleanGuestRsvpConfig,
  buildDemoGuestFromForm,
  buildGuestEventInviteIdSet,
  buildGuestFormDataFromGuest,
  buildGuestFormEventSelection,
  buildGuestPreviousValues,
  getGuestCustomAnswerRollup,
  getGuestDashboardStats,
  getGuestCampaignReadiness,
  getGuestContactStats,
  getGuestIssueCount,
  getGuestDueReminderIds,
  getGuestDueThankYouIds,
  getGuestMealChoiceRollup,
  getGuestMealSummary,
  getGuestRecommendedAction,
  getGuestRsvpConflictStats,
  getGuestRsvpOpsStats,
  getGuestSongRequestEntries,
  isGuestDueReminder,
  safeGuestImportReadError,
  safeGuestsDashboardError,
  sortGuestsForDisplay,
  buildGuestExceptionStateMap,
  buildGuestFallbackStateMap,
  buildGuestHouseholdStateMap,
  buildImportedGuestSidecars,
  buildGuestInvitationPayload,
  buildGuestCampaignLogEntry,
  buildGuestCsvImportToast,
  buildGuestCsvPreviewToast,
  buildGuestCampaignDryRun,
  buildGuestChecklistMarkdown,
  buildGuestReminderCampaignConfirmDescription,
  buildGuestReminderSendSummary,
  buildGuestSelectionToast,
  GUEST_SEGMENT_LABELS,
  getGuestDisplayName,
  getUnresolvedGuestIds,
  sendGuestInvitationBatch,
  stripImportedGuestInternalFields,
  trimGuestSelectionToVisible,
} from './guests/guestDashboardUtils';
import {
  readStoredCampaignLog,
  readStoredCampaignPreset,
  readStoredDemoRsvpConfig,
  readStoredFollowUpTasks,
  writeStoredCampaignLog,
  writeStoredCampaignPreset,
  writeStoredDemoRsvpConfig,
  writeStoredFollowUpTasks,
  type RsvpCampaignLogEntry,
  type RsvpCampaignPreset,
  type RsvpFollowUpTask,
} from './guests/guestDashboardStorage';
import {
  createGuest,
  deleteAllGuestsForSite,
  deleteGuestById,
  deleteGuestWithDependencies,
  insertEventInvitations,
  insertImportedGuests,
  loadGuestDashboardRows,
  loadGuestDashboardSite,
  loadGuestDrawerDetails,
  loadGuestItineraryFilters,
  loadGuestRsvpAuditFeed,
  replaceGuestEventInvitations,
  replaceImportedGuestRsvps,
  resolveGuestDashboardSiteId,
  resolveGuestRsvpConflict,
  resolveGuestRsvpConflicts,
  restoreGuestEventInvitations,
  saveGuestReminderSettings,
  saveAssistedGuestRsvp,
  saveGuestRsvpConfig,
  setGuestEventInvitation,
  toEventInvitationRows,
  updateGuest,
  updateGuestForSite,
  updateHouseholdGuestIds,
  updateGuestInvitationTimestamps,
  updateGuestsForSite,
  type GuestEventInvitationRollback,
} from './guests/guestService';
import { GuestSnapshotInsightsPanel } from './guests/GuestSnapshotInsightsPanel';
import { GuestOpsToolbar } from './guests/GuestOpsToolbar';
import { GuestCampaignReminderPanel } from './guests/GuestCampaignReminderPanel';
import { GuestDashboardOverlays } from './guests/GuestDashboardOverlays';
import { type AssistedRsvpSource, type AssistedRsvpStatus, type GuestFormData } from './guests/GuestModals';
import { GuestRsvpSettingsView } from './guests/GuestRsvpSettingsView';
import { GuestRsvpConflictPanels } from './guests/GuestRsvpConflictPanels';
import { GuestListStatusControls, type GuestFilterStatus } from './guests/GuestListStatusControls';
import { GuestDashboardHeader } from './guests/GuestDashboardHeader';
import { GuestListDisplaySwitcher } from './guests/GuestListDisplaySwitcher';
import { renderGuestStatusBadge } from './guests/GuestStatusBadge';
import { useGuestDashboardCheckIns, type GuestLastCheckIn } from './guests/useGuestDashboardCheckIns';
import { useGuestDashboardExports } from './guests/useGuestDashboardExports';

export const DashboardGuests: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { fromQuickStart, nextStep } = readQuickStartDashboardContinuation(searchParams);
  const { user, isDemoMode } = useAuth();
  const { toast } = useToast();
  const [confirmDialog, setConfirmDialog] = useState<null | Omit<ConfirmDialogProps, 'open'>>(null);
  const requestConfirmation = (options: Pick<ConfirmDialogProps, 'title' | 'description' | 'confirmLabel' | 'tone'>) =>
    new Promise<boolean>((resolve) => {
      setConfirmDialog({
        ...options,
        onCancel: () => {
          setConfirmDialog(null);
          resolve(false);
        },
        onConfirm: () => {
          setConfirmDialog(null);
          resolve(true);
        },
      });
    });
  const [guests, setGuests] = useState<GuestWithRSVP[]>([]);
  const [weddingSiteId, setWeddingSiteId] = useState<string | null>(null);
  const [weddingSiteInfo, setWeddingSiteInfo] = useState<WeddingSiteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<GuestFilterStatus>('all');
  const [extraFilters, setExtraFilters] = useState<string[]>([]);
  const [itineraryFilterEvents, setItineraryFilterEvents] = useState<ItineraryEvent[]>([]);
  const [eventInviteGuestMap, setEventInviteGuestMap] = useState<Map<string, Set<string>>>(new Map());

  const effectiveItineraryEvents = useMemo<ItineraryEvent[]>(() => {
    if (itineraryFilterEvents.length > 0) return itineraryFilterEvents;
    return [
      { id: 'legacy-ceremony', event_name: 'Ceremony', event_date: '', start_time: '', location_name: '' },
      { id: 'legacy-reception', event_name: 'Reception', event_date: '', start_time: '', location_name: '' },
    ];
  }, [itineraryFilterEvents]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingGuest, setEditingGuest] = useState<GuestWithRSVP | null>(null);
  const [sendingInviteId, setSendingInviteId] = useState<string | null>(null);
  const [bulkSending, setBulkSending] = useState(false);
  const [campaignLog, setCampaignLog] = useState<RsvpCampaignLogEntry[]>([]);
  const [showRecipientPreview, setShowRecipientPreview] = useState(false);
  const [campaignPreset, setCampaignPreset] = useState<RsvpCampaignPreset>('pending');
  const [followUpTasks, setFollowUpTasks] = useState<RsvpFollowUpTask[]>([]);
  const [sortByPriority, setSortByPriority] = useState(false);
  const [guestsTab, setGuestsTab] = useState<'ops' | 'rsvp-config'>('ops');
  const [guestsRole, setGuestsRole] = useState<PlannerAccessRole>('owner');
  const [guestsPermissions, setGuestsPermissions] = useState<PlannerPermissionKey[] | null>(null);
  const [rsvpQuestions, setRsvpQuestions] = useState<RSVPQuestionSetting[]>([]);
  const [rsvpMealEnabled, setRsvpMealEnabled] = useState(true);
  const [rsvpMealOptions, setRsvpMealOptions] = useState<string[]>(['Chicken','Beef','Fish','Vegetarian','Vegan']);
  const [rsvpConfigSaving, setRsvpConfigSaving] = useState(false);
  const [rsvpAutoSaveState, setRsvpAutoSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [rsvpConfigDirty, setRsvpConfigDirty] = useState(false);
  const [rsvpConflicts, setRsvpConflicts] = useState<RsvpConflict[]>([]);
  const [rsvpConflictHistory, setRsvpConflictHistory] = useState<RsvpConflict[]>([]);
  const [conflictFilter, setConflictFilter] = useState<'all' | 'error' | 'warning'>('all');
  const isGuestsReadOnly = !canManageGuests(guestsRole, guestsPermissions);
  const [showConflictDetails, setShowConflictDetails] = useState(false);
  const [resolvingConflictId, setResolvingConflictId] = useState<string | null>(null);
  const rsvpConfigLoadedRef = useRef(false);

  const rsvpAccessModePlan = useMemo(() => buildRsvpAccessModePlan({
    guestCount: guests.length,
    inviteTokenCount: guests.filter((guest) => Boolean(guest.invite_token)).length,
    householdCount: new Set(guests.map((guest) => guest.household_id).filter(Boolean)).size,
    eventCount: effectiveItineraryEvents.length,
  }), [effectiveItineraryEvents.length, guests]);

  const recommendedRsvpAccessMode = rsvpAccessModePlan.find((mode) => mode.status === 'recommended') ?? rsvpAccessModePlan[0];
  const rsvpQuestionTemplateCoverage = useMemo(() => buildRsvpQuestionTemplateCoverage(rsvpQuestions), [rsvpQuestions]);
  const rsvpSetupChecklist = useMemo(() => buildRsvpSetupChecklist({
    guestCount: guests.length,
    inviteTokenCount: guests.filter((guest) => Boolean(guest.invite_token)).length,
    householdCount: new Set(guests.map((guest) => guest.household_id).filter(Boolean)).size,
    eventCount: effectiveItineraryEvents.length,
    questions: rsvpQuestions,
    mealEnabled: rsvpMealEnabled,
    mealOptionCount: rsvpMealOptions.filter((option) => option.trim().length > 0).length,
  }), [effectiveItineraryEvents.length, guests, rsvpMealEnabled, rsvpMealOptions, rsvpQuestions]);

  const addRsvpQuestionTemplate = useCallback((template: RsvpQuestionTemplate) => {
    const alreadyExists = rsvpQuestions.some((question) => question.label.trim().toLowerCase() === template.label.toLowerCase());
    if (alreadyExists) {
      toast('That RSVP question is already in your list.', 'info');
      return;
    }

    setRsvpQuestions((prev) => [
      ...prev,
      createRsvpQuestionFromTemplate(template, `q_${Date.now().toString(36)}_${template.key}`),
    ]);
    setRsvpConfigDirty(true);
  }, [rsvpQuestions, toast]);

  const logGuestAction = (type: string, summary: string, metadata?: Record<string, unknown>, targetId?: string | null, targetLabel?: string | null) => {
    if (!weddingSiteId) return;
    void logAppAction({
      weddingSiteId,
      area: 'guests',
      type,
      summary,
      targetId,
      targetLabel,
      metadata,
    });
  };


  useEffect(() => {
    const preset = readStoredCampaignPreset();
    if (preset) {
      setCampaignPreset(preset);
      setFilterStatus(preset);
    }
    setFollowUpTasks(readStoredFollowUpTasks());

    try {
      const rawRole = readPlannerAccessRole('guests', weddingSiteId ?? 'global');
      if (rawRole) setGuestsRole(rawRole);
    } catch {
      // noop
    }
  }, [weddingSiteId]);

  useEffect(() => {
    writeStoredCampaignPreset(campaignPreset);
  }, [campaignPreset]);

  useEffect(() => {
    writeStoredFollowUpTasks(followUpTasks);
  }, [followUpTasks]);

  useEffect(() => {
    try {
      writePlannerAccessRole('guests', weddingSiteId ?? 'global', guestsRole);
    } catch {
      // noop
    }
  }, [guestsRole, weddingSiteId]);


  useEffect(() => {
    setCampaignLog(readStoredCampaignLog());
  }, []);

  useEffect(() => {
    writeStoredCampaignLog(campaignLog);
  }, [campaignLog]);

  const [viewMode, setViewMode] = useState<'list' | 'households'>('households');
  const [checkInMode, setCheckInMode] = useState(false);
  const [selectedGuestIds, setSelectedGuestIds] = useState<Set<string>>(new Set());
  const [householdBusy, setHouseholdBusy] = useState(false);

  const [csvPreview, setCsvPreview] = useState<Record<string, unknown>[] | null>(null);
  const [csvSkipped, setCsvSkipped] = useState<string[]>([]);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvUnknownEvents, setCsvUnknownEvents] = useState<string[]>([]);
  const [csvDuplicateNames, setCsvDuplicateNames] = useState<string[]>([]);
  const [csvHouseholdWarnings, setCsvHouseholdWarnings] = useState<string[]>([]);
  const [csvSelectedFilename, setCsvSelectedFilename] = useState<string | null>(null);
  const [csvMappingSummary, setCsvMappingSummary] = useState<{ core: string[]; rsvp: string[]; household: string[]; eventCols: string[]; weak: string[] }>({ core: [], rsvp: [], household: [], eventCols: [], weak: [] });
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvDataRows, setCsvDataRows] = useState<string[][]>([]);
  const [csvColumnSamples, setCsvColumnSamples] = useState<string[]>([]);
  const [csvFieldMap, setCsvFieldMap] = useState<CsvFieldMap | null>(null);
  const [csvShowMapper, setCsvShowMapper] = useState(false);
  const [csvImportSummary, setCsvImportSummary] = useState<{ imported: number; skipped: number; unknownEvents: number; duplicateNames: number; guardedHouseholds: number; householdKeys: number } | null>(null);
  const csvFileInputRef = useRef<HTMLInputElement | null>(null);
  const [showInsights, setShowInsights] = useState(false);
  const cleanGuestsView = !showInsights;
  const csvNameMappingValid = isCsvNameMappingValid(csvFieldMap);

  const [itineraryDrawerGuest, setItineraryDrawerGuest] = useState<GuestWithRSVP | null>(null);
  const [itineraryEvents, setItineraryEvents] = useState<ItineraryEvent[]>([]);
  const [guestEventIds, setGuestEventIds] = useState<Set<string>>(new Set());
  const [loadingDrawer, setLoadingDrawer] = useState(false);
  const [togglingEventId, setTogglingEventId] = useState<string | null>(null);
  const [guestAuditEntries, setGuestAuditEntries] = useState<GuestAuditEntry[]>([]);
  const [rsvpAuditFeed, setRsvpAuditFeed] = useState<GuestAuditEntry[]>([]);
  const [rsvpAuditLoading, setRsvpAuditLoading] = useState(false);
  const [assistedRsvpGuest, setAssistedRsvpGuest] = useState<GuestWithRSVP | null>(null);
  const [assistedRsvpStatus, setAssistedRsvpStatus] = useState<AssistedRsvpStatus>('confirmed');
  const [assistedRsvpSource, setAssistedRsvpSource] = useState<AssistedRsvpSource>('phone');
  const [assistedRsvpNotes, setAssistedRsvpNotes] = useState('');
  const [assistedRsvpSaving, setAssistedRsvpSaving] = useState(false);

  const [formData, setFormData] = useState<GuestFormData>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    plus_one_allowed: false,
    require_plus_one_name: false,
    invited_to_ceremony: true,
    invited_to_reception: true,
  });
  const [formEventInviteIds, setFormEventInviteIds] = useState<Set<string>>(new Set());

  const fetchWeddingSite = useCallback(async () => {
    if (!user) {
      setWeddingSiteId(null);
      setWeddingSiteInfo(null);
      setGuests([]);
      return;
    }

    if (isDemoMode) {
      setWeddingSiteId(demoWeddingSite.id);
      const demoRsvpConfig = readStoredDemoRsvpConfig();
      setRsvpQuestions(demoRsvpConfig.questions);
      setRsvpMealEnabled(demoRsvpConfig.mealEnabled);
      setRsvpMealOptions(demoRsvpConfig.mealOptions);
      rsvpConfigLoadedRef.current = true;
      return;
    }

    try {
      const siteLoad = await loadGuestDashboardSite(user.id);
      setGuestsRole(siteLoad.role);
      setGuestsPermissions(siteLoad.permissions);

      if (siteLoad.siteInfo) {
        setWeddingSiteId(siteLoad.siteInfo.id);
        setWeddingSiteInfo(siteLoad.siteInfo);
        setRsvpQuestions(siteLoad.rsvpQuestions);
        setRsvpMealEnabled(siteLoad.rsvpMealEnabled);
        setRsvpMealOptions(siteLoad.rsvpMealOptions);
        if (siteLoad.reminderCadenceDays) setReminderCadenceDays(siteLoad.reminderCadenceDays);
        setAutoRemindersEnabled(siteLoad.autoRemindersEnabled);
        rsvpConfigLoadedRef.current = true;
      } else {
        setWeddingSiteId(null);
        setWeddingSiteInfo(null);
        setGuests([]);
      }
    } catch {
      setWeddingSiteId(null);
      setWeddingSiteInfo(null);
      setGuests([]);
      toast('Couldn’t load guest site settings right now. Please try again.', 'error');
    }
  }, [user, isDemoMode]);

  const fetchGuests = useCallback(async () => {
    if (!weddingSiteId) return;

    setLoading(true);
    try {
      if (isDemoMode) {
        const guestsWithRsvps = demoGuests.map(guest => ({
          ...guest,
          phone: null,
          plus_one_allowed: false,
          plus_one_name: null,
          rsvp_received_at: hasRespondedRsvpStatus(guest.rsvp_status) ? new Date().toISOString() : null,
          rsvp: demoRSVPs.find(r => r.guest_id === guest.id),
        }));
        setGuests(guestsWithRsvps as unknown as GuestWithRSVP[]);
        setRsvpConflicts([]);
        setRsvpConflictHistory([]);
        setLoading(false);
        return;
      }

      const rows = await loadGuestDashboardRows(weddingSiteId);
      setGuests(rows.guests);
      setRsvpConflicts(rows.conflicts);
      setRsvpConflictHistory(rows.conflictHistory);
    } catch {
      setGuests([]);
      setRsvpConflicts([]);
      setRsvpConflictHistory([]);
      toast('Couldn’t load guest records right now. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  }, [weddingSiteId, isDemoMode]);

  useEffect(() => {
    fetchWeddingSite();
  }, [fetchWeddingSite]);

  useEffect(() => {
    if (weddingSiteId) {
      fetchGuests();
    }
  }, [weddingSiteId, fetchGuests]);

  useEffect(() => {
    let cancelled = false;

    async function loadItineraryFilterData() {
      if (!weddingSiteId || isDemoMode) {
        if (!cancelled) {
          setItineraryFilterEvents([]);
          setEventInviteGuestMap(new Map());
        }
        return;
      }

      try {
        if (cancelled) return;

        const filters = await loadGuestItineraryFilters(weddingSiteId);
        if (cancelled) return;
        setItineraryEvents(filters.events);
        setItineraryFilterEvents(filters.filterEvents);
        setEventInviteGuestMap(filters.eventInviteGuestMap);
      } catch {
        if (!cancelled) {
          toast('Couldn’t load itinerary filters right now. Please try again.', 'error');
          setItineraryFilterEvents([]);
          setEventInviteGuestMap(new Map());
        }
      }
    }

    void loadItineraryFilterData();
    return () => {
      cancelled = true;
    };
  }, [weddingSiteId, isDemoMode]);

  useEffect(() => {
    let cancelled = false;

    async function loadRsvpAuditFeed() {
      if (guestsTab !== 'rsvp-config') return;

      setRsvpAuditLoading(true);
      try {
        if (isDemoMode) {
          const now = Date.now();
          const demoEntries: GuestAuditEntry[] = guests.slice(0, 4).map((g, idx) => ({
            id: `demo-rsvp-audit-${g.id}-${idx}`,
            guest_id: g.id,
            action: idx % 3 === 0 ? 'insert' : 'update',
            changed_at: new Date(now - (idx + 1) * 1000 * 60 * 35).toISOString(),
            changed_by: null,
            old_data: { rsvp_status: 'pending', name: g.name },
            new_data: { rsvp_status: g.rsvp_status, name: g.name },
          }));
          if (!cancelled) setRsvpAuditFeed(demoEntries);
          return;
        }

        if (!weddingSiteId) {
          if (!cancelled) setRsvpAuditFeed([]);
          return;
        }

        const auditRows = await loadGuestRsvpAuditFeed(weddingSiteId);
        if (!cancelled) setRsvpAuditFeed(auditRows);
      } catch {
        if (!cancelled) {
          setRsvpAuditFeed([]);
          toast('Couldn’t load RSVP history right now. Please try again.', 'error');
        }
      } finally {
        if (!cancelled) setRsvpAuditLoading(false);
      }
    }

    void loadRsvpAuditFeed();
    return () => {
      cancelled = true;
    };
  }, [guestsTab, isDemoMode, guests, weddingSiteId]);

  const visibleRsvpConflicts = useMemo(
    () => rsvpConflicts.filter((c) => conflictFilter === 'all' ? true : c.severity === conflictFilter),
    [rsvpConflicts, conflictFilter]
  );

  const rsvpConflictStats = useMemo<RsvpConflictStats>(() => {
    return getGuestRsvpConflictStats({ conflicts: rsvpConflicts, history: rsvpConflictHistory });
  }, [rsvpConflicts, rsvpConflictHistory]);

  const resolveConflict = useCallback(async (conflictId: string) => {
    setResolvingConflictId(conflictId);
    try {
      if (isDemoMode) {
        setRsvpConflicts((prev) => prev.filter((c) => c.id !== conflictId));
        setRsvpConflictHistory((prev) => prev.map((c) => c.id === conflictId ? { ...c, resolved: true, resolved_at: new Date().toISOString() } : c));
        return;
      }
      await resolveGuestRsvpConflict(conflictId);
      setRsvpConflicts((prev) => prev.filter((c) => c.id !== conflictId));
      setRsvpConflictHistory((prev) => prev.map((c) => c.id === conflictId ? { ...c, resolved: true, resolved_at: new Date().toISOString() } : c));
      toast('RSVP item marked done', 'success');
    } catch {
      toast('Couldn’t mark that RSVP item done.', 'error');
    } finally {
      setResolvingConflictId(null);
    }
  }, [isDemoMode, toast]);

  const resolveAllVisibleConflicts = useCallback(async () => {
    if (visibleRsvpConflicts.length === 0) return;
    setResolvingConflictId('all');
    try {
      const ids = visibleRsvpConflicts.map((c) => c.id);
      if (!isDemoMode) {
        await resolveGuestRsvpConflicts(ids);
      }
      setRsvpConflicts((prev) => prev.filter((c) => !ids.includes(c.id)));
      setRsvpConflictHistory((prev) => prev.map((c) => ids.includes(c.id) ? { ...c, resolved: true, resolved_at: new Date().toISOString() } : c));
      toast(`${ids.length} RSVP item${ids.length === 1 ? '' : 's'} marked done`, 'success');
    } catch {
      toast('Couldn’t mark those RSVP items done.', 'error');
    } finally {
      setResolvingConflictId(null);
    }
  }, [isDemoMode, toast, visibleRsvpConflicts]);

  const handleSaveRsvpConfig = async () => {
    setRsvpConfigSaving(true);
    try {
      const cleanedConfig = cleanGuestRsvpConfig({
        questions: rsvpQuestions,
        mealEnabled: rsvpMealEnabled,
        mealOptions: rsvpMealOptions,
      });
      if (cleanedConfig.validationError) {
        toast(cleanedConfig.validationError, 'error');
        return;
      }

      if (isDemoMode || !weddingSiteId) {
        writeStoredDemoRsvpConfig({ questions: cleanedConfig.questions, mealEnabled: rsvpMealEnabled, mealOptions: cleanedConfig.mealOptions });
        setRsvpQuestions(cleanedConfig.questions);
        toast('RSVP settings saved (demo).', 'success');
        setRsvpAutoSaveState('saved');
        setRsvpConfigDirty(false);
        return;
      }

      await saveGuestRsvpConfig(weddingSiteId, cleanedConfig.questions, rsvpMealEnabled, cleanedConfig.mealOptions);
      setRsvpQuestions(cleanedConfig.questions);
      toast('RSVP settings saved.', 'success');
      setRsvpAutoSaveState('saved');
      setRsvpConfigDirty(false);
    } catch (err) {
      setRsvpAutoSaveState('error');
      toast(safeGuestsDashboardError(err, 'Couldn’t save RSVP settings.'), 'error');
    } finally {
      setRsvpConfigSaving(false);
    }
  };


  const autoSaveTimer = useRef<number | null>(null);
  useEffect(() => {
    if (guestsTab !== 'rsvp-config') return;
    if (!rsvpConfigLoadedRef.current) return;
    if (!rsvpConfigDirty) return;

    const hasDraftQuestion = rsvpQuestions.some((q) => q.label.trim().length === 0);
    if (hasDraftQuestion) {
      setRsvpAutoSaveState('idle');
      if (autoSaveTimer.current) window.clearTimeout(autoSaveTimer.current);
      return;
    }

    setRsvpAutoSaveState('saving');

    if (autoSaveTimer.current) window.clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = window.setTimeout(() => {
      handleSaveRsvpConfig();
    }, 700);

    return () => {
      if (autoSaveTimer.current) window.clearTimeout(autoSaveTimer.current);
    };
  }, [guestsTab, rsvpConfigDirty, rsvpQuestions, rsvpMealEnabled, rsvpMealOptions]);

  const generateSecureToken = async (): Promise<string> => {
    const { data, error } = await supabase.rpc('generate_secure_token', { byte_length: 32 });
    if (!error && data) return data as string;

    // Fallback for environments where the RPC is missing.
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  };

  const generateLocalInviteToken = () => `demo_${Math.random().toString(36).slice(2, 14)}`;

  const handleAddGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGuestsReadOnly) {
      toast('Viewer mode is read-only.', 'info');
      return;
    }
    if (!weddingSiteId) return;

    let createdGuestId: string | null = null;

    try {
      if (isDemoMode) {
        const newGuest = buildDemoGuestFromForm({ formData, id: `demo-${Date.now()}`, inviteToken: generateLocalInviteToken() });

        setGuests(prev => [newGuest, ...prev]);
        setShowAddModal(false);
        resetForm();
        toast(`${formData.first_name} ${formData.last_name} added`, 'success');
        return;
      }

      const inviteToken = await generateSecureToken();
      const { invitedToCeremony, invitedToReception, realEventIds } = buildGuestFormEventSelection(formEventInviteIds);

      createdGuestId = await createGuest({
        weddingSiteId,
        firstName: formData.first_name,
        lastName: formData.last_name,
        email: formData.email || null,
        phone: formData.phone || null,
        plusOneAllowed: formData.plus_one_allowed,
        invitedToCeremony,
        invitedToReception,
        inviteToken,
      });
      await insertEventInvitations(toEventInvitationRows(createdGuestId, realEventIds));

      await fetchGuests();
      setShowAddModal(false);
      resetForm();
      toast(`${formData.first_name} ${formData.last_name} added`, 'success');
    } catch (err) {
      if (createdGuestId) {
        await deleteGuestById(createdGuestId);
      }
      toast(safeGuestsDashboardError(err, 'Couldn’t add guest. Please try again.'), 'error');
    }
  };

  const handleEditGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGuestsReadOnly) {
      toast('Viewer mode is read-only.', 'info');
      return;
    }
    if (!editingGuest) return;

    const previousGuestValues = buildGuestPreviousValues(editingGuest);
    let eventInvitationRollback: GuestEventInvitationRollback | null = null;
    let guestUpdated = false;
    let invitesCleared = false;

    try {
      if (isDemoMode) {
        setGuests(prev => prev.map(guest => (
          guest.id === editingGuest.id
            ? applyGuestFormToDemoGuest(guest, formData)
            : guest
        )));
        setEditingGuest(null);
        resetForm();
        toast('Guest updated', 'success');
        return;
      }

      const { invitedToCeremony, invitedToReception, realEventIds } = buildGuestFormEventSelection(formEventInviteIds);

      await updateGuest({
        guestId: editingGuest.id,
        firstName: formData.first_name,
        lastName: formData.last_name,
        name: `${formData.first_name} ${formData.last_name}`,
        email: formData.email || null,
        phone: formData.phone || null,
        plusOneAllowed: formData.plus_one_allowed,
        invitedToCeremony,
        invitedToReception,
      });
      guestUpdated = true;

      eventInvitationRollback = await replaceGuestEventInvitations(editingGuest.id, realEventIds);
      invitesCleared = true;

      await fetchGuests();
      setEditingGuest(null);
      resetForm();
      toast('Guest updated', 'success');
    } catch {
      if (!isDemoMode) {
        if (invitesCleared && eventInvitationRollback) {
          await restoreGuestEventInvitations(editingGuest.id, eventInvitationRollback);
        }
        if (guestUpdated) {
          await updateGuest({
            guestId: editingGuest.id,
            firstName: previousGuestValues.first_name,
            lastName: previousGuestValues.last_name,
            name: previousGuestValues.name,
            email: previousGuestValues.email,
            phone: previousGuestValues.phone,
            plusOneAllowed: previousGuestValues.plus_one_allowed,
            invitedToCeremony: previousGuestValues.invited_to_ceremony,
            invitedToReception: previousGuestValues.invited_to_reception,
          });
        }
      }
      toast('Couldn’t update guest. Please try again.', 'error');
    }
  };

  const [deletingGuestId, setDeletingGuestId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDeleteGuest = async (guestId: string) => {
    if (isGuestsReadOnly) {
      toast('Viewer mode is read-only.', 'info');
      return;
    }
    if (confirmDeleteId !== guestId) {
      setConfirmDeleteId(guestId);
      setTimeout(() => setConfirmDeleteId(null), 3000);
      return;
    }

    setDeletingGuestId(guestId);
    setConfirmDeleteId(null);
    const guest = guests.find((candidate) => candidate.id === guestId);
    try {
      if (isDemoMode) {
        setGuests(prev => prev.filter(guest => guest.id !== guestId));
        toast('Guest removed', 'success');
        return;
      }

      const { invitationCount } = await deleteGuestWithDependencies(guestId);

      await fetchGuests();
      logGuestAction('guest_deleted', 'Guest was deleted from the guest list.', {
        hadRsvp: Boolean(guest?.rsvp),
        hadEmail: Boolean(guest?.email),
        hadPhone: Boolean(guest?.phone),
        invitationCount,
      }, guestId, guest?.name || 'Guest');
      toast('Guest removed', 'success');
    } catch {
      toast('Couldn’t remove guest. Please try again.', 'error');
    } finally {
      setDeletingGuestId(null);
    }
  };

  const [lastCheckIn, setLastCheckIn] = useState<GuestLastCheckIn | null>(null);

  const handleSendInvitation = async (guest: GuestWithRSVP) => {
    if (isGuestsReadOnly) {
      toast('Your collaborator role cannot send guest invitations.', 'info');
      return;
    }
    if (!guest.email) {
      toast('This guest has no email address', 'error');
      return;
    }
    if (isDemoMode) {
      toast('Demo: invitation send simulated (no real email sent)', 'success');
      return;
    }

    setSendingInviteId(guest.id);
    try {
      const invitationPayload = buildGuestInvitationPayload({ guest, weddingSiteId, weddingSiteInfo });
      await sendWeddingInvitation(invitationPayload);

      await updateGuestInvitationTimestamps(guest.id, { invitation_sent_at: new Date().toISOString() });

      toast(`Invitation sent to ${invitationPayload.guestName}`, 'success');
    } catch {
      toast('Couldn’t send invitation. Please try again.', 'error');
    } finally {
      setSendingInviteId(null);
    }
  };

  const handleCopyExceptionChecklist = async () => {
    const lines = buildRsvpExceptionChecklistLines({ guests: filteredGuests, exceptionStateByGuest });
    if (lines.length === 0) {
      toast('No RSVP exceptions in this segment.', 'error');
      return;
    }
    const payload = lines.join('\n');
    const result = await copyTextOrDownload(payload, 'dayof-rsvp-exception-checklist.txt');
    if (result === 'copied') {
      toast(`Copied RSVP exception checklist for ${lines.length} guest${lines.length === 1 ? '' : 's'}`, 'success');
    } else {
      toast('Clipboard was blocked, so the exception checklist downloaded.', 'success');
    }
  };

  const handleCopyMissingMealChecklist = async () => {
    const lines = buildMissingMealChecklistLines(filteredGuests);
    if (lines.length === 0) {
      toast('No missing meal choices in this segment.', 'error');
      return;
    }
    const payload = lines.join('\n');
    const result = await copyTextOrDownload(payload, 'dayof-meal-follow-up-checklist.txt');
    if (result === 'copied') {
      toast(`Copied meal follow-up checklist for ${lines.length} guest${lines.length === 1 ? '' : 's'}`, 'success');
    } else {
      toast('Clipboard was blocked, so the meal checklist downloaded.', 'success');
    }
  };

  const handleCopyNoContactChecklist = async () => {
    const lines = buildNoContactChecklistLines(filteredGuests);
    if (lines.length === 0) {
      toast('Everyone in this group has a contact path.', 'error');
      return;
    }
    const payload = lines.join('\n');
    const result = await copyTextOrDownload(payload, 'dayof-missing-contact-list.txt');
    if (result === 'copied') {
      toast(`Copied missing-contact list for ${lines.length} guest${lines.length === 1 ? '' : 's'}`, 'success');
    } else {
      toast('Clipboard was blocked, so the missing-contact list downloaded.', 'success');
    }
  };

  const handleCopyFilteredEmails = async () => {
    const emails = buildFilteredEmailList(reminderCandidates);
    if (emails.length === 0) {
      toast('No emails available in this filtered segment.', 'error');
      return;
    }
    const payload = emails.join(', ');
    const result = await copyTextOrDownload(payload, 'dayof-filtered-guest-emails.txt');
    if (result === 'copied') {
      toast(`Copied ${emails.length} email${emails.length === 1 ? '' : 's'}`, 'success');
    } else {
      toast('Clipboard was blocked, so the filtered emails downloaded.', 'success');
    }
  };

  const applyCampaignPreset = (preset: 'pending' | 'missing-meal' | 'plusone-missing' | 'ceremony-no' | 'reception-no' | 'pending-no-email') => {
    setCampaignPreset(preset);
    setFilterStatus(preset);
    setViewMode('list');
    setSearchQuery('');
  };
  const addFollowUpTask = (text: string) => {
    const task = buildFollowUpTask({ now: new Date(), text });
    setFollowUpTasks((prev) => [task, ...prev].slice(0, 6));
    toast('Follow-up task captured', 'success');
  };


  const generateChecklistTasks = () => {
    const tasks = buildGeneratedFollowUpTasks({ now: new Date(), rsvpOps, contactStats });

    if (tasks.length === 0) {
      toast('No blockers right now. Great shape!', 'success');
      return;
    }
    setFollowUpTasks((prev) => [...tasks, ...prev].slice(0, 12));
    toast(`Created ${tasks.length} follow-up task${tasks.length === 1 ? '' : 's'}`, 'success');
  };

  const handleSendSelectedInvitations = async () => {
    const selectedRecipients = guests.filter(g => selectedGuestIds.has(g.id) && !!g.email && !!g.invite_token);
    if (selectedRecipients.length === 0) {
      toast('No selected guests with email and RSVP link.', 'error');
      return;
    }

    const confirmed = await requestConfirmation({
      title: 'Send selected reminders?',
      description: `This will email RSVP reminders to ${selectedRecipients.length} selected ${selectedRecipients.length === 1 ? 'guest' : 'guests'}. You can review and edit the message before sending.`,
      confirmLabel: 'Send reminders',
    });
    if (!confirmed) return;

    if (isDemoMode) {
      toast(`Demo: simulated reminders for ${selectedRecipients.length} selected guests`, 'success');
      return;
    }

    setBulkSending(true);
    try {
      const { successCount, failedCount } = await sendGuestInvitationBatch({
        guests: selectedRecipients,
        weddingSiteId,
        weddingSiteInfo,
        sendInvitation: sendWeddingInvitation,
        updateTimestamps: updateGuestInvitationTimestamps,
        timestampFields: (sentAtIso) => ({ invitation_sent_at: sentAtIso, reminder_last_sent_at: sentAtIso }),
      });
      if (successCount > 0) {
        await fetchGuests();
      }
      const summary = buildGuestReminderSendSummary({ successCount, failedCount, label: 'selected reminder', emptyMessage: 'No selected reminders were sent.' });
      toast(summary.message, summary.variant);
    } finally {
      setBulkSending(false);
    }
  };

const handleSendBulkInvitations = async () => {
    if (isGuestsReadOnly) {
      toast('Your collaborator role cannot send guest reminders from this view.', 'info');
      return;
    }
    if (reminderCandidates.length === 0) {
      toast('No reminder recipients in this filtered view.', 'error');
      return;
    }

    const confirmed = await requestConfirmation({
      title: 'Send RSVP reminder campaign?',
      description: buildGuestReminderCampaignConfirmDescription({
        segmentLabel: segmentLabelMap[filterStatus] || filterStatus,
        recipientCount: reminderCandidates.length,
        skipRecentlyInvited,
        noContactCount: contactStats.withNoContact,
        recipients: reminderCandidates,
      }),
      confirmLabel: 'Send campaign',
    });
    if (!confirmed) return;

    if (isDemoMode) {
      setCampaignLog(prev => [buildGuestCampaignLogEntry({ now: new Date(), segment: segmentLabelMap[filterStatus] || filterStatus, count: reminderCandidates.length }), ...prev].slice(0, 6));
      toast(`Demo: simulated reminders for ${reminderCandidates.length} guests`, 'success');
      return;
    }

    setBulkSending(true);

    try {
      const { successCount, failedCount } = await sendGuestInvitationBatch({
        guests: reminderCandidates,
        weddingSiteId,
        weddingSiteInfo,
        sendInvitation: sendWeddingInvitation,
        updateTimestamps: updateGuestInvitationTimestamps,
        timestampFields: (sentAtIso) => ({ invitation_sent_at: sentAtIso, reminder_last_sent_at: sentAtIso }),
      });

      if (successCount > 0) {
        setCampaignLog(prev => [buildGuestCampaignLogEntry({ now: new Date(), segment: segmentLabelMap[filterStatus] || filterStatus, count: successCount }), ...prev].slice(0, 6));
        const summary = buildGuestReminderSendSummary({ successCount, failedCount, label: 'reminder', emptyMessage: 'No reminders were sent. Please try again.' });
        toast(summary.message, summary.variant);
        await fetchGuests();
      } else {
        const summary = buildGuestReminderSendSummary({ successCount, failedCount, label: 'reminder', emptyMessage: 'No reminders were sent. Please try again.' });
        toast(summary.message, summary.variant);
      }
    } finally {
      setBulkSending(false);
    }
  };

  const handleSendDueRemindersNow = async () => {
    if (isGuestsReadOnly) {
      toast('Your collaborator role cannot send due reminders.', 'info');
      return;
    }
    if (dueReminderCandidatesGlobal.length === 0) {
      toast('No guests are currently due for reminders.', 'error');
      return;
    }

    const confirmed = await requestConfirmation({
      title: 'Send due reminders now?',
      description: `This will email ${dueReminderCandidatesGlobal.length} ${dueReminderCandidatesGlobal.length === 1 ? 'guest' : 'guests'} who are ready for another reminder after ${reminderCadenceDays} days.`,
      confirmLabel: 'Send due reminders',
    });
    if (!confirmed) return;

    if (isDemoMode) {
      setCampaignLog(prev => [buildGuestCampaignLogEntry({ now: new Date(), segment: 'Due Reminder', count: dueReminderCandidatesGlobal.length }), ...prev].slice(0, 6));
      toast(`Demo: simulated reminders for ${dueReminderCandidatesGlobal.length} due guests`, 'success');
      return;
    }

    setBulkSending(true);
    try {
      const { successCount, failedCount } = await sendGuestInvitationBatch({
        guests: dueReminderCandidatesGlobal,
        weddingSiteId,
        weddingSiteInfo,
        sendInvitation: sendWeddingInvitation,
        updateTimestamps: updateGuestInvitationTimestamps,
        timestampFields: (sentAtIso) => ({ reminder_last_sent_at: sentAtIso }),
      });

      if (successCount > 0) {
        setCampaignLog(prev => [buildGuestCampaignLogEntry({ now: new Date(), segment: 'Due Reminder', count: successCount }), ...prev].slice(0, 6));
        const summary = buildGuestReminderSendSummary({ successCount, failedCount, label: 'due reminder', emptyMessage: 'No due reminders were sent. Please try again.' });
        toast(summary.message, summary.variant);
        await fetchGuests();
      } else {
        const summary = buildGuestReminderSendSummary({ successCount, failedCount, label: 'due reminder', emptyMessage: 'No due reminders were sent. Please try again.' });
        toast(summary.message, summary.variant);
      }
    } finally {
      setBulkSending(false);
    }
  };

  async function handleMergeIntoHousehold() {
    if (selectedGuestIds.size < 2 || !weddingSiteId || isDemoMode) return;
    setHouseholdBusy(true);
    try {
      const ids = [...selectedGuestIds];
      const householdId = ids[0];
      await updateGuestsForSite(weddingSiteId, ids, { household_id: householdId });
      await fetchGuests();
      setSelectedGuestIds(new Set());
      toast(`${ids.length} guests merged into one household`, 'success');
    } catch {
      toast('Couldn’t merge guests.', 'error');
    } finally {
      setHouseholdBusy(false);
    }
  }

  async function handleSplitFromHousehold(guestId: string) {
    if (!weddingSiteId || isDemoMode) return;
    setHouseholdBusy(true);
    try {
      await updateGuestForSite(weddingSiteId, guestId, { household_id: null });
      await fetchGuests();
      toast('Guest removed from household', 'success');
    } catch {
      toast('Couldn’t remove guest from household.', 'error');
    } finally {
      setHouseholdBusy(false);
    }
  }

  async function handleReassignHousehold(guestId: string, newHouseholdId: string) {
    if (!weddingSiteId || isDemoMode) return;
    try {
      await updateGuestForSite(weddingSiteId, guestId, { household_id: newHouseholdId || null });
      await fetchGuests();
      toast('Guest reassigned', 'success');
    } catch {
      toast('Couldn’t move guest to that household.', 'error');
    }
  }

  const persistReminderSettings = async (patch: { reminder_cadence_days?: 1 | 3 | 7; auto_reminders_enabled?: boolean }) => {
    if (!weddingSiteId || isDemoMode) return;
    await saveGuestReminderSettings(weddingSiteId, patch);
  };

  async function openItineraryDrawer(guest: GuestWithRSVP) {
    if (!weddingSiteId) return;
    setItineraryDrawerGuest(guest);
    setLoadingDrawer(true);
    try {
      if (isDemoMode) {
        const now = Date.now();
        setItineraryEvents(effectiveItineraryEvents);
        setGuestEventIds(new Set(effectiveItineraryEvents
          .filter((event) => {
            if (event.id === 'legacy-ceremony') return guest.invited_to_ceremony;
            if (event.id === 'legacy-reception') return guest.invited_to_reception;
            return false;
          })
          .map((event) => event.id)));
        setGuestAuditEntries([
          { id: `${guest.id}-a1`, action: 'update', changed_at: new Date(now - 1000 * 60 * 90).toISOString(), changed_by: null, old_data: { rsvp_status: 'pending' }, new_data: { rsvp_status: guest.rsvp_status } },
          { id: `${guest.id}-a2`, action: 'update', changed_at: new Date(now - 1000 * 60 * 60 * 26).toISOString(), changed_by: null, old_data: { invited_to_reception: false }, new_data: { invited_to_reception: guest.invited_to_reception } },
        ]);
        setLoadingDrawer(false);
        return;
      }

      const details = await loadGuestDrawerDetails(weddingSiteId, guest.id);
      setItineraryEvents(details.events);
      setGuestEventIds(details.guestEventIds);
      setGuestAuditEntries(details.auditEntries);
    } catch {
      toast('Couldn’t load guest itinerary details right now. Please try again.', 'error');
    } finally {
      setLoadingDrawer(false);
    }
  }

  async function handleToggleEventInvite(eventId: string, currentlyInvited: boolean) {
    if (!itineraryDrawerGuest || togglingEventId) return;
    setTogglingEventId(eventId);
    try {
      await setGuestEventInvitation(itineraryDrawerGuest.id, eventId, !currentlyInvited);
      if (currentlyInvited) {
        setGuestEventIds(prev => { const n = new Set(prev); n.delete(eventId); return n; });
      } else {
        setGuestEventIds(prev => new Set([...prev, eventId]));
      }
    } catch {
      toast('Couldn’t update that event invite.', 'error');
    } finally {
      setTogglingEventId(null);
    }
  }

  const households = useMemo(() => buildGuestHouseholdGroups(guests), [guests]);

  const openAssistedRsvpModal = (guest: GuestWithRSVP) => {
    setAssistedRsvpGuest(guest);
    setAssistedRsvpStatus(isDeclinedRsvpStatus(guest.rsvp_status) ? 'declined' : 'confirmed');
    setAssistedRsvpSource('phone');
    setAssistedRsvpNotes('');
  };

  const handleSaveAssistedRsvp = async () => {
    if (isGuestsReadOnly) {
      toast('Your collaborator role cannot record assisted RSVPs.', 'info');
      return;
    }
    if (!assistedRsvpGuest) return;
    try {
      setAssistedRsvpSaving(true);
      const recordedAt = new Date().toISOString();
      const nextNotes = buildAssistedRsvpNotes({ source: assistedRsvpSource, notes: assistedRsvpNotes, recordedAt });

      if (isDemoMode) {
        setGuests((prev) => prev.map((guest) => guest.id === assistedRsvpGuest.id ? applyDemoAssistedRsvp(guest, assistedRsvpStatus, nextNotes, recordedAt) : guest));
        setAssistedRsvpGuest(null);
        toast('RSVP recorded for guest', 'success');
        return;
      }

      await saveAssistedGuestRsvp({
        guest: assistedRsvpGuest,
        status: assistedRsvpStatus,
        source: assistedRsvpSource,
        notes: assistedRsvpNotes,
        recordedAt,
      });
      await fetchGuests();
      setAssistedRsvpGuest(null);
      toast('RSVP recorded for guest', 'success');
    } catch {
      toast('Couldn’t save assisted RSVP.', 'error');
    } finally {
      setAssistedRsvpSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      plus_one_allowed: false,
      require_plus_one_name: false,
      invited_to_ceremony: true,
      invited_to_reception: true,
    });
    setFormEventInviteIds(new Set(effectiveItineraryEvents.map((e) => e.id)));
  };

  const openEditModal = (guest: GuestWithRSVP) => {
    if (isGuestsReadOnly) {
      toast('Viewer mode is read-only.', 'info');
      return;
    }
    setEditingGuest(guest);
    setFormData(buildGuestFormDataFromGuest(guest));
    setFormEventInviteIds(buildGuestEventInviteIdSet({ guest, events: effectiveItineraryEvents, eventInviteGuestMap }));
  };

  const handleDeleteAllGuests = async () => {
    if (!weddingSiteId || isDemoMode) {
      toast('Deleting the full guest list is unavailable in demo mode.', 'error');
      return;
    }

    const required = String(guests.length);
    if (deleteAllConfirmInput.trim() !== required) {
      toast(`Type ${required} to confirm deletion.`, 'error');
      return;
    }

    setDeleteAllBusy(true);
    try {
      const { guestIds } = await deleteAllGuestsForSite(weddingSiteId);

      await fetchGuests();
      setSelectedGuestIds(new Set());
      setShowDeleteAllModal(false);
      setDeleteAllConfirmInput('');
      logGuestAction('guest_list_deleted_bulk', 'All guests were deleted from the guest list.', {
        guestCount: guestIds.length,
      }, weddingSiteId, 'Guest list');
      toast(`Deleted ${required} guests.`, 'success');
    } catch (err) {
      toast(safeGuestsDashboardError(err, 'Couldn’t delete all guests. Please try again.'), 'error');
    } finally {
      setDeleteAllBusy(false);
    }
  };

  const buildCsvPreviewFromMapping = useCallback(async (headers: string[], dataRows: string[][], fieldMap: CsvFieldMap) => {
    if (!isCsvNameMappingValid(fieldMap)) {
      toast('Please map First Name + Last Name, or use Full Name instead.', 'error');
      return;
    }

    let resolvedSiteId = weddingSiteId;
    if (!resolvedSiteId && !isDemoMode) {
      resolvedSiteId = user?.id ? await resolveGuestDashboardSiteId(user.id) : null;
      if (resolvedSiteId) setWeddingSiteId(resolvedSiteId);
    }
    if (!resolvedSiteId && !isDemoMode) {
      toast('Couldn’t find your website right now. Refresh and try again.', 'error');
      return;
    }

    const result = buildGuestImportPreview({
      headers,
      dataRows,
      fieldMap,
      itineraryEvents,
      weddingSiteId: resolvedSiteId,
    });
    const parsed = result.parsed;

    if (parsed.length === 0) {
      setCsvUnknownEvents([]);
      setCsvDuplicateNames([]);
      toast('No guests could be read from this file. Check the name columns and try again.', 'error');
      return;
    }

    setCsvPreview(parsed);
    setCsvSkipped(result.skipped);
    setCsvUnknownEvents(result.unknownEvents);
    setCsvDuplicateNames(result.duplicateNames);
    setCsvShowMapper(false);
    setCsvHouseholdWarnings(result.householdWarnings);
    setCsvMappingSummary(result.mappingSummary);
    toast(buildGuestCsvPreviewToast({ parsedCount: parsed.length, skippedCount: result.skipped.length, unknownEventCount: result.unknownEvents.length, duplicateNameCount: result.duplicateNames.length, householdWarningCount: result.householdWarnings.length }), 'success');
  }, [isDemoMode, itineraryEvents, user?.id, weddingSiteId, toast]);

  const importCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isGuestsReadOnly) {
      toast('Your collaborator role is read-only for guest imports.', 'info');
      e.target.value = '';
      return;
    }

    const file = e.target.files?.[0];
    if (!file) {
      toast('Please choose a CSV file to import.', 'error');
      return;
    }
    setCsvSelectedFilename(file.name);
    toast(`Parsing ${file.name}…`, 'success');

    try {
      const { headers, dataRows, samples } = await readGuestImportRows(file);

      if (headers.length === 0 || dataRows.length === 0) {
        setCsvUnknownEvents([]);
        setCsvDuplicateNames([]);
        toast('File appears to be empty or missing a header row.', 'error');
        return;
      }

      const defaultMap = buildDefaultCsvFieldMap(headers);

      setCsvHeaders(headers);
      setCsvDataRows(dataRows);
      setCsvColumnSamples(samples);
      setCsvFieldMap(defaultMap);
      setCsvShowMapper(true);
    } catch (err) {
      setCsvUnknownEvents([]);
      setCsvDuplicateNames([]);
      toast(safeGuestImportReadError(err), 'error');
    } finally {
      e.target.value = '';
    }
  };

  const confirmCsvImport = async () => {
    if (!csvPreview) return;
    setCsvImporting(true);
    try {
      let resolvedSiteId = weddingSiteId;
      if (!resolvedSiteId && !isDemoMode) {
        resolvedSiteId = user?.id ? await resolveGuestDashboardSiteId(user.id) : null;
        if (resolvedSiteId) setWeddingSiteId(resolvedSiteId);
      }
      if (!resolvedSiteId && !isDemoMode) {
        toast('Couldn’t find your wedding site. Refresh and try again.', 'error');
        return;
      }
      if (isDemoMode) {
        const importedGuests = buildDemoImportedGuests({
          previewRows: csvPreview,
          now: Date.now(),
          createInviteToken: generateLocalInviteToken,
        });

        setGuests(prev => [...importedGuests, ...prev]);
        setCsvImportSummary({ imported: csvPreview?.length ?? 0, skipped: csvSkipped.length, unknownEvents: 0, duplicateNames: csvDuplicateNames.length, guardedHouseholds: 0, householdKeys: 0 });
        toast(buildGuestCsvImportToast({ importedCount: csvPreview.length, skippedCount: csvSkipped.length, unknownEventCount: 0 }), 'success');
        setCsvPreview(null);
        if (fromQuickStart && nextStep === 'photos') {
          navigate(buildQuickStartPhotosPath());
          return;
        }
        setCsvSkipped([]);
        setCsvUnknownEvents([]);
        setCsvDuplicateNames([]);
        setCsvHouseholdWarnings([]);
        setCsvSelectedFilename(null);
        setCsvMappingSummary({ core: [], rsvp: [], household: [], eventCols: [], weak: [] });
        return;
      }

      const guestsWithTokens: Array<Record<string, unknown>> = await Promise.all(
        csvPreview.map(async g => {
          const existingToken = (g.invite_token as string | null | undefined) ?? null;
          return {
            ...g,
            invite_token: existingToken && existingToken.length > 0 ? existingToken : await generateSecureToken(),
          };
        })
      );

      const guestRows = guestsWithTokens.map(stripImportedGuestInternalFields);

      const inserted = await insertImportedGuests(guestRows);
      const { keyToGuestIds, householdLastNames, eventInviteRows, rsvpRows } = buildImportedGuestSidecars({ rows: guestsWithTokens, inserted });

      let guardedHouseholds = 0;
      for (const [key, ids] of keyToGuestIds) {
        if (ids.length < 2) continue;
        const lastNames = householdLastNames.get(key) ?? new Set();
        if (key.startsWith('name:') && lastNames.size > 1) {
          guardedHouseholds += 1;
          continue;
        }
        await updateHouseholdGuestIds(ids[0], ids);
      }

      if (eventInviteRows.length > 0) {
        await insertEventInvitations(eventInviteRows);
      }

      if (rsvpRows.length > 0) {
        await replaceImportedGuestRsvps(rsvpRows);
      }

      await fetchGuests();
      setCsvImportSummary({ imported: csvPreview?.length ?? 0, skipped: csvSkipped.length, unknownEvents: csvUnknownEvents.length, duplicateNames: csvDuplicateNames.length, guardedHouseholds, householdKeys: keyToGuestIds.size });
      toast(buildGuestCsvImportToast({ importedCount: csvPreview.length, skippedCount: csvSkipped.length, unknownEventCount: csvUnknownEvents.length, householdKeyCount: keyToGuestIds.size, guardedHouseholdCount: guardedHouseholds, eventInviteCount: eventInviteRows.length }), 'success');
      setCsvPreview(null);
      if (fromQuickStart && nextStep === 'photos') {
        navigate(buildQuickStartPhotosPath());
        return;
      }
      setCsvSkipped([]);
      setCsvUnknownEvents([]);
      setCsvDuplicateNames([]);
      setCsvHouseholdWarnings([]);
      setCsvSelectedFilename(null);
      setCsvMappingSummary({ core: [], rsvp: [], household: [], eventCols: [], weak: [] });
    } catch (err) {
      toast(safeGuestsDashboardError(err, 'Couldn’t import guests. Please try again.'), 'error');
    } finally {
      setCsvImporting(false);
    }
  };

  const [skipRecentlyInvited, setSkipRecentlyInvited] = useState(true);
  const [reminderCadenceDays, setReminderCadenceDays] = useState<1 | 3 | 7>(3);
  const [autoRemindersEnabled, setAutoRemindersEnabled] = useState(false);
  const [showOpsMenu, setShowOpsMenu] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [deleteAllConfirmInput, setDeleteAllConfirmInput] = useState('');
  const [deleteAllBusy, setDeleteAllBusy] = useState(false);

  const isDueReminder = (guest: GuestWithRSVP) => {
    return isGuestDueReminder(guest, reminderCadenceDays);
  };

  const dueReminderGuestIds = getGuestDueReminderIds(guests, reminderCadenceDays);
  const dueThankYouGuestIds = getGuestDueThankYouIds(guests);
  const {
    handleClearAllCheckIns,
    handleMarkAllDueThankYous,
    handleMarkThankYouSent,
    handleToggleCheckIn,
    handleUndoLastCheckIn,
  } = useGuestDashboardCheckIns({
    dueThankYouGuestIds,
    fetchGuests,
    guests,
    isDemoMode,
    isGuestsReadOnly,
    lastCheckIn,
    requestConfirmation,
    setLastCheckIn,
    toast,
    weddingSiteId,
  });

  const filteredGuests = filterGuestDashboardGuests({
    dueThankYouGuestIds,
    eventInviteGuestMap,
    extraFilters,
    filterStatus,
    guests,
    isDueReminder,
    searchQuery,
  });

  const emailableFilteredGuests = filteredGuests.filter(g => !!g.email && !!g.invite_token);


  const daysToWedding = getDaysUntilGuestWedding(weddingSiteInfo?.wedding_date);


  const displayedGuests = sortGuestsForDisplay({
    guests: filteredGuests,
    sortByPriority,
    checkInMode,
    daysToWedding,
  });


  const nextUnresolvedGuest = displayedGuests.find((g) => getGuestIssueCount(g) > 0);

  const selectUnresolvedGuests = () => {
    const ids = getUnresolvedGuestIds(displayedGuests);
    const selectionToast = buildGuestSelectionToast({ count: ids.length, singularLabel: 'unresolved guest', pluralLabel: 'unresolved guests', emptyMessage: 'No unresolved guests in current view' });
    setSelectedGuestIds(new Set(ids));
    toast(selectionToast.message, selectionToast.variant);
  };

  const clearGuestSelection = () => {
    setSelectedGuestIds(new Set());
  };

  const selectFilteredGuests = () => {
    const ids = filteredGuests.map((g) => g.id);
    const selectionToast = buildGuestSelectionToast({ count: ids.length, singularLabel: 'guest in current filter', pluralLabel: 'guests in current filter', emptyMessage: 'No guests in current filter' });
    setSelectedGuestIds(new Set(ids));
    toast(selectionToast.message, selectionToast.variant);
  };

  const keepOnlyVisibleSelection = () => {
    setSelectedGuestIds((prev) => trimGuestSelectionToVisible({ selectedIds: prev, visibleGuests: filteredGuests }));
    toast('Selection trimmed to current filter', 'success');
  };

  const stats = getGuestDashboardStats(guests);

  const plannerHandoff = {
    title: 'Planner handoff guidance',
    detail: 'Work the queue, keep guest updates moving, and escalate sensitive calls back to the couple.',
  };

  const eventReport = buildGuestEventReport({ events: effectiveItineraryEvents, guests, eventInviteGuestMap });

  const mealChoiceRollup = getGuestMealChoiceRollup(guests);
  const customAnswerRollup = getGuestCustomAnswerRollup(guests);
  const songRequestEntries = getGuestSongRequestEntries(guests);


  const contactStats = getGuestContactStats(guests);

  const fallbackByGuest = buildGuestFallbackStateMap(filteredGuests);


  const householdStateByGuest = buildGuestHouseholdStateMap(filteredGuests);


  const mealSummary = getGuestMealSummary(filteredGuests);


  const exceptionStateByGuest = buildGuestExceptionStateMap(filteredGuests);

  const rsvpOps = getGuestRsvpOpsStats(guests);
  const recommendedAction = getGuestRecommendedAction(rsvpOps);
  const campaignReadiness = getGuestCampaignReadiness({ totalGuests: guests.length, contactStats, rsvpOps });
  const opsQueue = buildGuestOpsQueue(guests);


  const segmentLabelMap = GUEST_SEGMENT_LABELS;

  const dueReminderCandidatesGlobal = guests.filter((g) => !!g.email && !!g.invite_token && isDueReminder(g));

  const reminderCandidates = emailableFilteredGuests.filter((g: any) => {
    if (!skipRecentlyInvited) return true;
    return dueReminderGuestIds.has(g.id);
  });

  const {
    copyContactRequestLink,
    copySmsRsvpLinksForFiltered,
    exportAddressCollectionCSV,
    exportAttendingGuestsCSV,
    exportCheckedInCSV,
    exportCSV,
    exportDeclinedGuestsCSV,
    exportEventAttendanceCSV,
    exportFilteredCSV,
    exportHouseholdLabelsCSV,
    exportMissingMealCSV,
    exportPendingGuestsCSV,
    exportRsvpRespondersCSV,
    exportThankYouDueCSV,
  } = useGuestDashboardExports({
    dueThankYouGuestIds,
    effectiveItineraryEvents,
    eventInviteGuestMap,
    filteredGuests,
    guests,
    reminderCandidates,
    segmentLabel: segmentLabelMap[filterStatus] || filterStatus,
    toast,
    weddingSiteId,
    weddingSiteInfo,
  });

  const campaignDryRun = buildGuestCampaignDryRun({ guests: reminderCandidates, segmentLabel: segmentLabelMap[filterStatus] || filterStatus });


  if (loading) {
    return (
      <DashboardLayout currentPage="guests">
        <div className="max-w-[1100px] mx-auto">
          <DashboardStateBlock title="Loading guests…" description="Preparing your guest list and RSVP status." />
        </div>
      </DashboardLayout>
    );
  }

  if (guestsTab === 'rsvp-config') {
    return (
      <GuestRsvpSettingsView
        recommendedRsvpAccessMode={recommendedRsvpAccessMode}
        rsvpAccessModePlan={rsvpAccessModePlan}
        rsvpAuditFeed={rsvpAuditFeed}
        rsvpAuditLoading={rsvpAuditLoading}
        rsvpAutoSaveState={rsvpAutoSaveState}
        rsvpConfigSaving={rsvpConfigSaving}
        rsvpMealEnabled={rsvpMealEnabled}
        rsvpMealOptions={rsvpMealOptions}
        rsvpQuestionTemplateCoverage={rsvpQuestionTemplateCoverage}
        rsvpQuestions={rsvpQuestions}
        rsvpSetupChecklist={rsvpSetupChecklist}
        stats={stats}
        onAddRsvpQuestionTemplate={addRsvpQuestionTemplate}
        onSaveRsvpConfig={handleSaveRsvpConfig}
        onSetConfirmDialog={setConfirmDialog}
        onSetGuestsTab={setGuestsTab}
        onSetRsvpConfigDirty={setRsvpConfigDirty}
        onSetRsvpMealEnabled={setRsvpMealEnabled}
        onSetRsvpMealOptions={setRsvpMealOptions}
        onSetRsvpQuestions={setRsvpQuestions}
      />
    );
  }

  const canEditGuests = !isGuestsReadOnly;

  return (
    <DashboardLayout currentPage="guests">
      <div className="max-w-[1100px] mx-auto space-y-5">
        <GuestDashboardHeader
          canEditGuests={canEditGuests}
          contactCoverage={contactStats.contactCoverage}
          csvImportSummary={csvImportSummary}
          guestsRole={guestsRole}
          rsvpNoResponseCount={rsvpOps.noResponse}
          showInsights={showInsights}
          stats={stats}
          onAddGuest={() => setShowAddModal(true)}
          onSetGuestsTab={setGuestsTab}
          onToggleInsights={() => setShowInsights((value) => !value)}
        />


        {!cleanGuestsView && (
          <GuestSnapshotInsightsPanel
            contactStats={contactStats}
            customAnswerRollup={customAnswerRollup}
            eventReport={eventReport}
            mealChoiceRollup={mealChoiceRollup}
            mealSummary={mealSummary}
            rsvpOps={rsvpOps}
            songRequestEntries={songRequestEntries}
            stats={stats}
            onFocusCeremonyNo={() => { setSearchQuery(''); setFilterStatus('ceremony-no'); }}
            onFocusMissingMeal={() => { setSearchQuery(''); setFilterStatus('missing-meal'); setViewMode('list'); }}
            onFocusNoResponse={() => { setSearchQuery(''); setFilterStatus('pending'); }}
            onFocusPendingNoEmail={() => { setSearchQuery(''); setFilterStatus('pending-no-email'); setViewMode('list'); }}
            onFocusPlusOneMissing={() => { setSearchQuery(''); setFilterStatus('plusone-missing'); setViewMode('list'); }}
            onFocusReceptionNo={() => { setSearchQuery(''); setFilterStatus('reception-no'); }}
          />
        )}

        {!cleanGuestsView && (
          <GuestRsvpConflictPanels
            conflictFilter={conflictFilter}
            guests={guests}
            resolvingConflictId={resolvingConflictId}
            rsvpConflicts={rsvpConflicts}
            rsvpConflictStats={rsvpConflictStats}
            showConflictDetails={showConflictDetails}
            visibleRsvpConflicts={visibleRsvpConflicts}
            onResolveAllVisibleConflicts={resolveAllVisibleConflicts}
            onResolveConflict={resolveConflict}
            onReviewPending={() => { setFilterStatus('pending'); setViewMode('list'); }}
            onSetConflictFilter={setConflictFilter}
            onToggleConflictDetails={() => setShowConflictDetails((value) => !value)}
          />
        )}

        <Card variant="bordered" padding="lg">
          <div className="space-y-6">

            <GuestListStatusControls
              checkInCount={guests.filter((guest) => !!(guest as GuestWithRSVP & { checked_in_at?: string | null }).checked_in_at).length}
              checkInMode={checkInMode}
              cleanGuestsView={cleanGuestsView}
              exceptionReviewVisible={filteredGuests.some((guest) => (exceptionStateByGuest.get(guest.id) || []).length > 0) && filterStatus === 'all'}
              extraFilterCount={extraFilters.length}
              filterStatus={filterStatus}
              fromQuickStart={fromQuickStart}
              lastCheckInGuestName={lastCheckIn?.guestName ?? null}
              nextStep={nextStep}
              opsQueue={opsQueue}
              plannerHandoff={plannerHandoff}
              recommendedAction={recommendedAction}
              searchQuery={searchQuery}
              selectedGuestCount={selectedGuestIds.size}
              segmentLabel={segmentLabelMap[filterStatus] || filterStatus}
              stats={stats}
              viewMode={viewMode}
              visibleSelectedCount={filteredGuests.filter((guest) => selectedGuestIds.has(guest.id)).length}
              onClearFilters={() => { setFilterStatus('all'); setExtraFilters([]); setSearchQuery(''); setViewMode('list'); }}
              onClearGuestSelection={clearGuestSelection}
              onCopyContactRequestLink={copyContactRequestLink}
              onCopyExceptionChecklist={handleCopyExceptionChecklist}
              onCopyMissingMealChecklist={handleCopyMissingMealChecklist}
              onCopyNoContactChecklist={handleCopyNoContactChecklist}
              onFocusOpsItem={(filter, guestName) => { setFilterStatus(filter); setViewMode('list'); setSearchQuery(guestName); }}
              onFocusRecommended={(filter) => { setFilterStatus(filter); setViewMode('list'); setSearchQuery(''); }}
              onKeepVisibleSelection={keepOnlyVisibleSelection}
              onOpenCampaignModal={() => setShowCampaignModal(true)}
              onSaveRecommendedTask={(title) => addFollowUpTask(title)}
              onSelectSegment={(filter) => { setFilterStatus(filter); setExtraFilters([]); }}
              onSkipToPhotos={() => navigate(buildQuickStartPhotosPath())}
              onToggleCheckInMode={() => { setCheckInMode((value) => !value); setViewMode('list'); }}
              onToggleHouseholds={() => { setCheckInMode(false); setViewMode((value) => value === 'households' ? 'list' : 'households'); }}
              onUndoLastCheckIn={handleUndoLastCheckIn}
              onViewCheckedIn={() => setFilterStatus('checked-in')}
            />

            <GuestOpsToolbar
              autoRemindersEnabled={autoRemindersEnabled}
              bulkSending={bulkSending}
              canEditGuests={canEditGuests}
              csvFileInputRef={csvFileInputRef}
              csvImporting={csvImporting}
              csvMaxFileMb={Math.round(GUEST_IMPORT_MAX_FILE_BYTES / 1024 / 1024)}
              csvMaxRows={GUEST_IMPORT_MAX_ROWS}
              csvSelectedFilename={csvSelectedFilename}
              dueReminderCount={dueReminderCandidatesGlobal.length}
              guestCount={guests.length}
              hasNextUnresolvedGuest={Boolean(nextUnresolvedGuest)}
              isDemoMode={isDemoMode}
              reminderCandidateCount={reminderCandidates.length}
              searchQuery={searchQuery}
              selectedGuestCount={selectedGuestIds.size}
              showOpsMenu={showOpsMenu}
              onAddGuest={() => { resetForm(); setShowAddModal(true); }}
              onClearAllCheckIns={() => { void handleClearAllCheckIns(); }}
              onClearSelection={clearGuestSelection}
              onCopyAddressCollectionLink={copyContactRequestLink}
              onCopyChecklist={() => {
                void copyTextOrDownload(buildGuestChecklistMarkdown(followUpTasks), 'dayof-guest-checklist.md', 'text/markdown;charset=utf-8')
                  .then((result) => toast(result === 'copied' ? 'Copied checklist markdown' : 'Clipboard was blocked, so the checklist downloaded.', 'success'));
              }}
              onCopyFilteredEmails={() => { void handleCopyFilteredEmails(); }}
              onCopyMissingContactList={() => { void handleCopyNoContactChecklist(); }}
              onCopyTextRsvpLinks={() => { void copySmsRsvpLinksForFiltered(); }}
              onCreateChecklist={generateChecklistTasks}
              onDeleteAllGuests={() => {
                setDeleteAllConfirmInput('');
                setShowDeleteAllModal(true);
              }}
              onDryRun={() => {
                toast(`Dry run ready for ${reminderCandidates.length} ${reminderCandidates.length === 1 ? 'recipient' : 'recipients'}.`);
                void copyTextOrDownload(campaignDryRun.text, 'dayof-campaign-dry-run.txt');
              }}
              onExportAddressCollection={exportAddressCollectionCSV}
              onExportAllGuests={() => exportCSV()}
              onExportAttendingGuests={exportAttendingGuestsCSV}
              onExportCheckedInGuests={exportCheckedInCSV}
              onExportDeclinedGuests={exportDeclinedGuestsCSV}
              onExportEventAttendance={exportEventAttendanceCSV}
              onExportFilteredGuests={exportFilteredCSV}
              onExportHouseholdLabels={exportHouseholdLabelsCSV}
              onExportMissingMealChoices={exportMissingMealCSV}
              onExportPendingRsvp={exportPendingGuestsCSV}
              onExportRsvpResponders={exportRsvpRespondersCSV}
              onExportThankYouDue={exportThankYouDueCSV}
              onFileChange={importCSV}
              onMarkAllDueThankYous={() => { void handleMarkAllDueThankYous(); }}
              onNextUnresolved={() => {
                if (nextUnresolvedGuest) {
                  setSearchQuery((nextUnresolvedGuest.first_name || nextUnresolvedGuest.last_name) ? `${nextUnresolvedGuest.first_name ?? ''} ${nextUnresolvedGuest.last_name ?? ''}`.trim() : nextUnresolvedGuest.name);
                  setViewMode('list');
                }
              }}
              onSearchQueryChange={setSearchQuery}
              onSelectFiltered={selectFilteredGuests}
              onSelectUnresolved={selectUnresolvedGuests}
              onSendDueReminders={() => { void handleSendDueRemindersNow(); }}
              onSendFilteredInvitations={() => { void handleSendBulkInvitations(); }}
              onSendSelectedInvitations={() => { void handleSendSelectedInvitations(); }}
              onSetShowOpsMenu={setShowOpsMenu}
              onToggleAutoReminders={() => {
                const previous = autoRemindersEnabled;
                const next = !previous;
                setAutoRemindersEnabled(next);
                void persistReminderSettings({ auto_reminders_enabled: next })
                  .then(() => toast(next ? 'Auto reminders enabled' : 'Auto reminders paused', 'success'))
                  .catch(() => {
                    setAutoRemindersEnabled(previous);
                    toast('Couldn’t save auto reminder setting.', 'error');
                  });
              }}
            />

            {!cleanGuestsView && (
              <GuestCampaignReminderPanel
                campaignPreset={campaignPreset}
                campaignReadiness={campaignReadiness}
                contactNoContactCount={contactStats.withNoContact}
                daysToWedding={daysToWedding}
                manualFollowUpCount={filteredGuests.filter((guest) => fallbackByGuest.get(guest.id)?.state === 'manual-follow-up').length}
                manualHandledCount={filteredGuests.filter((guest) => fallbackByGuest.get(guest.id)?.state === 'manual-handled').length}
                reminderCandidates={reminderCandidates.map((guest) => ({
                  id: guest.id,
                  name: getGuestDisplayName(guest),
                  email: guest.email,
                }))}
                rsvpOps={rsvpOps}
                segmentLabel={segmentLabelMap[filterStatus] || filterStatus}
                showCampaignModal={showCampaignModal}
                showRecipientPreview={showRecipientPreview}
                skipRecentlyInvited={skipRecentlyInvited}
                onApplyCampaignPreset={applyCampaignPreset}
                onCloseCampaignModal={() => setShowCampaignModal(false)}
                onFocusHandledPersonally={() => { setFilterStatus('manual-handled'); setViewMode('list'); setShowCampaignModal(false); }}
                onFocusHighRiskFirst={() => { setFilterStatus('all'); setViewMode('list'); setSearchQuery(''); setSortByPriority(true); setShowCampaignModal(false); }}
                onFocusMissingContact={() => { setSearchQuery(''); setFilterStatus('no-contact'); setViewMode('list'); setShowCampaignModal(false); }}
                onFocusMissingMeal={() => { setFilterStatus('missing-meal'); setViewMode('list'); setShowCampaignModal(false); }}
                onFocusPending={() => { setFilterStatus('pending'); setViewMode('list'); setShowCampaignModal(false); }}
                onFocusPendingNoEmail={() => { setFilterStatus('pending-no-email'); setViewMode('list'); setShowCampaignModal(false); }}
                onFocusPlusOneNames={() => { setFilterStatus('plusone-missing'); setViewMode('list'); setShowCampaignModal(false); }}
                onOpenCampaignModal={() => setShowCampaignModal(true)}
                onSetShowRecipientPreview={setShowRecipientPreview}
                onSetSkipRecentlyInvited={setSkipRecentlyInvited}
              />
            )}

            <GuestListDisplaySwitcher
              filteredGuestCount={filteredGuests.length}
              viewMode={viewMode}
              householdProps={{
                householdBusy,
                households,
                isDemoMode,
                selectedGuestIds,
                getStatusBadge: renderGuestStatusBadge,
                onMergeIntoHousehold: handleMergeIntoHousehold,
                onSetSelectedGuestIds: setSelectedGuestIds,
              }}
              listProps={{
                checkInMode,
                confirmDeleteId,
                deletingGuestId,
                displayedGuests,
                filteredGuestCount: filteredGuests.length,
                isGuestsReadOnly,
                searchQuery,
                sendingInviteId,
                getStatusBadge: renderGuestStatusBadge,
                onDeleteGuest: handleDeleteGuest,
                onMarkThankYouSent: handleMarkThankYouSent,
                onOpenAssistedRsvpModal: openAssistedRsvpModal,
                onOpenEditModal: openEditModal,
                onOpenItineraryDrawer: openItineraryDrawer,
                onSendInvitation: handleSendInvitation,
                onToggleCheckIn: handleToggleCheckIn,
              }}
              onClearFilters={() => { setFilterStatus('all'); setExtraFilters([]); setSearchQuery(''); }}
            />
          </div>
        </Card>
      </div>
      <GuestDashboardOverlays
        assistedRsvpGuest={assistedRsvpGuest}
        assistedRsvpNotes={assistedRsvpNotes}
        assistedRsvpSaving={assistedRsvpSaving}
        assistedRsvpSource={assistedRsvpSource}
        assistedRsvpStatus={assistedRsvpStatus}
        confirmDialog={confirmDialog}
        csvColumnSamples={csvColumnSamples}
        csvDataRows={csvDataRows}
        csvDuplicateNames={csvDuplicateNames}
        csvFieldMap={csvFieldMap}
        csvHeaders={csvHeaders}
        csvHouseholdWarnings={csvHouseholdWarnings}
        csvImporting={csvImporting}
        csvMappingSummary={csvMappingSummary}
        csvNameMappingValid={csvNameMappingValid}
        csvPreview={csvPreview}
        csvSelectedFilename={csvSelectedFilename}
        csvShowMapper={csvShowMapper}
        csvSkipped={csvSkipped}
        csvUnknownEvents={csvUnknownEvents}
        deleteAllBusy={deleteAllBusy}
        deleteAllConfirmInput={deleteAllConfirmInput}
        editingGuest={editingGuest}
        effectiveItineraryEvents={effectiveItineraryEvents}
        formData={formData}
        formEventInviteIds={formEventInviteIds}
        guestAuditEntries={guestAuditEntries}
        guestEventIds={guestEventIds}
        guests={guests}
        itineraryDrawerGuest={itineraryDrawerGuest}
        itineraryEvents={itineraryEvents}
        itineraryFilterEventCount={itineraryFilterEvents.length}
        loadingDrawer={loadingDrawer}
        showAddModal={showAddModal}
        showDeleteAllModal={showDeleteAllModal}
        togglingEventId={togglingEventId}
        weddingSiteInfo={weddingSiteInfo}
        onAddFollowUpTask={addFollowUpTask}
        onBuildCsvPreview={buildCsvPreviewFromMapping}
        onCloseAddModal={() => { setShowAddModal(false); resetForm(); }}
        onCloseAssistedRsvp={() => setAssistedRsvpGuest(null)}
        onCloseDeleteAllModal={() => setShowDeleteAllModal(false)}
        onCloseEditModal={() => { setEditingGuest(null); resetForm(); }}
        onCloseItineraryDrawer={() => { setItineraryDrawerGuest(null); setGuestAuditEntries([]); }}
        onConfirmCsvImport={confirmCsvImport}
        onConfirmDeleteAllGuests={handleDeleteAllGuests}
        onCopyContactRequestLink={copyContactRequestLink}
        onFocusGuestSearch={setSearchQuery}
        onResetCsvReview={() => {
          setCsvPreview(null);
          setCsvUnknownEvents([]);
          setCsvDuplicateNames([]);
          setCsvMappingSummary({ core: [], rsvp: [], household: [], eventCols: [], weak: [] });
        }}
        onSaveAssistedRsvp={handleSaveAssistedRsvp}
        onSetAssistedRsvpNotes={setAssistedRsvpNotes}
        onSetAssistedRsvpSource={setAssistedRsvpSource}
        onSetAssistedRsvpStatus={setAssistedRsvpStatus}
        onSetCsvFieldMap={setCsvFieldMap}
        onSetCsvShowMapper={setCsvShowMapper}
        onSetDeleteAllConfirmInput={setDeleteAllConfirmInput}
        onSetFormData={setFormData}
        onSetFormEventInviteIds={setFormEventInviteIds}
        onSubmitAddGuest={handleAddGuest}
        onSubmitEditGuest={handleEditGuest}
        onToast={toast}
        onToggleEventInvite={handleToggleEventInvite}
      />
    </DashboardLayout>
  );
};
