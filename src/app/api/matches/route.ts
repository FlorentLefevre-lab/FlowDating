// ===============================
// 📁 app/api/matches/route.ts - API Matches sans messages
// ===============================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth'; 
import { prisma } from '@/lib/db'; 
import { Match, MatchStats, MatchesResponse } from '@/types/matches';

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 [MATCHES] Début de la requête API (sans messages)');

    // 1. Vérifier l'authentification
    const session = await auth();
    
    if (!session?.user?.id) {
      console.log('❌ [MATCHES] Non authentifié');
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const currentUserId = session.user.id;
    console.log('👤 [MATCHES] User ID:', currentUserId);

    try {
      // 2. Récupérer les matches via likes bidirectionnels
      console.log('🔄 [MATCHES] Recherche des likes bidirectionnels...');
      
      const matchesData = await prisma.$queryRaw<Array<{
        senderId: string, 
        receiverId: string,
        matchedAt: Date
      }>>`
        SELECT DISTINCT 
          l1."senderId", 
          l1."receiverId",
          LEAST(l1."createdAt", l2."createdAt") as "matchedAt"
        FROM "likes" l1
        INNER JOIN "likes" l2 ON l1."senderId" = l2."receiverId" AND l1."receiverId" = l2."senderId"
        WHERE l1."receiverId" = ${currentUserId}
        ORDER BY "matchedAt" DESC
      `;

      console.log(`📋 [MATCHES] ${matchesData.length} matches trouvés`);

      if (matchesData.length === 0) {
        const stats: MatchStats = {
          totalMatches: 0,
          newMatches: 0,
          activeConversations: 0,
          dormantMatches: 0,
          averageResponseTime: '0h',
          thisWeekMatches: 0
        };

        return NextResponse.json({
          matches: [],
          stats
        } as MatchesResponse);
      }

      // 3. Récupérer les détails des utilisateurs matchés
      const matchedUserIds = matchesData.map(match => match.senderId);
      console.log('👥 [MATCHES] IDs des utilisateurs matchés:', matchedUserIds);
      
      const matchedUsers = await prisma.user.findMany({
        where: {
          id: { in: matchedUserIds }
        },
        select: {
          id: true,
          name: true,
          email: true,
          age: true,
          bio: true,
          location: true,
          department: true,
          region: true,
          profession: true,
          interests: true,
          isOnline: true,
          lastSeen: true,
          createdAt: true,
          photos: {
            where: { isPrimary: true },
            select: {
              id: true,
              url: true,
              isPrimary: true
            },
            take: 1
          }
        }
      });

      console.log(`👥 [MATCHES] ${matchedUsers.length} utilisateurs récupérés`);

      // 4. Calculer la compatibilité (exemple basique)
      const calculateCompatibility = (user: any): number => {
        if (!user.interests || user.interests.length === 0) return 75;
        
        // TODO: Implémenter un vrai calcul de compatibilité basé sur les intérêts de l'utilisateur actuel
        const baseCompatibility = 70;
        const interestBonus = Math.min(user.interests.length * 2, 20);
        const ageBonus = user.age && user.age >= 18 && user.age <= 35 ? 10 : 5;
        
        return Math.min(baseCompatibility + interestBonus + ageBonus, 99);
      };

      // 5. Formater les données pour le frontend
      const formattedMatches: Match[] = matchedUsers.map(user => {
        const matchData = matchesData.find(m => m.senderId === user.id);
        
        return {
          id: `match-${currentUserId}-${user.id}`,
          createdAt: matchData?.matchedAt.toISOString() || user.createdAt.toISOString(),
          user: {
            id: user.id,
            name: user.name || 'Utilisateur',
            age: user.age || 0,
            bio: user.bio || '',
            location: user.location || '',
            department: user.department || '',
            region: user.region || '',
            profession: user.profession || '',
            interests: Array.isArray(user.interests) ? user.interests : [],
            photo: user.photos[0] || null,
            isOnline: user.isOnline || false,
            lastSeen: user.lastSeen?.toISOString()
          },
          conversation: {
            hasStarted: false, // Par défaut, pas de conversation démarrée
            lastActivity: matchData?.matchedAt.toISOString()
          },
          compatibility: calculateCompatibility(user)
        };
      });

      // 6. Calculer les statistiques détaillées
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const stats: MatchStats = {
        totalMatches: formattedMatches.length,
        newMatches: formattedMatches.filter(match => 
          new Date(match.createdAt) > oneDayAgo
        ).length,
        activeConversations: formattedMatches.filter(match => 
          match.user.isOnline || 
          (match.user.lastSeen && new Date(match.user.lastSeen) > oneWeekAgo)
        ).length,
        dormantMatches: formattedMatches.filter(match => 
          !match.user.isOnline && 
          (!match.user.lastSeen || new Date(match.user.lastSeen) < oneWeekAgo)
        ).length,
        averageResponseTime: calculateAverageResponseTime(formattedMatches),
        thisWeekMatches: formattedMatches.filter(match => 
          new Date(match.createdAt) > oneWeekAgo
        ).length
      };

      // 7. Trier par date de match (plus récent en premier)
      formattedMatches.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      console.log('✅ [MATCHES] Données formatées:', {
        matches: formattedMatches.length,
        stats
      });

      return NextResponse.json({
        matches: formattedMatches,
        stats
      } as MatchesResponse);

    } catch (prismaError) {
      console.error('❌ [MATCHES] Erreur Prisma:', prismaError);
      
      return NextResponse.json({
        matches: [],
        stats: {
          totalMatches: 0,
          newMatches: 0,
          activeConversations: 0,
          dormantMatches: 0,
          averageResponseTime: '0h',
          thisWeekMatches: 0
        }
      } as MatchesResponse);
    }

  } catch (error) {
    console.error('❌ [MATCHES] Erreur générale:', error);
    
    return NextResponse.json(
      { 
        error: 'Erreur lors de la récupération des matches',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}

// Fonction utilitaire pour calculer le temps de réponse moyen (basé sur l'activité)
function calculateAverageResponseTime(matches: Match[]): string {
  const activeUsers = matches.filter(match => 
    match.user.isOnline || 
    (match.user.lastSeen && new Date(match.user.lastSeen).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000)
  );
  
  if (activeUsers.length === 0) return '0h';
  
  // Calcul approximatif basé sur l'activité récente
  const averageHours = activeUsers.reduce((acc, match) => {
    if (match.user.isOnline) return acc + 1; // En ligne = réponse rapide
    
    if (match.user.lastSeen) {
      const hoursSinceLastSeen = (Date.now() - new Date(match.user.lastSeen).getTime()) / (1000 * 60 * 60);
      return acc + Math.min(hoursSinceLastSeen, 24);
    }
    
    return acc + 24;
  }, 0) / activeUsers.length;
  
  if (averageHours < 1) return '< 1h';
  if (averageHours < 24) return `${Math.round(averageHours)}h`;
  return `${Math.round(averageHours / 24)}j`;
}

// POST - Créer un nouveau match
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const { targetUserId } = await request.json();

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'ID de l\'utilisateur cible requis' },
        { status: 400 }
      );
    }

    try {
      // Vérifier que l'utilisateur cible existe
      const targetUser = await prisma.user.findUnique({
        where: { id: targetUserId },
        select: {
          id: true,
          name: true,
          age: true,
          location: true,
          photos: {
            where: { isPrimary: true },
            select: { url: true },
            take: 1
          }
        }
      });

      if (!targetUser) {
        return NextResponse.json(
          { error: 'Utilisateur introuvable' },
          { status: 404 }
        );
      }

      // Vérifier qu'un like n'existe pas déjà
      const existingLike = await prisma.like.findFirst({
        where: {
          senderId: session.user.id,
          receiverId: targetUserId
        }
      });

      if (existingLike) {
        return NextResponse.json(
          { error: 'Like déjà donné' },
          { status: 409 }
        );
      }

      // Créer le like
      const newLike = await prisma.like.create({
        data: {
          senderId: session.user.id,
          receiverId: targetUserId
        }
      });

      // Vérifier si c'est un match (like bidirectionnel)
      const reverseLike = await prisma.like.findFirst({
        where: {
          senderId: targetUserId,
          receiverId: session.user.id
        }
      });

      const isMatch = !!reverseLike;

      console.log(`✅ [MATCHES] ${isMatch ? 'MATCH' : 'Like'} créé avec ${targetUser.name}`);

      return NextResponse.json({
        success: true,
        data: {
          likeId: newLike.id,
          isMatch,
          targetUser: {
            id: targetUser.id,
            name: targetUser.name,
            age: targetUser.age,
            location: targetUser.location,
            photo: targetUser.photos[0]?.url
          },
          channelId: isMatch ? [session.user.id, targetUser.id].sort().join('-') : null
        }
      });

    } catch (prismaError) {
      console.error('❌ [MATCHES] Erreur Prisma POST:', prismaError);
      return NextResponse.json(
        { error: 'Erreur lors de la création du like/match' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ [MATCHES] Erreur POST:', error);
    
    return NextResponse.json(
      { error: 'Erreur lors de la création du match' },
      { status: 500 }
    );
  }
}