import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Input, Select, Badge } from '../../components/ui';
import { Save, ExternalLink, CreditCard, User, Globe, Bell, Lock, Layout, Check, Sparkles, AlertCircle, Loader2, Calendar, Repeat } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getAllTemplates } from '../../templates/registry';
import { WeddingDataV1 } from '../../types/weddingData';
import { LayoutConfigV1 } from '../../types/layoutConfig';
import { regenerateLayout } from '../../lib/generateInitialLayout';
import { fetchBillingInfo, createSubscriptionSession, daysUntilExpiry, type BillingInfo } from '../../lib/stripeService';
import { useAuth } from '../../hooks/useAuth';

export const DashboardSettings: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'account' | 'site' | 'notifications' | 'billing'>('account');
  const [currentTemplate, setCurrentTemplate] = useState<string>('base');
  const [changingTemplate, setChangingTemplate] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [templateSuccess, setTemplateSuccess] = useState<string | null>(null);
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [subscribeLoading, setSubscribeLoading] = useState(false);
  const [subscribeError, setSubscribeError] = useState<string | null>(null);

  useEffect(() => {
    loadCurrentTemplate();
  }, []);

  useEffect(() => {
    if (activeTab === 'billing' && user && !billingInfo) {
      setBillingLoading(true);
      fetchBillingInfo(user.id)
        .then(info => setBillingInfo(info))
        .catch(err => setBillingError(err.message))
        .finally(() => setBillingLoading(false));
    }
  }, [activeTab, user]);

  const handleSubscribe = async () => {
    if (!billingInfo) return;
    setSubscribeLoading(true);
    setSubscribeError(null);
    try {
      const origin = window.location.origin;
      const url = await createSubscriptionSession(
        billingInfo.wedding_site_id,
        `${origin}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        `${origin}/dashboard/settings?tab=billing&canceled=1`
      );
      window.location.href = url;
    } catch (err) {
      setSubscribeError(err instanceof Error ? err.message : 'Could not start subscription checkout.');
      setSubscribeLoading(false);
    }
  };

  const loadCurrentTemplate = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('wedding_sites')
        .select('active_template_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data) {
        setCurrentTemplate(data.active_template_id || 'base');
      }
    } catch (err) {
      console.error('Error loading template:', err);
    }
  };

  const handleTemplateChange = async (newTemplateId: string) => {
    setChangingTemplate(true);
    setTemplateError(null);
    setTemplateSuccess(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error: fetchError } = await supabase
        .from('wedding_sites')
        .select('wedding_data, layout_config')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!data) throw new Error('Wedding site not found');

      const weddingData = data.wedding_data as WeddingDataV1;
      const currentLayout = data.layout_config as LayoutConfigV1;

      const newLayout = regenerateLayout(newTemplateId, weddingData, currentLayout);

      const { error: updateError } = await supabase
        .from('wedding_sites')
        .update({
          active_template_id: newTemplateId,
          layout_config: newLayout,
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setCurrentTemplate(newTemplateId);
      setTemplateSuccess('Template changed successfully! Your content has been preserved.');
    } catch (err: unknown) {
      console.error('Error changing template:', err);
      setTemplateError((err as Error).message || 'Failed to change template');
    } finally {
      setChangingTemplate(false);
    }
  };

  const tabs = [
    { id: 'account' as const, label: 'Account', icon: User },
    { id: 'site' as const, label: 'Site Settings', icon: Globe },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
    { id: 'billing' as const, label: 'Billing', icon: CreditCard },
  ];

  return (
    <DashboardLayout currentPage="settings">
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">Settings</h1>
          <p className="text-text-secondary">Manage your account and wedding site preferences</p>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          <nav className="md:w-48 flex-shrink-0" aria-label="Settings navigation">
            <div className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors
                      ${activeTab === tab.id
                        ? 'bg-primary-light text-primary font-medium'
                        : 'text-text-secondary hover:bg-surface-subtle hover:text-text-primary'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>

          <div className="flex-1 space-y-6">
            {activeTab === 'account' && (
              <>
                <Card variant="bordered" padding="lg">
                  <CardHeader>
                    <CardTitle>Account Information</CardTitle>
                    <CardDescription>Update your account details</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Input
                      label="Partner names"
                      defaultValue="Alex & Jordan"
                    />
                    <Input
                      label="Email"
                      type="email"
                      defaultValue="alex.jordan@example.com"
                    />
                    <div className="flex justify-end pt-4">
                      <Button variant="primary" size="md">
                        <Save className="w-4 h-4 mr-2" aria-hidden="true" />
                        Save Changes
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card variant="bordered" padding="lg">
                  <CardHeader>
                    <CardTitle>Password</CardTitle>
                    <CardDescription>Change your password</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Input
                      label="Current password"
                      type="password"
                    />
                    <Input
                      label="New password"
                      type="password"
                    />
                    <Input
                      label="Confirm new password"
                      type="password"
                    />
                    <div className="flex justify-end pt-4">
                      <Button variant="primary" size="md">
                        Update Password
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {activeTab === 'site' && (
              <>
                <Card variant="bordered" padding="lg">
                  <CardHeader>
                    <CardTitle>Site URL</CardTitle>
                    <CardDescription>Your wedding site address</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">
                        Current URL
                      </label>
                      <div className="flex items-center gap-3">
                        <Input
                          defaultValue="alexandjordan"
                          className="flex-1"
                        />
                        <span className="text-text-secondary">.dayof.love</span>
                      </div>
                      <p className="text-sm text-text-secondary mt-2">
                        Your site is accessible at{' '}
                        <a href="https://alexandjordan.dayof.love" className="text-primary hover:text-primary-hover" target="_blank" rel="noopener noreferrer">
                          alexandjordan.dayof.love
                          <ExternalLink className="inline w-3 h-3 ml-1" aria-hidden="true" />
                        </a>
                      </p>
                    </div>
                    <div className="flex justify-end pt-4">
                      <Button variant="primary" size="md">
                        Update URL
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card variant="bordered" padding="lg">
                  <CardHeader>
                    <CardTitle>Custom Domain</CardTitle>
                    <CardDescription>Use your own domain name</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Badge variant="primary">Essential Plan Feature</Badge>
                    <Input
                      label="Custom domain"
                      placeholder="yourdomain.com"
                      helperText="Connect your own domain to your wedding site"
                    />
                    <div className="flex justify-end pt-4">
                      <Button variant="outline" size="md">
                        Connect Domain
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card variant="bordered" padding="lg">
                  <CardHeader>
                    <CardTitle>Privacy Settings</CardTitle>
                    <CardDescription>Control who can view your site</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Select
                      label="Site visibility"
                      options={[
                        { value: 'public', label: 'Public - Anyone with the link' },
                        { value: 'password', label: 'Password protected' },
                        { value: 'private', label: 'Private - Invite only' },
                      ]}
                      defaultValue="public"
                    />
                    <div className="flex justify-end pt-4">
                      <Button variant="primary" size="md">
                        Save Privacy Settings
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card variant="bordered" padding="lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Layout className="w-5 h-5" />
                      Template
                    </CardTitle>
                    <CardDescription>Change your wedding site template while preserving your content</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {templateSuccess && (
                      <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-primary text-sm">
                        {templateSuccess}
                      </div>
                    )}
                    {templateError && (
                      <div className="p-3 bg-error-light border border-error rounded-lg text-error text-sm">
                        {templateError}
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-3">
                        Choose Template
                      </label>
                      <div className="grid md:grid-cols-3 gap-4">
                        {getAllTemplates().map((template) => (
                          <button
                            key={template.id}
                            onClick={() => handleTemplateChange(template.id)}
                            disabled={changingTemplate || currentTemplate === template.id}
                            className={`p-4 rounded-lg border-2 transition-all text-left ${
                              currentTemplate === template.id
                                ? 'border-primary bg-primary/10'
                                : 'border-border hover:border-primary/50 hover:bg-surface-subtle'
                            } ${changingTemplate ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <h3 className="font-semibold text-text-primary mb-1">
                              {template.name}
                              {currentTemplate === template.id && (
                                <Badge variant="primary" className="ml-2">Active</Badge>
                              )}
                            </h3>
                            <p className="text-sm text-text-secondary">
                              {template.description}
                            </p>
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-text-secondary mt-3">
                        Your wedding information will be preserved when switching templates.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {activeTab === 'notifications' && (
              <Card variant="bordered" padding="lg">
                <CardHeader>
                  <CardTitle>Email Notifications</CardTitle>
                  <CardDescription>Choose what updates you want to receive</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="mt-1 w-5 h-5 rounded border-border text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-text-primary">New RSVPs</p>
                      <p className="text-sm text-text-secondary">Get notified when guests respond</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="mt-1 w-5 h-5 rounded border-border text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-text-primary">Photo uploads</p>
                      <p className="text-sm text-text-secondary">Get notified when guests upload photos</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-1 w-5 h-5 rounded border-border text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-text-primary">Weekly digest</p>
                      <p className="text-sm text-text-secondary">Summary of activity on your site</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-1 w-5 h-5 rounded border-border text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-text-primary">Product updates</p>
                      <p className="text-sm text-text-secondary">New features and improvements</p>
                    </div>
                  </label>

                  <div className="flex justify-end pt-4">
                    <Button variant="primary" size="md">
                      <Save className="w-4 h-4 mr-2" aria-hidden="true" />
                      Save Preferences
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {activeTab === 'billing' && (
              <>
                {billingLoading && (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-text-secondary" />
                  </div>
                )}

                {billingError && (
                  <div className="flex items-start gap-2 p-4 bg-error-light border border-error/20 rounded-lg text-error text-sm">
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
                            <div className="flex items-start gap-4 p-4 bg-surface-subtle rounded-xl border border-border">
                              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <Calendar className="w-5 h-5 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-text-primary">One-time purchase — 2 years access</p>
                                {billingInfo.site_expires_at && (() => {
                                  const days = daysUntilExpiry(billingInfo.site_expires_at);
                                  const expDate = new Date(billingInfo.site_expires_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
                                  const isExpiringSoon = days !== null && days <= 90;
                                  return (
                                    <p className={`text-sm mt-0.5 ${isExpiringSoon ? 'text-warning font-medium' : 'text-text-secondary'}`}>
                                      {isExpiringSoon && days !== null && days > 0
                                        ? `Expires in ${days} days — ${expDate}`
                                        : days !== null && days <= 0
                                          ? 'Site access has expired'
                                          : `Active until ${expDate}`}
                                    </p>
                                  );
                                })()}
                              </div>
                            </div>

                            <div className="border border-border rounded-xl overflow-hidden">
                              <div className="px-5 py-4 bg-gradient-to-r from-primary/5 to-accent/5 border-b border-border">
                                <div className="flex items-center gap-2 mb-1">
                                  <Repeat className="w-4 h-4 text-accent" />
                                  <p className="font-semibold text-text-primary">Switch to Annual Billing</p>
                                </div>
                                <p className="text-sm text-text-secondary">Never worry about renewals — your site stays live as long as you're subscribed.</p>
                              </div>
                              <div className="px-5 py-4 space-y-3">
                                <div className="space-y-2">
                                  {['Automatic annual renewal', 'Site stays live indefinitely', 'Cancel anytime', 'Same price as a 1-year renewal'].map(f => (
                                    <p key={f} className="flex items-center gap-2 text-sm text-text-secondary">
                                      <Check className="w-4 h-4 text-success flex-shrink-0" />
                                      {f}
                                    </p>
                                  ))}
                                </div>

                                {subscribeError && (
                                  <div className="flex items-start gap-2 p-3 bg-error-light border border-error/20 rounded-lg text-error text-sm">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                    <span>{subscribeError}</span>
                                  </div>
                                )}

                                <Button
                                  variant="accent"
                                  size="md"
                                  onClick={handleSubscribe}
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
                          <div className="flex items-start gap-4 p-4 bg-surface-subtle rounded-xl border border-border">
                            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
                              <Repeat className="w-5 h-5 text-success" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-text-primary">Annual subscription — site stays live</p>
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
                                {billingInfo.billing_type === 'recurring' ? 'Annual Plan' : 'DayOf.Love — 2-Year Access'}
                              </p>
                              <p className="text-sm text-text-secondary">
                                {new Date(billingInfo.paid_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
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
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
