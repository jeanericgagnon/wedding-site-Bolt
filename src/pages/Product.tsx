import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Header, Footer } from '../components/layout';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ui/Toast';
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
  { id: 'launch', title: 'Launch a site you’re proud to share', kicker: 'Step 1', outcome: 'Share a polished private preview fast, then go live when you are ready.', detail: 'Start with a strong template, clear setup, and a clean path from draft to private preview to go live.' },
  { id: 'guests', title: 'Organize guests + households', kicker: 'Step 2', outcome: 'Know who is invited and where they belong.', detail: 'Households, plus-ones, and statuses in one place.' },
  { id: 'rsvp', title: 'Collect RSVPs cleanly', kicker: 'Step 3', outcome: 'Get responses without confusion.', detail: 'Event-level RSVP and meal tracking without hacks.' },
  { id: 'message', title: 'Message everyone', kicker: 'Step 4', outcome: 'Send the right update to the right group.', detail: 'Stop copy/pasting from spreadsheets to email tools.' },
  { id: 'seating', title: 'Run seating + timeline', kicker: 'Step 5', outcome: 'Plan execution without doc chaos.', detail: 'Keep tables and event flow aligned in one view.' },
  { id: 'dayof', title: 'Execute day-of', kicker: 'Step 6', outcome: 'Fewer surprises on event day.', detail: 'Use one command center instead of six tabs.' },
];

const FEATURE_AUDIT_GROUPS = [
  {
    title: 'Public experience',
    items: ['Wedding site templates', 'Public RSVP page', 'Event-specific RSVP', 'Photo upload page', 'Anniversary vault contribution'],
  },
  {
    title: 'Planning core',
    items: ['Guest households + plus-ones', 'Multi-event RSVP + meal tracking', 'Itinerary + travel details', 'Seating planner + lookup', 'Registry links + gifting'],
  },
  {
    title: 'Operations',
    items: ['Guest messaging', 'Coordinator mode', 'Dashboard overview', 'Planning workspace', 'Settings + preferences'],
  },
  {
    title: 'What couples actually use',
    items: ['Drag-and-drop seating chart', 'Seat finder lookup for guests and staff', 'Day-of coordinator mode', 'RSVP board with live status', 'Planning hub for tasks + decisions', 'Guest photo sharing space'],
  },
] as const;

export const Product: React.FC = () => {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const { toast } = useToast();
  const [demoLoading, setDemoLoading] = useState(false);
  const [activeStep, setActiveStep] = useState<StepId>('launch');

  const [guestCount, setGuestCount] = useState(86);
  const [rsvpYes, setRsvpYes] = useState(54);
  const [messageState, setMessageState] = useState<'draft' | 'sent'>('draft');
  const [seated, setSeated] = useState(42);

  const handleSignUp = () => navigate('/templates');

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
          <p className="text-sm text-ink/70">Template: Modern Luxe • Website: draft is ready for private preview or go live</p>
          <button className="px-5 py-2.5 rounded-xl bg-brand text-paper font-semibold">Go live</button>
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
          <p className="text-sm text-ink/70">Status: <strong>{messageState === 'draft' ? 'Ready to send' : 'Sent to 86 guests'}</strong></p>
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
        <p className="text-sm text-ink/70">Day-of mode: checklist live, timeline synced, messaging armed.</p>
        <button className="px-4 py-2 rounded-lg border border-brand/40 hover:bg-brand/5">Open coordinator mode</button>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink">
      <Header />

      <section className="py-3 border-b border-border-subtle bg-brand text-paper">
        <div className="container-custom max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-2 text-sm">
          <p className="font-medium">Want to see the full flow in action?</p>
          <button
            onClick={handleDemoLogin}
            disabled={demoLoading}
            className="px-4 py-1.5 rounded-lg bg-white text-brand font-semibold hover:bg-white/90 disabled:opacity-60"
          >
            {demoLoading ? 'Opening demo...' : 'Try live demo'}
          </button>
        </div>
      </section>

      <section className="py-10 md:py-14 bg-paper text-ink">
        <div className="container-custom max-w-7xl">
          <SlideReveal from="left" className="mb-8">
            <h2 className="text-[2rem] md:text-[2.6rem] font-serif font-bold mb-2">See how the website leads everything else.</h2>
            <p className="text-ink/70">Start with a beautiful site, then move naturally into guests, RSVPs, messaging, seating, and day-of details.</p>
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
                <button onClick={handleSignUp} className="px-5 py-2.5 bg-brand text-paper rounded-xl font-semibold">Start your site</button>
                <button onClick={handleDemoLogin} disabled={demoLoading} className="group px-5 py-2.5 border-2 border-brand text-brand rounded-xl font-semibold inline-flex items-center gap-2 disabled:opacity-60">
                  {demoLoading ? 'Opening demo...' : 'Try full demo'}
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </button>
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

      <section className="section-shell bg-paper">
        <div className="container-custom max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: Shield, title: 'Beautiful by default', text: 'Starts polished without endless tweaking.' },
            { icon: Wallet, title: 'Clear pricing', text: 'No hidden tiers. No renewal gotchas.' },
            { icon: Mail, title: 'Built-in comms', text: 'Keep guests synced without duct tape.' },
            { icon: Users, title: 'Guest logic that scales', text: 'Households and plus-ones stay sane.' },
            { icon: Calendar, title: 'Day-of readiness', text: 'Timeline and execution stay aligned.' },
            { icon: CheckCircle2, title: 'Clear path to live', text: 'Less friction between signup and a site you can share.' },
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
            <h2 className="section-title mb-2">Everything you get</h2>
            <p className="text-ink/70">Everything here works together today.</p>
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

      <section className="section-shell bg-white">
        <div className="container-custom max-w-4xl text-center">
          <h2 className="section-title mb-3">A beautiful website first. Calm execution underneath.</h2>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4 w-full max-w-xl mx-auto">
            <button onClick={handleSignUp} className="w-full sm:w-auto px-7 py-3.5 bg-brand text-paper font-semibold rounded-2xl hover:bg-brand/90 transition-all">Start your site</button>
            <button onClick={handleDemoLogin} disabled={demoLoading} className="group w-full sm:w-auto px-7 py-3.5 border-2 border-brand text-brand font-semibold rounded-2xl hover:bg-brand/5 transition-all disabled:opacity-60 inline-flex items-center justify-center gap-2">
              {demoLoading ? 'Opening demo...' : 'Try live demo'}
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
          <p className="text-sm text-ink/65">
            Or <Link to="/templates" className="text-brand font-semibold hover:underline">browse templates</Link>
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
};
