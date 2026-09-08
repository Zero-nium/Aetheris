import React from 'react';

type TabType = 'chat' | 'world';

interface TabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function Tabs({ activeTab, onTabChange }: TabsProps) {
  return (
    <div className="flex gap-2 bg-white/10 p-1 rounded-full">
      <button
        onClick={() => onTabChange('chat')}
        className={`btn-tab ${activeTab === 'chat' ? 'btn-tab-active' : 'btn-tab-inactive'}`}
      >
        Chat
      </button>
      <button
        onClick={() => onTabChange('world')}
        className={`btn-tab ${activeTab === 'world' ? 'btn-tab-active' : 'btn-tab-inactive'}`}
      >
        World Feed
      </button>
    </div>
  );
}

export default Tabs;