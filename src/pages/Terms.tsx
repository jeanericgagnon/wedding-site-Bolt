import React from 'react';

export const Terms: React.FC = () => {
  return (
    <div className="min-h-screen bg-background px-6 py-16">
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-text-tertiary">Day of Love</p>
          <h1 className="mt-3 text-4xl font-bold text-text-primary">Terms of Service</h1>
          <p className="mt-3 text-text-secondary">Last updated April 16, 2026</p>
        </div>

        <section className="space-y-4 text-text-secondary">
          <p>
            These Terms govern your use of Day of Love, including the wedding website builder, guest management tools,
            RSVP tools, AI-assisted setup features, planner collaboration features, and related services.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-text-primary">Use of the service</h2>
          <ul className="list-disc space-y-2 pl-6 text-text-secondary">
            <li>You must provide accurate information when creating an account and using the product.</li>
            <li>You are responsible for maintaining the security of your account and invited collaborator access.</li>
            <li>You may not use the service for unlawful, abusive, fraudulent, or harmful activity.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-text-primary">Wedding and guest data</h2>
          <p className="text-text-secondary">
            You are responsible for the wedding, guest, RSVP, and event information you upload or publish through Day of Love.
            You confirm that you have the rights and permissions needed to use that information in the service.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-text-primary">AI and generated content</h2>
          <p className="text-text-secondary">
            Day of Love may generate draft copy, structure, or setup suggestions. Generated output is provided for convenience.
            You are responsible for reviewing, editing, and approving any content before publishing it or sharing it with guests.
          </p>
          <p className="text-text-secondary">
            Some lanes may use server-side model-backed tools when configured, while others remain deterministic helpers. We do not promise that every suggestion is produced by a live model-backed system.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-text-primary">Billing</h2>
          <p className="text-text-secondary">
            Paid features may require an active subscription or completed purchase. Fees, billing terms, and access rules may change over time.
            If a payment method fails or paid access ends, some product features may be limited until billing is resolved.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-text-primary">Availability and changes</h2>
          <p className="text-text-secondary">
            We may update, improve, suspend, or remove features at any time. We do not guarantee uninterrupted availability,
            but we aim to operate the service responsibly and fix issues as they arise.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-text-primary">Limitation of liability</h2>
          <p className="text-text-secondary">
            To the fullest extent allowed by law, Day of Love is provided on an as-is and as-available basis without warranties of any kind.
            We are not liable for indirect, incidental, special, consequential, or punitive damages arising from your use of the service.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-text-primary">Contact</h2>
          <p className="text-text-secondary">
            For questions about these Terms, contact <a className="text-primary underline" href="mailto:support@dayof.love">support@dayof.love</a>.
          </p>
        </section>
      </div>
    </div>
  );
};
