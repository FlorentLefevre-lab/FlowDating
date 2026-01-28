import { HeartIcon } from '@heroicons/react/24/outline'

export function EmptyStateIndicator() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
      <HeartIcon className="w-16 h-16 text-gray-400 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        Aucune conversation
      </h3>
      <p className="text-gray-500 max-w-sm">
        Commencez à matcher avec des personnes pour démarrer des conversations
      </p>
    </div>
  )
}