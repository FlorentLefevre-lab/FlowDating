import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { createTransport } from 'nodemailer'
import { getRedisClient, isRedisHealthy } from '@/lib/redis'

export async function GET(request: NextRequest) {
  // Vérifier l'authentification admin
  const session = await auth()
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const diagnostics: Record<string, any> = {
    timestamp: new Date().toISOString(),
    env: {},
    smtp: {},
    redis: {},
  }

  // 1. Vérifier les variables d'environnement (sans exposer les valeurs)
  const envVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM', 'NEXTAUTH_URL', 'REDIS_URL']
  for (const varName of envVars) {
    const value = process.env[varName]
    if (!value) {
      diagnostics.env[varName] = '❌ MANQUANT'
    } else if (varName.includes('PASS') || varName.includes('URL')) {
      diagnostics.env[varName] = '✅ Défini (masqué)'
    } else {
      diagnostics.env[varName] = `✅ ${value}`
    }
  }

  // 2. Tester Redis
  try {
    const redisHealthy = await isRedisHealthy()
    if (redisHealthy) {
      diagnostics.redis.status = '✅ Connecté'
      // Test écriture/lecture
      const redis = getRedisClient()
      const testKey = 'smtp-test:' + Date.now()
      await redis.setex(testKey, 10, 'test')
      const testValue = await redis.get(testKey)
      await redis.del(testKey)
      diagnostics.redis.readWrite = testValue === 'test' ? '✅ Lecture/écriture OK' : '❌ Erreur lecture/écriture'
    } else {
      diagnostics.redis.status = '❌ Non connecté'
    }
  } catch (error) {
    diagnostics.redis.status = '❌ Erreur'
    diagnostics.redis.error = error instanceof Error ? error.message : 'Erreur inconnue'
  }

  // 3. Tester la connexion SMTP
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    diagnostics.smtp.status = '❌ Configuration incomplète'
  } else {
    try {
      const port = parseInt(process.env.SMTP_PORT || '587')
      const useImplicitTLS = port === 465

      const transporter = createTransport({
        host: process.env.SMTP_HOST,
        port: port,
        secure: useImplicitTLS,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        tls: {
          rejectUnauthorized: false,
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
      })

      // Vérifier la connexion
      await transporter.verify()
      diagnostics.smtp.status = '✅ Connexion réussie'
      diagnostics.smtp.host = process.env.SMTP_HOST
      diagnostics.smtp.port = port
      diagnostics.smtp.secure = useImplicitTLS ? 'TLS implicite (465)' : 'STARTTLS (587)'
    } catch (error) {
      diagnostics.smtp.status = '❌ Échec connexion'
      diagnostics.smtp.error = error instanceof Error ? error.message : 'Erreur inconnue'
      if (error instanceof Error && error.message.includes('ECONNREFUSED')) {
        diagnostics.smtp.hint = 'Le serveur SMTP refuse la connexion. Vérifiez host/port.'
      } else if (error instanceof Error && error.message.includes('ENOTFOUND')) {
        diagnostics.smtp.hint = 'Host SMTP introuvable. Vérifiez SMTP_HOST.'
      } else if (error instanceof Error && error.message.includes('auth')) {
        diagnostics.smtp.hint = 'Erreur d\'authentification. Vérifiez SMTP_USER/SMTP_PASS.'
      }
    }
  }

  return NextResponse.json(diagnostics, { status: 200 })
}

// Endpoint POST pour envoyer un email de test
export async function POST(request: NextRequest) {
  // Vérifier l'authentification admin
  const session = await auth()
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const { email } = await request.json()

  if (!email) {
    return NextResponse.json({ error: 'Email requis' }, { status: 400 })
  }

  // Vérifier la config SMTP
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.SMTP_FROM) {
    return NextResponse.json({
      success: false,
      error: 'Configuration SMTP incomplète',
      missing: {
        SMTP_HOST: !process.env.SMTP_HOST,
        SMTP_USER: !process.env.SMTP_USER,
        SMTP_PASS: !process.env.SMTP_PASS,
        SMTP_FROM: !process.env.SMTP_FROM,
      }
    }, { status: 500 })
  }

  try {
    const port = parseInt(process.env.SMTP_PORT || '587')
    const useImplicitTLS = port === 465

    const transporter = createTransport({
      host: process.env.SMTP_HOST,
      port: port,
      secure: useImplicitTLS,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: false,
      },
      connectionTimeout: 30000,
      greetingTimeout: 15000,
    })

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: '[TEST] Flow Dating - Test SMTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #ec4899;">✅ Test SMTP réussi !</h1>
          <p>Cet email confirme que la configuration SMTP de Flow Dating fonctionne correctement.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="color: #6b7280; font-size: 12px;">
            Envoyé le ${new Date().toLocaleString('fr-FR')}<br>
            Host: ${process.env.SMTP_HOST}<br>
            Port: ${port}
          </p>
        </div>
      `,
    })

    console.log('[SMTP Test] Email envoyé:', info.messageId)

    return NextResponse.json({
      success: true,
      message: `Email de test envoyé à ${email}`,
      messageId: info.messageId,
      response: info.response,
    })
  } catch (error) {
    console.error('[SMTP Test] Erreur:', error)

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
      stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined,
    }, { status: 500 })
  }
}
