'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';
import Navbar from '@/components/layout/Navbar';
import { PresenceProvider } from '@/providers/PresenceProvider';

interface ClientProvidersProps {
  children: ReactNode;
}

export default function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <SessionProvider>
      <PresenceProvider heartbeatInterval={30000}>
        <Navbar />
        <main>
          {children}
        </main>
      </PresenceProvider>
    </SessionProvider>
  );
}
