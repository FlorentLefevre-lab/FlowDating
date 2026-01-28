// =====================================================
// src/lib/stream.ts - Réexporte depuis streamChatClient pour rétrocompatibilité
// =====================================================

import { StreamChat } from 'stream-chat'

// Export des fonctions serveur depuis streamChatClient
export { getServerStreamClient, createStreamToken } from './streamChatClient'

// Types pour createMatchChannel
interface MatchUserInfo {
  id: string
  name: string | null
  image?: string | null
}

interface MatchData {
  matchDate?: Date
  user1?: MatchUserInfo
  user2?: MatchUserInfo
  [key: string]: unknown
}

/**
 * Crée un channel de chat pour un match entre deux utilisateurs
 * Utilise une convention de nommage déterministe pour éviter les doublons
 */
export async function createMatchChannel(
  user1Id: string,
  user2Id: string,
  matchData?: MatchData
) {
  const apiKey = process.env.NEXT_PUBLIC_STREAM_API_KEY
  const apiSecret = process.env.STREAM_API_SECRET

  if (!apiKey || !apiSecret) {
    throw new Error('Configuration Stream manquante')
  }

  const serverClient = StreamChat.getInstance(apiKey, apiSecret)

  // ID déterministe: les IDs sont triés pour garantir le même channel peu importe l'ordre
  const channelId = `dm-${[user1Id, user2Id].sort().join('-')}`

  // Créer ou mettre à jour les utilisateurs Stream
  await serverClient.upsertUsers([
    {
      id: user1Id,
      name: matchData?.user1?.name || 'Utilisateur',
      image: matchData?.user1?.image || undefined,
    },
    {
      id: user2Id,
      name: matchData?.user2?.name || 'Utilisateur',
      image: matchData?.user2?.image || undefined,
    }
  ])

  // Créer le channel avec les données custom
  const channelOptions: Record<string, unknown> = {
    members: [user1Id, user2Id],
    created_by_id: user1Id,
  }

  if (matchData) {
    channelOptions.match_date = matchData.matchDate?.toISOString()
    channelOptions.user1_name = matchData.user1?.name
    channelOptions.user2_name = matchData.user2?.name
  }

  const channel = serverClient.channel('messaging', channelId, channelOptions as any)

  await channel.create()

  return channel
}
