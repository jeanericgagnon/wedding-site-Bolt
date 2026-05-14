import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Header, Footer } from '../components/layout';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ui/Toast';
import { SITE_TRUST_COPY } from '../lib/siteTrustCopy';
import { ArrowRight, Calendar, CheckCircle2, Mail, Shield, Users, Wallet } from 'lucide-react';
import { SlideReveal } from '../components/marketing/Reveal';

type StepId = 'launch' | 'guests' | 'rsvp' | 'message' | 'seating' | 'dayof';

type Step = {
  id: StepId;
  title: string;
  kicker: string;
  outcome: string;
  detail: string;
};

const STEPS: Step[] = [
  { id: 'launch', title: 'Build a site draft you’ll be proud to share', kicker: 'Step 1', outcome: SITE_TRUST_COPY.privateEditing, detail: `Start with a strong template, clear setup, and ${SITE_TRUST_COPY.draftToLaunch.toLowerCase()}` },
  { id: 'guests', title: 'Organize guests + households', kicker: 'Step 2', outcome: 'Know who is invited and where they belong.', detail: 'Households, plus-ones, and statuses in one place.' },
  { id: 'rsvp', title: 'Collect RSVPs cleanly', kicker: 'Step 3', outcome: 'Get responses without confusion.', detail: 'Event-level RSVP and meal tracking without awkward workarounds.' },
  { id: 'message', title: 'Message everyone', kicker: 'Step 4', outcome: 'Review the right update before sending it to the right group.', detail: 'Stop copy/pasting from spreadsheets to email tools while keeping send decisions in your hands.' },
  { id: 'seating', title: 'Run seating + timeline', kicker: 'Step 5', outcome: 'Plan the room and the day in one clear place.', detail: 'Keep tables and event flow aligned in one view.' },
  { id: 'dayof', title: 'Plan day-of', kicker: 'Step 6', outcome: 'Fewer surprises on event day.', detail: 'Use one calmer coordination view instead of juggling a pile of tabs.' },
];

const FEATURE_AUDIT_GROUPS = [
  {
    title: 'Public experience',
    items: ['Wedding site templates', 'Public RSVP page', 'Event-specific RSVP', 'Travel + logistics guidance', 'Privacy + guest-access controls that match the story'],
  },
  {
    title: 'Planning core',
    items: ['Guest households + plus-ones', 'Multi-event RSVP + meal tracking', 'Itinerary + travel details', 'Seating planner + lookup', 'Registry links + gifting'],
  },
  {
    title: 'Planning tools',
    items: ['Guest messaging', 'Planner access', 'Day-of view', 'Wedding home', 'Planning space', 'Settings + preferences'],
  },
  {
    title: 'Helpful extras',
    items: ['Photo upload page', 'Guest memory collection', 'Archive mode foundation', 'Name-change support after the wedding'],
  },
] as const;

const V1_STATUS_GROUPS = [
  {
    title: 'Core experience today',
    tone: 'must',
    intro: 'This is the core experience dayof should be judged on right now.',
    items: [
      'Build a polished wedding site draft with honest privacy + access controls before sharing it with guests',
      'Run guest list, households, RSVP, meals, and event invites in one place',
      'Handle core wedding messaging without bouncing between spreadsheets and email tools',
      'Use seating, itinerary, and coordination views to run the event week calmly',
      'Invite a planner or coordinator into a role-aware planning space',
    ],
  },
  {
    title: 'Helpful, but not the main promise',
    tone: 'should',
    intro: 'These matter, but the wedding-core flow should stay the main promise.',
    items: [
      'Guest photo collection and post-wedding memory paths',
      'Archive mode and anniversary-facing memory layers',
      'Name-change planning support after the wedding',
    ],
  },
  {
    title: 'Future or limited today',
    tone: 'cut',
    intro: 'If these are not fully reliable, they should stay out of the sales story.',
    items: [
      'External custom domains as a default expectation',
      'Advanced analytics as a major product promise',
      'Fully automated migration, reminders, or merchant syncing',
      'Enterprise approval systems or full event-control software claims',
    ],
  },
] as const;

