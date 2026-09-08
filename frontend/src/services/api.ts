const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export interface ChatMessage {
  id: string;
  pal_id: string;
  direction: 'user_to_pal' | 'pal_to_user';
  content: string;
  session_id: string;
  timestamp: string;
}

export interface SpaceMessage {
  id: string;
  space_id: string;
  sender_pal_id: string | null;
  content: string;
  type: 'world_event' | 'companion_message';
  timestamp: string;
  image_url?: string; // Optional field for future world event images
}

export interface Space {
  id: string;
  name: string;
}

export interface Pal {
  id: string;
  display_name: string;
  avatar_url: string;
}

export interface Space {
  id: string;
  name: string;
  participants?: string[]; // Array of pal IDs
}

export const chatAPI = {
  async sendMessage(palId: string, message: string, sessionId: string): Promise<string> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ palId, message, sessionId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.reply;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  },

  async getChatHistory(
    palId: string, 
    sessionId: string, 
    limit: number = 50,
    before?: string
  ): Promise<ChatMessage[]> {
    try {
      let url = `${API_BASE_URL}/api/chat/${palId}/messages?sessionId=${sessionId}&limit=${limit}`;
      if (before) {
        url += `&before=${before}`;
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.messages || [];
    } catch (error) {
      console.error('API Error:', error);
      return [];
    }
  },

  async getSpaces(): Promise<Space[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/spaces`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.spaces || [];
    } catch (error) {
      console.error('API Error:', error);
      return [];
    }
  },

  async getSpaceMessages(spaceId: string, limit: number = 50, before?: string): Promise<SpaceMessage[]> {
    try {
      let url = `${API_BASE_URL}/api/spaces/${spaceId}/messages?limit=${limit}`;
      if (before) {
        // FIX: Encode timestamp to handle special characters like ':' and '+'
        url += `&before=${encodeURIComponent(before)}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.messages || [];
    } catch (error) {
      console.error('API Error:', error);
      return [];
    }
  },

  async getPal(palId: string): Promise<Pal | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/pals/${palId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API Error fetching pal:', error);
      return null;
    }
  },

  async getSpace(spaceId: string): Promise<Space | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/spaces/${spaceId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      return null;
    }
  },
};

export default chatAPI;