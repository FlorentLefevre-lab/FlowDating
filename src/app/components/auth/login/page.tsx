//src/components/auth/login/page.tsx
import LoginForm from '@/components/auth/LoginForm'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function LoginPage() {
    // 1. Vérification de l'authentification
    const session = await auth();  

  // Rediriger si déjà connecté
  if (session) {
    redirect('/profile')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center p-4">
      <LoginForm />
    </div>
  )
}