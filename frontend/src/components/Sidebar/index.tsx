import React from 'react'
import Avatar from '../Avatar'

const FRIENDS = [
  { id: 'poly', name: 'Poly', online: true },
  { id: 'alex', name: 'Alex', online: false },
  { id: 'maya', name: 'Maya', online: true },
  { id: 'jordan', name: 'Jordan', online: false },
  { id: 'sophie', name: 'Sophie', online: true },
]

interface SidebarProps {
  activeFriend?: string
  onFriendSelect?: (id: string) => void
}

export function Sidebar({ activeFriend = 'poly', onFriendSelect }: SidebarProps) {
  return (
    <div className="flex flex-col h-full p-4">
      <h2 className="text-xl font-bold text-text-main mb-6 px-2 font-anime">Friends</h2>
      
      <div className="flex-1 overflow-y-auto space-y-1">
        {FRIENDS.map((friend) => (
          <button
            key={friend.id}
            onClick={() => onFriendSelect?.(friend.id)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
              activeFriend === friend.id
                ? 'bg-poly-pink/50' // Selected state
                : 'hover:bg-gray-50'
            }`}
          >
            <div className="relative">
              <Avatar src={friend.id === 'poly' ? undefined : undefined} alt={friend.name} size="sm" className="ring-0" />
              {friend.online && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
              )}
            </div>
            <div className="flex-1 text-left">
              <p className={`font-semibold text-sm ${activeFriend === friend.id ? 'text-text-main' : 'text-gray-600'}`}>
                {friend.name}
              </p>
              <p className="text-xs text-gray-400">
                {friend.online ? 'Online' : 'Offline'}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

export default Sidebar