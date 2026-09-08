import { useState, useEffect, useCallback, useRef } from 'react';
import { chatAPI, ChatMessage } from '../../services/api';
import { stripHtmlTags, getSessionId } from '../../utils/helpers';

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'pal';
  timestamp: Date;
}

export function useChat(palId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false); // NEW FLAG
  const [sessionId] = useState(() => getSessionId());
  
  const oldestTimestampRef = useRef<string | null>(null);

  useEffect(() => {
    if (palId) {
      setIsInitialized(false); // Reset on pal change
      loadHistory(palId);
    }
  }, [palId]);

  const loadHistory = async (id: string) => {
    console.log('Loading initial history for:', id);
    setMessages([]);
    setHasMore(true);
    oldestTimestampRef.current = null;
    
    const history = await chatAPI.getChatHistory(id, sessionId, 50);
    console.log('Initial history fetched:', history.length);
    
    const formatted: Message[] = history.map((msg: ChatMessage) => ({
      id: msg.id,
      text: stripHtmlTags(msg.content),
      sender: msg.direction === 'user_to_pal' ? 'user' : 'pal',
      timestamp: new Date(msg.timestamp),
    }));
    
    setMessages(formatted);
    
    if (history.length > 0) {
      oldestTimestampRef.current = history[0].timestamp;
    }
    
    // If we got less than 50 (including 0), there is no more history
    if (history.length < 50) {
      setHasMore(false);
    }
    
    setIsInitialized(true); // Mark as ready
  };

  const loadOlderMessages = useCallback(async () => {
    // ADDED isInitialized check
    if (isLoadingOlder || !hasMore || !palId || !oldestTimestampRef.current || !isInitialized) {
      return;
    }

    setIsLoadingOlder(true);
    try {
      const olderMessages = await chatAPI.getChatHistory(
        palId,
        sessionId,
        50,
        oldestTimestampRef.current
      );

      console.log('Older messages fetched:', olderMessages.length);

      if (olderMessages.length > 0) {
        const formatted: Message[] = olderMessages.map((msg: ChatMessage) => ({
          id: msg.id,
          text: stripHtmlTags(msg.content),
          sender: msg.direction === 'user_to_pal' ? 'user' : 'pal',
          timestamp: new Date(msg.timestamp),
        }));

        setMessages((prev) => [...formatted, ...prev]);
        oldestTimestampRef.current = olderMessages[0].timestamp;
      }

      if (olderMessages.length < 50) {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading older messages:', error);
    } finally {
      setIsLoadingOlder(false);
    }
  }, [isLoadingOlder, hasMore, palId, sessionId, isInitialized]); // Added isInitialized to deps

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading || !palId) return;

    const userMessage: Message = { 
      id: `temp-${Date.now()}`, 
      text: text.trim(), 
      sender: 'user', 
      timestamp: new Date() 
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const reply = await chatAPI.sendMessage(palId, text, sessionId);
      setMessages((prev) => [
        ...prev,
        { 
          id: `reply-${Date.now()}`, 
          text: stripHtmlTags(reply), 
          sender: 'pal', 
          timestamp: new Date() 
        }
      ]);
    } catch (err) {
      console.error('Send message error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, sessionId, palId]);

  return { 
    messages, 
    isLoading, 
    isLoadingOlder,
    hasMore,
    sendMessage, 
    loadOlderMessages,
    sessionId 
  };
}

export default useChat;