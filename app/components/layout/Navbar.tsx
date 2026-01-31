'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { ChatBubbleLeftRightIcon, BugAntIcon } from '@heroicons/react/24/outline'
import { ChatBubbleLeftRightIcon as ChatBubbleLeftRightIconSolid } from '@heroicons/react/24/solid'
import { ChatNavItem } from './ChatNavItem'
import {
  Button,
  Skeleton,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui'
import SettingsPanel from '@/components/profile/SettingsPanel'
import type { MessageType, UserProfile } from '@/types/profiles'

export default function Navbar() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [settingsMessage, setSettingsMessage] = useState('')
  const [settingsMessageType, setSettingsMessageType] = useState<MessageType>('success')
  const [matchesCount, setMatchesCount] = useState<number>(0)

  // Charger la photo de profil
  useEffect(() => {
    const loadProfilePhoto = async () => {
      if (status !== 'authenticated') return

      try {
        const response = await fetch('/api/profile/photos')
        if (response.ok) {
          const data = await response.json()
          const photos = data.photos || []
          const primaryPhoto = photos.find((p: any) => p.isPrimary) || photos[0]
          if (primaryPhoto?.url) {
            setProfilePhoto(primaryPhoto.url)
          }
        }
      } catch (error) {
        console.error('Erreur chargement photo navbar:', error)
      }
    }

    loadProfilePhoto()

    const handlePhotoUpdate = () => loadProfilePhoto()
    window.addEventListener('profile-photo-updated', handlePhotoUpdate)

    return () => {
      window.removeEventListener('profile-photo-updated', handlePhotoUpdate)
    }
  }, [status])

  // Charger le nombre de matches (une seule fois au montage, pas de polling)
  useEffect(() => {
    const loadMatchesCount = async () => {
      if (status !== 'authenticated') return

      try {
        const response = await fetch('/api/matches')
        if (response.ok) {
          const data = await response.json()
          const matches = data.matches || data || []
          setMatchesCount(Array.isArray(matches) ? matches.length : 0)
        }
      } catch (error) {
        console.error('Erreur chargement matches:', error)
      }
    }

    loadMatchesCount()

    // Écouter les événements de mise à jour des matches
    const handleMatchUpdate = () => loadMatchesCount()
    window.addEventListener('match-updated', handleMatchUpdate)

    return () => {
      window.removeEventListener('match-updated', handleMatchUpdate)
    }
  }, [status])

  // Charger le profil quand le drawer s'ouvre
  useEffect(() => {
    const loadProfile = async () => {
      if (!settingsOpen || status !== 'authenticated') return

      try {
        const response = await fetch('/api/profile', {
          method: 'GET',
          credentials: 'include',
        })
        if (response.ok) {
          const data = await response.json()
          setProfile(data.profile || data)
        }
      } catch (error) {
        console.error('Erreur chargement profil pour settings:', error)
      }
    }

    loadProfile()
  }, [settingsOpen, status])

  const showSettingsMessage = (msg: string, type: MessageType = 'success') => {
    setSettingsMessage(msg)
    setSettingsMessageType(type)
    setTimeout(() => setSettingsMessage(''), 5000)
  }

  const routesWithoutNavbar = [
    '/auth/login',
    '/auth/register',
    '/auth/error',
    '/auth/verify-email',
  ]

  const shouldHideNavbar =
    pathname === '/' ||
    routesWithoutNavbar.some(route => pathname.startsWith(route))

  if (shouldHideNavbar) {
    return null
  }

  if (status === 'unauthenticated') {
    return null
  }

  // Afficher un placeholder pendant le chargement
  if (status === 'loading') {
    return (
      <nav className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto flex-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💖</span>
            <span className="text-xl font-bold text-gray-800">Flow Dating</span>
          </div>
          <Skeleton className="w-10 h-10 rounded-full" />
        </div>
      </nav>
    )
  }

  const handleSecureSignOut = async () => {
    setIsLoggingOut(true)

    try {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include',
        })
      } catch (apiError) {
        console.warn('Erreur nettoyage API:', apiError)
      }

      await signOut({
        callbackUrl: '/',
        redirect: false
      })

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

      try {
        localStorage.clear()
        sessionStorage.clear()
      } catch (storageError) {
        console.warn('Erreur nettoyage stockage:', storageError)
      }

      window.location.replace('/')

    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error)
      window.location.href = '/'
    } finally {
      setIsLoggingOut(false)
    }
  }

  const navLinkClass = (path: string) =>
    `text-gray-600 hover:text-gray-900 transition-colors font-medium ${
      pathname === path ? 'text-primary-600 font-semibold' : ''
    }`

  if (status === 'authenticated' && session) {
    return (
      <nav className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto flex-between">
          {/* Logo */}
          <Link href="/home" className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
            <span className="text-2xl">💖</span>
            <span className="text-xl font-bold text-gray-800">Flow Dating</span>
          </Link>

          {/* Menu de navigation principal */}
          <div className="hidden md:flex items-center space-x-6">
            <Link href="/discover" className={navLinkClass('/discover')}>
              🔥 Découverte
            </Link>
            <Link href="/matches" className={`${navLinkClass('/matches')} relative`}>
              💖 Matchs
              {matchesCount > 0 && (
                <span className="absolute -top-2 -right-4 badge-primary text-[10px] w-5 h-5 flex-center rounded-full">
                  {matchesCount > 99 ? '99+' : matchesCount}
                </span>
              )}
            </Link>
            <ChatNavItem />
            <Link href="/help" className={`${navLinkClass('/help')} flex items-center gap-1`}>
              <BugAntIcon className="w-4 h-4" />
              Support
            </Link>
            <Link href="/premium" className={`${navLinkClass('/premium')} flex items-center gap-1`}>
              👑 Premium
              <span className="badge bg-gradient-to-r from-amber-400 to-yellow-500 text-white text-[9px] px-1.5 py-0.5">
                Pro
              </span>
            </Link>
            <Link href="/donate" className={`${navLinkClass('/donate')} flex items-center gap-1`}>
              🪙 Don
            </Link>
          </div>

          {/* Profil utilisateur avec DropdownMenu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-all duration-200 outline-none">
                {profilePhoto ? (
                  <img
                    src={profilePhoto}
                    alt="Photo de profil"
                    className="avatar-md shadow-lg border-2 border-primary-200"
                    onError={() => setProfilePhoto(null)}
                  />
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-secondary-500 rounded-full flex-center text-white font-bold text-sm shadow-lg">
                    {session.user?.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                <span className="hidden md:block font-medium text-gray-700">
                  {session.user?.name || 'Utilisateur'}
                </span>
                <svg
                  className="w-4 h-4 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <p className="font-medium">{session.user?.name || 'Utilisateur'}</p>
                <p className="text-xs text-muted-foreground">Membre Flow Dating</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              <DropdownMenuItem asChild>
                <Link href="/home" className="cursor-pointer">
                  <span className="mr-3">🏠</span>
                  Accueil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/profile" className="cursor-pointer">
                  <span className="mr-3">👤</span>
                  Mon profil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setSettingsOpen(true)}
                className="cursor-pointer"
              >
                <span className="mr-3">⚙️</span>
                Paramètres
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/premium" className="cursor-pointer flex-between w-full">
                  <span><span className="mr-3">⭐</span>Premium</span>
                  <span className="badge bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-[10px]">
                    Pro
                  </span>
                </Link>
              </DropdownMenuItem>

              {/* Lien Admin pour ADMIN et MODERATOR */}
              {((session.user as any)?.role === 'ADMIN' || (session.user as any)?.role === 'MODERATOR') && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/admin" className="cursor-pointer flex-between w-full">
                      <span><span className="mr-3">🛡️</span>Administration</span>
                      <span className={`badge text-white text-[10px] ${
                        (session.user as any)?.role === 'ADMIN'
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600'
                          : 'bg-gradient-to-r from-blue-500 to-cyan-500'
                      }`}>
                        {(session.user as any)?.role === 'ADMIN' ? 'Admin' : 'Mod'}
                      </span>
                    </Link>
                  </DropdownMenuItem>
                </>
              )}

              <DropdownMenuSeparator />

              <DropdownMenuItem asChild>
                <Link href="/help" className="cursor-pointer flex items-center">
                  <BugAntIcon className="w-4 h-4 mr-3" />
                  Support / Bug
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/donate" className="cursor-pointer flex-between w-full">
                  <span><span className="mr-3">🪙</span>Faire un don</span>
                  <span className="badge bg-gradient-to-r from-yellow-500 to-amber-500 text-white text-[10px]">
                    Soutenir
                  </span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={handleSecureSignOut}
                disabled={isLoggingOut}
                className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
              >
                <span className="mr-3">{isLoggingOut ? '⏳' : '🚪'}</span>
                {isLoggingOut ? 'Déconnexion...' : 'Se déconnecter'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Menu mobile hamburger */}
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  {matchesCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary-500 text-white text-[10px] rounded-full flex-center">
                      {matchesCount > 9 ? '9+' : matchesCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex items-center gap-3">
                    {profilePhoto ? (
                      <img src={profilePhoto} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-secondary-500 rounded-full flex-center text-white font-bold text-xs">
                        {session.user?.name?.[0]?.toUpperCase() || 'U'}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-sm">{session.user?.name || 'Utilisateur'}</p>
                      <p className="text-xs text-muted-foreground">Flow Dating</p>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {/* Navigation principale */}
                <DropdownMenuItem asChild>
                  <Link href="/discover" className="cursor-pointer">
                    <span className="mr-3">🔥</span>Découverte
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/matches" className="cursor-pointer flex-between w-full">
                    <span><span className="mr-3">💖</span>Matchs</span>
                    {matchesCount > 0 && (
                      <span className="badge-primary text-[10px] px-1.5 py-0.5 rounded-full">
                        {matchesCount}
                      </span>
                    )}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/chat" className="cursor-pointer">
                    <span className="mr-3">💬</span>Messages
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/help" className="cursor-pointer flex items-center">
                    <BugAntIcon className="w-4 h-4 mr-3" />
                    Support / Bug
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/premium" className="cursor-pointer flex-between w-full">
                    <span><span className="mr-3">👑</span>Premium</span>
                    <span className="badge bg-gradient-to-r from-amber-400 to-yellow-500 text-white text-[10px]">
                      Pro
                    </span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/donate" className="cursor-pointer flex-between w-full">
                    <span><span className="mr-3">🪙</span>Don</span>
                    <span className="badge bg-gradient-to-r from-yellow-500 to-amber-500 text-white text-[10px]">
                      Soutenir
                    </span>
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                {/* Profil & Paramètres */}
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="cursor-pointer">
                    <span className="mr-3">👤</span>Mon profil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setSettingsOpen(true)}
                  className="cursor-pointer"
                >
                  <span className="mr-3">⚙️</span>Paramètres
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  onClick={handleSecureSignOut}
                  disabled={isLoggingOut}
                  className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                >
                  <span className="mr-3">{isLoggingOut ? '⏳' : '🚪'}</span>
                  {isLoggingOut ? 'Deconnexion...' : 'Se deconnecter'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Drawer des paramètres */}
        <Drawer open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DrawerContent className="max-h-[90vh]">
            <DrawerHeader className="border-b border-gray-200">
              <DrawerTitle className="text-xl font-bold flex items-center gap-2">
                <span>⚙️</span>
                Paramètres du compte
              </DrawerTitle>
              <DrawerDescription>
                Gérez votre compte, confidentialité et notifications
              </DrawerDescription>
            </DrawerHeader>

            <div className="overflow-y-auto max-h-[calc(90vh-180px)]">
              {settingsMessage && (
                <div className={`mx-4 mt-4 p-3 rounded-lg ${
                  settingsMessageType === 'success'
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : settingsMessageType === 'info'
                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {settingsMessage}
                </div>
              )}

              <SettingsPanel
                profile={profile}
                photos={profile?.photos || []}
                session={session}
                onMessage={showSettingsMessage}
                isPremium={profile?.isPremium || false}
              />
            </div>

            <DrawerFooter className="border-t border-gray-200">
              <DrawerClose asChild>
                <Button variant="outline" className="w-full">
                  Fermer
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      </nav>
    )
  }

  return null
}
