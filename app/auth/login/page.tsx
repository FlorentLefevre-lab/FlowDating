'use client'

import { Suspense, useState, useEffect } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button, Card, Input, SimpleLoading } from '@/components/ui'

function LoginContent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/home'
  const urlError = searchParams.get('error')

  // Afficher le message si redirigé après suspension
  useEffect(() => {
    if (urlError === 'account_suspended') {
      setError('Votre compte a ete suspendu. Veuillez reessayer apres la fin de votre periode de suspension.')
    }
  }, [urlError])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        // Parse specific error messages from auth
        if (result.error.includes('BANNED:')) {
          setError(result.error.replace('BANNED:', ''))
        } else if (result.error.includes('SUSPENDED:')) {
          setError(result.error.replace('SUSPENDED:', ''))
        } else if (result.error.includes('bloque')) {
          setError('Compte temporairement bloque suite a plusieurs tentatives echouees. Reessayez dans 15 minutes.')
        } else {
          setError('Email ou mot de passe incorrect')
        }
      } else if (result?.ok) {
        router.push(callbackUrl)
        router.refresh()
      }
    } catch (error) {
      console.error('Erreur lors de la connexion:', error)
      setError('Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    try {
      await signIn('google', { callbackUrl: '/home' })
    } catch (error) {
      console.error('Erreur Google Sign-In:', error)
      setError('Erreur avec Google Sign-In')
      setLoading(false)
    }
  }

  const handleFacebookSignIn = async () => {
    setLoading(true)
    try {
      await signIn('facebook', { callbackUrl: '/home' })
    } catch (error) {
      console.error('Erreur Facebook Sign-In:', error)
      setError('Erreur avec Facebook Sign-In')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex-center py-12 px-4 sm:px-6 lg:px-8">
      <Card className="max-w-md w-full p-8">
        <div className="text-center mb-8">
          <div className="flex-center">
            <div className="text-4xl mb-4">💖</div>
          </div>
          <h2 className="text-heading">
            Connexion à Flow Dating
          </h2>
          <p className="mt-2 text-body">
            Retrouvez vos connexions et découvrez de nouveaux profils
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="text-caption block mb-2">
                Email
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="password" className="text-caption">
                  Mot de passe
                </label>
                <Link href="/auth/forgot-password" className="text-sm text-primary-600 hover:text-primary-500">
                  Mot de passe oublié ?
                </Link>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                required
                placeholder="Votre mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            variant="gradient"
            size="lg"
            className="w-full"
          >
            {loading ? (
              <>
                <div className="spinner-sm mr-2"></div>
                Connexion...
              </>
            ) : (
              'Se connecter'
            )}
          </Button>

          <div>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex-center text-sm">
                <span className="px-2 bg-white text-gray-500">ou continuer avec</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Google
              </Button>

              <Button
                type="button"
                onClick={handleFacebookSignIn}
                disabled={loading}
                variant="outline"
                className="w-full"
              >
                <svg className="w-5 h-5 mr-2" fill="#1877F2" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Facebook
              </Button>
            </div>
          </div>

          <div className="text-center">
            <p className="text-body">
              Pas encore de compte ?{' '}
              <Link href="/auth/register" className="font-medium text-primary-600 hover:text-primary-500">
                Créer un compte
              </Link>
            </p>
          </div>
        </form>

        <Card className="mt-8 p-4 bg-blue-50 border-blue-200">
          <h3 className="text-sm font-medium text-blue-800 mb-2">Mode test</h3>
          <p className="text-xs text-blue-600 mb-2">
            Pour tester l&apos;application, utilisez n&apos;importe quel email et mot de passe.
          </p>
          <Button
            onClick={() => {
              setEmail('test@example.com')
              setPassword('password123')
            }}
            size="sm"
            className="bg-blue-100 text-blue-700 hover:bg-blue-200"
          >
            Utiliser les identifiants de test
          </Button>
        </Card>
      </Card>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex-center">
        <SimpleLoading message="Chargement..." />
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}
