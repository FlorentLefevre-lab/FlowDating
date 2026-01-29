"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const statusBadgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        success: "bg-green-100 text-green-800",
        warning: "bg-yellow-100 text-yellow-800",
        error: "bg-red-100 text-red-800",
        info: "bg-blue-100 text-blue-800",
        neutral: "bg-gray-100 text-gray-800",
        pending: "bg-orange-100 text-orange-800",
        active: "bg-emerald-100 text-emerald-800",
        inactive: "bg-slate-100 text-slate-800",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
);

// Status type mappings
const accountStatusVariant: Record<string, VariantProps<typeof statusBadgeVariants>["variant"]> = {
  ACTIVE: "active",
  SUSPENDED: "warning",
  BANNED: "error",
  DELETED: "neutral",
  PENDING_VERIFICATION: "pending",
};

const accountStatusLabel: Record<string, string> = {
  ACTIVE: "Actif",
  SUSPENDED: "Suspendu",
  BANNED: "Banni",
  DELETED: "Supprime",
  PENDING_VERIFICATION: "En attente",
};

const reportStatusVariant: Record<string, VariantProps<typeof statusBadgeVariants>["variant"]> = {
  PENDING: "pending",
  UNDER_REVIEW: "info",
  RESOLVED: "success",
  DISMISSED: "neutral",
};

const reportStatusLabel: Record<string, string> = {
  PENDING: "En attente",
  UNDER_REVIEW: "En cours",
  RESOLVED: "Resolu",
  DISMISSED: "Rejete",
};

const photoStatusVariant: Record<string, VariantProps<typeof statusBadgeVariants>["variant"]> = {
  PENDING: "pending",
  APPROVED: "success",
  REJECTED: "error",
  FLAGGED: "warning",
};

const photoStatusLabel: Record<string, string> = {
  PENDING: "En attente",
  APPROVED: "Approuve",
  REJECTED: "Rejete",
  FLAGGED: "Signale",
};

const roleVariant: Record<string, VariantProps<typeof statusBadgeVariants>["variant"]> = {
  USER: "neutral",
  MODERATOR: "info",
  ADMIN: "success",
};

const roleLabel: Record<string, string> = {
  USER: "Utilisateur",
  MODERATOR: "Moderateur",
  ADMIN: "Admin",
};

export interface StatusBadgeProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children">,
    VariantProps<typeof statusBadgeVariants> {
  status?: string;
  type?: "account" | "report" | "photo" | "role" | "custom";
  label?: string;
}

export function StatusBadge({
  className,
  variant,
  status,
  type = "custom",
  label,
  ...props
}: StatusBadgeProps) {
  let resolvedVariant = variant;
  let resolvedLabel = label || status;

  if (status && !variant) {
    switch (type) {
      case "account":
        resolvedVariant = accountStatusVariant[status] || "neutral";
        resolvedLabel = label || accountStatusLabel[status] || status;
        break;
      case "report":
        resolvedVariant = reportStatusVariant[status] || "neutral";
        resolvedLabel = label || reportStatusLabel[status] || status;
        break;
      case "photo":
        resolvedVariant = photoStatusVariant[status] || "neutral";
        resolvedLabel = label || photoStatusLabel[status] || status;
        break;
      case "role":
        resolvedVariant = roleVariant[status] || "neutral";
        resolvedLabel = label || roleLabel[status] || status;
        break;
    }
  }

  return (
    <span
      className={cn(statusBadgeVariants({ variant: resolvedVariant }), className)}
      {...props}
    >
      {resolvedLabel}
    </span>
  );
}
