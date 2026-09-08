import React, { useRef, useCallback, useEffect } from 'react';
import WorldEventCard from './WorldEventCard';
import { useWorldFeed } from '../../hooks/useWorldFeed';

export function WorldFeed() {
  const { items, isLoading, isLoadingOlder, hasMore, isLive, toggleLive, loadOlderMessages } = useWorldFeed();
  const feedContainerRef = useRef<HTMLDivElement>(null);
  const previousScrollHeightRef = useRef<number>(0);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    console.log('Scroll event:', { 
      scrollTop: el.scrollTop, 
      hasMore, 
      isLoadingOlder 
    });
    
    // Trigger when scrolled near the top (within 100px)
    if (el.scrollTop < 100 && !isLoadingOlder && hasMore) {
      console.log('✅ SCROLL TRIGGER: Loading older messages...');
      previousScrollHeightRef.current = el.scrollHeight;
      loadOlderMessages();
    }
  }, [isLoadingOlder, hasMore, loadOlderMessages]);

  // Maintain scroll position after prepending older messages
  useEffect(() => {
    if (isLoadingOlder && feedContainerRef.current) {
      // Wait for DOM to update
      setTimeout(() => {
        if (feedContainerRef.current) {
          const newScrollHeight = feedContainerRef.current.scrollHeight;
          const scrollDifference = newScrollHeight - previousScrollHeightRef.current;
          feedContainerRef.current.scrollTop = scrollDifference;
        }
      }, 0);
    }
  }, [items, isLoadingOlder]);

  return (
    <div className="h-full flex flex-col bg-white rounded-2xl shadow-soft overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-gray-100 bg-white flex-shrink-0">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <span className="text-primary">🌍</span> World Feed
        </h2>
        <button 
          onClick={toggleLive} 
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            isLive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
          {isLive ? 'Live' : 'Paused'}
        </button>
      </header>

      {/* Feed Content */}
      <div 
        ref={feedContainerRef} 
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto scrollbar-thin p-6 bg-gray-50"
      >
        {/* Top Indicators */}
        <div className="flex flex-col items-center mb-4">
          {isLoadingOlder && (
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mb-2"></div>
          )}
          {!hasMore && items.length > 0 && (
            <p className="text-xs text-gray-400">No more events</p>
          )}
        </div>

        {isLoading && items.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-4 max-w-3xl mx-auto">
            {items.map((item) => (
              <WorldEventCard key={item.id} item={item} />
            ))}
            {items.length === 0 && (
              <div className="text-center text-gray-400 py-12">
                <p className="text-lg font-medium">No world events yet</p>
                <p className="text-sm mt-2">Events will appear here as companions explore.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default WorldFeed;