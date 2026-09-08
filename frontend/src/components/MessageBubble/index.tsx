import React from 'react';
import { formatTime } from '../../utils/helpers';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'pal';
  timestamp: Date;
}

interface MessageBubbleProps {
  message: Message;
  isCurrentUser: boolean;
}

export function MessageBubble({ message, isCurrentUser }: MessageBubbleProps) {
  return (
    <div className={`flex gap-3 mb-4 ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-gray-200">
        {isCurrentUser ? (
          <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400" />
        ) : (
          <img 
            src="https://sites-moca.ethoswarm.ai/poly/portraits/poly-portrait-7" 
            alt="Poly"
            className="w-full h-full object-cover"
          />
        )}
      </div>
      
      <div className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'} max-w-[70%]`}>
        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isCurrentUser 
            ? 'bg-gray-200 text-gray-800 rounded-tr-none' 
            : 'bg-pink-100 text-gray-800 rounded-tl-none'
        }`}>
          <p className="font-semibold text-xs mb-1 opacity-70">
            {isCurrentUser ? 'You' : 'Poly'}
          </p>
          <p className="whitespace-pre-wrap">
            {message.text}
          </p>
        </div>
        <span className="text-xs text-gray-400 mt-1 px-1">
          {formatTime(message.timestamp)}
        </span>
      </div>
    </div>
  );
}

export default MessageBubble;