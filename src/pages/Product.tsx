import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Header, Footer } from '../components/layout';
import { Button, Card, CardContent, Badge } from '../components/ui';
import {
  Heart,
  Clock,
  Users,
  Calendar,
  CheckCircle2,
  Globe,
  Shield,
  Camera,
  Mail,
  AlertTriangle,
  UserPlus,
  Lock,
  Bell,
  ChevronRight,
  ChevronLeft,
  Zap,
  FileText,
  DollarSign,
  Utensils,
  QrCode,
  Download,
  Upload,
  Check,
  MessageSquare,
  Wallet,
  Hotel,
  ClipboardCheck,
  Send,
  Sparkles,
  Layers,
  Map,
} from 'lucide-react';
import { getAllTemplatePacks } from '../builder/constants/builderTemplatePacks';
import { THEME_PRESETS, applyThemeTokens } from '../lib/themePresets';

interface ToastMsg {
  id: number;
  message: string;
}

interface TemplateTheme {
  dark: string;
  accent: string;
  bg: string;
  mid: string;
  heroStyle: 'centered' | 'split' | 'bold';
  sectionRows: Array<{ label: string; widths: number[] }>;
}

const TEMPLATE_THEMES: Record<string, TemplateTheme> = {
  'modern-luxe':        { dark: '#1C1917', accent: '#C8A96E', bg: '#FAF9F7', mid: '#78716C', heroStyle: 'centered', sectionRows: [{ label: 'Our Story', widths: [100, 80, 60] }, { label: 'Gallery', widths: [33, 33, 33] }, { label: 'Schedule', widths: [100, 70, 85] }] },
  'editorial-romance':  { dark: '#2D2926', accent: '#B08860', bg: '#F8F5F1', mid: '#8C7B6E', heroStyle: 'split',    sectionRows: [{ label: 'Our Story', widths: [90, 70, 80] }, { label: 'Photos', widths: [50, 25, 25] }, { label: 'RSVP', widths: [60, 40, 50] }] },
  'timeless-classic':   { dark: '#1A2B4A', accent: '#C4983C', bg: '#FDFBF6', mid: '#6276A0', heroStyle: 'centered', sectionRows: [{ label: 'Ceremony', widths: [100, 75, 60] }, { label: 'Details', widths: [45, 55] }, { label: 'Registry', widths: [30, 30, 30] }] },
  'destination-minimal':{ dark: '#1E5F6F', accent: '#4BAABC', bg: '#F3F8FA', mid: '#C8A96E', heroStyle: 'bold',     sectionRows: [{ label: 'Venue & Map', widths: [100, 65, 75] }, { label: 'Travel', widths: [50, 50] }, { label: 'Schedule', widths: [100, 80, 55] }] },
  'bold-contemporary':  { dark: '#1C1917', accent: '#C8A96E', bg: '#FAF9F7', mid: '#333333', heroStyle: 'bold',     sectionRows: [{ label: 'Schedule', widths: [100, 60, 80] }, { label: 'Gallery', widths: [25, 50, 25] }, { label: 'Venue', widths: [55, 45] }] },
  'photo-storytelling': { dark: '#B5546A', accent: '#D4956A', bg: '#FDF7F4', mid: '#C9A96E', heroStyle: 'split',    sectionRows: [{ label: 'Gallery', widths: [60, 40] }, { label: 'Story', widths: [100, 70, 60] }, { label: 'RSVP', widths: [45, 55] }] },
  'floral-garden':      { dark: '#4E7C5F', accent: '#C47A4A', bg: '#F6F8F3', mid: '#9DB89F', heroStyle: 'centered', sectionRows: [{ label: 'Our Story', widths: [85, 65, 75] }, { label: 'Gallery', widths: [33, 34, 33] }, { label: 'Dress Code', widths: [60, 40, 50] }] },
};

const TEMPLATE_MOOD_LABELS: Record<string, string> = {
  modern:      'Modern',
  luxe:        'Luxe',
  editorial:   'Editorial',
  romantic:    'Romantic',
  classic:     'Classic',
  minimal:     'Minimal',
  destination: 'Destination',
  bold:        'Bold',
  photo:       'Photo-first',
  floral:      'Floral',
  garden:      'Garden',
};

