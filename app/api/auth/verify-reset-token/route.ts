import { NextRequest, NextResponse } from 'next/server'
import { checkPasswordResetToken } from '@/lib/email'
import { z, ZodError } from 'zod'
import { withRateLimit } from '@/lib/middleware/rateLimit'

const verifyTokenSchema = z.object({
  token: z.string().min(1, "Token requis"),
  email: z.string().email("Email requis"),
})

async function handleVerifyResetToken(request: NextRequest) {
  console.log('[VerifyResetToken] API appelée')

  try {
    const body = await request.json()
    const { token, email } = verifyTokenSchema.parse(body)

    // Vérifier le token via Redis (sans le consommer)
    const isValid = await checkPasswordResetToken(email, token)

    if (!isValid) {
      console.log('[VerifyResetToken] Token invalide ou expiré pour:', email)
      return NextResponse.json(
        { error: "Lien invalide ou expiré. Demandez un nouveau lien de réinitialisation." },
        { status: 400 }
      )
    }

    console.log('[VerifyResetToken] Token valide pour:', email)
    return NextResponse.json({ valid: true })

  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      )
    }

    console.error('[VerifyResetToken] Erreur:', error)
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

// Export with rate limiting
export const POST = withRateLimit('auth')(handleVerifyResetToken)