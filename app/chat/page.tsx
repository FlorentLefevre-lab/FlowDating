'use client'

import { useEffect, useState } from 'react'
import {
  Chat,
  ChannelList,
  Channel,
  Window,
  MessageList,
  MessageInput,
  ChannelHeader,
  Thread
} from 'stream-chat-react'
import { useSearchParams } from 'next/navigation'
import { useStreamChat } from '@/hooks/useStreamChat'
import type { Channel as StreamChannel } from 'stream-chat'

export default function ChatPage() {
  const searchParams = useSearchParams()
  const { client, isConnecting, error: connectionError } = useStreamChat()
  const [activeChannel, setActiveChannel] = useState<StreamChannel | null>(null)

  const userId = searchParams.get('userId')
  const matchId = searchParams.get('matchId')

  // Empêcher le scroll du body
  useEffect(() => {
    document.body.classList.add('chat-open')
    return () => document.body.classList.remove('chat-open')
  }, [])

  // Création du channel si on arrive avec des params
  useEffect(() => {
    if (!client || !userId || !matchId || isConnecting) return

    const createChannel = async () => {
      try {
        const response = await fetch('/api/chat/create-channel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, matchId })
        })

        if (response.ok) {
          const { channelId } = await response.json()
          const channel = client.channel('messaging', channelId)
          await channel.watch()
          setActiveChannel(channel)
          window.history.replaceState({}, '', '/chat')
        }
      } catch (error) {
        console.error('Erreur création channel:', error)
      }
    }

    createChannel()
  }, [client, userId, matchId, isConnecting])

  // Loader
  if (isConnecting) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-pink-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Connexion au chat...</p>
        </div>
      </div>
    )
  }

  // Erreur ou pas connecté
  if (connectionError || !client) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <p className="text-red-500 mb-4">{connectionError || 'Veuillez vous connecter'}</p>
          <a href="/login" className="btn-primary">Se connecter</a>
        </div>
      </div>
    )
  }

  return (
    <div className="chat-page-container">
      <Chat client={client} theme="str-chat__theme-light">
        <ChannelList
          filters={{
            type: 'messaging',
            members: { $in: [client.userID!] }
          }}
          sort={{ last_message_at: -1 }}
          options={{ presence: true, watch: true, limit: 30 }}
          onChannelSelect={(channel) => setActiveChannel(channel)}
        />
        <Channel channel={activeChannel || undefined}>
          <Window>
            <ChannelHeader />
            <MessageList
              scrollToLatest
              disableDateSeparator={false}
            />
            <MessageInput focus />
          </Window>
          <Thread />
        </Channel>
      </Chat>
    </div>
  )
}
