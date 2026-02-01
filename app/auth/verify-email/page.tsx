'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const email = searchParams.get('email')

  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'pending'>('pending')
  const [message, setMessage] = useState<string>('')

  useEffect(() => {
    const verifyEmail = async () => {
      // Si pas de token/email, c'est la page d'attente après inscription
      if (!token || !email) {
        setStatus('pending')
        return
      }

      setStatus('loading')

      try {
        const response = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, email }),
        })

        const result = await response.json()

        if (response.ok) {
          setStatus('success')
          setMessage(result.message || 'Email vérifié avec succès !')
        } else {
          setStatus('error')
          setMessage(result.error || 'Erreur lors de la vérification')
        }
      } catch {
        setStatus('error')
        setMessage('Erreur de connexion au serveur')
      }
    }

    verifyEmail()
  }, [token, email])

  // État de chargement
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center p-4">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6 text-center">
          <div className="animate-spin text-pink-600 text-5xl mb-4">⟳</div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            Vérification en cours...
          </h1>
          <p className="text-gray-600">Veuillez patienter</p>
        </div>
      </div>
    )
  }

  // Succès
  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center p-4">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6 text-center">
          <div className="text-green-500 text-6xl mb-4">✅</div>
          <h1 className="text-xl font-semibold text-gray-900 mb-4">
            Email vérifié !
          </h1>
          <p className="text-gray-600 mb-6">{message}</p>
          <Link
            href="/auth/login"
            className="block w-full bg-pink-600 text-white py-2 px-4 rounded-md hover:bg-pink-700 text-center"
          >
            Se connecter
          </Link>
        </div>
      </div>
    )
  }

  // Erreur
  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center p-4">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6 text-center">
          <div className="text-red-500 text-6xl mb-4">❌</div>
          <h1 className="text-xl font-semibold text-gray-900 mb-4">
            Vérification échouée
          </h1>
          <p className="text-gray-600 mb-6">{message}</p>
          <div className="space-y-3">
            <Link
              href="/auth/login"
              className="block w-full bg-pink-600 text-white py-2 px-4 rounded-md hover:bg-pink-700 text-center"
            >
              Retour à la connexion
            </Link>
            <p className="text-sm text-gray-500">
              Vous pouvez demander un nouveau lien depuis la page de connexion.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // En attente (après inscription, pas de token dans l'URL)
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center p-4">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6 text-center">
        <div className="text-blue-500 text-6xl mb-4">📧</div>
        <h1 className="text-xl font-semibold text-gray-900 mb-4">
          Vérifiez votre email
        </h1>
        <p className="text-gray-600 mb-6">
          Un lien de vérification a été envoyé à votre adresse email.
          Cliquez sur le lien dans l&apos;email pour activer votre compte.
        </p>
        <p className="text-sm text-gray-500 mb-6">
          Le lien expire dans 24 heures.
        </p>
        <Link
          href="/auth/login"
          className="block w-full bg-pink-600 text-white py-2 px-4 rounded-md hover:bg-pink-700 text-center"
        >
          Retour à la connexion
        </Link>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center p-4">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6 text-center">
          <div className="animate-spin text-pink-600 text-4xl mb-4">⟳</div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}
