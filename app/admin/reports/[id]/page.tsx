"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/admin/common/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  ArrowLeft,
  User,
  Calendar,
  Flag,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Ban,
  Shield,
  Clock,
  History,
  ExternalLink,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
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

interface ReportDetail {
  id: string;
  category: string;
  description?: string | null;
  status: string;
  priority: number;
  evidenceUrls: string[];
  resolution?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  reporter: {
    id: string;
    name?: string | null;
    email?: string | null;
    createdAt: string;
    _count: { reportsSubmitted: number };
  };
  targetUser: {
    id: string;
    name?: string | null;
    email?: string | null;
    accountStatus?: string;
    bio?: string | null;
    createdAt: string;
    photos: { id: string; url: string; moderationStatus: string }[];
    _count: { reportsReceived: number };
  };
  resolver?: {
    id: string;
    name?: string | null;
  } | null;
}

interface ReportContext {
  otherReports: {
    id: string;
    category: string;
    status: string;
    createdAt: string;
  }[];
  adminActions: {
    id: string;
    actionType: string;
    details: any;
    createdAt: string;
    admin: { name?: string | null };
  }[];
  totalReportsAgainstUser: number;
}

export default function ReportDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const reportId = params.id as string;

  // State
  const [report, setReport] = React.useState<ReportDetail | null>(null);
  const [context, setContext] = React.useState<ReportContext | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [actionLoading, setActionLoading] = React.useState(false);

  // Dialog state
  const [resolveDialogOpen, setResolveDialogOpen] = React.useState(false);
  const [resolution, setResolution] = React.useState("");
  const [userAction, setUserAction] = React.useState<string>("");
  const [actionType, setActionType] = React.useState<"resolve" | "dismiss">("resolve");

  // Fetch report
  const fetchReport = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/moderation/reports/${reportId}`);
      if (!response.ok) throw new Error("Erreur");

      const result = await response.json();
      setReport(result.report);
      setContext(result.context);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de charger le signalement",
        variant: "destructive",
      });
      router.push("/admin/reports");
    } finally {
      setLoading(false);
    }
  }, [reportId, router, toast]);

  React.useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Handle action
  const handleAction = async () => {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/moderation/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: actionType === "resolve" ? "RESOLVED" : "DISMISSED",
          resolution,
          userAction: actionType === "resolve" ? userAction || undefined : undefined,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Erreur");
      }

      toast({
        title: "Succes",
        description: `Signalement ${actionType === "resolve" ? "resolu" : "rejete"}`,
      });

      setResolveDialogOpen(false);
      fetchReport();
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Erreur lors de l'action",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const openResolveDialog = (type: "resolve" | "dismiss") => {
    setActionType(type);
    setResolution("");
    setUserAction("");
    setResolveDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!report) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Signalement #{reportId.slice(-6)}</h1>
          <p className="text-muted-foreground">
            {categoryLabels[report.category] || report.category}
          </p>
        </div>
        <StatusBadge status={report.status} type="report" />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Target User Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Utilisateur signale
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-16 overflow-hidden rounded-full bg-muted">
                {report.targetUser.photos[0]?.url ? (
                  <Image
                    src={report.targetUser.photos[0].url}
                    alt=""
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <User className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div>
                <p className="font-semibold">{report.targetUser.name || "Sans nom"}</p>
                <p className="text-sm text-muted-foreground">{report.targetUser.email}</p>
                <div className="mt-1 flex items-center gap-2">
                  <StatusBadge status={report.targetUser.accountStatus || "ACTIVE"} type="account" />
                  <span className="text-xs text-muted-foreground">
                    {report.targetUser._count.reportsReceived} signalement(s) recus
                  </span>
                </div>
              </div>
            </div>

            {report.targetUser.bio && (
              <div>
                <p className="text-sm font-medium">Bio</p>
                <p className="text-sm text-muted-foreground">{report.targetUser.bio}</p>
              </div>
            )}

            {/* Photos */}
            {report.targetUser.photos.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium">Photos ({report.targetUser.photos.length})</p>
                <div className="grid grid-cols-4 gap-2">
                  {report.targetUser.photos.map((photo) => (
                    <div
                      key={photo.id}
                      className="relative aspect-square overflow-hidden rounded-md bg-muted"
                    >
                      <Image
                        src={photo.url}
                        alt=""
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Inscrit le {format(new Date(report.targetUser.createdAt), "dd MMM yyyy", { locale: fr })}</span>
            </div>
          </CardContent>
        </Card>

        {/* Report Details Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5" />
              Details du signalement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium">Categorie</p>
                <p className="text-sm">{categoryLabels[report.category]}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Priorite</p>
                <p className={`text-sm ${report.priority === 2 ? "text-red-600" : report.priority === 1 ? "text-yellow-600" : "text-gray-600"}`}>
                  {report.priority === 2 ? "Urgente" : report.priority === 1 ? "Moyenne" : "Faible"}
                </p>
              </div>
            </div>

            {report.description && (
              <div>
                <p className="text-sm font-medium">Description</p>
                <p className="text-sm text-muted-foreground">{report.description}</p>
              </div>
            )}

            <div className="border-t pt-4">
              <p className="text-sm font-medium">Signale par</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-sm">{report.reporter.name || report.reporter.email}</span>
                <span className="text-xs text-muted-foreground">
                  ({report.reporter._count.reportsSubmitted} signalement(s) envoyes)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true, locale: fr })}
              </span>
            </div>

            {report.resolution && (
              <div className="rounded-lg bg-muted p-3">
                <p className="text-sm font-medium">Resolution</p>
                <p className="text-sm text-muted-foreground">{report.resolution}</p>
                {report.resolver && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Par {report.resolver.name} - {format(new Date(report.resolvedAt!), "dd MMM yyyy HH:mm", { locale: fr })}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Other Reports */}
        {context && context.otherReports.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Autres signalements ({context.otherReports.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {context.otherReports.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between rounded-lg border p-2 text-sm"
                  >
                    <span>{categoryLabels[r.category] || r.category}</span>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={r.status} type="report" />
                      <span className="text-muted-foreground">
                        {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true, locale: fr })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Admin Actions */}
        {context && context.adminActions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Historique admin
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {context.adminActions.map((action) => (
                  <div
                    key={action.id}
                    className="flex items-center justify-between rounded-lg border p-2 text-sm"
                  >
                    <div>
                      <span className="font-medium">{action.actionType}</span>
                      <span className="ml-2 text-muted-foreground">par {action.admin.name}</span>
                    </div>
                    <span className="text-muted-foreground">
                      {formatDistanceToNow(new Date(action.createdAt), { addSuffix: true, locale: fr })}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Actions */}
      {report.status === "PENDING" || report.status === "UNDER_REVIEW" ? (
        <Card>
          <CardContent className="flex items-center justify-end gap-4 p-4">
            <Button variant="outline" onClick={() => openResolveDialog("dismiss")}>
              <XCircle className="mr-2 h-4 w-4" />
              Rejeter
            </Button>
            <Button onClick={() => openResolveDialog("resolve")}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Resoudre
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Resolve Dialog */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "resolve" ? "Resoudre le signalement" : "Rejeter le signalement"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "resolve"
                ? "Vous pouvez prendre une action contre l'utilisateur signale."
                : "Ce signalement sera marque comme rejete."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Textarea
              placeholder="Note de resolution..."
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              rows={3}
            />

            {actionType === "resolve" && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Action contre l'utilisateur</p>
                <Select value={userAction} onValueChange={setUserAction}>
                  <SelectTrigger>
                    <SelectValue placeholder="Aucune action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Aucune action</SelectItem>
                    <SelectItem value="warn">Avertissement</SelectItem>
                    <SelectItem value="suspend">Suspension (7 jours)</SelectItem>
                    <SelectItem value="ban">Bannissement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              variant={actionType === "resolve" ? "default" : "secondary"}
              onClick={handleAction}
              disabled={actionLoading}
            >
              {actionType === "resolve" ? "Resoudre" : "Rejeter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
