'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { Plus, Search, Send, Eye, MousePointer, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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
    header: 'Performance',
    cell: ({ row }) => {
      const { sentCount, openCount, clickCount, totalRecipients } = row.original;
      const openRate = sentCount > 0 ? ((openCount / sentCount) * 100).toFixed(1) : '0';
      const clickRate = sentCount > 0 ? ((clickCount / sentCount) * 100).toFixed(1) : '0';

      if (row.original.status === 'DRAFT') {
        return <span className="text-muted-foreground">-</span>;
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
];

export default function CampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
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
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, statusFilter]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const handleRowClick = (campaign: EmailCampaign) => {
    router.push(`/admin/email-marketing/campaigns/${campaign.id}`);
  };

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
              </SelectContent>
            </Select>
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
