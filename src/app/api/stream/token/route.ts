// src/app/api/stream/token/route.ts - Version corrigée
import { StreamChat } from 'stream-chat';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 === API TOKEN DÉBUT ===');
    
    // Vérifier l'authentification
    const session = await auth();
    if (!session?.user?.id) {
      console.log('❌ Non authentifié');
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { userId, otherUserId } = await request.json();
    console.log('📝 Paramètres reçus:', { userId, otherUserId });

    if (!userId) {
      console.log('❌ userId manquant');
      return NextResponse.json({ error: 'userId requis' }, { status: 400 });
    }

    // Vérifier que l'utilisateur connecté demande son propre token
    if (session.user.id !== userId) {
      console.log('❌ Autorisation refusée:', { sessionUserId: session.user.id, requestedUserId: userId });
      return NextResponse.json({ error: 'Autorisation refusée' }, { status: 403 });
    }

    // Vérifier les variables d'environnement
    if (!process.env.NEXT_PUBLIC_STREAM_API_KEY || !process.env.STREAM_API_SECRET) {
      console.error('❌ Variables Stream manquantes');
      return NextResponse.json({ error: 'Configuration Stream manquante' }, { status: 500 });
    }

    // Initialiser le client Stream côté serveur
    console.log('🔄 Initialisation client serveur Stream...');
    const serverClient = StreamChat.getInstance(
      process.env.NEXT_PUBLIC_STREAM_API_KEY,
      process.env.STREAM_API_SECRET
    );

    // Fonction utilitaire pour créer un utilisateur Stream
    const createStreamUser = async (userIdToCreate: string) => {
      console.log(`🔄 Création utilisateur Stream: ${userIdToCreate}`);
      
      const user = await prisma.user.findUnique({
        where: { id: userIdToCreate },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          photos: { 
            where: { isPrimary: true }, 
            select: { url: true }, 
            take: 1 
          }
        }
      });

      if (!user) {
        throw new Error(`Utilisateur ${userIdToCreate} non trouvé`);
      }

      const streamUser = {
        id: user.id,
        name: user.name || user.email?.split('@')[0] || 'Utilisateur',
        image: user.photos[0]?.url || user.image || '/default-avatar.png',
        role: 'user',
      };

      console.log(`🔄 Upsert utilisateur:`, { id: streamUser.id, name: streamUser.name });
      await serverClient.upsertUser(streamUser);
      console.log(`✅ Utilisateur Stream créé/mis à jour: ${streamUser.name}`);
      
      return streamUser;
    };

    // Créer l'utilisateur principal
    console.log('🔄 Création utilisateur principal...');
    await createStreamUser(userId);

    // Créer l'autre utilisateur si fourni
    if (otherUserId) {
      try {
        console.log('🔄 Création autre utilisateur...');
        await createStreamUser(otherUserId);
      } catch (error) {
        console.warn('⚠️ Impossible de créer l\'autre utilisateur:', error);
        // Ne pas faire échouer la requête si l'autre utilisateur n'existe pas
      }
    }

    // Générer le token pour l'utilisateur principal
    console.log('🔄 Génération token...');
    const token = serverClient.createToken(userId);

    console.log('✅ === API TOKEN SUCCÈS ===');
    return NextResponse.json({ token });

  } catch (error) {
    console.error('❌ === API TOKEN ERREUR ===');
    console.error('❌ Erreur complète:', error);
    
    if (error instanceof Error) {
      console.error('❌ Message:', error.message);
      console.error('❌ Stack:', error.stack);
    }
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Erreur serveur',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      }, 
      { status: 500 }
    );
  }
}