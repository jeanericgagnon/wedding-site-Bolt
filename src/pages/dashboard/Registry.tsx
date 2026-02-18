import React, { useState } from 'react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { Card, Button, Badge } from '../../components/ui';
import { Gift, Plus, ExternalLink, DollarSign, CheckCircle2, Search } from 'lucide-react';

interface RegistryItem {
  id: string;
  name: string;
  price: number;
  purchased: boolean;
  purchasedBy?: string;
  url: string;
  imageUrl: string;
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

export const DashboardRegistry: React.FC = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

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

  const registryItems: RegistryItem[] = [
    {
      id: '1',
      name: 'Kitchen Stand Mixer',
      price: 349.99,
      purchased: true,
      purchasedBy: 'Sarah Miller',
      url: 'https://example.com',
      imageUrl: 'https://images.pexels.com/photos/4226881/pexels-photo-4226881.jpeg',
    },
    {
      id: '2',
      name: 'Espresso Machine',
      price: 599.99,
      purchased: false,
      url: 'https://example.com',
      imageUrl: 'https://images.pexels.com/photos/324028/pexels-photo-324028.jpeg',
    },
    {
      id: '3',
      name: 'Dining Table Set',
      price: 1299.99,
      purchased: false,
      url: 'https://example.com',
      imageUrl: 'https://images.pexels.com/photos/1350789/pexels-photo-1350789.jpeg',
    },
    {
      id: '4',
      name: 'Luxury Bedding Set',
      price: 249.99,
      purchased: true,
      purchasedBy: 'David Chen',
      url: 'https://example.com',
      imageUrl: 'https://images.pexels.com/photos/1034584/pexels-photo-1034584.jpeg',
    },
  ];

  const stats = {
    totalItems: registryItems.length,
    purchased: registryItems.filter(item => item.purchased).length,
    remaining: registryItems.filter(item => !item.purchased).length,
    totalValue: registryItems.reduce((sum, item) => sum + item.price, 0),
  };

  return (
    <DashboardLayout currentPage="registry">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-text-primary mb-2">Gift Registry</h1>
            <p className="text-text-secondary">Manage your wedding gift registry</p>
          </div>
          <Button variant="primary" size="md" onClick={() => onTodo('Add registry item')}>
            <Plus className="w-4 h-4 mr-2" aria-hidden="true" />
            Add Item
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card variant="bordered" padding="md">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary-light rounded-lg flex-shrink-0">
                <Gift className="w-6 h-6 text-primary" aria-hidden="true" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">{stats.totalItems}</p>
                <p className="text-sm text-text-secondary">Total Items</p>
              </div>
            </div>
          </Card>

          <Card variant="bordered" padding="md">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg flex-shrink-0" style={{ backgroundColor: 'var(--color-success)', opacity: 0.15 }}>
                <CheckCircle2 className="w-6 h-6" style={{ color: 'var(--color-success)' }} aria-hidden="true" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">{stats.purchased}</p>
                <p className="text-sm text-text-secondary">Purchased</p>
              </div>
            </div>
          </Card>

          <Card variant="bordered" padding="md">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-accent-light rounded-lg flex-shrink-0">
                <Gift className="w-6 h-6 text-accent" aria-hidden="true" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">{stats.remaining}</p>
                <p className="text-sm text-text-secondary">Remaining</p>
              </div>
            </div>
          </Card>

          <Card variant="bordered" padding="md">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary-light rounded-lg flex-shrink-0">
                <DollarSign className="w-6 h-6 text-primary" aria-hidden="true" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">${stats.totalValue.toFixed(0)}</p>
                <p className="text-sm text-text-secondary">Total Value</p>
              </div>
            </div>
          </Card>
        </div>

        <Card variant="bordered" padding="lg">
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" aria-hidden="true" />
                  <input
                    type="search"
                    placeholder="Search registry items..."
                    className="w-full pl-10 pr-4 py-3 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary"
                    onChange={(e) => onTodo(`Search items: ${e.target.value}`)}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  className="px-4 py-2 bg-primary text-text-inverse rounded-lg text-sm font-medium"
                  onClick={() => onTodo('Filter: All items')}
                >
                  All
                </button>
                <button
                  className="px-4 py-2 bg-surface-subtle text-text-secondary rounded-lg text-sm hover:bg-surface"
                  onClick={() => onTodo('Filter: Available only')}
                >
                  Available
                </button>
                <button
                  className="px-4 py-2 bg-surface-subtle text-text-secondary rounded-lg text-sm hover:bg-surface"
                  onClick={() => onTodo('Filter: Purchased only')}
                >
                  Purchased
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {registryItems.map((item) => (
                <Card key={item.id} variant="bordered" padding="none" className="overflow-hidden">
                  <div className="relative aspect-square">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                    {item.purchased && (
                      <div className="absolute inset-0 bg-text-primary/60 flex items-center justify-center">
                        <div className="bg-surface rounded-full p-3">
                          <CheckCircle2 className="w-8 h-8" style={{ color: 'var(--color-success)' }} aria-hidden="true" />
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-4 space-y-3">
                    <div>
                      <h3 className="font-semibold text-text-primary mb-1">{item.name}</h3>
                      <p className="text-xl font-bold text-primary">${item.price.toFixed(2)}</p>
                    </div>
                    {item.purchased ? (
                      <div className="flex items-center gap-2">
                        <Badge variant="success">Purchased</Badge>
                        {item.purchasedBy && (
                          <span className="text-sm text-text-secondary">by {item.purchasedBy}</span>
                        )}
                      </div>
                    ) : (
                      <Badge variant="neutral">Available</Badge>
                    )}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => onTodo(`View item: ${item.name}`)}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" aria-hidden="true" />
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onTodo(`Edit item: ${item.name}`)}
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <ToastContainer toasts={toasts} />
    </DashboardLayout>
  );
};
