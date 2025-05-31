import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          💕 Bienvenue sur Flow Dating ...
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Trouvez l'amour de votre vie
        </p>
        
        <div className="space-x-4">
          <Link
            href="/auth/register"
            className="bg-pink-600 text-white px-6 py-3 rounded-lg hover:bg-pink-700 inline-block"
          >
            S'inscrire
          </Link>
          <Link
            href="/auth/login"
            className="bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 inline-block"
          >
            Se connecter
          </Link>
        </div>
      </div>
    </div>
  )
}