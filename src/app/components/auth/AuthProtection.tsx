'use client'
import { useAuthOnly } from '@/hooks/useEmailVerification'

interface AuthProtectionProps {
  children: React.ReactNode
  loadingMessage?: string
}

export function AuthProtection({ 
  children, 
  loadingMessage = "Vérification de votre connexion..." 
}: AuthProtectionProps) {
  const { isLoading, isAuthenticated } = useAuthOnly()

  // Affichage pendant le chargement de la session
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-pink-600 text-4xl mb-4">⟳</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Chargement...
          </h2>
          <p className="text-gray-600">{loadingMessage}</p>
        </div>
      </div>
    )
  }

  // Si pas authentifié, la redirection est en cours
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-pink-600 text-4xl mb-4">⟳</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Redirection en cours...
          </h2>
          <p className="text-gray-600">Vous allez être redirigé vers la connexion</p>
        </div>
      </div>
    )
  }

  // Utilisateur authentifié, afficher le contenu
  return <>{children}</>
}