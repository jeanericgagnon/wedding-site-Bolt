import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ExternalLink, Instagram } from 'lucide-react';
import { getVendorProfileBySlug, normalizeVendorTemplateId, submitVendorInquiry, type VendorProfile } from '../lib/vendorProfiles';
import { getSafePublicEmailHref, getSafePublicImageUrl, getSafePublicInstagramUrl, getSafePublicWebUrl } from '../sections/publicLinks';
import { customerSafeErrorMessage } from '../lib/customerSafeError';

function readSourceLink(profile: VendorProfile, key: 'pinterest_url' | 'tiktok_url' | 'facebook_url' | 'youtube_url'): string | null {
  const value = profile.source_payload?.[key];
  if (typeof value !== 'string') return null;
  return getSafePublicWebUrl(value) || null;
}

function safeVendorProfileError(err: unknown, fallback: string): string {
  return customerSafeErrorMessage(err, fallback);
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
        setError('This vendor page is not available right now.');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const data = await getVendorProfileBySlug(slug);
        if (cancelled) return;
        setProfile(data);
        setError(data ? null : 'This vendor page is not available right now.');
      } catch (err) {
        if (cancelled) return;
        setProfile(null);
        setError(safeVendorProfileError(err, 'Couldn’t load this vendor page right now. Please refresh and try again.'));
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
    const all = [profile.hero_image_url, ...profile.image_urls]
      .map((item) => getSafePublicImageUrl(item))
      .filter((item, index, arr): item is string => Boolean(item) && arr.indexOf(item) === index);
    return all.slice(0, 6);
  }, [profile]);

  const featuredImage = galleryImages[0] ?? null;
  const secondaryImages = galleryImages.slice(1, 6);
  const initials = useMemo(() => profile?.vendor_name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') ?? 'VP', [profile?.vendor_name]);
  const pinterestUrl = profile ? readSourceLink(profile, 'pinterest_url') : null;
  const tiktokUrl = profile ? readSourceLink(profile, 'tiktok_url') : null;
  const facebookUrl = profile ? readSourceLink(profile, 'facebook_url') : null;
  const youtubeUrl = profile ? readSourceLink(profile, 'youtube_url') : null;
  const instagramUrl = profile ? getSafePublicInstagramUrl(profile.instagram_url) : '';
  const websiteUrl = profile ? getSafePublicWebUrl(profile.website_url) : '';
  const directEmailHref = profile ? getSafePublicEmailHref(profile.contact_email) : '';
  const directEmailSubjectHref = profile ? getSafePublicEmailHref(profile.contact_email, `Inquiry for ${profile.vendor_name}`) : '';
  const publicLinks = [
    instagramUrl ? { label: 'Instagram', href: instagramUrl, icon: <Instagram className="h-4 w-4" /> } : null,
    pinterestUrl ? { label: 'Pinterest', href: pinterestUrl, icon: <ExternalLink className="h-4 w-4" /> } : null,
    tiktokUrl ? { label: 'TikTok', href: tiktokUrl, icon: <ExternalLink className="h-4 w-4" /> } : null,
    facebookUrl ? { label: 'Facebook', href: facebookUrl, icon: <ExternalLink className="h-4 w-4" /> } : null,
    youtubeUrl ? { label: 'YouTube', href: youtubeUrl, icon: <ExternalLink className="h-4 w-4" /> } : null,
    websiteUrl ? { label: 'Website', href: websiteUrl, icon: <ExternalLink className="h-4 w-4" /> } : null,
  ].filter((item): item is { label: string; href: string; icon: JSX.Element } => Boolean(item));
  const hasGallery = galleryImages.length > 0;
  const hasSingleImage = galleryImages.length === 1;
  const hasTwoImages = galleryImages.length === 2;
  const hasDescriptor = Boolean(profile?.descriptor);
  const hasDirectEmail = Boolean(directEmailHref);
  const hasPublicLinks = publicLinks.length > 0;
  const templateId = normalizeVendorTemplateId(profile?.source_payload?.template_id);
  const isPortfolio = templateId === 'portfolio';
  const isMinimal = templateId === 'minimal';
  const pageClass = isPortfolio ? 'bg-[#11100e] text-[#f8f3ec]' : isMinimal ? 'bg-[#fbfaf7] text-[#2f261d]' : 'bg-[#f6f1ea] text-[#2f261d]';
  const shellClass = isMinimal ? 'max-w-3xl' : isPortfolio ? 'max-w-6xl' : 'max-w-5xl';
  const heroCardClass = isPortfolio
    ? 'overflow-hidden rounded-lg border border-white/10 bg-[#1d1a17] shadow-sm'
    : isMinimal
      ? 'rounded-lg border border-[#eadfce] bg-white shadow-sm'
      : 'overflow-hidden rounded-lg bg-white shadow-sm';
  const mutedText = isPortfolio ? 'text-[#d8c4ad]' : 'text-[#6f5843]';
  const eyebrowText = isPortfolio ? 'text-[#d8c4ad]' : 'text-[#8b6f53]';
  const titleText = isPortfolio ? 'text-[#f8f3ec]' : 'text-[#2f261d]';
  const panelClass = isPortfolio
    ? 'rounded-lg border border-white/10 bg-white/8 p-6 sm:p-8 shadow-sm'
    : 'rounded-lg bg-white p-6 sm:p-8 shadow-sm';

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
      setError(safeVendorProfileError(err, 'Couldn’t send that inquiry right now. Please try again.'));
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-[#f6f1ea] flex items-center justify-center text-[#2f261d]">Loading vendor profile…</div>;
  }

  if (!profile) {
    return <div className="min-h-screen bg-[#f6f1ea] flex items-center justify-center px-6 text-center text-[#2f261d]">{error || 'This vendor page is not available right now.'}</div>;
  }

  return (
    <div className={`min-h-screen ${pageClass}`}>
      <div className={`${shellClass} mx-auto px-4 py-4 sm:px-6 sm:py-8 space-y-8 sm:space-y-14`}>
        <section className={heroCardClass}>
          {featuredImage ? (
            <div className={`${isMinimal ? 'mx-6 mt-6 aspect-[16/10] rounded-lg' : isPortfolio ? 'aspect-[4/5] sm:aspect-[21/9]' : 'aspect-[4/5] sm:aspect-[16/8]'} overflow-hidden bg-[#e9dfd2]`}>
              <img src={featuredImage} alt={profile.vendor_name} className={`h-full w-full object-cover ${isPortfolio ? 'saturate-[0.92] contrast-105' : ''}`} />
            </div>
          ) : (
            <div className={`${isMinimal ? 'mx-6 mt-6 aspect-[16/10] rounded-lg' : 'aspect-[4/5] sm:aspect-[16/8]'} bg-[linear-gradient(135deg,#e9dfd2_0%,#f8f3ec_55%,#e1d3c2_100%)] flex items-center justify-center`}>
              <div className="flex h-24 w-24 items-center justify-center rounded-lg border border-white/60 bg-white/70 text-3xl font-semibold text-[#8b6f53] sm:h-32 sm:w-32 sm:text-4xl">
                {initials}
              </div>
            </div>
          )}
          <div className={`${isMinimal ? 'p-6 sm:p-8' : 'p-6 sm:p-10'} space-y-4 sm:space-y-5`}>
            <p className={`text-xs font-semibold ${eyebrowText}`}>Wedding vendor</p>
            <h1 className={`text-4xl sm:text-6xl font-semibold leading-[1.02] max-w-3xl ${titleText}`}>{profile.vendor_name}</h1>
            {hasDescriptor ? (
              <p className={`text-base sm:text-xl ${mutedText} max-w-2xl`}>{profile.descriptor}</p>
            ) : (
              <p className={`text-sm sm:text-base ${eyebrowText} max-w-2xl`}>Curated vendor profile with the essential visuals, links, and contact path in one place.</p>
            )}
            <div className="flex flex-wrap gap-2 pt-2">
              {instagramUrl && <span className="rounded-lg bg-[#f6f1ea] px-3 py-1 text-xs font-medium text-[#8b6f53]">Instagram</span>}
              {websiteUrl && <span className="rounded-lg bg-[#f6f1ea] px-3 py-1 text-xs font-medium text-[#8b6f53]">Website</span>}
              {hasDirectEmail && <span className="rounded-lg bg-[#f6f1ea] px-3 py-1 text-xs font-medium text-[#8b6f53]">Direct email</span>}
              <span className="rounded-lg bg-[#f6f1ea] px-3 py-1 text-xs font-medium text-[#8b6f53]">Inquire</span>
            </div>
          </div>
        </section>

        {hasGallery && (
          <section className="space-y-4 sm:space-y-5">
            <h2 className={`text-sm font-semibold ${eyebrowText}`}>Images</h2>
            <div className={isPortfolio ? 'grid gap-3 sm:gap-4 sm:grid-cols-3' : hasSingleImage ? 'grid' : hasTwoImages ? 'grid gap-3 sm:gap-4 sm:grid-cols-2' : 'grid gap-3 sm:gap-4 sm:grid-cols-[1.25fr_0.75fr]'}>
              {featuredImage && (
                <div className="overflow-hidden rounded-lg bg-white shadow-sm">
                  <img src={featuredImage} alt={`${profile.vendor_name} featured`} className={`h-full w-full object-cover ${isPortfolio ? 'aspect-[4/5]' : hasSingleImage ? 'aspect-[4/5] sm:aspect-[16/9]' : 'aspect-[4/5] sm:aspect-[4/4.4]'}`} />
                </div>
              )}
              {!hasSingleImage && !isPortfolio && (
                <div className={`grid ${hasTwoImages ? 'grid-cols-1' : 'grid-cols-2'} gap-3 sm:gap-4 auto-rows-fr`}>
                  {secondaryImages.map((image, index) => (
                    <div key={`${image}-${index}`} className="overflow-hidden rounded-lg bg-white shadow-sm">
                      <img src={image} alt={`${profile.vendor_name} ${index + 2}`} className="h-full w-full object-cover aspect-square" />
                    </div>
                  ))}
                </div>
              )}
              {isPortfolio && secondaryImages.map((image, index) => (
                <div key={`${image}-${index}`} className="overflow-hidden rounded-lg bg-white shadow-sm">
                  <img src={image} alt={`${profile.vendor_name} ${index + 2}`} className="h-full w-full object-cover aspect-[4/5]" />
                </div>
              ))}
            </div>
          </section>
        )}

        {!hasGallery && (
          <section className={`rounded-lg border border-dashed ${isPortfolio ? 'border-white/15 bg-white/8 text-[#d8c4ad]' : 'border-[#d8c8b6] bg-white/70 text-[#6f5843]'} p-6 sm:p-8`}>
            <h2 className={`text-sm font-semibold ${eyebrowText}`}>Images</h2>
            <p className="mt-3 text-sm sm:text-base">This vendor has not added a gallery yet. Use the links below to view more of their work.</p>
          </section>
        )}

        <section className="grid gap-8 lg:grid-cols-[1.12fr_0.88fr] lg:items-start">
          <div className={`${panelClass} space-y-4 sm:space-y-5`}>
            <h2 className={`text-sm font-semibold ${eyebrowText}`}>About</h2>
            <p className={`text-base sm:text-lg leading-8 ${isPortfolio ? 'text-[#efe4d8]' : 'text-[#4b3a2c]'}`}>{profile.about || `${profile.vendor_name} is a wedding vendor with a focused public profile page for quick review.`}</p>
          </div>

          <div className={`${panelClass} space-y-4 lg:sticky lg:top-6`}>
            <h2 className={`text-sm font-semibold ${eyebrowText}`}>Links</h2>
            {hasPublicLinks ? (
              <div className="space-y-3">
                {publicLinks.map((link) => (
                  <a key={link.label} href={link.href} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-lg border border-[#eadfce] px-4 py-3 hover:bg-[#fbf8f3]">
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
              <div className="rounded-lg bg-[#f8f3ec] px-4 py-4 space-y-2">
                <p className="text-xs font-semibold text-[#8b6f53]">Best next step</p>
                <p className="text-sm text-[#6f5843]">
                  {hasDirectEmail
                    ? `Email ${profile.vendor_name} directly for the fastest reply.`
                    : 'Review links, then use the inquiry form below to reach out.'}
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-lg bg-[#2f261d] text-white p-6 sm:p-8 shadow-sm space-y-5 sm:space-y-6">
          <div>
            <h2 className="text-sm font-semibold text-[#d8c4ad]">Contact and inquire</h2>
            <p className="mt-3 text-base sm:text-lg text-[#efe4d8] max-w-2xl">
              {hasDirectEmail
                ? `Reach ${profile.vendor_name} directly by email, or send a quick inquiry here and keep the conversation moving.`
                : 'Send a quick inquiry and keep the conversation moving without hunting for details.'}
            </p>
            {!hasDirectEmail && publicLinks.length === 0 && (
              <p className="mt-3 text-sm text-[#d8c4ad]">This profile is intentionally light for now, but the inquiry form below still gives couples a clear next step.</p>
            )}
          </div>
          <div className={`grid gap-4 ${hasDirectEmail ? 'lg:grid-cols-[0.92fr_1.08fr]' : ''}`}>
            {hasDirectEmail && (
              <div className="rounded-lg bg-white/8 border border-white/10 p-4 sm:p-5 space-y-3 h-full">
                <p className="text-xs font-semibold text-[#d8c4ad]">Fastest contact path</p>
                <p className="text-sm text-[#efe4d8] leading-6">Direct email is the clearest path when you already know you want to start the conversation.</p>
                <div className="grid gap-3">
                  <a
                    href={directEmailSubjectHref}
                    className="inline-flex items-center justify-center rounded-lg bg-[#f5e9db] px-5 py-3 text-sm font-semibold text-[#2f261d] hover:bg-white"
                  >
                    Email {profile.vendor_name}
                  </a>
                  <a
                    href={directEmailHref}
                    className="inline-flex items-center justify-center rounded-lg border border-white/20 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10 break-all text-center"
                  >
                    {profile.contact_email}
                  </a>
                </div>
              </div>
            )}

            <div className="rounded-lg bg-white/8 border border-white/10 p-4 sm:p-5 space-y-3">
              {sent ? (
                <div role="status" className="rounded-lg bg-white/10 px-4 py-4 text-sm text-[#f5e9db]">Inquiry sent. We saved your message for follow-up.</div>
              ) : (
                <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2" aria-busy={sending}>
                  {hasDirectEmail && <p className="sm:col-span-2 text-xs font-semibold text-[#d8c4ad]">Or send an inquiry here</p>}
                  {!hasDirectEmail && <p className="sm:col-span-2 text-xs font-semibold text-[#d8c4ad]">Inquiry form</p>}
                  <div>
                    <label htmlFor="vendor-inquiry-name" className="mb-1 block text-sm font-medium text-[#f5e9db]">Your name</label>
                    <input id="vendor-inquiry-name" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} placeholder="Your name" className="w-full rounded-lg bg-white/10 border border-white/15 px-4 py-3 text-white placeholder:text-white/60 outline-none" required />
                  </div>
                  <div>
                    <label htmlFor="vendor-inquiry-email" className="mb-1 block text-sm font-medium text-[#f5e9db]">Email</label>
                    <input id="vendor-inquiry-email" type="email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} placeholder="Email" className="w-full rounded-lg bg-white/10 border border-white/15 px-4 py-3 text-white placeholder:text-white/60 outline-none" required />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="vendor-inquiry-message" className="mb-1 block text-sm font-medium text-[#f5e9db]">What are you looking for?</label>
                    <textarea id="vendor-inquiry-message" value={form.message} onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))} placeholder="What are you looking for?" className="min-h-[150px] w-full rounded-lg bg-white/10 border border-white/15 px-4 py-3 text-white placeholder:text-white/60 outline-none" required />
                  </div>
                  <button disabled={sending} className="sm:col-span-2 rounded-lg bg-[#f5e9db] px-5 py-3 text-sm font-semibold text-[#2f261d] hover:bg-white disabled:opacity-60">
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
