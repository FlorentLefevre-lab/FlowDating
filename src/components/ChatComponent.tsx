// ÉTAPE 8 - Créer le fichier components/ChatComponent.tsx

import React from 'react';
import { Chat, Channel, MessageList, MessageInput, Thread, Window } from 'stream-chat-react';
import { MessageCircle, Phone, Video, MoreVertical } from 'lucide-react';
import type { ChatComponentProps, User } from '@/types/stream';

const ChatComponent: React.FC<ChatComponentProps> = ({ 
  chatClient, 
  channel, 
  otherUser, 
  onStartCall = () => {},
  onStartVideoCall = () => {} 
}) => {
  if (!chatClient || !channel) {
    return <ChatSkeleton />;
  }

  return (
    <Chat client={chatClient} theme="str-chat__theme-light">
      <Channel channel={channel}>
        <Window>
          <CustomChannelHeader 
            otherUser={otherUser}
            onStartCall={onStartCall}
            onStartVideoCall={onStartVideoCall}
          />
          <MessageList 
            messageLimit={50}
            threadList={true}
            noGroupByUser={false}
            disableDateSeparator={false}
          />
          <MessageInput 
            focus={true}
            publishTypingEvent={true}
            maxLength={500}
            placeholder="Écrivez votre message..."
            acceptedFiles={['image/*']}
            maxNumberOfFiles={3}
          />
        </Window>
        <Thread />
      </Channel>
    </Chat>
  );
};

interface CustomChannelHeaderProps {
  otherUser: User;
  onStartCall: () => void;
  onStartVideoCall: () => void;
}

const CustomChannelHeader: React.FC<CustomChannelHeaderProps> = ({ 
  otherUser, 
  onStartCall, 
  onStartVideoCall 
}) => {
  return (
    <div className="str-chat__channel-header">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <img
              src={otherUser?.image || 'https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=40&h=40&fit=crop&crop=face'}
              alt={otherUser?.name || 'Utilisateur'}
              className="w-10 h-10 rounded-full border-2 border-pink-200"
            />
            {otherUser?.isOnline && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
            )}
          </div>
          
          <div>
            <h3 className="str-chat__channel-header__name">
              {otherUser?.name || 'Chat'}
            </h3>
            <p className="text-sm text-gray-500">
              {otherUser?.isOnline ? 'En ligne' : 'Hors ligne'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onStartCall}
            className="p-2 text-gray-600 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition-colors"
            title="Appel audio"
            type="button"
          >
            <Phone className="h-5 w-5" />
          </button>
          
          <button
            onClick={onStartVideoCall}
            className="p-2 text-gray-600 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition-colors"
            title="Appel vidéo"
            type="button"
          >
            <Video className="h-5 w-5" />
          </button>
          
          <button 
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
            type="button"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

const ChatSkeleton: React.FC = () => {
  return (
    <div className="h-full animate-pulse bg-gray-50">
      <div className="p-4 bg-white border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
          <div className="flex-1">
            <div className="h-4 bg-gray-300 rounded w-1/3 mb-2"></div>
            <div className="h-3 bg-gray-300 rounded w-1/4"></div>
          </div>
        </div>
      </div>
      
      <div className="p-4 space-y-4 flex-1">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex space-x-3">
            <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
            <div className="flex-1">
              <div className="h-3 bg-gray-300 rounded w-1/4 mb-2"></div>
              <div className="h-4 bg-gray-300 rounded w-3/4"></div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="p-4 bg-white border-t border-gray-200">
        <div className="h-12 bg-gray-300 rounded-full"></div>
      </div>
    </div>
  );
};

export default ChatComponent;