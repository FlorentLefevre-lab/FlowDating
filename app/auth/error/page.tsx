// src/app/auth/error/page.tsx
import { Suspense } from 'react'
import Link from 'next/link'
import { Button, Card, SimpleLoading } from '@/components/ui'

function ErrorContent() {
  return (
    <div className="min-h-screen flex-center bg-gradient-to-br from-pink-50 to-purple-50">
      <Card className="max-w-md w-full p-6 text-center">
        <div className="text-red-500 text-6xl mb-4">⚠️</div>
        <h1 className="text-heading mb-4">
          Erreur d'authentification
        </h1>
        <p className="text-body mb-6">
          Une erreur s'est produite lors de la connexion. Veuillez réessayer.
        </p>
        <div className="space-y-3">
          <Button asChild variant="gradient" className="w-full">
            <Link href="/auth/login">
              Retour à la connexion
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/auth/register">
              Créer un compte
            </Link>
          </Button>
        </div>
      </Card>
    </div>
  )
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex-center"><SimpleLoading /></div>}>
      <ErrorContent />
    </Suspense>
  )
}
