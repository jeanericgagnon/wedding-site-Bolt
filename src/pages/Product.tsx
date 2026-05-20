import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Header, Footer } from '../components/layout';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ui/Toast';
import { SITE_TRUST_COPY } from '../lib/siteTrustCopy';
import { ArrowRight, Calendar, CheckCircle2, Mail, Shield, Users, Wallet } from 'lucide-react';
import { HeroReveal, SlideReveal } from '../components/marketing/Reveal';

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
  { id: 'rsvp', title: 'Collect RSVPs cleanly', kicker: 'Step 3', outcome: 'Get responses without confusion.', detail: 'Event-level RSVP and meal tracking without hacks.' },
  { id: 'message', title: 'Message everyone', kicker: 'Step 4', outcome: 'Review the right update before sending it to the right group.', detail: 'Stop copy/pasting from spreadsheets to email tools while keeping send decisions in your hands.' },
  { id: 'seating', title: 'Run seating + timeline', kicker: 'Step 5', outcome: 'Plan execution without doc chaos.', detail: 'Keep tables and event flow aligned in one view.' },
  { id: 'dayof', title: 'Execute day-of', kicker: 'Step 6', outcome: 'Fewer surprises on event day.', detail: 'Use one calmer coordination view instead of juggling a pile of tabs.' },
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
    title: 'Operations',
    items: ['Guest messaging', 'Planner coordination view', 'Coordinator mode', 'Dashboard overview', 'Planning workspace', 'Settings + preferences'],
  },
  {
    title: 'Adjacent, not carrying v1',
    items: ['Photo upload page', 'Guest memory collection', 'Archive mode foundation', 'Name-change support after the wedding'],
  },
] as const;

const V1_STATUS_GROUPS = [
  {
    title: 'Core v1 today',
    tone: 'must',
    intro: 'This is the product line DayOf should actually be judged on right now.',
    items: [
      'Build a polished wedding site draft with honest privacy + access controls before sharing it with guests',
      'Run guest list, households, RSVP, meals, and event invites in one place',
      'Handle core wedding messaging without spreadsheet-to-email-tool chaos',
      'Use seating, itinerary, and coordination views to run the event week calmly',
      'Invite a planner or coordinator into a role-aware workspace',
    ],
  },
  {
    title: 'Should ship, but not carry the launch claim',
    tone: 'should',
    intro: 'These matter, but they should not be used to fake a broader v1 than the core product has earned.',
    items: [
      'Guest photo collection and post-wedding memory paths',
      'Archive mode and anniversary-facing memory layers',
      'Name-change planning support after the wedding',
    ],
  },
  {
    title: 'Explicitly not part of the current v1 promise',
    tone: 'cut',
    intro: 'If these are not fully proven, they should stay out of the sales story instead of hanging around as wishful blur.',
    items: [
      'External custom domains as a launch expectation',
      'Advanced analytics as a major product promise',
      'Fully automated migration, reminders, or merchant syncing',
      'Enterprise workflow governance or full event-control software claims',
    ],
  },
] as const;

