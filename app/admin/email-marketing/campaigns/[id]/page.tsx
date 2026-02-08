'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, Save, Send, Pause, Play, XCircle, Mail,
  Users, Eye, MousePointer, AlertTriangle, Loader2, Trash2, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { CampaignProgress } from '../components/CampaignProgress';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Campaign {
  id: string;
  name: string;
  subject: string;
  status: string;
  htmlContent: string | null;
  textContent: string | null;
  previewText: string | null;
  templateId: string | null;
  segmentId: string | null;
  excludeSegmentId: string | null;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  sendRate: number;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  openCount: number;
  clickCount: number;
  bounceCount: number;
  unsubscribeCount: number;
  uniqueOpens: number;
  uniqueClicks: number;
  template: { id: string; name: string; subject: string; htmlContent: string } | null;
  segment: { id: string; name: string; cachedCount: number } | null;
}

interface Template {
  id: string;
  name: string;
  subject: string;
}

interface Segment {
  id: string;
  name: string;
  cachedCount: number;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; color: string }> = {
  DRAFT: { label: 'Brouillon', variant: 'secondary', color: 'gray' },
  SCHEDULED: { label: 'Planifiee', variant: 'outline', color: 'blue' },
  SENDING: { label: 'En cours', variant: 'default', color: 'green' },
  PAUSED: { label: 'En pause', variant: 'secondary', color: 'yellow' },
  COMPLETED: { label: 'Terminee', variant: 'default', color: 'green' },
  CANCELLED: { label: 'Annulee', variant: 'secondary', color: 'gray' },
  FAILED: { label: 'Echouee', variant: 'destructive', color: 'red' },
};

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [testEmail, setTestEmail] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    templateId: '',
    htmlContent: '',
    textContent: '',
    previewText: '',
    segmentId: '',
    excludeSegmentId: '',
    scheduledAt: '',
    sendRate: 100,
  });

  useEffect(() => {
    fetchData();
  }, [id]);

  // Auto-refresh campaign stats only when active (SENDING or PAUSED)
  useEffect(() => {
    if (!campaign || !['SENDING', 'PAUSED'].includes(campaign.status)) return;

    const refreshCampaignOnly = async () => {
      try {
        const res = await fetch(`/api/admin/email-marketing/campaigns/${id}`);
        const data = await res.json();
        if (data.campaign) {
          setCampaign(data.campaign);
        }
      } catch (error) {
        console.error('Error refreshing campaign:', error);
      }
    };

    const interval = setInterval(refreshCampaignOnly, 5000);
    return () => clearInterval(interval);
  }, [campaign?.status, id]);

  const fetchData = async () => {
    try {
      const [campaignRes, templatesRes, segmentsRes] = await Promise.all([
        fetch(`/api/admin/email-marketing/campaigns/${id}`),
        fetch('/api/admin/email-marketing/templates?limit=100'),
        fetch('/api/admin/email-marketing/segments?limit=100'),
      ]);

      const [campaignData, templatesData, segmentsData] = await Promise.all([
        campaignRes.json(),
        templatesRes.json(),
        segmentsRes.json(),
      ]);

      if (campaignData.campaign) {
        const c = campaignData.campaign;
        setCampaign(c);
        setFormData({
          name: c.name,
          subject: c.subject,
          templateId: c.templateId || '',
          htmlContent: c.htmlContent || '',
          textContent: c.textContent || '',
          previewText: c.previewText || '',
          segmentId: c.segmentId || '',
          excludeSegmentId: c.excludeSegmentId || '',
          scheduledAt: c.scheduledAt ? format(new Date(c.scheduledAt), "yyyy-MM-dd'T'HH:mm") : '',
          sendRate: c.sendRate,
        });
      }

      if (templatesData.templates) setTemplates(templatesData.templates);
      if (segmentsData.segments) setSegments(segmentsData.segments);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const canEdit = campaign && ['DRAFT', 'SCHEDULED'].includes(campaign.status);
  const canSend = campaign && ['DRAFT', 'SCHEDULED'].includes(campaign.status);
  const canPause = campaign?.status === 'SENDING';
  const canResume = campaign?.status === 'PAUSED';
  const canCancel = campaign && ['SENDING', 'PAUSED', 'SCHEDULED'].includes(campaign.status);
  const canRetry = campaign && ['FAILED', 'CANCELLED'].includes(campaign.status);
  const canDelete = campaign && ['DRAFT', 'FAILED', 'CANCELLED'].includes(campaign.status);

  const handleSave = async () => {
    if (!canEdit) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/email-marketing/campaigns/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          templateId: formData.templateId || null,
          segmentId: formData.segmentId || null,
          excludeSegmentId: formData.excludeSegmentId || null,
          scheduledAt: formData.scheduledAt || null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Campagne mise a jour');
        fetchData();
      } else {
        toast.error(data.error || 'Erreur');
      }
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleRetry = async () => {
    if (!confirm('Remettre la campagne en brouillon pour réessayer ? Les envois précédents seront supprimés.')) return;

    setActionLoading('retry');
    try {
      const res = await fetch(`/api/admin/email-marketing/campaigns/${id}/retry`, {
        method: 'POST',
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Campagne remise en brouillon');
        fetchData();
      } else {
        toast.error(data.error || 'Erreur');
      }
    } catch (error) {
      toast.error('Erreur');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAction = async (action: 'send' | 'pause' | 'resume' | 'cancel') => {
    const confirmMessages: Record<string, string> = {
      send: 'Lancer l\'envoi de la campagne ?',
      pause: 'Mettre la campagne en pause ?',
      resume: 'Reprendre l\'envoi de la campagne ?',
      cancel: 'Annuler definitivement la campagne ?',
    };

    if (!confirm(confirmMessages[action])) return;

    setActionLoading(action);
    try {
      const res = await fetch(`/api/admin/email-marketing/campaigns/${id}/${action}`, {
        method: 'POST',
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        fetchData();
      } else {
        toast.error(data.error || 'Erreur');
      }
    } catch (error) {
      toast.error('Erreur');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendTest = async () => {
    if (!testEmail) {
      toast.error('Entrez une adresse email');
      return;
    }

    setActionLoading('test');
    try {
      const res = await fetch(`/api/admin/email-marketing/campaigns/${id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.error || 'Erreur');
      }
    } catch (error) {
      toast.error('Erreur');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Supprimer cette campagne et tous ses envois ? Cette action est irréversible.')) return;

    setActionLoading('delete');
    try {
      const res = await fetch(`/api/admin/email-marketing/campaigns/${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Campagne supprimee');
        router.push('/admin/email-marketing/campaigns');
      } else {
        toast.error(data.error || 'Erreur');
      }
    } catch (error) {
      toast.error('Erreur');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Campagne non trouvee</p>
        <Button asChild className="mt-4">
          <Link href="/admin/email-marketing/campaigns">Retour</Link>
        </Button>
      </div>
    );
  }

  const statusInfo = statusConfig[campaign.status] || statusConfig.DRAFT;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/email-marketing/campaigns">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">{campaign.name}</h2>
              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{campaign.subject}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canEdit && (
            <Button variant="outline" onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Sauvegarder
            </Button>
          )}
          {canSend && (
            <Button onClick={() => handleAction('send')} disabled={!!actionLoading}>
              {actionLoading === 'send' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              Lancer
            </Button>
          )}
          {canPause && (
            <Button variant="outline" onClick={() => handleAction('pause')} disabled={!!actionLoading}>
              {actionLoading === 'pause' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pause className="h-4 w-4 mr-2" />}
              Pause
            </Button>
          )}
          {canResume && (
            <Button onClick={() => handleAction('resume')} disabled={!!actionLoading}>
              {actionLoading === 'resume' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
              Reprendre
            </Button>
          )}
          {canCancel && (
            <Button variant="destructive" onClick={() => handleAction('cancel')} disabled={!!actionLoading}>
              {actionLoading === 'cancel' ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
              Annuler
            </Button>
          )}
          {canRetry && (
            <Button onClick={handleRetry} disabled={!!actionLoading}>
              {actionLoading === 'retry' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Réessayer
            </Button>
          )}
          {canDelete && (
            <Button variant="ghost" size="icon" onClick={handleDelete} disabled={!!actionLoading}>
              {actionLoading === 'delete' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>

      {/* Real-time Progress for active campaigns */}
      {['SENDING', 'PAUSED'].includes(campaign.status) && (
        <CampaignProgress
          campaignId={campaign.id}
          isActive={campaign.status === 'SENDING'}
          onStatusChange={(status) => {
            if (status !== campaign.status) {
              fetchData();
            }
          }}
        />
      )}

      {/* Stats */}
      {campaign.status !== 'DRAFT' && !['SENDING', 'PAUSED'].includes(campaign.status) && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Send className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Envoyes</span>
              </div>
              <p className="text-2xl font-bold mt-1">{campaign.sentCount.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">/ {campaign.totalRecipients.toLocaleString()}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Ouvertures</span>
              </div>
              <p className="text-2xl font-bold mt-1">
                {campaign.sentCount > 0 ? ((campaign.uniqueOpens / campaign.sentCount) * 100).toFixed(1) : 0}%
              </p>
              <p className="text-xs text-muted-foreground">{campaign.uniqueOpens} uniques</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <MousePointer className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Clics</span>
              </div>
              <p className="text-2xl font-bold mt-1">
                {campaign.sentCount > 0 ? ((campaign.uniqueClicks / campaign.sentCount) * 100).toFixed(1) : 0}%
              </p>
              <p className="text-xs text-muted-foreground">{campaign.uniqueClicks} uniques</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Bounces</span>
              </div>
              <p className="text-2xl font-bold mt-1">{campaign.bounceCount}</p>
              <p className="text-xs text-muted-foreground">
                {campaign.sentCount > 0 ? ((campaign.bounceCount / campaign.sentCount) * 100).toFixed(1) : 0}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Desabonnements</span>
              </div>
              <p className="text-2xl font-bold mt-1">{campaign.unsubscribeCount}</p>
              <p className="text-xs text-muted-foreground">
                {campaign.sentCount > 0 ? ((campaign.unsubscribeCount / campaign.sentCount) * 100).toFixed(2) : 0}%
              </p>
            </CardContent>
          </Card>

        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={!canEdit}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Sujet</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  disabled={!canEdit}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="previewText">Texte d'apercu</Label>
                <Input
                  id="previewText"
                  value={formData.previewText}
                  onChange={(e) => setFormData({ ...formData, previewText: e.target.value })}
                  disabled={!canEdit}
                />
              </div>
            </CardContent>
          </Card>

          {/* Content */}
          <Card>
            <CardHeader>
              <CardTitle>Contenu</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Template</Label>
                <Select
                  value={formData.templateId || '__none__'}
                  onValueChange={(value) => setFormData({ ...formData, templateId: value === '__none__' ? '' : value })}
                  disabled={!canEdit}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Aucun template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Aucun template</SelectItem>
                    {templates
                      .filter((t) => t.id)
                      .map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {!formData.templateId && (
                <div className="space-y-2">
                  <Label htmlFor="htmlContent">HTML personnalise</Label>
                  <Textarea
                    id="htmlContent"
                    value={formData.htmlContent}
                    onChange={(e) => setFormData({ ...formData, htmlContent: e.target.value })}
                    className="font-mono min-h-[200px]"
                    disabled={!canEdit}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Audience */}
          <Card>
            <CardHeader>
              <CardTitle>Audience</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Segment</Label>
                <Select
                  value={formData.segmentId || '__all__'}
                  onValueChange={(value) => setFormData({ ...formData, segmentId: value === '__all__' ? '' : value })}
                  disabled={!canEdit}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les utilisateurs" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Tous les utilisateurs</SelectItem>
                    {segments
                      .filter((s) => s.id)
                      .map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} ({s.cachedCount.toLocaleString()})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Exclure</Label>
                <Select
                  value={formData.excludeSegmentId || '__none__'}
                  onValueChange={(value) => setFormData({ ...formData, excludeSegmentId: value === '__none__' ? '' : value })}
                  disabled={!canEdit}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Aucune exclusion" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Aucune exclusion</SelectItem>
                    {segments
                      .filter((s) => s.id && s.id !== formData.segmentId)
                      .map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Test Email */}
          <Card>
            <CardHeader>
              <CardTitle>Email de test</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                type="email"
                placeholder="votre@email.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
              <Button
                className="w-full"
                variant="outline"
                onClick={handleSendTest}
                disabled={actionLoading === 'test'}
              >
                {actionLoading === 'test' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4 mr-2" />
                )}
                Envoyer un test
              </Button>
            </CardContent>
          </Card>

          {/* Scheduling */}
          <Card>
            <CardHeader>
              <CardTitle>Planification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="scheduledAt">Date d'envoi</Label>
                <Input
                  id="scheduledAt"
                  type="datetime-local"
                  value={formData.scheduledAt}
                  onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                  disabled={!canEdit}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sendRate">Vitesse (emails/min)</Label>
                <Input
                  id="sendRate"
                  type="number"
                  min={1}
                  max={500}
                  value={formData.sendRate}
                  onChange={(e) => setFormData({ ...formData, sendRate: parseInt(e.target.value) || 100 })}
                  disabled={!canEdit}
                />
              </div>
            </CardContent>
          </Card>

          {/* Dates */}
          {(campaign.startedAt || campaign.completedAt) && (
            <Card>
              <CardHeader>
                <CardTitle>Historique</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {campaign.startedAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Debut:</span>
                    <span>{format(new Date(campaign.startedAt), 'dd MMM yyyy HH:mm', { locale: fr })}</span>
                  </div>
                )}
                {campaign.completedAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fin:</span>
                    <span>{format(new Date(campaign.completedAt), 'dd MMM yyyy HH:mm', { locale: fr })}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
