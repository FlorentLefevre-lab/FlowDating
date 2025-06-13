// =====================================================
// src/app/components/chat/CustomChannelPreview.tsx
// =====================================================
import { useEffect, useState } from 'react'
import { Avatar, useChatContext } from 'stream-chat-react'
import type { ChannelPreviewUIComponentProps } from 'stream-chat-react'

export function CustomChannelPreview(props: ChannelPreviewUIComponentProps) {
  const { channel, setActiveChannel, active, unread, lastMessage } = props
  const { client } = useChatContext()
  const [otherUser, setOtherUser] = useState<any>(null)
  const [isOnline, setIsOnline] = useState(false)
  const [lastSeen, setLastSeen] = useState<Date | null>(null)
  const [forceUpdate, setForceUpdate] = useState(0)

  // Récupérer l'autre utilisateur
  useEffect(() => {
    if (!channel || !client.userID) return

    const members = Object.values(channel.state.members)
    const other = members.find((member: any) => member.user_id !== client.userID)
    
    if (other?.user) {
      setOtherUser(other.user)
      
      // Vérifier la présence initiale
      const checkPresence = () => {
        const isUserOnline = other.user.online && !other.user.invisible
        const lastActive = other.user.last_active ? new Date(other.user.last_active) : null
        const timeSinceActive = lastActive ? Date.now() - lastActive.getTime() : Infinity
        
        // Considérer en ligne si last_active < 1 minute
        const isRecentlyActive = timeSinceActive < 60000
        
        setIsOnline(isUserOnline || isRecentlyActive)
        setLastSeen(lastActive)
      }
      
      checkPresence()
    }
  }, [channel, client.userID, forceUpdate])

  // Écouter les changements de présence en temps réel
  useEffect(() => {
    if (!channel || !otherUser) return

    // Fonction pour mettre à jour la présence
    const updatePresence = (event?: any) => {
      if (event && event.user?.id !== otherUser.id) return

      // Récupérer l'état le plus récent
      const members = Object.values(channel.state.members)
      const updatedMember = members.find((m: any) => m.user_id === otherUser.id) as any
      
      if (updatedMember?.user) {
        const isUserOnline = updatedMember.user.online && !updatedMember.user.invisible
        const lastActive = updatedMember.user.last_active ? new Date(updatedMember.user.last_active) : null
        const timeSinceActive = lastActive ? Date.now() - lastActive.getTime() : Infinity
        
        // Considérer en ligne si last_active < 1 minute
        const isRecentlyActive = timeSinceActive < 60000
        
        setIsOnline(isUserOnline || isRecentlyActive)
        setLastSeen(lastActive)
        setOtherUser(updatedMember.user)
      }
    }

    // Écouter les événements globaux
    const handlePresenceChanged = (event: any) => {
      if (event.user?.id === otherUser.id) {
        console.log(`👁 Présence changée pour ${otherUser.name}:`, event.user.online)
        updatePresence(event)
      }
    }

    const handleUserUpdated = (event: any) => {
      if (event.user?.id === otherUser.id) {
        updatePresence(event)
      }
    }

    const handleMemberUpdated = (event: any) => {
      if (event.member?.user_id === otherUser.id || event.user?.id === otherUser.id) {
        updatePresence(event)
      }
    }

    // Écouter les événements du channel
    const handleChannelUpdated = () => {
      updatePresence()
    }

    // Ajouter les listeners
    channel.on('member.updated', handleMemberUpdated)
    channel.on('channel.updated', handleChannelUpdated)
    channel.on('user.presence.changed', handlePresenceChanged)
    
    // Listeners globaux
    client.on('user.presence.changed', handlePresenceChanged)
    client.on('user.updated', handleUserUpdated)

    // Vérifier la présence toutes les 10 secondes
    const presenceInterval = setInterval(() => {
      updatePresence()
    }, 10000)

    // Forcer une mise à jour initiale
    updatePresence()

    return () => {
      channel.off('member.updated', handleMemberUpdated)
      channel.off('channel.updated', handleChannelUpdated)
      channel.off('user.presence.changed', handlePresenceChanged)
      client.off('user.presence.changed', handlePresenceChanged)
      client.off('user.updated', handleUserUpdated)
      clearInterval(presenceInterval)
    }
  }, [channel, client, otherUser?.id])

  // Forcer la mise à jour quand le channel devient actif
  useEffect(() => {
    if (active) {
      setForceUpdate(prev => prev + 1)
    }
  }, [active])

  const handleClick = () => {
    if (setActiveChannel) {
      setActiveChannel(channel)
    }
  }

  // Formater le dernier message
  const getLastMessagePreview = () => {
    if (!lastMessage) return 'Commencez la conversation'
    
    const isMyMessage = lastMessage.user?.id === client.userID
    const prefix = isMyMessage ? 'Vous: ' : ''
    const text = lastMessage.text || 'Photo'
    
    return prefix + text
  }

  // Formater la date
  const formatTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return "À l'instant"
    if (minutes < 60) return `${minutes}m`
    if (hours < 24) return `${hours}h`
    if (days < 7) return `${days}j`
    
    return date.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'short' 
    })
  }

  if (!otherUser) return null

  return (
    <button
      className={`channel-preview ${active ? 'channel-preview--active' : ''} ${unread ? 'channel-preview--unread' : ''}`}
      onClick={handleClick}
    >
      <div className="channel-preview__avatar-wrapper">
        <Avatar
          image={otherUser.image}
          name={otherUser.name || otherUser.id}
          size={48}
        />
        {/* Indicateur de présence */}
        <div className={`presence-indicator ${isOnline ? 'presence-indicator--online' : 'presence-indicator--offline'}`}>
          <div className="presence-indicator__dot" />
        </div>
      </div>

      <div className="channel-preview__content">
        <div className="channel-preview__header">
          <span className="channel-preview__name">
            {otherUser.name || 'Utilisateur'}
          </span>
          {lastMessage && (
            <span className="channel-preview__time">
              {formatTime(new Date(lastMessage.created_at || lastMessage.timestamp))}
            </span>
          )}
        </div>

        <div className="channel-preview__message">
          <span className="channel-preview__text">
            {getLastMessagePreview()}
          </span>
          {unread > 0 && (
            <span className="channel-preview__unread-badge">
              {unread}
            </span>
          )}
        </div>

        {/* Status de présence */}
        <div className="channel-preview__status">
          {isOnline ? (
            <span className="text-green-600 text-xs">En ligne</span>
          ) : lastSeen ? (
            <span className="text-gray-500 text-xs">
              Vu {formatTime(lastSeen)}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  )
}