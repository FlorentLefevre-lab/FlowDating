'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';
import Navbar from '@/components/layout/Navbar';

interface ClientProvidersProps {
  children: ReactNode;
}

export default function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <SessionProvider>
      <Navbar />
      <main>
        {children}
      </main>
    </SessionProvider>
  );
}
