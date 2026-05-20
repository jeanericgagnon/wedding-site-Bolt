import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Footer, Header } from '../components/layout';
import { useAuth } from '../hooks/useAuth';
import { SITE_TRUST_COPY } from '../lib/siteTrustCopy';

const TRUST_PILLARS = [
  {
    title: 'Clear pricing',
    body: 'The main product offer is a flat $49 payment for two years. Auto-renew is off by default. No confusing low entry tier that falls apart once the real work starts.',
  },
  {
    title: 'Beautiful site plus real planning tools',
    body: 'dayof is not just a brochure page. The product is meant to carry the wedding website, RSVPs, guest management, review-before-send messaging, seating, travel details, and day-of coordination together, with limitations explained plainly instead of glossed over.',
  },
  {
    title: 'Guest access handled carefully',
    body: `${SITE_TRUST_COPY.guestAccessTruth} Search visibility and guest access are not the same thing, so guest-facing access stays clearly explained.`,
  },
  {
    title: 'Draft help stays reviewable',
    body: 'Smart drafting can help shape setup outputs using known wedding data, but couples still review, edit, and decide what gets published or sent.',
  },
];

const SAFETY_NOTES = [
  `${SITE_TRUST_COPY.customWeddingUrlExplainer} External custom-domain mapping stays separate unless it is actually live.`,
  SITE_TRUST_COPY.reviewBeforeSendMessaging,
  'Registry repair and cleanup include guided review, not a guaranteed one-click fix for every merchant.',
  'Planner collaboration is intentionally couple-led, with clearer boundaries than enterprise approval software.',
];

