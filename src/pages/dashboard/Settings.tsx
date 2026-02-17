import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Input, Select, Badge } from '../../components/ui';
import { BillingModal } from '../../components/billing/BillingModal';
import { Save, ExternalLink, CreditCard, User, Globe, Bell, Lock, Layout, Check, Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getAllTemplates } from '../../templates/registry';
import { WeddingDataV1 } from '../../types/weddingData';
import { LayoutConfigV1 } from '../../types/layoutConfig';
import { regenerateLayout } from '../../lib/generateInitialLayout';

export const DashboardSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'account' | 'site' | 'notifications' | 'billing'>('account');
  const [currentTemplate, setCurrentTemplate] = useState<string>('base');
  const [changingTemplate, setChangingTemplate] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [templateSuccess, setTemplateSuccess] = useState<string | null>(null);
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [protoPlan, setProtoPlan] = useState<'free' | 'pro'>('free');

  useEffect(() => {
    loadCurrentTemplate();
  }, []);

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
                {showBillingModal && (
                  <BillingModal
                    currentPlan={protoPlan}
                    onClose={() => {
                      setShowBillingModal(false);
                      setProtoPlan('pro');
                    }}
                  />
                )}

                <Card variant="bordered" padding="lg">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Current Plan</CardTitle>
                        <CardDescription>Manage your subscription</CardDescription>
                      </div>
                      <Badge variant={protoPlan === 'pro' ? 'success' : 'neutral'}>
                        {protoPlan === 'pro' ? 'Pro' : 'Free'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {protoPlan === 'pro' ? (
                      <>
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-bold text-text-primary">$49</span>
                          <span className="text-text-secondary">one-time</span>
                        </div>
                        <div className="space-y-2">
                          {['Unlimited guests and RSVPs', 'Photo & video vault (5 GB)', 'Custom domain support', 'Priority support'].map(f => (
                            <p key={f} className="text-text-secondary flex items-center gap-2">
                              <Check className="w-4 h-4 text-success flex-shrink-0" aria-hidden="true" />
                              {f}
                            </p>
                          ))}
                        </div>
                        <p className="text-xs text-text-tertiary p-3 bg-surface-subtle rounded-lg">
                          Prototype mode — no real payment processed. Stripe integration is in test mode.
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-bold text-text-primary">$0</span>
                          <span className="text-text-secondary">forever</span>
                        </div>
                        <div className="space-y-2">
                          {['Up to 50 guests', 'Basic RSVP collection', 'Public wedding site'].map(f => (
                            <p key={f} className="text-text-secondary flex items-center gap-2">
                              <Check className="w-4 h-4 text-text-tertiary flex-shrink-0" aria-hidden="true" />
                              {f}
                            </p>
                          ))}
                          <p className="text-text-secondary flex items-center gap-2">
                            <Lock className="w-4 h-4 text-text-tertiary flex-shrink-0" aria-hidden="true" />
                            <span className="text-text-tertiary">Custom domain (Pro)</span>
                          </p>
                          <p className="text-text-secondary flex items-center gap-2">
                            <Lock className="w-4 h-4 text-text-tertiary flex-shrink-0" aria-hidden="true" />
                            <span className="text-text-tertiary">Unlimited guests (Pro)</span>
                          </p>
                        </div>
                        <div className="flex gap-3 pt-2">
                          <Button variant="outline" size="md" onClick={() => setShowBillingModal(true)}>
                            View Plans
                          </Button>
                          <Button variant="accent" size="md" onClick={() => setShowBillingModal(true)}>
                            <Sparkles className="w-4 h-4 mr-2" aria-hidden="true" />
                            Upgrade to Pro — $49
                          </Button>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card variant="bordered" padding="lg">
                  <CardHeader>
                    <CardTitle>Payment Method</CardTitle>
                    <CardDescription>Your default payment method</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {protoPlan === 'pro' ? (
                      <div className="flex items-center gap-4 p-4 border border-border rounded-lg">
                        <CreditCard className="w-6 h-6 text-text-secondary" aria-hidden="true" />
                        <div className="flex-1">
                          <p className="font-medium text-text-primary">Visa ending in 4242</p>
                          <p className="text-sm text-text-secondary">Expires 12/2026</p>
                        </div>
                        <Button variant="ghost" size="sm">Edit</Button>
                      </div>
                    ) : (
                      <div className="p-4 bg-surface-subtle rounded-lg text-center">
                        <p className="text-sm text-text-secondary mb-3">No payment method on file</p>
                        <Button variant="outline" size="sm" onClick={() => setShowBillingModal(true)}>
                          Add Payment Method
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card variant="bordered" padding="lg">
                  <CardHeader>
                    <CardTitle>Billing History</CardTitle>
                    <CardDescription>View past invoices and receipts</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {protoPlan === 'pro' ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between py-3 border-b border-border-subtle">
                          <div>
                            <p className="font-medium text-text-primary">Pro Plan</p>
                            <p className="text-sm text-text-secondary">Today (test transaction)</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="font-semibold text-text-primary">$49.00</span>
                            <Button variant="ghost" size="sm">Receipt</Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-text-secondary py-4 text-center">No billing history yet</p>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
