// =====================================================
// app/components/chat/CustomChannelPreview.tsx - VERSION CORRIGÉE
// =====================================================
import { useEffect, useState, useRef, useCallback, memo } from 'react'
import { Avatar, useChatContext } from 'stream-chat-react'
import type { ChannelPreviewUIComponentProps } from 'stream-chat-react'
import type { Event, UserResponse } from 'stream-chat'

// Types
interface OtherUser {
  id: string
  name?: string
  image?: string
  online?: boolean
  last_active?: string
  invisible?: boolean
}

interface PresenceState {
  isOnline: boolean
  lastSeen: Date | null
}

/**
 * Composant de prévisualisation de channel personnalisé
 * Mémorisé pour éviter les re-renders inutiles
 */
export const CustomChannelPreview = memo(function CustomChannelPreview(
  props: ChannelPreviewUIComponentProps
) {
  const { channel, setActiveChannel, active, unread, lastMessage } = props
  const { client } = useChatContext()

  const [otherUser, setOtherUser] = useState<OtherUser | null>(null)
  const [presence, setPresence] = useState<PresenceState>({
    isOnline: false,
    lastSeen: null
  })

  const mountedRef = useRef(true)
  const eventHandlersRef = useRef<Map<string, (event: Event) => void>>(new Map())

  // Cleanup au démontage
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // Fonction utilitaire pour calculer la présence
  const calculatePresence = useCallback((user: UserResponse | OtherUser): PresenceState => {
    const isUserOnline = !!(user.online && !(user as OtherUser).invisible)
    const lastActive = user.last_active ? new Date(user.last_active) : null

    // Considérer "en ligne" si vu dans les 60 dernières secondes
    const timeSinceActive = lastActive ? Date.now() - lastActive.getTime() : Infinity
    const isRecentlyActive = timeSinceActive < 60000

    return {
      isOnline: isUserOnline || isRecentlyActive,
      lastSeen: lastActive
    }
  }, [])

  // Récupérer l'autre utilisateur au montage
  useEffect(() => {
    if (!channel || !client.userID) return

    const members = Object.values(channel.state.members)
    const other = members.find((member) => member.user_id !== client.userID)

    if (other?.user) {
      const user = other.user as OtherUser
      setOtherUser(user)
      setPresence(calculatePresence(user))
    }
  }, [channel, client.userID, calculatePresence])

  // Configurer les event listeners pour la présence
  useEffect(() => {
    if (!channel || !client || !otherUser?.id) return

    const cleanup = () => {
      // Nettoyer les handlers du client
      eventHandlersRef.current.forEach((handler, eventType) => {
        if (eventType.startsWith('client:')) {
          client.off(eventType.replace('client:', '') as any, handler)
        } else {
          channel.off(eventType as any, handler)
        }
      })
      eventHandlersRef.current.clear()
    }

    // Nettoyer les anciens handlers
    cleanup()

    // Handler pour les changements de présence globaux
    const handlePresenceChanged = (event: Event) => {
      if (event.user?.id === otherUser.id && mountedRef.current) {
        setOtherUser(prev => prev ? { ...prev, ...event.user } : null)
        if (event.user) {
          setPresence(calculatePresence(event.user as OtherUser))
        }
      }
    }
    client.on('user.presence.changed', handlePresenceChanged)
    eventHandlersRef.current.set('client:user.presence.changed', handlePresenceChanged)

    // Handler pour les mises à jour de membres
    const handleMemberUpdated = (event: Event) => {
      if (event.member?.user_id === otherUser.id && event.member?.user && mountedRef.current) {
        const user = event.member.user as OtherUser
        setOtherUser(user)
        setPresence(calculatePresence(user))
      }
    }
    channel.on('member.updated', handleMemberUpdated)
    eventHandlersRef.current.set('member.updated', handleMemberUpdated)

    return cleanup
  }, [channel, client, otherUser?.id, calculatePresence])

  // Handler de clic
  const handleClick = useCallback(() => {
    if (setActiveChannel) {
      setActiveChannel(channel)
    }
  }, [setActiveChannel, channel])

  // Formater le dernier message
  const getLastMessagePreview = useCallback((): string => {
    if (!lastMessage) return 'Commencez la conversation'

    const isMyMessage = lastMessage.user?.id === client.userID
    const prefix = isMyMessage ? 'Vous: ' : ''
    const text = lastMessage.text || 'Photo'

    // Tronquer si trop long
    const maxLength = 40
    const truncatedText = text.length > maxLength ? text.substring(0, maxLength) + '...' : text

    return prefix + truncatedText
  }, [lastMessage, client.userID])

  // Formater la date
  const formatTime = useCallback((date: Date): string => {
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

  // Ne pas rendre si pas d'autre utilisateur
  if (!otherUser) return null

  return (
    <button
      className={`channel-preview ${active ? 'channel-preview--active' : ''} ${(unread ?? 0) > 0 ? 'channel-preview--unread' : ''}`}
      onClick={handleClick}
      type="button"
    >
      <div className="channel-preview__avatar-wrapper">
        <Avatar
          image={otherUser.image}
          name={otherUser.name || otherUser.id}
        />
        {/* Indicateur de présence */}
        <div className={`presence-indicator ${presence.isOnline ? 'presence-indicator--online' : 'presence-indicator--offline'}`}>
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
              {formatTime(new Date(lastMessage.created_at || Date.now()))}
            </span>
          )}
        </div>

        <div className="channel-preview__message">
          <span className="channel-preview__text">
            {getLastMessagePreview()}
          </span>
          {(unread ?? 0) > 0 && (
            <span className="channel-preview__unread-badge">
              {unread}
            </span>
          )}
        </div>

        {/* Status de présence */}
        <div className="channel-preview__status">
          {presence.isOnline ? (
            <span className="text-green-600 text-xs">En ligne</span>
          ) : presence.lastSeen ? (
            <span className="text-gray-500 text-xs">
              Vu {formatTime(presence.lastSeen)}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  )
})

// Styles CSS à ajouter dans votre fichier de styles global
/*
.channel-preview {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 12px 16px;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: background-color 0.2s;
  text-align: left;
}

.channel-preview:hover {
  background-color: #f3f4f6;
}

.channel-preview--active {
  background-color: #fce7f3;
}

.channel-preview--unread .channel-preview__name,
.channel-preview--unread .channel-preview__text {
  font-weight: 600;
}

.channel-preview__avatar-wrapper {
  position: relative;
  margin-right: 12px;
}

.presence-indicator {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid white;
  display: flex;
  align-items: center;
  justify-content: center;
}

.presence-indicator--online {
  background-color: #22c55e;
}

.presence-indicator--offline {
  background-color: #9ca3af;
}

.presence-indicator__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: white;
}

.channel-preview__content {
  flex: 1;
  min-width: 0;
}

.channel-preview__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.channel-preview__name {
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.channel-preview__time {
  font-size: 12px;
  color: #9ca3af;
  flex-shrink: 0;
  margin-left: 8px;
}

.channel-preview__message {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.channel-preview__text {
  font-size: 13px;
  color: #6b7280;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.channel-preview__unread-badge {
  background-color: #ec4899;
  color: white;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 9999px;
  margin-left: 8px;
  flex-shrink: 0;
}

.channel-preview__status {
  margin-top: 2px;
}
*/
