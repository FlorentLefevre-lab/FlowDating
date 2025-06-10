// src/app/auth/register/page.tsx
import RegisterForm from '@/components/auth/RegisterForm'
import { auth } from '../../../auth'  // ✅ Nouveau import v5
import { redirect } from 'next/navigation'

export default async function RegisterPage() {
  const session = await auth()  // ✅ Nouvelle syntaxe v5
  
  if (session) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Créer un compte
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Ou{' '}
            <a
              href="/auth/login"
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              connectez-vous à votre compte existant
            </a>
          </p>
        </div>
        <RegisterForm />
      </div>
    </div>
  )
}