/* eslint-disable react-refresh/only-export-components */
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Lock, Heart, Send, CheckCircle, AlertCircle, Loader2, Mic, Square } from 'lucide-react';
import { GuestJourneyCompanion } from '../components/guest/GuestJourneyCompanion';
import { supabase } from '../lib/supabase';
import { DEMO_MODE } from '../config/env';
import { buildCoupleDisplayName } from '../lib/coupleDisplayName';
import { readInviteTokenFromParams } from '../lib/inviteTokenParams';
import {
  areVaultAttachmentsAvailable,
  getVaultAllowedContributionMediaTypes,
  getVaultAttachmentStatusCopy,
  mapVaultAttachmentUploadError,
  mapVaultContributionSaveError,
  VAULT_ATTACHMENT_PAUSED_ERROR,
  VAULT_ATTACHMENT_PREPARE_RETRY_ERROR,
  VAULT_COMPRESSION_FALLBACK_COPY,
  VAULT_UPLOAD_READY_COPY,
} from './vaultContributeCopy';
import { buildVaultHubPath, buildVaultYearPath } from './vaultContributionPaths';

interface SiteInfo {
  id: string;
  couple_name_1: string | null;
  couple_name_2: string | null;
  wedding_date: string | null;
  vault_storage_provider?: 'supabase' | 'google_drive';
  vault_google_drive_connected?: boolean;
}

interface VaultConfigInfo {
  id: string;
  label: string;
  duration_years: number;
  is_enabled: boolean;
}

type Step = 'loading' | 'hub' | 'form' | 'success' | 'error' | 'invalid';
const DEMO_VAULT_STORAGE_KEY = 'dayof_demo_vault_state_v1';
const MAX_UPLOAD_MB_BY_TYPE: Record<'photo' | 'video' | 'voice', number> = { photo: 8, video: 35, voice: 12 };
const VAULT_SUBMITTED_KEY_PREFIX = 'vault_submitted_years_';
const DEMO_WEDDING_DATE = '2026-02-23';

