//src/app/layout.tsx

import './globals.css'
import { SessionProvider } from 'next-auth/react'
import { QueryProvider } from '@/providers/QueryProvider'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Navbar from '@/components/layout/Navbar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Flow Dating',
  description: 'Application de rencontre sentimental moderne',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <body className={inter.className}>
          <SessionProvider>
            {/* Contenu principal */}
              <QueryProvider>
                {/* Navbar conditionnelle basée sur la route et l'authentification */}
                <Navbar />
                <main>
                  {children}
                </main>
              </QueryProvider>       
          </SessionProvider>
      </body>
    </html>
  )
}