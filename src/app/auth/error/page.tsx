// src/app/auth/error/page.tsx
import { Suspense } from 'react'
import Link from 'next/link'

function ErrorContent() {
  // Note: en NextAuth v5, récupérer les query params côté client si nécessaire
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Erreur d'authentification
          </h1>
          <p className="text-gray-600 mb-6">
            Une erreur s'est produite lors de la connexion. Veuillez réessayer.
          </p>
          <div className="space-y-3">
            <Link
              href="/auth/login"
              className="block w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              Retour à la connexion
            </Link>
            <Link
              href="/auth/register"
              className="block w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
            >
              Créer un compte
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <ErrorContent />
    </Suspense>
  )
}