import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
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

// Simple toast notification system
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
          <p className="text-sm text-text-primary">{toast.message}</p>
        </div>
      ))}
    </div>
  );
};

export const Home: React.FC = () => {
  const { signIn } = useAuth();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [activeTab, setActiveTab] = useState<string>('guests');
  const [rsvpStep, setRsvpStep] = useState<number>(1);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const handleStartFree = () => {
    signIn();
    window.location.hash = '#overview';
  };

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

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <ToastContainer toasts={toasts} onRemove={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />

      {/* A) HERO */}
      <section id="top" className="py-16 md:py-24 bg-gradient-to-b from-surface-subtle to-background">
        <div className="container-custom">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-text-primary mb-6 text-balance">
                A wedding site that doesn't break when it matters.
              </h1>
              <p className="text-lg md:text-xl text-text-secondary mb-8 max-w-2xl">
                RSVP correctness, privacy-first defaults, and simple pricing—built for couples who want confidence, not chaos.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <Button variant="accent" size="lg" onClick={handleStartFree}>
                  Start building your site
                </Button>
                <Button variant="outline" size="lg" onClick={() => onTodo('Preview demo')}>
                  Preview demo
                </Button>
              </div>
              <div className="flex flex-wrap gap-3">
                <Badge variant="secondary">Auto-renew OFF by default</Badge>
                <Badge variant="secondary">Private by default</Badge>
                <Badge variant="secondary">No hidden fees</Badge>
                <Badge variant="secondary">Works for older guests</Badge>
              </div>
            </div>

            <Card variant="bordered" padding="lg" className="bg-surface">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Product snapshot</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-3xl font-bold text-text-primary">186</p>
                  <p className="text-sm text-text-secondary">Guests</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-text-primary">92</p>
                  <p className="text-sm text-text-secondary">Households</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-text-primary">71%</p>
                  <p className="text-sm text-text-secondary">RSVP responded</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-text-primary">4</p>
                  <p className="text-sm text-text-secondary">Events</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* B) SOCIAL PROOF STRIP */}
      <section className="py-8 bg-surface-subtle border-y border-border-subtle">
        <div className="container-custom">
          <div className="flex flex-wrap items-center justify-center gap-8">
            <div className="flex items-center gap-6 text-sm text-text-secondary">
              {['Emily & James', 'Sarah & Michael', 'Alex & Jordan', 'Taylor & Chris', 'Sam & Pat', 'Casey & Drew'].map((couple) => (
                <div key={couple} className="px-4 py-2 bg-surface rounded-full border border-border-subtle">
                  {couple}
                </div>
              ))}
            </div>
          </div>
          <p className="text-center text-sm text-text-secondary mt-4">Trusted by couples who care about clarity.</p>
        </div>
      </section>

      {/* C) PAIN → FIX GRID */}
      <section id="product" className="py-16 md:py-24">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
              Wedding sites fail in predictable ways. We engineered around them.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
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
            ].map((item, idx) => (
              <Card key={idx} variant="bordered" padding="md">
                <div className="flex flex-col gap-3">
                  <div className="p-3 bg-primary-light rounded-lg w-fit">
                    <item.icon className="w-5 h-5 text-primary" aria-hidden="true" />
                  </div>
                  <h3 className="text-lg font-semibold text-text-primary">{item.title}</h3>
                  <p className="text-sm text-text-secondary">{item.desc}</p>
                  <Button variant="ghost" size="sm" onClick={() => onTodo(`Learn more: ${item.title}`)}>
                    See how it works <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* D) FEATURE TABS */}
      <section id="rsvp" className="py-16 md:py-24 bg-surface-subtle">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
              Every feature built for trust and correctness
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
                    : 'bg-surface text-text-secondary hover:text-text-primary border border-border'
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
                  <h3 className="text-2xl font-bold text-text-primary mb-4">Guests + Households</h3>
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
                        <span className="text-text-secondary">{item}</span>
                      </li>
                    ))}
                  </ul>
                  <Button variant="primary" onClick={() => onTodo('View guests in dashboard')}>
                    View in dashboard
                  </Button>
                </div>
              )}

              {activeTab === 'rsvp' && (
                <div className="space-y-4">
                  <h3 className="text-2xl font-bold text-text-primary mb-4">RSVP Engine</h3>
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
                        <span className="text-text-secondary">{item}</span>
                      </li>
                    ))}
                  </ul>
                  <Button variant="primary" onClick={() => onTodo('View RSVP in dashboard')}>
                    View in dashboard
                  </Button>
                </div>
              )}

              {activeTab === 'messaging' && (
                <div className="space-y-4">
                  <h3 className="text-2xl font-bold text-text-primary mb-4">Messaging</h3>
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
                        <span className="text-text-secondary">{item}</span>
                      </li>
                    ))}
                  </ul>
                  <Button variant="primary" onClick={() => onTodo('View messaging in dashboard')}>
                    View in dashboard
                  </Button>
                </div>
              )}

              {activeTab === 'travel' && (
                <div className="space-y-4">
                  <h3 className="text-2xl font-bold text-text-primary mb-4">Travel + Itinerary</h3>
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
                        <span className="text-text-secondary">{item}</span>
                      </li>
                    ))}
                  </ul>
                  <Button variant="primary" onClick={() => onTodo('View travel in dashboard')}>
                    View in dashboard
                  </Button>
                </div>
              )}

              {activeTab === 'registry' && (
                <div className="space-y-4">
                  <h3 className="text-2xl font-bold text-text-primary mb-4">Registry</h3>
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
                        <span className="text-text-secondary">{item}</span>
                      </li>
                    ))}
                  </ul>
                  <Button variant="primary" onClick={() => onTodo('View registry in dashboard')}>
                    View in dashboard
                  </Button>
                </div>
              )}

              {activeTab === 'seating' && (
                <div className="space-y-4">
                  <h3 className="text-2xl font-bold text-text-primary mb-4">Seating + Check-in</h3>
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
                        <span className="text-text-secondary">{item}</span>
                      </li>
                    ))}
                  </ul>
                  <Button variant="primary" onClick={() => onTodo('View seating in dashboard')}>
                    View in dashboard
                  </Button>
                </div>
              )}
            </div>

            <Card variant="bordered" padding="none" className="aspect-video bg-surface-subtle flex items-center justify-center">
              <div className="text-center p-8">
                <BarChart className="w-16 h-16 text-text-tertiary mx-auto mb-4" />
                <p className="text-text-secondary">Feature screenshot preview</p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* E) RSVP DEMO */}
      <section id="rsvp-demo" className="py-16 md:py-24">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
              See how RSVP actually works
            </h2>
            <p className="text-lg text-text-secondary">
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
                          : 'bg-surface-subtle text-text-tertiary'
                      }`}
                    >
                      {step < rsvpStep ? <Check className="w-4 h-4" /> : step}
                    </div>
                    {step < 4 && (
                      <div
                        className={`w-12 h-0.5 mx-2 ${
                          step < rsvpStep ? 'bg-success' : 'bg-surface-subtle'
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>

              {rsvpStep === 1 && (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-text-primary">Step 1: Household</h3>
                  <p className="text-text-secondary">Who from your household is attending?</p>
                  <div className="space-y-2">
                    {['Alex Smith', 'Jordan Smith'].map((name) => (
                      <label key={name} className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-surface-subtle">
                        <input type="checkbox" className="w-4 h-4" defaultChecked />
                        <span className="text-text-primary">{name}</span>
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
                  <h3 className="text-xl font-semibold text-text-primary">Step 2: Events</h3>
                  <p className="text-text-secondary">Which events will you attend?</p>
                  <div className="space-y-2">
                    {['Welcome Reception (Fri, 6pm)', 'Wedding Ceremony (Sat, 3pm)', 'Reception Dinner (Sat, 6pm)'].map((event) => (
                      <label key={event} className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-surface-subtle">
                        <input type="checkbox" className="w-4 h-4" defaultChecked />
                        <span className="text-text-primary">{event}</span>
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
                  <h3 className="text-xl font-semibold text-text-primary">Step 3: Meal + Dietary</h3>
                  <p className="text-text-secondary">Meal preferences for dinner reception:</p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">Alex Smith</label>
                      <select className="w-full p-2 border border-border rounded-lg bg-surface">
                        <option>Chicken</option>
                        <option>Beef</option>
                        <option>Vegetarian</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">Jordan Smith</label>
                      <select className="w-full p-2 border border-border rounded-lg bg-surface">
                        <option>Chicken</option>
                        <option>Beef</option>
                        <option>Vegetarian</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">Dietary restrictions (optional)</label>
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
                  <h3 className="text-xl font-semibold text-text-primary">Step 4: Confirm</h3>
                  <div className="bg-surface-subtle p-4 rounded-lg space-y-2">
                    <p className="text-sm text-text-secondary"><strong>Attending:</strong> Alex Smith, Jordan Smith</p>
                    <p className="text-sm text-text-secondary"><strong>Events:</strong> All events</p>
                    <p className="text-sm text-text-secondary"><strong>Meals:</strong> 2x Chicken</p>
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

      {/* F) TEMPLATE GALLERY */}
      <section id="templates" className="py-16 md:py-24 bg-surface-subtle">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
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
                  <h3 className="text-base font-semibold text-text-primary mb-2">{template.name}</h3>
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

      {/* G) COLORS / DESIGN SYSTEM */}
      <section id="colors" className="py-16 md:py-24">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
              Customize your color palette
            </h2>
            <p className="text-lg text-text-secondary">
              Choose a palette that matches your wedding style.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { name: 'Modern Minimal', colors: ['#2A5D67', '#F6F3EE', '#C89F56', '#2B2B2B'] },
              { name: 'Romantic Classic', colors: ['#D7795D', '#F6F3EE', '#C89F56', '#8B7355'] },
              { name: 'Coastal', colors: ['#2A5D67', '#A3D5D3', '#F6F3EE', '#E8E4DD'] },
              { name: 'Garden Party', colors: ['#8FAF91', '#F6F3EE', '#D7795D', '#C89F56'] },
              { name: 'Modern Editorial', colors: ['#2B2B2B', '#F6F3EE', '#2A5D67', '#C89F56'] },
              { name: 'Bold Contemporary', colors: ['#D7795D', '#2A5D67', '#C89F56', '#2B2B2B'] },
            ].map((palette, idx) => (
              <Card key={idx} variant="bordered" padding="md">
                <h3 className="text-lg font-semibold text-text-primary mb-4">{palette.name}</h3>
                <div className="flex gap-2 mb-4">
                  {palette.colors.map((color, i) => (
                    <div key={i} className="flex-1 h-16 rounded-lg border border-border" style={{ backgroundColor: color }} />
                  ))}
                </div>
                <Button variant="outline" size="sm" fullWidth onClick={() => onTodo(`Apply ${palette.name} palette`)}>
                  Apply palette
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* H) MESSAGING */}
      <section id="messaging" className="py-16 md:py-24 bg-surface-subtle">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
              Stay in touch with your guests
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h3 className="text-2xl font-semibold text-text-primary mb-4">Email included (fair-use)</h3>
              <p className="text-text-secondary mb-4">
                Send updates, reminders, and thank-you messages to all your guests. Email is included with your plan, with fair-use limits.
              </p>
              <h3 className="text-2xl font-semibold text-text-primary mb-4 mt-8">SMS credit-based by segment</h3>
              <p className="text-text-secondary mb-4">
                For urgent updates (venue changes, weather alerts), purchase SMS credits as needed. Segment by RSVP status or event.
              </p>
            </div>

            <Card variant="bordered" padding="lg">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Compose Message</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">To</label>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="primary">All guests</Badge>
                    <Badge variant="secondary">RSVP Yes</Badge>
                    <Badge variant="secondary">Ceremony only</Badge>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">Subject</label>
                  <input
                    type="text"
                    className="w-full p-2 border border-border rounded-lg bg-surface"
                    placeholder="Wedding day reminder"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">Message</label>
                  <textarea
                    className="w-full p-2 border border-border rounded-lg bg-surface"
                    rows={4}
                    placeholder="Hi everyone! Just a reminder that..."
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => onTodo('Send test message')}>
                    Send test
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onTodo('Schedule message')}>
                    Schedule
                  </Button>
                  <Button variant="accent" size="sm" onClick={() => onTodo('Send message now')}>
                    <Send className="w-4 h-4 mr-2" />
                    Send now
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* I) REGISTRY */}
      <section id="registry" className="py-16 md:py-24">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
              Registry without the clutter
            </h2>
            <p className="text-lg text-text-secondary">
              Link to your existing registries or bring your own affiliate links.
            </p>
          </div>

          <div className="max-w-2xl mx-auto">
            <Card variant="bordered" padding="lg" className="mb-6">
              <h3 className="text-xl font-semibold text-text-primary mb-4">Add registry item</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">Registry URL</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="flex-1 p-2 border border-border rounded-lg bg-surface"
                      placeholder="https://www.amazon.com/..."
                    />
                    <Button variant="primary" onClick={() => onTodo('Fetch registry details')}>
                      Fetch details
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            <Card variant="bordered" padding="lg" className="mb-6">
              <div className="flex items-start gap-4">
                <div className="w-20 h-20 bg-surface-subtle rounded-lg flex items-center justify-center">
                  <Wallet className="w-8 h-8 text-text-tertiary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-text-primary mb-2">Amazon Registry</h3>
                  <p className="text-sm text-text-secondary mb-2">Kitchen & Home essentials</p>
                  <Button variant="outline" size="sm" onClick={() => onTodo('View Amazon registry')}>
                    View registry
                  </Button>
                </div>
              </div>
            </Card>

            <Card variant="bordered" padding="md" className="bg-accent-light border-accent">
              <div className="flex items-center gap-3">
                <input type="checkbox" className="w-4 h-4" />
                <div>
                  <h4 className="text-sm font-semibold text-text-primary">BYOAL: Bring Your Own Affiliate Links</h4>
                  <p className="text-xs text-text-secondary">Use your own affiliate links to earn commissions on registry purchases.</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* J) TRAVEL + HOTEL */}
      <section id="travel" className="py-16 md:py-24 bg-surface-subtle">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
              Travel & hotel information
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card variant="bordered" padding="lg">
              <h3 className="text-xl font-semibold text-text-primary mb-6">Weekend Itinerary</h3>
              <div className="space-y-4">
                {[
                  { time: 'Fri, 6:00 PM', event: 'Welcome Reception', location: 'Hotel Lobby' },
                  { time: 'Sat, 3:00 PM', event: 'Wedding Ceremony', location: 'Oceanview Gardens' },
                  { time: 'Sat, 6:00 PM', event: 'Reception Dinner', location: 'Grand Ballroom' },
                  { time: 'Sun, 10:00 AM', event: 'Farewell Brunch', location: 'Terrace Cafe' },
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-4 pb-4 border-b border-border last:border-0">
                    <div className="w-24 flex-shrink-0">
                      <p className="text-sm font-medium text-text-primary">{item.time}</p>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-text-primary">{item.event}</p>
                      <p className="text-sm text-text-secondary">{item.location}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <div className="space-y-6">
              <Card variant="bordered" padding="lg">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary-light rounded-lg">
                    <Hotel className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-text-primary mb-2">Grand Ocean Hotel</h3>
                    <p className="text-sm text-text-secondary mb-3">
                      We've reserved a block of rooms at a special rate. Book by May 15, 2026.
                    </p>
                    <Badge variant="secondary" className="mb-2">Code: SMITH2026</Badge>
                    <p className="text-sm text-text-secondary mb-3">$149/night (regularly $229)</p>
                    <Button variant="outline" size="sm" onClick={() => onTodo('Book hotel room')}>
                      Book room
                    </Button>
                  </div>
                </div>
              </Card>

              <Card variant="bordered" padding="lg">
                <h3 className="text-lg font-semibold text-text-primary mb-4">Save these dates</h3>
                <div className="space-y-2">
                  {['Welcome Reception', 'Wedding Ceremony', 'Reception Dinner'].map((event) => (
                    <Button key={event} variant="ghost" size="sm" fullWidth onClick={() => onTodo(`Add ${event} to calendar`)}>
                      <Calendar className="w-4 h-4 mr-2" />
                      Add {event} to calendar
                    </Button>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* K) SEATING + CHECK-IN */}
      <section id="seating" className="py-16 md:py-24">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
              Seating & day-of check-in
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card variant="bordered" padding="lg" className="aspect-square bg-surface-subtle flex items-center justify-center">
              <div className="text-center">
                <ClipboardCheck className="w-16 h-16 text-text-tertiary mx-auto mb-4" />
                <p className="text-text-secondary">Visual seating chart builder</p>
              </div>
            </Card>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <Button variant="outline" onClick={() => onTodo('Export seating chart')}>
                  <Download className="w-4 h-4 mr-2" />
                  Export seating
                </Button>
                <Button variant="outline" onClick={() => onTodo('Print place cards')}>
                  <FileText className="w-4 h-4 mr-2" />
                  Print cards
                </Button>
                <Button variant="primary" onClick={() => onTodo('Open check-in mode')}>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Check-in mode
                </Button>
                <Badge variant="secondary" className="flex items-center justify-center">
                  <Shield className="w-4 h-4 mr-2" />
                  Offline fallback
                </Badge>
              </div>

              <Card variant="bordered" padding="md">
                <h3 className="text-base font-semibold text-text-primary mb-3">Day-of features</h3>
                <ul className="space-y-2 text-sm text-text-secondary">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                    Track guest arrivals in real-time
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                    Update seating on the fly
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                    Works offline with poor venue Wi-Fi
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                    Export final count for caterer
                  </li>
                </ul>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* L) PRICING */}
      <section id="pricing" className="py-16 md:py-24 bg-surface-subtle">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
              Simple, honest pricing
            </h2>
            <p className="text-lg text-text-secondary">
              One flat fee. No surprises. Auto-renew OFF by default.
            </p>
          </div>

          <div className="max-w-md mx-auto mb-12">
            <Card variant="bordered" padding="lg" className="border-2 border-primary">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-text-primary mb-2">Complete Wedding Platform</h3>
                <div className="mb-4">
                  <span className="text-5xl font-bold text-text-primary">$39</span>
                  <span className="text-text-secondary"> / 2 years</span>
                </div>
                <Badge variant="primary">Auto-renew: OFF by default</Badge>
              </div>

              <ul className="space-y-3 mb-8">
                {[
                  'Unlimited guests',
                  'Beautiful wedding site with custom domain',
                  'Complete RSVP system with meal tracking',
                  'Email messaging included (fair-use)',
                  'Photo & video vault (5GB)',
                  'Guest list & household management',
                  'Travel, registry, and seating tools',
                  'Mobile-friendly for all guests',
                  'No app required for guests',
                  'Data export anytime',
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                    <span className="text-text-secondary">{item}</span>
                  </li>
                ))}
              </ul>

              <div className="space-y-3">
                <Button variant="accent" size="lg" fullWidth onClick={handleStartFree}>
                  Start building your site
                </Button>
                <Button variant="outline" size="md" fullWidth onClick={() => onTodo('See what\'s included')}>
                  See what's included
                </Button>
              </div>

              <p className="text-xs text-text-tertiary text-center mt-4">
                SMS credits available separately for urgent updates
              </p>
            </Card>
          </div>

          <div className="max-w-3xl mx-auto">
            <h3 className="text-2xl font-bold text-text-primary mb-6 text-center">Frequently asked questions</h3>
            <div className="space-y-3">
              {[
                {
                  q: 'Why is auto-renew off by default?',
                  a: 'We believe in transparency. Most couples only need the site for 2-3 years. We won\'t charge you again unless you explicitly choose to renew.',
                },
                {
                  q: 'What about privacy and search engines?',
                  a: 'Your site is private by default. It won\'t appear in search engines unless you explicitly enable public indexing.',
                },
                {
                  q: 'How do SMS credits work?',
                  a: 'Email is included. For urgent updates (venue changes, weather), you can purchase SMS credits. We charge $0.02/message with no markup.',
                },
                {
                  q: 'Can I use my own domain?',
                  a: 'Yes! Connect any domain you own (like smithwedding.com) or use our free subdomain.',
                },
                {
                  q: 'What if I need a refund?',
                  a: 'Full refund within 30 days, no questions asked. After that, pro-rated refund based on time remaining.',
                },
                {
                  q: 'Can I export my data?',
                  a: 'Yes. Export your guest list, RSVPs, photos, and all data anytime in standard formats (CSV, JSON, ZIP).',
                },
                {
                  q: 'What happens after 2 years?',
                  a: 'Your site stays read-only. You can download everything or renew for another 2 years. We send reminders 60 and 30 days before.',
                },
                {
                  q: 'Do you sell my data or show ads?',
                  a: 'Never. We make money from the $39 flat fee. Your wedding is not our ad platform.',
                },
              ].map((faq, idx) => (
                <Card
                  key={idx}
                  variant="bordered"
                  padding="md"
                  className="cursor-pointer hover:bg-surface-subtle transition-colors"
                  onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="text-base font-semibold text-text-primary mb-2">{faq.q}</h4>
                      {expandedFaq === idx && <p className="text-sm text-text-secondary">{faq.a}</p>}
                    </div>
                    <ChevronDown
                      className={`w-5 h-5 text-text-tertiary flex-shrink-0 transition-transform ${
                        expandedFaq === idx ? 'rotate-180' : ''
                      }`}
                    />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* M) FINAL CTA */}
      <section className="py-16 md:py-24 bg-gradient-to-br from-primary-light to-accent-light">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-6">
              Build it once. Trust it all the way to wedding week.
            </h2>
            <p className="text-lg text-text-secondary mb-10">
              No surprises. No hidden fees. No stress. Just a wedding site that works.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="accent" size="lg" onClick={handleStartFree}>
                <Sparkles className="w-5 h-5 mr-2" />
                Start Free Build
              </Button>
              <Button variant="outline" size="lg" onClick={() => onTodo('Preview full demo')}>
                Preview Demo
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};