export const Product: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const [activeTab, setActiveTab] = useState<string>('guests');
  const [rsvpStep, setRsvpStep] = useState<number>(1);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [previewTheme, setPreviewTheme] = useState<string | null>(null);

  const templates = getAllTemplatePacks();

  const showToast = (message: string) => {
    const t: ToastMsg = { id: Date.now(), message };
    setToasts(prev => [...prev, t]);
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== t.id)), 2500);
  };

  useEffect(() => {
    return () => {
      const root = document.documentElement;
      ['--color-primary','--color-primary-hover','--color-primary-light',
       '--color-accent','--color-accent-hover','--color-accent-light',
       '--color-secondary','--color-background','--color-surface',
       '--color-surface-subtle','--color-border','--color-text-primary','--color-text-secondary',
      ].forEach(p => root.style.removeProperty(p));
    };
  }, []);

  const handlePreviewTheme = (themeId: string) => {
    const preset = THEME_PRESETS[themeId];
    if (!preset) return;
    applyThemeTokens(preset.tokens);
    setPreviewTheme(themeId);
    showToast(`Previewing "${preset.name}" palette`);
  };

  const handleResetTheme = () => {
    const root = document.documentElement;
    ['--color-primary','--color-primary-hover','--color-primary-light',
     '--color-accent','--color-accent-hover','--color-accent-light',
     '--color-secondary','--color-background','--color-surface',
     '--color-surface-subtle','--color-border','--color-text-primary','--color-text-secondary',
    ].forEach(p => root.style.removeProperty(p));
    setPreviewTheme(null);
    showToast('Reset to default palette');
  };

  const pains = [
    { icon: Users,         title: 'Household mapping errors',           desc: 'Group guests properly from day one — no duplicate names, no confusion about who is who.' },
    { icon: UserPlus,      title: 'Plus-one logic breaks',              desc: 'Control exactly who can bring a date: named, unnamed, or none. Enforced server-side.' },
    { icon: Lock,          title: 'Multi-event permission leakage',     desc: 'Ceremony-only guests never see reception details. Separate access controls per event.' },
    { icon: Clock,         title: 'RSVP deadline ambiguity',            desc: 'Clear cutoffs with per-timezone display. Late submissions blocked with a friendly message.' },
    { icon: AlertTriangle, title: 'Duplicate guest submissions',        desc: 'Token-gated RSVP prevents accidental double responses. One token, one guest, one record.' },
    { icon: Shield,        title: 'Privacy/indexing accidentally public',desc: 'Private by default, with noindex control and invite-only mode built in — not bolted on.' },
    { icon: Bell,          title: 'SMS/email consent gaps',             desc: 'Built-in CAN-SPAM compliance. Guests must opt in before any messaging campaign.' },
    { icon: Globe,         title: 'Timezone/DST mistakes',              desc: 'Smart time handling across locations. Times are stored UTC and displayed in the guest\'s zone.' },
    { icon: DollarSign,    title: 'Registry link rot',                  desc: 'URL-based registry that works with any store. You maintain the links; we just display them cleanly.' },
    { icon: Camera,        title: 'Photo upload app friction',          desc: 'Guests upload photos from a browser link. No app download, no account required.' },
    { icon: FileText,      title: 'CSV import column mapping nightmares',desc: 'Intelligent column detection auto-maps "First Name", "fname", "FIRST_NAME" — and more.' },
    { icon: AlertTriangle, title: 'Account recovery close to wedding week',desc: 'Multiple recovery options. Email-based, plus contact support with identity verification.' },
  ];

  const themePreviews = [
    { id: 'elegant',   label: 'Modern Luxe',       desc: 'Near-black, warm whites, brushed gold' },
    { id: 'romantic',  label: 'Romantic Blush',     desc: 'Dusty rose, warm ivory, champagne gold' },
    { id: 'classic',   label: 'Timeless Navy',      desc: 'Deep navy, heirloom ivory, gilded gold' },
    { id: 'garden',    label: 'Botanical Garden',   desc: 'Herb sage, soft ivory, terracotta warmth' },
    { id: 'ocean',     label: 'Coastal Escape',     desc: 'Deep sea teal, crisp white, driftwood amber' },
    { id: 'editorial', label: 'Editorial Dark',     desc: 'Warm charcoal, off-white parchment, bronze' },
    { id: 'sunset',    label: 'Desert Sunset',      desc: 'Burnt sienna, warm cream, dusty mauve' },
    { id: 'linen',     label: 'Fresh Linen',        desc: 'Natural linen, clean white, slate blue' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background text-text-primary">
      <Header />

      {toasts.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {toasts.map(t => (
            <div key={t.id} className="bg-surface border border-border shadow-lg rounded-lg px-4 py-3 text-sm text-text-primary min-w-[260px] animate-fade-in">
              {t.message}
            </div>
          ))}
        </div>
      )}

      {/* HERO */}
      <section className="section-shell md:py-24 bg-gradient-to-b from-background to-surface">
        <div className="container-custom">
          <div className="text-center max-w-4xl mx-auto">
            <Badge variant="primary" className="mb-4">Complete Product Tour</Badge>
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-text-primary mb-6 leading-tight">
              Everything your wedding site needs,<br className="hidden md:block" />
              <span className="text-primary"> built right</span>
            </h1>
            <p className="text-lg md:text-xl text-text-secondary mb-10 max-w-3xl mx-auto leading-relaxed">
              Explore every feature, demo the RSVP flow, browse real templates, and see how DayOf engineers around the common failure modes of wedding sites.
            </p>
            <div className="flex flex-col sm:flex-row sm:flex-wrap justify-center gap-3 sm:gap-4">
              <Link to="/signup" className="w-full sm:w-auto">
                <Button variant="primary" size="lg" fullWidth>
                  Start free — $49 flat
                </Button>
              </Link>
              <a href="#templates" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" fullWidth>
                  Browse templates
                </Button>
              </a>
            </div>
            <p className="mt-4 text-sm text-text-tertiary">2-year access · No subscription · Private by default</p>
          </div>
        </div>
      </section>

      {/* PAIN → FIX CAROUSEL */}
      <section id="engineering" className="section-shell bg-surface-subtle">
        <div className="container-custom">
          <div className="section-intro">
            <h2 className="section-title mb-4 text-text-primary">
              Wedding sites fail in <span className="text-primary">predictable ways</span>
            </h2>
            <p className="text-text-secondary text-lg max-w-2xl mx-auto">We catalogued 12 common failure modes and built explicit fixes for each one.</p>
          </div>

          <div className="relative">
            <div className="overflow-hidden px-12">
              <div
                className="flex transition-transform duration-500 ease-in-out gap-6"
                style={{ transform: `translateX(-${carouselIndex * (100 / 3)}%)` }}
              >
                {pains.map((item, idx) => (
                  <div key={idx} className="flex-shrink-0 w-full md:w-1/2 lg:w-1/3 px-3">
                    <Card variant="bordered" padding="md" className="h-full bg-surface">
                      <div className="flex flex-col gap-3">
                        <div className="p-3 bg-primary-light rounded-lg w-fit">
                          <item.icon className="w-5 h-5 text-primary" />
                        </div>
                        <h3 className="text-base font-semibold text-text-primary leading-snug">{item.title}</h3>
                        <p className="text-sm text-text-secondary leading-relaxed">{item.desc}</p>
                      </div>
                    </Card>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setCarouselIndex(p => (p === 0 ? pains.length - 1 : p - 1))}
              className="absolute left-0 top-1/2 -translate-y-1/2 p-3 bg-surface border-2 border-primary text-primary rounded-full hover:bg-primary hover:text-white transition-colors shadow-lg"
              aria-label="Previous"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCarouselIndex(p => (p === pains.length - 1 ? 0 : p + 1))}
              className="absolute right-0 top-1/2 -translate-y-1/2 p-3 bg-surface border-2 border-primary text-primary rounded-full hover:bg-primary hover:text-white transition-colors shadow-lg"
              aria-label="Next"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <div className="flex justify-center gap-2 mt-8">
              {pains.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCarouselIndex(idx)}
                  className={`h-2 rounded-full transition-all ${idx === carouselIndex ? 'bg-primary w-8' : 'bg-primary/30 w-2 hover:bg-primary/50'}`}
                  aria-label={`Slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FEATURE TABS */}
      <section id="features" className="section-shell bg-background">
        <div className="container-custom">
          <div className="section-intro">
            <h2 className="section-title mb-4 text-text-primary">
              Every feature built for <span className="text-accent">trust and correctness</span>
            </h2>
            <p className="section-subtitle max-w-2xl mx-auto">No fluff. Every module is designed around the real logistics of coordinating 50–300 guests.</p>
          </div>

          <div className="mb-8 flex flex-wrap gap-2 justify-center">
            {[
              { id: 'guests',    label: 'Guests + Households' },
              { id: 'rsvp',      label: 'RSVP Engine' },
              { id: 'messaging', label: 'Messaging' },
              { id: 'travel',    label: 'Travel + Itinerary' },
              { id: 'registry',  label: 'Registry' },
              { id: 'seating',   label: 'Seating + Check-in' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-2.5 rounded-full font-medium transition-all text-sm ${
                  activeTab === tab.id
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-surface border border-border text-text-secondary hover:text-text-primary hover:border-primary/40'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <div className="space-y-4">
              {activeTab === 'guests' && (
                <>
                  <h3 className="text-2xl font-bold text-text-primary">Guests + Households</h3>
                  <p className="text-text-secondary">Full guest list management with intelligent grouping, permissions, and import/export.</p>
                  <ul className="space-y-3">
                    {[
                      'Import CSV with intelligent column auto-mapping',
                      'Group guests into households — merge, split, reassign',
                      'Household logic handles couples/families cleanly (one RSVP link, per-person meal + attendance)',
                      'Manage plus-ones per guest with explicit named/unnamed rules',
                      'Track dietary restrictions and meal preferences',
                      'Tag guests by event: ceremony-only, reception, or all events',
                      'Export headcount and dietary reports for vendors',
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                        <span className="text-text-secondary">{item}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="rounded-xl border border-border bg-surface-subtle p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-text-tertiary mb-2">How household logic works</p>
                    <p className="text-sm text-text-secondary leading-relaxed">One invite can represent a household, but each person keeps their own RSVP status, meal choice, and event permissions. You get fewer invite mistakes without losing per-guest accuracy.</p>
                  </div>
                  <Link to="/features/guests"><Button variant="primary">Full guest management docs <ChevronRight className="w-4 h-4 ml-1" /></Button></Link>
                </>
              )}

              {activeTab === 'rsvp' && (
                <>
                  <h3 className="text-2xl font-bold text-text-primary">RSVP Engine</h3>
                  <p className="text-text-secondary">Tokenized, secure, household-aware RSVP with production-ready core flows. Advanced automations are rolling out incrementally.</p>
                  <ul className="space-y-3">
                    {[
                      'Per-guest cryptographic invite tokens — no name-search guessing',
                      'Multi-event permissions with separate attendance tracking',
                      'Meal selection + dietary note collection per guest',
                      'Plus-one acceptance with mandatory name capture',
                      'RSVP deadline enforcement with configurable late override',
                      'RSVP confirmation pipeline (advanced email automation in rollout)',
                      'Rate-limited and honeypot-protected submission endpoint',
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                        <span className="text-text-secondary">{item}</span>
                      </li>
                    ))}
                  </ul>
                  <Link to="/features/rsvp"><Button variant="primary">Full RSVP docs <ChevronRight className="w-4 h-4 ml-1" /></Button></Link>
                </>
              )}

              {activeTab === 'messaging' && (
                <>
                  <h3 className="text-2xl font-bold text-text-primary">Messaging</h3>
                  <p className="text-text-secondary">Compose, segment, and schedule emails to your guest list directly from the dashboard.</p>
                  <ul className="space-y-3">
                    {[
                      'Email compose with audience segmentation',
                      'Segment by: attending, not responded, declined, or event',
                      'Schedule messages with timezone-aware delivery',
                      'Send personalized wedding invitations with RSVP links',
                      'Save drafts and preview before sending',
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                        <span className="text-text-secondary">{item}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-sm text-text-tertiary">SMS by segment — coming soon</p>
                  <Link to="/features/messaging"><Button variant="primary">Full messaging docs <ChevronRight className="w-4 h-4 ml-1" /></Button></Link>
                </>
              )}

              {activeTab === 'travel' && (
                <>
                  <h3 className="text-2xl font-bold text-text-primary">Travel + Itinerary</h3>
                  <p className="text-text-secondary">Multi-day itinerary, venue logistics, and accommodation blocks — all on your site.</p>
                  <ul className="space-y-3">
                    {[
                      'Multi-day itinerary timeline with event-level detail',
                      'Venue addresses displayed with embedded maps',
                      'Transportation and logistics notes per event',
                      'Travel FAQs published directly to your site',
                      'Hotel block information with booking codes',
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                        <span className="text-text-secondary">{item}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-sm text-text-tertiary">Add-to-calendar ICS · Timezone-aware event times</p>
                  <Link to="/features/travel"><Button variant="primary">Full travel docs <ChevronRight className="w-4 h-4 ml-1" /></Button></Link>
                </>
              )}

              {activeTab === 'registry' && (
                <>
                  <h3 className="text-2xl font-bold text-text-primary">Registry</h3>
                  <p className="text-text-secondary">Link any store. No platform lock-in, no affiliate interference.</p>
                  <ul className="space-y-3">
                    {[
                      'Universal URL — link Amazon, Target, Crate & Barrel, any store',
                      'BYOAL: bring your own affiliate links, we never override them',
                      'Auto-fetch item metadata: title, price, image from URL',
                      'Purchase tracking with quantity and partial-purchased status',
                      'Honeymoon fund and charity donation links',
                      'Clean display with zero sponsored clutter',
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                        <span className="text-text-secondary">{item}</span>
                      </li>
                    ))}
                  </ul>
                  <Link to="/features/registry"><Button variant="primary">Full registry docs <ChevronRight className="w-4 h-4 ml-1" /></Button></Link>
                </>
              )}

              {activeTab === 'seating' && (
                <>
                  <h3 className="text-2xl font-bold text-text-primary">Seating + Check-in</h3>
                  <p className="text-text-secondary">This module is in active development. Here's what's coming:</p>
                  <ul className="space-y-3">
                    {[
                      'Visual seating chart builder with drag-and-drop',
                      'Assign entire households to tables in one action',
                      'Export seating for caterer and venue (CSV/PDF)',
                      'Day-of check-in mode with arrival tracking',
                      'Meal headcount export by table and event',
                    ].map((item, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <Clock className="w-5 h-5 text-text-tertiary mt-0.5 flex-shrink-0" />
                        <span className="text-text-secondary">{item}</span>
                      </li>
                    ))}
                  </ul>
                  <Badge variant="secondary">In development</Badge>
                  <Link to="/features/seating" className="block mt-3"><Button variant="outline">Preview plans <ChevronRight className="w-4 h-4 ml-1" /></Button></Link>
                </>
              )}
            </div>

            <div className="hidden lg:block">
              <div className="bg-surface border border-border rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-surface-subtle border-b border-border px-4 py-3 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-error/40" />
                  <div className="w-3 h-3 rounded-full bg-warning/40" />
                  <div className="w-3 h-3 rounded-full bg-success/40" />
                  <span className="text-xs text-text-tertiary ml-2">DayOf Dashboard</span>
                </div>
                <div className="p-6 space-y-3">
                  {activeTab === 'guests' && (
                    <>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-semibold text-text-primary">Guest List</span>
                        <Badge variant="success">148 invited</Badge>
                      </div>
                      {[
                        { name: 'The Smith Household', guests: '2 guests', status: 'Confirmed', color: 'text-success' },
                        { name: 'The Johnson Family', guests: '4 guests', status: 'Confirmed', color: 'text-success' },
                        { name: 'Michael & Sarah Davis', guests: '2 guests', status: 'Pending', color: 'text-warning' },
                        { name: 'Emma Chen', guests: '1 + 1', status: 'Declined', color: 'text-error' },
                        { name: 'Robert & Lisa Park', guests: '2 guests', status: 'Pending', color: 'text-warning' },
                      ].map((row, i) => (
                        <div key={i} className="flex items-center justify-between py-2 border-b border-border-subtle last:border-0">
                          <div>
                            <p className="text-sm font-medium text-text-primary">{row.name}</p>
                            <p className="text-xs text-text-tertiary">{row.guests}</p>
                          </div>
                          <span className={`text-xs font-medium ${row.color}`}>{row.status}</span>
                        </div>
                      ))}
                    </>
                  )}
                  {activeTab === 'rsvp' && (
                    <>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-semibold text-text-primary">RSVP Overview</span>
                        <Badge variant="primary">Deadline: Jun 15</Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        {[
                          { label: 'Attending', count: '94', color: 'bg-success/10 text-success border-success/20' },
                          { label: 'Declined', count: '12', color: 'bg-error/10 text-error border-error/20' },
                          { label: 'Pending', count: '42', color: 'bg-warning/10 text-warning border-warning/20' },
                        ].map(s => (
                          <div key={s.label} className={`p-3 rounded-xl border text-center ${s.color}`}>
                            <p className="text-xl font-bold">{s.count}</p>
                            <p className="text-xs mt-0.5">{s.label}</p>
                          </div>
                        ))}
                      </div>
                      <div className="bg-surface-subtle rounded-lg p-3">
                        <p className="text-xs font-medium text-text-primary mb-2">Recent responses</p>
                        {['Sarah M. — Attending', 'The Chen Family — Attending (4)', 'Marcus R. — Declined'].map((r, i) => (
                          <p key={i} className="text-xs text-text-secondary py-1 border-b border-border-subtle last:border-0">{r}</p>
                        ))}
                      </div>
                    </>
                  )}
                  {activeTab === 'messaging' && (
                    <>
                      <div className="mb-4">
                        <span className="text-sm font-semibold text-text-primary">New Message</span>
                      </div>
                      <div className="space-y-3">
                        <div className="bg-surface-subtle rounded-lg px-3 py-2">
                          <p className="text-xs text-text-tertiary mb-1">To</p>
                          <p className="text-sm text-text-primary">Pending RSVPs (42 guests)</p>
                        </div>
                        <div className="bg-surface-subtle rounded-lg px-3 py-2">
                          <p className="text-xs text-text-tertiary mb-1">Subject</p>
                          <p className="text-sm text-text-primary">Friendly RSVP reminder — June 15 deadline</p>
                        </div>
                        <div className="bg-surface-subtle rounded-lg px-3 py-8 flex items-center justify-center">
                          <p className="text-xs text-text-tertiary">Message body...</p>
                        </div>
                        <Button variant="primary" size="sm">Schedule send</Button>
                      </div>
                    </>
                  )}
                  {(activeTab === 'travel' || activeTab === 'registry' || activeTab === 'seating') && (
                    <div className="py-8 text-center">
                      <Layers className="w-12 h-12 text-primary/30 mx-auto mb-3" />
                      <p className="text-sm text-text-secondary">Live preview available in the builder</p>
                      <Link to="/signup" className="inline-block mt-3">
                        <Button variant="primary" size="sm">Try it free</Button>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FULL FEATURE LIST */}
      <section id="full-features" className="section-shell bg-surface-subtle">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="section-title mb-4 text-text-primary">
              Full feature breakdown
            </h2>
            <p className="section-subtitle max-w-3xl mx-auto">
              A full-stack wedding platform built around RSVP correctness, privacy-first defaults, and calm logistics.
            </p>
            <div className="flex items-center justify-center gap-6 mt-5">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-success" />
                <span className="text-sm text-text-secondary">Included</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-text-tertiary/40" />
                <span className="text-sm text-text-secondary">Coming soon</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card variant="bordered" padding="lg" className="bg-surface">
              <h3 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" /> Guests + Households
              </h3>
              <ul className="space-y-3">
                {[
                  { icon: Users,         label: 'Household grouping, merging, splitting',       done: true },
                  { icon: UserPlus,      label: 'Plus-one rules (named/unnamed)',                done: true },
                  { icon: Lock,          label: 'Per-event invitation permissions',              done: true },
                  { icon: AlertTriangle, label: 'Duplicate guest detection',                    done: true },
                  { icon: Upload,        label: 'CSV import with auto column mapping',           done: true },
                  { icon: Download,      label: 'Export for vendor/caterer',                    done: true },
                  { icon: FileText,      label: 'Audit trail',                                  done: false },
                ].map((f, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <f.icon className={`w-4 h-4 flex-shrink-0 ${f.done ? 'text-success' : 'text-text-tertiary/50'}`} />
                    <span className={`text-sm ${f.done ? 'text-text-secondary' : 'text-text-tertiary'}`}>{f.label}</span>
                    {!f.done && <Badge variant="secondary" className="text-xs ml-auto">Soon</Badge>}
                  </li>
                ))}
              </ul>
            </Card>

            <Card variant="bordered" padding="lg" className="bg-surface">
              <h3 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-primary" /> RSVP Engine
              </h3>
              <ul className="space-y-3">
                {[
                  { icon: Lock,          label: 'Cryptographic per-guest invite tokens',        done: true },
                  { icon: CheckCircle2,  label: 'Multi-event RSVP with separate permissions',   done: true },
                  { icon: Utensils,      label: 'Meal choices + dietary/allergen notes',         done: true },
                  { icon: MessageSquare, label: 'Custom RSVP questions',                         done: true },
                  { icon: Mail,          label: 'Confirmation email automation',                  done: true },
                  { icon: Clock,         label: 'RSVP deadline enforcement',                    done: true },
                  { icon: Shield,        label: 'Rate limiting + honeypot spam protection',     done: true },
                ].map((f, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <f.icon className={`w-4 h-4 flex-shrink-0 ${f.done ? 'text-success' : 'text-text-tertiary/50'}`} />
                    <span className={`text-sm ${f.done ? 'text-text-secondary' : 'text-text-tertiary'}`}>{f.label}</span>
                    {!f.done && <Badge variant="secondary" className="text-xs ml-auto">Soon</Badge>}
                  </li>
                ))}
              </ul>
            </Card>

            <Card variant="bordered" padding="lg" className="bg-surface">
              <h3 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
                <Send className="w-5 h-5 text-primary" /> Messaging
              </h3>
              <ul className="space-y-3">
                {[
                  { icon: Send,          label: 'Email compose + audience segmentation',         done: true },
                  { icon: Users,         label: 'Segment by RSVP status, event, household',      done: true },
                  { icon: Clock,         label: 'Scheduled sends + draft saving',                done: true },
                  { icon: Mail,          label: 'Personalized invitations with RSVP link',        done: true },
                  { icon: MessageSquare, label: 'SMS by segment',                               done: false },
                  { icon: BarChart3,     label: 'Open/click tracking',                           done: false },
                ].map((f, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <f.icon className={`w-4 h-4 flex-shrink-0 ${f.done ? 'text-success' : 'text-text-tertiary/50'}`} />
                    <span className={`text-sm ${f.done ? 'text-text-secondary' : 'text-text-tertiary'}`}>{f.label}</span>
                    {!f.done && <Badge variant="secondary" className="text-xs ml-auto">Soon</Badge>}
                  </li>
                ))}
              </ul>
            </Card>

            <Card variant="bordered" padding="lg" className="bg-surface">
              <h3 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
                <Map className="w-5 h-5 text-primary" /> Travel + Itinerary
              </h3>
              <ul className="space-y-3">
                {[
                  { icon: Calendar,  label: 'Multi-day itinerary timeline',                  done: true },
                  { icon: Map,       label: 'Venue addresses with embedded maps',             done: true },
                  { icon: Hotel,     label: 'Hotel block info with booking codes',            done: true },
                  { icon: Globe,     label: 'Transportation and logistics notes',             done: true },
                  { icon: Download,  label: 'Add-to-calendar ICS generation',                done: true },
                  { icon: Globe,     label: 'Timezone/DST-safe display',                     done: true },
                ].map((f, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <f.icon className={`w-4 h-4 flex-shrink-0 ${f.done ? 'text-success' : 'text-text-tertiary/50'}`} />
                    <span className={`text-sm ${f.done ? 'text-text-secondary' : 'text-text-tertiary'}`}>{f.label}</span>
                    {!f.done && <Badge variant="secondary" className="text-xs ml-auto">Soon</Badge>}
                  </li>
                ))}
              </ul>
            </Card>

            <Card variant="bordered" padding="lg" className="bg-surface">
              <h3 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-primary" /> Registry
              </h3>
              <ul className="space-y-3">
                {[
                  { icon: Wallet,       label: 'Universal URL — any store, no lock-in',          done: true },
                  { icon: Zap,          label: 'Auto-fetch title, price, image from URL',         done: true },
                  { icon: CheckCircle2, label: 'Purchase tracking with quantity + partial status', done: true },
                  { icon: Heart,        label: 'Honeymoon fund + charity donation links',          done: true },
                  { icon: DollarSign,   label: 'Cash fund (Venmo, PayPal, Zelle links)',          done: false },
                ].map((f, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <f.icon className={`w-4 h-4 flex-shrink-0 ${f.done ? 'text-success' : 'text-text-tertiary/50'}`} />
                    <span className={`text-sm ${f.done ? 'text-text-secondary' : 'text-text-tertiary'}`}>{f.label}</span>
                    {!f.done && <Badge variant="secondary" className="text-xs ml-auto">Soon</Badge>}
                  </li>
                ))}
              </ul>
            </Card>

            <Card variant="bordered" padding="lg" className="bg-surface">
              <h3 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-text-tertiary" /> Seating + Check-in
                <Badge variant="secondary" className="text-xs ml-1">In development</Badge>
              </h3>
              <ul className="space-y-3">
                {[
                  'Visual seating chart builder with drag-and-drop',
                  'Household-aware table assignment (assign whole family at once)',
                  'Caterer export: CSV, Excel, PDF',
                  'Day-of check-in mode with arrival tracking',
                  'Meal headcount by table',
                ].map((f, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <Clock className="w-4 h-4 flex-shrink-0 text-text-tertiary/50" />
                    <span className="text-sm text-text-tertiary">{f}</span>
                    <Badge variant="secondary" className="text-xs ml-auto">Soon</Badge>
                  </li>
                ))}
              </ul>
            </Card>

            <Card variant="bordered" padding="lg" className="bg-surface lg:col-span-2">
              <h3 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" /> Privacy + Security
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                {[
                  { icon: Lock,    label: 'Private by default — not opt-in',          done: true },
                  { icon: Shield,  label: 'Auto-renew off by default',                done: true },
                  { icon: Globe,   label: 'Noindex / hide from search engines',        done: true },
                  { icon: Lock,    label: 'Password-protected site mode',              done: true },
                  { icon: Users,   label: 'Invite-only site with token-gated access',  done: true },
                  { icon: DollarSign, label: 'Clear pricing, no hidden fees',          done: true },
                  { icon: Bell,    label: 'CAN-SPAM compliant messaging consent',      done: true },
                ].map((f, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <f.icon className={`w-4 h-4 flex-shrink-0 ${f.done ? 'text-success' : 'text-text-tertiary/50'}`} />
                    <span className={`text-sm ${f.done ? 'text-text-secondary' : 'text-text-tertiary'}`}>{f.label}</span>
                    {!f.done && <Badge variant="secondary" className="text-xs ml-auto">Soon</Badge>}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* RSVP DEMO */}
      <section id="rsvp-demo" className="section-shell bg-background">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="section-title mb-4 text-text-primary">
              See how <span className="text-primary">RSVP actually works</span>
            </h2>
            <p className="section-subtitle">
              Multi-step, household-aware, with clear validation at each stage.
            </p>
          </div>

          <div className="max-w-lg mx-auto">
            <Card variant="bordered" padding="lg" className="bg-surface">
              <div className="flex items-center justify-between mb-6">
                {[1, 2, 3, 4].map(step => (
                  <div key={step} className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm transition-colors ${
                      step === rsvpStep ? 'bg-primary text-white' : step < rsvpStep ? 'bg-success text-white' : 'bg-surface-subtle text-text-tertiary border border-border'
                    }`}>
                      {step < rsvpStep ? <Check className="w-4 h-4" /> : step}
                    </div>
                    {step < 4 && <div className={`w-10 h-0.5 mx-2 transition-colors ${step < rsvpStep ? 'bg-success' : 'bg-border'}`} />}
                  </div>
                ))}
              </div>

              {rsvpStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary">Step 1: Household</h3>
                    <p className="text-sm text-text-secondary mt-1">Who from your household is attending?</p>
                  </div>
                  <div className="space-y-2">
                    {['Alex Smith', 'Jordan Smith'].map(name => (
                      <label key={name} className="flex items-center gap-3 p-3 border border-border rounded-xl cursor-pointer hover:border-primary/40 transition-colors">
                        <input type="checkbox" className="w-4 h-4 rounded text-primary" defaultChecked />
                        <span className="text-text-primary text-sm">{name}</span>
                      </label>
                    ))}
                  </div>
                  <Button variant="primary" fullWidth onClick={() => setRsvpStep(2)}>Continue</Button>
                </div>
              )}

              {rsvpStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary">Step 2: Events</h3>
                    <p className="text-sm text-text-secondary mt-1">Which events will you attend?</p>
                  </div>
                  <div className="space-y-2">
                    {['Welcome Reception — Fri, 6 pm', 'Wedding Ceremony — Sat, 3 pm', 'Reception Dinner — Sat, 6 pm'].map(event => (
                      <label key={event} className="flex items-center gap-3 p-3 border border-border rounded-xl cursor-pointer hover:border-primary/40 transition-colors">
                        <input type="checkbox" className="w-4 h-4 rounded text-primary" defaultChecked />
                        <span className="text-text-primary text-sm">{event}</span>
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" fullWidth onClick={() => setRsvpStep(1)}>Back</Button>
                    <Button variant="primary" fullWidth onClick={() => setRsvpStep(3)}>Continue</Button>
                  </div>
                </div>
              )}

              {rsvpStep === 3 && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary">Step 3: Meal + Dietary</h3>
                    <p className="text-sm text-text-secondary mt-1">Meal preferences for dinner reception:</p>
                  </div>
                  <div className="space-y-4">
                    {['Alex Smith', 'Jordan Smith'].map(name => (
                      <div key={name}>
                        <label className="block text-sm font-medium text-text-primary mb-1.5">{name}</label>
                        <select className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                          <option>Chicken</option>
                          <option>Beef</option>
                          <option>Vegetarian</option>
                        </select>
                      </div>
                    ))}
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-1.5">Dietary restrictions (optional)</label>
                      <textarea className="w-full px-3 py-2 border border-border rounded-lg bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" rows={2} placeholder="Any allergies or dietary needs..." />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" fullWidth onClick={() => setRsvpStep(2)}>Back</Button>
                    <Button variant="primary" fullWidth onClick={() => setRsvpStep(4)}>Continue</Button>
                  </div>
                </div>
              )}

              {rsvpStep === 4 && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary">Step 4: Confirm</h3>
                    <p className="text-sm text-text-secondary mt-1">Review your details before submitting.</p>
                  </div>
                  <div className="bg-surface-subtle border border-border rounded-xl p-4 space-y-2">
                    <p className="text-sm text-text-secondary"><span className="font-medium text-text-primary">Attending:</span> Alex Smith, Jordan Smith</p>
                    <p className="text-sm text-text-secondary"><span className="font-medium text-text-primary">Events:</span> All 3 events</p>
                    <p className="text-sm text-text-secondary"><span className="font-medium text-text-primary">Meals:</span> 2 × Chicken</p>
                  </div>
                  <p className="text-xs text-text-tertiary">A confirmation email will be sent automatically after submission.</p>
                  <div className="flex gap-2">
                    <Button variant="outline" fullWidth onClick={() => setRsvpStep(3)}>Back</Button>
                    <Button variant="accent" fullWidth onClick={() => { showToast('RSVP submitted! Confirmation email queued.'); setRsvpStep(1); }}>
                      Submit RSVP
                    </Button>
                  </div>
                </div>
              )}
            </Card>
            <p className="text-center text-xs text-text-tertiary mt-3">This is an interactive demo — no data is saved</p>
          </div>
        </div>
      </section>

      {/* TEMPLATE GALLERY — real data */}
      <section id="templates" className="section-shell bg-surface-subtle">
        <div className="container-custom">
          <div className="section-intro">
            <h2 className="section-title mb-3 text-text-primary">
              {templates.length} professionally designed templates
            </h2>
            <p className="section-subtitle max-w-2xl mx-auto">
              Every template ships with a curated color theme, typography pairing, and section layout — all fully customizable in the builder.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mb-10">
            {templates.map((tmpl, index) => {
              const theme = TEMPLATE_THEMES[tmpl.id] ?? TEMPLATE_THEMES['modern-luxe'];
              return (
                <Card key={tmpl.id} variant="bordered" padding="none" className="overflow-hidden bg-surface group border-border-subtle hover:border-primary/30 hover:shadow-lg transition-all hover:-translate-y-0.5 h-full">
                  {/* Rich website mockup preview */}
                  <div className="aspect-[3/4] relative overflow-hidden" style={{ background: `linear-gradient(180deg, ${theme.bg} 0%, #ffffff 100%)` }}>
                    <img
                      src={tmpl.previewThumbnailPath}
                      alt={`${tmpl.displayName} preview`}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover opacity-20 scale-105 group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-white/10 to-white/25" />
                    {/* Browser chrome */}
                    <div className="flex items-center gap-1 px-2 py-1.5 border-b" style={{ backgroundColor: theme.dark, borderColor: theme.dark }}>
                      <div className="w-1.5 h-1.5 rounded-full opacity-50" style={{ backgroundColor: theme.accent }} />
                      <div className="w-1.5 h-1.5 rounded-full opacity-30" style={{ backgroundColor: theme.accent }} />
                      <div className="w-1.5 h-1.5 rounded-full opacity-20" style={{ backgroundColor: theme.accent }} />
                      <div className="flex-1 mx-2 h-1.5 rounded-full opacity-20" style={{ backgroundColor: theme.accent }} />
                    </div>

                    {/* Nav bar */}
                    <div className="flex items-center justify-between px-3 py-1.5 border-b" style={{ backgroundColor: theme.bg, borderColor: `${theme.dark}15` }}>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.accent }} />
                        <div className="h-1.5 rounded-full w-10" style={{ backgroundColor: theme.dark, opacity: 0.7 }} />
                      </div>
                      <div className="flex gap-2">
                        {[14, 12, 16, 10].map((w, i) => (
                          <div key={i} className="h-1 rounded-full" style={{ backgroundColor: theme.dark, opacity: 0.3, width: `${w}px` }} />
                        ))}
                      </div>
                    </div>

                    {/* Hero section */}
                    {theme.heroStyle === 'centered' && (
                      <div className="px-4 py-5 flex flex-col items-center gap-2 border-b" style={{ backgroundColor: theme.dark, borderColor: `${theme.accent}30` }}>
                        <div className="h-1 rounded-full opacity-40 w-8" style={{ backgroundColor: theme.accent }} />
                        <div className="h-3 rounded font-bold w-24 opacity-90" style={{ backgroundColor: theme.accent }} />
                        <div className="h-1.5 rounded w-16 opacity-50" style={{ backgroundColor: theme.bg }} />
                        <div className="h-1 rounded w-20 opacity-30" style={{ backgroundColor: theme.bg }} />
                        <div className="mt-1 px-3 py-1 rounded" style={{ backgroundColor: theme.accent }}>
                          <div className="h-1.5 w-8 rounded" style={{ backgroundColor: theme.dark }} />
                        </div>
                      </div>
                    )}
                    {theme.heroStyle === 'split' && (
                      <div className="flex border-b" style={{ borderColor: `${theme.accent}20` }}>
                        <div className="flex-1 px-3 py-4 flex flex-col gap-2 justify-center" style={{ backgroundColor: theme.bg }}>
                          <div className="h-1 rounded w-8 opacity-40" style={{ backgroundColor: theme.accent }} />
                          <div className="h-2.5 rounded w-16 opacity-80" style={{ backgroundColor: theme.dark }} />
                          <div className="h-1 rounded w-14 opacity-40" style={{ backgroundColor: theme.dark }} />
                          <div className="h-1 rounded w-12 opacity-30" style={{ backgroundColor: theme.dark }} />
                          <div className="mt-1 px-2 py-1 rounded w-fit" style={{ backgroundColor: theme.accent }}>
                            <div className="h-1.5 w-6 rounded" style={{ backgroundColor: theme.bg }} />
                          </div>
                        </div>
                        <div className="flex-1" style={{ backgroundColor: `${theme.dark}25` }}>
                          <div className="h-full w-full opacity-40" style={{ background: `linear-gradient(135deg, ${theme.accent}50, ${theme.dark}80)` }} />
                        </div>
                      </div>
                    )}
                    {theme.heroStyle === 'bold' && (
                      <div className="px-3 py-4 border-b" style={{ backgroundColor: theme.dark, borderColor: `${theme.accent}30` }}>
                        <div className="h-5 rounded w-28 mb-1.5 opacity-95" style={{ backgroundColor: theme.bg }} />
                        <div className="h-1.5 rounded w-20 mb-2 opacity-50" style={{ backgroundColor: theme.accent }} />
                        <div className="flex gap-1.5 items-center">
                          <div className="px-2 py-0.5 rounded" style={{ backgroundColor: theme.accent }}>
                            <div className="h-1.5 w-8 rounded" style={{ backgroundColor: theme.dark }} />
                          </div>
                          <div className="h-1 w-12 rounded opacity-30" style={{ backgroundColor: theme.bg }} />
                        </div>
                      </div>
                    )}

                    {/* Content sections */}
                    <div className="px-3 py-2 space-y-3" style={{ backgroundColor: theme.bg }}>
                      {theme.sectionRows.map((row, ri) => (
                        <div key={ri}>
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <div className="h-1 w-1 rounded-full" style={{ backgroundColor: theme.accent }} />
                            <div className="h-1 rounded w-8 opacity-50" style={{ backgroundColor: theme.dark }} />
                          </div>
                          <div className={`flex gap-1.5 ${row.widths.length === 1 ? 'flex-col' : ''}`}>
                            {row.widths.map((w, wi) => (
                              <div
                                key={wi}
                                className="rounded"
                                style={{
                                  backgroundColor: wi === 0 && row.widths.length > 2 ? `${theme.dark}12` : `${theme.dark}08`,
                                  width: row.widths.length === 1 ? `${w}%` : undefined,
                                  flex: row.widths.length > 1 ? w : undefined,
                                  height: row.widths.length === 1 ? '6px' : '28px',
                                  borderLeft: wi === 0 ? `2px solid ${theme.accent}` : undefined,
                                  paddingLeft: wi === 0 ? '4px' : undefined,
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Footer strip */}
                    <div className="absolute bottom-0 left-0 right-0 h-6 flex items-center justify-center gap-3 px-3" style={{ backgroundColor: theme.dark }}>
                      {[20, 14, 18, 12].map((w, i) => (
                        <div key={i} className="h-1 rounded-full opacity-30" style={{ backgroundColor: theme.accent, width: `${w}px` }} />
                      ))}
                    </div>

                    {index < 3 && (
                      <div className="absolute top-7 left-2">
                        <Badge variant="secondary" className="text-[11px]">Editor pick</Badge>
                      </div>
                    )}
                    {tmpl.isNew && (
                      <div className="absolute top-7 right-2">
                        <Badge variant="primary" className="text-[11px]">New</Badge>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4 bg-white/95 flex flex-col h-full">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="text-sm font-semibold text-text-primary">{tmpl.displayName}</h3>
                      <div className="flex gap-1 flex-shrink-0 mt-0.5">
                        {[theme.dark, theme.accent, theme.bg].map((c, i) => (
                          <div key={i} className="w-3 h-3 rounded-full border border-black/10" style={{ backgroundColor: c }} />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-text-tertiary mb-3 line-clamp-3 leading-relaxed min-h-[3.6em]">{tmpl.description}</p>
                    <p className="text-[11px] text-text-tertiary mb-2 uppercase tracking-wide">
                      Best for: {tmpl.moodTags.slice(0, 2).map(tag => TEMPLATE_MOOD_LABELS[tag] ?? tag).join(' · ')} weddings
                    </p>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {tmpl.moodTags.slice(0, 2).map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs capitalize">{TEMPLATE_MOOD_LABELS[tag] ?? tag}</Badge>
                      ))}
                    </div>
                    <div className="text-xs text-text-tertiary mb-4">
                      <span className="font-medium">{tmpl.suggestedFonts.heading}</span> + {tmpl.suggestedFonts.body}
                    </div>
                    <div className="mt-auto" />
                    <Link to="/signup">
                      <Button variant="primary" size="sm" fullWidth>
                        Open in builder
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="text-center">
            <p className="text-text-secondary mb-4">All templates include: drag-and-drop sections · real-time preview · theme customization · RSVP integration</p>
            <Link to="/signup">
              <Button variant="primary" size="lg">
                <Sparkles className="w-5 h-5 mr-2" />
                Start free — $49 flat
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* COLOR PALETTE PREVIEWER — using real theme presets */}
      <section id="colors" className="section-shell bg-background">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="section-title mb-4 text-text-primary">
              {Object.keys(THEME_PRESETS).length} color themes, live preview
            </h2>
            <p className="section-subtitle mb-5 max-w-2xl mx-auto">
              Click any palette to apply it to this page instantly. These are the exact same themes used in the builder.
            </p>
            {previewTheme && (
              <button
                onClick={handleResetTheme}
                className="px-4 py-2 text-sm border border-primary/30 text-primary rounded-lg hover:bg-primary/5 transition-colors"
              >
                Reset to default
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {themePreviews.map(theme => {
              const preset = THEME_PRESETS[theme.id];
              if (!preset) return null;
              const isActive = previewTheme === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => handlePreviewTheme(theme.id)}
                  className={`text-left bg-surface rounded-2xl border-2 transition-all shadow-sm hover:shadow-md p-5 ${
                    isActive ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/40'
                  }`}
                >
                  <div className="flex gap-1.5 mb-3">
                    {[preset.tokens.colorPrimary, preset.tokens.colorAccent, preset.tokens.colorSecondary, preset.tokens.colorBackground].map((c, i) => (
                      <div key={i} className="flex-1 h-10 rounded-lg border border-black/5 shadow-sm" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <p className="font-semibold text-text-primary text-sm">{theme.label}</p>
                  <p className="text-xs text-text-tertiary mt-0.5">{theme.desc}</p>
                  {isActive && (
                    <p className="text-xs text-primary font-medium mt-2 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Applied
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* PRICING CTA */}
      <section className="section-shell bg-surface-subtle">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="section-title mb-4 text-text-primary">Simple pricing. No surprises.</h2>
            <p className="section-subtitle mb-8">One flat fee, 2 years of access, everything included. Auto-renew is off by default.</p>
            <div className="bg-surface border-2 border-primary/20 rounded-2xl p-8 md:p-10 shadow-sm">
              <div className="flex flex-col items-center gap-2 mb-6">
                <span className="text-5xl font-bold text-text-primary">$49</span>
                <span className="text-text-secondary">flat fee · 2 years access</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8 text-left">
                {[
                  'Unlimited guests',
                  'All templates included',
                  'RSVP engine + email confirmations',
                  'Guest messaging',
                  'Registry module',
                  'Travel + itinerary pages',
                  'Privacy modes (public, password, invite-only)',
                  'Custom site URL',
                  'Photo vault for guests',
                  'Priority support',
                ].map((f, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                    <span className="text-sm text-text-secondary">{f}</span>
                  </div>
                ))}
              </div>
              <Link to="/signup">
                <Button variant="primary" size="lg" fullWidth>
                  Start free — $49 flat
                </Button>
              </Link>
              <p className="text-xs text-text-tertiary mt-4">
                Auto-renew is <strong>off</strong> by default. Your site stays live for 2 years from purchase. Annual billing available if you prefer.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

function BarChart3({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>
    </svg>
  );
}
