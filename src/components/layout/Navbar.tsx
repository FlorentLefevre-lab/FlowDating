'use client'

import { useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface NavbarProps {
  userName: string
  userInitial: string
}

export default function Navbar({ userName, userInitial }: NavbarProps) {
  const router = useRouter()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Détecter si on est sur mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Fermer les menus lors de la navigation
  useEffect(() => {
    const handleRouteChange = () => {
      setIsDropdownOpen(false)
      setIsMobileMenuOpen(false)
    }

    // Écouter les changements de route si nécessaire
    return () => {
      handleRouteChange()
    }
  }, [])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await signOut({ 
        callbackUrl: '/auth/login',
        redirect: true 
      })
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error)
      setIsLoggingOut(false)
    }
  }

  const menuItems = [
    {
      icon: '👤',
      title: 'Mon Profil',
      description: 'Gérer mes informations',
      action: () => router.push('/profile')
    },
    {
      icon: '⚙️',
      title: 'Paramètres',
      description: 'Préférences et confidentialité',
      action: () => router.push('/settings')
    },
    {
      icon: '👑',
      title: 'Premium',
      description: 'Débloquer toutes les fonctionnalités',
      action: () => router.push('/premium'),
      badge: '✨'
    },
    {
      icon: '❓',
      title: 'Aide',
      description: 'Support et FAQ',
      action: () => router.push('/help')
    }
  ]

  const MenuItem = ({ item, onClick, className = "" }) => (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => {
        item.action()
        onClick?.()
      }}
      className={`w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-gray-50 transition-colors rounded-lg ${className}`}
    >
      <span className="text-lg">{item.icon}</span>
      <div className="flex-1">
        <div className="font-medium text-gray-900 flex items-center gap-2">
          {item.title}
          {item.badge && (
            <span className="text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 py-0.5 rounded-full">
              {item.badge}
            </span>
          )}
        </div>
        <div className="text-sm text-gray-500">{item.description}</div>
      </div>
    </motion.button>
  )

  return (
    <>
      <nav className="dashboard-navbar relative">
        <div className="dashboard-nav-content">
          {/* Logo */}
          <motion.div 
            className="dashboard-logo cursor-pointer" 
            onClick={() => router.push('/dashboard')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="dashboard-logo-icon">💖</div>
            <h1 className="dashboard-logo-text">Flow Dating</h1>
          </motion.div>
          
          {/* Desktop Menu */}
          <div className="hidden md:block relative">
            <motion.div 
              className="dashboard-user-info cursor-pointer"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="avatar avatar-online w-10 h-10">
                <div className="w-full h-full bg-gradient-to-br from-primary-400 to-secondary-500 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-lg">
                  {userInitial}
                </div>
              </div>
              <span className="dashboard-user-name">{userName}</span>
              <motion.svg 
                className="w-4 h-4 text-gray-600"
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
                animate={{ rotate: isDropdownOpen ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </motion.svg>
            </motion.div>

            {/* Desktop Dropdown Menu */}
            <AnimatePresence>
              {isDropdownOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50 overflow-hidden"
                >
                  <div className="px-2">
                    {menuItems.map((item, index) => (
                      <MenuItem 
                        key={item.title}
                        item={item} 
                        onClick={() => setIsDropdownOpen(false)}
                      />
                    ))}
                    
                    {/* Divider */}
                    <div className="my-2 border-t border-gray-100"></div>

                    {/* Déconnexion */}
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-red-50 transition-colors text-red-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
                    >
                      <span className="text-lg">
                        {isLoggingOut ? '⏳' : '🚪'}
                      </span>
                      <div>
                        <div className="font-medium">
                          {isLoggingOut ? 'Déconnexion...' : 'Se déconnecter'}
                        </div>
                        <div className="text-sm text-red-500">
                          {isLoggingOut ? 'Patientez...' : 'Quitter Flow Dating'}
                        </div>
                      </div>
                    </motion.button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Mobile Hamburger Button */}
          <div className="md:hidden">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors relative z-50"
            >
              <motion.div
                animate={isMobileMenuOpen ? "open" : "closed"}
                variants={{
                  open: { rotate: 180 },
                  closed: { rotate: 0 }
                }}
                transition={{ duration: 0.2 }}
              >
                {isMobileMenuOpen ? (
                  <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </motion.div>
            </motion.button>
          </div>
        </div>
      </nav>

      {/* Mobile Slide-out Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
            />
            
            {/* Mobile Menu */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-80 max-w-[85vw] bg-white shadow-2xl z-50 md:hidden overflow-y-auto"
            >
              {/* Header du menu mobile */}
              <div className="p-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                <div className="flex items-center gap-4">
                  <div className="avatar w-12 h-12">
                    <div className="w-full h-full bg-white bg-opacity-20 rounded-full flex items-center justify-center text-lg font-bold">
                      {userInitial}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{userName}</h3>
                    <p className="text-white text-opacity-80 text-sm">Membre Flow Dating</p>
                  </div>
                </div>
              </div>

              {/* Menu Items */}
              <div className="p-4 space-y-2">
                {menuItems.map((item, index) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <MenuItem 
                      item={item} 
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="border border-gray-100"
                    />
                  </motion.div>
                ))}
                
                {/* Divider */}
                <div className="my-4 border-t border-gray-200"></div>

                {/* Déconnexion */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: menuItems.length * 0.1 }}
                >
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-red-50 transition-colors text-red-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg border border-red-200"
                  >
                    <span className="text-lg">
                      {isLoggingOut ? '⏳' : '🚪'}
                    </span>
                    <div>
                      <div className="font-medium">
                        {isLoggingOut ? 'Déconnexion...' : 'Se déconnecter'}
                      </div>
                      <div className="text-sm text-red-500">
                        {isLoggingOut ? 'Patientez...' : 'Quitter Flow Dating'}
                      </div>
                    </div>
                  </motion.button>
                </motion.div>
              </div>

              {/* Footer du menu mobile */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gray-50 border-t">
                <p className="text-center text-sm text-gray-500">
                  Flow Dating v1.0
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Overlay pour fermer le dropdown */}
      {isDropdownOpen && (
        <div 
          className="fixed inset-0 z-40 md:block hidden" 
          onClick={() => setIsDropdownOpen(false)}
        />
      )}
    </>
  )
}