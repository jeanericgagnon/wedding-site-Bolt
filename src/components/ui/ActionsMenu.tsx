import React from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from './Button';

export const ActionsMenu: React.FC<{
  label?: string;
  open: boolean;
  onToggle: () => void;
  align?: 'left' | 'right';
  menuRef?: React.RefObject<HTMLDivElement>;
  children: React.ReactNode;
}> = ({ label = 'Actions', open, onToggle, align = 'right', menuRef, children }) => {
  const alignClass = align === 'left' ? 'left-0' : 'right-0';
  return (
    <div className="relative" ref={menuRef}>
      <Button variant="outline" size="sm" onClick={onToggle}>
        {label} <ChevronDown className="w-4 h-4 ml-1" />
      </Button>
      {open && (
        <div className={`absolute ${alignClass} top-10 z-20 w-56 max-w-[calc(100vw-1.5rem)] rounded-xl border border-border-subtle bg-white p-2 shadow-lg space-y-1`}>
          {children}
        </div>
      )}
    </div>
  );
};
