import { AlertCircle, Calendar, Check, Loader2, Repeat, Sparkles } from 'lucide-react';
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui';
import { daysUntilExpiry, type BillingInfo } from '../../../lib/stripeService';
import { formatSettingsDate } from '../settingsDate';

type SettingsBillingPanelProps = {
  billingInfo: BillingInfo | null;
  billingLoading: boolean;
  billingError: string | null;
  subscribeError: string | null;
  subscribeLoading: boolean;
  onSubscribe: () => void;
};

export function SettingsBillingPanel({
  billingInfo,
  billingLoading,
  billingError,
  subscribeError,
  subscribeLoading,
  onSubscribe,
}: SettingsBillingPanelProps) {
  return (
    <>
      {billingLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-text-secondary" />
        </div>
      )}

      {billingError && (
        <div className="flex items-start gap-2 p-4 bg-surface-subtle border border-border-subtle rounded-lg text-text-secondary text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{billingError}</span>
        </div>
      )}

      {!billingLoading && billingInfo && (
        <>
          <Card variant="bordered" padding="lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Site Access</CardTitle>
                  <CardDescription>Your current plan and access period</CardDescription>
                </div>
                <Badge variant={billingInfo.billing_type === 'recurring' ? 'success' : 'primary'}>
                  {billingInfo.billing_type === 'recurring' ? 'Annual Plan' : '2-Year Access'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {billingInfo.billing_type === 'one_time' ? (
                <>
                  <div className="flex items-start gap-4 p-4 bg-surface-subtle rounded-lg border border-border">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-text-primary">One-time purchase - 2 years access</p>
                      {billingInfo.site_expires_at && <BillingExpiryLabel siteExpiresAt={billingInfo.site_expires_at} />}
                    </div>
                  </div>

                  <div className="border border-border rounded-lg overflow-hidden">
                    <div className="px-5 py-4 bg-surface-subtle/45 border-b border-border">
                      <div className="flex items-center gap-2 mb-1">
                        <Repeat className="w-4 h-4 text-accent" />
                        <p className="font-semibold text-text-primary">Switch to Annual Billing</p>
                      </div>
                      <p className="text-sm text-text-secondary">Never worry about renewals - your site stays live as long as you're subscribed.</p>
                    </div>
                    <div className="px-5 py-4 space-y-3">
                      <div className="space-y-2">
                        {['Automatic annual renewal', 'Site stays live indefinitely', 'Cancel anytime', 'Same price as a 1-year renewal'].map((feature) => (
                          <p key={feature} className="flex items-center gap-2 text-sm text-text-secondary">
                            <Check className="w-4 h-4 text-success flex-shrink-0" />
                            {feature}
                          </p>
                        ))}
                      </div>

                      {subscribeError && (
                        <div className="flex items-start gap-2 p-3 bg-surface-subtle border border-border-subtle rounded-lg text-text-secondary text-sm">
                          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <span>{subscribeError}</span>
                        </div>
                      )}

                      <Button
                        variant="accent"
                        size="md"
                        onClick={onSubscribe}
                        disabled={subscribeLoading}
                      >
                        {subscribeLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Redirecting...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Switch to Annual Billing
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-start gap-4 p-4 bg-surface-subtle rounded-lg border border-border">
                  <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
                    <Repeat className="w-5 h-5 text-success" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-text-primary">Annual subscription - site stays live</p>
                    <p className="text-sm text-text-secondary mt-0.5">Your site renews automatically each year. Cancel anytime from your Stripe customer portal.</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {billingInfo.paid_at && (
            <Card variant="bordered" padding="lg">
              <CardHeader>
                <CardTitle>Billing History</CardTitle>
                <CardDescription>Your payment records</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between py-3 border-b border-border-subtle">
                  <div>
                    <p className="font-medium text-text-primary">
                      {billingInfo.billing_type === 'recurring' ? 'Annual Plan' : 'dayof.love, 2-Year Access'}
                    </p>
                    <p className="text-sm text-text-secondary">
                      {formatSettingsDate(billingInfo.paid_at, { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="success">Paid</Badge>
                    <span className="font-semibold text-text-primary">$49.00</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </>
  );
}

function BillingExpiryLabel({ siteExpiresAt }: { siteExpiresAt: string }) {
  const days = daysUntilExpiry(siteExpiresAt);
  const expDate = formatSettingsDate(siteExpiresAt, { year: 'numeric', month: 'long', day: 'numeric' });
  const isExpiringSoon = days !== null && days <= 90;

  return (
    <p className={`text-sm mt-0.5 ${isExpiringSoon ? 'text-text-secondary font-medium' : 'text-text-secondary'}`}>
      {isExpiringSoon && days !== null && days > 0
        ? `Expires in ${days} days - ${expDate}`
        : days !== null && days <= 0
          ? 'Site access has expired'
          : `Active until ${expDate}`}
    </p>
  );
}
