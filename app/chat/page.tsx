'use client'

import { Suspense, useEffect, useState } from 'react'
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
import { SimpleLoading, SimpleError, Button } from '@/components/ui'

function ChatContent() {
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
      <div className="h-screen bg-gray-50 flex-center">
        <SimpleLoading message="Connexion au chat..." size="lg" />
      </div>
    )
  }

  // Erreur ou pas connecté
  if (connectionError || !client) {
    return (
      <div className="h-screen bg-gray-50 flex-center">
        <div className="text-center">
          <SimpleError message={connectionError || 'Veuillez vous connecter'} />
          <Button asChild variant="gradient" className="mt-4">
            <a href="/login">Se connecter</a>
          </Button>
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
        />
        <Channel channel={activeChannel || undefined}>
          <Window>
            <ChannelHeader />
            <MessageList
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

export default function ChatPage() {
  return (
    <Suspense fallback={
      <div className="h-screen bg-gray-50 flex-center">
        <SimpleLoading message="Chargement..." size="lg" />
      </div>
    }>
      <ChatContent />
    </Suspense>
  )
}
