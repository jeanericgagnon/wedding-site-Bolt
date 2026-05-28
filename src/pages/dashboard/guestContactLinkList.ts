import { buildGuestContactUpdateUrl } from '../../lib/publicGuestLinks';

export type GuestContactLinkRecipient = {
  name: string;
  inviteToken: string;
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