const V1_TRUST_LINE = [
  {
    title: 'Core promise',
    badge: 'Included',
    tone: 'must',
    body: `dayof should be judged on whether couples can build a polished wedding site draft before sharing it with guests, collect RSVPs, manage guests, send core updates, run seating, and keep the event week organized from one grounded wedding plan. The heart of dayof is ${SITE_TRUST_COPY.launchStoryCore}, with limitations explained plainly instead of glossed over.`,
  },
  {
    title: 'Thoughtful extras',
    badge: 'Helpful',
    tone: 'should',
    body: 'Photo return paths, archive mode, anniversary memory layers, and name-change support can be meaningful, but they should not distract from the core wedding planning couples need first.',
  },
  {
    title: 'Future or limited today',
    badge: 'Future',
    tone: 'cut',
    body: 'We should not imply external custom domains, advanced analytics, enterprise approval controls, or magical one-click automation unless those things are actually proven live.',
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
    done: 'Draft/schedule/history surface exists with tighter access truth.',
    missing: 'Texts stay locked until sender setup is complete.',
  },
  {
    name: 'Seating',
    status: 'Plan the room',
    tone: 'proof',
    done: 'Planner, lookup, and event-scoped logic are materially there.',
    missing: 'Review assignments as RSVP answers change.',
  },
  {
    name: 'Registry',
    status: 'Gift links live',
    tone: 'risk',
    done: 'Add/import/edit/repair flows are real enough to use already.',
    missing: 'Keep gift details editable when a merchant page is sparse.',
  },
  {
    name: 'Onboarding',
    status: 'Reviewable draft',
    tone: 'risk',
    done: 'First-run path exists and its trust copy is now materially more honest.',
    missing: 'Couples can edit every detail before publishing.',
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
            <p className="text-xs font-semibold text-text-tertiary">Trust</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold text-text-primary md:text-5xl">
              Built to make wedding planning feel calmer, not more manipulative.
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-text-secondary md:text-lg">
              The bar here is simple: say what is real, ship the parts couples actually need, and avoid the wedding-tech trap where basic functionality turns into upsells and surprise gotchas.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 text-sm text-text-secondary">
              <span className="rounded-xl border border-border bg-surface px-3 py-1.5">No surprise renewals</span>
              <span className="rounded-xl border border-border bg-surface px-3 py-1.5">Truth over marketing fluff</span>
              <span className="rounded-xl border border-border bg-surface px-3 py-1.5">Review before sending</span>
              <span className="rounded-xl border border-border bg-surface px-3 py-1.5">Guest details that actually matter</span>
            </div>
          </div>
        </section>

        <section className="px-6 py-14 md:py-16">
          <div className="mx-auto max-w-5xl">
            <div className="grid gap-4 md:grid-cols-2">
              {TRUST_PILLARS.map((item) => (
                <div key={item.title} className="rounded-xl border border-border-subtle bg-white p-6 shadow-sm">
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
              <p className="text-xs font-semibold text-text-tertiary">How we keep claims honest</p>
              <h2 className="mt-3 text-3xl font-semibold text-text-primary">If the product is partial, we say it is partial.</h2>
              <p className="mt-3 text-sm leading-6 text-text-secondary">
                This is the practical rule: claims should match the product. If something is guided, we call it guided. If something depends on real delivery logs or human review, we say that too.
              </p>
            </div>

            <div className="mt-8 rounded-xl border border-border-subtle bg-white p-6 shadow-sm">
              <ul className="space-y-3 text-sm leading-6 text-text-secondary">
                {SAFETY_NOTES.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-2 h-2 w-2 rounded-sm bg-primary" aria-hidden="true" />
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
              <p className="text-xs font-semibold text-text-tertiary">Current promise</p>
              <h2 className="mt-3 text-3xl font-semibold text-text-primary">Trust gets a lot easier when the promise is narrow and real.</h2>
              <p className="mt-3 text-sm leading-6 text-text-secondary">
                The point is not to sound smaller. The point is to say the true thing clearly enough that couples can trust what they are buying and the team can actually finish what it promises.
              </p>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {V1_TRUST_LINE.map((item) => {
                const toneClasses = item.tone === 'must'
                  ? 'border-border-subtle bg-white'
                  : item.tone === 'should'
                    ? 'border-border-subtle bg-white'
                    : 'border-border-subtle bg-white';
                const badgeClasses = item.tone === 'must'
                  ? 'border border-primary/15 bg-primary/5 text-primary'
                  : item.tone === 'should'
                    ? 'border border-border-subtle bg-surface text-text-secondary'
                    : 'border border-border-subtle bg-surface text-text-secondary';

                return (
                  <div key={item.title} className={`rounded-xl border p-6 shadow-sm ${toneClasses}`}>
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-lg font-semibold text-text-primary">{item.title}</h3>
                    <span className={`rounded-xl px-2.5 py-1 text-[11px] font-semibold ${badgeClasses}`}>{item.badge}</span>
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
                {user ? 'Continue your site' : 'Start your draft'}
              </button>
              <Link to={user ? '/dashboard/planning' : '/product'} className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition hover:border-primary/30 hover:text-primary">
                {user ? 'Continue planning' : 'See product tour'}
              </Link>
            </div>

            <div className="mt-10 max-w-3xl">
              <p className="text-xs font-semibold text-text-tertiary">Feature-by-feature read</p>
              <h3 className="mt-3 text-2xl font-semibold text-text-primary">What each part is meant to cover</h3>
              <p className="mt-3 text-sm leading-6 text-text-secondary">
                Each feature should feel useful without pretending couples lose control. The product keeps the core wedding flow clear and leaves final review in the couple’s hands.
              </p>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {V1_SLICE_STATUS.map((item) => {
                const toneClasses = item.tone === 'proof'
                    ? 'border-border-subtle bg-white'
                    : 'border-border-subtle bg-white';
                const badgeClasses = item.tone === 'proof'
                    ? 'border border-primary/15 bg-primary/5 text-primary'
                    : 'border border-border-subtle bg-surface text-text-secondary';

                return (
                  <div key={item.name} className={`rounded-xl border p-6 shadow-sm ${toneClasses}`}>
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-lg font-semibold text-text-primary">{item.name}</h3>
                      <span className={`rounded-xl px-2.5 py-1 text-[11px] font-semibold ${badgeClasses}`}>{item.status}</span>
                    </div>
                    <div className="mt-4 space-y-2 text-sm leading-6 text-text-secondary">
                      <p><span className="font-semibold text-text-primary">Covers:</span> {item.done}</p>
                      <p><span className="font-semibold text-text-primary">Worth checking:</span> {item.missing}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="px-6 py-14 md:py-16">
          <div className="mx-auto max-w-4xl rounded-xl border border-border-subtle bg-white p-7 shadow-sm md:p-8">
              <p className="text-xs font-semibold text-text-tertiary">Need the legal docs?</p>
              <h2 className="mt-3 text-3xl font-semibold text-text-primary">Cool. Those should be easy to find too.</h2>
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
                    Account settings
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard/builder')}
                    className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition hover:border-primary/30 hover:text-primary"
                  >
                    Edit your site
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard/planning')}
                    className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition hover:border-primary/30 hover:text-primary"
                  >
                    Continue planning
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard/coordinator')}
                    className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition hover:border-primary/30 hover:text-primary"
                  >
                    Day-of view
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard/guests')}
                    className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition hover:border-primary/30 hover:text-primary"
                  >
                    Manage guests
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard/messages')}
                    className="rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition hover:border-primary/30 hover:text-primary"
                  >
                    Guest messages
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
                    Open wedding home
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
