import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Archive,
  Camera,
  Calendar,
  CheckCircle2,
  Heart,
  Mail,
  Radio,
  Users,
} from 'lucide-react';
import { Footer, Header } from '../components/layout';
import { HeroReveal, Reveal } from '../components/marketing/Reveal';
import { useToast } from '../components/ui/Toast';
import { useAuth } from '../hooks/useAuth';
import { SITE_TRUST_COPY } from '../lib/siteTrustCopy';

const asset = (name: string) => `${import.meta.env.BASE_URL}landing/${name}`;

const featureCards = [
  {
    id: 'site',
    eyebrow: 'Details',
    title: 'Website, travel details, itinerary, and registry links stay connected.',
    body: 'The wedding site is the front door, but it should stay useful after publish instead of becoming a dead page with a pretty URL.',
    image: asset('product-prototype.png'),
    imageAlt: 'dayof product preview',
    bullets: ['Wedding site', 'Travel details', 'Multi-event itinerary', 'Registry links that stay on brand'],
    hrefs: {
      signedOut: '/product',
      signedIn: '/dashboard/builder',
    },
  },
  {
    id: 'guests',
    eyebrow: 'People',
    title: 'Guest management, RSVP, messaging, seating, and coordinator tools work as one system.',
    body: 'Guest records should not splinter into spreadsheets, inbox threads, and day-of panic. dayof keeps the same people connected all the way through the event.',
    image: asset('wedding-detail-1.png'),
    imageAlt: 'Guest flow detail preview',
    bullets: ['Households and plus-ones', 'RSVP status and meal choices', 'Messaging and reminders', 'Seating and day-of check-in'],
    hrefs: {
      signedOut: '/features/guests',
      signedIn: '/dashboard/guests',
    },
  },
  {
    id: 'memories',
    eyebrow: 'After',
    title: 'Photo sharing, the vault, and name-change planning make the platform useful after the wedding too.',
    body: 'The wedding weekend is not the only moment that matters. Guests can upload photos simply, and couples keep a calmer post-wedding place to wrap things up.',
    image: asset('wedding-detail-2.png'),
    imageAlt: 'Post-wedding memories preview',
    bullets: ['Guest photo uploads', 'Wedding Vault keepsakes', 'Name-change planning support', 'Archive-friendly post-wedding flow'],
    hrefs: {
      signedOut: '/product',
      signedIn: '/dashboard/planning',
    },
  },
] as const;

const templateCards = [
  { name: 'Garden', image: asset('template-site-1.png') },
  { name: 'Modern', image: asset('template-site-2.png') },
  { name: 'Classic', image: asset('template-site-3.png') },
  { name: 'Elegant', image: asset('template-site-4.png') },
] as const;

