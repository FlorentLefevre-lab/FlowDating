'use client'
import { useState, useEffect } from 'react'
import { signIn, getProviders } from 'next-auth/react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'

const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string[]>([])
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema)
  })

  // 🔍 DÉTECTION DU PROBLÈME
  useEffect(() => {
    console.log("🔍 LoginForm useEffect - Début")
    
    // Log pour détecter d'où vient l'appel
    const originalSignIn = signIn
    window.signIn = function(...args) {
      console.trace("🚨 APPEL signIn() DÉTECTÉ avec args:", args)
      setDebugInfo(prev => [...prev, `signIn() appelé avec: ${JSON.stringify(args)}`])
      return originalSignIn(...args)
    }

    // Récupérer les providers
    const loadProviders = async () => {
      console.log("🔧 Chargement des providers...")
      const providers = await getProviders()
      console.log("🔧 Providers chargés:", providers)
      setDebugInfo(prev => [...prev, `Providers: ${Object.keys(providers || {}).join(', ')}`])
    }
    
    loadProviders()

    return () => {
      // Nettoyer
      delete window.signIn
    }
  }, [])

  const onSubmit = async (data: LoginFormData) => {
    console.log("🚀 DÉBUT SOUMISSION FORMULAIRE")
    setDebugInfo(prev => [...prev, "Formulaire soumis"])
    
    setIsLoading(true)
    setError(null)

    try {
      console.log("🔐 Appel signIn credentials...")
      
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        redirect: false,
      })

      console.log("📊 Résultat:", result)
      setDebugInfo(prev => [...prev, `Résultat: ${JSON.stringify(result)}`])

      if (result?.error) {
        setError('Email ou mot de passe incorrect')
      } else if (result?.ok) {
        router.push('/dashboard')
        router.refresh()
      }
    } catch (error) {
      console.error("❌ Erreur:", error)
      setError('Une erreur est survenue')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    console.log(`🔗 Connexion ${provider}`)
    setDebugInfo(prev => [...prev, `OAuth ${provider} initié`])
    
    setIsLoading(true)
    try {
      await signIn(provider, { callbackUrl: '/profile' })
    } catch (error) {
      setError('Erreur de connexion')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6 text-center text-gray-900">
        Se connecter
      </h1>

      {/* 🔍 DEBUG INFO */}
      {debugInfo.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-xs">
          <strong>🔍 Debug:</strong>
          {debugInfo.map((info, i) => (
            <div key={i}>• {info}</div>
          ))}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Formulaire email/password */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mb-6">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            {...register('email')}
            type="email"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
            placeholder="votre.email@example.com"
            disabled={isLoading}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Mot de passe
          </label>
          <input
            {...register('password')}
            type="password"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
            placeholder="Votre mot de passe"
            disabled={isLoading}
          />
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-pink-600 text-white py-2 px-4 rounded-md hover:bg-pink-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Connexion...' : 'Se connecter'}
        </button>
      </form>

      {/* Séparateur */}
      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">Ou continuer avec</span>
        </div>
      </div>

      {/* Boutons SSO */}
      <div className="space-y-3">
        <button
          onClick={() => handleSocialLogin('google')}
          disabled={isLoading}
          className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#fbbc05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continuer avec Google
        </button>

        <button
          onClick={() => handleSocialLogin('facebook')}
          disabled={isLoading}
          className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
          Continuer avec Facebook
        </button>
      </div>

      {/* Lien vers l'inscription */}
      <p className="mt-6 text-center text-sm text-gray-600">
        Pas encore de compte ?{' '}
        <a href="/auth/register" className="text-pink-600 hover:text-pink-500">
          S'inscrire
        </a>
      </p>

      {/* Mot de passe oublié */}
      <p className="mt-3 text-center text-sm text-gray-600">
        <a href="/auth/forgot-password" className="text-gray-500 hover:text-gray-700">
          Mot de passe oublié ?
        </a>
      </p>
    </div>
  )
}