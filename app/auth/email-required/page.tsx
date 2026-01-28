'use client'
import { useSession, signOut } from 'next-auth/react'
import { useState } from 'react'
import Link from 'next/link'

export default function EmailRequiredPage() {
  const { data: session } = useSession()
  const [isResending, setIsResending] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleResendEmail = async () => {
    if (!session?.user?.email) {
      setError('Email utilisateur non trouvé')
      return
    }

    setIsResending(true)
    setError(null)
    setMessage(null)

    try {
      console.log('🔄 Renvoi email de vérification pour:', session.user.email)
      
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: session.user.email }),
      })

      const result = await response.json()
      console.log('📧 Résultat renvoi:', result)

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors du renvoi')
      }

      setMessage('Email de vérification renvoyé avec succès !')
    } catch (error) {
      console.error('💥 Erreur renvoi:', error)
      setError(error instanceof Error ? error.message : 'Une erreur est survenue')
    } finally {
      setIsResending(false)
    }
  }

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/' })
  }

  const handleRefresh = () => {
    console.log('🔄 Actualisation de la page pour vérifier le statut email')
    window.location.reload()
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin text-pink-600 text-4xl mb-4">⟳</div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center p-4">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6 text-center">
        <div className="text-orange-500 text-5xl mb-4">📧</div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Vérification email requise
        </h1>
        
        <p className="text-gray-600 mb-4">
          Pour accéder à LoveApp et commencer à rencontrer des personnes, vous devez d'abord vérifier votre adresse email.
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-blue-800 text-sm">
            <strong>Compte :</strong> {session.user?.email}
          </p>
          <p className="text-red-600 text-sm mt-1">
            ❌ Email non vérifié
          </p>
        </div>

        <p className="text-gray-600 mb-6">
          Vérifiez votre boîte email et cliquez sur le lien de vérification. Si vous n'avez pas reçu d'email, vérifiez vos spams.
        </p>

        {message && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleResendEmail}
            disabled={isResending}
            className="w-full bg-pink-600 text-white py-2 px-4 rounded-md hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isResending ? 'Envoi en cours...' : 'Renvoyer l\'email de vérification'}
          </button>

          <button
            onClick={handleRefresh}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700"
          >
            ✅ J'ai vérifié mon email
          </button>

          <button
            onClick={handleLogout}
            className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300"
          >
            Se déconnecter
          </button>
        </div>

        <div className="mt-6 text-sm text-gray-500">
          <p>💡 <strong>Astuce :</strong> Vérifiez vos spams et ajoutez notre adresse à vos contacts.</p>
        </div>

        <div className="mt-4 text-xs text-gray-400">
          <p>🛡️ Protection active - Accès bloqué jusqu'à vérification</p>
        </div>
      </div>
    </div>
  )
}