import React, { useState } from 'react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Input, Select, Badge } from '../../components/ui';
import { Save, ExternalLink, CreditCard, User, Globe, Bell, Lock } from 'lucide-react';

export const DashboardSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'account' | 'site' | 'notifications' | 'billing'>('account');

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
                <Card variant="bordered" padding="lg">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Current Plan</CardTitle>
                        <CardDescription>Manage your subscription</CardDescription>
                      </div>
                      <Badge variant="primary">Essential</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold text-text-primary">$49</span>
                      <span className="text-text-secondary">one-time payment</span>
                    </div>
                    <div className="space-y-2">
                      <p className="text-text-secondary flex items-center gap-2">
                        <Lock className="w-4 h-4" aria-hidden="true" />
                        Unlimited guests and RSVPs
                      </p>
                      <p className="text-text-secondary flex items-center gap-2">
                        <Lock className="w-4 h-4" aria-hidden="true" />
                        Photo & video vault
                      </p>
                      <p className="text-text-secondary flex items-center gap-2">
                        <Lock className="w-4 h-4" aria-hidden="true" />
                        Custom domain support
                      </p>
                    </div>
                    <div className="flex gap-3 pt-4">
                      <Button variant="outline" size="md">
                        View Plans
                      </Button>
                      <Button variant="accent" size="md">
                        Upgrade to Premium
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card variant="bordered" padding="lg">
                  <CardHeader>
                    <CardTitle>Payment Method</CardTitle>
                    <CardDescription>Your default payment method</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4 p-4 border border-border rounded-lg">
                      <CreditCard className="w-6 h-6 text-text-secondary" aria-hidden="true" />
                      <div className="flex-1">
                        <p className="font-medium text-text-primary">Visa ending in 4242</p>
                        <p className="text-sm text-text-secondary">Expires 12/2026</p>
                      </div>
                      <Button variant="ghost" size="sm">
                        Edit
                      </Button>
                    </div>
                    <Button variant="outline" size="md">
                      Add Payment Method
                    </Button>
                  </CardContent>
                </Card>

                <Card variant="bordered" padding="lg">
                  <CardHeader>
                    <CardTitle>Billing History</CardTitle>
                    <CardDescription>View past invoices and receipts</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-3 border-b border-border-subtle">
                        <div>
                          <p className="font-medium text-text-primary">Essential Plan</p>
                          <p className="text-sm text-text-secondary">April 1, 2026</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-semibold text-text-primary">$49.00</span>
                          <Button variant="ghost" size="sm">
                            Receipt
                          </Button>
                        </div>
                      </div>
                    </div>
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
