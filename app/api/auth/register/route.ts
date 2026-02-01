import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { sendEmailVerification } from '@/lib/email'
import { z, ZodError } from 'zod'
import { withRateLimit } from '@/lib/middleware/rateLimit'

const registerSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
})

// Rate limited: 5 requests per minute per IP
async function handleRegister(request: NextRequest) {
  console.log('[Register] API appelée')

  try {
    const body = await request.json()

    const { name, email, password } = registerSchema.parse(body)
    console.log('[Register] Données validées pour:', email)

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "Un compte avec cet email existe déjà" },
        { status: 400 }
      )
    }

    // Hacher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 12)

    // Créer l'utilisateur (emailVerified = null = non vérifié)
    const user = await prisma.user.create({
      data: {
        name,
        email,
        hashedPassword,
        primaryAuthMethod: 'EMAIL_PASSWORD',
        emailVerified: null, // Pas encore vérifié
      }
    })
    console.log('[Register] Utilisateur créé:', user.id)

    // Envoyer l'email de vérification via Redis (token généré et stocké automatiquement)
    console.log('[Register] Envoi email de vérification...')
    const emailResult = await sendEmailVerification(email)

    if (!emailResult.success) {
      console.error('[Register] Erreur envoi email:', emailResult.error)
      // On ne fait pas échouer l'inscription pour ça, l'utilisateur peut renvoyer
    } else {
      console.log('[Register] Email envoyé avec succès')
    }

    // Retourner l'utilisateur sans le mot de passe
    const { hashedPassword: _, ...userWithoutPassword } = user

    return NextResponse.json({
      message: "Compte créé avec succès ! Vérifiez votre email pour activer votre compte.",
      user: userWithoutPassword,
      emailSent: emailResult.success
    })

  } catch (error) {
    console.error('[Register] Erreur:', error)

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
export const POST = withRateLimit('auth')(handleRegister)