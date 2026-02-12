import React, { useState } from 'react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { Card, Button, Badge } from '../../components/ui';
import { Upload, Download, Image as ImageIcon, Video, QrCode, Grid3x3, List, Search } from 'lucide-react';

interface MediaItem {
  id: string;
  type: 'photo' | 'video';
  url: string;
  uploadedBy: string;
  uploadDate: string;
  size: string;
}

export const DashboardVault: React.FC = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const mediaItems: MediaItem[] = [
    {
      id: '1',
      type: 'photo',
      url: 'https://images.pexels.com/photos/265722/pexels-photo-265722.jpeg',
      uploadedBy: 'Sarah Miller',
      uploadDate: '2026-05-01',
      size: '2.4 MB',
    },
    {
      id: '2',
      type: 'photo',
      url: 'https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg',
      uploadedBy: 'David Chen',
      uploadDate: '2026-05-02',
      size: '3.1 MB',
    },
    {
      id: '3',
      type: 'video',
      url: '',
      uploadedBy: 'Jessica Park',
      uploadDate: '2026-05-03',
      size: '15.2 MB',
    },
    {
      id: '4',
      type: 'photo',
      url: 'https://images.pexels.com/photos/2959192/pexels-photo-2959192.jpeg',
      uploadedBy: 'Emily Rodriguez',
      uploadDate: '2026-05-03',
      size: '2.8 MB',
    },
    {
      id: '5',
      type: 'photo',
      url: 'https://images.pexels.com/photos/1472887/pexels-photo-1472887.jpeg',
      uploadedBy: 'Michael Thompson',
      uploadDate: '2026-05-04',
      size: '3.5 MB',
    },
    {
      id: '6',
      type: 'photo',
      url: 'https://images.pexels.com/photos/1024960/pexels-photo-1024960.jpeg',
      uploadedBy: 'Sarah Miller',
      uploadDate: '2026-05-04',
      size: '2.9 MB',
    },
  ];

  const stats = {
    totalPhotos: mediaItems.filter(item => item.type === 'photo').length,
    totalVideos: mediaItems.filter(item => item.type === 'video').length,
    totalSize: '29.9 MB',
    contributors: new Set(mediaItems.map(item => item.uploadedBy)).size,
  };

  return (
    <DashboardLayout currentPage="vault">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">Media Vault</h1>
          <p className="text-text-secondary">All photos and videos from your guests in one place</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card variant="bordered" padding="md">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary-light rounded-lg flex-shrink-0">
                <ImageIcon className="w-6 h-6 text-primary" aria-hidden="true" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">{stats.totalPhotos}</p>
                <p className="text-sm text-text-secondary">Photos</p>
              </div>
            </div>
          </Card>

          <Card variant="bordered" padding="md">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-accent-light rounded-lg flex-shrink-0">
                <Video className="w-6 h-6 text-accent" aria-hidden="true" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">{stats.totalVideos}</p>
                <p className="text-sm text-text-secondary">Videos</p>
              </div>
            </div>
          </Card>

          <Card variant="bordered" padding="md">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-champagne-100 rounded-lg flex-shrink-0">
                <Upload className="w-6 h-6 text-champagne-700" aria-hidden="true" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">{stats.contributors}</p>
                <p className="text-sm text-text-secondary">Contributors</p>
              </div>
            </div>
          </Card>

          <Card variant="bordered" padding="md">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-plum-100 rounded-lg flex-shrink-0">
                <Download className="w-6 h-6 text-plum-600" aria-hidden="true" />
              </div>
              <div>
                <p className="text-2xl font-bold text-text-primary">{stats.totalSize}</p>
                <p className="text-sm text-text-secondary">Total Size</p>
              </div>
            </div>
          </Card>
        </div>

        <Card variant="bordered" padding="lg" className="bg-gradient-to-br from-sage-50 to-champagne-50">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="p-4 bg-surface rounded-lg">
              <QrCode className="w-12 h-12 text-primary" aria-hidden="true" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-text-primary mb-2">
                Pass-the-camera mode
              </h3>
              <p className="text-text-secondary mb-4">
                Let guests scan this QR code to upload photos instantly. No app or account required.
              </p>
              <div className="flex gap-3">
                <Button variant="primary" size="md">
                  View QR Code
                </Button>
                <Button variant="outline" size="md">
                  Print QR Code
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <Card variant="bordered" padding="lg">
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" aria-hidden="true" />
                  <input
                    type="search"
                    placeholder="Search media..."
                    className="w-full pl-10 pr-4 py-3 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex bg-surface-subtle rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-surface text-primary'
                        : 'text-text-tertiary hover:text-text-secondary'
                    }`}
                    aria-label="Grid view"
                  >
                    <Grid3x3 className="w-5 h-5" aria-hidden="true" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded transition-colors ${
                      viewMode === 'list'
                        ? 'bg-surface text-primary'
                        : 'text-text-tertiary hover:text-text-secondary'
                    }`}
                    aria-label="List view"
                  >
                    <List className="w-5 h-5" aria-hidden="true" />
                  </button>
                </div>

                <Button variant="outline" size="md">
                  <Download className="w-4 h-4 mr-2" aria-hidden="true" />
                  Download All
                </Button>
                <Button variant="primary" size="md">
                  <Upload className="w-4 h-4 mr-2" aria-hidden="true" />
                  Upload
                </Button>
              </div>
            </div>

            {viewMode === 'grid' ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {mediaItems.map((item) => (
                  <div
                    key={item.id}
                    className="group relative aspect-square rounded-lg overflow-hidden bg-surface-subtle cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                  >
                    {item.type === 'photo' ? (
                      <img
                        src={item.url}
                        alt={`Uploaded by ${item.uploadedBy}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-stone-200">
                        <Video className="w-12 h-12 text-stone-400" aria-hidden="true" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-900/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                      <p className="text-white text-sm font-medium truncate">{item.uploadedBy}</p>
                      <p className="text-white/80 text-xs">{item.size}</p>
                    </div>
                    <Badge variant="primary" className="absolute top-2 left-2">
                      {item.type}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {mediaItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 p-4 bg-surface hover:bg-surface-subtle rounded-lg transition-colors cursor-pointer border border-border-subtle"
                  >
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-surface-subtle flex-shrink-0">
                      {item.type === 'photo' ? (
                        <img
                          src={item.url}
                          alt={`Uploaded by ${item.uploadedBy}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Video className="w-6 h-6 text-stone-400" aria-hidden="true" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-text-primary truncate">
                        {item.type === 'photo' ? 'Photo' : 'Video'} by {item.uploadedBy}
                      </p>
                      <p className="text-sm text-text-secondary">
                        {new Date(item.uploadDate).toLocaleDateString()} • {item.size}
                      </p>
                    </div>
                    <Badge variant={item.type === 'photo' ? 'primary' : 'secondary'}>
                      {item.type}
                    </Badge>
                    <Button variant="ghost" size="sm">
                      <Download className="w-4 h-4" aria-hidden="true" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};
