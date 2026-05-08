import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PLANNER_ROLE_OPTIONS, canManageGuests, derivePlannerRoleFromPermissions, readPlannerAccessRole, writePlannerAccessRole } from '../../lib/plannerAccess';
import { formatGuestOpsDate, formatGuestOpsDateTime, formatGuestOpsRelativeTime } from './guestOpsTime';
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
} from './guests/guestDashboardTypes';
import {
  buildGuestHouseholdGroups,
  buildGuestOpsQueue,
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
  writeStoredFollowUpTasks,
  writeStoredSavedSegments,
  type RsvpCampaignLogEntry,
  type RsvpCampaignPreset,
  type RsvpFollowUpTask,
  type RsvpSavedSegment,
} from './guests/guestDashboardStorage';
import {
  fetchGuestRsvps,
  generateSecureGuestInviteToken,
  loadGuestDashboardPublicSlug,
  loadGuestDashboardSiteSlug,
} from './guests/guestService';
import { useGuestDashboardCampaignActions } from './guests/useGuestDashboardCampaignActions';
import { useGuestDashboardCheckIns } from './guests/useGuestDashboardCheckIns';
import { useGuestDashboardClipboardActions } from './guests/useGuestDashboardClipboardActions';
import { useGuestDashboardConflictActions } from './guests/useGuestDashboardConflictActions';
import { useGuestDashboardCsvImport } from './guests/useGuestDashboardCsvImport';
import { useGuestDashboardData } from './guests/useGuestDashboardData';
import { useGuestDashboardFollowUpActions } from './guests/useGuestDashboardFollowUpActions';
import { useGuestDashboardCrudActions } from './guests/useGuestDashboardCrudActions';
import { useGuestDashboardGuestDetailActions } from './guests/useGuestDashboardGuestDetailActions';
import { useGuestDashboardOpsActions } from './guests/useGuestDashboardOpsActions';
import { useGuestDashboardRsvpConfigActions } from './guests/useGuestDashboardRsvpConfigActions';
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

  const {
    addRsvpQuestionTemplate,
    handleSaveRsvpConfig,
    rsvpAutoSaveState,
    rsvpConfigDirty,
    rsvpConfigSaving,
    setRsvpConfigDirty,
  } = useGuestDashboardRsvpConfigActions({
    guestsTab,
    isDemoMode,
    rsvpConfigLoadedRef,
    rsvpMealEnabled,
    rsvpMealOptions,
    rsvpQuestions,
    setRsvpQuestions,
    toast,
    weddingSiteId,
  });

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
    generateSecureToken: generateSecureGuestInviteToken,
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

  const {
    resolveAllVisibleConflicts,
    resolveConflict,
    resolvingConflictId,
    rsvpConflictStats,
    visibleRsvpConflicts,
  } = useGuestDashboardConflictActions({
    conflictFilter,
    isDemoMode,
    rsvpConflictHistory,
    rsvpConflicts,
    setRsvpConflictHistory,
    setRsvpConflicts,
    toast,
  });

  const [deletingGuestId, setDeletingGuestId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const households = useMemo(() => buildGuestHouseholdGroups(guests), [guests]);

  const {
    handleAddGuest,
    handleDeleteGuest,
    handleEditGuest,
    openEditModal,
    resetForm,
  } = useGuestDashboardCrudActions({
    effectiveItineraryEvents,
    eventInviteGuestMap,
    fetchGuests,
    formData,
    formEventInviteIds,
    guests,
    isDemoMode,
    isGuestsReadOnly,
    logGuestAction,
    setConfirmDeleteId,
    setDeletingGuestId,
    setEditingGuest,
    setFormData,
    setFormEventInviteIds,
    setGuests,
    setShowAddModal,
    toast,
    weddingSiteId,
  });

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
    applyCampaignPreset,
    clearFilters,
    clearGuestSelection,
    focusHighRiskFirst,
    handleDeleteAllGuests,
    keepOnlyVisibleSelection,
    persistReminderSettingsForSite,
    selectFilteredGuests,
  } = useGuestDashboardOpsActions({
    deleteAllConfirmInput,
    fetchGuests,
    filteredGuests,
    guests,
    isDemoMode,
    logGuestAction,
    setCampaignPreset,
    setDeleteAllBusy,
    setDeleteAllConfirmInput,
    setExtraFilters,
    setFilterStatus,
    setSearchQuery,
    setSelectedGuestIds,
    setShowDeleteAllModal,
    setSortByPriority,
    setViewMode,
    toast,
    weddingSiteId,
  });
  const {
    handleClearAllCheckIns,
    handleMarkAllDueThankYous,
    handleMarkThankYouSent,
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
  const { addFollowUpTask, generateChecklistTasks, saveCurrentSegment } = useGuestDashboardFollowUpActions({
    contactStats,
    filterStatus,
    filteredGuestCount: filteredGuests.length,
    rsvpOps,
    segmentLabel: segmentLabelMap[filterStatus] || filterStatus,
    setFollowUpTasks,
    setSavedSegments,
    toast,
  });
  const {
    handleCopyCampaignDryRun,
    handleCopyChecklist,
    handleCopyExceptionChecklist,
    handleCopyFilteredEmails,
    handleCopyMissingMealChecklist,
    handleCopyNoContactChecklist,
    handleCopyOpsSummary,
  } = useGuestDashboardClipboardActions({
    contactStats,
    exceptionStateByGuest,
    filteredGuests,
    filterStatus,
    followUpTasks,
    reminderCandidates,
    rsvpOps,
    segmentLabel: segmentLabelMap[filterStatus] || filterStatus,
    toast,
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
    onClearFilters: clearFilters,
    onClearSelection: clearGuestSelection,
    onCopyAddressCollectionLink: () => { void copyContactRequestLink(); },
    onCopyChecklist: () => { void handleCopyChecklist(); },
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
    onDeleteGuest: (guestId) => { void handleDeleteGuest(guestId, confirmDeleteId); },
    onDryRun: () => { void handleCopyCampaignDryRun(); },
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
    onFocusHighRiskFirst: () => { focusHighRiskFirst(); setShowCampaignModal(false); },
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
          await persistReminderSettingsForSite({ auto_reminders_enabled: next });
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
    onSubmitAddGuest: (event) => { void handleAddGuest(event); },
    onSubmitEditGuest: (event) => { void handleEditGuest(event, editingGuest); },
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
