'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Save, Eye, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent: string | null;
  previewText: string | null;
  variables: string[];
  category: string | null;
  isActive: boolean;
}

export default function EditTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [template, setTemplate] = useState<EmailTemplate | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    htmlContent: '',
    textContent: '',
    previewText: '',
    category: '',
    isActive: true,
  });

  useEffect(() => {
    fetchTemplate();
  }, [id]);

  const fetchTemplate = async () => {
    try {
      const res = await fetch(`/api/admin/email-marketing/templates/${id}`);
      const data = await res.json();

      if (data.template) {
        setTemplate(data.template);
        setFormData({
          name: data.template.name,
          subject: data.template.subject,
          htmlContent: data.template.htmlContent,
          textContent: data.template.textContent || '',
          previewText: data.template.previewText || '',
          category: data.template.category || '',
          isActive: data.template.isActive,
        });
      }
    } catch (error) {
      console.error('Error fetching template:', error);
      toast.error('Erreur lors du chargement du template');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Warn about missing unsubscribe URL (RGPD)
    if (!formData.htmlContent.includes('{{unsubscribe_url}}')) {
      const proceed = confirm(
        'RGPD : Ce template ne contient pas de lien de désabonnement ({{unsubscribe_url}}).\n\n' +
        'Continuer quand même ?'
      );
      if (!proceed) return;
    }

    setSaving(true);

    try {
      const res = await fetch(`/api/admin/email-marketing/templates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success) {
        toast.success('Template mis a jour');
        router.push('/admin/email-marketing/templates');
      } else {
        toast.error(data.error || 'Erreur lors de la mise a jour');
      }
    } catch (error) {
      console.error('Error updating template:', error);
      toast.error('Erreur lors de la mise a jour');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Etes-vous sur de vouloir supprimer ce template ?')) {
      return;
    }

    setDeleting(true);

    try {
      const res = await fetch(`/api/admin/email-marketing/templates/${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.success) {
        toast.success('Template supprime');
        router.push('/admin/email-marketing/templates');
      } else {
        toast.error(data.error || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Template non trouve</p>
        <Button asChild className="mt-4">
          <Link href="/admin/email-marketing/templates">Retour aux templates</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/email-marketing/templates">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-xl font-semibold">Modifier le template</h2>
            <p className="text-sm text-muted-foreground">{template.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowPreview(!showPreview)}>
            <Eye className="h-4 w-4 mr-2" />
            {showPreview ? 'Masquer' : 'Apercu'}
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className={`grid gap-6 ${showPreview ? 'lg:grid-cols-2' : ''}`}>
        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom du template *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Sujet de l'email *</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Ex: Bienvenue sur Flow Dating, {{firstName}} !"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="previewText">Texte d'apercu</Label>
                <Input
                  id="previewText"
                  value={formData.previewText}
                  onChange={(e) => setFormData({ ...formData, previewText: e.target.value })}
                  placeholder="Texte visible dans la liste des emails"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Categorie</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="Ex: Welcome, Promo, Newsletter"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="isActive">Template actif</Label>
                  <p className="text-xs text-muted-foreground">Visible lors de la creation de campagne</p>
                </div>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contenu HTML</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.htmlContent}
                onChange={(e) => setFormData({ ...formData, htmlContent: e.target.value })}
                placeholder="<html>...</html>"
                className="font-mono min-h-[300px]"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Variables disponibles: {'{{firstName}}'}, {'{{name}}'}, {'{{email}}'}, {'{{unsubscribe_url}}'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                <strong>RGPD :</strong> Incluez toujours <code className="bg-muted px-1 rounded">{'{{unsubscribe_url}}'}</code> dans le footer.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contenu texte (optionnel)</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.textContent}
                onChange={(e) => setFormData({ ...formData, textContent: e.target.value })}
                placeholder="Version texte pour les clients sans HTML..."
                className="min-h-[150px]"
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" asChild>
              <Link href="/admin/email-marketing/templates">Annuler</Link>
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Enregistrer
            </Button>
          </div>
        </form>

        {/* Preview */}
        {showPreview && (
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Apercu</CardTitle>
            </CardHeader>
            <CardContent>
              {!formData.htmlContent.includes('{{unsubscribe_url}}') && (
                <Alert variant="destructive" className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>RGPD :</strong> Ce template ne contient pas de lien de désabonnement.
                    Ajoutez <code className="bg-red-100 px-1 rounded">{'{{unsubscribe_url}}'}</code> dans le footer.
                  </AlertDescription>
                </Alert>
              )}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted p-3 border-b">
                  <p className="font-medium text-sm">{formData.subject || 'Sujet de l\'email'}</p>
                  {formData.previewText && (
                    <p className="text-xs text-muted-foreground">{formData.previewText}</p>
                  )}
                </div>
                <iframe
                  srcDoc={formData.htmlContent || '<p style="padding: 20px; color: #999;">Contenu HTML...</p>'}
                  className="w-full h-[500px] bg-white"
                  title="Preview"
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