const V1_SLICE_STATUS = [
  {
    name: 'Public site + trust',
    status: 'Ready to shape',
    tone: 'proof',
    done: 'A polished site draft, clear privacy posture, and guest-facing pages that match what couples are told.',
    missing: 'Review sharing settings before inviting guests.',
  },
  {
    name: 'Guests + RSVP',
    status: 'Ready to use',
    tone: 'proof',
    done: 'Guest list, households, plus-ones, event invites, meals, and RSVP replies in one place.',
    missing: 'Review imported guest lists before sending links.',
  },
  {
    name: 'Planner access',
    status: 'Access aware',
    tone: 'proof',
    done: 'Planner and coordinator invites with a role-aware product surface.',
    missing: 'Keep access choices intentional for each helper.',
  },
  {
    name: 'Coordinator / day-of',
    status: 'Day-of ready',
    tone: 'proof',
    done: 'A calmer view for event-day questions, check-in, schedule focus, and quick updates.',
    missing: 'Confirm day-of ownership before the event week.',
  },
  {
    name: 'Comms center',
    status: 'Review before send',
    tone: 'risk',
    done: 'Draft/schedule/history surface is there.',
    missing: 'Texts stay locked until sender setup is complete.',
  },
  {
    name: 'Seating',
    status: 'Plan the room',
    tone: 'proof',
    done: 'Planner + lookup surface exist.',
    missing: 'Review assignments as RSVP answers change.',
  },
  {
    name: 'Registry',
    status: 'Gift links live',
    tone: 'risk',
    done: 'Real add/import/edit work already exists.',
    missing: 'Keep gift details editable when a merchant page is sparse.',
  },
  {
    name: 'Onboarding',
    status: 'Reviewable draft',
    tone: 'risk',
    done: 'Gets couples into a useful first draft.',
    missing: 'Couples can edit every detail before publishing.',
  },
] as const;