const V1_SLICE_STATUS = [
  {
    name: 'Public site + trust',
    status: 'Proof needed',
    tone: 'proof',
    done: 'Launch/privacy surfaces are materially tighter.',
    missing: 'One canonical public-path smoke and final claim discipline.',
  },
  {
    name: 'Guests + RSVP',
    status: 'Proof needed',
    tone: 'proof',
    done: 'Core guest/RSVP breadth exists and recent trust seams were fixed.',
    missing: 'Still needs one guest -> RSVP -> dashboard continuity proof, and the strict RSVP ops proof is currently env-blocked.',
  },
  {
    name: 'Planner access',
    status: 'Proof needed',
    tone: 'proof',
    done: 'Invite + role-aware shell are far more honest now.',
    missing: 'Still needs role-boundary smoke with a real restricted-action failure before this slice reads fully proven.',
  },
  {
    name: 'Coordinator / day-of',
    status: 'Proof needed',
    tone: 'proof',
    done: 'Coordinator mode exists around real event-day questions.',
    missing: 'Still needs a realistic proof run before this slice reads fully proven.',
  },
  {
    name: 'Comms center',
    status: 'Must prove',
    tone: 'risk',
    done: 'Draft/schedule/history surface is there.',
    missing: 'Needs proof that send-state is stable enough before this slice carries broader launch claims.',
  },
  {
    name: 'Seating',
    status: 'Proof needed',
    tone: 'proof',
    done: 'Planner + lookup surface exist.',
    missing: 'Needs RSVP-backed assign/lookup proof without count drift.',
  },
  {
    name: 'Registry',
    status: 'Must prove',
    tone: 'risk',
    done: 'Real add/import/edit work already exists.',
    missing: 'Needs purchased-state reliability proof.',
  },
  {
    name: 'Onboarding',
    status: 'Must prove',
    tone: 'risk',
    done: 'Gets couples into the product directionally.',
    missing: 'Needs a hard first-run proof pass and tighter promise discipline.',
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
      const message = err instanceof Error ? err.message : 'Demo login failed. Please try again.';
      toast(message, 'error');
      setDemoLoading(false);
    }
  };

  const current = useMemo(() => STEPS.find((s) => s.id === activeStep) ?? STEPS[0], [activeStep]);

  const renderCanvas = () => {
    if (activeStep === 'launch') {
      return (
        <div className="space-y-4">
          <p className="text-sm text-ink/70">Template: Modern Luxe • Website: starter draft is ready to review before sharing it with guests</p>
          <button onClick={handleLaunchStepReview} className="px-5 py-2.5 rounded-xl bg-brand text-paper font-semibold">Review draft privacy + share settings</button>
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
        <p className="text-sm text-ink/70">Planner command view: checklist ready, timeline in view, messaging draft prepared.</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={user ? () => navigate('/dashboard/planning') : handleSignUp}
            className="px-4 py-2 rounded-lg border border-brand/40 hover:bg-brand/5"
          >
            {user ? 'Open planner workspace' : 'Start your draft'}
          </button>
          {user && (
            <button
              onClick={() => navigate('/settings')}
              className="px-4 py-2 rounded-lg border border-brand/40 hover:bg-brand/5"
            >
              Open collaboration settings
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
          <p className="font-medium">{user ? 'Ready to keep shaping your draft?' : 'Want to see the full flow in action?'}</p>
          {user ? (
            <button
              onClick={() => navigate('/dashboard/builder')}
              className="px-4 py-1.5 rounded-lg bg-white text-brand font-semibold hover:bg-white/90"
            >
              Open your builder
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
            <h2 className="text-[2rem] md:text-[2.6rem] font-serif font-bold mb-2">See the actual v1 spine, not the wishlist.</h2>
            <p className="text-ink/70">Start with a beautiful site, then move into guests, RSVPs, messaging, seating, and day-of execution without switching tools constantly.</p>
          </SlideReveal>

          <div className="grid grid-cols-1 lg:grid-cols-[260px,1fr,260px] gap-4 lg:gap-5">
            <div className="rounded-2xl border border-border-subtle bg-surface p-3 h-fit overflow-x-auto lg:sticky lg:top-24">
              <div className="flex gap-2 lg:block min-w-max lg:min-w-0">
              {STEPS.map((step) => (
                <button
                  key={step.id}
                  onClick={() => setActiveStep(step.id)}
                  className={`w-[220px] lg:w-full text-left rounded-xl p-3 mb-0 lg:mb-2 border transition-all shrink-0 ${activeStep === step.id ? 'bg-brand text-paper border-brand' : 'bg-white text-ink border-border-subtle hover:border-brand/45'}`}
                >
                  <p className={`text-[11px] font-semibold ${activeStep === step.id ? 'text-paper/80' : 'text-brand'}`}>{step.kicker}</p>
                  <p className="font-semibold text-sm">{step.title}</p>
                </button>
              ))}
              </div>
            </div>

            <div className="rounded-2xl border border-border-subtle bg-white p-5 md:p-7 text-ink">
              <p className="text-xs font-semibold text-brand mb-2">{current.kicker}</p>
              <h3 className="text-[1.45rem] font-serif font-bold mb-2">{current.title}</h3>
              <p className="text-ink/80 mb-1">{current.outcome}</p>
              <p className="text-sm text-ink/65 mb-6">{current.detail}</p>

              <div className="rounded-xl border border-border-subtle bg-surface p-5 mb-6 min-h-[160px]">
                {renderCanvas()}
              </div>

              <div className="flex flex-wrap gap-3">
                <button onClick={handleSignUp} className="px-5 py-2.5 bg-brand text-paper rounded-xl font-semibold">{user ? 'Review your draft' : 'Start your draft'}</button>
                {user ? (
                  <button onClick={() => navigate('/dashboard/builder')} className="group px-5 py-2.5 border-2 border-brand text-brand rounded-xl font-semibold inline-flex items-center gap-2">
                    Open your builder
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </button>
                ) : (
                  <button onClick={handleDemoLogin} disabled={demoLoading} className="group px-5 py-2.5 border-2 border-brand text-brand rounded-xl font-semibold inline-flex items-center gap-2 disabled:opacity-60">
                    {demoLoading ? 'Opening demo...' : 'Try full demo'}
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-border-subtle bg-surface p-4 text-ink h-fit lg:sticky lg:top-24">
              <p className="text-xs uppercase tracking-wide text-ink/65 mb-2">What updates as you go</p>
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
          <div className="rounded-2xl border border-border-subtle bg-surface p-6 md:p-7">
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-wide text-brand font-semibold">Switching story</p>
              <h2 className="text-2xl md:text-3xl font-serif font-bold text-ink mt-2">If you already started elsewhere, DayOf is strongest when you move the core wedding spine.</h2>
              <p className="mt-3 text-ink/75">This is not a promise that every edge case migrates itself. The credible move today is the important stuff: a better wedding site, cleaner guest operations, and calmer execution in one place.</p>
            </div>
            <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
              {['Move your guest list and essential wedding details', 'Keep the website polished while you tighten launch details', 'Upgrade into RSVP, seating, messaging, and day-of ops'].map((item) => (
                <div key={item} className="rounded-xl border border-border bg-white p-4 text-sm text-ink/75">• {item}</div>
              ))}
            </div>
          </div>
        </div>
      </section>


      <section className="section-shell bg-white border-t border-border-subtle">
        <div className="container-custom max-w-6xl">
          <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-6 md:p-7">
            <p className="text-xs uppercase tracking-wide text-amber-700 font-semibold">Beyond the core v1 line</p>
            <h2 className="text-2xl md:text-3xl font-serif font-bold text-ink mt-2">Post-wedding memory layers matter — they just should not pretend to be the launch claim.</h2>
            <p className="mt-3 max-w-3xl text-ink/75">Archive mode, photo return paths, and anniversary-style memories are real product direction. They are not the current bar DayOf should ask couples to trust first. The launch story is {SITE_TRUST_COPY.launchStoryCore}.</p>
            <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-xl border border-amber-200 bg-white p-4">
                <p className="text-sm font-medium text-ink">Archive mode</p>
                <p className="mt-1 text-sm text-ink/70">Worth building, but not a reason to blur the current v1 promise.</p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-white p-4">
                <p className="text-sm font-medium text-ink">Photo return path</p>
                <p className="mt-1 text-sm text-ink/70">Good adjacent value once the core wedding flow is nailed.</p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-white p-4">
                <p className="text-sm font-medium text-ink">Anniversary memories</p>
                <p className="mt-1 text-sm text-ink/70">Interesting future layer, not part of the hard launch bar today.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section-shell bg-white">
        <div className="container-custom max-w-6xl mb-6 space-y-4">
          <div className="rounded-2xl border border-border-subtle bg-surface p-6 md:p-7">
            <p className="text-xs uppercase tracking-wide text-brand font-semibold">Couple-led collaboration</p>
            <h2 className="text-2xl md:text-3xl font-serif font-bold text-ink mt-2">Invite your planner gracefully, without turning your wedding into a back office.</h2>
            <p className="mt-3 max-w-3xl text-ink/75">DayOf should let the couple bring in a planner or coordinator from a calm, tasteful settings flow, share the right operational surfaces, and keep ownership where it belongs.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              {user ? (
                <>
                  <button
                    type="button"
                    onClick={() => navigate('/settings')}
                    className="rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-paper transition hover:bg-brand/90"
                  >
                    Open collaboration settings
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard/planning')}
                    className="rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-medium text-ink transition hover:border-brand/30 hover:text-brand"
                  >
                    Open planner workspace
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard/coordinator')}
                    className="rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-medium text-ink transition hover:border-brand/30 hover:text-brand"
                  >
                    Open coordinator workspace
                  </button>
                </>
              ) : (
                <Link to="/trust" className="rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-medium text-ink transition hover:border-brand/30 hover:text-brand">
                  See collaboration trust notes
                </Link>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-xl border border-border-subtle bg-white p-4">
              <p className="text-sm font-medium text-ink">Starts from the couple</p>
              <p className="mt-1 text-sm text-ink/70">Planner access begins in Settings with a named invite, role preset, and a clean permissions preview, but it still needs executed role-boundary proof before this slice reads fully proven.</p>
            </div>
            <div className="rounded-xl border border-border-subtle bg-white p-4">
              <p className="text-sm font-medium text-ink">Planner workspace is real</p>
              <p className="mt-1 text-sm text-ink/70">Guests, planning, messages, and coordinator mode now carry planner-specific framing instead of forcing every collaborator through a couple-only view, but the role boundaries still need executed proof before this slice reads fully proven.</p>
            </div>
            <div className="rounded-xl border border-border-subtle bg-white p-4">
              <p className="text-sm font-medium text-ink">Permissions actually differ</p>
              <p className="mt-1 text-sm text-ink/70">Budget/vendor editing stays tighter than coordination work, so collaboration is useful without getting sloppy.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section-shell bg-paper">        <div className="container-custom max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: Shield, title: 'Beautiful by default', text: 'Starts polished without endless tweaking.' },
            { icon: Wallet, title: 'Clear pricing', text: 'No hidden tiers. No renewal gotchas.' },
            { icon: Mail, title: 'Built-in comms', text: 'Keep guests synced with review-before-send drafts instead of duct tape.' },
            { icon: Users, title: 'Guest logic that scales', text: 'Households and plus-ones stay sane.' },
            { icon: Calendar, title: 'Day-of readiness', text: 'Timeline and execution stay aligned.' },
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
            <p className="text-ink/70">This is the current DayOf product shape with the launch line separated from adjacent product direction. Core wedding execution gets top billing; post-wedding and sidecar layers do not.</p>
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
            <p className="text-xs uppercase tracking-wide text-brand font-semibold">Ruthless v1 line</p>
            <h2 className="text-2xl md:text-3xl font-serif font-bold text-ink mt-2">What counts as the real launch claim right now</h2>
            <p className="mt-3 max-w-3xl text-ink/75">DayOf should be judged on whether the core wedding flow is grounded where proof exists, with the remaining gaps called out plainly instead of blurred into the v1 line. Some surrounding slices are real product direction, but they should not get to pad the current v1 line.</p>
          </SlideReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {V1_SLICE_STATUS.map((slice) => {
              const toneClasses = slice.tone === 'proof'
                  ? 'border-sky-200 bg-white'
                  : 'border-amber-200 bg-white';
              const badgeClasses = slice.tone === 'proof'
                  ? 'bg-sky-50 text-sky-700'
                  : 'bg-amber-50 text-amber-700';

              return (
                <div key={slice.name} className={`rounded-2xl border p-5 ${toneClasses}`}>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <h3 className="font-semibold text-ink">{slice.name}</h3>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${badgeClasses}`}>{slice.status}</span>
                  </div>
                  <div className="space-y-2 text-sm text-ink/80">
                    <p><span className="font-semibold text-ink">Done:</span> {slice.done}</p>
                    <p><span className="font-semibold text-ink">Still missing:</span> {slice.missing}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {V1_STATUS_GROUPS.map((group) => {
              const toneClasses = group.tone === 'must'
                ? 'border-emerald-200 bg-white'
                : group.tone === 'should'
                  ? 'border-amber-200 bg-white'
                  : 'border-rose-200 bg-white';
              const badgeClasses = group.tone === 'must'
                ? 'bg-emerald-50 text-emerald-700'
                : group.tone === 'should'
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-rose-50 text-rose-700';
              const badgeText = group.tone === 'must' ? 'Must ship' : group.tone === 'should' ? 'Should ship' : 'Cut from promise';

              return (
                <div key={group.title} className={`rounded-2xl border p-5 ${toneClasses}`}>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <h3 className="font-semibold text-ink">{group.title}</h3>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${badgeClasses}`}>{badgeText}</span>
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
          <h2 className="section-title mb-3">A beautiful website first. Calm execution underneath.</h2>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4 w-full max-w-xl mx-auto">
            <button onClick={handleSignUp} className="w-full sm:w-auto px-7 py-3.5 bg-brand text-paper font-semibold rounded-2xl hover:bg-brand/90 transition-all">{user ? 'Review your draft' : 'Start your draft'}</button>
            {user ? (
              <>
                <button onClick={() => navigate('/dashboard/builder')} className="group w-full sm:w-auto px-7 py-3.5 border-2 border-brand text-brand font-semibold rounded-2xl hover:bg-brand/5 transition-all inline-flex items-center justify-center gap-2">
                  Open your builder
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </button>
                <button onClick={() => navigate('/dashboard/guests')} className="group w-full sm:w-auto px-7 py-3.5 border-2 border-brand text-brand font-semibold rounded-2xl hover:bg-brand/5 transition-all inline-flex items-center justify-center gap-2">
                  Open guest list
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </button>
                <button onClick={() => navigate('/dashboard/messages')} className="group w-full sm:w-auto px-7 py-3.5 border-2 border-brand text-brand font-semibold rounded-2xl hover:bg-brand/5 transition-all inline-flex items-center justify-center gap-2">
                  Open message drafts
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </button>
                <button onClick={() => navigate('/dashboard/rsvp-board')} className="group w-full sm:w-auto px-7 py-3.5 border-2 border-brand text-brand font-semibold rounded-2xl hover:bg-brand/5 transition-all inline-flex items-center justify-center gap-2">
                  Open RSVP board
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </button>
              </>
            ) : (
              <button onClick={handleDemoLogin} disabled={demoLoading} className="group w-full sm:w-auto px-7 py-3.5 border-2 border-brand text-brand font-semibold rounded-2xl hover:bg-brand/5 transition-all disabled:opacity-60 inline-flex items-center justify-center gap-2">
                {demoLoading ? 'Opening demo...' : 'Try product demo'}
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            )}
          </div>
          <p className="text-sm text-ink/65">
            Or{' '}
            <Link to={user ? '/dashboard/builder' : '/templates'} className="text-brand font-semibold hover:underline">
              {user ? 'open your builder' : 'browse templates'}
            </Link>
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
};
