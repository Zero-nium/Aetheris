import React from 'react';

export function TypingIndicator() {
  return (
    <div className="flex gap-3 mb-4">
      <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-gray-200">
        <img 
          src="https://sites-moca.ethoswarm.ai/poly/portraits/poly-portrait-7" 
          alt="Poly"
          className="w-full h-full object-cover"
        />
      </div>
      <div className="bg-pink-100 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-1">
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}

export default TypingIndicator;