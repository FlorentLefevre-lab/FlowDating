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
import { Plus, Search, FileText, Trash2, ToggleLeft, ToggleRight, Loader2, Copy, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  category: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    campaigns: number;
  };
}

interface TemplatesResponse {
  templates: EmailTemplate[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const CATEGORY_LABELS: Record<string, string> = {
  marketing: 'Marketing',
  transactional: 'Transactionnel',
  notification: 'Notification',
  reengagement: 'Réengagement',
  welcome: 'Bienvenue',
};

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (search) params.set('search', search);

      const res = await fetch(`/api/admin/email-marketing/templates?${params}`);
      const data: TemplatesResponse = await res.json();

      if (data.templates) {
        setTemplates(data.templates);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleDuplicate = async (e: React.MouseEvent, template: EmailTemplate) => {
    e.stopPropagation();
    setActionLoading(`duplicate-${template.id}`);
    try {
      // First get the full template
      const getRes = await fetch(`/api/admin/email-marketing/templates/${template.id}`);
      const getData = await getRes.json();
      if (!getData.template) {
        toast.error('Template non trouvé');
        return;
      }

      // Create duplicate
      const res = await fetch('/api/admin/email-marketing/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${template.name} (copie)`,
          subject: getData.template.subject,
          htmlContent: getData.template.htmlContent,
          textContent: getData.template.textContent,
          previewText: getData.template.previewText,
          category: getData.template.category,
          isActive: false,
        }),
      });
      const data = await res.json();
      if (data.success || data.template) {
        toast.success('Template dupliqué');
        router.push(`/admin/email-marketing/templates/${data.template.id}`);
      } else {
        toast.error(data.error || 'Erreur');
      }
    } catch {
      toast.error('Erreur');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleActive = async (e: React.MouseEvent, template: EmailTemplate) => {
    e.stopPropagation();
    setActionLoading(`toggle-${template.id}`);
    try {
      const res = await fetch(`/api/admin/email-marketing/templates/${template.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !template.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(template.isActive ? 'Template désactivé' : 'Template activé');
        fetchTemplates();
      } else {
        toast.error(data.error || 'Erreur');
      }
    } catch {
      toast.error('Erreur');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (e: React.MouseEvent, template: EmailTemplate) => {
    e.stopPropagation();
    if (template._count.campaigns > 0) {
      toast.error(`Ce template est utilisé par ${template._count.campaigns} campagne(s)`);
      return;
    }
    if (!confirm('Supprimer ce template ?')) return;

    setActionLoading(`delete-${template.id}`);
    try {
      const res = await fetch(`/api/admin/email-marketing/templates/${template.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Template supprimé');
        fetchTemplates();
      } else {
        toast.error(data.error || 'Erreur');
      }
    } catch {
      toast.error('Erreur');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRowClick = (template: EmailTemplate) => {
    router.push(`/admin/email-marketing/templates/${template.id}`);
  };

  const columns: ColumnDef<EmailTemplate>[] = [
    {
      accessorKey: 'name',
      header: 'Nom',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <FileText className="h-4 w-4 text-purple-600" />
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
      accessorKey: 'category',
      header: 'Catégorie',
      cell: ({ row }) => (
        <Badge variant="outline">
          {row.original.category
            ? (CATEGORY_LABELS[row.original.category] || row.original.category)
            : 'Sans catégorie'}
        </Badge>
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
      header: 'Utilisations',
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
          <h2 className="text-xl font-semibold">Templates Email</h2>
          <p className="text-sm text-muted-foreground">
            Gérez vos modèles d'emails réutilisables
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/email-marketing/templates/new">
            <Plus className="h-4 w-4 mr-2" />
            Nouveau template
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
                placeholder="Rechercher un template..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" onClick={() => fetchTemplates()}>
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
            data={templates}
            loading={loading}
            onRowClick={handleRowClick}
            emptyMessage="Aucun template trouvé"
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
