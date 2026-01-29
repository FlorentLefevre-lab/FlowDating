"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  UserPlus,
  Heart,
  Flag,
  Image,
  Ban,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from "lucide-react";

export type ActivityType =
  | "user_registered"
  | "user_suspended"
  | "user_banned"
  | "user_unbanned"
  | "report_created"
  | "report_resolved"
  | "photo_approved"
  | "photo_rejected"
  | "match_created";

export interface ActivityItem {
  id: string;
  type: ActivityType;
  message: string;
  timestamp: Date | string;
  user?: {
    name?: string;
    image?: string;
  };
  metadata?: Record<string, any>;
}

const activityIcons: Record<ActivityType, { icon: React.ElementType; color: string; bg: string }> = {
  user_registered: { icon: UserPlus, color: "text-green-600", bg: "bg-green-100" },
  user_suspended: { icon: AlertTriangle, color: "text-yellow-600", bg: "bg-yellow-100" },
  user_banned: { icon: Ban, color: "text-red-600", bg: "bg-red-100" },
  user_unbanned: { icon: Shield, color: "text-blue-600", bg: "bg-blue-100" },
  report_created: { icon: Flag, color: "text-orange-600", bg: "bg-orange-100" },
  report_resolved: { icon: CheckCircle, color: "text-green-600", bg: "bg-green-100" },
  photo_approved: { icon: Image, color: "text-green-600", bg: "bg-green-100" },
  photo_rejected: { icon: XCircle, color: "text-red-600", bg: "bg-red-100" },
  match_created: { icon: Heart, color: "text-pink-600", bg: "bg-pink-100" },
};

export interface ActivityFeedProps {
  title?: string;
  description?: string;
  activities: ActivityItem[];
  loading?: boolean;
  maxItems?: number;
  className?: string;
  showViewAll?: boolean;
  onViewAll?: () => void;
}

export function ActivityFeed({
  title = "Activite recente",
  description,
  activities,
  loading = false,
  maxItems = 10,
  className,
  showViewAll = false,
  onViewAll,
}: ActivityFeedProps) {
  const displayedActivities = activities.slice(0, maxItems);

  const formatTime = (timestamp: Date | string) => {
    const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
    return formatDistanceToNow(date, { addSuffix: true, locale: fr });
  };

  const getInitials = (name?: string) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <CardHeader>
          <div className="h-5 w-32 animate-pulse rounded bg-muted" />
          {description && <div className="h-4 w-48 animate-pulse rounded bg-muted" />}
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-20 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {showViewAll && onViewAll && (
            <button
              onClick={onViewAll}
              className="text-sm font-medium text-primary-600 hover:underline"
            >
              Voir tout
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {displayedActivities.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            Aucune activite recente
          </p>
        ) : (
          <div className="space-y-4">
            {displayedActivities.map((activity) => {
              const iconConfig = activityIcons[activity.type];
              const Icon = iconConfig?.icon || Flag;

              return (
                <div key={activity.id} className="flex items-start gap-3">
                  {activity.user ? (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={activity.user.image} />
                      <AvatarFallback className="text-xs">
                        {getInitials(activity.user.name)}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full",
                        iconConfig?.bg || "bg-gray-100"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4",
                          iconConfig?.color || "text-gray-600"
                        )}
                      />
                    </div>
                  )}
                  <div className="flex-1 space-y-1">
                    <p className="text-sm">{activity.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatTime(activity.timestamp)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
