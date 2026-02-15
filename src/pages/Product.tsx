import React, { useState } from 'react';
import { Header, Footer } from '../components/layout';
import { Button, Card, CardContent, Badge } from '../components/ui';
import {
  Heart,
  Clock,
  Users,
  Image,
  Calendar,
  CheckCircle2,
  Globe,
  Shield,
  Sparkles,
  Camera,
  Mail,
  MapPin,
  AlertTriangle,
  UserPlus,
  Lock,
  Bell,
  ChevronRight,
  ChevronLeft,
  Zap,
  FileText,
  DollarSign,
  Plane,
  Utensils,
  QrCode,
  Download,
  Upload,
  Check,
  X,
  ChevronDown,
  MessageSquare,
  Wallet,
  Hotel,
  ClipboardCheck,
  BarChart,
  Palette,
  Send,
  ArrowRight,
} from 'lucide-react';

interface Toast {
  id: number;
  message: string;
}

const ToastContainer: React.FC<{ toasts: Toast[]; onRemove: (id: number) => void }> = ({ toasts, onRemove }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="bg-surface-raised border border-border shadow-lg rounded-lg p-4 min-w-[300px] animate-fade-in"
        >
          <p className="text-sm text-ink">{toast.message}</p>
        </div>
      ))}
    </div>
  );
};

