import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendPasswordResetEmail } from '@/lib/email'
import crypto from 'crypto'
import { z } from 'zod'
import { withRateLimit } from '@/lib/middleware/rateLimit'

const forgotPasswordSchema = z.object({
  email: z.string().email("Email invalide"),
})

// Rate limited: 5 requests per minute per IP
async function handleForgotPassword(request: NextRequest) {
  console.log('🔥 API forgot-password appelée')
  
  try {
    const body = await request.json()
    console.log('📨 Body reçu:', body)
    
    const { email } = forgotPasswordSchema.parse(body)
    console.log('✅ Email validé:', email)

    // Vérifier si l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { email }
    })
    console.log('👤 Utilisateur trouvé:', !!user)

    // Pour la sécurité, on répond toujours "email envoyé" même si l'user n'existe pas
    if (!user) {
      console.log('❌ Utilisateur non trouvé')
      return NextResponse.json({
        message: "Si un compte existe avec cet email, vous recevrez un lien de réinitialisation."
      })
    }

    // Vérifier que l'utilisateur s'est inscrit avec email/password
    if (!user.hashedPassword) {
      console.log('⚠️ Utilisateur OAuth, pas de mot de passe')
      return NextResponse.json({
        message: "Ce compte utilise une connexion sociale (Google/Facebook). Connectez-vous directement via ce service."
      })
    }

    // Supprimer les anciens tokens de cet email
    await prisma.passwordResetToken.deleteMany({
      where: { email }
    })
    console.log('🗑️ Anciens tokens supprimés')

    // Générer un nouveau token
    const token = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 3600000) // 1 heure
    console.log('🔑 Token généré:', token.substring(0, 8) + '...')

    // Enregistrer le token
    await prisma.passwordResetToken.create({
      data: {
        email,
        token,
        expires,
      }
    })
    console.log('💾 Token enregistré en base')

    // Envoyer l'email
    console.log('📧 Envoi de l\'email...')
    const emailSent = await sendPasswordResetEmail(email, token)
    console.log('📬 Email envoyé:', emailSent)

    if (!emailSent) {
      return NextResponse.json(
        { error: "Erreur lors de l'envoi de l'email" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: "Si un compte existe avec cet email, vous recevrez un lien de réinitialisation."
    })

  } catch (error) {
    console.error('💥 ERREUR dans forgot-password:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

// Export with rate limiting (auth type: 5 requests/minute)
export const POST = withRateLimit('auth')(handleForgotPassword)