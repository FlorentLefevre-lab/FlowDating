import { FaceSmileIcon } from '@heroicons/react/24/outline'

export function EmojiPicker({ onEmojiSelect }: { onEmojiSelect?: (emoji: string) => void }) {
  const emojis = ['😊', '❤️', '😂', '😍', '🥰', '😘', '🤗', '😎', '🙈', '👍', '🔥', '💯']

  return (
    <div className="relative group">
      <button
        type="button"
        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
      >
        <FaceSmileIcon className="w-5 h-5 text-gray-600" />
      </button>
      
      <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block">
        <div className="bg-white rounded-lg shadow-lg p-2 grid grid-cols-4 gap-1">
          {emojis.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="p-2 hover:bg-gray-100 rounded transition-colors text-xl"
              onClick={() => onEmojiSelect?.(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}