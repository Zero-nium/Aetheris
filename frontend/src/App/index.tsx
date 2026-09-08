import React, { useState } from 'react';
import Chat from '../components/Chat';
import WorldFeed from '../components/WorldFeed';

type TabType = 'chat' | 'world';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('chat');

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-surface to-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto h-[calc(100vh-4rem)]">
        <div className="h-full flex flex-col">
          {/* Top Navigation */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🌍</span>
              <h1 className="text-2xl font-bold text-gray-800 font-anime">Aetheris</h1>
            </div>
            
            <div className="flex gap-2 bg-white/80 backdrop-blur-sm p-1 rounded-full shadow-sm">
              <button
                onClick={() => setActiveTab('chat')}
                className={`px-6 py-2 rounded-full font-medium transition-all duration-200 ${
                  activeTab === 'chat'
                    ? 'bg-primary text-white shadow-md'
                    : 'text-gray-600 hover:bg-white/50'
                }`}
              >
                Chat
              </button>
              <button
                onClick={() => setActiveTab('world')}
                className={`px-6 py-2 rounded-full font-medium transition-all duration-200 ${
                  activeTab === 'world'
                    ? 'bg-primary text-white shadow-md'
                    : 'text-gray-600 hover:bg-white/50'
                }`}
              >
                World Feed
              </button>
            </div>
            
            <div className="w-10 h-10 rounded-full bg-white shadow-md overflow-hidden ring-2 ring-poly-pink/30">
              <img 
                src="https://sites-moca.ethoswarm.ai/poly/portraits/poly-portrait-7"
                alt="Profile"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'chat' ? <Chat /> : <WorldFeed />}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;