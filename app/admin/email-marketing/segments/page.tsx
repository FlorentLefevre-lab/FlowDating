'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { Plus, Search, Users, RefreshCw, Trash2, ToggleLeft, ToggleRight, Loader2, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

interface EmailSegment {
  id: string;
  name: string;
  description: string | null;
  cachedCount: number;
  lastCountAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    campaigns: number;
  };
}

export default function SegmentsPage() {
  const router = useRouter();
  const [segments, setSegments] = useState<EmailSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const fetchSegments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (search) params.set('search', search);

      const res = await fetch(`/api/admin/email-marketing/segments?${params}`);
      const data = await res.json();

      if (data.segments) {
        setSegments(data.segments);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error fetching segments:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search]);

  useEffect(() => {
    fetchSegments();
  }, [fetchSegments]);

  const handleDuplicate = async (e: React.MouseEvent, segment: EmailSegment) => {
    e.stopPropagation();
    setActionLoading(`duplicate-${segment.id}`);
    try {
      // First get the full segment
      const getRes = await fetch(`/api/admin/email-marketing/segments/${segment.id}`);
      const getData = await getRes.json();
      if (!getData.segment) {
        toast.error('Segment non trouvé');
        return;
      }

      // Create duplicate
      const res = await fetch('/api/admin/email-marketing/segments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${segment.name} (copie)`,
          description: getData.segment.description,
          conditions: getData.segment.conditions,
          conditionLogic: getData.segment.conditionLogic,
          isActive: false,
        }),
      });
      const data = await res.json();
      if (data.success || data.segment) {
        toast.success('Segment dupliqué');
        router.push(`/admin/email-marketing/segments/${data.segment.id}`);
      } else {
        toast.error(data.error || 'Erreur');
      }
    } catch {
      toast.error('Erreur');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRefreshCount = async (e: React.MouseEvent, segment: EmailSegment) => {
    e.stopPropagation();
    setActionLoading(`refresh-${segment.id}`);
    try {
      const res = await fetch(`/api/admin/email-marketing/segments/${segment.id}/count`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`${data.count.toLocaleString()} utilisateurs`);
        fetchSegments();
      } else {
        toast.error(data.error || 'Erreur');
      }
    } catch {
      toast.error('Erreur');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleActive = async (e: React.MouseEvent, segment: EmailSegment) => {
    e.stopPropagation();
    setActionLoading(`toggle-${segment.id}`);
    try {
      const res = await fetch(`/api/admin/email-marketing/segments/${segment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !segment.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(segment.isActive ? 'Segment désactivé' : 'Segment activé');
        fetchSegments();
      } else {
        toast.error(data.error || 'Erreur');
      }
    } catch {
      toast.error('Erreur');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (e: React.MouseEvent, segment: EmailSegment) => {
    e.stopPropagation();
    if (segment._count.campaigns > 0) {
      toast.error(`Ce segment est utilisé par ${segment._count.campaigns} campagne(s)`);
      return;
    }
    if (!confirm('Supprimer ce segment ?')) return;

    setActionLoading(`delete-${segment.id}`);
    try {
      const res = await fetch(`/api/admin/email-marketing/segments/${segment.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Segment supprimé');
        fetchSegments();
      } else {
        toast.error(data.error || 'Erreur');
      }
    } catch {
      toast.error('Erreur');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRowClick = (segment: EmailSegment) => {
    router.push(`/admin/email-marketing/segments/${segment.id}`);
  };

  const columns: ColumnDef<EmailSegment>[] = [
    {
      accessorKey: 'name',
      header: 'Nom',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Users className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="font-medium">{row.original.name}</p>
            {row.original.description && (
              <p className="text-sm text-muted-foreground truncate max-w-[250px]">
                {row.original.description}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'cachedCount',
      header: 'Utilisateurs',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{row.original.cachedCount.toLocaleString()}</span>
          {row.original.lastCountAt && (
            <span className="text-xs text-muted-foreground">
              (màj {format(new Date(row.original.lastCountAt), 'dd/MM', { locale: fr })})
            </span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'isActive',
      header: 'Statut',
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? 'default' : 'secondary'}>
          {row.original.isActive ? 'Actif' : 'Inactif'}
        </Badge>
      ),
    },
    {
      accessorKey: '_count.campaigns',
      header: 'Campagnes',
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original._count.campaigns} campagne(s)
        </span>
      ),
    },
    {
      accessorKey: 'updatedAt',
      header: 'Modifié',
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {format(new Date(row.original.updatedAt), 'dd MMM yyyy', { locale: fr })}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
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
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => handleRefreshCount(e, row.original)}
            disabled={actionLoading === `refresh-${row.original.id}`}
            title="Actualiser le compteur"
          >
            {actionLoading === `refresh-${row.original.id}` ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => handleToggleActive(e, row.original)}
            disabled={actionLoading === `toggle-${row.original.id}`}
            title={row.original.isActive ? 'Désactiver' : 'Activer'}
          >
            {actionLoading === `toggle-${row.original.id}` ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : row.original.isActive ? (
              <ToggleRight className="h-4 w-4 text-green-600" />
            ) : (
              <ToggleLeft className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => handleDelete(e, row.original)}
            disabled={actionLoading === `delete-${row.original.id}` || row.original._count.campaigns > 0}
            title={row.original._count.campaigns > 0 ? 'Utilisé par des campagnes' : 'Supprimer'}
          >
            {actionLoading === `delete-${row.original.id}` ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className={`h-4 w-4 ${row.original._count.campaigns > 0 ? 'text-muted-foreground/50' : 'text-destructive'}`} />
            )}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Segments</h2>
          <p className="text-sm text-muted-foreground">
            Définissez des audiences ciblées pour vos campagnes
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/email-marketing/segments/new">
            <Plus className="h-4 w-4 mr-2" />
            Nouveau segment
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
                placeholder="Rechercher un segment..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" onClick={() => fetchSegments()}>
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
            data={segments}
            loading={loading}
            onRowClick={handleRowClick}
            emptyMessage="Aucun segment trouvé"
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
