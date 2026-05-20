import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Footer, Header } from '../components/layout';
import { useAuth } from '../hooks/useAuth';
import { SITE_TRUST_COPY } from '../lib/siteTrustCopy';

const TRUST_PILLARS = [
  {
    title: 'Clear pricing',
    body: 'The main product offer is a flat $49 payment for two years. Auto-renew is off by default. No fake low entry tier that collapses once the real work starts.',
  },
  {
    title: 'Beautiful site plus real operations',
    body: 'DayOf is not just a brochure page. The product is meant to carry the wedding website, RSVPs, guest management, review-before-send messaging, seating, travel details, and day-of coordination together, with any still-open proof gaps called out plainly instead of marketed away.',
  },
  {
    title: 'Guest access handled carefully',
    body: `${SITE_TRUST_COPY.guestAccessTruth} Search visibility and guest access are not the same thing, and we should not pretend that means a whole separate unpublished product exists when it does not.`,
  },
  {
    title: 'AI helps draft, not secretly operate',
    body: 'AI-backed features can help shape drafts and setup outputs using known wedding data, but couples still review, edit, and decide what gets published or sent.',
  },
];

const SAFETY_NOTES = [
  `${SITE_TRUST_COPY.customWeddingUrlExplainer} External custom-domain mapping is not something we claim unless it is actually live.`,
  SITE_TRUST_COPY.reviewBeforeSendMessaging,
  'Registry repair and cleanup are guided workflows with human review, not a guaranteed one-click fix for every merchant.',
  'Planner collaboration is intentionally couple-led, with clearer boundaries instead of pretending this is enterprise workflow software.',
];

const V1_TRUST_LINE = [
  {
    title: 'Core v1 claim',
    badge: 'Must ship',
    tone: 'must',
    body: `DayOf should be judged on whether couples can build a polished wedding site draft before sharing it with guests, collect RSVPs, manage guests, send core updates, run seating, and coordinate the event week from one grounded product story. The hard launch line is ${SITE_TRUST_COPY.launchStoryCore}, with any remaining proof gaps called out plainly instead of marketed away.`,
  },
  {
    title: 'Real product direction',
    badge: 'Should ship',
    tone: 'should',
    body: 'Photo return paths, archive mode, anniversary memory layers, and name-change support can be meaningful, but they should not be used to fake a broader launch claim than the core wedding workflow has earned.',
  },
  {
    title: 'Not part of the current promise',
    badge: 'Cut from promise',
    tone: 'cut',
    body: 'We should not imply external custom domains, advanced analytics, enterprise workflow governance, or magical one-click automation unless those things are actually proven live.',
  },
] as const;

const V1_SLICE_STATUS = [
  {
    name: 'Public site + trust',
    status: 'Proof needed',
    tone: 'proof',
    done: 'Launch/privacy wording and runtime trust are materially tighter now.',
    missing: 'Still needs one canonical public-path smoke and captured proof.',
  },
  {
    name: 'Guests + RSVP',
    status: 'Proof needed',
    tone: 'proof',
    done: 'Core guest + RSVP flow is broad and recent continuity seams were fixed.',
    missing: 'Still needs one guest -> RSVP -> dashboard proof run without state drift, and strict RSVP ops proof is currently env-blocked.',
  },
  {
    name: 'Planner access',
    status: 'Proof needed',
    tone: 'proof',
    done: 'Invite flow, shell framing, and permission truth are much more believable.',
    missing: 'Still needs executed role-boundary proof with a real forbidden-action check before this slice reads fully proven.',
  },
  {
    name: 'Coordinator / day-of',
    status: 'Proof needed',
    tone: 'proof',
    done: 'Coordinator mode is pointed at real event-week questions, not fake dashboard theater.',
    missing: 'Still needs a realistic proof run under actual coordinator flow before this slice reads fully proven.',
  },
  {
    name: 'Comms center',
    status: 'Must prove',
    tone: 'risk',
    done: 'Draft/schedule/history surface exists with tighter permission truth.',
    missing: 'Still needs proof that send-state and history stay stable before this slice carries broader launch claims.',
  },
  {
    name: 'Seating',
    status: 'Proof needed',
    tone: 'proof',
    done: 'Planner, lookup, and event-scoped logic are materially there.',
    missing: 'Still needs RSVP-backed assign/lookup proof without count drift.',
  },
  {
    name: 'Registry',
    status: 'Must prove',
    tone: 'risk',
    done: 'Add/import/edit/repair flows are real enough to use already.',
    missing: 'Still needs harder purchased-state and reliability proof before broader claims.',
  },
  {
    name: 'Onboarding',
    status: 'Must prove',
    tone: 'risk',
    done: 'First-run path exists and its trust copy is now materially more honest.',
    missing: 'Still needs one hard first-run proof pass from entry to usable site/dashboard state.',
  },
] as const;

