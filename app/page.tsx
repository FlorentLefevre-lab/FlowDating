import Link from 'next/link'
import { Button } from '@/components/ui'

export default function LandingPage() {
  return (
    <div className="min-h-screen flex-center bg-gradient-to-br from-secondary-500 to-primary-500">
      <div className="text-center text-white p-8">
        <div className="text-6xl mb-4">💖</div>
        <h1 className="text-6xl font-bold mb-4">Flow Dating</h1>
        <p className="text-xl mb-8 opacity-90">Trouvez l'amour en toute simplicité</p>
        <div className="flex gap-4 justify-center">
          <Button asChild variant="default" size="lg" className="bg-white text-primary-600 hover:bg-gray-100">
            <Link href="/auth/login">
              Se connecter
            </Link>
          </Button>
          <Button asChild variant="gradient" size="lg">
            <Link href="/auth/register">
              S'inscrire
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
