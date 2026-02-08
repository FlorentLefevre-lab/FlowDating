'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Send, Clock, Loader2, CheckCircle2, XCircle,
  Timer, Zap, TrendingUp, AlertTriangle, Eye, MousePointer
} from 'lucide-react';

interface ProgressData {
  campaign: {
    id: string;
    status: string;
    startedAt: string | null;
    completedAt: string | null;
  };
  progress: {
    totalRecipients: number;
    sentCount: number;
    deliveredCount: number;
    openCount: number;
    clickCount: number;
    bounceCount: number;
    queued?: number;
    sent?: number;
    failed?: number;
  };
  queue: {
    pending: number;
    processing: number;
    failed: number;
    dlq: number;
  };
  rate: {
    allowed: boolean;
    waitMs: number;
    waitSeconds: number;
    sendRate: number;
    currentRate: number;
  };
  timing: {
    estimatedTimeRemaining: number;
    emailsPerMinute: number;
  };
}

interface CampaignProgressProps {
  campaignId: string;
  isActive: boolean;
  onStatusChange?: (status: string) => void;
}

export function CampaignProgress({ campaignId, isActive, onStatusChange }: CampaignProgressProps) {
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(0);

  const fetchProgress = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/email-marketing/campaigns/${campaignId}/progress`);
      const result = await res.json();

      if (result.success) {
        setData(result);

        // Set countdown if rate limited
        if (result.rate.waitSeconds > 0) {
          setCountdown(result.rate.waitSeconds);
        }

        // Notify parent of status change
        if (onStatusChange && result.campaign.status) {
          onStatusChange(result.campaign.status);
        }
      }
    } catch (error) {
      console.error('Error fetching progress:', error);
    } finally {
      setLoading(false);
    }
  }, [campaignId, onStatusChange]);

  // Initial fetch on mount
  useEffect(() => {
    fetchProgress();
  }, []);

  // Fetch progress on interval (faster when active, slower when paused)
  useEffect(() => {
    const intervalMs = isActive ? 2000 : 10000; // 2s when sending, 10s when paused
    const interval = setInterval(fetchProgress, intervalMs);

    return () => clearInterval(interval);
  }, [isActive, fetchProgress]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  const { progress, queue, rate, timing, campaign } = data;
  const total = progress.totalRecipients || 1;
  const sent = progress.sent ?? progress.sentCount;
  const percentComplete = Math.round((sent / total) * 100);
  const isComplete = campaign.status === 'COMPLETED';
  const isSending = campaign.status === 'SENDING';

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}m ${secs}s`;
    }
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
  };

  return (
    <Card className={isSending ? 'border-primary' : ''}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {isSending ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            ) : isComplete ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <Send className="h-5 w-5" />
            )}
            Progression de l'envoi
          </CardTitle>
          {isSending && (
            <Badge variant="default" className="animate-pulse">
              En cours
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">{sent.toLocaleString()} / {total.toLocaleString()} emails</span>
            <span className="text-muted-foreground">{percentComplete}%</span>
          </div>
          <Progress value={percentComplete} className="h-3" />
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-blue-600 mb-1">
              <Send className="h-4 w-4" />
            </div>
            <div className="text-2xl font-bold">{sent.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Envoyés</div>
          </div>

          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-amber-600 mb-1">
              <Clock className="h-4 w-4" />
            </div>
            <div className="text-2xl font-bold">{queue.pending.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">En attente</div>
          </div>

          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
              <Eye className="h-4 w-4" />
            </div>
            <div className="text-2xl font-bold">{progress.openCount.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Ouverts</div>
          </div>

          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-purple-600 mb-1">
              <MousePointer className="h-4 w-4" />
            </div>
            <div className="text-2xl font-bold">{progress.clickCount.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground">Clics</div>
          </div>

          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center gap-1 text-red-600 mb-1">
              <XCircle className="h-4 w-4" />
            </div>
            <div className="text-2xl font-bold">{(progress.failed ?? 0) + progress.bounceCount}</div>
            <div className="text-xs text-muted-foreground">Échecs</div>
          </div>
        </div>

        {/* Rate and timing info */}
        {isSending && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t">
            {/* Current rate */}
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <Zap className="h-5 w-5 text-blue-600" />
              <div>
                <div className="text-sm font-medium">{timing.emailsPerMinute} emails/min</div>
                <div className="text-xs text-muted-foreground">Vitesse actuelle</div>
              </div>
            </div>

            {/* Estimated time */}
            <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
              <Timer className="h-5 w-5 text-purple-600" />
              <div>
                <div className="text-sm font-medium">
                  {timing.estimatedTimeRemaining > 0
                    ? formatTime(timing.estimatedTimeRemaining)
                    : 'Calcul...'}
                </div>
                <div className="text-xs text-muted-foreground">Temps restant</div>
              </div>
            </div>

            {/* Rate limit countdown */}
            {countdown > 0 ? (
              <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <div>
                  <div className="text-sm font-medium">{countdown}s</div>
                  <div className="text-xs text-muted-foreground">Prochain batch</div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <div>
                  <div className="text-sm font-medium">{rate.sendRate}/min</div>
                  <div className="text-xs text-muted-foreground">Limite configurée</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Queue details for debugging */}
        {isSending && queue.processing > 0 && (
          <div className="text-xs text-muted-foreground text-center pt-2 border-t">
            {queue.processing} en cours de traitement
            {queue.failed > 0 && ` • ${queue.failed} en retry`}
            {queue.dlq > 0 && ` • ${queue.dlq} en DLQ`}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
