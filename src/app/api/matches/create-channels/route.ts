// src/app/api/matches/create-channels/route.ts - VERSION DÉFINITIVEMENT CORRIGÉE
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { createChannelsForMatches } from '@/lib/streamConfig';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 [CHANNELS] === DÉBUT CRÉATION CHANNELS ===');

    // 1. Vérifier la session
    const session = await auth();
    if (!session?.user?.id) {
      console.error('❌ [CHANNELS] Session manquante');
      return NextResponse.json(
        { error: 'Session utilisateur requise' },
        { status: 401 }
      );
    }

    console.log('✅ [CHANNELS] Session validée:', session.user.name);
    console.log('👤 [CHANNELS] User ID:', session.user.id);

    // 2. Créer les channels pour les matches en utilisant la fonction définitivement corrigée
    let result;
    try {
      result = await createChannelsForMatches(session.user.id);
      console.log('✅ [CHANNELS] Channels matches créés:', result.channelsCreated);
      if (result.errors.length > 0) {
        console.log('⚠️ [CHANNELS] Erreurs channels:', result.errors);
      }
    } catch (channelError) {
      console.error('❌ [CHANNELS] Erreur création channels:', channelError);
      return NextResponse.json(
        {
          error: 'Impossible de créer les channels',
          details: channelError instanceof Error ? channelError.message : 'Erreur inconnue'
        },
        { status: 500 }
      );
    }

    // 3. Retourner le résultat
    console.log('🎉 [CHANNELS] === SUCCÈS ===');
    return NextResponse.json({
      success: true,
      channelsCreated: result.channelsCreated,
      errors: result.errors,
      userId: session.user.id,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [CHANNELS] === ERREUR GÉNÉRALE ===');
    console.error('❌ Erreur:', error);
    return NextResponse.json(
      {
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// ===============================
// ROUTE GET POUR DEBUG - VERSION DÉFINITIVEMENT CORRIGÉE
// ===============================
export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Session requise' },
        { status: 401 }
      );
    }

    // Import des fonctions de debug avec la nouvelle configuration
    const { 
      debugStreamConnection, 
      testStreamConfiguration,
      createPrismaInstance
    } = await import('@/lib/streamConfig');
    
    let matchCount = 0;
    let databaseTest = { success: false, error: 'Non testé' };
    
    // Test de la base de données avec l'instance Prisma robuste
    try {
      // Utiliser la fonction utilitaire pour créer une instance Prisma
      const prisma = await createPrismaInstance();
      
      try {
        // Compter les matches
        const matches = await prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*) as count
          FROM (
            SELECT DISTINCT l1."senderId", l1."receiverId"
            FROM "likes" l1
            INNER JOIN "likes" l2
              ON l1."senderId" = l2."receiverId"
              AND l1."receiverId" = l2."senderId"
            WHERE l1."receiverId" = ${session.user.id}
               OR l1."senderId" = ${session.user.id}
          ) as matches
        `;

        matchCount = Number(matches[0]?.count || 0);
        databaseTest = { success: true, error: undefined };
        
      } finally {
        await prisma.$disconnect();
      }
    } catch (dbError) {
      databaseTest = {
        success: false,
        error: dbError instanceof Error ? dbError.message : 'Erreur DB inconnue'
      };
    }

    // Test de la configuration Stream
    const streamTest = await testStreamConfiguration();
    
    // Debug de la connexion Stream
    const debugInfo = await debugStreamConnection();

    return NextResponse.json({
      message: 'Debug Create Channels API - Version Définitivement Corrigée',
      userId: session.user.id,
      userName: session.user.name,
      matchesCount: matchCount,
      databaseTest,
      streamConfiguration: {
        isValid: streamTest.success,
        issues: streamTest.issues,
        recommendations: streamTest.recommendations,
        debugInfo
      },
      timestamp: new Date().toISOString(),
      instructions: {
        post: 'POST vers cette route pour créer les channels',
        manual: 'POST vers /api/chat/create-channel avec { targetUserId } pour un channel spécifique'
      }
    });

  } catch (error) {
    return NextResponse.json(
      {
        error: 'Erreur debug',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}