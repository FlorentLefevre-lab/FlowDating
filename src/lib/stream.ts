import { StreamChat } from 'stream-chat'

// Fonction pour obtenir le client serveur
export function getServerStreamClient() {
  const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY
  const apiSecret = process.env.STREAM_API_SECRET

  if (!apiKey || !apiSecret) {
    throw new Error('Configuration Stream manquante')
  }

  return StreamChat.getInstance(apiKey, apiSecret)
}

// Fonction pour créer un token
export async function createStreamToken(userId: string) {
  const serverClient = getServerStreamClient()
  return serverClient.createToken(userId)
}

// Fonction pour créer un channel de match
export async function createMatchChannel(user1Id: string, user2Id: string, matchData: any) {
  const serverClient = getServerStreamClient()
  const channelId = [user1Id, user2Id].sort().join('-')
  
  const channel = serverClient.channel('messaging', channelId, {
    members: [user1Id, user2Id],
    created_by_id: user1Id,
    match_data: matchData,
  })

  await channel.create()
  return channel
}