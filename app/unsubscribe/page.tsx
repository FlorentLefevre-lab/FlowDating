'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email');
  const [status, setStatus] = useState<'pending' | 'loading' | 'success' | 'error'>('pending');
  const [errorMessage, setErrorMessage] = useState('');

  const handleUnsubscribe = async () => {
    if (!email) {
      setStatus('error');
      setErrorMessage('Email non fourni');
      return;
    }

    setStatus('loading');
    try {
      const res = await fetch('/api/email/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (data.success) {
        setStatus('success');
      } else {
        setStatus('error');
        setErrorMessage(data.error || 'Une erreur est survenue');
      }
    } catch {
      setStatus('error');
      setErrorMessage('Une erreur est survenue');
    }
  };

  if (!email) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <CardTitle>Lien invalide</CardTitle>
          <CardDescription>
            Ce lien de desabonnement n'est pas valide.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      {status === 'pending' && (
        <>
          <CardHeader className="text-center">
            <Mail className="h-12 w-12 text-pink-500 mx-auto mb-4" />
            <CardTitle>Desabonnement</CardTitle>
            <CardDescription>
              Confirmez votre desabonnement des emails marketing de Flow Dating.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-sm text-muted-foreground">
              Adresse email : <strong>{email}</strong>
            </p>
            <Button onClick={handleUnsubscribe} className="w-full">
              Confirmer le desabonnement
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Vous continuerez a recevoir les emails importants concernant votre compte.
            </p>
          </CardContent>
        </>
      )}

      {status === 'loading' && (
        <CardContent className="py-12 text-center">
          <Loader2 className="h-12 w-12 animate-spin text-pink-500 mx-auto mb-4" />
          <p className="text-muted-foreground">Traitement en cours...</p>
        </CardContent>
      )}

      {status === 'success' && (
        <CardHeader className="text-center">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <CardTitle>Desabonnement confirme</CardTitle>
          <CardDescription>
            Vous ne recevrez plus d'emails marketing de Flow Dating.
          </CardDescription>
        </CardHeader>
      )}

      {status === 'error' && (
        <CardHeader className="text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <CardTitle>Erreur</CardTitle>
          <CardDescription>{errorMessage}</CardDescription>
        </CardHeader>
      )}
    </Card>
  );
}

function LoadingCard() {
  return (
    <Card className="w-full max-w-md">
      <CardContent className="py-12 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-pink-500 mx-auto mb-4" />
        <p className="text-muted-foreground">Chargement...</p>
      </CardContent>
    </Card>
  );
}

export default function UnsubscribePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50 p-4">
      <Suspense fallback={<LoadingCard />}>
        <UnsubscribeContent />
      </Suspense>
    </div>
  );
}
