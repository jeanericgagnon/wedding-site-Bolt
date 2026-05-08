import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { PLANNER_ROLE_OPTIONS, canManageGuests, derivePlannerRoleFromPermissions, readPlannerAccessRole, writePlannerAccessRole, type PlannerAccessRole, type PlannerPermissionKey } from '../../lib/plannerAccess';
import { formatGuestOpsDate, formatGuestOpsDateTime, formatGuestOpsRelativeTime, getGuestOpsTimestamp } from './guestOpsTime';
import { formatGuestEventDate } from './guestEventDate';
import { getDaysUntilGuestWedding } from './guestWeddingDate';
import { getInviteLifecycleState } from '../../lib/inviteLifecycle';
import { getGuestLifecycleStage } from '../../lib/guestLifecycleStage';
import { getPlusOneState } from '../../lib/plusOneState';
import { getPerEventRsvpState } from '../../lib/perEventRsvpState';
import { getRsvpExceptionStates } from '../../lib/rsvpExceptionState';
import { buildGuestVisibilityPreview } from '../../lib/guestVisibilityPreview';
import {
  RSVP_QUESTION_TEMPLATES,
  buildRsvpAccessModePlan,
  buildRsvpQuestionTemplateCoverage,
  buildRsvpSetupChecklist,
  createRsvpQuestionFromTemplate,
  type RsvpQuestionTemplate,
} from '../../lib/rsvpAccessPlanner';
import { hasRespondedRsvpStatus, isAttendingRsvpStatus, isDeclinedRsvpStatus, isPendingRsvpStatus } from '../../lib/rsvpStatus';
import { extractDietaryNote } from '../../lib/dietaryNotes';
import { GUEST_IMPORT_MAX_FILE_BYTES, GUEST_IMPORT_MAX_ROWS, buildDefaultCsvFieldMap, buildGuestImportPreview, isCsvNameMappingValid, readGuestImportRows, type CsvFieldMap } from '../../lib/guestImportParser';
import { DashboardStateBlock } from '../../components/dashboard/DashboardStateBlock';
import { Card, Button, Badge, Input, Select, Textarea } from '../../components/ui';
import { Download, UserPlus, CheckCircle2, XCircle, Clock, X, Upload, Users, Mail, AlertCircle, Merge, Scissors, Home, CalendarDays, ChevronRight, Loader2, ChevronDown, Trash2, ExternalLink, Eye } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/ui/Toast';
import type { ConfirmDialogProps } from '../../components/ui/ConfirmDialog';
import { demoWeddingSite, demoGuests, demoRSVPs } from '../../lib/demoData';
import { buildQuickStartPhotosPath, readQuickStartDashboardContinuation } from '../../lib/quickStartContinuation';
import { sendWeddingInvitation } from '../../lib/emailService';
import { resolvePublicSiteSlugFromRow } from '../../lib/publicSiteSlug';
import { copyTextOrDownload } from '../../lib/copyText';
import { logAppAction } from '../../lib/actionAudit';
import {
  formatCustomAnswers,
  getAuditActionIcon,
  getAuditActionTone,
  getAuditGuestLabel,
  getCustomAnswerEntries,
  parseRsvpEventSelections,
  summarizeAuditEntry,
} from './guests/guestDisplayUtils';
import { GuestDashboardHeader } from './guests/GuestDashboardHeader';
import { GuestDashboardOverlays } from './guests/GuestDashboardOverlays';
import { GuestCampaignReminderPanel } from './guests/GuestCampaignReminderPanel';
import { GuestListDisplaySwitcher } from './guests/GuestListDisplaySwitcher';
import { GuestOpsToolbar } from './guests/GuestOpsToolbar';
import { GuestRsvpConflictPanels } from './guests/GuestRsvpConflictPanels';
import { GuestRsvpSettingsView } from './guests/GuestRsvpSettingsView';
import { GuestSnapshotInsightsPanel } from './guests/GuestSnapshotInsightsPanel';
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
  buildCheckedInGuestsCsv,
  buildEventAttendanceCsv,
  buildGuestHouseholdGroups,
  buildGuestOpsQueue,
  buildGuestAddressCollectionCsv,
  buildGuestExportCsv,
  buildFilteredEmailList,
  buildFollowUpTask,
  buildGeneratedFollowUpTasks,
  buildHouseholdLabelsCsv,
  buildMissingMealChecklistLines,
  buildNoContactChecklistLines,
  buildRsvpExceptionChecklistLines,
  buildRsvpFollowUpSummary,
  buildSavedSegment,
  buildThankYouDueCsv,
  getGuestCustomAnswerRollup,
  getGuestCampaignReadiness,
  getGuestContactStats,
  getGuestIssueCount,
  getGuestMealChoiceRollup,
  getGuestMealSummary,
  getGuestRecommendedAction,
  getGuestRsvpCompleteness,
  getGuestRsvpOpsStats,
  getGuestSongRequestEntries,
  makeRsvpQuestion,
  safeGuestImportReadError,
  safeGuestsDashboardError,
  sortGuestsForDisplay,
  toTitleCase,
  buildGuestExceptionStateMap,
  buildGuestFallbackStateMap,
  buildGuestHouseholdStateMap,
  csvColumnLetter,
  GUEST_SEGMENT_LABELS,
  getGuestSegmentLabel,
} from './guests/guestDashboardUtils';
import {
  readStoredCampaignLog,
  readStoredCampaignPreset,
  readStoredDemoRsvpConfig,
  readStoredFollowUpTasks,
  readStoredSavedSegments,
  writeStoredCampaignLog,
  writeStoredCampaignPreset,
  writeStoredDemoRsvpConfig,
  writeStoredFollowUpTasks,
  writeStoredSavedSegments,
  type RsvpCampaignLogEntry,
  type RsvpCampaignPreset,
  type RsvpFollowUpTask,
  type RsvpSavedSegment,
} from './guests/guestDashboardStorage';
import {
  addGuestEventInvitation,
  assignGuestsToHouseholdForSite,
  clearGuestCheckInsForSite,
  createGuest,
  deleteAllGuestsForSite,
  deleteGuestById,
  deleteGuestWithDependencies,
  fetchGuestRsvps,
  generateSecureGuestInviteToken,
  insertEventInvitations,
  insertImportedGuests,
  loadGuestDashboardPublicSlug,
  resolveGuestDashboardConflict,
  resolveGuestDashboardConflicts,
  loadGuestDashboardItineraryFilters,
  loadGuestDashboardRsvpAuditFeed,
  loadGuestDashboardSiteSlug,
  markGuestInvitationAndReminderSentForSite,
  markGuestInvitationSentForSite,
  markGuestReminderSentForSite,
  markGuestsThankYouSentForSite,
  persistGuestDashboardRsvpConfig,
  persistGuestReminderSettings,
  loadGuestItineraryDrawerSnapshot,
  loadGuestDashboardSiteSettings,
  loadGuestDashboardSnapshot,
  refreshGuestDashboardSession,
  removeGuestEventInvitation,
  resolveGuestDashboardSiteId,
  replaceGuestEventInvitations,
  replaceImportedGuestRsvps,
  restoreGuestEventInvitations,
  saveAssistedGuestRsvp,
  toEventInvitationRows,
  updateGuest,
  updateGuestCheckInForSite,
  updateGuestHouseholdForSite,
  updateGuestThankYouSentForSite,
  updateHouseholdGuestIds,
  type AssistedRsvpSource,
  type AssistedRsvpStatus,
  type GuestEventInvitationRollback,
} from './guests/guestService';

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
  const [filterStatus, setFilterStatus] = useState<'all' | 'confirmed' | 'declined' | 'pending' | 'checked-in' | 'thank-you-due' | 'due-reminder' | 'missing-address' | 'ceremony-no' | 'reception-no' | 'missing-meal' | 'plusone-missing' | 'pending-no-email' | 'manual-follow-up' | 'manual-handled' | 'no-contact'>('all');
  const [extraFilters, setExtraFilters] = useState<string[]>([]);
  const [extraFilterDraft, setExtraFilterDraft] = useState<string>('');
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
  const [savedSegments, setSavedSegments] = useState<RsvpSavedSegment[]>([]);
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
    setSavedSegments(readStoredSavedSegments());

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
    writeStoredSavedSegments(savedSegments);
  }, [savedSegments]);

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

  const [formData, setFormData] = useState({
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
      const snapshot = await loadGuestDashboardSiteSettings(user.id);
      setGuestsRole(snapshot.role);
      setGuestsPermissions(snapshot.permissions);

      if (snapshot.siteInfo) {
        setWeddingSiteId(snapshot.activeSiteId);
        setWeddingSiteInfo(snapshot.siteInfo);
        setRsvpQuestions(snapshot.questions);
        setRsvpMealEnabled(snapshot.mealEnabled);
        setRsvpMealOptions(snapshot.mealOptions);
        if (snapshot.reminderCadenceDays) setReminderCadenceDays(snapshot.reminderCadenceDays);
        setAutoRemindersEnabled(snapshot.autoRemindersEnabled);
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

      const snapshot = await loadGuestDashboardSnapshot(weddingSiteId);
      setGuests(snapshot.guests);
      setRsvpConflicts(snapshot.conflicts);
      setRsvpConflictHistory(snapshot.conflictHistory);
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
        const snapshot = await loadGuestDashboardItineraryFilters(weddingSiteId);

        if (cancelled) return;
        setItineraryEvents(snapshot.itineraryEvents);
        setItineraryFilterEvents(snapshot.filterEvents);
        setEventInviteGuestMap(snapshot.eventInviteGuestMap);
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

        const feed = await loadGuestDashboardRsvpAuditFeed(weddingSiteId);
        if (!cancelled) setRsvpAuditFeed(feed);
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
    const now = Date.now();
    const dayAgo = now - (24 * 60 * 60 * 1000);
    const threeDaysAgo = now - (72 * 60 * 60 * 1000);

    const opened24h = rsvpConflictHistory.filter((c) => getGuestOpsTimestamp(c.created_at) >= dayAgo).length;
    const resolved24h = rsvpConflictHistory.filter((c) => getGuestOpsTimestamp(c.resolved_at) >= dayAgo).length;
    const unresolvedOver24h = rsvpConflicts.filter((c) => getGuestOpsTimestamp(c.created_at) < dayAgo).length;
    const unresolvedOver72h = rsvpConflicts.filter((c) => getGuestOpsTimestamp(c.created_at) < threeDaysAgo).length;

    const codeCounts = new Map<string, number>();
    for (const c of rsvpConflictHistory) {
      codeCounts.set(c.conflict_code, (codeCounts.get(c.conflict_code) ?? 0) + 1);
    }

    const topCodes = [...codeCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([code, count]) => ({ code, count }));

    return {
      openNow: rsvpConflicts.length,
      opened24h,
      resolved24h,
      unresolvedOver24h,
      unresolvedOver72h,
      topCodes,
    };
  }, [rsvpConflicts.length, rsvpConflictHistory]);

  const resolveConflict = useCallback(async (conflictId: string) => {
    setResolvingConflictId(conflictId);
    try {
      if (isDemoMode) {
        setRsvpConflicts((prev) => prev.filter((c) => c.id !== conflictId));
        setRsvpConflictHistory((prev) => prev.map((c) => c.id === conflictId ? { ...c, resolved: true, resolved_at: new Date().toISOString() } : c));
        return;
      }
      const resolvedAt = new Date().toISOString();
      await resolveGuestDashboardConflict(conflictId, resolvedAt);
      setRsvpConflicts((prev) => prev.filter((c) => c.id !== conflictId));
      setRsvpConflictHistory((prev) => prev.map((c) => c.id === conflictId ? { ...c, resolved: true, resolved_at: resolvedAt } : c));
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
        const resolvedAt = new Date().toISOString();
        await resolveGuestDashboardConflicts(ids, resolvedAt);
        setRsvpConflictHistory((prev) => prev.map((c) => ids.includes(c.id) ? { ...c, resolved: true, resolved_at: resolvedAt } : c));
      } else {
        const resolvedAt = new Date().toISOString();
        setRsvpConflictHistory((prev) => prev.map((c) => ids.includes(c.id) ? { ...c, resolved: true, resolved_at: resolvedAt } : c));
      }
      setRsvpConflicts((prev) => prev.filter((c) => !ids.includes(c.id)));
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
      const normalizedQuestions = rsvpQuestions
        .map((q) => ({
          ...q,
          label: q.label.trim(),
          options: (q.type === 'single_choice' || q.type === 'multi_choice') ? (q.options ?? []).map((o) => o.trim()).filter(Boolean) : [],
        }));

      const cleanedQuestions = normalizedQuestions.filter((q) => q.label.length > 0);

      const missingOptions = cleanedQuestions.find((q) => (q.type === 'single_choice' || q.type === 'multi_choice') && (q.options?.length ?? 0) < 2);
      if (missingOptions) {
        toast(`Choice question "${missingOptions.label}" needs at least 2 options.`, 'error');
        return;
      }

      const mealOptions = rsvpMealOptions.map((o) => toTitleCase(o.trim())).filter(Boolean);
      if (rsvpMealEnabled && mealOptions.length < 2) {
        toast('Meal choices need at least 2 options when enabled.', 'error');
        return;
      }

      if (isDemoMode || !weddingSiteId) {
        writeStoredDemoRsvpConfig({ questions: cleanedQuestions, mealEnabled: rsvpMealEnabled, mealOptions });
        setRsvpQuestions(cleanedQuestions);
      toast('RSVP settings saved (demo).', 'success');
        setRsvpAutoSaveState('saved');
        setRsvpConfigDirty(false);
        return;
      }

      await persistGuestDashboardRsvpConfig({
        weddingSiteId,
        questions: cleanedQuestions,
        mealEnabled: rsvpMealEnabled,
        mealOptions,
      });
      setRsvpQuestions(cleanedQuestions);
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
    return generateSecureGuestInviteToken();
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
        const newGuest: GuestWithRSVP = {
          id: `demo-${Date.now()}`,
          first_name: formData.first_name,
          last_name: formData.last_name,
          name: `${formData.first_name} ${formData.last_name}`.trim(),
          email: formData.email || null,
          phone: formData.phone || null,
          plus_one_allowed: formData.plus_one_allowed,
          plus_one_name: null,
          invited_to_ceremony: formData.invited_to_ceremony,
          invited_to_reception: formData.invited_to_reception,
          invite_token: generateLocalInviteToken(),
          rsvp_status: 'pending',
          rsvp_received_at: null,
          household_id: null,
        };

        setGuests(prev => [newGuest, ...prev]);
        setShowAddModal(false);
        resetForm();
        toast(`${formData.first_name} ${formData.last_name} added`, 'success');
        return;
      }

      const inviteToken = await generateSecureToken();
      const selectedEventIds = Array.from(formEventInviteIds);
      const invitedToCeremony = selectedEventIds.includes('legacy-ceremony');
      const invitedToReception = selectedEventIds.includes('legacy-reception');
      const realEventIds = selectedEventIds.filter((id) => !id.startsWith('legacy-'));

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

    const previousGuestValues = {
      first_name: editingGuest.first_name ?? null,
      last_name: editingGuest.last_name ?? null,
      name: editingGuest.name ?? null,
      email: editingGuest.email ?? null,
      phone: editingGuest.phone ?? null,
      plus_one_allowed: editingGuest.plus_one_allowed,
      invited_to_ceremony: editingGuest.invited_to_ceremony,
      invited_to_reception: editingGuest.invited_to_reception,
    };
    let eventInvitationRollback: GuestEventInvitationRollback | null = null;
    let guestUpdated = false;
    let invitesCleared = false;

    try {
      if (isDemoMode) {
        setGuests(prev => prev.map(guest => (
          guest.id === editingGuest.id
            ? {
                ...guest,
                first_name: formData.first_name,
                last_name: formData.last_name,
                name: `${formData.first_name} ${formData.last_name}`.trim(),
                email: formData.email || null,
                phone: formData.phone || null,
                plus_one_allowed: formData.plus_one_allowed,
                invited_to_ceremony: formData.invited_to_ceremony,
                invited_to_reception: formData.invited_to_reception,
              }
            : guest
        )));
        setEditingGuest(null);
        resetForm();
        toast('Guest updated', 'success');
        return;
      }

      const selectedEventIds = Array.from(formEventInviteIds);
      const invitedToCeremony = selectedEventIds.includes('legacy-ceremony');
      const invitedToReception = selectedEventIds.includes('legacy-reception');
      const realEventIds = selectedEventIds.filter((id) => !id.startsWith('legacy-'));

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

  const handleUndoLastCheckIn = async () => {
    if (isGuestsReadOnly) {
      toast('Your collaborator role cannot update guest check-in.', 'info');
      return;
    }
    if (!weddingSiteId || !lastCheckIn || isDemoMode) return;
    try {
      await updateGuestCheckInForSite(weddingSiteId, lastCheckIn.guestId, null);
      await fetchGuests();
      toast(`Undid check-in for ${lastCheckIn.guestName}`, 'success');
      setLastCheckIn(null);
    } catch {
      toast('Couldn’t undo last check-in.', 'error');
    }
  };

  const handleMarkThankYouSent = async (guest: GuestWithRSVP) => {
    if (isGuestsReadOnly) {
      toast('Your collaborator role cannot update thank-you status.', 'info');
      return;
    }
    if (!weddingSiteId || isDemoMode) return;
    try {
      const current = (guest as GuestWithRSVP & { thank_you_sent_at?: string | null }).thank_you_sent_at;
      const nextValue = current ? null : new Date().toISOString();
      await updateGuestThankYouSentForSite(weddingSiteId, guest.id, nextValue);
      await fetchGuests();
      toast(nextValue ? 'Marked thank-you sent' : 'Cleared thank-you status', 'success');
    } catch {
      toast('Couldn’t update thank-you status.', 'error');
    }
  };

  const handleMarkAllDueThankYous = async () => {
    if (isGuestsReadOnly) {
      toast('Your collaborator role cannot update thank-you status.', 'info');
      return;
    }
    if (!weddingSiteId || isDemoMode) return;
    const ids = guests.filter((g) => dueThankYouGuestIds.has(g.id)).map((g) => g.id);
    if (ids.length === 0) {
      toast('No guests currently due for thank-you.', 'error');
      return;
    }
    const confirmed = await requestConfirmation({
      title: 'Mark thank-you notes sent?',
      description: `This will mark thank-you sent for ${ids.length} ${ids.length === 1 ? 'guest' : 'guests'}.`,
      confirmLabel: 'Mark sent',
    });
    if (!confirmed) return;
    try {
      await markGuestsThankYouSentForSite(weddingSiteId, ids, new Date().toISOString());
      await fetchGuests();
      toast(`Marked ${ids.length} thank-you sent`, 'success');
    } catch {
      toast('Couldn’t mark thank-you notes sent.', 'error');
    }
  };

  const handleClearAllCheckIns = async () => {
    if (isGuestsReadOnly) {
      toast('Your collaborator role cannot clear guest check-ins.', 'info');
      return;
    }
    if (!weddingSiteId || isDemoMode) return;
    const checkedInCount = guests.filter((g) => !!(g as GuestWithRSVP & { checked_in_at?: string | null }).checked_in_at).length;
    if (checkedInCount === 0) {
      toast('No checked-in guests to clear.', 'error');
      return;
    }
    const confirmed = await requestConfirmation({
      title: 'Clear all check-ins?',
      description: `This will clear check-in status and notes for ${checkedInCount} ${checkedInCount === 1 ? 'guest' : 'guests'}.`,
      confirmLabel: 'Clear check-ins',
      tone: 'danger',
    });
    if (!confirmed) return;
    try {
      await clearGuestCheckInsForSite(weddingSiteId);
      await fetchGuests();
      setLastCheckIn(null);
      toast('Cleared all check-ins', 'success');
    } catch {
      toast('Couldn’t clear check-ins.', 'error');
    }
  };

  const [lastCheckIn, setLastCheckIn] = useState<{ guestId: string; guestName: string; at: number } | null>(null);

  const handleToggleCheckIn = async (guest: GuestWithRSVP) => {
    if (isGuestsReadOnly) {
      toast('Your collaborator role cannot update guest check-in.', 'info');
      return;
    }
    if (!weddingSiteId || isDemoMode) {
      toast('Check-in is unavailable in demo mode.', 'error');
      return;
    }

    const nextValue = guest.checked_in_at ? null : new Date().toISOString();
    const updateCheckin = async () => updateGuestCheckInForSite(weddingSiteId, guest.id, nextValue);

    try {
      await updateCheckin();
      await fetchGuests();
      if (nextValue) {
        const guestName = (guest.first_name || guest.last_name)
          ? `${guest.first_name ?? ''} ${guest.last_name ?? ''}`.trim()
          : guest.name;
        setLastCheckIn({ guestId: guest.id, guestName, at: Date.now() });
      }
      toast(nextValue ? 'Guest checked in' : 'Guest check-in cleared', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message.toLowerCase() : '';
      const authish = msg.includes('invalid jwt') || msg.includes('jwt') || msg.includes('401') || msg.includes('auth');
      if (authish) {
        try {
          await refreshGuestDashboardSession();
          await updateCheckin();
          await fetchGuests();
          toast(nextValue ? 'Guest checked in' : 'Guest check-in cleared', 'success');
          return;
        } catch {
          // fall through to canonical error toast
        }
      }
      toast('Couldn’t update check-in status.', 'error');
    }
  };

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
    if (!weddingSiteId) {
      toast('Missing wedding site context', 'error');
      return;
    }
    const currentWeddingSiteId = weddingSiteId;

    setSendingInviteId(guest.id);
    try {
      const guestName = guest.first_name && guest.last_name
        ? `${guest.first_name} ${guest.last_name}`
        : guest.name;

      await sendWeddingInvitation({
        weddingSiteId: weddingSiteInfo?.id ?? weddingSiteId ?? '',
        guestEmail: guest.email,
        guestName,
        coupleName1: weddingSiteInfo?.couple_name_1 ?? '',
        coupleName2: weddingSiteInfo?.couple_name_2 ?? '',
        weddingDate: weddingSiteInfo?.wedding_date ?? null,
        venueName: weddingSiteInfo?.venue_name ?? null,
        venueAddress: weddingSiteInfo?.venue_address ?? null,
        siteUrl: weddingSiteInfo?.site_url ?? null,
        inviteToken: guest.invite_token ?? null,
      });

      await markGuestInvitationSentForSite(currentWeddingSiteId, guest.id, new Date().toISOString());

      toast(`Invitation sent to ${guestName}`, 'success');
    } catch {
      toast('Couldn’t send invitation. Please try again.', 'error');
    } finally {
      setSendingInviteId(null);
    }
  };



  const handleCopyOpsSummary = async () => {
    const summary = buildRsvpFollowUpSummary({
      generatedAt: new Date(),
      segmentLabel: segmentLabelMap[filterStatus] || filterStatus,
      eligibleReminderCount: reminderCandidates.length,
      rsvpOps,
      contactStats,
    });
    const result = await copyTextOrDownload(summary, 'dayof-rsvp-follow-up-summary.txt');
    if (result === 'copied') {
      toast('Copied RSVP follow-up summary', 'success');
    } else {
      toast('Clipboard was blocked, so the RSVP follow-up summary downloaded.', 'success');
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


  const saveCurrentSegment = () => {
    const seg = buildSavedSegment({
      now: new Date(),
      filterStatus,
      segmentLabel: segmentLabelMap[filterStatus] || filterStatus,
      guestCount: filteredGuests.length,
    });
    setSavedSegments((prev) => [seg, ...prev.filter((x) => x.filter !== filterStatus)].slice(0, 12));
    toast('Segment saved', 'success');
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
    if (!weddingSiteId) {
      toast('Missing wedding site context', 'error');
      return;
    }
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
    const currentWeddingSiteId = weddingSiteId;

    setBulkSending(true);
    let successCount = 0;
    let failedCount = 0;
    try {
      for (const guest of selectedRecipients) {
        if (!guest.email) continue;
        const guestName = (guest.first_name || guest.last_name)
          ? `${guest.first_name ?? ''} ${guest.last_name ?? ''}`.trim()
          : guest.name;
        try {
          await sendWeddingInvitation({
            weddingSiteId: weddingSiteInfo?.id ?? weddingSiteId ?? '',
            guestEmail: guest.email,
            guestName,
            coupleName1: weddingSiteInfo?.couple_name_1 ?? '',
            coupleName2: weddingSiteInfo?.couple_name_2 ?? '',
            weddingDate: weddingSiteInfo?.wedding_date ?? null,
            venueName: weddingSiteInfo?.venue_name ?? null,
            venueAddress: weddingSiteInfo?.venue_address ?? null,
            siteUrl: weddingSiteInfo?.site_url ?? null,
            inviteToken: guest.invite_token ?? null,
          });
          const sentAtIso = new Date().toISOString();
          await markGuestInvitationAndReminderSentForSite(currentWeddingSiteId, guest.id, sentAtIso);
          successCount += 1;
        } catch {
          failedCount += 1;
          // continue
        }
      }
      if (successCount > 0) {
        await fetchGuests();
      }
      toast(
        successCount > 0
          ? (failedCount > 0
              ? `Sent ${successCount} selected reminder${successCount === 1 ? '' : 's'}. ${failedCount} need review.`
              : `Sent ${successCount} selected reminder${successCount === 1 ? '' : 's'}`)
          : (failedCount > 0
              ? `${failedCount} selected reminder${failedCount === 1 ? '' : 's'} need review.`
              : 'No selected reminders were sent.'),
        successCount > 0 ? (failedCount > 0 ? 'info' : 'success') : 'error',
      );
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
    if (!weddingSiteId) {
      toast('Missing wedding site context', 'error');
      return;
    }

    const previewNames = reminderCandidates.slice(0, 3).map((g) => (g.first_name || g.last_name) ? `${g.first_name ?? ''} ${g.last_name ?? ''}`.trim() : g.name);
    const previewText = previewNames.length ? `\n\nFirst recipients: ${previewNames.join(', ')}${reminderCandidates.length > 3 ? ` +${reminderCandidates.length - 3} more` : ''}` : '';
    const noContactWarning = contactStats.withNoContact > 0 ? `\nGuests without contact info: ${contactStats.withNoContact} (not included)` : '';
    const confirmed = await requestConfirmation({
      title: 'Send RSVP reminder campaign?',
      description: `Group: ${segmentLabelMap[filterStatus] || filterStatus}. Recipients: ${reminderCandidates.length}. Skip recent reminders: ${skipRecentlyInvited ? 'On' : 'Off'}.${noContactWarning ? ` ${noContactWarning.trim()}` : ''}${previewText ? ` ${previewText.trim()}` : ''}`,
      confirmLabel: 'Send campaign',
    });
    if (!confirmed) return;

    if (isDemoMode) {
      const sentAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setCampaignLog(prev => [{ id: Date.now(), segment: segmentLabelMap[filterStatus] || filterStatus, count: reminderCandidates.length, sentAt }, ...prev].slice(0, 6));
      toast(`Demo: simulated reminders for ${reminderCandidates.length} guests`, 'success');
      return;
    }
    const currentWeddingSiteId = weddingSiteId;

    setBulkSending(true);
    let successCount = 0;
    let failedCount = 0;

    try {
      for (const guest of reminderCandidates) {
        if (!guest.email) continue;
        const guestName = guest.first_name && guest.last_name
          ? `${guest.first_name} ${guest.last_name}`
          : guest.name;

        try {
          await sendWeddingInvitation({
            weddingSiteId: weddingSiteInfo?.id ?? weddingSiteId ?? '',
            guestEmail: guest.email,
            guestName,
            coupleName1: weddingSiteInfo?.couple_name_1 ?? '',
            coupleName2: weddingSiteInfo?.couple_name_2 ?? '',
            weddingDate: weddingSiteInfo?.wedding_date ?? null,
            venueName: weddingSiteInfo?.venue_name ?? null,
            venueAddress: weddingSiteInfo?.venue_address ?? null,
            siteUrl: weddingSiteInfo?.site_url ?? null,
            inviteToken: guest.invite_token ?? null,
          });

          const sentAtIso = new Date().toISOString();
          await markGuestInvitationAndReminderSentForSite(currentWeddingSiteId, guest.id, sentAtIso);

          successCount += 1;
        } catch {
          failedCount += 1;
          // continue sending others
        }
      }

      if (successCount > 0) {
        const sentAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setCampaignLog(prev => [{ id: Date.now(), segment: segmentLabelMap[filterStatus] || filterStatus, count: successCount, sentAt }, ...prev].slice(0, 6));
        toast(
          failedCount > 0
            ? `Sent ${successCount} reminder${successCount === 1 ? '' : 's'}. ${failedCount} need review.`
            : `Sent ${successCount} reminder${successCount === 1 ? '' : 's'}`,
          failedCount > 0 ? 'info' : 'success',
        );
        await fetchGuests();
      } else {
        toast(failedCount > 0 ? `${failedCount} reminder${failedCount === 1 ? '' : 's'} need review.` : 'No reminders were sent. Please try again.', 'error');
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
    if (!weddingSiteId) {
      toast('Missing wedding site context', 'error');
      return;
    }

    const confirmed = await requestConfirmation({
      title: 'Send due reminders now?',
      description: `This will email ${dueReminderCandidatesGlobal.length} ${dueReminderCandidatesGlobal.length === 1 ? 'guest' : 'guests'} who are ready for another reminder after ${reminderCadenceDays} days.`,
      confirmLabel: 'Send due reminders',
    });
    if (!confirmed) return;

    if (isDemoMode) {
      const sentAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setCampaignLog(prev => [{ id: Date.now(), segment: 'Due Reminder', count: dueReminderCandidatesGlobal.length, sentAt }, ...prev].slice(0, 6));
      toast(`Demo: simulated reminders for ${dueReminderCandidatesGlobal.length} due guests`, 'success');
      return;
    }
    const currentWeddingSiteId = weddingSiteId;

    setBulkSending(true);
    let successCount = 0;
    let failedCount = 0;
    try {
      for (const guest of dueReminderCandidatesGlobal) {
        if (!guest.email) continue;
        const guestName = guest.first_name && guest.last_name ? `${guest.first_name} ${guest.last_name}` : guest.name;
        try {
          await sendWeddingInvitation({
            weddingSiteId: weddingSiteInfo?.id ?? weddingSiteId ?? '',
            guestEmail: guest.email,
            guestName,
            coupleName1: weddingSiteInfo?.couple_name_1 ?? '',
            coupleName2: weddingSiteInfo?.couple_name_2 ?? '',
            weddingDate: weddingSiteInfo?.wedding_date ?? null,
            venueName: weddingSiteInfo?.venue_name ?? null,
            venueAddress: weddingSiteInfo?.venue_address ?? null,
            siteUrl: weddingSiteInfo?.site_url ?? null,
            inviteToken: guest.invite_token ?? null,
          });
          await markGuestReminderSentForSite(currentWeddingSiteId, guest.id, new Date().toISOString());
          successCount += 1;
        } catch {
          failedCount += 1;
          // continue
        }
      }

      if (successCount > 0) {
        const sentAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setCampaignLog(prev => [{ id: Date.now(), segment: 'Due Reminder', count: successCount, sentAt }, ...prev].slice(0, 6));
        toast(
          failedCount > 0
            ? `Sent ${successCount} due reminder${successCount === 1 ? '' : 's'}. ${failedCount} need review.`
            : `Sent ${successCount} due reminder${successCount === 1 ? '' : 's'}`,
          failedCount > 0 ? 'info' : 'success',
        );
        await fetchGuests();
      } else {
        toast(failedCount > 0 ? `${failedCount} due reminder${failedCount === 1 ? '' : 's'} need review.` : 'No due reminders were sent. Please try again.', 'error');
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
      await assignGuestsToHouseholdForSite(weddingSiteId, ids, householdId);
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
      await updateGuestHouseholdForSite(weddingSiteId, guestId, null);
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
      await updateGuestHouseholdForSite(weddingSiteId, guestId, newHouseholdId || null);
      await fetchGuests();
      toast('Guest reassigned', 'success');
    } catch {
      toast('Couldn’t move guest to that household.', 'error');
    }
  }

  const persistReminderSettings = async (patch: { reminder_cadence_days?: 1 | 3 | 7; auto_reminders_enabled?: boolean }) => {
    if (!weddingSiteId || isDemoMode) return;
    await persistGuestReminderSettings(weddingSiteId, patch);
  };

  async function copyContactRequestLink() {
    if (!weddingSiteId) {
      toast('Missing wedding site context', 'error');
      return;
    }

    const publicSlug = await loadGuestDashboardPublicSlug(weddingSiteId);
    if (!publicSlug) {
      toast('Set a public site slug before sharing the guest update link', 'error');
      return;
    }

    const url = `https://${publicSlug}.dayof.love/guest-contact/${publicSlug}`;
    const result = await copyTextOrDownload(url, 'dayof-guest-update-link.txt');
    if (result === 'copied') {
      toast('Guest update link copied', 'success');
    } else {
      toast('Clipboard was blocked, so the guest update link downloaded.', 'success');
    }
  }

  async function openItineraryDrawer(guest: GuestWithRSVP) {
    if (!weddingSiteId) return;
    setItineraryDrawerGuest(guest);
    setLoadingDrawer(true);
    try {
      if (isDemoMode) {
        const now = Date.now();
        setGuestAuditEntries([
          { id: `${guest.id}-a1`, action: 'update', changed_at: new Date(now - 1000 * 60 * 90).toISOString(), changed_by: null, old_data: { rsvp_status: 'pending' }, new_data: { rsvp_status: guest.rsvp_status } },
          { id: `${guest.id}-a2`, action: 'update', changed_at: new Date(now - 1000 * 60 * 60 * 26).toISOString(), changed_by: null, old_data: { invited_to_reception: false }, new_data: { invited_to_reception: guest.invited_to_reception } },
        ]);
        setGuestEventIds(new Set());
      }

      if (!isDemoMode) {
        const snapshot = await loadGuestItineraryDrawerSnapshot(weddingSiteId, guest.id);
        setItineraryEvents(snapshot.events);
        setGuestEventIds(snapshot.guestEventIds);
        setGuestAuditEntries(snapshot.auditEntries);
      }
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
      if (currentlyInvited) {
        await removeGuestEventInvitation(eventId, itineraryDrawerGuest.id);
        setGuestEventIds(prev => { const n = new Set(prev); n.delete(eventId); return n; });
      } else {
        await addGuestEventInvitation(eventId, itineraryDrawerGuest.id);
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

      if (isDemoMode) {
        const demoRecordedAt = new Date().toISOString();
        const demoManualTag = `[Manual RSVP source:${assistedRsvpSource} recorded:${demoRecordedAt}]`;
        const nextNotes = [demoManualTag, assistedRsvpNotes.trim()].filter(Boolean).join(' ');
        setGuests((prev) => prev.map((guest) => guest.id === assistedRsvpGuest.id ? {
          ...guest,
          rsvp_status: assistedRsvpStatus,
          rsvp_received_at: new Date().toISOString(),
          notes: nextNotes,
          rsvp: assistedRsvpStatus === 'confirmed'
            ? guest.rsvp
              ? {
                  ...guest.rsvp,
                  attending: true,
                  attending_ceremony: guest.invited_to_ceremony,
                  attending_reception: guest.invited_to_reception,
                }
              : guest.rsvp
            : guest.rsvp
              ? {
                  ...guest.rsvp,
                  attending: false,
                  attending_ceremony: false,
                  attending_reception: false,
                  meal_choice: null,
                  plus_one_name: null,
                  plus_one_count: 0,
                }
              : guest.rsvp,
        } : guest));
        setAssistedRsvpGuest(null);
        toast('RSVP recorded for guest', 'success');
        return;
      }
      await saveAssistedGuestRsvp({
        guest: assistedRsvpGuest,
        status: assistedRsvpStatus,
        source: assistedRsvpSource,
        notes: assistedRsvpNotes,
      });

      await fetchGuests();
      setAssistedRsvpGuest(null);
      toast('RSVP recorded for guest', 'success');
    } catch (error) {
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
    setFormData({
      first_name: guest.first_name || '',
      last_name: guest.last_name || '',
      email: guest.email || '',
      phone: guest.phone || '',
      plus_one_allowed: guest.plus_one_allowed,
      require_plus_one_name: false,
      invited_to_ceremony: guest.invited_to_ceremony,
      invited_to_reception: guest.invited_to_reception,
    });
    const invitedIds = effectiveItineraryEvents
      .filter((event) => {
        if (event.id === 'legacy-ceremony') return guest.invited_to_ceremony;
        if (event.id === 'legacy-reception') return guest.invited_to_reception;
        return eventInviteGuestMap.get(event.id)?.has(guest.id);
      })
      .map((event) => event.id);
    setFormEventInviteIds(new Set(invitedIds));
  };

  const exportCSV = (rowsSource: GuestWithRSVP[] = guests, suffix = 'guests') => {
    const blob = new Blob([buildGuestExportCsv({ guests: rowsSource, origin: window.location.origin })], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${suffix}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportFilteredCSV = () => {
    const segment = (segmentLabelMap[filterStatus] || filterStatus).toLowerCase().replace(/[^a-z0-9]+/g, '-');
    exportCSV(filteredGuests, `guests-${segment}`);
  };

  const exportRsvpRespondersCSV = () => {
    const responders = guests.filter((g) => hasRespondedRsvpStatus(g.rsvp_status));
    exportCSV(responders, 'guests-rsvp-responders');
  };

  const exportPendingGuestsCSV = () => {
    exportCSV(guests.filter((g) => isPendingRsvpStatus(g.rsvp_status)), 'guests-pending-rsvp');
  };

  const exportMissingMealCSV = () => {
    exportCSV(guests.filter((g) => g.rsvp?.attending && !g.rsvp?.meal_choice), 'guests-missing-meal');
  };

  const exportAttendingGuestsCSV = () => {
    exportCSV(guests.filter((g) => isAttendingRsvpStatus(g.rsvp_status)), 'guests-attending');
  };

  const exportDeclinedGuestsCSV = () => {
    exportCSV(guests.filter((g) => isDeclinedRsvpStatus(g.rsvp_status)), 'guests-declined');
  };

  const exportThankYouDueCSV = () => {
    const due = guests.filter((g) => dueThankYouGuestIds.has(g.id));
    const blob = new Blob([buildThankYouDueCsv(due)], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `thank-you-due_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportCheckedInCSV = () => {
    const checkedIn = guests.filter((g) => !!g.checked_in_at);
    const blob = new Blob([buildCheckedInGuestsCsv(checkedIn)], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `checked-in-guests_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const copySmsRsvpLinksForFiltered = async () => {
    if (!weddingSiteId) {
      toast('Missing wedding site context', 'error');
      return;
    }

    const siteSlug = await loadGuestDashboardSiteSlug(weddingSiteId);
    if (!siteSlug) {
      toast('Missing site slug', 'error');
      return;
    }

    const rows = reminderCandidates
      .filter((g) => !!g.invite_token)
      .map((g) => {
        const name = (g.first_name || g.last_name) ? `${g.first_name ?? ''} ${g.last_name ?? ''}`.trim() : g.name;
        const link = `https://${siteSlug}.dayof.love/rsvp?token=${g.invite_token}`;
        return `${name}: ${link}`;
      });

    if (rows.length === 0) {
      toast('No RSVP links available for this segment.', 'error');
      return;
    }

    const payload = rows.join('\n');
    const result = await copyTextOrDownload(payload, 'dayof-text-rsvp-links.txt');
    if (result === 'copied') {
      toast(`Copied ${rows.length} text RSVP link${rows.length === 1 ? '' : 's'}`, 'success');
    } else {
      toast('Clipboard was blocked, so the text RSVP links downloaded.', 'success');
    }
  };

  const exportAddressCollectionCSV = () => {
    const blob = new Blob([buildGuestAddressCollectionCsv(guests)], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `guest-addresses_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportHouseholdLabelsCSV = () => {
    const blob = new Blob([buildHouseholdLabelsCsv({ guests, origin: window.location.origin })], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `household-labels_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
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
    const skippedMsg = result.skipped.length > 0 ? ` (${result.skipped.length} row${result.skipped.length === 1 ? '' : 's'} need review)` : '';
    const unknownMsg = result.unknownEvents.length > 0 ? `, ${result.unknownEvents.length} event name${result.unknownEvents.length === 1 ? '' : 's'} need review` : '';
    const dupMsg = result.duplicateNames.length > 0 ? `, ${result.duplicateNames.length} possible repeat${result.duplicateNames.length === 1 ? '' : 's'}` : '';
    const householdMsg = result.householdWarnings.length > 0 ? `, ${result.householdWarnings.length} household match${result.householdWarnings.length === 1 ? '' : 'es'} need review` : '';
    toast(`${parsed.length} guest${parsed.length !== 1 ? 's' : ''} ready to import${skippedMsg}${unknownMsg}${dupMsg}${householdMsg}.`, 'success');
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
        const importedGuests = csvPreview.map((g, idx) => ({
          id: `demo-import-${Date.now()}-${idx}`,
          first_name: String(g.first_name || ''),
          last_name: String(g.last_name || ''),
          name: `${String(g.first_name || '')} ${String(g.last_name || '')}`.trim(),
          email: g.email ? String(g.email) : null,
          phone: g.phone ? String(g.phone) : null,
          plus_one_allowed: Boolean(g.plus_one_allowed),
          plus_one_name: null,
          children_allowed: Boolean(g.children_allowed),
          max_children: Number(g.max_children ?? 0),
          max_additional_guests: Number(g.max_additional_guests ?? 0),
          invited_to_ceremony: true,
          invited_to_reception: true,
          invite_token: generateLocalInviteToken(),
          rsvp_status: 'pending',
          rsvp_received_at: null,
          household_id: (g.__household_key as string | null) || null,
          group_name: (g.group_name as string | null) || null,
        } as GuestWithRSVP));

        setGuests(prev => [...importedGuests, ...prev]);
        setCsvImportSummary({ imported: csvPreview?.length ?? 0, skipped: csvSkipped.length, unknownEvents: 0, duplicateNames: csvDuplicateNames.length, guardedHouseholds: 0, householdKeys: 0 });
        const skippedMsg = csvSkipped.length > 0 ? `, ${csvSkipped.length} row${csvSkipped.length === 1 ? '' : 's'} need review` : '';
        toast(`${csvPreview.length} guest${csvPreview.length !== 1 ? 's' : ''} imported${skippedMsg}`, 'success');
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

      const guestRows = guestsWithTokens.map((g) => {
        const row = { ...g } as Record<string, unknown>;
        delete row.__household_key;
        delete row.__invited_event_ids;
        delete row.__meal_choice;
        delete row.__plus_one_name;
        delete row.__plus_one_count;
        delete row.__children_count;
        delete row.__rsvp_date;
        return row;
      });

      const inserted = await insertImportedGuests(guestRows);
      const keyToGuestIds = new Map<string, string[]>();
      const householdLastNames = new Map<string, Set<string>>();
      guestsWithTokens.forEach((row, idx) => {
        const key = row.__household_key as string | null | undefined;
        if (!key) return;
        const guestId = inserted[idx]?.id as string | undefined;
        if (!guestId) return;
        const existing = keyToGuestIds.get(key) ?? [];
        existing.push(guestId);
        keyToGuestIds.set(key, existing);
        const lastNames = householdLastNames.get(key) ?? new Set();
        const lastName = String(row.last_name || '').trim().toLowerCase();
        if (lastName) lastNames.add(lastName);
        householdLastNames.set(key, lastNames);
      });

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

      const eventInviteRows: Array<{ event_id: string; guest_id: string }> = [];
      const rsvpRows: Array<{ guest_id: string; attending: boolean; meal_choice: string | null; plus_one_name: string | null; plus_one_count: number; children_count: number; responded_at: string | null }> = [];
      guestsWithTokens.forEach((row, idx) => {
        const guestId = inserted[idx]?.id as string | undefined;
        if (!guestId) return;
        const eventIds = (row.__invited_event_ids as string[] | undefined) ?? [];
        eventIds.forEach((eventId) => eventInviteRows.push({ event_id: eventId, guest_id: guestId }));

        const status = String(row.rsvp_status || 'pending').toLowerCase();
        const attending = isAttendingRsvpStatus(status);
        const declined = isDeclinedRsvpStatus(status) || status === 'no';
        if (attending || declined) {
          rsvpRows.push({
            guest_id: guestId,
            attending,
            meal_choice: (row.__meal_choice as string | null | undefined) ?? null,
            plus_one_name: (row.__plus_one_name as string | null | undefined) ?? null,
            plus_one_count: Number(row.__plus_one_count ?? 0),
            children_count: Number(row.__children_count ?? 0),
            responded_at: (row.__rsvp_date as string | null | undefined)
              || (row.rsvp_received_at as string | null | undefined)
              || new Date().toISOString(),
          });
        }
      });

      if (eventInviteRows.length > 0) {
        await insertEventInvitations(eventInviteRows);
      }

      if (rsvpRows.length > 0) {
        await replaceImportedGuestRsvps(rsvpRows);
      }

      await fetchGuests();
      setCsvImportSummary({ imported: csvPreview?.length ?? 0, skipped: csvSkipped.length, unknownEvents: csvUnknownEvents.length, duplicateNames: csvDuplicateNames.length, guardedHouseholds, householdKeys: keyToGuestIds.size });
      const skippedMsg = csvSkipped.length > 0 ? `, ${csvSkipped.length} row${csvSkipped.length === 1 ? '' : 's'} need review` : '';
      const householdsMsg = keyToGuestIds.size > 0 ? `, ${keyToGuestIds.size} household group${keyToGuestIds.size === 1 ? '' : 's'}` : '';
      const guardedMsg = guardedHouseholds > 0 ? `, ${guardedHouseholds} household match${guardedHouseholds === 1 ? '' : 'es'} left separate` : '';
      const eventsMsg = eventInviteRows.length > 0 ? `, ${eventInviteRows.length} event invite${eventInviteRows.length === 1 ? '' : 's'}` : '';
      const unknownEventsMsg = csvUnknownEvents.length > 0 ? `, ${csvUnknownEvents.length} event name${csvUnknownEvents.length === 1 ? '' : 's'} need review` : '';
      toast(`${csvPreview.length} guest${csvPreview.length !== 1 ? 's' : ''} imported${skippedMsg}${householdsMsg}${guardedMsg}${eventsMsg}${unknownEventsMsg}`, 'success');
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

  const filteredGuests = guests.filter((guest) => {
    const searchTerm = searchQuery.toLowerCase();
    const matchesSearch =
      guest.first_name?.toLowerCase().includes(searchTerm) ||
      guest.last_name?.toLowerCase().includes(searchTerm) ||
      guest.name.toLowerCase().includes(searchTerm) ||
      guest.email?.toLowerCase().includes(searchTerm);

    const eventSelections = parseRsvpEventSelections(guest.rsvp?.notes ?? null);
    const checkFilter = (filter: string) => {
      if (filter.startsWith('event-invited:')) {
        const eventId = filter.replace('event-invited:', '');
        if (eventId === 'legacy-ceremony') return guest.invited_to_ceremony;
        if (eventId === 'legacy-reception') return guest.invited_to_reception;
        return eventInviteGuestMap.get(eventId)?.has(guest.id) ?? false;
      }
      if (filter.startsWith('event-not-invited:')) {
        const eventId = filter.replace('event-not-invited:', '');
        if (eventId === 'legacy-ceremony') return !guest.invited_to_ceremony;
        if (eventId === 'legacy-reception') return !guest.invited_to_reception;
        return !(eventInviteGuestMap.get(eventId)?.has(guest.id) ?? false);
      }

      return (
        filter === 'all' ||
        guest.rsvp_status === filter ||
        (filter === 'ceremony-no' && eventSelections?.ceremony === false) ||
        (filter === 'reception-no' && eventSelections?.reception === false) ||
        (filter === 'missing-meal' && !!guest.rsvp?.attending && !guest.rsvp?.meal_choice) ||
        (filter === 'plusone-missing' && !!guest.plus_one_allowed && !!guest.rsvp?.attending && !guest.rsvp?.plus_one_name) ||
        (filter === 'pending-no-email' && isPendingRsvpStatus(guest.rsvp_status) && !guest.email) ||
        (filter === 'no-contact' && !guest.email && !guest.phone) ||
        (filter === 'missing-address' && !(guest as GuestWithRSVP & { mailing_address_line1?: string | null }).mailing_address_line1) ||
        (filter === 'due-reminder' && isDueReminder(guest)) ||
        (filter === 'checked-in' && !!(guest as GuestWithRSVP & { checked_in_at?: string | null }).checked_in_at) ||
        (filter === 'thank-you-due' && dueThankYouGuestIds.has(guest.id))
      );
    };

    const matchesPrimaryFilter = checkFilter(filterStatus);
    const matchesExtraFilters = extraFilters.every((f) => checkFilter(f));

    return matchesSearch && matchesPrimaryFilter && matchesExtraFilters;
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
    const ids = displayedGuests.filter((g) => getGuestIssueCount(g) > 0).map((g) => g.id);
    setSelectedGuestIds(new Set(ids));
    toast(ids.length > 0 ? `Selected ${ids.length} unresolved guest${ids.length === 1 ? '' : 's'}` : 'No unresolved guests in current view', ids.length > 0 ? 'success' : 'error');
  };

  const clearGuestSelection = () => {
    setSelectedGuestIds(new Set());
  };

  const selectFilteredGuests = () => {
    const ids = filteredGuests.map((g) => g.id);
    setSelectedGuestIds(new Set(ids));
    toast(ids.length > 0 ? `Selected ${ids.length} guest${ids.length === 1 ? '' : 's'} in current filter` : 'No guests in current filter', ids.length > 0 ? 'success' : 'error');
  };

  const keepOnlyVisibleSelection = () => {
    const visibleIds = new Set(filteredGuests.map((g) => g.id));
    setSelectedGuestIds((prev) => {
      const next = new Set<string>();
      prev.forEach((id) => {
        if (visibleIds.has(id)) next.add(id);
      });
      return next;
    });
    toast('Selection trimmed to current filter', 'success');
  };

  const stats = {
    total: guests.length,
    confirmed: guests.filter(g => isAttendingRsvpStatus(g.rsvp_status)).length,
    declined: guests.filter(g => isDeclinedRsvpStatus(g.rsvp_status)).length,
    pending: guests.filter(g => isPendingRsvpStatus(g.rsvp_status)).length,
    rsvpRate: guests.length > 0 ? Math.round(((guests.filter(g => hasRespondedRsvpStatus(g.rsvp_status)).length) / guests.length) * 100) : 0,
  };

  const plannerHandoff = {
    title: 'Planner handoff guidance',
    detail: 'Work the queue, keep guest updates moving, and escalate sensitive calls back to the couple.',
  };

  const eventReport = effectiveItineraryEvents.map((event) => {
    const invitedGuests = guests.filter((guest) => {
      if (event.id === 'legacy-ceremony') return guest.invited_to_ceremony;
      if (event.id === 'legacy-reception') return guest.invited_to_reception;
      return eventInviteGuestMap.get(event.id)?.has(guest.id) ?? false;
    });

    const attendingCount = invitedGuests.filter((guest) => {
      const eventSelections = parseRsvpEventSelections(guest.rsvp?.notes ?? null);
      if (event.id === 'legacy-ceremony') return eventSelections?.ceremony === true;
      if (event.id === 'legacy-reception') return eventSelections?.reception === true;
      return false;
    }).length;

    const declinedCount = invitedGuests.filter((guest) => {
      const eventSelections = parseRsvpEventSelections(guest.rsvp?.notes ?? null);
      if (event.id === 'legacy-ceremony') return eventSelections?.ceremony === false;
      if (event.id === 'legacy-reception') return eventSelections?.reception === false;
      return false;
    }).length;

    return {
      id: event.id,
      name: event.event_name,
      invited: invitedGuests.length,
      attending: attendingCount,
      declined: declinedCount,
      pending: Math.max(invitedGuests.length - attendingCount - declinedCount, 0),
    };
  });

  const exportEventAttendanceCSV = () => {
    const csvContent = buildEventAttendanceCsv({ guests, events: effectiveItineraryEvents, eventInviteGuestMap });
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `event-attendance_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

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
  const rsvpCompleteness = getGuestRsvpCompleteness(rsvpOps);
  const campaignReadiness = getGuestCampaignReadiness({ totalGuests: guests.length, contactStats, rsvpOps });
  const opsQueue = buildGuestOpsQueue(guests);


  const segmentLabelMap = GUEST_SEGMENT_LABELS;

  const labelForFilter = (filter: string) => {
    return getGuestSegmentLabel(filter, effectiveItineraryEvents);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'success' | 'error' | 'warning'> = {
      confirmed: 'success',
      declined: 'error',
      pending: 'warning',
    };
    const labels: Record<string, string> = {
      confirmed: 'Confirmed',
      declined: 'Declined',
      pending: 'Pending',
    };
    return <Badge variant={variants[status] || 'warning'}>{labels[status] || status}</Badge>;
  };

  const [skipRecentlyInvited, setSkipRecentlyInvited] = useState(true);
  const [reminderCadenceDays, setReminderCadenceDays] = useState<1 | 3 | 7>(3);
  const [autoRemindersEnabled, setAutoRemindersEnabled] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showOpsMenu, setShowOpsMenu] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [deleteAllConfirmInput, setDeleteAllConfirmInput] = useState('');
  const [deleteAllBusy, setDeleteAllBusy] = useState(false);

  const reminderCadenceMs = reminderCadenceDays * 24 * 60 * 60 * 1000;
  const isDueReminder = (g: GuestWithRSVP) => {
    const guest = g as GuestWithRSVP & { reminder_last_sent_at?: string | null; invitation_sent_at?: string | null };
    if (!guest.email || !isPendingRsvpStatus(guest.rsvp_status)) return false;
    const lastSentRaw = guest.reminder_last_sent_at || guest.invitation_sent_at;
    const lastSent = lastSentRaw ? new Date(lastSentRaw) : null;
    if (!lastSent || Number.isNaN(lastSent.getTime())) return true;
    return (Date.now() - lastSent.getTime()) >= reminderCadenceMs;
  };

  const dueReminderGuestIds = new Set(guests.filter(isDueReminder).map((g) => g.id));

  const dueThankYouGuestIds = new Set(
    guests
      .filter((g) => {
        const guest = g as GuestWithRSVP & { thank_you_sent_at?: string | null };
        return isAttendingRsvpStatus(g.rsvp_status) && !guest.thank_you_sent_at;
      })
      .map((g) => g.id)
  );

  const dueReminderCandidatesGlobal = guests.filter((g) => !!g.email && !!g.invite_token && isDueReminder(g));

  const reminderCandidates = emailableFilteredGuests.filter((g: any) => {
    if (!skipRecentlyInvited) return true;
    return dueReminderGuestIds.has(g.id);
  });

  const dryRunRecipientPreview = reminderCandidates.slice(0, 8).map((g) => (g.first_name || g.last_name) ? `${g.first_name ?? ""} ${g.last_name ?? ""}`.trim() : g.name);


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

            {!cleanGuestsView && recommendedAction && (
              <div className="p-3.5 rounded-lg border border-primary/20 bg-primary/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-text-primary">Recommended next action: {recommendedAction.title}</p>
                  <p className="text-xs text-text-secondary mt-0.5">{recommendedAction.detail}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setFilterStatus(recommendedAction.filter); setViewMode('list'); setSearchQuery(''); }}
                  >
                    Focus now
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => addFollowUpTask(`${recommendedAction.title}`)}
                  >
                    Save task
                  </Button>
                </div>
              </div>
            )}

            {!cleanGuestsView && opsQueue.length > 0 && (
              <div className="p-3.5 rounded-lg border border-border-subtle bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-text-primary">RSVP follow-up list</p>
                  <span className="text-xs text-text-tertiary break-words">{opsQueue.length} to review</span>
                </div>
                <div className="space-y-1.5">
                  {opsQueue.map((item, idx) => (
                    <button
                      key={`${item.guestId}-${idx}`}
                      onClick={() => { setFilterStatus(item.filter); setViewMode('list'); setSearchQuery(item.guestName); }}
                      className="w-full text-left px-2.5 py-2 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors"
                    >
                      <p className="text-xs font-semibold text-text-primary">{item.guestName}</p>
                      <p className="text-[11px] text-text-tertiary">{item.issue}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs">
              <p className="font-medium text-primary">{plannerHandoff.title}</p>
              <p className="mt-1 text-primary/80">{plannerHandoff.detail}</p>
              <p className="mt-2 text-primary/70">Use this surface to move guest work forward, but couple approval still matters for sensitive calls.</p>
            </div>

            {fromQuickStart && nextStep === 'photos' && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-text-primary">Next up: import guests, then add photos</p>
                  <p className="text-xs text-text-secondary mt-1">Import your guest list here. If you want to skip this for now, jump straight to photos and come back later.</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate(buildQuickStartPhotosPath())}>
                  Skip to photos
                </Button>
              </div>
            )}

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
              onAddGuest={() => {
                resetForm();
                setShowAddModal(true);
              }}
              onClearAllCheckIns={() => { void handleClearAllCheckIns(); }}
              onClearSelection={clearGuestSelection}
              onCopyAddressCollectionLink={copyContactRequestLink}
              onCopyChecklist={() => {
                const lines = followUpTasks.map((task) => `- [ ] ${task.text}`);
                const text = lines.length ? lines.join('\n') : '- [ ] No follow-up tasks yet';
                void copyTextOrDownload(text, 'dayof-guest-checklist.md', 'text/markdown;charset=utf-8')
                  .then((result) => toast(result === 'copied' ? 'Copied checklist markdown' : 'Clipboard was blocked, so the checklist downloaded.', 'success'));
              }}
              onCopyFilteredEmails={handleCopyFilteredEmails}
              onCopyMissingContactList={handleCopyNoContactChecklist}
              onCopyTextRsvpLinks={copySmsRsvpLinksForFiltered}
              onCreateChecklist={generateChecklistTasks}
              onDeleteAllGuests={() => {
                setDeleteAllConfirmInput('');
                setShowDeleteAllModal(true);
              }}
              onDryRun={() => {
                toast(`Dry run ready for ${reminderCandidates.length} ${reminderCandidates.length === 1 ? 'recipient' : 'recipients'}.`);
                void copyTextOrDownload(
                  `Campaign dry run (${segmentLabelMap[filterStatus] || filterStatus})\nRecipients: ${reminderCandidates.length}\n\n${dryRunRecipientPreview.join('\n')}${reminderCandidates.length > dryRunRecipientPreview.length ? `\n+${reminderCandidates.length - dryRunRecipientPreview.length} more` : ''}`,
                  'dayof-campaign-dry-run.txt',
                );
              }}
              onExportAddressCollection={exportAddressCollectionCSV}
              onExportAllGuests={exportCSV}
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
                void (async () => {
                  const previous = autoRemindersEnabled;
                  const next = !previous;
                  try {
                    setAutoRemindersEnabled(next);
                    await persistReminderSettings({ auto_reminders_enabled: next });
                    toast(next ? 'Auto reminders enabled' : 'Auto reminders paused', 'success');
                  } catch {
                    setAutoRemindersEnabled(previous);
                    toast('Couldn’t save auto reminder setting.', 'error');
                  }
                })();
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
                  email: guest.email ?? null,
                  id: guest.id,
                  name: (guest.first_name || guest.last_name)
                    ? `${guest.first_name ?? ''} ${guest.last_name ?? ''}`.trim()
                    : guest.name,
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

            <div className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-border-subtle bg-surface-subtle">
              <p className="text-xs text-text-secondary">
                Active segment: <span className="font-semibold text-text-primary">{segmentLabelMap[filterStatus] || filterStatus}</span>
                {extraFilters.length > 0 ? <> · +<span className="font-semibold text-text-primary">{extraFilters.length}</span> filters</> : null}
                {searchQuery ? <> · Search: <span className="font-semibold text-text-primary">“{searchQuery}”</span></> : null}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setFilterStatus('all'); setExtraFilters([]); setSearchQuery(''); setViewMode('list'); }}
                  className="text-xs px-2 py-1 rounded-md border border-border bg-white text-text-secondary hover:border-primary/40 hover:text-primary"
                >
                  Clear filters
                </button>
              </div>
            </div>

            {filteredGuests.some((guest) => (exceptionStateByGuest.get(guest.id) || []).length > 0) && filterStatus === 'all' && (
              <div className="p-2.5 rounded-lg border border-border-subtle bg-surface-subtle/60 text-text-secondary text-xs space-y-2">
                <p>Some guests have RSVP details that are worth reviewing personally.</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => handleCopyExceptionChecklist()} className="px-2 py-1 rounded-md border border-border-subtle bg-white text-text-secondary hover:bg-surface-subtle">Copy exception checklist</button>
                </div>
              </div>
            )}

            {filterStatus === 'missing-meal' && (
              <div className="p-2.5 rounded-lg border border-border-subtle bg-surface-subtle/60 text-text-secondary text-xs space-y-2">
                <p>These guests are attending but still need a meal choice.</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => handleCopyMissingMealChecklist()} className="px-2 py-1 rounded-md border border-border-subtle bg-white text-text-secondary hover:bg-surface-subtle">Copy meal follow-up checklist</button>
                  <button onClick={() => setShowCampaignModal(true)} className="px-2 py-1 rounded-md border border-border-subtle bg-white text-text-secondary hover:bg-surface-subtle">Send follow-up</button>
                </div>
              </div>
            )}

            {filterStatus === 'no-contact' && (
              <div className="p-2.5 rounded-lg border border-border-subtle bg-surface-subtle/60 text-text-secondary text-xs space-y-2">
                <p>These guests have no email or phone. Add contact info before reminder campaigns.</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => handleCopyNoContactChecklist()} className="px-2 py-1 rounded-md border border-border-subtle bg-white text-text-secondary hover:bg-surface-subtle">Copy follow-up checklist</button>
                  <button onClick={() => copyContactRequestLink()} className="px-2 py-1 rounded-md border border-border-subtle bg-white text-text-secondary hover:bg-surface-subtle">Copy guest update link</button>
                </div>
              </div>
            )}

            <div className="sticky top-2 z-10 flex gap-2 flex-wrap items-start justify-between bg-white/95 backdrop-blur p-2.5 rounded-lg border border-border/50">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  {([
                    ['all', `All (${stats.total})`],
                    ['confirmed', `Confirmed (${stats.confirmed})`],
                    ['declined', `Declined (${stats.declined})`],
                    ['pending', `Pending (${stats.pending})`],
                  ] as const).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => { setFilterStatus(value); setExtraFilters([]); }}
                      className={`text-xs px-3.5 py-1.5 rounded-lg border transition-colors whitespace-nowrap ${
                        filterStatus === value
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white text-text-secondary border-border/70 hover:border-primary/35 hover:text-primary'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={() => { setCheckInMode(false); setViewMode(v => v === 'households' ? 'list' : 'households'); }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors border whitespace-nowrap shrink-0 ${
                  viewMode === 'households' && !checkInMode
                    ? 'bg-primary text-text-inverse border-primary'
                    : 'text-text-secondary border-border hover:border-primary hover:text-primary'
                }`}
              >
                <Home className="w-3.5 h-3.5" />
                Households
              </button>
              <button
                onClick={() => { setCheckInMode(v => !v); setViewMode('list'); }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors border whitespace-nowrap shrink-0 ${
                  checkInMode
                    ? 'bg-success text-white border-success'
                    : 'text-text-secondary border-border hover:border-success/60 hover:text-success'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Check-in mode
              </button>
            </div>


            {checkInMode && (
              <div className="mb-3 flex items-center justify-between px-4 py-2.5 bg-success/10 border border-success/25 rounded-lg">
                <span className="text-sm font-medium text-success">Check-in mode active · {guests.filter((g) => !!(g as GuestWithRSVP & { checked_in_at?: string | null }).checked_in_at).length} checked in</span>
                <button
                  onClick={() => setFilterStatus('checked-in')}
                  className="text-xs px-2 py-1 rounded-md border border-success/30 bg-white text-success hover:bg-success/5"
                >
                  View checked-in
                </button>
              </div>
            )}

            {checkInMode && lastCheckIn && (
              <div className="mb-3 flex items-center justify-between px-4 py-2 bg-surface-subtle border border-border rounded-lg">
                <span className="text-xs text-text-secondary">Last check-in: <span className="font-medium text-text-primary">{lastCheckIn.guestName}</span></span>
                <button
                  onClick={handleUndoLastCheckIn}
                  className="text-xs px-2 py-1 rounded-md border border-border bg-white text-text-secondary hover:border-primary/40 hover:text-primary"
                >
                  Undo
                </button>
              </div>
            )}

            {selectedGuestIds.size > 0 && viewMode === 'list' && (
              <div className="mb-3 flex items-center justify-between px-4 py-2 bg-primary/8 border border-primary/20 rounded-lg">
                <span className="text-sm font-medium text-primary">{selectedGuestIds.size} selected · {filteredGuests.filter((g) => selectedGuestIds.has(g.id)).length} visible</span>
                <div className="flex items-center gap-2">
                  <button onClick={keepOnlyVisibleSelection} className="text-xs px-2 py-1 rounded-md border border-border bg-white text-text-secondary hover:border-primary/40 hover:text-primary">Keep visible only</button>
                  <button onClick={clearGuestSelection} className="text-xs px-2 py-1 rounded-md border border-border bg-white text-text-secondary hover:border-primary/40 hover:text-primary">Clear</button>
                </div>
              </div>
            )}

            <GuestListDisplaySwitcher
              filteredGuestCount={filteredGuests.length}
              householdProps={{
                householdBusy,
                households,
                isDemoMode,
                selectedGuestIds,
                getStatusBadge,
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
                getStatusBadge,
                onDeleteGuest: handleDeleteGuest,
                onOpenAssistedRsvpModal: openAssistedRsvpModal,
                onOpenEditModal: openEditModal,
                onOpenItineraryDrawer: openItineraryDrawer,
                onSendInvitation: handleSendInvitation,
                onToggleCheckIn: handleToggleCheckIn,
                onMarkThankYouSent: handleMarkThankYouSent,
              }}
              viewMode={viewMode}
              onClearFilters={() => {
                setFilterStatus('all');
                setExtraFilters([]);
                setSearchQuery('');
              }}
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
        onCloseAddModal={() => {
          setShowAddModal(false);
          resetForm();
        }}
        onCloseAssistedRsvp={() => setAssistedRsvpGuest(null)}
        onCloseDeleteAllModal={() => setShowDeleteAllModal(false)}
        onCloseEditModal={() => {
          setEditingGuest(null);
          resetForm();
        }}
        onCloseItineraryDrawer={() => {
          setItineraryDrawerGuest(null);
          setGuestAuditEntries([]);
        }}
        onConfirmCsvImport={confirmCsvImport}
        onConfirmDeleteAllGuests={handleDeleteAllGuests}
        onCopyContactRequestLink={copyContactRequestLink}
        onFocusGuestSearch={setSearchQuery}
        onResetCsvReview={() => {
          if (!csvImporting) {
            setCsvPreview(null);
            setCsvUnknownEvents([]);
            setCsvDuplicateNames([]);
            setCsvMappingSummary({ core: [], rsvp: [], household: [], eventCols: [], weak: [] });
          }
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
