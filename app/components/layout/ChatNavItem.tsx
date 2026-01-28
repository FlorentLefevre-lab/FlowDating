'use client'

import Link from 'next/link'
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline'
import { usePathname } from 'next/navigation'

export function ChatNavItem() {
  const pathname = usePathname()
  
  // État temporaire pour les notifications (à remplacer par useUnreadCount plus tard)
  const unreadCount = 0

  return (
    <Link 
      href="/chat" 
      className={`flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors font-medium relative ${
        pathname === '/chat' ? 'text-pink-600 font-semibold' : ''
      }`}
    >
      <ChatBubbleLeftRightIcon className="w-5 h-5" />
      Messages
      {unreadCount > 0 && (
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Link>
  )
}