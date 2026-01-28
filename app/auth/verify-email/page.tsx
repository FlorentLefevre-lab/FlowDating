// src/app/auth/verify-email/page.tsx
import { Suspense } from 'react'
import Link from 'next/link'

function VerifyEmailContent() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
        <div className="text-center">
          <div className="text-blue-500 text-6xl mb-4">📧</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Vérifiez votre email
          </h1>
          <p className="text-gray-600 mb-6">
            Un lien de vérification a été envoyé à votre adresse email. 
            Cliquez sur le lien pour activer votre compte.
          </p>
          <Link
            href="/auth/login"
            className="block w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
          >
            Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <VerifyEmailContent />
    </Suspense>
  )
}