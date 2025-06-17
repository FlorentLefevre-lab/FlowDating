'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { 
  Chat, 
  ChannelList, 
  Channel, 
  Window, 
  MessageList, 
  MessageInput, 
  ChannelHeader,
  Thread,
  LoadingIndicator 
} from 'stream-chat-react'
import { useSearchParams } from 'next/navigation'
import { useStreamChat } from '@/hooks/useStreamChat'
import { CustomChannelPreview } from '@/app/components/chat/CustomChannelPreview'
import { CustomMessage } from '@/app/components/chat/CustomMessage'
import { streamChatManager } from '@/lib/streamChatClient'
import type { Channel as StreamChannel, StreamChat } from 'stream-chat'
import 'stream-chat-react/dist/css/v2/index.css'

export default function ChatPage() {
  const searchParams = useSearchParams()
  const { client, isConnecting } = useStreamChat()
  const [activeChannel, setActiveChannel] = useState<StreamChannel | null>(null)
  const [channelListKey, setChannelListKey] = useState(0)
  const [isLoadingChannel, setIsLoadingChannel] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(Date.now())
  
  const channelCreationAttempted = useRef(false)
  const userId = searchParams.get('userId')
  const matchId = searchParams.get('matchId')

  // Empêcher le scroll de la page principale
  useEffect(() => {
    document.body.classList.add('chat-open')
    return () => {
      document.body.classList.remove('chat-open')
    }
  }, [])

  // Fonction pour rafraîchir la liste des channels
  const refreshChannelList = useCallback(() => {
    console.log('🔄 Rafraîchissement de la liste des channels')
    setChannelListKey(prev => prev + 1)
    setLastRefresh(Date.now())
  }, [])

  // Synchronisation de la présence et rafraîchissement automatique
  useEffect(() => {
    if (!client) return

    let syncInterval: NodeJS.Timeout
    let visibilityHandler: () => void

    const setupSync = async () => {
      // Synchroniser la présence au démarrage
      await streamChatManager.syncPresence()

      // Synchroniser toutes les 20 secondes
      syncInterval = setInterval(async () => {
        await streamChatManager.syncPresence()
        refreshChannelList()
      }, 20000)

      // Synchroniser quand on revient sur l'onglet
      visibilityHandler = () => {
        if (!document.hidden) {
          console.log('🔄 Retour sur l\'onglet, synchronisation...')
          streamChatManager.syncPresence()
          refreshChannelList()
        }
      }
      document.addEventListener('visibilitychange', visibilityHandler)
    }

    setupSync()

    return () => {
      if (syncInterval) clearInterval(syncInterval)
      if (visibilityHandler) {
        document.removeEventListener('visibilitychange', visibilityHandler)
      }
    }
  }, [client, refreshChannelList])

  // Écouter les événements globaux pour la synchronisation temps réel
  useEffect(() => {
    if (!client) return

    // Événements qui déclenchent un rafraîchissement
    const events = [
      'user.presence.changed',
      'user.updated',
      'message.new',
      'message.updated',
      'message.deleted',
      'channel.updated',
      'member.added',
      'member.removed',
      'member.updated',
      'notification.added_to_channel',
      'notification.removed_from_channel'
    ]

    const handlers: Record<string, (event: any) => void> = {}

    // Handler générique pour rafraîchir
    const handleRefresh = (eventType: string) => (event: any) => {
      console.log(`📢 Événement ${eventType}:`, {
        type: event.type,
        user: event.user?.id,
        channel: event.channel?.id
      })
      
      // Rafraîchir la liste si nécessaire
      const shouldRefresh = 
        eventType.includes('presence') ||
        eventType.includes('user') ||
        (event.channel && !activeChannel) ||
        (event.channel?.id !== activeChannel?.id)

      if (shouldRefresh) {
        refreshChannelList()
      }
    }

    // Ajouter tous les listeners
    events.forEach(eventType => {
      handlers[eventType] = handleRefresh(eventType)
      client.on(eventType as any, handlers[eventType])
    })

    // Handler spécial pour les nouveaux messages
    const handleNewMessage = (event: any) => {
      if (event.user?.id !== client.userID && !document.hidden) {
        // Jouer un son de notification (optionnel)
        const audio = new Audio('/notification.mp3')
        audio.volume = 0.3
        audio.play().catch(() => {})
      }
    }
    client.on('message.new', handleNewMessage)

    return () => {
      // Retirer tous les listeners
      events.forEach(eventType => {
        client.off(eventType as any, handlers[eventType])
      })
      client.off('message.new', handleNewMessage)
    }
  }, [client, activeChannel, refreshChannelList])

  // Fonction pour gérer la sélection d'un channel
  const handleChannelSelected = useCallback(async (channel: StreamChannel) => {
    try {
      console.log('📱 Sélection du channel:', channel.id)
      setIsLoadingChannel(true)
      
      if (!channel.initialized) {
        console.log('🔄 Initialisation du channel...')
        await channel.watch({ presence: true })
      }
      
      if (channel.countUnread() > 0) {
        await channel.markRead()
      }
      
      setActiveChannel(channel)
      setIsLoadingChannel(false)
      console.log('✅ Channel activé')
      
      // Rafraîchir la liste pour mettre à jour les indicateurs
      refreshChannelList()
      
    } catch (error) {
      console.error('❌ Erreur sélection channel:', error)
      setIsLoadingChannel(false)
    }
  }, [refreshChannelList])

  // Création et activation du channel quand on arrive avec des params
  useEffect(() => {
    if (!client || !userId || !matchId || channelCreationAttempted.current || isConnecting) {
      return
    }

    channelCreationAttempted.current = true

    const createAndOpenChannel = async () => {
      try {
        console.log('🔄 Création/ouverture du channel...')
        
        const response = await fetch('/api/chat/create-channel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, matchId })
        })

        if (!response.ok) {
          throw new Error('Erreur création channel')
        }

        const { channelId } = await response.json()
        console.log('✅ Channel ID:', channelId)

        // Attendre un peu que le channel soit créé
        await new Promise(resolve => setTimeout(resolve, 1500))

        try {
          const channel = client.channel('messaging', channelId)
          await channel.watch({ presence: true })
          await handleChannelSelected(channel)
          refreshChannelList()
        } catch (error) {
          console.error('❌ Erreur chargement channel:', error)
          
          const channels = await client.queryChannels({
            type: 'messaging',
            id: channelId
          })
          
          if (channels.length > 0) {
            await handleChannelSelected(channels[0])
            refreshChannelList()
          }
        }

        window.history.replaceState({}, '', '/chat')

      } catch (error) {
        console.error('❌ Erreur:', error)
      }
    }

    createAndOpenChannel()
  }, [client, userId, matchId, isConnecting, handleChannelSelected, refreshChannelList])

  // Fonction pour forcer la synchronisation
  const forceSyncPresence = useCallback(async () => {
    if (!client) return
    
    console.log('🔄 Synchronisation forcée...')
    await streamChatManager.syncPresence()
    refreshChannelList()
    
    // Afficher une notification
    const notification = document.createElement('div')
    notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50'
    notification.textContent = '✅ Synchronisation effectuée'
    document.body.appendChild(notification)
    
    setTimeout(() => {
      notification.remove()
    }, 2000)
  }, [client, refreshChannelList])

  // Loader
  if (isConnecting) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-pink-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Connexion au chat...</p>
        </div>
      </div>
    )
  }

  // Si pas de client
  if (!client) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Connexion requise</h2>
          <p className="text-gray-600">Veuillez vous connecter pour accéder au chat</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      <div className="flex-1 overflow-hidden">
        <Chat client={client} theme="str-chat__theme-light">
          <div className="flex h-full">
            
            {/* Sidebar avec liste des channels */}
            <div className="w-80 border-r border-gray-200 flex flex-col bg-gray-50">
              {/* Header */}
              <div className="p-4 border-b border-gray-200 bg-white">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900">Messages</h2>
                  <button
                    onClick={forceSyncPresence}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Synchroniser"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Dernière sync: {new Date(lastRefresh).toLocaleTimeString()}
                </p>
              </div>
              
              {/* Liste des conversations */}
              <div className="flex-1 overflow-y-auto">
                <ChannelList
                  key={channelListKey}
                  filters={{
                    type: 'messaging',
                    members: { $in: [client.userID!] }
                  }}
                  sort={{ 
                    last_message_at: -1,
                    updated_at: -1 
                  }}
                  options={{
                    state: true,
                    presence: true,
                    watch: true,
                    limit: 30
                  }}
                  setActiveChannelOnMount={false}
                  Preview={(props) => (
                    <CustomChannelPreview 
                      {...props} 
                      setActiveChannel={handleChannelSelected}
                      active={props.channel.id === activeChannel?.id}
                    />
                  )}
                  onChannelSelected={handleChannelSelected}
                  EmptyStateIndicator={() => (
                    <div className="p-8 text-center">
                      <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                      <p className="font-medium text-gray-900 mb-1">Aucune conversation</p>
                      <p className="text-sm text-gray-500">Commencez à matcher pour discuter !</p>
                    </div>
                  )}
                  LoadingIndicator={() => (
                    <div className="p-8 text-center">
                      <LoadingIndicator />
                      <p className="text-sm text-gray-500 mt-2">Chargement...</p>
                    </div>
                  )}
                />
              </div>
            </div>

            {/* Zone principale de conversation */}
            <div className="flex-1 flex flex-col bg-white">
              {isLoadingChannel ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <LoadingIndicator />
                    <p className="text-sm text-gray-500 mt-2">Chargement de la conversation...</p>
                  </div>
                </div>
              ) : activeChannel ? (
                <Channel 
                  channel={activeChannel} 
                  key={activeChannel.id}
                >
                  <Window>
                    <ChannelHeader />
                    <MessageList 
                      Message={CustomMessage}
                      messageActions={['delete', 'react']}
                      disableDateSeparator={false}
                      hideDeletedMessages={false}
                      noGroupByUser={false}
                    />
                    <MessageInput 
                      grow
                      maxRows={10}
                      disableMentions
                      additionalTextareaProps={{
                        placeholder: 'Tapez votre message...',
                        maxLength: 1000
                      }}
                    />
                  </Window>
                  <Thread />
                </Channel>
              ) : (
                <div className="flex items-center justify-center h-full bg-gray-50">
                  <div className="text-center">
                    <div className="w-24 h-24 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <svg className="w-12 h-12 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      Sélectionnez une conversation
                    </h3>
                    <p className="text-gray-500 max-w-md mx-auto">
                      Choisissez une discussion dans la liste ou commencez une nouvelle conversation avec vos matchs
                    </p>
                  </div>
                </div>
              )}
            </div>
            
          </div>
        </Chat>
      </div>
    </div>
  )
}