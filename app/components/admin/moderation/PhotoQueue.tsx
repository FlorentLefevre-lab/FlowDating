"use client";

import * as React from "react";
import { PhotoCard, PhotoData } from "./PhotoCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Check,
  X,
  Filter,
  RefreshCw,
  ImageIcon,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Flag,
} from "lucide-react";

interface PhotoQueueStats {
  pending: number;
  approved: number;
  rejected: number;
  flagged: number;
}

interface PhotoQueueProps {
  photos: PhotoData[];
  stats: PhotoQueueStats;
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
  onAutoFlaggedFilter: (autoFlagged: boolean | null) => void;
  onApprove: (photoIds: string[]) => Promise<void>;
  onReject: (photoIds: string[]) => Promise<void>;
  onViewDetails: (photoId: string) => void;
  onRefresh: () => void;
  currentStatus: string | null;
  currentAutoFlagged: boolean | null;
}

export function PhotoQueue({
  photos,
  stats,
  pagination,
  loading = false,
  onPageChange,
  onPageSizeChange,
  onStatusFilter,
  onAutoFlaggedFilter,
  onApprove,
  onReject,
  onViewDetails,
  onRefresh,
  currentStatus,
  currentAutoFlagged,
}: PhotoQueueProps) {
  const [selectedPhotos, setSelectedPhotos] = React.useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = React.useState(false);

  // Clear selection when photos change
  React.useEffect(() => {
    setSelectedPhotos(new Set());
  }, [photos]);

  const toggleSelection = (photoId: string) => {
    setSelectedPhotos((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) {
        next.delete(photoId);
      } else {
        next.add(photoId);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (selectedPhotos.size === photos.length) {
      setSelectedPhotos(new Set());
    } else {
      setSelectedPhotos(new Set(photos.map((p) => p.id)));
    }
  };

  const handleBulkApprove = async () => {
    if (selectedPhotos.size === 0) return;
    setBulkLoading(true);
    try {
      await onApprove(Array.from(selectedPhotos));
      setSelectedPhotos(new Set());
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkReject = async () => {
    if (selectedPhotos.size === 0) return;
    setBulkLoading(true);
    try {
      await onReject(Array.from(selectedPhotos));
      setSelectedPhotos(new Set());
    } finally {
      setBulkLoading(false);
    }
  };

  const handleSingleApprove = async (photoId: string) => {
    await onApprove([photoId]);
  };

  const handleSingleReject = async (photoId: string) => {
    await onReject([photoId]);
  };

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
              <ImageIcon className="h-5 w-5 text-orange-600" />
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
            currentStatus === "FLAGGED" && "ring-2 ring-primary-500"
          )}
          onClick={() => onStatusFilter(currentStatus === "FLAGGED" ? null : "FLAGGED")}
        >
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100">
              <Flag className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.flagged}</p>
              <p className="text-xs text-muted-foreground">Signalees</p>
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "cursor-pointer transition-colors",
            currentStatus === "APPROVED" && "ring-2 ring-primary-500"
          )}
          onClick={() => onStatusFilter(currentStatus === "APPROVED" ? null : "APPROVED")}
        >
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.approved}</p>
              <p className="text-xs text-muted-foreground">Approuvees</p>
            </div>
          </CardContent>
        </Card>

        <Card
          className={cn(
            "cursor-pointer transition-colors",
            currentStatus === "REJECTED" && "ring-2 ring-primary-500"
          )}
          onClick={() => onStatusFilter(currentStatus === "REJECTED" ? null : "REJECTED")}
        >
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.rejected}</p>
              <p className="text-xs text-muted-foreground">Rejetees</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
          <div className="flex flex-wrap items-center gap-2">
            {/* Select All */}
            <Button
              variant="outline"
              size="sm"
              onClick={selectAll}
              disabled={photos.length === 0}
            >
              {selectedPhotos.size === photos.length && photos.length > 0
                ? "Deselectionner tout"
                : "Selectionner tout"}
            </Button>

            {/* Bulk Actions */}
            {selectedPhotos.size > 0 && (
              <>
                <span className="text-sm text-muted-foreground">
                  {selectedPhotos.size} selectionnee(s)
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-green-600 hover:bg-green-50"
                  onClick={handleBulkApprove}
                  disabled={bulkLoading}
                >
                  <Check className="mr-1 h-4 w-4" />
                  Approuver
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:bg-red-50"
                  onClick={handleBulkReject}
                  disabled={bulkLoading}
                >
                  <X className="mr-1 h-4 w-4" />
                  Rejeter
                </Button>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Auto-flagged filter */}
            <Button
              variant={currentAutoFlagged ? "default" : "outline"}
              size="sm"
              onClick={() => onAutoFlaggedFilter(currentAutoFlagged ? null : true)}
            >
              <AlertTriangle className="mr-1 h-4 w-4" />
              Auto-signalees
            </Button>

            {/* Refresh */}
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={loading}
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Photo Grid */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="aspect-square" />
              <CardContent className="p-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="mt-2 h-3 w-1/2" />
                <div className="mt-3 flex gap-1">
                  <Skeleton className="h-8 flex-1" />
                  <Skeleton className="h-8 flex-1" />
                  <Skeleton className="h-8 flex-1" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : photos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <h3 className="mt-4 text-lg font-semibold">File vide</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Aucune photo en attente de moderation
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {photos.map((photo) => (
            <PhotoCard
              key={photo.id}
              photo={photo}
              selected={selectedPhotos.has(photo.id)}
              onSelect={toggleSelection}
              onApprove={handleSingleApprove}
              onReject={handleSingleReject}
              onViewDetails={onViewDetails}
              loading={bulkLoading}
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
