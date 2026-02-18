import React from 'react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { Card } from '../../components/ui';
import { Lock, MessageSquare, Video, QrCode, Calendar, Users, Sparkles } from 'lucide-react';

export const DashboardVault: React.FC = () => {
  return (
    <DashboardLayout currentPage="vault">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-text-primary">Anniversary Vaults</h1>
              <span className="px-2.5 py-1 text-xs font-semibold bg-accent-light text-accent border border-accent/20 rounded-full">
                Coming Soon
              </span>
            </div>
            <p className="text-text-secondary">
              Time capsule messages and videos from your guests, unlocked on future anniversaries
            </p>
          </div>
        </div>

        <Card variant="bordered" padding="lg" className="bg-gradient-to-br from-primary-light to-accent-light">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="p-4 bg-surface rounded-lg flex-shrink-0">
              <QrCode className="w-12 h-12 text-primary" aria-hidden="true" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-text-primary mb-2">How it will work</h3>
              <p className="text-text-secondary mb-2">
                Share a QR code at your wedding — guests scan it to record heartfelt messages and short videos. No app or account required.
              </p>
              <p className="text-text-secondary">
                Each vault unlocks automatically on a future anniversary, so you and your partner can revisit them together.
              </p>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: QrCode,
              title: 'Shareable QR Code',
              description: 'Display at your reception for guests to contribute instantly.',
            },
            {
              icon: Lock,
              title: 'Time-locked Vaults',
              description: 'Choose 1st, 5th, and 10th anniversary unlock dates.',
            },
            {
              icon: Sparkles,
              title: 'Messages & Videos',
              description: 'Guests can write heartfelt notes or record short video messages.',
            },
          ].map(({ icon: Icon, title, description }) => (
            <Card key={title} variant="bordered" padding="lg">
              <div className="flex flex-col gap-3">
                <div className="p-3 bg-surface-subtle rounded-lg w-fit">
                  <Icon className="w-6 h-6 text-primary" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-semibold text-text-primary mb-1">{title}</h3>
                  <p className="text-sm text-text-secondary">{description}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Card variant="bordered" padding="lg">
          <div className="flex items-center gap-4 mb-6">
            <Calendar className="w-6 h-6 text-text-secondary" aria-hidden="true" />
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Anniversary Vault Timeline</h2>
              <p className="text-sm text-text-secondary">Three time capsule milestones will be created automatically</p>
            </div>
          </div>
          <div className="space-y-4">
            {[
              { year: 1 },
              { year: 5 },
              { year: 10 },
            ].map(({ year }) => (
              <div key={year} className="flex items-center gap-5 p-4 bg-surface-subtle rounded-xl border border-border-subtle">
                <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center border border-border flex-shrink-0">
                  <Lock className="w-5 h-5 text-text-tertiary" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-text-primary">{year}{year === 1 ? 'st' : year === 5 ? 'th' : 'th'} Anniversary Vault</p>
                  <p className="text-sm text-text-secondary">Unlocks {year} year{year !== 1 ? 's' : ''} after your wedding date</p>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
                    <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
                    Messages
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
                    <Video className="w-3.5 h-3.5" aria-hidden="true" />
                    Videos
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
                    <Users className="w-3.5 h-3.5" aria-hidden="true" />
                    Contributors
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="bg-primary-light border border-primary/20 rounded-xl p-6 text-center">
          <p className="text-sm font-medium text-text-primary mb-1">This feature launches before your wedding day</p>
          <p className="text-sm text-text-secondary">
            Anniversary Vaults will be fully active and ready to share with your guests. No action needed from you right now.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
};
