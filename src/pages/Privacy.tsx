import React from 'react';
import { Header, Footer } from '../components/layout';

export const Privacy: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background text-text-primary">
      <Header />

      <main className="flex-1 px-6 py-14 md:py-16">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="rounded-xl border border-border-subtle bg-white/86 p-7 shadow-sm sm:p-8">
            <p className="text-xs font-medium text-text-tertiary">dayof legal</p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight text-text-primary">Privacy policy</h1>
            <p className="mt-3 text-text-secondary">Last updated April 16, 2026</p>
            <p className="mt-5 max-w-3xl text-base leading-7 text-text-secondary">
              dayof helps couples create wedding websites, manage guests, collect RSVPs, and plan wedding details.
              This policy explains what we collect, how we use it, and how we handle wedding and guest information.
            </p>
          </div>

          <section className="rounded-xl border border-border-subtle bg-white/72 p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-text-primary">Information we collect</h2>
            <ul className="mt-4 list-disc space-y-2 pl-6 text-text-secondary">
              <li>Account information like your name, email, login details, and billing status.</li>
              <li>Wedding website content like couple names, event details, venue information, story content, registry details, and design preferences.</li>
              <li>Guest management data like guest names, RSVP responses, party sizes, meal choices, seating information, and invitation details.</li>
              <li>Planner and collaborator access data like invited users, access roles, and activity needed to operate the product safely.</li>
              <li>Product usage and device information used to keep the service secure, reliable, and understandable.</li>
            </ul>
          </section>

          <section className="rounded-xl border border-border-subtle bg-white/72 p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-text-primary">How we use information</h2>
            <ul className="mt-4 list-disc space-y-2 pl-6 text-text-secondary">
              <li>Provide, maintain, and improve the site editor, RSVP tools, guest tools, planning features, and related product areas.</li>
              <li>Generate drafts, recommendations, and setup outputs based on the information you provide.</li>
              <li>Process payments, prevent abuse, investigate product issues, and protect the security of accounts and wedding data.</li>
              <li>Communicate important product, billing, and service updates.</li>
            </ul>
          </section>

          <section className="rounded-xl border border-border-subtle bg-white/72 p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-text-primary">Draft assistance</h2>
            <p className="mt-3 text-text-secondary">
              Some dayof features help interpret setup answers, propose content, and create draft copy.
              You are responsible for reviewing generated outputs before publishing or sharing them with guests.
            </p>
          </section>

          <section className="rounded-xl border border-border-subtle bg-white/72 p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-text-primary">Sharing</h2>
            <p className="mt-3 text-text-secondary">
              We do not sell your personal information. We may share data with trusted services that help us operate dayof,
              including hosting, authentication, analytics, payments, and communications, only as needed to run the service.
            </p>
          </section>

          <section className="rounded-xl border border-border-subtle bg-white/72 p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-text-primary">Data retention</h2>
            <p className="mt-3 text-text-secondary">
              We keep account and wedding data for as long as needed to provide the service, comply with legal obligations, resolve disputes,
              and enforce agreements. You can contact us if you want account or wedding data deleted, subject to legal and operational limits.
            </p>
          </section>

          <section className="rounded-xl border border-border-subtle bg-white/72 p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-text-primary">Contact</h2>
            <p className="mt-3 text-text-secondary">
              For privacy questions, contact <a className="text-primary underline" href="mailto:support@dayof.love">support@dayof.love</a>.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};
