import React, { useState } from 'react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { Card, Button, Badge } from '../../components/ui';
import { Lock, Unlock, MessageSquare, Video, QrCode, Calendar, Users, Mail } from 'lucide-react';

interface VaultItem {
  id: string;
  type: 'message' | 'video';
  uploadedBy: string;
  uploadDate: string;
}

interface AnniversaryVault {
  id: string;
  year: number;
  unlockDate: string;
  status: 'locked' | 'unlocked';
  items: VaultItem[];
  totalMessages: number;
  totalVideos: number;
  contributors: number;
}

interface Toast {
  id: number;
  message: string;
}

const ToastContainer: React.FC<{ toasts: Toast[] }> = ({ toasts }) => {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="bg-surface-raised border border-border shadow-lg rounded-lg p-4 min-w-[300px]"
        >
          <p className="text-sm text-ink">{toast.message}</p>
        </div>
      ))}
    </div>
  );
};

export const DashboardVault: React.FC = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [selectedVault, setSelectedVault] = useState<string | null>(null);

  const onTodo = (message: string) => {
    console.log('TODO:', message);
    const newToast: Toast = {
      id: Date.now(),
      message: `TODO: ${message}`,
    };
    setToasts((prev) => [...prev, newToast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
    }, 2000);
  };

  const weddingDate = '2026-06-15';

  const vaults: AnniversaryVault[] = [
    {
      id: '1',
      year: 1,
      unlockDate: '2027-06-15',
      status: 'locked',
      items: [
        { id: '1', type: 'message', uploadedBy: 'Sarah Miller', uploadDate: '2026-06-16' },
        { id: '2', type: 'video', uploadedBy: 'David Chen', uploadDate: '2026-06-17' },
        { id: '3', type: 'message', uploadedBy: 'Emily Rodriguez', uploadDate: '2026-06-18' },
        { id: '4', type: 'message', uploadedBy: 'Jessica Park', uploadDate: '2026-06-20' },
        { id: '5', type: 'video', uploadedBy: 'Michael Thompson', uploadDate: '2026-06-21' },
      ],
      totalMessages: 3,
      totalVideos: 2,
      contributors: 5,
    },
    {
      id: '5',
      year: 5,
      unlockDate: '2031-06-15',
      status: 'locked',
      items: [
        { id: '6', type: 'message', uploadedBy: 'Sarah Miller', uploadDate: '2026-06-16' },
        { id: '7', type: 'video', uploadedBy: 'David Chen', uploadDate: '2026-06-17' },
        { id: '8', type: 'message', uploadedBy: 'Emily Rodriguez', uploadDate: '2026-06-18' },
      ],
      totalMessages: 2,
      totalVideos: 1,
      contributors: 3,
    },
    {
      id: '10',
      year: 10,
      unlockDate: '2036-06-15',
      status: 'locked',
      items: [
        { id: '9', type: 'message', uploadedBy: 'Sarah Miller', uploadDate: '2026-06-16' },
        { id: '10', type: 'message', uploadedBy: 'David Chen', uploadDate: '2026-06-17' },
      ],
      totalMessages: 2,
      totalVideos: 0,
      contributors: 2,
    },
  ];

  const getDaysUntilUnlock = (unlockDate: string) => {
    const today = new Date();
    const unlock = new Date(unlockDate);
    const diffTime = unlock.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <DashboardLayout currentPage="vault">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">Anniversary Vaults</h1>
          <p className="text-text-secondary">
            Time capsule messages and videos from your guests, unlocked on future anniversaries
          </p>
        </div>

        <Card variant="bordered" padding="lg" className="bg-gradient-to-br from-primary-light to-accent-light">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="p-4 bg-surface rounded-lg">
              <QrCode className="w-12 h-12 text-primary" aria-hidden="true" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-text-primary mb-2">
                Share with your guests
              </h3>
              <p className="text-text-secondary mb-4">
                Let guests scan this QR code to record heartfelt messages and videos for your future anniversaries. No app or account required.
              </p>
              <div className="flex gap-3">
                <Button variant="primary" size="md" onClick={() => onTodo('View QR Code for vault contributions')}>
                  View QR Code
                </Button>
                <Button variant="outline" size="md" onClick={() => onTodo('Send invitation emails')}>
                  <Mail className="w-4 h-4 mr-2" aria-hidden="true" />
                  Send Invites
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          {vaults.map((vault) => {
            const daysUntilUnlock = getDaysUntilUnlock(vault.unlockDate);
            const isUnlocked = vault.status === 'unlocked';

            return (
              <Card key={vault.id} variant="bordered" padding="lg">
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-start gap-4">
                      <div
                        className={`p-4 rounded-lg flex-shrink-0 ${
                          isUnlocked ? 'bg-primary-light' : 'bg-surface-subtle'
                        }`}
                      >
                        {isUnlocked ? (
                          <Unlock className="w-8 h-8 text-primary" aria-hidden="true" />
                        ) : (
                          <Lock className="w-8 h-8 text-text-tertiary" aria-hidden="true" />
                        )}
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-text-primary mb-1">
                          {vault.year}{vault.year === 1 ? 'st' : vault.year === 5 ? 'th' : 'th'} Anniversary Vault
                        </h2>
                        <div className="flex items-center gap-2 text-text-secondary">
                          <Calendar className="w-4 h-4" aria-hidden="true" />
                          <span>
                            {isUnlocked ? (
                              <>Unlocked on {new Date(vault.unlockDate).toLocaleDateString()}</>
                            ) : (
                              <>
                                Unlocks {new Date(vault.unlockDate).toLocaleDateString()} ({daysUntilUnlock} days)
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Badge variant={isUnlocked ? 'success' : 'default'} className="text-sm px-3 py-1">
                      {isUnlocked ? 'Unlocked' : 'Locked'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex items-center gap-3 p-4 bg-surface-subtle rounded-lg">
                      <MessageSquare className="w-5 h-5 text-primary flex-shrink-0" aria-hidden="true" />
                      <div>
                        <p className="text-xl font-bold text-text-primary">{vault.totalMessages}</p>
                        <p className="text-sm text-text-secondary">Messages</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-surface-subtle rounded-lg">
                      <Video className="w-5 h-5 text-accent flex-shrink-0" aria-hidden="true" />
                      <div>
                        <p className="text-xl font-bold text-text-primary">{vault.totalVideos}</p>
                        <p className="text-sm text-text-secondary">Videos</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-surface-subtle rounded-lg">
                      <Users className="w-5 h-5" style={{ color: 'var(--color-secondary)' }} aria-hidden="true" />
                      <div>
                        <p className="text-xl font-bold text-text-primary">{vault.contributors}</p>
                        <p className="text-sm text-text-secondary">Contributors</p>
                      </div>
                    </div>
                  </div>

                  {isUnlocked ? (
                    <div className="space-y-3">
                      <h3 className="font-semibold text-text-primary">Messages & Videos</h3>
                      <div className="space-y-2">
                        {vault.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center gap-4 p-4 bg-surface hover:bg-surface-subtle rounded-lg transition-colors cursor-pointer border border-border-subtle"
                          >
                            <div className="w-12 h-12 rounded-lg bg-primary-light flex items-center justify-center flex-shrink-0">
                              {item.type === 'message' ? (
                                <MessageSquare className="w-6 h-6 text-primary" aria-hidden="true" />
                              ) : (
                                <Video className="w-6 h-6 text-primary" aria-hidden="true" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-text-primary truncate">
                                {item.type === 'message' ? 'Message' : 'Video'} from {item.uploadedBy}
                              </p>
                              <p className="text-sm text-text-secondary">
                                Recorded on {new Date(item.uploadDate).toLocaleDateString()}
                              </p>
                            </div>
                            <Badge variant={item.type === 'message' ? 'primary' : 'secondary'}>
                              {item.type}
                            </Badge>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => onTodo(`View ${item.type} from ${item.uploadedBy}`)}
                            >
                              View
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-surface-subtle border-2 border-dashed border-border rounded-lg p-8 text-center">
                      <Lock className="w-12 h-12 text-text-tertiary mx-auto mb-4" aria-hidden="true" />
                      <h3 className="text-lg font-semibold text-text-primary mb-2">
                        This vault is locked
                      </h3>
                      <p className="text-text-secondary mb-4">
                        Content will be revealed on your {vault.year}
                        {vault.year === 1 ? 'st' : vault.year === 5 ? 'th' : 'th'} anniversary.
                        You have {vault.items.length} surprise{vault.items.length !== 1 ? 's' : ''} waiting!
                      </p>
                      <p className="text-sm text-text-tertiary">
                        {daysUntilUnlock} days until unlock
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      <ToastContainer toasts={toasts} />
    </DashboardLayout>
  );
};
