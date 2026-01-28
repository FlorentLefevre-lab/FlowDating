'use client'

import Link from 'next/link'
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline'
import { usePathname } from 'next/navigation'
import { useUnreadCount } from '@/hooks/useStreamChat'

/**
 * Item de navigation pour le chat avec badge de non-lus
 * Utilise le hook useUnreadCount pour les mises à jour temps réel
 */
export function ChatNavItem() {
  const pathname = usePathname()
  const unreadCount = useUnreadCount()
  const isActive = pathname === '/chat'

  return (
    <Link
      href="/chat"
      className={`flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors font-medium relative ${
        isActive ? 'text-pink-600 font-semibold' : ''
      }`}
      aria-label={unreadCount > 0 ? `Messages (${unreadCount} non lus)` : 'Messages'}
    >
      <ChatBubbleLeftRightIcon className="w-5 h-5" />
      Messages
      {unreadCount > 0 && (
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Link>
  )
}
