'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Send, FileText, Users, Mail, TrendingUp,
  Eye, MousePointer, Plus, RefreshCw
} from 'lucide-react';

interface DashboardStats {
  campaigns: {
    total: number;
    draft: number;
    sending: number;
    completed: number;
  };
  templates: {
    total: number;
    active: number;
  };
  segments: {
    total: number;
  };
  rates: {
    open: string | null;
    click: string | null;
  };
  recentCampaigns: Array<{
    id: string;
    name: string;
    status: string;
    sentCount: number;
    openCount: number;
    clickCount: number;
    createdAt: string;
  }>;
}

// Traduction des statuts de campagne
const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon',
  SCHEDULED: 'Planifiée',
  SENDING: 'En cours',
  PAUSED: 'En pause',
  COMPLETED: 'Terminée',
  CANCELLED: 'Annulée',
  FAILED: 'Échouée',
};

export default function EmailMarketingDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/email-marketing/stats');
      const data = await res.json();
      if (data.campaigns) {
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Email Marketing</h2>
          <p className="text-sm text-muted-foreground">
            Vue d'ensemble de vos campagnes email
          </p>
        </div>
        <Button variant="outline" onClick={() => fetchStats()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualiser
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Campagnes</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.campaigns.total || 0}</div>
            <div className="flex gap-2 mt-1">
              {stats?.campaigns.sending ? (
                <Badge variant="default" className="text-xs">
                  {stats.campaigns.sending} en cours
                </Badge>
              ) : null}
              {stats?.campaigns.draft ? (
                <Badge variant="secondary" className="text-xs">
                  {stats.campaigns.draft} brouillons
                </Badge>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Templates</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.templates.total || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.templates.active || 0} actifs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Segments</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.segments.total || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Audiences définies
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Taux moyens</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.rates?.open ? `${stats.rates.open}%` : '--'}
            </div>
            <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                Ouverture
              </span>
              {stats?.rates?.click && (
                <span className="flex items-center gap-1">
                  <MousePointer className="h-3 w-3" />
                  {stats.rates.click}% clics
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Nouvelle campagne
            </CardTitle>
            <CardDescription>
              Créez une nouvelle campagne email
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/admin/email-marketing/campaigns/new">
                Créer une campagne
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Nouveau template
            </CardTitle>
            <CardDescription>
              Créez un template email réutilisable
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/admin/email-marketing/templates/new">
                Créer un template
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Nouveau segment
            </CardTitle>
            <CardDescription>
              Définissez une audience cible
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/admin/email-marketing/segments/new">
                Créer un segment
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Campaigns */}
      <Card>
        <CardHeader>
          <CardTitle>Campagnes récentes</CardTitle>
          <CardDescription>
            Vos dernières campagnes email
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats?.recentCampaigns.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucune campagne pour le moment</p>
              <Button asChild variant="link" className="mt-2">
                <Link href="/admin/email-marketing/campaigns/new">
                  Créer votre première campagne
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {stats?.recentCampaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{campaign.name}</p>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Send className="h-3 w-3" />
                        {campaign.sentCount} envoyés
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {campaign.openCount} ouverts
                      </span>
                      <span className="flex items-center gap-1">
                        <MousePointer className="h-3 w-3" />
                        {campaign.clickCount} clics
                      </span>
                    </div>
                  </div>
                  <Badge variant={campaign.status === 'COMPLETED' ? 'default' : 'secondary'}>
                    {STATUS_LABELS[campaign.status] || campaign.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
