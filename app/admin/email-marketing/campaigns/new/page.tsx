'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Send, Users, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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

export default function NewCampaignPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loadingData, setLoadingData] = useState(true);

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

  const [useCustomContent, setUseCustomContent] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [templatesRes, segmentsRes] = await Promise.all([
        fetch('/api/admin/email-marketing/templates?limit=100'),
        fetch('/api/admin/email-marketing/segments?limit=100&isActive=true'),
      ]);

      const [templatesData, segmentsData] = await Promise.all([
        templatesRes.json(),
        segmentsRes.json(),
      ]);

      if (templatesData.templates) {
        setTemplates(templatesData.templates.filter((t: any) => t.isActive));
      }
      if (segmentsData.segments) {
        setSegments(segmentsData.segments);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erreur lors du chargement des donnees');
    } finally {
      setLoadingData(false);
    }
  };

  const handleTemplateChange = (templateId: string) => {
    setFormData({ ...formData, templateId });

    // Auto-fill subject from template
    const template = templates.find(t => t.id === templateId);
    if (template && !formData.subject) {
      setFormData(prev => ({ ...prev, templateId, subject: template.subject }));
    }
  };

  const getSelectedSegmentCount = () => {
    if (!formData.segmentId) return null;
    const segment = segments.find(s => s.id === formData.segmentId);
    return segment?.cachedCount || 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.subject) {
      toast.error('Nom et sujet sont requis');
      return;
    }

    if (!formData.templateId && !formData.htmlContent) {
      toast.error('Selectionnez un template ou entrez du contenu HTML');
      return;
    }

    setSaving(true);

    try {
      const res = await fetch('/api/admin/email-marketing/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          subject: formData.subject,
          templateId: formData.templateId || null,
          htmlContent: useCustomContent ? formData.htmlContent : null,
          textContent: useCustomContent ? formData.textContent : null,
          previewText: formData.previewText || null,
          segmentId: formData.segmentId || null,
          excludeSegmentId: formData.excludeSegmentId || null,
          scheduledAt: formData.scheduledAt || null,
          sendRate: formData.sendRate,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success('Campagne creee');
        router.push(`/admin/email-marketing/campaigns/${data.campaign.id}`);
      } else {
        toast.error(data.error || 'Erreur lors de la creation');
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast.error('Erreur lors de la creation');
    } finally {
      setSaving(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/email-marketing/campaigns">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-xl font-semibold">Nouvelle campagne</h2>
          <p className="text-sm text-muted-foreground">
            Creez une nouvelle campagne email
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Informations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom de la campagne *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Newsletter Fevrier 2026"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Sujet de l'email *</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Ex: Decouvrez nos nouveautes !"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="previewText">Texte d'apercu</Label>
              <Input
                id="previewText"
                value={formData.previewText}
                onChange={(e) => setFormData({ ...formData, previewText: e.target.value })}
                placeholder="Texte visible avant l'ouverture de l'email"
              />
            </div>
          </CardContent>
        </Card>

        {/* Template/Content */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Contenu
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant={!useCustomContent ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setUseCustomContent(false)}
                >
                  Template
                </Button>
                <Button
                  type="button"
                  variant={useCustomContent ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setUseCustomContent(true)}
                >
                  HTML personnalise
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!useCustomContent ? (
              <div className="space-y-2">
                <Label>Selectionnez un template</Label>
                <Select
                  value={formData.templateId || '__none__'}
                  onValueChange={(value) => handleTemplateChange(value === '__none__' ? '' : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un template" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Choisir un template</SelectItem>
                    {templates
                      .filter((template) => template.id)
                      .map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {templates.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Aucun template disponible.{' '}
                    <Link href="/admin/email-marketing/templates/new" className="text-primary underline">
                      Creer un template
                    </Link>
                  </p>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="htmlContent">Contenu HTML *</Label>
                  <Textarea
                    id="htmlContent"
                    value={formData.htmlContent}
                    onChange={(e) => setFormData({ ...formData, htmlContent: e.target.value })}
                    placeholder="<html>...</html>"
                    className="font-mono min-h-[200px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="textContent">Contenu texte (optionnel)</Label>
                  <Textarea
                    id="textContent"
                    value={formData.textContent}
                    onChange={(e) => setFormData({ ...formData, textContent: e.target.value })}
                    placeholder="Version texte..."
                    className="min-h-[100px]"
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Audience */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Audience
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Segment cible</Label>
              <Select
                value={formData.segmentId || '__all__'}
                onValueChange={(value) => setFormData({ ...formData, segmentId: value === '__all__' ? '' : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tous les utilisateurs eligibles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Tous les utilisateurs éligibles</SelectItem>
                  {segments
                    .filter((segment) => segment.id)
                    .map((segment) => (
                      <SelectItem key={segment.id} value={segment.id}>
                        {segment.name} ({segment.cachedCount.toLocaleString()} utilisateurs)
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Exclure un segment (optionnel)</Label>
              <Select
                value={formData.excludeSegmentId || '__none__'}
                onValueChange={(value) => setFormData({ ...formData, excludeSegmentId: value === '__none__' ? '' : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Aucune exclusion" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Aucune exclusion</SelectItem>
                  {segments
                    .filter((s) => s.id && s.id !== formData.segmentId)
                    .map((segment) => (
                      <SelectItem key={segment.id} value={segment.id}>
                        {segment.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {formData.segmentId && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                <Users className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-blue-700">
                  Environ {getSelectedSegmentCount()?.toLocaleString()} destinataires
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Scheduling */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Planification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="scheduledAt">Date et heure d'envoi (optionnel)</Label>
              <Input
                id="scheduledAt"
                type="datetime-local"
                value={formData.scheduledAt}
                onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Laissez vide pour enregistrer en brouillon
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sendRate">Vitesse d'envoi (emails/minute)</Label>
              <Input
                id="sendRate"
                type="number"
                min={1}
                max={500}
                value={formData.sendRate}
                onChange={(e) => setFormData({ ...formData, sendRate: parseInt(e.target.value) || 100 })}
              />
              <p className="text-xs text-muted-foreground">
                Recommande: 100-200 emails/minute pour eviter les problemes de delivrabilite
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" asChild>
            <Link href="/admin/email-marketing/campaigns">Annuler</Link>
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {formData.scheduledAt ? 'Planifier la campagne' : 'Creer le brouillon'}
          </Button>
        </div>
      </form>
    </div>
  );
}