export const Trust: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleStartDraft = () => {
    if (user) {
      navigate('/dashboard/builder');
      return;
    }

    navigate('/signup');
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-text-primary">
      <Header />

      <main className="flex-1">
        <section className="border-b border-border-subtle bg-white px-6 py-16 md:py-20">
          <div className="mx-auto max-w-5xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-tertiary">Trust</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-text-primary md:text-5xl">
              Built to make wedding planning feel calmer, not more manipulative.
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-text-secondary md:text-lg">
              The bar here is simple: say what is real, ship the parts couples actually need, and stop doing the wedding-tech bullshit where basic functionality turns into upsells and surprise gotchas.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 text-sm text-text-secondary">
              <span className="rounded-full border border-border bg-surface px-3 py-1.5">No surprise renewals</span>
              <span className="rounded-full border border-border bg-surface px-3 py-1.5">Truth over marketing fluff</span>
              <span className="rounded-full border border-border bg-surface px-3 py-1.5">Review-before-send AI</span>
              <span className="rounded-full border border-border bg-surface px-3 py-1.5">Guest ops that actually matter</span>
            </div>
          </div>
        </section>

        <section className="px-6 py-14 md:py-16">
          <div className="mx-auto max-w-5xl">
            <div className="grid gap-4 md:grid-cols-2">
              {TRUST_PILLARS.map((item) => (
                <div key={item.title} className="rounded-3xl border border-border-subtle bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-semibold text-text-primary">{item.title}</h2>
                  <p className="mt-3 text-sm leading-6 text-text-secondary">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-border-subtle bg-surface-subtle/30 px-6 py-14 md:py-16">
          <div className="mx-auto max-w-5xl">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-tertiary">How we keep claims honest</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-text-primary">If the product is partial, we say it is partial.</h2>
              <p className="mt-3 text-sm leading-6 text-text-secondary">
                This is the practical rule: do not overclaim. If something is guided, we call it guided. If something still depends on real delivery logs or human review, we say that too.
              </p>
            </div>

            <div className="mt-8 rounded-3xl border border-border-subtle bg-white p-6 shadow-sm">
              <ul className="space-y-3 text-sm leading-6 text-text-secondary">
                {SAFETY_NOTES.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-2 h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="px-6 py-14 md:py-16">
          <div className="mx-auto max-w-5xl">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-tertiary">Current v1 line</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-text-primary">Trust gets a lot easier when the launch claim is narrow and real.</h2>
              <p className="mt-3 text-sm leading-6 text-text-secondary">
                The point is not to sound smaller. The point is to say the true thing clearly enough that couples can trust what they are buying and the team can actually finish what it promises.
              </p>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {V1_TRUST_LINE.map((item) => {
                const toneClasses = item.tone === 'must'
                  ? 'border-emerald-200 bg-white'
                  : item.tone === 'should'
                    ? 'border-amber-200 bg-white'
                    : 'border-rose-200 bg-white';
                const badgeClasses = item.tone === 'must'
                  ? 'bg-emerald-50 text-emerald-700'
                  : item.tone === 'should'
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-rose-50 text-rose-700';

                return (
                  <div key={item.title} className={`rounded-3xl border p-6 shadow-sm ${toneClasses}`}>
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-lg font-semibold text-text-primary">{item.title}</h3>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${badgeClasses}`}>{item.badge}</span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-text-secondary">{item.body}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleStartDraft}
                className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90"
              >
                {user ? 'Review your draft' : 'Start your draft'}
              </button>
              <Link to={user ? '/dashboard/planning' : '/product'} className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition hover:border-primary/30 hover:text-primary">
                {user ? 'Open planner workspace' : 'See product tour'}
              </Link>
            </div>

            <div className="mt-10 max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-tertiary">Per-slice v1 read</p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-text-primary">What is actually done enough versus what still needs proof</h3>
              <p className="mt-3 text-sm leading-6 text-text-secondary">
                This is the harsher read behind the launch line. The product can be directionally strong and still need proof before a slice earns broader public confidence, so unfinished proof should narrow the claim instead of hiding behind polished copy.
              </p>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {V1_SLICE_STATUS.map((item) => {
                const toneClasses = item.tone === 'proof'
                    ? 'border-sky-200 bg-white'
                    : 'border-amber-200 bg-white';
                const badgeClasses = item.tone === 'proof'
                    ? 'bg-sky-50 text-sky-700'
                    : 'bg-amber-50 text-amber-700';

                return (
                  <div key={item.name} className={`rounded-3xl border p-6 shadow-sm ${toneClasses}`}>
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-lg font-semibold text-text-primary">{item.name}</h3>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${badgeClasses}`}>{item.status}</span>
                    </div>
                    <div className="mt-4 space-y-2 text-sm leading-6 text-text-secondary">
                      <p><span className="font-semibold text-text-primary">Done:</span> {item.done}</p>
                      <p><span className="font-semibold text-text-primary">Still missing:</span> {item.missing}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="px-6 py-14 md:py-16">
          <div className="mx-auto max-w-4xl rounded-3xl border border-border-subtle bg-white p-7 shadow-sm md:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-tertiary">Need the legal docs?</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-text-primary">Cool. Those should not be hidden behind fake placeholders either.</h2>
            <p className="mt-3 text-sm leading-6 text-text-secondary">
              Privacy and terms are live and reachable now. If you need product or support help, email{' '}
              <a className="text-primary underline" href="mailto:support@dayof.love">support@dayof.love</a>.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {user ? (
                <>
                  <button
                    type="button"
                    onClick={() => navigate('/settings')}
                    className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90"
                  >
                    Open account settings
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard/builder')}
                    className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition hover:border-primary/30 hover:text-primary"
                  >
                    Open your builder
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard/planning')}
                    className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition hover:border-primary/30 hover:text-primary"
                  >
                    Open planner workspace
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard/coordinator')}
                    className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition hover:border-primary/30 hover:text-primary"
                  >
                    Open coordinator workspace
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard/guests')}
                    className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition hover:border-primary/30 hover:text-primary"
                  >
                    Open guest list
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard/messages')}
                    className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition hover:border-primary/30 hover:text-primary"
                  >
                    Open message drafts
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard/rsvp-board')}
                    className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition hover:border-primary/30 hover:text-primary"
                  >
                    Open RSVP board
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard/overview')}
                    className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition hover:border-primary/30 hover:text-primary"
                  >
                    Open your dashboard
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate('/signup')}
                  className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary/90"
                >
                  Start your draft
                </button>
              )}
              <Link to="/privacy" className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition hover:border-primary/30 hover:text-primary">
                Privacy policy
              </Link>
              <Link to="/terms" className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition hover:border-primary/30 hover:text-primary">
                Terms of service
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};
