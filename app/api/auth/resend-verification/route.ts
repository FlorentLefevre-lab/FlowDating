
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendEmailVerification } from '@/lib/email'
import crypto from 'crypto'
import { z } from 'zod'

const resendSchema = z.object({
  email: z.string().email("Email invalide"),
})

export async function POST(request: NextRequest) {
  console.log('🔄 API resend-verification appelée')
  
  try {
    const body = await request.json()
    const { email } = resendSchema.parse(body)
    console.log('📧 Renvoi pour:', email)

    // Chercher l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email }
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

    // Supprimer les anciens tokens de vérification
    await prisma.emailVerificationToken.deleteMany({
      where: { email }
    })

    // Générer un nouveau token
    const verificationToken = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 heures

    // Enregistrer le nouveau token
    await prisma.emailVerificationToken.create({
      data: {
        email,
        token: verificationToken,
        expires,
      }
    })

    // Envoyer l'email
    const emailSent = await sendEmailVerification(email, verificationToken)

    if (!emailSent) {
      return NextResponse.json(
        { error: "Erreur lors de l'envoi de l'email" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: "Un nouveau lien de vérification a été envoyé à votre adresse email."
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      )
    }

    console.error("Erreur resend-verification:", error)
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}