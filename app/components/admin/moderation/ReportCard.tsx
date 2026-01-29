"use client";

import * as React from "react";
import Image from "next/image";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/admin/common/StatusBadge";
import { cn } from "@/lib/utils";
import {
  User,
  Calendar,
  AlertTriangle,
  MessageSquare,
  ChevronRight,
  Flag,
  Shield,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

// Category labels
const categoryLabels: Record<string, string> = {
  INAPPROPRIATE_CONTENT: "Contenu inapproprie",
  HARASSMENT: "Harcelement",
  FAKE_PROFILE: "Faux profil",
  SPAM: "Spam",
  UNDERAGE: "Mineur",
  SCAM: "Arnaque",
  OTHER: "Autre",
};

// Priority labels and colors
const priorityConfig: Record<number, { label: string; color: string }> = {
  0: { label: "Faible", color: "text-gray-500" },
  1: { label: "Moyen", color: "text-yellow-600" },
  2: { label: "Urgent", color: "text-red-600" },
};

export interface ReportData {
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

interface ReportCardProps {
  report: ReportData;
  onClick?: () => void;
  compact?: boolean;
}

export function ReportCard({ report, onClick, compact = false }: ReportCardProps) {
  const targetPhoto = report.targetUser.photos?.[0]?.url;
  const priorityInfo = priorityConfig[report.priority] || priorityConfig[0];

  if (compact) {
    return (
      <Card
        className={cn(
          "cursor-pointer transition-colors hover:bg-muted/50",
          report.priority === 2 && "border-l-4 border-l-red-500"
        )}
        onClick={onClick}
      >
        <CardContent className="flex items-center gap-4 p-4">
          {/* Target user avatar */}
          <div className="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-muted">
            {targetPhoto ? (
              <Image
                src={targetPhoto}
                alt=""
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate font-medium">
                {report.targetUser.name || report.targetUser.email || "Utilisateur"}
              </span>
              <StatusBadge status={report.status} type="report" />
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span>{categoryLabels[report.category] || report.category}</span>
              <span className={priorityInfo.color}>{priorityInfo.label}</span>
            </div>
          </div>

          {/* Time */}
          <div className="text-sm text-muted-foreground">
            {formatDistanceToNow(new Date(report.createdAt), {
              addSuffix: true,
              locale: fr,
            })}
          </div>

          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "cursor-pointer transition-colors hover:shadow-md",
        report.priority === 2 && "border-l-4 border-l-red-500"
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* Target user avatar */}
            <div className="relative h-12 w-12 overflow-hidden rounded-full bg-muted">
              {targetPhoto ? (
                <Image
                  src={targetPhoto}
                  alt=""
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <User className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">
                  {report.targetUser.name || "Utilisateur"}
                </span>
                {report.targetUser.accountStatus && (
                  <StatusBadge
                    status={report.targetUser.accountStatus}
                    type="account"
                  />
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {report.targetUser.email}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            <StatusBadge status={report.status} type="report" />
            <span className={cn("text-sm font-medium", priorityInfo.color)}>
              {priorityInfo.label}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Category */}
        <div className="flex items-center gap-2">
          <Flag className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">
            {categoryLabels[report.category] || report.category}
          </span>
        </div>

        {/* Description */}
        {report.description && (
          <div className="flex items-start gap-2">
            <MessageSquare className="mt-0.5 h-4 w-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground line-clamp-2">
              {report.description}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t pt-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <span>Signale par: {report.reporter.name || report.reporter.email}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>
              {formatDistanceToNow(new Date(report.createdAt), {
                addSuffix: true,
                locale: fr,
              })}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
