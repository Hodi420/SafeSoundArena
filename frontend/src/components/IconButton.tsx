import React from 'react';
import { motion } from 'framer-motion';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  ariaLabel: string;
  title?: string;
  active?: boolean;
  primary?: boolean;
  danger?: boolean;
  className?: string;
}

/**
 * Reusable, accessible icon button for consistent UI/UX.
 * Usage: <IconButton ariaLabel="Copy" title="Copy" onClick={...} primary>...</IconButton>
 */
export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ children, ariaLabel, title, active, primary, danger, className = '', ...props }, ref) => {
    const base = 'inline-flex items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors duration-150 px-3 py-2 text-base';
    const variant = primary
      ? 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600'
      : danger
      ? 'bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600'
      : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600';
    const activeClass = active ? 'ring-2 ring-blue-400' : '';
    const classes = [base, variant, activeClass, className].filter(Boolean).join(' ');
    return (
<<<<<<< HEAD
      <button
=======
      <motion.button
>>>>>>> 9841034 (Initial full project commit: user/admin dashboards, tasks, notifications, MongoDB, and statistics features)
        ref={ref}
        aria-label={ariaLabel}
        title={title || ariaLabel}
        className={classes}
<<<<<<< HEAD
        {...props}
      >
        {children}
      </button>
=======
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.96 }}
        {...props}
      >
        {children}
      </motion.button>
>>>>>>> 9841034 (Initial full project commit: user/admin dashboards, tasks, notifications, MongoDB, and statistics features)
    );
  }
);

IconButton.displayName = 'IconButton';
