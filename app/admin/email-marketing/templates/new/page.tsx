'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { ArrowLeft, Save, Eye, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const CATEGORIES = [
  { value: 'marketing', label: 'Marketing' },
  { value: 'transactional', label: 'Transactionnel' },
  { value: 'notification', label: 'Notification' },
  { value: 'reengagement', label: 'Réengagement' },
  { value: 'welcome', label: 'Bienvenue' },
];

const DEFAULT_TEMPLATE = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">

    <!-- Header -->
    <div style="background: linear-gradient(135deg, #ec4899 0%, #f43f5e 100%); padding: 40px 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px;">Flow Dating</h1>
    </div>

    <!-- Content -->
    <div style="padding: 40px 30px;">
      <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
        Bonjour {{firstName}},
      </p>

      <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">
        Votre contenu ici...
      </p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="https://flow.dating" style="display: inline-block; background: linear-gradient(135deg, #ec4899 0%, #f43f5e 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600;">
          Découvrir
        </a>
      </div>
    </div>

    <!-- Footer RGPD -->
    <div style="background: #f9fafb; padding: 25px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
        <a href="{{unsubscribe_url}}" style="color: #9ca3af; text-decoration: underline;">Se désabonner</a>
      </p>
    </div>

  </div>
</body>
</html>`;

export default function NewTemplatePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('edit');

  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    category: '',
    previewText: '',
    htmlContent: DEFAULT_TEMPLATE,
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.subject || !formData.htmlContent) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

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
      const res = await fetch('/api/admin/email-marketing/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success('Template créé avec succès');
        router.push('/admin/email-marketing/templates');
      } else {
        toast.error(data.error || 'Erreur lors de la création');
      }
    } catch (error) {
      toast.error('Erreur lors de la création du template');
    } finally {
      setSaving(false);
    }
  };

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
            <h2 className="text-xl font-semibold">Nouveau template</h2>
            <p className="text-sm text-muted-foreground">
              Créez un modèle d'email réutilisable
            </p>
          </div>
        </div>
        <Button onClick={handleSubmit} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Paramètres</CardTitle>
            <CardDescription>Informations du template</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom du template *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="ex: Bienvenue nouveaux inscrits"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Sujet de l'email *</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => handleChange('subject', e.target.value)}
                placeholder="ex: Bienvenue sur Flow Dating, {{firstName}} !"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Catégorie</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => handleChange('category', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une catégorie" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="previewText">Texte de prévisualisation</Label>
              <Input
                id="previewText"
                value={formData.previewText}
                onChange={(e) => handleChange('previewText', e.target.value)}
                placeholder="Texte visible dans la boîte de réception"
              />
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm font-medium mb-2">Variables disponibles</p>
              <div className="flex flex-wrap gap-1">
                {['{{firstName}}', '{{name}}', '{{email}}', '{{unsubscribe_url}}'].map((v) => (
                  <code key={v} className="text-xs bg-muted px-1.5 py-0.5 rounded">
                    {v}
                  </code>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                <strong>RGPD :</strong> Incluez toujours <code className="bg-muted px-1 rounded">{'{{unsubscribe_url}}'}</code> dans le footer.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Editor */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Contenu</CardTitle>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="edit">Éditer</TabsTrigger>
                <TabsTrigger value="preview">
                  <Eye className="h-4 w-4 mr-1" />
                  Aperçu
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsContent value="edit" className="mt-0">
                <Textarea
                  value={formData.htmlContent}
                  onChange={(e) => handleChange('htmlContent', e.target.value)}
                  className="font-mono text-sm min-h-[500px]"
                  placeholder="Contenu HTML de l'email..."
                />
              </TabsContent>
              <TabsContent value="preview" className="mt-0">
                {!formData.htmlContent.includes('{{unsubscribe_url}}') && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>RGPD :</strong> Ce template ne contient pas de lien de désabonnement.
                      Ajoutez <code className="bg-red-100 px-1 rounded">{'{{unsubscribe_url}}'}</code> dans le footer.
                    </AlertDescription>
                  </Alert>
                )}
                <div className="border rounded-lg overflow-hidden bg-gray-100 p-4">
                  <div
                    className="bg-white mx-auto max-w-[600px] shadow-lg"
                    dangerouslySetInnerHTML={{
                      __html: formData.htmlContent
                        .replace(/\{\{firstName\}\}/g, 'Marie')
                        .replace(/\{\{name\}\}/g, 'Marie Dupont')
                        .replace(/\{\{email\}\}/g, 'marie@example.com')
                        .replace(/\{\{unsubscribe_url\}\}/g, '#'),
                    }}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
