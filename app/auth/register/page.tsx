// src/app/auth/register/page.tsx
import RegisterForm from '@/components/auth/RegisterForm'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui'

export default async function RegisterPage() {
  const session = await auth()

  if (session) {
    redirect('/home')
  }

  return (
    <div className="min-h-screen flex-center bg-gradient-to-br from-pink-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="max-w-md w-full p-8">
        <div className="text-center mb-8">
          <div className="text-4xl mb-4">💖</div>
          <h2 className="text-heading">
            Créer un compte
          </h2>
          <p className="mt-2 text-body">
            Ou{' '}
            <Link
              href="/auth/login"
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              connectez-vous à votre compte existant
            </Link>
          </p>
        </div>
        <RegisterForm />
      </Card>
    </div>
  )
}
