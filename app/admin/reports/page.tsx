"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ReportList } from "@/components/admin/moderation/ReportList";
import { useToast } from "@/components/ui/use-toast";
import { Flag } from "lucide-react";

interface ReportData {
  id: string;
  category: string;
  description?: string | null;
  status: string;
  priority: number;
  createdAt: string;
  reporter: {
    id: string;
    name?: string | null;
    email?: string | null;
  };
  targetUser: {
    id: string;
    name?: string | null;
    email?: string | null;
    accountStatus?: string;
    photos?: { url: string; isPrimary: boolean }[];
  };
}

interface ReportsResponse {
  success: boolean;
  reports: ReportData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats: {
    pending: number;
    underReview: number;
    resolved: number;
    dismissed: number;
  };
  categoryBreakdown: Record<string, number>;
}

export default function ReportsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  // State
  const [data, setData] = React.useState<ReportsResponse | null>(null);
  const [loading, setLoading] = React.useState(true);

  // Get filters from URL
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const status = searchParams.get("status");
  const category = searchParams.get("category");
  const priority = searchParams.get("priority");

  // Fetch reports
  const fetchReports = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", limit.toString());
      if (status) params.set("status", status);
      if (category) params.set("category", category);
      if (priority) params.set("priority", priority);

      const response = await fetch(`/api/admin/moderation/reports?${params}`);
      if (!response.ok) throw new Error("Erreur lors du chargement");

      const result = await response.json();
      setData(result);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les signalements",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [page, limit, status, category, priority, toast]);

  React.useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Update URL params
  const updateParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    router.push(`/admin/reports?${params.toString()}`);
  };

  // Handle view report
  const handleViewReport = (reportId: string) => {
    router.push(`/admin/reports/${reportId}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Signalements</h1>
        <p className="text-muted-foreground">
          Gerez les signalements des utilisateurs
        </p>
      </div>

      {/* List */}
      <ReportList
        reports={data?.reports || []}
        stats={data?.stats || { pending: 0, underReview: 0, resolved: 0, dismissed: 0 }}
        categoryBreakdown={data?.categoryBreakdown || {}}
        pagination={data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 }}
        loading={loading}
        onPageChange={(p) => updateParams({ page: p.toString() })}
        onPageSizeChange={(s) => updateParams({ limit: s.toString(), page: "1" })}
        onStatusFilter={(s) => updateParams({ status: s, page: "1" })}
        onCategoryFilter={(c) => updateParams({ category: c, page: "1" })}
        onPriorityFilter={(p) => updateParams({ priority: p?.toString() || null, page: "1" })}
        onViewReport={handleViewReport}
        onRefresh={fetchReports}
        currentStatus={status}
        currentCategory={category}
        currentPriority={priority ? parseInt(priority) : null}
      />
    </div>
  );
}
