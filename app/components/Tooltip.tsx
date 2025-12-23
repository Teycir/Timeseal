'use client';

import { ReactNode, useState } from 'react';

interface TooltipProps {
  children: ReactNode;
  content: string;
}

export function Tooltip({ children, content }: TooltipProps) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      >
        {children}
      </div>
      {show && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-black/90 border border-neon-green/30 rounded text-xs text-neon-green whitespace-nowrap z-50 pointer-events-none">
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-neon-green/30" />
        </div>
      )}
    </div>
  );
}
