import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { validatePasswordResetToken } from '@/lib/email'
import bcrypt from 'bcryptjs'
import { z, ZodError } from 'zod'
import { withRateLimit } from '@/lib/middleware/rateLimit'

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token requis"),
  email: z.string().email("Email requis"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
})

// Rate limited: 5 requests per minute per IP
async function handleResetPassword(request: NextRequest) {
  console.log('[ResetPassword] API appelée')

  try {
    const body = await request.json()
    const { token, email, password } = resetPasswordSchema.parse(body)
    console.log('[ResetPassword] Réinitialisation pour:', email)

    // Valider le token via Redis (hashé, avec TTL auto, single-use)
    const isValid = await validatePasswordResetToken(email, token)

    if (!isValid) {
      console.log('[ResetPassword] Token invalide ou expiré')
      return NextResponse.json(
        { error: "Lien invalide ou expiré. Demandez un nouveau lien de réinitialisation." },
        { status: 400 }
      )
    }

    // Chercher l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() }
    })

    if (!user) {
      console.log('[ResetPassword] Utilisateur non trouvé:', email)
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 400 }
      )
    }

    // Hacher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(password, 12)

    // Mettre à jour le mot de passe de l'utilisateur
    await prisma.user.update({
      where: { id: user.id },
      data: { hashedPassword }
    })

    console.log('[ResetPassword] Mot de passe réinitialisé pour:', email)

    return NextResponse.json({
      message: "Mot de passe réinitialisé avec succès ! Vous pouvez maintenant vous connecter."
    })

  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error('[ResetPassword] Erreur:', error)
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

// Export with rate limiting (auth type: 5 requests/minute)
export const POST = withRateLimit('auth')(handleResetPassword)