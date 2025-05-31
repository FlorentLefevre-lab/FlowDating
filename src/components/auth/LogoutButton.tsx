'use client'
import { signOut } from 'next-auth/react'
import { useState } from 'react'

interface LogoutButtonProps {
  className?: string
  children?: React.ReactNode
}

export default function LogoutButton({ 
  className = "bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700", 
  children = "Se déconnecter" 
}: LogoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleLogout = async () => {
    setIsLoading(true)
    try {
      await signOut({ 
        callbackUrl: '/',
        redirect: true 
      })
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={isLoading}
      className={className}
    >
      {isLoading ? 'Déconnexion...' : children}
    </button>
  )
}