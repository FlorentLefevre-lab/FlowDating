'use client'

import { Chat } from 'stream-chat-react'
import { useStreamChat } from '@/hooks/useStreamChat'
import 'stream-chat-react/dist/css/v2/index.css'

export function StreamChatProvider({ children }: { children: React.ReactNode }) {
  const { client, isConnecting } = useStreamChat()

  // Si on est en train de se connecter, afficher un loader
  if (isConnecting) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
      </div>
    )
  }

  // Si pas de client, rendre les enfants sans le wrapper Chat
  if (!client || !client.userID) {
    return <>{children}</>
  }

  // Client connecté, wrapper avec Chat
  return (
    <Chat client={client} theme="messaging light">
      {children}
    </Chat>
  )
}