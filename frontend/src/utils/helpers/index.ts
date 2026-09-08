export function stripHtmlTags(html: string): string {
  if (!html) return '';
  
  let text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<p[^>]*>/gi, '');
  
  text = text.replace(/<[^>]*>/g, '');
  
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  text = textarea.value;
  
  return text.replace(/\n{3,}/g, '\n\n').trim();
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);
  
  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return d.toLocaleDateString();
}

export function getSessionId(): string {
  let sessionId = localStorage.getItem('companion_session_id');
  if (!sessionId) {
    sessionId = generateId();
    localStorage.setItem('companion_session_id', sessionId);
  }
  return sessionId;
}

export const COMPANION_NAMES: Record<string, string> = {
  'b74d3018-8334-4412-a1f5-93703ac262c8': 'Poly',
  '9df6453e-': 'Genesis Test 1',
};

export function getCompanionName(palId: string | null): string {
  if (!palId) return 'A companion';
  
  for (const [key, name] of Object.entries(COMPANION_NAMES)) {
    if (palId.startsWith(key)) {
      return name;
    }
  }
  
  return 'A companion';
}