export const Product: React.FC = () => {
  const navigate = useNavigate();
  const { signIn, user } = useAuth();
  const { toast } = useToast();
  const [demoLoading, setDemoLoading] = useState(false);
  const [activeStep, setActiveStep] = useState<StepId>('launch');

  const [guestCount, setGuestCount] = useState(86);
  const [rsvpYes, setRsvpYes] = useState(54);
  const [messageState, setMessageState] = useState<'draft' | 'sent'>('draft');
  const [seated, setSeated] = useState(42);

  const handleSignUp = () => {
    if (user) {
      navigate('/dashboard/builder');
      return;
    }

    navigate('/signup');
  };

  const handleLaunchStepReview = () => {
    if (user) {
      navigate('/dashboard/builder');
      return;
    }

    navigate('/signup');
  };

  const handleDemoLogin = async () => {
    if (demoLoading) return;
    setDemoLoading(true);
    try {
      await signIn();
      await new Promise((resolve) => setTimeout(resolve, 0));
      navigate('/dashboard/overview', { replace: true });
    } catch (err) {
      toast('Couldn’t open the demo right now. Please try again.', 'error');
      setDemoLoading(false);
    }
  };

  const current = useMemo(() => STEPS.find((s) => s.id === activeStep) ?? STEPS[0], [activeStep]);

  const renderCanvas = () => {
    if (activeStep === 'launch') {
      return (
        <div className="space-y-4">
          <p className="text-sm text-ink/70">Template: Modern Luxe • Website: starter draft is ready to review before sharing it with guests</p>
          <button onClick={handleLaunchStepReview} className="px-5 py-2.5 rounded-lg bg-brand text-paper font-semibold">Review draft privacy + share settings</button>
        </div>
      );
    }

    if (activeStep === 'guests') {
      return (
        <div className="space-y-4">
          <p className="text-sm text-ink/70">Guests in list: <strong>{guestCount}</strong></p>
          <button onClick={() => setGuestCount((v) => v + 2)} className="px-4 py-2 rounded-lg border border-brand/40 hover:bg-brand/5">Add household (+2)</button>
        </div>
      );
    }

    if (activeStep === 'rsvp') {
      return (
        <div className="space-y-4">
          <p className="text-sm text-ink/70">RSVP yes: <strong>{rsvpYes}</strong> • pending: {Math.max(guestCount - rsvpYes, 0)}</p>
          <button onClick={() => setRsvpYes((v) => Math.min(v + 1, guestCount))} className="px-4 py-2 rounded-lg border border-brand/40 hover:bg-brand/5">Mark one attending</button>
        </div>
      );
    }

    if (activeStep === 'message') {
      return (
        <div className="space-y-4">
          <p className="text-sm text-ink/70">Status: <strong>{messageState === 'draft' ? 'Draft prepared for review' : 'Sent to 86 guests'}</strong></p>
          <button onClick={() => setMessageState((s) => (s === 'draft' ? 'sent' : 'draft'))} className="px-4 py-2 rounded-lg border border-brand/40 hover:bg-brand/5">
            {messageState === 'draft' ? 'Send update' : 'Reset draft state'}
          </button>
        </div>
      );
    }

    if (activeStep === 'seating') {
      return (
        <div className="space-y-4">
          <p className="text-sm text-ink/70">Guests seated: <strong>{seated}</strong> / {guestCount}</p>
          <button onClick={() => setSeated((v) => Math.min(v + 3, guestCount))} className="px-4 py-2 rounded-lg border border-brand/40 hover:bg-brand/5">Seat next table (+3)</button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <p className="text-sm text-ink/70">Planner view: checklist ready, timeline in view, messaging draft prepared.</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={user ? () => navigate('/dashboard/planning') : handleSignUp}
            className="px-4 py-2 rounded-lg border border-brand/40 hover:bg-brand/5"
          >
            {user ? 'Continue planning' : 'Start your draft'}
          </button>
          {user && (
            <button
              onClick={() => navigate('/settings')}
              className="px-4 py-2 rounded-lg border border-brand/40 hover:bg-brand/5"
            >
              Manage collaborators
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink">
      <Header />

      <section className="py-3 border-b border-border-subtle bg-brand text-paper">
        <div className="container-custom max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-2 text-sm">
          <p className="font-medium">{user ? 'Ready to keep shaping your wedding?' : 'Want to see the full flow in action?'}</p>
          {user ? (
            <button
              onClick={() => navigate('/dashboard/builder')}
              className="px-4 py-1.5 rounded-lg bg-white text-brand font-semibold hover:bg-white/90"
            >
              Edit your site
            </button>
          ) : (
            <button
              onClick={handleDemoLogin}
              disabled={demoLoading}
              className="px-4 py-1.5 rounded-lg bg-white text-brand font-semibold hover:bg-white/90 disabled:opacity-60"
            >
              {demoLoading ? 'Opening demo...' : 'Try product demo'}
            </button>
          )}
        </div>
      </section>

      <section className="py-10 md:py-14 bg-paper text-ink">
        <div className="container-custom max-w-7xl">
          <SlideReveal from="left" className="mb-8">
            <h2 className="text-[2rem] md:text-[2.6rem] font-serif font-bold mb-2">Start with the website. Keep the rest close.</h2>
            <p className="text-ink/70">Build a beautiful site, then handle guests, RSVPs, messaging, seating, and the wedding-day plan without bouncing between tools.</p>
          </SlideReveal>

          <div className="grid grid-cols-1 lg:grid-cols-[260px,1fr,260px] gap-4 lg:gap-5">
            <div className="rounded-lg border border-border-subtle bg-surface p-3 h-fit overflow-x-auto lg:sticky lg:top-24">
              <div className="flex gap-2 lg:block min-w-max lg:min-w-0">
              {STEPS.map((step) => (
                <button
                  key={step.id}
                  onClick={() => setActiveStep(step.id)}
                  className={`w-[220px] lg:w-full text-left rounded-lg p-3 mb-0 lg:mb-2 border transition-all shrink-0 ${activeStep === step.id ? 'bg-brand text-paper border-brand' : 'bg-white text-ink border-border-subtle hover:border-brand/45'}`}
                >
                  <p className={`text-[11px] font-semibold ${activeStep === step.id ? 'text-paper/80' : 'text-brand'}`}>{step.kicker}</p>
                  <p className="font-semibold text-sm">{step.title}</p>
                </button>
              ))}
              </div>
            </div>

            <div className="rounded-lg border border-border-subtle bg-white p-5 md:p-7 text-ink">
              <p className="text-xs font-semibold text-brand mb-2">{current.kicker}</p>
              <h3 className="text-[1.45rem] font-serif font-bold mb-2">{current.title}</h3>
              <p className="text-ink/80 mb-1">{current.outcome}</p>
              <p className="text-sm text-ink/65 mb-6">{current.detail}</p>

              <div className="rounded-lg border border-border-subtle bg-surface p-5 mb-6 min-h-[160px]">
                {renderCanvas()}
              </div>

              <div className="flex flex-wrap gap-3">
                <button onClick={handleSignUp} className="px-5 py-2.5 bg-brand text-paper rounded-lg font-semibold">{user ? 'Continue your site' : 'Start your draft'}</button>
                {user ? (
                  <button onClick={() => navigate('/dashboard/builder')} className="group px-5 py-2.5 border-2 border-brand text-brand rounded-lg font-semibold inline-flex items-center gap-2">
                    Edit your site
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </button>
                ) : (
                  <button onClick={handleDemoLogin} disabled={demoLoading} className="group px-5 py-2.5 border-2 border-brand text-brand rounded-lg font-semibold inline-flex items-center gap-2 disabled:opacity-60">
                    {demoLoading ? 'Opening demo...' : 'Try full demo'}
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-border-subtle bg-surface p-4 text-ink h-fit lg:sticky lg:top-24">
              <p className="text-sm text-ink/65 mb-2">What updates as you go</p>
              <ul className="space-y-3 text-sm">
                <li>• Guests tracked: <strong>{guestCount}</strong></li>
                <li>• RSVP yes: <strong>{rsvpYes}</strong></li>
                <li>• Message status: <strong>{messageState === 'draft' ? 'Draft' : 'Sent'}</strong></li>
                <li>• Seated so far: <strong>{seated}</strong></li>
              </ul>
              <p className="text-ink/65 text-xs mt-4">Click through the flow and the planning picture updates with it.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section-shell bg-white border-t border-border-subtle">
        <div className="container-custom max-w-6xl">
          <div className="rounded-lg border border-border-subtle bg-surface p-6 md:p-7">
            <div className="max-w-3xl">
              <p className="text-sm text-brand font-semibold">Switching story</p>
              <h2 className="text-2xl md:text-3xl font-serif font-bold text-ink mt-2">If you already started elsewhere, dayof is strongest when you move the core wedding spine.</h2>
              <p className="mt-3 text-ink/75">You do not need to move every tiny detail on day one. Bring over the essentials first: the wedding site, guests, RSVP details, seating, and the plans people keep asking about.</p>
            </div>
            <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
              {['Move your guest list and essential wedding details', 'Keep the website polished while you tighten guest details', 'Add RSVP, seating, messaging, and wedding-day planning when you are ready'].map((item) => (
                <div key={item} className="rounded-lg border border-border bg-white p-4 text-sm text-ink/75">• {item}</div>
              ))}
            </div>
          </div>
        </div>
      </section>


      <section className="section-shell bg-white border-t border-border-subtle">
        <div className="container-custom max-w-6xl">
          <div className="rounded-lg border border-border-subtle bg-surface p-6 md:p-7">
            <p className="text-sm text-ink/70 font-semibold">Memories after the wedding</p>
            <h2 className="text-2xl md:text-3xl font-serif font-bold text-ink mt-2">The wedding day should keep unfolding without taking over the planning flow.</h2>
            <p className="mt-3 max-w-3xl text-ink/75">Vaults, photo return paths, and anniversary memories are thoughtful additions. The heart of dayof is still {SITE_TRUST_COPY.launchStoryCore}.</p>
            <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-lg border border-border-subtle bg-white p-4">
                <p className="text-sm font-medium text-ink">Archive mode</p>
                <p className="mt-1 text-sm text-ink/70">A private place for notes and keepsakes that open later.</p>
              </div>
              <div className="rounded-lg border border-border-subtle bg-white p-4">
                <p className="text-sm font-medium text-ink">Photo return path</p>
                <p className="mt-1 text-sm text-ink/70">A simple way to bring guest photos back to the couple.</p>
              </div>
              <div className="rounded-lg border border-border-subtle bg-white p-4">
                <p className="text-sm font-medium text-ink">Anniversary memories</p>
                <p className="mt-1 text-sm text-ink/70">A quieter way to revisit the day over time.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-shell bg-white">
        <div className="container-custom max-w-6xl mb-6 space-y-4">
          <div className="rounded-lg border border-border-subtle bg-surface p-6 md:p-7">
            <p className="text-sm text-brand font-semibold">Couple-led collaboration</p>
            <h2 className="text-2xl md:text-3xl font-serif font-bold text-ink mt-2">Invite your planner gracefully, without turning your wedding into a back office.</h2>
            <p className="mt-3 max-w-3xl text-ink/75">dayof should let the couple bring in a planner or coordinator from a calm, tasteful settings flow, share the right planning surfaces, and keep ownership where it belongs.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              {user ? (
                <>
                  <button
                    type="button"
                    onClick={() => navigate('/settings')}
                    className="rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-paper transition hover:bg-brand/90"
                  >
                    Manage collaborators
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard/planning')}
                    className="rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-medium text-ink transition hover:border-brand/30 hover:text-brand"
                  >
                    Continue planning
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard/coordinator')}
                    className="rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-medium text-ink transition hover:border-brand/30 hover:text-brand"
                  >
                    Day-of view
                  </button>
                </>
              ) : (
                <Link to="/trust" className="rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-medium text-ink transition hover:border-brand/30 hover:text-brand">
                  See collaboration trust notes
                </Link>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-lg border border-border-subtle bg-white p-4">
              <p className="text-sm font-medium text-ink">Starts from the couple</p>
              <p className="mt-1 text-sm text-ink/70">Planner access begins in Settings with a named invite, role preset, and a clean access preview. One final role-boundary pass keeps that trust tight.</p>
            </div>
            <div className="rounded-lg border border-border-subtle bg-white p-4">
              <p className="text-sm font-medium text-ink">Planner space is real</p>
              <p className="mt-1 text-sm text-ink/70">Guests, planning, messages, and day-of view now carry planner-specific framing instead of forcing every collaborator through a couple-only view.</p>
            </div>
            <div className="rounded-lg border border-border-subtle bg-white p-4">
              <p className="text-sm font-medium text-ink">Access actually differs</p>
              <p className="mt-1 text-sm text-ink/70">Budget and vendor editing stay more protected than coordination work, so collaboration stays intentional.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section-shell bg-paper">        <div className="container-custom max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: Shield, title: 'Beautiful by default', text: 'Starts polished without endless tweaking.' },
            { icon: Wallet, title: 'Clear pricing', text: 'No hidden tiers. No renewal gotchas.' },
            { icon: Mail, title: 'Built-in comms', text: 'Keep guests synced with review-before-send drafts.' },
            { icon: Users, title: 'Guest logic that scales', text: 'Households and plus-ones stay sane.' },
            { icon: Calendar, title: 'Day-of rhythm', text: 'Timeline and people stay aligned.' },
            { icon: CheckCircle2, title: 'Clear path to review', text: 'Less friction between signup and a reviewable draft you can tighten before sharing.' },
          ].map((item) => (
            <div key={item.title} className="card-clean p-5">
              <item.icon className="w-5 h-5 text-brand mb-3" />
              <h3 className="font-semibold mb-1">{item.title}</h3>
              <p className="text-sm text-ink/70">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section-shell bg-white">
        <div className="container-custom max-w-6xl">
          <SlideReveal from="left" className="mb-6">
            <h2 className="section-title mb-2">Current product shape</h2>
            <p className="text-ink/70">This is the current dayof product shape: the wedding site and guest flow come first, with helpful extras kept in their place.</p>
          </SlideReveal>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FEATURE_AUDIT_GROUPS.map((group) => (
              <div key={group.title} className="card-clean p-5">
                <h3 className="font-semibold mb-3">{group.title}</h3>
                <ul className="space-y-1.5 text-sm text-ink/75">
                  {group.items.map((item) => (
                    <li key={item} className="flex items-start gap-2"><span className="text-brand mt-0.5">•</span><span>{item}</span></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-shell bg-surface border-t border-border-subtle">
        <div className="container-custom max-w-6xl">
          <SlideReveal from="left" className="mb-6">
            <p className="text-sm text-brand font-semibold">What is included</p>
            <h2 className="text-2xl md:text-3xl font-serif font-bold text-ink mt-2">What couples can rely on right now</h2>
            <p className="mt-3 max-w-3xl text-ink/75">The essentials get the spotlight: a beautiful site, clean RSVPs, guest planning, seating, messages, registry links, and a calmer day-of view.</p>
          </SlideReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {V1_SLICE_STATUS.map((slice) => {
              const toneClasses = slice.tone === 'proof'
                  ? 'border-border-subtle bg-white'
                  : 'border-border-subtle bg-white';
              const badgeClasses = slice.tone === 'proof'
                  ? 'border border-primary/15 bg-primary/5 text-primary'
                  : 'border border-border-subtle bg-surface text-text-secondary';

              return (
                  <div key={slice.name} className={`rounded-lg border p-5 ${toneClasses}`}>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <h3 className="font-semibold text-ink">{slice.name}</h3>
                    <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-semibold ${badgeClasses}`}>{slice.status}</span>
                  </div>
                  <div className="space-y-2 text-sm text-ink/80">
                    <p><span className="font-semibold text-ink">Covers:</span> {slice.done}</p>
                    <p><span className="font-semibold text-ink">Worth checking:</span> {slice.missing}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {V1_STATUS_GROUPS.map((group) => {
              const toneClasses = group.tone === 'must'
                ? 'border-border-subtle bg-white'
                : group.tone === 'should'
                  ? 'border-border-subtle bg-white'
                  : 'border-border-subtle bg-white';
              const badgeClasses = group.tone === 'must'
                ? 'border border-primary/15 bg-primary/5 text-primary'
                : group.tone === 'should'
                  ? 'border border-border-subtle bg-surface text-text-secondary'
                  : 'border border-border-subtle bg-surface text-text-secondary';
              const badgeText = group.tone === 'must' ? 'Included' : group.tone === 'should' ? 'Helpful' : 'Future';

              return (
                <div key={group.title} className={`rounded-lg border p-5 ${toneClasses}`}>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <h3 className="font-semibold text-ink">{group.title}</h3>
                    <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[11px] font-semibold ${badgeClasses}`}>{badgeText}</span>
                  </div>
                  <p className="text-sm text-ink/70 mb-4">{group.intro}</p>
                  <ul className="space-y-2 text-sm text-ink/80">
                    {group.items.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="text-brand mt-0.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section-shell bg-white">
        <div className="container-custom max-w-4xl text-center">
          <h2 className="section-title mb-3">A beautiful website first. Calm planning underneath.</h2>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4 w-full max-w-xl mx-auto">
            <button onClick={handleSignUp} className="w-full sm:w-auto px-7 py-3.5 bg-brand text-paper font-semibold rounded-lg hover:bg-brand/90 transition-all">{user ? 'Continue your site' : 'Start your draft'}</button>
            {user ? (
              <>
                <button onClick={() => navigate('/dashboard/builder')} className="group w-full sm:w-auto px-7 py-3.5 border-2 border-brand text-brand font-semibold rounded-lg hover:bg-brand/5 transition-all inline-flex items-center justify-center gap-2">
                  Edit your site
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </button>
                <button onClick={() => navigate('/dashboard/guests')} className="group w-full sm:w-auto px-7 py-3.5 border-2 border-brand text-brand font-semibold rounded-lg hover:bg-brand/5 transition-all inline-flex items-center justify-center gap-2">
                  Manage guests
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </button>
                <button onClick={() => navigate('/dashboard/messages')} className="group w-full sm:w-auto px-7 py-3.5 border-2 border-brand text-brand font-semibold rounded-lg hover:bg-brand/5 transition-all inline-flex items-center justify-center gap-2">
                  Guest messages
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </button>
                <button onClick={() => navigate('/dashboard/rsvp-board')} className="group w-full sm:w-auto px-7 py-3.5 border-2 border-brand text-brand font-semibold rounded-lg hover:bg-brand/5 transition-all inline-flex items-center justify-center gap-2">
                  Open RSVP board
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </button>
              </>
            ) : (
              <button onClick={handleDemoLogin} disabled={demoLoading} className="group w-full sm:w-auto px-7 py-3.5 border-2 border-brand text-brand font-semibold rounded-lg hover:bg-brand/5 transition-all disabled:opacity-60 inline-flex items-center justify-center gap-2">
                {demoLoading ? 'Opening demo...' : 'Try product demo'}
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            )}
          </div>
          <p className="text-sm text-ink/65">
            Or{' '}
            <Link to={user ? '/dashboard/builder' : '/templates'} className="text-brand font-semibold hover:underline">
              {user ? 'edit your site' : 'browse templates'}
            </Link>
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
};
