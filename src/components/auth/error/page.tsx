'use client'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

const errorMessages = {
  Configuration: 'Il y a un problème avec la configuration du serveur.',
  AccessDenied: 'Accès refusé. Vous n\'avez pas les permissions pour accéder à cette ressource.',
  Verification: 'Le token de vérification a expiré ou a déjà été utilisé.',
  Default: 'Une erreur inattendue s\'est produite.',
}

export default function AuthErrorPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error') as keyof typeof errorMessages

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center p-4">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6 text-center">
        <div className="text-red-500 text-5xl mb-4">⚠️</div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Erreur d'authentification
        </h1>
        
        <p className="text-gray-600 mb-6">
          {errorMessages[error] || errorMessages.Default}
        </p>
        
        <div className="space-y-3">
          <Link
            href="/auth/login"
            className="block w-full bg-pink-600 text-white py-2 px-4 rounded-md hover:bg-pink-700"
          >
            Retour à la connexion
          </Link>
          
          <Link
            href="/"
            className="block w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300"
          >
            Accueil
          </Link>
        </div>
      </div>
    </div>
  )
}