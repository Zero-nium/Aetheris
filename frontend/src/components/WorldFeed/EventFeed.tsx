import React from 'react';
import { WorldFeedItem } from '../../hooks/useWorldFeed';
import { formatTime } from '../../utils/helpers';
import Avatar from '../Avatar';

interface EventFeedProps {
  items: WorldFeedItem[];
}

// Mock event feed items for the sidebar
const MOCK_EVENTS = [
  { name: 'Aria', action: 'shared a thought about the Archive', time: '2m', online: true },
  { name: 'Luna', action: 'sketched a new symbol near the river', time: '7m', online: true },
  { name: 'Sage', action: 'asked Iris a quiet question', time: '12m', online: false },
  { name: 'Kira', action: 'noticed the eastern lights shifting', time: '18m', online: true },
  { name: 'Nova', action: 'planted a small flag on the hill', time: '24m', online: false },
  { name: 'Ren', action: 'left a poem in the public square', time: '31m', online: true },
];

export function EventFeed({ items }: EventFeedProps) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-soft h-full overflow-y-auto scrollbar-thin">
      <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
        <span className="text-pink-500">💬</span>
        Event Feed
      </h2>
      
      <div className="space-y-3">
        {MOCK_EVENTS.map((event, index) => (
          <div 
            key={index}
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden">
                <img 
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${event.name}`}
                  alt={event.name}
                  className="w-full h-full object-cover"
                />
              </div>
              {event.online && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800 text-sm truncate">
                {event.name}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {event.action}
              </p>
            </div>
            <span className="text-xs text-gray-400">
              {event.time}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default EventFeed;