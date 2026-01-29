// src/app/auth/verify-email/page.tsx
import { Suspense } from 'react'
import Link from 'next/link'
import { Button, Card, SimpleLoading } from '@/components/ui'

function VerifyEmailContent() {
  return (
    <div className="min-h-screen flex-center bg-gradient-to-br from-pink-50 to-purple-50">
      <Card className="max-w-md w-full p-6 text-center">
        <div className="text-blue-500 text-6xl mb-4">📧</div>
        <h1 className="text-heading mb-4">
          Vérifiez votre email
        </h1>
        <p className="text-body mb-6">
          Un lien de vérification a été envoyé à votre adresse email.
          Cliquez sur le lien pour activer votre compte.
        </p>
        <Button asChild variant="gradient" className="w-full">
          <Link href="/auth/login">
            Retour à la connexion
          </Link>
        </Button>
      </Card>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex-center"><SimpleLoading /></div>}>
      <VerifyEmailContent />
    </Suspense>
  )
}
