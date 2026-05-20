import React from 'react';
import { Header, Footer } from '../components/layout';

export const Terms: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background text-text-primary">
      <Header />

      <main className="flex-1 px-6 py-14 md:py-16">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="rounded-xl border border-border-subtle bg-white/86 p-7 shadow-sm sm:p-8">
            <p className="text-xs font-medium text-text-tertiary">dayof legal</p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight text-text-primary">Terms of service</h1>
            <p className="mt-3 text-text-secondary">Last updated April 16, 2026</p>
            <p className="mt-5 max-w-3xl text-base leading-7 text-text-secondary">
              These Terms govern your use of dayof, including the wedding website builder, guest management tools,
              RSVP tools, setup features, planner collaboration features, and related services.
            </p>
          </div>

          <section className="rounded-xl border border-border-subtle bg-white/72 p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-text-primary">Use of the service</h2>
            <ul className="mt-4 list-disc space-y-2 pl-6 text-text-secondary">
              <li>You must provide accurate information when creating an account and using the product.</li>
              <li>You are responsible for maintaining the security of your account and invited collaborator access.</li>
              <li>You may not use the service for unlawful, abusive, fraudulent, or harmful activity.</li>
            </ul>
          </section>

          <section className="rounded-xl border border-border-subtle bg-white/72 p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-text-primary">Wedding and guest data</h2>
            <p className="mt-3 text-text-secondary">
              You are responsible for the wedding, guest, RSVP, and event information you upload or publish through dayof.
              You confirm that you have the rights and permissions needed to use that information in the service.
            </p>
          </section>

          <section className="rounded-xl border border-border-subtle bg-white/72 p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-text-primary">Draft content</h2>
            <p className="mt-3 text-text-secondary">
              dayof may generate draft copy, structure, or setup suggestions. Draft output is provided for convenience.
              You are responsible for reviewing, editing, and approving any content before publishing it or sharing it with guests.
            </p>
          </section>

          <section className="rounded-xl border border-border-subtle bg-white/72 p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-text-primary">Billing</h2>
            <p className="mt-3 text-text-secondary">
              Paid features may require an active subscription or completed purchase. Fees, billing terms, and access rules may change over time.
              If a payment method fails or paid access ends, some product features may be limited until billing is resolved.
            </p>
          </section>

          <section className="rounded-xl border border-border-subtle bg-white/72 p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-text-primary">Availability and changes</h2>
            <p className="mt-3 text-text-secondary">
              We may update, improve, suspend, or remove features at any time. We do not guarantee uninterrupted availability,
              but we aim to operate the service responsibly and fix issues as they arise.
            </p>
          </section>

          <section className="rounded-xl border border-border-subtle bg-white/72 p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-text-primary">Limitation of liability</h2>
            <p className="mt-3 text-text-secondary">
              To the fullest extent allowed by law, dayof is provided on an as-is and as-available basis without warranties of any kind.
              We are not liable for indirect, incidental, special, consequential, or punitive damages arising from your use of the service.
            </p>
          </section>

          <section className="rounded-xl border border-border-subtle bg-white/72 p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-text-primary">Contact</h2>
            <p className="mt-3 text-text-secondary">
              For questions about these Terms, contact <a className="text-primary underline" href="mailto:support@dayof.love">support@dayof.love</a>.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};
