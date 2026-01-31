'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Heart, CreditCard, TrendingUp, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Donation {
  id: string;
  userId: string | null;
  email: string | null;
  name: string | null;
  amount: number;
  currency: string;
  provider: 'STRIPE' | 'PAYPAL' | 'LIGHTNING';
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  message: string | null;
  createdAt: string;
  completedAt: string | null;
  user?: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
}

interface Stats {
  totalAmount: number;
  totalCount: number;
  todayAmount: number;
  todayCount: number;
  monthAmount: number;
  monthCount: number;
  byProvider: Array<{
    provider: string;
    amount: number;
    count: number;
  }>;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

function formatAmount(amount: number, currency: string = 'EUR') {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
  }).format(amount);
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { className: string; label: string }> = {
    COMPLETED: { className: 'bg-green-100 text-green-800', label: 'Complete' },
    PENDING: { className: 'bg-yellow-100 text-yellow-800', label: 'En attente' },
    FAILED: { className: 'bg-red-100 text-red-800', label: 'Echoue' },
    REFUNDED: { className: 'bg-gray-100 text-gray-800', label: 'Rembourse' },
  };

  const variant = variants[status] || variants.PENDING;

  return (
    <Badge className={variant.className}>
      {variant.label}
    </Badge>
  );
}

function ProviderBadge({ provider }: { provider: string }) {
  const variants: Record<string, { className: string; label: string }> = {
    STRIPE: { className: 'bg-purple-100 text-purple-800', label: 'Stripe' },
    PAYPAL: { className: 'bg-blue-100 text-blue-800', label: 'PayPal' },
    LIGHTNING: { className: 'bg-orange-100 text-orange-800', label: 'Lightning' },
  };

  const variant = variants[provider] || { className: 'bg-gray-100 text-gray-800', label: provider };

  return (
    <Badge className={variant.className}>
      {variant.label}
    </Badge>
  );
}

function KPICard({
  title,
  value,
  subValue,
  icon: Icon,
  color = 'text-pink-600',
}: {
  title: string;
  value: string;
  subValue?: string;
  icon: React.ElementType;
  color?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subValue && (
          <p className="text-xs text-muted-foreground mt-1">{subValue}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminDonationsPage() {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [providerFilter, setProviderFilter] = useState<string>('all');

  const fetchDonations = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (providerFilter !== 'all') params.set('provider', providerFilter);

      const res = await fetch(`/api/admin/donations?${params}`);
      if (!res.ok) throw new Error('Failed to fetch donations');

      const data = await res.json();
      setDonations(data.donations);
      setStats(data.stats);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching donations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDonations();
  }, [pagination.page, statusFilter, providerFilter]);

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Heart className="w-6 h-6 text-pink-500" />
            Suivi des Dons
          </h1>
          <p className="text-muted-foreground">
            Gerez et suivez les dons recus sur Flow Dating
          </p>
        </div>
      </div>

      {/* KPIs */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KPICard
            title="Total des dons"
            value={formatAmount(stats.totalAmount)}
            subValue={`${stats.totalCount} don${stats.totalCount > 1 ? 's' : ''}`}
            icon={Heart}
            color="text-pink-600"
          />
          <KPICard
            title="Aujourd'hui"
            value={formatAmount(stats.todayAmount)}
            subValue={`${stats.todayCount} don${stats.todayCount > 1 ? 's' : ''}`}
            icon={Calendar}
            color="text-green-600"
          />
          <KPICard
            title="Ce mois"
            value={formatAmount(stats.monthAmount)}
            subValue={`${stats.monthCount} don${stats.monthCount > 1 ? 's' : ''}`}
            icon={TrendingUp}
            color="text-blue-600"
          />
          <KPICard
            title="Moyenne par don"
            value={stats.totalCount > 0 ? formatAmount(stats.totalAmount / stats.totalCount) : formatAmount(0)}
            subValue="Tous les dons confondus"
            icon={CreditCard}
            color="text-purple-600"
          />
        </div>
      )}

      {/* Par provider */}
      {stats && stats.byProvider.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Repartition par methode</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {stats.byProvider.map((p) => (
                <div
                  key={p.provider}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <ProviderBadge provider={p.provider} />
                  <div>
                    <p className="font-bold">{formatAmount(p.amount)}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.count} don{p.count > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtres */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Historique des dons</CardTitle>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="COMPLETED">Complets</SelectItem>
                  <SelectItem value="PENDING">En attente</SelectItem>
                  <SelectItem value="FAILED">Echoues</SelectItem>
                  <SelectItem value="REFUNDED">Rembourses</SelectItem>
                </SelectContent>
              </Select>
              <Select value={providerFilter} onValueChange={setProviderFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Methode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  <SelectItem value="STRIPE">Stripe</SelectItem>
                  <SelectItem value="PAYPAL">PayPal</SelectItem>
                  <SelectItem value="LIGHTNING">Lightning</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin h-8 w-8 border-4 border-pink-500 border-t-transparent rounded-full" />
            </div>
          ) : donations.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Heart className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Aucun don pour le moment</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Donateur</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Methode</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {donations.map((donation) => (
                    <TableRow key={donation.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {donation.user?.image ? (
                            <img
                              src={donation.user.image}
                              alt=""
                              className="w-8 h-8 rounded-full"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center">
                              <Heart className="w-4 h-4 text-pink-500" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium">
                              {donation.name || donation.user?.name || 'Anonyme'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {donation.email || donation.user?.email || 'Email non renseigne'}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-bold text-pink-600">
                          {formatAmount(donation.amount, donation.currency)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <ProviderBadge provider={donation.provider} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={donation.status} />
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(donation.createdAt), {
                            addSuffix: true,
                            locale: fr,
                          })}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {pagination.page} sur {pagination.totalPages} ({pagination.total} dons)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page <= 1}
                      onClick={() => handlePageChange(pagination.page - 1)}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() => handlePageChange(pagination.page + 1)}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
