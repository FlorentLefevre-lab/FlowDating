'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { Plus, Search, Send, Eye, MousePointer, Loader2, Trash2, RefreshCw, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  status: string;
  totalRecipients: number;
  sentCount: number;
  openCount: number;
  clickCount: number;
  bounceCount: number;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  DRAFT: { label: 'Brouillon', variant: 'secondary' },
  SCHEDULED: { label: 'Planifiée', variant: 'outline' },
  SENDING: { label: 'En cours', variant: 'default' },
  PAUSED: { label: 'En pause', variant: 'secondary' },
  COMPLETED: { label: 'Terminée', variant: 'default' },
  CANCELLED: { label: 'Annulée', variant: 'secondary' },
  FAILED: { label: 'Échouée', variant: 'destructive' },
};

export default function CampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const fetchCampaigns = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (search) params.set('search', search);
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`/api/admin/email-marketing/campaigns?${params}`);
      const data = await res.json();

      if (data.campaigns) {
        setCampaigns(data.campaigns);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, statusFilter]);

  useEffect(() => {
    fetchCampaigns(false);
  }, [fetchCampaigns]);

  // Auto-refresh when there are active campaigns (silent refresh - no loading state)
  useEffect(() => {
    const hasActiveCampaigns = campaigns.some(c => c.status === 'SENDING');
    if (!hasActiveCampaigns) return;

    const interval = setInterval(() => {
      fetchCampaigns(true); // Silent refresh
    }, 5000);

    return () => clearInterval(interval);
  }, [campaigns, fetchCampaigns]);

  const handleRetry = async (e: React.MouseEvent, campaign: EmailCampaign) => {
    e.stopPropagation();
    if (!confirm('Remettre la campagne en brouillon pour réessayer ?')) return;

    setActionLoading(`retry-${campaign.id}`);
    try {
      const res = await fetch(`/api/admin/email-marketing/campaigns/${campaign.id}/retry`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Campagne remise en brouillon');
        fetchCampaigns();
      } else {
        toast.error(data.error || 'Erreur');
      }
    } catch {
      toast.error('Erreur');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (e: React.MouseEvent, campaign: EmailCampaign) => {
    e.stopPropagation();
    if (!confirm('Supprimer cette campagne ?')) return;

    setActionLoading(`delete-${campaign.id}`);
    try {
      const res = await fetch(`/api/admin/email-marketing/campaigns/${campaign.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Campagne supprimée');
        fetchCampaigns();
      } else {
        toast.error(data.error || 'Erreur');
      }
    } catch {
      toast.error('Erreur');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDuplicate = async (e: React.MouseEvent, campaign: EmailCampaign) => {
    e.stopPropagation();
    setActionLoading(`duplicate-${campaign.id}`);
    try {
      const res = await fetch(`/api/admin/email-marketing/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${campaign.name} (copie)`,
          subject: campaign.subject,
          duplicateFromId: campaign.id,
        }),
      });
      const data = await res.json();
      if (data.success || data.campaign) {
        toast.success('Campagne dupliquée');
        router.push(`/admin/email-marketing/campaigns/${data.campaign.id}`);
      } else {
        toast.error(data.error || 'Erreur');
      }
    } catch {
      toast.error('Erreur');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRowClick = (campaign: EmailCampaign) => {
    router.push(`/admin/email-marketing/campaigns/${campaign.id}`);
  };

  // Réessayer disponible pour les campagnes terminées/échouées/annulées
  const canRetry = (status: string) => ['FAILED', 'CANCELLED', 'COMPLETED'].includes(status);

  const columns: ColumnDef<EmailCampaign>[] = [
    {
      accessorKey: 'name',
      header: 'Campagne',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-pink-100 rounded-lg">
            <Send className="h-4 w-4 text-pink-600" />
          </div>
          <div>
            <p className="font-medium">{row.original.name}</p>
            <p className="text-sm text-muted-foreground truncate max-w-[200px]">
              {row.original.subject}
            </p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Statut',
      cell: ({ row }) => {
        const config = statusConfig[row.original.status] || { label: row.original.status, variant: 'secondary' as const };
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      accessorKey: 'stats',
      header: 'Progression',
      cell: ({ row }) => {
        const { sentCount, openCount, clickCount, totalRecipients, status } = row.original;
        const openRate = sentCount > 0 ? ((openCount / sentCount) * 100).toFixed(1) : '0';
        const clickRate = sentCount > 0 ? ((clickCount / sentCount) * 100).toFixed(1) : '0';
        const progress = totalRecipients > 0 ? Math.round((sentCount / totalRecipients) * 100) : 0;

        if (status === 'DRAFT') {
          return <span className="text-muted-foreground">-</span>;
        }

        if (status === 'SENDING' || status === 'PAUSED') {
          return (
            <div className="space-y-1 min-w-[150px]">
              <div className="flex items-center gap-2">
                {status === 'SENDING' && (
                  <Loader2 className="h-3 w-3 animate-spin text-primary" />
                )}
                <span className="text-sm font-medium">{progress}%</span>
                <span className="text-xs text-muted-foreground">
                  ({sentCount}/{totalRecipients})
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          );
        }

        return (
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1" title="Envoyés">
              <Send className="h-3 w-3 text-muted-foreground" />
              {sentCount}/{totalRecipients}
            </span>
            <span className="flex items-center gap-1" title="Taux ouverture">
              <Eye className="h-3 w-3 text-muted-foreground" />
              {openRate}%
            </span>
            <span className="flex items-center gap-1" title="Taux clic">
              <MousePointer className="h-3 w-3 text-muted-foreground" />
              {clickRate}%
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: 'createdAt',
      header: 'Date',
      cell: ({ row }) => {
        const date = row.original.completedAt || row.original.startedAt || row.original.scheduledAt || row.original.createdAt;
        return (
          <span className="text-muted-foreground">
            {format(new Date(date), 'dd MMM yyyy', { locale: fr })}
          </span>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const status = row.original.status;
        return (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => handleDuplicate(e, row.original)}
              disabled={actionLoading === `duplicate-${row.original.id}`}
              title="Dupliquer"
            >
              {actionLoading === `duplicate-${row.original.id}` ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Copy className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
            {canRetry(status) && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => handleRetry(e, row.original)}
                disabled={actionLoading === `retry-${row.original.id}`}
                title="Réessayer"
              >
                {actionLoading === `retry-${row.original.id}` ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 text-muted-foreground" />
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => handleDelete(e, row.original)}
              disabled={actionLoading === `delete-${row.original.id}`}
              title="Supprimer"
            >
              {actionLoading === `delete-${row.original.id}` ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 text-destructive" />
              )}
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Campagnes</h2>
          <p className="text-sm text-muted-foreground">
            Gérez vos campagnes email marketing
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/email-marketing/campaigns/new">
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle campagne
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher une campagne..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="DRAFT">Brouillon</SelectItem>
                <SelectItem value="SCHEDULED">Planifiée</SelectItem>
                <SelectItem value="SENDING">En cours</SelectItem>
                <SelectItem value="COMPLETED">Terminée</SelectItem>
                <SelectItem value="FAILED">Échouée</SelectItem>
                <SelectItem value="CANCELLED">Annulée</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => fetchCampaigns(false)}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualiser
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          <DataTable
            columns={columns}
            data={campaigns}
            loading={loading}
            onRowClick={handleRowClick}
            emptyMessage="Aucune campagne trouvée"
            serverPagination={{
              page: pagination.page,
              pageSize: pagination.limit,
              total: pagination.total,
              totalPages: pagination.totalPages,
              onPageChange: (page) => setPagination((p) => ({ ...p, page })),
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
