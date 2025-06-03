// src/app/api/debug/online-users/route.ts - Diagnostic utilisateurs en ligne
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('🔍 Debug: Vérification utilisateurs en ligne');
  
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    return NextResponse.json({
      currentUser: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        isAuthenticated: true,
        sessionProvider: session.user.provider || 'unknown'
      },
      socketInfo: {
        message: 'Vérifiez les logs Socket.io côté serveur',
        expectedSocketUrl: process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000',
        instructions: [
          '1. Regardez les logs Socket.io dans le terminal [1]',
          '2. Vérifiez si cet utilisateur apparaît comme "authentifié"',
          '3. Vérifiez si d\'autres utilisateurs sont listés comme connectés'
        ]
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    return NextResponse.json({
      error: 'Erreur debug',
      message: error.message
    }, { status: 500 });
  }
}