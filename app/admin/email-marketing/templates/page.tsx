'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { Plus, Search, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

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
        {row.original.category || 'Sans catégorie'}
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
];

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
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

  const handleRowClick = (template: EmailTemplate) => {
    router.push(`/admin/email-marketing/templates/${template.id}`);
  };

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
