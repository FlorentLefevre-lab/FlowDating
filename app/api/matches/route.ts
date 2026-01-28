// ===============================
// 📁 app/api/matches/route.ts - API Matches avec filtrage par préférences
// ===============================

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Match, MatchStats, MatchesResponse } from '@/types/matches';

// Mapping français -> enum pour comparaison
const genderToEnum: Record<string, string> = {
  'homme': 'MALE',
  'femme': 'FEMALE',
  'autre': 'OTHER',
  'non-binaire': 'NON_BINARY',
  'tous': 'ALL'
};

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 [MATCHES] Début de la requête API (avec filtrage préférences)');

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
      // 1.5 Récupérer les préférences ET le genre de l'utilisateur pour le filtrage mutuel
      const userWithPreferences = await prisma.user.findUnique({
        where: { id: currentUserId },
        select: {
          gender: true,
          preferences: {
            select: { gender: true }
          }
        }
      });

      const myGender = userWithPreferences?.gender;
      const genderPreference = userWithPreferences?.preferences?.gender;
      console.log('⚙️ [MATCHES] Mon genre:', myGender, '| Ma préférence:', genderPreference);

      // 2. Récupérer les matches depuis la table Match
      console.log('🔄 [MATCHES] Recherche des matches...');

      const matchesFromDb = await prisma.match.findMany({
        where: {
          status: 'ACTIVE',
          OR: [
            { user1Id: currentUserId },
            { user2Id: currentUserId }
          ]
        },
        include: {
          user1: {
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
              gender: true,
              interests: true,
              isOnline: true,
              lastSeen: true,
              createdAt: true,
              preferences: { select: { gender: true } },
              photos: {
                where: { isPrimary: true },
                select: { id: true, url: true, isPrimary: true },
                take: 1
              }
            }
          },
          user2: {
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
              gender: true,
              interests: true,
              isOnline: true,
              lastSeen: true,
              createdAt: true,
              preferences: { select: { gender: true } },
              photos: {
                where: { isPrimary: true },
                select: { id: true, url: true, isPrimary: true },
                take: 1
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      console.log(`📋 [MATCHES] ${matchesFromDb.length} matches trouvés`);

      if (matchesFromDb.length === 0) {
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

      // 3. Extraire les utilisateurs matchés (l'autre utilisateur du match)
      const matchedUsers = matchesFromDb.map(match => {
        const otherUser = match.user1Id === currentUserId ? match.user2 : match.user1;
        return {
          ...otherUser,
          matchId: match.id,
          matchedAt: match.createdAt
        };
      });

      // Filtrer par préférences
      const filteredUsers = matchedUsers.filter(user => {
        // Filtre par ma préférence de genre
        if (genderPreference && genderPreference !== 'ALL' && user.gender !== genderPreference) {
          return false;
        }
        // Filtre de compatibilité mutuelle
        if (myGender) {
          const theirPref = user.preferences?.gender;
          if (theirPref && theirPref !== 'ALL' && theirPref !== myGender) {
            return false;
          }
        }
        return true;
      });

      console.log('👥 [MATCHES] Utilisateurs matchés après filtrage:', filteredUsers.length);

      const matchedUserIds = filteredUsers.map(u => u.id);

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
      const formattedMatches: Match[] = filteredUsers.map(user => {
        return {
          id: user.matchId,
          createdAt: user.matchedAt.toISOString(),
          user: {
            id: user.id,
            name: user.name || 'Utilisateur',
            age: user.age || 0,
            bio: user.bio || '',
            location: user.location || '',
            department: user.department || '',
            region: user.region || '',
            profession: user.profession || '',
            gender: user.gender || null,
            interests: Array.isArray(user.interests) ? user.interests : [],
            photo: user.photos[0] || null,
            isOnline: user.isOnline || false,
            lastSeen: user.lastSeen?.toISOString()
          },
          conversation: {
            hasStarted: false, // Par défaut, pas de conversation démarrée
            lastActivity: user.matchedAt.toISOString()
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
      let matchId = null;

      // Si c'est un match, créer l'entrée dans la table Match
      if (isMatch) {
        const [user1Id, user2Id] = [session.user.id, targetUserId].sort();
        const match = await prisma.match.create({
          data: {
            user1Id,
            user2Id,
            status: 'ACTIVE'
          }
        });
        matchId = match.id;
      }

      console.log(`✅ [MATCHES] ${isMatch ? 'MATCH' : 'Like'} créé avec ${targetUser.name}`);

      return NextResponse.json({
        success: true,
        data: {
          likeId: newLike.id,
          isMatch,
          matchId,
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

// DELETE - Supprimer un match (unmatch)
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const { matchId, targetUserId } = await request.json();

    if (!matchId && !targetUserId) {
      return NextResponse.json(
        { error: 'matchId ou targetUserId requis' },
        { status: 400 }
      );
    }

    const currentUserId = session.user.id;

    try {
      // Trouver le match
      let match;
      if (matchId) {
        match = await prisma.match.findUnique({
          where: { id: matchId }
        });
      } else {
        // Trouver par les deux utilisateurs
        const [user1Id, user2Id] = [currentUserId, targetUserId].sort();
        match = await prisma.match.findUnique({
          where: {
            user1Id_user2Id: { user1Id, user2Id }
          }
        });
      }

      if (!match) {
        return NextResponse.json(
          { error: 'Match non trouvé' },
          { status: 404 }
        );
      }

      // Vérifier que l'utilisateur fait partie du match
      if (match.user1Id !== currentUserId && match.user2Id !== currentUserId) {
        return NextResponse.json(
          { error: 'Non autorisé à supprimer ce match' },
          { status: 403 }
        );
      }

      const otherUserId = match.user1Id === currentUserId ? match.user2Id : match.user1Id;

      // Supprimer le match (ou le marquer comme UNMATCHED)
      await prisma.match.update({
        where: { id: match.id },
        data: { status: 'UNMATCHED' }
      });

      // Supprimer les likes bidirectionnels
      await prisma.like.deleteMany({
        where: {
          OR: [
            { senderId: currentUserId, receiverId: otherUserId },
            { senderId: otherUserId, receiverId: currentUserId }
          ]
        }
      });

      console.log(`✅ [MATCHES] Match supprimé entre ${currentUserId} et ${otherUserId}`);

      return NextResponse.json({
        success: true,
        message: 'Match supprimé avec succès'
      });

    } catch (prismaError) {
      console.error('❌ [MATCHES] Erreur Prisma DELETE:', prismaError);
      return NextResponse.json(
        { error: 'Erreur lors de la suppression du match' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ [MATCHES] Erreur DELETE:', error);

    return NextResponse.json(
      { error: 'Erreur lors de la suppression du match' },
      { status: 500 }
    );
  }
}