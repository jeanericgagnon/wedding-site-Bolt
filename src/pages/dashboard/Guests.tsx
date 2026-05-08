import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PLANNER_ROLE_OPTIONS, canManageGuests, derivePlannerRoleFromPermissions, readPlannerAccessRole, writePlannerAccessRole } from '../../lib/plannerAccess';
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
import { GUEST_IMPORT_MAX_FILE_BYTES, GUEST_IMPORT_MAX_ROWS } from '../../lib/guestImportParser';
import { Button, Badge, Input, Select, Textarea } from '../../components/ui';
import { Download, UserPlus, XCircle, Clock, X, Upload, Users, Mail, AlertCircle, Merge, Scissors, CalendarDays, ChevronRight, Loader2, ChevronDown, Trash2, ExternalLink, Eye } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../components/ui/Toast';
import type { ConfirmDialogProps } from '../../components/ui/ConfirmDialog';
import { buildQuickStartPhotosPath, readQuickStartDashboardContinuation } from '../../lib/quickStartContinuation';
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
import { buildGuestDashboardOverlayProps } from './guests/buildGuestDashboardOverlayProps';
import { buildGuestDashboardViewProps } from './guests/buildGuestDashboardViewProps';
import { GuestDashboardRouteView } from './guests/GuestDashboardRouteView';
import {
  type Guest,
  type GuestWithRSVP,
  type ItineraryEvent,
  type RsvpConflictStats,
} from './guests/guestDashboardTypes';
import {
  buildGuestHouseholdGroups,
  buildGuestOpsQueue,
  buildFilteredEmailList,
  buildFollowUpTask,
  buildGeneratedFollowUpTasks,
  buildMissingMealChecklistLines,
  buildNoContactChecklistLines,
  buildRsvpExceptionChecklistLines,
  buildRsvpFollowUpSummary,
  buildSavedSegment,
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
  clearGuestCheckInsForSite,
  createGuest,
  deleteAllGuestsForSite,
  deleteGuestById,
  deleteGuestWithDependencies,
  fetchGuestRsvps,
  generateSecureGuestInviteToken,
  insertEventInvitations,
  loadGuestDashboardPublicSlug,
  loadGuestDashboardSiteSlug,
  markGuestsThankYouSentForSite,
  persistGuestDashboardRsvpConfig,
  persistGuestReminderSettings,
  resolveGuestDashboardConflict,
  resolveGuestDashboardConflicts,
  replaceGuestEventInvitations,
  restoreGuestEventInvitations,
  toEventInvitationRows,
  updateGuest,
  updateGuestCheckInForSite,
  updateGuestThankYouSentForSite,
  type GuestEventInvitationRollback,
} from './guests/guestService';
import { useGuestDashboardCampaignActions } from './guests/useGuestDashboardCampaignActions';
import { useGuestDashboardCsvImport } from './guests/useGuestDashboardCsvImport';
import { useGuestDashboardData } from './guests/useGuestDashboardData';
import { useGuestDashboardGuestDetailActions } from './guests/useGuestDashboardGuestDetailActions';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'confirmed' | 'declined' | 'pending' | 'checked-in' | 'thank-you-due' | 'due-reminder' | 'missing-address' | 'ceremony-no' | 'reception-no' | 'missing-meal' | 'plusone-missing' | 'pending-no-email' | 'manual-follow-up' | 'manual-handled' | 'no-contact'>('all');
  const [extraFilters, setExtraFilters] = useState<string[]>([]);
  const [extraFilterDraft, setExtraFilterDraft] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingGuest, setEditingGuest] = useState<GuestWithRSVP | null>(null);
  const [campaignLog, setCampaignLog] = useState<RsvpCampaignLogEntry[]>([]);
  const [showRecipientPreview, setShowRecipientPreview] = useState(false);
  const [campaignPreset, setCampaignPreset] = useState<RsvpCampaignPreset>('pending');
  const [followUpTasks, setFollowUpTasks] = useState<RsvpFollowUpTask[]>([]);
  const [sortByPriority, setSortByPriority] = useState(false);
  const [savedSegments, setSavedSegments] = useState<RsvpSavedSegment[]>([]);
  const [guestsTab, setGuestsTab] = useState<'ops' | 'rsvp-config'>('ops');
  const [rsvpConfigSaving, setRsvpConfigSaving] = useState(false);
  const [rsvpAutoSaveState, setRsvpAutoSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [rsvpConfigDirty, setRsvpConfigDirty] = useState(false);
  const [conflictFilter, setConflictFilter] = useState<'all' | 'error' | 'warning'>('all');
  const rsvpConfigLoadedRef = useRef(false);
  const [skipRecentlyInvited, setSkipRecentlyInvited] = useState(true);
  const [reminderCadenceDays, setReminderCadenceDays] = useState<1 | 3 | 7>(3);
  const [autoRemindersEnabled, setAutoRemindersEnabled] = useState(false);
  const {
    eventInviteGuestMap,
    fetchGuests,
    guests,
    guestsPermissions,
    guestsRole,
    itineraryEvents,
    itineraryFilterEvents,
    loading,
    rsvpAuditFeed,
    rsvpAuditLoading,
    rsvpConflictHistory,
    rsvpConflicts,
    rsvpMealEnabled,
    rsvpMealOptions,
    rsvpQuestions,
    setGuests,
    setGuestsRole,
    setItineraryEvents,
    setRsvpConflictHistory,
    setRsvpConflicts,
    setRsvpMealEnabled,
    setRsvpMealOptions,
    setRsvpQuestions,
    setWeddingSiteId,
    weddingSiteId,
    weddingSiteInfo,
  } = useGuestDashboardData({
    guestsTab,
    isDemoMode,
    rsvpConfigLoadedRef,
    setAutoRemindersEnabled,
    setReminderCadenceDays,
    toast,
    userId: user?.id ?? null,
  });
  const isGuestsReadOnly = !canManageGuests(guestsRole, guestsPermissions);
  const [showConflictDetails, setShowConflictDetails] = useState(false);
  const [resolvingConflictId, setResolvingConflictId] = useState<string | null>(null);
  const effectiveItineraryEvents = useMemo<ItineraryEvent[]>(() => {
    if (itineraryFilterEvents.length > 0) return itineraryFilterEvents;
    return [
      { id: 'legacy-ceremony', event_name: 'Ceremony', event_date: '', start_time: '', location_name: '' },
      { id: 'legacy-reception', event_name: 'Reception', event_date: '', start_time: '', location_name: '' },
    ];
  }, [itineraryFilterEvents]);

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

  const [showInsights, setShowInsights] = useState(false);
  const cleanGuestsView = !showInsights;

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

  const visibleRsvpConflicts = useMemo(
    () => rsvpConflicts.filter((c) => conflictFilter === 'all' ? true : c.severity === conflictFilter),
    [rsvpConflicts, conflictFilter]
  );

  const {
    assistedRsvpGuest,
    assistedRsvpNotes,
    assistedRsvpSaving,
    assistedRsvpSource,
    assistedRsvpStatus,
    guestAuditEntries,
    guestEventIds,
    handleMergeIntoHousehold,
    handleReassignHousehold,
    handleSaveAssistedRsvp,
    handleSplitFromHousehold,
    handleToggleCheckIn,
    handleToggleEventInvite,
    householdBusy,
    itineraryDrawerGuest,
    drawerItineraryEvents,
    lastCheckIn,
    loadingDrawer,
    openAssistedRsvpModal,
    openItineraryDrawer,
    setAssistedRsvpGuest,
    setAssistedRsvpNotes,
    setAssistedRsvpSource,
    setAssistedRsvpStatus,
    setGuestAuditEntries,
    setItineraryDrawerGuest,
    setLastCheckIn,
    togglingEventId,
  } = useGuestDashboardGuestDetailActions({
    fetchGuests,
    guests,
    isDemoMode,
    isGuestsReadOnly,
    setGuests,
    toast,
    weddingSiteId,
  });
  const generateSecureToken = async (): Promise<string> => generateSecureGuestInviteToken();
  const generateLocalInviteToken = () => `demo_${Math.random().toString(36).slice(2, 14)}`;
  const {
    csvColumnSamples,
    csvDataRows,
    csvDuplicateNames,
    csvFieldMap,
    csvFileInputRef,
    csvHeaders,
    csvHouseholdWarnings,
    csvImporting,
    csvImportSummary,
    csvMappingSummary,
    csvNameMappingValid,
    csvPreview,
    csvSelectedFilename,
    csvShowMapper,
    csvSkipped,
    csvUnknownEvents,
    buildCsvPreviewFromMapping,
    confirmCsvImport,
    importCSV,
    resetCsvReviewState,
    setCsvFieldMap,
    setCsvShowMapper,
  } = useGuestDashboardCsvImport({
    buildQuickStartPhotosPath,
    drawerItineraryEvents,
    fetchGuests,
    fromQuickStart,
    generateLocalInviteToken,
    generateSecureToken,
    isDemoMode,
    isGuestsReadOnly,
    navigate,
    nextStep,
    setGuests,
    setWeddingSiteId,
    toast,
    userId: user?.id ?? null,
    weddingSiteId,
  });

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

  const persistReminderSettings = async (patch: { reminder_cadence_days?: 1 | 3 | 7; auto_reminders_enabled?: boolean }) => {
    if (!weddingSiteId || isDemoMode) return;
    await persistGuestReminderSettings(weddingSiteId, patch);
  };

  const households = useMemo(() => buildGuestHouseholdGroups(guests), [guests]);

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

  const {
    bulkSending,
    handleSendBulkInvitations,
    handleSendDueRemindersNow,
    handleSendInvitation,
    handleSendSelectedInvitations,
    sendingInviteId,
  } = useGuestDashboardCampaignActions({
    contactStats,
    dueReminderCandidatesGlobal,
    fetchGuests,
    filterLabel: segmentLabelMap[filterStatus] || filterStatus,
    guests,
    isDemoMode,
    isGuestsReadOnly,
    reminderCadenceDays,
    reminderCandidates,
    requestConfirmation,
    selectedGuestIds,
    setCampaignLog,
    skipRecentlyInvited,
    toast,
    weddingSiteId,
    weddingSiteInfo,
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
    loadPublicSlug: loadGuestDashboardPublicSlug,
    loadSiteSlug: loadGuestDashboardSiteSlug,
    reminderCandidates,
    segmentLabel: segmentLabelMap[filterStatus] || filterStatus,
    toast,
    weddingSiteId,
    weddingSiteInfo,
  });

  const dryRunRecipientPreview = reminderCandidates.slice(0, 8).map((g) => (g.first_name || g.last_name) ? `${g.first_name ?? ""} ${g.last_name ?? ""}`.trim() : g.name);

  const canEditGuests = !isGuestsReadOnly;
  const { guestDashboardOpsViewProps, guestRsvpConfigViewProps } = buildGuestDashboardViewProps({
    autoRemindersEnabled,
    bulkSending,
    campaignPreset,
    campaignReadiness,
    canEditGuests,
    checkInMode,
    cleanGuestsView,
    conflictFilter,
    confirmDeleteId,
    contactStats,
    csvFileInputRef,
    csvImportSummary,
    csvImporting,
    csvMaxFileMb: Math.round(GUEST_IMPORT_MAX_FILE_BYTES / 1024 / 1024),
    csvMaxRows: GUEST_IMPORT_MAX_ROWS,
    csvSelectedFilename,
    customAnswerRollup,
    daysToWedding,
    deleteAllBusy,
    deleteAllConfirmInput,
    deletingGuestId,
    displayedGuests,
    dueReminderCandidatesGlobal,
    effectiveItineraryEvents,
    eventReport,
    exceptionStateByGuest,
    extraFilters,
    fallbackByGuest,
    filterStatus,
    filteredGuests,
    formRsvpStats: stats,
    fromQuickStart,
    getStatusBadge,
    guests,
    guestsRole,
    householdBusy,
    households,
    isDemoMode,
    isGuestsReadOnly,
    lastCheckIn,
    loadingDrawer,
    mealChoiceRollup,
    mealSummary,
    nextStep,
    nextUnresolvedGuest,
    opsQueue,
    plannerHandoff,
    recommendedAction,
    reminderCandidates,
    resolvingConflictId,
    rsvpAccessModePlan,
    rsvpAuditFeed,
    rsvpAuditLoading,
    rsvpAutoSaveState,
    rsvpConfigSaving,
    rsvpConflictStats,
    rsvpConflicts,
    rsvpMealEnabled,
    rsvpMealOptions,
    rsvpOps,
    rsvpQuestionTemplateCoverage,
    rsvpQuestions,
    rsvpSetupChecklist,
    searchQuery,
    segmentLabelMap,
    selectedGuestIds,
    sendingInviteId,
    showCampaignModal,
    showConflictDetails,
    showInsights,
    showOpsMenu,
    showRecipientPreview,
    skipRecentlyInvited,
    songRequestEntries,
    stats,
    viewMode,
    visibleRsvpConflicts,
    onAddFollowUpTask: addFollowUpTask,
    onAddGuest: () => {
      resetForm();
      setShowAddModal(true);
    },
    onAddRsvpQuestionTemplate: addRsvpQuestionTemplate,
    onApplyCampaignPreset: applyCampaignPreset,
    onClearAllCheckIns: () => { void handleClearAllCheckIns(); },
    onClearFilters: () => {
      setFilterStatus('all');
      setExtraFilters([]);
      setSearchQuery('');
      setViewMode('list');
    },
    onClearSelection: clearGuestSelection,
    onCopyAddressCollectionLink: () => { void copyContactRequestLink(); },
    onCopyChecklist: () => {
      const lines = followUpTasks.map((task) => `- [ ] ${task.text}`);
      const text = lines.length ? lines.join('\n') : '- [ ] No follow-up tasks yet';
      void copyTextOrDownload(text, 'dayof-guest-checklist.md', 'text/markdown;charset=utf-8')
        .then((result) => toast(result === 'copied' ? 'Copied checklist markdown' : 'Clipboard was blocked, so the checklist downloaded.', 'success'));
    },
    onCopyContactRequestLink: () => { void copyContactRequestLink(); },
    onCopyExceptionChecklist: () => { void handleCopyExceptionChecklist(); },
    onCopyFilteredEmails: () => { void handleCopyFilteredEmails(); },
    onCopyMissingContactList: () => { void handleCopyNoContactChecklist(); },
    onCopyMissingMealChecklist: () => { void handleCopyMissingMealChecklist(); },
    onCopyTextRsvpLinks: () => { void copySmsRsvpLinksForFiltered(); },
    onCreateChecklist: generateChecklistTasks,
    onDeleteAllGuests: () => {
      setDeleteAllConfirmInput('');
      setShowDeleteAllModal(true);
    },
    onDeleteGuest: handleDeleteGuest,
    onDryRun: () => {
      toast(`Dry run ready for ${reminderCandidates.length} ${reminderCandidates.length === 1 ? 'recipient' : 'recipients'}.`);
      void copyTextOrDownload(
        `Campaign dry run (${segmentLabelMap[filterStatus] || filterStatus})\nRecipients: ${reminderCandidates.length}\n\n${dryRunRecipientPreview.join('\n')}${reminderCandidates.length > dryRunRecipientPreview.length ? `\n+${reminderCandidates.length - dryRunRecipientPreview.length} more` : ''}`,
        'dayof-campaign-dry-run.txt',
      );
    },
    onExportAddressCollection: exportAddressCollectionCSV,
    onExportAllGuests: exportCSV,
    onExportAttendingGuests: exportAttendingGuestsCSV,
    onExportCheckedInGuests: exportCheckedInCSV,
    onExportDeclinedGuests: exportDeclinedGuestsCSV,
    onExportEventAttendance: exportEventAttendanceCSV,
    onExportFilteredGuests: exportFilteredCSV,
    onExportHouseholdLabels: exportHouseholdLabelsCSV,
    onExportMissingMealChoices: exportMissingMealCSV,
    onExportPendingRsvp: exportPendingGuestsCSV,
    onExportRsvpResponders: exportRsvpRespondersCSV,
    onExportThankYouDue: exportThankYouDueCSV,
    onFileChange: importCSV,
    onFocusCeremonyNo: () => { setSearchQuery(''); setFilterStatus('ceremony-no'); },
    onFocusHandledPersonally: () => { setFilterStatus('manual-handled'); setViewMode('list'); setShowCampaignModal(false); },
    onFocusHighRiskFirst: () => { setFilterStatus('all'); setViewMode('list'); setSearchQuery(''); setSortByPriority(true); setShowCampaignModal(false); },
    onFocusMissingContact: () => { setSearchQuery(''); setFilterStatus('no-contact'); setViewMode('list'); setShowCampaignModal(false); },
    onFocusMissingMeal: () => { setSearchQuery(''); setFilterStatus('missing-meal'); setViewMode('list'); setShowCampaignModal(false); },
    onFocusNoResponse: () => { setSearchQuery(''); setFilterStatus('pending'); },
    onFocusPending: () => { setFilterStatus('pending'); setViewMode('list'); setShowCampaignModal(false); },
    onFocusPendingNoEmail: () => { setSearchQuery(''); setFilterStatus('pending-no-email'); setViewMode('list'); setShowCampaignModal(false); },
    onFocusPlusOneMissing: () => { setSearchQuery(''); setFilterStatus('plusone-missing'); setViewMode('list'); },
    onFocusPlusOneNames: () => { setFilterStatus('plusone-missing'); setViewMode('list'); setShowCampaignModal(false); },
    onFocusQueueItem: (filter: string, guestName: string) => {
      setFilterStatus(filter as typeof filterStatus);
      setViewMode('list');
      setSearchQuery(guestName);
    },
    onFocusRecommendedAction: (filter: string) => {
      setFilterStatus(filter as typeof filterStatus);
      setViewMode('list');
      setSearchQuery('');
    },
    onFocusReceptionNo: () => { setSearchQuery(''); setFilterStatus('reception-no'); },
    onKeepOnlyVisibleSelection: keepOnlyVisibleSelection,
    onMarkAllDueThankYous: () => { void handleMarkAllDueThankYous(); },
    onMarkThankYouSent: handleMarkThankYouSent,
    onMergeIntoHousehold: () => handleMergeIntoHousehold(selectedGuestIds, () => setSelectedGuestIds(new Set())),
    onNextUnresolved: () => {
      if (nextUnresolvedGuest) {
        setSearchQuery((nextUnresolvedGuest.first_name || nextUnresolvedGuest.last_name) ? `${nextUnresolvedGuest.first_name ?? ''} ${nextUnresolvedGuest.last_name ?? ''}`.trim() : nextUnresolvedGuest.name);
        setViewMode('list');
      }
    },
    onOpenAssistedRsvpModal: openAssistedRsvpModal,
    onOpenCampaignModal: () => setShowCampaignModal(true),
    onOpenEditModal: openEditModal,
    onOpenItineraryDrawer: openItineraryDrawer,
    onResolveAllVisibleConflicts: resolveAllVisibleConflicts,
    onResolveConflict: resolveConflict,
    onReviewPending: () => { setFilterStatus('pending'); setViewMode('list'); },
    onSaveRsvpConfig: handleSaveRsvpConfig,
    onSearchQueryChange: setSearchQuery,
    onSelectCheckedInFilter: () => setFilterStatus('checked-in'),
    onSelectFiltered: selectFilteredGuests,
    onSelectPrimaryFilter: (value: string) => {
      setFilterStatus(value as typeof filterStatus);
      setExtraFilters([]);
    },
    onSelectUnresolved: selectUnresolvedGuests,
    onSendDueReminders: () => { void handleSendDueRemindersNow(); },
    onSendDueRemindersToggle: () => {
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
    },
    onSendFilteredInvitations: () => { void handleSendBulkInvitations(); },
    onSendInvitation: handleSendInvitation,
    onSendSelectedInvitations: () => { void handleSendSelectedInvitations(); },
    onSetConfirmDialog: setConfirmDialog,
    onSetConflictFilter: setConflictFilter,
    onSetGuestsTab: setGuestsTab,
    onSetRsvpConfigDirty: setRsvpConfigDirty,
    onSetRsvpMealEnabled: setRsvpMealEnabled,
    onSetRsvpMealOptions: setRsvpMealOptions,
    onSetRsvpQuestions: setRsvpQuestions,
    onSetSelectedGuestIds: setSelectedGuestIds,
    onSetShowCampaignModal: setShowCampaignModal,
    onSetShowOpsMenu: setShowOpsMenu,
    onSetShowRecipientPreview: setShowRecipientPreview,
    onSetSkipRecentlyInvited: setSkipRecentlyInvited,
    onSkipToPhotos: () => navigate(buildQuickStartPhotosPath()),
    onToggleCheckIn: handleToggleCheckIn,
    onToggleCheckInMode: () => { setCheckInMode(v => !v); setViewMode('list'); },
    onToggleConflictDetails: () => setShowConflictDetails((value) => !value),
    onToggleHouseholdsView: () => { setCheckInMode(false); setViewMode(v => v === 'households' ? 'list' : 'households'); },
    onToggleInsights: () => setShowInsights((value) => !value),
    onUndoLastCheckIn: () => { void handleUndoLastCheckIn(); },
    onHeaderAddGuest: () => setShowAddModal(true),
  });
  const guestOverlayProps = buildGuestDashboardOverlayProps({
    assistedRsvpGuest,
    assistedRsvpNotes,
    assistedRsvpSaving,
    assistedRsvpSource,
    assistedRsvpStatus,
    confirmDialog,
    csvColumnSamples,
    csvDataRows,
    csvDuplicateNames,
    csvFieldMap,
    csvHeaders,
    csvHouseholdWarnings,
    csvImporting,
    csvMappingSummary,
    csvNameMappingValid,
    csvPreview,
    csvSelectedFilename,
    csvShowMapper,
    csvSkipped,
    csvUnknownEvents,
    deleteAllBusy,
    deleteAllConfirmInput,
    editingGuest,
    effectiveItineraryEvents,
    formData,
    formEventInviteIds,
    guestAuditEntries,
    guestEventIds,
    guests,
    itineraryDrawerGuest,
    itineraryEvents,
    itineraryFilterEventCount: itineraryFilterEvents.length,
    loadingDrawer,
    showAddModal,
    showDeleteAllModal,
    togglingEventId,
    weddingSiteInfo,
    onAddFollowUpTask: addFollowUpTask,
    onBuildCsvPreview: buildCsvPreviewFromMapping,
    onCloseAddModal: () => {
      setShowAddModal(false);
      resetForm();
    },
    onCloseAssistedRsvp: () => setAssistedRsvpGuest(null),
    onCloseDeleteAllModal: () => setShowDeleteAllModal(false),
    onCloseEditModal: () => {
      setEditingGuest(null);
      resetForm();
    },
    onCloseItineraryDrawer: () => {
      setItineraryDrawerGuest(null);
      setGuestAuditEntries([]);
    },
    onConfirmCsvImport: confirmCsvImport,
    onConfirmDeleteAllGuests: handleDeleteAllGuests,
    onCopyContactRequestLink: copyContactRequestLink,
    onFocusGuestSearch: setSearchQuery,
    onResetCsvReview: () => {
      if (!csvImporting) resetCsvReviewState();
    },
    onSaveAssistedRsvp: handleSaveAssistedRsvp,
    onSetAssistedRsvpNotes: setAssistedRsvpNotes,
    onSetAssistedRsvpSource: setAssistedRsvpSource,
    onSetAssistedRsvpStatus: setAssistedRsvpStatus,
    onSetCsvFieldMap: setCsvFieldMap,
    onSetCsvShowMapper: setCsvShowMapper,
    onSetDeleteAllConfirmInput: setDeleteAllConfirmInput,
    onSetFormData: setFormData,
    onSetFormEventInviteIds: setFormEventInviteIds,
    onSubmitAddGuest: handleAddGuest,
    onSubmitEditGuest: handleEditGuest,
    onToast: toast,
    onToggleEventInvite: handleToggleEventInvite,
  });

  return (
    <GuestDashboardRouteView
      loading={loading}
      overlayProps={guestOverlayProps}
      opsViewProps={guestDashboardOpsViewProps}
      rsvpConfigViewProps={guestRsvpConfigViewProps}
      showRsvpConfig={guestsTab === 'rsvp-config'}
    />
  );
};
