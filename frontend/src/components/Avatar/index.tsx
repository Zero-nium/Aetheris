import React from 'react';

const POLY_AVATAR = 'https://sites-moca.ethoswarm.ai/poly/portraits/poly-portrait-7';

interface AvatarProps {
  src?: string;
  alt?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showOnline?: boolean;
  className?: string;
}

export function Avatar({ 
  src = POLY_AVATAR, 
  alt = 'Poly', 
  size = 'md', 
  showOnline = false,
  className = '' 
}: AvatarProps) {
  const sizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-12 h-12',
    lg: 'w-20 h-20',
    xl: 'w-16 h-16',
  };

  return (
    <div className={`relative ${className}`}>
      <div className={`${sizeClasses[size]} rounded-full overflow-hidden avatar-ring bg-white`}>
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.src = 'https://via.placeholder.com/150/FFB6C1/ffffff?text=' + alt.charAt(0);
          }}
        />
      </div>
      {showOnline && (
        <div className="absolute bottom-0 right-0">
          <div className="online-indicator" />
        </div>
      )}
    </div>
  );
}

export default Avatar;