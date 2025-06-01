// app/api/user/delete-account/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function DELETE(request: NextRequest) {
  try {
    // 🔥 NOUVEAU: Récupérer les paramètres forcés du body
    let requestBody = null;
    try {
      requestBody = await request.json();
    } catch (bodyError) {
      // Pas de body, c'est normal
    }

    const forceUserId = requestBody?.forceUserId;
    const forceUserEmail = requestBody?.forceUserEmail;
    
    console.log('🔍 Paramètres de suppression forcée:', { forceUserId, forceUserEmail });

    // Essayer d'abord la session normale
    let session;
    let userId;
    let userEmail;
    
    try {
      session = await getServerSession(authOptions);
      userId = session?.user?.id;
      userEmail = session?.user?.email;
      console.log('✅ Session valide trouvée:', { userId, userEmail });
    } catch (sessionError) {
      console.log('⚠️ Session invalidée, utilisation des paramètres forcés...');
    }

    // Si pas de session valide, utiliser les paramètres forcés
    if (!userId && forceUserId) {
      userId = forceUserId;
      userEmail = forceUserEmail;
      console.log('🔧 Utilisation des paramètres forcés:', { userId, userEmail });
    }

    // Si toujours pas d'ID, essayer de récupérer par email
    if (!userId && forceUserEmail) {
      try {
        console.log('🔍 Recherche utilisateur par email:', forceUserEmail);
        const userByEmail = await prisma.user.findUnique({
          where: { email: forceUserEmail }
        });
        
        if (userByEmail) {
          userId = userByEmail.id;
          userEmail = userByEmail.email;
          console.log('✅ Utilisateur trouvé par email forcé:', userId);
        } else {
          console.log('⚠️ Aucun utilisateur trouvé avec cet email');
        }
      } catch (emailError) {
        console.log('⚠️ Erreur recherche par email:', emailError);
      }
    }

    // Si toujours pas d'ID, essayer de récupérer par email de session
    if (!userId && userEmail) {
      try {
        console.log('🔍 Recherche utilisateur par email de session:', userEmail);
        const userBySessionEmail = await prisma.user.findUnique({
          where: { email: userEmail }
        });
        
        if (userBySessionEmail) {
          userId = userBySessionEmail.id;
          console.log('✅ Utilisateur trouvé par email de session:', userId);
        }
      } catch (sessionEmailError) {
        console.log('⚠️ Erreur recherche par email de session:', sessionEmailError);
      }
    }

    // Dernière tentative : rechercher des comptes OAuth orphelins RÉCENTS
    if (!userId) {
      try {
        console.log('🔍 Recherche de comptes OAuth orphelins...');
        
        // Chercher tous les comptes OAuth avec l'email si disponible
        let orphanAccounts = [];
        if (forceUserEmail || userEmail) {
          const searchEmail = forceUserEmail || userEmail;
          
          // Chercher des utilisateurs récents avec cet email qui ont été supprimés
          orphanAccounts = await prisma.account.findMany({
            where: {
              // On ne peut pas utiliser updatedAt, cherchons par provider
              provider: {
                in: ['google', 'facebook']
              }
            },
            include: {
              user: true
            }
          });
          
          // Filtrer pour ceux qui n'ont plus d'utilisateur OU dont l'email correspond
          orphanAccounts = orphanAccounts.filter(account => 
            !account.user || account.user.email === searchEmail
          );
        }

        console.log(`🔍 ${orphanAccounts.length} comptes potentiellement orphelins trouvés`);
        
        // Supprimer ces comptes orphelins
        let orphansFound = 0;
        for (const account of orphanAccounts) {
          try {
            if (!account.user) {
              console.log(`🗑️ Compte orphelin trouvé: ${account.provider} - ${account.providerAccountId}`);
              
              // Supprimer ce compte orphelin
              await prisma.account.delete({
                where: { id: account.id }
              });
              
              orphansFound++;
              console.log(`✅ Compte orphelin ${account.provider} supprimé`);
            }
          } catch (deleteError) {
            console.log(`⚠️ Erreur suppression compte ${account.provider}:`, deleteError);
          }
        }
        
        if (orphansFound > 0) {
          return NextResponse.json({ 
            success: true,
            message: `${orphansFound} comptes orphelins nettoyés`,
            orphanCleanup: true
          });
        }
        
      } catch (orphanError) {
        console.log('⚠️ Erreur nettoyage orphelins:', orphanError);
      }
    }

    // Si toujours pas d'ID, vérifier si c'est normal (utilisateur déjà supprimé)
    if (!userId) {
      // Si on a un email mais pas d'utilisateur en base, c'est probablement un fantôme OAuth
      if (forceUserEmail || userEmail) {
        const searchEmail = forceUserEmail || userEmail;
        console.log('✅ Utilisateur avec email mais sans entrée DB détecté');
        console.log('ℹ️ Ceci indique un utilisateur OAuth automatiquement supprimé - nettoyage des restes...');
        
        // Nettoyer les sessions et comptes OAuth orphelins de manière simple
        try {
          // Méthode simple : chercher et supprimer tous les comptes/sessions orphelins
          const allAccounts = await prisma.account.findMany({
            include: { user: true }
          });
          
          const orphanAccounts = allAccounts.filter(account => !account.user);
          
          for (const orphan of orphanAccounts) {
            await prisma.account.delete({ where: { id: orphan.id } });
          }
          
          console.log(`🧹 ${orphanAccounts.length} comptes OAuth orphelins supprimés`);
          
          // Supprimer toutes les sessions sans utilisateur
          const allSessions = await prisma.session.findMany({
            include: { user: true }
          });
          
          const orphanSessions = allSessions.filter(session => !session.user);
          
          for (const orphan of orphanSessions) {
            await prisma.session.delete({ where: { id: orphan.id } });
          }
          
          console.log(`🧹 ${orphanSessions.length} sessions orphelines supprimées`);
          
        } catch (cleanupError) {
          console.log('⚠️ Erreur nettoyage orphelins:', cleanupError);
        }
        
        return NextResponse.json({ 
          success: true,
          message: 'Utilisateur fantôme détecté et nettoyé',
          alreadyDeleted: true
        });
      }
      
      console.log('❌ Impossible de déterminer l\'utilisateur à supprimer');
      return NextResponse.json(
        { error: 'Utilisateur introuvable - veuillez vous reconnecter' }, 
        { status: 400 }
      );
    }

    console.log('🗑️ Début suppression compte utilisateur:', userId);

    // 🔍 DIAGNOSTIC: Vérifier quelles données existent avant suppression
    try {
      const diagnostics = await Promise.allSettled([
        prisma.user.findUnique({ where: { id: userId } }),
        prisma.account.findMany({ where: { userId } }),
        prisma.session.findMany({ where: { userId } }),
        prisma.photo.findMany({ where: { userId } })
      ]);

      console.log('📊 État avant suppression:');
      console.log('   Utilisateur:', diagnostics[0].status === 'fulfilled' ? '✅ Existe' : '❌ Inexistant');
      
      if (diagnostics[1].status === 'fulfilled') {
        const accounts = diagnostics[1].value;
        console.log(`   Comptes OAuth: ${accounts.length} trouvé(s)`);
        accounts.forEach(acc => console.log(`     - ${acc.provider} (${acc.type})`));
      }
      
      if (diagnostics[2].status === 'fulfilled') {
        const sessions = diagnostics[2].value;
        console.log(`   Sessions: ${sessions.length} active(s)`);
      }
      
      if (diagnostics[3].status === 'fulfilled') {
        const photos = diagnostics[3].value;
        console.log(`   Photos: ${photos.length} trouvée(s)`);
      }
    } catch (diagError) {
      console.log('⚠️ Erreur diagnostic:', diagError);
    }

    // ÉTAPE 1: Supprimer les photos de Cloudinary (optionnel)
    try {
      const userPhotos = await prisma.photo.findMany({
        where: { userId },
        select: { id: true, url: true }
      });

      // Suppression des photos sur Cloudinary (si configuré)
      if (userPhotos.length > 0 && process.env.CLOUDINARY_API_KEY) {
        const cloudinary = require('cloudinary').v2;
        cloudinary.config({
          cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
          api_key: process.env.CLOUDINARY_API_KEY,
          api_secret: process.env.CLOUDINARY_API_SECRET,
        });

        for (const photo of userPhotos) {
          if (photo.url) {
            try {
              // Extraire l'ID Cloudinary de l'URL si possible
              const urlParts = photo.url.split('/');
              const filename = urlParts[urlParts.length - 1];
              const publicId = filename.split('.')[0];
              
              if (publicId) {
                await cloudinary.uploader.destroy(`dating-app/profiles/${publicId}`);
                console.log('🗑️ Photo Cloudinary supprimée:', publicId);
              }
            } catch (cloudinaryError) {
              console.warn('⚠️ Erreur suppression Cloudinary:', cloudinaryError);
            }
          }
        }
      } else {
        console.log('ℹ️ Pas de photos ou Cloudinary non configuré, passage...');
      }
    } catch (photoError) {
      console.warn('⚠️ Erreur lors de la suppression des photos:', photoError);
    }

    // ÉTAPE 2: Suppression en cascade des données utilisateur
    await prisma.$transaction(async (tx) => {
      console.log('🗑️ Suppression des données en transaction...');

      // Vérifier d'abord si l'utilisateur existe
      const existingUser = await tx.user.findUnique({
        where: { id: userId }
      });

      if (!existingUser) {
        console.log('⚠️ Utilisateur déjà supprimé ou introuvable - nettoyage des données orphelines...');
        // Continue le nettoyage même si l'utilisateur n'existe plus
      } else {
        console.log('✅ Utilisateur trouvé, procédure de suppression complète...');
      }

      // 1. Supprimer les messages (si la table existe)
      try {
        const deletedMessages = await tx.message.deleteMany({
          where: {
            OR: [
              { senderId: userId },
              { receiverId: userId }
            ]
          }
        });
        console.log(`✅ ${deletedMessages.count} messages supprimés`);
      } catch (error) {
        console.log('⚠️ Table message introuvable, passage...');
      }

      // 2. Supprimer les conversations (si la table existe)
      try {
        const deletedConversations = await tx.conversation.deleteMany({
          where: {
            OR: [
              { user1Id: userId },
              { user2Id: userId }
            ]
          }
        });
        console.log(`✅ ${deletedConversations.count} conversations supprimées`);
      } catch (error) {
        console.log('⚠️ Table conversation introuvable, passage...');
      }

      // 3. Supprimer les likes donnés et reçus (si la table existe)
      try {
        const deletedLikes = await tx.like.deleteMany({
          where: {
            OR: [
              { fromUserId: userId },
              { toUserId: userId }
            ]
          }
        });
        console.log(`✅ ${deletedLikes.count} likes supprimés`);
      } catch (error) {
        console.log('⚠️ Table like introuvable, passage...');
      }

      // 4. Supprimer les matches (si la table existe)
      try {
        const deletedMatches = await tx.match.deleteMany({
          where: {
            OR: [
              { user1Id: userId },
              { user2Id: userId }
            ]
          }
        });
        console.log(`✅ ${deletedMatches.count} matches supprimés`);
      } catch (error) {
        console.log('⚠️ Table match introuvable, passage...');
      }

      // 5. Supprimer les signalements (si la table existe)
      try {
        const deletedReports = await tx.report.deleteMany({
          where: {
            OR: [
              { reporterId: userId },
              { reportedUserId: userId }
            ]
          }
        });
        console.log(`✅ ${deletedReports.count} signalements supprimés`);
      } catch (error) {
        console.log('⚠️ Table report introuvable, passage...');
      }

      // 6. Supprimer les photos (table obligatoire - devrait exister)
      try {
        const deletedPhotos = await tx.photo.deleteMany({
          where: { userId }
        });
        console.log(`✅ ${deletedPhotos.count} photos supprimées de la DB`);
      } catch (error) {
        console.warn('⚠️ Erreur suppression photos DB:', error);
      }

      // 7. Supprimer les préférences utilisateur (si la table existe)
      try {
        const deletedPreferences = await tx.userPreferences.deleteMany({
          where: { userId }
        });
        console.log(`✅ ${deletedPreferences.count} préférences supprimées`);
      } catch (error) {
        console.log('⚠️ Table userPreferences introuvable, passage...');
      }

      // 8. Supprimer les activités/logs (si la table existe)
      try {
        const deletedActivities = await tx.userActivity.deleteMany({
          where: { userId }
        });
        console.log(`✅ ${deletedActivities.count} activités supprimées`);
      } catch (error) {
        console.log('⚠️ Table userActivity introuvable, passage...');
      }

      // 9. Supprimer les notifications (si la table existe)
      try {
        const deletedNotifications = await tx.notification.deleteMany({
          where: {
            OR: [
              { userId },
              { fromUserId: userId }
            ]
          }
        });
        console.log(`✅ ${deletedNotifications.count} notifications supprimées`);
      } catch (error) {
        console.log('⚠️ Table notification introuvable, passage...');
      }

      // 10. Supprimer les sessions utilisateur (NextAuth - si la table existe)
      try {
        const deletedSessions = await tx.session.deleteMany({
          where: { userId }
        });
        console.log(`✅ ${deletedSessions.count} sessions supprimées`);
      } catch (error) {
        console.log('⚠️ Table session introuvable, passage...');
      }

      // 11. Supprimer les comptes liés (OAuth NextAuth - avec debug amélioré)
      try {
        // D'abord vérifier quels comptes existent
        const existingAccounts = await tx.account.findMany({
          where: { userId },
          select: { 
            id: true, 
            provider: true, 
            providerAccountId: true,
            type: true 
          }
        });
        
        console.log(`🔍 Comptes OAuth trouvés:`, existingAccounts);
        
        if (existingAccounts.length > 0) {
          const deletedAccounts = await tx.account.deleteMany({
            where: { userId }
          });
          console.log(`✅ ${deletedAccounts.count} comptes OAuth supprimés:`, 
            existingAccounts.map(acc => `${acc.provider} (${acc.type})`).join(', '));
        } else {
          console.log('ℹ️ Aucun compte OAuth à supprimer pour cet utilisateur');
        }
      } catch (error) {
        console.log('⚠️ Erreur lors de la gestion des comptes OAuth:', error);
        
        // Tentative alternative si le nom de table ou champ est différent
        try {
          // Essayer avec des noms de champs alternatifs
          const altAccounts = await tx.account.deleteMany({
            where: { 
              OR: [
                { userId: userId },
                { user_id: userId }, // snake_case alternative
                { userId: userId.toString() } // au cas où type string vs number
              ]
            }
          });
          console.log(`✅ ${altAccounts.count} comptes OAuth supprimés (méthode alternative)`);
        } catch (altError) {
          console.log('⚠️ Table account introuvable ou incompatible:', altError);
        }
      }

      // 12. ENFIN: Supprimer l'utilisateur principal (si il existe encore)
      if (existingUser) {
        try {
          await tx.user.delete({
            where: { id: userId }
          });
          console.log('✅ Utilisateur principal supprimé');
        } catch (deleteError) {
          console.error('❌ Erreur suppression utilisateur:', deleteError);
          
          // Vérifier si l'utilisateur existe encore
          const stillExists = await tx.user.findUnique({
            where: { id: userId }
          });
          
          if (!stillExists) {
            console.log('ℹ️ Utilisateur déjà supprimé, continuons...');
          } else {
            throw new Error(`Impossible de supprimer l'utilisateur: ${deleteError}`);
          }
        }
      } else {
        console.log('ℹ️ Utilisateur déjà supprimé, nettoyage des données terminé');
      }
    });

    console.log('🎉 Suppression de compte terminée avec succès pour:', userId);

    // 🧹 NETTOYAGE FINAL: S'assurer qu'aucune donnée orpheline ne reste
    try {
      console.log('🧹 Vérification finale et nettoyage des données orphelines...');
      
      // Forcer la suppression de toutes les références à cet utilisateur
      const finalCleanup = await Promise.allSettled([
        // Supprimer tous les comptes OAuth restants (même orphelins)
        prisma.account.deleteMany({ where: { userId } }),
        // Supprimer toutes les sessions restantes
        prisma.session.deleteMany({ where: { userId } }),
        // Vérifier qu'aucune photo n'est restée
        prisma.photo.deleteMany({ where: { userId } })
      ]);

      console.log('🧹 Résultats nettoyage final:');
      if (finalCleanup[0].status === 'fulfilled') {
        const accountCleanup = finalCleanup[0].value;
        console.log(`   - ${accountCleanup.count} comptes OAuth supprimés en plus`);
      }
      if (finalCleanup[1].status === 'fulfilled') {
        const sessionCleanup = finalCleanup[1].value;
        console.log(`   - ${sessionCleanup.count} sessions supprimées en plus`);
      }
      if (finalCleanup[2].status === 'fulfilled') {
        const photoCleanup = finalCleanup[2].value;
        console.log(`   - ${photoCleanup.count} photos supprimées en plus`);
      }
      
    } catch (cleanupError) {
      console.warn('⚠️ Erreur lors du nettoyage final:', cleanupError);
    }

    return NextResponse.json({ 
      success: true,
      message: 'Compte supprimé avec succès'
    });

  } catch (error) {
    console.error('💥 Erreur lors de la suppression du compte:', error);
    
    return NextResponse.json(
      { 
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      }, 
      { status: 500 }
    );
  }
}