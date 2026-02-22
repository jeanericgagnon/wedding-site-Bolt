import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Lock, Heart, Send, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { DEMO_MODE } from '../config/env';

interface SiteInfo {
  id: string;
  couple_name_1: string | null;
  couple_name_2: string | null;
  wedding_date: string | null;
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

  const [form, setForm] = useState({
    title: '',
    content: '',
    author_name: '',
    media_type: 'text' as 'text' | 'photo' | 'video' | 'voice',
    attachment_url: '',
    attachment_name: '',
  });
  const [errors, setErrors] = useState<{ content?: string; author_name?: string; attachment_url?: string }>({});

  const hasYearParam = typeof year === 'string' && year.length > 0;
  const vaultYear = hasYearParam ? parseInt(year ?? '0', 10) : null;


  const submittedKey = `${VAULT_SUBMITTED_KEY_PREFIX}${siteSlug ?? 'unknown'}`;

  function loadSubmittedYears() {
    try {
      const raw = localStorage.getItem(submittedKey);
      const parsed = raw ? JSON.parse(raw) as number[] : [];
      setSubmittedYears(Array.isArray(parsed) ? parsed : []);
    } catch {
      setSubmittedYears([]);
    }
  }

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
    loadData();
  }, [siteSlug, year]);

  async function loadData() {
    if (DEMO_MODE && siteSlug === 'alex-jordan-demo') {
      setSite({ id: 'demo-site-id', couple_name_1: 'Alex', couple_name_2: 'Jordan', wedding_date: null });

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
        const byYear = new Map<number, VaultConfigInfo>();
        [...seeded, ...enabled].forEach(v => byYear.set(v.duration_years, v));
        const fallback = Array.from(byYear.values()).sort((a, b) => a.duration_years - b.duration_years);
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

    const { data: siteData, error: siteError } = await supabase
      .from('wedding_sites')
      .select('id, couple_name_1, couple_name_2, wedding_date, is_published')
      .eq('site_slug', siteSlug)
      .maybeSingle();

    if (siteError || !siteData || !(siteData as Record<string, unknown>).is_published) {
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

    let options = configList as VaultConfigInfo[];

    if (siteSlug === 'alex-jordan-demo') {
      const seeded = [
        { id: 'demo-vault-1', label: '1-Year Anniversary Vault', duration_years: 1, is_enabled: true },
        { id: 'demo-vault-5', label: '5-Year Anniversary Vault', duration_years: 5, is_enabled: true },
        { id: 'demo-vault-10', label: '10-Year Anniversary Vault', duration_years: 10, is_enabled: true },
      ] as VaultConfigInfo[];
      const byYear = new Map<number, VaultConfigInfo>();
      [...seeded, ...options].forEach(v => byYear.set(v.duration_years, v));
      options = Array.from(byYear.values()).sort((a, b) => a.duration_years - b.duration_years);
    }

    setVaultOptions(options);
    setVaultConfig(options[0]);
    setStep('form');
  }

  async function compressVideoTo720p(input: File): Promise<File> {
    const url = URL.createObjectURL(input);
    const video = document.createElement('video');
    video.src = url;
    video.muted = true;
    video.playsInline = true;

    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error('Could not read video metadata'));
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
    if (!form.content.trim()) newErrors.content = 'Please write a message.';
    if (!form.author_name.trim()) newErrors.author_name = 'Please enter your name.';
    if (form.media_type !== 'text' && !form.attachment_url.trim() && selectedFiles.length === 0) newErrors.attachment_url = 'Please add a media URL or upload at least one file.';
    setErrors(newErrors);
    setSubmitError(null);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate() || !site || !vaultConfig) return;
    setSubmitting(true);

    const uploadedItems: Array<{ url: string | null; name: string | null; mime: string | null; size: number | null }> = [];

    if (selectedFiles.length > 0 && form.media_type !== 'text') {
      setUploadProgress(3);

      for (let i = 0; i < selectedFiles.length; i += 1) {
        let file = selectedFiles[i];

        if (form.media_type === 'video' && compressVideo) {
          setCompressionStatus(`Compressing video ${i + 1}/${selectedFiles.length} to 720p…`);
          try {
            file = await compressVideoTo720p(file);
            setCompressionStatus(null);
          } catch (err) {
            setCompressionStatus(null);
            setUploadProgress(null);
            setSubmitting(false);
            setSubmitError(err instanceof Error ? err.message : 'Video compression failed');
            return;
          }
        }

        const ext = file.name.split('.').pop() || 'bin';
        const safeType = form.media_type === 'voice' ? 'audio' : form.media_type;
        const path = `public/${site.id}/${vaultConfig.id}/${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}.${ext}`;

        if (DEMO_MODE && site.id === 'demo-site-id') {
          uploadedItems.push({ url: `demo-upload://${safeType}/${file.name}`, name: file.name, mime: file.type || null, size: file.size || null });
          setUploadProgress(Math.round(((i + 1) / selectedFiles.length) * 100));
          continue;
        }

        const { error: uploadError } = await supabase.storage
          .from('vault-attachments')
          .upload(path, file, { upsert: false, contentType: file.type || undefined });

        if (uploadError) {
          setUploadProgress(null);
          setSubmitting(false);
          setSubmitError(uploadError.message?.includes('bucket')
            ? 'Media upload is not configured yet (missing vault-attachments bucket or policy).'
            : `Upload failed: ${uploadError.message}`);
          return;
        }

        const { data: publicData } = supabase.storage.from('vault-attachments').getPublicUrl(path);
        uploadedItems.push({ url: publicData.publicUrl, name: file.name, mime: file.type || null, size: file.size || null });
        setUploadProgress(Math.round(((i + 1) / selectedFiles.length) * 100));
      }
    } else if (form.attachment_url.trim()) {
      uploadedItems.push({ url: form.attachment_url.trim(), name: form.attachment_name.trim() || null, mime: null, size: null });
    } else {
      uploadedItems.push({ url: null, name: null, mime: null, size: null });
    }

    if (DEMO_MODE && site.id === 'demo-site-id') {
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
      attachment_name: item.name || form.attachment_name.trim() || (form.media_type !== 'text' ? `${form.media_type} attachment ${uploadedItems.length > 1 ? `#${idx + 1}` : ''}`.trim() : null),
      media_type: form.media_type,
      mime_type: item.mime,
      size_bytes: item.size,
    }));

    const { error } = await supabase.from('vault_entries').insert(rows);

    setSubmitting(false);
    setUploadProgress(null);
    setCompressionStatus(null);
    if (error) {
      setSubmitError(`Could not save your message: ${error.message}`);
    } else {
      markSubmitted(vaultConfig.duration_years);
      setStep('success');
    }
  }


  useEffect(() => {
    if (step === 'success' && hasYearParam && siteSlug) {
      const t = window.setTimeout(() => navigate(`/vault/${siteSlug}`), 1200);
      return () => window.clearTimeout(t);
    }
    return;
  }, [step, hasYearParam, siteSlug, navigate]);

  const coupleName = site
    ? site.couple_name_1 && site.couple_name_2
      ? `${site.couple_name_1} & ${site.couple_name_2}`
      : site.couple_name_1 ?? site.couple_name_2 ?? 'the couple'
    : '';

  const unlockYear = site?.wedding_date && vaultConfig
    ? new Date(site.wedding_date).getFullYear() + vaultConfig.duration_years
    : null;

  const ordinal = vaultConfig ? ordinalLabel(vaultConfig.duration_years) : '';
  const vaultLabel = vaultConfig?.label || (vaultConfig ? `${vaultConfig.duration_years}-Year Anniversary Vault` : 'Anniversary Vault');
  const description = vaultConfig
    ? `Leave a message to be opened on the couple's ${ordinal} anniversary.`
    : 'Choose a vault and leave a message for a future anniversary.';

  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 to-amber-50 flex items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin text-amber-700" />
      </div>
    );
  }

  if (step === 'invalid') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 to-amber-50 flex items-center justify-center px-4">
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
      <div className="min-h-screen bg-gradient-to-br from-stone-50 to-amber-50 flex flex-col">
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-3xl">
            <div className="text-center mb-8">
              <div className="w-14 h-14 bg-white border border-amber-200 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Lock className="w-6 h-6 text-amber-700" />
              </div>
              {coupleName && <p className="text-sm text-stone-500 mb-1 tracking-wide uppercase font-medium">{coupleName}</p>}
              <h1 className="text-2xl font-bold text-stone-800">Choose an Anniversary Vault</h1>
              <p className="text-stone-500 text-sm mt-2">Pick a vault to leave a message. Completed vaults are marked.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {vaultOptions.map((v) => {
                const done = submittedYears.includes(v.duration_years);
                return (
                  <Link
                    key={v.id}
                    to={`/vault/${siteSlug}/${v.duration_years}`}
                    className="bg-white rounded-2xl border border-stone-200 p-5 hover:border-amber-300 transition-colors shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-stone-800">{v.label || `${v.duration_years}-Year Anniversary Vault`}</p>
                      {done && <CheckCircle className="w-5 h-5 text-green-600" />}
                    </div>
                    <p className="text-xs text-stone-500 mt-2">Opens on the {ordinalLabel(v.duration_years)} anniversary.</p>
                    <p className="text-xs mt-3 text-amber-700 font-medium">{done ? 'Submitted ✓' : 'Add message →'}</p>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 to-amber-50 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5 border border-green-200">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-stone-800 mb-2">Message sealed</h1>
          <p className="text-stone-600 mb-1">
            Your note has been tucked away in {coupleName ? <strong>{coupleName}'s</strong> : 'the'} {ordinal} anniversary vault.
          </p>
          {unlockYear && (
            <p className="text-stone-400 text-sm mt-2">
              It will be opened in {unlockYear}.
            </p>
          )}
          <div className="mt-8 p-4 bg-amber-50 border border-amber-200/60 rounded-xl text-sm text-amber-800">
            <Heart className="w-4 h-4 inline-block mr-1.5 mb-0.5" />
            Thank you for being part of this moment.
            {hasYearParam && <p className="mt-2 text-xs text-amber-700">Returning to vault list…</p>}
          </div>
        </div>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 to-amber-50 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-200">
            <AlertCircle className="w-6 h-6 text-red-500" />
          </div>
          <h1 className="text-xl font-semibold text-stone-800 mb-2">Something went wrong</h1>
          <p className="text-stone-500 text-sm mb-6">Your message couldn't be saved. Please try again.</p>
          <button
            onClick={() => setStep('form')}
            className="px-5 py-2.5 bg-stone-800 text-white rounded-xl text-sm font-medium hover:bg-stone-900 transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 to-amber-50 flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-white border border-amber-200 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Lock className="w-6 h-6 text-amber-700" />
            </div>
            {coupleName && (
              <p className="text-sm text-stone-500 mb-1 tracking-wide uppercase font-medium">
                {coupleName}
              </p>
            )}
            <h1 className="text-2xl font-bold text-stone-800">{vaultLabel}</h1>
            <p className="text-stone-500 text-sm mt-2 max-w-sm mx-auto leading-relaxed">
              {description}
              {unlockYear && (
                <> The vault opens in <strong className="text-stone-700">{unlockYear}</strong>.</>
              )}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6 md:p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  Your name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.author_name}
                  onChange={e => setForm({ ...form, author_name: e.target.value })}
                  placeholder="e.g. Aunt Sarah, The Johnsons, Your college roommate"
                  className={`w-full px-4 py-2.5 border rounded-xl text-stone-800 placeholder:text-stone-400 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 transition ${
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
                  placeholder="e.g. Advice for year one, My wish for you…"
                  className="w-full px-4 py-2.5 border border-stone-300 rounded-xl text-stone-800 placeholder:text-stone-400 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white transition"
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
                  placeholder={`Write something heartfelt for ${coupleName || 'the couple'} to read on their ${ordinal} anniversary…`}
                  className={`w-full px-4 py-3 border rounded-xl text-stone-800 placeholder:text-stone-400 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none transition ${
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
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">Message type</label>
                  <select
                    value={form.media_type}
                    onChange={e => { setForm({ ...form, media_type: e.target.value as 'text' | 'photo' | 'video' | 'voice' }); setSelectedFiles([]); setSubmitError(null); }}
                    className="w-full px-4 py-2.5 border border-stone-300 rounded-xl text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white transition"
                  >
                    <option value="text">Text only</option>
                    <option value="photo">Photo</option>
                    <option value="video">Video</option>
                    <option value="voice">Voice note</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">
                    Media URL {form.media_type !== 'text' ? <span className="text-red-500">*</span> : <span className="text-stone-400 font-normal">(optional)</span>}
                  </label>
                  <input
                    type="url"
                    value={form.attachment_url}
                    onChange={e => setForm({ ...form, attachment_url: e.target.value })}
                    placeholder={form.media_type === 'text' ? 'https://… (optional)' : 'https://… (required for media)'}
                    className={`w-full px-4 py-2.5 border rounded-xl text-stone-800 placeholder:text-stone-400 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 transition ${
                      errors.attachment_url ? 'border-red-300 bg-red-50' : 'border-stone-300 bg-white'
                    }`}
                  />
                  {errors.attachment_url && <p className="text-red-500 text-xs mt-1">{errors.attachment_url}</p>}
                  {form.media_type !== 'text' && (
                    <div className="mt-2">
                      <label className="block text-xs text-stone-500 mb-1">or upload file</label>
                      <input
                        type="file"
                        multiple={form.media_type === 'photo' || form.media_type === 'video'}
                        accept={form.media_type === 'photo' ? 'image/*' : form.media_type === 'video' ? 'video/*' : 'audio/*'}
                        onChange={e => {
                          const files = Array.from(e.target.files ?? []);
                          if (files.length === 0) {
                            setSelectedFiles([]);
                            return;
                          }

                          if ((form.media_type === 'photo' || form.media_type === 'video') && files.length > 3) {
                            setSubmitError('You can upload up to 3 photos or videos per submission.');
                            setSelectedFiles([]);
                            return;
                          }

                          const mediaType = form.media_type;
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
                        className="w-full text-sm"
                      />
                      {selectedFiles.length > 0 && <p className="text-xs text-stone-500 mt-1">Selected: {selectedFiles.length} file{selectedFiles.length === 1 ? '' : 's'}</p>}
                      {form.media_type === 'video' && (
                        <label className="mt-1 inline-flex items-center gap-2 text-xs text-stone-600">
                          <input type="checkbox" checked={compressVideo} onChange={e => setCompressVideo(e.target.checked)} />
                          Compress to 720p before upload (recommended)
                        </label>
                      )}
                      <p className="text-[11px] text-stone-400 mt-1">{form.media_type === 'photo' ? 'Up to 3 photos, 8MB each. If larger, compress first.' : form.media_type === 'video' ? (compressVideo ? 'Up to 3 videos, 200MB source each (auto-compressed to 720p).' : 'Up to 3 videos, 35MB each. If larger, compress/trim first.') : 'Single voice file, 12MB max. If larger, trim/compress first.'}</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  Media label <span className="text-stone-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={form.attachment_name}
                  onChange={e => setForm({ ...form, attachment_name: e.target.value })}
                  placeholder="e.g. Engagement video, Voice memo"
                  className="w-full px-4 py-2.5 border border-stone-300 rounded-xl text-stone-800 placeholder:text-stone-400 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white transition"
                />
              </div>


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

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-stone-800 hover:bg-stone-900 text-white font-medium rounded-xl text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Sealing your message…</>
                ) : (
                  <><Send className="w-4 h-4" />Seal in vault</>
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
