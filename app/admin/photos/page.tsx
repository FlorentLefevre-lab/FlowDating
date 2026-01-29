"use client";

import * as React from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PhotoQueue } from "@/components/admin/moderation/PhotoQueue";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { ImageIcon, AlertTriangle } from "lucide-react";

interface PhotoData {
  id: string;
  url: string;
  moderationStatus: string;
  autoFlagged: boolean;
  nsfwScore?: number | null;
  createdAt: string;
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    accountStatus?: string;
  };
}

interface PhotoResponse {
  success: boolean;
  photos: PhotoData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats: {
    pending: number;
    approved: number;
    rejected: number;
    flagged: number;
  };
}

function PhotoModerationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  // State
  const [data, setData] = React.useState<PhotoResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [rejectDialogOpen, setRejectDialogOpen] = React.useState(false);
  const [rejectPhotoIds, setRejectPhotoIds] = React.useState<string[]>([]);
  const [rejectNote, setRejectNote] = React.useState("");

  // Get filters from URL
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const status = searchParams.get("status");
  const autoFlagged = searchParams.get("autoFlagged") === "true";

  // Fetch photos
  const fetchPhotos = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", limit.toString());
      if (status) params.set("status", status);
      if (autoFlagged) params.set("autoFlagged", "true");

      const response = await fetch(`/api/admin/moderation/photos?${params}`);
      if (!response.ok) throw new Error("Erreur lors du chargement");

      const result = await response.json();
      setData(result);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger les photos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [page, limit, status, autoFlagged, toast]);

  React.useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

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
    router.push(`/admin/photos?${params.toString()}`);
  };

  // Handle approve
  const handleApprove = async (photoIds: string[]) => {
    try {
      const response = await fetch("/api/admin/moderation/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoIds, action: "approve" }),
      });

      if (!response.ok) throw new Error("Erreur");

      const result = await response.json();
      toast({
        title: "Succes",
        description: result.message,
      });

      fetchPhotos();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'approuver les photos",
        variant: "destructive",
      });
    }
  };

  // Handle reject with note
  const handleRejectClick = (photoIds: string[]) => {
    setRejectPhotoIds(photoIds);
    setRejectNote("");
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = async () => {
    try {
      const response = await fetch("/api/admin/moderation/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photoIds: rejectPhotoIds,
          action: "reject",
          note: rejectNote || undefined,
        }),
      });

      if (!response.ok) throw new Error("Erreur");

      const result = await response.json();
      toast({
        title: "Succes",
        description: result.message,
      });

      setRejectDialogOpen(false);
      fetchPhotos();
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de rejeter les photos",
        variant: "destructive",
      });
    }
  };

  // Handle view details
  const handleViewDetails = (photoId: string) => {
    // Could open a modal or navigate to detail page
    router.push(`/admin/photos/${photoId}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Moderation des photos</h1>
        <p className="text-muted-foreground">
          Examinez et moderez les photos des utilisateurs
        </p>
      </div>

      {/* Queue */}
      <PhotoQueue
        photos={data?.photos || []}
        stats={data?.stats || { pending: 0, approved: 0, rejected: 0, flagged: 0 }}
        pagination={data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 }}
        loading={loading}
        onPageChange={(p) => updateParams({ page: p.toString() })}
        onPageSizeChange={(s) => updateParams({ limit: s.toString(), page: "1" })}
        onStatusFilter={(s) => updateParams({ status: s, page: "1" })}
        onAutoFlaggedFilter={(af) => updateParams({ autoFlagged: af ? "true" : null, page: "1" })}
        onApprove={handleApprove}
        onReject={handleRejectClick}
        onViewDetails={handleViewDetails}
        onRefresh={fetchPhotos}
        currentStatus={status}
        currentAutoFlagged={autoFlagged}
      />

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Rejeter {rejectPhotoIds.length} photo(s)
            </DialogTitle>
            <DialogDescription>
              Cette action supprimera les photos selectionnees. Vous pouvez ajouter
              une note explicative (optionnelle).
            </DialogDescription>
          </DialogHeader>

          <Textarea
            placeholder="Raison du rejet (optionnel)..."
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            rows={3}
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleRejectConfirm}>
              Confirmer le rejet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function PhotoModerationPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    }>
      <PhotoModerationContent />
    </Suspense>
  );
}
