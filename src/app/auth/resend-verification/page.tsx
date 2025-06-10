'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'

const resendSchema = z.object({
  email: z.string().email("Email invalide"),
})

type ResendFormData = z.infer<typeof resendSchema>

export default function ResendVerificationPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<ResendFormData>({
    resolver: zodResolver(resendSchema)
  })

  const onSubmit = async (data: ResendFormData) => {
    setIsLoading(true)
    setError(null)
    setMessage(null)

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors du renvoi')
      }

      setMessage(result.message)

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Une erreur est survenue')
    } finally {
      setIsLoading(false)
    }
  }

  if (message) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center p-4">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6 text-center">
          <div className="text-green-600 text-5xl mb-4">📧</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Email de vérification renvoyé !
          </h2>
          <p className="text-gray-600 mb-6">
            {message}
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Vérifiez votre boîte email et vos spams.
          </p>
          <Link
            href="/auth/login"
            className="bg-pink-600 text-white px-4 py-2 rounded-md hover:bg-pink-700 inline-block"
          >
            Retour à la connexion
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center p-4">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-2 text-center text-gray-900">
          Renvoyer la vérification
        </h1>
        <p className="text-gray-600 text-center mb-6">
          Entrez votre email pour recevoir un nouveau lien de vérification
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Adresse email
            </label>
            <input
              {...register('email')}
              type="email"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
              placeholder="votre.email@example.com"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-pink-600 text-white py-2 px-4 rounded-md hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Envoi en cours...' : 'Renvoyer la vérification'}
          </button>
        </form>

        <div className="mt-6 text-center space-y-2">
          <Link
            href="/auth/login"
            className="text-pink-600 hover:text-pink-500 text-sm block"
          >
            ← Retour à la connexion
          </Link>
          <Link
            href="/auth/register"
            className="text-gray-600 hover:text-gray-500 text-sm block"
          >
            Créer un nouveau compte
          </Link>
        </div>
      </div>
    </div>
  )
}