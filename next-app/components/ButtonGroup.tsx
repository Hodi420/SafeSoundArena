import React from 'react';

interface ButtonGroupProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Simple horizontal button group for consistent spacing and layout
 */
export const ButtonGroup: React.FC<ButtonGroupProps> = ({ children, className = '' }) => {
  return (
    <div className={`flex flex-row flex-wrap gap-2 sm:gap-3 transition-colors duration-300 ${className}`} role="group" aria-label="Button group">
      {children}
    </div>
  );
};
