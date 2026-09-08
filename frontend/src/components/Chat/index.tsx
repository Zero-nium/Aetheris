import React, { useState, useEffect, useRef, useCallback } from 'react';
import Avatar from '../Avatar';
import MessageBubble from '../MessageBubble';
import TypingIndicator from '../TypingIndicator';
import { useChat, Message } from '../../hooks/useChat';
import { chatAPI, Pal } from '../../services/api';
import { stripHtmlTags } from '../../utils/helpers';

const FALLBACK_COMPANIONS: Pal[] = [
  {
    id: 'b74d3018-8334-4412-a1f5-93703ac262c8',
    display_name: 'Poly',
    avatar_url: 'https://sites-moca.ethoswarm.ai/poly/portraits/poly-portrait-7',
  },
];

export function Chat() {
  const [companions, setCompanions] = useState<Pal[]>([]);
  const [activePalId, setActivePalId] = useState<string>('');
  const [inputValue, setInputValue] = useState('');
  const [isLoadingCompanions, setIsLoadingCompanions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previousScrollHeightRef = useRef<number>(0);

  const { messages, isLoading, isLoadingOlder, hasMore, sendMessage, loadOlderMessages } = useChat(activePalId);

  useEffect(() => {
    fetchCompanions();
  }, []);

  useEffect(() => {
    if (activePalId && inputRef.current) {
      inputRef.current.focus();
    }
  }, [activePalId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    // console.log('Scroll top:', el.scrollTop); // Uncomment to spam console
    
    // If user scrolls near the top (within 100px), load older messages
    if (el.scrollTop < 100 && !isLoadingOlder && hasMore) {
      console.log('SCROLL TRIGGER: Loading older messages...');
      previousScrollHeightRef.current = el.scrollHeight;
      loadOlderMessages();
    }
  }, [isLoadingOlder, hasMore, loadOlderMessages]);

  // Maintain scroll position after loading older messages
  useEffect(() => {
    if (isLoadingOlder && messagesContainerRef.current) {
      const newScrollHeight = messagesContainerRef.current.scrollHeight;
      const scrollDifference = newScrollHeight - previousScrollHeightRef.current;
      messagesContainerRef.current.scrollTop = scrollDifference;
    }
  }, [messages, isLoadingOlder]);

  const fetchCompanions = async () => {
    try {
      setIsLoadingCompanions(true);
      const spaces = await chatAPI.getSpaces();
      
      if (spaces.length > 0) {
        const space = await chatAPI.getSpace(spaces[0].id);
        
        if (space && space.participants && space.participants.length > 0) {
          const pals = await Promise.all(
            space.participants.map(async (id) => {
              const pal = await chatAPI.getPal(id);
              return pal;
            })
          );
          
          const validPals = pals.filter(Boolean) as Pal[];
          
          if (validPals.length > 0) {
            setCompanions(validPals);
            setActivePalId(validPals[0].id);
          } else {
            setCompanions(FALLBACK_COMPANIONS);
            setActivePalId(FALLBACK_COMPANIONS[0].id);
          }
        } else {
          setCompanions(FALLBACK_COMPANIONS);
          setActivePalId(FALLBACK_COMPANIONS[0].id);
        }
      } else {
        setCompanions(FALLBACK_COMPANIONS);
        setActivePalId(FALLBACK_COMPANIONS[0].id);
      }
    } catch (error) {
      console.error('Error fetching companions:', error);
      setCompanions(FALLBACK_COMPANIONS);
      setActivePalId(FALLBACK_COMPANIONS[0].id);
    } finally {
      setIsLoadingCompanions(false);
    }
  };

  const activePal = companions.find(p => p.id === activePalId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading || !activePalId) return;
    await sendMessage(inputValue);
    setInputValue('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const cleanMessages = messages.map(msg => ({ ...msg, text: stripHtmlTags(msg.text) }));

  if (isLoadingCompanions) {
    return (
      <div className="flex h-full bg-white rounded-2xl overflow-hidden shadow-soft items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-500">Loading companions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-white rounded-2xl overflow-hidden shadow-soft">
      {/* Left Sidebar - Friends List */}
      <div className="w-64 border-r border-gray-100 bg-white flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800 font-anime">Friends</h2>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-1">
          {companions.length === 0 ? (
            <div className="p-4 text-center text-gray-400 text-sm">
              No companions available
            </div>
          ) : (
            companions.map(pal => (
              <button
                key={pal.id}
                onClick={() => setActivePalId(pal.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
                  pal.id === activePalId
                    ? 'bg-pink-50 shadow-sm'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="relative">
                  <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-pink-200/50 bg-gray-100">
                    <img 
                      src={pal.avatar_url} 
                      alt={pal.display_name} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + pal.id;
                      }}
                    />
                  </div>
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
                </div>
                <div className="flex-1 text-left">
                  <p className={`font-semibold text-sm ${pal.id === activePalId ? 'text-gray-800' : 'text-gray-600'}`}>
                    {pal.display_name}
                  </p>
                  <p className="text-xs text-gray-400">Online</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Center - Profile View */}
      <div className="w-72 border-r border-gray-100 bg-white flex flex-col items-center justify-center p-6">
        {activePal ? (
          <>
            <div className="relative mb-6">
              <div className="w-32 h-32 rounded-full overflow-hidden ring-4 ring-pink-200/50 shadow-lg bg-gray-100">
                <img 
                  src={activePal.avatar_url} 
                  alt={activePal.display_name} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + activePal.id;
                  }}
                />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 font-anime mb-2">{activePal.display_name}</h1>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-pink-400 rounded-full animate-pulse"></div>
              <span className="text-sm text-gray-500 font-medium">online</span>
            </div>
          </>
        ) : (
          <div className="text-center text-gray-400">
            <p>Select a companion</p>
          </div>
        )}
      </div>

      {/* Right - Chat Area */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {/* Messages with infinite scroll */}
        <div 
          ref={messagesContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto scrollbar-thin p-6 space-y-4"
        >
          {/* Loading indicator for older messages */}
          {isLoadingOlder && (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          )}
          
          {/* No more messages indicator */}
          {!hasMore && messages.length > 0 && (
            <div className="text-center py-4">
              <p className="text-xs text-gray-400">No more messages</p>
            </div>
          )}

          {cleanMessages.length === 0 && !isLoading && activePal && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-50">
              <div className="w-20 h-20 rounded-full overflow-hidden ring-4 ring-pink-200/30 bg-gray-100">
                <img 
                  src={activePal.avatar_url} 
                  alt={activePal.display_name} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + activePal.id;
                  }}
                />
              </div>
              <div>
                <p className="text-gray-600 font-medium">Start a conversation with {activePal.display_name}</p>
              </div>
            </div>
          )}
          
          {cleanMessages.map((message) => (
            <MessageBubble key={message.id} message={message} isCurrentUser={message.sender === 'user'} />
          ))}
          
          {isLoading && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-gray-100">
          <form onSubmit={handleSubmit} className="flex gap-3 items-center">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={`Message ${activePal?.display_name || '...'}...`}
              disabled={isLoading || !activePalId}
              className="flex-1 px-5 py-3 rounded-full border border-gray-200 bg-gray-50 text-gray-800 placeholder-gray-400 focus:bg-white focus:border-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-200/50 transition-all duration-200 disabled:opacity-50 cursor-text"
            />
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim() || !activePalId}
              className="px-6 py-3 bg-pink-500 hover:bg-pink-600 text-white font-semibold rounded-full transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'send'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Chat;