// src/app/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'

export default function LandingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [animatedStats, setAnimatedStats] = useState({ users: 0, matches: 0, messages: 0 })

  // Debug pour NextAuth v5
  useEffect(() => {
    console.log('🔍 Session state:', { session, status })
  }, [session, status])

  // Redirection pour les utilisateurs connectés
  useEffect(() => {
    if (status === 'authenticated' && session) {
      console.log('✅ Utilisateur connecté, redirection vers /home')
      router.push('/home')
      return
    }
  }, [session, status, router])

  // Animation des statistiques
  useEffect(() => {
    const animateNumber = (target: number, key: string, duration: number = 2000) => {
      const start = 0
      const startTime = Date.now()
      
      const updateNumber = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        
        // Animation avec ease-out
        const easeOut = 1 - Math.pow(1 - progress, 3)
        const current = Math.floor(start + (target - start) * easeOut)
        
        setAnimatedStats(prev => ({ ...prev, [key]: current }))
        
        if (progress < 1) {
          requestAnimationFrame(updateNumber)
        }
      }
      
      requestAnimationFrame(updateNumber)
    }

    // Démarrer les animations avec des délais différents
    setTimeout(() => animateNumber(50000, 'users'), 300)
    setTimeout(() => animateNumber(25000, 'matches'), 600)
    setTimeout(() => animateNumber(100000, 'messages'), 900)
  }, [])

  const handleGetStarted = () => {
    router.push('/auth/register')
  }

  const handleLogin = () => {
    router.push('/auth/login')
  }

  // Afficher un loader pendant la vérification de session
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">💖</div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  // Ne rien afficher si l'utilisateur est connecté (redirection en cours)
  if (status === 'authenticated') {
    return null
  }

  return (
    <div className="min-h-screen">
      {/* Navigation publique */}
      <Navbar userName={''} userInitial={''} isPublic={true} />

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        {/* Decorative elements */}
        <div className="absolute top-20 left-10 animate-float">
          <div className="w-8 h-8 text-primary-400 text-2xl">💖</div>
        </div>
        <div className="absolute top-40 right-20 animate-bounce-slow">
          <div className="w-6 h-6 text-secondary-400 text-xl">✨</div>
        </div>
        <div className="absolute bottom-20 left-1/4 animate-pulse-slow">
          <div className="w-6 h-6 text-primary-500 text-xl">💕</div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 text-center lg:text-left">
              <div className="space-y-4">
                <h1 className="text-5xl lg:text-7xl font-bold leading-tight">
                  <span className="text-4xl">💕</span>
                  <br />
                  <span className="gradient-text">
                    Bienvenue sur
                  </span>
                  <br />
                  <span className="text-neutral-800 dark:text-neutral-200">
                    Flow Dating
                  </span>
                </h1>
                
                <p className="text-xl text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  Trouvez l'amour de votre vie avec notre plateforme nouvelle génération. 
                  Des connexions authentiques vous attendent.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <button 
                  onClick={handleGetStarted}
                  className="btn-primary flex items-center justify-center space-x-2 group"
                >
                  <span>Commencer l'aventure</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </button>
                
                <button 
                  onClick={handleLogin}
                  className="btn-secondary"
                >
                  Se connecter
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-8 pt-8">
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                    {animatedStats.users.toLocaleString()}+
                  </div>
                  <div className="text-neutral-600 dark:text-neutral-400 text-sm">Utilisateurs actifs</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-secondary-600 dark:text-secondary-400">
                    {animatedStats.matches.toLocaleString()}+
                  </div>
                  <div className="text-neutral-600 dark:text-neutral-400 text-sm">Matchs réalisés</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold gradient-text-warm">
                    {animatedStats.messages.toLocaleString()}+
                  </div>
                  <div className="text-neutral-600 dark:text-neutral-400 text-sm">Messages échangés</div>
                </div>
              </div>
            </div>

            {/* Hero Image/Illustration */}
            <div className="relative">
              <div className="card-gradient p-8 transform rotate-3 hover:rotate-0 transition-bounce hover-lift">
                <div className="card p-8 space-y-6 transform -rotate-3">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gradient-to-r from-primary-400 to-secondary-500 rounded-full flex items-center justify-center shadow-lg">
                      <span className="text-white text-2xl">💖</span>
                    </div>
                    <div>
                      <div className="skeleton h-4 w-32 mb-2"></div>
                      <div className="skeleton h-3 w-24"></div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                      <div className="skeleton h-3 w-40"></div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-primary-400 rounded-full"></div>
                      <div className="skeleton h-3 w-32"></div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-secondary-400 rounded-full"></div>
                      <div className="skeleton h-3 w-36"></div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <div className="badge badge-success">💕 Match!</div>
                    <div className="badge">✨ Super Like</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white dark:bg-neutral-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-neutral-800 dark:text-neutral-200 mb-4">
              Pourquoi choisir Flow Dating ?
            </h2>
            <p className="text-xl text-neutral-600 dark:text-neutral-400 max-w-3xl mx-auto">
              Nous utilisons la technologie la plus avancée pour vous aider à trouver des connexions authentiques
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: "👥",
                title: "Algorithme intelligent",
                description: "Notre IA analyse vos préférences pour vous proposer les profils les plus compatibles",
                gradient: "from-primary-400 to-primary-600"
              },
              {
                icon: "🔒",
                title: "Sécurité maximale",
                description: "Vérification des profils et protection de vos données personnelles garanties",
                gradient: "from-secondary-400 to-secondary-600"
              },
              {
                icon: "💬",
                title: "Chat en temps réel",
                description: "Communiquez instantanément avec vos matchs grâce à notre système de messagerie",
                gradient: "from-orange-400 to-red-500"
              },
              {
                icon: "💖",
                title: "Matchs de qualité",
                description: "Focalisez-vous sur les personnes qui vous correspondent vraiment",
                gradient: "from-primary-400 to-primary-600"
              },
              {
                icon: "⭐",
                title: "Profils vérifiés",
                description: "Tous les profils sont vérifiés pour garantir des rencontres authentiques",
                gradient: "from-secondary-400 to-secondary-600"
              },
              {
                icon: "✨",
                title: "Expérience premium",
                description: "Interface intuitive et fonctionnalités avancées pour une expérience optimale",
                gradient: "from-orange-400 to-red-500"
              }
            ].map((feature, index) => (
              <div 
                key={index}
                className="card p-8 hover-lift hover-glow group"
              >
                <div className={`w-14 h-14 bg-gradient-to-r ${feature.gradient} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                  <span className="text-white text-2xl">{feature.icon}</span>
                </div>
                
                <h3 className="text-xl font-semibold text-neutral-800 dark:text-neutral-200 mb-3">
                  {feature.title}
                </h3>
                
                <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">
              Ils ont trouvé l'amour sur Flow Dating
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Découvrez les témoignages de nos membres qui ont trouvé leur âme sœur
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Alice & Thomas",
                story: "Après 6 mois d'échanges, nous nous sommes mariés ! Flow Dating a changé notre vie.",
                avatar: "👫",
                time: "Mariés en 2024"
              },
              {
                name: "Marie & Lucas",
                story: "L'algorithme était parfait ! Nous avons tout de suite su que c'était le bon.",
                avatar: "💑",
                time: "En couple depuis 1 an"
              },
              {
                name: "Sophie & Alex",
                story: "Une app intuitive qui m'a permis de rencontrer mon âme sœur en quelques semaines.",
                avatar: "👩‍❤️‍👨",
                time: "Fiancés"
              }
            ].map((testimonial, index) => (
              <div key={index} className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg transition-all duration-300">
                <div className="text-center mb-6">
                  <div className="text-4xl mb-4">{testimonial.avatar}</div>
                  <h4 className="font-bold text-gray-800 text-lg">{testimonial.name}</h4>
                  <p className="text-sm text-pink-600 font-medium">{testimonial.time}</p>
                </div>
                <p className="text-gray-600 leading-relaxed text-center italic">
                  "{testimonial.story}"
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary-500 via-primary-400 to-secondary-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Prêt à trouver l'amour ?
          </h2>
          
          <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
            Rejoignez Flow Dating dès aujourd'hui et commencez votre histoire d'amour
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={handleGetStarted}
              className="bg-white text-primary-600 px-8 py-4 rounded-xl text-lg font-semibold hover:bg-primary-50 transition-smooth hover-lift shadow-lg hover:shadow-xl"
            >
              Créer mon profil gratuitement
            </button>
            <button 
              onClick={handleLogin}
              className="border-2 border-white text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-white hover:text-primary-600 transition-smooth"
            >
              J'ai déjà un compte
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-neutral-900 dark:bg-neutral-950 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <span className="text-primary-500 text-xl">💖</span>
                <span className="text-lg font-bold gradient-text">💕 Flow Dating</span>
              </div>
              <p className="text-neutral-400">
                La plateforme de rencontre nouvelle génération pour des connexions authentiques.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Liens utiles</h4>
              <div className="space-y-2 text-neutral-400">
                <div className="nav-link cursor-pointer">À propos</div>
                <div className="nav-link cursor-pointer">Comment ça marche</div>
                <div className="nav-link cursor-pointer">Témoignages</div>
                <div className="nav-link cursor-pointer">Blog</div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <div className="space-y-2 text-neutral-400">
                <div className="nav-link cursor-pointer">Centre d'aide</div>
                <div className="nav-link cursor-pointer">Conditions d'utilisation</div>
                <div className="nav-link cursor-pointer">Politique de confidentialité</div>
                <div className="nav-link cursor-pointer">Contact</div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Suivez-nous</h4>
              <div className="space-y-2 text-neutral-400">
                <div className="nav-link cursor-pointer">📘 Facebook</div>
                <div className="nav-link cursor-pointer">📷 Instagram</div>
                <div className="nav-link cursor-pointer">🐦 Twitter</div>
                <div className="nav-link cursor-pointer">🎵 TikTok</div>
              </div>
            </div>
          </div>

          <div className="border-t border-neutral-800 mt-8 pt-8 text-center text-neutral-400">
            <p>&copy; 2025 Flow Dating. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}