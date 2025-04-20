import { motion } from 'framer-motion';
import React from 'react';

export const LoadingSpinner: React.FC = () => {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: 'linear'
      }}
      className="w-8 h-8 border-4 border-blue-500 dark:border-blue-400 border-t-transparent dark:border-t-transparent rounded-full"
    />
  );
};
