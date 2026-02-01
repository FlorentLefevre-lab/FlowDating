import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { validateEmailVerificationToken } from '@/lib/email'
import { z, ZodError } from 'zod'
import { withRateLimit } from '@/lib/middleware/rateLimit'

const verifyEmailSchema = z.object({
  token: z.string().min(1, "Token requis"),
  email: z.string().email("Email requis"),
})

// Rate limited: 5 requests per minute per IP
async function handleVerifyEmail(request: NextRequest) {
  console.log('[VerifyEmail] API appelée')

  try {
    const body = await request.json()

    const { token, email } = verifyEmailSchema.parse(body)
    const normalizedEmail = email.toLowerCase().trim()
    console.log('[VerifyEmail] Vérification pour:', normalizedEmail)

    // 1. D'abord vérifier que l'utilisateur existe
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    })

    if (!user) {
      console.log('[VerifyEmail] Utilisateur non trouvé:', normalizedEmail)
      return NextResponse.json(
        { error: "Aucun compte associé à cet email. Veuillez vous inscrire." },
        { status: 400 }
      )
    }

    // 2. Vérifier si déjà vérifié (avant de consommer le token)
    if (user.emailVerified) {
      console.log('[VerifyEmail] Email déjà vérifié pour:', normalizedEmail)
      // Retourner un succès, pas une erreur
      return NextResponse.json({
        message: "Votre email est déjà vérifié. Vous pouvez vous connecter.",
        alreadyVerified: true
      })
    }

    // 3. Maintenant valider et consommer le token via Redis
    const isValid = await validateEmailVerificationToken(normalizedEmail, token)

    if (!isValid) {
      console.log('[VerifyEmail] Token invalide ou expiré')
      return NextResponse.json(
        { error: "Lien de vérification invalide ou expiré. Demandez un nouveau lien." },
        { status: 400 }
      )
    }

    // 4. Marquer l'email comme vérifié
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() }
    })

    console.log('[VerifyEmail] Email vérifié avec succès pour:', normalizedEmail)

    return NextResponse.json({
      message: "Email vérifié avec succès ! Votre compte est maintenant actif."
    })

  } catch (error) {
    console.error('[VerifyEmail] Erreur:', error)

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
export const POST = withRateLimit('auth')(handleVerifyEmail)