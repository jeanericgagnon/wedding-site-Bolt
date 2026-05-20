import { useCallback, useEffect, useMemo, useState } from 'react';
import type { GuestWithRSVP } from './guestDashboardTypes';
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
} from './guestDashboardStorage';

type GuestDashboardFilterStatus =
  | 'all'
  | 'confirmed'
  | 'declined'
  | 'pending'
  | 'checked-in'
  | 'thank-you-due'
  | 'due-reminder'
  | 'missing-address'
  | 'ceremony-no'
  | 'reception-no'
  | 'missing-meal'
  | 'plusone-missing'
  | 'pending-no-email'
  | 'manual-follow-up'
  | 'manual-handled'
  | 'no-contact';

const createEmptyGuestFormData = () => ({
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  preferred_language: '',
  plus_one_allowed: false,
  require_plus_one_name: false,
  invited_to_ceremony: true,
  invited_to_reception: true,
});

export function useGuestDashboardUiState() {
  const [storageScope, setStorageScope] = useState<string | null>(null);
  const normalizedStorageScope = useMemo(() => {
    const scope = typeof storageScope === 'string' ? storageScope.trim() : '';
  return scope || null;
  }, [storageScope]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<GuestDashboardFilterStatus>('all');
  const [extraFilters, setExtraFilters] = useState<string[]>([]);
  const [extraFilterDraft, setExtraFilterDraft] = useState('');
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
  const [skipRecentlyInvited, setSkipRecentlyInvited] = useState(true);
  const [reminderCadenceDays, setReminderCadenceDays] = useState<1 | 3 | 7>(3);
  const [autoRemindersEnabled, setAutoRemindersEnabled] = useState(false);
  const [showConflictDetails, setShowConflictDetails] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'households'>('households');
  const [checkInMode, setCheckInMode] = useState(false);
  const [selectedGuestIds, setSelectedGuestIds] = useState<Set<string>>(new Set());
  const [selectedGuestLanguageDraft, setSelectedGuestLanguageDraft] = useState('');
  const [showInsights, setShowInsights] = useState(false);
  const [formData, setFormData] = useState(createEmptyGuestFormData);
  const [formEventInviteIds, setFormEventInviteIds] = useState<Set<string>>(new Set());
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showOpsMenu, setShowOpsMenu] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [deleteAllConfirmInput, setDeleteAllConfirmInput] = useState('');
  const [deleteAllBusy, setDeleteAllBusy] = useState(false);
  const [deletingGuestId, setDeletingGuestId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const resetGuestDashboardUiState = useCallback(() => {
    setSearchQuery('');
    setFilterStatus('all');
    setExtraFilters([]);
    setExtraFilterDraft('');
    setShowAddModal(false);
    setEditingGuest(null);
    setShowRecipientPreview(false);
    setConflictFilter('all');
    setSkipRecentlyInvited(true);
    setShowConflictDetails(false);
    setCheckInMode(false);
    setSelectedGuestIds(new Set());
    setSelectedGuestLanguageDraft('');
    setShowInsights(false);
    setFormData(createEmptyGuestFormData());
    setFormEventInviteIds(new Set());
    setShowExportMenu(false);
    setShowOpsMenu(false);
    setShowCampaignModal(false);
    setShowDeleteAllModal(false);
    setDeleteAllConfirmInput('');
    setDeleteAllBusy(false);
    setDeletingGuestId(null);
    setConfirmDeleteId(null);
  }, []);

  useEffect(() => {
    if (!normalizedStorageScope) {
      setCampaignPreset('pending');
      setFollowUpTasks([]);
      setSavedSegments([]);
      setCampaignLog([]);
      return;
    }

    const preset = readStoredCampaignPreset(normalizedStorageScope);
    setCampaignPreset(preset ?? 'pending');
    if (preset) {
      setFilterStatus(preset);
    }
    setFollowUpTasks(readStoredFollowUpTasks(normalizedStorageScope));
    setSavedSegments(readStoredSavedSegments(normalizedStorageScope));
    setCampaignLog(readStoredCampaignLog(normalizedStorageScope));
  }, [normalizedStorageScope]);

  useEffect(() => {
    if (!normalizedStorageScope) return;
    writeStoredCampaignPreset(campaignPreset, normalizedStorageScope);
  }, [campaignPreset, normalizedStorageScope]);

  useEffect(() => {
    if (!normalizedStorageScope) return;
    writeStoredFollowUpTasks(followUpTasks, normalizedStorageScope);
  }, [followUpTasks, normalizedStorageScope]);

  useEffect(() => {
    if (!normalizedStorageScope) return;
    writeStoredSavedSegments(savedSegments, normalizedStorageScope);
  }, [normalizedStorageScope, savedSegments]);

  useEffect(() => {
    if (!normalizedStorageScope) return;
    writeStoredCampaignLog(campaignLog, normalizedStorageScope);
  }, [campaignLog, normalizedStorageScope]);

  return {
    autoRemindersEnabled,
    campaignLog,
    campaignPreset,
    checkInMode,
    confirmDeleteId,
    conflictFilter,
    deleteAllBusy,
    deleteAllConfirmInput,
    deletingGuestId,
    editingGuest,
    extraFilterDraft,
    extraFilters,
    filterStatus,
    followUpTasks,
    formData,
    formEventInviteIds,
    guestsTab,
    reminderCadenceDays,
    savedSegments,
    searchQuery,
    selectedGuestIds,
    selectedGuestLanguageDraft,
    resetGuestDashboardUiState,
    setAutoRemindersEnabled,
    setCampaignLog,
    setCampaignPreset,
    setStorageScope,
    setCheckInMode,
    setConfirmDeleteId,
    setConflictFilter,
    setDeleteAllBusy,
    setDeleteAllConfirmInput,
    setDeletingGuestId,
    setEditingGuest,
    setExtraFilterDraft,
    setExtraFilters,
    setFilterStatus,
    setFollowUpTasks,
    setFormData,
    setFormEventInviteIds,
    setGuestsTab,
    setReminderCadenceDays,
    setSavedSegments,
    setSearchQuery,
    setSelectedGuestIds,
    setSelectedGuestLanguageDraft,
    setShowAddModal,
    setShowCampaignModal,
    setShowConflictDetails,
    setShowDeleteAllModal,
    setShowExportMenu,
    setShowInsights,
    setShowOpsMenu,
    setShowRecipientPreview,
    setSkipRecentlyInvited,
    setSortByPriority,
    setViewMode,
    showAddModal,
    showCampaignModal,
    showConflictDetails,
    showDeleteAllModal,
    showExportMenu,
    showInsights,
    showOpsMenu,
    showRecipientPreview,
    skipRecentlyInvited,
    sortByPriority,
    viewMode,
  };
}
