"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Info, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type DialogVariant = "default" | "destructive" | "warning" | "success";

const variantConfig: Record<
  DialogVariant,
  { icon: React.ElementType; iconColor: string; buttonVariant: "default" | "destructive" | "outline" }
> = {
  default: {
    icon: Info,
    iconColor: "text-blue-500",
    buttonVariant: "default",
  },
  destructive: {
    icon: XCircle,
    iconColor: "text-red-500",
    buttonVariant: "destructive",
  },
  warning: {
    icon: AlertTriangle,
    iconColor: "text-yellow-500",
    buttonVariant: "default",
  },
  success: {
    icon: CheckCircle,
    iconColor: "text-green-500",
    buttonVariant: "default",
  },
};

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: DialogVariant;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  children?: React.ReactNode;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  variant = "default",
  loading = false,
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const config = variantConfig[variant];
  const Icon = config.icon;

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  const isDisabled = loading || isLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                variant === "destructive" && "bg-red-100",
                variant === "warning" && "bg-yellow-100",
                variant === "success" && "bg-green-100",
                variant === "default" && "bg-blue-100"
              )}
            >
              <Icon className={cn("h-5 w-5", config.iconColor)} />
            </div>
            <div className="space-y-1.5">
              <DialogTitle>{title}</DialogTitle>
              {description && (
                <DialogDescription>{description}</DialogDescription>
              )}
            </div>
          </div>
        </DialogHeader>

        {children && <div className="py-4">{children}</div>}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isDisabled}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={config.buttonVariant}
            onClick={handleConfirm}
            disabled={isDisabled}
          >
            {isDisabled && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
