import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { withRateLimit } from '@/lib/middleware/rateLimit'

const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token requis"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
})

// Rate limited: 5 requests per minute per IP
async function handleResetPassword(request: NextRequest) {
  try {
    const body = await request.json()
    const { token, password } = resetPasswordSchema.parse(body)

    // Chercher le token dans la base
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token }
    })

    if (!resetToken) {
      return NextResponse.json(
        { error: "Token invalide" },
        { status: 400 }
      )
    }

    // Vérifier si le token n'a pas expiré
    if (resetToken.expires < new Date()) {
      // Supprimer le token expiré
      await prisma.passwordResetToken.delete({
        where: { id: resetToken.id }
      })

      return NextResponse.json(
        { error: "Ce lien a expiré. Demandez un nouveau lien de réinitialisation." },
        { status: 400 }
      )
    }

    // Chercher l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email: resetToken.email }
    })

    if (!user) {
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

    // Supprimer le token utilisé
    await prisma.passwordResetToken.delete({
      where: { id: resetToken.id }
    })

    console.log(`✅ Mot de passe réinitialisé pour: ${user.email}`)

    return NextResponse.json({
      message: "Mot de passe réinitialisé avec succès"
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Erreur reset-password:", error)
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

// Export with rate limiting (auth type: 5 requests/minute)
export const POST = withRateLimit('auth')(handleResetPassword)