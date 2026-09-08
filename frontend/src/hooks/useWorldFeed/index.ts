import { useState, useEffect, useCallback, useRef } from 'react';
import { chatAPI, SpaceMessage, Pal } from '../../services/api';

export interface WorldFeedItem extends SpaceMessage {
  companionName: string;
  companionAvatar?: string;
  isSystem: boolean;
}

const palCache: Record<string, Pal | null> = {};
const FALLBACK_AVATAR = 'https://api.dicebear.com/7.x/avataaars/svg?seed=anon-companion&backgroundColor=e2e8f0&clothing=blank&top=shortHairTheCaesar';

export function useWorldFeed() {
  const [items, setItems] = useState<WorldFeedItem[]>([]);
  const [spaceId, setSpaceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isLive, setIsLive] = useState(true);
  
  const lastTimestampRef = useRef<string | null>(null); 
  const oldestTimestampRef = useRef<string | null>(null); 
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    initializeFeed();
    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, []);

  const fetchPalInfo = async (palId: string): Promise<{ name: string; avatar: string }> => {
    if (palCache[palId] !== undefined) {
      const cached = palCache[palId];
      if (cached) return { name: cached.display_name || 'Unnamed Companion', avatar: cached.avatar_url || FALLBACK_AVATAR };
      return { name: 'Unknown Companion', avatar: FALLBACK_AVATAR };
    }
    try {
      const pal = await chatAPI.getPal(palId);
      palCache[palId] = pal;
      if (pal) return { name: pal.display_name || 'Unnamed Companion', avatar: pal.avatar_url || FALLBACK_AVATAR };
      return { name: 'Unknown Companion', avatar: FALLBACK_AVATAR };
    } catch {
      palCache[palId] = null;
      return { name: 'Unknown Companion', avatar: FALLBACK_AVATAR };
    }
  };

  const initializeFeed = async () => {
    Object.keys(palCache).forEach(key => delete palCache[key]);
    setIsLoading(true);
    setHasMore(true);
    setItems([]);
    
    const spaces = await chatAPI.getSpaces();
    if (spaces.length > 0) {
      const activeSpaceId = spaces[0].id;
      setSpaceId(activeSpaceId);
      await fetchMessages(activeSpaceId, true);
      
      pollingIntervalRef.current = setInterval(() => fetchMessages(activeSpaceId, false), 30000);
    }
    setIsLoading(false);
  };

  const processMessages = async (messages: SpaceMessage[]) => {
    const processedItems: WorldFeedItem[] = [];
    for (const msg of messages) {
      if (msg.sender_pal_id === null) {
        processedItems.push({ ...msg, companionName: 'System', isSystem: true });
      } else {
        const palInfo = await fetchPalInfo(msg.sender_pal_id);
        processedItems.push({ 
          ...msg, 
          companionName: palInfo.name, 
          companionAvatar: palInfo.avatar, 
          isSystem: false 
        });
      }
    }
    return processedItems;
  };

  const fetchMessages = async (id: string, isInitialLoad: boolean) => {
    const beforeParam = isInitialLoad ? undefined : lastTimestampRef.current;
    const messages = await chatAPI.getSpaceMessages(id, 50, beforeParam ?? undefined);

    if (messages.length > 0) {
      const processedItems = await processMessages(messages);

      setItems((prev) => {
        const combined = isInitialLoad ? processedItems : [...processedItems, ...prev];
        const unique = combined.filter((item, index, self) => index === self.findIndex((i) => i.id === item.id));
        // Sort descending (newest first)
        const sorted = unique.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        
        // Update the oldest timestamp ref for infinite scroll
        if (sorted.length > 0) {
          oldestTimestampRef.current = sorted[sorted.length - 1].timestamp;
          console.log('Oldest timestamp set to:', oldestTimestampRef.current);
        }
        
        return sorted;
      });

      const latest = messages[messages.length - 1];
      lastTimestampRef.current = latest.timestamp;
    } else if (isInitialLoad) {
      setHasMore(false);
    }
  };

  const loadOlderMessages = useCallback(async () => {
    console.log('--- loadOlderMessages triggered ---');
    console.log('State:', { 
      oldest: oldestTimestampRef.current, 
      hasMore, 
      isLoadingOlder, 
      spaceId 
    });
    
    if (isLoadingOlder || !hasMore || !spaceId || !oldestTimestampRef.current) {
      console.log('Aborting: Conditions not met');
      return;
    }

    setIsLoadingOlder(true);
    try {
      const olderMessages = await chatAPI.getSpaceMessages(
        spaceId, 
        50, 
        oldestTimestampRef.current
      );

      console.log('Older messages fetched count:', olderMessages.length);

      if (olderMessages.length > 0) {
        const processedItems = await processMessages(olderMessages);
        
        setItems((prev) => {
          const combined = [...processedItems, ...prev];
          const unique = combined.filter((item, index, self) => index === self.findIndex((i) => i.id === item.id));
          const sorted = unique.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          
          if (sorted.length > 0) {
            oldestTimestampRef.current = sorted[sorted.length - 1].timestamp;
            console.log('New oldest timestamp after merge:', oldestTimestampRef.current);
          }
          
          // Critical check: If the unique array didn't grow, the backend returned duplicates
          if (unique.length === prev.length) {
             console.warn('WARNING: Fetched messages were all duplicates. Halting pagination.');
             // Force hasMore to false to prevent infinite duplicate fetching
             setHasMore(false);
          }
          
          return sorted;
        });
      }

      if (olderMessages.length < 50) {
        setHasMore(false);
        console.log('No more messages to load (fetched < 50).');
      }
    } catch (error) {
      console.error('Error loading older messages:', error);
    } finally {
      setIsLoadingOlder(false);
    }
  }, [isLoadingOlder, hasMore, spaceId]);
  
  const toggleLive = useCallback(() => {
    setIsLive((prev) => {
      if (prev && pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      } else if (spaceId && !pollingIntervalRef.current) {
        pollingIntervalRef.current = setInterval(() => fetchMessages(spaceId, false), 30000);
      }
      return !prev;
    });
  }, [spaceId]);

  return { 
    items, 
    isLoading, 
    isLoadingOlder,
    hasMore, 
    isLive, 
    toggleLive, 
    spaceId,
    loadOlderMessages
  };
}

export default useWorldFeed;