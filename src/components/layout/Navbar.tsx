'use client'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import LogoutButton from '@/components/auth/LogoutButton'
import Image from 'next/image'

export default function Navbar() {
  const { data: session, status } = useSession()

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="text-2xl font-bold text-pink-600">
              💕 LoveApp
            </Link>
          </div>

          {/* Navigation */}
          <div className="flex items-center space-x-4">
            {status === 'loading' ? (
              <div className="animate-pulse">
                <div className="h-8 w-20 bg-gray-200 rounded"></div>
              </div>
            ) : session ? (
              // Utilisateur connecté
              <div className="flex items-center space-x-4">
                <Link
                  href="/discover"
                  className="text-gray-700 hover:text-pink-600 px-3 py-2 rounded-md"
                >
                  Découvrir
                </Link>
                <Link
                  href="/matches"
                  className="text-gray-700 hover:text-pink-600 px-3 py-2 rounded-md"
                >
                  Mes Matches
                </Link>
                <Link
                  href="/chat"
                  className="text-gray-700 hover:text-pink-600 px-3 py-2 rounded-md"
                >
                  Messages
                </Link>
                
                {/* Profile dropdown */}
                <div className="flex items-center space-x-2">
                  <Link href="/profile" className="flex items-center space-x-2">
                    <Image
                      src={session.user?.image || '/default-avatar.jpg'}
                      alt="Profile"
                      width={32}
                      height={32}
                      className="rounded-full"
                    />
                    <span className="text-gray-700 font-medium">
                      {session.user?.name}
                    </span>
                  </Link>
                  
                  <LogoutButton className="ml-4 bg-gray-600 text-white px-3 py-1 rounded-md hover:bg-gray-700 text-sm">
                    Déconnexion
                  </LogoutButton>
                </div>
              </div>
            ) : (
              // Utilisateur non connecté
              <div className="flex items-center space-x-4">
                <Link
                  href="/auth/login"
                  className="text-gray-700 hover:text-pink-600 px-3 py-2 rounded-md"
                >
                  Se connecter
                </Link>
                <Link
                  href="/auth/register"
                  className="bg-pink-600 text-white px-4 py-2 rounded-md hover:bg-pink-700"
                >
                  S'inscrire
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}