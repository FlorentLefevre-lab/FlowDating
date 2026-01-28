// =====================================================
// src/app/components/chat/CustomMessage.tsx
// =====================================================
import { MessageSimple, MessageTimestamp, Avatar, useChatContext } from 'stream-chat-react'
import type { MessageUIComponentProps } from 'stream-chat-react'

export function CustomMessage(props: MessageUIComponentProps) {
  const { message, groupStyles } = props
  const { client } = useChatContext()
  
  if (!message) return null
  
  const isMyMessage = message.user?.id === client.userID
  const showAvatar = groupStyles?.includes('single') || groupStyles?.includes('bottom')
  const showName = groupStyles?.includes('top') || groupStyles?.includes('single')
  
  return (
    <div className={`custom-message ${isMyMessage ? 'custom-message--mine' : 'custom-message--other'}`}>
      {!isMyMessage && showAvatar && (
        <div className="custom-message__avatar">
          <Avatar
            image={message.user?.image as string | undefined}
            name={message.user?.name || message.user?.id}
          />
        </div>
      )}
      
      <div className="custom-message__content">
        {!isMyMessage && showName && message.user?.name && (
          <div className="custom-message__name">
            {message.user.name}
          </div>
        )}
        
        <div className="custom-message__bubble">
          <MessageSimple {...props} />
        </div>
        
        <div className="custom-message__timestamp">
          <MessageTimestamp
            message={message as any}
          />
        </div>
      </div>
    </div>
  )
}