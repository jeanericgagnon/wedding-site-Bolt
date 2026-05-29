import React from 'react';

export const Privacy: React.FC = () => {
  return (
    <div className="min-h-screen bg-background px-6 py-16">
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-text-tertiary">Day of Love</p>
          <h1 className="mt-3 text-4xl font-bold text-text-primary">Privacy Policy</h1>
          <p className="mt-3 text-text-secondary">Last updated April 16, 2026</p>
        </div>

        <section className="space-y-4 text-text-secondary">
          <p>
            Day of Love helps couples create wedding websites, manage guests, collect RSVPs, and run wedding-related planning workflows.
            This policy explains what we collect, how we use it, and how we handle wedding and guest information.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-text-primary">Information we collect</h2>
          <ul className="list-disc space-y-2 pl-6 text-text-secondary">
            <li>Account information like your name, email, login details, and billing status.</li>
            <li>Wedding website content like couple names, event details, venue information, story content, registry details, and design preferences.</li>
            <li>Guest management data like guest names, RSVP responses, party sizes, meal choices, seating information, and invite metadata.</li>
            <li>Planner and collaborator access data like invited users, access roles, and activity needed to operate the product safely.</li>
            <li>Technical data like device/browser info, usage logs, error logs, and analytics used to keep the service working.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-text-primary">How we use information</h2>
          <ul className="list-disc space-y-2 pl-6 text-text-secondary">
            <li>Provide, maintain, and improve the website builder, RSVP tools, guest tools, planner workflows, and related features.</li>
            <li>Generate drafts, recommendations, and setup outputs based on the information you provide.</li>
            <li>Process payments, prevent abuse, debug product issues, and protect the security of accounts and wedding data.</li>
            <li>Communicate important product, billing, and operational updates.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-text-primary">AI-assisted features</h2>
          <p className="text-text-secondary">
            Some Day of Love features use AI or model-backed tools to help interpret setup answers, propose content, and generate draft copy.
            You are responsible for reviewing generated outputs before publishing or sharing them with guests.
          </p>
          <p className="text-text-secondary">
            Other helper lanes are deterministic and grounded in the project details you already entered, so we do not treat every suggestion as a live model-backed system.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-text-primary">Sharing</h2>
          <p className="text-text-secondary">
            We do not sell your personal information. We may share data with service providers that help us operate the product,
            including hosting, authentication, analytics, payments, and communications providers, only as needed to run the service.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-text-primary">Data retention</h2>
          <p className="text-text-secondary">
            We keep account and wedding data for as long as needed to provide the service, comply with legal obligations, resolve disputes,
            and enforce agreements. You can contact us if you want account or wedding data deleted, subject to legal and operational limits.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-2xl font-semibold text-text-primary">Contact</h2>
          <p className="text-text-secondary">
            For privacy questions, contact <a className="text-primary underline" href="mailto:support@dayof.love">support@dayof.love</a>.
          </p>
        </section>
      </div>
    </div>
  );
};
