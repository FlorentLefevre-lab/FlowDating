import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import LogoutButton from '@/components/auth/LogoutButton'

export default async function ProfilePage() {
  const session = await getServerSession(authOptions)
  
  // Rediriger vers login si pas connecté
  if (!session) {
    redirect('/auth/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img
                src={session.user?.image || '/default-avatar.jpg'}
                alt="Profile"
                className="w-16 h-16 rounded-full border-2 border-pink-500"
              />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Bienvenue, {session.user?.name} !
                </h1>
                <p className="text-gray-600">{session.user?.email}</p>
              </div>
            </div>
            
            <LogoutButton />
          </div>
        </div>

        {/* Contenu principal */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Votre profil</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Nom complet
              </label>
              <p className="mt-1 text-sm text-gray-900">{session.user?.name || 'Non renseigné'}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <p className="mt-1 text-sm text-gray-900">{session.user?.email}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Méthode de connexion
              </label>
              <p className="mt-1 text-sm text-gray-900">
                {session.user?.provider === 'google' ? '🟢 Google' : 
                 session.user?.provider === 'facebook' ? '🔵 Facebook' : 
                 session.user?.provider === 'credentials' ? '📧 Email/Password' : 
                 'Non défini'}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex space-x-4">
              <button className="bg-pink-600 text-white px-4 py-2 rounded-md hover:bg-pink-700">
                Modifier le profil
              </button>
              <button className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300">
                Paramètres
              </button>
            </div>
          </div>
        </div>

        {/* Prochaines étapes */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            🚀 Prochaines étapes
          </h3>
          <ul className="text-blue-800 space-y-1">
            <li>• Compléter votre profil (âge, bio, photos)</li>
            <li>• Définir vos préférences de rencontre</li>
            <li>• Commencer à découvrir des profils</li>
          </ul>
        </div>
      </div>
    </div>
  )
}