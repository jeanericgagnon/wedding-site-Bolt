import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ExternalLink, Instagram } from 'lucide-react';
import { getVendorProfileBySlug, submitVendorInquiry, type VendorProfile } from '../lib/vendorProfiles';
import { buildVendorProfileGuide } from './dashboard/planning/vendorDecisionSupport';

function readSourceLink(profile: VendorProfile, key: 'pinterest_url' | 'tiktok_url' | 'facebook_url' | 'youtube_url'): string | null {
  const value = profile.source_payload?.[key];
  return typeof value === 'string' && value ? value : null;
}

export const VendorProfilePage: React.FC = () => {
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', message: '' });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!slug) {
        setError('Missing vendor page.');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const data = await getVendorProfileBySlug(slug);
        if (cancelled) return;
        setProfile(data);
        setError(data ? null : 'Vendor page not found.');
      } catch (err) {
        if (cancelled) return;
        setProfile(null);
        setError(err instanceof Error ? err.message : 'Could not load vendor page.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const galleryImages = useMemo(() => {
    if (!profile) return [] as string[];
    const all = [profile.hero_image_url, ...profile.image_urls].filter((item, index, arr): item is string => !!item && arr.indexOf(item) === index);
    return all.slice(0, 6);
  }, [profile]);

  const featuredImage = galleryImages[0] ?? null;
  const secondaryImages = galleryImages.slice(1, 6);
  const initials = useMemo(() => profile?.vendor_name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') ?? 'VP', [profile?.vendor_name]);
  const pinterestUrl = profile ? readSourceLink(profile, 'pinterest_url') : null;
  const tiktokUrl = profile ? readSourceLink(profile, 'tiktok_url') : null;
  const facebookUrl = profile ? readSourceLink(profile, 'facebook_url') : null;
  const youtubeUrl = profile ? readSourceLink(profile, 'youtube_url') : null;
  const publicLinks = [
    profile?.instagram_url ? { label: 'Instagram', href: profile.instagram_url, icon: <Instagram className="h-4 w-4" /> } : null,
    pinterestUrl ? { label: 'Pinterest', href: pinterestUrl, icon: <ExternalLink className="h-4 w-4" /> } : null,
    tiktokUrl ? { label: 'TikTok', href: tiktokUrl, icon: <ExternalLink className="h-4 w-4" /> } : null,
    facebookUrl ? { label: 'Facebook', href: facebookUrl, icon: <ExternalLink className="h-4 w-4" /> } : null,
    youtubeUrl ? { label: 'YouTube', href: youtubeUrl, icon: <ExternalLink className="h-4 w-4" /> } : null,
    profile?.website_url ? { label: 'Website', href: profile.website_url, icon: <ExternalLink className="h-4 w-4" /> } : null,
  ].filter((item): item is { label: string; href: string; icon: JSX.Element } => Boolean(item));
  const hasGallery = galleryImages.length > 0;
  const hasSingleImage = galleryImages.length === 1;
  const hasTwoImages = galleryImages.length === 2;
  const hasDescriptor = Boolean(profile?.descriptor);
  const hasDirectEmail = Boolean(profile?.contact_email);
  const hasPublicLinks = publicLinks.length > 0;
  const profileGuide = useMemo(() => (profile ? buildVendorProfileGuide(profile) : null), [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    try {
      setSending(true);
      await submitVendorInquiry({
        vendor_profile_id: profile.id,
        name: form.name.trim(),
        email: form.email.trim(),
        message: form.message.trim(),
      });
      setSent(true);
      setForm({ name: '', email: '', message: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send inquiry.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-[#f6f1ea] flex items-center justify-center text-[#2f261d]">Loading vendor profile…</div>;
  }

  if (!profile) {
    return <div className="min-h-screen bg-[#f6f1ea] flex items-center justify-center px-6 text-center text-[#2f261d]">{error || 'Vendor page not found.'}</div>;
  }

  return (
    <div className="min-h-screen bg-[#f6f1ea] text-[#2f261d]">
      <div className="max-w-5xl mx-auto px-4 py-4 sm:px-6 sm:py-8 space-y-8 sm:space-y-14">
        <section className="overflow-hidden rounded-[28px] bg-white shadow-[0_24px_80px_rgba(53,37,22,0.12)]">
          {profile.hero_image_url ? (
            <div className="aspect-[4/5] sm:aspect-[16/8] bg-[#e9dfd2]">
              <img src={profile.hero_image_url} alt={profile.vendor_name} className="h-full w-full object-cover" />
            </div>
          ) : (
            <div className="aspect-[4/5] sm:aspect-[16/8] bg-[linear-gradient(135deg,#e9dfd2_0%,#f8f3ec_55%,#e1d3c2_100%)] flex items-center justify-center">
              <div className="flex h-28 w-28 items-center justify-center rounded-full border border-white/60 bg-white/70 text-3xl font-semibold tracking-[0.18em] text-[#8b6f53] shadow-[0_18px_40px_rgba(53,37,22,0.08)] sm:h-36 sm:w-36 sm:text-4xl">
                {initials}
              </div>
            </div>
          )}
          <div className="p-6 sm:p-10 space-y-4 sm:space-y-5">
            <p className="text-xs uppercase tracking-[0.35em] text-[#8b6f53]">Wedding vendor</p>
            <h1 className="text-4xl sm:text-6xl font-semibold leading-[1.02] max-w-3xl">{profile.vendor_name}</h1>
            {hasDescriptor ? (
              <p className="text-base sm:text-xl text-[#6f5843] max-w-2xl">{profile.descriptor}</p>
            ) : (
              <p className="text-sm sm:text-base text-[#8b6f53] max-w-2xl">Curated vendor profile with the essential visuals, links, and contact path in one place.</p>
            )}
            <div className="flex flex-wrap gap-2 pt-2">
              {profile.instagram_url && <span className="rounded-full bg-[#f6f1ea] px-3 py-1 text-xs tracking-[0.18em] uppercase text-[#8b6f53]">Instagram</span>}
              {profile.website_url && <span className="rounded-full bg-[#f6f1ea] px-3 py-1 text-xs tracking-[0.18em] uppercase text-[#8b6f53]">Website</span>}
              {hasDirectEmail && <span className="rounded-full bg-[#f6f1ea] px-3 py-1 text-xs tracking-[0.18em] uppercase text-[#8b6f53]">Direct email</span>}
              <span className="rounded-full bg-[#f6f1ea] px-3 py-1 text-xs tracking-[0.18em] uppercase text-[#8b6f53]">Inquire</span>
            </div>
          </div>
        </section>

        {hasGallery && (
          <section className="space-y-4 sm:space-y-5">
            <h2 className="text-sm uppercase tracking-[0.28em] text-[#8b6f53]">Images</h2>
            <div className={hasSingleImage ? 'grid' : hasTwoImages ? 'grid gap-3 sm:gap-4 sm:grid-cols-2' : 'grid gap-3 sm:gap-4 sm:grid-cols-[1.25fr_0.75fr]'}>
              {featuredImage && (
                <div className="overflow-hidden rounded-[24px] bg-white shadow-[0_18px_40px_rgba(53,37,22,0.08)]">
                  <img src={featuredImage} alt={`${profile.vendor_name} featured`} className={`h-full w-full object-cover ${hasSingleImage ? 'aspect-[4/5] sm:aspect-[16/9]' : 'aspect-[4/5] sm:aspect-[4/4.4]'}`} />
                </div>
              )}
              {!hasSingleImage && (
                <div className={`grid ${hasTwoImages ? 'grid-cols-1' : 'grid-cols-2'} gap-3 sm:gap-4 auto-rows-fr`}>
                  {secondaryImages.map((image, index) => (
                    <div key={`${image}-${index}`} className="overflow-hidden rounded-[24px] bg-white shadow-[0_18px_40px_rgba(53,37,22,0.08)]">
                      <img src={image} alt={`${profile.vendor_name} ${index + 2}`} className="h-full w-full object-cover aspect-square" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {!hasGallery && (
          <section className="rounded-[28px] border border-dashed border-[#d8c8b6] bg-white/70 p-6 sm:p-8 text-[#6f5843]">
            <h2 className="text-sm uppercase tracking-[0.28em] text-[#8b6f53]">Images</h2>
            <p className="mt-3 text-sm sm:text-base">Image gallery coming soon for this vendor. Use the links below to view more of their work.</p>
          </section>
        )}

        <section className="grid gap-8 lg:grid-cols-[1.12fr_0.88fr] lg:items-start">
          <div className="rounded-[28px] bg-white p-6 sm:p-8 shadow-[0_18px_40px_rgba(53,37,22,0.08)] space-y-4 sm:space-y-5">
            <h2 className="text-sm uppercase tracking-[0.28em] text-[#8b6f53]">About</h2>
            <p className="text-base sm:text-lg leading-8 text-[#4b3a2c]">{profile.about || `${profile.vendor_name} is a wedding vendor with a focused public profile page for quick review.`}</p>
          </div>

          <div className="rounded-[28px] bg-white p-6 sm:p-8 shadow-[0_18px_40px_rgba(53,37,22,0.08)] space-y-4 lg:sticky lg:top-6">
            <h2 className="text-sm uppercase tracking-[0.28em] text-[#8b6f53]">Links</h2>
            {profileGuide && (
              <div className="rounded-[22px] bg-[#f8f3ec] px-4 py-4 space-y-2">
                <p className="text-xs uppercase tracking-[0.22em] text-[#8b6f53]">{profileGuide.label}</p>
                <p className="text-sm font-medium text-[#2f261d]">{profileGuide.title}</p>
                <p className="text-sm text-[#6f5843]">{profileGuide.detail}</p>
                <div className="grid gap-2 md:grid-cols-3">
                  <div className="rounded-2xl bg-white px-3 py-3 shadow-sm">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[#8b6f53]">Main focus</p>
                    <p className="mt-1 text-sm font-medium text-[#2f261d]">{profileGuide.focusTitle}</p>
                    <p className="mt-2 text-xs leading-5 text-[#6f5843]">{profileGuide.focusDetail}</p>
                  </div>
                  <div className="rounded-2xl bg-white px-3 py-3 shadow-sm">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[#8b6f53]">Best next move</p>
                    <p className="mt-1 text-sm font-medium text-[#2f261d]">{profileGuide.nextMove}</p>
                  </div>
                  <div className="rounded-2xl bg-white px-3 py-3 shadow-sm">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-[#8b6f53]">Decision rule</p>
                    <p className="mt-1 text-sm font-medium text-[#2f261d]">{profileGuide.decisionRule}</p>
                  </div>
                </div>
                <div className="rounded-2xl bg-white px-3 py-3 shadow-sm">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[#8b6f53]">Watchout</p>
                  <p className="mt-1 text-sm text-[#6f5843]">{profileGuide.watchout}</p>
                </div>
                <div className="grid gap-2 md:grid-cols-3">
                  {profileGuide.sequence.map((step) => (
                    <div key={`${step.status}-${step.title}`} className="rounded-2xl bg-white px-3 py-3 shadow-sm">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-[#2f261d]">{step.title}</p>
                        <span className="rounded-full bg-[#f8f3ec] px-2 py-0.5 text-[10px] text-[#6f5843]">
                          {step.status === 'current' ? 'Current' : step.status === 'next' ? 'Next' : 'Then'}
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-5 text-[#6f5843]">{step.detail}</p>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {profileGuide.trustSignals.map((signal) => (
                    <span key={signal} className="rounded-full bg-white px-2.5 py-1 text-[11px] text-[#6f5843] shadow-sm">
                      {signal}
                    </span>
                  ))}
                </div>
                <ul className="space-y-1.5 text-sm text-[#6f5843]">
                  {profileGuide.checks.map((check) => (
                    <li key={check} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#8b6f53]" />
                      <span>{check}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {hasPublicLinks ? (
              <div className="space-y-3">
                {publicLinks.map((link) => (
                  <a key={link.label} href={link.href} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-2xl border border-[#eadfce] px-4 py-3 hover:bg-[#fbf8f3]">
                    <span className="flex items-center gap-3">{link.icon} {link.label}</span>
                    <ExternalLink className="h-4 w-4" />
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm sm:text-base text-[#6f5843]">Public links will appear here once they’re available for this vendor.</p>
            )}
            {hasPublicLinks && (
              <p className="pt-2 text-xs text-[#8b6f53]">Use these links to browse more recent work, social proof, or the vendor’s main site before reaching out.</p>
            )}
            {(hasDirectEmail || hasPublicLinks) && (
              <div className="rounded-[22px] bg-[#f8f3ec] px-4 py-4 space-y-2">
                <p className="text-xs uppercase tracking-[0.22em] text-[#8b6f53]">Best next step</p>
                <p className="text-sm text-[#6f5843]">
                  {hasDirectEmail
                    ? `Email ${profile.vendor_name} directly for the fastest reply.`
                    : 'Review links, then use the inquiry form below to reach out.'}
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-[28px] bg-[#2f261d] text-white p-6 sm:p-8 shadow-[0_24px_80px_rgba(31,21,12,0.24)] space-y-5 sm:space-y-6">
          <div>
            <h2 className="text-sm uppercase tracking-[0.28em] text-[#d8c4ad]">Contact / Inquire</h2>
            <p className="mt-3 text-base sm:text-lg text-[#efe4d8] max-w-2xl">
              {profile.contact_email
                ? `Reach ${profile.vendor_name} directly by email, or send a quick inquiry here and keep the conversation moving.`
                : 'Send a quick inquiry and keep the conversation moving without hunting for details.'}
            </p>
            {!hasDirectEmail && publicLinks.length === 0 && (
              <p className="mt-3 text-sm text-[#d8c4ad]">This profile is intentionally light for now, but the inquiry form below still gives couples a clear next step.</p>
            )}
          </div>
          <div className={`grid gap-4 ${profile.contact_email ? 'lg:grid-cols-[0.92fr_1.08fr]' : ''}`}>
            {profile.contact_email && (
              <div className="rounded-[24px] bg-white/8 border border-white/10 p-4 sm:p-5 space-y-3 h-full">
                <p className="text-xs uppercase tracking-[0.22em] text-[#d8c4ad]">Fastest contact path</p>
                <p className="text-sm text-[#efe4d8] leading-6">Direct email is the clearest path when you already know you want to start the conversation.</p>
                <div className="grid gap-3">
                  <a
                    href={`mailto:${profile.contact_email}?subject=${encodeURIComponent(`Inquiry for ${profile.vendor_name}`)}`}
                    className="inline-flex items-center justify-center rounded-2xl bg-[#f5e9db] px-5 py-3 text-sm font-semibold text-[#2f261d] hover:bg-white"
                  >
                    Email {profile.vendor_name}
                  </a>
                  <a
                    href={`mailto:${profile.contact_email}`}
                    className="inline-flex items-center justify-center rounded-2xl border border-white/20 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10 break-all text-center"
                  >
                    {profile.contact_email}
                  </a>
                </div>
              </div>
            )}

            <div className="rounded-[24px] bg-white/8 border border-white/10 p-4 sm:p-5 space-y-3">
              {sent ? (
                <div className="rounded-2xl bg-white/10 px-4 py-4 text-sm text-[#f5e9db]">Inquiry sent. We saved your message for follow-up.</div>
              ) : (
                <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
                  {profile.contact_email && <p className="sm:col-span-2 text-xs uppercase tracking-[0.22em] text-[#d8c4ad]">Or send an inquiry here</p>}
                  {!profile.contact_email && <p className="sm:col-span-2 text-xs uppercase tracking-[0.22em] text-[#d8c4ad]">Inquiry form</p>}
                  <input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Your name" className="rounded-2xl bg-white/10 border border-white/15 px-4 py-3 text-white placeholder:text-white/60 outline-none" required />
                  <input type="email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} placeholder="Email" className="rounded-2xl bg-white/10 border border-white/15 px-4 py-3 text-white placeholder:text-white/60 outline-none" required />
                  <textarea value={form.message} onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))} placeholder="What are you looking for?" className="sm:col-span-2 min-h-[150px] rounded-2xl bg-white/10 border border-white/15 px-4 py-3 text-white placeholder:text-white/60 outline-none" required />
                  <button disabled={sending} className="sm:col-span-2 rounded-2xl bg-[#f5e9db] px-5 py-3 text-sm font-semibold text-[#2f261d] hover:bg-white disabled:opacity-60">
                    {sending ? 'Sending…' : 'Send inquiry'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default VendorProfilePage;
