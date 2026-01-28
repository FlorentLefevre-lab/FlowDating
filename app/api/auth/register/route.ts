import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { sendEmailVerification } from '@/lib/email'
import crypto from 'crypto'
import { z } from 'zod'
import { withRateLimit } from '@/lib/middleware/rateLimit'

const registerSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
})

// Rate limited: 5 requests per minute per IP
async function handleRegister(request: NextRequest) {
  console.log('🔥 API register appelée avec vérification email')
  
  try {
    const body = await request.json()
    console.log('📨 Body reçu:', body)
    
    const { name, email, password } = registerSchema.parse(body)
    console.log('✅ Données validées:', { name, email })

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
    console.log('🔐 Mot de passe haché')

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
    console.log('✅ Utilisateur créé:', user.id)

    // Générer un token de vérification
    const verificationToken = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 heures
    console.log('🔑 Token généré:', verificationToken.substring(0, 8) + '...')

    // Enregistrer le token
    const tokenCreated = await prisma.emailVerificationToken.create({
      data: {
        email,
        token: verificationToken,
        expires,
      }
    })
    console.log('💾 Token enregistré en base:', tokenCreated.id)

    // Envoyer l'email de vérification
    console.log('📧 Envoi de l\'email de vérification...')
    const emailSent = await sendEmailVerification(email, verificationToken)
    console.log('📬 Email envoyé:', emailSent)

    if (!emailSent) {
      console.error('❌ Erreur envoi email vérification pour:', email)
      // On ne fait pas échouer l'inscription pour ça
    }

    // Retourner l'utilisateur sans le mot de passe
    const { hashedPassword: _, ...userWithoutPassword } = user

    return NextResponse.json({
      message: "Compte créé avec succès ! Vérifiez votre email pour activer votre compte.",
      user: userWithoutPassword,
      emailSent,
      tokenId: tokenCreated.id // Pour debug
    })

  } catch (error) {
    console.error('💥 ERREUR dans register:', error)
    
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
export const POST = withRateLimit('auth')(handleRegister)