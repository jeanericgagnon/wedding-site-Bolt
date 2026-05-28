import { buildGuestContactUpdateUrl } from '../../lib/publicGuestLinks';

export type GuestContactLinkRecipient = {
  name: string;
  inviteToken: string;
};

export type NoContactChecklistRecipient = {
  name: string;
  inviteToken?: string | null;
};

export function buildGuestContactLinkListPayload(
  origin: string,
  siteSlug: string,
  recipients: GuestContactLinkRecipient[],
): string {
  const lines = recipients.map((recipient) => (
    `${recipient.name}: ${buildGuestContactUpdateUrl(origin, siteSlug, recipient.inviteToken)}`
  ));

  return [
    'Guest update links',
    '',
    ...lines,
  ].join('\n');
}

export function buildNoContactChecklistPayload(
  origin: string,
  siteSlug: string,
  recipients: NoContactChecklistRecipient[],
): string {
  const lines = recipients.map((recipient) => {
    if (recipient.inviteToken) {
      return `- ${recipient.name}: send guest update link ${buildGuestContactUpdateUrl(origin, siteSlug, recipient.inviteToken)}`;
    }

    return `- ${recipient.name}: get phone or email, then resend invite`;
  });

  return lines.join('\n');
}