function normalizeVaultWeddingDate(value: string | null | undefined): string | null {
  const trimmed = value?.trim() || '';
  if (!trimmed) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;

  const date = new Date(`${trimmed}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString().slice(0, 10) === trimmed ? trimmed : null;
}

export function getVaultCoupleName(site: Pick<SiteInfo, 'couple_name_1' | 'couple_name_2'> | null): string {
  if (!site) return '';
  return buildCoupleDisplayName(site.couple_name_1, site.couple_name_2, 'the couple');
}

export function getVaultUnlockYear(weddingDate: string | null | undefined, durationYears: number | null | undefined): number | null {
  const normalizedWeddingDate = normalizeVaultWeddingDate(weddingDate);
  if (!normalizedWeddingDate || durationYears == null) return null;

  const date = new Date(`${normalizedWeddingDate}T00:00:00Z`);
  return date.getFullYear() + durationYears;
}

export function getVaultUnlockAtIso(weddingDate: string | null | undefined, durationYears: number | null | undefined): string | null {
  const normalizedWeddingDate = normalizeVaultWeddingDate(weddingDate);
  if (!normalizedWeddingDate || durationYears == null) return null;

  const date = new Date(`${normalizedWeddingDate}T00:00:00Z`);

  const unlockDate = new Date(date);
  unlockDate.setUTCFullYear(unlockDate.getUTCFullYear() + durationYears);
  return Number.isNaN(unlockDate.getTime()) ? null : unlockDate.toISOString();
}

function formatVaultWindowDate(date: Date): string {
  return date.toLocaleDateString();
}

export function getContributionWindow(weddingDateRaw: string | null): { canSubmit: boolean; message: string | null } {
  const normalizedWeddingDate = normalizeVaultWeddingDate(weddingDateRaw);
  if (!normalizedWeddingDate) return { canSubmit: true, message: null };

  const weddingDate = new Date(`${normalizedWeddingDate}T00:00:00Z`);

  const openAt = new Date(weddingDate);
  openAt.setUTCDate(openAt.getUTCDate() - 3);
  const closeAt = new Date(weddingDate);
  closeAt.setUTCDate(closeAt.getUTCDate() + 3);

  const now = new Date();
  if (now < openAt) {
    return { canSubmit: false, message: `Vault uploads open 3 days before the wedding (${formatVaultWindowDate(openAt)}).` };
  }
  if (now > closeAt) {
    return { canSubmit: false, message: `Vault uploads closed on ${formatVaultWindowDate(closeAt)} (7-day upload window complete).` };
  }
  return { canSubmit: true, message: `Uploads are open now (window closes ${formatVaultWindowDate(closeAt)}).` };
}

function ordinalLabel(years: number): string {
  if (years === 1) return 'first';
  if (years === 2) return 'second';
  if (years === 3) return 'third';
  if (years === 5) return 'fifth';
  if (years === 10) return 'tenth';
  if (years === 15) return 'fifteenth';
  if (years === 20) return 'twentieth';
  if (years === 25) return 'twenty-fifth';
  if (years === 50) return 'fiftieth';
  return `${years}th`;
}

export const VaultContribute: React.FC = () => {
  const { siteSlug, year } = useParams<{ siteSlug: string; year: string }>();
  const navigate = useNavigate();
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const [site, setSite] = useState<SiteInfo | null>(null);
  const [vaultConfig, setVaultConfig] = useState<VaultConfigInfo | null>(null);
  const [vaultOptions, setVaultOptions] = useState<VaultConfigInfo[]>([]);
  const [step, setStep] = useState<Step>('loading');
  const [submitting, setSubmitting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [compressionStatus, setCompressionStatus] = useState<string | null>(null);
  const [submittedYears, setSubmittedYears] = useState<number[]>([]);
  const [compressVideo, setCompressVideo] = useState(true);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const voiceChunksRef = useRef<BlobPart[]>([]);

  const [form, setForm] = useState({
    title: '',
    content: '',
    author_name: '',
    media_type: 'text' as 'text' | 'photo' | 'video' | 'voice',
    attachment_name: '',
  });
  const [errors, setErrors] = useState<{ content?: string; author_name?: string; attachment_url?: string }>({});

  const hasYearParam = typeof year === 'string' && year.length > 0;
  const vaultYear = hasYearParam ? parseInt(year ?? '0', 10) : null;
  const previewGuest = params.get('previewGuest')?.trim() ?? '';
  const inviteToken = readInviteTokenFromParams(params);


  const submittedKey = `${VAULT_SUBMITTED_KEY_PREFIX}${siteSlug ?? 'unknown'}`;

  const loadSubmittedYears = useCallback(() => {
    try {
      const raw = localStorage.getItem(submittedKey);
      const parsed = raw ? JSON.parse(raw) as number[] : [];
      setSubmittedYears(Array.isArray(parsed) ? parsed : []);
    } catch {
      setSubmittedYears([]);
    }
  }, [submittedKey]);

  function markSubmitted(years: number) {
    try {
      const raw = localStorage.getItem(submittedKey);
      const parsed = raw ? JSON.parse(raw) as number[] : [];
      const next = Array.from(new Set([...(Array.isArray(parsed) ? parsed : []), years])).sort((a, b) => a - b);
      localStorage.setItem(submittedKey, JSON.stringify(next));
      setSubmittedYears(next);
    } catch {
      // ignore
    }
  }


  function persistDemoEntries(vault: VaultConfigInfo, rows: Array<{ content: string; author_name: string; title: string | null; attachment_url: string | null; attachment_name: string | null; media_type: 'text' | 'photo' | 'video' | 'voice'; mime_type?: string | null; size_bytes?: number | null }>) {
    try {
      const raw = localStorage.getItem(DEMO_VAULT_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) as { vaultConfigs?: VaultConfigInfo[]; entries?: Array<Record<string, unknown>> } : {};
      const existingConfigs = (parsed.vaultConfigs ?? []).filter(Boolean) as VaultConfigInfo[];
      const existingEntries = Array.isArray(parsed.entries) ? parsed.entries : [];

      const hasConfig = existingConfigs.some((v) => v.id === vault.id);
      const nextConfigs = hasConfig ? existingConfigs : [...existingConfigs, vault].sort((a, b) => a.duration_years - b.duration_years);

      const now = Date.now();
      const mapped = rows.map((r, i) => ({
        id: `demo-public-${now}-${i}`,
        vault_config_id: vault.id,
        vault_year: vault.duration_years,
        title: r.title,
        content: r.content,
        author_name: r.author_name,
        attachment_url: r.attachment_url,
        attachment_name: r.attachment_name,
        media_type: r.media_type,
        mime_type: r.mime_type ?? null,
        size_bytes: r.size_bytes ?? null,
        created_at: new Date(now + i).toISOString(),
      }));

      localStorage.setItem(DEMO_VAULT_STORAGE_KEY, JSON.stringify({
        vaultConfigs: nextConfigs,
        entries: [...existingEntries, ...mapped],
      }));
    } catch {
      // noop
    }
  }


  async function startVoiceRecording() {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setSubmitError('Voice recording is not supported on this browser.');
        return;
      }
      setSubmitError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const mimeCandidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
      const mimeType = mimeCandidates.find((m) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m)) || '';
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;
      voiceChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size) voiceChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(voiceChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        const file = new File([blob], `voice-note-${Date.now()}.${(recorder.mimeType || '').includes('mp4') ? 'm4a' : 'webm'}`, { type: blob.type });
        const maxMb = MAX_UPLOAD_MB_BY_TYPE.voice;
        if (file.size > maxMb * 1024 * 1024) {
          setSubmitError(`Voice note is too large (max ${maxMb}MB). Please keep it shorter.`);
          setSelectedFiles([]);
        } else {
          setSelectedFiles([file]);
          setSubmitError(null);
        }

        mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      };

      recorder.start(500);
      setRecordSeconds(0);
      setIsRecordingVoice(true);
    } catch {
      setSubmitError('Could not start microphone recording. Please allow microphone access or upload an audio file instead.');
    }
  }

  function stopVoiceRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecordingVoice(false);
  }

  useEffect(() => {
    if (isRecordingVoice) {
      const t = window.setInterval(() => setRecordSeconds((v) => v + 1), 1000);
      return () => window.clearInterval(t);
    }
    return;
  }, [isRecordingVoice]);

  useEffect(() => {
    return () => {
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    };
  }, []);

  const loadData = useCallback(async () => {
    const { data: siteData, error: siteError } = await supabase
      .from('wedding_sites')
      .select('id, couple_name_1, couple_name_2, wedding_date, is_published, vault_storage_provider, vault_google_drive_connected')
      .eq('site_slug', siteSlug)
      .maybeSingle();

    if (siteError || !siteData || (!(siteData as Record<string, unknown>).is_published && !(DEMO_MODE && siteSlug === 'alex-jordan-demo'))) {
      if (DEMO_MODE && siteSlug === 'alex-jordan-demo') {
        setSite({ id: 'demo-site-id', couple_name_1: 'Alex', couple_name_2: 'Jordan', wedding_date: DEMO_WEDDING_DATE });

        if (hasYearParam && vaultYear) {
          const cfg = { id: `demo-vault-${vaultYear}`, label: `${vaultYear}-Year Anniversary Vault`, duration_years: vaultYear, is_enabled: true } as VaultConfigInfo;
          setVaultOptions([cfg]);
          setVaultConfig(cfg);
          setStep('form');
          return;
        }

        try {
          const raw = localStorage.getItem(DEMO_VAULT_STORAGE_KEY);
          const parsed = raw ? JSON.parse(raw) as { vaultConfigs?: VaultConfigInfo[] } : { vaultConfigs: [] };
          const enabled = (parsed.vaultConfigs ?? []).filter(v => v.is_enabled);
          const seeded = [
            { id: 'demo-vault-1', label: '1-Year Anniversary Vault', duration_years: 1, is_enabled: true },
            { id: 'demo-vault-5', label: '5-Year Anniversary Vault', duration_years: 5, is_enabled: true },
            { id: 'demo-vault-10', label: '10-Year Anniversary Vault', duration_years: 10, is_enabled: true },
          ] as VaultConfigInfo[];
          const fallback = (enabled.length > 0 ? enabled : seeded).sort((a, b) => a.duration_years - b.duration_years);
          setVaultOptions(fallback);
          setVaultConfig(fallback[0]);
          setStep(hasYearParam ? 'form' : 'hub');
        } catch {
          const fallback = [
            { id: 'demo-vault-1', label: '1-Year Anniversary Vault', duration_years: 1, is_enabled: true },
            { id: 'demo-vault-5', label: '5-Year Anniversary Vault', duration_years: 5, is_enabled: true },
            { id: 'demo-vault-10', label: '10-Year Anniversary Vault', duration_years: 10, is_enabled: true },
          ] as VaultConfigInfo[];
          setVaultOptions(fallback.sort((a, b) => a.duration_years - b.duration_years));
          setVaultConfig(fallback[0]);
          setStep(hasYearParam ? 'form' : 'hub');
        }
        return;
      }

      setStep('invalid');
      return;
    }

    setSite(siteData as SiteInfo);

    if (hasYearParam && vaultYear) {
      const { data: configData, error: configError } = await supabase
        .from('vault_configs')
        .select('id, label, duration_years, is_enabled')
        .eq('wedding_site_id', (siteData as SiteInfo).id)
        .eq('duration_years', vaultYear)
        .eq('is_enabled', true)
        .maybeSingle();

      if (configError || !configData) {
        setStep('invalid');
        return;
      }

      const cfg = configData as VaultConfigInfo;
      setVaultOptions([cfg]);
      setVaultConfig(cfg);
      setStep('form');
      return;
    }

    const { data: configList, error: listError } = await supabase
      .from('vault_configs')
      .select('id, label, duration_years, is_enabled')
      .eq('wedding_site_id', (siteData as SiteInfo).id)
      .eq('is_enabled', true)
      .order('duration_years', { ascending: true });

    if (listError || !configList || configList.length === 0) {
      setStep('invalid');
      return;
    }

    const options = (configList as VaultConfigInfo[]).sort((a, b) => a.duration_years - b.duration_years);

    setVaultOptions(options);
    setVaultConfig(options[0]);
    setStep('hub');
  }, [hasYearParam, siteSlug, vaultYear]);

  useEffect(() => {
    if (!siteSlug) {
      setStep('invalid');
      return;
    }
    if (hasYearParam && (vaultYear === null || Number.isNaN(vaultYear))) {
      setStep('invalid');
      return;
    }
    loadSubmittedYears();
    void loadData();
  }, [hasYearParam, loadData, loadSubmittedYears, siteSlug, vaultYear]);


  async function compressVideoTo720p(input: File): Promise<File> {
    const testCanvas = document.createElement('canvas') as HTMLCanvasElement & { captureStream?: (frameRate?: number) => MediaStream };
    if (typeof MediaRecorder === 'undefined' || typeof testCanvas.captureStream !== 'function') {
      throw new Error('Video compression is not supported on this device/browser.');
    }

    const url = URL.createObjectURL(input);
    const video = document.createElement('video');
    video.src = url;
    video.muted = true;
    video.playsInline = true;

    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error('Could not read that video file'));
    });

    const maxW = 1280;
    const maxH = 720;
    const ratio = Math.min(maxW / video.videoWidth, maxH / video.videoHeight, 1);
    const outW = Math.max(2, Math.round(video.videoWidth * ratio));
    const outH = Math.max(2, Math.round(video.videoHeight * ratio));

    const canvas = document.createElement('canvas');
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not available');

    const stream = canvas.captureStream(30);
    const mimeCandidates = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
    const mimeType = mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) || 'video/webm';
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 1_500_000 });

    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };

    let raf = 0;
    const draw = () => {
      if (!video.paused && !video.ended) {
        ctx.drawImage(video, 0, 0, outW, outH);
        raf = requestAnimationFrame(draw);
      }
    };

    const finished = new Promise<File>((resolve, reject) => {
      recorder.onerror = () => reject(new Error('Video compression failed'));
      recorder.onstop = () => {
        cancelAnimationFrame(raf);
        URL.revokeObjectURL(url);
        const blob = new Blob(chunks, { type: recorder.mimeType || 'video/webm' });
        resolve(new File([blob], `${input.name.replace(/\.[^.]+$/, '')}-720p.webm`, { type: blob.type }));
      };
    });

    recorder.start(500);
    await video.play();
    draw();
    await new Promise<void>((resolve) => {
      video.onended = () => resolve();
    });
    recorder.stop();

    return finished;
  }

  function validate(): boolean {
    const newErrors: typeof errors = {};
    const selectedMediaType = areVaultAttachmentsAvailable(site) ? form.media_type : 'text';
    if (!form.content.trim()) newErrors.content = 'Please write a message.';
    if (!form.author_name.trim()) newErrors.author_name = 'Please enter your name.';
    if (selectedMediaType !== 'text' && selectedFiles.length === 0) newErrors.attachment_url = 'Please upload at least one file.';
    setErrors(newErrors);
    setSubmitError(null);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate() || !site || !vaultConfig) return;

    const liveWindow = getContributionWindow(site.wedding_date);
    if (!liveWindow.canSubmit) {
      setSubmitError(liveWindow.message || 'Uploads are currently closed for this vault.');
      return;
    }

    setSubmitting(true);

    const uploadedItems: Array<{ url: string | null; name: string | null; mime: string | null; size: number | null; externalFileId?: string | null; storageProvider?: 'supabase' | 'google_drive' }> = [];

    const storageProvider = site.vault_storage_provider ?? 'supabase';
    const useGoogleDrive = storageProvider === 'google_drive';
    const selectedMediaType = areVaultAttachmentsAvailable(site) ? form.media_type : 'text';

    if (selectedFiles.length > 0 && selectedMediaType !== 'text') {
      setUploadProgress(3);

      for (let i = 0; i < selectedFiles.length; i += 1) {
        let file = selectedFiles[i];

        if (selectedMediaType === 'video' && compressVideo) {
          setCompressionStatus(`Compressing video ${i + 1}/${selectedFiles.length} to 720p…`);
          try {
            file = await compressVideoTo720p(file);
            setCompressionStatus(null);
          } catch {
            setCompressionStatus(null);
            // Fallback: keep original file upload instead of blocking submit.
            setSubmitError(VAULT_COMPRESSION_FALLBACK_COPY);
          }
        }

        const ext = file.name.split('.').pop() || 'bin';
        const safeType = selectedMediaType === 'voice' ? 'audio' : selectedMediaType;
        const path = `public/${site.id}/${vaultConfig.id}/${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}.${ext}`;

        if (DEMO_MODE && site.id === 'demo-site-id') {
          uploadedItems.push({ url: `demo-upload://${safeType}/${file.name}`, name: file.name, mime: file.type || null, size: file.size || null, storageProvider: useGoogleDrive ? 'google_drive' : 'supabase' });
          setUploadProgress(Math.round(((i + 1) / selectedFiles.length) * 100));
          continue;
        }

        if (useGoogleDrive) {
          if (!site.vault_google_drive_connected) {
            setUploadProgress(null);
            setSubmitting(false);
            setSubmitError(VAULT_ATTACHMENT_PAUSED_ERROR);
            return;
          }

          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const result = String(reader.result || '');
              const idx = result.indexOf(',');
              resolve(idx >= 0 ? result.slice(idx + 1) : result);
            };
            reader.onerror = () => reject(new Error(VAULT_ATTACHMENT_PREPARE_RETRY_ERROR));
            reader.readAsDataURL(file);
          });

          const { data: driveData, error: driveError } = await supabase.functions.invoke('vault-upload-google-drive', {
            body: {
              siteId: site.id,
              vaultYear: vaultConfig.duration_years,
              fileName: file.name,
              mimeType: file.type || 'application/octet-stream',
              base64,
            },
          });

          if (driveError) {
            setUploadProgress(null);
            setSubmitting(false);
            setSubmitError(mapVaultAttachmentUploadError(driveError));
            return;
          }

          const drive = driveData as { fileId?: string; webViewLink?: string | null; webContentLink?: string | null } | null;
          uploadedItems.push({
            url: null,
            name: file.name,
            mime: file.type || null,
            size: file.size || null,
            externalFileId: drive?.fileId ?? null,
            storageProvider: 'google_drive',
          });
          setUploadProgress(Math.round(((i + 1) / selectedFiles.length) * 100));
        } else {
          const { error: uploadError } = await supabase.storage
            .from('vault-attachments')
            .upload(path, file, { upsert: false, contentType: file.type || undefined });

          if (uploadError) {
            setUploadProgress(null);
            setSubmitting(false);
            setSubmitError(mapVaultAttachmentUploadError(uploadError));
            return;
          }

          const { data: publicData } = supabase.storage.from('vault-attachments').getPublicUrl(path);
          uploadedItems.push({ url: publicData.publicUrl, name: file.name, mime: file.type || null, size: file.size || null, storageProvider: 'supabase' });
          setUploadProgress(Math.round(((i + 1) / selectedFiles.length) * 100));
        }
      }
    } else {
      uploadedItems.push({ url: null, name: null, mime: null, size: null });
    }

    if (DEMO_MODE && site.id === 'demo-site-id') {
      const demoRows = uploadedItems.map((item, idx) => ({
        title: form.title.trim() || null,
        content: form.content.trim(),
        author_name: form.author_name.trim(),
        attachment_url: item.url,
        attachment_name: item.name || form.attachment_name.trim() || (selectedMediaType !== 'text' ? `${selectedMediaType} attachment ${uploadedItems.length > 1 ? `#${idx + 1}` : ''}`.trim() : null),
        media_type: selectedMediaType,
        mime_type: item.mime,
        size_bytes: item.size,
      }));
      persistDemoEntries(vaultConfig, demoRows);
      setSubmitting(false);
      setUploadProgress(null);
      setCompressionStatus(null);
      markSubmitted(vaultConfig.duration_years);
      setStep('success');
      return;
    }

    const rows = uploadedItems.map((item, idx) => ({
      wedding_site_id: site.id,
      vault_config_id: vaultConfig.id,
      vault_year: vaultConfig.duration_years,
      title: form.title.trim() || null,
      content: form.content.trim(),
      author_name: form.author_name.trim(),
      attachment_url: item.url,
      attachment_name: item.name || form.attachment_name.trim() || (selectedMediaType !== 'text' ? `${selectedMediaType} attachment ${uploadedItems.length > 1 ? `#${idx + 1}` : ''}`.trim() : null),
      media_type: selectedMediaType,
      mime_type: item.mime,
      size_bytes: item.size,
      storage_provider: item.storageProvider ?? storageProvider,
      external_file_id: item.externalFileId ?? null,
      external_file_url: item.storageProvider === 'google_drive' ? item.url : null,
      unlock_at: getVaultUnlockAtIso(site.wedding_date, vaultConfig.duration_years),
    }));

    const { error } = await supabase.from('vault_entries').insert(rows);

    setSubmitting(false);
    setUploadProgress(null);
    setCompressionStatus(null);
    if (error) {
      setSubmitError(mapVaultContributionSaveError(error));
    } else {
      markSubmitted(vaultConfig.duration_years);
      setStep('success');
    }
  }


  useEffect(() => {
    if (step === 'success' && hasYearParam && siteSlug) {
      const t = window.setTimeout(() => navigate(buildVaultHubPath(siteSlug, params)), 1200);
      return () => window.clearTimeout(t);
    }
    return;
  }, [step, hasYearParam, siteSlug, navigate, params]);

  const coupleName = getVaultCoupleName(site);

  const unlockYear = getVaultUnlockYear(site?.wedding_date, vaultConfig?.duration_years);
  const attachmentsAvailable = areVaultAttachmentsAvailable(site);
  const allowedMediaTypes = getVaultAllowedContributionMediaTypes(site);
  const selectedMediaType = allowedMediaTypes.includes(form.media_type) ? form.media_type : 'text';
  const showsAttachmentInputs = selectedMediaType !== 'text';

  const ordinal = vaultConfig ? ordinalLabel(vaultConfig.duration_years) : '';
  const vaultLabel = vaultConfig?.label || (vaultConfig ? `${vaultConfig.duration_years}-Year Anniversary Vault` : 'Anniversary Vault');
  const description = vaultConfig
    ? `Leave a message to be opened on the couple's ${ordinal} anniversary.`
    : 'Choose a vault and leave a message for a future anniversary.';
  const contributionWindow = getContributionWindow(site?.wedding_date ?? null);

  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.10),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.08),transparent_38%),linear-gradient(135deg,#f8fafc,#ffffff)] flex items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
      </div>
    );
  }

  if (step === 'invalid') {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.10),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.08),transparent_38%),linear-gradient(135deg,#f8fafc,#ffffff)] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 bg-stone-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-stone-200">
            <Lock className="w-6 h-6 text-stone-400" />
          </div>
          <h1 className="text-xl font-semibold text-stone-800 mb-2">Vault not found</h1>
          <p className="text-stone-500 text-sm">This link may be invalid or the vault is no longer accepting contributions.</p>
        </div>
      </div>
    );
  }


  if (step === 'hub') {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.10),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.08),transparent_38%),linear-gradient(135deg,#f8fafc,#ffffff)] flex flex-col">
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-3xl">
            <div className="text-center mb-8">
              <div className="w-14 h-14 bg-white border border-amber-200 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Lock className="w-6 h-6 text-primary" />
              </div>
              {coupleName && <p className="text-sm text-stone-500 mb-1 updates-wide uppercase font-medium">{coupleName}</p>}
              <h1 className="text-[30px] leading-tight font-bold text-text-primary">Choose an anniversary vault</h1>
              <p className="text-text-secondary text-sm mt-2">Pick a future anniversary and leave something meaningful for them to open later.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
              {vaultOptions.map((v) => {
                const done = submittedYears.includes(v.duration_years);
                return (
                  <Link
                    key={v.id}
                    to={buildVaultYearPath(siteSlug ?? '', v.duration_years, params)}
                    className="group bg-white/95 backdrop-blur rounded-2xl border border-border-subtle p-5 hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 shadow-sm relative overflow-hidden"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-stone-800">{v.label || `${v.duration_years}-Year Anniversary Vault`}</p>
                      {done && <CheckCircle className="w-5 h-5 text-green-600" />}
                    </div>
                    <p className="text-xs text-stone-500 mt-2">Opens on their {ordinalLabel(v.duration_years)} anniversary.</p>
                    <p className={`text-xs mt-3 font-semibold updates-wide ${done ? 'text-emerald-700' : 'text-primary'}`}>{done ? 'Added ✓' : 'Add a note →'}</p>
                  </Link>
                );
              })}
            </div>

            <GuestJourneyCompanion
              currentSurface="vault"
              siteSlug={siteSlug || undefined}
              inviteToken={inviteToken || undefined}
              previewGuest={previewGuest || undefined}
              className="mt-6 bg-white/90"
            />
          </div>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.10),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.08),transparent_38%),linear-gradient(135deg,#f8fafc,#ffffff)] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5 border border-green-200 shadow-sm">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-[26px] leading-tight font-bold text-stone-800 mb-2">Saved for later ✨</h1>
          <p className="text-text-secondary mb-1">
            Your note has been saved in {coupleName ? <strong>{coupleName}'s</strong> : 'the'} {ordinal} anniversary vault.
          </p>
          {unlockYear && (
            <p className="text-stone-400 text-sm mt-2">
              It will be opened in {unlockYear}.
            </p>
          )}
          <div className="mt-8 p-4 bg-primary/5 border border-primary/20 rounded-xl text-sm text-primary">
            <Heart className="w-4 h-4 inline-block mr-1.5 mb-0.5" />
            Thank you for adding to this part of their story.
            {hasYearParam && <p className="mt-2 text-xs text-primary">Returning to vault list…</p>}
          </div>
        </div>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.10),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.08),transparent_38%),linear-gradient(135deg,#f8fafc,#ffffff)] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-200">
            <AlertCircle className="w-6 h-6 text-red-500" />
          </div>
          <h1 className="text-xl font-semibold text-stone-800 mb-2">Something went wrong</h1>
          <p className="text-stone-500 text-sm mb-6">Your message couldn't be saved. Please try again.</p>
          <button
            onClick={() => setStep('form')}
            className="px-5 py-2.5 bg-gradient-to-r from-primary to-primary-hover text-white rounded-xl text-sm font-semibold hover:from-primary-hover hover:to-primary transition-all shadow"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.10),transparent_42%),radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.08),transparent_38%),linear-gradient(135deg,#f8fafc,#ffffff)] flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-white border border-amber-200 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            {coupleName && (
              <p className="text-sm text-stone-500 mb-1 updates-wide uppercase font-medium">
                {coupleName}
              </p>
            )}
            <h1 className="text-[30px] leading-tight font-bold text-text-primary">{vaultLabel}</h1>
            <p className="text-stone-500 text-sm mt-2 max-w-sm mx-auto leading-relaxed">
              {description}
              {unlockYear && (
                <> The vault opens in <strong className="text-stone-700">{unlockYear}</strong>.</>
              )}
            </p>
          </div>

          <div className="bg-white/95 backdrop-blur rounded-3xl shadow-xl border border-border-subtle p-5 sm:p-6 md:p-8 relative overflow-hidden transition-shadow duration-300 hover:shadow-2xl">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/20 via-primary/60 to-primary/20" />
            <GuestJourneyCompanion
              currentSurface="vault"
              siteSlug={siteSlug || undefined}
              inviteToken={inviteToken || undefined}
              previewGuest={previewGuest || undefined}
              className="mb-5 bg-primary/[0.03]"
            />
            <form onSubmit={handleSubmit} className="space-y-5 md:space-y-5.5">
              <div className="text-xs rounded-xl px-3 py-2 border bg-stone-50 border-stone-200 text-stone-600">
                <strong className="text-stone-800">{getVaultAttachmentStatusCopy(site)}</strong>
              </div>
              {contributionWindow.message && (
                <div className={`text-xs rounded-xl px-3 py-2 border ${contributionWindow.canSubmit ? 'bg-primary/5 border-primary/20 text-primary' : 'bg-warning/10 border-warning/30 text-warning'}`}>
                  {contributionWindow.message}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  Your name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.author_name}
                  onChange={e => setForm({ ...form, author_name: e.target.value })}
                  placeholder="For example: Aunt Sarah, The Johnsons, Your college roommate"
                  className={`w-full px-4 py-2.5 border rounded-xl text-text-primary placeholder:text-text-tertiary text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 transition shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] ${
                    errors.author_name ? 'border-red-300 bg-red-50' : 'border-stone-300 bg-white'
                  }`}
                />
                {errors.author_name && (
                  <p className="text-red-500 text-xs mt-1">{errors.author_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  Title <span className="text-stone-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="For example: Advice for year one, A wish for you both…"
                  className="w-full px-4 py-3 border border-stone-300 rounded-xl text-text-primary placeholder:text-text-tertiary text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 bg-white transition shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  Your message <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={form.content}
                  onChange={e => setForm({ ...form, content: e.target.value })}
                  rows={6}
                  placeholder={`Write something meaningful for ${coupleName || 'the couple'} to read on their ${ordinal} anniversary…`}
                  className={`w-full px-4 py-3 border rounded-xl text-stone-800 placeholder:text-stone-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 resize-none transition ${
                    errors.content ? 'border-red-300 bg-red-50' : 'border-stone-300 bg-white'
                  }`}
                />
                {errors.content ? (
                  <p className="text-red-500 text-xs mt-1">{errors.content}</p>
                ) : (
                  <p className="text-stone-400 text-xs mt-1">{form.content.length} characters</p>
                )}
              </div>


              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5 updates-[0.01em]">Message type</label>
                  <select
                    value={selectedMediaType}
                    onChange={e => { setForm({ ...form, media_type: e.target.value as 'text' | 'photo' | 'video' | 'voice' }); setSelectedFiles([]); setSubmitError(null); if (isRecordingVoice) stopVoiceRecording(); }}
                    className="w-full px-4 py-3 border border-stone-300 rounded-xl text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 bg-white transition"
                  >
                    {allowedMediaTypes.map((mediaType) => (
                      <option key={mediaType} value={mediaType}>
                        {mediaType === 'text' ? 'Note only' : mediaType === 'photo' ? 'Photo' : mediaType === 'video' ? 'Video' : 'Voice note'}
                      </option>
                    ))}
                  </select>
                  {!attachmentsAvailable && (
                    <p className="mt-1 text-xs text-stone-500">Written notes are open right now. Photo, video, and voice can be added later when attachments reopen.</p>
                  )}
                </div>
              </div>

              {showsAttachmentInputs && (
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">
                    Add files <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="file"
                    multiple={selectedMediaType === 'photo' || selectedMediaType === 'video'}
                    accept={selectedMediaType === 'photo' ? 'image/*' : selectedMediaType === 'video' ? 'video/*' : 'audio/*'}
                    onChange={e => {
                      const files = Array.from(e.target.files ?? []);
                      if (files.length === 0) {
                        setSelectedFiles([]);
                        return;
                      }

                      if ((selectedMediaType === 'photo' || selectedMediaType === 'video') && files.length > 3) {
                        setSubmitError('You can upload up to 3 photos or videos per submission.');
                        setSelectedFiles([]);
                        return;
                      }

                      const mediaType = selectedMediaType;
                      const maxMb = MAX_UPLOAD_MB_BY_TYPE[mediaType as 'photo' | 'video' | 'voice'];

                      for (const file of files) {
                        if (mediaType === 'photo' && !file.type.startsWith('image/')) {
                          setSubmitError('Please choose only image files for Photo type.');
                          setSelectedFiles([]);
                          return;
                        }
                        if (mediaType === 'video' && !file.type.startsWith('video/')) {
                          setSubmitError('Please choose only video files for Video type.');
                          setSelectedFiles([]);
                          return;
                        }
                        if (mediaType === 'voice' && !file.type.startsWith('audio/')) {
                          setSubmitError('Please choose an audio file for Voice type.');
                          setSelectedFiles([]);
                          return;
                        }
                        const effectiveMaxMb = mediaType === 'video' && compressVideo ? 200 : maxMb;
                        if (file.size > effectiveMaxMb * 1024 * 1024) {
                          setSubmitError(
                            mediaType === 'video' && compressVideo
                              ? 'This video is too large to process here (max 200MB source). Please trim/compress it first, then try again.'
                              : `This file is too large (max ${maxMb}MB for ${mediaType}). Please compress or trim it and re-upload.`
                          );
                          setSelectedFiles([]);
                          return;
                        }
                      }

                      setSubmitError(null);
                      setSelectedFiles(files);
                    }}
                    className="w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-amber-100 file:text-primary file:px-3 file:py-1.5 hover:file:bg-primary/15"
                  />
                  {selectedFiles.length > 0 && <p className="text-xs text-stone-500 mt-1">Selected: {selectedFiles.length} file{selectedFiles.length === 1 ? '' : 's'}</p>}
                  {selectedMediaType === 'video' && (
                    <label className="mt-1 inline-flex items-center gap-2 text-xs text-stone-600">
                      <input type="checkbox" checked={compressVideo} onChange={e => setCompressVideo(e.target.checked)} />
                      Compress to 720p before upload (recommended)
                    </label>
                  )}

                  {selectedMediaType === 'voice' && (
                    <div className="mt-2 border border-stone-200 rounded-lg p-3 bg-stone-50">
                      <p className="text-xs text-stone-600 mb-2">Or record one here:</p>
                      {!isRecordingVoice ? (
                        <button type="button" onClick={startVoiceRecording} className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border border-stone-300 hover:border-amber-400">
                          <Mic className="w-3.5 h-3.5" /> Record voice note
                        </button>
                      ) : (
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-red-600">Recording… {recordSeconds}s</span>
                          <button type="button" onClick={stopVoiceRecording} className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border border-red-300 text-red-700 hover:bg-red-50">
                            <Square className="w-3.5 h-3.5" /> Stop
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  <p className="text-[11px] text-stone-400 mt-1">{selectedMediaType === 'photo' ? 'Up to 3 photos, 8MB each. If larger, compress first.' : selectedMediaType === 'video' ? (compressVideo ? 'Up to 3 videos, 200MB source each (auto-compressed to 720p).' : 'Up to 3 videos, 35MB each. If larger, compress/trim first.') : 'Single voice file, 12MB max. If larger, trim/compress first.'}</p>
                  {errors.attachment_url && <p className="text-red-500 text-xs mt-1">{errors.attachment_url}</p>}
                </div>
              )}


              {showsAttachmentInputs && (
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  Media label <span className="text-stone-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={form.attachment_name}
                  onChange={e => setForm({ ...form, attachment_name: e.target.value })}
                  placeholder="e.g. Engagement video, Voice memo"
                  className="w-full px-4 py-3 border border-stone-300 rounded-xl text-text-primary placeholder:text-text-tertiary text-sm focus:outline-none focus:ring-2 focus:ring-primary/25 bg-white transition shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]"
                />
              </div>
              )}


              {submitError && (
                <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm">
                  {submitError}
                </div>
              )}

              {compressionStatus && (
                <div className="text-xs text-stone-500">{compressionStatus}</div>
              )}

              {uploadProgress !== null && (
                <div className="space-y-1">
                  <div className="text-xs text-stone-500">Uploading media… {uploadProgress}%</div>
                  <div className="h-2 rounded-full bg-stone-200 overflow-hidden">
                    <div className="h-full bg-amber-500 transition-all" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}

              {!submitting && showsAttachmentInputs && selectedFiles.length > 0 && (
                <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 font-medium">
                  {VAULT_UPLOAD_READY_COPY(selectedFiles.length)}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting || !contributionWindow.canSubmit}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-gradient-to-r from-primary to-primary-hover hover:from-primary-hover hover:to-primary text-white font-semibold rounded-xl text-sm transition-all duration-300 shadow-md hover:shadow-lg hover:-translate-y-[1px] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Saving your contribution…</>
                ) : (
                  <><Send className="w-4 h-4" />Save in vault</>
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-stone-400 mt-6">
            Powered by{' '}
            <Link to="/" className="hover:text-stone-600 transition-colors">
              Day Of
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default VaultContribute;
