import React from 'react';
import { Header, Footer } from '../components/layout';

export const Refund: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background text-text-primary">
      <Header />

      <main className="flex-1 px-6 py-14 md:py-16">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="rounded-lg border border-border-subtle bg-white/86 p-7 shadow-sm sm:p-8">
            <p className="text-xs font-medium text-text-tertiary">dayof support</p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight text-text-primary">Refund policy</h1>
            <p className="mt-3 text-text-secondary">Last updated April 29, 2026</p>
            <p className="mt-5 max-w-3xl text-base leading-7 text-text-secondary">
              If dayof is not the right fit, contact{' '}
              <a className="text-primary underline" href="mailto:support@dayof.love">support@dayof.love</a>.
              Refund requests are reviewed against the policy below.
            </p>
          </div>

          <section className="rounded-lg border border-border-subtle bg-white/72 p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-text-primary">30-day refund window</h2>
            <p className="mt-3 text-text-secondary">
              One-time purchases are eligible for a full refund within 30 days of purchase.
            </p>
          </section>

          <section className="rounded-lg border border-border-subtle bg-white/72 p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-text-primary">After 30 days</h2>
            <p className="mt-3 text-text-secondary">
              After 30 days, refund eligibility may be prorated based on remaining access time and account activity.
              Approved refunds may reduce or end paid access.
            </p>
          </section>

          <section className="rounded-lg border border-border-subtle bg-white/72 p-6 shadow-sm">
            <h2 className="text-2xl font-semibold text-text-primary">How to request a refund</h2>
            <p className="mt-3 text-text-secondary">
              Email support with the account email, purchase date, and reason for the request. We may ask for extra
              information to verify ownership before making account or billing changes.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};
