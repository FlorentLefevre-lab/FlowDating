'use client';

import { SessionProvider, useSession } from 'next-auth/react';
import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import { PresenceProvider } from '@/providers/PresenceProvider';

interface ClientProvidersProps {
  children: ReactNode;
}

// Routes publiques qui n'ont pas besoin de Navbar/Presence
const PUBLIC_ROUTES = [
  '/',
  '/auth/login',
  '/auth/register',
  '/auth/error',
  '/auth/verify-email',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/resend-verification',
  '/auth/email-required',
];

function AuthenticatedLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { status } = useSession();

  const isPublicRoute = PUBLIC_ROUTES.some(route =>
    pathname === route || pathname.startsWith('/auth/')
  );

  // Sur les routes publiques ou si non authentifié, pas de Navbar/Presence
  if (isPublicRoute || status !== 'authenticated') {
    return <main>{children}</main>;
  }

  return (
    <PresenceProvider heartbeatInterval={120000}>
      <Navbar />
      <main>{children}</main>
    </PresenceProvider>
  );
}

export default function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <SessionProvider>
      <AuthenticatedLayout>{children}</AuthenticatedLayout>
    </SessionProvider>
  );
}
