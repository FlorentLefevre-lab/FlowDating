'use client'
import { useEmailVerification } from '@/hooks/useEmailVerification'

interface EmailProtectionProps {
  children: React.ReactNode
  loadingMessage?: string
}

export function EmailProtection({ 
  children, 
  loadingMessage = "Vérification de votre accès..." 
}: EmailProtectionProps) {
  const { isLoading, isAuthenticated, isVerified } = useEmailVerification()

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

  // Si pas authentifié ou email non vérifié, la redirection est en cours
  if (!isAuthenticated || !isVerified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-pink-600 text-4xl mb-4">⟳</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Redirection en cours...
          </h2>
          <p className="text-gray-600">Vérification de vos accès</p>
        </div>
      </div>
    )
  }

  // Utilisateur authentifié et email vérifié, afficher le contenu
  return <>{children}</>
}