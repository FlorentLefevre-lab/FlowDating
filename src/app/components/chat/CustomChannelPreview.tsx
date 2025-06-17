// =====================================================
// src/app/components/chat/CustomChannelPreview.tsx - VERSION SIMPLIFIÉE
// =====================================================
import { useEffect, useState, useRef, useCallback } from 'react'
import { Avatar, useChatContext } from 'stream-chat-react'
import type { ChannelPreviewUIComponentProps } from 'stream-chat-react'

export function CustomChannelPreview(props: ChannelPreviewUIComponentProps) {
  const { channel, setActiveChannel, active, unread, lastMessage } = props
  const { client } = useChatContext()
  const [otherUser, setOtherUser] = useState<any>(null)
  const [isOnline, setIsOnline] = useState(false)
  const [lastSeen, setLastSeen] = useState<Date | null>(null)
  const mountedRef = useRef(true)

  // Nettoyage à la destruction
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // Fonction sécurisée pour mettre à jour l'état
  const safeSetState = useCallback((updater: () => void) => {
    if (mountedRef.current) {
      updater()
    }
  }, [])

  // Récupérer l'autre utilisateur - SIMPLIFIÉ
  useEffect(() => {
    if (!channel || !client.userID) return

    const members = Object.values(channel.state.members)
    const other = members.find((member: any) => member.user_id !== client.userID)
    
    if (other?.user) {
      safeSetState(() => {
        setOtherUser(other.user)
        
        // Vérifier la présence une seule fois au montage
        const isUserOnline = other.user.online && !other.user.invisible
        const lastActive = other.user.last_active ? new Date(other.user.last_active) : null
        const timeSinceActive = lastActive ? Date.now() - lastActive.getTime() : Infinity
        const isRecentlyActive = timeSinceActive < 60000
        
        setIsOnline(isUserOnline || isRecentlyActive)
        setLastSeen(lastActive)
      })
    }
  }, [channel, client.userID, safeSetState])

  // Écouter les changements de présence - SIMPLIFIÉ
  useEffect(() => {
    if (!channel || !otherUser?.id || !client) return

    // Fonction de mise à jour optimisée
    const updatePresence = useCallback((event?: any) => {
      // Vérifier si l'événement concerne notre utilisateur
      if (event && event.user?.id !== otherUser.id) return

      const members = Object.values(channel.state.members)
      const updatedMember = members.find((m: any) => m.user_id === otherUser.id) as any
      
      if (updatedMember?.user) {
        safeSetState(() => {
          const isUserOnline = updatedMember.user.online && !updatedMember.user.invisible
          const lastActive = updatedMember.user.last_active ? new Date(updatedMember.user.last_active) : null
          const timeSinceActive = lastActive ? Date.now() - lastActive.getTime() : Infinity
          const isRecentlyActive = timeSinceActive < 60000
          
          setIsOnline(isUserOnline || isRecentlyActive)
          setLastSeen(lastActive)
          setOtherUser(updatedMember.user)
        })
      }
    }, [otherUser.id, channel, safeSetState])

    // Écouter seulement les événements essentiels
    const handlePresenceChanged = (event: any) => {
      if (event.user?.id === otherUser.id) {
        console.log(`👁 Présence changée pour ${otherUser.name}:`, event.user.online)
        updatePresence(event)
      }
    }

    // Ajouter les listeners minimaux
    client.on('user.presence.changed', handlePresenceChanged)
    channel.on('member.updated', updatePresence)

    // Nettoyage automatique
    return () => {
      client.off('user.presence.changed', handlePresenceChanged)
      channel.off('member.updated', updatePresence)
    }
  }, [channel, client, otherUser?.id, safeSetState])

  const handleClick = useCallback(() => {
    if (setActiveChannel) {
      setActiveChannel(channel)
    }
  }, [setActiveChannel, channel])

  // Formater le dernier message
  const getLastMessagePreview = useCallback(() => {
    if (!lastMessage) return 'Commencez la conversation'
    
    const isMyMessage = lastMessage.user?.id === client.userID
    const prefix = isMyMessage ? 'Vous: ' : ''
    const text = lastMessage.text || 'Photo'
    
    return prefix + text
  }, [lastMessage, client.userID])

  // Formater la date
  const formatTime = useCallback((date: Date) => {
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
  }, [])

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