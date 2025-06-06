//src/app/layout.tsx

import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Providers } from './providers'
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
        <Providers>
          {/* Navbar conditionnelle basée sur la route et l'authentification */}
          <Navbar />
          
          {/* Contenu principal */}
          <main>
            {children}
          </main>
        </Providers>
      </body>
    </html>
  )
}