import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const verifyTokenSchema = z.object({
  token: z.string().min(1, "Token requis"),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { token } = verifyTokenSchema.parse(body)

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

    return NextResponse.json({ valid: true })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Erreur verify-reset-token:", error)
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}