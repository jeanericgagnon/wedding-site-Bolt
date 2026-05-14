import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { HeartHandshake } from 'lucide-react';
import { OwnerPreviewBanner } from '../components/site/OwnerPreviewBanner';
import { customerSafeErrorMessage } from '../lib/customerSafeError';
import {
  buildPublicAccessArtifacts,
  capturePublicInviteTokenFromSearch,
} from '../lib/publicAccessArtifacts';
import { hasGuestPublicSubmissionRuntime, submitGuestbookEntry } from './guestPublicSubmissionService';
import { GuestbookSubmitFormPanel } from './GuestbookSubmitFormPanel';

export const friendlyGuestbookError = (err: unknown) => {
  return customerSafeErrorMessage(err, 'Couldn’t send your note right now. Please try again in a moment.', {
    allow: [/^Write a note before sending\.$/i],
  });
};

export const safeGuestbookFunctionError = (value: unknown) => {
  return friendlyGuestbookError(typeof value === 'string' ? value : '');
};

export const buildGuestbookAccessPayload = (slug: string) => {
  const searchParams = new URLSearchParams(window.location.search);
  return buildPublicAccessArtifacts(slug, searchParams);
};

export const GuestbookSubmit: React.FC = () => {
  const { siteRef } = useParams();
  const siteSlug = useMemo(() => (siteRef ?? '').trim().toLowerCase(), [siteRef]);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputClassName = 'w-full rounded-lg border border-stone-200 bg-white px-4 py-3 text-base text-stone-900 outline-none transition focus:border-stone-400 focus:ring-4 focus:ring-stone-200/70';
  const labelClassName = 'mb-2 block text-sm font-medium text-stone-800';

  useEffect(() => {
    if (siteSlug) capturePublicInviteTokenFromSearch(siteSlug, new URLSearchParams(window.location.search));
  }, [siteSlug]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setStatus(null);
    setError(null);
    if (!hasGuestPublicSubmissionRuntime()) {
      setError('Guestbook notes are not ready yet. Please check back soon.');
      return;
    }
    if (!message.trim()) {
      setError('Write a note before sending.');
      return;
    }

    setSubmitting(true);
    try {
      await submitGuestbookEntry({ siteSlug, guestName, guestEmail, message, website, ...buildGuestbookAccessPayload(siteSlug) });
      setStatus('Your note is in. Thank you.');
      setMessage('');
      setGuestEmail('');
    } catch (err) {
      setError(friendlyGuestbookError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#fbf7f1] px-4 py-6 text-stone-950 sm:py-10">
      <OwnerPreviewBanner />
      <main className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <section className="overflow-hidden rounded-lg border border-stone-200 bg-white">
          <div className="relative min-h-[250px] bg-stone-900">
            <img
              src="/preview-photos/024-root-landscape.jpg"
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-70"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/45 to-stone-950/10" />
            <div className="relative flex min-h-[250px] flex-col justify-end p-6 text-white sm:p-8">
              <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-white/18 backdrop-blur">
                <HeartHandshake className="h-5 w-5" aria-hidden="true" />
              </span>
              <p className="text-xs font-semibold text-white/70">Guestbook</p>
              <h1 className="mt-3 text-3xl font-semibold leading-tight text-white sm:text-4xl">Leave a note</h1>
              <p className="mt-3 max-w-md text-sm leading-6 text-white/90">
                Send the couple a written memory or well-wish without creating an account.
              </p>
            </div>
          </div>
          <div className="p-5 text-sm leading-6 text-stone-600 sm:p-6">
            A quick note from the people who were there becomes part of the wedding record. Keep it sweet, specific, and in your own voice.
          </div>
        </section>

        <GuestbookSubmitFormPanel
          siteSlug={siteSlug}
          guestName={guestName}
          guestEmail={guestEmail}
          message={message}
          website={website}
          status={status}
          error={error}
          submitting={submitting}
          inputClassName={inputClassName}
          labelClassName={labelClassName}
          onSubmit={onSubmit}
          onGuestNameChange={setGuestName}
          onGuestEmailChange={setGuestEmail}
          onMessageChange={setMessage}
          onWebsiteChange={setWebsite}
        />
      </main>
    </div>
  );
};

export default GuestbookSubmit;
