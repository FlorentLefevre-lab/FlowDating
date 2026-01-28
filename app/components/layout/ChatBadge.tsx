'use client'

import { useUnreadCount } from '@/hooks/useStreamChat'
import { ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

export function ChatBadge() {
  const unreadCount = useUnreadCount()

  return (
    <Link href="/chat" className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
      <ChatBubbleLeftRightIcon className="w-6 h-6 text-gray-700" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Link>
  )
}