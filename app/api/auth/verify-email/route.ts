import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { withRateLimit } from '@/lib/middleware/rateLimit'

const verifyEmailSchema = z.object({
  token: z.string().min(1, "Token requis"),
})

// Rate limited: 5 requests per minute per IP
async function handleVerifyEmail(request: NextRequest) {
  console.log('🔍 API verify-email appelée')
  try {
    const body = await request.json()
    console.log('📨 Body reçu:', body)
    
    const { token } = verifyEmailSchema.parse(body)
    console.log('🔑 Token à vérifier:', token.substring(0, 8) + '...')
    
    // Chercher le token dans la base
    const verificationToken = await prisma.emailVerificationToken.findUnique({
      where: { token }
    })
    
    console.log('💾 Token trouvé en base:', !!verificationToken)
    
    if (!verificationToken) {
      console.log('❌ Token non trouvé')
      return NextResponse.json(
        { error: "Token de vérification invalide" },
        { status: 400 }
      )
    }
    
    console.log('📅 Token expire le:', verificationToken.expires)
    console.log('🕐 Date actuelle:', new Date())
    
    // Vérifier si le token n'a pas expiré
    if (verificationToken.expires < new Date()) {
      console.log('⏰ Token expiré')
      await prisma.emailVerificationToken.delete({
        where: { id: verificationToken.id }
      })
      
      return NextResponse.json(
        { error: "Ce lien de vérification a expiré" },
        { status: 400 }
      )
    }
    
    // Chercher l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email: verificationToken.email }
    })
    
    console.log('👤 Utilisateur trouvé:', !!user)
    
    if (!user) {
      console.log('❌ Utilisateur non trouvé pour email:', verificationToken.email)
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 400 }
      )
    }
    
    // Marquer l'email comme vérifié
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() }
    })
    
    console.log('✅ Email marqué comme vérifié pour:', updatedUser.email)
    
    // Supprimer le token utilisé
    await prisma.emailVerificationToken.delete({
      where: { id: verificationToken.id }
    })
    
    console.log('🗑️ Token supprimé')
    
    return NextResponse.json({
      message: "Email vérifié avec succès ! Votre compte est maintenant actif."
    })
    
  } catch (error) {
    console.error('💥 ERREUR dans verify-email:', error)
    
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
export const POST = withRateLimit('auth')(handleVerifyEmail)