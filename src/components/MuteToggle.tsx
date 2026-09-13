'use client';

interface MuteToggleProps {
  isMuted: boolean;
  onToggle: () => void;
  className?: string;
  showLabel?: boolean;
}

export default function MuteToggle({ 
  isMuted, 
  onToggle, 
  className = '',
  showLabel = false 
}: MuteToggleProps) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-2 text-white/60 hover:text-white transition-colors ${className}`}
      aria-label={isMuted ? '取消静音' : '静音'}
      title={isMuted ? '取消静音' : '静音'}
    >
      {isMuted ? (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={1.5} 
            d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
          />
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={1.5} 
            d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
          />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={1.5} 
            d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
          />
        </svg>
      )}
      {showLabel && (
        <span className="hidden sm:inline text-sm">
          {isMuted ? '取消静音' : '静音'}
        </span>
      )}
    </button>
  );
}
