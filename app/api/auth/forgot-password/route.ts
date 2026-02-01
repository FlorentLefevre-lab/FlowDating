import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendPasswordResetEmail } from '@/lib/email'
import { z, ZodError } from 'zod'
import { withRateLimit } from '@/lib/middleware/rateLimit'

const forgotPasswordSchema = z.object({
  email: z.string().email("Email invalide"),
})

// Rate limited: 5 requests per minute per IP
async function handleForgotPassword(request: NextRequest) {
  console.log('[ForgotPassword] API appelée')

  try {
    const body = await request.json()

    const { email } = forgotPasswordSchema.parse(body)
    console.log('[ForgotPassword] Demande pour:', email)

    // Vérifier si l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    })

    // Pour la sécurité, on répond toujours pareil même si l'user n'existe pas
    if (!user) {
      console.log('[ForgotPassword] Utilisateur non trouvé')
      return NextResponse.json({
        message: "Si un compte existe avec cet email, vous recevrez un lien de réinitialisation."
      })
    }

    // Vérifier que l'utilisateur s'est inscrit avec email/password
    if (!user.hashedPassword) {
      console.log('[ForgotPassword] Utilisateur OAuth, pas de mot de passe')
      return NextResponse.json({
        message: "Ce compte utilise une connexion sociale (Google/Facebook). Connectez-vous directement via ce service."
      })
    }

    // Envoyer l'email via Redis (token généré et stocké automatiquement, anciens tokens expirés par TTL)
    console.log('[ForgotPassword] Envoi email...')
    const emailResult = await sendPasswordResetEmail(email)

    if (!emailResult.success) {
      console.error('[ForgotPassword] Erreur:', emailResult.error)
      // On ne révèle pas l'erreur exacte pour la sécurité
      return NextResponse.json({
        message: "Si un compte existe avec cet email, vous recevrez un lien de réinitialisation."
      })
    }

    console.log('[ForgotPassword] Email envoyé avec succès')
    return NextResponse.json({
      message: "Si un compte existe avec cet email, vous recevrez un lien de réinitialisation."
    })

  } catch (error) {
    console.error('[ForgotPassword] Erreur:', error)

    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
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