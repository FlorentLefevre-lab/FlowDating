// src/app/api/user/suspend-account/route.ts - Version améliorée
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 API suspend-account - Début traitement');
    
    // Vérifier l'authentification
    const session = await auth();
    
    if (!session?.user?.id) {
      console.log('❌ Pas de session utilisateur');
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    console.log('✅ Session trouvée:', session.user.id);

    // Récupérer les données de la requête
    const body = await request.json();
    const { reason } = body;

    console.log('📝 Données reçues:', { reason });

    const finalUserId = session.user.id;

    // Vérifier que l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { id: finalUserId },
      select: { 
        id: true, 
        accountStatus: true,
        email: true,
        name: true 
      }
    });

    if (!user) {
      console.log('❌ Utilisateur introuvable:', finalUserId);
      return NextResponse.json(
        { error: 'Utilisateur introuvable' },
        { status: 404 }
      );
    }

    console.log('👤 Utilisateur trouvé:', user.email, 'Statut actuel:', user.accountStatus);

    // 🔧 AMÉLIORATION: Gestion du cas "déjà suspendu"
    if (user.accountStatus === 'SUSPENDED') {
      console.log('⚠️ Compte déjà suspendu - Suggestion de réactivation');
      return NextResponse.json({
        error: 'Le compte est déjà suspendu',
        message: 'Votre compte est déjà suspendu. Vous pouvez le réactiver en utilisant l\'option de réactivation.',
        accountStatus: user.accountStatus,
        suggestion: 'reactivate',
        currentUser: {
          email: user.email,
          name: user.name,
          accountStatus: user.accountStatus
        }
      }, { status: 400 });
    }

    // Mettre à jour le statut du compte
    console.log('🔄 Mise à jour du statut vers SUSPENDED...');
    const updatedUser = await prisma.user.update({
      where: { id: finalUserId },
      data: {
        accountStatus: 'SUSPENDED',
        suspensionReason: reason || null,
        suspendedAt: new Date(),
        suspendedUntil: null, // Suspension indéfinie par défaut
        isOnline: false, // Marquer comme hors ligne
        updatedAt: new Date()
      },
      select: {
        id: true,
        accountStatus: true,
        suspendedAt: true,
        suspensionReason: true,
        email: true
      }
    });

    console.log('✅ Statut mis à jour:', updatedUser);

    // Invalider toutes les sessions actives (optionnel)
    try {
      await prisma.session.deleteMany({
        where: { userId: finalUserId }
      });
      console.log('✅ Sessions supprimées');
    } catch (sessionError) {
      console.log('⚠️ Erreur suppression sessions:', sessionError);
    }

    // Log de l'action pour audit
    console.log(`✅ Compte suspendu - User: ${user.email} (${user.id}) - Raison: ${reason}`);

    return NextResponse.json({
      success: true,
      message: 'Compte suspendu avec succès',
      data: {
        accountStatus: updatedUser.accountStatus,
        suspendedAt: updatedUser.suspendedAt,
        suspensionReason: updatedUser.suspensionReason
      }
    });

  } catch (error) {
    console.error('❌ Erreur suspension compte:', error);
    
    return NextResponse.json(
      { 
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}

// 🔧 AMÉLIORATION: Réactivation de compte suspendu
export async function PUT(request: NextRequest) {
  try {
    console.log('🔄 API suspend-account PUT - Réactivation');
    
    const session = await auth();
    
    if (!session?.user?.id) {
      console.log('❌ Pas de session utilisateur pour réactivation');
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    console.log('✅ Session trouvée pour réactivation:', session.user.id);

    // Vérifier que l'utilisateur existe et est suspendu
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { 
        id: true, 
        accountStatus: true,
        email: true,
        suspendedUntil: true,
        suspensionReason: true
      }
    });

    if (!user) {
      console.log('❌ Utilisateur introuvable pour réactivation:', session.user.id);
      return NextResponse.json(
        { error: 'Utilisateur introuvable' },
        { status: 404 }
      );
    }

    console.log('👤 Utilisateur trouvé pour réactivation:', user.email, 'Statut:', user.accountStatus);

    if (user.accountStatus !== 'SUSPENDED') {
      console.log('⚠️ Le compte n\'est pas suspendu, statut actuel:', user.accountStatus);
      return NextResponse.json({
        error: 'Le compte n\'est pas suspendu',
        message: 'Votre compte est déjà actif.',
        currentStatus: user.accountStatus
      }, { status: 400 });
    }

    // 🔧 AMÉLIORATION: Vérifier si la suspension a une date de fin
    if (user.suspendedUntil && new Date() < new Date(user.suspendedUntil)) {
      console.log('⚠️ Suspension temporaire pas encore expirée');
      return NextResponse.json({
        error: 'Suspension temporaire en cours',
        message: `Votre compte sera automatiquement réactivé le ${new Date(user.suspendedUntil).toLocaleString('fr-FR')}`,
        suspendedUntil: user.suspendedUntil
      }, { status: 400 });
    }

    // Réactiver le compte
    console.log('🔄 Réactivation du compte...');
    const reactivatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        accountStatus: 'ACTIVE',
        suspensionReason: null,
        suspendedAt: null,
        suspendedUntil: null,
        isOnline: true, // Marquer comme en ligne
        updatedAt: new Date()
      },
      select: {
        id: true,
        accountStatus: true,
        updatedAt: true,
        email: true
      }
    });

    // Log de l'action
    console.log(`✅ Compte réactivé - User: ${user.email} (${user.id})`);

    return NextResponse.json({
      success: true,
      message: 'Compte réactivé avec succès',
      data: {
        accountStatus: reactivatedUser.accountStatus,
        reactivatedAt: reactivatedUser.updatedAt
      }
    });

  } catch (error) {
    console.error('❌ Erreur réactivation compte:', error);
    
    return NextResponse.json(
      { 
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}

// 🔧 NOUVEAU: API pour vérifier le statut du compte
export async function GET(request: NextRequest) {
  try {
    console.log('🔄 API suspend-account GET - Vérification statut');
    
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { 
        id: true, 
        accountStatus: true,
        email: true,
        suspendedAt: true,
        suspendedUntil: true,
        suspensionReason: true,
        isOnline: true,
        lastSeen: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur introuvable' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        accountStatus: user.accountStatus,
        suspendedAt: user.suspendedAt,
        suspendedUntil: user.suspendedUntil,
        suspensionReason: user.suspensionReason,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
        canReactivate: user.accountStatus === 'SUSPENDED' && (
          !user.suspendedUntil || new Date() >= new Date(user.suspendedUntil)
        )
      }
    });

  } catch (error) {
    console.error('❌ Erreur vérification statut:', error);
    
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}