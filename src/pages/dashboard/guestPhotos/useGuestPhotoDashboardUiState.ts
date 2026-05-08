import { useState } from 'react';
import { type AiPhotoOpsPlan } from '../../../lib/aiPhotoOps';
import {
  DEFAULT_HUB_SETTINGS,
  readStoredBucketLinks,
  type GuestHubSettings,
  type GuestProspectOptinRow,
  type GuestbookEntryRow,
  type ItineraryEvent,
  type PhotoAiBucketCorrectionRow,
  type PhotoBucketRow,
  type PhotoUploadAiAnalysisRow,
  type PhotoUploadMetadataRow,
  type PhotoUploadRow,
  type SlideshowOrderMode,
  type SlideshowTheme,
} from '../guestPhotoSharingUtils';

type Args = {
  search: URLSearchParams;
};

export type GuestPhotoDashboardUiState = ReturnType<typeof useGuestPhotoDashboardUiState>;

export function useGuestPhotoDashboardUiState({ search }: Args) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [siteId, setSiteId] = useState<string | null>(null);
  const [siteSlug, setSiteSlug] = useState<string | null>(null);
  const [events, setEvents] = useState<ItineraryEvent[]>([]);
  const [buckets, setBuckets] = useState<PhotoBucketRow[]>([]);
  const [uploads, setUploads] = useState<PhotoUploadRow[]>([]);
  const [uploadAnalyses, setUploadAnalyses] = useState<PhotoUploadAiAnalysisRow[]>([]);
  const [uploadMetadata, setUploadMetadata] = useState<PhotoUploadMetadataRow[]>([]);
  const [aiBucketCorrections, setAiBucketCorrections] = useState<PhotoAiBucketCorrectionRow[]>([]);
  const [guestbookEntries, setGuestbookEntries] = useState<GuestbookEntryRow[]>([]);
  const [guestProspects, setGuestProspects] = useState<GuestProspectOptinRow[]>([]);
  const [hubSettings, setHubSettings] = useState<GuestHubSettings>(DEFAULT_HUB_SETTINGS);
  const [showHidden, setShowHidden] = useState(false);
  const [showFlaggedOnly, setShowFlaggedOnly] = useState(false);
  const [tagFilter, setTagFilter] = useState('all');

  const [name, setName] = useState(search.get('eventName') ?? '');
  const [itineraryEventId, setItineraryEventId] = useState(search.get('eventId') ?? '');
  const [parentAlbumId, setParentAlbumId] = useState(search.get('parentBucket') ?? '');
  const [bucketSearch, setBucketSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused'>('all');

  const [latestUploadUrl, setLatestUploadUrl] = useState('');
  const [bucketUploadLinks, setBucketUploadLinks] = useState<Record<string, string>>(() => readStoredBucketLinks());
  const [workingBucketId, setWorkingBucketId] = useState('');

  const [windowDrafts, setWindowDrafts] = useState<Record<string, { opensAt: string; closesAt: string }>>({});
  const [bulkCreating, setBulkCreating] = useState(false);
  const [slideshowOrder, setSlideshowOrder] = useState<SlideshowOrderMode>('newest');
  const [slideshowBucketFilter, setSlideshowBucketFilter] = useState('all');
  const [slideshowTheme, setSlideshowTheme] = useState<SlideshowTheme>('classic');
  const [slideshowPreviewOpen, setSlideshowPreviewOpen] = useState(false);
  const [aiPhotoOpsPlan, setAiPhotoOpsPlan] = useState<AiPhotoOpsPlan | null>(null);

  return {
    aiBucketCorrections,
    aiPhotoOpsPlan,
    bucketSearch,
    bucketUploadLinks,
    buckets,
    bulkCreating,
    error,
    events,
    guestProspects,
    guestbookEntries,
    hubSettings,
    itineraryEventId,
    latestUploadUrl,
    loading,
    name,
    parentAlbumId,
    showFlaggedOnly,
    showHidden,
    siteId,
    siteSlug,
    slideshowBucketFilter,
    slideshowOrder,
    slideshowPreviewOpen,
    slideshowTheme,
    statusFilter,
    submitting,
    success,
    tagFilter,
    uploadAnalyses,
    uploadMetadata,
    uploads,
    windowDrafts,
    workingBucketId,
    setAiBucketCorrections,
    setAiPhotoOpsPlan,
    setBucketSearch,
    setBucketUploadLinks,
    setBuckets,
    setBulkCreating,
    setError,
    setEvents,
    setGuestProspects,
    setGuestbookEntries,
    setHubSettings,
    setItineraryEventId,
    setLatestUploadUrl,
    setLoading,
    setName,
    setParentAlbumId,
    setShowFlaggedOnly,
    setShowHidden,
    setSiteId,
    setSiteSlug,
    setSlideshowBucketFilter,
    setSlideshowOrder,
    setSlideshowPreviewOpen,
    setSlideshowTheme,
    setStatusFilter,
    setSubmitting,
    setSuccess,
    setTagFilter,
    setUploadAnalyses,
    setUploadMetadata,
    setUploads,
    setWindowDrafts,
    setWorkingBucketId,
  };
}
