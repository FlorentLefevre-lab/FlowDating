// ===== src/app/api/chat/stream/webhook/route.ts =====
import { NextRequest, NextResponse } from 'next/server'
import { StreamChat } from 'stream-chat'
import { prisma } from '@/lib/db'

const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY!
const apiSecret = process.env.STREAM_API_SECRET || process.env.STREAM_SECRET_KEY!
const serverClient = StreamChat.getInstance(apiKey, apiSecret)

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get('x-signature')
    const body = await req.text()
    
    // Vérifier la signature webhook
    const isValid = serverClient.verifyWebhook(body, signature!)
    if (!isValid) {
      return NextResponse.json(
        { error: 'Signature invalide' },
        { status: 401 }
      )
    }
    
    const event = JSON.parse(body)
    
    // Gérer différents types d'événements
    switch (event.type) {
      case 'message.new':
        // Envoyer notification push
        await sendPushNotification(event)
        break
      case 'channel.created':
        // Logger la création du channel
        console.log('Nouveau channel créé:', event.channel.id)
        break
      case 'member.added':
      case 'member.removed':
        // Gérer les changements de membres
        await handleMembershipChange(event)
        break
    }
    
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Erreur webhook Stream:', error)
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    )
  }
}

async function sendPushNotification(event: any) {
  // Implémenter l'envoi de notifications push
  const { message, channel, user } = event
  
  // Récupérer les membres du channel sauf l'expéditeur
  const members = Object.keys(channel.members).filter(id => id !== user.id)
  
  // Envoyer notification à chaque membre
  for (const memberId of members) {
    // Vérifier les préférences de notification
    const settings = await prisma.notificationSettings.findUnique({
      where: { userId: memberId }
    })
    
    if (settings?.messageNotifications) {
      // Envoyer notification (Firebase, OneSignal, etc.)
      console.log(`Notification envoyée à ${memberId}`)
    }
  }
}

async function handleMembershipChange(event: any) {
  // Logger les changements de membres
  console.log(`Membre ${event.type}:`, event.member.user_id)
}