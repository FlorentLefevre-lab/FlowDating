// src/app/api/stream/token/route.ts - VERSION ULTRA MINIMALISTE
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { StreamChat } from 'stream-chat';

// Configuration Stream Chat côté serveur
const serverClient = StreamChat.getInstance(
  process.env.NEXT_PUBLIC_STREAM_API_KEY!,
  process.env.STREAM_API_SECRET!
);

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 [STREAM] Début de la requête token');
    
    // Vérifier la session utilisateur avec NextAuth v5
    const session = await auth();
    console.log('👤 [STREAM] Session:', session?.user?.id ? 'OK' : 'MANQUANTE');
    
    if (!session?.user?.id) {
      console.log('❌ [STREAM] Pas de session valide');
      return NextResponse.json(
        { error: 'Non autorisé' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { userId } = body;
    console.log('📝 [STREAM] User ID reçu:', userId);

    // Vérifier que l'utilisateur correspond à la session
    if (userId !== session.user.id) {
      console.log('❌ [STREAM] ID utilisateur ne correspond pas');
      return NextResponse.json(
        { error: 'ID utilisateur invalide' },
        { status: 403 }
      );
    }

    // Objet utilisateur ULTRA MINIMAL - seulement les champs de base
    const user = {
      id: userId,
      name: session.user.name || 'Utilisateur',
      // On retire même email et image pour test
      role: 'user'
    };

    console.log('👤 [STREAM] Objet utilisateur créé:', JSON.stringify(user, null, 2));

    // Upsert l'utilisateur
    console.log('🔄 [STREAM] Tentative upsert...');
    await serverClient.upsertUser(user);
    console.log('✅ [STREAM] Upsert réussi');

    // Générer le token pour cet utilisateur
    console.log('🔄 [STREAM] Génération token...');
    const token = serverClient.createToken(userId);
    console.log('✅ [STREAM] Token généré');

    return NextResponse.json({
      token,
      user,
      success: true
    });

  } catch (error: any) {
    console.error('❌ [STREAM] Erreur:', error);
    console.error('❌ [STREAM] Stack:', error.stack);
    
    return NextResponse.json(
      { 
        error: 'Erreur serveur',
        message: error.message,
        code: error.code,
        statusCode: error.StatusCode
      },
      { status: 500 }
    );
  }
}