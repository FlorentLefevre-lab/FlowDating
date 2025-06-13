import RegisterForm from '@/components/auth/RegisterForm'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function RegisterPage() {
  const session = await getServerSession(authOptions)
  
  // Rediriger si déjà connecté
  if (session) {
    redirect('/profile')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center p-4">
      <RegisterForm />
    </div>
  )
}