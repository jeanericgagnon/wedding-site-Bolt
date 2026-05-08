import { createSmsCreditsSession } from '../../../lib/stripeService';
import { isSmsProviderEnabled } from '../../../lib/smsProvider';
import { logAppAction } from '../../../lib/actionAudit';
import { safeMessagesError } from './messageDashboardUtils';
import type { WeddingSite, Toast } from './messageDashboardTypes';

type SmsPack = 'sms_100' | 'sms_500' | 'sms_1000';

type UseMessageBillingActionsArgs = {
  setBuyingPack: (pack: SmsPack | null) => void;
  toast: (message: string, type?: Toast['type']) => void;
  weddingSite: WeddingSite | null;
};

export function useMessageBillingActions({
  setBuyingPack,
  toast,
  weddingSite,
}: UseMessageBillingActionsArgs) {
  async function handleBuySmsPack(pack: SmsPack) {
    if (!weddingSite) return;
    if (!isSmsProviderEnabled()) {
      toast('Text credit purchases will open after the final texting setup is complete.', 'info');
      return;
    }

    setBuyingPack(pack);
    try {
      const base = window.location.origin;
      const success = `${base}/dashboard/messages?smsCredits=success`;
      const cancel = `${base}/dashboard/messages?smsCredits=cancel`;
      const url = await createSmsCreditsSession(weddingSite.id, success, cancel, pack);
      void logAppAction({
        weddingSiteId: weddingSite.id,
        area: 'billing',
        type: 'sms_credits_checkout_started',
        summary: 'Text credits checkout was started.',
        targetId: weddingSite.id,
        targetLabel: 'Text credits',
        metadata: {
          pack,
          currentCredits: weddingSite.sms_credits_balance ?? 0,
        },
      });
      window.location.href = url;
    } catch (err) {
      toast(safeMessagesError(err, 'Couldn’t open checkout right now. Please try again.'), 'error');
    } finally {
      setBuyingPack(null);
    }
  }

  return {
    handleBuySmsPack,
  };
}