export const Product: React.FC = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [activeTab, setActiveTab] = useState<string>('guests');
  const [rsvpStep, setRsvpStep] = useState<number>(1);
  const [carouselIndex, setCarouselIndex] = useState(0);

  const onTodo = (message: string) => {
    console.log('TODO:', message);
    const newToast: Toast = {
      id: Date.now(),
      message: `TODO: ${message}`,
    };
    setToasts((prev) => [...prev, newToast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
    }, 2000);
  };

  const applyPalette = (palette: { name: string; brand: string; brand2: string; accent: string; paper: string; ink: string }) => {
    const root = document.documentElement;
    root.style.setProperty('--brand', palette.brand);
    root.style.setProperty('--brand-2', palette.brand2);
    root.style.setProperty('--accent', palette.accent);
    root.style.setProperty('--paper', palette.paper);
    root.style.setProperty('--ink', palette.ink);

    const newToast: Toast = {
      id: Date.now(),
      message: `Applied ${palette.name} palette`,
    };
    setToasts((prev) => [...prev, newToast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
    }, 2000);
  };

  const resetPalette = () => {
    const root = document.documentElement;
    root.style.setProperty('--brand', '42 93 103');
    root.style.setProperty('--brand-2', '200 159 86');
    root.style.setProperty('--accent', '215 121 93');
    root.style.setProperty('--paper', '246 243 238');
    root.style.setProperty('--ink', '34 34 34');

    const newToast: Toast = {
      id: Date.now(),
      message: 'Reset to default palette',
    };
    setToasts((prev) => [...prev, newToast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
    }, 2000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink">
      <Header />
      <ToastContainer toasts={toasts} onRemove={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />

      {/* HERO */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-paper to-white">
        <div className="container-custom">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-ink mb-6">
              Complete Product Tour
            </h1>
            <p className="text-lg md:text-xl text-ink/70 mb-8">
              Explore every feature, demo the RSVP flow, browse templates, and see how we engineered around the common failures of wedding sites.
            </p>
          </div>
        </div>
      </section>

      {/* PAIN → FIX CAROUSEL */}
      <section id="engineering" className="py-16 md:py-20 bg-paper">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">
              Wedding sites fail in <span className="text-brand">predictable ways</span>. We engineered around them.
            </h2>
          </div>

          <div className="relative">
            {(() => {
              const items = [
                { icon: Users, title: 'Household mapping errors', desc: 'Group guests properly from day one.' },
                { icon: UserPlus, title: 'Plus-one logic breaks', desc: 'Control exactly who can bring a date.' },
                { icon: Lock, title: 'Multi-event permission leakage', desc: 'Separate ceremony and reception guests cleanly.' },
                { icon: Clock, title: 'RSVP deadline ambiguity', desc: 'Clear cutoffs with timezone handling.' },
                { icon: AlertTriangle, title: 'Duplicate guest submissions', desc: 'Prevent accidental double RSVPs.' },
                { icon: Shield, title: 'Privacy/indexing accidentally public', desc: 'Private by default, not opt-in.' },
                { icon: Bell, title: 'SMS/email consent gaps', desc: 'Built-in compliance for messaging.' },
                { icon: Globe, title: 'Timezone/DST mistakes', desc: 'Smart time handling across locations.' },
                { icon: DollarSign, title: 'Registry link rot', desc: 'Maintain links that don\'t break.' },
                { icon: Camera, title: 'Photo upload app friction', desc: 'No app required for guests.' },
                { icon: FileText, title: 'CSV import mapping nightmares', desc: 'Intelligent column detection.' },
                { icon: AlertTriangle, title: 'Account recovery close to wedding week', desc: 'Multiple recovery options built in.' },
              ];

              const totalItems = items.length;
              const maxIndex = totalItems - 1;

              const handlePrev = () => {
                setCarouselIndex((prev) => (prev === 0 ? maxIndex : prev - 1));
              };

              const handleNext = () => {
                setCarouselIndex((prev) => (prev === maxIndex ? 0 : prev + 1));
              };

              return (
                <>
                  <div className="overflow-hidden px-12">
                    <div
                      className="flex transition-transform duration-500 ease-in-out gap-6"
                      style={{
                        transform: `translateX(-${carouselIndex * (100 / 3)}%)`,
                      }}
                    >
                      {items.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex-shrink-0 w-full md:w-1/2 lg:w-1/3 px-3"
                        >
                          <Card variant="bordered" padding="md" className="h-full">
                            <div className="flex flex-col gap-3">
                              <div className="p-3 bg-primary-light rounded-lg w-fit">
                                <item.icon className="w-5 h-5 text-primary" aria-hidden="true" />
                              </div>
                              <h3 className="text-lg font-semibold text-ink">{item.title}</h3>
                              <p className="text-sm text-ink/70">{item.desc}</p>
                              <Button variant="ghost" size="sm" onClick={() => onTodo(`Learn more: ${item.title}`)}>
                                See how it works <ChevronRight className="w-4 h-4 ml-1" />
                              </Button>
                            </div>
                          </Card>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handlePrev}
                    className="absolute left-0 top-1/2 -translate-y-1/2 p-3 bg-white border-2 border-brand text-brand rounded-full hover:bg-brand hover:text-paper transition-colors shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                    aria-label="Previous slide"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleNext}
                    className="absolute right-0 top-1/2 -translate-y-1/2 p-3 bg-white border-2 border-brand text-brand rounded-full hover:bg-brand hover:text-paper transition-colors shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                    aria-label="Next slide"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>

                  <div className="flex justify-center gap-2 mt-8">
                    {items.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCarouselIndex(idx)}
                        className={`w-2.5 h-2.5 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${
                          idx === carouselIndex
                            ? 'bg-brand w-8'
                            : 'bg-brand/30 hover:bg-brand/50'
                        }`}
                        aria-label={`Go to slide ${idx + 1}`}
                        aria-current={idx === carouselIndex ? 'true' : 'false'}
                      />
                    ))}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </section>

      {/* FEATURE TABS */}
      <section id="features" className="py-16 md:py-20 bg-white">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">
              Every feature built for <span className="text-accent">trust and correctness</span>
            </h2>
          </div>

          <div className="mb-6 flex flex-wrap gap-2 justify-center">
            {[
              { id: 'guests', label: 'Guests + Households' },
              { id: 'rsvp', label: 'RSVP Engine' },
              { id: 'messaging', label: 'Messaging' },
              { id: 'travel', label: 'Travel + Itinerary' },
              { id: 'registry', label: 'Registry' },
              { id: 'seating', label: 'Seating + Check-in' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary text-white'
                    : 'bg-surface text-ink/70 hover:text-ink border border-border'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              {activeTab === 'guests' && (
                <div className="space-y-4">
                  <h3 className="text-2xl font-bold text-ink mb-4">Guests + Households</h3>
                  <ul className="space-y-3">
                    {[
                      'Import from CSV with intelligent mapping',
                      'Group guests into households automatically',
                      'Manage plus-ones per guest with clear rules',
                      'Track dietary restrictions and meal preferences',
                      'Tag guests by event permissions',
                      'Export to any format for vendors',
                    ].map((item, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                        <span className="text-ink/70">{item}</span>
                      </li>
                    ))}
                  </ul>
                  <a href="/features/guests">
                    <Button variant="primary">
                      Learn more
                    </Button>
                  </a>
                </div>
              )}

              {activeTab === 'rsvp' && (
                <div className="space-y-4">
                  <h3 className="text-2xl font-bold text-ink mb-4">RSVP Engine</h3>
                  <ul className="space-y-3">
                    {[
                      'Household-aware RSVP flow prevents confusion',
                      'Multi-event permissions with separate deadlines',
                      'Meal selection with dietary note collection',
                      'Plus-one acceptance with name capture',
                      'Automatic reminder emails before deadlines',
                      'Real-time analytics and export options',
                    ].map((item, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                        <span className="text-ink/70">{item}</span>
                      </li>
                    ))}
                  </ul>
                  <a href="/features/rsvp">
                    <Button variant="primary">
                      Learn more
                    </Button>
                  </a>
                </div>
              )}

              {activeTab === 'messaging' && (
                <div className="space-y-4">
                  <h3 className="text-2xl font-bold text-ink mb-4">Messaging</h3>
                  <ul className="space-y-3">
                    {[
                      'Email included with fair-use limits',
                      'SMS credits available for urgent updates',
                      'Segment by RSVP status, event, or household',
                      'Schedule messages for optimal delivery',
                      'Track open rates and engagement',
                      'Consent management built-in',
                    ].map((item, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                        <span className="text-ink/70">{item}</span>
                      </li>
                    ))}
                  </ul>
                  <a href="/features/messaging">
                    <Button variant="primary">
                      Learn more
                    </Button>
                  </a>
                </div>
              )}

              {activeTab === 'travel' && (
                <div className="space-y-4">
                  <h3 className="text-2xl font-bold text-ink mb-4">Travel + Itinerary</h3>
                  <ul className="space-y-3">
                    {[
                      'Hotel room blocks with cutoff dates',
                      'Multi-day itinerary with timezone support',
                      'Airport and transportation details',
                      'Venue addresses with map integration',
                      'Add-to-calendar buttons for each event',
                      'Travel FAQs and local recommendations',
                    ].map((item, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                        <span className="text-ink/70">{item}</span>
                      </li>
                    ))}
                  </ul>
                  <a href="/features/travel">
                    <Button variant="primary">
                      Learn more
                    </Button>
                  </a>
                </div>
              )}

              {activeTab === 'registry' && (
                <div className="space-y-4">
                  <h3 className="text-2xl font-bold text-ink mb-4">Registry</h3>
                  <ul className="space-y-3">
                    {[
                      'Link to existing registries (Amazon, Target, etc.)',
                      'BYOAL: Bring Your Own Affiliate Links option',
                      'Honeymoon fund with custom messaging',
                      'Charity donation options',
                      'Auto-fetch registry details from URLs',
                      'Clean presentation without sponsored clutter',
                    ].map((item, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                        <span className="text-ink/70">{item}</span>
                      </li>
                    ))}
                  </ul>
                  <a href="/features/registry">
                    <Button variant="primary">
                      Learn more
                    </Button>
                  </a>
                </div>
              )}

              {activeTab === 'seating' && (
                <div className="space-y-4">
                  <h3 className="text-2xl font-bold text-ink mb-4">Seating + Check-in</h3>
                  <ul className="space-y-3">
                    {[
                      'Visual seating chart builder',
                      'Assign guests to tables with drag-and-drop',
                      'Export seating for caterer and venue',
                      'Print place cards and table numbers',
                      'Day-of check-in mode for tracking arrivals',
                      'Offline fallback mode for poor connectivity',
                    ].map((item, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                        <span className="text-ink/70">{item}</span>
                      </li>
                    ))}
                  </ul>
                  <a href="/features/seating">
                    <Button variant="primary">
                      Learn more
                    </Button>
                  </a>
                </div>
              )}
            </div>

            <Card variant="bordered" padding="none" className="aspect-video bg-white flex items-center justify-center">
              <div className="text-center p-8">
                <BarChart className="w-16 h-16 text-ink/60 mx-auto mb-4" />
                <p className="text-ink/70">Feature screenshot preview</p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* FULL FEATURE LIST */}
      <section id="full-features" className="py-16 md:py-20 bg-paper">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">
              Everything included <span className="text-brand">(and what's coming soon)</span>
            </h2>
            <p className="text-lg text-ink/70 max-w-3xl mx-auto">
              A full-stack wedding site—built around RSVP correctness, privacy-first defaults, and calm logistics.
            </p>
            <div className="flex items-center justify-center gap-6 mt-6">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-success"></div>
                <span className="text-sm text-ink/70">Included</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-ink/20"></div>
                <span className="text-sm text-ink/70">Coming soon</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card variant="bordered" padding="lg">
              <h3 className="text-xl font-bold text-ink mb-4">Guests + Households</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                  <span className="text-ink/80">Household grouping + merging</span>
                </li>
                <li className="flex items-start gap-3">
                  <UserPlus className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                  <span className="text-ink/80">Plus-one rules (named/unnamed)</span>
                </li>
                <li className="flex items-start gap-3">
                  <Lock className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                  <span className="text-ink/80">Per-event invitation permissions</span>
                </li>
                <li className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                  <span className="text-ink/80">Duplicate prevention + dedupe</span>
                </li>
                <li className="flex items-start gap-3">
                  <Upload className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                  <span className="text-ink/80">Import CSV mapping + validation</span>
                </li>
                <li className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-ink/20 mt-0.5 flex-shrink-0" />
                  <div className="flex items-center gap-2">
                    <span className="text-ink/80">Audit trail</span>
                    <Badge variant="secondary" className="text-xs">Coming soon</Badge>
                  </div>
                </li>
              </ul>
            </Card>

            <Card variant="bordered" padding="lg">
              <h3 className="text-xl font-bold text-ink mb-4">RSVP Engine</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                  <span className="text-ink/80">Multi-event RSVP</span>
                </li>
                <li className="flex items-start gap-3">
                  <Utensils className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                  <span className="text-ink/80">Meal choices + dietary/allergens</span>
                </li>
                <li className="flex items-start gap-3">
                  <MessageSquare className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                  <span className="text-ink/80">Custom questions</span>
                </li>
                <li className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-ink/20 mt-0.5 flex-shrink-0" />
                  <div className="flex items-center gap-2">
                    <span className="text-ink/80">Deadline enforcement + late override</span>
                    <Badge variant="secondary" className="text-xs">Coming soon</Badge>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-ink/20 mt-0.5 flex-shrink-0" />
                  <div className="flex items-center gap-2">
                    <span className="text-ink/80">Confirmation screen + email/SMS</span>
                    <Badge variant="secondary" className="text-xs">Coming soon</Badge>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-ink/20 mt-0.5 flex-shrink-0" />
                  <div className="flex items-center gap-2">
                    <span className="text-ink/80">Account recovery</span>
                    <Badge variant="secondary" className="text-xs">Coming soon</Badge>
                  </div>
                </li>
              </ul>
            </Card>

            <Card variant="bordered" padding="lg">
              <h3 className="text-xl font-bold text-ink mb-4">Messaging</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Send className="w-5 h-5 text-ink/20 mt-0.5 flex-shrink-0" />
                  <div className="flex items-center gap-2">
                    <span className="text-ink/80">Email broadcast</span>
                    <Badge variant="secondary" className="text-xs">Coming soon</Badge>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-ink/20 mt-0.5 flex-shrink-0" />
                  <div className="flex items-center gap-2">
                    <span className="text-ink/80">Segmentation: non-responders, event-specific</span>
                    <Badge variant="secondary" className="text-xs">Coming soon</Badge>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <MessageSquare className="w-5 h-5 text-ink/20 mt-0.5 flex-shrink-0" />
                  <div className="flex items-center gap-2">
                    <span className="text-ink/80">SMS credits by segment</span>
                    <Badge variant="secondary" className="text-xs">Coming soon</Badge>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Bell className="w-5 h-5 text-ink/20 mt-0.5 flex-shrink-0" />
                  <div className="flex items-center gap-2">
                    <span className="text-ink/80">Opt-out/consent compliance</span>
                    <Badge variant="secondary" className="text-xs">Coming soon</Badge>
                  </div>
                </li>
              </ul>
            </Card>

            <Card variant="bordered" padding="lg">
              <h3 className="text-xl font-bold text-ink mb-4">Travel + Itinerary</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                  <span className="text-ink/80">Itinerary timeline</span>
                </li>
                <li className="flex items-start gap-3">
                  <Hotel className="w-5 h-5 text-ink/20 mt-0.5 flex-shrink-0" />
                  <div className="flex items-center gap-2">
                    <span className="text-ink/80">Hotel room block module</span>
                    <Badge variant="secondary" className="text-xs">Coming soon</Badge>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Download className="w-5 h-5 text-ink/20 mt-0.5 flex-shrink-0" />
                  <div className="flex items-center gap-2">
                    <span className="text-ink/80">Add-to-calendar ICS</span>
                    <Badge variant="secondary" className="text-xs">Coming soon</Badge>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Globe className="w-5 h-5 text-ink/20 mt-0.5 flex-shrink-0" />
                  <div className="flex items-center gap-2">
                    <span className="text-ink/80">Timezone/DST-safe times</span>
                    <Badge variant="secondary" className="text-xs">Coming soon</Badge>
                  </div>
                </li>
              </ul>
            </Card>

            <Card variant="bordered" padding="lg">
              <h3 className="text-xl font-bold text-ink mb-4">Registry</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Wallet className="w-5 h-5 text-ink/20 mt-0.5 flex-shrink-0" />
                  <div className="flex items-center gap-2">
                    <span className="text-ink/80">Universal URL add + metadata preview</span>
                    <Badge variant="secondary" className="text-xs">Coming soon</Badge>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <DollarSign className="w-5 h-5 text-ink/20 mt-0.5 flex-shrink-0" />
                  <div className="flex items-center gap-2">
                    <span className="text-ink/80">Cash fund links</span>
                    <Badge variant="secondary" className="text-xs">Coming soon</Badge>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Zap className="w-5 h-5 text-ink/20 mt-0.5 flex-shrink-0" />
                  <div className="flex items-center gap-2">
                    <span className="text-ink/80">BYOAL (bring your own affiliate links) option</span>
                    <Badge variant="secondary" className="text-xs">Coming soon</Badge>
                  </div>
                </li>
              </ul>
            </Card>

            <Card variant="bordered" padding="lg">
              <h3 className="text-xl font-bold text-ink mb-4">Seating + Check-in</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <ClipboardCheck className="w-5 h-5 text-ink/20 mt-0.5 flex-shrink-0" />
                  <div className="flex items-center gap-2">
                    <span className="text-ink/80">Seating chart builder</span>
                    <Badge variant="secondary" className="text-xs">Coming soon</Badge>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Utensils className="w-5 h-5 text-ink/20 mt-0.5 flex-shrink-0" />
                  <div className="flex items-center gap-2">
                    <span className="text-ink/80">Meal headcount export</span>
                    <Badge variant="secondary" className="text-xs">Coming soon</Badge>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <QrCode className="w-5 h-5 text-ink/20 mt-0.5 flex-shrink-0" />
                  <div className="flex items-center gap-2">
                    <span className="text-ink/80">Check-in mode + QR</span>
                    <Badge variant="secondary" className="text-xs">Coming soon</Badge>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-ink/20 mt-0.5 flex-shrink-0" />
                  <div className="flex items-center gap-2">
                    <span className="text-ink/80">Offline fallback</span>
                    <Badge variant="secondary" className="text-xs">Coming soon</Badge>
                  </div>
                </li>
              </ul>
            </Card>

            <Card variant="bordered" padding="lg" className="lg:col-span-2">
              <h3 className="text-xl font-bold text-ink mb-4">Privacy + Trust</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                <div className="flex items-start gap-3">
                  <Lock className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                  <span className="text-ink/80">Private by default</span>
                </div>
                <div className="flex items-start gap-3">
                  <Globe className="w-5 h-5 text-ink/20 mt-0.5 flex-shrink-0" />
                  <div className="flex items-center gap-2">
                    <span className="text-ink/80">Noindex control</span>
                    <Badge variant="secondary" className="text-xs">Coming soon</Badge>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                  <span className="text-ink/80">Auto-renew off by default</span>
                </div>
                <div className="flex items-start gap-3">
                  <DollarSign className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                  <span className="text-ink/80">Clear pricing/no hidden fees</span>
                </div>
              </div>
            </Card>
          </div>

          <div className="text-center">
            <Button variant="outline" size="lg" onClick={() => onTodo('View roadmap')}>
              <Calendar className="w-5 h-5 mr-2" />
              See roadmap
            </Button>
          </div>
        </div>
      </section>

      {/* RSVP DEMO */}
      <section id="rsvp-demo" className="py-16 md:py-20 bg-white">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">
              See how <span className="text-brand">RSVP actually works</span>
            </h2>
            <p className="text-lg text-ink/70">
              Multi-step, household-aware, with clear validation at each stage.
            </p>
          </div>

          <div className="max-w-2xl mx-auto">
            <Card variant="bordered" padding="lg">
              <div className="flex items-center justify-between mb-6">
                {[1, 2, 3, 4].map((step) => (
                  <div key={step} className="flex items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                        step === rsvpStep
                          ? 'bg-primary text-white'
                          : step < rsvpStep
                          ? 'bg-success text-white'
                          : 'bg-white text-ink/60'
                      }`}
                    >
                      {step < rsvpStep ? <Check className="w-4 h-4" /> : step}
                    </div>
                    {step < 4 && (
                      <div
                        className={`w-12 h-0.5 mx-2 ${
                          step < rsvpStep ? 'bg-success' : 'bg-white'
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>

              {rsvpStep === 1 && (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-ink">Step 1: Household</h3>
                  <p className="text-ink/70">Who from your household is attending?</p>
                  <div className="space-y-2">
                    {['Alex Smith', 'Jordan Smith'].map((name) => (
                      <label key={name} className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-white">
                        <input type="checkbox" className="w-4 h-4" defaultChecked />
                        <span className="text-ink">{name}</span>
                      </label>
                    ))}
                  </div>
                  <Button variant="primary" fullWidth onClick={() => setRsvpStep(2)}>
                    Continue
                  </Button>
                </div>
              )}

              {rsvpStep === 2 && (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-ink">Step 2: Events</h3>
                  <p className="text-ink/70">Which events will you attend?</p>
                  <div className="space-y-2">
                    {['Welcome Reception (Fri, 6pm)', 'Wedding Ceremony (Sat, 3pm)', 'Reception Dinner (Sat, 6pm)'].map((event) => (
                      <label key={event} className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-white">
                        <input type="checkbox" className="w-4 h-4" defaultChecked />
                        <span className="text-ink">{event}</span>
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" fullWidth onClick={() => setRsvpStep(1)}>
                      Back
                    </Button>
                    <Button variant="primary" fullWidth onClick={() => setRsvpStep(3)}>
                      Continue
                    </Button>
                  </div>
                </div>
              )}

              {rsvpStep === 3 && (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-ink">Step 3: Meal + Dietary</h3>
                  <p className="text-ink/70">Meal preferences for dinner reception:</p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-ink mb-2">Alex Smith</label>
                      <select className="w-full p-2 border border-border rounded-lg bg-surface">
                        <option>Chicken</option>
                        <option>Beef</option>
                        <option>Vegetarian</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-ink mb-2">Jordan Smith</label>
                      <select className="w-full p-2 border border-border rounded-lg bg-surface">
                        <option>Chicken</option>
                        <option>Beef</option>
                        <option>Vegetarian</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-ink mb-2">Dietary restrictions (optional)</label>
                      <textarea
                        className="w-full p-2 border border-border rounded-lg bg-surface"
                        rows={3}
                        placeholder="Any allergies or dietary needs..."
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" fullWidth onClick={() => setRsvpStep(2)}>
                      Back
                    </Button>
                    <Button variant="primary" fullWidth onClick={() => setRsvpStep(4)}>
                      Continue
                    </Button>
                  </div>
                </div>
              )}

              {rsvpStep === 4 && (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-ink">Step 4: Confirm</h3>
                  <div className="bg-white p-4 rounded-lg space-y-2">
                    <p className="text-sm text-ink/70"><strong>Attending:</strong> Alex Smith, Jordan Smith</p>
                    <p className="text-sm text-ink/70"><strong>Events:</strong> All events</p>
                    <p className="text-sm text-ink/70"><strong>Meals:</strong> 2x Chicken</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" fullWidth onClick={() => setRsvpStep(3)}>
                      Back
                    </Button>
                    <Button variant="accent" fullWidth onClick={() => {
                      onTodo('Connect RSVP API');
                      setRsvpStep(1);
                    }}>
                      Submit RSVP
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </section>

      {/* TEMPLATE GALLERY */}
      <section id="templates" className="py-16 md:py-20 bg-paper">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">
              Beautiful templates for every style
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
            {[
              { name: 'Modern Minimal', tags: ['Clean', 'Simple'], colors: ['#2A5D67', '#F6F3EE', '#C89F56', '#2B2B2B'] },
              { name: 'Romantic Classic', tags: ['Elegant', 'Timeless'], colors: ['#D7795D', '#F6F3EE', '#C89F56', '#8B7355'] },
              { name: 'Coastal Breeze', tags: ['Fresh', 'Light'], colors: ['#2A5D67', '#A3D5D3', '#F6F3EE', '#E8E4DD'] },
              { name: 'Garden Party', tags: ['Natural', 'Whimsical'], colors: ['#8FAF91', '#F6F3EE', '#D7795D', '#C89F56'] },
              { name: 'Modern Editorial', tags: ['Bold', 'Editorial'], colors: ['#2B2B2B', '#F6F3EE', '#2A5D67', '#C89F56'] },
              { name: 'Bold Contemporary', tags: ['Vibrant', 'Modern'], colors: ['#D7795D', '#2A5D67', '#C89F56', '#2B2B2B'] },
              { name: 'Soft Romance', tags: ['Delicate', 'Dreamy'], colors: ['#F6F3EE', '#D7795D', '#C89F56', '#E8E4DD'] },
              { name: 'Urban Chic', tags: ['Sleek', 'City'], colors: ['#2B2B2B', '#C89F56', '#2A5D67', '#F6F3EE'] },
              { name: 'Rustic Charm', tags: ['Warm', 'Rustic'], colors: ['#8B7355', '#F6F3EE', '#C89F56', '#2B2B2B'] },
              { name: 'Destination Vibes', tags: ['Travel', 'Adventure'], colors: ['#2A5D67', '#F6F3EE', '#D7795D', '#C89F56'] },
              { name: 'Art Deco Glam', tags: ['Luxe', 'Vintage'], colors: ['#2B2B2B', '#C89F56', '#F6F3EE', '#8B7355'] },
              { name: 'Bohemian Spirit', tags: ['Free', 'Artistic'], colors: ['#D7795D', '#C89F56', '#8FAF91', '#F6F3EE'] },
            ].map((template, idx) => (
              <Card key={idx} variant="bordered" padding="none" className="overflow-hidden">
                <div className="aspect-[3/4] bg-gradient-to-br from-primary-light to-accent-light flex items-center justify-center">
                  <Heart className="w-12 h-12 text-primary" />
                </div>
                <CardContent className="p-4">
                  <h3 className="text-base font-semibold text-ink mb-2">{template.name}</h3>
                  <div className="flex gap-2 mb-3">
                    {template.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                  <div className="flex gap-1 mb-3">
                    {template.colors.map((color, i) => (
                      <div key={i} className="w-6 h-6 rounded-full border border-border" style={{ backgroundColor: color }} />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" fullWidth onClick={() => onTodo(`Preview ${template.name}`)}>
                      Preview
                    </Button>
                    <Button variant="primary" size="sm" fullWidth onClick={() => onTodo(`Use ${template.name}`)}>
                      Use
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center">
            <Button variant="primary" size="lg" onClick={() => onTodo('Browse all templates')}>
              Browse all templates
            </Button>
          </div>
        </div>
      </section>

      {/* COLOR PALETTES */}
      <section id="colors" className="py-16 md:py-20 bg-white">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-ink mb-4">
              Customize your <span className="text-accent">color palette</span>
            </h2>
            <p className="text-lg text-ink/70 mb-4">
              Choose a palette that matches your wedding style. Click to preview instantly.
            </p>
            <button
              className="px-4 py-2 text-sm border border-brand/30 text-brand rounded-lg hover:bg-brand/5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              onClick={resetPalette}
              aria-label="Reset to default color palette"
            >
              Reset to default
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { name: 'Modern Minimal', brand: '17 17 17', brand2: '168 162 158', accent: '191 167 111', paper: '248 248 248', ink: '17 17 17', displayColors: ['#111111', '#A8A29E', '#BFA76F', '#F8F8F8'] },
              { name: 'Romantic Classic', brand: '192 128 129', brand2: '231 203 169', accent: '244 194 194', paper: '251 246 240', ink: '43 43 43', displayColors: ['#C08081', '#E7CBA9', '#F4C2C2', '#FBF6F0'] },
              { name: 'Coastal', brand: '31 60 136', brand2: '143 191 191', accent: '255 111 97', paper: '239 230 221', ink: '31 31 31', displayColors: ['#1F3C88', '#8FBFBF', '#FF6F61', '#EFE6DD'] },
              { name: 'Garden Party', brand: '107 142 35', brand2: '156 175 136', accent: '196 106 62', paper: '250 249 246', ink: '43 43 43', displayColors: ['#6B8E23', '#9CAF88', '#C46A3E', '#FAF9F6'] },
              { name: 'Modern Editorial', brand: '74 74 74', brand2: '191 167 111', accent: '139 125 123', paper: '248 248 248', ink: '34 34 34', displayColors: ['#4A4A4A', '#BFA76F', '#8B7D7B', '#F8F8F8'] },
              { name: 'Bold Contemporary', brand: '4 106 56', brand2: '184 115 51', accent: '18 18 18', paper: '245 242 237', ink: '18 18 18', displayColors: ['#046A38', '#B87333', '#121212', '#F5F2ED'] },
            ].map((palette, idx) => (
              <div key={idx} className="bg-paper border border-brand/20 rounded-2xl p-6 hover:border-brand/40 transition-colors shadow-sm">
                <h3 className="text-lg font-semibold text-ink mb-4">{palette.name}</h3>
                <div className="flex gap-2 mb-4">
                  {palette.displayColors.map((color, i) => (
                    <div
                      key={i}
                      className="flex-1 h-16 rounded-lg border border-ink/10 shadow-sm"
                      style={{ backgroundColor: color }}
                      role="img"
                      aria-label={`Color ${i + 1} of ${palette.name} palette`}
                    />
                  ))}
                </div>
                <button
                  className="w-full px-4 py-2 border-2 border-brand text-brand font-medium rounded-lg hover:bg-brand/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                  onClick={() => applyPalette(palette)}
                  aria-label={`Apply ${palette.name} palette`}
                >
                  Apply palette
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};
