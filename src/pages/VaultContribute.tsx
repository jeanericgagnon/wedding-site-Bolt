import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
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

type Step = 'loading' | 'form' | 'success' | 'error' | 'invalid';
const DEMO_VAULT_STORAGE_KEY = 'dayof_demo_vault_state_v1';
const MAX_UPLOAD_MB_BY_TYPE: Record<'photo' | 'video' | 'voice', number> = { photo: 10, video: 100, voice: 25 };

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
  const [site, setSite] = useState<SiteInfo | null>(null);
  const [vaultConfig, setVaultConfig] = useState<VaultConfigInfo | null>(null);
  const [vaultOptions, setVaultOptions] = useState<VaultConfigInfo[]>([]);
  const [step, setStep] = useState<Step>('loading');
  const [submitting, setSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

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

  useEffect(() => {
    if (!siteSlug) {
      setStep('invalid');
      return;
    }
    if (hasYearParam && (vaultYear === null || Number.isNaN(vaultYear))) {
      setStep('invalid');
      return;
    }
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
        setStep('form');
      } catch {
        const fallback = [
          { id: 'demo-vault-1', label: '1-Year Anniversary Vault', duration_years: 1, is_enabled: true },
          { id: 'demo-vault-5', label: '5-Year Anniversary Vault', duration_years: 5, is_enabled: true },
          { id: 'demo-vault-10', label: '10-Year Anniversary Vault', duration_years: 10, is_enabled: true },
        ] as VaultConfigInfo[];
        setVaultOptions(fallback.sort((a, b) => a.duration_years - b.duration_years));
        setVaultConfig(fallback[0]);
        setStep('form');
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

    const options = configList as VaultConfigInfo[];
    setVaultOptions(options);
    setVaultConfig(options[0]);
    setStep('form');
  }

  function validate(): boolean {
    const newErrors: typeof errors = {};
    if (!form.content.trim()) newErrors.content = 'Please write a message.';
    if (!form.author_name.trim()) newErrors.author_name = 'Please enter your name.';
    if (form.media_type !== 'text' && !form.attachment_url.trim() && !selectedFile) newErrors.attachment_url = 'Please add a media URL or upload a file.';
    setErrors(newErrors);
    setSubmitError(null);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate() || !site || !vaultConfig) return;
    setSubmitting(true);

    let uploadedUrl = form.attachment_url.trim() || null;

    if (selectedFile && form.media_type !== 'text') {
      const ext = selectedFile.name.split('.').pop() || 'bin';
      const safeType = form.media_type === 'voice' ? 'audio' : form.media_type;
      const path = `public/${site.id}/${vaultConfig.id}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
      setUploadProgress(5);
      const timer = window.setInterval(() => {
        setUploadProgress((prev) => {
          if (prev === null) return 10;
          if (prev >= 90) return prev;
          return prev + 7;
        });
      }, 180);

      if (DEMO_MODE && site.id === 'demo-site-id') {
        uploadedUrl = `demo-upload://${safeType}/${selectedFile.name}`;
        window.clearInterval(timer);
        setUploadProgress(100);
      } else {
        const { error: uploadError } = await supabase.storage
          .from('vault-attachments')
          .upload(path, selectedFile, { upsert: false, contentType: selectedFile.type || undefined });

        if (uploadError) {
          window.clearInterval(timer);
          setUploadProgress(null);
          setSubmitting(false);
          setSubmitError(uploadError.message?.includes('bucket')
            ? 'Media upload is not configured yet (missing vault-attachments bucket or policy).'
            : `Upload failed: ${uploadError.message}`);
          return;
        }

        const { data: publicData } = supabase.storage.from('vault-attachments').getPublicUrl(path);
        uploadedUrl = publicData.publicUrl;
        window.clearInterval(timer);
        setUploadProgress(100);
      }
    }

    if (DEMO_MODE && site.id === 'demo-site-id') {
      setSubmitting(false);
      setUploadProgress(null);
      setStep('success');
      return;
    }

    const { error } = await supabase.from('vault_entries').insert({
      wedding_site_id: site.id,
      vault_config_id: vaultConfig.id,
      vault_year: vaultConfig.duration_years,
      title: form.title.trim() || null,
      content: form.content.trim(),
      author_name: form.author_name.trim(),
      attachment_url: uploadedUrl,
      attachment_name: form.attachment_name.trim() || (selectedFile?.name ?? (form.media_type !== 'text' ? `${form.media_type} attachment` : null)),
      media_type: form.media_type,
      mime_type: selectedFile?.type || null,
      size_bytes: selectedFile?.size || null,
    });

    setSubmitting(false);
    setUploadProgress(null);
    if (error) {
      setSubmitError(`Could not save your message: ${error.message}`);
    } else {
      setStep('success');
    }
  }

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
              {vaultOptions.length > 1 && (
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">Choose a vault</label>
                  <select
                    value={vaultConfig?.id ?? ''}
                    onChange={e => {
                      const next = vaultOptions.find(v => v.id === e.target.value) ?? null;
                      setVaultConfig(next);
                    }}
                    className="w-full px-4 py-2.5 border border-stone-300 rounded-xl text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white transition"
                  >
                    {vaultOptions.map(v => (
                      <option key={v.id} value={v.id}>{v.label || `${v.duration_years}-Year Anniversary Vault`}</option>
                    ))}
                  </select>
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
                    onChange={e => setForm({ ...form, media_type: e.target.value as 'text' | 'photo' | 'video' | 'voice' })}
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
                        accept={form.media_type === 'photo' ? 'image/*' : form.media_type === 'video' ? 'video/*' : 'audio/*'}
                        onChange={e => {
                          const file = e.target.files?.[0] ?? null;
                          if (!file) {
                            setSelectedFile(null);
                            return;
                          }

                          const mediaType = form.media_type;
                          if (mediaType === 'photo' && !file.type.startsWith('image/')) {
                            setSubmitError('Please choose an image file for Photo type.');
                            setSelectedFile(null);
                            return;
                          }
                          if (mediaType === 'video' && !file.type.startsWith('video/')) {
                            setSubmitError('Please choose a video file for Video type.');
                            setSelectedFile(null);
                            return;
                          }
                          if (mediaType === 'voice' && !file.type.startsWith('audio/')) {
                            setSubmitError('Please choose an audio file for Voice type.');
                            setSelectedFile(null);
                            return;
                          }

                          const maxMb = MAX_UPLOAD_MB_BY_TYPE[mediaType as 'photo' | 'video' | 'voice'];
                          if (file.size > maxMb * 1024 * 1024) {
                            setSubmitError(`File too large. Max ${maxMb}MB for ${mediaType}.`);
                            setSelectedFile(null);
                            return;
                          }

                          setSubmitError(null);
                          setSelectedFile(file);
                        }}
                        className="w-full text-sm"
                      />
                      {selectedFile && <p className="text-xs text-stone-500 mt-1">Selected: {selectedFile.name}</p>}
                      <p className="text-[11px] text-stone-400 mt-1">Max upload: {form.media_type === 'photo' ? '10MB image' : form.media_type === 'video' ? '100MB video' : '25MB audio'}</p>
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
