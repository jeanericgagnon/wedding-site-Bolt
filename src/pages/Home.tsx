import React from 'react';
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
} from 'lucide-react';

export const Home: React.FC = () => {
  const { signIn } = useAuth();

  const handleStartFree = () => {
    signIn();
    window.location.hash = '#overview';
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <section className="py-16 md:py-24 bg-gradient-to-b from-surface-subtle to-background">
        <div className="container-custom">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="secondary" className="mb-6">
              Trusted by couples everywhere
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-text-primary mb-6 text-balance">
              Your wedding site, done without the stress.
            </h1>
            <p className="text-lg md:text-xl text-text-secondary mb-10 max-w-2xl mx-auto">
              Launch fast with beautiful templates, simple RSVP tools, and a private space for your memories.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button variant="accent" size="lg" onClick={handleStartFree}>
                Start Free
              </Button>
              <Button variant="outline" size="lg">
                See Templates
              </Button>
            </div>

            <div className="mt-12 flex flex-wrap justify-center items-center gap-8 text-sm text-text-secondary">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-success" aria-hidden="true" />
                <span>Transparent pricing</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-success" aria-hidden="true" />
                <span>No app required for guest uploads</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-success" aria-hidden="true" />
                <span>Accessible, guest-friendly design</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-16 md:py-24">
        <div className="container-custom">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
              Everything you need, nothing you don't
            </h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              Simple tools that work together to create a seamless experience for you and your guests.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card variant="bordered" padding="lg">
              <div className="flex flex-col items-start gap-4">
                <div className="p-3 bg-primary-light rounded-lg">
                  <Clock className="w-6 h-6 text-primary" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-text-primary mb-2">
                    Build your site in minutes
                  </h3>
                  <p className="text-text-secondary">
                    Answer a few questions and get a beautiful, personalized wedding site ready to share.
                  </p>
                </div>
              </div>
            </Card>

            <Card variant="bordered" padding="lg">
              <div className="flex flex-col items-start gap-4">
                <div className="p-3 bg-accent-light rounded-lg">
                  <Users className="w-6 h-6 text-accent" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-text-primary mb-2">
                    Collect RSVPs with ease
                  </h3>
                  <p className="text-text-secondary">
                    Manage guest lists, meal preferences, plus-ones, and dietary restrictions all in one place.
                  </p>
                </div>
              </div>
            </Card>

            <Card variant="bordered" padding="lg">
              <div className="flex flex-col items-start gap-4">
                <div className="p-3 bg-secondary/10 rounded-lg">
                  <Image className="w-6 h-6 text-secondary" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-text-primary mb-2">
                    Share photos and videos in one private vault
                  </h3>
                  <p className="text-text-secondary">
                    Guests can upload without an app. Everything stays private and organized for you.
                  </p>
                </div>
              </div>
            </Card>

            <Card variant="bordered" padding="lg">
              <div className="flex flex-col items-start gap-4">
                <div className="p-3 bg-primary-light rounded-lg">
                  <Sparkles className="w-6 h-6 text-primary" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-text-primary mb-2">
                    Customize with templates
                  </h3>
                  <p className="text-text-secondary">
                    Choose from beautiful templates, customize colors and sections, and make it yours.
                  </p>
                </div>
              </div>
            </Card>

            <Card variant="bordered" padding="lg">
              <div className="flex flex-col items-start gap-4">
                <div className="p-3 bg-primary-light rounded-lg">
                  <Globe className="w-6 h-6 text-primary" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-text-primary mb-2">
                    Your own domain
                  </h3>
                  <p className="text-text-secondary">
                    Get a custom URL or connect your own domain. Keep it simple and memorable.
                  </p>
                </div>
              </div>
            </Card>

            <Card variant="bordered" padding="lg">
              <div className="flex flex-col items-start gap-4">
                <div className="p-3 bg-accent-light rounded-lg">
                  <Camera className="w-6 h-6 text-accent" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-text-primary mb-2">
                    Pass-the-camera mode
                  </h3>
                  <p className="text-text-secondary">
                    Let guests snap photos and upload instantly with a simple QR code. No friction.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-surface-subtle">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-6">
              Guest-friendly by design
            </h2>
            <p className="text-lg text-text-secondary mb-12">
              Your guests deserve a smooth experience. No accounts, no downloads, no confusion.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="flex flex-col items-center text-center">
                <div className="p-4 bg-surface rounded-full mb-4">
                  <Calendar className="w-8 h-8 text-primary" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">
                  Simple RSVP
                </h3>
                <p className="text-text-secondary text-sm">
                  Guests fill out one form. That's it.
                </p>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="p-4 bg-surface rounded-full mb-4">
                  <MapPin className="w-8 h-8 text-primary" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">
                  Clear directions
                </h3>
                <p className="text-text-secondary text-sm">
                  Travel info, venue details, and maps in one place.
                </p>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="p-4 bg-surface rounded-full mb-4">
                  <Mail className="w-8 h-8 text-primary" aria-hidden="true" />
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">
                  Easy updates
                </h3>
                <p className="text-text-secondary text-sm">
                  Send updates and reminders without the back-and-forth.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="templates" className="py-16 md:py-24">
        <div className="container-custom">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
              Beautiful templates, ready to go
            </h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              Start with a template that fits your style. Customize sections, colors, and content in minutes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <Card variant="bordered" padding="none" className="overflow-hidden">
              <div className="aspect-[4/3] bg-gradient-to-br from-primary-light to-primary/20 flex items-center justify-center">
                <Heart className="w-16 h-16 text-primary" aria-hidden="true" />
              </div>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-text-primary mb-2">Ocean Breeze</h3>
                <p className="text-sm text-text-secondary mb-4">
                  Clean and sophisticated with calming teal tones.
                </p>
                <Button variant="outline" size="sm" fullWidth>
                  Preview
                </Button>
              </CardContent>
            </Card>

            <Card variant="bordered" padding="none" className="overflow-hidden">
              <div className="aspect-[4/3] bg-gradient-to-br from-accent-light to-accent/20 flex items-center justify-center">
                <Heart className="w-16 h-16 text-accent" aria-hidden="true" />
              </div>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-text-primary mb-2">Coral Sunset</h3>
                <p className="text-sm text-text-secondary mb-4">
                  Warm muted coral tones for a romantic feel.
                </p>
                <Button variant="outline" size="sm" fullWidth>
                  Preview
                </Button>
              </CardContent>
            </Card>

            <Card variant="bordered" padding="none" className="overflow-hidden">
              <div className="aspect-[4/3] bg-gradient-to-br from-secondary/20 to-secondary/30 flex items-center justify-center">
                <Heart className="w-16 h-16 text-secondary" aria-hidden="true" />
              </div>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-text-primary mb-2">Golden Hour</h3>
                <p className="text-sm text-text-secondary mb-4">
                  Elegant burnt gold for a timeless aesthetic.
                </p>
                <Button variant="outline" size="sm" fullWidth>
                  Preview
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="text-center">
            <Button variant="primary" size="lg">
              Browse All Templates
            </Button>
          </div>
        </div>
      </section>

      <section id="pricing" className="py-16 md:py-24 bg-surface-subtle">
        <div className="container-custom">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              No surprises, no hidden fees. Start free and upgrade when you're ready.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card variant="bordered" padding="lg">
              <div className="flex flex-col h-full">
                <h3 className="text-2xl font-semibold text-text-primary mb-2">Free</h3>
                <p className="text-text-secondary mb-6">Perfect for getting started</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-text-primary">$0</span>
                </div>
                <ul className="space-y-3 mb-8 flex-grow">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" aria-hidden="true" />
                    <span className="text-text-secondary">Basic wedding site</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" aria-hidden="true" />
                    <span className="text-text-secondary">Up to 50 guests</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" aria-hidden="true" />
                    <span className="text-text-secondary">RSVP collection</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" aria-hidden="true" />
                    <span className="text-text-secondary">dayof.love subdomain</span>
                  </li>
                </ul>
                <Button variant="outline" size="md" fullWidth>
                  Start Free
                </Button>
              </div>
            </Card>

            <Card variant="bordered" padding="lg" className="border-2 border-primary relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <Badge variant="primary">Most Popular</Badge>
              </div>
              <div className="flex flex-col h-full">
                <h3 className="text-2xl font-semibold text-text-primary mb-2">Essential</h3>
                <p className="text-text-secondary mb-6">Everything you need</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-text-primary">$49</span>
                  <span className="text-text-secondary"> one-time</span>
                </div>
                <ul className="space-y-3 mb-8 flex-grow">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" aria-hidden="true" />
                    <span className="text-text-secondary">Everything in Free</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" aria-hidden="true" />
                    <span className="text-text-secondary">Unlimited guests</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" aria-hidden="true" />
                    <span className="text-text-secondary">Photo & video vault</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" aria-hidden="true" />
                    <span className="text-text-secondary">Custom domain</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" aria-hidden="true" />
                    <span className="text-text-secondary">All templates</span>
                  </li>
                </ul>
                <Button variant="accent" size="md" fullWidth>
                  Get Started
                </Button>
              </div>
            </Card>

            <Card variant="bordered" padding="lg">
              <div className="flex flex-col h-full">
                <h3 className="text-2xl font-semibold text-text-primary mb-2">Premium</h3>
                <p className="text-text-secondary mb-6">For the full experience</p>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-text-primary">$99</span>
                  <span className="text-text-secondary"> one-time</span>
                </div>
                <ul className="space-y-3 mb-8 flex-grow">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" aria-hidden="true" />
                    <span className="text-text-secondary">Everything in Essential</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" aria-hidden="true" />
                    <span className="text-text-secondary">Priority support</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" aria-hidden="true" />
                    <span className="text-text-secondary">Advanced analytics</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" aria-hidden="true" />
                    <span className="text-text-secondary">Multiple collaborators</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" aria-hidden="true" />
                    <span className="text-text-secondary">Custom branding</span>
                  </li>
                </ul>
                <Button variant="outline" size="md" fullWidth>
                  Get Premium
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </section>

      <section id="faq" className="py-16 md:py-24">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-4">
                Frequently asked questions
              </h2>
              <p className="text-lg text-text-secondary">
                Everything you need to know about Dayof.
              </p>
            </div>

            <div className="space-y-6">
              <Card variant="bordered" padding="lg">
                <h3 className="text-lg font-semibold text-text-primary mb-3">
                  How long does it take to set up?
                </h3>
                <p className="text-text-secondary">
                  Most couples publish their site in under 10 minutes. Answer a few questions, pick a template, and you're done. You can always come back to add more details later.
                </p>
              </Card>

              <Card variant="bordered" padding="lg">
                <h3 className="text-lg font-semibold text-text-primary mb-3">
                  Do my guests need to create an account?
                </h3>
                <p className="text-text-secondary">
                  No. Guests can RSVP, view your site, and upload photos without creating an account or downloading an app.
                </p>
              </Card>

              <Card variant="bordered" padding="lg">
                <h3 className="text-lg font-semibold text-text-primary mb-3">
                  Can I use my own domain?
                </h3>
                <p className="text-text-secondary">
                  Yes. Essential and Premium plans include custom domain support. You can use something like yournames.com or keep the free dayof.love subdomain.
                </p>
              </Card>

              <Card variant="bordered" padding="lg">
                <h3 className="text-lg font-semibold text-text-primary mb-3">
                  Is there a limit to photo uploads?
                </h3>
                <p className="text-text-secondary">
                  Essential and Premium plans include generous storage for photos and videos. Most couples never hit the limit, and if you do, we'll work with you.
                </p>
              </Card>

              <Card variant="bordered" padding="lg">
                <h3 className="text-lg font-semibold text-text-primary mb-3">
                  What happens after my wedding?
                </h3>
                <p className="text-text-secondary">
                  Your site stays live for one year after your wedding date. You can download all your photos, videos, and guest messages anytime. After that, you can extend or archive your site.
                </p>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24 bg-gradient-to-br from-primary-light to-accent-light">
        <div className="container-custom">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-6">
              Ready to get started?
            </h2>
            <p className="text-lg text-text-secondary mb-10">
              Create your wedding site in minutes. No credit card required.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="accent" size="lg" onClick={handleStartFree}>
                Start Free
              </Button>
              <Button variant="outline" size="lg">
                Talk to Us
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};
