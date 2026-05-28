import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Calendar,
  Camera,
  CheckCircle2,
  Heart,
  Mail,
  Radio,
  Shield,
  Users,
} from 'lucide-react';
import { Footer, Header } from '../components/layout';
import { HeroReveal, Reveal } from '../components/marketing/Reveal';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../hooks/useAuth';
import { SITE_TRUST_COPY } from '../lib/siteTrustCopy';
import { DEMO_MODE } from '../config/env';

const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`;

const heroImage = asset('photos/engagement/e10732d6-f5d7-4118-8db5-4f28f0a165f7.jpg');
const detailImage = asset('photos/engagement/053d97ba-331e-4d85-93f9-7986e70e2874.jpg');

const heroStats = [
  ['Site', 'Templates, travel, registry, and RSVP in one public home.'],
  ['Guests', 'Households, messages, meals, seating, and check-in stay connected.'],
  ['After', 'Photos, guestbook, vault, recap, and name-change follow-through.'],
] as const;

const operatingSystemRows = [
  {
    title: 'The wedding site is the front door',
    body: 'Guests get a beautiful place for the details, not a dead page that stops helping after publish.',
    image: asset('template-previews/modern-luxe.webp'),
    imageAlt: 'Modern wedding website template preview',
    hrefs: { signedOut: '/templates', signedIn: '/dashboard/builder' },
  },
  {
    title: 'The guest list becomes the source of truth',
    body: 'RSVPs, households, meal notes, reminders, and seating all stay attached to the same people.',
    image: asset('template-previews/full-featured-modern.webp'),
    imageAlt: 'dayof product dashboard preview',
    hrefs: { signedOut: '/features/guests', signedIn: '/dashboard/guests' },
  },
  {
    title: 'The day-of handoff is part of the product',
    body: 'Coordinator context, photo collection, updates, and after-wedding tasks do not fall into a separate pile.',
    image: asset('template-previews/immersive-experience.webp'),
    imageAlt: 'Wedding memory and planning detail',
    hrefs: { signedOut: '/product', signedIn: '/dashboard/planning' },
  },
] as const;

const featureLinks = [
  {
    title: 'Guests + households',
    icon: Users,
    bullets: ['Imports', 'Households', 'Plus-one rules', 'Planner-safe exports'],
    hrefs: { signedOut: '/features/guests', signedIn: '/dashboard/guests' },
  },
  {
    title: 'RSVP engine',
    icon: CheckCircle2,
    bullets: ['Private links', 'Event-level replies', 'Meal choices', 'Deadline clarity'],
    hrefs: { signedOut: '/features/rsvp', signedIn: '/dashboard/rsvp-board' },
  },
  {
    title: 'Messaging',
    icon: Mail,
    bullets: ['Guest segments', 'Drafts', 'Scheduled updates', SITE_TRUST_COPY.reviewBeforeSendMessaging],
    hrefs: { signedOut: '/features/messaging', signedIn: '/dashboard/messages' },
  },
  {
    title: 'Travel + itinerary',
    icon: Calendar,
    bullets: ['Weekend schedule', 'Travel notes', 'Venue details', 'Guest-safe directions'],
    hrefs: { signedOut: '/features/travel', signedIn: '/dashboard/itinerary' },
  },
  {
    title: 'Registry',
    icon: Heart,
    bullets: ['Gift links', 'Funds', 'Thank-you notes', 'Clean public view'],
    hrefs: { signedOut: '/features/registry', signedIn: '/dashboard/registry' },
  },
  {
    title: 'Seating',
    icon: Users,
    bullets: ['Per-event layouts', 'Seat lookup', 'Catering exports', 'Check-in context'],
    hrefs: { signedOut: '/features/seating', signedIn: '/dashboard/seating' },
  },
  {
    title: 'Photo flow',
    icon: Camera,
    bullets: ['No-app uploads', 'Guestbook', 'Recap path', 'Album organization'],
    hrefs: { signedOut: '/product', signedIn: '/dashboard/photos' },
  },
  {
    title: 'Day-of view',
    icon: Radio,
    bullets: ['Coordinator mode', 'Guest lookup', 'Timeline focus', 'Issue follow-up'],
    hrefs: { signedOut: '/product', signedIn: '/dashboard/coordinator' },
  },
] as const;

const guestSteps = [
  ['Open one wedding link', 'No app or account required for the public guest path.'],
  ['Reply and update details', 'RSVP, meal notes, contact changes, and event visibility stay grounded in the same guest record.'],
  ['Use it during the weekend', 'Travel, schedule, photo sharing, and latest updates remain easy to find from a phone.'],
  ['Come back after', 'Guestbook notes, photo recap, and vault moments keep the wedding from disappearing into old texts.'],
] as const;

const templateCards = [
  { name: 'Garden weekend', image: asset('template-previews/garden-escape.webp') },
  { name: 'Modern celebration', image: asset('template-previews/modern-luxe.webp') },
  { name: 'Classic estate', image: asset('template-previews/timeless-classic.webp') },
  { name: 'Evening reception', image: asset('template-previews/editorial-impact.webp') },
] as const;

const trustPoints = [
  'Private editing before sharing.',
  'Guest access truth stays visible.',
  'Texts stay locked until sender setup is connected.',
  'Messages stay editable before send.',
  'Auto-renew stays off by default.',
] as const;

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const { signIn, user } = useAuth();
  const { toast } = useToast();
  const [demoLoading, setDemoLoading] = React.useState(false);

  const handleSignUp = () => {
    if (user) {
      navigate('/dashboard/builder');
      return;
    }
    navigate('/signup');
  };

  const handleDemoLogin = async () => {
    if (demoLoading) return;
    if (user) {
      navigate('/dashboard/overview');
      return;
    }

    setDemoLoading(true);
    try {
      await signIn();
      navigate('/dashboard/overview');
    } catch {
      toast('Couldn’t open the demo right now. Please try again.', 'error');
      setDemoLoading(false);
    }
  };

  const signedInFeatureHref = (signedOut: string, signedIn: string) => (user ? signedIn : signedOut);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <Header />

      <main id="top">
        <section className="relative min-h-[calc(74vh-64px)] overflow-hidden bg-ink text-white">
          <img
            src={heroImage}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black opacity-60" />
          <div className="container-custom relative flex min-h-[calc(74vh-64px)] flex-col justify-center pb-8 pt-20 md:pb-10 md:pt-24">
            <div className="max-w-4xl">
              <HeroReveal>
                <p className="text-sm font-medium text-white opacity-80">dayof</p>
              </HeroReveal>
              <HeroReveal delay={0.08}>
                <h1 className="mt-4 max-w-4xl text-[2.75rem] font-semibold leading-[1] text-white md:text-[5rem]">
                  A calmer wedding operating system.
                </h1>
              </HeroReveal>
              <HeroReveal delay={0.16}>
                <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white opacity-90 md:text-xl">
                  Build the wedding site, manage the guest list, run RSVP and messages, collect photos, and hand the day-of details to the right people from one place.
                </p>
              </HeroReveal>
              <HeroReveal delay={0.24}>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={handleSignUp}
                    aria-label={user ? 'Review your wedding site draft' : 'Start your wedding site draft'}
                    className="inline-flex min-h-[54px] items-center justify-center rounded-xl bg-white px-7 py-3.5 text-base font-semibold text-ink transition hover:bg-paper"
                  >
                    {user ? 'Continue your site' : 'Start your draft'}
                  </button>
                  <Link
                    to="/templates"
                    className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-xl border border-white/35 bg-white/10 px-7 py-3.5 text-base font-semibold text-white transition hover:bg-white/18"
                  >
                    View templates
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  {DEMO_MODE ? (
                    <button
                      onClick={handleDemoLogin}
                      disabled={demoLoading}
                      className="inline-flex min-h-[54px] items-center justify-center rounded-xl border border-white/25 bg-[#2d2d2d]/35 px-7 py-3.5 text-base font-semibold text-white transition hover:bg-[#2d2d2d]/55 disabled:cursor-wait disabled:opacity-70"
                    >
                      {demoLoading ? 'Opening demo...' : 'View demo'}
                    </button>
                  ) : null}
                </div>
              </HeroReveal>
            </div>

            <HeroReveal delay={0.32}>
              <div className="mt-9 grid border-y border-white/24 md:grid-cols-3">
                {heroStats.map(([label, body]) => (
                  <div key={label} className="border-white/20 py-4 md:border-r md:px-5 md:last:border-r-0">
                    <p className="text-sm font-semibold text-white">{label}</p>
                    <p className="mt-1 text-sm leading-relaxed text-white opacity-75">{body}</p>
                  </div>
                ))}
              </div>
            </HeroReveal>
          </div>
        </section>

        <section id="why" className="border-b border-border-subtle bg-white py-12 md:py-16">
          <div className="container-custom grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
            <div>
              <Reveal>
                <p className="text-sm font-medium text-brand">Why this exists</p>
                <h2 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight text-ink md:text-5xl">
                  Most wedding websites stop at publish. dayof stays useful through the rest.
                </h2>
              </Reveal>
            </div>
            <Reveal delay={0.08}>
              <div className="max-w-2xl space-y-4 text-base leading-relaxed text-ink/72">
                <p>
                  Couples do not just need a beautiful page. They need guest answers, private links, message drafts, seating context, travel clarity, photo collection, and a way to keep helpers aligned without turning the wedding into a spreadsheet job.
                </p>
                <p>
                  dayof keeps the public experience polished while the operational pieces stay close enough to actually help.
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="bg-paper py-12 md:py-20">
          <div className="container-custom">
            <Reveal>
              <div className="max-w-3xl">
                <p className="text-sm font-medium text-brand">Product shape</p>
                <h2 className="mt-3 text-3xl font-semibold leading-tight text-ink md:text-5xl">
                  Site, guests, and day-of work in the same rhythm.
                </h2>
              </div>
            </Reveal>

            <div className="mt-9 grid gap-5 lg:grid-cols-3">
              {operatingSystemRows.map((item, index) => (
                <Reveal key={item.title} delay={0.08 * index}>
                  <article className="overflow-hidden rounded-xl border border-border-subtle bg-white shadow-sm">
                    <img src={item.image} alt={item.imageAlt} className="aspect-[4/3] w-full object-cover" />
                    <div className="p-5">
                      <h3 className="text-xl font-semibold text-ink">{item.title}</h3>
                      <p className="mt-3 text-sm leading-relaxed text-ink/70">{item.body}</p>
                      <Link
                        to={signedInFeatureHref(item.hrefs.signedOut, item.hrefs.signedIn)}
                        aria-label="Explore this feature"
                        className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-brand"
                      >
                        Explore this feature
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="border-y border-border-subtle bg-white py-12 md:py-20">
          <div className="container-custom">
            <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
              <Reveal>
                <div>
                  <p className="text-sm font-medium text-brand">What it replaces</p>
                  <h2 className="mt-3 text-3xl font-semibold leading-tight text-ink md:text-5xl">
                    One place for the details, people, and memories that matter.
                  </h2>
                  <p className="mt-4 text-base leading-relaxed text-ink/72">
                    Keep the couple-facing tools dense and useful while keeping the guest-facing path simple.
                  </p>
                </div>
              </Reveal>

              <div className="grid gap-4 sm:grid-cols-2">
                {featureLinks.map((feature, index) => {
                  const Icon = feature.icon;
                  return (
                    <Reveal key={feature.title} delay={0.03 * index}>
                      <article className="rounded-xl border border-border-subtle bg-paper p-5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-brand">
                            <Icon className="h-4 w-4" />
                          </div>
                          <h3 className="text-base font-semibold text-ink">{feature.title}</h3>
                        </div>
                        <ul className="mt-4 grid gap-2 text-sm text-ink/70">
                          {feature.bullets.map((bullet) => (
                            <li key={bullet} className="flex gap-2">
                              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                              <span>{bullet}</span>
                            </li>
                          ))}
                        </ul>
                        <Link
                          to={signedInFeatureHref(feature.hrefs.signedOut, feature.hrefs.signedIn)}
                          aria-label="Explore this feature"
                          className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-brand"
                        >
                          Explore this feature
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </article>
                    </Reveal>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#f6f8f3] py-12 md:py-20">
          <div className="container-custom grid gap-9 lg:grid-cols-[1fr_0.9fr] lg:items-center">
            <div>
              <Reveal>
                <p className="text-sm font-medium text-brand">Guest experience</p>
                <h2 className="mt-3 max-w-3xl text-3xl font-semibold leading-tight text-ink md:text-5xl">
                  Guests should never feel like they are using planning software.
                </h2>
              </Reveal>
              <Reveal delay={0.08}>
                <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink/72">
                  They should open one link, understand what matters, reply when needed, and share memories from their phone. The complexity can stay behind the scenes.
                </p>
              </Reveal>
              <div className="mt-7 grid gap-3">
                {guestSteps.map(([title, body], index) => (
                  <Reveal key={title} delay={0.05 * index}>
                    <div className="grid gap-3 rounded-xl border border-border-subtle bg-white p-4 sm:grid-cols-[44px_1fr]">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e8f0e4] text-sm font-semibold text-brand">
                        {index + 1}
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-ink">{title}</h3>
                        <p className="mt-1 text-sm leading-relaxed text-ink/68">{body}</p>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
            <Reveal delay={0.14}>
              <img
                src={detailImage}
                alt="Guest-facing wedding detail preview"
                className="aspect-[4/5] w-full rounded-xl border border-border-subtle object-cover shadow-sm"
              />
            </Reveal>
          </div>
        </section>

        <section id="templates" className="border-y border-border-subtle bg-white py-12 md:py-20">
          <div className="container-custom">
            <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
              <Reveal>
                <div className="max-w-3xl">
                  <p className="text-sm font-medium text-brand">Templates</p>
                  <h2 className="mt-3 text-3xl font-semibold leading-tight text-ink md:text-5xl">
                    Start with a site that already feels designed.
                  </h2>
                </div>
              </Reveal>
              <Reveal delay={0.08}>
                <Link to="/templates" className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-brand/25 px-5 py-3 text-sm font-semibold text-brand transition hover:bg-brand/5">
                  View templates
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Reveal>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {templateCards.map((card, index) => (
                <Reveal key={card.name} delay={0.05 * index}>
                  <Link to="/templates" className="group block overflow-hidden rounded-xl border border-border-subtle bg-paper">
                    <img src={card.image} alt={`${card.name} wedding website preview`} className="aspect-[4/5] w-full object-cover transition duration-300 group-hover:scale-[1.02]" />
                    <div className="flex items-center justify-between p-4">
                      <span className="text-sm font-semibold text-ink">{card.name}</span>
                      <ArrowRight className="h-4 w-4 text-brand" />
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-paper py-12 md:py-20">
          <div className="container-custom grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <Reveal>
              <div>
                <p className="text-sm font-medium text-brand">Trust posture</p>
                <h2 className="mt-3 text-3xl font-semibold leading-tight text-ink md:text-5xl">
                  Built for launch truth, not wedding-tech theater.
                </h2>
                <p className="mt-4 text-base leading-relaxed text-ink/72">
                  The product should be honest about what is ready, what needs setup, and what guests can actually access.
                </p>
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="grid gap-3 sm:grid-cols-2">
                {trustPoints.map((point) => (
                  <div key={point} className="flex gap-3 rounded-xl border border-border-subtle bg-white p-4">
                    <Shield className="mt-0.5 h-4 w-4 shrink-0 text-[#4D7FA3]" />
                    <p className="text-sm leading-relaxed text-ink/72">{point}</p>
                  </div>
                ))}
                <div className="rounded-xl border border-[#C89F56]/35 bg-[#fff8ea] p-4 sm:col-span-2">
                  <p className="text-sm leading-relaxed text-ink/76">
                    {SITE_TRUST_COPY.guestAccessTruth}
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        <section id="pricing" className="bg-white py-12 md:py-20">
          <div className="container-custom grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <Reveal>
              <div>
                <p className="text-sm font-medium text-brand">Pricing</p>
                <h2 className="mt-3 text-3xl font-semibold leading-tight text-ink md:text-5xl">
                  Simple, honest pricing.
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink/72">
                  $49 flat fee for two years. Auto-renew stays off by default. You get the website, RSVP, guests, messaging, seating, registry, itinerary, photos, and day-of coordination in one place.
                </p>
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="rounded-xl border border-border-subtle bg-paper p-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-semibold text-ink">$49</span>
                  <span className="text-sm text-ink/64">for two years</span>
                </div>
                <ul className="mt-6 grid gap-3 text-sm text-ink/72">
                  {['Wedding website and templates', 'Guest list, RSVP, messages, and seating', 'Photos, guestbook, registry, itinerary, and coordinator tools', 'No surprise auto-renewal'].map((item) => (
                    <li key={item} className="flex gap-2">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={handleSignUp}
                    aria-label={user ? 'Review your wedding site draft' : 'Start your wedding site draft'}
                    className="inline-flex min-h-[52px] items-center justify-center rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand/90"
                  >
                    {user ? 'Continue your site' : 'Start your draft'}
                  </button>
                  <Link
                    to="/product"
                    className="inline-flex min-h-[52px] items-center justify-center rounded-xl border border-border bg-white px-6 py-3 text-sm font-semibold text-ink transition hover:bg-paper"
                  >
                    Product tour
                  </Link>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {user && (
          <section className="border-t border-border-subtle bg-paper py-9 md:py-12">
            <div className="container-custom">
              <Reveal>
                <div className="rounded-xl border border-brand/15 bg-white p-6">
                  <p className="text-sm font-medium text-brand">Already started?</p>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    <Link
                      to="/dashboard/builder"
                      onClick={() => navigate('/dashboard/builder')}
                      aria-label="Open your builder"
                      className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-border px-5 py-3 text-sm font-semibold text-ink"
                    >
                      Edit your site
                    </Link>
                    <Link
                      to="/dashboard/planning"
                      aria-label="Open planner workspace"
                      className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-border px-5 py-3 text-sm font-semibold text-ink"
                    >
                      Continue planning
                    </Link>
                    <button
                      onClick={() => navigate('/dashboard/guests')}
                      aria-label="Open your guest list"
                      className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-border px-5 py-3 text-sm font-semibold text-ink"
                    >
                      Manage guests
                    </button>
                    <button
                      onClick={() => navigate('/dashboard/messages')}
                      aria-label="Open message drafts"
                      className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-border px-5 py-3 text-sm font-semibold text-ink"
                    >
                      Guest messages
                    </button>
                  </div>
                </div>
              </Reveal>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
};
