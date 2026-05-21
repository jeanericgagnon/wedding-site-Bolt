import { useEffect, useRef } from 'react';

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
  const smsCheckoutRequestIdRef = useRef(0);

  useEffect(() => {
    smsCheckoutRequestIdRef.current += 1;
    setBuyingPack(null);
  }, [setBuyingPack, weddingSite?.id]);

  async function handleBuySmsPack(pack: SmsPack) {
    if (!weddingSite) return;
    if (!isSmsProviderEnabled()) {
      toast('Text credit purchases will open after the final texting setup is complete.', 'info');
      return;
    }

    const requestId = ++smsCheckoutRequestIdRef.current;
    const requestSiteId = weddingSite.id;
    const isCurrentSmsCheckout = () =>
      requestId === smsCheckoutRequestIdRef.current && weddingSite?.id === requestSiteId;
    setBuyingPack(pack);
    try {
      const base = window.location.origin;
      const success = `${base}/dashboard/messages?smsCredits=success`;
      const cancel = `${base}/dashboard/messages?smsCredits=cancel`;
      const url = await createSmsCreditsSession(requestSiteId, success, cancel, pack);
      if (!isCurrentSmsCheckout()) return;
      void logAppAction({
        weddingSiteId: requestSiteId,
        area: 'billing',
        type: 'sms_credits_checkout_started',
        summary: 'Text credits checkout was started.',
        targetId: requestSiteId,
        targetLabel: 'Text credits',
        metadata: {
          pack,
          currentCredits: weddingSite.sms_credits_balance ?? 0,
        },
      });
      window.location.href = url;
    } catch (err) {
      if (!isCurrentSmsCheckout()) return;
      toast(safeMessagesError(err, 'Couldn’t open checkout right now. Please try again.'), 'error');
    } finally {
      if (isCurrentSmsCheckout()) setBuyingPack(null);
    }
  }

  return {
    handleBuySmsPack,
  };
}
