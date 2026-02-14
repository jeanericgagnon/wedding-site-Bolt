import React from 'react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button, Badge } from '../../components/ui';
import { Eye, Users, CheckCircle2, Calendar, ExternalLink, Edit } from 'lucide-react';

export const DashboardOverview: React.FC = () => {
  return (
    <DashboardLayout currentPage="overview">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">Welcome back, Alex & Jordan</h1>
          <p className="text-text-secondary">Here's what's happening with your wedding site</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card variant="bordered" padding="md">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-primary-light rounded-lg">
                <Eye className="w-6 h-6 text-primary" aria-hidden="true" />
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary mb-1">247</p>
              <p className="text-sm text-text-secondary">Site views</p>
              <p className="text-xs text-success mt-2">+12% this week</p>
            </div>
          </Card>

          <Card variant="bordered" padding="md">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-accent-light rounded-lg">
                <Users className="w-6 h-6 text-accent" aria-hidden="true" />
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary mb-1">68 / 120</p>
              <p className="text-sm text-text-secondary">RSVPs received</p>
              <p className="text-xs text-text-tertiary mt-2">57% response rate</p>
            </div>
          </Card>

          <Card variant="bordered" padding="md">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--color-secondary-hover)', opacity: 0.15 }}>
                <CheckCircle2 className="w-6 h-6" style={{ color: 'var(--color-secondary)' }} aria-hidden="true" />
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary mb-1">52</p>
              <p className="text-sm text-text-secondary">Confirmed guests</p>
              <p className="text-xs text-text-tertiary mt-2">16 declined</p>
            </div>
          </Card>

          <Card variant="bordered" padding="md">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-primary-light rounded-lg">
                <Calendar className="w-6 h-6 text-primary" aria-hidden="true" />
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary mb-1">42</p>
              <p className="text-sm text-text-secondary">Days until wedding</p>
              <p className="text-xs text-text-tertiary mt-2">June 15, 2026</p>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card variant="bordered" padding="lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Your wedding site</CardTitle>
                  <CardDescription>Published and live</CardDescription>
                </div>
                <Badge variant="success">Live</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-border-subtle">
                <span className="text-text-secondary">Site URL</span>
                <a
                  href="https://alexandjordan.dayof.love"
                  className="text-primary hover:text-primary-hover flex items-center gap-2 text-sm font-medium"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  alexandjordan.dayof.love
                  <ExternalLink className="w-4 h-4" aria-hidden="true" />
                </a>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-border-subtle">
                <span className="text-text-secondary">Theme</span>
                <span className="text-text-primary font-medium">Garden Classic</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <span className="text-text-secondary">Last updated</span>
                <span className="text-text-primary">2 hours ago</span>
              </div>
              <div className="flex gap-3 pt-4">
                <Button variant="accent" size="md" fullWidth>
                  <ExternalLink className="w-5 h-5 mr-2" aria-hidden="true" />
                  Preview Site
                </Button>
                <Button variant="outline" size="md" fullWidth>
                  <Edit className="w-5 h-5 mr-2" aria-hidden="true" />
                  Edit
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card variant="bordered" padding="lg">
            <CardHeader>
              <CardTitle>Recent activity</CardTitle>
              <CardDescription>Latest actions on your site</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-2 h-2 bg-success rounded-full mt-2 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-text-primary font-medium">New RSVP received</p>
                    <p className="text-xs text-text-secondary">Sarah Miller confirmed attendance</p>
                    <p className="text-xs text-text-tertiary mt-1">2 hours ago</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-text-primary font-medium">Photo uploaded</p>
                    <p className="text-xs text-text-secondary">Guest added 3 photos to vault</p>
                    <p className="text-xs text-text-tertiary mt-1">5 hours ago</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-2 h-2 bg-accent rounded-full mt-2 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-text-primary font-medium">Site updated</p>
                    <p className="text-xs text-text-secondary">You updated the Schedule section</p>
                    <p className="text-xs text-text-tertiary mt-1">1 day ago</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-2 h-2 bg-success rounded-full mt-2 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-text-primary font-medium">New RSVP received</p>
                    <p className="text-xs text-text-secondary">David Chen confirmed attendance</p>
                    <p className="text-xs text-text-tertiary mt-1">1 day ago</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-text-primary font-medium">Registry linked</p>
                    <p className="text-xs text-text-secondary">You added a registry link</p>
                    <p className="text-xs text-text-tertiary mt-1">3 days ago</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card variant="bordered" padding="lg">
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
            <CardDescription>Common tasks to manage your wedding site</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button variant="outline" size="md" fullWidth>
                View RSVPs
              </Button>
              <Button variant="outline" size="md" fullWidth>
                Send Update
              </Button>
              <Button variant="outline" size="md" fullWidth>
                Add Photos
              </Button>
              <Button variant="outline" size="md" fullWidth>
                Edit Site
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};