const featureLinks = [
  {
    title: 'Guests + Households',
    icon: Users,
    bullets: ['Household grouping', 'Plus-one rules', 'Guest imports', 'Role-safe exports'],
    hrefs: { signedOut: '/features/guests', signedIn: '/dashboard/guests' },
  },
  {
    title: 'RSVP Engine',
    icon: CheckCircle2,
    bullets: ['Multi-event RSVP', 'Meal choices', 'Deadline handling', 'Response tracking'],
    hrefs: { signedOut: '/features/rsvp', signedIn: '/dashboard/rsvp-board' },
  },
  {
    title: 'Messaging',
    icon: Mail,
    bullets: ['Email updates', 'Schedule sends', 'Segment guests', SITE_TRUST_COPY.reviewBeforeSendMessaging],
    hrefs: { signedOut: '/features/messaging', signedIn: '/dashboard/messages' },
  },
  {
    title: 'Planner Collaboration',
    icon: Calendar,
    bullets: ['Couple-led planner access', 'Shared planning context', 'Role-aware tools', 'Clean handoff'],
    hrefs: { signedOut: '/product', signedIn: '/dashboard/planning' },
  },
  {
    title: 'Day-of Coordination',
    icon: Radio,
    bullets: ['Guest lookup', 'Door check-in', 'Timeline context', 'Issue routing'],
    hrefs: { signedOut: '/product', signedIn: '/dashboard/coordinator' },
  },
  {
    title: 'Travel + Itinerary',
    icon: Calendar,
    bullets: ['Hotel blocks', 'Venue details', 'Weekend schedule', 'Guest-friendly directions'],
    hrefs: { signedOut: '/features/travel', signedIn: '/dashboard/itinerary' },
  },
  {
    title: 'Registry',
    icon: Heart,
    bullets: ['Registry links', 'Cash funds', 'Clean gift surfaces', 'No marketplace clutter'],
    hrefs: { signedOut: '/features/registry', signedIn: '/dashboard/registry' },
  },
  {
    title: 'Seating',
    icon: Users,
    bullets: ['Drag-and-drop seating', 'Per-event layouts', 'Exports', 'Day-of lookup'],
    hrefs: { signedOut: '/features/seating', signedIn: '/dashboard/seating' },
  },
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
      navigate('/dashboard');
      return;
    }

    setDemoLoading(true);
    try {
      await signIn();
      navigate('/dashboard');
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
        <section className="relative overflow-hidden border-b border-border-subtle bg-paper">
          <div className="absolute inset-0">
            <img
              src={asset('wedding-hero.png')}
              alt=""
              className="h-full w-full object-cover opacity-20"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-paper/95 via-paper/80 to-paper" />
          </div>
          <div className="container-custom relative grid min-h-[calc(78vh-64px)] items-end gap-10 py-16 md:min-h-[calc(82vh-64px)] md:py-24">
            <div className="max-w-5xl">
              <HeroReveal>
                <p className="mb-4 text-sm font-medium uppercase tracking-[0.16em] text-brand/80">
                  Wedding websites, guest tools, and post-wedding follow-through
                </p>
              </HeroReveal>
              <HeroReveal delay={0.08}>
                <h1 className="max-w-6xl text-[2.75rem] font-light leading-[0.95] text-ink md:text-[5.5rem]">
                  Your wedding is one of the biggest moments of your life. The experience around it should feel intentional too.
                </h1>
              </HeroReveal>
              <HeroReveal delay={0.16}>
                <p className="mt-6 max-w-3xl text-[1.08rem] leading-relaxed text-ink/72 md:text-[1.35rem]">
                  dayof gives couples a beautiful wedding site, calmer guest operations, and thoughtful post-wedding tools without turning the whole experience into another platform to babysit.
                </p>
              </HeroReveal>
              <HeroReveal delay={0.24}>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={handleSignUp}
                    aria-label={user ? 'Review your wedding site draft' : 'Start your wedding site draft'}
                    className="inline-flex min-h-[54px] items-center justify-center rounded-md bg-brand px-7 py-3.5 text-base font-semibold text-paper transition hover:bg-brand/90"
                  >
                    {user ? 'Review your draft' : 'Start your draft'}
                  </button>
                  <Link
                    to="/templates"
                    className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-md border border-brand/25 bg-white/75 px-7 py-3.5 text-base font-semibold text-brand transition hover:bg-white"
                  >
                    View templates
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={handleDemoLogin}
                    disabled={demoLoading}
                    className="inline-flex min-h-[54px] items-center justify-center rounded-md border border-border bg-paper/80 px-7 py-3.5 text-base font-semibold text-ink transition hover:bg-white disabled:cursor-wait disabled:opacity-60"
                  >
                    {demoLoading ? 'Opening demo...' : 'View demo'}
                  </button>
                </div>
              </HeroReveal>
              <HeroReveal delay={0.32}>
                <div className="mt-6 flex flex-wrap gap-3 text-sm text-ink/68">
                  <span className="rounded-full border border-border bg-white/80 px-3 py-1.5">Beautiful for guests</span>
                  <span className="rounded-full border border-border bg-white/80 px-3 py-1.5">Calm for couples</span>
                  <span className="rounded-full border border-border bg-white/80 px-3 py-1.5">Planner and coordinator support when you need it</span>
                </div>
              </HeroReveal>
            </div>
          </div>
        </section>

        <section className="section-shell bg-white">
          <div className="container-custom">
            <div className="section-intro">
              <Reveal>
                <h2 className="section-title max-w-4xl mx-auto">
                  Most wedding websites stop at publish. dayof stays useful through the rest.
                </h2>
              </Reveal>
              <Reveal delay={0.08}>
                <p className="section-subtitle">
                  The website is usually the easy part. Then guests start replying, plans change, people lose links, and the post-wedding loose ends begin. The product should hold together across all of that.
                </p>
              </Reveal>
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
              {featureCards.map((card, index) => (
                <Reveal key={card.id} delay={0.08 * (index + 1)}>
                  <article className="card-clean overflow-hidden">
                    <div className="aspect-[4/3] overflow-hidden border-b border-border-subtle bg-paper">
                      <img src={card.image} alt={card.imageAlt} className="h-full w-full object-cover" />
                    </div>
                    <div className="p-6">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-brand/80">{card.eyebrow}</p>
                      <h3 className="text-xl font-serif font-bold text-ink">{card.title}</h3>
                      <p className="mt-3 text-sm leading-relaxed text-ink/70">{card.body}</p>
                      <ul className="mt-5 space-y-2 text-sm text-ink/75">
                        {card.bullets.map((bullet) => (
                          <li key={bullet} className="flex gap-2">
                            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                            <span>{bullet}</span>
                          </li>
                        ))}
                      </ul>
                      <Link
                        to={signedInFeatureHref(card.hrefs.signedOut, card.hrefs.signedIn)}
                        aria-label="Explore this feature"
                        className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand"
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

        <section id="features" className="section-shell border-y border-border-subtle bg-paper">
          <div className="container-custom">
            <div className="section-intro">
              <Reveal>
                <h2 className="section-title">One place for the details, people, and memories that matter.</h2>
              </Reveal>
              <Reveal delay={0.08}>
                <p className="section-subtitle">
                  dayof brings together the tools couples actually need without burying the wedding in feature noise.
                </p>
              </Reveal>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {featureLinks.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <Reveal key={feature.title} delay={0.04 * index}>
                    <article className="card-elevated h-full p-5">
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-brand/10 p-2 text-brand">
                          <Icon className="h-4 w-4" />
                        </div>
                        <h3 className="text-base font-semibold text-ink">{feature.title}</h3>
                      </div>
                      <ul className="mt-4 space-y-2 text-sm text-ink/72">
                        {feature.bullets.map((bullet) => (
                          <li key={bullet}>{bullet}</li>
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
        </section>

        <section className="section-shell bg-white">
          <div className="container-custom grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <Reveal>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-brand/80">Guest experience</p>
                <h2 className="section-title max-w-2xl">Designed to feel smoother for everyone involved.</h2>
              </Reveal>
              <Reveal delay={0.08}>
                <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink/72">
                  Guests should not need another app, another account, or another scavenger hunt through old emails. One clean flow should cover the website, RSVP, updates, and photo sharing.
                </p>
              </Reveal>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {[
                  ['Open your wedding site', 'Guests start from one clear place with the details they need.'],
                  ['RSVP', 'They respond without wrestling with a separate tool.'],
                  ['Receive updates', 'Messages stay connected to the wedding itself.'],
                  ['Share photos', 'They can send moments back without downloading anything.'],
                ].map(([title, copy], index) => (
                  <Reveal key={title} delay={0.08 * (index + 1)}>
                    <div className="rounded-xl border border-border-subtle bg-paper p-5">
                      <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand text-sm font-semibold text-paper">
                        {index + 1}
                      </div>
                      <h3 className="text-base font-semibold text-ink">{title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-ink/70">{copy}</p>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>

            <Reveal delay={0.16}>
              <div className="overflow-hidden rounded-2xl border border-border-subtle bg-paper">
                <img
                  src={asset('wedding-detail-3.png')}
                  alt="Wedding site experience preview"
                  className="aspect-[4/5] w-full object-cover"
                />
              </div>
            </Reveal>
          </div>
        </section>

        <section id="templates" className="section-shell border-y border-border-subtle bg-paper">
          <div className="container-custom">
            <div className="section-intro">
              <Reveal>
                <h2 className="section-title">A wedding website that already feels thoughtfully designed.</h2>
              </Reveal>
              <Reveal delay={0.08}>
                <p className="section-subtitle">
                  Most couples are not trying to become designers during wedding planning. Start with a polished template, customize what matters, and keep moving.
                </p>
              </Reveal>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {templateCards.map((card, index) => (
                <Reveal key={card.name} delay={0.05 * index}>
                  <Link to="/templates" className="group overflow-hidden rounded-xl border border-border-subtle bg-white">
                    <img src={card.image} alt={`${card.name} wedding website preview`} className="aspect-[4/5] w-full object-cover transition duration-300 group-hover:scale-[1.02]" />
                    <div className="flex items-center justify-between p-4">
                      <span className="text-sm font-semibold text-ink">{card.name}</span>
                      <ArrowRight className="h-4 w-4 text-brand" />
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>

            <Reveal delay={0.2}>
              <div className="mt-8 text-center">
                <Link to="/templates" className="inline-flex items-center gap-2 text-sm font-semibold text-brand">
                  View templates
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="section-shell bg-white">
          <div className="container-custom grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <Reveal>
              <div className="rounded-2xl border border-border-subtle bg-paper p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand/80">Guest details</p>
                <h2 className="mt-3 text-2xl font-serif font-bold text-ink">One link for the details that usually turn into follow-up work.</h2>
                <p className="mt-3 text-sm leading-relaxed text-ink/72">
                  Guests update addresses, household details, meal choices, and contact info from a simple page. The same guest record stays connected to RSVP, messaging, seating, and exports.
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {[
                    'Address collection',
                    'Household updates',
                    'Meal selections',
                    'RSVP continuity',
                  ].map((item) => (
                    <div key={item} className="rounded-lg border border-border-subtle bg-white px-4 py-3 text-sm text-ink/75">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { icon: Mail, title: 'Messaging stays tied to the wedding', copy: 'Updates, reminders, and guest communication stay grounded in the actual event context.' },
                  { icon: Camera, title: 'Photo uploads stay easy', copy: 'Guests can send moments back from their phones without app friction.' },
                  { icon: Radio, title: 'Day-of check-in has a calmer home', copy: 'Lookup, arrivals, and coordinator tools are built into the same system.' },
                  { icon: Archive, title: 'Post-wedding follow-through stays organized', copy: 'The vault and name-change planner keep the after-wedding work from feeling scattered.' },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="rounded-xl border border-border-subtle bg-paper p-5">
                      <div className="inline-flex rounded-full bg-brand/10 p-2 text-brand">
                        <Icon className="h-4 w-4" />
                      </div>
                      <h3 className="mt-4 text-base font-semibold text-ink">{item.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-ink/70">{item.copy}</p>
                    </div>
                  );
                })}
              </div>
            </Reveal>
          </div>
        </section>

        <section id="why" className="section-shell border-y border-border-subtle bg-paper">
          <div className="container-custom grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-start">
            <div>
              <Reveal>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-brand/80">Why dayof</p>
                <h2 className="section-title max-w-3xl">This was built for couples who want the wedding to feel cared for, not commoditized.</h2>
              </Reveal>
              <Reveal delay={0.08}>
                <div className="mt-5 space-y-4 text-base leading-relaxed text-ink/72">
                  <p>
                    Too many wedding tools are optimized for lead funnels, upsells, and making couples do extra work just to keep everything stitched together.
                  </p>
                  <p>
                    dayof is the opposite posture. The website should be beautiful, the guest experience should be straightforward, and the parts that get intense closer to the wedding should feel calmer instead of more chaotic.
                  </p>
                  <p>
                    The goal is not to pretend weddings are simple. The goal is to build something that helps people through them with more clarity and less friction.
                  </p>
                </div>
              </Reveal>
            </div>

            <Reveal delay={0.14}>
              <div className="rounded-2xl border border-border-subtle bg-white p-6">
                <h3 className="text-lg font-semibold text-ink">What we try to protect</h3>
                <ul className="mt-5 space-y-3 text-sm leading-relaxed text-ink/72">
                  <li>No surprise renewals or vague pricing promises.</li>
                  <li>No forcing guests into another account or app just to stay informed.</li>
                  <li>No pretending a queued message has already been sent.</li>
                  <li>No pretending a blocked name-change step is magically ready.</li>
                  <li>{SITE_TRUST_COPY.guestAccessTruth}</li>
                </ul>
              </div>
            </Reveal>
          </div>
        </section>

        <section id="pricing" className="section-shell bg-white">
          <div className="container-custom">
            <div className="mx-auto max-w-3xl rounded-3xl border border-border-subtle bg-paper p-8 text-center md:p-12">
              <Reveal>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand/80">Pricing</p>
                <h2 className="mt-3 section-title">Simple, honest pricing.</h2>
              </Reveal>
              <Reveal delay={0.08}>
                <p className="mt-4 text-base leading-relaxed text-ink/72">
                  $49 flat fee for two years. Auto-renew stays off by default. You get the website, RSVP, guests, messaging, seating, registry, itinerary, and day-of coordination in one place.
                </p>
              </Reveal>
              <Reveal delay={0.12}>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                  <button
                    onClick={handleSignUp}
                    aria-label={user ? 'Review your wedding site draft' : 'Start your wedding site draft'}
                    className="inline-flex min-h-[54px] items-center justify-center rounded-md bg-brand px-7 py-3.5 text-base font-semibold text-paper transition hover:bg-brand/90"
                  >
                    {user ? 'Review your draft' : 'Start your draft'}
                  </button>
                  <Link
                    to="/templates"
                    className="inline-flex min-h-[54px] items-center justify-center rounded-md border border-brand/25 bg-white px-7 py-3.5 text-base font-semibold text-brand transition hover:bg-brand/5"
                  >
                    View templates
                  </Link>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {user && (
          <section className="section-shell-compact border-t border-border-subtle bg-paper">
            <div className="container-custom">
              <Reveal>
                <div className="rounded-2xl border border-brand/15 bg-white p-6">
                  <p className="text-sm font-medium text-brand">Already inside?</p>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    <Link
                      to="/dashboard/builder"
                      onClick={() => navigate('/dashboard/builder')}
                      className="inline-flex min-h-[48px] items-center justify-center rounded-md border border-border px-5 py-3 text-sm font-semibold text-ink"
                    >
                      Open site editor
                    </Link>
                    <Link
                      to="/dashboard/planning"
                      className="inline-flex min-h-[48px] items-center justify-center rounded-md border border-border px-5 py-3 text-sm font-semibold text-ink"
                    >
                      Open planner space
                    </Link>
                    <button
                      onClick={() => navigate('/dashboard/guests')}
                      className="inline-flex min-h-[48px] items-center justify-center rounded-md border border-border px-5 py-3 text-sm font-semibold text-ink"
                    >
                      Open your guest list
                    </button>
                    <button
                      onClick={() => navigate('/dashboard/messages')}
                      className="inline-flex min-h-[48px] items-center justify-center rounded-md border border-border px-5 py-3 text-sm font-semibold text-ink"
                    >
                      Open message drafts
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
