import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendEmailVerification } from '@/lib/email'
import { z, ZodError } from 'zod'
import { withRateLimit } from '@/lib/middleware/rateLimit'

const resendSchema = z.object({
  email: z.string().email("Email invalide"),
})

async function handleResendVerification(request: NextRequest) {
  console.log('[ResendVerification] API appelée')

  try {
    const body = await request.json()
    const { email } = resendSchema.parse(body)
    console.log('[ResendVerification] Renvoi pour:', email)

    // Chercher l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    })

    if (!user) {
      // Pour la sécurité, on ne dit pas si l'utilisateur existe ou non
      return NextResponse.json({
        message: "Si un compte existe avec cet email, vous recevrez un nouveau lien de vérification."
      })
    }

    // Vérifier si l'email n'est pas déjà vérifié
    if (user.emailVerified) {
      return NextResponse.json({
        message: "Cet email est déjà vérifié. Vous pouvez vous connecter."
      })
    }

    // Envoyer l'email via Redis (token généré et stocké automatiquement, anciens tokens expirés par TTL)
    const emailResult = await sendEmailVerification(email)

    if (!emailResult.success) {
      console.error('[ResendVerification] Erreur:', emailResult.error)
      return NextResponse.json(
        { error: emailResult.error || "Erreur lors de l'envoi de l'email" },
        { status: 500 }
      )
    }

    console.log('[ResendVerification] Email envoyé avec succès')
    return NextResponse.json({
      message: "Un nouveau lien de vérification a été envoyé à votre adresse email."
    })

  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error('[ResendVerification] Erreur:', error)
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

// Export with rate limiting (auth type: 5 requests/minute)
export const POST = withRateLimit('auth')(handleResendVerification)