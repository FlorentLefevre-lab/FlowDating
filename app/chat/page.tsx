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
import { streamChatManager } from '@/lib/streamChatClient'
import { CustomChannelPreview } from '@/components/chat/CustomChannelPreview'
import { CustomMessage } from '@/components/chat/CustomMessage'
import type { Channel as StreamChannel, Event } from 'stream-chat'
import 'stream-chat-react/dist/css/v2/index.css'

export default function ChatPage() {
  const searchParams = useSearchParams()
  const { client, isConnecting, error: connectionError } = useStreamChat()
  const [activeChannel, setActiveChannel] = useState<StreamChannel | null>(null)
  const [channelListKey, setChannelListKey] = useState(0)
  const [isLoadingChannel, setIsLoadingChannel] = useState(false)

  const channelCreationAttempted = useRef(false)
  const mountedRef = useRef(true)
  const eventHandlersRef = useRef<Map<string, (event: Event) => void>>(new Map())

  const userId = searchParams.get('userId')
  const matchId = searchParams.get('matchId')

  // Cleanup au démontage
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // Empêcher le scroll de la page principale
  useEffect(() => {
    document.body.classList.add('chat-open')
    return () => {
      document.body.classList.remove('chat-open')
    }
  }, [])

  // Fonction pour rafraîchir la liste des channels (sans polling)
  const refreshChannelList = useCallback(() => {
    if (mountedRef.current) {
      setChannelListKey(prev => prev + 1)
    }
  }, [])

  // Configuration des event listeners WebSocket (REMPLACE LE POLLING)
  useEffect(() => {
    if (!client) return

    const cleanup = () => {
      // Nettoyer tous les event handlers
      eventHandlersRef.current.forEach((handler, eventType) => {
        client.off(eventType as any, handler)
      })
      eventHandlersRef.current.clear()
    }

    // Nettoyer les anciens handlers d'abord
    cleanup()

    // Handler pour les nouveaux messages -> rafraîchir la liste
    const handleNewMessage = (event: Event) => {
      // Rafraîchir seulement si le message vient d'un autre channel ou autre utilisateur
      if (event.channel_id !== activeChannel?.id || event.user?.id !== client.userID) {
        refreshChannelList()
      }
    }
    client.on('message.new', handleNewMessage)
    eventHandlersRef.current.set('message.new', handleNewMessage)

    // Handler pour les mises à jour de channel
    const handleChannelUpdated = () => {
      refreshChannelList()
    }
    client.on('channel.updated', handleChannelUpdated)
    eventHandlersRef.current.set('channel.updated', handleChannelUpdated)

    // Handler pour l'ajout à un nouveau channel
    const handleAddedToChannel = () => {
      refreshChannelList()
    }
    client.on('notification.added_to_channel', handleAddedToChannel)
    eventHandlersRef.current.set('notification.added_to_channel', handleAddedToChannel)

    // Handler pour la suppression d'un channel
    const handleRemovedFromChannel = () => {
      refreshChannelList()
    }
    client.on('notification.removed_from_channel', handleRemovedFromChannel)
    eventHandlersRef.current.set('notification.removed_from_channel', handleRemovedFromChannel)

    // Handler pour les changements de membres
    const handleMemberUpdated = () => {
      refreshChannelList()
    }
    client.on('member.updated', handleMemberUpdated)
    eventHandlersRef.current.set('member.updated', handleMemberUpdated)

    // Handler pour les messages lus
    const handleMessageRead = () => {
      refreshChannelList()
    }
    client.on('message.read', handleMessageRead)
    eventHandlersRef.current.set('message.read', handleMessageRead)

    // Handler pour la récupération de connexion
    const handleConnectionRecovered = () => {
      console.log('🔄 [Chat] Connexion récupérée, rafraîchissement...')
      refreshChannelList()
    }
    client.on('connection.recovered', handleConnectionRecovered)
    eventHandlersRef.current.set('connection.recovered', handleConnectionRecovered)

    console.log('✅ [Chat] Event listeners configurés')

    return cleanup
  }, [client, activeChannel?.id, refreshChannelList])

  // Synchronisation au retour sur l'onglet
  useEffect(() => {
    if (!client) return

    let debounceTimeout: NodeJS.Timeout | null = null

    const handleVisibilityChange = () => {
      if (!document.hidden && mountedRef.current) {
        // Debounce pour éviter les appels répétés
        if (debounceTimeout) clearTimeout(debounceTimeout)
        debounceTimeout = setTimeout(() => {
          console.log('🔄 [Chat] Retour sur l\'onglet, synchronisation...')
          refreshChannelList()
        }, 500)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (debounceTimeout) clearTimeout(debounceTimeout)
    }
  }, [client, refreshChannelList])

  // Fonction pour gérer la sélection d'un channel
  const handleChannelSelected = useCallback(async (channel: StreamChannel) => {
    if (!mountedRef.current) return

    try {
      console.log('📱 [Chat] Sélection du channel:', channel.id)
      setIsLoadingChannel(true)

      if (!channel.initialized) {
        console.log('🔄 [Chat] Initialisation du channel...')
        await channel.watch({ presence: true })
      }

      // Marquer comme lu
      if (channel.countUnread() > 0) {
        await channel.markRead()
      }

      if (mountedRef.current) {
        setActiveChannel(channel)
        setIsLoadingChannel(false)
      }

      console.log('✅ [Chat] Channel activé')
    } catch (error) {
      console.error('❌ [Chat] Erreur sélection channel:', error)
      if (mountedRef.current) {
        setIsLoadingChannel(false)
      }
    }
  }, [])

  // Création et activation du channel quand on arrive avec des params
  useEffect(() => {
    if (!client || !userId || !matchId || channelCreationAttempted.current || isConnecting) {
      return
    }

    channelCreationAttempted.current = true

    const createAndOpenChannel = async () => {
      try {
        console.log('🔄 [Chat] Création/ouverture du channel...')

        const response = await fetch('/api/chat/create-channel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, matchId })
        })

        if (!response.ok) {
          throw new Error('Erreur création channel')
        }

        const { channelId } = await response.json()
        console.log('✅ [Chat] Channel ID:', channelId)

        // Attendre un peu que le channel soit créé côté Stream
        await new Promise(resolve => setTimeout(resolve, 1000))

        try {
          const channel = client.channel('messaging', channelId)
          await channel.watch({ presence: true })
          await handleChannelSelected(channel)
        } catch (error) {
          console.error('❌ [Chat] Erreur chargement channel:', error)

          // Fallback: chercher le channel
          const channels = await client.queryChannels({
            type: 'messaging',
            id: channelId
          })

          if (channels.length > 0) {
            await handleChannelSelected(channels[0])
          }
        }

        // Nettoyer l'URL
        window.history.replaceState({}, '', '/chat')
      } catch (error) {
        console.error('❌ [Chat] Erreur:', error)
      }
    }

    createAndOpenChannel()
  }, [client, userId, matchId, isConnecting, handleChannelSelected])

  // Fonction pour forcer la synchronisation (bouton manuel)
  const forceSyncPresence = useCallback(async () => {
    if (!client) return

    console.log('🔄 [Chat] Synchronisation forcée...')
    await streamChatManager.syncPresence()
    refreshChannelList()
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

  // Erreur de connexion
  if (connectionError) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Erreur de connexion</h2>
          <p className="text-gray-600 mb-4">{connectionError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
          >
            Réessayer
          </button>
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
                      setActiveChannel={(channel: any) => handleChannelSelected(channel)}
                      active={props.channel.id === activeChannel?.id}
                    />
                  )}
                  customActiveChannel={activeChannel?.cid}
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
