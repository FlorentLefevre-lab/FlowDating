"use client";

import * as React from "react";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/admin/common/StatusBadge";
import { cn } from "@/lib/utils";
import {
  Check,
  X,
  Flag,
  Eye,
  AlertTriangle,
  User,
  Calendar,
  ExternalLink,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

export interface PhotoData {
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

interface PhotoCardProps {
  photo: PhotoData;
  selected?: boolean;
  onSelect?: (photoId: string) => void;
  onApprove?: (photoId: string) => void;
  onReject?: (photoId: string) => void;
  onFlag?: (photoId: string) => void;
  onViewDetails?: (photoId: string) => void;
  loading?: boolean;
}

export function PhotoCard({
  photo,
  selected = false,
  onSelect,
  onApprove,
  onReject,
  onFlag,
  onViewDetails,
  loading = false,
}: PhotoCardProps) {
  const [imageError, setImageError] = React.useState(false);

  return (
    <Card
      className={cn(
        "overflow-hidden transition-all",
        selected && "ring-2 ring-primary-500",
        photo.autoFlagged && "border-yellow-500",
        loading && "opacity-50 pointer-events-none"
      )}
    >
      {/* Image */}
      <div className="relative aspect-square bg-muted">
        {imageError ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <AlertTriangle className="h-8 w-8" />
          </div>
        ) : (
          <Image
            src={photo.url}
            alt="Photo en attente de moderation"
            fill
            className="object-cover"
            onError={() => setImageError(true)}
            unoptimized
          />
        )}

        {/* Overlay badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {photo.autoFlagged && (
            <span className="inline-flex items-center gap-1 rounded bg-yellow-500/90 px-2 py-0.5 text-xs font-medium text-white">
              <AlertTriangle className="h-3 w-3" />
              Auto-signale
            </span>
          )}
          {photo.nsfwScore !== null && photo.nsfwScore !== undefined && photo.nsfwScore > 0.5 && (
            <span className="inline-flex items-center gap-1 rounded bg-red-500/90 px-2 py-0.5 text-xs font-medium text-white">
              NSFW: {Math.round(photo.nsfwScore * 100)}%
            </span>
          )}
        </div>

        {/* Selection checkbox */}
        {onSelect && (
          <button
            onClick={() => onSelect(photo.id)}
            className={cn(
              "absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded border-2 transition-colors",
              selected
                ? "border-primary-500 bg-primary-500 text-white"
                : "border-white bg-white/80 hover:border-primary-500"
            )}
          >
            {selected && <Check className="h-4 w-4" />}
          </button>
        )}

        {/* Status badge */}
        <div className="absolute bottom-2 left-2">
          <StatusBadge status={photo.moderationStatus} type="photo" />
        </div>
      </div>

      {/* Content */}
      <CardContent className="p-3">
        {/* User info */}
        <div className="flex items-center gap-2 text-sm">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="truncate font-medium">
            {photo.user.name || photo.user.email || "Utilisateur"}
          </span>
        </div>

        {/* Date */}
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>
            {formatDistanceToNow(new Date(photo.createdAt), {
              addSuffix: true,
              locale: fr,
            })}
          </span>
        </div>

        {/* Actions */}
        <div className="mt-3 flex items-center gap-1">
          {onApprove && photo.moderationStatus !== "APPROVED" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 flex-1 text-green-600 hover:bg-green-50 hover:text-green-700"
              onClick={() => onApprove(photo.id)}
              disabled={loading}
            >
              <Check className="h-4 w-4" />
            </Button>
          )}
          {onReject && photo.moderationStatus !== "REJECTED" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 flex-1 text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={() => onReject(photo.id)}
              disabled={loading}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          {onFlag && photo.moderationStatus !== "FLAGGED" && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 flex-1 text-yellow-600 hover:bg-yellow-50 hover:text-yellow-700"
              onClick={() => onFlag(photo.id)}
              disabled={loading}
            >
              <Flag className="h-4 w-4" />
            </Button>
          )}
          {onViewDetails && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 flex-1"
              onClick={() => onViewDetails(photo.id)}
              disabled={loading}
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
