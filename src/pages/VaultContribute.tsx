import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Lock, Heart, Send, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SiteInfo {
  id: string;
  couple_name_1: string | null;
  couple_name_2: string | null;
  wedding_date: string | null;
}

const VAULT_LABELS: Record<string, { label: string; ordinal: string; description: string }> = {
  '1': {
    label: '1st Anniversary Vault',
    ordinal: 'first',
    description: 'Leave a message to be opened on the couple\'s first anniversary.',
  },
  '5': {
    label: '5th Anniversary Vault',
    ordinal: 'fifth',
    description: 'Your words will be sealed until their fifth anniversary.',
  },
  '10': {
    label: '10th Anniversary Vault',
    ordinal: 'tenth',
    description: 'A decade from now, they\'ll open this vault and read your message.',
  },
};

type Step = 'form' | 'success' | 'error' | 'invalid';

export const VaultContribute: React.FC = () => {
  const { siteSlug, year } = useParams<{ siteSlug: string; year: string }>();
  const [site, setSite] = useState<SiteInfo | null>(null);
  const [loadingsite, setLoadingSite] = useState(true);
  const [step, setStep] = useState<Step>('form');
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    title: '',
    content: '',
    author_name: '',
  });
  const [errors, setErrors] = useState<{ content?: string; author_name?: string }>({});

  const vaultYear = parseInt(year ?? '1', 10) as 1 | 5 | 10;
  const vaultInfo = VAULT_LABELS[String(vaultYear)];

  useEffect(() => {
    if (!siteSlug || !vaultInfo) {
      setStep('invalid');
      setLoadingSite(false);
      return;
    }
    loadSite();
  }, [siteSlug]);

  async function loadSite() {
    const { data, error } = await supabase
      .from('wedding_sites')
      .select('id, couple_name_1, couple_name_2, wedding_date, is_published')
      .eq('site_slug', siteSlug)
      .maybeSingle();

    if (error || !data || !(data as Record<string, unknown>).is_published) {
      setStep('invalid');
    } else {
      setSite(data as SiteInfo);
    }
    setLoadingSite(false);
  }

  function validate(): boolean {
    const newErrors: typeof errors = {};
    if (!form.content.trim()) newErrors.content = 'Please write a message.';
    if (!form.author_name.trim()) newErrors.author_name = 'Please enter your name.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate() || !site) return;
    setSubmitting(true);

    const { error } = await supabase.from('vault_entries').insert({
      wedding_site_id: site.id,
      vault_year: vaultYear,
      title: form.title.trim() || null,
      content: form.content.trim(),
      author_name: form.author_name.trim(),
      attachment_url: null,
      attachment_name: null,
    });

    setSubmitting(false);
    if (error) {
      setStep('error');
    } else {
      setStep('success');
    }
  }

  const coupleName = site
    ? site.couple_name_1 && site.couple_name_2
      ? `${site.couple_name_1} & ${site.couple_name_2}`
      : site.couple_name_1 ?? site.couple_name_2 ?? 'the couple'
    : '';

  const unlockYear = site?.wedding_date
    ? new Date(site.wedding_date).getFullYear() + vaultYear
    : null;

  if (loadingsite) {
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
            Your note has been tucked away in {coupleName ? <strong>{coupleName}'s</strong> : 'the'} {vaultInfo.ordinal} anniversary vault.
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
            <h1 className="text-2xl font-bold text-stone-800">{vaultInfo.label}</h1>
            <p className="text-stone-500 text-sm mt-2 max-w-sm mx-auto leading-relaxed">
              {vaultInfo.description}
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
                  placeholder={`Write something heartfelt for ${coupleName || 'the couple'} to read on their ${vaultInfo.ordinal} anniversary…`}
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
