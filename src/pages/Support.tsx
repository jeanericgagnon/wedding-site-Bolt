import React from 'react';
import { Link } from 'react-router-dom';
import { Header, Footer } from '../components/layout';

export const Support: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background text-text-primary">
      <Header />

      <main className="flex-1 px-6 py-14 md:py-16">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="rounded-lg border border-border-subtle bg-white/86 p-7 shadow-sm sm:p-8">
            <p className="text-xs font-medium text-text-tertiary">dayof support</p>
            <h1 className="mt-3 max-w-2xl text-4xl font-semibold leading-tight text-text-primary">We&apos;ll help you get back to planning.</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-text-secondary">Help for accounts, billing, guest details, RSVPs, photos, and wedding websites.</p>
          </div>

          <section className="rounded-lg border border-border-subtle bg-white/72 p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-text-primary">Product or account help</h2>
            <p className="mt-3 text-text-secondary">
              Email <a className="text-primary underline" href="mailto:support@dayof.love">support@dayof.love</a> with the account email, site slug, and a short description of what happened.
            </p>
            <p className="mt-3 text-text-secondary">
              If guests are blocked right before an event, include &quot;time sensitive&quot; in the subject and the page URL where the issue happened.
            </p>
          </section>

          <section className="rounded-lg border border-border-subtle bg-white/72 p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-text-primary">Billing and refunds</h2>
            <p className="mt-3 text-text-secondary">
              Billing questions and refund requests are handled by support. You can also review the refund policy.
            </p>
            <Link className="mt-4 inline-flex text-primary underline" to="/refund">Refund policy</Link>
          </section>

          <section className="rounded-lg border border-border-subtle bg-white/72 p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-text-primary">Privacy or data requests</h2>
            <p className="mt-3 text-text-secondary">
              For privacy, account deletion, or wedding data requests, email support from the account owner email when possible.
            </p>
            <Link className="mt-4 inline-flex text-primary underline" to="/privacy">Privacy policy</Link>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};
