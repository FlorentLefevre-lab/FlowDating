'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { useState } from 'react'

export default function Navbar() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  // ✅ ROUTES SANS NAVBAR - CORRIGÉES
  const routesWithoutNavbar = [
    '/auth/login',          // Page de connexion
    '/auth/register',       // Page d'inscription
    '/auth/error',          // Page d'erreur auth
    '/auth/verify-email',   // Page de vérification email
  ]

  // ✅ VÉRIFICATION CORRIGÉE - Exclusion spécifique de '/' uniquement
  const shouldHideNavbar = 
    pathname === '/' ||  // Page d'accueil publique SEULEMENT
    routesWithoutNavbar.some(route => pathname.startsWith(route))

  console.log('🔍 NavBar Conditions CORRIGÉES:')
  console.log('  - pathname:', pathname)
  console.log('  - pathname === \'/\':', pathname === '/')
  console.log('  - shouldHideNavbar:', shouldHideNavbar)
  console.log('  - status:', status)

  // Ne pas afficher la Navbar si on est sur une route sans navbar
  if (shouldHideNavbar) {
    console.log('🚫 NavBar cachée - Route sans navbar')
    return null
  }

  // Ne pas afficher la Navbar si l'utilisateur n'est pas connecté
  if (status === 'unauthenticated') {
    console.log('🚫 NavBar cachée - Utilisateur non connecté')
    return null
  }

  // Afficher un placeholder pendant le chargement
  if (status === 'loading') {
    console.log('⏳ NavBar - Chargement en cours')
    return (
      <nav className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💖</span>
            <span className="text-xl font-bold text-gray-800">Flow Dating (Loading...)</span>
          </div>
          <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse"></div>
        </div>
      </nav>
    )
  }

  // ✅ FONCTION DE DÉCONNEXION SÉCURISÉE COMPLÈTE
  const handleSecureSignOut = async () => {
    setIsLoggingOut(true)
    
    try {
      console.log('🚪 Début de la déconnexion sécurisée...')
      
      // 1. Appel API pour nettoyer la session côté serveur
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include',
        })
        console.log('✅ Session serveur nettoyée')
      } catch (apiError) {
        console.warn('⚠️ Erreur nettoyage API (continuer quand même):', apiError)
      }

      // 2. Déconnexion NextAuth avec redirection vers page publique
      await signOut({ 
        callbackUrl: '/',
        redirect: false  // On gère la redirection manuellement
      })
      console.log('✅ NextAuth signOut effectué')

      // 3. Nettoyage manuel des cookies du navigateur
      const cookieNames = [
        'next-auth.session-token',
        'next-auth.csrf-token',
        'next-auth.callback-url',
        '__Secure-next-auth.session-token',
        '__Host-next-auth.csrf-token',
        'authjs.session-token',
        'authjs.csrf-token',
        'dating-app-session',
        'user-preferences',
        'auth-token'
      ]

      cookieNames.forEach(cookieName => {
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.${window.location.hostname}`
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=${window.location.hostname}`
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; secure; samesite=strict`
      })
      console.log('✅ Cookies navigateur nettoyés')

      // 4. Nettoyage du stockage local et session
      try {
        localStorage.clear()
        sessionStorage.clear()
        console.log('✅ Stockage local nettoyé')
      } catch (storageError) {
        console.warn('⚠️ Erreur nettoyage stockage:', storageError)
      }

      // 5. Redirection forcée vers la page publique
      window.location.replace('/')

    } catch (error) {
      console.error('❌ Erreur lors de la déconnexion:', error)
      window.location.href = '/'
    } finally {
      setIsLoggingOut(false)
    }
  }

  // ✅ CONDITION PRINCIPALE D'AFFICHAGE
  if (status === 'authenticated' && session) {
    console.log('✅ NavBar affichée - Utilisateur connecté sur', pathname)
    return (
      <nav className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <Link href="/home" className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
            <span className="text-2xl">💖</span>
            <span className="text-xl font-bold text-gray-800">Flow Dating</span>
          </Link>

          {/* Menu de navigation principal */}
          <div className="hidden md:flex items-center space-x-8">
            <Link 
              href="/home" 
              className={`text-gray-600 hover:text-gray-900 transition-colors font-medium ${
                pathname === '/home' ? 'text-pink-600 font-semibold' : ''
              }`}
            >
              Accueil
            </Link>
            <Link 
              href="/discover" 
              className={`text-gray-600 hover:text-gray-900 transition-colors font-medium ${
                pathname === '/discover' ? 'text-pink-600 font-semibold' : ''
              }`}
            >
              Découverte
            </Link>
            <Link 
              href="/matches" 
              className={`text-gray-600 hover:text-gray-900 transition-colors font-medium relative ${
                pathname === '/messages' ? 'text-pink-600 font-semibold' : ''
              }`}
            >
              
              Matchs
              <span className="absolute -top-2 -right-2 bg-pink-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                3
              </span>
            </Link>
            <Link 
              href="/chat" 
              className={`text-gray-600 hover:text-gray-900 transition-colors font-medium ${
                pathname === '/matches' ? 'text-pink-600 font-semibold' : ''
              }`}
            >
              Chat
            </Link>
          </div>

          {/* Profil utilisateur */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-all duration-200"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg">
                {session.user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <span className="hidden md:block font-medium text-gray-700">
                {session.user?.name || 'Utilisateur'}
              </span>
              <svg 
                className={`w-4 h-4 text-gray-500 transition-transform ${showUserMenu ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Menu déroulant */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">
                    {session.user?.name || 'Utilisateur'}
                  </p>
                  <p className="text-sm text-gray-500">Membre Flow Dating</p>
                </div>
                
                <div className="py-2">
                  <Link 
                    href="/home"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <span className="mr-3">🏠</span>
                    Accueil
                  </Link>
                  <Link 
                    href="/profile"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <span className="mr-3">👤</span>
                    Mon profil
                  </Link>
                  <Link 
                    href="/settings"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <span className="mr-3">⚙️</span>
                    Paramètres
                  </Link>
                  <Link 
                    href="/premium"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <span className="mr-3">⭐</span>
                    Premium
                    <span className="ml-auto bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs px-2 py-1 rounded-full">
                      Pro
                    </span>
                  </Link>
                </div>
                
                <div className="py-2 border-t border-gray-100">
                  <Link 
                    href="/help"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <span className="mr-3">❓</span>
                    Aide
                  </Link>
                  
                  <button
                    onClick={() => {
                      setShowUserMenu(false)
                      handleSecureSignOut()
                    }}
                    disabled={isLoggingOut}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="mr-3">
                      {isLoggingOut ? '⏳' : '🚪'}
                    </span>
                    {isLoggingOut ? 'Déconnexion sécurisée...' : 'Se déconnecter'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bouton mobile */}
          <div className="md:hidden flex items-center gap-2">
            <button 
              onClick={handleSecureSignOut}
              disabled={isLoggingOut}
              className="p-2 rounded-lg hover:bg-gray-50 text-red-600 disabled:opacity-50"
              title="Se déconnecter"
            >
              {isLoggingOut ? '⏳' : '🚪'}
            </button>
          </div>
        </div>

        {/* Effet de fermeture du menu */}
        {showUserMenu && (
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowUserMenu(false)}
          ></div>
        )}
      </nav>
    )
  }

  // Si on arrive ici, quelque chose ne va pas
  console.log('❌ NavBar non affichée - Condition non remplie')
  console.log('   Status:', status, 'Session:', !!session)
  return null
}