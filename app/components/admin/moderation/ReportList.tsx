"use client";

import * as React from "react";
import { ReportCard, ReportData } from "./ReportCard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/admin/common/Pagination";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Flag,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Filter,
  Search,
} from "lucide-react";

interface ReportStats {
  pending: number;
  underReview: number;
  resolved: number;
  dismissed: number;
}

interface ReportListProps {
  reports: ReportData[];
  stats: ReportStats;
  categoryBreakdown: Record<string, number>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  loading?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onStatusFilter: (status: string | null) => void;
  onCategoryFilter: (category: string | null) => void;
  onPriorityFilter: (priority: number | null) => void;
  onViewReport: (reportId: string) => void;
  onRefresh: () => void;
  currentStatus: string | null;
  currentCategory: string | null;
  currentPriority: number | null;
}

const categoryOptions = [
  { value: "INAPPROPRIATE_CONTENT", label: "Contenu inapproprie" },
  { value: "HARASSMENT", label: "Harcelement" },
  { value: "FAKE_PROFILE", label: "Faux profil" },
  { value: "SPAM", label: "Spam" },
  { value: "UNDERAGE", label: "Mineur" },
  { value: "SCAM", label: "Arnaque" },
  { value: "OTHER", label: "Autre" },
];

export function ReportList({
  reports,
  stats,
  categoryBreakdown,
  pagination,
  loading = false,
  onPageChange,
  onPageSizeChange,
  onStatusFilter,
  onCategoryFilter,
  onPriorityFilter,
  onViewReport,
  onRefresh,
  currentStatus,
  currentCategory,
  currentPriority,
}: ReportListProps) {
  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card
          className={cn(
            "cursor-pointer transition-colors",
            currentStatus === "PENDING" && "ring-2 ring-primary-500"
          )}
          onClick={() => onStatusFilter(currentStatus === "PENDING" ? null : "PENDING")}
        >
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
              <Clock className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.pending}</p>
              <p className="text-xs text-muted-foreground">En attente</p>
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "cursor-pointer transition-colors",
            currentStatus === "UNDER_REVIEW" && "ring-2 ring-primary-500"
          )}
          onClick={() => onStatusFilter(currentStatus === "UNDER_REVIEW" ? null : "UNDER_REVIEW")}
        >
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <Search className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.underReview}</p>
              <p className="text-xs text-muted-foreground">En cours</p>
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "cursor-pointer transition-colors",
            currentStatus === "RESOLVED" && "ring-2 ring-primary-500"
          )}
          onClick={() => onStatusFilter(currentStatus === "RESOLVED" ? null : "RESOLVED")}
        >
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.resolved}</p>
              <p className="text-xs text-muted-foreground">Resolus</p>
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "cursor-pointer transition-colors",
            currentStatus === "DISMISSED" && "ring-2 ring-primary-500"
          )}
          onClick={() => onStatusFilter(currentStatus === "DISMISSED" ? null : "DISMISSED")}
        >
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
              <XCircle className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.dismissed}</p>
              <p className="text-xs text-muted-foreground">Rejetes</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 p-4">
          {/* Category filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select
              value={currentCategory || "all"}
              onValueChange={(value) => onCategoryFilter(value === "all" ? null : value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Categorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes categories</SelectItem>
                {categoryOptions.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                    {categoryBreakdown[cat.value] > 0 && (
                      <span className="ml-2 text-muted-foreground">
                        ({categoryBreakdown[cat.value]})
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Priority filter */}
          <Select
            value={currentPriority?.toString() || "all"}
            onValueChange={(value) => onPriorityFilter(value === "all" ? null : parseInt(value))}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Priorite" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              <SelectItem value="2">
                <span className="text-red-600">Urgent</span>
              </SelectItem>
              <SelectItem value="1">
                <span className="text-yellow-600">Moyen</span>
              </SelectItem>
              <SelectItem value="0">
                <span className="text-gray-600">Faible</span>
              </SelectItem>
            </SelectContent>
          </Select>

          <div className="flex-1" />

          {/* Refresh */}
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
            Actualiser
          </Button>
        </CardContent>
      </Card>

      {/* Reports List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="flex items-center gap-4 p-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-6 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : reports.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <h3 className="mt-4 text-lg font-semibold">Aucun signalement</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Pas de signalement correspondant aux filtres
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onClick={() => onViewReport(report.id)}
              compact
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          totalItems={pagination.total}
          pageSize={pagination.limit}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      )}
    </div>
  );
}
