'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { Button, Card, Input } from '@/components/ui'

const forgotPasswordSchema = z.object({
  email: z.string().email("Email invalide"),
})

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema)
  })

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true)
    setError(null)
    setMessage(null)

    try {
      console.log('🚀 Envoi vers API...', data)

      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      console.log('📡 Réponse reçue, status:', response.status)

      if (!response.ok) {
        console.log('❌ Réponse pas OK')
        throw new Error(`Erreur ${response.status}`)
      }

      const result = await response.json()
      console.log('✅ Résultat:', result)

      setMessage(result.message)

    } catch (error) {
      console.error('💥 Erreur caught:', error)
      setError(error instanceof Error ? error.message : 'Une erreur est survenue')
    } finally {
      setIsLoading(false)
    }
  }

  if (message) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex-center p-4">
        <Card className="max-w-md w-full p-6 text-center">
          <div className="text-green-600 text-5xl mb-4">📧</div>
          <h2 className="text-subheading mb-4">
            Email envoyé !
          </h2>
          <p className="text-body mb-6">
            {message}
          </p>
          <p className="text-caption mb-4">
            Vérifiez votre boîte email et vos spams.
          </p>
          <Button asChild variant="gradient">
            <Link href="/auth/login">
              Retour à la connexion
            </Link>
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex-center p-4">
      <Card className="max-w-md w-full p-6">
        <div className="text-center mb-6">
          <div className="text-4xl mb-4">🔑</div>
          <h1 className="text-heading mb-2">
            Mot de passe oublié
          </h1>
          <p className="text-body">
            Entrez votre email pour recevoir un lien de réinitialisation
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="email" className="text-caption block mb-2">
              Adresse email
            </label>
            <Input
              {...register('email')}
              type="email"
              placeholder="votre.email@example.com"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            variant="gradient"
            size="lg"
            className="w-full"
          >
            {isLoading ? (
              <>
                <div className="spinner-sm mr-2"></div>
                Envoi en cours...
              </>
            ) : (
              'Envoyer le lien'
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Button asChild variant="link" className="text-primary-600">
            <Link href="/auth/login">
              ← Retour à la connexion
            </Link>
          </Button>
        </div>
      </Card>
    </div>
  )
}
