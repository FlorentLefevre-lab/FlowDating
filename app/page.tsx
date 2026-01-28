export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
      <div className="text-center text-white p-8">
        <h1 className="text-6xl font-bold mb-4">Flow Dating</h1>
        <p className="text-xl mb-8">Bienvenue sur l application</p>
        <div className="flex gap-4 justify-center">
          <a
            href="/auth/login"
            className="bg-pink-600 hover:bg-pink-700 px-6 py-3 rounded-lg font-semibold"
          >
            Se connecter
          </a>
          <a
            href="/auth/register"
            className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg font-semibold"
          >
            S inscrire
          </a>
        </div>
      </div>
    </div>
  )
}
