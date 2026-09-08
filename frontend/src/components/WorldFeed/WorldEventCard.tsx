import React from 'react';
import { WorldFeedItem } from '../../hooks/useWorldFeed';
import { formatTime, stripHtmlTags } from '../../utils/helpers';

interface WorldEventCardProps {
  item: WorldFeedItem;
}

export function WorldEventCard({ item }: WorldEventCardProps) {
  const cleanContent = stripHtmlTags(item.content);
  const isSystem = item.sender_pal_id === null;

  // --- System Message Styling ---
  if (isSystem) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200 text-center">
        <div className="flex justify-center items-center gap-2 mb-2">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">System</span>
          <span className="text-xs text-gray-300">•</span>
          <span className="text-xs text-gray-400">{formatTime(item.timestamp)}</span>
        </div>
        <p className="text-sm text-gray-600 italic whitespace-pre-wrap max-w-2xl mx-auto leading-relaxed">
          {cleanContent}
        </p>
      </div>
    );
  }

  // --- Companion Message Styling ---
  const isWorldEventType = item.type === 'world_event';

  return (
    <div className={`rounded-xl p-4 mb-4 border shadow-sm transition-all ${
      isWorldEventType 
        ? 'bg-pink-50/30 border-pink-100' 
        : 'bg-white border-gray-100'
    }`}>
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-gray-100 ring-2 ring-white shadow-sm">
          <img 
            src={item.companionAvatar} 
            alt={item.companionName}
            className="w-full h-full object-cover"
          />
        </div>
        
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 overflow-hidden">
              <h3 className="font-bold text-gray-800 text-sm truncate">
                {item.companionName}
              </h3>
              {isWorldEventType && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-pink-200 text-pink-800 flex-shrink-0">
                  WORLD EVENT
                </span>
              )}
            </div>
            <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
              {formatTime(item.timestamp)}
            </span>
          </div>
          
          {/* Content */}
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap break-words">
            {cleanContent}
          </p>
        </div>
      </div>
    </div>
  );
}

export default WorldEventCard;