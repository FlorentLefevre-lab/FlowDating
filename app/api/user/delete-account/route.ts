// app/api/user/delete-account/route.ts
// SECURED: Users can ONLY delete their own account via authenticated session

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function DELETE(request: NextRequest) {
  try {
    // SECURITY: Only use authenticated session - NO forceUserId or forceUserEmail
    const session = await auth();

    if (!session?.user?.id) {
      console.warn('[SECURITY] Unauthorized delete-account attempt - no session');
      return NextResponse.json(
        { error: 'Non authentifie - veuillez vous reconnecter' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const userEmail = session.user.email;

    console.log('[DELETE-ACCOUNT] Starting account deletion for authenticated user:', userId);

    // Verify user exists in database
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, accountStatus: true }
    });

    if (!existingUser) {
      console.warn('[DELETE-ACCOUNT] User not found in database:', userId);
      return NextResponse.json(
        { error: 'Compte deja supprime ou introuvable' },
        { status: 404 }
      );
    }

    // Prevent deletion of already deleted accounts
    if (existingUser.accountStatus === 'DELETED') {
      return NextResponse.json(
        { error: 'Ce compte a deja ete supprime' },
        { status: 400 }
      );
    }

    console.log('[DELETE-ACCOUNT] User verified, proceeding with deletion:', existingUser.email);

    // Delete photos from Cloudinary if configured
    try {
      const userPhotos = await prisma.photo.findMany({
        where: { userId },
        select: { id: true, url: true }
      });

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
              const urlParts = photo.url.split('/');
              const filename = urlParts[urlParts.length - 1];
              const publicId = filename.split('.')[0];

              if (publicId) {
                await cloudinary.uploader.destroy(`dating-app/profiles/${publicId}`);
                console.log('[DELETE-ACCOUNT] Cloudinary photo deleted:', publicId);
              }
            } catch (cloudinaryError) {
              console.warn('[DELETE-ACCOUNT] Cloudinary deletion error:', cloudinaryError);
            }
          }
        }
      }
    } catch (photoError) {
      console.warn('[DELETE-ACCOUNT] Photo deletion error:', photoError);
    }

    // Delete user data in transaction
    await prisma.$transaction(async (tx) => {
      console.log('[DELETE-ACCOUNT] Starting transaction...');

      // Delete likes (given and received)
      try {
        await tx.like.deleteMany({
          where: {
            OR: [
              { senderId: userId },
              { receiverId: userId }
            ]
          }
        });
      } catch (e) {
        console.log('[DELETE-ACCOUNT] Likes deletion skipped');
      }

      // Delete dislikes
      try {
        await tx.dislike.deleteMany({
          where: {
            OR: [
              { senderId: userId },
              { receiverId: userId }
            ]
          }
        });
      } catch (e) {
        console.log('[DELETE-ACCOUNT] Dislikes deletion skipped');
      }

      // Delete blocks
      try {
        await tx.block.deleteMany({
          where: {
            OR: [
              { blockerId: userId },
              { blockedId: userId }
            ]
          }
        });
      } catch (e) {
        console.log('[DELETE-ACCOUNT] Blocks deletion skipped');
      }

      // Delete profile views
      try {
        await tx.profileView.deleteMany({
          where: {
            OR: [
              { viewerId: userId },
              { viewedId: userId }
            ]
          }
        });
      } catch (e) {
        console.log('[DELETE-ACCOUNT] Profile views deletion skipped');
      }

      // Delete photos
      try {
        await tx.photo.deleteMany({
          where: { userId }
        });
      } catch (e) {
        console.log('[DELETE-ACCOUNT] Photos deletion skipped');
      }

      // Delete user preferences
      try {
        await tx.userPreferences.deleteMany({
          where: { userId }
        });
      } catch (e) {
        console.log('[DELETE-ACCOUNT] Preferences deletion skipped');
      }

      // Delete notification settings
      try {
        await tx.notificationSettings.deleteMany({
          where: { userId }
        });
      } catch (e) {
        console.log('[DELETE-ACCOUNT] Notification settings deletion skipped');
      }

      // Delete sessions
      try {
        await tx.session.deleteMany({
          where: { userId }
        });
      } catch (e) {
        console.log('[DELETE-ACCOUNT] Sessions deletion skipped');
      }

      // Delete OAuth accounts
      try {
        await tx.account.deleteMany({
          where: { userId }
        });
      } catch (e) {
        console.log('[DELETE-ACCOUNT] Accounts deletion skipped');
      }

      // Finally delete the user
      await tx.user.delete({
        where: { id: userId }
      });

      console.log('[DELETE-ACCOUNT] User deleted successfully');
    });

    console.log('[DELETE-ACCOUNT] Account deletion completed for:', userEmail);

    return NextResponse.json({
      success: true,
      message: 'Compte supprime avec succes'
    });

  } catch (error) {
    console.error('[DELETE-ACCOUNT] Error:', error);

    return NextResponse.json(
      {
        error: 'Erreur lors de la suppression du compte',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}
